import { PaperAttempt } from "@/types/domain"

export function buildPerformanceChartData(
  attempts: PaperAttempt[],
  mode: "percent" | "raw"
) {
  const sortedAttempts = [...attempts].sort(
    (a, b) => a.dateLogged.getTime() - b.dateLogged.getTime()
  )

  const values = sortedAttempts.map((attempt) => {
    const percent =
      attempt.marksAttempted > 0
        ? (attempt.marksScored / attempt.marksAttempted) * 100
        : 0

    return mode === "percent"
      ? Math.round(percent)
      : attempt.marksScored
  })

  return sortedAttempts.map((attempt, index) => {
    const startIndex = Math.max(0, index - 2)
    const windowValues = values.slice(startIndex, index + 1)
    const avg =
      windowValues.reduce((sum, value) => sum + value, 0) /
      windowValues.length

    return {
      date: attempt.dateLogged.toLocaleDateString(),
      value: values[index],
      movingAvg: Number(avg.toFixed(1)),
      year: attempt.year,
      session: attempt.session,
      variant: attempt.variant,
      paperNumber: attempt.paperNumber
    }
  })
}
