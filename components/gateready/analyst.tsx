"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"
import { Bot, Check, CircleHelp, CornerDownLeft, FileText, LoaderCircle, Plus, RotateCcw, Send, Sparkles, UserRound } from "lucide-react"
import type { HistoricalAnalytics } from "@/lib/analytics"
import type { ChatEntry, GrowthTask, WorkspaceResponse, WorkspaceState } from "@/lib/types"
import { formatDate } from "@/components/gateready/format"

const starters = [
  "Which channel has the strongest verified arrival rate—and what is the sample size?",
  "Compare the lowest-cost and highest-cost sources without claiming causal lift.",
  "Model 3,100 confirmed registrations at the historical arrival rate. What changes in the base case?",
  "Draft an owner-assigned test to reduce the confirmed-to-arrival gap.",
]

function timeLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

export function AnalystPanel({ history, state, date, campaignId, demoActive, aiConfigured, aiModel, onWorkspaceUpdate, onSave, onStartDemo }: {
  history: HistoricalAnalytics
  state: WorkspaceState
  date: string
  campaignId: string
  demoActive: boolean
  aiConfigured: boolean
  aiModel: string
  onWorkspaceUpdate: (workspace: WorkspaceResponse) => void
  onSave: (next: WorkspaceState, action: string) => Promise<void>
  onStartDemo: () => void
}) {
  const [question, setQuestion] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  async function ask(value = question) {
    const prompt = value.trim()
    if (!prompt || busy) return
    if (!demoActive) {
      setError("Start a private demo before asking the analyst. The conversation is saved only to that workspace.")
      return
    }
    if (!aiConfigured) {
      setError("Gemini needs GEMINI_API_KEY in the project environment. Add it, then refresh this page.")
      return
    }
    setError("")
    setNotice("")
    setBusy(true)
    setQuestion(prompt)
    try {
      const response = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, date, campaignId: campaignId || undefined }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "The analysis could not be completed.")
      onWorkspaceUpdate({ mode: "demo", revision: result.revision, state: result.state, aiConfigured, aiModel, hasSourceOverride: result.hasSourceOverride })
      setQuestion("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The analysis could not be completed.")
    } finally {
      setBusy(false)
    }
  }

  async function confirmTask(message: ChatEntry) {
    const proposal = message.taskProposal
    if (!proposal || proposal.confirmed === true) return
    const id = `ai-task-${message.id}`
    if (state.tasks.some((task) => task.id === id)) return
    const task: GrowthTask = {
      id,
      title: String(proposal.title ?? "").slice(0, 180),
      description: String(proposal.description ?? "").slice(0, 1000),
      owner: String(proposal.owner ?? "Growth team").slice(0, 100),
      dueDate: String(proposal.dueDate ?? date).slice(0, 10),
      priority: proposal.priority === "High" || proposal.priority === "Low" ? proposal.priority : "Medium",
      status: "Todo",
      campaignId: typeof proposal.campaignId === "string" && state.campaigns.some((campaign) => campaign.campaignId === proposal.campaignId) ? proposal.campaignId : null,
      createdAt: new Date().toISOString(),
    }
    const conversation = state.conversation.map((entry) => entry.id === message.id ? { ...entry, taskProposal: { ...proposal, confirmed: true } } : entry)
    try {
      await onSave({ ...state, tasks: [...state.tasks, task], conversation }, "assistant_task")
      setNotice("Task confirmed and saved to the action board.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The proposed task could not be saved.")
    }
  }

  async function clearConversation() {
    if (!state.conversation.length) return
    try {
      await onSave({ ...state, conversation: [] }, "ai_chat")
      setNotice("Saved analyst conversation cleared from this demo workspace.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to clear this conversation.")
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return
      event.preventDefault()
      void ask()
    }
  }

  return (
    <div className="gr-page-stack gr-analyst-page">
      <section className="gr-welcome-row"><div><div className="gr-eyebrow">GEMINI · FUNCTION-TOOL ANALYSIS · SNAPSHOT {history.snapshotDate}</div><h1>Ask what the data can support.</h1><p className="gr-page-intro">A focused analyst for source-verified campaign metrics, transparent scenarios, and draft tasks that wait for your confirmation.</p></div><span className={`gr-ai-status-pill ${aiConfigured ? "is-ready" : "is-missing"}`}><span /> {!demoActive ? "Private demo required" : aiConfigured ? `${aiModel} ready` : "Gemini key needed"}</span></section>

      <section className="gr-analyst-layout">
        <div className="gr-card gr-chat-panel">
          <div className="gr-chat-heading"><span className="gr-chat-avatar"><Bot size={19} aria-hidden="true" /></span><div><strong>GateReady analyst</strong><span>Source-aware · private thread · saved to this workspace</span></div><button type="button" className="gr-icon-button gr-clear-chat" onClick={() => void clearConversation()} disabled={!demoActive || busy || !state.conversation.length} aria-label="Clear saved analyst conversation" title="Clear saved conversation"><RotateCcw size={15} aria-hidden="true" /></button></div>
          <div className="gr-chat-context"><span className="gr-context-dot" /> Context: {history.eventName} · {history.snapshotDate}{campaignId ? ` · ${history.campaigns[0]?.name ?? "Selected campaign"}` : " · all campaigns"}<span className="gr-context-lock"><CircleHelp size={13} aria-hidden="true" /> Synthetic source · no causal claim</span></div>
          <div className="gr-chat-messages" aria-live="polite" aria-relevant="additions text">
            {!state.conversation.length && <div className="gr-chat-welcome"><span className="gr-chat-welcome-mark"><Sparkles size={19} aria-hidden="true" /></span><h2>Start with a decision.</h2><p>I can compare observed campaign results, calculate a transparent arrival scenario, or draft a task. I cannot infer weather, venue capacity, or causal lift from this workbook.</p><div className="gr-starter-list">{starters.map((starter) => <button key={starter} type="button" className="gr-starter-chip" onClick={() => void ask(starter)} disabled={busy || !demoActive || !aiConfigured}>{starter}<CornerDownLeft size={13} aria-hidden="true" /></button>)}</div></div>}
            {state.conversation.map((message) => <div className={`gr-chat-message ${message.role === "assistant" ? "assistant" : "user"}`} key={message.id}><span className={`gr-message-avatar ${message.role}`} aria-hidden="true">{message.role === "assistant" ? <Bot size={15} /> : <UserRound size={15} />}</span><div className="gr-message-bubble"><div className="gr-message-meta"><strong>{message.role === "assistant" ? "GateReady analyst" : "You"}</strong><span>{timeLabel(message.createdAt)}</span></div><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{message.text}</ReactMarkdown>{message.taskProposal && <div className="gr-task-proposal"><div className="gr-task-proposal-title"><FileText size={15} aria-hidden="true" /><strong>Draft action · {String(message.taskProposal.priority ?? "Medium")}</strong></div><div className="gr-proposal-details"><strong>{String(message.taskProposal.title ?? "")}</strong><span>{String(message.taskProposal.owner ?? "Growth team")} · due {formatDate(String(message.taskProposal.dueDate ?? date))}</span><p>{String(message.taskProposal.description ?? "")}</p></div>{message.taskProposal.confirmed === true || state.tasks.some((task) => task.id === `ai-task-${message.id}`) ? <span className="gr-proposal-confirmed"><Check size={14} aria-hidden="true" /> Confirmed · saved to Action board</span> : <button type="button" className="gr-button gr-button-primary gr-confirm-task" onClick={() => void confirmTask(message)} disabled={!demoActive}><Check size={14} aria-hidden="true" /> Confirm and add to action board</button>}</div>}</div></div>)}
            {busy && <div className="gr-chat-typing"><span><LoaderCircle size={15} className="gr-spin" aria-hidden="true" /></span> Reading the selected snapshot and checking the numbers…</div>}
          </div>
          {error && <div className="gr-chat-error" role="alert">{error}</div>}{notice && <div className="gr-chat-notice" role="status">{notice}</div>}
          <form className="gr-chat-composer" onSubmit={(event) => { event.preventDefault(); void ask() }}>
            <label className="gr-sr-only" htmlFor="gr-analyst-question">Ask the GateReady analyst</label><textarea id="gr-analyst-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown} placeholder={!demoActive ? "Draft a question, then open a private demo to send it…" : aiConfigured ? "Ask about verified arrivals, channel efficiency, or a scenario…" : "Gemini is not configured for this deployment…"} maxLength={2500} rows={2} disabled={busy} />
            <div className="gr-composer-footer"><span><CircleHelp size={13} aria-hidden="true" /> Private saved thread · avoid entering sensitive personal data</span><button type="submit" className="gr-send-button" disabled={!demoActive || !aiConfigured || busy || !question.trim()} aria-label="Send question">{busy ? <LoaderCircle size={17} className="gr-spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}</button></div>
          </form>
        </div>

        <aside className="gr-card gr-analyst-rail">
          <div className="gr-rail-heading"><div className="gr-ai-rail-icon"><Sparkles size={17} aria-hidden="true" /></div><div><span className="gr-section-kicker">WHAT IT CAN DO</span><h2>Calculate, don&apos;t guess.</h2></div></div>
          <div className="gr-capability-list"><div><strong>Read source history</strong><p>Uses stable IDs, date cutoffs, verified external check-ins, and explicit campaign attribution.</p></div><div><strong>Compare real channels</strong><p>Calls typed functions for campaign metrics and separates descriptive rates from causal lift.</p></div><div><strong>Model arrival scenarios</strong><p>Recomputes an attendance case and applies the current working-capacity assumption.</p></div><div><strong>Draft tracked actions</strong><p>Offers an owner and due date, but waits for you to confirm before saving.</p></div></div>
          <div className="gr-rail-separator" />
          <div className="gr-guardrail"><span><CircleHelp size={14} aria-hidden="true" /> Analyst guardrails</span><ul><li>No invented weather or travel explanation</li><li>No backfilled check-in attribution</li><li>No claim of randomized lift</li><li>No silent task creation</li></ul></div>
          {!demoActive && <button type="button" className="gr-button gr-button-primary gr-full-button" onClick={onStartDemo}>Open private demo</button>}
          {demoActive && !aiConfigured && <div className="gr-ai-key-hint"><span>Setup required</span><p>Add the server-only <code>GEMINI_API_KEY</code> project environment variable. The browser never receives the key.</p></div>}
        </aside>
      </section>
    </div>
  )
}
