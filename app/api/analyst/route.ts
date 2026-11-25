import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { answerWithGemini } from "@/lib/analyst"
import { sessionFromRequest } from "@/lib/demo-session"
import { validateSameOrigin } from "@/lib/request-security"
import { appendActivity, readWorkspace, updateWorkspace, DatabaseError } from "@/lib/supabase-admin"
import { validateWorkspaceState } from "@/lib/validate-state"
import { getHistoryRange } from "@/lib/analytics"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 })
  const session = sessionFromRequest(request)
  if (!session.workspaceId) return NextResponse.json({ error: "Open a private demo before using the analyst." }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "Gemini is not configured yet. Add GEMINI_API_KEY to the project environment, then retry." }, { status: 503 })
  try {
    const body = await request.json() as { question?: unknown; date?: unknown; campaignId?: unknown }
    if (typeof body.question !== "string" || body.question.trim().length < 2 || body.question.length > 2500) return NextResponse.json({ error: "Ask a question between 2 and 2,500 characters." }, { status: 400 })
    const workspace = await readWorkspace(session.workspaceId)
    if (!workspace || !validateWorkspaceState(workspace.payload)) return NextResponse.json({ error: "Saved demo workspace could not be found." }, { status: 404 })
    const state = workspace.payload
    const range = getHistoryRange(state.sourceOverride ?? undefined)
    const date = typeof body.date === "string" && body.date >= range.start && body.date <= range.end ? body.date : range.end
    const campaignId = typeof body.campaignId === "string" && state.campaigns.some((campaign) => campaign.campaignId === body.campaignId) ? body.campaignId : undefined
    const history = state.conversation.slice(-8).map((entry) => ({ role: entry.role, text: entry.text }))
    const answer = await answerWithGemini({ workspaceId: session.workspaceId, state, question: body.question.trim(), history, date, campaignId })
    const timestamp = new Date().toISOString()
    const userEntry = { id: randomUUID(), role: "user" as const, text: body.question.trim(), createdAt: timestamp }
    const assistantEntry = { id: randomUUID(), role: "assistant" as const, text: answer.text, createdAt: timestamp, taskProposal: answer.taskProposal }
    const conversation = [...state.conversation, userEntry, assistantEntry].slice(-30)
    const updated = await updateWorkspace(session.workspaceId, workspace.revision, { ...state, conversation })
    if (!updated) return NextResponse.json({ error: "The analysis completed, but this workspace changed in another tab. Refresh before asking again." }, { status: 409 })
    void appendActivity(session.workspaceId, "Saved a private analyst conversation", { revision: updated.revision }).catch(() => undefined)
    const payload = updated.payload
    if (!validateWorkspaceState(payload)) return NextResponse.json({ error: "The saved analyst workspace could not be verified." }, { status: 500 })
    return NextResponse.json({ ...answer, conversation: payload.conversation, revision: updated.revision, state: { ...payload, sourceOverride: null }, hasSourceOverride: Boolean(payload.sourceOverride) })
  } catch (error) {
    if (error instanceof DatabaseError) return NextResponse.json({ error: "The private workspace store is temporarily unavailable." }, { status: error.status })
    const code = error instanceof Error ? error.message : ""
    const messages: Record<string, string> = {
      RATE_LIMITED: "The analyst is at its short-term request limit. Wait a minute, then try again.",
      GEMINI_RATE_LIMITED: "Gemini is temporarily rate-limiting this project. Wait briefly, then try again.",
      GEMINI_UNAVAILABLE: "Gemini is temporarily overloaded. Retry shortly; GateReady will not switch to a different model.",
      GEMINI_MODEL_UNAVAILABLE: "The configured Gemini model was not accepted. Check GEMINI_MODEL against Google's current model list.",
      GEMINI_REQUEST_FAILED: "Gemini could not complete this request. Please retry.",
      GEMINI_EMPTY_RESPONSE: "Gemini returned no answer. Please rephrase the question and retry.",
      GEMINI_TOOL_LIMIT: "The analysis needed more tool steps than this request allows. Ask a narrower question.",
    }
    if (code === "AbortError" || code === "TimeoutError") return NextResponse.json({ error: "Gemini took too long to answer. Please retry." }, { status: 504 })
    return NextResponse.json({ error: messages[code] ?? "The analysis could not be completed." }, { status: 502 })
  }
}
