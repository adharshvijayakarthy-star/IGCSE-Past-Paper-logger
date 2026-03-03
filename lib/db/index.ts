import Dexie, { Table } from "dexie"
import { User, SubjectConfig, PaperAttempt } from "@/types/domain"

class IGCSEDatabase extends Dexie {
  users!: Table<User>
  subjectConfigs!: Table<SubjectConfig>
  paperAttempts!: Table<PaperAttempt>

  constructor() {
    super("igcsePaperLogger")

    // Initial schema
    this.version(1).stores({
      users: "id, name, createdAt",
      subjectConfigs: "id, userId, subjectCode",
      paperAttempts:
        "id, userId, subjectCode, year, session, variant, paperNumber, dateLogged"
    })

    // Subject configuration enhancements (non-destructive)
    this.version(2)
      .stores({
        users: "id, name, createdAt",
        subjectConfigs:
          "id, userId, subjectCode, createdAt, [userId+subjectCode]",
        paperAttempts:
          "id, userId, subjectCode, year, session, variant, paperNumber, dateLogged"
      })

      this.version(3).stores({
        users: "id, name, createdAt",
        subjectConfigs:
          "id, userId, subjectCode, createdAt, [userId+subjectCode]",
        paperAttempts:
          "id, userId, subjectCode, year, session, variant, paperNumber, dateLogged, [userId+subjectCode+year+session+variant+paperNumber]"
      })
      .upgrade((tx) => {
        const table = tx.table<SubjectConfig>("subjectConfigs")

        return table.toCollection().modify((config) => {
          if (!(config as any).createdAt) {
            ;(config as any).createdAt = new Date()
          }
        })
      })
  }
}

export const db = new IGCSEDatabase()