const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** Format integer cents as "$1,234.56" */
export function fmtUSD(cents: number): string {
  return usd.format(cents / 100)
}

/** Format integer cents as a plain decimal "1234.56" (for CSV cells) */
export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-07-03" -> "Jul 3, 2026" (parsed manually to avoid timezone drift) */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

/** "2026-06-16".."2026-06-30" -> "Jun 16 – Jun 30, 2026" */
export function fmtRange(startIso: string, endIso: string): string {
  const [sy, sm, sd] = startIso.split('-').map(Number)
  const [ey, em, ed] = endIso.split('-').map(Number)
  if (sy === ey && sm === em) return `${MONTHS[sm - 1]} ${sd} – ${ed}, ${sy}`
  if (sy === ey) return `${MONTHS[sm - 1]} ${sd} – ${MONTHS[em - 1]} ${ed}, ${sy}`
  return `${MONTHS[sm - 1]} ${sd}, ${sy} – ${MONTHS[em - 1]} ${ed}, ${ey}`
}

export function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
}

/** Trigger a client-side file download. */
export function downloadFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Build a CSV string from a header row + data rows, quoting as needed. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n') + '\n'
}
