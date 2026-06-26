export type Role =
  | 'COMPANY_ADMIN'
  | 'PRINTING_MANAGER'
  | 'PRODUCTION_MANAGER'
  | 'DISPATCHER'
  | 'OFFICE_MANAGER'
  | 'SUPER_ADMIN'
  | 'SUPERVISOR'
  | 'OPERATOR'

export interface AuthUser {
  id: number
  token: string
  name: string
  email: string
  role: Role
  companyId: number
  companyName: string
}

export type ProductType = 'LID' | 'BODY'

export type WorkOrderStatus =
  | 'PENDING_PRINT'
  | 'IN_PRINTING'
  | 'IN_PRODUCTION'
  | 'READY_TO_DISPATCH'
  | 'DISPATCHED'
  | 'CLOSED'
  | 'DECLINED'

export interface WorkOrder {
  id: number
  customerOrderId: number | null
  productName: string
  productType: ProductType
  plannedQuantity: number
  sheetsAllocated: number | null
  extraSheets: number
  batchNumber: string | null
  printingScrap: number
  productionScrap: number
  status: WorkOrderStatus
  createdBy: string
  createdAt: string
  closedAt: string | null
  notes: string | null
  plannedBins: number
}

export type CustomerOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE'

export interface CustomerOrder {
  id: number
  customerName: string
  orderReference: string | null
  status: CustomerOrderStatus
  createdBy: string
  createdAt: string
  notes: string | null
  items: WorkOrder[]
}

export type PrintingStatus =
  | 'WIP'
  | 'READY_TO_WAX'
  | 'READY_TO_VARNISH'
  | 'DELBERG_PLATE'
  | 'READY_TO_DISPATCH'

export type ProductionLine =
  | 'LID_LINE_1'
  | 'LID_LINE_2'
  | 'LID_LINE_3'
  | 'BODY_LINE_1'
  | 'BODY_LINE_2'
  | 'BODY_LINE_4'

export interface PrintingBatch {
  id: number
  workOrderId: number
  productName: string
  productType: string
  line: ProductionLine
  sheetsUsed: number
  operatorName: string
  status: PrintingStatus
  notes: string | null
  loggedBy: string | null
  loggedAt: string
}

export type ShiftName = 'DAY' | 'NIGHT'

export interface ShiftEntry {
  id: number
  workOrderId: number | null
  productName: string
  productType: ProductType
  line: ProductionLine
  shift: ShiftName
  shiftDate: string
  openingStock: number
  sheetsReceived: number | null
  sheetsUsed: number
  productionQty: number
  scrap: number
  closingStock: number
  openingBins: number
  closingBins: number
  batchNumber: string | null
  operatorName: string
  loggedBy: string | null
  loggedAt: string
}

export interface DispatchEntry {
  id: number
  workOrderId: number | null
  productName: string | null
  productType: string | null
  binsExpected: number
  binsDispatched: number
  destination: string | null
  notes: string | null
  batchNumber: string | null
  dispatchedBy: string | null
  dispatchedAt: string
}

export type PrintingStockCategory = 'READY_TO_DISPATCH' | 'DELBERG_PLATE' | 'READY_TO_WAX' | 'READY_TO_VARNISH' | 'WIP'

export interface PrintingStockItem {
  id: number
  productName: string
  productType: ProductType
  batchNumber: string | null
  category: PrintingStockCategory
  sheetCount: number
}

export interface PrintingShiftLog {
  id: number
  logDate: string
  shift: ShiftName
  items: PrintingStockItem[]
  loggedBy: string | null
  loggedAt: string
}

export interface PrintingDispatch {
  id: number
  workOrderId: number | null
  productName: string
  productType: ProductType
  sheetsDispatched: number
  dispatchDate: string
  shift: ShiftName | null
  notes: string | null
  dispatchedBy: string | null
  dispatchedAt: string
  confirmed: boolean
  receivedShift: ShiftName | null
  confirmedAt: string | null
  batchNumber: string | null
}

export interface DashboardSummary {
  totalProductionToday: number
  totalDowntimeMinutesToday: number
  activeOrders: number
  rejectionRate: number
}

export interface Message {
  id: number
  senderId: number
  senderName: string
  recipientId: number | null
  recipientName: string | null
  content: string
  createdAt: string
  read: boolean
  broadcast: boolean
}

export interface SheetReceipt {
  id: number
  workOrderId: number | null
  productName: string
  productType: string
  shift: ShiftName | null
  sheetsReceived: number
  batchNumber: string | null
  notes: string | null
  receivedBy: string | null
  receivedAt: string
}

export interface ProductionReport {
  id: number
  reportDate: string
  status: 'SUBMITTED' | 'REVIEWED'
  notes: string | null
  submittedBy: string | null
  submittedAt: string
  reviewedBy: string | null
  reviewedAt: string | null
}

export interface Product {
  id: number
  name: string
  productType: ProductType
  unitsPerSheet: number
  createdBy: string | null
  createdAt: string
}

export interface UnreadCount { count: number }

export interface AuditLog {
  id: number
  companyId: number
  userId: number | null
  userName: string | null
  userRole: string | null
  action: string
  entityType: string | null
  entityId: number | null
  description: string | null
  timestamp: string
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
}
