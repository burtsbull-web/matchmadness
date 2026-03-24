<script setup lang="ts">
import { computed } from 'vue'
import type { Match } from '@/shared/types'
import { WB_ACCENT, LB_ACCENT } from '@/shared/constants'

const props = defineProps<{
  match: Match
  isLB: boolean
  nextMatch?: Match | null
}>()

const accent = computed(() => props.isLB ? LB_ACCENT : WB_ACCENT)

const hasResult = computed(() => !!props.match.winner)

const winnerSeed = computed(() => props.match.winner?.s ?? null)
</script>

<template>
  <div class="match-card-row">
    <div class="match-card" :class="{ decided: hasResult }">
      <!-- Team A -->
      <div
        class="team-row"
        :class="{
          winner: winnerSeed === match.tA?.s,
          loser: hasResult && winnerSeed !== match.tA?.s,
        }"
      >
        <span class="seed">#{{ match.tA?.s }}</span>
        <span class="team-name">{{ match.tA?.n ?? 'TBD' }}</span>
        <span v-if="match.pA > 0" class="score" :style="{ color: accent }">{{ match.pA }}</span>
      </div>

      <!-- Team B -->
      <div
        class="team-row"
        :class="{
          winner: winnerSeed === match.tB?.s,
          loser: hasResult && winnerSeed !== match.tB?.s,
        }"
      >
        <span class="seed">#{{ match.tB?.s }}</span>
        <span class="team-name">{{ match.tB?.n ?? 'TBD' }}</span>
        <span v-if="match.pB > 0" class="score" :style="{ color: accent }">{{ match.pB }}</span>
      </div>
    </div>

    <!-- Next round peek -->
    <div v-if="nextMatch" class="peek">
      <div class="peek-connector"></div>
      <div class="peek-card">
        <div class="peek-team" :class="{ 'peek-bold': nextMatch.tA?.s === winnerSeed }">
          {{ nextMatch.tA?.n ? nextMatch.tA.n.slice(0, 10) : '' }}
        </div>
        <div class="peek-team" :class="{ 'peek-bold': nextMatch.tB?.s === winnerSeed }">
          {{ nextMatch.tB?.n ? nextMatch.tB.n.slice(0, 10) : '' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.match-card-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.match-card {
  flex: 1;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  overflow: hidden;
}

.match-card.decided {
  border-color: #ddd;
}

.team-row {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  gap: 10px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}

.team-row:last-child {
  border-bottom: none;
}

.team-row.winner {
  background: #fafafa;
}

.team-row.winner .team-name {
  font-weight: 600;
}

.team-row.winner .score {
  font-weight: 700;
}

.team-row.loser {
  opacity: 0.45;
}

.seed {
  font-size: 12px;
  color: #aaa;
  min-width: 24px;
  font-weight: 500;
}

.team-name {
  flex: 1;
  font-size: 14px;
  color: #1a1a1a;
}

.score {
  font-size: 16px;
  font-weight: 600;
  min-width: 24px;
  text-align: right;
}

/* Next-round peek */
.peek {
  display: flex;
  align-items: center;
  margin-left: -4px;
  flex-shrink: 0;
}

.peek-connector {
  width: 12px;
  height: 2px;
  background: #e0e0e0;
}

.peek-card {
  background: #f8f8f8;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 6px 8px;
  width: 80px;
  opacity: 0.6;
}

.peek-team {
  font-size: 10px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 2px 0;
}

.peek-team.peek-bold {
  font-weight: 600;
  color: #555;
}
</style>
