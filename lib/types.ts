import type { CampaignMetric, SourcePack } from "@/lib/analytics"

export type CampaignScenario = {
  reportedReach: number
  registrations: number
  confirmed: number
  spendInr: number
  arrivalRate: number
  owner: string
  stage: "Plan" | "Active" | "Paused" | "Complete"
}

export type GrowthCampaign = {
  campaignId: string
  name: string
  channel: string
  audience: string
  objective: string
  source: CampaignMetric
  scenario: CampaignScenario
}

export type GrowthTask = {
  id: string
  title: string
  description: string
  owner: string
  dueDate: string
  priority: "High" | "Medium" | "Low"
  status: "Todo" | "In progress" | "Done"
  campaignId: string | null
  createdAt: string
}

export type AuditEntry = {
  id: string
  action: string
  detail: string
  createdAt: string
}

export type ChatEntry = {
  id: string
  role: "user" | "assistant"
  text: string
  createdAt: string
  taskProposal?: Record<string, unknown> | null
}

export type WorkspaceState = {
  schemaVersion: 1
  campaigns: GrowthCampaign[]
  tasks: GrowthTask[]
  budgetLimitInr: number
  capacity: {
    uniqueAdmissionLimit: number
    concurrentOccupancyLimit: number
    uniqueLimitIsHypothetical: boolean
    concurrentLimitIsHypothetical: boolean
  }
  assumptions: {
    baseTarget: number
    stretchTarget: number
    baseGrossUplift: number
    baseOverlapDeduction: number
    stretchGrossUplift: number
    stretchOverlapDeduction: number
    unattributedBaselineAttendees: number
    preparationWeeks: number
    coreOrganizers: number
    studentRepresentatives: number
  }
  sourceOverride: SourcePack | null
  auditLog: AuditEntry[]
  conversation: ChatEntry[]
}

export type WorkspaceResponse = {
  mode: "preview" | "demo"
  revision: number
  state: WorkspaceState
  aiConfigured: boolean
  aiModel: string
  hasSourceOverride?: boolean
}
