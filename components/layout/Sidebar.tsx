"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Log", href: "/log" },
  { label: "History", href: "/history" },
  { label: "Settings", href: "/settings" }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="h-screen w-60 flex-shrink-0 border-r">
      <div className="h-16 flex items-center px-4">
        <span className="text-sm font-semibold tracking-tight">
          IGCSE Paper Logger
        </span>
      </div>

      <nav className="px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center rounded-md px-3 py-2 text-sm ${
                isActive ? "font-semibold" : "font-normal"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

