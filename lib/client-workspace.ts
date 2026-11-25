export async function putWorkspace(body: unknown) {
  const json = JSON.stringify(body)
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  let requestBody: BodyInit = json
  if (new TextEncoder().encode(json).byteLength > 1024 * 1024 && typeof CompressionStream !== "undefined") {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))
    requestBody = await new Response(stream).arrayBuffer()
    headers["x-body-compression"] = "gzip"
  }
  const response = await fetch("/api/workspace", { method: "PUT", headers, body: requestBody })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Unable to save the private workspace.")
  return result
}
