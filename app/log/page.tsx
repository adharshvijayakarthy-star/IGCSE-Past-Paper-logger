"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppStore } from "@/store/appStore"
import { getSubjectConfigsForUser } from "@/lib/db/subjectConfig"
import { upsertPaperAttempt } from "@/lib/db/paperAttempt"
import { db } from "@/lib/db"
import { PaperAttempt, SubjectConfig } from "@/types/domain"

const SESSIONS = ["May/June", "Oct/Nov", "Feb/March"] as const

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from(
  { length: CURRENT_YEAR - 2009 + 1 },
  (_, i) => CURRENT_YEAR - i
)

export default function LogPage() {
  const activeUser = useAppStore((s) => s.activeUser)

  const [mode, setMode] = useState<"none" | "create" | "edit">("none")

  const [configs, setConfigs] = useState<SubjectConfig[]>([])
  const [subject, setSubject] = useState("")
  const [paper, setPaper] = useState<number | null>(null)

  const [year, setYear] = useState(CURRENT_YEAR)
  const [session, setSession] = useState<(typeof SESSIONS)[number]>("May/June")
  const [variantNumber, setVariantNumber] = useState<number>(1)

  const [marksScored, setMarksScored] = useState<number | "">("")
  const [marksAttempted, setMarksAttempted] = useState<number | "">("")
  const [officialTotal, setOfficialTotal] = useState<number | "">(80)

  const [difficulty, setDifficulty] = useState(5)
  const [comment, setComment] = useState("")
  const [manualOverride, setManualOverride] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [attempts, setAttempts] = useState<PaperAttempt[]>([])
  const [editingAttempt, setEditingAttempt] = useState<PaperAttempt | null>(null)
  const [editYear, setEditYear] = useState(CURRENT_YEAR)
  const [editSession, setEditSession] =
    useState<(typeof SESSIONS)[number]>("May/June")
  const [editVariantNumber, setEditVariantNumber] = useState<number>(1)
  const [editMarksScored, setEditMarksScored] = useState<number | "">("")
  const [editMarksAttempted, setEditMarksAttempted] =
    useState<number | "">("")
  const [editOfficialTotal, setEditOfficialTotal] =
    useState<number | "">(80)
  const [editDifficulty, setEditDifficulty] = useState(5)
  const [editComment, setEditComment] = useState("")
  const [editManualOverride, setEditManualOverride] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    if (!activeUser) {
      setConfigs([])
      setAttempts([])
      return
    }

    getSubjectConfigsForUser(activeUser.id).then(setConfigs)

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
  }, [activeUser])

  const selectedConfig = useMemo(
    () => configs.find((c) => c.subjectCode === subject),
    [configs, subject]
  )

  const numericMarksScored = typeof marksScored === "number" ? marksScored : 0
  const numericMarksAttempted =
    typeof marksAttempted === "number" ? marksAttempted : 0
  const numericOfficialTotal =
    typeof officialTotal === "number" && officialTotal > 0 ? officialTotal : 0

  const percentage =
    numericMarksAttempted > 0
      ? Math.max(
          0,
          Math.min(100, (numericMarksScored / numericMarksAttempted) * 100)
        )
      : 0

  const completionStatus =
    manualOverride || numericMarksAttempted >= numericOfficialTotal
      ? "complete"
      : "partial"

  const subjectError = !subject
  const paperError = !selectedConfig || !paper
  const marksRangeError =
    numericMarksScored < 0 ||
    numericMarksAttempted < 0 ||
    (numericOfficialTotal > 0 &&
      (numericMarksScored > numericOfficialTotal ||
        numericMarksAttempted > numericOfficialTotal))
  const difficultyError = difficulty < 1 || difficulty > 10

  const isFebSession = session === "Feb/March"

  useEffect(() => {
    if (isFebSession) {
      setVariantNumber(2)
    }
  }, [isFebSession])

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

  const isFormValid =
    !!activeUser &&
    !subjectError &&
    !paperError &&
    !marksRangeError &&
    !difficultyError &&
    numericOfficialTotal > 0

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeUser || !paper || !isFormValid) return

    const variant = `${paper}${variantNumber}`

    setSaving(true)
    setSuccessMessage(null)

    try {
      await upsertPaperAttempt({
        userId: activeUser.id,
        subjectCode: subject,
        year,
        session,
        variant,
        paperNumber: paper,
        marksScored: numericMarksScored,
        marksAttempted: numericMarksAttempted,
        officialTotal: numericOfficialTotal,
        difficulty,
        comment: comment.trim() || undefined,
        manualOverride
      })

      setSubject("")
      setPaper(null)
      setYear(CURRENT_YEAR)
      setSession("May/June")
      setVariantNumber(1)
      setMarksScored("")
      setMarksAttempted("")
      setOfficialTotal(80)
      setDifficulty(5)
      setComment("")
      setManualOverride(false)

      setSuccessMessage("Paper logged successfully.")
    } finally {
      setSaving(false)
    }
  }

  const filteredEditAttempts: PaperAttempt[] =
    mode === "edit" && subject && paper
      ? attempts.filter(
          (attempt) =>
            attempt.subjectCode === subject &&
            attempt.paperNumber === paper
        )
      : []

  const editGroups = useMemo(() => {
    const byYear: Record<number, PaperAttempt[]> = {}

    filteredEditAttempts.forEach((attempt) => {
      const yearValue = attempt.year
      if (!byYear[yearValue]) {
        byYear[yearValue] = []
      }
      byYear[yearValue].push(attempt)
    })

    return Object.entries(byYear)
      .map(([yearValue, yearAttempts]) => ({
        year: Number(yearValue),
        attempts: yearAttempts.sort(
          (a, b) =>
            b.dateLogged.getTime() - a.dateLogged.getTime()
        )
      }))
      .sort((a, b) => b.year - a.year)
  }, [filteredEditAttempts])

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

      const rows = await db.paperAttempts
        .where("userId")
        .equals(activeUser.id)
        .toArray()
      const parsed = rows.map((attempt) => ({
        ...attempt,
        dateLogged: new Date(attempt.dateLogged)
      }))
      setAttempts(parsed)

      setEditingAttempt(null)
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteAttempt(id: string) {
    if (!activeUser) return

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this entry?"
    )
    if (!confirmed) return

    await db.paperAttempts.delete(id)

    const rows = await db.paperAttempts
      .where("userId")
      .equals(activeUser.id)
      .toArray()
    const parsed = rows.map((attempt) => ({
      ...attempt,
      dateLogged: new Date(attempt.dateLogged)
    }))
    setAttempts(parsed)
    setEditingAttempt(null)
  }

  if (mode === "none") {
    return (
      <div className="col-span-12 max-w-5xl flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-xl font-semibold">Log past papers</h2>
          <p className="text-sm">
            Choose what you want to do.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            className="min-w-[200px] rounded-md border px-4 py-3 text-sm font-medium"
            onClick={() => setMode("create")}
          >
            Log New Past Paper
          </button>
          <button
            type="button"
            className="min-w-[200px] rounded-md border px-4 py-3 text-sm font-medium"
            onClick={() => setMode("edit")}
          >
            Edit Previous Entry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="col-span-12 max-w-5xl">
      {mode === "create" && (
        <>
          <h2 className="text-xl font-semibold mb-6">Log Paper</h2>

          <form onSubmit={handleSave} className="space-y-6">
        {/* Section A — Paper Information */}
        <section className="rounded-lg border px-4 py-4 space-y-4">
          <h3 className="text-sm font-medium">Paper information</h3>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 space-y-1">
              <label className="text-xs uppercase tracking-wide">
                Subject
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value)
                  setPaper(null)
                }}
              >
                <option value="">Select subject</option>
                {configs.map((c) => (
                  <option key={c.id} value={c.subjectCode}>
                    {c.subjectCode}
                  </option>
                ))}
              </select>
              {subjectError && (
                <p className="mt-1 text-xs helper-text">
                  Please select a subject.
                </p>
              )}
            </div>

            <div className="col-span-6 md:col-span-2 space-y-1">
              <label className="text-xs uppercase tracking-wide">
                Year
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-6 md:col-span-2 space-y-1">
              <label className="text-xs uppercase tracking-wide">
                Session
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={session}
                onChange={(e) =>
                  setSession(e.target.value as (typeof SESSIONS)[number])
                }
              >
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 md:col-span-2 space-y-1">
              <label className="text-xs uppercase tracking-wide">
                Variant number
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={isFebSession ? 2 : variantNumber}
                onChange={(e) =>
                  !isFebSession &&
                  setVariantNumber(Number(e.target.value))
                }
                disabled={isFebSession}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section B — Paper Selection */}
        <section className="rounded-lg border px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Paper selection</h3>
            {selectedConfig && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                Level: {selectedConfig.level}
              </span>
            )}
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 space-y-1">
              <label className="text-xs uppercase tracking-wide">
                Paper
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={paper ?? ""}
                onChange={(e) =>
                  setPaper(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                disabled={!selectedConfig}
              >
                <option value="">Select paper</option>
                {selectedConfig?.papers.map((p) => (
                  <option key={p} value={p}>
                    Paper {p}
                  </option>
                ))}
              </select>
              {paperError && (
                <p className="mt-1 text-xs helper-text">
                  Select a subject and paper.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section C — Marks & Performance */}
        <section className="rounded-lg border px-4 py-4 space-y-4">
          <h3 className="text-sm font-medium">Marks & performance</h3>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4 space-y-1">
              <label className="text-xs uppercase tracking-wide">
                Marks scored
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={marksScored}
                onChange={(e) => {
                  const value = e.target.value
                  setMarksScored(
                    value === "" ? "" : Number(value)
                  )
                }}
              />
            </div>

            <div className="col-span-12 md:col-span-4 space-y-1">
              <label className="text-xs uppercase tracking-wide">
                Marks attempted
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={marksAttempted}
                onChange={(e) => {
                  const value = e.target.value
                  setMarksAttempted(
                    value === "" ? "" : Number(value)
                  )
                }}
              />
            </div>

            <div className="col-span-12 md:col-span-4 space-y-1">
              <label className="text-xs uppercase tracking-wide">
                Official total
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={officialTotal}
                onChange={(e) => {
                  const value = e.target.value
                  setOfficialTotal(
                    value === "" ? "" : Number(value)
                  )
                }}
              />
            </div>
          </div>

          {marksRangeError && (
            <p className="mt-1 text-xs helper-text">
              Marks scored and attempted must be between 0 and the
              official total.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm mt-2">
            <div>
              <span className="text-xs uppercase tracking-wide">
                Percentage
              </span>
              <div>{percentage.toFixed(1)}%</div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide">
                Completion
              </span>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs status-badge ${
                    completionStatus === "complete"
                      ? "status-badge-complete"
                      : "status-badge-partial"
                  }`}
                >
                  {completionStatus === "complete"
                    ? "Complete"
                    : "Partial"}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs uppercase tracking-wide">
                Difficulty
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(Number(e.target.value))
                  }
                  className="flex-1"
                />
                <span className="text-xs">
                  {difficulty}/10
                </span>
              </div>
              {difficultyError && (
                <p className="mt-1 text-xs helper-text">
                  Difficulty must be between 1 and 10.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section D — Additional */}
        <section className="rounded-lg border px-4 py-4 space-y-4">
          <h3 className="text-sm font-medium">Additional</h3>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide">
              Comment
            </label>
            <textarea
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={manualOverride}
              onChange={(e) =>
                setManualOverride(e.target.checked)
              }
            />
            <span>Mark as fully complete (override)</span>
          </label>

          <div className="flex items-center justify-between gap-4">
            {successMessage && (
              <p className="text-xs helper-text">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={!isFormValid || saving}
              className="ml-auto inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium"
            >
              {saving ? "Saving..." : "Save paper"}
            </button>
          </div>
        </section>
      </form>
        </>
      )}

      {mode === "edit" && (
        <>
          <h2 className="text-xl font-semibold mb-6">
            Edit logged papers
          </h2>

          {/* Filters for edit mode */}
          <section className="rounded-lg border px-4 py-4 space-y-4 mb-6">
            <h3 className="text-sm font-medium">
              Choose subject and paper
            </h3>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6 space-y-1">
                <label className="text-xs uppercase tracking-wide">
                  Subject
                </label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={subject}
                  onChange={(e) => {
                    const code = e.target.value
                    setSubject(code)
                    setPaper(null)
                  }}
                >
                  <option value="">Select subject</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.subjectCode}>
                      {c.subjectCode}
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
                  value={paper ?? ""}
                  onChange={(e) =>
                    setPaper(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={!selectedConfig}
                >
                  <option value="">Select paper</option>
                  {selectedConfig &&
                    selectedConfig.papers.map((p) => (
                      <option key={p} value={p}>
                        Paper {p}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </section>

          {/* Attempt list */}
          {filteredEditAttempts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm opacity-80">
                No entries for this paper yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {editGroups.map((group) => (
                <section
                  key={group.year}
                  className="rounded-lg border"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-medium">
                        {group.year}
                      </span>
                      <span className="text-xs">
                        {group.attempts.length} entries
                      </span>
                    </div>
                  </div>
                  <div className="border-t px-4 py-3 space-y-2">
                    {group.attempts
                      .slice()
                      .sort(
                        (a, b) =>
                          b.dateLogged.getTime() -
                          a.dateLogged.getTime()
                      )
                      .map((attempt) => {
                        const percent =
                          attempt.marksAttempted > 0
                            ? (attempt.marksScored /
                                attempt.marksAttempted) *
                              100
                            : 0

                        return (
                          <button
                            key={attempt.id}
                            type="button"
                            onClick={() =>
                              setEditingAttempt(attempt)
                            }
                            className="w-full rounded-md border px-3 py-2 text-left"
                          >
                            <div className="flex items-center justify-between text-sm">
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
                        )
                      })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {editingAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingAttempt(null)}
          />
          <div className="relative z-50 w-full max-w-3xl mx-4 rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
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
                {editingAttempt && (
                  <button
                    type="button"
                    className="mr-auto inline-flex items-center rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white"
                    onClick={() => deleteAttempt(editingAttempt.id)}
                  >
                    Delete Entry
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
                  onClick={() => setEditingAttempt(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium"
                >
                  {editSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
