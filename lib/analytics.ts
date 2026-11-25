import workbook from "@/data/historical-source.json"

export type Row = Record<string, string | number | boolean | null>
export type SourcePack = {
  metadata: { sourceFormatVersion?: number; inventory?: Array<{ name: string; rows: number; headers: string[] }> }
  sheets: Record<string, Row[]>
}
export type CampaignMetric = {
  campaignId: string
  name: string
  channel: string
  audience: string
  objective: string
  owner: string
  reportedReach: number
  impressions: number
  clicks: number
  sessions: number
  registrationStarts: number
  identified: number
  engaged: number
  registrations: number
  confirmed: number
  attendees: number
  spendInr: number
  arrivalRate: number | null
  costPerRegistration: number | null
  costPerAttendee: number | null
}
export type HistoricalAnalytics = {
  eventName: string
  snapshotDate: string
  range: { start: string; end: string }
  originalRange: { start: string; end: string }
  inventory: Array<{ name: string; rows: number; headers: string[] }>
  fieldGuide: Array<{ source_table: string; field: string; data_type: string; meaning: string }>
  target: { identified: number; registrations: number; attendees: number; budgetInr: number; version: string; effectiveAt: string } | null
  overall: Record<string, number | null>
  totals: Record<string, number | null>
  campaigns: CampaignMetric[]
  allCampaigns: CampaignMetric[]
  trend: Array<{ month: string; reportedReach: number; registrations: number; verifiedAttendees: number }>
  statuses: Record<string, number>
  dataQuality: {
    deduplicatedRows: Record<string, number>
    excludedPeople: Record<string, number>
    verifiedAdmissionEvents: number
    uniqueVerifiedExternalAttendees: number
    unattributedAttendees: number
    manualAdmissionEvents: number
    scannerAdmissionEvents: number
    anonymousReachNote: string
    unsupportedEvidence: string[]
  }
}

const source = workbook as unknown as SourcePack
const rows = (pack: SourcePack, sheet: string) => pack.sheets[sheet] ?? []
const text = (value: unknown) => value == null ? "" : String(value).trim()
const numeric = (value: unknown) => {
  const result = Number(text(value).replaceAll(",", ""))
  return Number.isFinite(result) ? result : 0
}
const day = (value: unknown) => text(value).slice(0, 10)
const beforeEndOfDay = (value: unknown, date: string) => text(value) !== "" && text(value).slice(0, 10) <= date
const dedupe = <T extends Row>(items: T[], idKey: string) => {
  const distinct = new Map<string, T>()
  for (const item of items) {
    const id = text(item[idKey])
    if (id && !distinct.has(id)) distinct.set(id, item)
  }
  return [...distinct.values()]
}
const duplicateCount = (items: Row[], idKey: string) => items.length - dedupe(items, idKey).length
const ratio = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : null
const sum = (items: CampaignMetric[], key: keyof CampaignMetric) => items.reduce((total, item) => total + (typeof item[key] === "number" ? item[key] as number : 0), 0)

export function isSourcePack(value: unknown): value is SourcePack {
  if (!value || typeof value !== "object") return false
  const candidate = value as SourcePack
  const required = ["event", "targets", "campaigns", "dailyMarketing", "people", "engagement", "registrations", "registrationHistory", "checkins"]
  return candidate.metadata?.sourceFormatVersion === 1 && Boolean(candidate.sheets) && required.every((key) => Array.isArray(candidate.sheets[key]))
}

export function getSourcePack(override?: SourcePack | null): SourcePack {
  return override && isSourcePack(override) ? override : source
}

export function getHistoryRange(pack: SourcePack = source) {
  const event = rows(pack, "event")[0]
  return { start: day(event?.history_start) || "2025-01-15", end: day(event?.history_end) || "2025-04-20" }
}

export function getHistoricalAnalytics(snapshotDate?: string, campaignFilter?: string, packOverride?: SourcePack | null): HistoricalAnalytics {
  const pack = getSourcePack(packOverride)
  const event = rows(pack, "event")[0] ?? {}
  const range = getHistoryRange(pack)
  const selectedDate = snapshotDate && /^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)
    ? snapshotDate
    : range.end
  const campaigns = rows(pack, "campaigns")
  const campaignIds = new Set(campaigns.map((campaign) => text(campaign.campaign_id)))
  const personRows = dedupe(rows(pack, "people"), "person_id").filter((person) => beforeEndOfDay(person.first_seen_at, selectedDate))
  const peopleById = new Map(personRows.map((person) => [text(person.person_id), person]))
  const externalPeople = personRows.filter((person) => text(person.person_type) === "external")
  const peopleTypeCounts = personRows.reduce<Record<string, number>>((counts, person) => {
    const type = text(person.person_type) || "unknown"
    counts[type] = (counts[type] ?? 0) + 1
    return counts
  }, {})

  const historyRows = dedupe(rows(pack, "registrationHistory"), "history_id")
    .filter((entry) => beforeEndOfDay(entry.effective_at, selectedDate))
    .sort((a, b) => text(a.effective_at).localeCompare(text(b.effective_at)) || text(a.history_id).localeCompare(text(b.history_id)))
  const latestStatusByRegistration = new Map<string, Row>()
  for (const entry of historyRows) {
    const registrationId = text(entry.registration_id)
    if (registrationId) latestStatusByRegistration.set(registrationId, entry)
  }
  const registrations = dedupe(rows(pack, "registrations"), "registration_id")
    .filter((entry) => beforeEndOfDay(entry.registered_at, selectedDate))
    .filter((entry) => peopleById.get(text(entry.person_id))?.person_type === "external")
  const uniqueRegisteredPeople = new Set(registrations.map((entry) => text(entry.person_id)))
  const confirmedRegistrationIds = new Set([...latestStatusByRegistration.entries()]
    .filter(([, entry]) => text(entry.status).toLowerCase() === "confirmed")
    .map(([registrationId]) => registrationId))
  const confirmedRegistrations = registrations.filter((entry) => confirmedRegistrationIds.has(text(entry.registration_id)))
  const uniqueConfirmedPeople = new Set(confirmedRegistrations.map((entry) => text(entry.person_id)))
  const statusCounts = [...latestStatusByRegistration.values()].reduce<Record<string, number>>((counts, entry) => {
    const status = text(entry.status).toLowerCase() || "unknown"
    counts[status] = (counts[status] ?? 0) + 1
    return counts
  }, {})

  const dailyRows = dedupe(rows(pack, "dailyMarketing"), "activity_id")
    .filter((entry) => beforeEndOfDay(entry.activity_date, selectedDate))
  const campaignById = new Map(campaigns.map((campaign) => [text(campaign.campaign_id), campaign]))
  const metrics = new Map<string, CampaignMetric>()
  for (const campaign of campaigns) {
    const id = text(campaign.campaign_id)
    if (!id) continue
    metrics.set(id, {
      campaignId: id,
      name: text(campaign.campaign_name),
      channel: text(campaign.channel),
      audience: text(campaign.target_audience),
      objective: text(campaign.objective),
      owner: text(campaign.owner_name),
      reportedReach: 0, impressions: 0, clicks: 0, sessions: 0, registrationStarts: 0,
      identified: 0, engaged: 0, registrations: 0, confirmed: 0, attendees: 0, spendInr: 0,
      arrivalRate: null, costPerRegistration: null, costPerAttendee: null,
    })
  }
  for (const entry of dailyRows) {
    const metric = metrics.get(text(entry.campaign_id))
    if (!metric) continue
    metric.reportedReach += numeric(entry.reported_reach)
    metric.impressions += numeric(entry.impressions)
    metric.clicks += numeric(entry.clicks)
    metric.sessions += numeric(entry.landing_page_sessions)
    metric.registrationStarts += numeric(entry.registration_starts)
    metric.spendInr += numeric(entry.marketing_spend_inr)
  }
  for (const person of externalPeople) {
    const metric = metrics.get(text(person.first_campaign_id))
    if (metric) metric.identified += 1
  }
  const engagements = dedupe(rows(pack, "engagement"), "interaction_id")
    .filter((entry) => beforeEndOfDay(entry.occurred_at, selectedDate))
    .filter((entry) => peopleById.get(text(entry.person_id))?.person_type === "external")
  const engagedByCampaign = new Map<string, Set<string>>()
  for (const entry of engagements) {
    const campaignId = text(entry.campaign_id)
    const personId = text(entry.person_id)
    if (!metrics.has(campaignId) || !personId) continue
    const set = engagedByCampaign.get(campaignId) ?? new Set<string>()
    set.add(personId)
    engagedByCampaign.set(campaignId, set)
  }
  for (const [campaignId, set] of engagedByCampaign) metrics.get(campaignId)!.engaged = set.size

  const registeredByCampaign = new Map<string, Set<string>>()
  const confirmedByCampaign = new Map<string, Set<string>>()
  for (const entry of registrations) {
    const campaignId = text(entry.campaign_id)
    const personId = text(entry.person_id)
    if (!metrics.has(campaignId) || !personId) continue
    const registered = registeredByCampaign.get(campaignId) ?? new Set<string>()
    registered.add(personId)
    registeredByCampaign.set(campaignId, registered)
    if (confirmedRegistrationIds.has(text(entry.registration_id))) {
      const confirmed = confirmedByCampaign.get(campaignId) ?? new Set<string>()
      confirmed.add(personId)
      confirmedByCampaign.set(campaignId, confirmed)
    }
  }
  for (const [campaignId, set] of registeredByCampaign) metrics.get(campaignId)!.registrations = set.size
  for (const [campaignId, set] of confirmedByCampaign) metrics.get(campaignId)!.confirmed = set.size

  const checkinRows = dedupe(rows(pack, "checkins"), "event_id")
    .filter((entry) => beforeEndOfDay(entry.occurred_at, selectedDate))
  const qualifiedEvents = checkinRows.filter((entry) => entry.result === "admitted"
    && entry.verification === "verified"
    && peopleById.get(text(entry.person_id))?.person_type === "external")
    .sort((a, b) => text(a.occurred_at).localeCompare(text(b.occurred_at)) || text(a.event_id).localeCompare(text(b.event_id)))
  const firstVerifiedAdmissionByPerson = new Map<string, Row>()
  for (const entry of qualifiedEvents) {
    const personId = text(entry.person_id)
    if (personId && !firstVerifiedAdmissionByPerson.has(personId)) firstVerifiedAdmissionByPerson.set(personId, entry)
  }
  for (const entry of firstVerifiedAdmissionByPerson.values()) {
    const metric = metrics.get(text(entry.campaign_id))
    if (metric) metric.attendees += 1
  }
  const allCampaigns = [...metrics.values()].map((metric) => ({
    ...metric,
    arrivalRate: ratio(metric.attendees, metric.confirmed),
    costPerRegistration: ratio(metric.spendInr, metric.registrations),
    costPerAttendee: ratio(metric.spendInr, metric.attendees),
  }))

  const identified = externalPeople.length
  const registrationCount = uniqueRegisteredPeople.size
  const confirmationCount = uniqueConfirmedPeople.size
  const attendeeCount = firstVerifiedAdmissionByPerson.size
  const totalSpend = allCampaigns.reduce((total, metric) => total + metric.spendInr, 0)
  const reach = allCampaigns.reduce((total, metric) => total + metric.reportedReach, 0)
  const totalMetrics = (campaignList: CampaignMetric[], extras: { identified?: number; registrations?: number; confirmed?: number; attendees?: number; reach?: number; spendInr?: number } = {}) => {
    const spendInr = campaignList.reduce((total, metric) => total + metric.spendInr, 0)
    const registrations = extras.registrations ?? campaignList.reduce((total, metric) => total + metric.registrations, 0)
    const confirmed = extras.confirmed ?? campaignList.reduce((total, metric) => total + metric.confirmed, 0)
    const attendees = extras.attendees ?? campaignList.reduce((total, metric) => total + metric.attendees, 0)
    const identified = extras.identified ?? campaignList.reduce((total, metric) => total + metric.identified, 0)
    const reportedReach = extras.reach ?? campaignList.reduce((total, metric) => total + metric.reportedReach, 0)
    return {
      reportedReach,
      impressions: campaignList.reduce((total, metric) => total + metric.impressions, 0),
      clicks: campaignList.reduce((total, metric) => total + metric.clicks, 0),
      sessions: campaignList.reduce((total, metric) => total + metric.sessions, 0),
      registrationStarts: campaignList.reduce((total, metric) => total + metric.registrationStarts, 0),
      identified,
      engaged: campaignList.reduce((total, metric) => total + metric.engaged, 0),
      registrations,
      confirmed,
      attendees,
      spendInr,
      identifiedToRegistrationRate: ratio(registrations, identified),
      registrationToAttendanceRate: ratio(attendees, registrations),
      confirmedArrivalRate: ratio(attendees, confirmed),
      identifiedPerReportedReach: ratio(identified, reportedReach),
      costPerRegistration: ratio(spendInr, registrations),
      costPerVerifiedAttendee: ratio(spendInr, attendees),
    }
  }
  const filteredCampaigns = campaignFilter
    ? allCampaigns.filter((metric) => metric.campaignId === campaignFilter)
    : allCampaigns
  const selectedUnattributed = campaignFilter === "unattributed"
  const campaignAttributedAttendees = allCampaigns.reduce((total, metric) => total + metric.attendees, 0)
  const unattributedAttendees = attendeeCount - campaignAttributedAttendees
  const selectedTotals = campaignFilter === "unattributed"
    ? totalMetrics([], { attendees: unattributedAttendees })
    : campaignFilter
      ? totalMetrics(filteredCampaigns)
      : totalMetrics(allCampaigns, { identified, registrations: registrationCount, confirmed: confirmationCount, attendees: attendeeCount, reach })
  const targets = rows(pack, "targets")
    .filter((target) => beforeEndOfDay(target.effective_at, selectedDate))
    .sort((a, b) => text(a.effective_at).localeCompare(text(b.effective_at)))
  const currentTarget = targets.at(-1)
  const trendBuckets = new Map<string, { reach: number; registrations: Set<string>; attendees: Set<string> }>()
  const monthBucket = (dateValue: unknown) => {
    const month = day(dateValue).slice(0, 7)
    if (!/^\\d{4}-\\d{2}$/.test(month)) return null
    if (!trendBuckets.has(month)) trendBuckets.set(month, { reach: 0, registrations: new Set(), attendees: new Set() })
    return trendBuckets.get(month)!
  }
  for (const entry of dailyRows) {
    if (campaignFilter && text(entry.campaign_id) !== campaignFilter) continue
    const bucket = monthBucket(entry.activity_date)
    if (bucket) bucket.reach += numeric(entry.reported_reach)
  }
  for (const entry of registrations) {
    if (campaignFilter && text(entry.campaign_id) !== campaignFilter) continue
    const bucket = monthBucket(entry.registered_at)
    if (bucket) bucket.registrations.add(text(entry.person_id))
  }
  for (const entry of firstVerifiedAdmissionByPerson.values()) {
    const admissionCampaign = text(entry.campaign_id) || "unattributed"
    if (campaignFilter && admissionCampaign !== campaignFilter) continue
    const bucket = monthBucket(entry.occurred_at)
    if (bucket) bucket.attendees.add(text(entry.person_id))
  }
  const trend = [...trendBuckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, bucket]) => ({
    month: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
    reportedReach: bucket.reach,
    registrations: bucket.registrations.size,
    verifiedAttendees: bucket.attendees.size,
  }))
  const uniqueEngagedPeople = new Set(engagements.map((entry) => text(entry.person_id))).size
  const deduplicatedRows = {
    dailyMarketing: duplicateCount(rows(pack, "dailyMarketing"), "activity_id"),
    engagement: duplicateCount(rows(pack, "engagement"), "interaction_id"),
    registrations: duplicateCount(rows(pack, "registrations"), "registration_id"),
    registrationHistory: duplicateCount(rows(pack, "registrationHistory"), "history_id"),
    checkins: duplicateCount(rows(pack, "checkins"), "event_id"),
  }
  const selectedCampaigns = selectedUnattributed ? [] : filteredCampaigns
  return {
    eventName: text(event.event_name) || "CampusFest 2025",
    snapshotDate: selectedDate,
    range,
    originalRange: getHistoryRange(source),
    inventory: pack.metadata.inventory ?? [],
    fieldGuide: rows(pack, "fieldGuide").map((entry) => ({ source_table: text(entry.source_table), field: text(entry.field), data_type: text(entry.data_type), meaning: text(entry.meaning) })),
    target: currentTarget ? {
      identified: numeric(currentTarget.identified_external_people_goal),
      registrations: numeric(currentTarget.registration_goal),
      attendees: numeric(currentTarget.unique_external_visitors_goal),
      budgetInr: numeric(currentTarget.marketing_budget_inr),
      version: text(currentTarget.target_version),
      effectiveAt: text(currentTarget.effective_at),
    } : null,
    overall: { ...totalMetrics(allCampaigns, { identified, registrations: registrationCount, confirmed: confirmationCount, attendees: attendeeCount, reach }), engaged: uniqueEngagedPeople },
    totals: selectedTotals,
    campaigns: campaignFilter ? selectedCampaigns : allCampaigns,
    allCampaigns,
    trend,
    statuses: statusCounts,
    dataQuality: {
      deduplicatedRows,
      excludedPeople: Object.fromEntries(Object.entries(peopleTypeCounts).filter(([type]) => type !== "external")),
      verifiedAdmissionEvents: qualifiedEvents.length,
      uniqueVerifiedExternalAttendees: attendeeCount,
      unattributedAttendees,
      manualAdmissionEvents: qualifiedEvents.filter((entry) => entry.source === "manual").length,
      scannerAdmissionEvents: qualifiedEvents.filter((entry) => entry.source === "scanner").length,
      anonymousReachNote: "Reported reach is summed across platform-days. It is not globally unique people and cannot be used as a deduplicated audience denominator.",
      unsupportedEvidence: ["weather", "causal channel lift", "approved admission capacity", "concurrent occupancy", "travel mode"],
    },
  }
}

export function getCampaignIds(pack?: SourcePack | null) {
  return rows(getSourcePack(pack), "campaigns").map((campaign) => ({
    id: text(campaign.campaign_id),
    name: text(campaign.campaign_name),
    channel: text(campaign.channel),
  }))
}
