"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppStore } from "@/store/appStore"
import { LevelType, SubjectConfig } from "@/types/domain"
import { SUBJECTS, isScienceSubject } from "@/lib/config/subjects"
import {
  getSubjectConfigsForUser,
  upsertSubjectConfig
} from "@/lib/db/subjectConfig"
import {
  exportBackup,
  importBackup
} from "@/lib/backup/backupService"
import { Toast } from "@/components/ui/toast"

export default function SettingsPage() {
  const activeUser = useAppStore((s) => s.activeUser)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  const [subjectCode, setSubjectCode] = useState<string>("0607")
  const [level, setLevel] = useState<LevelType>("core")
  const [coreSciencePaper, setCoreSciencePaper] = useState<number>(5)
  const [configs, setConfigs] = useState<SubjectConfig[]>([])
  const [saving, setSaving] = useState(false)

  const [showImportModal, setShowImportModal] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(
    null
  )
  const [working, setWorking] = useState<null | "export" | "import">(
    null
  )
  const [toast, setToast] = useState<{
    message: string
    variant: "success" | "error"
  } | null>(null)

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

  async function handleExportBackup() {
    setWorking("export")
    try {
      await exportBackup()
    } catch {
      setToast({
        message: "Backup import failed. Please check the file.",
        variant: "error"
      })
    } finally {
      setWorking(null)
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPendingImportFile(file)
      setShowImportModal(true)
    }
    e.target.value = ""
  }

  async function handleConfirmImport() {
    if (!pendingImportFile) return

    setWorking("import")
    try {
      await importBackup(pendingImportFile)
      setToast({
        message: "Backup restored successfully.",
        variant: "success"
      })
      setShowImportModal(false)
      setPendingImportFile(null)

      window.setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error) {
      setShowImportModal(false)
      setPendingImportFile(null)

      const message =
        error instanceof Error &&
        error.message === "Invalid backup file."
          ? "Invalid backup file."
          : "Backup import failed. Please check the file."

      setToast({
        message,
        variant: "error"
      })
    } finally {
      setWorking(null)
    }
  }

  function handleCancelImport() {
    setShowImportModal(false)
    setPendingImportFile(null)
  }

  return (
    <div className="col-span-12 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-4 card-elevated p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-lg font-medium">Appearance</h2>
        <div className="grid grid-cols-12 gap-4 max-w-3xl">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`col-span-12 md:col-span-6 text-left theme-option-card ${
              theme === "dark" ? "theme-option-card-active" : ""
            }`}
          >
            <p className="font-semibold">Dark Sleek</p>
            <p className="text-sm text-muted mt-1">
              Minimal black surfaces with bold red accents.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="h-5 w-5 rounded theme-swatch-dark-bg border" />
              <span className="h-5 w-5 rounded theme-swatch-dark-surface border" />
              <span className="h-5 w-5 rounded theme-swatch-dark-accent border" />
              <span className="h-5 w-5 rounded theme-swatch-dark-success border" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme("pastel")}
            className={`col-span-12 md:col-span-6 text-left theme-option-card ${
              theme === "pastel" ? "theme-option-card-active" : ""
            }`}
          >
            <p className="font-semibold">Pastel Light</p>
            <p className="text-sm text-muted mt-1">
              Airy blue surfaces with playful soft accents.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="h-5 w-5 rounded theme-swatch-pastel-bg border" />
              <span className="h-5 w-5 rounded theme-swatch-pastel-surface border" />
              <span className="h-5 w-5 rounded theme-swatch-pastel-accent border" />
              <span className="h-5 w-5 rounded theme-swatch-pastel-success border" />
            </div>
          </button>
        </div>
      </section>

      <section className="space-y-4 card-elevated p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
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
            className="btn-primary"
          >
            {saving ? "Saving..." : "Save configuration"}
          </button>
        </form>
      </section>

      <section className="space-y-4 card-elevated p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-lg font-medium">Data Backup</h2>

        <div className="rounded-lg border border-amber-400/40 bg-amber-300/10 p-4">
          <p className="text-sm">
            Your data is stored locally in your browser.
          </p>
          <p className="text-sm mt-1">
            Clearing browser storage will erase all progress.
          </p>
          <p className="text-sm mt-1">
            Use backups to protect your data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-secondary"
            disabled={working !== null}
            onClick={() => void handleExportBackup()}
          >
            {working === "export"
              ? "Preparing..."
              : "Download Backup"}
          </button>

          <label className="btn-secondary cursor-pointer">
            Import Backup
            <input
              type="file"
              accept=".json"
              className="hidden"
              disabled={working !== null}
              onChange={handleFileSelected}
            />
          </label>
        </div>
      </section>

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 overlay-backdrop backdrop-blur-sm"
            onClick={handleCancelImport}
          />
          <div className="relative z-50 w-full max-w-md mx-4 rounded-2xl border bg-[var(--surface)] shadow-2xl p-6">
            <h3 className="text-lg font-semibold">Confirm import</h3>
            <p className="text-sm text-muted mt-2">
              This will replace ALL existing data. Continue?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancelImport}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={working === "import"}
                onClick={() => void handleConfirmImport()}
              >
                {working === "import"
                  ? "Importing..."
                  : "Import Backup"}
              </button>
            </div>
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
