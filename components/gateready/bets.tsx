"use client"

import { useState } from "react"
import { ArrowRight, BadgeCheck, CircleHelp, FlaskConical, Plus, ShieldAlert } from "lucide-react"
import type { HistoricalAnalytics } from "@/lib/analytics"
import type { GrowthTask, WorkspaceState } from "@/lib/types"
import { formatINRCompact, formatNumber, formatPercent } from "@/components/gateready/format"
import { GROWTH_BETS, getGrowthPlanTotals, scoreGrowthBet } from "@/lib/strategy"

function nextDueDate(days: number) {
  const due = new Date()
  due.setDate(due.getDate() + days)
  return due.toISOString().slice(0, 10)
}

export function BetsPanel({ history, state, demoActive, onSave, onStartDemo }: { history: HistoricalAnalytics; state: WorkspaceState; demoActive: boolean; onSave: (next: WorkspaceState, action: string) => Promise<void>; onStartDemo: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const plan = getGrowthPlanTotals()

  async function addTask(betId: string) {
    const bet = GROWTH_BETS.find((item) => item.id === betId)
    if (!bet || state.tasks.some((task) => task.id === `bet-${bet.id}`)) {
      setMessage("That bet already has an action on the board.")
      return
    }
    const linkedCampaign = state.campaigns.find((campaign) => bet.sourceChannels.includes(campaign.channel))
    const owner = linkedCampaign?.scenario.owner || "Growth team"
    const task: GrowthTask = {
      id: `bet-${bet.id}`,
      title: `Pilot: ${bet.title}`,
      description: `${bet.test} When to expand: ${bet.scale}`,
      owner,
      dueDate: nextDueDate(14),
      priority: bet.rank <= 3 ? "High" : "Medium",
      status: "Todo",
      campaignId: linkedCampaign?.campaignId ?? null,
      createdAt: new Date().toISOString(),
    }
    setBusy(bet.id)
    try {
      await onSave({ ...state, tasks: [...state.tasks, task] }, "task_change")
      setMessage(`${bet.title} was added to the action board.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create the action.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="gr-page-stack">
      <section className="gr-welcome-row"><div><h1>Growth bets</h1><p className="gr-page-intro">Five proposed experiments for the six-week plan.</p></div><div className="gr-score-explainer"><strong>How bets are scored</strong><span>Impact 40%, evidence 30%, ease 20%, speed 10%</span></div></section>

      <div className="gr-plan-summary-grid">
        <div className="gr-card gr-plan-total"><span>Proposed budget</span><strong>{formatINRCompact(plan.budget)}</strong><small>Total for five pilots</small></div>
        <div className="gr-card gr-plan-total"><span>Base case before overlap</span><strong>+{formatNumber(plan.grossBase)}</strong><small>Estimated extra arrivals</small></div>
        <div className="gr-card gr-plan-total"><span>Base case after overlap</span><strong>+{formatNumber(state.assumptions.baseGrossUplift - state.assumptions.baseOverlapDeduction)}</strong><small>Gross +{formatNumber(state.assumptions.baseGrossUplift)} − {formatNumber(state.assumptions.baseOverlapDeduction)} overlap</small></div>
        <div className="gr-card gr-plan-total"><span>Stretch case after overlap</span><strong>+{formatNumber(state.assumptions.stretchGrossUplift - state.assumptions.stretchOverlapDeduction)}</strong><small>Gross +{formatNumber(state.assumptions.stretchGrossUplift)} − {formatNumber(state.assumptions.stretchOverlapDeduction)} overlap</small></div>
      </div>

      {!demoActive && <div className="gr-notice gr-demo-banner"><div><strong>This view is read-only.</strong><p>Open a private workspace to add pilot tasks.</p></div><button type="button" className="gr-button gr-button-primary" onClick={onStartDemo}><Plus size={15} aria-hidden="true" /> Open private workspace</button></div>}
      {message && <div className="gr-inline-feedback" role="status">{message}</div>}

      <section className="gr-bet-list" aria-label="Prioritized marketing experiments">
        {GROWTH_BETS.map((bet) => {
          const sourceMatches = history.allCampaigns.filter((campaign) => bet.sourceChannels.includes(campaign.channel))
          const confirmed = sourceMatches.reduce((sum, campaign) => sum + campaign.confirmed, 0)
          const attendees = sourceMatches.reduce((sum, campaign) => sum + campaign.attendees, 0)
          const sourceArrivals = sourceMatches.length ? attendees : history.overall.attendees
          const sourceSpend = sourceMatches.reduce((sum, campaign) => sum + campaign.spendInr, 0)
          const arrivalRate = bet.id === "arrival-crm" ? history.overall.confirmedArrivalRate : confirmed > 0 ? attendees / confirmed : null
          const costPerArrival = bet.id === "arrival-crm" ? history.overall.costPerVerifiedAttendee : attendees > 0 ? sourceSpend / attendees : null
          const alreadyAdded = state.tasks.some((task) => task.id === `bet-${bet.id}`)
          return (
            <article className="gr-card gr-bet-card" key={bet.id}>
              <div className="gr-bet-copy">
                <div className="gr-bet-title-row"><h2>{bet.title}</h2><div className="gr-bet-score"><span>Score</span><strong>{scoreGrowthBet(bet)}<small>/100</small></strong></div></div>
                <div className="gr-bet-meta"><span><FlaskConical size={14} aria-hidden="true" /> {bet.week}</span><span>{bet.ownerRole}</span><span>{formatINRCompact(bet.budgetInr)} proposed</span></div>
                <div className="gr-bet-evidence">
                  <div className="gr-evidence-card"><span>Workbook source</span><strong>{sourceMatches.length ? sourceMatches.map((campaign) => campaign.name).join(" and ") : "Confirmed registrants"}</strong><small>{formatNumber(sourceArrivals)} verified arrivals{arrivalRate != null && ` (${formatPercent(arrivalRate)} of latest confirmed)`}</small></div>
                  <div className="gr-evidence-card"><span>Observed cost / arrival</span><strong>{formatINRCompact(costPerArrival)}</strong><small>{sourceMatches.length ? `${formatINRCompact(sourceSpend)} net spend in the workbook` : "Across all campaigns"}</small></div>
                  <div className="gr-evidence-card"><span>Estimated extra arrivals</span><strong>+{formatNumber(bet.baseGrossAttendees)} <small>base</small>, +{formatNumber(bet.stretchGrossAttendees)} <small>stretch</small></strong><small>Before subtracting overlap</small></div>
                </div>
                <div className="gr-bet-test"><div><span className="gr-bet-label"><BadgeCheck size={13} aria-hidden="true" /> Test</span><p>{bet.test}</p></div><div><span className="gr-bet-label"><ArrowRight size={13} aria-hidden="true" /> Scale gate</span><p>{bet.scale}</p></div><div><span className="gr-bet-label gr-bet-stop"><ShieldAlert size={13} aria-hidden="true" /> Stop gate</span><p>{bet.stop}</p></div></div>
              </div>
              <button type="button" className={`gr-button ${alreadyAdded ? "gr-button-soft" : "gr-button-outline"} gr-bet-action`} onClick={() => addTask(bet.id)} disabled={!demoActive || alreadyAdded || busy === bet.id} title={!demoActive ? "Start a demo to save a task" : undefined}>{alreadyAdded ? "On action board" : busy === bet.id ? "Saving…" : <><Plus size={14} aria-hidden="true" /> Add pilot task</>}</button>
            </article>
          )
        })}
      </section>
      <p className="gr-source-method"><CircleHelp size={14} aria-hidden="true" /> Workbook rates describe past results. Use a holdout or matched group to test whether a pilot caused a change before shifting budget.</p>
    </div>
  )
}
