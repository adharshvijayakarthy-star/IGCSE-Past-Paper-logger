import { db } from "./index"
import { PaperAttempt } from "@/types/domain"

export interface UpsertPaperAttemptParams {
  id?: string
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

export class DuplicatePaperAttemptError extends Error {
  constructor() {
    super("This paper has already been logged. Edit the existing entry instead.")
    this.name = "DuplicatePaperAttemptError"
  }
}

export async function upsertPaperAttempt(
  params: UpsertPaperAttemptParams
) {
  const {
    id,
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

  if (existing && existing.id !== id) {
    throw new DuplicatePaperAttemptError()
  }

  const completionStatus =
    manualOverride || marksAttempted >= officialTotal
      ? "complete"
      : "partial"

  const attempt: PaperAttempt = {
    id: id ?? existing?.id ?? crypto.randomUUID(),
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
