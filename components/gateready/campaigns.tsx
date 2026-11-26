"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
  const editTrigger = useRef<HTMLButtonElement>(null)
  const selected = history.campaigns
  const sorted = useMemo(() => [...selected].sort((a, b) => {
    if (sortBy === "arrival") return (b.arrivalRate ?? -1) - (a.arrivalRate ?? -1)
    if (sortBy === "cost") return (a.costPerAttendee ?? Infinity) - (b.costPerAttendee ?? Infinity)
    return b.attendees - a.attendees
  }), [selected, sortBy])
  const editingMetric = sorted.find((metric) => metric.campaignId === editingId)
  const editingCampaign = editingMetric && (state.campaigns.find((campaign) => campaign.campaignId === editingId) ?? asGrowthCampaign(editingMetric))

  function openEditor(campaignId: string, trigger: HTMLButtonElement) {
    editTrigger.current = trigger
    setError("")
    setEditingId(campaignId)
  }

  function closeEditor() {
    setEditingId(null)
    editTrigger.current?.focus()
  }

  async function saveCampaign(campaign: GrowthCampaign) {
    const nextState = { ...state, campaigns: [...state.campaigns.filter((item) => item.campaignId !== campaign.campaignId), campaign] }
    try {
      await onSave(nextState, "campaign_edit")
      setError("")
      closeEditor()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this campaign.")
    }
  }

  return (
    <div className="gr-page-stack">
      <section className="gr-welcome-row">
        <div><h1>Campaign performance</h1><p className="gr-page-intro">Review campaign results from the workbook and edit the inputs used for planning.</p></div>
        <div className="gr-table-tools"><label className="gr-sort-label" htmlFor="campaign-sort"><ArrowDownWideNarrow size={15} aria-hidden="true" /> Sort</label><select id="campaign-sort" className="gr-select gr-sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="attendees">Verified visits</option><option value="arrival">Arrival rate</option><option value="cost">Cost per visit</option></select></div>
      </section>

      {filter === "unattributed" ? <div className="gr-notice gr-neutral-notice"><CircleHelp size={18} aria-hidden="true" /><p><strong>Unattributed arrivals stay visible.</strong> {formatNumber(history.dataQuality.unattributedAttendees)} visitors have no campaign ID in their verified check-in. They remain in the total visitor count and are not reassigned to a channel.</p></div> : null}
      {!demoActive && <div className="gr-notice gr-demo-banner"><div><strong>This view is read-only.</strong><p>Open a private workspace to edit campaign scenarios.</p></div><button type="button" className="gr-button gr-button-primary" onClick={onStartDemo}><Plus size={15} aria-hidden="true" /> Open private workspace</button></div>}

      <article className="gr-card gr-table-card">
        <div className="gr-table-summary"><h2 id="gr-campaign-table-title">Workbook results</h2><span className="gr-table-count">{selected.length} {selected.length === 1 ? "campaign" : "campaigns"}</span></div>
        {editingCampaign && <CampaignEditor key={editingCampaign.campaignId} campaign={editingCampaign} error={error} onCancel={closeEditor} onSave={saveCampaign} />}
        <div className="gr-table-wrap" role="region" aria-labelledby="gr-campaign-table-title" tabIndex={0}><table className="gr-data-table">
          <thead><tr><th scope="col">Campaign</th><th scope="col">Reported reach</th><th scope="col">Registered</th><th scope="col">Confirmed</th><th scope="col">Verified</th><th scope="col">Arrival</th><th scope="col">Spend</th><th scope="col">Cost / visitor</th><th scope="col"><span className="gr-sr-only">Actions</span></th></tr></thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan={9}>{filter === "unattributed" ? "Unattributed visits are not assigned to a campaign." : "No campaigns match this selection."}</td></tr>}
            {sorted.map((metric, index) => {
              const planned = state.campaigns.find((campaign) => campaign.campaignId === metric.campaignId)
              const isEditing = editingId === metric.campaignId
              const row = planned ?? asGrowthCampaign(metric)
              return (
                <tr key={metric.campaignId} className={index === 0 ? "gr-table-row-featured" : ""}>
                  <td><div className="gr-campaign-name"><strong>{metric.name}</strong><span>{metric.channel.replaceAll("_", " ")} ({row.scenario.stage})</span></div></td>
                  <td>{formatNumber(metric.reportedReach)}<small className="gr-cell-note">Sum of daily reach</small></td>
                  <td>{formatNumber(metric.registrations)}<small className="gr-cell-note">unique people</small></td>
                  <td>{formatNumber(metric.confirmed)}<small className="gr-cell-note">latest status</small></td>
                  <td><strong>{formatNumber(metric.attendees)}</strong><small className="gr-cell-note">Unique visitors</small></td>
                  <td><span className={`gr-rate-pill ${(metric.arrivalRate ?? 0) >= 0.8 ? "good" : "watch"}`}>{formatPercent(metric.arrivalRate)}</span></td>
                  <td>{formatINRCompact(metric.spendInr)}</td>
                  <td>{formatINRCompact(metric.costPerAttendee)}</td>
                  <td><button type="button" className="gr-row-edit" disabled={!demoActive} aria-label={`Edit ${metric.name} scenario`} aria-expanded={isEditing} title={demoActive ? "Edit scenario values" : "Start a private demo to edit"} onClick={(event) => isEditing ? closeEditor() : openEditor(metric.campaignId, event.currentTarget)}>{isEditing ? <X size={16} aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}</button></td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
        <div className="gr-table-foot"><span>Visitors are external attendees with a verified admission. Each person counts once.</span></div>
      </article>

      <section className="gr-campaign-lower-grid">
        <article className="gr-card gr-small-panel"><h2>Planning inputs</h2><p>Scenario edits are saved to your workspace and leave the source workbook intact.</p><button type="button" className="gr-inline-link" onClick={(event) => openEditor(sorted[0].campaignId, event.currentTarget)} disabled={!demoActive || sorted.length === 0}>Edit top campaign <ArrowUpRight size={14} aria-hidden="true" /></button></article>
        <article className="gr-card gr-small-panel"><h2>Campaign attribution</h2><p>A visit is assigned to the campaign ID on the first eligible verified check-in. Blank IDs are counted as unattributed.</p></article>
      </section>
    </div>
  )
}

function CampaignEditor({ campaign, error, onSave, onCancel }: { campaign: GrowthCampaign; error: string; onSave: (campaign: GrowthCampaign) => void; onCancel: () => void }) {
  const [form, setForm] = useState(campaign.scenario)
  const [localError, setLocalError] = useState("")
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => { formRef.current?.focus() }, [])
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.confirmed > form.registrations) return setLocalError("Confirmed registrations cannot exceed registered people.")
    if (form.arrivalRate < 0 || form.arrivalRate > 1) return setLocalError("Arrival rate must be between 0% and 100%.")
    setLocalError("")
    onSave({ ...campaign, scenario: form })
  }
  return (
    <form className="gr-editor-form" ref={formRef} tabIndex={-1} aria-labelledby="gr-campaign-editor-title" onSubmit={submit}>
      <div className="gr-editor-heading"><h3 id="gr-campaign-editor-title">Edit scenario for {campaign.name}</h3><button type="button" onClick={onCancel} className="gr-icon-button" aria-label="Close scenario editor"><X size={16} aria-hidden="true" /></button></div>
      <div className="gr-editor-grid">
        <label>Owner<input maxLength={100} value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} required /></label>
        <label>Stage<select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as typeof form.stage })}><option>Plan</option><option>Active</option><option>Paused</option><option>Complete</option></select></label>
        <label>Reported reach<input type="number" min={0} max={10000000} step={1} value={form.reportedReach} onChange={(event) => setForm({ ...form, reportedReach: Number(event.target.value) })} /></label>
        <label>Registered people<input type="number" min={0} max={1000000} step={1} value={form.registrations} onChange={(event) => setForm({ ...form, registrations: Number(event.target.value) })} /></label>
        <label>Latest confirmed<input type="number" min={0} max={1000000} step={1} value={form.confirmed} onChange={(event) => setForm({ ...form, confirmed: Number(event.target.value) })} /></label>
        <label>Arrival rate<input type="number" min={0} max={1} step={0.01} value={form.arrivalRate} onChange={(event) => setForm({ ...form, arrivalRate: Number(event.target.value) })} aria-describedby="arrival-rate-help" /><small id="arrival-rate-help">Enter a proportion from 0 to 1.</small></label>
        <label>Scenario spend (INR)<input type="number" min={0} max={100000000} step={1000} value={form.spendInr} onChange={(event) => setForm({ ...form, spendInr: Number(event.target.value) })} /></label>
      </div>
      {(localError || error) && <div className="gr-form-error" role="alert">{localError || error}</div>}
      <div className="gr-editor-actions"><button type="button" className="gr-button gr-button-ghost" onClick={onCancel}>Cancel</button><button type="submit" className="gr-button gr-button-primary">Save campaign scenario</button></div>
    </form>
  )
}
