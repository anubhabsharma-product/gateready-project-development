import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/demo-session"
import { readWorkspace, DatabaseError } from "@/lib/supabase-admin"
import { validateWorkspaceState } from "@/lib/validate-state"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const asset = request.nextUrl.searchParams.get("asset")
  if (asset === "workbook") {
    try {
      const file = await readFile(join(process.cwd(), "data", "Attendee-Dataset-df0650.xlsx"))
      return new NextResponse(file, { headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Attendee-Dataset-df0650.xlsx"',
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      } })
    } catch {
      return NextResponse.json({ error: "Original workbook is unavailable." }, { status: 404 })
    }
  }
  if (asset !== "json") return NextResponse.json({ error: "Choose an available source file." }, { status: 400 })
  const session = sessionFromRequest(request)
  if (session.present && !session.workspaceId) return NextResponse.json({ error: "Demo session is invalid." }, { status: 401 })
  try {
    let body: Buffer
    if (session.workspaceId) {
      const workspace = await readWorkspace(session.workspaceId)
      if (!workspace || !validateWorkspaceState(workspace.payload)) return NextResponse.json({ error: "Saved demo workspace could not be found." }, { status: 404 })
      if (workspace.payload.sourceOverride) {
        body = Buffer.from(JSON.stringify(workspace.payload.sourceOverride))
        return new NextResponse(body, { headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="gateready-source-override.json"',
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        } })
      }
    }
    body = await readFile(join(process.cwd(), "data", "historical-source.json"))
    return new NextResponse(body, { headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="gateready-historical-source.json"',
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    } })
  } catch (error) {
    const status = error instanceof DatabaseError ? error.status : 503
    return NextResponse.json({ error: status === 503 ? "The source export could not be prepared." : "The source export is unavailable." }, { status })
  }
}
