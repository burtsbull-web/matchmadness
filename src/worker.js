import HTML from '../index.html';

const DEFAULT_STATE = { scores: {}, winners: {}, totalPts: {} };

// Scoring functions (must match client-side calcTotal)
function calcHSIConv(v){v=+v;if(v>=3)return 7+Math.floor(v-3)*2;if(v>=2.5)return 5;if(v>=2)return 3;return 0;}
function calcPostpaid(v){v=+v;if(v<8)return 0;if(v<9)return 1;if(v<10)return 2;const b=Math.floor(v-10);const t=[3,5,7,9,11,13,15];return b<7?t[b]:15+(b-6)*2;}
function calcRevenue(v){v=+v;if(v<110)return 0;return Math.floor((v-100)/10)*4;}
function calcHSIGoal(v){v=+v;if(v<100)return 0;return 3+Math.floor((v-100)/10)*2;}
function calcTotal(m){return calcHSIConv(m.hc||0)+calcPostpaid(m.pp||0)+calcRevenue(m.rv||0)+calcHSIGoal(m.hg||0);}
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

    if (url.pathname === '/api/undo' && request.method === 'POST') {
      const denied = requireAuth(request, env);
      if (denied) return denied;
      const body = await request.json();
      const current = await getState(env);
      delete current.winners[body.matchId];
      delete current.scores[body.matchId];
      // Remove downstream winners that depended on this match
      if (body.clearMatchIds) {
        for (const id of body.clearMatchIds) {
          delete current.winners[id];
          delete current.scores[id];
        }
      }
      // Recalculate totalPts from remaining scores using scoring rules
      current.totalPts = {};
      for (const [matchId, winnerSeed] of Object.entries(current.winners)) {
        const sc = current.scores[matchId];
        if (sc) {
          const pA = calcTotal(sc.A || {});
          const pB = calcTotal(sc.B || {});
          current.totalPts[winnerSeed] = (current.totalPts[winnerSeed] || 0) + Math.max(pA, pB);
        }
      }
      await env.BRACKET_KV.put('bracket-state', JSON.stringify(current));
      return Response.json({ ok: true }, { headers: CORS });
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
