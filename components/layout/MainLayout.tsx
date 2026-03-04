"use client"

import type React from "react"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex app-layout-shell">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <TopBar />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 lg:px-6 lg:py-8 transition-opacity duration-200">
            <div className="grid grid-cols-12 gap-4 lg:gap-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
