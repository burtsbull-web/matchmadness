<script setup lang="ts">
import { computed } from 'vue'
import { useBracketStore } from '@/stores/bracket'
import { ROUND_LABELS, LB_ROUND_LABELS } from '@/shared/constants'
import MatchupCard from './MatchupCard.vue'

const store = useBracketStore()

const isLB = computed(() => store.activeBracketView === 'lb')

const currentRounds = computed(() =>
  isLB.value ? store.lbRounds : store.rounds,
)

const currentRoundIdx = computed(() =>
  isLB.value ? store.curLBRound : store.curRound,
)

const activeMatches = computed(() => {
  const round = currentRounds.value[currentRoundIdx.value]
  if (!round) { return [] }
  return round.filter(m => !m.isBye && m.tA && m.tB && !m.winner)
})

function selectWBRound(ri: number): void {
  store.activeBracketView = 'wb'
  store.curRound = ri
}

function selectLBRound(ri: number): void {
  store.activeBracketView = 'lb'
  store.curLBRound = ri
}
</script>

<template>
  <div>
    <div class="round-selector">
      <button
        v-for="(label, ri) in ROUND_LABELS"
        :key="'wb-' + ri"
        class="round-btn"
        :class="{ active: store.activeBracketView === 'wb' && ri === store.curRound }"
        @click="selectWBRound(ri)"
      >
        {{ label }}
      </button>

      <span class="separator"></span>

      <button
        v-for="(label, ri) in LB_ROUND_LABELS"
        :key="'lb-' + ri"
        class="round-btn lb"
        :class="{ active: store.activeBracketView === 'lb' && ri === store.curLBRound }"
        @click="selectLBRound(ri)"
      >
        {{ label }}
      </button>
    </div>

    <div v-if="activeMatches.length === 0" class="no-matches">
      No active matchups in this round yet.
    </div>

    <MatchupCard
      v-for="m in activeMatches"
      :key="m.id"
      :match="m"
      :match-key="m.id"
      :is-l-b="isLB"
    />
  </div>
</template>

<style scoped>
.round-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.round-btn {
  padding: 5px 11px;
  border: 0.5px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  background: transparent;
  color: #555;
}

.round-btn.active {
  background: #007573;
  color: #fff;
  border-color: #007573;
}

.round-btn.lb.active {
  background: #E25353;
  border-color: #E25353;
}

.separator {
  width: 1px;
  background: #ddd;
  margin: 0 4px;
  align-self: stretch;
}

.no-matches {
  font-size: 13px;
  color: #888;
}
</style>
