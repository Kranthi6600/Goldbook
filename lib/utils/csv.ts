/**
 * Converts an array of flat-ish objects into a CSV string.
 * - Headers: union of all keys across rows (first-seen order).
 * - Values are quoted when they contain , " or newlines; " is doubled.
 * - null/undefined → empty cell. Objects/arrays → JSON.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return ""
  }

  const headers: string[] = []
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!headers.includes(key)) {
        headers.push(key)
      }
    }
  }

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ""
    let s: string
    if (typeof v === "object") {
      s = JSON.stringify(v)
    } else {
      s = String(v)
    }
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines = [headers.map(escape).join(",")]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","))
  }
  return lines.join("\r\n")
}
