import { getHistoricalAnalytics } from "@/lib/analytics"
import type { GrowthTask, WorkspaceState } from "@/lib/types"

export function createDefaultWorkspace(): WorkspaceState {
  const history = getHistoricalAnalytics("2025-04-20")
  const sourceCampaigns = history.campaigns
  const owners = [...new Set(sourceCampaigns.map((campaign) => campaign.owner).filter(Boolean))]
  const tasks: GrowthTask[] = [
    {
      id: "seed-confirmation-flow",
      title: "Audit confirmation and arrival information",
      description: "Map the registration-to-arrival drop-off, then draft a confirmation and travel-information test. This is a planning task, not a source-record task.",
      owner: owners[0] ?? "Growth team",
      dueDate: "2026-12-03",
      priority: "High",
      status: "Todo",
      campaignId: null,
      createdAt: "2026-11-26T09:00:00.000Z",
    },
    {
      id: "seed-club-pilot",
      title: "Recruit a college-club pilot cohort",
      description: "Select 10 student clubs, agree an eligible group-registration process, and measure confirmed-to-verified arrival by cohort.",
      owner: owners[1] ?? owners[0] ?? "Growth team",
      dueDate: "2026-12-08",
      priority: "High",
      status: "In progress",
      campaignId: sourceCampaigns.find((campaign) => campaign.channel === "college_partners")?.campaignId ?? null,
      createdAt: "2026-11-26T09:00:00.000Z",
    },
    {
      id: "seed-referral-test",
      title: "Design a buddy-referral holdout",
      description: "Randomize eligible invitees to a referral prompt or holdout. Deduplicate by person ID and compare verified arrival, not link clicks alone.",
      owner: owners[2] ?? owners[0] ?? "Growth team",
      dueDate: "2026-12-12",
      priority: "Medium",
      status: "Todo",
      campaignId: sourceCampaigns.find((campaign) => campaign.channel === "referrals")?.campaignId ?? null,
      createdAt: "2026-11-26T09:00:00.000Z",
    },
  ]
  return {
    schemaVersion: 1,
    campaigns: sourceCampaigns.map((campaign) => ({
      campaignId: campaign.campaignId,
      name: campaign.name,
      channel: campaign.channel,
      audience: campaign.audience,
      objective: campaign.objective,
      source: campaign,
      scenario: {
        reportedReach: campaign.reportedReach,
        registrations: campaign.registrations,
        confirmed: campaign.confirmed,
        spendInr: campaign.spendInr,
        arrivalRate: campaign.arrivalRate ?? 0,
        owner: campaign.owner,
        stage: "Complete",
      },
    })),
    tasks,
    budgetLimitInr: history.target?.budgetInr ?? 300000,
    capacity: {
      uniqueAdmissionLimit: 3500,
      concurrentOccupancyLimit: 1500,
      uniqueLimitIsHypothetical: true,
      concurrentLimitIsHypothetical: true,
    },
    assumptions: {
      baseTarget: 2650,
      stretchTarget: 3200,
      baseGrossUplift: 700,
      baseOverlapDeduction: 100,
      stretchGrossUplift: 1300,
      stretchOverlapDeduction: 150,
      unattributedBaselineAttendees: history.dataQuality.unattributedAttendees,
      preparationWeeks: 6,
      coreOrganizers: 8,
      studentRepresentatives: 40,
    },
    sourceOverride: null,
    auditLog: [],
    conversation: [],
  }
}

export function getOperatingForecast(state: WorkspaceState, mode: "base" | "stretch") {
  const sourceArrivals = state.campaigns.reduce((sum, campaign) => {
    const confirmed = Math.min(campaign.scenario.confirmed, campaign.scenario.registrations)
    return sum + confirmed * Math.max(0, Math.min(1, campaign.scenario.arrivalRate))
  }, state.assumptions.unattributedBaselineAttendees)
  const gross = mode === "base" ? state.assumptions.baseGrossUplift : state.assumptions.stretchGrossUplift
  const overlap = mode === "base" ? state.assumptions.baseOverlapDeduction : state.assumptions.stretchOverlapDeduction
  const baseline = Math.round(sourceArrivals)
  const preCapacity = Math.max(0, baseline + gross - overlap)
  return {
    baseline,
    gross,
    overlap,
    preCapacity,
    capped: Math.min(preCapacity, state.capacity.uniqueAdmissionLimit),
    capacityHeadroom: Math.max(0, state.capacity.uniqueAdmissionLimit - Math.min(preCapacity, state.capacity.uniqueAdmissionLimit)),
    exceedsCapacity: preCapacity > state.capacity.uniqueAdmissionLimit,
  }
}
