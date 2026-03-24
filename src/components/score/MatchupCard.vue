<script setup lang="ts">
import { computed } from 'vue'
import type { Match } from '@/shared/types'
import { calcTotal } from '@/shared/scoring'
import { useBracketStore } from '@/stores/bracket'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  match: Match
  matchKey: string
  isLB: boolean
}>()

const store = useBracketStore()
const auth = useAuthStore()

const accent = computed(() => props.isLB ? '#E25353' : '#FA8D29')

const sc = computed(() => store.scores[props.matchKey] || store.emptyScore())

const pA = computed(() => calcTotal(sc.value.A))
const pB = computed(() => calcTotal(sc.value.B))

const lead = computed(() => {
  if (!props.match.tA || !props.match.tB) { return 'No scores entered' }
  if (pA.value > pB.value) { return `${props.match.tA.n} leads` }
  if (pB.value > pA.value) { return `${props.match.tB.n} leads` }
  if (pA.value > 0) { return 'Tied — Postpaid tiebreak' }
  return 'No scores entered'
})

function onInput(side: 'A' | 'B', field: 'hc' | 'pp' | 'rv' | 'hg', val: string): void {
  store.updateScore(props.matchKey, side, field, val)
}

function advance(): void {
  auth.requireAdmin(() => {
    store.scoreAndAdvance(props.matchKey, props.match.r, props.match.i, props.isLB)
  })
}
</script>

<template>
  <div class="mscorer">
    <div class="vs-row">
      <div class="vs-team">
        <div class="vs-label">#{{ match.tA!.s }} &middot; {{ match.tA!.dm }}</div>
        <div class="vs-name">{{ match.tA!.n }}</div>
      </div>
      <div class="vs-div">vs</div>
      <div class="vs-team">
        <div class="vs-label">#{{ match.tB!.s }} &middot; {{ match.tB!.dm }}</div>
        <div class="vs-name">{{ match.tB!.n }}</div>
      </div>
    </div>

    <div class="inputs-grid">
      <div>
        <div class="minputs">
          <div class="mg">
            <label>HSI Conv %</label>
            <input
              type="number"
              step="0.1"
              :value="sc.A.hc"
              @input="onInput('A', 'hc', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="mg">
            <label>Postpaid Conv %</label>
            <input
              type="number"
              step="0.1"
              :value="sc.A.pp"
              @input="onInput('A', 'pp', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="mg">
            <label>Revenue % to Goal</label>
            <input
              type="number"
              step="1"
              :value="sc.A.rv"
              @input="onInput('A', 'rv', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="mg">
            <label>HSI % to Goal</label>
            <input
              type="number"
              step="1"
              :value="sc.A.hg"
              @input="onInput('A', 'hg', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
        <div class="pts-display">
          {{ match.tA!.n }}: <strong :style="{ color: accent }">{{ pA }} pts</strong>
        </div>
      </div>

      <div>
        <div class="minputs">
          <div class="mg">
            <label>HSI Conv %</label>
            <input
              type="number"
              step="0.1"
              :value="sc.B.hc"
              @input="onInput('B', 'hc', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="mg">
            <label>Postpaid Conv %</label>
            <input
              type="number"
              step="0.1"
              :value="sc.B.pp"
              @input="onInput('B', 'pp', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="mg">
            <label>Revenue % to Goal</label>
            <input
              type="number"
              step="1"
              :value="sc.B.rv"
              @input="onInput('B', 'rv', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="mg">
            <label>HSI % to Goal</label>
            <input
              type="number"
              step="1"
              :value="sc.B.hg"
              @input="onInput('B', 'hg', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
        <div class="pts-display">
          {{ match.tB!.n }}: <strong :style="{ color: accent }">{{ pB }} pts</strong>
        </div>
      </div>
    </div>

    <div class="calc-row">
      <div class="lead-text">{{ lead }}</div>
      <button
        class="adv-btn"
        :disabled="pA === 0 && pB === 0"
        @click="advance"
      >
        Advance Winner
      </button>
    </div>
  </div>
</template>

<style scoped>
.mscorer {
  background: #fff;
  border: 0.5px solid #ddd;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 10px;
}

.vs-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.vs-team { flex: 1; }
.vs-label { font-size: 11px; color: #888; margin-bottom: 1px; }
.vs-name { font-size: 13px; font-weight: 500; }
.vs-div { font-size: 16px; color: #aaa; }

.inputs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.minputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.mg label {
  font-size: 11px;
  color: #888;
  display: block;
  margin-bottom: 2px;
}

.mg input {
  width: 100%;
  padding: 4px 7px;
  border: 0.5px solid #ccc;
  border-radius: 6px;
  font-size: 12px;
  background: #f9f9f9;
  color: #1a1a1a;
  box-sizing: border-box;
}

.pts-display {
  font-size: 12px;
  margin-top: 7px;
  color: #888;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 9px;
  padding-top: 9px;
  border-top: 0.5px solid #eee;
}

.lead-text {
  font-size: 12px;
  color: #888;
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

.adv-btn:hover { background: #e07a1a; }
.adv-btn:disabled { background: #ddd; color: #aaa; cursor: default; }
</style>
