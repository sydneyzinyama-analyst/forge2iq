import { useEffect, useState, useMemo } from 'react'
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Chip, Divider, IconButton, Tooltip, InputAdornment,
} from '@mui/material'
import {
  Add, Refresh, Inbox, Campaign, Person, Search,
  MarkEmailRead, ArrowBack,
} from '@mui/icons-material'
import api from '../api/axios'
import type { Message, User } from '../types'
import { useAuth } from '../context/AuthContext'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: 'long', month: 'long', day: 'numeric',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const AVATAR_COLORS = ['#3B82F6','#8B5CF6','#059669','#DC2626','#D97706','#0891B2','#7C3AED','#BE185D']
function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function MessagesPage() {
  const { user: currentUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Message | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [mobileDetail, setMobileDetail] = useState(false)

  const load = () => {
    setLoading(true)
    api.get<Message[]>('/messages')
      .then((r) => { setMessages(r.data); setError('') })
      .catch(() => setError('Failed to load messages'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Auto-select first message on load
  useEffect(() => {
    if (!loading && messages.length > 0 && !selected) setSelected(messages[0])
  }, [loading, messages, selected])

  const handleSelect = (msg: Message) => {
    setSelected(msg)
    setMobileDetail(true)
    // Mark direct message as read
    if (!msg.broadcast && !msg.read && msg.recipientId === currentUser?.companyId) {
      api.patch(`/messages/read/${msg.id}`).then(load).catch(() => {})
    } else if (!msg.broadcast && !msg.read && msg.senderId !== currentUser?.companyId) {
      api.patch(`/messages/read/${msg.id}`).then(load).catch(() => {})
    }
  }

  const filtered = useMemo(() =>
    messages.filter(m =>
      m.senderName.toLowerCase().includes(search.toLowerCase()) ||
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      (m.recipientName ?? '').toLowerCase().includes(search.toLowerCase())
    ), [messages, search])

  const unread = messages.filter(m => !m.read && !m.broadcast).length
  const broadcasts = messages.filter(m => m.broadcast).length
  const direct = messages.filter(m => !m.broadcast).length

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography variant="h5">Messages</Typography>
          <Typography color="text.secondary" variant="body2" mt={0.5}>
            Internal factory communications and announcements
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={load} disabled={loading} size="small" sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => setComposeOpen(true)}>
            New Message
          </Button>
        </Box>
      </Box>

      {/* Stat strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2.5, bgcolor: unread > 0 ? '#EFF6FF' : '#F8FAFC', border: unread > 0 ? '1px solid #BFDBFE' : '1px solid #E2E8F0' }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Inbox sx={{ fontSize: 16, color: unread > 0 ? '#3B82F6' : '#94A3B8' }} />
            <Typography variant="caption" fontWeight={700} color={unread > 0 ? '#3B82F6' : '#94A3B8'} letterSpacing={0.5}>UNREAD</Typography>
          </Box>
          <Typography fontSize={26} fontWeight={800} color={unread > 0 ? '#1D4ED8' : '#64748B'} lineHeight={1}>{unread}</Typography>
          <Typography variant="caption" color={unread > 0 ? '#3B82F6' : 'text.disabled'}>
            {unread > 0 ? 'messages need attention' : 'all caught up'}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Person sx={{ fontSize: 16, color: '#64748B' }} />
            <Typography variant="caption" fontWeight={700} color="#64748B" letterSpacing={0.5}>DIRECT</Typography>
          </Box>
          <Typography fontSize={26} fontWeight={800} color="#0F172A" lineHeight={1}>{direct}</Typography>
          <Typography variant="caption" color="text.disabled">direct messages</Typography>
        </Paper>
        <Paper sx={{ p: 2.5, bgcolor: '#FFF7ED', border: '1px solid #FED7AA' }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Campaign sx={{ fontSize: 16, color: '#EA580C' }} />
            <Typography variant="caption" fontWeight={700} color="#EA580C" letterSpacing={0.5}>BROADCASTS</Typography>
          </Box>
          <Typography fontSize={26} fontWeight={800} color="#C2410C" lineHeight={1}>{broadcasts}</Typography>
          <Typography variant="caption" color="#EA580C">company-wide</Typography>
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: { md: 'flex' }, gap: 2, minHeight: 500 }}>

          {/* Left — message list */}
          <Box sx={{ width: { md: 360 }, flexShrink: 0, display: { xs: mobileDetail ? 'none' : 'block', md: 'block' } }}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', height: '100%' }}>
              {/* Search */}
              <Box sx={{ p: 1.5, borderBottom: '1px solid #F1F5F9' }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search messages…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment>,
                    sx: { bgcolor: '#F8FAFC', borderRadius: 2 },
                  }}
                />
              </Box>

              {filtered.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Inbox sx={{ fontSize: 36, color: '#E2E8F0', mb: 1 }} />
                  <Typography variant="body2" color="text.disabled">
                    {search ? 'No messages match your search' : 'No messages yet'}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflow: 'auto', maxHeight: 600 }}>
                  {filtered.map((msg, i) => {
                    const isSelected = selected?.id === msg.id
                    const isUnread = !msg.read && !msg.broadcast
                    const color = avatarColor(msg.senderName)
                    return (
                      <Box key={msg.id}>
                        <Box
                          onClick={() => handleSelect(msg)}
                          sx={{
                            px: 2, py: 1.75, cursor: 'pointer',
                            bgcolor: isSelected ? '#EFF6FF' : isUnread ? '#FAFEFF' : 'transparent',
                            borderLeft: `3px solid ${isSelected ? '#3B82F6' : isUnread ? '#93C5FD' : 'transparent'}`,
                            '&:hover': { bgcolor: isSelected ? '#EFF6FF' : '#F8FAFC' },
                            transition: 'background 0.1s',
                          }}
                        >
                          <Box display="flex" gap={1.5} alignItems="flex-start">
                            <Box sx={{ position: 'relative', flexShrink: 0, mt: 0.25 }}>
                              <Avatar sx={{ width: 34, height: 34, bgcolor: color, fontSize: 13, fontWeight: 800 }}>
                                {msg.broadcast ? <Campaign sx={{ fontSize: 16 }} /> : msg.senderName.charAt(0).toUpperCase()}
                              </Avatar>
                              {isUnread && (
                                <Box sx={{
                                  position: 'absolute', top: -2, right: -2,
                                  width: 10, height: 10, borderRadius: '50%',
                                  bgcolor: '#3B82F6', border: '2px solid #fff',
                                }} />
                              )}
                            </Box>
                            <Box flex={1} minWidth={0}>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.25}>
                                <Typography variant="body2" fontWeight={isUnread ? 700 : 600} noWrap>
                                  {msg.senderName}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" flexShrink={0} ml={1}>
                                  {timeAgo(msg.createdAt)}
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center" gap={0.75} mb={0.25}>
                                {msg.broadcast ? (
                                  <Chip label="Broadcast" size="small" icon={<Campaign sx={{ fontSize: 11, '&&': { color: '#EA580C' } }} />}
                                    sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA', '& .MuiChip-label': { px: 0.75 } }} />
                                ) : (
                                  <Typography variant="caption" color="text.disabled" noWrap>
                                    → {msg.recipientName ?? 'Unknown'}
                                  </Typography>
                                )}
                              </Box>
                              <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ lineHeight: 1.4 }}>
                                {msg.content}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        {i < filtered.length - 1 && <Divider sx={{ mx: 2 }} />}
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Paper>
          </Box>

          {/* Right — detail panel */}
          <Box sx={{ flex: 1, display: { xs: mobileDetail ? 'block' : 'none', md: 'block' }, minWidth: 0 }}>
            {selected ? (
              <Paper sx={{ p: 0, borderRadius: 2, height: '100%', overflow: 'hidden' }}>
                {/* Mobile back button */}
                <Box sx={{ display: { md: 'none' }, p: 1.5, borderBottom: '1px solid #F1F5F9' }}>
                  <Button startIcon={<ArrowBack />} size="small" onClick={() => setMobileDetail(false)} color="inherit">
                    Back to inbox
                  </Button>
                </Box>

                {/* Message header */}
                <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #F1F5F9', bgcolor: '#FAFAFA' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      {selected.broadcast && (
                        <Chip
                          label="Company Broadcast"
                          icon={<Campaign sx={{ fontSize: 13, '&&': { color: '#EA580C' } }} />}
                          size="small"
                          sx={{ mb: 1.5, bgcolor: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA', fontWeight: 700, fontSize: 11 }}
                        />
                      )}
                      <Box display="flex" gap={3} flexWrap="wrap">
                        <Box>
                          <Typography variant="caption" color="text.disabled" letterSpacing={0.5} fontWeight={600}>FROM</Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={0.25}>
                            <Avatar sx={{ width: 22, height: 22, bgcolor: avatarColor(selected.senderName), fontSize: 10, fontWeight: 800 }}>
                              {selected.senderName.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={700}>{selected.senderName}</Typography>
                            {selected.senderId === currentUser?.companyId && (
                              <Chip label="You" size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#EFF6FF', color: '#3B82F6' }} />
                            )}
                          </Box>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.disabled" letterSpacing={0.5} fontWeight={600}>TO</Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={0.25}>
                            {selected.broadcast ? (
                              <>
                                <Campaign sx={{ fontSize: 16, color: '#EA580C' }} />
                                <Typography variant="body2" fontWeight={700} color="#EA580C">All Company Members</Typography>
                              </>
                            ) : (
                              <>
                                <Avatar sx={{ width: 22, height: 22, bgcolor: avatarColor(selected.recipientName ?? ''), fontSize: 10, fontWeight: 800 }}>
                                  {selected.recipientName?.charAt(0) ?? '?'}
                                </Avatar>
                                <Typography variant="body2" fontWeight={700}>{selected.recipientName}</Typography>
                              </>
                            )}
                          </Box>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.disabled" letterSpacing={0.5} fontWeight={600}>DATE</Typography>
                          <Typography variant="body2" fontWeight={500} mt={0.25}>{fullDate(selected.createdAt)}</Typography>
                        </Box>
                      </Box>
                    </Box>
                    {!selected.broadcast && selected.read && (
                      <Tooltip title="Read">
                        <MarkEmailRead sx={{ color: '#10B981', fontSize: 20 }} />
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {/* Message body */}
                <Box sx={{ px: 3, py: 3 }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#1E293B' }}>
                    {selected.content}
                  </Typography>
                </Box>

                {/* Reply strip */}
                {!selected.broadcast && selected.senderId !== undefined && (
                  <Box sx={{ px: 3, py: 2, borderTop: '1px solid #F1F5F9', bgcolor: '#FAFAFA', display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setComposeOpen(true)}
                      sx={{ fontWeight: 600 }}
                    >
                      New Message
                    </Button>
                  </Box>
                )}
              </Paper>
            ) : (
              <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, minHeight: 400 }}>
                <Box textAlign="center">
                  <Inbox sx={{ fontSize: 48, color: '#E2E8F0', mb: 2 }} />
                  <Typography variant="body1" fontWeight={600} color="text.secondary">Select a message to read</Typography>
                  <Typography variant="body2" color="text.disabled" mt={0.5}>Or compose a new message</Typography>
                </Box>
              </Paper>
            )}
          </Box>
        </Box>
      )}

      <ComposeDialog open={composeOpen} onClose={() => setComposeOpen(false)} onSent={load} />
    </Box>
  )
}

function ComposeDialog({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: () => void }) {
  const [users, setUsers] = useState<User[]>([])
  const [recipientId, setRecipientId] = useState<string>('broadcast')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user: currentUser } = useAuth()

  useEffect(() => {
    if (open) {
      api.get<User[]>('/users')
        .then((r) => setUsers(r.data.filter(u => u.email !== currentUser?.email)))
        .catch(() => {})
    }
  }, [open, currentUser])

  const reset = () => { setRecipientId('broadcast'); setContent(''); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) { setError('Message content cannot be empty'); return }
    setLoading(true); setError('')
    try {
      await api.post('/messages', {
        recipientId: recipientId === 'broadcast' ? null : parseInt(recipientId),
        content: content.trim(),
      })
      onSent(); onClose(); reset()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const isBroadcast = recipientId === 'broadcast'

  return (
    <Dialog open={open} onClose={() => { onClose(); reset() }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 0.5 }}>New Message</DialogTitle>
      <Typography variant="body2" color="text.secondary" px={3} pb={1}>
        Send a direct message or broadcast to the whole company
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            label="To"
            select
            fullWidth
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            sx={{ mb: isBroadcast ? 1 : 2 }}
          >
            <MenuItem value="broadcast">
              <Box display="flex" alignItems="center" gap={1}>
                <Campaign sx={{ fontSize: 16, color: '#EA580C' }} />
                <Box>
                  <Typography variant="body2" fontWeight={700}>All Company Members</Typography>
                  <Typography variant="caption" color="text.secondary">Broadcast to everyone</Typography>
                </Box>
              </Box>
            </MenuItem>
            <Divider />
            {users.map((u) => (
              <MenuItem key={u.id} value={String(u.id)}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar sx={{ width: 24, height: 24, bgcolor: avatarColor(u.name), fontSize: 11, fontWeight: 800 }}>
                    {u.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{u.role.replace(/_/g, ' ')}</Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {isBroadcast && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 2 }}>
              <Typography variant="caption" fontWeight={700} color="#EA580C">
                This message will be sent to all members of your company
              </Typography>
            </Box>
          )}

          <TextField
            label="Message"
            fullWidth
            required
            multiline
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isBroadcast
              ? 'Write your company announcement here…'
              : 'Write your message here…'}
            inputProps={{ maxLength: 2000 }}
            helperText={`${content.length}/2000`}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => { onClose(); reset() }} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !content.trim()}
            startIcon={isBroadcast ? <Campaign /> : undefined}
            sx={{ minWidth: 140 }}
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : isBroadcast ? 'Broadcast' : 'Send Message'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
