import { db } from "./index"
import { PaperAttempt } from "@/types/domain"

export interface UpsertPaperAttemptParams {
  userId: string
  subjectCode: string
  year: number
  session: string
  variant: string
  paperNumber: number
  marksScored: number
  marksAttempted: number
  officialTotal: number
  difficulty: number
  comment?: string
  manualOverride: boolean
}

export async function upsertPaperAttempt(
  params: UpsertPaperAttemptParams
) {
  const {
    userId,
    subjectCode,
    year,
    session,
    variant,
    paperNumber,
    marksScored,
    marksAttempted,
    officialTotal,
    difficulty,
    comment,
    manualOverride
  } = params

  const existing = await db.paperAttempts
    .where("[userId+subjectCode+year+session+variant+paperNumber]")
    .equals([userId, subjectCode, year, session, variant, paperNumber])
    .first()

  const completionStatus =
    manualOverride || marksAttempted >= officialTotal
      ? "complete"
      : "partial"

  const attempt: PaperAttempt = {
    id: existing?.id ?? crypto.randomUUID(),
    userId,
    subjectCode,
    year,
    session,
    variant,
    paperNumber,
    marksScored,
    marksAttempted,
    officialTotal,
    completionStatus,
    difficulty,
    comment,
    dateLogged: new Date()
  }

  await db.paperAttempts.put(attempt)

  return attempt
}