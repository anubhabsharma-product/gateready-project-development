const supabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

export class DatabaseError extends Error {
  status: number
  constructor(message: string, status = 503) {
    super(message)
    this.name = "DatabaseError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = supabaseUrl()
  const key = supabaseKey()
  if (!url || !key) throw new DatabaseError("Supabase server credentials are not configured.")
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  const body = await response.text()
  if (!response.ok) {
    throw new DatabaseError(`Supabase request failed (${response.status}): ${body.slice(0, 240)}`, response.status >= 500 ? 503 : response.status)
  }
  if (!body) return undefined as T
  return JSON.parse(body) as T
}

export type StoredWorkspace = { workspace_id: string; revision: number; payload: unknown; created_at: string; updated_at: string }

export async function createWorkspace(payload: unknown) {
  const rows = await request<StoredWorkspace[]>("gateready_demo_workspaces?select=workspace_id,revision,payload,created_at,updated_at", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ payload, revision: 1 }),
  })
  if (!rows?.[0]) throw new DatabaseError("Supabase did not return the created workspace.")
  return rows[0]
}

export async function readWorkspace(workspaceId: string) {
  const rows = await request<StoredWorkspace[]>(`gateready_demo_workspaces?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=workspace_id,revision,payload,created_at,updated_at&limit=1`)
  return rows?.[0] ?? null
}

export async function updateWorkspace(workspaceId: string, expectedRevision: number, payload: unknown) {
  const rows = await request<StoredWorkspace[]>(`gateready_demo_workspaces?workspace_id=eq.${encodeURIComponent(workspaceId)}&revision=eq.${expectedRevision}&select=workspace_id,revision,payload,created_at,updated_at`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ payload, revision: expectedRevision + 1, updated_at: new Date().toISOString() }),
  })
  return rows?.[0] ?? null
}

export async function appendActivity(workspaceId: string, action: string, detail: Record<string, unknown>) {
  await request("gateready_demo_activity", {
    method: "POST",
    body: JSON.stringify({ workspace_id: workspaceId, action, detail }),
  })
}

export function databaseConfigured() {
  return Boolean(supabaseUrl() && supabaseKey())
}
