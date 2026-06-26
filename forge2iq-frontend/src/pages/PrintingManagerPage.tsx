import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, LinearProgress, Alert, IconButton, Divider,
  useMediaQuery, useTheme,
} from '@mui/material'
import PrintIcon from '@mui/icons-material/Print'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import SendIcon from '@mui/icons-material/Send'
import DownloadIcon from '@mui/icons-material/Download'
import EditIcon from '@mui/icons-material/Edit'
import { PDFDownloadLink } from '@react-pdf/renderer'
import api from '../api/axios'
import StockLogPDF from '../components/StockLogPDF'
import type { PrintingShiftLog, PrintingDispatch, PrintingStockCategory, ProductType, ShiftName, WorkOrder } from '../types'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useTableControls } from '../hooks/useTableControls'
import { TableSearch, SortableCell, TablePager, ExportButton } from '../components/TableToolbar'
import { exportToExcel, exportToCSV } from '../utils/exportUtils'

const CATEGORIES: { value: PrintingStockCategory; label: string; color: string }[] = [
  { value: 'READY_TO_DISPATCH', label: 'Ready to Dispatch', color: '#059669' },
  { value: 'DELBERG_PLATE',     label: 'Delberg Plate',     color: '#7C3AED' },
  { value: 'READY_TO_WAX',      label: 'Ready to Wax',      color: '#D97706' },
  { value: 'READY_TO_VARNISH',  label: 'Ready to Varnish',  color: '#2563EB' },
  { value: 'WIP',               label: 'WIP',               color: '#64748B' },
]

interface StockRow { workOrderId: string; productName: string; productType: ProductType; batchNumber: string; category: PrintingStockCategory; sheetCount: string }

const blankRow = (): StockRow => ({ workOrderId: '', productName: '', productType: 'BODY', batchNumber: '', category: 'READY_TO_DISPATCH', sheetCount: '' })

export default function PrintingManagerPage() {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'))

  const [shiftLogs, setShiftLogs] = useState<PrintingShiftLog[]>([])
  const [dispatches, setDispatches] = useState<PrintingDispatch[]>([])
  const [pendingItems, setPendingItems] = useState<WorkOrder[]>([])
  const [inPrintingItems, setInPrintingItems] = useState<WorkOrder[]>([])
  const [declinedItems, setDeclinedItems] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stockOpen, setStockOpen] = useState(false)
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState<number | null>(null)
  const [declining, setDeclining] = useState<number | null>(null)
  const [savedLogRows, setSavedLogRows] = useState<{ rows: StockRow[]; logDate: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [inPrintingSearch, setInPrintingSearch] = useState('')
  const [scrapDialog, setScrapDialog] = useState<{ id: number; productName: string; batchNumber: string | null; currentScrap: number } | null>(null)
  const [scrapValue, setScrapValue] = useState('')
  const [savingScrap, setSavingScrap] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  const [stockForm, setStockForm] = useState({
    logDate: todayStr,
    rows: [blankRow()],
  })

  const [dispatchForm, setDispatchForm] = useState({
    selectedProductName: '',
    workOrderId: '',
    sheetsDispatched: '',
    dispatchDate: todayStr,
    shift: 'DAY' as ShiftName,
    notes: '',
  })

  const load = async () => {
    try {
      setLoading(true)
      const [sRes, dRes, woRes, ipRes, decRes] = await Promise.all([
        api.get<PrintingShiftLog[]>('/printing-shift-logs'),
        api.get<PrintingDispatch[]>('/printing-dispatches'),
        api.get<WorkOrder[]>('/work-orders?status=PENDING_PRINT'),
        api.get<WorkOrder[]>('/work-orders?status=IN_PRINTING'),
        api.get<WorkOrder[]>('/work-orders?status=DECLINED'),
      ])
      setShiftLogs(Array.isArray(sRes.data) ? sRes.data : [])
      setDispatches(Array.isArray(dRes.data) ? dRes.data : [])
      setPendingItems(Array.isArray(woRes.data) ? woRes.data.filter(w => w.customerOrderId != null) : [])
      setInPrintingItems(Array.isArray(ipRes.data) ? ipRes.data.filter(w => w.customerOrderId != null) : [])
      setDeclinedItems(Array.isArray(decRes.data) ? decRes.data.filter(w => w.customerOrderId != null) : [])
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (id: number) => {
    setAccepting(id)
    try {
      await api.patch(`/work-orders/${id}/accept`)
      load()
    } catch {
      setError('Failed to accept order item')
    } finally {
      setAccepting(null)
    }
  }

  const handleDecline = async (id: number) => {
    setDeclining(id)
    try {
      await api.patch(`/work-orders/${id}/decline`)
      load()
    } catch {
      setError('Failed to decline order item')
    } finally {
      setDeclining(null)
    }
  }

  const handleScrapSubmit = async () => {
    if (!scrapDialog) return
    const val = Number(scrapValue)
    if (isNaN(val) || val < 0) { setError('Scrap must be 0 or more'); return }
    setSavingScrap(true)
    try {
      await api.patch(`/work-orders/${scrapDialog.id}/printing-scrap`, { scrap: val })
      setScrapDialog(null)
      load()
    } catch {
      setError('Failed to save scrap')
    } finally {
      setSavingScrap(false)
    }
  }

  useEffect(() => { load() }, [])
  useAutoRefresh(load, 60000)

  const validateStockForm = (): boolean => {
    const validRows = stockForm.rows.filter(r => r.productName.trim() && Number(r.sheetCount) > 0)
    if (validRows.length === 0) { setError('Add at least one product with a sheet count greater than 0'); return false }
    const invalidRow = stockForm.rows.find(r => r.productName.trim() && (Number(r.sheetCount) <= 0 || isNaN(Number(r.sheetCount))))
    if (invalidRow) { setError(`Sheet count for "${invalidRow.productName}" must be greater than 0`); return false }
    return true
  }

  const validateDispatchForm = (): boolean => {
    if (!dispatchForm.workOrderId) { setError('Select a batch to dispatch'); return false }
    const sheets = Number(dispatchForm.sheetsDispatched)
    if (!dispatchForm.sheetsDispatched || isNaN(sheets) || sheets <= 0) { setError('Sheets dispatched must be greater than 0'); return false }
    return true
  }

  const handleStockSubmit = async () => {
    if (!validateStockForm()) return
    const validRows = stockForm.rows.filter(r => r.productName.trim() && Number(r.sheetCount) > 0)
    if (validRows.length === 0) return
    const overLimit = validRows.find(r => {
      const wo = inPrintingItems.find(w => String(w.id) === r.workOrderId)
      if (!wo) return false
      const dispatched = dispatches.filter(d => d.workOrderId === wo.id).reduce((s, d) => s + d.sheetsDispatched, 0)
      const totalForThisWO = validRows.filter(x => x.workOrderId === r.workOrderId).reduce((s, x) => s + Number(x.sheetCount), 0)
      const available = (wo.sheetsAllocated ?? 0) + (wo.extraSheets ?? 0) - dispatched - wo.printingScrap
      return totalForThisWO > available
    })
    if (overLimit) {
      const wo = inPrintingItems.find(w => String(w.id) === overLimit.workOrderId)!
      const dispatched = dispatches.filter(d => d.workOrderId === wo.id).reduce((s, d) => s + d.sheetsDispatched, 0)
      const available = (wo.sheetsAllocated ?? 0) + (wo.extraSheets ?? 0) - dispatched - wo.printingScrap
      setError(`Total sheet count for "${overLimit.productName}" across all rows exceeds the ${available} sheets remaining in printing`)
      return
    }
    setSubmitting(true)
    try {
      await api.post('/printing-shift-logs', {
        logDate: stockForm.logDate,
        items: validRows.map(r => ({
          productName: r.productName.trim(),
          productType: r.productType,
          batchNumber: r.batchNumber || null,
          category: r.category,
          sheetCount: Number(r.sheetCount),
        })),
      })
      setSavedLogRows({ rows: validRows, logDate: stockForm.logDate })
      setStockForm({ logDate: todayStr, rows: [blankRow()] })
      load()
    } catch {
      setError('Failed to save stock log')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendStockLog = async () => {
    if (!savedLogRows) return
    setSending(true)
    try {
      const catLabel = (c: PrintingStockCategory) => CATEGORIES.find(x => x.value === c)?.label ?? c
      const lines = savedLogRows.rows.map(r =>
        `• ${r.productName} (${r.productType}) — ${catLabel(r.category)}: ${Number(r.sheetCount).toLocaleString()} sheets`
      ).join('\n')
      const content = `Printing Stock Update — ${savedLogRows.logDate}\n\n${lines}`
      await api.post('/messages', { recipientId: null, content })
      setSavedLogRows(null)
      setStockOpen(false)
    } catch {
      setError('Failed to send stock log')
    } finally {
      setSending(false)
    }
  }

  const handleDispatchSubmit = async () => {
    if (!validateDispatchForm()) return
    if (!dispatchForm.workOrderId || !dispatchForm.sheetsDispatched) return
    setSubmitting(true)
    try {
      await api.post('/printing-dispatches', {
        workOrderId: Number(dispatchForm.workOrderId),
        sheetsDispatched: Number(dispatchForm.sheetsDispatched),
        dispatchDate: dispatchForm.dispatchDate,
        shift: dispatchForm.shift,
        notes: dispatchForm.notes || null,
      })
      setDispatchOpen(false)
      setDispatchForm({ selectedProductName: '', workOrderId: '', sheetsDispatched: '', dispatchDate: todayStr, shift: 'DAY', notes: '' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to save dispatch')
    } finally {
      setSubmitting(false)
    }
  }

  const addRow = () => setStockForm(f => ({ ...f, rows: [...f.rows, blankRow()] }))
  const removeRow = (i: number) => setStockForm(f => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }))
  const updateRow = (i: number, patch: Partial<StockRow>) =>
    setStockForm(f => ({ ...f, rows: f.rows.map((r, idx) => idx === i ? { ...r, ...patch } : r) }))

  const latestLog = shiftLogs[0] ?? null
  const todayDispatches = dispatches.filter(d => d.dispatchDate === todayStr)
  const totalSheetsDispatchedToday = todayDispatches.reduce((s, d) => s + d.sheetsDispatched, 0)

  // Table controls for dispatches and stock logs
  const dispatchTC = useTableControls(dispatches, ['productName', 'productType', 'dispatchedBy', 'shift', 'dispatchDate'], {
    defaultSortKey: 'dispatchDate', defaultSortDir: 'desc',
  })
  const logsTC = useTableControls(shiftLogs, ['logDate', 'loggedBy'], {
    defaultSortKey: 'logDate', defaultSortDir: 'desc',
  })

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PrintIcon sx={{ fontSize: 32, color: '#64748B' }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">Printing Department</Typography>
            <Typography color="text.secondary" fontSize={14}>
              Log daily stock status and dispatch sheets to production
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setStockOpen(true)}>
            Log Daily Stock
          </Button>
          <Button variant="contained" startIcon={<LocalShippingIcon />} onClick={() => setDispatchOpen(true)}>
            Dispatch to Production
          </Button>
        </Box>
      </Paper>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Stock Logs Total',           value: shiftLogs.length },
          { label: 'Dispatches Today',            value: todayDispatches.length },
          { label: 'Sheets to Production Today',  value: totalSheetsDispatchedToday.toLocaleString() },
          { label: 'Total Dispatches',            value: dispatches.length },
        ].map(s => (
          <Paper key={s.label} sx={{ p: 2.5, borderLeft: '4px solid #E2E8F0' }}>
            <Typography variant="h4" fontWeight={700} color="text.primary">{s.value}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Pending Order Items */}
      {pendingItems.length > 0 && (
        <Paper sx={{ mb: 3, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
          <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PrintIcon sx={{ color: '#64748B' }} />
            <Box>
              <Typography fontWeight={700} color="text.primary">Orders Awaiting Acceptance</Typography>
              <Typography variant="caption" color="text.secondary">
                Accept each item to generate a batch number and begin printing
              </Typography>
            </Box>
            <Chip label={`${pendingItems.length} pending`} size="small"
              sx={{ ml: 'auto', fontWeight: 700 }} />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 12 } }}>
                  <TableCell>Product</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Planned Qty</TableCell>
                  <TableCell align="right">Total Sheets</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingItems.map(item => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{item.productName}</TableCell>
                    <TableCell><Chip label={item.productType} size="small" sx={{ fontSize: 10 }} /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{item.plannedQuantity.toLocaleString()}</TableCell>
                    <TableCell align="right">{((item.sheetsAllocated ?? 0) + (item.extraSheets ?? 0)).toLocaleString()}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.notes ?? '—'}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircleOutlineIcon />}
                          disabled={accepting === item.id || declining === item.id}
                          onClick={() => handleAccept(item.id)}
                          sx={{ fontSize: 11 }}
                        >
                          {accepting === item.id ? 'Accepting…' : 'Accept'}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={accepting === item.id || declining === item.id}
                          onClick={() => handleDecline(item.id)}
                          sx={{ fontSize: 11 }}
                        >
                          {declining === item.id ? 'Declining…' : 'Decline'}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Items Currently In Printing */}
      {(() => {
        const activeItems = inPrintingItems.map(item => {
          const sheetsDispatched = dispatches
            .filter(d => d.workOrderId === item.id)
            .reduce((s, d) => s + d.sheetsDispatched, 0)
          const allocated = (item.sheetsAllocated ?? 0) + (item.extraSheets ?? 0)
          const remaining = allocated - sheetsDispatched - item.printingScrap
          return { item, sheetsDispatched, allocated, remaining }
        }).filter(r => r.remaining > 0)

        if (activeItems.length === 0) return null

        const q = inPrintingSearch.toLowerCase().trim()
        const filteredItems = q
          ? activeItems.filter(({ item }) =>
              item.productName.toLowerCase().includes(q) ||
              item.productType.toLowerCase().includes(q) ||
              (item.batchNumber ?? '').toLowerCase().includes(q)
            )
          : activeItems

        return (
          <Paper sx={{ mb: 3, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <PrintIcon sx={{ color: '#2563EB' }} />
              <Box>
                <Typography fontWeight={700} color="text.primary">Currently In Printing</Typography>
                <Typography variant="caption" color="text.secondary">
                  Accepted items with sheets still to be sent — fully dispatched items drop off automatically
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableSearch value={inPrintingSearch} onChange={setInPrintingSearch} placeholder="Search product, type, batch…" />
                <Chip label={`${filteredItems.length}${q ? ` of ${activeItems.length}` : ''} active`} size="small" color="primary" sx={{ fontWeight: 700 }} />
              </Box>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 12 } }}>
                    <TableCell>Product</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Batch #</TableCell>
                    <TableCell align="right">Planned Qty</TableCell>
                    <TableCell align="right">Total Sheets</TableCell>
                    <TableCell align="right">Dispatched</TableCell>
                    <TableCell align="right">Remaining</TableCell>
                    <TableCell align="right">Scrap</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No results match your search
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredItems.map(({ item, sheetsDispatched, allocated, remaining }) => {
                    const pct = allocated > 0 ? Math.round((sheetsDispatched / allocated) * 100) : 0
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{item.productName}</TableCell>
                        <TableCell><Chip label={item.productType} size="small" sx={{ fontSize: 10 }} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                          {item.batchNumber ?? '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{item.plannedQuantity.toLocaleString()}</TableCell>
                        <TableCell align="right">{allocated > 0 ? allocated.toLocaleString() : '—'}</TableCell>
                        <TableCell align="right">
                          {sheetsDispatched > 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                              <Typography fontSize={13} fontWeight={600} color="#D97706">
                                {sheetsDispatched.toLocaleString()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">({pct}%)</Typography>
                            </Box>
                          ) : (
                            <Typography fontSize={13} color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontSize={13} fontWeight={700} color={remaining < allocated * 0.2 ? '#DC2626' : 'text.primary'}>
                            {remaining.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                            {item.printingScrap > 0 ? (
                              <Typography fontSize={13} fontWeight={600} color="#DC2626">
                                {item.printingScrap.toLocaleString()}
                              </Typography>
                            ) : (
                              <Typography fontSize={13} color="text.disabled">—</Typography>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => {
                                setScrapDialog({ id: item.id, productName: item.productName, batchNumber: item.batchNumber, currentScrap: item.printingScrap })
                                setScrapValue(String(item.printingScrap))
                              }}
                              sx={{ color: '#64748B', p: 0.25 }}
                              title={item.printingScrap > 0 ? 'Edit scrap' : 'Log scrap'}
                            >
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )
      })()}

      {/* Declined Items */}
      {declinedItems.length > 0 && (
        <Paper sx={{ mb: 3, overflow: 'hidden', border: '1px solid #FECACA' }}>
          <Box sx={{ p: 2, bgcolor: '#FFF5F5', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PrintIcon sx={{ color: '#DC2626' }} />
            <Box>
              <Typography fontWeight={700} color="#DC2626">Declined Items</Typography>
              <Typography variant="caption" color="text.secondary">
                These items were declined — the office manager needs to review or cancel them
              </Typography>
            </Box>
            <Chip label={`${declinedItems.length} declined`} size="small" color="error" sx={{ ml: 'auto', fontWeight: 700 }} />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#FFF5F5', fontSize: 12 } }}>
                  <TableCell>Product</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Planned Qty</TableCell>
                  <TableCell align="right">Total Sheets</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {declinedItems.map(item => (
                  <TableRow key={item.id} sx={{ bgcolor: '#FFF5F5' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{item.productName}</TableCell>
                    <TableCell><Chip label={item.productType} size="small" sx={{ fontSize: 10 }} /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{item.plannedQuantity.toLocaleString()}</TableCell>
                    <TableCell align="right">{((item.sheetsAllocated ?? 0) + (item.extraSheets ?? 0)).toLocaleString()}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.notes ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>

        {/* Latest Stock Log */}
        <Paper>
          <Box sx={{ p: 2, borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography fontWeight={700}>Latest Stock Log</Typography>
              {latestLog && (
                <Typography variant="caption" color="text.secondary">
                  {latestLog.logDate} — {latestLog.shift === 'DAY' ? '☀ Day' : '🌙 Night'} shift
                </Typography>
              )}
            </Box>
            {shiftLogs.length > 0 && <Chip label={`${shiftLogs.length} total`} size="small" />}
          </Box>
          {!latestLog ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              No stock logs yet — click "Log Daily Stock" to add one
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              {CATEGORIES.map(cat => {
                const items = latestLog.items.filter(i => i.category === cat.value)
                if (items.length === 0) return null
                return (
                  <Box key={cat.value} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cat.color }} />
                      <Typography fontWeight={700} fontSize={13} color={cat.color}>{cat.label}</Typography>
                    </Box>
                    {items.map(item => (
                      <Box key={item.id} sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        px: 1.5, py: 0.75, mb: 0.5, borderRadius: 1.5,
                        bgcolor: cat.color + '10', border: `1px solid ${cat.color}30`,
                      }}>
                        <Box>
                          <Typography fontSize={13} fontWeight={600}>{item.productName}</Typography>
                          <Chip label={item.productType} size="small" sx={{ fontSize: 10, height: 18, mt: 0.25 }} />
                        </Box>
                        <Typography fontWeight={800} fontSize={15} color={cat.color}>
                          {item.sheetCount.toLocaleString()} sheets
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )
              })}
            </Box>
          )}
        </Paper>

        {/* Recent Dispatches to Production */}
        <Paper>
          <Box sx={{ p: 2, borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography fontWeight={700}>Dispatched to Production</Typography>
              <Typography variant="caption" color="text.secondary">{dispatchTC.total} of {dispatchTC.totalUnfiltered}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TableSearch value={dispatchTC.search} onChange={dispatchTC.setSearch} placeholder="Search product, shift…" />
              <ExportButton
                onExcel={() => exportToExcel(dispatchTC.paginated.map(d => ({
                  Date: d.dispatchDate, Product: d.productName, Type: d.productType,
                  Shift: d.shift ?? '', Sheets: d.sheetsDispatched, By: d.dispatchedBy ?? '',
                })), `printing-dispatches-${todayStr}`)}
                onCsv={() => exportToCSV(dispatchTC.paginated.map(d => ({
                  Date: d.dispatchDate, Product: d.productName, Type: d.productType,
                  Shift: d.shift ?? '', Sheets: d.sheetsDispatched, By: d.dispatchedBy ?? '',
                })), `printing-dispatches-${todayStr}`)}
              />
            </Box>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableCell label="Date" sortKey="dispatchDate" currentKey={String(dispatchTC.sortKey ?? '')} dir={dispatchTC.sortDir} onSort={k => dispatchTC.toggleSort(k as keyof PrintingDispatch)} />
                  <SortableCell label="Product" sortKey="productName" currentKey={String(dispatchTC.sortKey ?? '')} dir={dispatchTC.sortDir} onSort={k => dispatchTC.toggleSort(k as keyof PrintingDispatch)} />
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', fontSize: 12 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', fontSize: 12 }}>Shift</TableCell>
                  <SortableCell label="Sheets" sortKey="sheetsDispatched" currentKey={String(dispatchTC.sortKey ?? '')} dir={dispatchTC.sortDir} onSort={k => dispatchTC.toggleSort(k as keyof PrintingDispatch)} align="right" />
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', fontSize: 12 }}>By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dispatchTC.paginated.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {dispatchTC.search ? 'No results match your search' : 'No dispatches logged yet'}
                    </TableCell>
                  </TableRow>
                )}
                {dispatchTC.paginated.map(d => (
                  <TableRow key={d.id} hover>
                    <TableCell sx={{ fontSize: 12 }}>{d.dispatchDate}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{d.productName}</TableCell>
                    <TableCell><Chip label={d.productType} size="small" sx={{ fontSize: 10 }} /></TableCell>
                    <TableCell>
                      <Chip label={d.shift === 'DAY' ? '☀ Day' : d.shift === 'NIGHT' ? '🌙 Night' : '—'}
                        size="small"
                        sx={{ fontSize: 10, bgcolor: d.shift === 'DAY' ? '#FEF3C7' : d.shift === 'NIGHT' ? '#EEF2FF' : '#F3F4F6' }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{d.sheetsDispatched.toLocaleString()}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{d.dispatchedBy ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePager total={dispatchTC.total} page={dispatchTC.page} perPage={dispatchTC.perPage} onPage={dispatchTC.setPage} onPerPage={dispatchTC.setPerPage} />
        </Paper>
      </Box>

      {/* All stock logs history */}
      {shiftLogs.length > 0 && (
        <Paper sx={{ mt: 3 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography fontWeight={700}>All Stock Logs</Typography>
              <Typography variant="caption" color="text.secondary">{logsTC.total} of {logsTC.totalUnfiltered}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TableSearch value={logsTC.search} onChange={logsTC.setSearch} placeholder="Search date, logged by…" />
              <ExportButton
                onExcel={() => exportToExcel(logsTC.paginated.map(l => ({
                  Date: l.logDate, Shift: l.shift, Items: l.items.length,
                  'Total Sheets': l.items.reduce((s, i) => s + i.sheetCount, 0),
                  'Logged By': l.loggedBy ?? '', 'Logged At': new Date(l.loggedAt).toLocaleString(),
                })), `stock-logs-${todayStr}`)}
                onCsv={() => exportToCSV(logsTC.paginated.map(l => ({
                  Date: l.logDate, Shift: l.shift, Items: l.items.length,
                  'Total Sheets': l.items.reduce((s, i) => s + i.sheetCount, 0),
                  'Logged By': l.loggedBy ?? '', 'Logged At': new Date(l.loggedAt).toLocaleString(),
                })), `stock-logs-${todayStr}`)}
              />
            </Box>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableCell label="Date" sortKey="logDate" currentKey={String(logsTC.sortKey ?? '')} dir={logsTC.sortDir} onSort={k => logsTC.toggleSort(k as keyof PrintingShiftLog)} />
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', fontSize: 12 }}>Shift</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', fontSize: 12 }}>Items</TableCell>
                  <SortableCell label="Logged By" sortKey="loggedBy" currentKey={String(logsTC.sortKey ?? '')} dir={logsTC.sortDir} onSort={k => logsTC.toggleSort(k as keyof PrintingShiftLog)} />
                  <SortableCell label="Logged At" sortKey="loggedAt" currentKey={String(logsTC.sortKey ?? '')} dir={logsTC.sortDir} onSort={k => logsTC.toggleSort(k as keyof PrintingShiftLog)} />
                </TableRow>
              </TableHead>
              <TableBody>
                {logsTC.paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {logsTC.search ? 'No results match your search' : 'No stock logs yet'}
                    </TableCell>
                  </TableRow>
                )}
                {logsTC.paginated.map(log => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{log.logDate}</TableCell>
                    <TableCell>
                      <Chip label={log.shift === 'DAY' ? '☀ Day' : '🌙 Night'} size="small"
                        sx={{ bgcolor: log.shift === 'DAY' ? '#FEF3C7' : '#EEF2FF', fontSize: 10 }} />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{log.items.length} product{log.items.length !== 1 ? 's' : ''}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{log.loggedBy ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{new Date(log.loggedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePager total={logsTC.total} page={logsTC.page} perPage={logsTC.perPage} onPage={logsTC.setPage} onPerPage={logsTC.setPerPage} />
        </Paper>
      )}

      {/* ─── Log / Edit Printing Scrap Dialog ─── */}
      <Dialog open={!!scrapDialog} onClose={() => setScrapDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {scrapDialog?.currentScrap ? 'Edit Printing Scrap' : 'Log Printing Scrap'}
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {scrapDialog && (
            <>
              <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                <Typography fontSize={13} fontWeight={700}>{scrapDialog.productName}</Typography>
                {scrapDialog.batchNumber && (
                  <Typography fontSize={12} color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {scrapDialog.batchNumber}
                  </Typography>
                )}
                {scrapDialog.currentScrap > 0 && (
                  <Typography fontSize={12} color="#DC2626" mt={0.5}>
                    Current scrap: {scrapDialog.currentScrap.toLocaleString()} sheets
                  </Typography>
                )}
              </Box>
              <TextField
                label="Scrap Sheets"
                type="number"
                fullWidth
                autoFocus
                value={scrapValue}
                onChange={e => setScrapValue(e.target.value)}
                inputProps={{ min: 0 }}
                helperText="Total scrapped sheets for this batch — replaces the current value"
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setScrapDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleScrapSubmit}
            disabled={savingScrap || scrapValue === '' || Number(scrapValue) < 0}
          >
            {savingScrap ? 'Saving…' : 'Save Scrap'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Log Daily Stock Dialog ─── */}
      <Dialog open={stockOpen} onClose={() => { setStockOpen(false); setSavedLogRows(null) }} maxWidth="md" fullWidth fullScreen={fullScreen}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>
          {savedLogRows ? 'Stock Log Saved' : 'Log Daily Stock'}
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {savedLogRows ? (
            <>
              <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                Stock log for <strong>{savedLogRows.logDate}</strong> saved successfully.
              </Alert>
              <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                <Typography fontWeight={700} fontSize={13} color="text.secondary" mb={1.5}>LOGGED ITEMS</Typography>
                {savedLogRows.rows.map((r, i) => {
                  const cat = CATEGORIES.find(c => c.value === r.category)
                  return (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, borderBottom: i < savedLogRows.rows.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cat?.color ?? '#64748B', flexShrink: 0 }} />
                      <Typography fontSize={13} fontWeight={600} sx={{ flex: 1 }}>{r.productName}</Typography>
                      <Chip label={cat?.label ?? r.category} size="small" sx={{ fontSize: 10 }} />
                      <Typography fontSize={13} fontWeight={700}>{Number(r.sheetCount).toLocaleString()} sheets</Typography>
                    </Box>
                  )
                })}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography fontSize={13} color="text.secondary">
                  Would you like to send this stock update to Production and Office?
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <PDFDownloadLink
                    document={<StockLogPDF logDate={savedLogRows.logDate} items={savedLogRows.rows} />}
                    fileName={`stock-log-${savedLogRows.logDate}.pdf`}
                    style={{ textDecoration: 'none' }}
                  >
                    {({ loading, url }) => (
                      <>
                        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={loading}>
                          {loading ? 'Preparing…' : 'Download PDF'}
                        </Button>
                        {url && (
                          <Button size="small" variant="outlined" startIcon={<SendIcon />} component="a" href={url} target="_blank" rel="noopener noreferrer">
                            View PDF
                          </Button>
                        )}
                      </>
                    )}
                  </PDFDownloadLink>
                </Box>
              </Box>
            </>
          ) : (
          <>
          <TextField label="Date" type="date" fullWidth InputLabelProps={{ shrink: true }}
            value={stockForm.logDate}
            onChange={e => setStockForm(f => ({ ...f, logDate: e.target.value }))} />

          <Divider />
          <Typography fontWeight={700} fontSize={13} color="text.secondary">STOCK ITEMS</Typography>

          {stockForm.rows.map((row, i) => (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '2fr 1fr 1.5fr 1fr auto' }, gap: 1.5, alignItems: 'flex-start' }}>
              <FormControl size="small" fullWidth required>
                <InputLabel>Product (In Printing)</InputLabel>
                <Select
                  value={row.workOrderId}
                  label="Product (In Printing)"
                  onChange={e => {
                    const wo = inPrintingItems.find(w => String(w.id) === e.target.value)
                    if (wo) updateRow(i, { workOrderId: String(wo.id), productName: wo.productName, productType: wo.productType, batchNumber: wo.batchNumber ?? '' })
                  }}
                >
                  {inPrintingItems.length === 0 && (
                    <MenuItem value="" disabled>No work orders currently in printing</MenuItem>
                  )}
                  {inPrintingItems.map(wo => (
                    <MenuItem key={wo.id} value={String(wo.id)}>{wo.productName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Batch Number"
                size="small"
                fullWidth
                value={row.batchNumber}
                InputProps={{ readOnly: true }}
                InputLabelProps={{ shrink: !!row.batchNumber }}
                placeholder="Auto-filled"
                sx={{ '& .MuiInputBase-input': { color: '#374151', fontWeight: 700, fontFamily: 'monospace' } }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={row.category} label="Category"
                  onChange={e => updateRow(i, { category: e.target.value as PrintingStockCategory })}>
                  {CATEGORIES.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color }} />
                        {c.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(() => {
                const wo = inPrintingItems.find(w => String(w.id) === row.workOrderId)
                const dispatched = wo ? dispatches.filter(d => d.workOrderId === wo.id).reduce((s, d) => s + d.sheetsDispatched, 0) : 0
                const usedInOtherRows = wo ? stockForm.rows.filter((r, ri) => ri !== i && r.workOrderId === row.workOrderId).reduce((s, r) => s + (Number(r.sheetCount) || 0), 0) : 0
                const available = wo ? (wo.sheetsAllocated ?? 0) + (wo.extraSheets ?? 0) - dispatched - usedInOtherRows - wo.printingScrap : null
                const exceeded = available !== null && Number(row.sheetCount) > available
                return (
                  <TextField
                    label="Sheet Count"
                    size="small"
                    type="number"
                    fullWidth
                    value={row.sheetCount}
                    onChange={e => updateRow(i, { sheetCount: e.target.value })}
                    error={exceeded}
                    helperText={exceeded ? `Max ${available} sheets` : available !== null ? `Max: ${available}` : ''}
                    inputProps={{ min: 1, max: available ?? undefined }}
                  />
                )
              })()}
              <IconButton size="small" onClick={() => removeRow(i)} disabled={stockForm.rows.length === 1}
                sx={{ color: '#EF4444', mt: 0.5 }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}

          <Button startIcon={<AddIcon />} onClick={addRow} sx={{ alignSelf: 'flex-start' }}>
            Add Product
          </Button>
          </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {savedLogRows ? (
            <>
              <Button onClick={() => { setStockOpen(false); setSavedLogRows(null) }}>Close</Button>
              <Button variant="contained" startIcon={<SendIcon />} onClick={handleSendStockLog} disabled={sending}>
                {sending ? 'Sending…' : 'Send to Production & Office'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setStockOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleStockSubmit} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Stock Log'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ─── Dispatch to Production Dialog ─── */}
      <Dialog open={dispatchOpen} onClose={() => { setDispatchOpen(false); setDispatchForm({ selectedProductName: '', workOrderId: '', sheetsDispatched: '', dispatchDate: todayStr, shift: 'DAY', notes: '' }) }} maxWidth="sm" fullWidth fullScreen={fullScreen}>
        <DialogTitle sx={{ fontWeight: 700 }}>Dispatch Sheets to Production</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {inPrintingItems.length === 0 ? (
            <Alert severity="info">No items are currently in printing. Accept an order item first.</Alert>
          ) : (
            <>
              {/* Step 1 — Product name */}
              {(() => {
                const activeItems = inPrintingItems.filter(wo => {
                  const dispatched = dispatches.filter(d => d.workOrderId === wo.id).reduce((s, d) => s + d.sheetsDispatched, 0)
                  return (wo.sheetsAllocated ?? 0) + (wo.extraSheets ?? 0) - dispatched - wo.printingScrap > 0
                })
                const uniqueNames = [...new Set(activeItems.map(w => w.productName))]
                return (
                  <FormControl fullWidth required>
                    <InputLabel>Product Name</InputLabel>
                    <Select
                      value={dispatchForm.selectedProductName}
                      label="Product Name"
                      onChange={e => setDispatchForm(f => ({ ...f, selectedProductName: e.target.value, workOrderId: '', sheetsDispatched: '' }))}
                    >
                      {uniqueNames.map(name => (
                        <MenuItem key={name} value={name}>{name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )
              })()}

              {/* Step 2 — Batch number (only shown after product is selected) */}
              {dispatchForm.selectedProductName && (() => {
                const batchOptions = inPrintingItems.filter(wo => {
                  if (wo.productName !== dispatchForm.selectedProductName) return false
                  const dispatched = dispatches.filter(d => d.workOrderId === wo.id).reduce((s, d) => s + d.sheetsDispatched, 0)
                  return (wo.sheetsAllocated ?? 0) + (wo.extraSheets ?? 0) - dispatched - wo.printingScrap > 0
                })
                return (
                  <FormControl fullWidth required>
                    <InputLabel>Batch Number</InputLabel>
                    <Select
                      value={dispatchForm.workOrderId}
                      label="Batch Number"
                      onChange={e => setDispatchForm(f => ({ ...f, workOrderId: e.target.value, sheetsDispatched: '' }))}
                    >
                      {batchOptions.map(wo => {
                        const dispatched = dispatches.filter(d => d.workOrderId === wo.id).reduce((s, d) => s + d.sheetsDispatched, 0)
                        const remaining = (wo.sheetsAllocated ?? 0) + (wo.extraSheets ?? 0) - dispatched - wo.printingScrap
                        return (
                          <MenuItem key={wo.id} value={String(wo.id)}>
                            <Box>
                              <Typography fontSize={13} fontWeight={700} sx={{ fontFamily: 'monospace' }}>{wo.batchNumber}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {remaining.toLocaleString()} sheets remaining
                              </Typography>
                            </Box>
                          </MenuItem>
                        )
                      })}
                    </Select>
                  </FormControl>
                )
              })()}

              {/* Sheet balance panel — shown when a work order is selected */}
              {(() => {
                const wo = inPrintingItems.find(w => String(w.id) === dispatchForm.workOrderId)
                if (!wo) return null
                const alreadyDispatched = dispatches
                  .filter(d => d.workOrderId === wo.id)
                  .reduce((s, d) => s + d.sheetsDispatched, 0)
                const allocated = (wo.sheetsAllocated ?? 0) + (wo.extraSheets ?? 0)
                const remaining = allocated - alreadyDispatched - wo.printingScrap
                const thisDispatch = Number(dispatchForm.sheetsDispatched) || 0
                const afterDispatch = remaining - thisDispatch
                return (
                  <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                    <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1}>SHEET BALANCE — {wo.productName}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Allocated</Typography>
                        <Typography fontWeight={700} fontSize={18}>{allocated.toLocaleString()}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Already Sent</Typography>
                        <Typography fontWeight={700} fontSize={18} color={alreadyDispatched > 0 ? '#D97706' : 'text.primary'}>
                          {alreadyDispatched.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {thisDispatch > 0 ? 'After This Dispatch' : 'Remaining'}
                        </Typography>
                        <Typography fontWeight={700} fontSize={18} color={afterDispatch < 0 ? '#DC2626' : afterDispatch === 0 ? '#16A34A' : 'text.primary'}>
                          {thisDispatch > 0 ? afterDispatch.toLocaleString() : remaining.toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                    {afterDispatch < 0 && thisDispatch > 0 && (
                      <Alert severity="error" sx={{ mt: 1.5, fontSize: 12 }}>
                        Exceeds remaining sheets by {Math.abs(afterDispatch).toLocaleString()}
                      </Alert>
                    )}
                  </Box>
                )
              })()}

              <TextField
                label="Sheets Dispatched"
                type="number"
                fullWidth
                required
                value={dispatchForm.sheetsDispatched}
                disabled={!dispatchForm.workOrderId}
                onChange={e => setDispatchForm(f => ({ ...f, sheetsDispatched: e.target.value }))}
                helperText={dispatchForm.workOrderId ? 'How many sheets are you sending to production now' : 'Select an item first'}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Shift</InputLabel>
                  <Select value={dispatchForm.shift} label="Shift"
                    onChange={e => setDispatchForm(f => ({ ...f, shift: e.target.value as ShiftName }))}>
                    <MenuItem value="DAY">Day Shift</MenuItem>
                    <MenuItem value="NIGHT">Night Shift</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Date" type="date" fullWidth InputLabelProps={{ shrink: true }}
                  value={dispatchForm.dispatchDate}
                  onChange={e => setDispatchForm(f => ({ ...f, dispatchDate: e.target.value }))} />
              </Box>

              <TextField label="Notes (optional)" fullWidth multiline rows={2}
                value={dispatchForm.notes}
                onChange={e => setDispatchForm(f => ({ ...f, notes: e.target.value }))} />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setDispatchOpen(false); setDispatchForm({ selectedProductName: '', workOrderId: '', sheetsDispatched: '', dispatchDate: todayStr, shift: 'DAY', notes: '' }) }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleDispatchSubmit}
            disabled={submitting || !dispatchForm.workOrderId || !dispatchForm.sheetsDispatched || (() => {
              const wo = inPrintingItems.find(w => String(w.id) === dispatchForm.workOrderId)
              if (!wo) return true
              const alreadyDispatched = dispatches.filter(d => d.workOrderId === wo.id).reduce((s, d) => s + d.sheetsDispatched, 0)
              const remaining = (wo.sheetsAllocated ?? 0) + (wo.extraSheets ?? 0) - alreadyDispatched - wo.printingScrap
              return Number(dispatchForm.sheetsDispatched) > remaining
            })()}>
            {submitting ? 'Saving…' : 'Confirm Dispatch'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
