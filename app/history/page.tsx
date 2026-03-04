"use client"

import { useEffect, useMemo, useState } from "react"
import { db } from "@/lib/db"
import { useAppStore } from "@/store/appStore"
import { PaperAttempt, SubjectConfig } from "@/types/domain"
import { getSubjectConfigsForUser } from "@/lib/db/subjectConfig"
import { upsertPaperAttempt } from "@/lib/db/paperAttempt"
import { Toast } from "@/components/ui/toast"

interface YearGroup {
  year: number
  attempts: PaperAttempt[]
}

type SortOption = "newest" | "oldest" | "highest" | "lowest"

const SESSIONS = ["May/June", "Oct/Nov", "Feb/March"] as const

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from(
  { length: CURRENT_YEAR - 2009 + 1 },
  (_, i) => CURRENT_YEAR - i
)

export default function HistoryPage() {
  const activeUser = useAppStore((s) => s.activeUser)

  const [attempts, setAttempts] = useState<PaperAttempt[]>([])
  const [configs, setConfigs] = useState<SubjectConfig[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [selectedPaper, setSelectedPaper] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("newest")

  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(
    {}
  )
  const [expandedAttempts, setExpandedAttempts] = useState<
    Record<string, boolean>
  >({})

  const [editingAttempt, setEditingAttempt] = useState<PaperAttempt | null>(null)
  const [editYear, setEditYear] = useState(CURRENT_YEAR)
  const [editSession, setEditSession] =
    useState<(typeof SESSIONS)[number]>("May/June")
  const [editVariantNumber, setEditVariantNumber] = useState<number>(1)
  const [editMarksScored, setEditMarksScored] = useState<number | "">("")
  const [editMarksAttempted, setEditMarksAttempted] =
    useState<number | "">("")
  const [editOfficialTotal, setEditOfficialTotal] = useState<number | "">("")
  const [editDifficulty, setEditDifficulty] = useState(5)
  const [editComment, setEditComment] = useState("")
  const [editManualOverride, setEditManualOverride] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const [toast, setToast] = useState<{
    message: string
    variant: "success" | "error"
  } | null>(null)

  useEffect(() => {
    if (!activeUser) {
      setAttempts([])
      setConfigs([])
      setSelectedSubject("")
      setSelectedPaper(null)
      return
    }

    void refreshAttempts(activeUser.id)

    getSubjectConfigsForUser(activeUser.id).then((userConfigs) => {
      setConfigs(userConfigs)

      if (userConfigs.length > 0) {
        const first = userConfigs[0]
        setSelectedSubject(first.subjectCode)
        setSelectedPaper(first.papers[0] ?? null)
      }
    })
  }, [activeUser])

  useEffect(() => {
    if (!editingAttempt) return

    setEditYear(editingAttempt.year)
    setEditSession(editingAttempt.session as (typeof SESSIONS)[number])

    const variantString = editingAttempt.variant.toString()
    const lastDigit = variantString.charAt(variantString.length - 1)
    const parsedVariant = Number(lastDigit) || 1
    setEditVariantNumber(parsedVariant)

    setEditMarksScored(editingAttempt.marksScored)
    setEditMarksAttempted(editingAttempt.marksAttempted)
    setEditOfficialTotal(editingAttempt.officialTotal)
    setEditDifficulty(editingAttempt.difficulty)
    setEditComment(editingAttempt.comment ?? "")
    setEditManualOverride(
      editingAttempt.completionStatus === "complete" &&
        editingAttempt.marksAttempted < editingAttempt.officialTotal
    )
  }, [editingAttempt])

  async function refreshAttempts(userId: string) {
    const rows = await db.paperAttempts
      .where("userId")
      .equals(userId)
      .toArray()

    const parsed = rows.map((attempt) => ({
      ...attempt,
      dateLogged: new Date(attempt.dateLogged)
    }))

    setAttempts(parsed)
  }

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

  const sortedFilteredAttempts = useMemo(() => {
    const percent = (attempt: PaperAttempt) =>
      attempt.marksAttempted > 0
        ? (attempt.marksScored / attempt.marksAttempted) * 100
        : 0

    return [...filteredAttempts].sort((a, b) => {
      if (sortBy === "newest") {
        return b.dateLogged.getTime() - a.dateLogged.getTime()
      }

      if (sortBy === "oldest") {
        return a.dateLogged.getTime() - b.dateLogged.getTime()
      }

      if (sortBy === "highest") {
        return percent(b) - percent(a)
      }

      return percent(a) - percent(b)
    })
  }, [filteredAttempts, sortBy])

  const groups: YearGroup[] = useMemo(() => {
    const byYear: Record<number, PaperAttempt[]> = {}

    sortedFilteredAttempts.forEach((attempt) => {
      const year = attempt.year
      if (!byYear[year]) {
        byYear[year] = []
      }
      byYear[year].push(attempt)
    })

    return Object.entries(byYear)
      .map(([year, yearAttempts]) => ({
        year: Number(year),
        attempts: yearAttempts
      }))
      .sort((a, b) =>
        sortBy === "oldest" ? a.year - b.year : b.year - a.year
      )
  }, [sortedFilteredAttempts, sortBy])

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

  async function handleDeleteAttempt(id: string) {
    if (!activeUser) return

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this entry?"
    )

    if (!confirmed) return

    try {
      await db.paperAttempts.delete(id)
      await refreshAttempts(activeUser.id)
      setToast({
        message: "Entry deleted successfully",
        variant: "success"
      })
    } catch {
      setToast({
        message: "Failed to save paper. Please try again.",
        variant: "error"
      })
    }
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeUser || !editingAttempt) return

    const numericEditMarksScored =
      typeof editMarksScored === "number" ? editMarksScored : 0
    const numericEditMarksAttempted =
      typeof editMarksAttempted === "number" ? editMarksAttempted : 0
    const numericEditOfficialTotal =
      typeof editOfficialTotal === "number" && editOfficialTotal > 0
        ? editOfficialTotal
        : 0

    if (numericEditOfficialTotal <= 0) return

    const variant = `${editingAttempt.paperNumber}${editVariantNumber}`

    setEditSaving(true)
    try {
      await upsertPaperAttempt({
        id: editingAttempt.id,
        userId: activeUser.id,
        subjectCode: editingAttempt.subjectCode,
        year: editYear,
        session: editSession,
        variant,
        paperNumber: editingAttempt.paperNumber,
        marksScored: numericEditMarksScored,
        marksAttempted: numericEditMarksAttempted,
        officialTotal: numericEditOfficialTotal,
        difficulty: editDifficulty,
        comment: editComment.trim() || undefined,
        manualOverride: editManualOverride
      })

      await refreshAttempts(activeUser.id)
      setEditingAttempt(null)
      setToast({
        message: "Paper updated successfully",
        variant: "success"
      })
    } catch {
      setToast({
        message: "Failed to save paper. Please try again.",
        variant: "error"
      })
    } finally {
      setEditSaving(false)
    }
  }

  const hasAttempts = attempts.length > 0

  return (
    <div className="col-span-12 space-y-6">
      <h1 className="text-2xl font-semibold">History</h1>

      <section className="card-elevated px-4 py-4 space-y-3">
        <h2 className="text-sm font-medium">Filters</h2>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4 space-y-1">
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

          <div className="col-span-12 md:col-span-4 space-y-1">
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

          <div className="col-span-12 md:col-span-4 space-y-1">
            <label className="text-xs uppercase tracking-wide">
              Sort by
            </label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as SortOption)
              }
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Highest Score</option>
              <option value="lowest">Lowest Score</option>
            </select>
          </div>
        </div>
      </section>

      {!hasAttempts || filteredAttempts.length === 0 ? (
        <div className="col-span-12 flex items-center justify-center py-16">
          <p className="text-sm text-muted">
            Your logged papers will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = !!expandedYears[group.year]

            return (
              <section
                key={group.year}
                className="card-elevated"
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
                    <span className="text-xs text-muted">
                      {group.attempts.length} entries
                    </span>
                  </div>
                  <span className="text-xs text-muted">
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
                          className="rounded-md border bg-[var(--surface-alt)] px-3 py-2"
                        >
                          <div className="w-full flex items-center justify-between gap-3 text-left">
                            <button
                              type="button"
                              onClick={() =>
                                toggleAttempt(attempt.id)
                              }
                              className="flex-1 text-left"
                            >
                              <div className="flex flex-col gap-1 text-sm">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="font-medium">
                                    {attempt.subjectCode}
                                  </span>
                                  <span className="text-xs text-muted">
                                    Paper {attempt.paperNumber}
                                  </span>
                                  <span className="text-xs text-muted">
                                    {attempt.session}
                                  </span>
                                  <span className="text-xs text-muted">
                                    Variant {attempt.variant}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                  <span>
                                    {attempt.marksScored}/
                                    {attempt.officialTotal}
                                  </span>
                                  <span>
                                    {percent.toFixed(0)}%
                                  </span>
                                  <span className="text-xs text-muted">
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

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() =>
                                  setEditingAttempt(attempt)
                                }
                              >
                                ✏ Edit
                              </button>
                              <button
                                type="button"
                                className="btn-danger"
                                onClick={() =>
                                  void handleDeleteAttempt(
                                    attempt.id
                                  )
                                }
                              >
                                🗑 Delete
                              </button>
                            </div>
                          </div>

                          {isAttemptExpanded && (
                            <div className="mt-2 pt-2 border-t text-xs text-muted space-y-1">
                              <div className="flex flex-wrap gap-4">
                                <span>
                                  Marks attempted: {" "}
                                  {attempt.marksAttempted}
                                </span>
                                <span>
                                  Date logged: {" "}
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

      {editingAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 overlay-backdrop backdrop-blur-sm"
            onClick={() => setEditingAttempt(null)}
          />
          <div className="relative z-50 w-full max-w-3xl mx-4 rounded-2xl border bg-[var(--surface)] shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <form
              onSubmit={handleEditSave}
              className="space-y-4 text-sm"
            >
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6 space-y-1">
                  <label className="text-xs uppercase tracking-wide">
                    Year
                  </label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={editYear}
                    onChange={(e) =>
                      setEditYear(Number(e.target.value))
                    }
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-6 space-y-1">
                  <label className="text-xs uppercase tracking-wide">
                    Session
                  </label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={editSession}
                    onChange={(e) =>
                      setEditSession(
                        e.target.value as (typeof SESSIONS)[number]
                      )
                    }
                  >
                    {SESSIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide">
                  Variant number
                </label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={editVariantNumber}
                  onChange={(e) =>
                    setEditVariantNumber(Number(e.target.value))
                  }
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 space-y-1">
                  <label className="text-xs uppercase tracking-wide">
                    Marks scored
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={editMarksScored}
                    onChange={(e) => {
                      const value = e.target.value
                      setEditMarksScored(
                        value === "" ? "" : Number(value)
                      )
                    }}
                  />
                </div>
                <div className="col-span-4 space-y-1">
                  <label className="text-xs uppercase tracking-wide">
                    Marks attempted
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={editMarksAttempted}
                    onChange={(e) => {
                      const value = e.target.value
                      setEditMarksAttempted(
                        value === "" ? "" : Number(value)
                      )
                    }}
                  />
                </div>
                <div className="col-span-4 space-y-1">
                  <label className="text-xs uppercase tracking-wide">
                    Official total
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={editOfficialTotal}
                    onChange={(e) => {
                      const value = e.target.value
                      setEditOfficialTotal(
                        value === "" ? "" : Number(value)
                      )
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide">
                  Difficulty
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={editDifficulty}
                    onChange={(e) =>
                      setEditDifficulty(Number(e.target.value))
                    }
                    className="flex-1"
                  />
                  <span className="text-xs">
                    {editDifficulty}/10
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide">
                  Comment
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={editComment}
                  onChange={(e) =>
                    setEditComment(e.target.value)
                  }
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editManualOverride}
                  onChange={(e) =>
                    setEditManualOverride(e.target.checked)
                  }
                />
                <span>Mark as fully complete (override)</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingAttempt(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="btn-primary"
                >
                  {editSaving && (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  )}
                  {editSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
