"use client"

import type { ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { MessageSquare, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AnalystLauncher({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger render={<Button className="gr-ama-launcher" />}>
        <MessageSquare aria-hidden="true" />
        <span>AI analyst</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="gr-ama-backdrop" />
        <Dialog.Popup className="gr-ama-popup">
          <header className="gr-ama-header">
            <div>
              <Dialog.Title>AI analyst</Dialog.Title>
              <Dialog.Description>Ask about the selected snapshot.</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close analyst" render={<Button variant="ghost" size="icon-lg" />}><X /></Dialog.Close>
          </header>
          <div className="gr-ama-body">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
