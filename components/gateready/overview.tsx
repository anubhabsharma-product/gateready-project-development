"use client"

import { ArrowDownRight, ArrowUpRight, ArrowUpRightFromSquare, ArrowRight, BadgeCheck, Banknote, CircleHelp, ClipboardCheck, UsersRound } from "lucide-react"
import { AcquisitionChart } from "@/components/gateready/acquisition-chart"
import type { HistoricalAnalytics } from "@/lib/analytics"
import type { WorkspaceState } from "@/lib/types"
import { getOperatingForecast } from "@/lib/demo-state"
import type { ViewKey } from "@/components/gateready/sidebar"
import { formatCompact, formatDate, formatINRCompact, formatNumber, formatPercent } from "@/components/gateready/format"

function KpiCard({ label, value, caption, icon: Icon, accent, progress }: { label: string; value: string; caption: string; icon: typeof UsersRound; accent: string; progress?: number | null }) {
  return (
    <article className="gr-card gr-kpi-card">
      <div className="gr-kpi-top"><span>{label}</span><span className={`gr-kpi-icon ${accent}`}><Icon size={17} aria-hidden="true" /></span></div>
      <strong className="gr-kpi-value">{value}</strong>
      {progress != null ? <div className="gr-progress-track" role="progressbar" aria-label={`${label} against goal`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(progress * 100))}><span style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} /></div> : null}
      <div className="gr-kpi-caption">{caption}</div>
    </article>
  )
}

export function OverviewPanel({ history, campaignFilter, state, onNavigate, onAskAnalyst }: { history: HistoricalAnalytics; campaignFilter: string; state: WorkspaceState; onNavigate: (view: ViewKey) => void; onAskAnalyst: () => void }) {
  const metrics = history.totals
  const scope = campaignFilter === "unattributed" ? "Unattributed visits" : history.campaigns.find((campaign) => campaign.campaignId === campaignFilter)?.name ?? "All campaigns"
  const forecast = getOperatingForecast(state, "base")
  const spend = metrics.spendInr ?? 0
  const spendLeft = Math.max(0, state.budgetLimitInr - spend)
  const attendeeGoal = campaignFilter ? 0 : history.target?.attendees ?? 0
  const attendeeProgress = attendeeGoal ? (metrics.attendees ?? 0) / attendeeGoal : null
  const capacity = state.capacity.uniqueAdmissionLimit
  const capacityFill = Math.min(100, Math.max(0, forecast.capped / Math.max(1, capacity) * 100))
  const strongestEfficiency = history.campaigns.filter((campaign) => campaign.costPerAttendee != null).sort((a, b) => (a.costPerAttendee ?? Infinity) - (b.costPerAttendee ?? Infinity))[0]
  const weakestArrival = history.campaigns.filter((campaign) => campaign.arrivalRate != null).sort((a, b) => (a.arrivalRate ?? 0) - (b.arrivalRate ?? 0))[0]

  return (
    <div className="gr-page-stack gr-overview">
      <section className="gr-welcome-row">
        <div>
          <h1>Attendee overview</h1>
          <p className="gr-page-intro">{history.eventName}, {formatDate(history.snapshotDate)} ({scope})</p>
        </div>
      </section>

      <div className="gr-notice gr-source-notice" role="note">
        <span className="gr-notice-mark">i</span>
        <p><strong>Synthetic practice data.</strong> Counts come from the historical workbook. Forecasts use planning assumptions.</p>
        <button type="button" className="gr-icon-button gr-notice-help" aria-label="Open source and data notes" onClick={() => onNavigate("data")}><CircleHelp size={17} aria-hidden="true" /></button>
      </div>

      <section className="gr-kpi-grid" aria-label="Historical attendee performance">
        <KpiCard label="Verified external visitors" value={formatNumber(metrics.attendees)} caption={attendeeGoal ? `${formatPercent(attendeeProgress)} of ${formatNumber(attendeeGoal)} revised visitor goal` : "Unique people with verified admission"} icon={BadgeCheck} accent="gr-kpi-teal" progress={attendeeProgress} />
        <KpiCard label="Latest confirmed" value={formatNumber(metrics.confirmed)} caption={`${formatPercent(metrics.confirmedArrivalRate)} verified arrival rate`} icon={ClipboardCheck} accent="gr-kpi-blue" />
        <KpiCard label="External people identified" value={formatNumber(metrics.identified)} caption={`${formatNumber(metrics.registrations)} unique external registrants`} icon={UsersRound} accent="gr-kpi-coral" />
        <KpiCard label="Net posted spend" value={formatINRCompact(spend)} caption={campaignFilter ? "Posted spend for this selection" : `${formatINRCompact(spendLeft)} below ${formatINRCompact(state.budgetLimitInr)} working budget cap`} icon={Banknote} accent="gr-kpi-gold" />
      </section>

      <div className="gr-overview-grid">
        <AcquisitionChart trend={history.trend} />
        <article className="gr-card gr-panel gr-funnel-panel">
          <div className="gr-panel-heading">
            <div><h2>Registration funnel</h2></div>
            <button type="button" className="gr-text-action" onClick={() => onNavigate("campaigns")}>Explore campaigns <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          <div className="gr-funnel-list">
            <FunnelRow label="Reported reach" detail="Sum of daily platform reach" value={metrics.reportedReach ?? 0} maximum={metrics.reportedReach ?? 1} formatted={formatCompact(metrics.reportedReach)} tone="navy" />
            <FunnelRow label="Identified external" detail={`${formatPercent(metrics.identifiedPerReportedReach)} vs summed reported reach`} value={metrics.identified ?? 0} maximum={metrics.reportedReach ?? 1} formatted={formatNumber(metrics.identified)} tone="blue" />
            <FunnelRow label="Registered" detail={`${formatPercent(metrics.identifiedToRegistrationRate)} of identified people`} value={metrics.registrations ?? 0} maximum={metrics.identified ?? 1} formatted={formatNumber(metrics.registrations)} tone="coral" />
            <FunnelRow label="Verified arrival" detail={campaignFilter === "unattributed" ? "No matching check-in campaign" : `${formatPercent(metrics.registrationToAttendanceRate)} of registrants`} value={metrics.attendees ?? 0} maximum={metrics.registrations ?? 1} formatted={formatNumber(metrics.attendees)} tone="teal" />
          </div>
          <div className="gr-funnel-footnote"><span><ArrowDownRight size={14} aria-hidden="true" /> {campaignFilter ? `Showing ${scope}` : `${formatNumber((metrics.confirmed ?? 0) - (metrics.attendees ?? 0))} confirmed people did not become a verified unique arrival`}</span><span>Latest status at snapshot</span></div>
        </article>

        <article className="gr-card gr-panel gr-projection-panel">
          <div className="gr-panel-heading">
            <div><h2>Base-case forecast</h2></div>
            <span className="gr-assumption-pill">ASSUMPTION</span>
          </div>
          <div className="gr-forecast-gauge" role="img" aria-label={`${formatNumber(forecast.capped)} of ${formatNumber(capacity)} assumed unique admissions capacity`}>
            <svg viewBox="0 0 200 110" aria-hidden="true">
              <path className="gr-gauge-track" d="M 14,100 a 86,86 0 0,1 172,0" pathLength="100" />
              {capacityFill > 0 && <path className="gr-gauge-value" d="M 14,100 a 86,86 0 0,1 172,0" pathLength="100" strokeDasharray={`${capacityFill} 100`} />}
            </svg>
            <div className="gr-forecast-number" aria-hidden="true">{formatNumber(forecast.capped)}<span>people</span></div>
          </div>
          <div className="gr-meter-labels"><span>0</span><span>{formatNumber(capacity)} assumed unique cap</span></div>
          <p className="gr-forecast-caption">Historical baseline {formatNumber(forecast.baseline)} + {formatNumber(forecast.gross)} gross bet arrivals − {formatNumber(forecast.overlap)} overlap.</p>
          <div className="gr-forecast-compare"><div><span>Stretch case</span><strong>{formatNumber(state.assumptions.stretchTarget)}</strong></div><div><span>Budget plan</span><strong>{formatINRCompact(state.budgetLimitInr)}</strong></div></div>
          <button type="button" className="gr-button gr-button-soft gr-full-button" onClick={() => onNavigate("capacity")}>Adjust scenario inputs <ArrowUpRight size={15} aria-hidden="true" /></button>
        </article>

        <article className="gr-card gr-panel gr-insight-panel">
          <div className="gr-panel-heading"><div><h2>Campaign findings</h2></div></div>
          {strongestEfficiency && <Insight tone="teal" icon={<ArrowUpRight size={15} aria-hidden="true" />} title={campaignFilter ? `Cost per visit for ${strongestEfficiency.name}` : `${strongestEfficiency.name} had the lowest cost per visit`} detail={`${formatINRCompact(strongestEfficiency.costPerAttendee)} per campaign-attributed verified visitor in the workbook.`} />}
          {weakestArrival && <Insight tone="coral" icon={<ArrowDownRight size={15} aria-hidden="true" />} title={campaignFilter ? `Arrival rate for ${weakestArrival.name}` : `${weakestArrival.name} had the lowest arrival rate`} detail={`${formatPercent(weakestArrival.arrivalRate)} of latest confirmed registrations reached a verified admission.`} />}
          {(!campaignFilter || campaignFilter === "unattributed") && <Insight tone="gold" icon={<CircleHelp size={15} aria-hidden="true" />} title={`${formatNumber(history.dataQuality.unattributedAttendees)} arrivals lack campaign attribution`} detail="The visitor total includes these arrivals. Their verified check-ins have no campaign ID." />}
          <button type="button" className="gr-insight-footer" onClick={onAskAnalyst}>Ask the AI analyst <ArrowUpRightFromSquare size={13} aria-hidden="true" /></button>
        </article>
      </div>
    </div>
  )
}

function FunnelRow({ label, detail, value, maximum, formatted, tone }: { label: string; detail: string; value: number; maximum: number; formatted: string; tone: string }) {
  const width = Math.max(2, Math.min(100, value / Math.max(1, maximum) * 100))
  return (
    <div className="gr-funnel-row">
      <div className="gr-funnel-main"><div className="gr-funnel-title"><strong>{label}</strong><span>{formatted}</span></div><div className="gr-funnel-track"><span className={`gr-funnel-fill ${tone}`} style={{ width: `${width}%` }} /></div><span className="gr-funnel-detail">{detail}</span></div>
    </div>
  )
}

function Insight({ tone, icon, title, detail }: { tone: string; icon: React.ReactNode; title: string; detail: string }) {
  return <div className={`gr-insight-row ${tone}`}><span className="gr-insight-icon">{icon}</span><div><strong>{title}</strong><p>{detail}</p></div></div>
}
