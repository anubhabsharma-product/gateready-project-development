import { NextRequest, NextResponse } from "next/server"
import { createDefaultWorkspace } from "@/lib/demo-state"
import { sessionFromRequest, setDemoCookie } from "@/lib/demo-session"
import { createWorkspace, readWorkspace, DatabaseError } from "@/lib/supabase-admin"
import { validateSameOrigin } from "@/lib/request-security"
import { validateWorkspaceState } from "@/lib/validate-state"
import type { WorkspaceState } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 })
  const session = sessionFromRequest(request)
  if (session.present && !session.workspaceId) return NextResponse.json({ error: "Demo session is invalid. Refresh to start a new session." }, { status: 401 })
  try {
    if (session.workspaceId) {
      const existing = await readWorkspace(session.workspaceId)
      if (existing && validateWorkspaceState(existing.payload)) {
        const payload = existing.payload
        const response = NextResponse.json({ mode: "demo", revision: existing.revision, state: { ...payload, sourceOverride: null }, hasSourceOverride: Boolean(payload.sourceOverride), aiConfigured: Boolean(process.env.GEMINI_API_KEY), aiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite" }, { headers: { "Cache-Control": "private, no-store" } })
        setDemoCookie(request, response, existing.workspace_id)
        return response
      }
      return NextResponse.json({ error: "The saved demo workspace is unavailable." }, { status: 404 })
    }
    const state = createDefaultWorkspace()
    if (!validateWorkspaceState(state)) return NextResponse.json({ error: "The starter workspace could not be validated." }, { status: 500 })
    const created = await createWorkspace(state)
    const response = NextResponse.json({ mode: "demo", revision: created.revision, state: created.payload as WorkspaceState, aiConfigured: Boolean(process.env.GEMINI_API_KEY), aiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite" }, { status: 201, headers: { "Cache-Control": "private, no-store" } })
    setDemoCookie(request, response, created.workspace_id)
    // Create time is already recorded with the workspace row; do not store browser-provided identity data.
    return response
  } catch (error) {
    const status = error instanceof DatabaseError ? error.status : 503
    return NextResponse.json({ error: status === 503 ? "The private demo store is not reachable. Try again in a moment." : "The demo workspace could not be opened." }, { status })
  }
}
