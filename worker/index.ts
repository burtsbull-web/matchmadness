import { calcTotal } from '../src/shared/scoring'

interface Env {
  BRACKET_KV: KVNamespace
  ADMIN_PASSWORD: string
}

const DEFAULT_STATE = { scores: {}, winners: {}, totalPts: {} }

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
}

function requireAuth(request: Request, env: Env): Response | null {
  const password = request.headers.get('X-Admin-Password')
  if (password !== env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Invalid password' }, { status: 401, headers: CORS })
  }
  return null
}

async function getState(env: Env) {
  return (await env.BRACKET_KV.get('bracket-state', 'json') as typeof DEFAULT_STATE) || { ...DEFAULT_STATE }
}

function recalcTotalPts(state: typeof DEFAULT_STATE): void {
  state.totalPts = {}
  for (const [matchId, winnerSeed] of Object.entries(state.winners)) {
    const sc = state.scores[matchId]
    if (sc) {
      const pA = calcTotal(sc.A || {})
      const pB = calcTotal(sc.B || {})
      state.totalPts[winnerSeed] = (state.totalPts[winnerSeed] || 0) + Math.max(pA, pB)
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }

    if (url.pathname === '/api/verify' && request.method === 'POST') {
      const denied = requireAuth(request, env)
      if (denied) { return denied }
      return Response.json({ ok: true }, { headers: CORS })
    }

    if (url.pathname === '/api/state') {
      const data = await getState(env)
      return Response.json(data, { headers: CORS })
    }

    if (url.pathname === '/api/advance' && request.method === 'POST') {
      const denied = requireAuth(request, env)
      if (denied) { return denied }
      const body = await request.json() as {
        matchId?: string
        winnerSeed?: number
        scores?: Record<string, unknown>
        points?: number
        batch?: Array<{ matchId: string; winnerSeed: number; scores?: Record<string, unknown>; points?: number }>
      }
      const current = await getState(env)

      const items = body.batch || [{ matchId: body.matchId!, winnerSeed: body.winnerSeed!, scores: body.scores, points: body.points }]

      // For batch updates, recalculate totalPts for affected matches to avoid double-counting
      if (body.batch) {
        for (const item of items) {
          delete current.winners[item.matchId]
          delete current.scores[item.matchId]
        }
        recalcTotalPts(current)
      }

      for (const item of items) {
        current.winners[item.matchId] = item.winnerSeed
        if (item.scores) { current.scores[item.matchId] = item.scores }
        if (item.points) {
          current.totalPts[item.winnerSeed] = (current.totalPts[item.winnerSeed] || 0) + item.points
        }
      }

      await env.BRACKET_KV.put('bracket-state', JSON.stringify(current))
      return Response.json({ ok: true }, { headers: CORS })
    }

    if (url.pathname === '/api/undo' && request.method === 'POST') {
      const denied = requireAuth(request, env)
      if (denied) { return denied }
      const body = await request.json() as {
        matchId: string
        clearMatchIds?: string[]
      }
      const current = await getState(env)
      delete current.winners[body.matchId]
      delete current.scores[body.matchId]
      if (body.clearMatchIds) {
        for (const id of body.clearMatchIds) {
          delete current.winners[id]
          delete current.scores[id]
        }
      }
      recalcTotalPts(current)
      await env.BRACKET_KV.put('bracket-state', JSON.stringify(current))
      return Response.json({ ok: true }, { headers: CORS })
    }

    if (url.pathname === '/api/import-log') {
      type LogEntry = { id: string; round: string; date: string; csv: string }
      const getLog = async () => await env.BRACKET_KV.get('import-log', 'json') as LogEntry[] || []

      if (request.method === 'GET') {
        return Response.json({ log: await getLog() }, { headers: CORS })
      }
      if (request.method === 'POST') {
        const denied = requireAuth(request, env)
        if (denied) { return denied }
        const body = await request.json() as { round: string; csv: string }
        const log = await getLog()
        log.unshift({ id: crypto.randomUUID(), round: body.round, date: new Date().toISOString(), csv: body.csv })
        await env.BRACKET_KV.put('import-log', JSON.stringify(log))
        return Response.json({ ok: true }, { headers: CORS })
      }
      if (request.method === 'DELETE') {
        const denied = requireAuth(request, env)
        if (denied) { return denied }
        const body = await request.json() as { id: string }
        const log = await getLog()
        await env.BRACKET_KV.put('import-log', JSON.stringify(log.filter(e => e.id !== body.id)))
        return Response.json({ ok: true }, { headers: CORS })
      }
    }

    if (url.pathname === '/api/reset' && request.method === 'POST') {
      const denied = requireAuth(request, env)
      if (denied) { return denied }
      await env.BRACKET_KV.put('bracket-state', JSON.stringify({ ...DEFAULT_STATE }))
      return Response.json({ ok: true }, { headers: CORS })
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    return new Response(null, { status: 404 })
  },
} satisfies ExportedHandler<Env>
