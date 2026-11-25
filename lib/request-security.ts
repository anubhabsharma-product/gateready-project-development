import type { NextRequest } from "next/server"

export function validateSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const expectedHost = request.headers.get("x-forwarded-host") || request.headers.get("host")
  const trustedHost = expectedHost?.split(",")[0]?.trim().toLowerCase()
  if (!trustedHost) return false
  let supplied: URL
  try {
    supplied = new URL(origin || referer || "")
  } catch {
    return false
  }
  const suppliedHost = supplied.host.toLowerCase()
  if (suppliedHost !== trustedHost) return false
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  if (forwardedProto && supplied.protocol !== `${forwardedProto}:`) return false
  return true
}
