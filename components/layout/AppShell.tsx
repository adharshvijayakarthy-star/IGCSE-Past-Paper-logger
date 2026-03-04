"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAppStore } from "@/store/appStore"
import { MainLayout } from "./MainLayout"

export function AppShell({ children }: { children: React.ReactNode }) {
  const initialize = useAppStore((s) => s.initialize)
  const initialized = useAppStore((s) => s.initialized)
  const activeUser = useAppStore((s) => s.activeUser)
  const theme = useAppStore((s) => s.theme)
  const router = useRouter()
  const pathname = usePathname()
  const isOnboardingRoute = pathname.startsWith("/onboarding")

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!initialized) return

    const root = document.documentElement
    root.classList.remove("theme-dark", "theme-pastel")
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-pastel")
  }, [theme, initialized])

  useEffect(() => {
    if (!initialized) return

    if (!activeUser && !isOnboardingRoute) {
      router.replace("/onboarding")
      return
    }

    if (activeUser && isOnboardingRoute) {
      router.replace("/dashboard")
    }
  }, [activeUser, initialized, isOnboardingRoute, router])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Initializing...</p>
      </div>
    )
  }

  if (!activeUser && !isOnboardingRoute) {
    return null
  }

  if (activeUser && isOnboardingRoute) {
    return null
  }

  if (isOnboardingRoute) {
    return <>{children}</>
  }

  return <MainLayout>{children}</MainLayout>
}
