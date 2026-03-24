<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Team, ScoreMetrics } from '@/shared/types'
import { calcTotal } from '@/shared/scoring'
import { ROUND_LABELS } from '@/shared/constants'
import { postAdvance } from '@/api/client'
import { useBracketStore } from '@/stores/bracket'
import { useAuthStore } from '@/stores/auth'

const store = useBracketStore()
const auth = useAuthStore()

// --- Team Import (CSV) ---
const teamCsvPaste = ref('')
const pendingTeams = ref<Team[] | null>(null)
const teamMsg = ref<{ type: 'success' | 'error'; text: string } | null>(null)

function parseTeamCSV(): void {
  teamMsg.value = null
  pendingTeams.value = null
  const csv = teamCsvPaste.value.trim()
  if (!csv) {
    teamMsg.value = { type: 'error', text: 'No CSV data pasted.' }
    return
  }

  const lines = csv.split('\n').map(l => l.trim()).filter(l => l)
  if (lines.length < 2) {
    teamMsg.value = { type: 'error', text: 'CSV needs a header row and at least one data row.' }
    return
  }

  const teams: Team[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 2) { continue }
    const dm = cols[0].trim()
    const n = cols[1].trim()
    if (!dm || !n) { continue }
    teams.push({ s: teams.length + 1, dm, n })
  }

  if (teams.length === 0) {
    teamMsg.value = { type: 'error', text: 'No teams found. Check CSV format: Name,District per row.' }
    return
  }

  pendingTeams.value = teams
}

async function confirmTeamImport(): Promise<void> {
  if (!pendingTeams.value) { return }
  auth.requireAdmin(async () => {
    const ok = await store.saveTeamsRemote(pendingTeams.value!)
    if (ok) {
      teamMsg.value = { type: 'success', text: 'Teams imported! Bracket has been reset with new seedings.' }
      pendingTeams.value = null
      teamCsvPaste.value = ''
    } else {
      teamMsg.value = { type: 'error', text: 'Failed to save teams.' }
    }
  })
}

function cancelTeamImport(): void {
  pendingTeams.value = null
  teamMsg.value = null
}

// --- Round Score Import (CSV) ---
interface PendingMatch {
  ri: number
  mi: number
  key: string
  scA: ScoreMetrics
  scB: ScoreMetrics
  pA: number
  pB: number
  winner: Team
  tA: Team
  tB: Team
}

const csvPaste = ref('')
const csvRound = ref(1)
const pendingMatches = ref<PendingMatch[] | null>(null)
const csvMsg = ref<{ type: 'success' | 'error'; text: string } | null>(null)

function parseCSVRow(line: string) {
  const cols = line.split(',')
  if (cols.length < 5) { return null }
  const district = cols[0].trim()
  const raw1 = parseFloat(cols[1]) || 0
  const raw2 = parseFloat(cols[2]) || 0
  const raw3 = parseFloat(cols[3]) || 0
  const raw4 = parseFloat(cols[4]) || 0
  const mult = (raw1 < 10 && raw2 < 10) ? 100 : 1
  const rv = Math.round(raw1 * mult * 100) / 100
  const hg = Math.round(raw2 * mult * 100) / 100
  const pp = Math.round(raw3 * mult * 100) / 100
  const hc = Math.round(raw4 * mult * 100) / 100
  return { district, rv, hg, pp, hc }
}

function parseAndPreviewCSV(): void {
  csvMsg.value = null
  pendingMatches.value = null
  const csv = csvPaste.value.trim()
  if (!csv) {
    csvMsg.value = { type: 'error', text: 'No CSV data pasted.' }
    return
  }

  const lines = csv.split('\n').map(l => l.trim()).filter(l => l)
  if (lines.length < 2) {
    csvMsg.value = { type: 'error', text: 'CSV needs a header row and at least one data row.' }
    return
  }

  const rows: Array<{ district: string; rv: number; hg: number; pp: number; hc: number }> = []
  for (let i = 1; i < lines.length; i++) {
    const r = parseCSVRow(lines[i])
    if (r && r.district.toLowerCase() !== 'total') { rows.push(r) }
  }

  const lookup: Record<string, typeof rows[0]> = {}
  rows.forEach(r => {
    const parts = r.district.split(' - ')
    const distName = parts.length > 1 ? parts[0].trim() : r.district
    lookup[distName.toLowerCase()] = r
  })

  const ri = csvRound.value
  store.syncAllRounds()
  const round = store.rounds[ri]
  if (!round) {
    csvMsg.value = { type: 'error', text: 'Invalid round selected.' }
    return
  }

  // If Round of 32 and previous round not complete, derive from CSV
  if (ri === 1) {
    const r0 = store.rounds[0]
    const r1 = store.rounds[1]
    const needsDerive = r1.filter(m => !m.isBye).some(m => !m.tA || !m.tB)
    if (needsDerive) {
      for (let i = 0; i < 21; i++) {
        const tA = r0[i].tA
        const tB = r0[i].tB
        if (!tA || !tB) { continue }
        const dA = lookup[tA.n.toLowerCase()]
        const dB = lookup[tB.n.toLowerCase()]
        if (!dA || !dB) { continue }
        const scA = { hc: String(dA.hc), pp: String(dA.pp), rv: String(dA.rv), hg: String(dA.hg) }
        const scB = { hc: String(dB.hc), pp: String(dB.pp), rv: String(dB.rv), hg: String(dB.hg) }
        const pA = calcTotal(scA)
        const pB = calcTotal(scB)
        const w = pA > pB ? tA : pB > pA ? tB : (+dA.pp) >= (+dB.pp) ? tA : tB
        r0[i].winner = w
        r0[i].pA = pA
        r0[i].pB = pB
      }
      const byeTeam = store.byeTeam
      r1[0].tA = byeTeam
      r1[0].tB = r0[20].winner || null
      for (let k = 1; k <= 10; k++) {
        r1[k].tA = r0[k - 1].winner || null
        r1[k].tB = r0[20 - k].winner || null
      }
    }
  }

  const matches: PendingMatch[] = []
  const unmatched: string[] = []

  round.forEach((m, mi) => {
    if (m.isBye || !m.tA || !m.tB) { return }
    const dataA = lookup[m.tA.n.toLowerCase()]
    const dataB = lookup[m.tB.n.toLowerCase()]
    if (!dataA) { unmatched.push(m.tA.n) }
    if (!dataB) { unmatched.push(m.tB.n) }
    if (dataA && dataB) {
      const scA: ScoreMetrics = { hc: String(dataA.hc), pp: String(dataA.pp), rv: String(dataA.rv), hg: String(dataA.hg) }
      const scB: ScoreMetrics = { hc: String(dataB.hc), pp: String(dataB.pp), rv: String(dataB.rv), hg: String(dataB.hg) }
      const pA = calcTotal(scA)
      const pB = calcTotal(scB)
      const winner = pA > pB ? m.tA : pB > pA ? m.tB : (+dataA.pp) >= (+dataB.pp) ? m.tA : m.tB
      matches.push({ ri, mi, key: `${ri}-${mi}`, scA, scB, pA, pB, winner: winner!, tA: m.tA, tB: m.tB })
    }
  })

  if (unmatched.length > 0) {
    csvMsg.value = { type: 'error', text: `Could not find CSV data for: ${unmatched.join(', ')}` }
    return
  }
  if (matches.length === 0) {
    csvMsg.value = { type: 'error', text: 'No matchups found. Make sure the previous round is complete or CSV contains all 43 districts.' }
    return
  }

  pendingMatches.value = matches
}

async function applyCSVScores(): Promise<void> {
  if (!pendingMatches.value) { return }
  auth.requireAdmin(async () => {
    try {
      const apiCalls = pendingMatches.value!.map(m => {
        const sc = { A: m.scA, B: m.scB }
        store.scores[m.key] = sc
        const match = store.rounds[m.ri][m.mi]
        match.pA = m.pA
        match.pB = m.pB
        match.winner = m.winner
        const pts = Math.max(m.pA, m.pB)
        store.totalPts[m.winner.s] = (store.totalPts[m.winner.s] || 0) + pts
        return postAdvance(auth.adminPassword, m.key, m.winner.s, sc, pts)
      })
      await Promise.all(apiCalls)
      store.syncAll()
      pendingMatches.value = null
      csvPaste.value = ''
      csvMsg.value = { type: 'success', text: 'All scores applied and winners advanced!' }
    } catch (err) {
      csvMsg.value = { type: 'error', text: `Error: ${(err as Error).message}` }
    }
  })
}

const roundOptions = ROUND_LABELS.slice(1).map((label, i) => ({ value: i + 1, label }))
</script>

<template>
  <div class="import-container">
    <!-- Team Import -->
    <h3 class="section-title">Import Teams from CSV</h3>
    <p class="section-desc">
      Paste CSV with columns: Name, District. Teams will be seeded 1-43 in row order.
    </p>
    <textarea
      v-model="teamCsvPaste"
      rows="6"
      class="csv-input"
      placeholder="Paste CSV here (include header row)..."
    ></textarea>
    <div class="actions">
      <button class="btn-outline" @click="parseTeamCSV">Preview</button>
    </div>

    <div v-if="pendingTeams" class="preview-box">
      <div class="preview-header">{{ pendingTeams.length }} teams found</div>
      <div class="preview-list">
        <div v-for="t in pendingTeams" :key="t.s" class="preview-row">
          <span class="seed">#{{ t.s }}</span>
          <span class="team-name">{{ t.n }}</span>
          <span class="dm">{{ t.dm }}</span>
        </div>
      </div>
      <div class="actions">
        <button class="btn-outline" @click="cancelTeamImport">Cancel</button>
        <button class="adv-btn" @click="confirmTeamImport">Save &amp; Apply to Bracket</button>
      </div>
    </div>

    <div v-if="teamMsg" class="msg" :class="teamMsg.type">{{ teamMsg.text }}</div>

    <hr class="divider" />

    <!-- Round Score Import -->
    <h3 class="section-title">Import Round Scores from CSV</h3>
    <p class="section-desc">
      Paste CSV data with columns: DISTRICT, GROSS REV %, NET HSI%, POST CONV, HSI.
      Matches districts to the selected round's matchups, calculates scores, and advances winners.
    </p>

    <div class="round-select">
      <label>Target Round:</label>
      <select v-model="csvRound">
        <option v-for="opt in roundOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <textarea
      v-model="csvPaste"
      rows="8"
      class="csv-input"
      placeholder="Paste CSV here (include header row)..."
    ></textarea>

    <div v-if="pendingMatches" class="preview-box">
      <div v-for="m in pendingMatches" :key="m.key" class="match-preview">
        <span :class="{ bold: m.winner.s === m.tA.s, dim: m.winner.s !== m.tA.s }">
          #{{ m.tA.s }} {{ m.tA.n }} ({{ m.pA }} pts)
        </span>
        <span class="vs">vs</span>
        <span :class="{ bold: m.winner.s === m.tB.s, dim: m.winner.s !== m.tB.s }">
          #{{ m.tB.s }} {{ m.tB.n }} ({{ m.pB }} pts)
        </span>
      </div>
    </div>

    <div class="actions">
      <button class="btn-outline" @click="parseAndPreviewCSV">Preview</button>
      <button
        v-if="pendingMatches"
        class="adv-btn"
        @click="applyCSVScores"
      >
        Apply Scores &amp; Advance Winners
      </button>
    </div>

    <div v-if="csvMsg" class="msg" :class="csvMsg.type">{{ csvMsg.text }}</div>
  </div>
</template>

<style scoped>
.import-container {
  max-width: 600px;
  margin: 0 auto;
}

.section-title {
  font-size: 14px;
  margin-bottom: 8px;
}

.section-desc {
  font-size: 12px;
  color: #888;
  margin-bottom: 1rem;
}

.csv-input {
  width: 100%;
  font-size: 11px;
  font-family: monospace;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 8px;
  box-sizing: border-box;
}

.round-select {
  margin-bottom: 10px;
}

.round-select label {
  font-size: 12px;
  color: #555;
}

.round-select select {
  margin-left: 6px;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;
}

.btn-outline {
  padding: 6px 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.adv-btn {
  padding: 5px 13px;
  background: #FA8D29;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
}

.preview-box {
  background: #fff;
  border: 0.5px solid #ddd;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 1rem;
}

.preview-header {
  font-size: 12px;
  color: #555;
  padding: 8px 14px;
  border-bottom: 0.5px solid #eee;
  font-weight: 500;
}

.preview-list {
  max-height: 300px;
  overflow-y: auto;
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px;
  border-bottom: 0.5px solid #eee;
  font-size: 12px;
}

.preview-row:last-child { border-bottom: none; }

.seed {
  font-weight: 500;
  color: #FA8D29;
  min-width: 26px;
}

.team-name { flex: 1; }
.dm { font-size: 11px; color: #888; }

.match-preview {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  border-bottom: 0.5px solid #eee;
  font-size: 12px;
}

.match-preview:last-child { border-bottom: none; }
.match-preview .vs { margin: 0 8px; color: #ccc; }
.bold { font-weight: 700; }
.dim { color: #888; }

.divider {
  margin: 2rem 0;
  border: none;
  border-top: 1px solid #eee;
}

.msg {
  font-size: 12px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
}

.msg.success { background: #00757320; color: #007573; }
.msg.error { background: #E2535320; color: #A32D2D; }
</style>
