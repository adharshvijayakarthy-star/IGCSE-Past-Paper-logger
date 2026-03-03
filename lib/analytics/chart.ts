import { PaperAttempt } from "@/types/domain"

export function buildPerformanceChartData(
  attempts: PaperAttempt[],
  mode: "percent" | "raw"
) {
  return attempts
    .sort((a, b) => a.dateLogged.getTime() - b.dateLogged.getTime())
    .map((attempt) => {
      const percent =
        attempt.marksAttempted > 0
          ? (attempt.marksScored / attempt.marksAttempted) * 100
          : 0

      return {
        date: attempt.dateLogged.toLocaleDateString(),
        value:
          mode === "percent"
            ? Math.round(percent)
            : attempt.marksScored
      }
    })
}