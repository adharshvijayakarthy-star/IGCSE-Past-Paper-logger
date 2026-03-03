import { db } from "./index"
import { LevelType, SubjectConfig } from "@/types/domain"
import {
  generateAllowedPapers,
  isScienceSubject
} from "@/lib/config/subjects"

export async function getSubjectConfigsForUser(
  userId: string
): Promise<SubjectConfig[]> {
  return db.subjectConfigs.where("userId").equals(userId).toArray()
}

export interface UpsertSubjectConfigParams {
  userId: string
  subjectCode: string
  level: LevelType
  coreSciencePaperChoice?: number
}

export async function upsertSubjectConfig(
  params: UpsertSubjectConfigParams
): Promise<SubjectConfig> {
  const { userId, subjectCode, level, coreSciencePaperChoice } = params

  const existing = await db.subjectConfigs
    .where("[userId+subjectCode]")
    .equals([userId, subjectCode])
    .first()

  const papers = generateAllowedPapers(
    subjectCode,
    level,
    isScienceSubject(subjectCode) && level === "core"
      ? coreSciencePaperChoice
      : undefined
  )

  if (existing) {
    const updated: SubjectConfig = {
      ...existing,
      level,
      papers
    }

    await db.subjectConfigs.put(updated)
    return updated
  }

  const created: SubjectConfig = {
    id: crypto.randomUUID(),
    userId,
    subjectCode,
    level,
    papers,
    createdAt: new Date()
  }

  await db.subjectConfigs.add(created)
  return created
}

