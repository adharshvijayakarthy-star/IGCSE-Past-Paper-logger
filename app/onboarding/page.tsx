"use client"

import {
  FormEvent,
  useEffect,
  useMemo,
  useState
} from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/store/appStore"
import { db } from "@/lib/db"
import {
  isScienceSubject,
  SUBJECTS,
  SubjectCode
} from "@/lib/config/subjects"
import { upsertSubjectConfig } from "@/lib/db/subjectConfig"
import { LevelType, User } from "@/types/domain"

type SubjectState = {
  selected: boolean
  level: LevelType | null
  coreSciencePaperChoice: 5 | 6
}

type SubjectSelections = Record<SubjectCode, SubjectState>

function createInitialSelections(): SubjectSelections {
  return {
    "0607": {
      selected: false,
      level: null,
      coreSciencePaperChoice: 5
    },
    "0620": {
      selected: false,
      level: null,
      coreSciencePaperChoice: 5
    },
    "0625": {
      selected: false,
      level: null,
      coreSciencePaperChoice: 5
    }
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const setActiveUser = useAppStore((s) => s.setActiveUser)
  const activeUser = useAppStore((s) => s.activeUser)
  const theme = useAppStore((s) => s.theme)

  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)
  const [selections, setSelections] = useState<SubjectSelections>(
    () => createInitialSelections()
  )

  useEffect(() => {
    setAnimateIn(true)
  }, [])

  const selectedSubjects = useMemo(
    () =>
      SUBJECTS.filter(({ code }) => selections[code].selected),
    [selections]
  )

  const canContinue = useMemo(() => {
    if (!name.trim()) return false
    if (selectedSubjects.length === 0) return false

    return selectedSubjects.every(
      ({ code }) => selections[code].level !== null
    )
  }, [name, selections, selectedSubjects])

  if (activeUser) return null

  async function handleContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canContinue || saving) return

    setSaving(true)

    try {
      const user: User = {
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: new Date(),
        settings: { theme }
      }

      await db.users.add(user)

      for (const subject of selectedSubjects) {
        const config = selections[subject.code]
        const level = config.level
        if (!level) continue

        await upsertSubjectConfig({
          userId: user.id,
          subjectCode: subject.code,
          level,
          coreSciencePaperChoice:
            isScienceSubject(subject.code) &&
            level === "core"
              ? config.coreSciencePaperChoice
              : undefined
        })
      }

      setActiveUser(user)
      router.replace("/dashboard")
    } finally {
      setSaving(false)
    }
  }

  function updateSelection(
    code: SubjectCode,
    updater: (current: SubjectState) => SubjectState
  ) {
    setSelections((prev) => ({
      ...prev,
      [code]: updater(prev[code])
    }))
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 py-8">
      <div
        className={`w-full max-w-lg mx-auto rounded-xl border p-8 shadow-lg bg-[var(--surface)] transition-opacity duration-300 ${
          animateIn ? "opacity-100" : "opacity-0"
        }`}
      >
        <h1 className="text-2xl font-semibold text-center">
          Welcome to IGCSE Paper Logger
        </h1>

        <form onSubmit={handleContinue} className="mt-6 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium"
            >
              Enter your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Your name"
            />
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Subjects you study</h2>

            {SUBJECTS.map((subject) => {
              const selection = selections[subject.code]
              const isScience = isScienceSubject(subject.code)
              const showPaperChoice =
                selection.selected &&
                isScience &&
                selection.level === "core"

              return (
                <div
                  key={subject.code}
                  className="rounded-lg border p-4 bg-[var(--surface-alt)]"
                >
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selection.selected}
                      onChange={(e) => {
                        const checked = e.target.checked
                        updateSelection(subject.code, () => ({
                          selected: checked,
                          level: checked ? null : null,
                          coreSciencePaperChoice: 5
                        }))
                      }}
                    />
                    <span>{subject.label}</span>
                  </label>

                  {selection.selected && (
                    <div className="mt-4 space-y-4 text-sm">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted">
                          Level
                        </p>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`level-${subject.code}`}
                              checked={selection.level === "core"}
                              onChange={() =>
                                updateSelection(
                                  subject.code,
                                  (current) => ({
                                    ...current,
                                    level: "core"
                                  })
                                )
                              }
                            />
                            <span>Core</span>
                          </label>

                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`level-${subject.code}`}
                              checked={selection.level === "extended"}
                              onChange={() =>
                                updateSelection(
                                  subject.code,
                                  (current) => ({
                                    ...current,
                                    level: "extended"
                                  })
                                )
                              }
                            />
                            <span>Extended</span>
                          </label>
                        </div>
                      </div>

                      {showPaperChoice && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wide text-muted">
                            Practical Paper
                          </p>
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`practical-${subject.code}`}
                                checked={
                                  selection.coreSciencePaperChoice === 5
                                }
                                onChange={() =>
                                  updateSelection(
                                    subject.code,
                                    (current) => ({
                                      ...current,
                                      coreSciencePaperChoice: 5
                                    })
                                  )
                                }
                              />
                              <span>Paper 5</span>
                            </label>

                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`practical-${subject.code}`}
                                checked={
                                  selection.coreSciencePaperChoice === 6
                                }
                                onChange={() =>
                                  updateSelection(
                                    subject.code,
                                    (current) => ({
                                      ...current,
                                      coreSciencePaperChoice: 6
                                    })
                                  )
                                }
                              />
                              <span>Paper 6</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </section>

          <button
            type="submit"
            className="w-full btn-primary"
            disabled={!canContinue || saving}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  )
}
