import { PaperAttempt } from "@/types/domain"

function toPercent(attempt: PaperAttempt): number {
  if (attempt.marksAttempted <= 0) return 0
  return (attempt.marksScored / attempt.marksAttempted) * 100
}

export function buildScoreDistribution(attempts: PaperAttempt[]) {
  const buckets = {
    "90-100": 0,
    "80-89": 0,
    "70-79": 0,
    "60-69": 0,
    "50-59": 0,
    "Below 50": 0
  }

  attempts.forEach((attempt) => {
    const score = toPercent(attempt)

    if (score >= 90) buckets["90-100"] += 1
    else if (score >= 80) buckets["80-89"] += 1
    else if (score >= 70) buckets["70-79"] += 1
    else if (score >= 60) buckets["60-69"] += 1
    else if (score >= 50) buckets["50-59"] += 1
    else buckets["Below 50"] += 1
  })

  return [
    { range: "90-100", count: buckets["90-100"] },
    { range: "80-89", count: buckets["80-89"] },
    { range: "70-79", count: buckets["70-79"] },
    { range: "60-69", count: buckets["60-69"] },
    { range: "50-59", count: buckets["50-59"] },
    { range: "Below 50", count: buckets["Below 50"] }
  ]
}

export function buildDifficultyScatter(attempts: PaperAttempt[]) {
  return attempts.map((attempt) => ({
    difficulty: attempt.difficulty,
    percentage: Number(toPercent(attempt).toFixed(1)),
    year: attempt.year,
    session: attempt.session,
    variant: attempt.variant,
    paperNumber: attempt.paperNumber,
    date: attempt.dateLogged.toLocaleDateString()
  }))
}

export function buildCompletionBreakdown(attempts: PaperAttempt[]) {
  const complete = attempts.filter(
    (attempt) => attempt.completionStatus === "complete"
  ).length
  const partial = attempts.length - complete

  return [
    { status: "Complete", count: complete },
    { status: "Partial", count: partial }
  ]
}

export function buildYearPerformance(attempts: PaperAttempt[]) {
  const byYear: Record<number, number[]> = {}

  attempts.forEach((attempt) => {
    if (!byYear[attempt.year]) {
      byYear[attempt.year] = []
    }

    byYear[attempt.year].push(toPercent(attempt))
  })

  return Object.entries(byYear)
    .map(([year, values]) => {
      const average =
        values.reduce((sum, value) => sum + value, 0) / values.length

      return {
        year: Number(year),
        averageScore: Number(average.toFixed(1))
      }
    })
    .sort((a, b) => a.year - b.year)
}

export function buildDifficultyByPaper(attempts: PaperAttempt[]) {
  const byPaper: Record<number, number[]> = {}

  attempts.forEach((attempt) => {
    if (!byPaper[attempt.paperNumber]) {
      byPaper[attempt.paperNumber] = []
    }

    byPaper[attempt.paperNumber].push(attempt.difficulty)
  })

  return Object.entries(byPaper)
    .map(([paperNumber, values]) => {
      const average =
        values.reduce((sum, value) => sum + value, 0) / values.length
      const paper = Number(paperNumber)

      return {
        paperNumber: paper,
        paper: `Paper ${paper}`,
        averageDifficulty: Number(average.toFixed(1))
      }
    })
    .sort((a, b) => a.paperNumber - b.paperNumber)
}
