import { NextRequest, NextResponse } from "next/server"
import { getHistoricalAnalytics, getHistoryRange } from "@/lib/analytics"
import { sessionFromRequest } from "@/lib/demo-session"
import { readWorkspace, DatabaseError } from "@/lib/supabase-admin"
import { validateWorkspaceState } from "@/lib/validate-state"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request)
  if (session.present && !session.workspaceId) return NextResponse.json({ error: "Demo session is invalid." }, { status: 401 })
  try {
    let sourceOverride = null
    if (session.workspaceId) {
      const workspace = await readWorkspace(session.workspaceId)
      if (!workspace || !validateWorkspaceState(workspace.payload)) return NextResponse.json({ error: "Saved demo workspace could not be found." }, { status: 404 })
      sourceOverride = workspace.payload.sourceOverride
    }
    const range = getHistoryRange(sourceOverride ?? undefined)
    const requestedDate = request.nextUrl.searchParams.get("date") || range.end
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || requestedDate < range.start || requestedDate > range.end) {
      return NextResponse.json({ error: `Choose a date between ${range.start} and ${range.end}.` }, { status: 400 })
    }
    const campaign = request.nextUrl.searchParams.get("campaign") || undefined
    const result = getHistoricalAnalytics(requestedDate, campaign, sourceOverride)
    return NextResponse.json(result)
  } catch (error) {
    const status = error instanceof DatabaseError ? error.status : 503
    return NextResponse.json({ error: status === 503 ? "Historical analytics could not be loaded." : "Unable to load this snapshot." }, { status })
  }
}
