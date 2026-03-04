"use client"

import { useEffect } from "react"

type ToastVariant = "success" | "error"

interface ToastProps {
  message: string
  variant?: ToastVariant
  durationMs?: number
  onClose: () => void
}

export function Toast({
  message,
  variant = "success",
  durationMs = 2000,
  onClose
}: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs, onClose])

  const icon = variant === "success" ? "✓" : "!"
  const toneStyle = {
    borderColor:
      variant === "success"
        ? "color-mix(in oklab, var(--success) 35%, var(--border))"
        : "color-mix(in oklab, var(--accent) 35%, var(--border))"
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={toneStyle}
      className="fixed bottom-6 right-6 z-[100] rounded-lg border bg-[var(--surface)] px-4 py-3 shadow-lg"
    >
      <p className="text-sm">
        <span className="mr-2">{icon}</span>
        {message}
      </p>
    </div>
  )
}
