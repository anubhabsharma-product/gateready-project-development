"use client"

import Image from "next/image"
import { ChartNoAxesCombined, Database, FlaskConical, Gauge, LayoutDashboard, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ViewKey = "overview" | "campaigns" | "bets" | "tasks" | "capacity" | "data"

const navigation: Array<{ id: ViewKey; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "campaigns", label: "Campaigns", icon: ChartNoAxesCombined },
  { id: "bets", label: "Growth bets", icon: FlaskConical },
  { id: "tasks", label: "Action board", icon: ListChecks },
  { id: "capacity", label: "Capacity lab", icon: Gauge },
  { id: "data", label: "Source & data", icon: Database },
]

export function Sidebar({ active, onNavigate }: { active: ViewKey; onNavigate: (key: ViewKey) => void }) {
  return (
    <aside className="gr-sidebar">
      <div className="gr-brand">
        <Image src="/gateready-mark.png" alt="" width={48} height={48} className="gr-brand-mark" />
        <div className="gr-brand-wordmark">Gate<span>Ready</span></div>
      </div>
      <nav aria-label="Main navigation" className="gr-nav">
        {navigation.map(({ id, label, icon: Icon }) => (
          <Button key={id} type="button" variant="ghost" className={cn("gr-nav-item", active === id && "is-active")} onClick={() => onNavigate(id)} aria-current={active === id ? "page" : undefined}>
            <Icon data-icon="inline-start" aria-hidden="true" />
            <span>{label}</span>
          </Button>
        ))}
      </nav>
    </aside>
  )
}
