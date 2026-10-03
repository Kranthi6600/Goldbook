import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

/**
 * Loan statement PDF rendered by @react-pdf/renderer inside the
 * sendStatement server action (Node only — never imported by client code).
 *
 * NOTE: the bundled Helvetica font has no ₹ glyph, so money renders as
 * "Rs. 1,23,456" via en-IN grouping instead of formatINR.
 */

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
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
  shopMeta: { fontSize: 9, color: "#555", marginTop: 2 },
  docTitle: { fontSize: 9, color: "#555", textAlign: "right" },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
    textTransform: "uppercase",
    color: "#444",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
  },
  rowLabel: { color: "#555" },
  rowValue: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 4 },
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
  cellDate: { width: "34%" },
  cellMethod: { width: "33%" },
  cellAmount: { width: "33%", textAlign: "right" },
  balanceBox: {
    marginTop: 6,
    padding: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: { fontSize: 10, color: "#555" },
  balanceValue: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
    borderTop: "0.5 solid #ddd",
    paddingTop: 6,
  },
})

function money(n: number): string {
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

export type LoanStatementProps = {
  shop: { name: string; phone: string; upi_id: string | null }
  customer: { name: string; phone: string }
  loan: {
    loan_number: string
    gold_weight_g: number
    gold_purity: string | null
    gold_description: string | null
    loan_amount: number
    rate_monthly: number
    interest_mode: string
    start_date: string
    due_date: string
    status: string
  }
  summary: {
    interest_accrued: number
    total_due: number
    total_paid: number
    balance: number
    days_elapsed: number
  }
  payments: { amount: number; method: string; paid_at: string }[]
  generatedAt: string
}

export function LoanStatement({
  shop,
  customer,
  loan,
  summary,
  payments,
  generatedAt,
}: LoanStatementProps) {
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
            <Text style={styles.docTitle}>LOAN STATEMENT</Text>
            <Text style={styles.docTitle}>Loan: {loan.loan_number}</Text>
            <Text style={styles.docTitle}>Generated: {generatedAt}</Text>
          </View>
        </View>

        {/* Loan details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loan details</Text>
          <Row label="Customer" value={`${customer.name} (${customer.phone})`} />
          <Row
            label="Gold"
            value={`${loan.gold_weight_g}g ${loan.gold_purity ?? ""}${
              loan.gold_description ? ` — ${loan.gold_description}` : ""
            }`}
          />
          <Row label="Loan amount" value={money(loan.loan_amount)} />
          <Row
            label="Interest rate"
            value={`${loan.rate_monthly}%/month (${loan.interest_mode})`}
          />
          <Row label="Start date" value={loan.start_date} />
          <Row label="Due date" value={loan.due_date} />
          <Row label="Status" value={loan.status} />
        </View>

        {/* Interest breakdown — all figures from SQL loan_summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Interest breakdown (as of today)
          </Text>
          <Row label="Principal" value={money(loan.loan_amount)} />
          <Row
            label={`Interest accrued (${summary.days_elapsed} days)`}
            value={money(summary.interest_accrued)}
          />
          <Row label="Total due" value={money(summary.total_due)} />
          <Row label="Total paid" value={money(summary.total_paid)} />
        </View>

        {/* Payments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment history</Text>
          {payments.length === 0 ? (
            <Text style={{ color: "#555" }}>No payments recorded.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={styles.cellDate}>Date</Text>
                <Text style={styles.cellMethod}>Method</Text>
                <Text style={styles.cellAmount}>Amount</Text>
              </View>
              {payments.map((p, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.cellDate}>{p.paid_at}</Text>
                  <Text style={styles.cellMethod}>{p.method}</Text>
                  <Text style={styles.cellAmount}>{money(p.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Balance */}
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Outstanding balance</Text>
          <Text style={styles.balanceValue}>{money(summary.balance)}</Text>
        </View>

        <Text style={styles.footer}>
          Generated on {generatedAt}. This is a computer-generated statement and
          does not require a signature.
        </Text>
      </Page>
    </Document>
  )
}
