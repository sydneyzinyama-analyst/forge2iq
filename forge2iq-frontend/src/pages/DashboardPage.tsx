import { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Paper, Chip, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Grid, Divider,
} from '@mui/material'
import FactoryIcon from '@mui/icons-material/Factory'
import PrintIcon from '@mui/icons-material/Print'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import api from '../api/axios'
import type { ShiftEntry, DispatchEntry, PrintingShiftLog, PrintingStockCategory, PrintingStockItem } from '../types'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

const CATEGORY_META: Record<PrintingStockCategory, { label: string; color: string; bg: string }> = {
  READY_TO_DISPATCH: { label: 'Ready to Dispatch', color: '#16A34A', bg: '#F0FDF4' },
  DELBERG_PLATE:     { label: 'Delberg Plate',      color: '#2563EB', bg: '#EFF6FF' },
  READY_TO_WAX:      { label: 'Ready to Wax',       color: '#D97706', bg: '#FFFBEB' },
  READY_TO_VARNISH:  { label: 'Ready to Varnish',   color: '#475569', bg: '#F8FAFC' },
  WIP:               { label: 'WIP',                 color: '#64748B', bg: '#F8FAFC' },
}

export default function DashboardPage() {
  const [todayShifts, setTodayShifts] = useState<ShiftEntry[]>([])
  const [todayDispatches, setTodayDispatches] = useState<DispatchEntry[]>([])
  const [printingLogs, setPrintingLogs] = useState<PrintingShiftLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    Promise.all([
      api.get<ShiftEntry[]>('/shift-entries', { params: { today: true } }),
      api.get<DispatchEntry[]>('/dispatch', { params: { today: true } }),
      api.get<PrintingShiftLog[]>('/printing-shift-logs'),
    ])
      .then(([sRes, dRes, pRes]) => {
        setTodayShifts(Array.isArray(sRes.data) ? sRes.data : [])
        setTodayDispatches(Array.isArray(dRes.data) ? dRes.data : [])
        setPrintingLogs(Array.isArray(pRes.data) ? pRes.data : [])
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  useAutoRefresh(load, 30000)

  const totalUnitsToday    = todayShifts.reduce((s, e) => s + e.productionQty, 0)
  const totalScrapToday    = todayShifts.reduce((s, e) => s + e.scrap, 0)
  const scrapRate          = totalUnitsToday + totalScrapToday > 0
    ? ((totalScrapToday / (totalUnitsToday + totalScrapToday)) * 100).toFixed(1)
    : '0.0'
  const totalBinsDispatched = todayDispatches.reduce((s, d) => s + d.binsDispatched, 0)
  const binMismatches      = todayDispatches.filter(d => d.binsExpected !== d.binsDispatched)

  // Latest printing stock log
  const latestLog = printingLogs.length > 0 ? printingLogs[0] : null
  const todayStr = new Date().toISOString().split('T')[0]
  const latestIsToday = latestLog?.logDate === todayStr

  // Group latest log items by category
  const itemsByCategory: Partial<Record<PrintingStockCategory, PrintingStockItem[]>> = latestLog
    ? latestLog.items.reduce((acc: Partial<Record<PrintingStockCategory, PrintingStockItem[]>>, item) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category]!.push(item)
        return acc
      }, {})
    : {}

  const today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: { xs: 2, md: 0 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FactoryIcon sx={{ fontSize: 32, color: '#64748B' }} />
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary" lineHeight={1.1}>Production Floor</Typography>
              <Typography color="text.secondary" fontSize={13} mt={0.25}>{today}</Typography>
            </Box>
          </Box>

          {/* Scrap rate */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ position: 'relative', width: 64, height: 64 }}>
              <CircularProgress variant="determinate" value={100} size={64} thickness={4} sx={{ color: '#F1F5F9', position: 'absolute' }} />
              <CircularProgress
                variant="determinate"
                value={Math.min(100, Number(scrapRate) * 5)}
                size={64} thickness={4}
                sx={{ color: Number(scrapRate) < 5 ? '#16A34A' : Number(scrapRate) < 10 ? '#D97706' : '#DC2626', position: 'absolute' }}
              />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography fontWeight={700} fontSize={14} lineHeight={1}>{scrapRate}%</Typography>
              </Box>
            </Box>
            <Box>
              <Typography fontSize={11} color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>Scrap Rate</Typography>
            </Box>
          </Box>
        </Box>

        {/* KPI strip */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, borderTop: '1px solid #E2E8F0', mt: 2 }}>
          {[
            { label: 'Units Today',    value: totalUnitsToday.toLocaleString() },
            { label: 'Print Logs',     value: printingLogs.length },
            { label: 'Shift Entries',  value: todayShifts.length },
            { label: 'Dispatches',     value: totalBinsDispatched },
          ].map((k) => (
            <Box key={k.label} sx={{ px: 2, py: 1.5, borderRight: '1px solid #E2E8F0', textAlign: 'center', '&:last-child': { borderRight: 'none' } }}>
              <Typography fontSize={22} fontWeight={700} color="text.primary" lineHeight={1}>{k.value}</Typography>
              <Typography fontSize={11} color="text.secondary" mt={0.25}>{k.label}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Bin mismatch flags */}
      {binMismatches.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
          <Typography fontWeight={700}>
            {binMismatches.length} bin count {binMismatches.length === 1 ? 'mismatch' : 'mismatches'} today
          </Typography>
          {binMismatches.map(d => (
            <Typography key={d.id} variant="caption" display="block">
              {d.productName}: expected {d.binsExpected}, dispatched {d.binsDispatched}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Latest Printing Stock */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <PrintIcon sx={{ color: '#D97706' }} />
          <Box>
            <Typography fontWeight={700} fontSize={17}>
              Latest Printing Stock Log
              {latestLog && (
                <Chip
                  label={latestIsToday ? 'Today' : latestLog.logDate}
                  size="small"
                  color={latestIsToday ? 'success' : 'default'}
                  sx={{ ml: 1.5, fontWeight: 700 }}
                />
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {latestLog
                ? `${latestLog.shift === 'DAY' ? '☀ Day' : '🌙 Night'} shift · ${latestLog.items.length} items · logged by ${latestLog.loggedBy ?? 'Unknown'}`
                : 'No stock log recorded yet — Printing will log one at end of shift'}
            </Typography>
          </Box>
        </Box>

        {!latestLog ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary', bgcolor: '#F9FAFB', borderRadius: 2 }}>
            <Typography fontSize={14}>No printing stock logs yet</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
            {(Object.keys(CATEGORY_META) as PrintingStockCategory[]).map(cat => {
              const items = itemsByCategory[cat] ?? []
              if (items.length === 0) return null
              const meta = CATEGORY_META[cat]
              const total = items.reduce((s, i) => s + i.sheetCount, 0)
              return (
                <Box key={cat} sx={{ p: 2, borderRadius: 2, border: `1.5px solid ${meta.color}44`, bgcolor: meta.bg + '88' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography fontSize={11} fontWeight={700} color={meta.color} textTransform="uppercase" letterSpacing={0.5}>
                      {meta.label}
                    </Typography>
                    <Chip label={total.toLocaleString()} size="small" sx={{ bgcolor: meta.color, color: '#fff', fontWeight: 700, fontSize: 11 }} />
                  </Box>
                  {items.map(item => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                      <Typography fontSize={12} noWrap sx={{ maxWidth: '65%' }}>{item.productName}</Typography>
                      <Typography fontSize={12} fontWeight={600} color={meta.color}>{item.sheetCount.toLocaleString()}</Typography>
                    </Box>
                  ))}
                </Box>
              )
            })}
          </Box>
        )}
      </Paper>

      <Grid container spacing={2.5}>
        {/* Today's production by product */}
        <Grid item xs={12} lg={7}>
          <TableContainer component={Paper} sx={{ height: '100%' }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontWeight={700}>Today's Production</Typography>
              <Chip label={`${todayShifts.length} entries`} size="small" color="primary" />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 12 } }}>
                  <TableCell>Product</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell>Line</TableCell>
                  <TableCell align="right">Units</TableCell>
                  <TableCell align="right">Scrap</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {todayShifts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No shift entries today yet
                    </TableCell>
                  </TableRow>
                )}
                {todayShifts.map(e => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontWeight: 500, fontSize: 13 }}>{e.productName}</TableCell>
                    <TableCell>
                      <Chip label={e.productType} size="small" sx={{ fontSize: 10 }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={e.shift === 'DAY' ? 'Day' : 'Night'}
                        size="small"
                        sx={{
                          bgcolor: e.shift === 'DAY' ? '#F1F5F9' : '#1E293B',
                          color: e.shift === 'DAY' ? '#374151' : '#CBD5E1',
                          fontWeight: 600, fontSize: 10,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{e.line.replace(/_/g, ' ')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13 }}>{e.productionQty.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, color: e.scrap > 0 ? '#DC2626' : 'text.secondary' }}>{e.scrap}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Today's activity feed */}
        <Grid item xs={12} lg={5}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid #E5E7EB' }}>
              <Typography fontWeight={700}>Today's Activity</Typography>
              <Typography variant="caption" color="text.secondary">Shift entries &amp; dispatches</Typography>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
              {todayShifts.length === 0 && todayDispatches.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                  No activity logged today yet
                </Box>
              )}

              {todayShifts.map(e => (
                <Box key={`s${e.id}`} sx={{
                  px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 2,
                  borderBottom: '1px solid #F3F4F6',
                  '&:hover': { bgcolor: '#F9FAFB' },
                }}>
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%',
                    bgcolor: '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <FactoryIcon sx={{ fontSize: 16, color: '#64748B' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontSize={13} fontWeight={600} noWrap>{e.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {e.line.replace(/_/g, ' ')} · {e.shift} shift · {e.operatorName}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography fontSize={13} fontWeight={700} color="text.primary">{e.productionQty.toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>units</Typography>
                  </Box>
                </Box>
              ))}

              {todayShifts.length > 0 && todayDispatches.length > 0 && (
                <Divider sx={{ my: 0.5 }}>
                  <Typography variant="caption" color="text.disabled">Dispatches</Typography>
                </Divider>
              )}

              {todayDispatches.map(d => {
                const match = d.binsExpected === d.binsDispatched
                return (
                  <Box key={`d${d.id}`} sx={{
                    px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 2,
                    borderBottom: '1px solid #F3F4F6',
                    bgcolor: !match ? '#FFF7F7' : undefined,
                    '&:hover': { bgcolor: !match ? '#FFF0F0' : '#F9FAFB' },
                  }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: '50%',
                      bgcolor: match ? '#ECFDF5' : '#FEF2F2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <LocalShippingIcon sx={{ fontSize: 16, color: match ? '#059669' : '#DC2626' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontSize={13} fontWeight={600} noWrap>{d.productName ?? '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {d.destination ? `→ ${d.destination}` : 'No destination set'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography fontSize={13} fontWeight={700} color={match ? '#10B981' : '#EF4444'}>
                        {d.binsDispatched} bins
                      </Typography>
                      {!match && (
                        <Typography variant="caption" color="#EF4444">expected {d.binsExpected}</Typography>
                      )}
                      {match && <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#10B981', display: 'block', ml: 'auto' }} />}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
