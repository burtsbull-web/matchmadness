<script setup lang="ts">
import { computed } from 'vue'
import { useBracketStore } from '@/stores/bracket'
import { ROUND_LABELS, LB_ROUND_LABELS, WB_TEAL, LB_ACCENT } from '@/shared/constants'
import SubTabs from '@/components/SubTabs.vue'
import MatchupCard from './MatchupCard.vue'

const store = useBracketStore()

const bracketTabs = [
  { key: 'wb', label: "Winner's Bracket" },
  { key: 'lb', label: "Loser's Bracket" },
]

const isLB = computed(() => store.activeBracketView === 'lb')

const activeAccent = computed(() => isLB.value ? LB_ACCENT : WB_TEAL)

const roundLabels = computed(() => isLB.value ? LB_ROUND_LABELS : ROUND_LABELS)

const currentRoundIdx = computed(() =>
  isLB.value ? store.curLBRound : store.curRound,
)

const currentRounds = computed(() =>
  isLB.value ? store.lbRounds : store.rounds,
)

const activeMatches = computed(() => {
  const round = currentRounds.value[currentRoundIdx.value]
  if (!round) { return [] }
  return round.filter(m => !m.isBye && m.tA && m.tB && !m.winner)
})

function onBracketSelect(key: string): void {
  store.activeBracketView = key as 'wb' | 'lb'
}

function selectRound(ri: number): void {
  if (isLB.value) {
    store.curLBRound = ri
  } else {
    store.curRound = ri
  }
}
</script>

<template>
  <div>
    <SubTabs
      :tabs="bracketTabs"
      :active="store.activeBracketView"
      :accent="activeAccent"
      @select="onBracketSelect"
    />

    <div class="round-pills">
      <button
        v-for="(label, ri) in roundLabels"
        :key="ri"
        class="pill"
        :class="{ active: ri === currentRoundIdx }"
        :style="ri === currentRoundIdx ? { background: activeAccent, borderColor: activeAccent } : {}"
        @click="selectRound(ri)"
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
.round-pills {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 0 12px;
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

.no-matches {
  font-size: 13px;
  color: #888;
  text-align: center;
  padding: 2rem 0;
}
</style>
