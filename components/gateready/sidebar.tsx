"use client"

import { Bot, ChartNoAxesCombined, Database, Gauge, LayoutDashboard, ListChecks, Sparkles, TicketCheck } from "lucide-react"

export type ViewKey = "overview" | "campaigns" | "bets" | "tasks" | "capacity" | "data" | "analyst"

const navigation: Array<{ id: ViewKey; label: string; icon: typeof LayoutDashboard; group: string }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { id: "campaigns", label: "Campaigns", icon: ChartNoAxesCombined, group: "WORKSPACE" },
  { id: "bets", label: "Growth bets", icon: Sparkles, group: "GROWTH SYSTEM" },
  { id: "tasks", label: "Action board", icon: ListChecks, group: "GROWTH SYSTEM" },
  { id: "capacity", label: "Capacity lab", icon: Gauge, group: "PLANNING" },
  { id: "data", label: "Source & data", icon: Database, group: "PLANNING" },
  { id: "analyst", label: "AI analyst", icon: Bot, group: "INTELLIGENCE" },
]

export function Sidebar({ active, onNavigate, demoActive }: { active: ViewKey; onNavigate: (key: ViewKey) => void; demoActive: boolean }) {
  let priorGroup = ""
  return (
    <aside className="gr-sidebar">
      <div className="gr-brand">
        <div className="gr-brand-mark"><TicketCheck size={21} aria-hidden="true" /></div>
        <div className="gr-brand-wordmark">Gate<span>Ready</span><small>ATTENDEE GROWTH</small></div>
      </div>
      <div className="gr-org-card">
        <div className="gr-org-monogram" aria-hidden="true">SF</div>
        <div className="gr-org-copy"><strong>IIT Kharagpur</strong><span>Spring Fest · Mumbai plan</span></div>
        <span className="gr-org-chevron" aria-hidden="true">⌄</span>
      </div>
      <nav aria-label="Main navigation" className="gr-nav">
        {navigation.map((item) => {
          const Icon = item.icon
          const showGroup = priorGroup !== item.group
          priorGroup = item.group
          return (
            <div key={item.id}>
              {showGroup && <div className="gr-nav-label">{item.group}</div>}
              <button type="button" className={`gr-nav-item${active === item.id ? " is-active" : ""}`} onClick={() => onNavigate(item.id)} aria-current={active === item.id ? "page" : undefined}>
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
                {item.id === "analyst" && <span className="gr-ai-nav-dot" aria-hidden="true" />}
              </button>
            </div>
          )
        })}
      </nav>
      <div className="gr-sidebar-bottom">
        <div className={`gr-storage-status${demoActive ? " is-live" : ""}`}>
          <span className="gr-status-light" aria-hidden="true" />
          <span>{demoActive ? "Private workspace saved" : "Read-only preview"}</span>
        </div>
        <div className="gr-user-card">
          <div className="gr-user-avatar" aria-hidden="true">AS</div>
          <div className="gr-user-copy"><strong>Growth team</strong><span>Student organizer</span></div>
          <span className="gr-user-menu" aria-hidden="true">···</span>
        </div>
      </div>
    </aside>
  )
}
