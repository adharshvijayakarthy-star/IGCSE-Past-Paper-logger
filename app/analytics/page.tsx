"use client"

import { ReactNode, useEffect, useMemo, useState } from "react"
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter
} from "recharts"
import { db } from "@/lib/db"
import { buildPerformanceChartData } from "@/lib/analytics/chart"
import {
  buildScoreDistribution,
  buildDifficultyScatter,
  buildCompletionBreakdown,
  buildYearPerformance,
  buildDifficultyByPaper
} from "@/lib/analytics/advancedAnalytics"
import { useAppStore } from "@/store/appStore"
import { getSubjectConfigsForUser } from "@/lib/db/subjectConfig"
import { PaperAttempt, SubjectConfig } from "@/types/domain"

type PaperSelection = number | "all" | null

export default function AnalyticsPage() {
  const activeUser = useAppStore((s) => s.activeUser)

  const [attempts, setAttempts] = useState<PaperAttempt[]>([])
  const [configs, setConfigs] = useState<SubjectConfig[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [selectedPaper, setSelectedPaper] =
    useState<PaperSelection>(null)

  useEffect(() => {
    if (!activeUser) return

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
        setSelectedPaper(first.papers[0] ?? "all")
      }
    })
  }, [activeUser])

  const selectedConfig = useMemo(
    () =>
      configs.find((config) => config.subjectCode === selectedSubject) ??
      null,
    [configs, selectedSubject]
  )

  const filteredAttempts = useMemo(() => {
    if (!selectedSubject || !selectedPaper) return []

    if (selectedPaper === "all") {
      return attempts.filter(
        (attempt) => attempt.subjectCode === selectedSubject
      )
    }

    return attempts.filter(
      (attempt) =>
        attempt.subjectCode === selectedSubject &&
        attempt.paperNumber === selectedPaper
    )
  }, [attempts, selectedPaper, selectedSubject])

  const performanceData = useMemo(
    () => buildPerformanceChartData(filteredAttempts, "percent"),
    [filteredAttempts]
  )

  const scoreDistribution = useMemo(
    () => buildScoreDistribution(filteredAttempts),
    [filteredAttempts]
  )

  const difficultyScatter = useMemo(
    () => buildDifficultyScatter(filteredAttempts),
    [filteredAttempts]
  )

  const completionBreakdown = useMemo(
    () => buildCompletionBreakdown(filteredAttempts),
    [filteredAttempts]
  )

  const yearPerformance = useMemo(
    () => buildYearPerformance(filteredAttempts),
    [filteredAttempts]
  )

  const difficultyByPaper = useMemo(
    () => buildDifficultyByPaper(filteredAttempts),
    [filteredAttempts]
  )

  const tooltipStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem"
  }

  const hasData = filteredAttempts.length > 0

  return (
    <div className="col-span-12 grid grid-cols-12 gap-6">
      <div className="col-span-12 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>
      </div>

      <section className="col-span-12 card-elevated p-4">
        <h2 className="text-sm font-medium mb-3">Filters</h2>
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
                setSelectedPaper(config?.papers[0] ?? "all")
              }}
              disabled={configs.length === 0}
            >
              {configs.length === 0 && (
                <option value="">
                  No configured subjects
                </option>
              )}
              {configs.map((config) => (
                <option key={config.id} value={config.subjectCode}>
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
                  e.target.value === "all"
                    ? "all"
                    : e.target.value
                      ? Number(e.target.value)
                      : null
                )
              }
              disabled={!selectedConfig}
            >
              {!selectedConfig && (
                <option value="">Select a subject</option>
              )}
              {selectedConfig && (
                <>
                  <option value="all">All Papers</option>
                  {selectedConfig.papers.map((paper) => (
                    <option key={paper} value={paper}>
                      Paper {paper}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </section>

      <section className="col-span-12 card-elevated p-6">
        <h3 className="text-lg font-semibold mb-4">
          Performance Over Time
        </h3>
        <ChartFrame hasData={hasData}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeOpacity={0.1}
              />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="value"
                name="Score"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 4 }}
                isAnimationActive
                animationDuration={350}
              />
              <Line
                type="monotone"
                dataKey="movingAvg"
                name="Moving Avg"
                stroke="var(--success)"
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={350}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      <ChartCard title="Score Distribution">
        <ChartFrame hasData={hasData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreDistribution}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeOpacity={0.1}
              />
              <XAxis dataKey="range" />
              <YAxis allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="count"
                name="Papers"
                fill="var(--accent)"
                radius={[6, 6, 0, 0]}
                isAnimationActive
                animationDuration={350}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </ChartCard>

      <ChartCard title="Difficulty vs Score">
        <ChartFrame hasData={hasData}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeOpacity={0.1}
              />
              <XAxis
                type="number"
                dataKey="difficulty"
                name="Difficulty"
                domain={[0, 10]}
              />
              <YAxis
                type="number"
                dataKey="percentage"
                name="Percentage"
                domain={[0, 100]}
              />
              <Tooltip
                cursor={{ strokeDasharray: "4 4" }}
                contentStyle={tooltipStyle}
              />
              <Scatter
                name="Attempts"
                data={difficultyScatter}
                fill="var(--accent)"
                isAnimationActive
                animationDuration={350}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartFrame>
      </ChartCard>

      <ChartCard title="Completion Breakdown">
        <ChartFrame hasData={hasData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completionBreakdown}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeOpacity={0.1}
              />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="count"
                name="Attempts"
                fill="var(--success)"
                radius={[6, 6, 0, 0]}
                isAnimationActive
                animationDuration={350}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </ChartCard>

      <ChartCard title="Performance by Year">
        <ChartFrame hasData={hasData}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearPerformance}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeOpacity={0.1}
              />
              <XAxis dataKey="year" />
              <YAxis domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="averageScore"
                name="Avg Score"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 4 }}
                isAnimationActive
                animationDuration={350}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </ChartCard>

      <ChartCard title="Difficulty Average by Paper">
        <ChartFrame hasData={hasData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={difficultyByPaper}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeOpacity={0.1}
              />
              <XAxis dataKey="paper" />
              <YAxis domain={[0, 10]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="averageDifficulty"
                name="Avg Difficulty"
                fill="var(--accent)"
                radius={[6, 6, 0, 0]}
                isAnimationActive
                animationDuration={350}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </ChartCard>
    </div>
  )
}

function ChartCard({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="col-span-12 lg:col-span-6 card-elevated p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </section>
  )
}

function ChartFrame({
  hasData,
  children
}: {
  hasData: boolean
  children: ReactNode
}) {
  if (!hasData) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted">
        Analytics will appear after you log some papers.
      </div>
    )
  }

  return <div className="h-72">{children}</div>
}
