export type ThemeType = "dark" | "pastel"

export interface User {
  id: string
  name: string
  createdAt: Date
  settings: {
    theme: ThemeType
  }
}

export type LevelType = "core" | "extended"

export interface GradeBoundaries {
  Astar: number
  A: number
  B: number
  C: number
  D: number
}

export interface SubjectConfig {
  id: string
  userId: string
  subjectCode: string
  level: LevelType
  papers: number[]
  createdAt: Date
  gradeBoundaries?: GradeBoundaries
}

export type CompletionStatus = "complete" | "partial"

export interface PaperAttempt {
  id: string
  userId: string
  subjectCode: string
  year: number
  session: string
  variant: string
  paperNumber: number
  marksScored: number
  marksAttempted: number
  officialTotal: number
  completionStatus: CompletionStatus
  difficulty: number
  comment?: string
  dateLogged: Date
}