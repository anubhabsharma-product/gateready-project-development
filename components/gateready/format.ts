export const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })
export const compactFormat = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 })
export const inrFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
export const inrShortFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 })
export const percentFormat = new Intl.NumberFormat("en-IN", { style: "percent", maximumFractionDigits: 1 })

export const formatNumber = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : numberFormat.format(value)
export const formatCompact = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : compactFormat.format(value)
export const formatINR = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : inrFormat.format(value)
export const formatINRCompact = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : inrShortFormat.format(value)
export const formatPercent = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : percentFormat.format(value)
export const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", ...options }).format(date)
}
