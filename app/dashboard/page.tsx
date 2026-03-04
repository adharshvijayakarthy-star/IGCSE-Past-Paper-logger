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
  const [mode, setMode] = useState<"percent" | "raw">("percent")

  const [configs, setConfigs] = useState<SubjectConfig[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [selectedPaper, setSelectedPaper] = useState<number | null>(null)

  useEffect(() => {
    if (!activeUser) {
      setAttempts([])
      return
    }

    db.paperAttempts
      .where("userId")
      .equals(activeUser.id)
      .toArray()
      .then((data) => {
        const parsed = data.map((a) => ({
          ...a,
          dateLogged: new Date(a.dateLogged)
        }))
        setAttempts(parsed)
      })
  }, [activeUser])

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

  const filteredAttempts = useMemo(
    () =>
      selectedSubject && selectedPaper
        ? attempts.filter(
            (attempt) =>
              attempt.subjectCode === selectedSubject &&
              attempt.paperNumber === selectedPaper
          )
        : [],
    [attempts, selectedPaper, selectedSubject]
  )

  const chartData = useMemo(
    () => buildPerformanceChartData(filteredAttempts, mode),
    [filteredAttempts, mode]
  )

  const stats = useMemo(
    () => computeDashboardStats(attempts),
    [attempts]
  )

  const sortedAttempts = useMemo(
    () =>
      [...attempts].sort(
        (a, b) => b.dateLogged.getTime() - a.dateLogged.getTime()
      ),
    [attempts]
  )

  const lastPaperSummary = useMemo(() => {
    if (sortedAttempts.length === 0) return null

    const latest = sortedAttempts[0]
    const scorePercent =
      latest.marksAttempted > 0
        ? (latest.marksScored / latest.marksAttempted) * 100
        : 0

    return {
      label: `${latest.subjectCode} Paper ${latest.paperNumber}`,
      scorePercent
    }
  }, [sortedAttempts])

  const overallTrend = useMemo(() => {
    if (sortedAttempts.length < 10) return null

    const toPercent = (attempt: PaperAttempt) =>
      attempt.marksAttempted > 0
        ? (attempt.marksScored / attempt.marksAttempted) * 100
        : 0

    const latest = sortedAttempts.slice(0, 5)
    const previous = sortedAttempts.slice(5, 10)
    const latestAverage =
      latest.reduce((sum, attempt) => sum + toPercent(attempt), 0) / 5
    const previousAverage =
      previous.reduce((sum, attempt) => sum + toPercent(attempt), 0) / 5
    const delta = latestAverage - previousAverage

    return {
      direction: delta >= 0 ? "up" : "down",
      delta: Math.abs(delta)
    }
  }, [sortedAttempts])

  const trendInsight = useMemo(() => {
    if (filteredAttempts.length < 6) return null

    const sorted = [...filteredAttempts].sort(
      (a, b) => b.dateLogged.getTime() - a.dateLogged.getTime()
    )

    const toPercent = (attempt: PaperAttempt) =>
      attempt.marksAttempted > 0
        ? (attempt.marksScored / attempt.marksAttempted) * 100
        : 0

    const latest = sorted.slice(0, 5)
    const previous = sorted.slice(5, 10)

    if (previous.length === 0) return null

    const latestAverage =
      latest.reduce((sum, attempt) => sum + toPercent(attempt), 0) /
      latest.length

    const previousAverage =
      previous.reduce((sum, attempt) => sum + toPercent(attempt), 0) /
      previous.length

    const delta = latestAverage - previousAverage

    return {
      latestAverage,
      previousAverage,
      delta
    }
  }, [filteredAttempts])
  const performanceSummary = useMemo(() => {
    if (filteredAttempts.length === 0) return null

    const percents = filteredAttempts.map((attempt) =>
      attempt.marksAttempted > 0
        ? (attempt.marksScored / attempt.marksAttempted) * 100
        : 0
    )

    const totalAttempts = filteredAttempts.length
    const averagePercent =
      percents.reduce((sum, value) => sum + value, 0) / totalAttempts
    const bestPercent = Math.max(...percents)
    const worstPercent = Math.min(...percents)

    return {
      totalAttempts,
      averagePercent,
      bestPercent,
      worstPercent
    }
  }, [filteredAttempts])

  return (
    <>
      {/* Stats Row */}
      <div className="col-span-12 grid grid-cols-12 gap-6">
        <StatCard
          title="Total Papers"
          value={stats.totalPapers}
          className="col-span-12 md:col-span-6 xl:col-span-4"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          className="col-span-12 md:col-span-6 xl:col-span-4"
        />
        <StatCard
          title="Best Subject"
          value={stats.bestSubject}
          className="col-span-12 md:col-span-6 xl:col-span-4"
        />
        <StatCard
          title="Last Paper"
          value={
            lastPaperSummary
              ? `${lastPaperSummary.label} | ${lastPaperSummary.scorePercent.toFixed(1)}%`
              : "No papers yet"
          }
          className="col-span-12 md:col-span-6 xl:col-span-6"
        />
        <StatCard
          title="Trend"
          value={
            overallTrend
              ? overallTrend.direction === "up"
                ? `↑ Improving +${overallTrend.delta.toFixed(1)}%`
                : `↓ Dropping -${overallTrend.delta.toFixed(1)}%`
              : "Not enough data"
          }
          className="col-span-12 md:col-span-6 xl:col-span-6"
        />
      </div>

      {/* Chart Section */}
      <div className="col-span-12 card-elevated p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Performance Over Time
          </h3>

          <button
            onClick={() =>
              setMode(mode === "percent" ? "raw" : "percent")
            }
            className="btn-primary"
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

        {performanceSummary && (
          <div className="grid grid-cols-12 gap-4 mb-4">
            <StatCard
              title="Average %"
              value={`${performanceSummary.averagePercent.toFixed(1)}%`}
              className="col-span-12 md:col-span-3"
            />
            <StatCard
              title="Best %"
              value={`${performanceSummary.bestPercent.toFixed(1)}%`}
              className="col-span-12 md:col-span-3"
            />
            <StatCard
              title="Worst %"
              value={`${performanceSummary.worstPercent.toFixed(1)}%`}
              className="col-span-12 md:col-span-3"
            />
            <StatCard
              title="Attempts"
              value={performanceSummary.totalAttempts}
              className="col-span-12 md:col-span-3"
            />
          </div>
        )}

        <div className="h-64">
          {filteredAttempts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted">
              {attempts.length === 0
                ? "No papers logged yet. Start by logging your first paper."
                : "No data logged for this paper yet."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.1}
                />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  content={<DashboardChartTooltip mode={mode} />}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  isAnimationActive
                  animationDuration={350}
                />
                {filteredAttempts.length >= 2 && (
                  <Line
                    type="monotone"
                    dataKey="movingAvg"
                    stroke="var(--success)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    animationDuration={350}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {trendInsight && (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] p-4">
            <p className="text-sm text-muted">Insight</p>
            <p className="mt-2 text-sm">
              Your score{" "}
              {trendInsight.delta >= 0
                ? "improved"
                : "changed"}{" "}
              <span
                className={
                  trendInsight.delta >= 0
                    ? "text-[var(--success)]"
                    : "text-[var(--accent)]"
                }
              >
                {trendInsight.delta >= 0 ? "+" : ""}
                {trendInsight.delta.toFixed(1)}%
              </span>{" "}
              over the last 5 papers.
            </p>
            <p className="mt-1 text-xs text-muted">
              Last 5 average: {trendInsight.latestAverage.toFixed(1)}% |
              Previous 5 average: {trendInsight.previousAverage.toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    </>
  )
}

type DashboardChartPoint = {
  date: string
  value: number
  movingAvg: number
  year: number
  session: string
  variant: string
}

function DashboardChartTooltip({
  active,
  payload,
  mode
}: {
  active?: boolean
  payload?: Array<{ payload: DashboardChartPoint }>
  mode: "percent" | "raw"
}) {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0].payload
  const suffix = mode === "percent" ? "%" : ""

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm shadow-xl">
      <p className="text-[var(--text-primary)]">Date: {point.date}</p>
      <p className="text-neutral-400">Year: {point.year}</p>
      <p className="text-neutral-400">Session: {point.session}</p>
      <p className="text-neutral-400">
        Variant {point.variant.slice(1)}
      </p>
      <p className="text-[var(--accent)]">
        Score: {point.value.toFixed(1)}
        {suffix}
      </p>
      <p className="text-[var(--success)]">
        Moving Avg: {point.movingAvg.toFixed(1)}
        {suffix}
      </p>
    </div>
  )
}

function StatCard({
  title,
  value,
  className
}: {
  title: string
  value: string | number
  className?: string
}) {
  return (
    <div
      className={`${className ?? "col-span-12 md:col-span-4"} rounded-xl border shadow-sm hover:shadow-md transition-shadow card-elevated p-6`}
    >
      <p className="text-sm text-muted">{title}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  )
}
