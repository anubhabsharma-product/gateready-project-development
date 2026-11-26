"use client"

import { useState } from "react"
import type { HistoricalAnalytics } from "@/lib/analytics"
import { formatNumber } from "@/components/gateready/format"

const series = [
  { key: "reportedReach", label: "Reach", description: "reported reach" },
  { key: "registrations", label: "Registrations", description: "unique registrations" },
  { key: "verifiedAttendees", label: "Arrivals", description: "verified arrivals" },
] as const

type Series = (typeof series)[number]

export function AcquisitionChart({ trend }: { trend: HistoricalAnalytics["trend"] }) {
  const [metric, setMetric] = useState<Series>(series[0])
  const [pinnedMonth, setPinnedMonth] = useState<string | null>(null)
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null)
  const [focusedMonth, setFocusedMonth] = useState<string | null>(null)
  const peak = Math.max(1, ...trend.map((point) => point[metric.key]))
  const hasActivity = trend.some((point) => series.some(({ key }) => point[key] > 0))
  const active = trend.find(({ month }) => month === (hoveredMonth ?? focusedMonth ?? pinnedMonth))

  return (
    <article className="gr-card gr-panel gr-trend-panel">
      <div className="gr-panel-heading">
        <h2>Monthly trends</h2>
      </div>
      {hasActivity ? <>
        <div className="gr-trend-series" role="group" aria-label="Acquisition chart metric">
          {series.map((option) => <button type="button" key={option.key} aria-pressed={metric.key === option.key} onClick={() => setMetric(option)}>{option.label}</button>)}
        </div>
        <p className="gr-trend-readout" aria-live="polite" aria-atomic="true">
          {active ? <>{active.month} <strong>{formatNumber(active[metric.key])}</strong> {metric.description}</> : trend.some((point) => point[metric.key] > 0) ? "Select a month to see its exact count." : `No ${metric.description} in this selection.`}
        </p>
        <div className="gr-chart" aria-label={`Monthly ${metric.description}`} role="group">
          {trend.map((point) => (
            <button type="button" className="gr-chart-month" key={point.month} aria-label={`${point.month}: ${formatNumber(point[metric.key])} ${metric.description}`} aria-pressed={pinnedMonth === point.month} data-active={active?.month === point.month} onPointerEnter={(event) => { if (event.pointerType === "mouse") setHoveredMonth(point.month) }} onPointerLeave={() => setHoveredMonth(null)} onFocus={() => setFocusedMonth(point.month)} onBlur={() => setFocusedMonth(null)} onClick={() => setPinnedMonth((month) => month === point.month ? null : point.month)}>
              <span className="gr-chart-bars" aria-hidden="true"><span className="gr-chart-bar" style={{ height: `${point[metric.key] / peak * 100}%` }} /></span>
              <span className="gr-chart-label" aria-hidden="true">{point.month}</span>
            </button>
          ))}
        </div>
      </> : <p className="gr-page-intro">No acquisition activity for this selection.</p>}
      <p className="gr-chart-note">Bars are scaled to the selected metric. Daily reach can count the same person more than once.</p>
    </article>
  )
}
