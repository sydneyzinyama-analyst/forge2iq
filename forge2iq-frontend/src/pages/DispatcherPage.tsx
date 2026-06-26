import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, LinearProgress, Alert, Stack, Autocomplete,
} from '@mui/material'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import api from '../api/axios'
import type { DispatchEntry, ShiftEntry, ProductType } from '../types'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useTableControls } from '../hooks/useTableControls'
import { TableSearch, SortableCell, TablePager, ExportButton } from '../components/TableToolbar'
import { exportToExcel, exportToCSV } from '../utils/exportUtils'

export default function DispatcherPage() {
  const [entries, setEntries]           = useState<DispatchEntry[]>([])
  const [shiftEntries, setShiftEntries] = useState<ShiftEntry[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [confirmOpen, setConfirmOpen]   = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [formErrors, setFormErrors]     = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    productName:    '',
    productType:    'BODY' as ProductType,
    binsExpected:   '',
    binsDispatched: '',
    destination:    '',
    notes:          '',
    batchNumber:    '',
  })

  const binsMatch = form.binsExpected && form.binsDispatched
    ? Number(form.binsExpected) === Number(form.binsDispatched)
    : true

  const load = async () => {
    try {
      setLoading(true)
      const [dRes, sRes] = await Promise.all([
        api.get<DispatchEntry[]>('/dispatch'),
        api.get<ShiftEntry[]>('/shift-entries'),
      ])
      setEntries(Array.isArray(dRes.data) ? dRes.data : [])
      setShiftEntries(Array.isArray(sRes.data) ? sRes.data : [])
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useAutoRefresh(load, 20000)

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!form.productName.trim()) errs.productName = 'Product name is required'
    const dispatched = Number(form.binsDispatched)
    if (!form.binsDispatched || isNaN(dispatched)) errs.binsDispatched = 'Enter a valid number'
    else if (dispatched <= 0) errs.binsDispatched = 'Must be greater than 0'
    if (form.binsExpected) {
      const expected = Number(form.binsExpected)
      if (isNaN(expected) || expected < 0) errs.binsExpected = 'Must be 0 or greater'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleConfirm = async () => {
    if (!validateForm()) return
    setSubmitting(true)
    try {
      await api.post('/dispatch', {
        productName:    form.productName,
        productType:    form.productType,
        binsExpected:   Number(form.binsExpected) || 0,
        binsDispatched: Number(form.binsDispatched),
        destination:    form.destination || null,
        notes:          form.notes || null,
        batchNumber:    form.batchNumber || null,
      })
      setConfirmOpen(false)
      setForm({ productName: '', productType: 'LID', binsExpected: '', binsDispatched: '', destination: '', notes: '', batchNumber: '' })
      setFormErrors({})
      load()
    } catch {
      setError('Failed to log dispatch')
    } finally {
      setSubmitting(false)
    }
  }

  // Batch options grouped by product for filtering
  const batchOptions = shiftEntries
    .filter(e => e.batchNumber)
    .filter(e => !form.productName || e.productName.toLowerCase().includes(form.productName.toLowerCase()))
    .sort((a, b) => b.shiftDate.localeCompare(a.shiftDate))

  const dispatchedNum = Number(form.binsDispatched) || 0
  const todayStr      = new Date().toISOString().split('T')[0]
  const todayEntries  = entries.filter(e => e.dispatchedAt.split('T')[0] === todayStr)
  const totalBinsToday = todayEntries.reduce((s, e) => s + e.binsDispatched, 0)
  const mismatchCount = entries.filter(e => e.binsExpected !== e.binsDispatched).length

  // Table controls
  const tc = useTableControls(entries, ['productName', 'batchNumber', 'destination', 'dispatchedBy'], {
    defaultSortKey: 'dispatchedAt',
    defaultSortDir: 'desc',
  })

  const exportRows = () => tc.paginated.map(e => ({
    'Date/Time': new Date(e.dispatchedAt).toLocaleString(),
    'Product': e.productName ?? '',
    'Type': e.productType ?? '',
    'Batch': e.batchNumber ?? '',
    'Bins Expected': e.binsExpected,
    'Bins Dispatched': e.binsDispatched,
    'Match': e.binsExpected === e.binsDispatched ? 'Yes' : 'No',
    'Destination': e.destination ?? '',
    'Dispatched By': e.dispatchedBy ?? '',
  }))

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LocalShippingIcon sx={{ fontSize: 32, color: '#64748B' }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">Dispatcher</Typography>
            <Typography color="text.secondary" fontSize={14}>
              Confirm physical bin counts and log outbound dispatches
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<LocalShippingIcon />}
          onClick={() => setConfirmOpen(true)}
        >
          Confirm Dispatch
        </Button>
      </Paper>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Dispatched Today',      value: todayEntries.length },
          { label: 'Bins Dispatched Today', value: totalBinsToday },
          { label: 'Total Dispatches',      value: entries.length },
          { label: 'Bin Count Mismatches',  value: mismatchCount, error: mismatchCount > 0 },
        ].map(s => (
          <Paper key={s.label} sx={{ p: 2.5, borderLeft: '4px solid #E2E8F0' }}>
            <Typography variant="h4" fontWeight={700} sx={{ color: s.error ? '#DC2626' : 'text.primary' }}>{s.value}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Dispatch log */}
      <TableContainer component={Paper}>
        <Box sx={{ p: 2, borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography fontWeight={600}>Dispatch Log</Typography>
            <Typography variant="caption" color="text.secondary">{tc.total} of {tc.totalUnfiltered} entries</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TableSearch value={tc.search} onChange={tc.setSearch} placeholder="Search product, batch, destination…" />
            <ExportButton
              onExcel={() => exportToExcel(exportRows(), `dispatch-log-${todayStr}`)}
              onCsv={() => exportToCSV(exportRows(), `dispatch-log-${todayStr}`)}
            />
          </Box>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <SortableCell label="Date / Time" sortKey="dispatchedAt" currentKey={String(tc.sortKey ?? '')} dir={tc.sortDir} onSort={k => tc.toggleSort(k as keyof DispatchEntry)} />
              <SortableCell label="Product" sortKey="productName" currentKey={String(tc.sortKey ?? '')} dir={tc.sortDir} onSort={k => tc.toggleSort(k as keyof DispatchEntry)} />
              <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', fontSize: 12 }}>Type</TableCell>
              <SortableCell label="Batch" sortKey="batchNumber" currentKey={String(tc.sortKey ?? '')} dir={tc.sortDir} onSort={k => tc.toggleSort(k as keyof DispatchEntry)} />
              <SortableCell label="Bins Expected" sortKey="binsExpected" currentKey={String(tc.sortKey ?? '')} dir={tc.sortDir} onSort={k => tc.toggleSort(k as keyof DispatchEntry)} align="right" />
              <SortableCell label="Bins Dispatched" sortKey="binsDispatched" currentKey={String(tc.sortKey ?? '')} dir={tc.sortDir} onSort={k => tc.toggleSort(k as keyof DispatchEntry)} align="right" />
              <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', fontSize: 12 }}>Match</TableCell>
              <SortableCell label="Destination" sortKey="destination" currentKey={String(tc.sortKey ?? '')} dir={tc.sortDir} onSort={k => tc.toggleSort(k as keyof DispatchEntry)} />
              <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', fontSize: 12 }}>By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tc.paginated.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {tc.search ? 'No results match your search' : 'No dispatches logged yet. Confirm the first dispatch above.'}
                </TableCell>
              </TableRow>
            )}
            {tc.paginated.map(e => {
              const match = e.binsExpected === e.binsDispatched
              return (
                <TableRow key={e.id} hover sx={{ bgcolor: !match ? '#FFF7F7' : undefined }}>
                  <TableCell sx={{ fontSize: 12 }}>{new Date(e.dispatchedAt).toLocaleString()}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{e.productName ?? '—'}</TableCell>
                  <TableCell>
                    {e.productType && <Chip label={e.productType} size="small" sx={{ fontSize: 10 }} />}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', fontWeight: 700 }}>
                    {e.batchNumber ?? '—'}
                  </TableCell>
                  <TableCell align="right">{e.binsExpected}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{e.binsDispatched}</TableCell>
                  <TableCell>
                    {match ? (
                      <CheckCircleOutlineIcon sx={{ color: '#10B981', fontSize: 18 }} />
                    ) : (
                      <Chip label={`Δ ${Math.abs(e.binsDispatched - e.binsExpected)}`} size="small" color="error" />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{e.destination ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{e.dispatchedBy ?? '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <TablePager total={tc.total} page={tc.page} perPage={tc.perPage} onPage={tc.setPage} onPerPage={tc.setPerPage} />
      </TableContainer>

      {/* Confirm dispatch dialog */}
      <Dialog open={confirmOpen} onClose={() => { setConfirmOpen(false); setFormErrors({}) }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Confirm Dispatch
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>

          <TextField
            label="Product Name"
            fullWidth
            value={form.productName}
            onChange={e => setForm(f => ({ ...f, productName: e.target.value, batchNumber: '', binsExpected: '' }))}
            autoFocus
            error={!!formErrors.productName}
            helperText={formErrors.productName}
          />

          <FormControl fullWidth>
            <InputLabel>Product Type</InputLabel>
            <Select
              value={form.productType}
              label="Product Type"
              onChange={e => setForm(f => ({ ...f, productType: e.target.value as ProductType }))}
            >
              <MenuItem value="LID">LID</MenuItem>
              <MenuItem value="BODY">BODY</MenuItem>
            </Select>
          </FormControl>

          <Autocomplete
            options={batchOptions}
            getOptionLabel={opt => opt.batchNumber ?? ''}
            value={batchOptions.find(o => o.batchNumber === form.batchNumber) ?? null}
            onChange={(_, newVal) => {
              if (newVal) {
                setForm(f => ({
                  ...f,
                  batchNumber:  newVal.batchNumber ?? '',
                  productName:  newVal.productName,
                  productType:  newVal.productType,
                  binsExpected: String(newVal.closingBins),
                }))
              } else {
                setForm(f => ({ ...f, batchNumber: '', binsExpected: '' }))
              }
            }}
            renderOption={(props, opt) => (
              <li {...props} key={opt.id}>
                <Box>
                  <Typography fontWeight={700} fontSize={13} sx={{ fontFamily: 'monospace', color: '#374151' }}>
                    {opt.batchNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {opt.productName} · {opt.shiftDate} · {opt.shift === 'DAY' ? '☀ Day' : '🌙 Night'}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Production Batch (for traceability)"
                helperText={
                  form.batchNumber
                    ? `Tracking batch ${form.batchNumber}`
                    : batchOptions.length > 0
                      ? 'Select to link to production'
                      : 'No production batches found — log shift entries first'
                }
                sx={{ '& input': { fontFamily: 'monospace', fontWeight: 700 } }}
              />
            )}
          />

          <TextField
            label="Bins Expected (from production)"
            type="number"
            fullWidth
            value={form.binsExpected}
            onChange={e => setForm(f => ({ ...f, binsExpected: e.target.value }))}
            helperText={formErrors.binsExpected || 'Auto-filled when you select a batch above'}
            error={!!formErrors.binsExpected}
            inputProps={{ min: 0 }}
          />

          <TextField
            label="Bins Dispatched (your physical count)"
            type="number"
            fullWidth
            value={form.binsDispatched}
            onChange={e => setForm(f => ({ ...f, binsDispatched: e.target.value }))}
            error={(!binsMatch && !!form.binsDispatched) || !!formErrors.binsDispatched}
            helperText={
              formErrors.binsDispatched ||
              (!binsMatch && form.binsDispatched
                ? `Mismatch: expected ${form.binsExpected}, counting ${form.binsDispatched}`
                : '')
            }
            inputProps={{ min: 1 }}
          />

          {dispatchedNum > 0 && form.binsExpected && !binsMatch && (
            <Alert severity="warning">
              Bin count mismatch will be flagged — discrepancy of {Math.abs(Number(form.binsExpected) - dispatchedNum)} bins.
            </Alert>
          )}

          <TextField
            label="Destination"
            fullWidth
            value={form.destination}
            onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
            placeholder="e.g. Client name or warehouse"
          />

          <TextField
            label="Notes (optional)"
            fullWidth
            multiline
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => { setConfirmOpen(false); setFormErrors({}) }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={submitting || !form.productName || !form.binsDispatched}
            >
              {submitting ? 'Saving…' : 'Confirm Dispatch'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
