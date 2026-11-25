"use client"

import { ArrowDownRight, ArrowUpRight, ArrowUpRightFromSquare, ArrowRight, BadgeCheck, Banknote, CircleHelp, ClipboardCheck, Compass, UsersRound } from "lucide-react"
import type { HistoricalAnalytics } from "@/lib/analytics"
import type { WorkspaceState } from "@/lib/types"
import { getOperatingForecast } from "@/lib/demo-state"
import type { ViewKey } from "@/components/gateready/sidebar"
import { formatCompact, formatINRCompact, formatNumber, formatPercent } from "@/components/gateready/format"

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

export function OverviewPanel({ history, state, onNavigate }: { history: HistoricalAnalytics; state: WorkspaceState; onNavigate: (view: ViewKey) => void }) {
  const metrics = history.totals
  const overall = history.overall
  const target = history.target
  const forecast = getOperatingForecast(state, "base")
  const spend = overall.spendInr ?? 0
  const spendLeft = Math.max(0, state.budgetLimitInr - spend)
  const attendeeGoal = target?.attendees ?? 0
  const attendeeProgress = attendeeGoal ? (overall.attendees ?? 0) / attendeeGoal : null
  const peakReach = Math.max(1, ...history.trend.map((point) => point.reportedReach))
  const peakRegs = Math.max(1, ...history.trend.map((point) => point.registrations))
  const strongestEfficiency = history.allCampaigns.filter((campaign) => campaign.costPerAttendee != null).sort((a, b) => (a.costPerAttendee ?? Infinity) - (b.costPerAttendee ?? Infinity))[0]
  const weakestArrival = history.allCampaigns.filter((campaign) => campaign.arrivalRate != null).sort((a, b) => (a.arrivalRate ?? 0) - (b.arrivalRate ?? 0))[0]
  const historyTargetProgress = target?.attendees ? (overall.attendees ?? 0) / target.attendees : 0

  return (
    <div className="gr-page-stack">
      <section className="gr-welcome-row">
        <div>
          <div className="gr-eyebrow">ATTENDEE ACQUISITION · {history.snapshotDate}</div>
          <h1>Turn interest into arrivals.</h1>
          <p className="gr-page-intro">A clear view of the source funnel, the biggest conversion levers, and the next moves to make.</p>
        </div>
        <div className="gr-snapshot-tag"><span className="gr-snapshot-pulse" /> Source snapshot <strong>{history.eventName}</strong></div>
      </section>

      <div className="gr-notice gr-source-notice" role="note">
        <span className="gr-notice-mark">i</span>
        <p><strong>Working from a synthetic practice dataset.</strong> Counts below are reconstructed from the supplied historical workbook. Planned lifts and capacity envelopes are labeled assumptions, not actual results.</p>
        <button type="button" className="gr-icon-button gr-notice-help" aria-label="Open source and data notes" onClick={() => onNavigate("data")}><CircleHelp size={17} aria-hidden="true" /></button>
      </div>

      <section className="gr-kpi-grid" aria-label="Historical attendee performance">
        <KpiCard label="Verified external visitors" value={formatNumber(overall.attendees)} caption={attendeeGoal ? `${formatPercent(historyTargetProgress)} of ${formatNumber(attendeeGoal)} revised visitor goal` : "Unique people with verified admission"} icon={BadgeCheck} accent="gr-kpi-teal" progress={attendeeProgress} />
        <KpiCard label="Latest confirmed" value={formatNumber(overall.confirmed)} caption={`${formatPercent(overall.confirmedArrivalRate)} confirmed-to-arrival · latest eligible status`} icon={ClipboardCheck} accent="gr-kpi-blue" />
        <KpiCard label="External people identified" value={formatNumber(overall.identified)} caption={`${formatNumber(overall.registrations)} unique external registrants`} icon={UsersRound} accent="gr-kpi-coral" />
        <KpiCard label="Net posted spend" value={formatINRCompact(spend)} caption={`${formatINRCompact(spendLeft)} below ${formatINRCompact(state.budgetLimitInr)} working budget cap`} icon={Banknote} accent="gr-kpi-gold" />
      </section>

      <section className="gr-primary-grid">
        <article className="gr-card gr-panel gr-funnel-panel">
          <div className="gr-panel-heading">
            <div><div className="gr-section-kicker">SOURCE PERFORMANCE</div><h2>Where the funnel thins</h2></div>
            <button type="button" className="gr-text-action" onClick={() => onNavigate("campaigns")}>Explore campaigns <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          <div className="gr-funnel-list">
            <FunnelRow index="01" label="Reported reach" detail="Platform-day sum · not unique people" value={metrics.reportedReach ?? 0} maximum={metrics.reportedReach ?? 1} formatted={formatCompact(metrics.reportedReach)} tone="navy" />
            <FunnelRow index="02" label="Identified external" detail={`${formatPercent(overall.identifiedPerReportedReach)} vs summed reported reach`} value={metrics.identified ?? 0} maximum={metrics.reportedReach ?? 1} formatted={formatNumber(overall.identified)} tone="blue" />
            <FunnelRow index="03" label="Registered" detail={`${formatPercent(overall.identifiedToRegistrationRate)} of identified people`} value={metrics.registrations ?? 0} maximum={metrics.identified ?? 1} formatted={formatNumber(overall.registrations)} tone="coral" />
            <FunnelRow index="04" label="Verified arrival" detail={`${formatPercent(overall.registrationToAttendanceRate)} of all registrants`} value={metrics.attendees ?? 0} maximum={metrics.registrations ?? 1} formatted={formatNumber(overall.attendees)} tone="teal" />
          </div>
          <div className="gr-funnel-footnote"><span><ArrowDownRight size={14} aria-hidden="true" /> {formatNumber((overall.confirmed ?? 0) - (overall.attendees ?? 0))} confirmed people did not become a verified unique arrival</span><span>Latest status at snapshot</span></div>
        </article>

        <article className="gr-card gr-panel gr-projection-panel">
          <div className="gr-panel-heading">
            <div><div className="gr-section-kicker">PLANNING MODEL</div><h2>Base-case forecast</h2></div>
            <span className="gr-assumption-pill">ASSUMPTION</span>
          </div>
          <div className="gr-forecast-number">{formatNumber(forecast.capped)}<span>people</span></div>
          <p className="gr-forecast-caption">Historical baseline {formatNumber(forecast.baseline)} + {formatNumber(forecast.gross)} gross bet arrivals − {formatNumber(forecast.overlap)} overlap.</p>
          <div className="gr-forecast-meter" role="img" aria-label={`${formatNumber(forecast.capped)} of ${formatNumber(state.capacity.uniqueAdmissionLimit)} assumed unique admissions capacity`}><span style={{ width: `${Math.min(100, (forecast.capped / Math.max(1, state.capacity.uniqueAdmissionLimit)) * 100)}%` }} /></div>
          <div className="gr-meter-labels"><span>0</span><span>{formatNumber(state.capacity.uniqueAdmissionLimit)} assumed unique cap</span></div>
          <div className="gr-forecast-compare"><div><span>Stretch case</span><strong>{formatNumber(state.assumptions.stretchTarget)}</strong></div><div><span>Budget plan</span><strong>{formatINRCompact(state.budgetLimitInr)}</strong></div></div>
          <button type="button" className="gr-button gr-button-soft gr-full-button" onClick={() => onNavigate("capacity")}>Adjust scenario inputs <ArrowUpRight size={15} aria-hidden="true" /></button>
        </article>
      </section>

      <section className="gr-secondary-grid">
        <article className="gr-card gr-panel gr-trend-panel">
          <div className="gr-panel-heading">
            <div><div className="gr-section-kicker">MOMENTUM</div><h2>Monthly acquisition signals</h2></div>
            <span className="gr-legend"><i className="gr-legend-reach" /> Reach <i className="gr-legend-registrations" /> Registrations</span>
          </div>
          <div className="gr-chart" role="img" aria-label="Monthly reported reach and unique registrations trend">
            {history.trend.map((point) => (
              <div className="gr-chart-month" key={point.month}>
                <div className="gr-chart-bars" title={`${point.month}: ${formatNumber(point.reportedReach)} reported reach, ${formatNumber(point.registrations)} registrations`}>
                  <span className="gr-chart-bar gr-chart-bar-reach" style={{ height: `${Math.max(6, point.reportedReach / peakReach * 100)}%` }} />
                  <span className="gr-chart-bar gr-chart-bar-register" style={{ height: `${Math.max(4, point.registrations / peakRegs * 100)}%` }} />
                </div>
                <span className="gr-chart-label">{point.month}</span>
              </div>
            ))}
          </div>
          <div className="gr-chart-note"><span><i className="gr-dot gr-dot-coral" /> Unique registration people</span><span>Daily reported reach can overlap</span></div>
        </article>

        <article className="gr-card gr-panel gr-insight-panel">
          <div className="gr-panel-heading"><div><div className="gr-section-kicker">WHAT THE DATA SAYS</div><h2>Start with the evidence</h2></div><Compass size={19} className="gr-heading-icon" aria-hidden="true" /></div>
          {strongestEfficiency && <Insight tone="teal" icon={<ArrowUpRight size={15} aria-hidden="true" />} title={`${strongestEfficiency.name} was the lowest-cost arrival source`} detail={`${formatINRCompact(strongestEfficiency.costPerAttendee)} per campaign-attributed verified visitor in the workbook.`} />}
          {weakestArrival && <Insight tone="coral" icon={<ArrowDownRight size={15} aria-hidden="true" />} title={`${weakestArrival.name} is the first funnel to diagnose`} detail={`${formatPercent(weakestArrival.arrivalRate)} of latest confirmed registrations reached a verified admission.`} />}
          <Insight tone="gold" icon={<CircleHelp size={15} aria-hidden="true" />} title={`${formatNumber(history.dataQuality.unattributedAttendees)} arrivals lack campaign attribution`} detail="Keep them in the unique visitor total; don't backfill a campaign from registration history." />
          <button type="button" className="gr-insight-footer" onClick={() => onNavigate("analyst")}>Ask the AI analyst about this snapshot <ArrowUpRightFromSquare size={13} aria-hidden="true" /></button>
        </article>
      </section>
    </div>
  )
}

function FunnelRow({ index, label, detail, value, maximum, formatted, tone }: { index: string; label: string; detail: string; value: number; maximum: number; formatted: string; tone: string }) {
  const width = Math.max(2, Math.min(100, value / Math.max(1, maximum) * 100))
  return (
    <div className="gr-funnel-row">
      <span className="gr-funnel-index">{index}</span>
      <div className="gr-funnel-main"><div className="gr-funnel-title"><strong>{label}</strong><span>{formatted}</span></div><div className="gr-funnel-track"><span className={`gr-funnel-fill ${tone}`} style={{ width: `${width}%` }} /></div><span className="gr-funnel-detail">{detail}</span></div>
    </div>
  )
}

function Insight({ tone, icon, title, detail }: { tone: string; icon: React.ReactNode; title: string; detail: string }) {
  return <div className={`gr-insight-row ${tone}`}><span className="gr-insight-icon">{icon}</span><div><strong>{title}</strong><p>{detail}</p></div></div>
}
