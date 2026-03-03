"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppStore } from "@/store/appStore"
import { LevelType, SubjectConfig } from "@/types/domain"
import { SUBJECTS, isScienceSubject } from "@/lib/config/subjects"
import {
  getSubjectConfigsForUser,
  upsertSubjectConfig
} from "@/lib/db/subjectConfig"

export default function SettingsPage() {
  const activeUser = useAppStore((s) => s.activeUser)

  const [subjectCode, setSubjectCode] = useState<string>("0607")
  const [level, setLevel] = useState<LevelType>("core")
  const [coreSciencePaper, setCoreSciencePaper] = useState<number>(5)
  const [configs, setConfigs] = useState<SubjectConfig[]>([])
  const [saving, setSaving] = useState(false)

  const isScienceCore = useMemo(
    () => isScienceSubject(subjectCode) && level === "core",
    [subjectCode, level]
  )

  useEffect(() => {
    if (!activeUser) return

    getSubjectConfigsForUser(activeUser.id).then(setConfigs)
  }, [activeUser])

  useEffect(() => {
    if (!activeUser) return

    const existing = configs.find(
      (config) =>
        config.userId === activeUser.id &&
        config.subjectCode === subjectCode
    )

    if (existing) {
      setLevel(existing.level)

      if (isScienceSubject(subjectCode) && existing.papers.length) {
        setCoreSciencePaper(existing.papers.includes(6) ? 6 : 5)
      }
    } else {
      setLevel("core")
      setCoreSciencePaper(5)
    }
  }, [configs, subjectCode, activeUser])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!activeUser) return

    setSaving(true)
    try {
      await upsertSubjectConfig({
        userId: activeUser.id,
        subjectCode,
        level,
        coreSciencePaperChoice: isScienceCore ? coreSciencePaper : undefined
      })

      const updated = await getSubjectConfigsForUser(activeUser.id)
      setConfigs(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="col-span-12 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Subject configuration</h2>

        <form
          onSubmit={handleSave}
          className="space-y-4 max-w-xl"
        >
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide">
              Subject
            </label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
            >
              {SUBJECTS.map((subject) => (
                <option key={subject.code} value={subject.code}>
                  {subject.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wide">
              Level
            </span>
            <div className="flex gap-3 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="level"
                  value="core"
                  checked={level === "core"}
                  onChange={() => setLevel("core")}
                />
                <span>Core</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="level"
                  value="extended"
                  checked={level === "extended"}
                  onChange={() => setLevel("extended")}
                />
                <span>Extended</span>
              </label>
            </div>
          </div>

          {isScienceCore && (
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide">
                Core science paper
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={coreSciencePaper}
                onChange={(e) =>
                  setCoreSciencePaper(Number(e.target.value))
                }
              >
                <option value={5}>Paper 5</option>
                <option value={6}>Paper 6</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={!activeUser || saving}
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
          >
            {saving ? "Saving..." : "Save configuration"}
          </button>
        </form>
      </section>
    </div>
  )
}

