export interface Team {
  s: number
  dm: string
  n: string
}

export interface Match {
  id: string
  r: number
  i: number
  tA: Team | null
  tB: Team | null
  winner: Team | null
  pA: number
  pB: number
  isBye: boolean
}

export interface ScoreMetrics {
  hc: string
  pp: string
  rv: string
  hg: string
}

export interface ScoreData {
  A: ScoreMetrics
  B: ScoreMetrics
}

export interface ApiState {
  scores: Record<string, ScoreData>
  winners: Record<string, number>
  totalPts: Record<number, number>
}

export interface RankedTeam extends Team {
  pts: number
  status: 'active' | 'lb-active' | 'eliminated' | 'waiting'
}

export type Side = 'A' | 'B'
export type BracketType = 'wb' | 'lb'
export interface TrashTalkMessage {
  id: string
  author: string
  message: string
  date: string
  upvotes: string[]
  downvotes: string[]
}

export type TabName = 'bracket' | 'score' | 'rules' | 'leaderboard' | 'import' | 'trash-talk'
