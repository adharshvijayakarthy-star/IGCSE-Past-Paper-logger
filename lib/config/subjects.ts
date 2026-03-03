import { LevelType } from "@/types/domain"

export type SubjectCode = "0607" | "0620" | "0625"

export const SUBJECTS: { code: SubjectCode; label: string }[] = [
  { code: "0607", label: "Mathematics (0607)" },
  { code: "0620", label: "Chemistry (0620)" },
  { code: "0625", label: "Physics (0625)" }
]

export function isScienceSubject(subjectCode: string): boolean {
  return subjectCode === "0620" || subjectCode === "0625"
}

/**
 * Generate the allowed papers for a subject/level combination.
 *
 * Mathematics (0607):
 *  - Core     -> [1, 3, 5]
 *  - Extended -> [2, 4, 6]
 *
 * Sciences (0620, 0625):
 *  - Core     -> [1, 3] + selectable 5 or 6
 *  - Extended -> [2, 4, 6]
 */
export function generateAllowedPapers(
  subjectCode: string,
  level: LevelType,
  coreSciencePaperChoice?: number
): number[] {
  if (subjectCode === "0607") {
    return level === "core" ? [1, 3, 5] : [2, 4, 6]
  }

  if (isScienceSubject(subjectCode)) {
    if (level === "core") {
      const paper =
        coreSciencePaperChoice === 6
          ? 6
          : 5 // default to Paper 5 if not explicitly 6

      return [1, 3, paper]
    }

    // extended sciences
    return [2, 4, 6]
  }

  // Fallback: no specific mapping
  return []
}

