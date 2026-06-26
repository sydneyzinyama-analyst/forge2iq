import { Component, type ReactNode } from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

interface Props { children: ReactNode; fallbackLabel?: string }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minHeight="60vh"
          p={3}
        >
          <Paper sx={{ p: 5, maxWidth: 480, textAlign: 'center', border: '1px solid #FCA5A5' }}>
            <WarningAmberIcon sx={{ fontSize: 48, color: '#EF4444', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} mb={1} color="text.primary">
              {this.props.fallbackLabel ?? 'Something went wrong'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3} sx={{ wordBreak: 'break-word' }}>
              {this.state.error.message}
            </Typography>
            <Button
              variant="contained"
              onClick={() => this.setState({ error: null })}
            >
              Try Again
            </Button>
          </Paper>
        </Box>
      )
    }
    return this.props.children
  }
}
