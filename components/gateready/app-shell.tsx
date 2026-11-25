"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { ArrowDownToLine, CalendarDays, ChevronDown, CloudCheck, LoaderCircle, Search, ShieldCheck, Sparkles } from "lucide-react"
import { Sidebar, type ViewKey } from "@/components/gateready/sidebar"
import { OverviewPanel } from "@/components/gateready/overview"
import { CampaignsPanel } from "@/components/gateready/campaigns"
import { BetsPanel } from "@/components/gateready/bets"
import { TasksPanel } from "@/components/gateready/tasks"
import { CapacityPanel } from "@/components/gateready/capacity"
import { DataPanel } from "@/components/gateready/data"
import { AnalystPanel } from "@/components/gateready/analyst"
import { putWorkspace } from "@/lib/client-workspace"
import type { HistoricalAnalytics } from "@/lib/analytics"
import type { WorkspaceResponse, WorkspaceState } from "@/lib/types"

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Unable to load this view.")
  return result as T
}

const pageTitles: Record<ViewKey, string> = {
  overview: "Growth overview",
  campaigns: "Campaign performance",
  bets: "Prioritized growth bets",
  tasks: "Experiment action board",
  capacity: "Capacity & forecast",
  data: "Source & data quality",
  analyst: "AI analyst",
}

export function AppShell() {
  const [activeView, setActiveView] = useState<ViewKey>("overview")
  const [date, setDate] = useState("")
  const [campaignFilter, setCampaignFilter] = useState("")
  const [startingDemo, setStartingDemo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveNotice, setSaveNotice] = useState("")
  const { data: workspace, error: workspaceError, isLoading: workspaceLoading, mutate: mutateWorkspace } = useSWR<WorkspaceResponse>("/api/workspace", fetchJson, { revalidateOnFocus: false })
  const query = new URLSearchParams()
  if (date) query.set("date", date)
  if (campaignFilter) query.set("campaign", campaignFilter)
  const historicalUrl = `/api/historical${query.size ? `?${query.toString()}` : ""}`
  const { data: history, error: historyError, isLoading: historyLoading } = useSWR<HistoricalAnalytics>(historicalUrl, fetchJson, { revalidateOnFocus: false })

  const state = workspace?.state
  const availableCampaigns = useMemo(() => state?.campaigns.map((campaign) => ({ id: campaign.campaignId, name: campaign.name })) ?? [], [state?.campaigns])
  const selectedDate = date || history?.snapshotDate || ""
  const displayedHistory = history

  async function startDemo() {
    if (startingDemo) return
    setStartingDemo(true)
    setSaveError("")
    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" } })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "The private demo could not be opened.")
      const verified = await mutateWorkspace()
      if (verified?.mode !== "demo") {
        throw new Error(window.self !== window.top
          ? "This browser blocked the demo session in the embedded preview. Open GateReady in a new tab, then try the demo again."
          : "The browser did not keep the demo session. Allow cookies for this site and try again.")
      }
      setSaveNotice("Private workspace opened. Changes will be saved to your isolated demo session.")
      setTimeout(() => setSaveNotice(""), 5000)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The private demo could not be opened.")
    } finally {
      setStartingDemo(false)
    }
  }

  async function saveState(nextState: WorkspaceState, action: string) {
    if (!workspace || workspace.mode !== "demo") throw new Error("Start a private demo to save changes.")
    if (saving) throw new Error("A save is already in progress. Try again in a moment.")
    setSaving(true)
    setSaveError("")
    setSaveNotice("")
    try {
      const saved = await putWorkspace({ expectedRevision: workspace.revision, state: nextState, action }) as WorkspaceResponse
      await mutateWorkspace(saved, { revalidate: false })
      setSaveNotice("Saved to your private workspace.")
      setTimeout(() => setSaveNotice(""), 3500)
    } catch (error) {
      if (error instanceof Error && error.message.includes("another tab")) await mutateWorkspace()
      setSaveError(error instanceof Error ? error.message : "Unable to save this change.")
      throw error
    } finally {
      setSaving(false)
    }
  }

  async function receiveWorkspace(next: WorkspaceResponse) {
    await mutateWorkspace(next, { revalidate: false })
    setSaveError("")
  }

  function afterImport(importedDate: string) {
    setDate(importedDate)
    setCampaignFilter("")
  }

  const demoActive = workspace?.mode === "demo"

  if (workspaceLoading && !workspace) {
    return <div className="gr-loading-screen"><span className="gr-loading-mark"><LoaderCircle className="gr-spin" size={22} aria-hidden="true" /></span><strong>Opening GateReady</strong><span>Loading the source-verified workspace…</span></div>
  }

  if (workspaceError || !workspace || !state) {
    return <main className="gr-error-screen"><div className="gr-error-mark">!</div><h1>Workspace is unavailable</h1><p>{workspaceError?.message || "The private demo could not be reached."}</p><button type="button" className="gr-button gr-button-primary" onClick={() => void mutateWorkspace()}>Retry connection</button></main>
  }

  return (
    <div className="gr-app-shell">
      <Sidebar active={activeView} onNavigate={setActiveView} demoActive={Boolean(demoActive)} />
      <main className="gr-main-area">
        <header className="gr-topbar">
          <div className="gr-topbar-left"><div className="gr-breadcrumb">Spring Fest <ChevronDown size={13} aria-hidden="true" /> <span>{pageTitles[activeView]}</span></div><span className="gr-topbar-divider" /><div className="gr-topbar-status"><CloudCheck size={14} aria-hidden="true" /><span>{saving ? "Saving…" : demoActive ? "Synced" : "Preview mode"}</span></div></div>
          <div className="gr-topbar-right">
            <label className="gr-top-control gr-date-control"><CalendarDays size={15} aria-hidden="true" /><span className="gr-sr-only">Historical snapshot date</span><input type="date" value={selectedDate} min={history?.range.start} max={history?.range.end} onChange={(event) => setDate(event.target.value)} aria-label="Historical snapshot date" /></label>
            <label className="gr-top-control gr-campaign-control"><Search size={14} aria-hidden="true" /><span className="gr-sr-only">Campaign filter</span><select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} aria-label="Filter analytics by campaign"><option value="">All campaigns</option>{availableCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}<option value="unattributed">Unattributed visits</option></select></label>
            <button type="button" className={`gr-security-badge${demoActive ? " is-active" : ""}`} title="A private, isolated demo workspace" aria-label={demoActive ? "Private isolated demo workspace" : "Read-only preview; no workspace changes are saved"}><ShieldCheck size={15} aria-hidden="true" /> <span>{demoActive ? "Private demo" : "Read only"}</span></button>
            {!demoActive ? <button type="button" className="gr-button gr-button-primary gr-top-start" onClick={() => void startDemo()} disabled={startingDemo}><Sparkles size={15} aria-hidden="true" /> {startingDemo ? "Opening…" : "Try the demo"}</button> : <span className="gr-top-avatar" aria-label="Growth team workspace">GT</span>}
          </div>
        </header>

        <div className="gr-main-scroll">
          <div className="gr-content-container">
            {(saveError || historyError) && <div className="gr-toast gr-toast-error" role="alert">{saveError || historyError?.message}<button type="button" onClick={() => { setSaveError(""); void mutateWorkspace(); }}>Dismiss</button></div>}
            {saveNotice && <div className="gr-toast gr-toast-success" role="status"><CloudCheck size={15} aria-hidden="true" />{saveNotice}</div>}
            {historyLoading && !displayedHistory ? <div className="gr-data-loading"><LoaderCircle size={18} className="gr-spin" aria-hidden="true" /> Loading the selected snapshot…</div> : null}
            {displayedHistory && <>
              {activeView === "overview" && <OverviewPanel history={displayedHistory} state={state} onNavigate={setActiveView} />}
              {activeView === "campaigns" && <CampaignsPanel history={displayedHistory} state={state} filter={campaignFilter} demoActive={Boolean(demoActive)} onSave={saveState} onStartDemo={() => void startDemo()} />}
              {activeView === "bets" && <BetsPanel history={displayedHistory} state={state} demoActive={Boolean(demoActive)} onSave={saveState} onStartDemo={() => void startDemo()} />}
              {activeView === "tasks" && <TasksPanel state={state} demoActive={Boolean(demoActive)} onSave={saveState} onStartDemo={() => void startDemo()} />}
              {activeView === "capacity" && <CapacityPanel history={displayedHistory} state={state} demoActive={Boolean(demoActive)} onSave={saveState} onStartDemo={() => void startDemo()} />}
              {activeView === "data" && <DataPanel history={displayedHistory} state={state} demoActive={Boolean(demoActive)} hasSourceOverride={Boolean(workspace.hasSourceOverride)} onSave={saveState} onStartDemo={() => void startDemo()} onDateImported={afterImport} />}
              {activeView === "analyst" && <AnalystPanel history={displayedHistory} state={state} date={selectedDate} campaignId={campaignFilter} demoActive={Boolean(demoActive)} aiConfigured={workspace.aiConfigured} aiModel={workspace.aiModel} onWorkspaceUpdate={receiveWorkspace} onSave={saveState} onStartDemo={() => void startDemo()} />}
            </>}
          </div>
          <footer className="gr-footer"><span>GateReady <i>×</i> Spring Fest attendee growth</span><span>Source-led · human-reviewed · capacity-aware</span></footer>
        </div>
      </main>
    </div>
  )
}
