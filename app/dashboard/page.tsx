"use client"

import { useEffect, useMemo, useState } from "react"
import { db } from "@/lib/db"
import { computeDashboardStats } from "@/lib/analytics/dashboard"
import { buildPerformanceChartData } from "@/lib/analytics/chart"
import { PaperAttempt, SubjectConfig } from "@/types/domain"
import { useAppStore } from "@/store/appStore"
import { getSubjectConfigsForUser } from "@/lib/db/subjectConfig"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts"

export default function DashboardPage() {
  const activeUser = useAppStore((s) => s.activeUser)

  const [attempts, setAttempts] = useState<PaperAttempt[]>([])
  const [stats, setStats] = useState({
    totalPapers: 0,
    completionRate: 0,
    bestSubject: "-"
  })
  const [mode, setMode] = useState<"percent" | "raw">("percent")

  const [configs, setConfigs] = useState<SubjectConfig[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [selectedPaper, setSelectedPaper] = useState<number | null>(null)

  useEffect(() => {
    async function loadAttempts() {
      const data = await db.paperAttempts.toArray()

      const parsed = data.map((a) => ({
        ...a,
        dateLogged: new Date(a.dateLogged)
      }))

      setAttempts(parsed)
      setStats(computeDashboardStats(parsed))
    }

    loadAttempts()
  }, [])

  useEffect(() => {
    if (!activeUser) return

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

  const filteredAttempts =
    selectedSubject && selectedPaper
      ? attempts.filter(
          (attempt) =>
            attempt.subjectCode === selectedSubject &&
            attempt.paperNumber === selectedPaper
        )
      : []

  const chartData = buildPerformanceChartData(filteredAttempts, mode)

  return (
    <>
      {/* Stats Row */}
      <div className="col-span-12 grid grid-cols-12 gap-6">
        <StatCard
          title="Total Papers"
          value={stats.totalPapers}
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
        />
        <StatCard
          title="Best Subject"
          value={stats.bestSubject}
        />
      </div>

      {/* Chart Section */}
      <div className="col-span-12 border border-white/10 rounded-xl p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Performance Over Time
          </h3>

          <button
            onClick={() =>
              setMode(mode === "percent" ? "raw" : "percent")
            }
            className="text-sm px-4 py-2 border border-white/20 rounded-lg"
          >
            Toggle: {mode}
          </button>
        </div>

        {/* Chart Controls */}
        <div className="mb-4 grid grid-cols-12 gap-4">
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
                <option value="">Select a subject</option>
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

        <div className="h-64">
          {filteredAttempts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm opacity-70">
              No data logged for this paper yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  strokeOpacity={0.1}
                />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#5DA9FF"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  )
}

function StatCard({
  title,
  value
}: {
  title: string
  value: string | number
}) {
  return (
    <div className="col-span-12 md:col-span-4 border border-white/10 rounded-xl p-6">
      <p className="text-sm opacity-60">{title}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  )
}