import { PaperAttempt } from "@/types/domain"

export function computeDashboardStats(attempts: PaperAttempt[]) {
  const totalPapers = attempts.length

  if (totalPapers === 0) {
    return {
      totalPapers: 0,
      completionRate: 0,
      bestSubject: "-"
    }
  }

  const completed = attempts.filter(
    (a) => a.completionStatus === "complete"
  ).length

  const completionRate = Math.round((completed / totalPapers) * 100)

  const subjectMap: Record<string, number[]> = {}

  attempts.forEach((a) => {
    if (!subjectMap[a.subjectCode]) {
      subjectMap[a.subjectCode] = []
    }

    const percent = (a.marksScored / a.officialTotal) * 100
    subjectMap[a.subjectCode].push(percent)
  })

  let bestSubject = "-"
  let bestAverage = 0

  Object.entries(subjectMap).forEach(([subject, scores]) => {
    const avg =
      scores.reduce((sum, val) => sum + val, 0) / scores.length

    if (avg > bestAverage) {
      bestAverage = avg
      bestSubject = subject
    }
  })

  return {
    totalPapers,
    completionRate,
    bestSubject
  }
}