import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Team, Match, ScoreData, ScoreMetrics, TabName, BracketType, Side, RankedTeam } from '@/shared/types'
import { calcTotal } from '@/shared/scoring'
import { DEFAULT_TEAMS } from '@/shared/constants'
import { loadRemoteState, postAdvance, postUndo, postTeams } from '@/api/client'
import { useAuthStore } from './auth'

function emptyScore(): ScoreData {
  return {
    A: { hc: '', pp: '', rv: '', hg: '' },
    B: { hc: '', pp: '', rv: '', hg: '' },
  }
}

function getLoser(m: Match): Team | null {
  if (!m.winner) { return null }
  if (m.tA && m.winner.s !== m.tA.s) { return m.tA }
  if (m.tB && m.winner.s !== m.tB.s) { return m.tB }
  return null
}

function propagateRound(cur: Match[], winners: (Team | null)[]): void {
  cur.forEach((m, mi) => {
    if (m.isBye) {
      m.tA = winners[winners.length - 1] || null
      m.tB = null
      if (m.tA && !m.winner) { m.winner = m.tA }
    } else {
      const pa = m.tA
      const pb = m.tB
      m.tA = winners[mi * 2] || null
      m.tB = winners[mi * 2 + 1] || null
      if (m.tA !== pa || m.tB !== pb) { m.winner = null }
    }
  })
}

function makeMatch(id: string, r: number, i: number, isBye = false): Match {
  return { id, r, i, tA: null, tB: null, winner: null, pA: 0, pB: 0, isBye }
}

export const useBracketStore = defineStore('bracket', () => {
  const auth = useAuthStore()

  const teams = ref<Team[]>([...DEFAULT_TEAMS])
  const rounds = ref<Match[][]>([])
  const lbRounds = ref<Match[][]>([])
  const scores = ref<Record<string, ScoreData>>({})
  const totalPts = ref<Record<number, number>>({})

  const activeTab = ref<TabName>('bracket')
  const activeBracketView = ref<BracketType>('wb')
  const curRound = ref(0)
  const curLBRound = ref(0)
  const hoveredSeed = ref<number | null>(null)
  const lbHoveredSeed = ref<number | null>(null)

  const byeTeam = computed<Team>(() => ({ ...teams.value[0] }))

  function buildBracket(): Match[][] {
    const D = teams.value
    const r0: Match[] = []
    for (let i = 0; i < 21; i++) {
      const m = makeMatch(`0-${i}`, 0, i)
      m.tA = { ...D[1 + i] }
      m.tB = { ...D[42 - i] }
      r0.push(m)
    }

    const r1: Match[] = []
    for (let i = 0; i < 11; i++) {
      r1.push(makeMatch(`1-${i}`, 1, i))
    }

    const r2: Match[] = []
    for (let i = 0; i < 5; i++) {
      r2.push(makeMatch(`2-${i}`, 2, i))
    }
    r2.push(makeMatch('2-5', 2, 5, true))

    const r3: Match[] = []
    for (let i = 0; i < 3; i++) {
      r3.push(makeMatch(`3-${i}`, 3, i))
    }

    const r4: Match[] = [
      makeMatch('4-0', 4, 0),
      makeMatch('4-1', 4, 1, true),
    ]

    const r5: Match[] = [makeMatch('5-0', 5, 0)]

    return [r0, r1, r2, r3, r4, r5]
  }

  function buildLosersBracket(): Match[][] {
    const lb0: Match[] = []
    for (let i = 0; i < 10; i++) {
      lb0.push(makeMatch(`L0-${i}`, 0, i))
    }
    lb0.push(makeMatch('L0-10', 0, 10, true))

    const lb1: Match[] = []
    for (let i = 0; i < 5; i++) {
      lb1.push(makeMatch(`L1-${i}`, 1, i))
    }
    lb1.push(makeMatch('L1-5', 1, 5, true))

    const lb2: Match[] = []
    for (let i = 0; i < 3; i++) {
      lb2.push(makeMatch(`L2-${i}`, 2, i))
    }

    const lb3: Match[] = [
      makeMatch('L3-0', 3, 0),
      makeMatch('L3-1', 3, 1, true),
    ]

    const lb4: Match[] = [makeMatch('L4-0', 4, 0)]

    return [lb0, lb1, lb2, lb3, lb4]
  }

  function syncAllRounds(): void {
    const r0 = rounds.value[0]
    const r1 = rounds.value[1]

    r1[0].tA = byeTeam.value
    r1[0].tB = r0[20].winner || null

    for (let k = 1; k <= 10; k++) {
      r1[k].tA = r0[k - 1] ? (r0[k - 1].winner || null) : null
      r1[k].tB = r0[20 - k] ? (r0[20 - k].winner || null) : null
    }

    for (let ri = 2; ri < rounds.value.length; ri++) {
      const winners = rounds.value[ri - 1].map(m => m.winner || null)
      propagateRound(rounds.value[ri], winners)
    }
  }

  function syncLosersBracket(): void {
    const wb0 = rounds.value[0]
    const lb = lbRounds.value

    for (let i = 0; i < 10; i++) {
      lb[0][i].tA = getLoser(wb0[i])
      lb[0][i].tB = getLoser(wb0[20 - i])
    }

    lb[0][10].tA = getLoser(wb0[10])
    lb[0][10].tB = null
    if (lb[0][10].tA && !lb[0][10].winner) { lb[0][10].winner = lb[0][10].tA }

    for (let ri = 1; ri < lb.length; ri++) {
      const winners = lb[ri - 1].map(m => m.winner || null)
      propagateRound(lb[ri], winners)
    }
  }

  function syncAll(): void {
    syncAllRounds()
    syncLosersBracket()
  }

  function clearDownstream(ri: number, isLB: boolean): void {
    const rnds = isLB ? lbRounds.value : rounds.value
    for (let r = ri + 1; r < rnds.length; r++) {
      rnds[r].forEach(m2 => {
        if (!m2.isBye) {
          m2.winner = null
          m2.pA = 0
          m2.pB = 0
          delete scores.value[m2.id]
        }
      })
    }
  }

  function advanceTeam(ri: number, mi: number, side: Side, isLB: boolean): void {
    const rnds = isLB ? lbRounds.value : rounds.value
    const m = rnds[ri][mi]
    if (m.winner) { return }
    const winner = side === 'A' ? m.tA : m.tB
    if (!winner) { return }

    m.winner = winner
    clearDownstream(ri, isLB)
    syncAll()
    postAdvance(auth.adminPassword, m.id, winner.s)
  }

  function undoMatch(ri: number, mi: number, isLB: boolean): void {
    const rnds = isLB ? lbRounds.value : rounds.value
    const m = rnds[ri][mi]
    if (!m.winner) { return }

    const clearMatchIds: string[] = []
    for (let r = ri + 1; r < rnds.length; r++) {
      rnds[r].forEach(m2 => {
        if (!m2.isBye && m2.winner) { clearMatchIds.push(m2.id) }
      })
    }

    m.winner = null
    m.pA = 0
    m.pB = 0
    delete scores.value[m.id]
    clearDownstream(ri, isLB)

    recalcTotalPts()
    syncAll()
    postUndo(auth.adminPassword, m.id, clearMatchIds)
  }

  function scoreAndAdvance(key: string, ri: number, mi: number, isLB: boolean): void {
    const rnds = isLB ? lbRounds.value : rounds.value
    const m = rnds[ri][mi]
    if (m.winner) { return }

    const sc = scores.value[key] || emptyScore()
    const pA = calcTotal(sc.A)
    const pB = calcTotal(sc.B)
    m.pA = pA
    m.pB = pB

    let winner: Team | null
    if (pA > pB) {
      winner = m.tA
    } else if (pB > pA) {
      winner = m.tB
    } else {
      winner = (+(sc.A.pp || 0)) >= (+(sc.B.pp || 0)) ? m.tA : m.tB
    }

    m.winner = winner
    const pts = Math.max(pA, pB)
    if (winner) {
      totalPts.value[winner.s] = (totalPts.value[winner.s] || 0) + pts
    }

    clearDownstream(ri, isLB)
    syncAll()

    if (winner) {
      postAdvance(auth.adminPassword, key, winner.s, sc, pts)
    }
  }

  function updateScore(key: string, side: Side, field: keyof ScoreMetrics, val: string): void {
    if (!scores.value[key]) { scores.value[key] = emptyScore() }
    scores.value[key][side][field] = val
  }

  function recalcTotalPts(): void {
    totalPts.value = {}
    const allRounds = [...rounds.value, ...lbRounds.value]
    allRounds.forEach(round => round.forEach(mx => {
      if (mx.winner) {
        const sc = scores.value[mx.id]
        if (sc) {
          const pts = Math.max(calcTotal(sc.A || {}), calcTotal(sc.B || {}))
          totalPts.value[mx.winner.s] = (totalPts.value[mx.winner.s] || 0) + pts
        }
      }
    }))
  }

  function applyTeams(newTeams: Team[]): void {
    teams.value = newTeams
    rounds.value = buildBracket()
    lbRounds.value = buildLosersBracket()
    scores.value = {}
    totalPts.value = {}
    syncAll()
  }

  async function saveTeamsRemote(newTeams: Team[]): Promise<boolean> {
    const ok = await postTeams(auth.adminPassword, newTeams)
    if (ok) {
      applyTeams(newTeams)
    }
    return ok
  }

  async function loadState(): Promise<void> {
    try {
      const { teams: remoteTeams, state: data } = await loadRemoteState()

      if (remoteTeams && remoteTeams.length > 0) {
        teams.value = remoteTeams
        rounds.value = buildBracket()
      }

      if (data.scores) { scores.value = data.scores }
      if (data.totalPts) { totalPts.value = data.totalPts }

      if (data.winners) {
        const entries = Object.entries(data.winners).sort((a, b) => {
          const pa = a[0].startsWith('L') ? a[0].slice(1) : a[0]
          const pb = b[0].startsWith('L') ? b[0].slice(1) : b[0]
          const [ra] = pa.split('-').map(Number)
          const [rb] = pb.split('-').map(Number)
          return ra - rb
        })

        entries.filter(([id]) => !id.startsWith('L')).forEach(([matchId, winnerSeed]) => {
          const [ri, mi] = matchId.split('-').map(Number)
          if (rounds.value[ri] && rounds.value[ri][mi]) {
            syncAllRounds()
            const m = rounds.value[ri][mi]
            if (m.tA && m.tA.s === winnerSeed) { m.winner = m.tA }
            else if (m.tB && m.tB.s === winnerSeed) { m.winner = m.tB }
            if (data.scores[matchId]) {
              const sc = data.scores[matchId]
              m.pA = calcTotal(sc.A || {})
              m.pB = calcTotal(sc.B || {})
            }
          }
        })

        syncAllRounds()
        syncLosersBracket()
        entries.filter(([id]) => id.startsWith('L')).forEach(([matchId, winnerSeed]) => {
          const [ri, mi] = matchId.slice(1).split('-').map(Number)
          if (lbRounds.value[ri] && lbRounds.value[ri][mi]) {
            const m = lbRounds.value[ri][mi]
            if (m.tA && m.tA.s === winnerSeed) { m.winner = m.tA }
            else if (m.tB && m.tB.s === winnerSeed) { m.winner = m.tB }
            if (data.scores[matchId]) {
              const sc = data.scores[matchId]
              m.pA = calcTotal(sc.A || {})
              m.pB = calcTotal(sc.B || {})
            }
          }
        })
      }

      syncAll()
    } catch {
      console.log('Running locally, no API')
    }
  }

  const leaderboard = computed<RankedTeam[]>(() => {
    const active = new Set<number>()
    const eliminated = new Set<number>()
    const lbActive = new Set<number>()
    const lbEliminated = new Set<number>()

    rounds.value.forEach(round => round.forEach(m => {
      if (m.winner) {
        active.add(m.winner.s)
        if (m.tA && m.winner.s !== m.tA.s) { eliminated.add(m.tA.s) }
        if (m.tB && m.winner.s !== m.tB.s) { eliminated.add(m.tB.s) }
      }
    }))

    lbRounds.value.forEach(round => round.forEach(m => {
      if (m.winner) {
        lbActive.add(m.winner.s)
        if (m.tA && m.winner.s !== m.tA.s) { lbEliminated.add(m.tA.s) }
        if (m.tB && m.winner.s !== m.tB.s) { lbEliminated.add(m.tB.s) }
      }
    }))

    const inLB = new Set<number>()
    if (lbRounds.value[0]) {
      lbRounds.value[0].forEach(m => {
        if (m.tA) { inLB.add(m.tA.s) }
        if (m.tB) { inLB.add(m.tB.s) }
      })
    }

    return [...teams.value].map(d => {
      let status: RankedTeam['status'] = 'waiting'
      if (lbEliminated.has(d.s)) { status = 'eliminated' }
      else if (lbActive.has(d.s)) { status = 'lb-active' }
      else if (eliminated.has(d.s) && inLB.has(d.s)) { status = 'lb-active' }
      else if (eliminated.has(d.s)) { status = 'eliminated' }
      else if (active.has(d.s)) { status = 'active' }
      return { ...d, pts: totalPts.value[d.s] || 0, status }
    }).sort((a, b) => b.pts - a.pts)
  })

  // Initialize
  rounds.value = buildBracket()
  lbRounds.value = buildLosersBracket()
  syncAll()

  return {
    teams,
    rounds,
    lbRounds,
    scores,
    totalPts,
    activeTab,
    activeBracketView,
    curRound,
    curLBRound,
    hoveredSeed,
    lbHoveredSeed,
    byeTeam,
    leaderboard,
    syncAll,
    advanceTeam,
    undoMatch,
    scoreAndAdvance,
    updateScore,
    loadState,
    applyTeams,
    saveTeamsRemote,
    recalcTotalPts,
    emptyScore,
  }
})
