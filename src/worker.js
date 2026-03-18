import HTML from '../index.html';

const DEFAULT_STATE = { scores: {}, winners: {}, totalPts: {} };
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
};

function requireAuth(request, env) {
  const password = request.headers.get('X-Admin-Password');
  if (password !== env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Invalid password' }, { status: 401, headers: CORS });
  }
  return null;
}

async function getState(env) {
  return (await env.BRACKET_KV.get('bracket-state', 'json')) || { ...DEFAULT_STATE };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (url.pathname === '/api/verify' && request.method === 'POST') {
      const denied = requireAuth(request, env);
      if (denied) return denied;
      return Response.json({ ok: true }, { headers: CORS });
    }

    if (url.pathname === '/api/state') {
      const data = await getState(env);
      return Response.json(data, { headers: CORS });
    }

    if (url.pathname === '/api/advance' && request.method === 'POST') {
      const denied = requireAuth(request, env);
      if (denied) return denied;
      const body = await request.json();
      const current = await getState(env);
      current.winners[body.matchId] = body.winnerSeed;
      if (body.scores) current.scores[body.matchId] = body.scores;
      if (body.points) current.totalPts[body.winnerSeed] = (current.totalPts[body.winnerSeed] || 0) + body.points;
      await env.BRACKET_KV.put('bracket-state', JSON.stringify(current));
      return Response.json({ ok: true }, { headers: CORS });
    }

    if (url.pathname === '/api/teams') {
      if (request.method === 'GET') {
        const teams = await env.BRACKET_KV.get('teams', 'json');
        return Response.json({ teams }, { headers: CORS });
      }
      if (request.method === 'POST') {
        const denied = requireAuth(request, env);
        if (denied) return denied;
        const body = await request.json();
        await env.BRACKET_KV.put('teams', JSON.stringify(body.teams));
        // Reset bracket state when teams change
        await env.BRACKET_KV.put('bracket-state', JSON.stringify({ ...DEFAULT_STATE }));
        return Response.json({ ok: true }, { headers: CORS });
      }
    }

    if (url.pathname === '/api/reset' && request.method === 'POST') {
      const denied = requireAuth(request, env);
      if (denied) return denied;
      await env.BRACKET_KV.put('bracket-state', JSON.stringify({ ...DEFAULT_STATE }));
      return Response.json({ ok: true }, { headers: CORS });
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS });
    }

    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    });
  },
};
