"use client"

import type { ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Cloud, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AnalystLauncher({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger render={<Button className="gr-ama-launcher" />} aria-label="Open Ask me anything">
        <span className="gr-ama-cloud" aria-hidden="true"><Cloud /><Sparkles className="gr-ama-sparkles" /></span>
        <span>Ask me anything</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="gr-ama-backdrop" />
        <Dialog.Popup className="gr-ama-popup">
          <header className="gr-ama-header">
            <span className="gr-ama-header-icon" aria-hidden="true"><Sparkles size={18} /></span>
            <div>
              <Dialog.Title>Ask me anything</Dialog.Title>
              <Dialog.Description>GateReady analyst · uses your selected snapshot</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close analyst" render={<Button variant="ghost" size="icon-lg" />}><X /></Dialog.Close>
          </header>
          <div className="gr-ama-body">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
