<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ScoreMetrics, Team } from '@/shared/types'
import { calcTotal } from '@/shared/scoring'
import { ROUND_LABELS } from '@/shared/constants'
import { postAdvanceBatch, postImportLog, fetchImportLog, deleteImportLog } from '@/api/client'
import type { ImportLogEntry } from '@/api/client'
import { useBracketStore } from '@/stores/bracket'
import { useAuthStore } from '@/stores/auth'
import SubTabs from '@/components/SubTabs.vue'

const store = useBracketStore()
const auth = useAuthStore()

const subTab = ref('import')
const importTabs = [
  { key: 'import', label: 'Import Scores' },
  { key: 'history', label: 'Import History' },
]

const importLog = ref<ImportLogEntry[]>([])

async function loadImportLog(): Promise<void> {
  try { importLog.value = await fetchImportLog() } catch { /* ignore */ }
}

function downloadCsv(entry: ImportLogEntry): void {
  const blob = new Blob([entry.csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${entry.round}-${entry.date.slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

async function removeLogEntry(entry: ImportLogEntry): Promise<void> {
  await deleteImportLog(auth.adminPassword, entry.id)
  importLog.value = importLog.value.filter(e => e.id !== entry.id)
}

function onSubTabSelect(key: string): void {
  subTab.value = key
  if (key === 'history') { loadImportLog() }
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

  // Score the previous round's matches using CSV data to determine winners
  const prevRi = ri - 1
  const prevRound = store.rounds[prevRi]
  if (!prevRound) {
    csvMsg.value = { type: 'error', text: 'Invalid round selected.' }
    return
  }

  const matches: PendingMatch[] = []
  const unmatched: string[] = []

  prevRound.forEach((m, mi) => {
    if (m.isBye || !m.tA || !m.tB) { return }
    const dA = lookup[m.tA.n.toLowerCase()]
    const dB = lookup[m.tB.n.toLowerCase()]
    if (!dA) { unmatched.push(m.tA.n) }
    if (!dB) { unmatched.push(m.tB.n) }
    if (!dA || !dB) { return }
    const scA: ScoreMetrics = { hc: String(dA.hc), pp: String(dA.pp), rv: String(dA.rv), hg: String(dA.hg) }
    const scB: ScoreMetrics = { hc: String(dB.hc), pp: String(dB.pp), rv: String(dB.rv), hg: String(dB.hg) }
    const pA = calcTotal(scA)
    const pB = calcTotal(scB)
    const w = pA > pB ? m.tA : pB > pA ? m.tB : (+dA.pp) >= (+dB.pp) ? m.tA : m.tB
    const l = w!.s === m.tA.s ? m.tB : m.tA
    m.winner = w
    m.pA = pA
    m.pB = pB
    matches.push({ ri: prevRi, mi, key: `${prevRi}-${mi}`, scA, scB, pA, pB, winner: w!, loser: l!, tA: m.tA, tB: m.tB })
  })

  store.syncAll()

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
      const batch = pendingMatches.value!.map(m => ({
        matchId: m.key,
        winnerSeed: m.winner.s,
        scores: { A: m.scA, B: m.scB },
        points: Math.max(m.pA, m.pB),
      }))
      await postAdvanceBatch(auth.adminPassword, batch)
      const roundLabel = ROUND_LABELS[csvRound.value] || `Round ${csvRound.value}`
      await postImportLog(auth.adminPassword, roundLabel, csvPaste.value)
      pendingMatches.value!.forEach(m => {
        store.scores[m.key] = { A: m.scA, B: m.scB }
        const match = store.rounds[m.ri][m.mi]
        match.pA = m.pA
        match.pB = m.pB
        match.winner = m.winner
        store.totalPts[m.winner.s] = (store.totalPts[m.winner.s] || 0) + Math.max(m.pA, m.pB)
      })
      store.syncAll()
      loadImportLog()
      pendingMatches.value = null
      csvPaste.value = ''
      csvMsg.value = { type: 'success', text: 'All scores applied and winners advanced!' }
    } catch (err) {
      csvMsg.value = { type: 'error', text: `Error: ${(err as Error).message}` }
    }
  })
}

const roundOptions = ROUND_LABELS.slice(1).map((label, i) => ({ value: i + 1, label }))

const winnerCount = computed(() => pendingMatches.value?.length ?? 0)
const isReupload = computed(() => {
  if (!pendingMatches.value || pendingMatches.value.length === 0) return false
  const ri = pendingMatches.value[0].ri
  return store.rounds[ri].some(m => m.winner !== null)
})
</script>

<template>
  <div class="import-container">
    <SubTabs :tabs="importTabs" :active="subTab" @select="onSubTabSelect" />

    <div v-if="subTab === 'import'">
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
            {{ isReupload ? 'Update Scores for This Round' : `Apply Scores &amp; Advance ${winnerCount} Winners` }}
          </button>
        </div>
      </div>

      <div v-if="csvMsg" class="msg" :class="csvMsg.type">{{ csvMsg.text }}</div>
    </div>

    <div v-if="subTab === 'history'">
      <div v-if="importLog.length === 0" class="empty-history">No imports yet.</div>
      <div v-for="entry in importLog" :key="entry.id" class="history-row">
        <div class="history-info">
          <div class="history-round">{{ entry.round }}</div>
          <div class="history-date">{{ formatDate(entry.date) }}</div>
        </div>
        <div class="history-actions">
          <button class="btn-outline" @click="downloadCsv(entry)">Download</button>
          <button class="btn-delete" @click="removeLogEntry(entry)">Delete</button>
        </div>
      </div>
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

.msg {
  font-size: 12px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
}

.msg.success { background: #00757320; color: #007573; }
.msg.error { background: #E2535320; color: #A32D2D; }

.empty-history {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 2rem 0;
}

.history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 8px;
  background: #fff;
}

.history-round {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
}

.history-date {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.history-actions {
  display: flex;
  gap: 6px;
}

.btn-delete {
  padding: 4px 12px;
  border: 1px solid #E25353;
  border-radius: 6px;
  background: #fff;
  color: #E25353;
  cursor: pointer;
  font-size: 11px;
}
</style>
