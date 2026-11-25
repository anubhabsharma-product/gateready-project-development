import { randomUUID } from "node:crypto"
import { gunzipSync } from "node:zlib"
import { NextRequest, NextResponse } from "next/server"
import { clearDemoCookie, sessionFromRequest } from "@/lib/demo-session"
import { validateSameOrigin } from "@/lib/request-security"
import { appendActivity, readWorkspace, updateWorkspace, DatabaseError } from "@/lib/supabase-admin"
import { createDefaultWorkspace } from "@/lib/demo-state"
import { validateWorkspaceState } from "@/lib/validate-state"
import type { AuditEntry, WorkspaceResponse } from "@/lib/types"

export const dynamic = "force-dynamic"
const MAX_BODY_BYTES = 12 * 1024 * 1024
const MAX_REQUEST_BYTES = 4 * 1024 * 1024

function publicAiStatus() {
  return { aiConfigured: Boolean(process.env.GEMINI_API_KEY), aiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite" }
}

export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request)
  if (!session.workspaceId) {
    const body: WorkspaceResponse = { mode: "preview", revision: 0, state: createDefaultWorkspace(), ...publicAiStatus() }
    const response = NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } })
    if (session.present) clearDemoCookie(response)
    return response
  }
  try {
    const workspace = await readWorkspace(session.workspaceId)
    if (!workspace || !validateWorkspaceState(workspace.payload)) return NextResponse.json({ error: "Saved demo workspace could not be loaded." }, { status: 404 })
    const payload = workspace.payload
    const body: WorkspaceResponse = {
      mode: "demo",
      revision: workspace.revision,
      state: { ...payload, sourceOverride: null },
      hasSourceOverride: Boolean(payload.sourceOverride),
      ...publicAiStatus(),
    }
    return NextResponse.json(body)
  } catch (error) {
    const status = error instanceof DatabaseError ? error.status : 503
    return NextResponse.json({ error: status === 503 ? "The private workspace store is temporarily unavailable." : "Unable to read this workspace." }, { status })
  }
}

export async function PUT(request: NextRequest) {
  if (!validateSameOrigin(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 })
  const session = sessionFromRequest(request)
  if (!session.workspaceId) return NextResponse.json({ error: "Start a private demo before saving changes." }, { status: 401 })
  const contentLength = Number(request.headers.get("content-length") || 0)
  const compressed = request.headers.get("x-body-compression") === "gzip"
  const maxRequest = compressed ? MAX_REQUEST_BYTES : 3 * 1024 * 1024
  if (contentLength > maxRequest) return NextResponse.json({ error: "The request is larger than the supported upload limit." }, { status: 413 })
  try {
    const received = Buffer.from(await request.arrayBuffer())
    if (received.byteLength > maxRequest) return NextResponse.json({ error: "The request is larger than the supported upload limit." }, { status: 413 })
    let decoded: Buffer
    try {
      decoded = compressed ? gunzipSync(received, { maxOutputLength: MAX_BODY_BYTES }) : received
    } catch {
      return NextResponse.json({ error: "Compressed source JSON could not be safely decompressed." }, { status: 400 })
    }
    if (decoded.byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: "The source import is larger than the 12 MB limit." }, { status: 413 })
    const input = JSON.parse(decoded.toString("utf8")) as { expectedRevision?: number; state?: unknown; action?: string }
    if (!Number.isSafeInteger(input.expectedRevision) || Number(input.expectedRevision) < 1) return NextResponse.json({ error: "Workspace revision is missing or invalid." }, { status: 400 })
    if (!validateWorkspaceState(input.state)) return NextResponse.json({ error: "Changes were rejected. Check campaign funnel limits, capacity values, and imported source format." }, { status: 422 })
    const previous = await readWorkspace(session.workspaceId)
    if (!previous) return NextResponse.json({ error: "Saved demo workspace could not be found." }, { status: 404 })
    if (previous.revision !== input.expectedRevision) return NextResponse.json({ error: "This workspace changed in another tab. Refresh to load the latest saved revision." }, { status: 409 })

    const actions: Record<string, string> = {
      campaign_edit: "Updated a campaign scenario",
      task_change: "Updated the action board",
      assumption_change: "Updated a planning assumption",
      source_import: "Imported a private historical JSON source",
      source_reset: "Restored the original historical source",
      assistant_task: "Created an AI-proposed action after user confirmation",
      ai_chat: "Saved a private analyst conversation",
    }
    const action = actions[input.action || ""] ?? "Saved workspace changes"
    const previousState = previous.payload as { auditLog?: AuditEntry[]; sourceOverride?: unknown }
    const priorLog = Array.isArray(previousState.auditLog) ? previousState.auditLog : []
    const auditEntry: AuditEntry = { id: randomUUID(), action, detail: "Saved to this private demo workspace.", createdAt: new Date().toISOString() }
    const incomingState = input.state
    const sourceOverride = input.action === "source_reset"
      ? null
      : incomingState.sourceOverride ?? previousState.sourceOverride ?? null
    const state = { ...incomingState, sourceOverride, auditLog: [...priorLog, auditEntry].slice(-100) }
    if (!validateWorkspaceState(state)) return NextResponse.json({ error: "Saved state is invalid." }, { status: 422 })
    const updated = await updateWorkspace(session.workspaceId, previous.revision, state)
    if (!updated) return NextResponse.json({ error: "This workspace changed in another tab. Refresh to load the latest saved revision." }, { status: 409 })
    void appendActivity(session.workspaceId, action, { revision: updated.revision }).catch(() => undefined)
    const payload = updated.payload
    if (!validateWorkspaceState(payload)) return NextResponse.json({ error: "Saved workspace data could not be verified." }, { status: 500 })
    return NextResponse.json({ mode: "demo", revision: updated.revision, state: { ...payload, sourceOverride: null }, hasSourceOverride: Boolean(payload.sourceOverride), ...publicAiStatus() })
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 })
    const status = error instanceof DatabaseError ? error.status : 503
    return NextResponse.json({ error: status === 503 ? "The private workspace store is temporarily unavailable." : "Unable to save changes." }, { status })
  }
}
