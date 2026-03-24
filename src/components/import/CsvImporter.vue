<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Team, ScoreMetrics } from '@/shared/types'
import { calcTotal } from '@/shared/scoring'
import { ROUND_LABELS } from '@/shared/constants'
import { postAdvance } from '@/api/client'
import { useBracketStore } from '@/stores/bracket'
import { useAuthStore } from '@/stores/auth'
import SubTabs from '@/components/SubTabs.vue'

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
  loser: Team
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
  store.syncAll()
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
      const loser = winner!.s === m.tA.s ? m.tB : m.tA
      matches.push({ ri, mi, key: `${ri}-${mi}`, scA, scB, pA, pB, winner: winner!, loser: loser!, tA: m.tA, tB: m.tB })
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

const subTab = ref('rounds')

const importTabs = [
  { key: 'rounds', label: 'Import Round Scores' },
  { key: 'teams', label: 'Import Teams' },
]

const winnerCount = computed(() => pendingMatches.value?.length ?? 0)
</script>

<template>
  <div class="import-container">
    <SubTabs
      :tabs="importTabs"
      :active="subTab"
      @select="subTab = $event"
    />

    <div v-if="subTab === 'rounds'">
      <p class="section-desc">
        Paste CSV with columns: DISTRICT, GROSS REV %, NET HSI%, POST CONV, HSI.
        Click <strong>Preview</strong> to see results, then <strong>Apply</strong> to update the bracket.
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

      <div class="actions">
        <button class="btn-outline" @click="parseAndPreviewCSV">Preview Results</button>
      </div>

      <div v-if="pendingMatches" class="results-container">
        <div class="results-banner">
          <div class="banner-icon">&#9998;</div>
          <div>
            <strong>{{ winnerCount }} matches ready to apply</strong>
            <div class="banner-sub">
              {{ winnerCount }} winners advance &middot; {{ winnerCount }} losers move to Loser's Bracket
            </div>
          </div>
        </div>

        <div class="results-section">
          <div class="results-label winners-label">Winners (advancing)</div>
          <div v-for="m in pendingMatches" :key="'w-' + m.key" class="result-row winner-row">
            <span class="result-seed">#{{ m.winner.s }}</span>
            <span class="result-name">{{ m.winner.n }}</span>
            <span class="result-pts winner-pts">{{ Math.max(m.pA, m.pB) }} pts</span>
          </div>
        </div>

        <div class="results-section">
          <div class="results-label losers-label">Losers (to Loser's Bracket)</div>
          <div v-for="m in pendingMatches" :key="'l-' + m.key" class="result-row loser-row">
            <span class="result-seed">#{{ m.loser.s }}</span>
            <span class="result-name">{{ m.loser.n }}</span>
            <span class="result-pts loser-pts">{{ Math.min(m.pA, m.pB) }} pts</span>
          </div>
        </div>

        <div class="apply-section">
          <p class="apply-note">This will update the bracket and cannot be easily undone.</p>
          <button class="apply-btn" @click="applyCSVScores">
            Apply Scores &amp; Advance {{ winnerCount }} Winners
          </button>
        </div>
      </div>

      <div v-if="csvMsg" class="msg" :class="csvMsg.type">{{ csvMsg.text }}</div>
    </div>

    <div v-if="subTab === 'teams'">
      <p class="section-desc">
        Paste CSV with columns: Name, District. Teams will be seeded 1-43 in row order.
        This resets the entire bracket.
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
        <div class="actions" style="padding: 10px">
          <button class="btn-outline" @click="cancelTeamImport">Cancel</button>
          <button class="adv-btn" @click="confirmTeamImport">Save &amp; Apply to Bracket</button>
        </div>
      </div>

      <div v-if="teamMsg" class="msg" :class="teamMsg.type">{{ teamMsg.text }}</div>
    </div>
  </div>
</template>

<style scoped>
.import-container {
  max-width: 600px;
  margin: 0 auto;
}

.section-desc {
  font-size: 12px;
  color: #888;
  margin-bottom: 1rem;
  line-height: 1.5;
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
  margin-top: 10px;
}

.btn-outline {
  padding: 8px 20px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.adv-btn {
  padding: 8px 16px;
  background: #FA8D29;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
}

.results-container {
  margin-top: 1rem;
}

.results-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #FFF8F0;
  border: 1px solid #FA8D2940;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.banner-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.results-banner strong {
  font-size: 14px;
  color: #1a1a1a;
}

.banner-sub {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}

.results-section {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.results-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 14px;
  border-bottom: 1px solid #eee;
}

.winners-label {
  color: #007573;
  background: #00757310;
}

.losers-label {
  color: #E25353;
  background: #E2535310;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  font-size: 13px;
  border-bottom: 1px solid #f5f5f5;
}

.result-row:last-child { border-bottom: none; }

.result-seed {
  font-size: 11px;
  color: #aaa;
  min-width: 24px;
  font-weight: 500;
}

.result-name { flex: 1; }

.result-pts {
  font-weight: 600;
  font-size: 12px;
}

.winner-pts { color: #007573; }
.loser-pts { color: #E25353; }

.winner-row .result-name { font-weight: 500; }
.loser-row { opacity: 0.7; }

.apply-section {
  text-align: center;
  margin-top: 16px;
  padding-top: 12px;
}

.apply-note {
  font-size: 11px;
  color: #999;
  margin-bottom: 10px;
}

.apply-btn {
  padding: 12px 28px;
  background: #FA8D29;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.apply-btn:hover { background: #e07a1a; }

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

.msg {
  font-size: 12px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
}

.msg.success { background: #00757320; color: #007573; }
.msg.error { background: #E2535320; color: #A32D2D; }
</style>
