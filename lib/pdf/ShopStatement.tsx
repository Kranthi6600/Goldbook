import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

/**
 * Shop-wide monthly statement PDF — every loan in the period across all
 * customers (already sorted by due date in SQL). Rendered server-side by the
 * generateShopStatement action. "Rs." instead of ₹ (no glyph in Helvetica).
 */

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 8,
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
  tableHead: {
    flexDirection: "row",
    borderBottom: "1 solid #999",
    paddingBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5 solid #ddd",
    paddingVertical: 2.5,
  },
  totalsRow: {
    flexDirection: "row",
    borderTop: "1 solid #1a1a1a",
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
  },
  colCust: { width: "22%" },
  colLoan: { width: "14%" },
  colGold: { width: "8%", textAlign: "right" },
  colAmt: { width: "11%", textAlign: "right" },
  colInt: { width: "11%", textAlign: "right" },
  colDue: { width: "12%", textAlign: "right" },
  colPaid: { width: "11%", textAlign: "right" },
  colBal: { width: "11%", textAlign: "right" },
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

export type ShopStatementRow = {
  loan_number: string
  customer_name: string
  gold_weight_g: number
  loan_amount: number
  interest_accrued: number
  total_due: number
  total_paid: number
  balance: number
  status: string
}

export function ShopStatement({
  shop,
  periodLabel,
  rows,
  generatedAt,
}: {
  shop: { name: string; phone: string; upi_id: string | null }
  periodLabel: string
  rows: ShopStatementRow[]
  generatedAt: string
}) {
  const totals = rows.reduce(
    (acc, r) => ({
      gold_weight_g: acc.gold_weight_g + r.gold_weight_g,
      loan_amount: acc.loan_amount + r.loan_amount,
      interest_accrued: acc.interest_accrued + r.interest_accrued,
      total_due: acc.total_due + r.total_due,
      total_paid: acc.total_paid + r.total_paid,
      balance: acc.balance + r.balance,
    }),
    {
      gold_weight_g: 0,
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
            <Text style={styles.docTitle}>SHOP STATEMENT</Text>
            <Text style={styles.docTitle}>Period: {periodLabel}</Text>
            <Text style={styles.docTitle}>
              {rows.length} loan{rows.length === 1 ? "" : "s"}
            </Text>
            <Text style={styles.docTitle}>Generated: {generatedAt}</Text>
          </View>
        </View>

        {/* All loans — SQL returns them sorted by due date */}
        {rows.length === 0 ? (
          <Text style={{ color: "#555", marginTop: 8 }}>
            No loans in this period.
          </Text>
        ) : (
          <View>
            <View style={styles.tableHead}>
              <Text style={styles.colCust}>Customer</Text>
              <Text style={styles.colLoan}>Loan</Text>
              <Text style={styles.colGold}>Gold</Text>
              <Text style={styles.colAmt}>Amount</Text>
              <Text style={styles.colInt}>Interest</Text>
              <Text style={styles.colDue}>Total due</Text>
              <Text style={styles.colPaid}>Paid</Text>
              <Text style={styles.colBal}>Balance</Text>
            </View>
            {rows.map((r, i) => (
              <View key={`${r.loan_number}-${i}`} style={styles.tableRow}>
                <Text style={styles.colCust}>
                  {r.customer_name}
                </Text>
                <Text style={styles.colLoan}>{r.loan_number}</Text>
                <Text style={styles.colGold}>{r.gold_weight_g}g</Text>
                <Text style={styles.colAmt}>{money(r.loan_amount)}</Text>
                <Text style={styles.colInt}>{money(r.interest_accrued)}</Text>
                <Text style={styles.colDue}>{money(r.total_due)}</Text>
                <Text style={styles.colPaid}>{money(r.total_paid)}</Text>
                <Text style={styles.colBal}>{money(r.balance)}</Text>
              </View>
            ))}
            <View style={styles.totalsRow}>
              <Text style={styles.colCust}>Total</Text>
              <Text style={styles.colLoan} />
              <Text style={styles.colGold}>
                {Math.round(totals.gold_weight_g * 10) / 10}g
              </Text>
              <Text style={styles.colAmt}>{money(totals.loan_amount)}</Text>
              <Text style={styles.colInt}>{money(totals.interest_accrued)}</Text>
              <Text style={styles.colDue}>{money(totals.total_due)}</Text>
              <Text style={styles.colPaid}>{money(totals.total_paid)}</Text>
              <Text style={styles.colBal}>{money(totals.balance)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          {shop.name} · Shop statement · {periodLabel} · Generated on{" "}
          {generatedAt}. This is a computer-generated statement.
        </Text>
      </Page>
    </Document>
  )
}
