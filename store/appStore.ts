    "use client"

import { create } from "zustand"
import { User, ThemeType } from "@/types/domain"
import { db } from "@/lib/db"

interface AppState {
  activeUser: User | null
  theme: ThemeType
  initialized: boolean

  initialize: () => Promise<void>
  setTheme: (theme: ThemeType) => void
  setActiveUser: (user: User) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  activeUser: null,
  theme: "dark",
  initialized: false,

  initialize: async () => {
    await db.open()

    const users = await db.users.toArray()

    if (users.length > 0) {
      const user = users[0]

      set({
        activeUser: user,
        theme: user.settings.theme,
        initialized: true
      })
    } else {
      set({ initialized: true })
    }
  },

  setTheme: (theme) => {
    const user = get().activeUser

    if (user) {
      db.users.update(user.id, {
        settings: { theme }
      })
    }

    set({ theme })
  },

  setActiveUser: (user) => {
    set({ activeUser: user })
  }
}))