const SCIENCE_TOTALS: Record<number, number> = {
  1: 40,
  2: 80,
  3: 40,
  4: 80,
  5: 40,
  6: 40
}

const MATH_TOTALS_2025_ONWARDS: Record<number, number> = {
  1: 60,
  2: 75,
  3: 60,
  4: 75,
  5: 40,
  6: 50
}

const MATH_TOTALS_PRE_2025: Record<number, number> = {
  1: 40,
  2: 40,
  3: 96,
  4: 120,
  5: 36,
  6: 60
}

export function getOfficialTotal(
  subjectCode: string,
  paperNumber: number,
  year: number
): number {
  if (!paperNumber || !year) return 0

  const subject = subjectCode.trim()

  if (subject === "0607") {
    const totals =
      year >= 2025 ? MATH_TOTALS_2025_ONWARDS : MATH_TOTALS_PRE_2025
    return totals[paperNumber] ?? 0
  }

  if (subject === "0620" || subject === "0625") {
    return SCIENCE_TOTALS[paperNumber] ?? 0
  }

  return 0
}
