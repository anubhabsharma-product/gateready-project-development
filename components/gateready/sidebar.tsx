"use client"

import Image from "next/image"
import { ChartNoAxesCombined, Database, Gauge, LayoutDashboard, ListChecks, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ViewKey = "overview" | "campaigns" | "bets" | "tasks" | "capacity" | "data"

const navigation: Array<{ id: ViewKey; label: string; icon: typeof LayoutDashboard; group: string }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { id: "campaigns", label: "Campaigns", icon: ChartNoAxesCombined, group: "WORKSPACE" },
  { id: "bets", label: "Growth bets", icon: Sparkles, group: "GROWTH SYSTEM" },
  { id: "tasks", label: "Action board", icon: ListChecks, group: "GROWTH SYSTEM" },
  { id: "capacity", label: "Capacity lab", icon: Gauge, group: "PLANNING" },
  { id: "data", label: "Source & data", icon: Database, group: "PLANNING" },
]

export function Sidebar({ active, onNavigate, demoActive }: { active: ViewKey; onNavigate: (key: ViewKey) => void; demoActive: boolean }) {
  let priorGroup = ""
  return (
    <aside className="gr-sidebar">
      <div className="gr-brand">
        <Image src="/gateready-mark.png" alt="" width={48} height={48} className="gr-brand-mark" />
        <div><div className="gr-brand-wordmark">Gate<span>Ready</span></div><div className="gr-brand-caption">ATTENDEE GROWTH</div></div>
      </div>
      <nav aria-label="Main navigation" className="gr-nav">
        {navigation.map((item) => {
          const Icon = item.icon
          const showGroup = priorGroup !== item.group
          priorGroup = item.group
          return (
            <div key={item.id}>
              {showGroup && <div className="gr-nav-label">{item.group}</div>}
              <Button type="button" variant="ghost" className={cn("gr-nav-item", active === item.id && "is-active")} onClick={() => onNavigate(item.id)} aria-current={active === item.id ? "page" : undefined}>
                <Icon data-icon="inline-start" aria-hidden="true" />
                <span>{item.label}</span>
              </Button>
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
        </div>
      </div>
    </aside>
  )
}
