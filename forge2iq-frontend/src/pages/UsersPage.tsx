import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, Paper, IconButton, Tooltip, Avatar,
  Grid,
} from '@mui/material'
import { Add, Delete, Shield, SupervisorAccount, Engineering, AdminPanelSettings, Refresh } from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import type { User, Role } from '../types'

const ROLE_META: Record<Role, { label: string; icon: React.ReactNode; description: string }> = {
  COMPANY_ADMIN:      { label: 'Company Admin',      icon: <AdminPanelSettings sx={{ fontSize: 14 }} />,   description: 'Manage company & users' },
  OFFICE_MANAGER:     { label: 'Office Manager',     icon: <AdminPanelSettings sx={{ fontSize: 14 }} />,   description: 'Create & close work orders' },
  PRINTING_MANAGER:   { label: 'Printing Manager',   icon: <Engineering sx={{ fontSize: 14 }} />,          description: 'Log printing batches' },
  PRODUCTION_MANAGER: { label: 'Production Manager', icon: <SupervisorAccount sx={{ fontSize: 14 }} />,    description: 'Log shift entries & bins' },
  DISPATCHER:         { label: 'Dispatcher',         icon: <Engineering sx={{ fontSize: 14 }} />,          description: 'Confirm outbound dispatches' },
  SUPER_ADMIN:        { label: 'Super Admin',        icon: <Shield sx={{ fontSize: 14 }} />,              description: 'Full system access' },
  SUPERVISOR:         { label: 'Supervisor',         icon: <SupervisorAccount sx={{ fontSize: 14 }} />,    description: 'Oversee shifts & reports' },
  OPERATOR:           { label: 'Operator',           icon: <Engineering sx={{ fontSize: 14 }} />,          description: 'Log production & downtime' },
}

const AVATAR_COLORS = ['#2563EB', '#475569', '#0369A1', '#1D4ED8', '#334155', '#0891B2', '#1E40AF', '#374151']

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = currentUser?.role === 'COMPANY_ADMIN'

  const load = () => {
    setLoading(true)
    api.get<User[]>('/users')
      .then((r) => { setUsers(r.data); setError('') })
      .catch(() => setError('Failed to load team members'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/users/${deleteTarget.id}`)
      setDeleteTarget(null)
      load()
    } catch {
      setError('Failed to remove user')
    } finally {
      setDeleting(false)
    }
  }

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (!isAdmin) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight={300}>
        <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 400 }}>
          <Shield sx={{ fontSize: 48, color: '#E2E8F0', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} mb={1}>Access Restricted</Typography>
          <Typography variant="body2" color="text.secondary">
            Only Company Admins can view and manage team members.
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5">Team Members</Typography>
          <Typography color="text.secondary" variant="body2" mt={0.5}>
            Manage your company's users and their access roles
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={load} disabled={loading} size="small" sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Add Member
          </Button>
        </Box>
      </Box>

      {/* Role summary strip */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {(Object.keys(ROLE_META) as Role[]).map((role) => {
          const meta = ROLE_META[role]
          const count = roleCounts[role] ?? 0
          return (
            <Paper
              key={role}
              sx={{
                px: 2.5, py: 1.75, flex: 1, minWidth: 140,
                border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', gap: 1.5,
              }}
            >
              <Box sx={{ color: '#64748B', display: 'flex', alignItems: 'center' }}>{meta.icon}</Box>
              <Box>
                <Typography fontSize={20} fontWeight={700} color="text.primary" lineHeight={1}>{count}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{meta.label}</Typography>
              </Box>
            </Paper>
          )
        })}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>
      ) : users.length === 0 ? (
        <Paper sx={{ p: 10, textAlign: 'center' }}>
          <Engineering sx={{ fontSize: 48, color: '#E2E8F0', mb: 2 }} />
          <Typography fontWeight={600} color="text.secondary" mb={0.5}>No team members yet</Typography>
          <Typography variant="body2" color="text.disabled">Add your first team member using the button above</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {users.map((u) => {
            const meta = ROLE_META[u.role] ?? ROLE_META.OPERATOR
            const isSelf = u.email === currentUser?.email
            const color = avatarColor(u.name)
            return (
              <Grid item xs={12} sm={6} lg={4} key={u.id}>
                <Paper
                  sx={{
                    p: 2.5,
                    position: 'relative',
                    border: isSelf ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                    transition: 'box-shadow 0.15s',
                    '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
                  }}
                >
                  {isSelf && (
                    <Box
                      sx={{
                        position: 'absolute', top: 10, right: 12,
                        bgcolor: '#EFF6FF', color: '#2563EB',
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                        border: '1px solid #BFDBFE', borderRadius: 1,
                        px: 0.75, py: 0.25,
                      }}
                    >
                      YOU
                    </Box>
                  )}

                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar
                      sx={{
                        width: 48, height: 48,
                        bgcolor: color,
                        fontSize: 18, fontWeight: 800,
                        border: `3px solid ${color}33`,
                      }}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography variant="body1" fontWeight={700} noWrap>{u.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">{u.email}</Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      pt: 1.5, borderTop: '1px solid #F1F5F9',
                    }}
                  >
                    <Box>
                      <Chip
                        icon={<Box sx={{ color: '#64748B !important', display: 'flex', pl: 0.5 }}>{meta.icon}</Box>}
                        label={meta.label}
                        size="small"
                        sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                      <Typography variant="caption" color="text.disabled" display="block" mt={0.5} pl={0.25}>
                        {meta.description}
                      </Typography>
                    </Box>

                    {!isSelf && (
                      <Tooltip title="Remove from company">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget(u)}
                          sx={{
                            color: '#CBD5E1',
                            '&:hover': { color: '#EF4444', bgcolor: '#FEF2F2' },
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )
          })}
        </Grid>
      )}

      <AddMemberDialog open={open} onClose={() => setOpen(false)} onSaved={load} />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Remove Team Member</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from your company?
            They will lose all access immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" color="error" disabled={deleting} onClick={handleDelete} sx={{ minWidth: 120 }}>
            {deleting ? <CircularProgress size={18} color="inherit" /> : 'Remove User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function AddMemberDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'PRINTING_MANAGER' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const reset = () => { setForm({ name: '', email: '', password: '', role: 'OPERATOR' }); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.post('/users', form)
      onSaved(); onClose(); reset()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to add team member')
    } finally {
      setLoading(false)
    }
  }

  const selectedMeta = ROLE_META[form.role as Role]

  return (
    <Dialog open={open} onClose={() => { onClose(); reset() }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 0.5 }}>Add Team Member</DialogTitle>
      <Typography variant="body2" color="text.secondary" px={3} pb={1}>Invite a new member to your company</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField label="Full Name" fullWidth required value={form.name} onChange={set('name')} sx={{ mb: 2 }} autoFocus />
          <TextField label="Email Address" type="email" fullWidth required value={form.email} onChange={set('email')} sx={{ mb: 2 }} />
          <TextField label="Password" type="password" fullWidth required value={form.password} onChange={set('password')} sx={{ mb: 2 }} />
          <TextField label="Role" select fullWidth value={form.role} onChange={set('role')} sx={{ mb: selectedMeta ? 1 : 0 }}>
            <MenuItem value="OFFICE_MANAGER">Office Manager</MenuItem>
            <MenuItem value="PRINTING_MANAGER">Printing Manager</MenuItem>
            <MenuItem value="PRODUCTION_MANAGER">Production Manager</MenuItem>
            <MenuItem value="DISPATCHER">Dispatcher</MenuItem>
            <MenuItem value="COMPANY_ADMIN">Company Admin</MenuItem>
          </TextField>
          {selectedMeta && (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', mt: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {selectedMeta.label} — {selectedMeta.description}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => { onClose(); reset() }} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading} sx={{ minWidth: 130 }}>
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Add Member'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
