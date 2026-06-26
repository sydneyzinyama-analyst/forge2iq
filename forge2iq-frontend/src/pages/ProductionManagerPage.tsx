import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, LinearProgress, Alert, InputAdornment, IconButton,
  Autocomplete, useMediaQuery, useTheme,
} from '@mui/material'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { ExportButton } from '../components/TableToolbar'
import { exportToExcel, exportToCSV } from '../utils/exportUtils'
import FactoryIcon from '@mui/icons-material/Factory'
import AddIcon from '@mui/icons-material/Add'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import SendIcon from '@mui/icons-material/Send'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import DownloadIcon from '@mui/icons-material/Download'
import PrintIcon from '@mui/icons-material/Print'
import api from '../api/axios'
import StockLogPDF from '../components/StockLogPDF'
import type { ShiftEntry, SheetReceipt, PrintingDispatch, PrintingShiftLog, ShiftName, ProductionLine, ProductType, Product } from '../types'

const ALL_LINES: ProductionLine[] = ['LID_LINE_1', 'LID_LINE_2', 'LID_LINE_3', 'BODY_LINE_1', 'BODY_LINE_2', 'BODY_LINE_4']
const fmtLine = (l: ProductionLine) => l.replace(/_/g, ' ')

export default function ProductionManagerPage() {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'))

  const [entries, setEntries] = useState<ShiftEntry[]>([])
  const [receipts, setReceipts] = useState<SheetReceipt[]>([])
  const [printingDispatches, setPrintingDispatches] = useState<PrintingDispatch[]>([])
  const [printingShiftLogs, setPrintingShiftLogs] = useState<PrintingShiftLog[]>([])
  const [viewingStockLog, setViewingStockLog] = useState<PrintingShiftLog | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logOpen, setLogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDispatchOpen, setConfirmDispatchOpen] = useState(false)
  const [pendingDispatch, setPendingDispatch] = useState<PrintingDispatch | null>(null)
  const [confirmShift, setConfirmShift] = useState<ShiftName>('DAY')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportNotes, setReportNotes] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  const [form, setForm] = useState({
    productName: '',
    productType: 'BODY' as ProductType,
    line: 'BODY_LINE_1' as ProductionLine,
    shift: 'DAY' as ShiftName,
    shiftDate: new Date().toISOString().split('T')[0],
    openingStock: '0',
    sheetsReceived: '0',
    sheetsUsed: '',
    productionQty: '',
    scrap: '0',
    openingBins: '0',
    closingBins: '0',
    batchNumber: '',
    operatorName: '',
  })

  const productionQtyNum = Number(form.productionQty) || 0
  const scrapNum = Number(form.scrap) || 0
  const openingStockNum = Number(form.openingStock) || 0
  const sheetsUsedNum = Number(form.sheetsUsed) || 0
  const unitsPerBin = form.productType === 'LID' ? 2856 : 1080

  const catalogProduct = products.find(p => p.name.toLowerCase() === form.productName.trim().toLowerCase())
  const unitsPerSheet = catalogProduct?.unitsPerSheet ?? null

  const handleSheetsUsedChange = (val: string) => {
    const sheets = Number(val) || 0
    if (unitsPerSheet && sheets > 0) {
      const gross = sheets * unitsPerSheet
      const net = Math.max(0, gross - (Number(form.scrap) || 0))
      setForm(f => ({ ...f, sheetsUsed: val, productionQty: String(net) }))
    } else {
      setForm(f => ({ ...f, sheetsUsed: val }))
    }
  }

  const handleProductionQtyChange = (val: string) => {
    const qty = Number(val) || 0
    const sheets = unitsPerSheet && qty > 0 ? String(Math.ceil(qty / unitsPerSheet)) : form.sheetsUsed
    setForm(f => ({ ...f, productionQty: val, sheetsUsed: sheets }))
  }

  const handleScrapChange = (val: string) => {
    const scrap = Number(val) || 0
    if (unitsPerSheet && Number(form.sheetsUsed) > 0) {
      const gross = Number(form.sheetsUsed) * unitsPerSheet
      const net = Math.max(0, gross - scrap)
      setForm(f => ({ ...f, scrap: val, productionQty: String(net) }))
    } else {
      setForm(f => ({ ...f, scrap: val }))
    }
  }
  // Auto-fill sheets received from receipt log when productName is entered
  const otherShift: ShiftName = form.shift === 'DAY' ? 'NIGHT' : 'DAY'
  const hasProductName = form.productName.trim().length > 0
  const shiftDateReceipts = hasProductName
    ? receipts.filter(r =>
        r.productName.toLowerCase() === form.productName.trim().toLowerCase() &&
        r.receivedAt.startsWith(form.shiftDate) &&
        (r.shift === form.shift || r.shift == null) &&
        (!form.batchNumber || !r.batchNumber || r.batchNumber === form.batchNumber)
      )
    : []
  const otherShiftReceipts = hasProductName
    ? receipts.filter(r =>
        r.productName.toLowerCase() === form.productName.trim().toLowerCase() &&
        r.receivedAt.startsWith(form.shiftDate) &&
        r.shift != null &&
        r.shift === otherShift &&
        (!form.batchNumber || !r.batchNumber || r.batchNumber === form.batchNumber)
      )
    : []
  const shiftDateReceiptTotal = shiftDateReceipts.reduce((s, r) => s + r.sheetsReceived, 0)
  const otherShiftTotal = otherShiftReceipts.reduce((s, r) => s + r.sheetsReceived, 0)

  // Sheets already counted in earlier entries for this same product + batch + shift today.
  // Subtract these so we don't double-count when a second line runs the same product.
  const alreadyAccountedReceipts = hasProductName
    ? entries
        .filter(e =>
          e.productName.toLowerCase() === form.productName.trim().toLowerCase() &&
          e.shiftDate === form.shiftDate &&
          e.shift === form.shift &&
          (!form.batchNumber || e.batchNumber === form.batchNumber)
        )
        .reduce((s, e) => s + (e.sheetsReceived ?? 0), 0)
    : 0

  // Always lock the sheets received field once a product is selected
  const sheetsReceivedLocked = hasProductName
  const effectiveSheetsReceived = hasProductName
    ? Math.max(0, shiftDateReceiptTotal - alreadyAccountedReceipts)
    : (Number(form.sheetsReceived) || 0)
  const closingStock = openingStockNum + effectiveSheetsReceived - sheetsUsedNum

  // Carry-over: stock follows product+batch; bins follow product only (bins belong to the product, not a batch).
  const applyCarryOver = (productName: string, batchNumber?: string) => {
    const sorted = (arr: ShiftEntry[]) =>
      [...arr].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())

    const prevStock = sorted(
      entries.filter(e => {
        const nameMatch = e.productName.toLowerCase() === productName.trim().toLowerCase()
        const batchMatch = !batchNumber || e.batchNumber === batchNumber
        return nameMatch && batchMatch
      })
    )[0]

    const prevBins = sorted(
      entries.filter(e => e.productName.toLowerCase() === productName.trim().toLowerCase())
    )[0]

    setForm(f => ({
      ...f,
      openingStock: prevStock ? String(prevStock.closingStock) : '0',
      openingBins:  prevBins  ? String(prevBins.closingBins)  : '0',
      closingBins:  '0',
    }))
  }

  // Auto-select the shift that hasn't been logged yet for this batch on this date
  const applyShiftFromBatch = (batchNumber: string, shiftDate: string) => {
    if (!batchNumber) return
    const existingShifts = entries
      .filter(e => e.batchNumber === batchNumber && e.shiftDate === shiftDate)
      .map(e => e.shift)
    if (existingShifts.includes('DAY') && !existingShifts.includes('NIGHT')) {
      setForm(f => ({ ...f, shift: 'NIGHT' }))
    } else if (existingShifts.includes('NIGHT') && !existingShifts.includes('DAY')) {
      setForm(f => ({ ...f, shift: 'DAY' }))
    }
  }

  const load = async () => {
    try {
      setLoading(true)
      const [eRes, rRes, pdRes, prRes, slRes] = await Promise.all([
        api.get<ShiftEntry[]>('/shift-entries'),
        api.get<SheetReceipt[]>('/sheet-receipts'),
        api.get<PrintingDispatch[]>('/printing-dispatches'),
        api.get<Product[]>('/products'),
        api.get<PrintingShiftLog[]>('/printing-shift-logs'),
      ])
      setEntries(Array.isArray(eRes.data) ? eRes.data : [])
      setReceipts(Array.isArray(rRes.data) ? rRes.data : [])
      setPrintingDispatches(Array.isArray(pdRes.data) ? pdRes.data : [])
      setProducts(Array.isArray(prRes.data) ? prRes.data : [])
      setPrintingShiftLogs(Array.isArray(slRes.data) ? slRes.data : [])
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useAutoRefresh(load, 30000)

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!form.productName.trim()) errs.productName = 'Product name is required'
    const sheets = Number(form.sheetsUsed)
    if (!form.sheetsUsed) errs.sheetsUsed = 'Required'
    else if (isNaN(sheets) || sheets <= 0) errs.sheetsUsed = 'Must be greater than 0'
    const qty = Number(form.productionQty)
    if (!form.productionQty) errs.productionQty = 'Required'
    else if (isNaN(qty) || qty < 0) errs.productionQty = 'Cannot be negative'
    const scrap = Number(form.scrap)
    if (form.scrap && (isNaN(scrap) || scrap < 0)) errs.scrap = 'Cannot be negative'
    if (!form.operatorName.trim()) errs.operatorName = 'Operator name is required'
    const today = new Date().toISOString().split('T')[0]
    if (form.shiftDate > today) errs.shiftDate = 'Date cannot be in the future'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleLog = async () => {
    if (!validateForm()) return
    setSubmitting(true)
    try {
      await api.post('/shift-entries', {
        workOrderId: null,
        productName: form.productName,
        productType: form.productType,
        line: form.line,
        shift: form.shift,
        shiftDate: form.shiftDate,
        openingStock: Number(form.openingStock),
        sheetsReceived: effectiveSheetsReceived || null,
        sheetsUsed: Number(form.sheetsUsed),
        productionQty: productionQtyNum,
        scrap: scrapNum,
        openingBins: Number(form.openingBins) || 0,
        closingBins: Number(form.closingBins) || 0,
        batchNumber: form.batchNumber || null,
        operatorName: form.operatorName,
      })
      setLogOpen(false)
      setForm({
        productName: '', productType: 'BODY', line: 'BODY_LINE_1', shift: 'DAY',
        shiftDate: new Date().toISOString().split('T')[0],
        openingStock: '0', sheetsReceived: '0', sheetsUsed: '', productionQty: '', scrap: '0',
        openingBins: '0', closingBins: '0', batchNumber: '', operatorName: '',
      })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to log entry')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDispatch = async () => {
    if (!pendingDispatch) return
    setSubmitting(true)
    try {
      await api.patch(`/printing-dispatches/${pendingDispatch.id}/confirm`, { shift: confirmShift })
      setConfirmDispatchOpen(false)
      setPendingDispatch(null)
      load()
    } catch {
      setError('Failed to confirm receipt')
    } finally {
      setSubmitting(false)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)

  const handleSendReport = async () => {
    setReportSubmitting(true)
    try {
      await api.post('/production-reports', { reportDate: selectedDate, notes: reportNotes || null })
      setReportOpen(false)
      setReportNotes('')
    } catch {
      setError('Failed to submit report')
    } finally {
      setReportSubmitting(false)
    }
  }

  const dateEntries = entries.filter(e => e.shiftDate === selectedDate)
  const dayEntries  = dateEntries.filter(e => e.shift === 'DAY')
  const nightEntries = dateEntries.filter(e => e.shift === 'NIGHT')

  const dateReceipts = receipts.filter(r => r.receivedAt.startsWith(selectedDate))
  const totalSheetsDate = dateReceipts.reduce((s, r) => s + r.sheetsReceived, 0)

  const datePrintingDispatches = printingDispatches.filter(d => d.dispatchDate === selectedDate)
  const totalSheetsDispatched = datePrintingDispatches.filter(d => d.confirmed).reduce((s, d) => s + d.sheetsDispatched, 0)

  // Products + batches available for shift entry: confirmed dispatches where sheets remain
  type ConfirmedProduct = { productName: string; productType: ProductType; totalSheets: number; batchNumbers: string[] }

  const batchHasSheetsLeft = (batchNumber: string): boolean => {
    const batchEntries = [...entries]
      .filter(e => e.batchNumber === batchNumber)
      .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
    if (batchEntries.length === 0) return true  // never used — all sheets still available
    return batchEntries[0].closingStock > 0     // still has sheets left after last entry
  }

  const confirmedProductMap: Record<string, ConfirmedProduct> = {}
  printingDispatches
    .filter(d => d.confirmed)
    .forEach(d => {
      if (d.batchNumber && !batchHasSheetsLeft(d.batchNumber)) return  // skip exhausted batches

      // Use the latest closing stock for this batch as "remaining", falling back to dispatched qty
      const batchEntries = d.batchNumber
        ? [...entries]
            .filter(e => e.batchNumber === d.batchNumber)
            .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
        : []
      const remaining = batchEntries.length > 0 ? batchEntries[0].closingStock : d.sheetsDispatched

      if (!confirmedProductMap[d.productName]) {
        confirmedProductMap[d.productName] = { productName: d.productName, productType: d.productType, totalSheets: 0, batchNumbers: [] }
      }
      confirmedProductMap[d.productName].totalSheets += remaining
      if (d.batchNumber && !confirmedProductMap[d.productName].batchNumbers.includes(d.batchNumber)) {
        confirmedProductMap[d.productName].batchNumbers.push(d.batchNumber)
      }
    })
  // Hide a product from the "Log Shift" dropdown once both DAY and NIGHT have been logged for it on the chosen date.
  const confirmedProductOptions = Object.values(confirmedProductMap).filter(opt => {
    const shiftsLogged = entries
      .filter(e => e.productName.toLowerCase() === opt.productName.toLowerCase() && e.shiftDate === form.shiftDate)
      .map(e => e.shift)
    return !(shiftsLogged.includes('DAY') && shiftsLogged.includes('NIGHT'))
  })

  // Batch options for the currently selected product
  const batchOptionsForProduct = confirmedProductOptions
    .find(p => p.productName === form.productName)?.batchNumbers ?? []

  const productsOnDate = [...new Set(dateEntries.map(e => e.productName))].sort()

  const totalUnits = dateEntries.reduce((s, e) => s + e.productionQty, 0)
  const totalScrap = dateEntries.reduce((s, e) => s + e.scrap, 0)
  const scrapRate = totalUnits > 0 ? ((totalScrap / (totalUnits + totalScrap)) * 100).toFixed(1) : '0.0'

  const navigateDate = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const sumField = (arr: ShiftEntry[], field: keyof ShiftEntry) =>
    arr.reduce((s, e) => s + (Number(e[field]) || 0), 0)

  // Shared cell styles
  const thDay   = { bgcolor: '#F8FAFC', color: '#374151', fontWeight: 700, fontSize: 12, py: 1 }
  const thNight = { bgcolor: '#1E293B', color: '#CBD5E1', fontWeight: 700, fontSize: 12, py: 1 }
  const thSub   = { bgcolor: '#F9FAFB', fontWeight: 600, fontSize: 11, py: 0.75 }
  const tdDay   = { fontSize: 13 }
  const tdNight = { bgcolor: '#F8FAFC', fontSize: 13 }
  const tdTotal = { fontWeight: 700, fontSize: 13, bgcolor: '#F9FAFB' }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FactoryIcon sx={{ fontSize: 32, color: '#64748B' }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">Production Manager</Typography>
            <Typography color="text.secondary" fontSize={14}>24-Hour Sheet — Day &amp; Night Shift</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setLogOpen(true)}>
            Log Shift Entry
          </Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={() => setReportOpen(true)}>
            Send 24hr Report
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Date navigator */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <IconButton onClick={() => navigateDate(-1)} size="small"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
          <TextField
            type="date"
            size="small"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <IconButton onClick={() => navigateDate(1)} size="small" disabled={selectedDate >= todayStr}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
          {selectedDate === todayStr && <Chip label="Today" size="small" color="primary" sx={{ fontWeight: 700 }} />}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', mt: 2, borderTop: '1px solid #E2E8F0', pt: 1.5 }}>
          {[
            { label: 'Entries', value: dateEntries.length },
            { label: 'Units Produced', value: totalUnits.toLocaleString() },
            { label: 'Scrap Rate', value: `${scrapRate}%` },
            { label: 'Sheets Received', value: totalSheetsDate.toLocaleString() },
          ].map(s => (
            <Box key={s.label} sx={{ textAlign: 'center' }}>
              <Typography fontWeight={700} fontSize={{ xs: 16, md: 18 }} color="text.primary">{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Pending receipt confirmations */}
      {printingDispatches.filter(d => !d.confirmed).length > 0 && (
        <Paper sx={{ mb: 3, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
          <Box sx={{
            p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
            bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
          }}>
            <LocalShippingIcon sx={{ color: '#64748B' }} />
            <Box>
              <Typography fontWeight={700} color="text.primary">Sheets Awaiting Receipt Confirmation</Typography>
              <Typography variant="caption" color="text.secondary">
                Printing has dispatched these — confirm you received them and select which shift
              </Typography>
            </Box>
            <Chip
              label={`${printingDispatches.filter(d => !d.confirmed).length} pending`}
              size="small"
              sx={{ ml: 'auto', fontWeight: 700 }}
            />
          </Box>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {printingDispatches.filter(d => !d.confirmed).map(d => (
              <Box key={d.id} sx={{
                display: 'flex', alignItems: 'center', gap: 2,
                px: 2, py: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0',
              }}>
                <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: '#1E293B', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {d.sheetsDispatched.toLocaleString()}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography fontWeight={600} fontSize={14} noWrap>{d.productName}</Typography>
                    {d.batchNumber && (
                      <Chip label={d.batchNumber} size="small"
                        sx={{ fontSize: 10, height: 18, fontWeight: 700, fontFamily: 'monospace' }} />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    <Chip label={d.productType} size="small" sx={{ fontSize: 10, height: 18, mr: 0.75 }} />
                    Dispatched {d.dispatchDate}{d.shift ? ` · ${d.shift === 'DAY' ? 'Day' : 'Night'} shift` : ''}
                    {d.notes ? ` · ${d.notes}` : ''}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setPendingDispatch(d)
                    setConfirmShift('DAY')
                    setConfirmDispatchOpen(true)
                  }}
                  sx={{ flexShrink: 0, fontWeight: 700 }}
                >
                  Confirm Receipt
                </Button>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Sheet Stock table */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography fontWeight={700} fontSize={16}>Sheet Stock</Typography>
            <Typography variant="caption" color="text.secondary">Opening &amp; closing sheet stock per product</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip label="Day" size="small" sx={{ bgcolor: '#F1F5F9', color: '#374151', fontWeight: 700 }} />
            <Chip label="Night" size="small" sx={{ bgcolor: '#1E293B', color: '#CBD5E1', fontWeight: 700 }} />
            <ExportButton
              onExcel={() => exportToExcel(productsOnDate.map(p => {
                const d = dayEntries.find(e => e.productName === p)
                const n = nightEntries.find(e => e.productName === p)
                return { Product: p, 'Day Opening Stock': d?.openingStock ?? '', 'Day Closing Stock': d?.closingStock ?? '', 'Night Opening Stock': n?.openingStock ?? '', 'Night Closing Stock': n?.closingStock ?? '' }
              }), `sheet-stock-${selectedDate}`)}
              onCsv={() => exportToCSV(productsOnDate.map(p => {
                const d = dayEntries.find(e => e.productName === p)
                const n = nightEntries.find(e => e.productName === p)
                return { Product: p, 'Day Opening Stock': d?.openingStock ?? '', 'Day Closing Stock': d?.closingStock ?? '', 'Night Opening Stock': n?.openingStock ?? '', 'Night Closing Stock': n?.closingStock ?? '' }
              }), `sheet-stock-${selectedDate}`)}
            />
          </Box>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2} sx={{ fontWeight: 700, fontSize: 12, bgcolor: '#F9FAFB', borderRight: '2px solid #E5E7EB' }}>Design</TableCell>
                <TableCell colSpan={2} align="center" sx={thDay}>☀ DAY SHIFT</TableCell>
                <TableCell colSpan={2} align="center" sx={thNight}>🌙 NIGHT SHIFT</TableCell>
              </TableRow>
              <TableRow>
                {['Opening Stock', 'Closing Stock'].map(h => (
                  <TableCell key={`d-${h}`} align="right" sx={thSub}>{h}</TableCell>
                ))}
                {['Opening Stock', 'Closing Stock'].map(h => (
                  <TableCell key={`n-${h}`} align="right" sx={{ ...thSub, bgcolor: '#F1F5F9' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {productsOnDate.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No entries logged for this date yet
                  </TableCell>
                </TableRow>
              ) : productsOnDate.map(product => {
                const d = dayEntries.find(e => e.productName === product)
                const n = nightEntries.find(e => e.productName === product)
                return (
                  <TableRow key={product} hover>
                    <TableCell sx={{ fontWeight: 600, fontSize: 13, borderRight: '2px solid #E5E7EB' }}>{product}</TableCell>
                    <TableCell align="right" sx={tdDay}>{d ? d.openingStock.toLocaleString() : '—'}</TableCell>
                    <TableCell align="right" sx={{ ...tdDay, borderRight: '2px solid #E5E7EB' }}>{d ? d.closingStock.toLocaleString() : '—'}</TableCell>
                    <TableCell align="right" sx={tdNight}>{n ? n.openingStock.toLocaleString() : '—'}</TableCell>
                    <TableCell align="right" sx={tdNight}>{n ? n.closingStock.toLocaleString() : '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Production Lines table */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography fontWeight={700} fontSize={16}>Production Lines</Typography>
            <Typography variant="caption" color="text.secondary">Sheets used, units produced and scrap per line</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label="Day" size="small" sx={{ bgcolor: '#F1F5F9', color: '#374151', fontWeight: 700 }} />
            <Chip label="Night" size="small" sx={{ bgcolor: '#1E293B', color: '#CBD5E1', fontWeight: 700 }} />
          </Box>
        </Box>

        {ALL_LINES.map((line, li) => {
          const de = dayEntries.filter(e => e.line === line)
          const ne = nightEntries.filter(e => e.line === line)
          const rowCount = Math.max(de.length, ne.length, 1)
          const dTotSheets = sumField(de, 'sheetsUsed')
          const dTotQty    = sumField(de, 'productionQty')
          const dTotScrap  = sumField(de, 'scrap')
          const nTotSheets = sumField(ne, 'sheetsUsed')
          const nTotQty    = sumField(ne, 'productionQty')
          const nTotScrap  = sumField(ne, 'scrap')
          return (
            <Box key={line} sx={{ borderTop: li > 0 ? '2px solid #E5E7EB' : undefined }}>
              <Box sx={{ px: 2, py: 1, bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography fontWeight={800} fontSize={13} color="#1E293B">{fmtLine(line)}</Typography>
                {(de.length > 0 || ne.length > 0) && (
                  <Chip
                    label={`${(dTotQty + nTotQty).toLocaleString()} units`}
                    size="small"
                    sx={{ fontSize: 11, fontWeight: 700 }}
                  />
                )}
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={thDay}>☀ DAY SHIFT</TableCell>
                      <TableCell colSpan={4} align="center" sx={thNight}>🌙 NIGHT SHIFT</TableCell>
                    </TableRow>
                    <TableRow>
                      {['Description', 'Batch', 'Sheets Used', 'Prod. Qty', 'Scrap'].map(h => (
                        <TableCell key={`d-${h}`} sx={{ ...thSub, width: h === 'Description' ? '18%' : h === 'Batch' ? '12%' : undefined }}>{h}</TableCell>
                      ))}
                      {['Description', 'Batch', 'Sheets Used', 'Prod. Qty', 'Scrap'].map(h => (
                        <TableCell key={`n-${h}`} sx={{ ...thSub, bgcolor: '#F1F5F9', width: h === 'Description' ? '18%' : h === 'Batch' ? '12%' : undefined }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.from({ length: rowCount }).map((_, i) => {
                      const d = de[i]
                      const n = ne[i]
                      return (
                        <TableRow key={i} hover>
                          <TableCell sx={{ ...tdDay, fontWeight: 500 }}>{d?.productName ?? ''}</TableCell>
                          <TableCell sx={{ ...tdDay, fontFamily: 'monospace', fontSize: 11, color: '#374151', fontWeight: 700 }}>
                            {d?.batchNumber ?? ''}
                          </TableCell>
                          <TableCell align="right" sx={tdDay}>{d ? d.sheetsUsed.toLocaleString() : ''}</TableCell>
                          <TableCell align="right" sx={{ ...tdDay, fontWeight: 700 }}>{d ? d.productionQty.toLocaleString() : ''}</TableCell>
                          <TableCell align="right" sx={{ ...tdDay, color: d && d.scrap > 0 ? '#DC2626' : undefined, borderRight: '2px solid #E5E7EB' }}>
                            {d ? d.scrap.toLocaleString() : ''}
                          </TableCell>
                          <TableCell sx={{ ...tdNight, fontWeight: 500 }}>{n?.productName ?? ''}</TableCell>
                          <TableCell sx={{ ...tdNight, fontFamily: 'monospace', fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>
                            {n?.batchNumber ?? ''}
                          </TableCell>
                          <TableCell align="right" sx={tdNight}>{n ? n.sheetsUsed.toLocaleString() : ''}</TableCell>
                          <TableCell align="right" sx={{ ...tdNight, fontWeight: 700 }}>{n ? n.productionQty.toLocaleString() : ''}</TableCell>
                          <TableCell align="right" sx={{ ...tdNight, color: n && n.scrap > 0 ? '#DC2626' : undefined }}>
                            {n ? n.scrap.toLocaleString() : ''}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow sx={{ borderTop: '1px solid #E5E7EB' }}>
                      <TableCell sx={{ ...tdTotal, color: '#6B7280', fontSize: 11, letterSpacing: 0.5 }}>TOTAL</TableCell>
                      <TableCell sx={tdTotal} />
                      <TableCell align="right" sx={tdTotal}>{de.length > 0 ? dTotSheets.toLocaleString() : ''}</TableCell>
                      <TableCell align="right" sx={{ ...tdTotal, fontWeight: 700 }}>{de.length > 0 ? dTotQty.toLocaleString() : ''}</TableCell>
                      <TableCell align="right" sx={{ ...tdTotal, color: dTotScrap > 0 ? '#DC2626' : undefined, borderRight: '2px solid #E5E7EB' }}>
                        {de.length > 0 ? dTotScrap.toLocaleString() : ''}
                      </TableCell>
                      <TableCell sx={{ ...tdTotal, color: '#6B7280', fontSize: 11, letterSpacing: 0.5 }}>TOTAL</TableCell>
                      <TableCell sx={tdTotal} />
                      <TableCell align="right" sx={tdTotal}>{ne.length > 0 ? nTotSheets.toLocaleString() : ''}</TableCell>
                      <TableCell align="right" sx={{ ...tdTotal, fontWeight: 700 }}>{ne.length > 0 ? nTotQty.toLocaleString() : ''}</TableCell>
                      <TableCell align="right" sx={{ ...tdTotal, color: nTotScrap > 0 ? '#DC2626' : undefined }}>
                        {ne.length > 0 ? nTotScrap.toLocaleString() : ''}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )
        })}
      </Paper>

      {/* Confirmed dispatches for selected date */}
      {datePrintingDispatches.filter(d => d.confirmed).length > 0 && (
        <Paper sx={{ mt: 3, overflow: 'hidden' }}>
          <Box sx={{
            p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
            bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
          }}>
            <LocalShippingIcon sx={{ color: '#64748B' }} />
            <Box>
              <Typography fontWeight={700} color="text.primary">Sheets Received from Printing</Typography>
              <Typography variant="caption" color="text.secondary">Confirmed dispatches for this date</Typography>
            </Box>
            <Chip label={`${totalSheetsDispatched.toLocaleString()} sheets`} size="small"
              sx={{ ml: 'auto', fontWeight: 700 }} />
          </Box>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {datePrintingDispatches.filter(d => d.confirmed).map(d => (
              <Box key={d.id} sx={{
                display: 'flex', alignItems: 'center', gap: 2,
                px: 2, py: 1.25, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0',
              }}>
                <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: '#16A34A', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {d.sheetsDispatched.toLocaleString()}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} fontSize={14} noWrap>{d.productName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    <Chip label={d.productType} size="small" sx={{ fontSize: 10, height: 18, mr: 0.75 }} />
                    Received {d.receivedShift === 'DAY' ? 'Day' : 'Night'} shift
                    {d.notes ? ` · ${d.notes}` : ''}
                  </Typography>
                </Box>
                <Chip label="Confirmed" size="small" color="success" sx={{ fontWeight: 700 }} />
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Sheet Receipts */}
      {dateReceipts.length > 0 && (
        <Paper sx={{ mt: 3, overflow: 'hidden' }}>
          <Box sx={{
            p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LocalShippingIcon sx={{ color: '#64748B' }} />
              <Box>
                <Typography fontWeight={700} color="text.primary">Sheet Receipt Log</Typography>
                <Typography variant="caption" color="text.secondary">All receipts auto-created from confirmed dispatches</Typography>
              </Box>
            </Box>
            <Chip label={`${totalSheetsDate.toLocaleString()} sheets in`} size="small"
              sx={{ fontWeight: 700 }} />
          </Box>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {dateReceipts.map((r: SheetReceipt) => (
              <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.25, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: '#1E293B', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {r.sheetsReceived.toLocaleString()}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} fontSize={14} noWrap>{r.productName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    <Chip label={r.productType} size="small" sx={{ fontSize: 10, height: 18, mr: 0.75 }} />
                    {r.shift ? (r.shift === 'DAY' ? '☀ Day · ' : '🌙 Night · ') : ''}
                    {r.receivedBy ?? 'Unknown'}{r.notes ? ` · ${r.notes}` : ''}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                  {new Date(r.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Confirm dispatch receipt dialog */}
      <Dialog open={confirmDispatchOpen} onClose={() => { setConfirmDispatchOpen(false); setPendingDispatch(null) }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Sheet Receipt</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {pendingDispatch && (
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography fontWeight={700} fontSize={15}>{pendingDispatch.productName}</Typography>
                {pendingDispatch.batchNumber && (
                  <Chip label={pendingDispatch.batchNumber} size="small"
                    sx={{ fontSize: 10, bgcolor: '#EDE9FE', color: '#6D28D9', fontWeight: 700, fontFamily: 'monospace' }} />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                <Chip label={pendingDispatch.productType} size="small" sx={{ fontSize: 10, height: 18, mr: 0.75 }} />
                {pendingDispatch.sheetsDispatched.toLocaleString()} sheets dispatched on {pendingDispatch.dispatchDate}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary">
            Which shift received these sheets?
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Shift Received</InputLabel>
            <Select
              value={confirmShift}
              label="Shift Received"
              onChange={e => setConfirmShift(e.target.value as ShiftName)}
            >
              <MenuItem value="DAY">☀ Day Shift</MenuItem>
              <MenuItem value="NIGHT">🌙 Night Shift</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setConfirmDispatchOpen(false); setPendingDispatch(null) }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmDispatch}
            disabled={submitting}
            sx={{ fontWeight: 700 }}
          >
            {submitting ? 'Confirming…' : 'Confirm Receipt'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Log shift entry dialog */}
      <Dialog open={logOpen} onClose={() => { setLogOpen(false); setFormErrors({}) }} maxWidth="md" fullWidth fullScreen={fullScreen}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
          Log Shift Entry — {form.shift === 'DAY' ? 'Day Shift' : 'Night Shift'}
        </DialogTitle>

        <DialogContent sx={{ pt: '20px !important', pb: 1 }}>

          {/* Header info */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={form.shiftDate}
              onChange={e => setForm(f => ({ ...f, shiftDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              error={!!formErrors.shiftDate}
              helperText={formErrors.shiftDate}
              inputProps={{ max: new Date().toISOString().split('T')[0] }}
            />
            <FormControl fullWidth>
              <InputLabel>Shift</InputLabel>
              <Select value={form.shift} label="Shift"
                onChange={e => setForm(f => ({ ...f, shift: e.target.value as ShiftName }))}>
                <MenuItem value="DAY">☀ Day Shift</MenuItem>
                <MenuItem value="NIGHT">🌙 Night Shift</MenuItem>
              </Select>
            </FormControl>
            <Autocomplete
              freeSolo
              options={confirmedProductOptions}
              getOptionLabel={opt => typeof opt === 'string' ? opt : opt.productName}
              value={confirmedProductOptions.find(o => o.productName === form.productName) ?? form.productName}
              onChange={(_, newVal) => {
                if (newVal && typeof newVal !== 'string') {
                  const firstBatch = newVal.batchNumbers[0] ?? ''
                  setForm(f => ({ ...f, productName: newVal.productName, productType: newVal.productType, batchNumber: firstBatch }))
                  applyCarryOver(newVal.productName, firstBatch || undefined)
                  applyShiftFromBatch(firstBatch, form.shiftDate)
                } else {
                  setForm(f => ({ ...f, productName: typeof newVal === 'string' ? newVal : '', batchNumber: '' }))
                  if (typeof newVal === 'string' && newVal.trim()) applyCarryOver(newVal)
                }
              }}
              onInputChange={(_, val, reason) => {
                if (reason === 'input') setForm(f => ({ ...f, productName: val, batchNumber: '' }))
              }}
              renderOption={(props, opt) => (
                <li {...props} key={opt.productName}>
                  <Box>
                    <Typography fontWeight={600} fontSize={14}>{opt.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {opt.productType} · {opt.totalSheets.toLocaleString()} sheets remaining · {opt.batchNumbers.join(', ')}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Product Name"
                  fullWidth
                  helperText={confirmedProductOptions.length > 0 ? `${confirmedProductOptions.length} product(s) confirmed from printing` : 'No confirmed dispatches yet'}
                />
              )}
            />
            {/* Batch number — auto-filled from dispatch, or selectable if multiple */}
            {batchOptionsForProduct.length > 1 ? (
              <FormControl fullWidth>
                <InputLabel>Batch Number</InputLabel>
                <Select value={form.batchNumber} label="Batch Number"
                  onChange={e => {
                    setForm(f => ({ ...f, batchNumber: e.target.value }))
                    applyCarryOver(form.productName, e.target.value || undefined)
                    applyShiftFromBatch(e.target.value, form.shiftDate)
                  }}>
                  {batchOptionsForProduct.map(b => (
                    <MenuItem key={b} value={b}>{b}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label="Batch Number"
                fullWidth
                value={form.batchNumber}
                onChange={e => {
                  setForm(f => ({ ...f, batchNumber: e.target.value }))
                  applyCarryOver(form.productName, e.target.value || undefined)
                  applyShiftFromBatch(e.target.value, form.shiftDate)
                }}
                placeholder="Auto-filled from printing dispatch"
                InputProps={{ readOnly: batchOptionsForProduct.length === 1 }}
                helperText={form.batchNumber ? `Tracking: ${form.batchNumber}` : 'Will be set when you select a confirmed product'}
                sx={{ '& input': { fontFamily: 'monospace', fontWeight: 700 } }}
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Product Type</InputLabel>
              <Select value={form.productType} label="Product Type"
                onChange={e => setForm(f => ({ ...f, productType: e.target.value as ProductType }))}>
                <MenuItem value="LID">LID (2,856 / bin)</MenuItem>
                <MenuItem value="BODY">BODY (1,080 / bin)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* PRODUCTION OUTPUT */}
          <Box sx={{ mb: 3, borderRadius: 2, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <Box sx={{ px: 2, py: 1.25, bgcolor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography fontWeight={700} fontSize={13} color="text.primary">
                PRODUCTION OUTPUT
              </Typography>
              <Typography fontSize={11} color="text.secondary">
                (units made, scrap and operator)
              </Typography>
            </Box>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Row 1: Production Line + Sheets Used */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Production Line</InputLabel>
                  <Select value={form.line} label="Production Line"
                    onChange={e => setForm(f => ({ ...f, line: e.target.value as ProductionLine }))}>
                    {ALL_LINES.map(l => <MenuItem key={l} value={l}>{fmtLine(l)}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Sheets Used this Shift" type="number" fullWidth
                  value={form.sheetsUsed}
                  onChange={e => handleSheetsUsedChange(e.target.value)}
                  error={!!formErrors.sheetsUsed}
                  helperText={formErrors.sheetsUsed || (unitsPerSheet ? `1 sheet = ${unitsPerSheet.toLocaleString()} units` : 'Sheets consumed on this line this shift')}
                  inputProps={{ min: 1 }}
                />
              </Box>
              {/* Row 2: Production Qty + Scrap + Operator */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                <TextField label="Production Qty (units)" type="number" fullWidth
                  value={form.productionQty}
                  onChange={e => handleProductionQtyChange(e.target.value)}
                  error={!!formErrors.productionQty}
                  helperText={formErrors.productionQty || (unitsPerSheet ? 'Auto-calculates sheets from units' : '')}
                  inputProps={{ min: 0 }}
                />
                <TextField label="Scrap (units)" type="number" fullWidth
                  value={form.scrap}
                  onChange={e => handleScrapChange(e.target.value)}
                  error={!!formErrors.scrap}
                  helperText={formErrors.scrap || (unitsPerSheet && Number(form.sheetsUsed) > 0 ? 'Deducted from production qty' : '')}
                  InputProps={{ endAdornment: <InputAdornment position="end">units</InputAdornment> }}
                  inputProps={{ min: 0 }}
                />
                <TextField label="Operator Name" fullWidth
                  value={form.operatorName}
                  onChange={e => setForm(f => ({ ...f, operatorName: e.target.value }))}
                  error={!!formErrors.operatorName}
                  helperText={formErrors.operatorName}
                />
              </Box>

              {/* Scrap rate */}
              {productionQtyNum > 0 && (
                <Box sx={{ display: 'flex', gap: 3, px: 0.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Scrap Rate this Entry</Typography>
                    <Typography fontWeight={800} fontSize={18} color={scrapNum > 0 ? '#DC2626' : '#166534'}>
                      {((scrapNum / (productionQtyNum + scrapNum)) * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>

          {/* SHEET STOCK */}
          <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <Box sx={{ px: 2, py: 1.25, bgcolor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography fontWeight={700} fontSize={13} color="text.primary">
                SHEET STOCK
              </Typography>
              <Typography fontSize={11} color="text.secondary">
                (opening &amp; closing stock and bins)
              </Typography>
            </Box>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Stock row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                <TextField label="Opening Stock (sheets)" type="number" fullWidth
                  value={form.openingStock}
                  onChange={e => setForm(f => ({ ...f, openingStock: e.target.value }))}
                  helperText="Carryover from previous shift" />
                <TextField
                  label="Sheets Received from Printing"
                  type="number" fullWidth
                  value={hasProductName ? String(effectiveSheetsReceived) : form.sheetsReceived}
                  onChange={e => setForm(f => ({ ...f, sheetsReceived: e.target.value }))}
                  disabled={sheetsReceivedLocked}
                  helperText={
                    alreadyAccountedReceipts > 0 && shiftDateReceiptTotal > 0
                      ? `${effectiveSheetsReceived.toLocaleString()} new sheets (${shiftDateReceiptTotal.toLocaleString()} total received minus ${alreadyAccountedReceipts.toLocaleString()} already counted in a previous entry)`
                      : shiftDateReceiptTotal > 0
                        ? `From ${shiftDateReceipts.length} arrival(s) logged as ${form.shift} shift on ${form.shiftDate}`
                        : otherShiftTotal > 0
                          ? `⚠ ${otherShiftTotal.toLocaleString()} sheets arrived during the ${otherShift} shift — none logged for this shift`
                          : hasProductName
                            ? 'No sheets received from printing this shift'
                            : 'Sheets handed over by printing this shift'
                  }
                />
                <TextField
                  label="Closing Stock (sheets)"
                  type="number" fullWidth
                  value={closingStock >= 0 || sheetsUsedNum > 0 ? closingStock : ''}
                  disabled
                  error={closingStock < 0 && sheetsUsedNum > 0}
                  helperText={
                    closingStock < 0 && sheetsUsedNum > 0
                      ? '⚠ Negative — check your numbers'
                      : 'Auto-calculated: Opening + Received − Used'
                  }
                  sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: closingStock < 0 && sheetsUsedNum > 0 ? '#DC2626' : '#166534', fontWeight: 700, fontSize: 16 } }}
                />
              </Box>

              {/* Bins row — tied to product, not batch */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Opening Bins"
                  type="number"
                  fullWidth
                  value={form.openingBins}
                  onChange={e => setForm(f => ({ ...f, openingBins: e.target.value }))}
                  helperText={`Bins on hand at start of shift · carried over per product (${unitsPerBin.toLocaleString()} units/bin for ${form.productType})`}
                  inputProps={{ min: 0 }}
                />
                <TextField
                  label="Closing Bins"
                  type="number"
                  fullWidth
                  value={form.closingBins}
                  onChange={e => setForm(f => ({ ...f, closingBins: e.target.value }))}
                  helperText="Bins on hand at end of shift"
                  inputProps={{ min: 0 }}
                />
              </Box>

            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E7EB', gap: 1 }}>
          <Button size="large" onClick={() => setLogOpen(false)}>Cancel</Button>
          <Button
            size="large"
            variant="contained"
            onClick={handleLog}
            disabled={submitting || !form.productName || !form.sheetsUsed || !form.productionQty || !form.operatorName}
            sx={{ px: 4, fontWeight: 700, fontSize: 15 }}
          >
            {submitting ? 'Saving…' : `Save ${form.shift === 'DAY' ? 'Day' : 'Night'} Shift Entry`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Printing Stock Logs */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PrintIcon sx={{ color: '#64748B' }} />
          <Box>
            <Typography fontWeight={700} color="text.primary">Printing Stock Logs</Typography>
            <Typography variant="caption" color="text.secondary">Daily stock updates from the printing department</Typography>
          </Box>
          <Chip label={`${printingShiftLogs.length} logs`} size="small" sx={{ ml: 'auto', fontWeight: 700 }} />
        </Box>
        {printingShiftLogs.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography fontSize={14}>No stock logs received yet</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 12 } }}>
                <TableCell>Date</TableCell>
                <TableCell>Logged By</TableCell>
                <TableCell align="right">Items</TableCell>
                <TableCell align="right">Total Sheets</TableCell>
                <TableCell align="right">Document</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {printingShiftLogs.map(log => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{log.logDate}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{log.loggedBy ?? '—'}</TableCell>
                  <TableCell align="right">{log.items.length}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {log.items.reduce((s, i) => s + i.sheetCount, 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => setViewingStockLog(log)} sx={{ fontSize: 11 }}>
                        View
                      </Button>
                      <PDFDownloadLink
                        document={<StockLogPDF logDate={log.logDate} loggedBy={log.loggedBy ?? undefined} items={log.items.map(i => ({ ...i, sheetCount: String(i.sheetCount), batchNumber: i.batchNumber ?? '' }))} />}
                        fileName={`stock-log-${log.logDate}.pdf`}
                        style={{ textDecoration: 'none' }}
                      >
                        {({ loading: pdfLoading }) => (
                          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={pdfLoading} sx={{ fontSize: 11 }}>
                            {pdfLoading ? '…' : 'PDF'}
                          </Button>
                        )}
                      </PDFDownloadLink>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Send 24hr Report dialog */}
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Send 24hr Production Report
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="info" sx={{ fontSize: 13 }}>
            This will send the production report for <strong>{selectedDate}</strong> to the Office team for review.
            It covers all Day and Night shift entries for that date.
          </Alert>
          <TextField
            label="Notes (optional)"
            multiline
            rows={3}
            fullWidth
            placeholder="Any notes or highlights for this 24hr period…"
            value={reportNotes}
            onChange={e => setReportNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReportOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={reportSubmitting}
            startIcon={<SendIcon />}
            onClick={handleSendReport}
          >
            {reportSubmitting ? 'Sending…' : 'Send Report to Office'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Log PDF Viewer */}
      <Dialog open={!!viewingStockLog} onClose={() => setViewingStockLog(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
        {viewingStockLog && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#1E293B', color: '#fff', py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PrintIcon sx={{ color: '#fff' }} />
                <Box>
                  <Typography fontWeight={700} fontSize={16}>Printing Stock Log — {viewingStockLog.logDate}</Typography>
                  <Typography fontSize={12} sx={{ opacity: 0.85 }}>Logged by {viewingStockLog.loggedBy ?? '—'}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <PDFDownloadLink
                  document={<StockLogPDF logDate={viewingStockLog.logDate} loggedBy={viewingStockLog.loggedBy ?? undefined} items={viewingStockLog.items.map(i => ({ ...i, sheetCount: String(i.sheetCount), batchNumber: i.batchNumber ?? '' }))} />}
                  fileName={`stock-log-${viewingStockLog.logDate}.pdf`}
                  style={{ textDecoration: 'none' }}
                >
                  {({ loading: pdfLoading }) => (
                    <Button size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={pdfLoading} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
                      {pdfLoading ? '…' : 'Download'}
                    </Button>
                  )}
                </PDFDownloadLink>
                <Button size="small" onClick={() => setViewingStockLog(null)} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} variant="outlined">Close</Button>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
              <PDFViewer width="100%" height="100%" style={{ border: 'none', flex: 1 }}>
                <StockLogPDF logDate={viewingStockLog.logDate} loggedBy={viewingStockLog.loggedBy ?? undefined} items={viewingStockLog.items.map(i => ({ ...i, sheetCount: String(i.sheetCount), batchNumber: i.batchNumber ?? '' }))} />
              </PDFViewer>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  )
}
