import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import MessagesPage from './pages/MessagesPage'
import PrintingManagerPage from './pages/PrintingManagerPage'
import ProductionManagerPage from './pages/ProductionManagerPage'
import DispatcherPage from './pages/DispatcherPage'
import OfficeManagerPage from './pages/OfficeManagerPage'
import AuditLogPage from './pages/AuditLogPage'
import ErrorBoundary from './components/ErrorBoundary'

const theme = createTheme({
  palette: {
    primary: { main: '#3B82F6', dark: '#1D4ED8' },
    background: { default: '#F9FAFB' },
    text: { primary: '#111827', secondary: '#6B7280' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 14px rgba(59,130,246,0.4)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderColor: '#F3F4F6' } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, fontSize: 12 } },
    },
  },
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/office" replace />} />
              <Route path="printing"   element={<ErrorBoundary><PrintingManagerPage /></ErrorBoundary>} />
              <Route path="production" element={<ErrorBoundary><ProductionManagerPage /></ErrorBoundary>} />
              <Route path="dispatch"   element={<ErrorBoundary><DispatcherPage /></ErrorBoundary>} />
              <Route path="office"     element={<ErrorBoundary><OfficeManagerPage /></ErrorBoundary>} />
              <Route path="overview"   element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              <Route path="users"      element={<ErrorBoundary><UsersPage /></ErrorBoundary>} />
              <Route path="messages"   element={<ErrorBoundary><MessagesPage /></ErrorBoundary>} />
              <Route path="audit"      element={<ErrorBoundary><AuditLogPage /></ErrorBoundary>} />
            </Route>
            <Route path="*" element={<Navigate to="/office" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
