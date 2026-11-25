import { isSourcePack } from "@/lib/analytics"
import type { WorkspaceState } from "@/lib/types"

const isFiniteBounded = (value: unknown, max: number) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max
const validText = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.length <= max

export function validateWorkspaceState(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== "object") return false
  const state = value as WorkspaceState
  if (state.schemaVersion !== 1 || !Array.isArray(state.campaigns) || state.campaigns.length > 100) return false
  if (!Array.isArray(state.tasks) || state.tasks.length > 500 || !Array.isArray(state.auditLog) || state.auditLog.length > 100) return false
  if (!Array.isArray(state.conversation) || state.conversation.length > 30) return false
  if (state.conversation.some((entry) => !validText(entry.id, 100) || !["user", "assistant"].includes(entry.role) || typeof entry.text !== "string" || entry.text.length > 4000)) return false
  if (!isFiniteBounded(state.budgetLimitInr, 100_000_000)) return false
  if (!state.capacity || !isFiniteBounded(state.capacity.uniqueAdmissionLimit, 50_000) || state.capacity.uniqueAdmissionLimit < 1) return false
  if (!isFiniteBounded(state.capacity.concurrentOccupancyLimit, 50_000) || state.capacity.concurrentOccupancyLimit < 1) return false
  if (state.capacity.concurrentOccupancyLimit > state.capacity.uniqueAdmissionLimit) return false
  if (!state.assumptions || !isFiniteBounded(state.assumptions.baseTarget, 50_000) || !isFiniteBounded(state.assumptions.stretchTarget, 50_000)) return false
  if (state.assumptions.baseTarget > state.capacity.uniqueAdmissionLimit || state.assumptions.stretchTarget > state.capacity.uniqueAdmissionLimit) return false
  const campaignIds = new Set<string>()
  let totalSpend = 0
  for (const campaign of state.campaigns) {
    if (!validText(campaign.campaignId, 100) || campaignIds.has(campaign.campaignId)) return false
    campaignIds.add(campaign.campaignId)
    if (!validText(campaign.name, 160) || !validText(campaign.scenario.owner, 100)) return false
    const scenario = campaign.scenario
    if (!scenario || !isFiniteBounded(scenario.reportedReach, 10_000_000) || !isFiniteBounded(scenario.registrations, 1_000_000)) return false
    if (!isFiniteBounded(scenario.confirmed, 1_000_000) || !isFiniteBounded(scenario.spendInr, 100_000_000)) return false
    if (!isFiniteBounded(scenario.arrivalRate, 1) || scenario.confirmed > scenario.registrations) return false
    if (!["Plan", "Active", "Paused", "Complete"].includes(scenario.stage)) return false
    totalSpend += scenario.spendInr
  }
  if (totalSpend > state.budgetLimitInr) return false
  for (const task of state.tasks) {
    if (!validText(task.id, 100) || !validText(task.title, 180) || !validText(task.description, 1000)) return false
    if (!validText(task.owner, 100) || !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) return false
    if (!["High", "Medium", "Low"].includes(task.priority) || !["Todo", "In progress", "Done"].includes(task.status)) return false
    if (task.campaignId !== null && !campaignIds.has(task.campaignId)) return false
  }
  if (state.sourceOverride !== null && !isSourcePack(state.sourceOverride)) return false
  return true
}
