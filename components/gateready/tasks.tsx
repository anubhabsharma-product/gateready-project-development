"use client"

import { useMemo, useState } from "react"
import { ArrowRight, CalendarClock, Check, Circle, CircleAlert, ListChecks, Plus, Trash2 } from "lucide-react"
import type { GrowthTask, WorkspaceState } from "@/lib/types"
import { formatDate } from "@/components/gateready/format"

function isoOffset(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function TasksPanel({ state, demoActive, onSave, onStartDemo }: { state: WorkspaceState; demoActive: boolean; onSave: (next: WorkspaceState, action: string) => Promise<void>; onStartDemo: () => void }) {
  const [filter, setFilter] = useState<"All" | GrowthTask["status"]>("All")
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ title: "", description: "", owner: state.campaigns[0]?.scenario.owner ?? "Growth team", dueDate: isoOffset(7), priority: "Medium" as GrowthTask["priority"], campaignId: "" })
  const tasks = useMemo(() => state.tasks.filter((task) => filter === "All" || task.status === filter).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [filter, state.tasks])
  const completed = state.tasks.filter((task) => task.status === "Done").length
  const progress = state.tasks.length ? completed / state.tasks.length : 0

  async function saveTasks(nextTasks: GrowthTask[]) {
    setError("")
    try {
      await onSave({ ...state, tasks: nextTasks }, "task_change")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save that task update.")
    }
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.title.trim() || !draft.description.trim()) return setError("Add a title and a measurable next step.")
    const task: GrowthTask = {
      id: crypto.randomUUID(),
      title: draft.title.trim(), description: draft.description.trim(), owner: draft.owner.trim() || "Growth team", dueDate: draft.dueDate,
      priority: draft.priority, status: "Todo", campaignId: draft.campaignId || null, createdAt: new Date().toISOString(),
    }
    setBusyId(task.id)
    try {
      await onSave({ ...state, tasks: [...state.tasks, task] }, "task_change")
      setDraft({ title: "", description: "", owner: state.campaigns[0]?.scenario.owner ?? "Growth team", dueDate: isoOffset(7), priority: "Medium", campaignId: "" })
      setShowForm(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create the task.")
    } finally {
      setBusyId(null)
    }
  }

  function updateStatus(task: GrowthTask) {
    const status = task.status === "Todo" ? "In progress" : task.status === "In progress" ? "Done" : "Todo"
    void saveTasks(state.tasks.map((item) => item.id === task.id ? { ...item, status } : item))
  }

  function deleteTask(task: GrowthTask) {
    if (typeof window !== "undefined" && !window.confirm(`Remove “${task.title}” from this private action board?`)) return
    void saveTasks(state.tasks.filter((item) => item.id !== task.id))
  }

  return (
    <div className="gr-page-stack">
      <section className="gr-welcome-row"><div><h1>Action board</h1><p className="gr-page-intro">Track owners, due dates, and progress for planned experiments.</p></div><button type="button" className="gr-button gr-button-primary" disabled={!demoActive} onClick={() => setShowForm((show) => !show)}><Plus size={15} aria-hidden="true" /> New action</button></section>
      {!demoActive && <div className="gr-notice gr-demo-banner"><div><strong>Action board is a read-only preview.</strong><p>Start a private demo to assign owners and persist status changes across reloads.</p></div><button type="button" className="gr-button gr-button-primary" onClick={onStartDemo}>Start interactive demo</button></div>}
      {error && <div className="gr-form-error" role="alert">{error}</div>}

      <section className="gr-task-summary-grid">
        <article className="gr-card gr-task-summary"><span>Open actions</span><strong>{state.tasks.filter((task) => task.status !== "Done").length}</strong></article>
        <article className="gr-card gr-task-summary"><span>In progress</span><strong>{state.tasks.filter((task) => task.status === "In progress").length}</strong></article>
        <article className="gr-card gr-task-summary"><span>Completed</span><strong>{completed}</strong></article>
        <article className="gr-card gr-task-progress"><div><span>Board progress</span><strong>{Math.round(progress * 100)}%</strong></div><div className="gr-progress-track"><span style={{ width: `${progress * 100}%` }} /></div><small>{completed} of {state.tasks.length} items complete</small></article>
      </section>

      {showForm && <form className="gr-card gr-task-form" onSubmit={createTask}>
        <div className="gr-panel-heading"><div><h2>New action</h2></div><button type="button" className="gr-icon-button" onClick={() => setShowForm(false)} aria-label="Close task form">×</button></div>
        <div className="gr-task-form-grid"><label>Action title<input value={draft.title} maxLength={180} required onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Launch the 10-club pilot" /></label><label>Owner<input list="gr-team-owners" value={draft.owner} maxLength={100} required onChange={(event) => setDraft({ ...draft, owner: event.target.value })} /><datalist id="gr-team-owners">{[...new Set(state.campaigns.map((campaign) => campaign.scenario.owner))].map((owner) => <option key={owner} value={owner} />)}<option value="Growth team" /></datalist></label><label className="gr-task-description">Measurable next step<textarea value={draft.description} maxLength={1000} required rows={3} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What will the owner deliver, and how will success be measured?" /></label><label>Due date<input type="date" value={draft.dueDate} required onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label><label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as GrowthTask["priority"] })}><option>High</option><option>Medium</option><option>Low</option></select></label><label>Campaign link<select value={draft.campaignId} onChange={(event) => setDraft({ ...draft, campaignId: event.target.value })}><option value="">No campaign link</option>{state.campaigns.map((campaign) => <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.name}</option>)}</select></label></div>
        <div className="gr-editor-actions"><button type="button" className="gr-button gr-button-ghost" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="gr-button gr-button-primary" disabled={Boolean(busyId)}><Plus size={14} aria-hidden="true" /> Save action</button></div>
      </form>}

      <section className="gr-card gr-task-board">
        <div className="gr-task-board-heading"><div><h2>Tasks</h2></div><div className="gr-toggle-group gr-task-filters" role="group" aria-label="Filter action board">{(["All", "Todo", "In progress", "Done"] as const).map((status) => <button key={status} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)}>{status}</button>)}</div></div>
        <div className="gr-task-list">
          {tasks.map((task) => {
            const linkedCampaign = state.campaigns.find((campaign) => campaign.campaignId === task.campaignId)
            const overdue = task.status !== "Done" && task.dueDate < new Date().toISOString().slice(0, 10)
            return <article className={`gr-task-row ${task.status === "Done" ? "is-complete" : ""}`} key={task.id}>
              <button type="button" className="gr-task-check" onClick={() => updateStatus(task)} disabled={!demoActive} aria-label={`Change ${task.title} status from ${task.status}`} title="Cycle task status">{task.status === "Done" ? <Check size={16} aria-hidden="true" /> : task.status === "In progress" ? <span className="gr-task-progress-dot" /> : <Circle size={17} aria-hidden="true" />}</button>
              <div className="gr-task-copy"><div className="gr-task-title-row"><h3>{task.title}</h3><span className={`gr-task-priority ${task.priority.toLowerCase()}`}>{task.priority}</span></div><p>{task.description}</p><div className="gr-task-meta"><span><span className="gr-task-avatar">{task.owner.slice(0, 1)}</span>{task.owner}</span><span className={overdue ? "is-overdue" : ""}><CalendarClock size={13} aria-hidden="true" />{overdue && <CircleAlert size={12} aria-hidden="true" />}{formatDate(task.dueDate)}</span>{linkedCampaign && <span className="gr-task-campaign">{linkedCampaign.name}</span>}<span className="gr-task-status">{task.status}</span></div></div>
              <div className="gr-task-actions"><button type="button" className="gr-icon-button" onClick={() => updateStatus(task)} disabled={!demoActive} aria-label={`Advance ${task.title} from ${task.status}`}>{task.status === "Done" ? <Circle size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}</button><button type="button" className="gr-icon-button gr-delete-task" onClick={() => deleteTask(task)} disabled={!demoActive} aria-label={`Delete ${task.title}`}><Trash2 size={15} aria-hidden="true" /></button></div>
            </article>
          })}
          {!tasks.length && <div className="gr-empty-state"><ListChecks size={27} aria-hidden="true" /><strong>No tasks match this filter.</strong><span>Add an action from a growth bet or create a custom task.</span><button type="button" className="gr-inline-link" onClick={() => setShowForm(true)} disabled={!demoActive}>Create a task <ArrowRight size={14} aria-hidden="true" /></button></div>}
        </div>
      </section>
    </div>
  )
}
