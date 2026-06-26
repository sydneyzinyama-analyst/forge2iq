import { useEffect, useState, Suspense } from 'react'
import {
  Box, Typography, Button, Chip, Paper, LinearProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, CircularProgress,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Tabs, Tab,
  useMediaQuery, useTheme,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import BusinessIcon from '@mui/icons-material/Business'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PrintIcon from '@mui/icons-material/Print'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import FactoryIcon from '@mui/icons-material/Factory'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import ProductionReportPDF from '../components/ProductionReportPDF'
import StockLogPDF from '../components/StockLogPDF'
import DownloadIcon from '@mui/icons-material/Download'
import api from '../api/axios'
import type {
  ProductionReport, ShiftEntry, DispatchEntry,
  PrintingShiftLog, PrintingDispatch, PrintingStockCategory,
  CustomerOrder, ProductType, Product,
} from '../types'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useTableControls } from '../hooks/useTableControls'
import { TableSearch, SortableCell, TablePager, ExportButton } from '../components/TableToolbar'
import { exportToExcel, exportToCSV } from '../utils/exportUtils'



const CATEGORY_LABEL: Record<PrintingStockCategory, string> = {
  READY_TO_DISPATCH: 'Ready to Dispatch',
  DELBERG_PLATE:     'Delberg Plate',
  READY_TO_WAX:      'Ready to Wax',
  READY_TO_VARNISH:  'Ready to Varnish',
  WIP:               'WIP',
}

const ORDER_STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:     { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  IN_PROGRESS: { bg: '#DBEAFE', color: '#1D4ED8', label: 'In Progress' },
  COMPLETE:    { bg: '#DCFCE7', color: '#15803D', label: 'Complete' },
}

const ITEM_STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_PRINT:      { bg: '#FEF3C7', color: '#92400E',  label: 'Awaiting Printing' },
  IN_PRINTING:        { bg: '#DBEAFE', color: '#1D4ED8',  label: 'In Printing' },
  IN_PRODUCTION:      { bg: '#EDE9FE', color: '#6D28D9',  label: 'In Production' },
  READY_TO_DISPATCH:  { bg: '#D1FAE5', color: '#065F46',  label: 'Ready to Dispatch' },
  DISPATCHED:         { bg: '#DCFCE7', color: '#15803D',  label: 'Dispatched' },
  CLOSED:             { bg: '#F3F4F6', color: '#374151',  label: 'Closed' },
  DECLINED:           { bg: '#FEE2E2', color: '#DC2626',  label: 'Declined by Printing' },
}

interface OrderItemForm { productId: string; productName: string; productType: ProductType; plannedQuantity: string; sheetsAllocated: string; extraSheets: string; notes: string }
const blankItem = (): OrderItemForm => ({ productId: '', productName: '', productType: 'BODY', plannedQuantity: '', sheetsAllocated: '', extraSheets: '', notes: '' })

export default function OfficeManagerPage() {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'))

  const [reports, setReports]           = useState<ProductionReport[]>([])
  const [entries, setEntries]           = useState<ShiftEntry[]>([])
  const [dispatches, setDispatches]     = useState<DispatchEntry[]>([])
  const [printingLogs, setPrintingLogs] = useState<PrintingShiftLog[]>([])
  const [pdispatches, setPDispatches]   = useState<PrintingDispatch[]>([])
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [products, setProducts]         = useState<Product[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [viewReport, setViewReport]     = useState<ProductionReport | null>(null)
  const [pdfReport, setPdfReport]       = useState<ProductionReport | null>(null)
  const [viewingStockLog, setViewingStockLog] = useState<PrintingShiftLog | null>(null)
  const [reviewing, setReviewing]       = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [orderDialogOpen, setOrderDialogOpen]     = useState(false)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [submittingOrder, setSubmittingOrder]     = useState(false)
  const [submittingProduct, setSubmittingProduct] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    orderReference: '',
    notes: '',
    items: [blankItem()],
  })
  const [productForm, setProductForm] = useState({ name: '', productType: 'BODY' as ProductType, unitsPerSheet: '' })
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null)
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null)
  const [orderFormErrors, setOrderFormErrors] = useState<Record<string, string>>({})
  const [productFormErrors, setProductFormErrors] = useState<Record<string, string>>({})

  const load = async () => {
    try {
      setLoading(true)
      const [rRes, eRes, dRes, plRes, pdRes, coRes, prRes] = await Promise.all([
        api.get<ProductionReport[]>('/production-reports'),
        api.get<ShiftEntry[]>('/shift-entries'),
        api.get<DispatchEntry[]>('/dispatch'),
        api.get<PrintingShiftLog[]>('/printing-shift-logs'),
        api.get<PrintingDispatch[]>('/printing-dispatches'),
        api.get<CustomerOrder[]>('/customer-orders'),
        api.get<Product[]>('/products'),
      ])
      setReports(Array.isArray(rRes.data) ? rRes.data : [])
      setEntries(Array.isArray(eRes.data) ? eRes.data : [])
      setDispatches(Array.isArray(dRes.data) ? dRes.data : [])
      setPrintingLogs(Array.isArray(plRes.data) ? plRes.data : [])
      setPDispatches(Array.isArray(pdRes.data) ? pdRes.data : [])
      setCustomerOrders(Array.isArray(coRes.data) ? coRes.data : [])
      setProducts(Array.isArray(prRes.data) ? prRes.data : [])
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useAutoRefresh(load, 60000)

  const handleReview = async (id: number) => {
    setReviewing(true)
    try {
      const res = await api.patch<ProductionReport>(`/production-reports/${id}/review`)
      setReports(prev => prev.map(r => r.id === id ? res.data : r))
      setViewReport(v => v?.id === id ? res.data : v)
    } catch {
      setError('Failed to mark as reviewed')
    } finally {
      setReviewing(false)
    }
  }

  const validateProductForm = () => {
    const errs: Record<string, string> = {}
    if (!productForm.name.trim()) errs.name = 'Product name is required'
    const ups = Number(productForm.unitsPerSheet)
    if (!productForm.unitsPerSheet) errs.unitsPerSheet = 'Units per sheet is required'
    else if (isNaN(ups) || ups <= 0) errs.unitsPerSheet = 'Must be greater than 0'
    setProductFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreateProduct = async () => {
    if (!validateProductForm()) return
    setSubmittingProduct(true)
    try {
      await api.post('/products', {
        name: productForm.name.trim(),
        productType: productForm.productType,
        unitsPerSheet: Number(productForm.unitsPerSheet),
      })
      setProductDialogOpen(false)
      setProductForm({ name: '', productType: 'BODY', unitsPerSheet: '' })
      setProductFormErrors({})
      load()
    } catch {
      setError('Failed to create product')
    } finally {
      setSubmittingProduct(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!deleteProductTarget) return
    try {
      await api.delete(`/products/${deleteProductTarget.id}`)
      setDeleteProductTarget(null)
      load()
    } catch {
      setError('Failed to delete product')
    }
  }

  const handleEditOrder = (co: CustomerOrder) => {
    setEditingOrderId(co.id)
    setOrderForm({
      customerName: co.customerName,
      orderReference: co.orderReference ?? '',
      notes: co.notes ?? '',
      items: co.items.map(i => ({
        productId: '', // not tracked on existing items
        productName: i.productName,
        productType: i.productType,
        plannedQuantity: String(i.plannedQuantity),
        sheetsAllocated: String(i.sheetsAllocated ?? ''),
        extraSheets: String(i.extraSheets),
        notes: i.notes ?? '',
      })),
    })
    setOrderDialogOpen(true)
  }

  const handleSelectProduct = (itemIndex: number, productId: string) => {
    const product = products.find(p => String(p.id) === productId)
    if (!product) return
    setOrderForm(f => ({
      ...f,
      items: f.items.map((it, idx) => {
        if (idx !== itemIndex) return it
        const qty = Number(it.plannedQuantity)
        const sheets = qty > 0 ? Math.ceil(qty / product.unitsPerSheet) : 0
        return {
          ...it,
          productId: String(product.id),
          productName: product.name,
          productType: product.productType,
          sheetsAllocated: sheets > 0 ? String(sheets) : '',
        }
      }),
    }))
  }

  const handleQuantityChange = (itemIndex: number, qty: string) => {
    setOrderForm(f => ({
      ...f,
      items: f.items.map((it, idx) => {
        if (idx !== itemIndex) return it
        const product = products.find(p => String(p.id) === it.productId)
        const qtyNum = Number(qty)
        const sheets = product && qtyNum > 0 ? Math.ceil(qtyNum / product.unitsPerSheet) : 0
        return {
          ...it,
          plannedQuantity: qty,
          sheetsAllocated: sheets > 0 ? String(sheets) : '',
        }
      }),
    }))
  }

  const validateOrderForm = () => {
    const errs: Record<string, string> = {}
    if (!orderForm.customerName.trim()) errs.customerName = 'Customer name is required'
    orderForm.items.forEach((i, idx) => {
      if (!i.productName.trim()) errs[`item_${idx}_product`] = 'Product is required'
      const qty = Number(i.plannedQuantity)
      if (!i.plannedQuantity) errs[`item_${idx}_qty`] = 'Quantity is required'
      else if (isNaN(qty) || qty <= 0) errs[`item_${idx}_qty`] = 'Must be greater than 0'
      if (i.extraSheets && Number(i.extraSheets) < 0) errs[`item_${idx}_extra`] = 'Cannot be negative'
    })
    setOrderFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreateOrder = async () => {
    if (!validateOrderForm()) return
    setSubmittingOrder(true)
    try {
      const payload = {
        customerName: orderForm.customerName.trim(),
        orderReference: orderForm.orderReference.trim() || null,
        notes: orderForm.notes || null,
        items: orderForm.items.map(i => ({
          productName: i.productName.trim(),
          productType: i.productType,
          plannedQuantity: Number(i.plannedQuantity),
          sheetsAllocated: i.sheetsAllocated ? Number(i.sheetsAllocated) : null,
          extraSheets: i.extraSheets ? Number(i.extraSheets) : 0,
          notes: i.notes || null,
        })),
      }
      if (editingOrderId) {
        await api.patch(`/customer-orders/${editingOrderId}`, payload)
      } else {
        await api.post('/customer-orders', payload)
      }
      setOrderDialogOpen(false)
      setOrderForm({ customerName: '', orderReference: '', notes: '', items: [blankItem()] })
      setOrderFormErrors({})
      setEditingOrderId(null)
      load()
    } catch {
      setError(editingOrderId ? 'Failed to update order' : 'Failed to create order')
    } finally {
      setSubmittingOrder(false)
    }
  }

  const toggleExpand = (id: number) =>
    setExpandedOrders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const todayStr       = new Date().toISOString().split('T')[0]
  const todayEntries   = entries.filter(e => e.shiftDate === todayStr)
  const todayDispatch  = dispatches.filter(d => d.dispatchedAt.startsWith(todayStr))
  const pendingReports = reports.filter(r => r.status === 'SUBMITTED')
  const latestLog      = printingLogs[0] ?? null

  // Table controls
  const reportsTC  = useTableControls(reports, ['reportDate', 'submittedBy', 'reviewedBy', 'notes'], { defaultSortKey: 'reportDate', defaultSortDir: 'desc' })
  const ordersTC   = useTableControls(customerOrders, ['customerName', 'orderReference', 'notes'], { defaultSortKey: 'createdAt', defaultSortDir: 'desc' })
  const productsTC = useTableControls(products, ['name', 'productType'], { defaultSortKey: 'name', defaultSortDir: 'asc' })
  const logsTC     = useTableControls(printingLogs, ['logDate', 'loggedBy'], { defaultSortKey: 'logDate', defaultSortDir: 'desc' })

  const totalUnitsToday = todayEntries.reduce((s, e) => s + e.productionQty, 0)
  const totalScrapToday = todayEntries.reduce((s, e) => s + e.scrap, 0)
  const scrapRate       = totalUnitsToday + totalScrapToday > 0
    ? ((totalScrapToday / (totalUnitsToday + totalScrapToday)) * 100).toFixed(1) : '0.0'
  const totalBinsToday  = todayDispatch.reduce((s, d) => s + d.binsDispatched, 0)

  // Helpers for the report detail dialog
  const reportDay   = (date: string) => entries.filter(e => e.shiftDate === date && e.shift === 'DAY')
  const reportNight = (date: string) => entries.filter(e => e.shiftDate === date && e.shift === 'NIGHT')
  const sumF = (arr: ShiftEntry[], f: keyof ShiftEntry) => arr.reduce((s, e) => s + (Number(e[f]) || 0), 0)

  // suppress unused-var warning — pdispatches used implicitly to confirm data loaded
  void pdispatches

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon sx={{ fontSize: 32, color: '#64748B' }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">Office</Typography>
            <Typography color="text.secondary" fontSize={14}>Reports &amp; Factory Overview</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {pendingReports.length > 0 && (
            <Chip
              label={`${pendingReports.length} report${pendingReports.length > 1 ? 's' : ''} awaiting review`}
              color="warning"
              onClick={() => setActiveTab(1)}
              sx={{ fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            />
          )}
          {activeTab === 0 && <>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setProductDialogOpen(true)}>
              Add Product
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOrderDialogOpen(true)}>
              Create Order
            </Button>
          </>}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 2 }}>
          <Tab label="Orders" />
          <Tab label="Reports" />
          <Tab label="Overview" />
        </Tabs>
      </Paper>

      {/* ── ORDERS TAB ── */}
      {activeTab === 0 && <>

      {/* Stats strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Reports Pending Review', value: pendingReports.length, warning: pendingReports.length > 0 },
          { label: 'Units Produced Today',   value: totalUnitsToday.toLocaleString() },
          { label: 'Scrap Rate Today',        value: `${scrapRate}%`, error: Number(scrapRate) > 5 },
          { label: 'Bins Dispatched Today',   value: totalBinsToday },
        ].map(s => (
          <Paper key={s.label} sx={{ p: 2.5, borderLeft: '4px solid #E2E8F0' }}>
            <Typography variant="h4" fontWeight={700} sx={{ color: s.error ? '#DC2626' : s.warning ? '#D97706' : 'text.primary' }}>{s.value}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Customer Orders */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BusinessIcon sx={{ color: '#64748B' }} />
          <Box>
            <Typography fontWeight={700} color="text.primary">Customer Orders</Typography>
            <Typography variant="caption" color="text.secondary">Orders created by the office — each item gets a batch number when printing accepts it</Typography>
          </Box>
          <Chip label={`${customerOrders.length} total`} size="small"
            sx={{ ml: 'auto', fontWeight: 700 }} />
        </Box>

        {customerOrders.length > 0 && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <TableSearch value={ordersTC.search} onChange={ordersTC.setSearch} placeholder="Search customer, reference…" />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {ordersTC.total} of {ordersTC.totalUnfiltered} orders
            </Typography>
          </Box>
        )}
        {customerOrders.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography fontSize={14}>No customer orders yet</Typography>
            <Typography variant="caption">Click "Create Order" to add one</Typography>
          </Box>
        ) : (
          <Box>
            {ordersTC.paginated.map(co => {
              const s = ORDER_STATUS_COLOR[co.status] ?? ORDER_STATUS_COLOR.PENDING
              const expanded = expandedOrders.has(co.id)
              const allDispatched = co.items.length > 0 && co.items.every(i => i.status === 'DISPATCHED' || i.status === 'CLOSED')
              return (
                <Box key={co.id} sx={{ borderBottom: '1px solid #F3F4F6' }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, '&:hover': { bgcolor: '#F9FAFB' } }}
                  >
                    <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleExpand(co.id)}>
                      <Typography fontWeight={700} fontSize={14}>{co.customerName}</Typography>
                      {co.orderReference && (
                        <Typography variant="caption" color="text.secondary">Ref: {co.orderReference}</Typography>
                      )}
                    </Box>
                    <Chip label={`${co.items.length} item${co.items.length !== 1 ? 's' : ''}`} size="small" />
                    <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700 }} />
                    {allDispatched && <CheckCircleOutlineIcon sx={{ color: '#16A34A', fontSize: 18 }} />}
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      {new Date(co.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Typography>
                    <IconButton size="small" onClick={() => handleEditOrder(co)} title="Edit order" sx={{ color: '#64748B' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => toggleExpand(co.id)}>{expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                  </Box>

                  {expanded && (
                    <Box sx={{ px: 2, pb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 11 } }}>
                            <TableCell>Product</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Batch #</TableCell>
                            <TableCell align="right">Planned Qty</TableCell>
                            <TableCell align="right">Total Sheets</TableCell>
                            <TableCell align="right">Printing Scrap</TableCell>
                            <TableCell align="right">Production Scrap</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {co.items.map(item => {
                            const is = ITEM_STATUS_COLOR[item.status] ?? ITEM_STATUS_COLOR.PENDING_PRINT
                            return (
                              <TableRow key={item.id} hover>
                                <TableCell sx={{ fontWeight: 600 }}>{item.productName}</TableCell>
                                <TableCell><Chip label={item.productType} size="small" sx={{ fontSize: 10 }} /></TableCell>
                                <TableCell sx={{ fontFamily: 'monospace', color: '#374151', fontWeight: 700, fontSize: 12 }}>
                                  {item.batchNumber ?? <Typography component="span" color="text.disabled" fontSize={12}>Pending</Typography>}
                                </TableCell>
                                <TableCell align="right">{item.plannedQuantity.toLocaleString()}</TableCell>
                                <TableCell align="right">{((item.sheetsAllocated ?? 0) + (item.extraSheets ?? 0)).toLocaleString()}</TableCell>
                                <TableCell align="right" sx={{ color: item.printingScrap > 0 ? '#DC2626' : 'text.secondary' }}>
                                  {item.printingScrap.toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ color: item.productionScrap > 0 ? '#DC2626' : 'text.secondary' }}>
                                  {item.productionScrap.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Chip label={is.label} size="small" sx={{ bgcolor: is.bg, color: is.color, fontWeight: 700, fontSize: 10 }} />
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </Box>
              )
            })}
            {ordersTC.total > ordersTC.perPage && (
              <Box sx={{ borderTop: '1px solid #F3F4F6' }}>
                <TablePager total={ordersTC.total} page={ordersTC.page} perPage={ordersTC.perPage} onPage={ordersTC.setPage} onPerPage={ordersTC.setPerPage} />
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Product Catalog */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <FactoryIcon sx={{ color: '#64748B' }} />
          <Box>
            <Typography fontWeight={700} color="text.primary">Product Catalog</Typography>
            <Typography variant="caption" color="text.secondary">
              Products used when creating orders — defines units per sheet for automatic sheet calculation
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
            {products.length > 0 && <TableSearch value={productsTC.search} onChange={productsTC.setSearch} placeholder="Search…" />}
            <Chip label={`${products.length} products`} size="small" sx={{ fontWeight: 700 }} />
          </Box>
        </Box>
        {products.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography fontSize={14}>No products yet — click "Add Product" to create your first one</Typography>
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableCell label="Name" sortKey="name" currentKey={String(productsTC.sortKey ?? '')} dir={productsTC.sortDir} onSort={k => productsTC.toggleSort(k as keyof Product)} />
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 12 }}>Type</TableCell>
                  <SortableCell label="Units per Sheet" sortKey="unitsPerSheet" currentKey={String(productsTC.sortKey ?? '')} dir={productsTC.sortDir} onSort={k => productsTC.toggleSort(k as keyof Product)} align="right" />
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 12 }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productsTC.paginated.length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>No results match your search</TableCell></TableRow>
                )}
                {productsTC.paginated.map(p => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                    <TableCell><Chip label={p.productType} size="small" sx={{ fontSize: 10 }} /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{p.unitsPerSheet.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setDeleteProductTarget(p)} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePager total={productsTC.total} page={productsTC.page} perPage={productsTC.perPage} onPage={productsTC.setPage} onPerPage={productsTC.setPerPage} />
          </>
        )}
      </Paper>

      {/* Printing Stock Logs */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <PrintIcon sx={{ color: '#64748B' }} />
          <Box>
            <Typography fontWeight={700} color="text.primary">Printing Stock Logs</Typography>
            <Typography variant="caption" color="text.secondary">Daily stock updates sent from the printing department</Typography>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
            {printingLogs.length > 0 && <TableSearch value={logsTC.search} onChange={logsTC.setSearch} placeholder="Search date, logged by…" />}
            <Chip label={`${logsTC.total} logs`} size="small" sx={{ fontWeight: 700 }} />
          </Box>
        </Box>
        {printingLogs.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography fontSize={14}>No stock logs received yet</Typography>
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableCell label="Date" sortKey="logDate" currentKey={String(logsTC.sortKey ?? '')} dir={logsTC.sortDir} onSort={k => logsTC.toggleSort(k as keyof PrintingShiftLog)} />
                  <SortableCell label="Logged By" sortKey="loggedBy" currentKey={String(logsTC.sortKey ?? '')} dir={logsTC.sortDir} onSort={k => logsTC.toggleSort(k as keyof PrintingShiftLog)} />
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 12 }} align="right">Items</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 12 }} align="right">Total Sheets</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#F9FAFB', fontSize: 12 }} align="right">Document</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logsTC.paginated.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>No results match your search</TableCell></TableRow>
                )}
                {logsTC.paginated.map(log => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{log.logDate}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{log.loggedBy ?? '—'}</TableCell>
                    <TableCell align="right">{log.items.length}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {log.items.reduce((s, i) => s + i.sheetCount, 0).toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => setViewingStockLog(log)} sx={{ fontSize: 11 }}>View</Button>
                        <PDFDownloadLink
                          document={<StockLogPDF logDate={log.logDate} loggedBy={log.loggedBy ?? undefined} items={log.items.map(i => ({ ...i, sheetCount: String(i.sheetCount), batchNumber: i.batchNumber ?? '' }))} />}
                          fileName={`stock-log-${log.logDate}.pdf`}
                          style={{ textDecoration: 'none' }}
                        >
                          {({ loading: pdfLoading }) => (
                            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={pdfLoading} sx={{ fontSize: 11 }}>
                              {pdfLoading ? '…' : 'PDF'}
                            </Button>
                          )}
                        </PDFDownloadLink>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePager total={logsTC.total} page={logsTC.page} perPage={logsTC.perPage} onPage={logsTC.setPage} onPerPage={logsTC.setPerPage} />
          </>
        )}
      </Paper>

      </> /* end Orders tab */}

      {/* ── REPORTS TAB ── */}
      {activeTab === 1 && <>

      {/* Production Reports */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BusinessIcon sx={{ color: '#64748B' }} />
          <Box>
            <Typography fontWeight={700} color="text.primary">Production Reports</Typography>
            <Typography variant="caption" color="text.secondary">
              Submitted by the production team at end of each 24-hour cycle
            </Typography>
          </Box>
          {pendingReports.length > 0 && (
            <Chip label={`${pendingReports.length} pending`} size="small"
              sx={{ ml: 'auto', fontWeight: 700 }} />
          )}
        </Box>

        {reports.length > 0 && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <TableSearch value={reportsTC.search} onChange={reportsTC.setSearch} placeholder="Search date, submitted by…" />
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <ExportButton
                onExcel={() => exportToExcel(reportsTC.paginated.map(r => ({
                  Date: r.reportDate, Status: r.status, 'Submitted By': r.submittedBy ?? '',
                  'Submitted At': new Date(r.submittedAt).toLocaleString(), 'Reviewed By': r.reviewedBy ?? '', Notes: r.notes ?? '',
                })), `production-reports`)}
                onCsv={() => exportToCSV(reportsTC.paginated.map(r => ({
                  Date: r.reportDate, Status: r.status, 'Submitted By': r.submittedBy ?? '',
                  'Submitted At': new Date(r.submittedAt).toLocaleString(), 'Reviewed By': r.reviewedBy ?? '', Notes: r.notes ?? '',
                })), `production-reports`)}
              />
            </Box>
          </Box>
        )}
        {reports.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <HourglassEmptyIcon sx={{ fontSize: 36, opacity: 0.3, mb: 1, display: 'block', mx: 'auto' }} />
            <Typography fontSize={14}>No production reports submitted yet</Typography>
            <Typography variant="caption">Production will send their 24-hour report from the Production page</Typography>
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableCell label="Date" sortKey="reportDate" currentKey={String(reportsTC.sortKey ?? '')} dir={reportsTC.sortDir} onSort={k => reportsTC.toggleSort(k as keyof ProductionReport)} />
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#FAFAFA', fontSize: 12 }}>Status</TableCell>
                  <SortableCell label="Submitted By" sortKey="submittedBy" currentKey={String(reportsTC.sortKey ?? '')} dir={reportsTC.sortDir} onSort={k => reportsTC.toggleSort(k as keyof ProductionReport)} />
                  <SortableCell label="Submitted At" sortKey="submittedAt" currentKey={String(reportsTC.sortKey ?? '')} dir={reportsTC.sortDir} onSort={k => reportsTC.toggleSort(k as keyof ProductionReport)} />
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#FAFAFA', fontSize: 12 }}>Reviewed By</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#FAFAFA', fontSize: 12 }}>Notes</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#FAFAFA', fontSize: 12 }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportsTC.paginated.length === 0 && (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>No results match your search</TableCell></TableRow>
                )}
                {reportsTC.paginated.map(r => (
                  <TableRow key={r.id} hover sx={{ bgcolor: r.status === 'SUBMITTED' ? '#FDFAFF' : undefined }}>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {new Date(r.reportDate).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.status === 'SUBMITTED' ? 'Pending Review' : 'Reviewed'}
                        icon={r.status === 'REVIEWED'
                          ? <CheckCircleOutlineIcon style={{ fontSize: 14 }} />
                          : <HourglassEmptyIcon style={{ fontSize: 14 }} />}
                        sx={{ fontWeight: 700, fontSize: 11 }}
                        color={r.status === 'SUBMITTED' ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{r.submittedBy ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {new Date(r.submittedAt).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{r.reviewedBy ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 200 }}>
                      <Typography noWrap fontSize={12}>{r.notes ?? '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" sx={{ mr: 1, fontSize: 12 }} onClick={() => setViewReport(r)}>View</Button>
                      <Button size="small" variant="outlined" startIcon={<PictureAsPdfIcon />}
                        sx={{ borderColor: '#EF4444', color: '#EF4444', mr: 1, fontSize: 12 }} onClick={() => setPdfReport(r)}>PDF</Button>
                      {r.status === 'SUBMITTED' && (
                        <Button size="small" variant="contained" sx={{ fontSize: 12 }} onClick={() => handleReview(r.id)}>Mark Reviewed</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePager total={reportsTC.total} page={reportsTC.page} perPage={reportsTC.perPage} onPage={reportsTC.setPage} onPerPage={reportsTC.setPerPage} />
          </>
        )}
      </Paper>

      </> /* end Reports tab */}

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 2 && <>

      {/* Live overview — 2 columns */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>

        {/* Today's Production */}
        <Paper sx={{ overflow: 'hidden' }}>
          <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FactoryIcon sx={{ color: '#64748B' }} />
            <Typography fontWeight={700} color="text.primary">Today's Production</Typography>
            <Chip label={`${todayEntries.length} entries`} size="small"
              sx={{ ml: 'auto', fontWeight: 700 }} />
          </Box>
          {todayEntries.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography fontSize={13}>No shift entries today yet</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: '#F9FAFB', fontSize: 11 } }}>
                  <TableCell>Product</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell align="right">Units</TableCell>
                  <TableCell align="right">Scrap</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {todayEntries.map(e => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontWeight: 500, fontSize: 13 }}>{e.productName}</TableCell>
                    <TableCell>
                      <Chip label={e.shift === 'DAY' ? 'Day' : 'Night'} size="small"
                        sx={{ bgcolor: e.shift === 'DAY' ? '#F1F5F9' : '#1E293B', color: e.shift === 'DAY' ? '#374151' : '#CBD5E1', fontWeight: 600, fontSize: 10 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{e.productionQty.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: e.scrap > 0 ? '#DC2626' : 'text.secondary' }}>{e.scrap}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Right column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Latest Printing Stock */}
          <Paper sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PrintIcon sx={{ color: '#64748B' }} />
              <Box>
                <Typography fontWeight={700} color="text.primary">Latest Printing Stock</Typography>
                {latestLog && (
                  <Typography variant="caption" color="text.secondary">
                    {latestLog.logDate} · {latestLog.shift === 'DAY' ? '☀ Day' : '🌙 Night'}
                  </Typography>
                )}
              </Box>
            </Box>
            {!latestLog ? (
              <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                <Typography fontSize={13}>No stock log yet</Typography>
              </Box>
            ) : (
              <Box sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {latestLog.items.map(item => (
                  <Chip
                    key={item.id}
                    label={`${item.productName} — ${item.sheetCount.toLocaleString()}`}
                    size="small"
                    sx={{ fontSize: 11, fontWeight: 600 }}
                    title={CATEGORY_LABEL[item.category]}
                  />
                ))}
              </Box>
            )}
          </Paper>

          {/* Today's Dispatches */}
          <Paper sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LocalShippingIcon sx={{ color: '#64748B' }} />
              <Typography fontWeight={700} color="text.primary">Today's Dispatches</Typography>
              <Chip label={`${totalBinsToday} bins`} size="small"
                sx={{ ml: 'auto', fontWeight: 700 }} />
            </Box>
            {todayDispatch.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                <Typography fontSize={13}>No dispatches today</Typography>
              </Box>
            ) : (
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {todayDispatch.map(d => {
                  const match = d.binsExpected === d.binsDispatched
                  return (
                    <Box key={d.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      px: 1.5, py: 1, borderRadius: 1.5,
                      bgcolor: '#F8FAFC',
                      border: `1px solid ${match ? '#E2E8F0' : '#FCA5A5'}`,
                    }}>
                      <Typography fontWeight={700} fontSize={14} color={match ? 'text.primary' : '#DC2626'}>{d.binsDispatched}</Typography>
                      <Typography fontSize={12} sx={{ flex: 1 }}>{d.productName ?? '—'}</Typography>
                      {!match && <Chip label={`Δ${Math.abs(d.binsDispatched - d.binsExpected)}`} size="small" color="error" />}
                      {match && <CheckCircleOutlineIcon sx={{ color: '#16A34A', fontSize: 16 }} />}
                    </Box>
                  )
                })}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      </> /* end Overview tab */}

      {/* Delete Product Confirmation Dialog */}
      <Dialog open={!!deleteProductTarget} onClose={() => setDeleteProductTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Product</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete <strong>{deleteProductTarget?.name}</strong>?
            This cannot be undone and will affect any existing orders using this product.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteProductTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteProduct}>Delete Product</Button>
        </DialogActions>
      </Dialog>

      {/* Create / Edit Order Dialog */}
      <Dialog open={orderDialogOpen} onClose={() => { setOrderDialogOpen(false); setEditingOrderId(null); setOrderFormErrors({}) }} maxWidth="md" fullWidth fullScreen={fullScreen}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>
          {editingOrderId ? 'Edit Customer Order' : 'Create Customer Order'}
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField label="Customer Name" fullWidth required
              value={orderForm.customerName}
              onChange={e => setOrderForm(f => ({ ...f, customerName: e.target.value }))}
              error={!!orderFormErrors.customerName}
              helperText={orderFormErrors.customerName} />
            <TextField label="Order Reference / PO Number (optional)" fullWidth
              value={orderForm.orderReference}
              onChange={e => setOrderForm(f => ({ ...f, orderReference: e.target.value }))} />
          </Box>
          <TextField label="Notes (optional)" fullWidth multiline rows={2}
            value={orderForm.notes}
            onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} />

          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography fontWeight={700} fontSize={13} color="text.secondary">ORDER ITEMS</Typography>
            {products.length === 0 && (
              <Typography variant="caption" color="error">No products in catalog — add products first</Typography>
            )}
          </Box>

          {orderForm.items.map((item, i) => {
            const selectedProduct = products.find(p => String(p.id) === item.productId)
            return (
              <Box key={i} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr auto' }, gap: 1.5, alignItems: 'flex-start' }}>
                  {/* Product dropdown */}
                  <FormControl size="small" fullWidth required>
                    <InputLabel>Product</InputLabel>
                    <Select
                      value={item.productId}
                      label="Product"
                      onChange={e => handleSelectProduct(i, e.target.value)}
                    >
                      {products.length === 0 && (
                        <MenuItem value="" disabled>No products — add to catalog first</MenuItem>
                      )}
                      {products.map(p => (
                        <MenuItem key={p.id} value={String(p.id)}>
                          <Box>
                            <Typography fontSize={13} fontWeight={600}>{p.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.productType} · {p.unitsPerSheet.toLocaleString()} units/sheet
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Quantity ordered */}
                  <TextField
                    label="Quantity Ordered"
                    size="small"
                    type="number"
                    fullWidth
                    required
                    value={item.plannedQuantity}
                    onChange={e => handleQuantityChange(i, e.target.value)}
                    disabled={!item.productId}
                    helperText={item.productId ? 'Units the customer ordered' : 'Select a product first'}
                  />

                  {/* Extra sheets for scrap */}
                  <TextField
                    label="Extra Sheets (Scrap)"
                    size="small"
                    type="number"
                    fullWidth
                    value={item.extraSheets}
                    onChange={e => setOrderForm(f => ({
                      ...f,
                      items: f.items.map((it, idx) => idx !== i ? it : { ...it, extraSheets: e.target.value }),
                    }))}
                    disabled={!item.productId}
                    inputProps={{ min: 0 }}
                    helperText="Additional sheets for scrap"
                  />

                  <IconButton size="small" onClick={() => setOrderForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}
                    disabled={orderForm.items.length === 1} sx={{ color: '#CBD5E1', '&:hover': { color: '#DC2626' }, mt: 0.5 }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Auto-calculated result */}
                {selectedProduct && Number(item.plannedQuantity) > 0 && (
                  <Box sx={{ display: 'flex', gap: 3, px: 0.5, py: 1, bgcolor: '#F8FAFC', borderRadius: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Base sheets</Typography>
                      <Typography fontWeight={700} fontSize={16}>{item.sheetsAllocated || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Extra (scrap)</Typography>
                      <Typography fontWeight={700} fontSize={16} color={Number(item.extraSheets) > 0 ? 'warning.main' : 'text.primary'}>
                        +{item.extraSheets || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total sheets</Typography>
                      <Typography fontWeight={700} fontSize={16} color="primary.main">
                        {(Number(item.sheetsAllocated || 0) + Number(item.extraSheets || 0)) || '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Units per sheet</Typography>
                      <Typography fontWeight={700} fontSize={16}>{selectedProduct.unitsPerSheet.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Formula</Typography>
                      <Typography fontSize={13} color="text.secondary">
                        ⌈{Number(item.plannedQuantity).toLocaleString()} ÷ {selectedProduct.unitsPerSheet.toLocaleString()}⌉ + {item.extraSheets || 0} = {Number(item.sheetsAllocated || 0) + Number(item.extraSheets || 0)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )
          })}

          <Button startIcon={<AddIcon />}
            onClick={() => setOrderForm(f => ({ ...f, items: [...f.items, blankItem()] }))}
            sx={{ alignSelf: 'flex-start' }}>
            Add Another Item
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setOrderDialogOpen(false); setEditingOrderId(null); setOrderFormErrors({}) }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateOrder} disabled={submittingOrder}>
            {submittingOrder ? (editingOrderId ? 'Saving…' : 'Creating…') : (editingOrderId ? 'Save Changes' : 'Create Order')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={!!viewReport} onClose={() => setViewReport(null)} maxWidth="xl" fullWidth>
        {viewReport && (() => {
          const date   = viewReport.reportDate
          const dayE   = reportDay(date)
          const nightE = reportNight(date)
          const allE   = [...dayE, ...nightE]
          const totalU  = sumF(allE, 'productionQty')
          const totalSc = sumF(allE, 'scrap')
          const rate    = totalU + totalSc > 0 ? ((totalSc / (totalU + totalSc)) * 100).toFixed(1) : '0.0'

          const allLines = ['LID_LINE_1','LID_LINE_2','LID_LINE_3','BODY_LINE_1','BODY_LINE_2','BODY_LINE_4']
          const allNames = [...new Set(allE.map(e => e.productName))].sort()

          const getStock = (shift: ShiftEntry[], name: string) => {
            const m = [...shift.filter(e => e.productName === name)]
              .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
            if (!m.length) return null
            return { openStock: m[0].openingStock, closeStock: m[m.length-1].closingStock, openBins: m[0].openingBins, closeBins: m[m.length-1].closingBins }
          }

          const shStyle = { fontSize: 11, fontWeight: 700, py: 0.5, px: 1, textAlign: 'center' as const }
          const thStyle = { fontSize: 11, fontWeight: 700, bgcolor: '#F9FAFB', py: 0.75, px: 1 }
          const tdStyle = { fontSize: 12, py: 0.5, px: 1 }
          const borderSx = { border: '1px solid #E2E8F0' }

          return (
            <>
              <DialogTitle sx={{ fontWeight: 700, fontSize: 17, pb: 1 }}>
                24HR —{' '}
                {new Date(date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                <Box component="span" sx={{ ml: 2, fontSize: 13, fontWeight: 400, color: 'text.secondary' }}>
                  {totalU.toLocaleString()} units · scrap {rate}% ·{' '}
                  <Box component="span" sx={{ color: viewReport.status === 'REVIEWED' ? '#16A34A' : '#D97706' }}>
                    {viewReport.status === 'REVIEWED' ? '✓ Reviewed' : 'Pending Review'}
                  </Box>
                </Box>
              </DialogTitle>

              <DialogContent sx={{ pt: '12px !important' }}>

                {/* ── Sheet Stock Table ── */}
                <Typography fontSize={11} fontWeight={700} color="text.secondary" mb={0.75}>SHEET STOCK</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 3 }}>
                  {/* Day side */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ ...shStyle, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>Day Shift</Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', ...borderSx, borderTop: 'none' }}>
                      {['Design','Op Stock','Cl Stock','Op Bins','Cl Bins'].map(h => (
                        <Box key={h} sx={{ ...thStyle, borderRight: '1px solid #E2E8F0', '&:last-child': { borderRight: 'none' } }}>{h}</Box>
                      ))}
                    </Box>
                    {allNames.map(name => {
                      const s = getStock(dayE, name)
                      return (
                        <Box key={name} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                          <Box sx={{ ...tdStyle, fontWeight: 600, borderRight: '1px solid #E2E8F0' }}>{name}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', borderRight: '1px solid #E2E8F0' }}>{s ? s.openStock : '—'}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', borderRight: '1px solid #E2E8F0', color: s && s.closeStock === 0 ? '#DC2626' : 'text.primary', fontWeight: s && s.closeStock === 0 ? 700 : 400 }}>{s ? s.closeStock : '—'}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', borderRight: '1px solid #E2E8F0' }}>{s ? s.openBins : '—'}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right' }}>{s ? s.closeBins : '—'}</Box>
                        </Box>
                      )
                    })}
                  </Box>

                  <Box sx={{ width: 4 }} />

                  {/* Night side */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ ...shStyle, bgcolor: '#1E293B', color: '#CBD5E1', border: '1px solid #1E293B' }}>Night Shift</Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', ...borderSx, borderTop: 'none' }}>
                      {['Design','Op Stock','Cl Stock','Op Bins','Cl Bins'].map(h => (
                        <Box key={h} sx={{ ...thStyle, borderRight: '1px solid #E2E8F0', '&:last-child': { borderRight: 'none' } }}>{h}</Box>
                      ))}
                    </Box>
                    {allNames.map(name => {
                      const s = getStock(nightE, name)
                      return (
                        <Box key={name} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                          <Box sx={{ ...tdStyle, fontWeight: 600, borderRight: '1px solid #E2E8F0' }}>{name}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', borderRight: '1px solid #E2E8F0' }}>{s ? s.openStock : '—'}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', borderRight: '1px solid #E2E8F0', color: s && s.closeStock === 0 ? '#DC2626' : 'text.primary', fontWeight: s && s.closeStock === 0 ? 700 : 400 }}>{s ? s.closeStock : '—'}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', borderRight: '1px solid #E2E8F0' }}>{s ? s.openBins : '—'}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right' }}>{s ? s.closeBins : '—'}</Box>
                        </Box>
                      )
                    })}
                  </Box>
                </Box>

                {/* ── Production Lines ── */}
                <Typography fontSize={11} fontWeight={700} color="text.secondary" mb={0.75}>PRODUCTION LINES</Typography>

                {/* Column headers */}
                <Box sx={{ display: 'flex', gap: 0.5, mb: 0.25 }}>
                  {[false, true].map(isNight => (
                    <Box key={String(isNight)} sx={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', bgcolor: isNight ? '#1E293B' : '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      {['Description','Sheets Used','Prod Qty','Scrap','Operator'].map(h => (
                        <Box key={h} sx={{ ...thStyle, color: isNight ? '#CBD5E1' : 'text.primary', borderRight: '1px solid #E2E8F0', '&:last-child': { borderRight: 'none' }, textAlign: h !== 'Description' && h !== 'Operator' ? 'right' : 'left' }}>{h}</Box>
                      ))}
                    </Box>
                  ))}
                </Box>

                {allLines.map(line => {
                  const de = dayE.filter(e => e.line === line)
                  const ne = nightE.filter(e => e.line === line)
                  const rowCount = Math.max(de.length, ne.length, 1)
                  const dTotSh = sumF(de,'sheetsUsed'), dTotQty = sumF(de,'productionQty'), dTotSc = sumF(de,'scrap')
                  const nTotSh = sumF(ne,'sheetsUsed'), nTotQty = sumF(ne,'productionQty'), nTotSc = sumF(ne,'scrap')

                  return (
                    <Box key={line} sx={{ mb: 1 }}>
                      {/* Line name */}
                      <Box sx={{ bgcolor: '#F1F5F9', border: '1px solid #E2E8F0', px: 1, py: 0.5 }}>
                        <Typography fontSize={11} fontWeight={700}>{line.replace(/_/g,' ')}</Typography>
                      </Box>

                      {/* Entry rows */}
                      {Array.from({ length: rowCount }).map((_, i) => {
                        const d = de[i], n = ne[i]
                        return (
                          <Box key={i} sx={{ display: 'flex', gap: 0.5 }}>
                            <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                              <Box sx={{ ...tdStyle, borderRight: '1px solid #E2E8F0' }}>{d?.productName ?? ''}</Box>
                              <Box sx={{ ...tdStyle, textAlign: 'right', borderRight: '1px solid #E2E8F0' }}>{d ? d.sheetsUsed.toLocaleString() : ''}</Box>
                              <Box sx={{ ...tdStyle, textAlign: 'right', fontWeight: 700, borderRight: '1px solid #E2E8F0' }}>{d ? d.productionQty.toLocaleString() : ''}</Box>
                              <Box sx={{ ...tdStyle, textAlign: 'right', color: d && d.scrap > 0 ? '#DC2626' : 'text.primary', borderRight: '1px solid #E2E8F0' }}>{d ? d.scrap : ''}</Box>
                              <Box sx={{ ...tdStyle }}>{d?.operatorName ?? ''}</Box>
                            </Box>
                            <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                              <Box sx={{ ...tdStyle, borderRight: '1px solid #E2E8F0' }}>{n?.productName ?? ''}</Box>
                              <Box sx={{ ...tdStyle, textAlign: 'right', borderRight: '1px solid #E2E8F0' }}>{n ? n.sheetsUsed.toLocaleString() : ''}</Box>
                              <Box sx={{ ...tdStyle, textAlign: 'right', fontWeight: 700, borderRight: '1px solid #E2E8F0' }}>{n ? n.productionQty.toLocaleString() : ''}</Box>
                              <Box sx={{ ...tdStyle, textAlign: 'right', color: n && n.scrap > 0 ? '#DC2626' : 'text.primary', borderRight: '1px solid #E2E8F0' }}>{n ? n.scrap : ''}</Box>
                              <Box sx={{ ...tdStyle }}>{n?.operatorName ?? ''}</Box>
                            </Box>
                          </Box>
                        )
                      })}

                      {/* Total row */}
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', bgcolor: '#F9FAFB', border: '1px solid #E2E8F0' }}>
                          <Box sx={{ ...tdStyle, fontWeight: 700, fontSize: 10, color: '#6B7280', borderRight: '1px solid #E2E8F0' }}>TOTAL</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', fontWeight: 700, borderRight: '1px solid #E2E8F0' }}>{de.length > 0 ? dTotSh.toLocaleString() : ''}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', fontWeight: 700, borderRight: '1px solid #E2E8F0' }}>{de.length > 0 ? dTotQty.toLocaleString() : ''}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: dTotSc > 0 ? '#DC2626' : 'text.primary', borderRight: '1px solid #E2E8F0' }}>{de.length > 0 ? dTotSc : ''}</Box>
                          <Box sx={{ ...tdStyle }} />
                        </Box>
                        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', bgcolor: '#F9FAFB', border: '1px solid #E2E8F0' }}>
                          <Box sx={{ ...tdStyle, fontWeight: 700, fontSize: 10, color: '#6B7280', borderRight: '1px solid #E2E8F0' }}>TOTAL</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', fontWeight: 700, borderRight: '1px solid #E2E8F0' }}>{ne.length > 0 ? nTotSh.toLocaleString() : ''}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', fontWeight: 700, borderRight: '1px solid #E2E8F0' }}>{ne.length > 0 ? nTotQty.toLocaleString() : ''}</Box>
                          <Box sx={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: nTotSc > 0 ? '#DC2626' : 'text.primary', borderRight: '1px solid #E2E8F0' }}>{ne.length > 0 ? nTotSc : ''}</Box>
                          <Box sx={{ ...tdStyle }} />
                        </Box>
                      </Box>
                    </Box>
                  )
                })}

                {allE.length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography fontSize={14}>No shift entries recorded for this date</Typography>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Box><Typography variant="caption" color="text.secondary">Submitted by</Typography><Typography fontWeight={600}>{viewReport.submittedBy ?? '—'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Submitted at</Typography><Typography fontWeight={600}>{new Date(viewReport.submittedAt).toLocaleString()}</Typography></Box>
                  {viewReport.notes && <Box><Typography variant="caption" color="text.secondary">Notes</Typography><Typography fontWeight={600}>{viewReport.notes}</Typography></Box>}
                  {viewReport.reviewedBy && <Box><Typography variant="caption" color="text.secondary">Reviewed by</Typography><Typography fontWeight={600} color="#16A34A">{viewReport.reviewedBy}</Typography></Box>}
                </Box>
              </DialogContent>

              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setViewReport(null)}>Close</Button>
                <Button variant="outlined" startIcon={<PictureAsPdfIcon />} sx={{ borderColor: '#EF4444', color: '#EF4444' }}
                  onClick={() => { setPdfReport(viewReport); setViewReport(null) }}>
                  View as PDF
                </Button>
                {viewReport.status === 'SUBMITTED' && (
                  <Button variant="contained" disabled={reviewing} onClick={() => handleReview(viewReport.id)} startIcon={<CheckCircleOutlineIcon />}>
                    {reviewing ? 'Marking…' : 'Mark as Reviewed'}
                  </Button>
                )}
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog
        open={!!pdfReport}
        onClose={() => setPdfReport(null)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { height: '95vh' } }}
      >
        {pdfReport && (() => {
          const date      = pdfReport.reportDate
          const dayE      = entries.filter(e => e.shiftDate === date && e.shift === 'DAY')
          const nightE    = entries.filter(e => e.shiftDate === date && e.shift === 'NIGHT')
          const fileName  = `production-report-${date}.pdf`
          return (
            <>
              <DialogTitle sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                bgcolor: '#1E293B', color: '#fff', py: 1.5,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <PictureAsPdfIcon />
                  <Box>
                    <Typography fontWeight={700} fontSize={16}>Production Report — {date}</Typography>
                    <Typography fontSize={12} sx={{ opacity: 0.85 }}>24-hour summary · landscape A4</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <PDFDownloadLink
                    document={
                      <ProductionReportPDF
                        report={pdfReport}
                        dayEntries={dayE}
                        nightEntries={nightE}
                      />
                    }
                    fileName={fileName}
                    style={{ textDecoration: 'none' }}
                  >
                    {({ loading: pdfLoading }) => (
                      <Button
                        variant="contained"
                        disabled={pdfLoading}
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                        startIcon={<PictureAsPdfIcon />}
                      >
                        {pdfLoading ? 'Preparing…' : 'Download PDF'}
                      </Button>
                    )}
                  </PDFDownloadLink>
                  <Button
                    sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
                    variant="outlined"
                    onClick={() => setPdfReport(null)}
                  >
                    Close
                  </Button>
                </Box>
              </DialogTitle>

              <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Suspense fallback={
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <CircularProgress size={28} sx={{ color: '#EF4444' }} />
                    <Typography color="text.secondary">Loading PDF renderer…</Typography>
                  </Box>
                }>
                  <PDFViewer width="100%" height="100%" style={{ border: 'none', flex: 1 }}>
                    <ProductionReportPDF
                      report={pdfReport}
                      dayEntries={dayE}
                      nightEntries={nightE}
                    />
                  </PDFViewer>
                </Suspense>
              </DialogContent>
            </>
          )
        })()}
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={productDialogOpen} onClose={() => setProductDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Product</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Product Name"
            fullWidth
            required
            autoFocus
            value={productForm.name}
            onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
          />
          <FormControl fullWidth>
            <InputLabel>Product Type</InputLabel>
            <Select
              value={productForm.productType}
              label="Product Type"
              onChange={e => setProductForm(f => ({ ...f, productType: e.target.value as ProductType }))}
            >
              <MenuItem value="LID">LID</MenuItem>
              <MenuItem value="BODY">BODY</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Units per Sheet"
            type="number"
            fullWidth
            required
            value={productForm.unitsPerSheet}
            onChange={e => setProductForm(f => ({ ...f, unitsPerSheet: e.target.value }))}
            helperText={productFormErrors.unitsPerSheet || 'How many units are produced from 1 printed sheet'}
            error={!!productFormErrors.unitsPerSheet}
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setProductDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateProduct}
            disabled={submittingProduct || !productForm.name.trim() || !(Number(productForm.unitsPerSheet) > 0)}
          >
            {submittingProduct ? 'Saving…' : 'Add Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Log PDF Viewer */}
      <Dialog open={!!viewingStockLog} onClose={() => setViewingStockLog(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
        {viewingStockLog && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#1E293B', color: '#fff', py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PictureAsPdfIcon />
                <Box>
                  <Typography fontWeight={700} fontSize={16}>Printing Stock Log — {viewingStockLog.logDate}</Typography>
                  <Typography fontSize={12} sx={{ opacity: 0.85 }}>Logged by {viewingStockLog.loggedBy ?? '—'}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <PDFDownloadLink
                  document={<StockLogPDF logDate={viewingStockLog.logDate} loggedBy={viewingStockLog.loggedBy ?? undefined} items={viewingStockLog.items.map(i => ({ ...i, sheetCount: String(i.sheetCount), batchNumber: i.batchNumber ?? '' }))} />}
                  fileName={`stock-log-${viewingStockLog.logDate}.pdf`}
                  style={{ textDecoration: 'none' }}
                >
                  {({ loading: pdfLoading }) => (
                    <Button size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={pdfLoading} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
                      {pdfLoading ? '…' : 'Download'}
                    </Button>
                  )}
                </PDFDownloadLink>
                <Button size="small" onClick={() => setViewingStockLog(null)} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} variant="outlined">Close</Button>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
              <PDFViewer width="100%" height="100%" style={{ border: 'none', flex: 1 }}>
                <StockLogPDF logDate={viewingStockLog.logDate} loggedBy={viewingStockLog.loggedBy ?? undefined} items={viewingStockLog.items.map(i => ({ ...i, sheetCount: String(i.sheetCount), batchNumber: i.batchNumber ?? '' }))} />
              </PDFViewer>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  )
}
