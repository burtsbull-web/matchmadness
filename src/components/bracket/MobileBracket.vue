<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Match } from '@/shared/types'
import {
  ROUND_LABELS, LB_ROUND_LABELS,
  ROUND_SHORT_LABELS, LB_ROUND_SHORT_LABELS,
  LB_ACCENT, WB_ACCENT, getRoundDates,
} from '@/shared/constants'
import { useBracketStore } from '@/stores/bracket'
import MatchCard from './MatchCard.vue'

const props = defineProps<{
  isLB: boolean
}>()

const store = useBracketStore()

const selectedRound = ref(0)

const labels = computed(() => props.isLB ? LB_ROUND_LABELS : ROUND_LABELS)
const shortLabels = computed(() => props.isLB ? LB_ROUND_SHORT_LABELS : ROUND_SHORT_LABELS)
const rounds = computed(() => props.isLB ? store.lbRounds : store.rounds)
const cachedDates = getRoundDates()
const dates = computed(() => props.isLB ? cachedDates.slice(1) : cachedDates)
const accent = computed(() => props.isLB ? LB_ACCENT : WB_ACCENT)

const currentMatches = computed(() => {
  const round = rounds.value[selectedRound.value]
  if (!round) { return [] }
  return round.filter(m => !m.isBye && (m.tA || m.tB))
})

function getNextMatch(match: Match): Match | null {
  const nextRi = selectedRound.value + 1
  if (nextRi >= rounds.value.length) { return null }

  const nextRound = rounds.value[nextRi]
  const mi = match.i

  let nmi: number
  if (props.isLB) {
    nmi = Math.floor(mi / 2)
  } else if (selectedRound.value === 0) {
    nmi = mi === 0 ? 0 : Math.ceil(mi / 2)
  } else {
    nmi = Math.floor(mi / 2)
  }

  if (nmi >= nextRound.length) { return null }
  return nextRound[nmi]
}

function selectRound(ri: number): void {
  selectedRound.value = ri
}

const completedCount = computed(() =>
  currentMatches.value.filter(m => m.winner).length,
)
</script>

<template>
  <div class="mobile-bracket">
    <!-- Round pills -->
    <div class="round-pills">
      <button
        v-for="(label, ri) in labels"
        :key="ri"
        class="pill"
        :class="{ active: selectedRound === ri }"
        :style="selectedRound === ri ? { background: accent, borderColor: accent } : {}"
        @click="selectRound(ri)"
      >
        {{ shortLabels[ri] }}
      </button>
    </div>

    <!-- Round info -->
    <div class="round-info">
      <div class="round-title">{{ labels[selectedRound] }}</div>
      <div v-if="dates[selectedRound]" class="round-dates">
        {{ dates[selectedRound].s }} &ndash; {{ dates[selectedRound].e }}
      </div>
      <div class="round-progress">
        {{ completedCount }}/{{ currentMatches.length }} decided
      </div>
    </div>

    <!-- Match cards -->
    <div v-if="currentMatches.length === 0" class="empty">
      No matchups in this round yet.
    </div>

    <MatchCard
      v-for="match in currentMatches"
      :key="match.id"
      :match="match"
      :is-l-b="isLB"
      :next-match="getNextMatch(match)"
    />
  </div>
</template>

<style scoped>
.mobile-bracket {
  padding: 0 4px;
}

.round-pills {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 0 12px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.round-pills::-webkit-scrollbar {
  display: none;
}

.pill {
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1.5px solid #ddd;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: #fff;
  color: #555;
  cursor: pointer;
  white-space: nowrap;
}

.pill.active {
  color: #fff;
}

.round-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.round-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.round-dates {
  font-size: 12px;
  color: #888;
}

.round-progress {
  font-size: 11px;
  color: #aaa;
  margin-left: auto;
}

.empty {
  text-align: center;
  padding: 2rem 0;
  color: #999;
  font-size: 13px;
}
</style>
