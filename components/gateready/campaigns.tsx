"use client"

import { Fragment, useMemo, useState } from "react"
import { ArrowDownWideNarrow, ArrowUpRight, CircleHelp, Pencil, Plus, X } from "lucide-react"
import type { CampaignMetric, HistoricalAnalytics } from "@/lib/analytics"
import type { GrowthCampaign, WorkspaceState } from "@/lib/types"
import { formatINRCompact, formatNumber, formatPercent } from "@/components/gateready/format"

function asGrowthCampaign(metric: CampaignMetric): GrowthCampaign {
  return {
    campaignId: metric.campaignId,
    name: metric.name,
    channel: metric.channel,
    audience: metric.audience,
    objective: metric.objective,
    source: metric,
    scenario: {
      reportedReach: metric.reportedReach,
      registrations: metric.registrations,
      confirmed: metric.confirmed,
      spendInr: metric.spendInr,
      arrivalRate: metric.arrivalRate ?? 0,
      owner: metric.owner || "Growth team",
      stage: "Complete",
    },
  }
}

export function CampaignsPanel({ history, state, filter, demoActive, onSave, onStartDemo }: {
  history: HistoricalAnalytics
  state: WorkspaceState
  filter: string
  demoActive: boolean
  onSave: (next: WorkspaceState, action: string) => Promise<void>
  onStartDemo: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"attendees" | "arrival" | "cost">("attendees")
  const [error, setError] = useState("")
  const selected = history.campaigns
  const sorted = useMemo(() => [...selected].sort((a, b) => {
    if (sortBy === "arrival") return (b.arrivalRate ?? -1) - (a.arrivalRate ?? -1)
    if (sortBy === "cost") return (a.costPerAttendee ?? Infinity) - (b.costPerAttendee ?? Infinity)
    return b.attendees - a.attendees
  }), [selected, sortBy])

  async function saveCampaign(campaign: GrowthCampaign) {
    const nextState = { ...state, campaigns: [...state.campaigns.filter((item) => item.campaignId !== campaign.campaignId), campaign] }
    try {
      await onSave(nextState, "campaign_edit")
      setError("")
      setEditingId(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this campaign.")
    }
  }

  return (
    <div className="gr-page-stack">
      <section className="gr-welcome-row">
        <div><div className="gr-eyebrow">CHANNEL ECONOMICS · SOURCE AND SCENARIO</div><h1>Campaigns, without the vanity math.</h1><p className="gr-page-intro">Compare source-measured outcomes to the editable planning case. Reported reach is never treated as unique people.</p></div>
        <div className="gr-table-tools"><label className="gr-sort-label" htmlFor="campaign-sort"><ArrowDownWideNarrow size={15} aria-hidden="true" /> Sort</label><select id="campaign-sort" className="gr-select gr-sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="attendees">Verified visits</option><option value="arrival">Arrival rate</option><option value="cost">Cost per visit</option></select></div>
      </section>

      {filter === "unattributed" ? <div className="gr-notice gr-neutral-notice"><CircleHelp size={18} aria-hidden="true" /><p><strong>Unattributed arrivals stay visible.</strong> {formatNumber(history.dataQuality.unattributedAttendees)} visitors have no campaign ID in their verified check-in. They remain in the total visitor count and are not reassigned to a channel.</p></div> : null}
      {!demoActive && <div className="gr-notice gr-demo-banner"><div><strong>Read-only until you open a private demo.</strong><p>Changes are saved to an isolated Supabase workspace, never into the workbook.</p></div><button type="button" className="gr-button gr-button-primary" onClick={onStartDemo}><Plus size={15} aria-hidden="true" /> Start interactive demo</button></div>}
      {error && <div className="gr-form-error" role="alert">{error}</div>}

      <article className="gr-card gr-table-card">
        <div className="gr-table-summary"><div><div className="gr-section-kicker">{history.campaigns.length} MEASURED CHANNELS</div><h2>Source performance by campaign</h2></div><span className="gr-observed-badge"><i /> Observed values · {selected[0]?.campaignId ? "selected source snapshot" : "no attributed campaign"}</span></div>
        <div className="gr-table-wrap"><table className="gr-data-table">
          <thead><tr><th scope="col">Campaign</th><th scope="col">Reported reach</th><th scope="col">Registered</th><th scope="col">Confirmed</th><th scope="col">Verified</th><th scope="col">Arrival</th><th scope="col">Spend</th><th scope="col">Cost / visitor</th><th scope="col"><span className="gr-sr-only">Actions</span></th></tr></thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan={9}>{filter === "unattributed" ? "Unattributed visits are not assigned to a campaign." : "No campaigns match this selection."}</td></tr>}
            {sorted.map((metric, index) => {
              const planned = state.campaigns.find((campaign) => campaign.campaignId === metric.campaignId)
              const isEditing = editingId === metric.campaignId
              const row = planned ?? asGrowthCampaign(metric)
              return <Fragment key={metric.campaignId}>
                <tr className={index === 0 ? "gr-table-row-featured" : ""}>
                  <td><div className="gr-campaign-name"><span className="gr-campaign-rank">{String(index + 1).padStart(2, "0")}</span><div><strong>{metric.name}</strong><span>{metric.channel.replaceAll("_", " ")} · {row.scenario.stage}</span></div></div></td>
                  <td>{formatNumber(metric.reportedReach)}<small className="gr-cell-note">summed by day</small></td>
                  <td>{formatNumber(metric.registrations)}<small className="gr-cell-note">unique people</small></td>
                  <td>{formatNumber(metric.confirmed)}<small className="gr-cell-note">latest status</small></td>
                  <td><strong>{formatNumber(metric.attendees)}</strong><small className="gr-cell-note">unique & verified</small></td>
                  <td><span className={`gr-rate-pill ${(metric.arrivalRate ?? 0) >= 0.8 ? "good" : "watch"}`}>{formatPercent(metric.arrivalRate)}</span></td>
                  <td>{formatINRCompact(metric.spendInr)}</td>
                  <td>{formatINRCompact(metric.costPerAttendee)}</td>
                  <td><button type="button" className="gr-row-edit" disabled={!demoActive} aria-label={`Edit ${metric.name} scenario`} title={demoActive ? "Edit scenario values" : "Start a private demo to edit"} onClick={() => { setEditingId(isEditing ? null : metric.campaignId); setError("") }}>{isEditing ? <X size={16} aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}</button></td>
                </tr>
                {isEditing && <tr><td colSpan={9} className="gr-inline-editor-cell"><CampaignEditor campaign={row} onCancel={() => setEditingId(null)} onSave={saveCampaign} />{error && <div className="gr-form-error" role="alert">{error}</div>}</td></tr>}
              </Fragment>
            })}
          </tbody>
        </table></div>
        <div className="gr-table-foot"><span><CircleHelp size={14} aria-hidden="true" /> A unique visitor is a distinct external person with at least one admitted + verified record.</span><span>More than one gate scan still counts once.</span></div>
      </article>

      <section className="gr-campaign-lower-grid">
        <article className="gr-card gr-small-panel"><div className="gr-section-kicker">SCENARIO MODEL</div><h2>Editable inputs</h2><p>Owner, stage, reach, registration, confirmation rate, and scenario spend are stored separately from the immutable source workbook.</p><button type="button" className="gr-inline-link" onClick={() => setEditingId(sorted[0]?.campaignId ?? null)} disabled={!demoActive || sorted.length === 0}>Edit leading channel <ArrowUpRight size={14} aria-hidden="true" /></button></article>
        <article className="gr-card gr-small-panel gr-definition-card"><div className="gr-section-kicker">ATTRIBUTION RULE</div><h2>No last-click guesswork</h2><p>Attendance is attributed only to the first eligible verified check-in&apos;s own campaign ID. Blank check-in campaign IDs remain unattributed.</p></article>
      </section>
    </div>
  )
}

function CampaignEditor({ campaign, onSave, onCancel }: { campaign: GrowthCampaign; onSave: (campaign: GrowthCampaign) => void; onCancel: () => void }) {
  const [form, setForm] = useState(campaign.scenario)
  const [localError, setLocalError] = useState("")
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.confirmed > form.registrations) return setLocalError("Confirmed registrations cannot exceed registered people.")
    if (form.arrivalRate < 0 || form.arrivalRate > 1) return setLocalError("Arrival rate must be between 0% and 100%.")
    setLocalError("")
    onSave({ ...campaign, scenario: form })
  }
  return (
    <form className="gr-editor-form" onSubmit={submit}>
      <div className="gr-editor-heading"><div><span className="gr-section-kicker">SCENARIO EDITOR</span><strong>{campaign.name}</strong></div><button type="button" onClick={onCancel} className="gr-icon-button" aria-label="Close scenario editor"><X size={16} aria-hidden="true" /></button></div>
      <div className="gr-editor-grid">
        <label>Owner<input maxLength={100} value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} required /></label>
        <label>Stage<select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as typeof form.stage })}><option>Plan</option><option>Active</option><option>Paused</option><option>Complete</option></select></label>
        <label>Reported reach<input type="number" min={0} max={10000000} step={1} value={form.reportedReach} onChange={(event) => setForm({ ...form, reportedReach: Number(event.target.value) })} /></label>
        <label>Registered people<input type="number" min={0} max={1000000} step={1} value={form.registrations} onChange={(event) => setForm({ ...form, registrations: Number(event.target.value) })} /></label>
        <label>Latest confirmed<input type="number" min={0} max={1000000} step={1} value={form.confirmed} onChange={(event) => setForm({ ...form, confirmed: Number(event.target.value) })} /></label>
        <label>Arrival rate<input type="number" min={0} max={1} step={0.01} value={form.arrivalRate} onChange={(event) => setForm({ ...form, arrivalRate: Number(event.target.value) })} aria-describedby="arrival-rate-help" /><small id="arrival-rate-help">Enter a proportion from 0 to 1.</small></label>
        <label>Scenario spend (INR)<input type="number" min={0} max={100000000} step={1000} value={form.spendInr} onChange={(event) => setForm({ ...form, spendInr: Number(event.target.value) })} /></label>
      </div>
      {localError && <div className="gr-form-error" role="alert">{localError}</div>}
      <div className="gr-editor-actions"><button type="button" className="gr-button gr-button-ghost" onClick={onCancel}>Cancel</button><button type="submit" className="gr-button gr-button-primary">Save campaign scenario</button></div>
    </form>
  )
}
