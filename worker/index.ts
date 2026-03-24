import { calcTotal } from '../src/shared/scoring'

interface Env {
  BRACKET_KV: KVNamespace
  ADMIN_PASSWORD: string
}

const DEFAULT_STATE = { scores: {}, winners: {}, totalPts: {} }

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        matchId: string
        winnerSeed: number
        scores?: Record<string, unknown>
        points?: number
      }
      const current = await getState(env)
      current.winners[body.matchId] = body.winnerSeed
      if (body.scores) { current.scores[body.matchId] = body.scores }
      if (body.points) {
        current.totalPts[body.winnerSeed] = (current.totalPts[body.winnerSeed] || 0) + body.points
      }
      await env.BRACKET_KV.put('bracket-state', JSON.stringify(current))
      return Response.json({ ok: true }, { headers: CORS })
    }

    if (url.pathname === '/api/teams') {
      if (request.method === 'GET') {
        const teams = await env.BRACKET_KV.get('teams', 'json')
        return Response.json({ teams }, { headers: CORS })
      }
      if (request.method === 'POST') {
        const denied = requireAuth(request, env)
        if (denied) { return denied }
        const body = await request.json() as { teams: unknown[] }
        await env.BRACKET_KV.put('teams', JSON.stringify(body.teams))
        await env.BRACKET_KV.put('bracket-state', JSON.stringify({ ...DEFAULT_STATE }))
        return Response.json({ ok: true }, { headers: CORS })
      }
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
      current.totalPts = {}
      for (const [matchId, winnerSeed] of Object.entries(current.winners)) {
        const sc = current.scores[matchId]
        if (sc) {
          const pA = calcTotal(sc.A || {})
          const pB = calcTotal(sc.B || {})
          current.totalPts[winnerSeed] = (current.totalPts[winnerSeed] || 0) + Math.max(pA, pB)
        }
      }
      await env.BRACKET_KV.put('bracket-state', JSON.stringify(current))
      return Response.json({ ok: true }, { headers: CORS })
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
