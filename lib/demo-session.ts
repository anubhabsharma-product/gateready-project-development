import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import type { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "gateready_demo"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14
let developmentSecret: string | undefined

function signingSecret() {
  const configuredSecret = process.env.DEMO_SESSION_SECRET?.trim()
  if (configuredSecret) return configuredSecret
  const databaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (databaseSecret) return createHmac("sha256", databaseSecret).update("gateready:demo-session:v1").digest("hex")
  if (process.env.NODE_ENV === "production") return null
  developmentSecret ??= randomBytes(32).toString("hex")
  return developmentSecret
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex")
}

export function issueDemoToken(workspaceId: string) {
  const secret = signingSecret()
  if (!secret) throw new Error("DEMO_SESSION_SECRET is required in production.")
  const expiry = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS
  const content = `${workspaceId}.${expiry}`
  return `${content}.${sign(content, secret)}`
}

export function verifyDemoToken(token: string | undefined) {
  if (!token) return null
  const secret = signingSecret()
  if (!secret) return null
  const [workspaceId, expiryText, signature, extra] = token.split(".")
  if (!workspaceId || !expiryText || !signature || extra) return null
  const expiry = Number(expiryText)
  if (!Number.isSafeInteger(expiry) || expiry < Math.floor(Date.now() / 1000)) return null
  const expected = sign(`${workspaceId}.${expiry}`, secret)
  const left = Buffer.from(signature, "hex")
  const right = Buffer.from(expected, "hex")
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  return workspaceId
}

export function sessionFromRequest(request: NextRequest) {
  const rawToken = request.cookies.get(COOKIE_NAME)?.value
  if (!rawToken) return { present: false as const, workspaceId: null }
  return { present: true as const, workspaceId: verifyDemoToken(rawToken) }
}

export function setDemoCookie(response: NextResponse, workspaceId: string) {
  response.cookies.set(COOKIE_NAME, issueDemoToken(workspaceId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}

export function clearDemoCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 })
}
