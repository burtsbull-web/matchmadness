import type { ScoreMetrics } from './types'

export function calcHSIConv(v: number | string): number {
  v = +v
  if (v >= 3) { return 7 + Math.floor(v - 3) * 2 }
  if (v >= 2.5) { return 5 }
  if (v >= 2) { return 3 }
  return 0
}

export function calcPostpaid(v: number | string): number {
  v = +v
  if (v < 8) { return 0 }
  if (v < 9) { return 1 }
  if (v < 10) { return 2 }
  const b = Math.floor(v - 10)
  const t = [3, 5, 7, 9, 11, 13, 15]
  return b < 7 ? t[b] : 15 + (b - 6) * 2
}

export function calcRevenue(v: number | string): number {
  v = +v
  if (v < 110) { return 0 }
  return Math.floor((v - 100) / 10) * 4
}

export function calcHSIGoal(v: number | string): number {
  v = +v
  if (v < 100) { return 0 }
  return 3 + Math.floor((v - 100) / 10) * 2
}

export function calcTotal(m: ScoreMetrics | Record<string, string | number>): number {
  return calcHSIConv(m.hc || 0)
    + calcPostpaid(m.pp || 0)
    + calcRevenue(m.rv || 0)
    + calcHSIGoal(m.hg || 0)
}
