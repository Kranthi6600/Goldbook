import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

/**
 * Customer monthly statement PDF — rendered server-side by the
 * generateCustomerStatement action. Helvetica has no ₹ glyph → "Rs. 1,23,456".
 */

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1.5 solid #1a1a1a",
    paddingBottom: 10,
    marginBottom: 14,
  },
  shopName: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  shopMeta: { fontSize: 8, color: "#555", marginTop: 2 },
  docTitle: { fontSize: 8, color: "#555", textAlign: "right" },
  customerBox: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  customerName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  muted: { fontSize: 8, color: "#555" },
  table: {},
  tableHead: {
    flexDirection: "row",
    borderBottom: "1 solid #999",
    paddingBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5 solid #ddd",
    paddingVertical: 3,
  },
  totalsRow: {
    flexDirection: "row",
    borderTop: "1 solid #1a1a1a",
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
  },
  colLoan: { width: "16%" },
  colGold: { width: "8%", textAlign: "right" },
  colAmt: { width: "12%", textAlign: "right" },
  colInt: { width: "12%", textAlign: "right" },
  colDue: { width: "12%", textAlign: "right" },
  colPaid: { width: "12%", textAlign: "right" },
  colBal: { width: "12%", textAlign: "right" },
  colStatus: { width: "16%", textAlign: "right" },
  colCust: { width: "20%" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#888",
    textAlign: "center",
    borderTop: "0.5 solid #ddd",
    paddingTop: 6,
  },
})

function money(n: number): string {
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`
}

export type CustomerStatementRow = {
  loan_id: string
  loan_number: string
  loan_amount: number
  interest_accrued: number
  total_due: number
  total_paid: number
  balance: number
  status: string
  start_date: string
  due_date: string
}

export function CustomerStatement({
  shop,
  customer,
  periodLabel,
  rows,
  generatedAt,
}: {
  shop: { name: string; phone: string; upi_id: string | null }
  customer: { name: string; phone: string }
  periodLabel: string
  rows: CustomerStatementRow[]
  generatedAt: string
}) {
  const totals = rows.reduce(
    (acc, r) => ({
      loan_amount: acc.loan_amount + r.loan_amount,
      interest_accrued: acc.interest_accrued + r.interest_accrued,
      total_due: acc.total_due + r.total_due,
      total_paid: acc.total_paid + r.total_paid,
      balance: acc.balance + r.balance,
    }),
    {
      loan_amount: 0,
      interest_accrued: 0,
      total_due: 0,
      total_paid: 0,
      balance: 0,
    }
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.shopName}>{shop.name}</Text>
            <Text style={styles.shopMeta}>{shop.phone}</Text>
            {shop.upi_id ? (
              <Text style={styles.shopMeta}>UPI: {shop.upi_id}</Text>
            ) : null}
          </View>
          <View>
            <Text style={styles.docTitle}>CUSTOMER STATEMENT</Text>
            <Text style={styles.docTitle}>Period: {periodLabel}</Text>
            <Text style={styles.docTitle}>Generated: {generatedAt}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.customerBox}>
          <View>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.muted}>{customer.phone}</Text>
          </View>
          <View>
            <Text style={[styles.muted, { textAlign: "right" }]}>
              {rows.length} loan{rows.length === 1 ? "" : "s"} in period
            </Text>
          </View>
        </View>

        {/* Loans table */}
        {rows.length === 0 ? (
          <Text style={{ color: "#555", marginTop: 8 }}>
            No loans in this period.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={styles.colLoan}>Loan</Text>
              <Text style={styles.colAmt}>Amount</Text>
              <Text style={styles.colInt}>Interest</Text>
              <Text style={styles.colDue}>Total due</Text>
              <Text style={styles.colPaid}>Paid</Text>
              <Text style={styles.colBal}>Balance</Text>
              <Text style={styles.colStatus}>Status</Text>
            </View>
            {rows.map((r) => (
              <View key={r.loan_id} style={styles.tableRow}>
                <Text style={styles.colLoan}>
                  {r.loan_number}
                </Text>
                <Text style={styles.colAmt}>{money(r.loan_amount)}</Text>
                <Text style={styles.colInt}>{money(r.interest_accrued)}</Text>
                <Text style={styles.colDue}>{money(r.total_due)}</Text>
                <Text style={styles.colPaid}>{money(r.total_paid)}</Text>
                <Text style={styles.colBal}>{money(r.balance)}</Text>
                <Text style={styles.colStatus}>{r.status}</Text>
              </View>
            ))}
            <View style={styles.totalsRow}>
              <Text style={styles.colLoan}>Total</Text>
              <Text style={styles.colAmt}>{money(totals.loan_amount)}</Text>
              <Text style={styles.colInt}>{money(totals.interest_accrued)}</Text>
              <Text style={styles.colDue}>{money(totals.total_due)}</Text>
              <Text style={styles.colPaid}>{money(totals.total_paid)}</Text>
              <Text style={styles.colBal}>{money(totals.balance)}</Text>
              <Text style={styles.colStatus} />
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          {shop.name} · Statement for {customer.name} · {periodLabel} ·
          Generated on {generatedAt}. This is a computer-generated statement.
        </Text>
      </Page>
    </Document>
  )
}
