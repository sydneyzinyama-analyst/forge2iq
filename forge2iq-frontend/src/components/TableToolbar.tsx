import {
  Box, TextField, InputAdornment, TableCell, TablePagination,
  Button, Menu, MenuItem,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { useState } from 'react'

/** Search input for above a table */
export function TableSearch({
  value, onChange, placeholder = 'Search…',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
          </InputAdornment>
        ),
        sx: { bgcolor: '#F8FAFC', borderRadius: 2, fontSize: 13 },
      }}
      sx={{ width: { xs: '100%', sm: 260 } }}
    />
  )
}

/** A <TableCell> that acts as a sortable column header */
export function SortableCell({
  label, sortKey, currentKey, dir, onSort, align = 'left', children,
}: {
  label: string
  sortKey: string
  currentKey: string | null
  dir: 'asc' | 'desc'
  onSort: (key: string) => void
  align?: 'left' | 'right' | 'center'
  children?: React.ReactNode
}) {
  const active = currentKey === sortKey
  return (
    <TableCell
      align={align}
      onClick={() => onSort(sortKey)}
      sx={{
        fontWeight: 700, fontSize: 12, bgcolor: '#F9FAFB',
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        color: active ? '#2563EB' : 'text.primary',
        '&:hover': { bgcolor: '#F1F5F9' },
      }}
    >
      <Box display="inline-flex" alignItems="center" gap={0.5}>
        {label}
        {active
          ? dir === 'asc'
            ? <ArrowUpwardIcon sx={{ fontSize: 13 }} />
            : <ArrowDownwardIcon sx={{ fontSize: 13 }} />
          : null}
      </Box>
      {children}
    </TableCell>
  )
}

/** Pagination bar that goes below a table */
export function TablePager({
  total, page, perPage, onPage, onPerPage,
}: {
  total: number
  page: number
  perPage: number
  onPage: (p: number) => void
  onPerPage: (n: number) => void
}) {
  return (
    <TablePagination
      component="div"
      count={total}
      page={page}
      rowsPerPage={perPage}
      rowsPerPageOptions={[25, 50, 100]}
      onPageChange={(_, p) => onPage(p)}
      onRowsPerPageChange={e => onPerPage(Number(e.target.value))}
      sx={{ borderTop: '1px solid #F3F4F6', fontSize: 13 }}
    />
  )
}

/** Export dropdown button for Excel + CSV */
export function ExportButton({
  onExcel, onCsv,
}: {
  onExcel: () => void
  onCsv: () => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<FileDownloadIcon />}
        onClick={e => setAnchor(e.currentTarget)}
        sx={{ fontSize: 12, borderColor: '#E2E8F0', color: '#64748B', '&:hover': { borderColor: '#CBD5E1' } }}
      >
        Export
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { onExcel(); setAnchor(null) }} sx={{ fontSize: 13 }}>
          Download Excel (.xlsx)
        </MenuItem>
        <MenuItem onClick={() => { onCsv(); setAnchor(null) }} sx={{ fontSize: 13 }}>
          Download CSV
        </MenuItem>
      </Menu>
    </>
  )
}
