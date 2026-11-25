export type GrowthBet = {
  id: string
  rank: number
  title: string
  subhead: string
  sourceChannels: string[]
  budgetInr: number
  baseGrossAttendees: number
  stretchGrossAttendees: number
  evidenceScore: number
  effectScore: number
  effortScore: number
  speedScore: number
  test: string
  scale: string
  stop: string
  ownerRole: string
  week: string
}

export const GROWTH_BETS: GrowthBet[] = [
  {
    id: "club-contingents", rank: 1, title: "College-club contingents", subhead: "Turn club leads into named, arrival-ready groups.", sourceChannels: ["college_partners"], budgetInr: 70000, baseGrossAttendees: 150, stretchGrossAttendees: 275, effectScore: 5, evidenceScore: 5, effortScore: 4, speedScore: 4,
    test: "10 clubs, one trackable group link each, weekly roster reconciliation, and a verified-arrival cohort readout.",
    scale: "Expand when confirmed-to-verified arrival is at least 80% and cost per verified attendee is at or below ₹120 after 50 confirmations.",
    stop: "Pause a club offer below 70% arrival or above ₹250 per verified attendee after 50 confirmations.", ownerRole: "Partnerships lead + 10 student reps", week: "Weeks 1–6",
  },
  {
    id: "buddy-referrals", rank: 2, title: "Bring-a-buddy referrals", subhead: "Make the invite feel social; keep the reward arrival-based.", sourceChannels: ["referrals"], budgetInr: 50000, baseGrossAttendees: 130, stretchGrossAttendees: 250, effectScore: 4, evidenceScore: 5, effortScore: 5, speedScore: 5,
    test: "Randomize eligible registrants to a shareable buddy pass or holdout. Count unique people and verified arrivals, not link shares.",
    scale: "Scale at a ≥5 percentage-point lift in verified arrival versus holdout and ≤₹100 per incremental verified attendee.",
    stop: "Revise below a 2-point lift; stop if the estimate is non-positive after 100 eligible invites.", ownerRole: "Lifecycle lead + referral captain", week: "Weeks 2–5",
  },
  {
    id: "arrival-crm", rank: 3, title: "Arrival-confidence CRM", subhead: "Remove last-mile uncertainty between confirmation and gate scan.", sourceChannels: [], budgetInr: 35000, baseGrossAttendees: 180, stretchGrossAttendees: 300, effectScore: 5, evidenceScore: 3, effortScore: 5, speedScore: 5,
    test: "Randomize confirmed registrants to a concise schedule, transport, gate-map, and opt-in reminder sequence versus current communications.",
    scale: "Scale at a ≥5-point verified-arrival lift; keep opt-outs suppressed and use the same observation window in both arms.",
    stop: "Pause on a non-positive lift after 400 delivered contacts or any complaint/opt-out spike beyond the agreed guardrail.", ownerRole: "CRM lead + admissions desk", week: "Weeks 2–6",
  },
  {
    id: "campus-reps", rank: 4, title: "Peer-to-peer campus reps", subhead: "Equip accountable student reps with one useful next action.", sourceChannels: ["ambassadors"], budgetInr: 85000, baseGrossAttendees: 90, stretchGrossAttendees: 190, effectScore: 3, evidenceScore: 4, effortScore: 3, speedScore: 3,
    test: "Pilot with 20 trained reps; unique codes, weekly confirmation roster, and a verified-arrival result per cohort.",
    scale: "Expand if cohort arrival is at least 75% and verified-attendee cost stays at or below ₹150.",
    stop: "Consolidate low-activity cohorts below 60% arrival or above ₹220 per verified attendee.", ownerRole: "Campus lead + 20 initial reps", week: "Weeks 1–6",
  },
  {
    id: "high-intent-capture", rank: 5, title: "High-intent search + student communities", subhead: "Answer programme, travel, and eligibility questions where intent already exists.", sourceChannels: ["organic", "community"], budgetInr: 60000, baseGrossAttendees: 150, stretchGrossAttendees: 285, effectScore: 3, evidenceScore: 3, effortScore: 4, speedScore: 4,
    test: "Publish one mobile event guide, add campaign-tagged partner posts, and compare identified registration and arrival by source.",
    scale: "Scale channels with ≥60% identified-to-registration and ≤₹100 per verified attendee at 75 or more registrations.",
    stop: "Stop paid amplification below 35% identified-to-registration or above ₹180 per verified attendee.", ownerRole: "Content lead + community manager", week: "Weeks 1–4",
  },
]

export function scoreGrowthBet(bet: GrowthBet) {
  return Math.round((bet.effectScore / 5 * 40 + bet.evidenceScore / 5 * 30 + bet.effortScore / 5 * 20 + bet.speedScore / 5 * 10) * 10) / 10
}

export function getGrowthPlanTotals() {
  const grossBase = GROWTH_BETS.reduce((total, bet) => total + bet.baseGrossAttendees, 0)
  const grossStretch = GROWTH_BETS.reduce((total, bet) => total + bet.stretchGrossAttendees, 0)
  const budget = GROWTH_BETS.reduce((total, bet) => total + bet.budgetInr, 0)
  return { grossBase, grossStretch, budget }
}
