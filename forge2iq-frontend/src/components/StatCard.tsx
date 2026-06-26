import { Paper, Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface Props {
  title: string
  value: string | number
  icon: ReactNode
  color: string
  subtitle?: string
}

export default function StatCard({ title, value, icon, color, subtitle }: Props) {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Box
          sx={{
            bgcolor: `${color}18`,
            color,
            borderRadius: 2,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" fontWeight={700} color="text.primary" lineHeight={1}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5} fontWeight={500}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.disabled" mt={0.25} display="block">
          {subtitle}
        </Typography>
      )}
    </Paper>
  )
}
