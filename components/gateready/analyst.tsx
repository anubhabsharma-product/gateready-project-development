"use client"

import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"
import { Bot, Check, FileText, LoaderCircle, RotateCcw, Send, UserRound } from "lucide-react"
import type { HistoricalAnalytics } from "@/lib/analytics"
import type { ChatEntry, GrowthTask, WorkspaceResponse, WorkspaceState } from "@/lib/types"
import { formatDate } from "@/components/gateready/format"

const starters = [
  "Which channel had the highest verified arrival rate? How many people were included?",
  "Which channels had the lowest and highest cost per verified visitor?",
  "How would 3,100 confirmations change the base forecast?",
  "Draft a test to get more confirmed registrants to attend.",
]

function timeLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

export function AnalystPanel({ history, state, date, campaignId, demoActive, aiConfigured, aiModel, onWorkspaceUpdate, onSave, onStartDemo, startingDemo, demoError }: {
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
  startingDemo: boolean
  demoError: string
}) {
  const [question, setQuestion] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const messages = messagesRef.current
    if (messages) messages.scrollTop = messages.scrollHeight
  }, [state.conversation, busy, notice])

  async function ask(value = question) {
    const prompt = value.trim()
    if (!prompt || busy) return
    if (!demoActive) {
      setError("Open a private workspace to ask the analyst.")
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
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The proposed task could not be saved.")
    }
  }

  async function clearConversation() {
    if (!state.conversation.length) return
    try {
      await onSave({ ...state, conversation: [] }, "ai_chat")
      setNotice("Conversation cleared.")
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

  const campaignName = history.allCampaigns.find((campaign) => campaign.campaignId === campaignId)?.name
  const campaignLabel = campaignId === "unattributed" ? "Unattributed visits" : campaignName ?? "All campaigns"
  const canChat = demoActive && aiConfigured

  return (
    <section className="gr-chat-panel" aria-label="Analyst conversation">
      <div className="gr-chat-context">
        <p>{history.eventName}, {formatDate(history.snapshotDate)} ({campaignLabel})</p>
        <button type="button" className="gr-icon-button gr-clear-chat" onClick={() => void clearConversation()} disabled={!demoActive || busy || !state.conversation.length} aria-label="Clear saved analyst conversation" title="Clear saved conversation"><RotateCcw size={18} aria-hidden="true" /></button>
      </div>
      <div className="gr-chat-messages" ref={messagesRef} role="log" aria-label="Messages" aria-relevant="additions text" tabIndex={0}>
        {!state.conversation.length && (
          <div className="gr-chat-welcome">
            <h3>{canChat ? "Suggested questions" : "No messages yet"}</h3>
            {canChat && <div className="gr-starter-list">{starters.map((starter) => <button key={starter} type="button" className="gr-starter-chip" onClick={() => void ask(starter)} disabled={busy}>{starter}</button>)}</div>}
          </div>
        )}
        {state.conversation.map((message) => (
          <div className={`gr-chat-message ${message.role}`} key={message.id}>
            <span className={`gr-message-avatar ${message.role}`} aria-hidden="true">{message.role === "assistant" ? <Bot size={17} /> : <UserRound size={17} />}</span>
            <div className="gr-message-bubble">
              <div className="gr-message-meta"><strong>{message.role === "assistant" ? "GateReady analyst" : "You"}</strong><span>{timeLabel(message.createdAt)}</span></div>
              <div className="gr-message-content"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{message.text}</ReactMarkdown></div>
              {message.taskProposal && (
                <div className="gr-task-proposal">
                  <div className="gr-task-proposal-title"><FileText size={16} aria-hidden="true" /><strong>Draft action ({String(message.taskProposal.priority ?? "Medium")} priority)</strong></div>
                  <div className="gr-proposal-details">
                    <strong>{String(message.taskProposal.title ?? "")}</strong>
                    <span>{String(message.taskProposal.owner ?? "Growth team")}, due {formatDate(String(message.taskProposal.dueDate ?? date))}</span>
                    <p>{String(message.taskProposal.description ?? "")}</p>
                  </div>
                  {message.taskProposal.confirmed === true || state.tasks.some((task) => task.id === `ai-task-${message.id}`)
                    ? <span className="gr-proposal-confirmed"><Check size={16} aria-hidden="true" /> Saved to the action board</span>
                    : <button type="button" className="gr-button gr-button-primary" onClick={() => void confirmTask(message)} disabled={!demoActive}><Check size={16} aria-hidden="true" /> Confirm and add to action board</button>}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="gr-chat-typing"><LoaderCircle size={16} className="gr-spin" aria-hidden="true" /> Checking the snapshot…</div>}
      </div>
      {!demoActive && (
        <div className="gr-chat-availability">
          <span>Open a private workspace to send messages.</span>
          <button type="button" className="gr-button gr-button-primary" onClick={onStartDemo} disabled={startingDemo}>{startingDemo ? "Opening…" : "Open private workspace"}</button>
        </div>
      )}
      {demoActive && !aiConfigured && <p className="gr-chat-availability">The analyst is unavailable until Gemini is configured.</p>}
      {(error || (!demoActive && demoError)) && <div className="gr-chat-error" role="alert">{error || demoError}</div>}
      {notice && <div className="gr-chat-notice" role="status">{notice}</div>}
      <form className="gr-chat-composer" onSubmit={(event) => { event.preventDefault(); void ask() }}>
        <label className="gr-sr-only" htmlFor="gr-analyst-question">Ask the GateReady analyst</label>
        <textarea id="gr-analyst-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown} placeholder="Type a question" maxLength={2500} rows={2} disabled={busy} />
        <div className="gr-composer-footer">
          <span>Messages are saved in this workspace. Avoid sharing sensitive personal data.</span>
          <button type="submit" className="gr-send-button" disabled={!canChat || busy || !question.trim()} aria-label="Send question">{busy ? <LoaderCircle size={19} className="gr-spin" aria-hidden="true" /> : <Send size={19} aria-hidden="true" />}</button>
        </div>
      </form>
    </section>
  )
}
