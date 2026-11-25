"use client"

import { useState } from "react"
import { ArrowRight, BadgeCheck, CircleHelp, FlaskConical, Plus, ShieldAlert } from "lucide-react"
import type { HistoricalAnalytics } from "@/lib/analytics"
import type { GrowthCampaign, GrowthTask, WorkspaceState } from "@/lib/types"
import { formatINRCompact, formatNumber, formatPercent } from "@/components/gateready/format"
import { GROWTH_BETS, getGrowthPlanTotals, scoreGrowthBet } from "@/lib/strategy"

function matchChannels(campaigns: GrowthCampaign[], channels: string[]) {
  return campaigns.filter((campaign) => channels.includes(campaign.channel))
}

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
      description: `${bet.test} Scale/stop guardrail: ${bet.scale}`,
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
      <section className="gr-welcome-row"><div><div className="gr-eyebrow">SIX-WEEK ACQUISITION PLAN · STRATEGIC HYPOTHESES</div><h1>Five bets. One arrival goal.</h1><p className="gr-page-intro">Ranked on expected outcome, strength of source evidence, execution effort, and speed to learn—not on reach alone.</p></div><div className="gr-score-explainer"><strong>Weighted score</strong><span>Impact 40% · Evidence 30% · Ease 20% · Speed 10%</span></div></section>

      <div className="gr-plan-summary-grid">
        <div className="gr-card gr-plan-total"><span>Plan envelope</span><strong>{formatINRCompact(plan.budget)}</strong><small>Five proposed pilots · budget assumption</small></div>
        <div className="gr-card gr-plan-total"><span>Base-case gross uplift</span><strong>+{formatNumber(plan.grossBase)}</strong><small>Before a portfolio overlap deduction</small></div>
        <div className="gr-card gr-plan-total"><span>Net base-case uplift</span><strong>+{formatNumber(state.assumptions.baseGrossUplift - state.assumptions.baseOverlapDeduction)}</strong><small>Gross +{formatNumber(state.assumptions.baseGrossUplift)} − {formatNumber(state.assumptions.baseOverlapDeduction)} overlap</small></div>
        <div className="gr-card gr-plan-total"><span>Net stretch uplift</span><strong>+{formatNumber(state.assumptions.stretchGrossUplift - state.assumptions.stretchOverlapDeduction)}</strong><small>Gross +{formatNumber(state.assumptions.stretchGrossUplift)} − {formatNumber(state.assumptions.stretchOverlapDeduction)} overlap</small></div>
      </div>

      {!demoActive && <div className="gr-notice gr-demo-banner"><div><strong>Open a private demo to turn a bet into a tracked task.</strong><p>Rankings and source evidence remain visible in read-only mode.</p></div><button type="button" className="gr-button gr-button-primary" onClick={onStartDemo}><Plus size={15} aria-hidden="true" /> Start interactive demo</button></div>}
      {message && <div className="gr-inline-feedback" role="status">{message}</div>}

      <section className="gr-bet-list" aria-label="Prioritized marketing experiments">
        {GROWTH_BETS.map((bet) => {
          const matches = matchChannels(state.campaigns, bet.sourceChannels)
          const sourceMatches = history.allCampaigns.filter((campaign) => bet.sourceChannels.includes(campaign.channel))
          const confirmed = sourceMatches.reduce((sum, campaign) => sum + campaign.confirmed, 0)
          const attendees = sourceMatches.reduce((sum, campaign) => sum + campaign.attendees, 0)
          const sourceSpend = sourceMatches.reduce((sum, campaign) => sum + campaign.spendInr, 0)
          const arrivalRate = bet.id === "arrival-crm" ? history.overall.confirmedArrivalRate : confirmed > 0 ? attendees / confirmed : null
          const costPerArrival = bet.id === "arrival-crm" ? history.overall.costPerVerifiedAttendee : attendees > 0 ? sourceSpend / attendees : null
          const alreadyAdded = state.tasks.some((task) => task.id === `bet-${bet.id}`)
          return (
            <article className="gr-card gr-bet-card" key={bet.id}>
              <div className="gr-bet-rank"><span>PRIORITY</span><strong>{String(bet.rank).padStart(2, "0")}</strong></div>
              <div className="gr-bet-copy">
                <div className="gr-bet-title-row"><div><h2>{bet.title}</h2><p>{bet.subhead}</p></div><div className="gr-bet-score"><span>WEIGHTED</span><strong>{scoreGrowthBet(bet)}<small>/ 100</small></strong></div></div>
                <div className="gr-bet-meta"><span><FlaskConical size={14} aria-hidden="true" /> {bet.week}</span><span>{bet.ownerRole}</span><span>{formatINRCompact(bet.budgetInr)} proposed</span></div>
                <div className="gr-bet-evidence">
                  <div className="gr-evidence-card"><span>Source anchor</span><strong>{sourceMatches.length ? sourceMatches.map((campaign) => campaign.name).join(" + ") : "Confirmed registrants"}</strong><small>{sourceMatches.length ? `${formatNumber(attendees)} verified arrivals · ${formatPercent(arrivalRate)} of latest confirmed` : `${formatNumber(history.overall.attendees)} arrivals · ${formatPercent(arrivalRate)} of latest confirmed`}</small></div>
                  <div className="gr-evidence-card"><span>Observed cost / arrival</span><strong>{formatINRCompact(costPerArrival)}</strong><small>{sourceMatches.length ? `${formatINRCompact(sourceSpend)} net source spend across measured channels` : "Portfolio-level, observational benchmark"}</small></div>
                  <div className="gr-evidence-card"><span>Estimated gross arrivals</span><strong>+{formatNumber(bet.baseGrossAttendees)} <small>base</small> · +{formatNumber(bet.stretchGrossAttendees)} <small>stretch</small></strong><small>Planning estimate—not a measured lift</small></div>
                </div>
                <div className="gr-bet-test"><div><span className="gr-bet-label"><BadgeCheck size={13} aria-hidden="true" /> TEST</span><p>{bet.test}</p></div><div><span className="gr-bet-label"><ArrowRight size={13} aria-hidden="true" /> SCALE GATE</span><p>{bet.scale}</p></div><div><span className="gr-bet-label gr-bet-stop"><ShieldAlert size={13} aria-hidden="true" /> STOP GATE</span><p>{bet.stop}</p></div></div>
              </div>
              <button type="button" className={`gr-button ${alreadyAdded ? "gr-button-soft" : "gr-button-outline"} gr-bet-action`} onClick={() => addTask(bet.id)} disabled={!demoActive || alreadyAdded || busy === bet.id} title={!demoActive ? "Start a demo to save a task" : undefined}>{alreadyAdded ? "On action board" : busy === bet.id ? "Saving…" : <><Plus size={14} aria-hidden="true" /> Add pilot task</>}</button>
            </article>
          )
        })}
      </section>
      <p className="gr-source-method"><CircleHelp size={14} aria-hidden="true" /> Source rates are descriptive cohort results, not causal proof. Validate each bet with a holdout or matched cohort before reallocating budget. Overlap deductions are portfolio-level assumptions.</p>
    </div>
  )
}
