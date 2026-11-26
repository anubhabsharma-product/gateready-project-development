"use client"

import { useState } from "react"
import { AlertTriangle, ArrowRight, BadgeCheck, CircleHelp, ShieldCheck, SlidersHorizontal } from "lucide-react"
import type { HistoricalAnalytics } from "@/lib/analytics"
import type { WorkspaceState } from "@/lib/types"
import { getOperatingForecast } from "@/lib/demo-state"
import { formatINRCompact, formatNumber } from "@/components/gateready/format"
import { GROWTH_BETS, getGrowthPlanTotals } from "@/lib/strategy"

export function CapacityPanel({ history, state, demoActive, onSave, onStartDemo }: { history: HistoricalAnalytics; state: WorkspaceState; demoActive: boolean; onSave: (next: WorkspaceState, action: string) => Promise<void>; onStartDemo: () => void }) {
  const [scenario, setScenario] = useState<"base" | "stretch">("base")
  const [form, setForm] = useState({
    budgetLimitInr: state.budgetLimitInr,
    uniqueAdmissionLimit: state.capacity.uniqueAdmissionLimit,
    concurrentOccupancyLimit: state.capacity.concurrentOccupancyLimit,
    baseTarget: state.assumptions.baseTarget,
    stretchTarget: state.assumptions.stretchTarget,
    preparationWeeks: state.assumptions.preparationWeeks,
    coreOrganizers: state.assumptions.coreOrganizers,
    studentRepresentatives: state.assumptions.studentRepresentatives,
  })
  const [error, setError] = useState("")
  const forecast = getOperatingForecast(state, scenario)
  const total = getGrowthPlanTotals()
  const sourceSpend = history.overall.spendInr ?? 0

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.concurrentOccupancyLimit > form.uniqueAdmissionLimit) return setError("The concurrent occupancy planning limit must not exceed the unique-admissions limit.")
    if (form.baseTarget > form.uniqueAdmissionLimit || form.stretchTarget > form.uniqueAdmissionLimit) return setError("Both target scenarios must fit within the assumed unique-admissions cap.")
    const next = {
      ...state,
      budgetLimitInr: form.budgetLimitInr,
      capacity: { ...state.capacity, uniqueAdmissionLimit: form.uniqueAdmissionLimit, concurrentOccupancyLimit: form.concurrentOccupancyLimit },
      assumptions: { ...state.assumptions, baseTarget: form.baseTarget, stretchTarget: form.stretchTarget, preparationWeeks: form.preparationWeeks, coreOrganizers: form.coreOrganizers, studentRepresentatives: form.studentRepresentatives },
    }
    try {
      await onSave(next, "assumption_change")
      setError("")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save these planning assumptions.")
    }
  }

  return (
    <div className="gr-page-stack">
      <section className="gr-welcome-row"><div><h1>Capacity and forecast</h1><p className="gr-page-intro">Estimate how many people will attend and plan for how many can be on site at once.</p></div></section>
      <div className="gr-notice gr-warning-notice"><AlertTriangle size={18} aria-hidden="true" /><p><strong>The workbook has no approved venue limits.</strong> Confirm both limits with the venue and operations team before publishing a target.</p></div>
      {!demoActive && <div className="gr-notice gr-demo-banner"><div><strong>This view is read-only.</strong><p>Open a private workspace to edit the forecast inputs.</p></div><button type="button" className="gr-button gr-button-primary" onClick={onStartDemo}>Open private workspace</button></div>}

      <section className="gr-capacity-grid">
        <article className="gr-card gr-panel gr-scenario-panel">
          <div className="gr-panel-heading"><div><h2>Forecast unique arrivals</h2></div></div>
          <div className="gr-toggle-group" role="group" aria-label="Choose attendance scenario"><button type="button" aria-pressed={scenario === "base"} onClick={() => setScenario("base")}>Base case</button><button type="button" aria-pressed={scenario === "stretch"} onClick={() => setScenario("stretch")}>Stretch case</button></div>
          <div className="gr-capacity-result"><strong>{formatNumber(forecast.capped)}</strong><span>forecast unique visitors</span></div>
          <div className="gr-capacity-track" role="img" aria-label={`${formatNumber(forecast.capped)} forecast attendees versus assumed ${formatNumber(state.capacity.uniqueAdmissionLimit)} cap`}><span style={{ width: `${Math.min(100, forecast.capped / Math.max(1, state.capacity.uniqueAdmissionLimit) * 100)}%` }} /></div>
          <div className="gr-capacity-track-caption"><span>0</span><strong>{formatNumber(state.capacity.uniqueAdmissionLimit)} assumed unique capacity</strong></div>
          <div className="gr-model-equation">
            <div className="gr-equation-term"><span>Observed baseline</span><strong>{formatNumber(forecast.baseline)}</strong></div>
            <div className="gr-equation-term"><span>Gross bet arrivals</span><strong><span className="gr-equation-op">+</span>{formatNumber(forecast.gross)}</strong></div>
            <div className="gr-equation-term"><span>Overlap</span><strong><span className="gr-equation-op">−</span>{formatNumber(forecast.overlap)}</strong></div>
            <div className="gr-equation-term gr-equation-total"><span>Pre-cap total</span><strong><span className="gr-equation-op">=</span>{formatNumber(forecast.preCapacity)}</strong></div>
          </div>
          <div className={`gr-capacity-status ${forecast.exceedsCapacity ? "over" : "within"}`}>{forecast.exceedsCapacity ? <AlertTriangle size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}<span>{forecast.exceedsCapacity ? `${formatNumber(forecast.preCapacity - state.capacity.uniqueAdmissionLimit)} above the assumed limit` : `${formatNumber(forecast.capacityHeadroom)} places below the assumed limit`}</span></div>
        </article>
        <article className="gr-card gr-panel gr-operating-panel">
          <div className="gr-panel-heading"><div><h2>Assumed capacity limits</h2></div></div>
          <div className="gr-envelope-row"><div className="gr-envelope-icon unique"><BadgeCheck size={18} aria-hidden="true" /></div><div><span>Unique verified visitors</span><strong>{formatNumber(state.capacity.uniqueAdmissionLimit)}</strong><small>Total distinct visitors over the event</small></div></div>
          <div className="gr-envelope-row"><div className="gr-envelope-icon concurrent"><SlidersHorizontal size={18} aria-hidden="true" /></div><div><span>Peak concurrent occupancy</span><strong>{formatNumber(state.capacity.concurrentOccupancyLimit)}</strong><small>Maximum people on site at the same time</small></div></div>
          <div className="gr-occupancy-callout"><strong>Why both?</strong><p>3,200 unique visitors over two days may be safe under a 1,500-person concurrent cap if timed entry and session turnover are planned. The workbook has no occupancy, arrival-time, or venue-safety records.</p></div>
          <div className="gr-capacity-source"><span>Source actual</span><strong>{formatNumber(history.overall.attendees)} verified unique external visitors</strong></div>
        </article>
      </section>

      <section className="gr-capacity-lower-grid">
        <article className="gr-card gr-panel gr-budget-panel">
          <div className="gr-panel-heading"><div><h2>Budget vs. proposed bets</h2></div><span className="gr-budget-status">{formatINRCompact(sourceSpend)} historical spend</span></div>
          <div className="gr-budget-strip"><div><span>Workbook approved limit</span><strong>{formatINRCompact(history.target?.budgetInr)}</strong></div><div><span>Editable working cap</span><strong>{formatINRCompact(state.budgetLimitInr)}</strong></div><div><span>Proposed 5-bet envelope</span><strong>{formatINRCompact(total.budget)}</strong></div></div>
          <div className="gr-budget-bars">{GROWTH_BETS.map((bet) => <div key={bet.id} className="gr-budget-row"><div><span>{bet.rank}. {bet.title}</span><strong>{formatINRCompact(bet.budgetInr)}</strong></div><span className="gr-budget-track"><i style={{ width: `${bet.budgetInr / Math.max(1, total.budget) * 100}%` }} /></span></div>)}</div>
          <div className="gr-budget-footnote"><CircleHelp size={14} aria-hidden="true" /> Historical actual spend and proposed future allocation are separate periods; neither implies incremental ROI.</div>
        </article>
        <article className="gr-card gr-panel gr-assumption-panel">
          <div className="gr-panel-heading"><div><h2>Planning inputs</h2></div></div>
          <form className="gr-assumption-form" onSubmit={save}>
            <label>Budget cap (INR)<input type="number" min={0} max={100000000} step={5000} disabled={!demoActive} value={form.budgetLimitInr} onChange={(event) => setForm({ ...form, budgetLimitInr: Number(event.target.value) })} /></label>
            <label>Unique visitor limit<input type="number" min={1} max={50000} step={50} disabled={!demoActive} value={form.uniqueAdmissionLimit} onChange={(event) => setForm({ ...form, uniqueAdmissionLimit: Number(event.target.value) })} /></label>
            <label>Concurrent occupancy limit<input type="number" min={1} max={50000} step={50} disabled={!demoActive} value={form.concurrentOccupancyLimit} onChange={(event) => setForm({ ...form, concurrentOccupancyLimit: Number(event.target.value) })} /></label>
            <div className="gr-assumption-divider"><span>Six-week capacity plan</span></div>
            <label>Base target<input type="number" min={0} max={50000} step={50} disabled={!demoActive} value={form.baseTarget} onChange={(event) => setForm({ ...form, baseTarget: Number(event.target.value) })} /></label>
            <label>Stretch target<input type="number" min={0} max={50000} step={50} disabled={!demoActive} value={form.stretchTarget} onChange={(event) => setForm({ ...form, stretchTarget: Number(event.target.value) })} /></label>
            <div className="gr-assumption-divider"><span>Team coverage</span></div>
            <label>Core organizers<input type="number" min={1} max={300} step={1} disabled={!demoActive} value={form.coreOrganizers} onChange={(event) => setForm({ ...form, coreOrganizers: Number(event.target.value) })} /></label>
            <label>Student reps<input type="number" min={0} max={10000} step={1} disabled={!demoActive} value={form.studentRepresentatives} onChange={(event) => setForm({ ...form, studentRepresentatives: Number(event.target.value) })} /></label>
            {error && <div className="gr-form-error" role="alert">{error}</div>}
            <button type="submit" className="gr-button gr-button-primary gr-full-button" disabled={!demoActive}>Save assumptions <ArrowRight size={15} aria-hidden="true" /></button>
          </form>
        </article>
      </section>
    </div>
  )
}
