import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ProductionReport, ShiftEntry } from '../types'

const LINES = ['LID_LINE_1', 'LID_LINE_2', 'LID_LINE_3', 'BODY_LINE_1', 'BODY_LINE_2', 'BODY_LINE_4']
const fmtLine = (l: string) => l.replace(/_/g, ' ')

const c = {
  black:    '#000000',
  dark:     '#111827',
  mid:      '#374151',
  muted:    '#6B7280',
  light:    '#F3F4F6',
  border:   '#D1D5DB',
  dayBg:    '#FEF9C3',
  nightBg:  '#1E1B4B',
  nightTxt: '#E0E7FF',
  red:      '#DC2626',
  white:    '#FFFFFF',
}

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    padding: 20,
    paddingBottom: 16,
    backgroundColor: c.white,
    color: c.dark,
  },

  // ── Header ──
  pageTitle:   { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 2 },
  dateRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dateLabel:   { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  dateValue:   { fontSize: 8 },

  // ── Section label ──
  sectionLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingVertical: 2, marginBottom: 1 },

  // ── Generic table primitives ──
  row:    { flexDirection: 'row' },
  cell:   { paddingHorizontal: 2, paddingVertical: 2 },
  bold:   { fontFamily: 'Helvetica-Bold' },
  right:  { textAlign: 'right' },
  center: { textAlign: 'center' },
  border: { borderWidth: 0.5, borderColor: c.border },

  // ── Sheet Stock table ──
  stockHeader: {
    flexDirection: 'row',
    backgroundColor: c.light,
    borderTopWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: c.border,
  },
  stockRow: {
    flexDirection: 'row',
    borderLeftWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: c.border,
    minHeight: 14,
  },
  stockDivider: { width: 1, backgroundColor: c.border },

  // ── Production lines table ──
  lineHeader: {
    flexDirection: 'row',
    backgroundColor: c.light,
    borderWidth: 0.5, borderColor: c.border,
    marginTop: 4,
  },
  lineHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', paddingHorizontal: 4, paddingVertical: 2 },
  prodHeader: {
    flexDirection: 'row',
    borderLeftWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: c.border,
  },
  prodRow: {
    flexDirection: 'row',
    borderLeftWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: c.border,
    minHeight: 13,
  },
  prodTotal: {
    flexDirection: 'row',
    borderWidth: 0.5, borderColor: c.border,
    backgroundColor: c.light,
    minHeight: 13,
  },
  totalLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: c.mid, paddingHorizontal: 2, paddingVertical: 2 },
  midBorder: { width: 2, backgroundColor: c.border },

  // ── Footer ──
  footer: { marginTop: 8, flexDirection: 'row', gap: 20 },
  footerLabel: { fontSize: 6.5, color: c.muted, marginBottom: 1 },
  footerValue: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
})

function sumF(arr: ShiftEntry[], f: keyof ShiftEntry) {
  return arr.reduce((s, e) => s + (Number(e[f]) || 0), 0)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtDT(s: string) {
  return new Date(s).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Stock table (top section) ──────────────────────────────────────────────
function StockSection({ dayEntries, nightEntries }: { dayEntries: ShiftEntry[]; nightEntries: ShiftEntry[] }) {
  // Unique product names across both shifts
  const allNames = [...new Set([...dayEntries, ...nightEntries].map(e => e.productName))].sort()

  const getStock = (entries: ShiftEntry[], name: string) => {
    const matching = entries.filter(e => e.productName === name)
      .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    if (matching.length === 0) return null
    const first = matching[0]
    const last  = matching[matching.length - 1]
    return {
      openStock:  first.openingStock,
      closeStock: last.closingStock,
      openBins:   first.openingBins,
      closeBins:  last.closingBins,
    }
  }

  // column widths (each side)
  const cDesign = 80, cStock = 34, cBins = 28
  const halfW = cDesign + cStock * 2 + cBins * 2

  const hCell = (label: string, w: number, extra?: object) => (
    <Text key={label} style={[S.cell, S.bold, S.center, { width: w, fontSize: 6.5 }, extra ?? {}]}>{label}</Text>
  )

  const dCell = (val: string | number, w: number, extra?: object) => (
    <Text style={[S.cell, S.right, { width: w, fontSize: 7 }, extra ?? {}]}>{val}</Text>
  )

  return (
    <View>
      {/* shift labels */}
      <View style={S.row}>
        <View style={{ width: halfW, backgroundColor: c.dayBg, borderWidth: 0.5, borderColor: c.border }}>
          <Text style={[S.sectionLabel, { color: '#78350F' }]}>DAY SHIFT</Text>
        </View>
        <View style={{ width: 2 }} />
        <View style={{ width: halfW, backgroundColor: c.nightBg, borderWidth: 0.5, borderColor: c.border }}>
          <Text style={[S.sectionLabel, { color: c.nightTxt }]}>NIGHT SHIFT</Text>
        </View>
      </View>

      {/* column headers */}
      <View style={[S.row, { borderBottomWidth: 0.5, borderColor: c.border }]}>
        {/* day side */}
        <View style={[S.row, S.stockHeader, { width: halfW }]}>
          {hCell('Design',        cDesign)}
          {hCell('Op Stock',      cStock)}
          {hCell('Cl Stock',      cStock)}
          {hCell('Op Bins',       cBins)}
          {hCell('Cl Bins',       cBins)}
        </View>
        <View style={{ width: 2, backgroundColor: c.border }} />
        {/* night side */}
        <View style={[S.row, S.stockHeader, { width: halfW }]}>
          {hCell('Design',        cDesign)}
          {hCell('Op Stock',      cStock)}
          {hCell('Cl Stock',      cStock)}
          {hCell('Op Bins',       cBins)}
          {hCell('Cl Bins',       cBins)}
        </View>
      </View>

      {/* data rows */}
      {allNames.map(name => {
        const day   = getStock(dayEntries,   name)
        const night = getStock(nightEntries, name)
        return (
          <View key={name} style={S.row}>
            {/* day side */}
            <View style={[S.stockRow, { width: halfW }]}>
              <Text style={[S.cell, { width: cDesign, fontSize: 7, fontFamily: 'Helvetica-Bold' }]}>{name}</Text>
              {dCell(day ? day.openStock  : '', cStock)}
              {dCell(day ? day.closeStock : '', cStock, day && day.closeStock === 0 ? { color: c.red, fontFamily: 'Helvetica-Bold' } : {})}
              {dCell(day ? day.openBins   : '', cBins)}
              {dCell(day ? day.closeBins  : '', cBins)}
            </View>
            <View style={{ width: 2, backgroundColor: c.border }} />
            {/* night side */}
            <View style={[S.stockRow, { width: halfW }]}>
              <Text style={[S.cell, { width: cDesign, fontSize: 7, fontFamily: 'Helvetica-Bold' }]}>{name}</Text>
              {dCell(night ? night.openStock  : '', cStock)}
              {dCell(night ? night.closeStock : '', cStock, night && night.closeStock === 0 ? { color: c.red, fontFamily: 'Helvetica-Bold' } : {})}
              {dCell(night ? night.openBins   : '', cBins)}
              {dCell(night ? night.closeBins  : '', cBins)}
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ── Production lines section ───────────────────────────────────────────────
function ProdSection({ dayEntries, nightEntries }: { dayEntries: ShiftEntry[]; nightEntries: ShiftEntry[] }) {
  // column widths per side
  const cDesc = 82, cSheets = 38, cQty = 44, cScrap = 36, cOp = 56
  const halfW = cDesc + cSheets + cQty + cScrap + cOp

  const ph = (label: string, w: number, extra?: object) => (
    <Text key={label} style={[S.cell, S.bold, { width: w, fontSize: 6.5 }, extra ?? {}]}>{label}</Text>
  )
  const pd = (val: string | number, w: number, extra?: object) => (
    <Text style={[S.cell, { width: w, fontSize: 7 }, extra ?? {}]}>{String(val)}</Text>
  )

  return (
    <View>
      {/* shift labels */}
      <View style={[S.row, { marginTop: 8 }]}>
        <View style={{ width: halfW, backgroundColor: c.dayBg, borderWidth: 0.5, borderColor: c.border }}>
          <Text style={[S.sectionLabel, { color: '#78350F' }]}>DAY SHIFT</Text>
        </View>
        <View style={{ width: 4 }} />
        <View style={{ width: halfW, backgroundColor: c.nightBg, borderWidth: 0.5, borderColor: c.border }}>
          <Text style={[S.sectionLabel, { color: c.nightTxt }]}>NIGHT SHIFT</Text>
        </View>
      </View>

      {/* column headers */}
      <View style={S.row}>
        <View style={[S.prodHeader, { width: halfW }]}>
          {ph('Description', cDesc)}
          {ph('Sheets Used',  cSheets, S.right)}
          {ph('Prod Qty',     cQty,    S.right)}
          {ph('Scrap',        cScrap,  S.right)}
          {ph('Operator',     cOp)}
        </View>
        <View style={{ width: 4 }} />
        <View style={[S.prodHeader, { width: halfW }]}>
          {ph('Description', cDesc)}
          {ph('Sheets Used',  cSheets, S.right)}
          {ph('Prod Qty',     cQty,    S.right)}
          {ph('Scrap',        cScrap,  S.right)}
          {ph('Operator',     cOp)}
        </View>
      </View>

      {LINES.map(line => {
        const de = dayEntries.filter(e => e.line === line)
        const ne = nightEntries.filter(e => e.line === line)
        const rows = Math.max(de.length, ne.length, 1)

        const dTotSheets = sumF(de, 'sheetsUsed')
        const dTotQty    = sumF(de, 'productionQty')
        const dTotScrap  = sumF(de, 'scrap')
        const nTotSheets = sumF(ne, 'sheetsUsed')
        const nTotQty    = sumF(ne, 'productionQty')
        const nTotScrap  = sumF(ne, 'scrap')

        return (
          <View key={line}>
            {/* Line name header */}
            <View style={S.row}>
              <View style={[S.lineHeader, { width: halfW * 2 + 4 }]}>
                <Text style={S.lineHeaderText}>{fmtLine(line)}</Text>
              </View>
            </View>

            {/* Entry rows */}
            {Array.from({ length: rows }).map((_, i) => {
              const d = de[i]
              const n = ne[i]
              return (
                <View key={i} style={S.row}>
                  <View style={[S.prodRow, { width: halfW }]}>
                    {pd(d?.productName ?? '', cDesc)}
                    {pd(d ? d.sheetsUsed.toLocaleString() : '', cSheets, S.right)}
                    {pd(d ? d.productionQty.toLocaleString() : '', cQty, { ...S.right, fontFamily: 'Helvetica-Bold' })}
                    {pd(d ? d.scrap : '', cScrap, { ...S.right, color: d && d.scrap > 0 ? c.red : c.dark })}
                    {pd(d?.operatorName ?? '', cOp)}
                  </View>
                  <View style={{ width: 4 }} />
                  <View style={[S.prodRow, { width: halfW }]}>
                    {pd(n?.productName ?? '', cDesc)}
                    {pd(n ? n.sheetsUsed.toLocaleString() : '', cSheets, S.right)}
                    {pd(n ? n.productionQty.toLocaleString() : '', cQty, { ...S.right, fontFamily: 'Helvetica-Bold' })}
                    {pd(n ? n.scrap : '', cScrap, { ...S.right, color: n && n.scrap > 0 ? c.red : c.dark })}
                    {pd(n?.operatorName ?? '', cOp)}
                  </View>
                </View>
              )
            })}

            {/* Total row */}
            <View style={S.row}>
              <View style={[S.prodTotal, { width: halfW }]}>
                <Text style={[S.totalLabel, { width: cDesc }]}>TOTAL</Text>
                {pd(de.length > 0 ? dTotSheets.toLocaleString() : '', cSheets, { ...S.right, fontFamily: 'Helvetica-Bold', paddingVertical: 2 })}
                {pd(de.length > 0 ? dTotQty.toLocaleString()    : '', cQty,    { ...S.right, fontFamily: 'Helvetica-Bold', paddingVertical: 2 })}
                {pd(de.length > 0 ? dTotScrap.toLocaleString()  : '', cScrap,  { ...S.right, fontFamily: 'Helvetica-Bold', paddingVertical: 2, color: dTotScrap > 0 ? c.red : c.dark })}
                {pd('', cOp)}
              </View>
              <View style={{ width: 4 }} />
              <View style={[S.prodTotal, { width: halfW }]}>
                <Text style={[S.totalLabel, { width: cDesc }]}>TOTAL</Text>
                {pd(ne.length > 0 ? nTotSheets.toLocaleString() : '', cSheets, { ...S.right, fontFamily: 'Helvetica-Bold', paddingVertical: 2 })}
                {pd(ne.length > 0 ? nTotQty.toLocaleString()    : '', cQty,    { ...S.right, fontFamily: 'Helvetica-Bold', paddingVertical: 2 })}
                {pd(ne.length > 0 ? nTotScrap.toLocaleString()  : '', cScrap,  { ...S.right, fontFamily: 'Helvetica-Bold', paddingVertical: 2, color: nTotScrap > 0 ? c.red : c.dark })}
                {pd('', cOp)}
              </View>
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
interface Props {
  report: ProductionReport
  dayEntries: ShiftEntry[]
  nightEntries: ShiftEntry[]
  companyName?: string
}

export default function ProductionReportPDF({ report, dayEntries, nightEntries, companyName }: Props) {
  const allEntries  = [...dayEntries, ...nightEntries]
  const totalUnits  = sumF(allEntries, 'productionQty')
  const totalScrap  = sumF(allEntries, 'scrap')
  const scrapRate   = totalUnits + totalScrap > 0
    ? ((totalScrap / (totalUnits + totalScrap)) * 100).toFixed(1) : '0.0'

  return (
    <Document title={`24HR Production Report — ${report.reportDate}`} author={companyName ?? 'Forge2IQ'}>
      <Page size="A4" orientation="landscape" style={S.page}>

        {/* Title */}
        <Text style={S.pageTitle}>24HR</Text>

        {/* Date + company + summary */}
        <View style={S.dateRow}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={S.dateLabel}>Date: <Text style={S.dateValue}>{fmtDate(report.reportDate)}</Text></Text>
            {companyName && <Text style={S.dateLabel}>{companyName}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={S.dateLabel}>Total Units: <Text style={S.dateValue}>{totalUnits.toLocaleString()}</Text></Text>
            <Text style={S.dateLabel}>Scrap Rate: <Text style={[S.dateValue, { color: Number(scrapRate) > 5 ? c.red : c.dark }]}>{scrapRate}%</Text></Text>
            <Text style={[S.dateLabel, { color: report.status === 'REVIEWED' ? '#15803D' : '#6B7280' }]}>
              {report.status === 'REVIEWED' ? '✓ Reviewed' : 'Pending Review'}
            </Text>
          </View>
        </View>

        {/* Sheet stock table */}
        <StockSection dayEntries={dayEntries} nightEntries={nightEntries} />

        {/* Production lines table */}
        <ProdSection dayEntries={dayEntries} nightEntries={nightEntries} />

        {/* Footer */}
        <View style={[S.footer, { marginTop: 10, borderTopWidth: 0.5, borderTopColor: c.border, paddingTop: 6 }]}>
          <View>
            <Text style={S.footerLabel}>SUBMITTED BY</Text>
            <Text style={S.footerValue}>{report.submittedBy ?? '—'}</Text>
          </View>
          <View>
            <Text style={S.footerLabel}>SUBMITTED AT</Text>
            <Text style={S.footerValue}>{fmtDT(report.submittedAt)}</Text>
          </View>
          {report.reviewedBy && (
            <View>
              <Text style={S.footerLabel}>REVIEWED BY</Text>
              <Text style={[S.footerValue, { color: '#15803D' }]}>{report.reviewedBy}</Text>
            </View>
          )}
          {report.notes && (
            <View style={{ flex: 1 }}>
              <Text style={S.footerLabel}>NOTES</Text>
              <Text style={S.footerValue}>{report.notes}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Text style={[S.footerLabel, { textAlign: 'right' }]}>Generated by Forge2IQ · {new Date().toLocaleDateString()}</Text>
        </View>

      </Page>
    </Document>
  )
}
