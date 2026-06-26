import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Badge, Divider, Button, Avatar, Drawer, IconButton,
  useMediaQuery, useTheme,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import PrintIcon from '@mui/icons-material/Print'
import FactoryIcon from '@mui/icons-material/Factory'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PeopleIcon from '@mui/icons-material/People'
import ChatIcon from '@mui/icons-material/Chat'
import DashboardIcon from '@mui/icons-material/Dashboard'
import BusinessIcon from '@mui/icons-material/Business'
import HistoryIcon from '@mui/icons-material/History'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

const SIDEBAR_WIDTH = 260

interface NavItem {
  label: string
  path: string
  icon: React.ReactElement
  badge?: number
}

const ROLE_META: Record<string, { label: string; color: string; description: string }> = {
  PRINTING_MANAGER:   { label: 'Printing',    color: '#2563EB', description: 'Stock log & dispatch' },
  PRODUCTION_MANAGER: { label: 'Production',  color: '#2563EB', description: 'Log shift entries' },
  DISPATCHER:         { label: 'Dispatch',    color: '#2563EB', description: 'Confirm dispatches' },
  OFFICE_MANAGER:     { label: 'Office',      color: '#2563EB', description: 'Orders, reports & team' },
  COMPANY_ADMIN:      { label: 'Office',      color: '#2563EB', description: 'Orders, reports & team' },
}

const SWITCH_ROLES: Role[] = ['OFFICE_MANAGER', 'PRINTING_MANAGER', 'PRODUCTION_MANAGER']

function getNavItems(role: Role, unreadMessages: number): NavItem[] {
  const dashboard: NavItem = { label: 'Overview', path: '/overview', icon: <DashboardIcon /> }
  const msg: NavItem = { label: 'Messages', path: '/messages', icon: <ChatIcon />, badge: unreadMessages }

  switch (role) {
    case 'PRINTING_MANAGER':
      return [dashboard, { label: 'Print Jobs', path: '/printing', icon: <PrintIcon /> }, msg]
    case 'PRODUCTION_MANAGER':
      return [dashboard, { label: 'Shift Log', path: '/production', icon: <FactoryIcon /> }, msg]
    case 'DISPATCHER':
      return [dashboard, { label: 'Dispatch Queue', path: '/dispatch', icon: <LocalShippingIcon /> }, msg]
    case 'OFFICE_MANAGER':
    case 'COMPANY_ADMIN':
    default:
      return [
        dashboard,
        { label: 'Office',   path: '/office',  icon: <BusinessIcon /> },
        { label: 'Team',     path: '/users',   icon: <PeopleIcon /> },
        { label: 'Activity', path: '/audit',   icon: <HistoryIcon /> },
        msg,
      ]
  }
}

function getHomePath(role: Role): string {
  switch (role) {
    case 'PRINTING_MANAGER':    return '/printing'
    case 'PRODUCTION_MANAGER':  return '/production'
    case 'DISPATCHER':          return '/dispatch'
    default:                    return '/office'
  }
}

export default function AppLayout() {
  const { user, previewRole, setPreviewRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unread, setUnread] = useState(0)
  const [clock, setClock] = useState(new Date())
  const [drawerOpen, setDrawerOpen] = useState(false)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    api.get<{ count: number }>('/messages/unread')
      .then(r => setUnread(r.data.count))
      .catch(() => {})
  }, [location.pathname])

  // Close drawer on navigation
  useEffect(() => {
    if (isMobile) setDrawerOpen(false)
  }, [location.pathname, isMobile])

  useEffect(() => {
    if (location.pathname.startsWith('/printing'))  setPreviewRole('PRINTING_MANAGER')
    else if (location.pathname.startsWith('/production')) setPreviewRole('PRODUCTION_MANAGER')
    else if (location.pathname.startsWith('/dispatch'))   setPreviewRole('DISPATCHER')
    else if (location.pathname.startsWith('/office') || location.pathname.startsWith('/users') || location.pathname.startsWith('/audit')) setPreviewRole('OFFICE_MANAGER')
  }, [location.pathname, setPreviewRole])

  const navItems = getNavItems(previewRole, unread)
  const roleMeta = ROLE_META[previewRole] ?? ROLE_META.COMPANY_ADMIN

  const handleRoleSwitch = (role: Role) => {
    setPreviewRole(role)
    navigate(getHomePath(role))
  }

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography fontWeight={900} sx={{ fontSize: 22, color: '#fff', letterSpacing: '-0.5px' }}>
          Forge<span style={{ color: '#60A5FA' }}>2IQ</span>
        </Typography>
        <Typography sx={{ fontSize: 11, color: '#64748B', mt: 0.25 }}>
          Manufacturing Production Intelligence
        </Typography>
      </Box>

      {/* Current department badge */}
      <Box sx={{ mx: 2, mb: 2 }}>
        <Box sx={{ bgcolor: '#1E293B', borderRadius: 2, px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 11, color: '#64748B', mb: 0.25 }}>
            You are in
          </Typography>
          <Typography fontWeight={700} sx={{ fontSize: 15, color: '#fff' }}>
            {roleMeta.label}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#64748B' }}>
            {roleMeta.description}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#1E293B', mb: 1 }} />

      {/* Nav items */}
      <List sx={{ px: 1.5, flex: 1 }}>
        {navItems.map(item => {
          const active = location.pathname === item.path
          return (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.75,
                px: 2,
                py: 1.5,
                bgcolor: active ? 'rgba(37,99,235,0.15)' : 'transparent',
                border: active ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent',
                color: active ? '#fff' : '#94A3B8',
                '&:hover': { bgcolor: '#1E293B', color: '#fff' },
                transition: 'all 0.15s',
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 44 }}>
                <Badge badgeContent={item.badge || 0} color="error" max={99}>
                  <Box sx={{ fontSize: 24, display: 'flex' }}>{item.icon}</Box>
                </Badge>
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 15, fontWeight: active ? 700 : 500 }}
              />
            </ListItemButton>
          )
        })}
      </List>

      {/* Bottom: user + clock */}
      <Box sx={{ p: 2, borderTop: '1px solid #1E293B' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#1E40AF', fontSize: 15, fontWeight: 700 }}>
            {(user?.name ?? 'U').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff' }} noWrap>
              {user?.name ?? 'Preview'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#64748B' }}>
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F1F5F9' }}>

      {/* ── Sidebar — permanent on desktop, drawer on mobile ── */}
      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: SIDEBAR_WIDTH,
              bgcolor: '#0F172A',
              border: 'none',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Box sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          bgcolor: '#0F172A',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          zIndex: 200,
        }}>
          {sidebarContent}
        </Box>
      )}

      {/* ── Main area ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` }, minWidth: 0 }}>

        {/* Top bar — department switcher */}
        <Box sx={{
          bgcolor: '#fff',
          borderBottom: '1px solid #E2E8F0',
          px: { xs: 2, md: 3 },
          py: 1.5,
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        }}>
          {/* Hamburger — mobile only */}
          {isMobile && (
            <IconButton
              onClick={() => setDrawerOpen(true)}
              size="small"
              sx={{ mr: 0.5, color: '#0F172A' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography sx={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap' }}>
            SWITCH:
          </Typography>
          {SWITCH_ROLES.map(role => {
            const meta = ROLE_META[role]
            const active = previewRole === role
            return (
              <Button
                key={role}
                size="small"
                onClick={() => handleRoleSwitch(role)}
                sx={{
                  borderRadius: 2,
                  px: { xs: 1.25, md: 2 },
                  py: 0.75,
                  fontSize: { xs: 11, md: 13 },
                  fontWeight: active ? 700 : 500,
                  bgcolor: active ? '#2563EB' : '#F8FAFC',
                  color: active ? '#fff' : '#64748B',
                  border: `1.5px solid ${active ? '#2563EB' : '#E2E8F0'}`,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: active ? '#1D4ED8' : '#F1F5F9',
                    borderColor: active ? '#1D4ED8' : '#CBD5E1',
                  },
                  transition: 'all 0.15s',
                  textTransform: 'none',
                  minWidth: 0,
                }}
              >
                {meta.label}
              </Button>
            )
          })}
        </Box>

        {/* Page content */}
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflowY: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
