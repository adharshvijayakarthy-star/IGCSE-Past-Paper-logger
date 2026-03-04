import { db } from "@/lib/db"
import { PaperAttempt, SubjectConfig, User } from "@/types/domain"

interface BackupPayload {
  version: number
  exportedAt: string
  users: User[]
  subjectConfigs: SubjectConfig[]
  paperAttempts: PaperAttempt[]
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function exportBackup(): Promise<void> {
  const [users, subjectConfigs, paperAttempts] = await Promise.all([
    db.users.toArray(),
    db.subjectConfigs.toArray(),
    db.paperAttempts.toArray()
  ])

  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    users,
    subjectConfigs,
    paperAttempts
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  })

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `igcse-paper-backup-${formatDateForFilename(new Date())}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function parseUsers(rawUsers: unknown[]): User[] {
  return rawUsers.map((user) => {
    const typed = user as User & { createdAt: string | Date }
    return {
      ...typed,
      createdAt: new Date(typed.createdAt)
    }
  })
}

function parseSubjectConfigs(rawConfigs: unknown[]): SubjectConfig[] {
  return rawConfigs.map((config) => {
    const typed = config as SubjectConfig & { createdAt: string | Date }
    return {
      ...typed,
      createdAt: new Date(typed.createdAt)
    }
  })
}

function parsePaperAttempts(rawAttempts: unknown[]): PaperAttempt[] {
  return rawAttempts.map((attempt) => {
    const typed = attempt as PaperAttempt & { dateLogged: string | Date }
    return {
      ...typed,
      dateLogged: new Date(typed.dateLogged)
    }
  })
}

export async function importBackup(file: File): Promise<void> {
  let parsed: unknown

  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error("Invalid backup file.")
  }

  const data = parsed as {
    users?: unknown
    subjectConfigs?: unknown
    paperAttempts?: unknown
  }

  if (
    !Array.isArray(data.users) ||
    !Array.isArray(data.subjectConfigs) ||
    !Array.isArray(data.paperAttempts)
  ) {
    throw new Error("Invalid backup file.")
  }

  const users = parseUsers(data.users)
  const subjectConfigs = parseSubjectConfigs(data.subjectConfigs)
  const paperAttempts = parsePaperAttempts(data.paperAttempts)

  await db.transaction(
    "rw",
    db.users,
    db.subjectConfigs,
    db.paperAttempts,
    async () => {
      await db.users.clear()
      await db.subjectConfigs.clear()
      await db.paperAttempts.clear()

      if (users.length > 0) {
        await db.users.bulkAdd(users)
      }
      if (subjectConfigs.length > 0) {
        await db.subjectConfigs.bulkAdd(subjectConfigs)
      }
      if (paperAttempts.length > 0) {
        await db.paperAttempts.bulkAdd(paperAttempts)
      }
    }
  )
}
