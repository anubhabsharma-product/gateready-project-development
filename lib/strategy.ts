export type GrowthBet = {
  id: string
  rank: number
  title: string
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
    id: "club-contingents", rank: 1, title: "College club groups", sourceChannels: ["college_partners"], budgetInr: 70000, baseGrossAttendees: 150, stretchGrossAttendees: 275, effectScore: 5, evidenceScore: 5, effortScore: 4, speedScore: 4,
    test: "Give each of 10 clubs a tracking link. Check the rosters weekly and count verified arrivals by club.",
    scale: "After 50 confirmations, expand if at least 80% of confirmed registrants arrive and the cost is ₹120 or less per verified visitor.",
    stop: "After 50 confirmations, pause if the arrival rate is below 70% or the cost exceeds ₹250 per verified visitor.", ownerRole: "Partnerships lead and 10 student reps", week: "Weeks 1 to 6",
  },
  {
    id: "buddy-referrals", rank: 2, title: "Bring-a-buddy referrals", sourceChannels: ["referrals"], budgetInr: 50000, baseGrossAttendees: 130, stretchGrossAttendees: 250, effectScore: 4, evidenceScore: 5, effortScore: 5, speedScore: 5,
    test: "Randomly offer eligible registrants a shareable buddy pass or place them in a control group. Count unique people and verified arrivals.",
    scale: "Expand if the verified arrival rate is at least 5 percentage points higher than the control group and each additional verified visitor costs ₹100 or less.",
    stop: "Revise if the gain is under 2 percentage points. Stop if the gain is zero or negative after 100 eligible invites.", ownerRole: "Lifecycle lead and referral captain", week: "Weeks 2 to 5",
  },
  {
    id: "arrival-crm", rank: 3, title: "Arrival reminders", sourceChannels: [], budgetInr: 35000, baseGrossAttendees: 180, stretchGrossAttendees: 300, effectScore: 5, evidenceScore: 3, effortScore: 5, speedScore: 5,
    test: "Randomly assign confirmed registrants to the existing messages or to a sequence with the schedule, transport details, a gate map, and opt-in reminders.",
    scale: "Expand if the verified arrival rate rises by at least 5 percentage points. Respect opt-outs and measure both groups over the same period.",
    stop: "Pause if the gain is zero or negative after delivery to 400 contacts, or if complaints or opt-outs exceed the agreed limit.", ownerRole: "CRM lead and admissions desk", week: "Weeks 2 to 6",
  },
  {
    id: "campus-reps", rank: 4, title: "Campus representatives", sourceChannels: ["ambassadors"], budgetInr: 85000, baseGrossAttendees: 90, stretchGrossAttendees: 190, effectScore: 3, evidenceScore: 4, effortScore: 3, speedScore: 3,
    test: "Start with 20 trained reps. Use unique codes, check confirmations weekly, and count verified arrivals by group.",
    scale: "Expand if cohort arrival is at least 75% and verified-attendee cost stays at or below ₹150.",
    stop: "Combine low-activity groups if their arrival rate falls below 60% or they cost more than ₹220 per verified visitor.", ownerRole: "Campus lead and 20 student reps", week: "Weeks 1 to 6",
  },
  {
    id: "high-intent-capture", rank: 5, title: "Search and student communities", sourceChannels: ["organic", "community"], budgetInr: 60000, baseGrossAttendees: 150, stretchGrossAttendees: 285, effectScore: 3, evidenceScore: 3, effortScore: 4, speedScore: 4,
    test: "Publish a mobile event guide and give partner posts campaign tags. Compare registrations and arrivals by source.",
    scale: "Expand a channel after at least 75 registrations if at least 60% of identified people register and the cost is ₹100 or less per verified visitor.",
    stop: "Stop paid promotion if fewer than 35% of identified people register or the cost exceeds ₹180 per verified visitor.", ownerRole: "Content lead and community manager", week: "Weeks 1 to 4",
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
