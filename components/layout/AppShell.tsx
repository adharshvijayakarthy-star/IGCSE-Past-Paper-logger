"use client"

import { useEffect } from "react"
import { useAppStore } from "@/store/appStore"
import { MainLayout } from "./MainLayout"

export function AppShell({ children }: { children: React.ReactNode }) {
  const initialize = useAppStore((s) => s.initialize)
  const initialized = useAppStore((s) => s.initialized)
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!initialized) return

    const root = document.documentElement
    root.classList.remove("theme-dark", "theme-pastel")
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-pastel")
  }, [theme, initialized])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Initializing...</p>
      </div>
    )
  }

  return <MainLayout>{children}</MainLayout>
}