"use client"

import { useEffect, useMemo, useState } from "react"
import { db } from "@/lib/db"
import { useAppStore } from "@/store/appStore"
import { PaperAttempt, SubjectConfig } from "@/types/domain"
import { getSubjectConfigsForUser } from "@/lib/db/subjectConfig"

interface YearGroup {
  year: number
  attempts: PaperAttempt[]
}

export default function HistoryPage() {
  const activeUser = useAppStore((s) => s.activeUser)

  const [attempts, setAttempts] = useState<PaperAttempt[]>([])
  const [configs, setConfigs] = useState<SubjectConfig[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [selectedPaper, setSelectedPaper] = useState<number | null>(null)

  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(
    {}
  )
  const [expandedAttempts, setExpandedAttempts] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    if (!activeUser) {
      setAttempts([])
      setConfigs([])
      setSelectedSubject("")
      setSelectedPaper(null)
      return
    }

    db.paperAttempts
      .where("userId")
      .equals(activeUser.id)
      .toArray()
      .then((rows) => {
        const parsed = rows.map((attempt) => ({
          ...attempt,
          dateLogged: new Date(attempt.dateLogged)
        }))

        setAttempts(parsed)
      })

    getSubjectConfigsForUser(activeUser.id).then((userConfigs) => {
      setConfigs(userConfigs)

      if (userConfigs.length > 0) {
        const first = userConfigs[0]
        setSelectedSubject(first.subjectCode)
        setSelectedPaper(first.papers[0] ?? null)
      }
    })
  }, [activeUser])

  const selectedConfig = useMemo(
    () =>
      configs.find((config) => config.subjectCode === selectedSubject) ??
      null,
    [configs, selectedSubject]
  )

  const filteredAttempts: PaperAttempt[] =
    selectedSubject && selectedPaper
      ? attempts.filter(
          (attempt) =>
            attempt.subjectCode === selectedSubject &&
            attempt.paperNumber === selectedPaper
        )
      : []

  const groups: YearGroup[] = useMemo(() => {
    const byYear: Record<number, PaperAttempt[]> = {}

    filteredAttempts.forEach((attempt) => {
      const year = attempt.year
      if (!byYear[year]) {
        byYear[year] = []
      }
      byYear[year].push(attempt)
    })

    return Object.entries(byYear)
      .map(([year, yearAttempts]) => ({
        year: Number(year),
        attempts: yearAttempts.sort(
          (a, b) =>
            b.dateLogged.getTime() - a.dateLogged.getTime()
        )
      }))
      .sort((a, b) => b.year - a.year)
  }, [filteredAttempts])

  function toggleYear(year: number) {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year]
    }))
  }

  function toggleAttempt(id: string) {
    setExpandedAttempts((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const hasAttempts = attempts.length > 0

  return (
    <div className="col-span-12 space-y-6">
      <h1 className="text-2xl font-semibold">History</h1>

      {/* Filters */}
      <section className="rounded-lg border px-4 py-4 space-y-3">
        <h2 className="text-sm font-medium">Filters</h2>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6 space-y-1">
            <label className="text-xs uppercase tracking-wide">
              Subject
            </label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={selectedSubject}
              onChange={(e) => {
                const code = e.target.value
                setSelectedSubject(code)
                const config = configs.find(
                  (c) => c.subjectCode === code
                )
                setSelectedPaper(config?.papers[0] ?? null)
              }}
              disabled={configs.length === 0}
            >
              {configs.length === 0 && (
                <option value="">
                  No configured subjects
                </option>
              )}
              {configs.length > 0 &&
                configs.map((config) => (
                  <option
                    key={config.id}
                    value={config.subjectCode}
                  >
                    {config.subjectCode}
                  </option>
                ))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-6 space-y-1">
            <label className="text-xs uppercase tracking-wide">
              Paper
            </label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={selectedPaper ?? ""}
              onChange={(e) =>
                setSelectedPaper(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              disabled={!selectedConfig}
            >
              {!selectedConfig && (
                <option value="">
                  Select a subject
                </option>
              )}
              {selectedConfig &&
                selectedConfig.papers.map((paper) => (
                  <option key={paper} value={paper}>
                    Paper {paper}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

      {!hasAttempts || filteredAttempts.length === 0 ? (
        <div className="col-span-12 flex items-center justify-center py-16">
          <p className="text-sm opacity-80">
            {hasAttempts
              ? "No history for this paper yet."
              : "No papers logged yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = !!expandedYears[group.year]

            return (
              <section
                key={group.year}
                className="rounded-lg border"
              >
                <button
                  type="button"
                  onClick={() => toggleYear(group.year)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-medium">
                      {group.year}
                    </span>
                    <span className="text-xs">
                      {group.attempts.length} entries
                    </span>
                  </div>
                  <span className="text-xs">
                    {isExpanded ? "Hide" : "Show"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 py-3 space-y-2">
                    {group.attempts.map((attempt) => {
                      const isAttemptExpanded =
                        !!expandedAttempts[attempt.id]
                      const percent =
                        attempt.marksAttempted > 0
                          ? (attempt.marksScored /
                              attempt.marksAttempted) *
                            100
                          : 0

                      return (
                        <div
                          key={attempt.id}
                          className="rounded-md border px-3 py-2"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleAttempt(attempt.id)
                            }
                            className="w-full flex items-center justify-between text-left"
                          >
                            <div className="flex flex-col gap-1 text-sm">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-medium">
                                  {attempt.subjectCode}
                                </span>
                                <span className="text-xs">
                                  Paper {attempt.paperNumber}
                                </span>
                                <span className="text-xs">
                                  {attempt.session}
                                </span>
                                <span className="text-xs">
                                  Variant {attempt.variant}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 text-sm">
                              <div className="flex flex-wrap items-center gap-3">
                                <span>
                                  {attempt.marksScored}/
                                  {attempt.officialTotal}
                                </span>
                                <span>
                                  {percent.toFixed(0)}%
                                </span>
                                <span className="text-xs">
                                  {attempt.difficulty}/10
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs status-badge ${
                                    attempt.completionStatus ===
                                    "complete"
                                      ? "status-badge-complete"
                                      : "status-badge-partial"
                                  }`}
                                >
                                  {attempt.completionStatus ===
                                  "complete"
                                    ? "Complete"
                                    : "Partial"}
                                </span>
                              </div>
                            </div>
                          </button>

                          {isAttemptExpanded && (
                            <div className="mt-2 pt-2 border-t text-xs space-y-1">
                              <div className="flex flex-wrap gap-4">
                                <span>
                                  Marks attempted:{" "}
                                  {attempt.marksAttempted}
                                </span>
                                <span>
                                  Date logged:{" "}
                                  {attempt.dateLogged.toLocaleDateString()}
                                </span>
                              </div>
                              {attempt.comment && (
                                <p>
                                  Comment: {attempt.comment}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

