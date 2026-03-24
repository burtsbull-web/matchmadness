import type { ApiState, ScoreData } from '@/shared/types'

const API_BASE = location.origin

export async function apiPost(
  endpoint: string,
  body: unknown,
  password: string | null,
): Promise<Response> {
  return fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(password ? { 'X-Admin-Password': password } : {}),
    },
    body: JSON.stringify(body),
  })
}

export async function verifyPassword(password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/verify`, {
    method: 'POST',
    headers: { 'X-Admin-Password': password },
  })
  return res.ok
}

export async function loadRemoteState(): Promise<ApiState> {
  const res = await fetch(`${API_BASE}/api/state`)
  return res.json() as Promise<ApiState>
}

export async function postAdvance(
  password: string | null,
  matchId: string,
  winnerSeed: number,
  scores?: ScoreData,
  points?: number,
): Promise<void> {
  await apiPost('/api/advance', { matchId, winnerSeed, scores, points }, password)
}

export async function postAdvanceBatch(
  password: string | null,
  batch: Array<{ matchId: string; winnerSeed: number; scores?: ScoreData; points?: number }>,
): Promise<void> {
  await apiPost('/api/advance', { batch }, password)
}

export async function postUndo(
  password: string | null,
  matchId: string,
  clearMatchIds: string[],
): Promise<void> {
  await apiPost('/api/undo', { matchId, clearMatchIds }, password)
}

export interface ImportLogEntry {
  id: string
  round: string
  date: string
  csv: string
}

export async function fetchImportLog(): Promise<ImportLogEntry[]> {
  const res = await fetch(`${API_BASE}/api/import-log`)
  const data = await res.json() as { log: ImportLogEntry[] }
  return data.log
}

export async function postImportLog(
  password: string | null,
  round: string,
  csv: string,
): Promise<void> {
  await apiPost('/api/import-log', { round, csv }, password)
}

export async function deleteImportLog(
  password: string | null,
  id: string,
): Promise<void> {
  await fetch(`${API_BASE}/api/import-log`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(password ? { 'X-Admin-Password': password } : {}),
    },
    body: JSON.stringify({ id }),
  })
}

