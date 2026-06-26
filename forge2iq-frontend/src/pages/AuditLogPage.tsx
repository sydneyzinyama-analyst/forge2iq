import { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Paper, Chip, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  TablePagination, TextField, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material'
import HistoryIcon from '@mui/icons-material/History'
import api from '../api/axios'
import type { AuditLog } from '../types'

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  LOGIN:    { bg: '#EFF6FF', color: '#2563EB' },
  CREATE:   { bg: '#DCFCE7', color: '#15803D' },
  UPDATE:   { bg: '#FEF9C3', color: '#92400E' },
  DELETE:   { bg: '#FEE2E2', color: '#DC2626' },
  REGISTER: { bg: '#F3E8FF', color: '#7C3AED' },
}

const ROLE_LABEL: Record<string, string> = {
  PRINTING_MANAGER:   'Printing',
  PRODUCTION_MANAGER: 'Production',
  DISPATCHER:         'Dispatch',
  OFFICE_MANAGER:     'Office',
  COMPANY_ADMIN:      'Admin',
  SUPER_ADMIN:        'Super Admin',
  SUPERVISOR:         'Supervisor',
  OPERATOR:           'Operator',
}

interface PageData {
  content: AuditLog[]
  totalElements: number
  totalPages: number
}

export default function AuditLogPage() {
  const [data, setData]         = useState<PageData>({ content: [], totalElements: 0, totalPages: 0 })
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [page, setPage]         = useState(0)
  const [rowsPerPage]           = useState(50)
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser]     = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params: Record<string, string | number> = { page, size: rowsPerPage }
    if (filterAction) params.action = filterAction
    api.get<PageData>('/audit-logs', { params })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load audit logs'))
      .finally(() => setLoading(false))
  }, [page, rowsPerPage, filterAction])

  useEffect(() => { load() }, [load])

  const filtered = filterUser
    ? data.content.filter(l => l.userName?.toLowerCase().includes(filterUser.toLowerCase()))
    : data.content

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <HistoryIcon sx={{ fontSize: 28, color: '#64748B' }} />
          <Box>
            <Typography variant="h6">Activity History</Typography>
            <Typography variant="caption" color="text.secondary">
              Every action taken by every user in the system
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={filterAction}
              label="Action"
              onChange={e => { setFilterAction(e.target.value); setPage(0) }}
            >
              <MenuItem value="">All actions</MenuItem>
              <MenuItem value="LOGIN">Login</MenuItem>
              <MenuItem value="CREATE">Create</MenuItem>
              <MenuItem value="UPDATE">Update</MenuItem>
              <MenuItem value="DELETE">Delete</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Search user"
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            sx={{ minWidth: 200 }}
          />
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 12 } }}>
                    <TableCell>When</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>What</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No activity recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map(log => {
                    const actionMeta = ACTION_COLORS[log.action] ?? { bg: '#F3F4F6', color: '#374151' }
                    const ts = new Date(log.timestamp)
                    return (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          <Typography fontSize={12} fontWeight={600} color="text.primary">
                            {ts.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                          </Typography>
                          {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </TableCell>

                        <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                          {log.userName ?? '—'}
                        </TableCell>

                        <TableCell>
                          <Typography fontSize={11} color="text.secondary">
                            {ROLE_LABEL[log.userRole ?? ''] ?? log.userRole ?? '—'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={log.action}
                            size="small"
                            sx={{
                              bgcolor: actionMeta.bg,
                              color: actionMeta.color,
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          {log.entityType && (
                            <Typography fontSize={12} color="text.secondary">
                              {log.entityType}{log.entityId ? ` #${log.entityId}` : ''}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell sx={{ fontSize: 13 }}>
                          {log.description ?? '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={data.totalElements}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[50]}
              onPageChange={(_, p) => setPage(p)}
            />
          </>
        )}
      </Paper>
    </Box>
  )
}
