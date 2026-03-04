"use client"

import { useAppStore } from "@/store/appStore"

export function TopBar() {
  const activeUser = useAppStore((s) => s.activeUser)
  const theme = useAppStore((s) => s.theme)

  return (
    <header className="h-16 flex items-center justify-between px-4 border-b bg-[var(--surface)]">
      <div>
        <span className="text-sm font-medium tracking-tight">
          Overview
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="text-muted">Theme: {theme}</span>
        <span>
          User: {activeUser ? activeUser.name : "No active user"}
        </span>
      </div>
    </header>
  )
}
