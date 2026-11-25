"use client"

import { useRef, useState } from "react"
import { AlertTriangle, ArrowDownToLine, ArrowRight, BookOpen, Check, CircleHelp, FileJson2, FileSpreadsheet, RotateCcw, Upload } from "lucide-react"
import type { HistoricalAnalytics, SourcePack } from "@/lib/analytics"
import type { WorkspaceState } from "@/lib/types"
import { formatDate, formatNumber } from "@/components/gateready/format"
import { putWorkspace } from "@/lib/client-workspace"

function validUpload(value: unknown): value is SourcePack {
  if (!value || typeof value !== "object") return false
  const pack = value as SourcePack
  const names = ["event", "targets", "campaigns", "dailyMarketing", "people", "engagement", "registrations", "registrationHistory", "checkins"]
  return pack.metadata?.sourceFormatVersion === 1 && Boolean(pack.sheets) && names.every((name) => Array.isArray(pack.sheets[name]))
}

const methodology = [
  { term: "Identified people", definition: "Distinct stable person_id with person_type = external and first_seen_at on or before the chosen date." },
  { term: "Engaged people", definition: "Distinct external person IDs with at least one deduplicated interaction event by the selected date." },
  { term: "Registrations", definition: "Distinct external people with a deduplicated registration_id and registered_at on or before the date; reconfirmation is not another person." },
  { term: "Latest confirmed", definition: "Registrations whose latest eligible Registration History state at the selected date is confirmed." },
  { term: "Verified visitors", definition: "Unique external person IDs with at least one deduplicated check-in where result is admitted and verification is verified." },
  { term: "Attendance campaign", definition: "The first eligible verified check-in’s own campaign_id. A blank campaign remains unattributed; registration campaign is never substituted." },
  { term: "Reach", definition: "Sum of reported platform reach by campaign-day. It can overlap across days and must not be described as unique people." },
  { term: "Net spend", definition: "Sum of deduplicated posted marketing_spend_inr rows, including negative credit adjustments." },
]

export function DataPanel({ history, state, demoActive, hasSourceOverride, onSave, onStartDemo, onDateImported }: {
  history: HistoricalAnalytics
  state: WorkspaceState
  demoActive: boolean
  hasSourceOverride: boolean
  onSave: (next: WorkspaceState, action: string) => Promise<void>
  onStartDemo: () => void
  onDateImported: (date: string) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const fieldGuide = history.fieldGuide.filter((field) => !search || `${field.source_table} ${field.field} ${field.meaning}`.toLowerCase().includes(search.toLowerCase()))
  const totalRows = history.inventory.reduce((sum, sheet) => sum + sheet.rows, 0)

  async function importSource(file?: File) {
    if (!file) return
    setError("")
    setMessage("")
    if (!file.name.toLowerCase().endsWith(".json") || file.size > 12 * 1024 * 1024) {
      setError("Choose a GateReady source JSON export smaller than 12 MB.")
      return
    }
    setBusy(true)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!validUpload(parsed)) throw new Error("This file is not a valid GateReady source JSON export. Download the companion JSON to see the required format.")
      const newDate = String(parsed.sheets.event[0]?.history_end ?? history.range.end).slice(0, 10)
      await onSave({ ...state, sourceOverride: parsed }, "source_import")
      onDateImported(newDate)
      setMessage("Private source override saved. The original workbook remains unchanged and can be restored below.")
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import this source file.")
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  async function restoreSource() {
    setBusy(true)
    setError("")
    try {
      await onSave({ ...state, sourceOverride: null }, "source_reset")
      onDateImported(history.originalRange.end)
      setMessage("Original workbook source restored. Any uploaded file remains separate from the original source.")
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Unable to restore the original source.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gr-page-stack">
      <section className="gr-welcome-row"><div><div className="gr-eyebrow">SOURCE REGISTRY · TRANSPARENT DEFINITIONS</div><h1>Know exactly what the numbers mean.</h1><p className="gr-page-intro">The dashboard uses the supplied workbook’s facts, explicit deduplication rules, and visible source limitations.</p></div><span className="gr-source-file-chip"><FileSpreadsheet size={17} aria-hidden="true" /> Attendee-Dataset-df0650.xlsx</span></section>
      <div className="gr-source-summary-grid"><article className="gr-card gr-source-summary"><span>Workbook tabs</span><strong>{formatNumber(history.inventory.length)}</strong><small>One source, all sheets preserved</small></article><article className="gr-card gr-source-summary"><span>Source rows</span><strong>{formatNumber(totalRows)}</strong><small>Including the field guide and event metadata</small></article><article className="gr-card gr-source-summary"><span>Historical window</span><strong>{formatDate(history.range.start, { year: undefined })} – {formatDate(history.range.end, { year: undefined })}</strong><small>Source event timezone: Asia/Kolkata</small></article><article className="gr-card gr-source-summary"><span>Attribution gaps</span><strong>{formatNumber(history.dataQuality.unattributedAttendees)}</strong><small>Verified arrivals without a campaign ID</small></article></div>

      {error && <div className="gr-form-error" role="alert">{error}</div>}{message && <div className="gr-inline-feedback" role="status"><Check size={15} aria-hidden="true" /> {message}</div>}
      <section className="gr-source-download-grid">
        <article className="gr-card gr-source-download-card"><span className="gr-download-icon"><FileSpreadsheet size={19} aria-hidden="true" /></span><div><span className="gr-section-kicker">ORIGINAL SOURCE</span><h2>Source workbook</h2><p>Download the unchanged 11-sheet spreadsheet from the project files.</p><a className="gr-button gr-button-outline" href="/api/download?asset=workbook"><ArrowDownToLine size={15} aria-hidden="true" /> Download .xlsx</a></div></article>
        <article className="gr-card gr-source-download-card"><span className="gr-download-icon json"><FileJson2 size={19} aria-hidden="true" /></span><div><span className="gr-section-kicker">MACHINE-READABLE</span><h2>Reviewable JSON export</h2><p>Workbook values, tab inventory, source-format version, and explicit import-compatible structure.</p><a className="gr-button gr-button-outline" href="/api/download?asset=json"><ArrowDownToLine size={15} aria-hidden="true" /> Download JSON</a></div></article>
      </section>

      <section className="gr-card gr-import-panel"><div className="gr-import-copy"><div className="gr-section-kicker">PRIVATE SANDBOX IMPORT</div><h2>{hasSourceOverride ? "A private source override is active" : "Try your own source export"}</h2><p>Upload a GateReady-format JSON file to this demo workspace. It replaces only this session&apos;s analysis view; the project workbook remains unchanged. Imported records are stored in the private workspace payload.</p></div><div className="gr-import-actions"><input ref={fileInput} className="gr-sr-only" id="gr-json-import" type="file" accept="application/json,.json" onChange={(event) => void importSource(event.target.files?.[0])} disabled={!demoActive || busy} /><label htmlFor="gr-json-import" className={`gr-button gr-button-primary${!demoActive || busy ? " is-disabled" : ""}`}><Upload size={15} aria-hidden="true" /> {busy ? "Saving…" : "Import source JSON"}</label>{hasSourceOverride && <button type="button" className="gr-button gr-button-ghost" disabled={!demoActive || busy} onClick={() => void restoreSource()}><RotateCcw size={15} aria-hidden="true" /> Restore original</button>}{!demoActive && <button type="button" className="gr-inline-link" onClick={onStartDemo}>Start private demo <ArrowRight size={14} aria-hidden="true" /></button>}</div></section>

      <div className="gr-source-quality-grid">
        <article className="gr-card gr-panel gr-quality-panel"><div className="gr-panel-heading"><div><div className="gr-section-kicker">DATA QUALITY CHECKS</div><h2>What was reconciled</h2></div><span className="gr-source-ok"><Check size={13} aria-hidden="true" /> Applied</span></div><div className="gr-quality-list"><Quality label="Repeated marketing activity IDs" count={history.dataQuality.deduplicatedRows.dailyMarketing} detail="Deduped by activity_id before spend, reach, click, and start aggregation." /><Quality label="Repeated registration history IDs" count={history.dataQuality.deduplicatedRows.registrationHistory} detail="Latest eligible status per registration at the selected snapshot is used." /><Quality label="Repeated admission event IDs" count={history.dataQuality.deduplicatedRows.checkins} detail="Deduped by event_id before applying the admitted + verified check-in rule." /><Quality label="Non-external people excluded" count={Object.values(history.dataQuality.excludedPeople).reduce((sum, value) => sum + value, 0)} detail={Object.entries(history.dataQuality.excludedPeople).map(([type, count]) => `${type}: ${formatNumber(count)}`).join(" · ")} /><Quality label="Raw verified admission events" count={history.dataQuality.verifiedAdmissionEvents} detail={`${formatNumber(history.dataQuality.uniqueVerifiedExternalAttendees)} unique external visitors after person-level deduplication.`} /></div></article>
        <article className="gr-card gr-panel gr-limitations-panel"><div className="gr-panel-heading"><div><div className="gr-section-kicker">LIMITS OF THIS SOURCE</div><h2>Do not infer what isn&apos;t measured</h2></div><AlertTriangle size={17} className="gr-heading-icon" aria-hidden="true" /></div><ul><li>Reach totals are platform-day sums, not unique audience members.</li><li>No randomized holdouts; channel comparisons are observational.</li><li>No venue-approved capacity, peak concurrency, arrival-time, or safety data.</li><li>No weather or travel-mode field to explain arrival variance.</li><li>Historical campaign attribution cannot prove causal incremental lift.</li></ul></article>
      </div>

      <article className="gr-card gr-schema-panel"><div className="gr-table-summary"><div><div className="gr-section-kicker">FIELD-BY-FIELD TRACEABILITY</div><h2>Source tab inventory</h2></div><span className="gr-schema-pill"><BookOpen size={14} aria-hidden="true" /> {formatNumber(history.fieldGuide.length)} fields documented</span></div><div className="gr-table-wrap"><table className="gr-data-table gr-schema-table"><thead><tr><th scope="col">Workbook tab</th><th scope="col">Rows</th><th scope="col">Fields</th><th scope="col">Selected fields</th></tr></thead><tbody>{history.inventory.map((sheet) => <tr key={sheet.name}><td><strong>{sheet.name}</strong></td><td>{formatNumber(sheet.rows)}</td><td>{formatNumber(sheet.headers.length)}</td><td><span className="gr-field-pills">{sheet.headers.slice(0, 5).map((header) => <code key={header}>{header}</code>)}{sheet.headers.length > 5 && <span>+{sheet.headers.length - 5} more</span>}</span></td></tr>)}</tbody></table></div></article>

      <article className="gr-card gr-fieldguide-panel"><div className="gr-table-summary"><div><div className="gr-section-kicker">DEFINITION LOOKUP</div><h2>Workbook field guide</h2></div><label className="gr-field-search">Search a field<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="table, field, meaning" /></label></div><div className="gr-table-wrap"><table className="gr-data-table gr-field-table"><thead><tr><th scope="col">Table</th><th scope="col">Field</th><th scope="col">Data type</th><th scope="col">Workbook meaning</th></tr></thead><tbody>{fieldGuide.slice(0, 40).map((field, index) => <tr key={`${field.source_table}-${field.field}-${index}`}><td>{field.source_table}</td><td><code>{field.field}</code></td><td>{field.data_type}</td><td>{field.meaning}</td></tr>)}</tbody></table>{fieldGuide.length > 40 && <p className="gr-field-count">Showing 40 of {formatNumber(fieldGuide.length)} matches. Narrow the search to find a specific field.</p>}{!fieldGuide.length && <p className="gr-field-count">No field definitions match that search.</p>}</div></article>

      <section className="gr-methodology-grid">{methodology.map((item) => <article className="gr-card gr-method-card" key={item.term}><span>{item.term}</span><p>{item.definition}</p></article>)}</section>
      <p className="gr-source-method"><CircleHelp size={14} aria-hidden="true" /> Unique visitor logic: stable person_id, external type, admitted result, verified status, one count per person. Check-in campaign_id is the sole attendance attribution source; empty stays unattributed.</p>
    </div>
  )
}

function Quality({ label, count, detail }: { label: string; count: number; detail: string }) {
  return <div className="gr-quality-row"><span className="gr-quality-count">{formatNumber(count)}</span><div><strong>{label}</strong><p>{detail}</p></div></div>
}
