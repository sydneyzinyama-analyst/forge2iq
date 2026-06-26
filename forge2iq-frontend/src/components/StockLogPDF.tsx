import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { PrintingStockCategory, ProductType } from '../types'

interface StockLogItem {
  productName: string
  productType: ProductType
  batchNumber: string
  category: PrintingStockCategory
  sheetCount: string
}

interface Props {
  logDate: string
  loggedBy?: string
  items: StockLogItem[]
}

const CATEGORY_LABELS: Record<PrintingStockCategory, string> = {
  READY_TO_DISPATCH: 'Ready to Dispatch',
  DELBERG_PLATE:     'Delberg Plate',
  READY_TO_WAX:      'Ready to Wax',
  READY_TO_VARNISH:  'Ready to Varnish',
  WIP:               'WIP',
}

const c = {
  dark:   '#111827',
  mid:    '#374151',
  muted:  '#6B7280',
  light:  '#F3F4F6',
  border: '#D1D5DB',
  blue:   '#1D4ED8',
  white:  '#FFFFFF',
}

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 32,
    backgroundColor: c.white,
    color: c.dark,
  },
  header: {
    borderBottomWidth: 1.5,
    borderColor: c.blue,
    marginBottom: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: c.blue,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    gap: 24,
  },
  metaItem: {
    flexDirection: 'row',
    gap: 4,
  },
  metaLabel: { fontSize: 8, color: c.muted, fontFamily: 'Helvetica-Bold' },
  metaValue: { fontSize: 8, color: c.mid },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: c.light,
    borderWidth: 0.5,
    borderColor: c.border,
    marginTop: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: c.border,
    minHeight: 20,
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  th: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    padding: 5,
    color: c.mid,
  },
  td: {
    fontSize: 9,
    padding: 5,
    color: c.dark,
  },
  colProduct:  { flex: 3 },
  colType:     { flex: 1.2 },
  colBatch:    { flex: 1.5 },
  colCategory: { flex: 2.5 },
  colSheets:   { flex: 1.2, textAlign: 'right' },
  divider: {
    width: 0.5,
    backgroundColor: c.border,
    alignSelf: 'stretch',
  },
  totalRow: {
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: c.border,
    backgroundColor: c.light,
    marginTop: 2,
  },
  totalLabel: {
    flex: 8.2,
    padding: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textAlign: 'right',
    color: c.mid,
  },
  totalValue: {
    flex: 1.2,
    padding: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textAlign: 'right',
    color: c.blue,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderColor: c.border,
    paddingTop: 4,
  },
  footerText: { fontSize: 7, color: c.muted },
})

export default function StockLogPDF({ logDate, loggedBy, items }: Props) {
  const totalSheets = items.reduce((s, r) => s + Number(r.sheetCount), 0)

  return (
    <Document title={`Stock Log — ${logDate}`} author="Forge2IQ">
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.title}>Printing Stock Log</Text>
          <View style={S.meta}>
            <View style={S.metaItem}>
              <Text style={S.metaLabel}>DATE:</Text>
              <Text style={S.metaValue}>{logDate}</Text>
            </View>
            {loggedBy && (
              <View style={S.metaItem}>
                <Text style={S.metaLabel}>LOGGED BY:</Text>
                <Text style={S.metaValue}>{loggedBy}</Text>
              </View>
            )}
            <View style={S.metaItem}>
              <Text style={S.metaLabel}>ITEMS:</Text>
              <Text style={S.metaValue}>{items.length}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={S.tableHeader}>
          <Text style={[S.th, S.colProduct]}>Product</Text>
          <View style={S.divider} />
          <Text style={[S.th, S.colType]}>Type</Text>
          <View style={S.divider} />
          <Text style={[S.th, S.colBatch]}>Batch #</Text>
          <View style={S.divider} />
          <Text style={[S.th, S.colCategory]}>Stage / Category</Text>
          <View style={S.divider} />
          <Text style={[S.th, S.colSheets]}>Sheets</Text>
        </View>

        {items.map((item, i) => (
          <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
            <Text style={[S.td, S.colProduct]}>{item.productName}</Text>
            <View style={S.divider} />
            <Text style={[S.td, S.colType]}>{item.productType}</Text>
            <View style={S.divider} />
            <Text style={[S.td, S.colBatch]}>{item.batchNumber || '—'}</Text>
            <View style={S.divider} />
            <Text style={[S.td, S.colCategory]}>{CATEGORY_LABELS[item.category] ?? item.category}</Text>
            <View style={S.divider} />
            <Text style={[S.td, S.colSheets]}>{Number(item.sheetCount).toLocaleString()}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={S.totalRow}>
          <Text style={S.totalLabel}>TOTAL SHEETS</Text>
          <Text style={S.totalValue}>{totalSheets.toLocaleString()}</Text>
        </View>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Forge2IQ — Printing Stock Log</Text>
          <Text style={S.footerText}>{logDate}</Text>
        </View>
      </Page>
    </Document>
  )
}
