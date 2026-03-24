<script setup lang="ts">
import { computed } from 'vue'
import type { Match, Side } from '@/shared/types'
import { SLOT_H, SLOT_W, COL_GAP, PAD_TOP, PAD_LEFT, MATCH_GAP, ROUND_LABELS, LB_ROUND_LABELS, getRoundDates } from '@/shared/constants'
import { useBracketStore } from '@/stores/bracket'
import { useAuthStore } from '@/stores/auth'
import SvgSlot from './SvgSlot.vue'
import SvgConnector from './SvgConnector.vue'

const props = defineProps<{
  isLB: boolean
}>()

const store = useBracketStore()
const auth = useAuthStore()

const rounds = computed(() => props.isLB ? store.lbRounds : store.rounds)

const hoveredSeed = computed(() => props.isLB ? store.lbHoveredSeed : store.hoveredSeed)
const labels = computed(() => props.isLB ? LB_ROUND_LABELS : ROUND_LABELS)
const accent = computed(() => props.isLB ? '#E25353' : '#FA8D29')
const cachedDates = getRoundDates()
const dates = computed(() => props.isLB ? cachedDates.slice(1) : cachedDates)

const maxMatchups = computed(() => props.isLB ? 11 : 21)

const layout = computed(() => {
  const matchH = SLOT_H * 2 + MATCH_GAP
  const totalH = PAD_TOP + maxMatchups.value * matchH + PAD_TOP
  const positions: Record<number, Array<{ x: number; y: number }>> = {}

  rounds.value.forEach((round, ri) => {
    const n = round.length
    const availH = totalH - PAD_TOP * 2
    const spacing = Math.max(matchH, availH / n)
    const startY = PAD_TOP + (availH - spacing * n) / 2 + spacing / 2
    positions[ri] = round.map((_, mi) => ({
      x: PAD_LEFT + ri * (SLOT_W + COL_GAP),
      y: startY + mi * spacing,
    }))
  })

  const totalW = PAD_LEFT + rounds.value.length * (SLOT_W + COL_GAP) + SLOT_W + PAD_LEFT
  return { positions, totalH, totalW }
})

const pathSeeds = computed(() => {
  const seeds = new Set<number>()
  const hs = hoveredSeed.value
  if (hs === null) { return seeds }

  seeds.add(hs)
  rounds.value.forEach(round => round.forEach(m => {
    if ((m.tA && m.tA.s === hs) || (m.tB && m.tB.s === hs)) {
      if (m.tA) { seeds.add(m.tA.s) }
      if (m.tB) { seeds.add(m.tB.s) }
    }
  }))
  return seeds
})

interface ConnectorData {
  id: string
  d: string
  highlighted: boolean
}

const connectors = computed((): ConnectorData[] => {
  const result: ConnectorData[] = []
  const hs = hoveredSeed.value

  rounds.value.forEach((round, ri) => {
    if (ri >= rounds.value.length - 1) { return }
    round.forEach((m, mi) => {
      const pos = layout.value.positions[ri][mi]
      let nmi: number
      let nSide: 'A' | 'B'

      if (props.isLB) {
        nmi = Math.floor(mi / 2)
        nSide = mi % 2 === 0 ? 'A' : 'B'
      } else if (ri === 0) {
        if (mi === 0) { nmi = 0; nSide = 'B' }
        else { nmi = Math.ceil(mi / 2); nSide = mi % 2 === 1 ? 'A' : 'B' }
      } else {
        nmi = Math.floor(mi / 2)
        nSide = mi % 2 === 0 ? 'A' : 'B'
      }

      if (nmi >= rounds.value[ri + 1].length) { return }
      const npos = layout.value.positions[ri + 1][nmi]
      const fromX = pos.x + SLOT_W
      const fromY = pos.y
      const toX = npos.x
      const toY = npos.y + (nSide === 'A' ? -SLOT_H / 2 - 1 : SLOT_H / 2 + 1)
      const isHighlighted = hs !== null && (
        (m.tA && m.tA.s === hs) ||
        (m.tB && m.tB.s === hs) ||
        (m.winner && m.winner.s === hs)
      )
      const midX = fromX + COL_GAP * 0.45
      result.push({
        id: `${ri}-${mi}`,
        d: `M${fromX},${fromY} C${midX},${fromY} ${midX},${toY} ${toX},${toY}`,
        highlighted: !!isHighlighted,
      })
    })
  })
  return result
})

function setHover(seed: number | null): void {
  if (props.isLB) {
    store.lbHoveredSeed = seed
  } else {
    store.hoveredSeed = seed
  }
}

function handleSlotClick(ri: number, mi: number, side: Side): void {
  auth.requireAdmin(() => {
    store.advanceTeam(ri, mi, side, props.isLB)
  })
}

function handleUndo(ri: number, mi: number): void {
  auth.requireAdmin(() => {
    store.undoMatch(ri, mi, props.isLB)
  })
}
</script>

<template>
  <div style="width: 100%; overflow-x: auto">
    <svg
      :width="layout.totalW"
      :height="layout.totalH"
      :viewBox="`0 0 ${layout.totalW} ${layout.totalH}`"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Connectors -->
      <g>
        <SvgConnector
          v-for="conn in connectors"
          :key="conn.id"
          :d="conn.d"
          :highlighted="conn.highlighted"
          :color="accent"
        />
      </g>

      <!-- Round labels -->
      <template v-for="(label, ri) in labels" :key="'label-' + ri">
        <text
          :x="PAD_LEFT + ri * (SLOT_W + COL_GAP) + SLOT_W / 2"
          :y="18"
          text-anchor="middle"
          font-size="11"
          font-weight="500"
          fill="#555"
        >{{ label }}</text>
        <text
          v-if="dates[ri]"
          :x="PAD_LEFT + ri * (SLOT_W + COL_GAP) + SLOT_W / 2"
          :y="33"
          text-anchor="middle"
          font-size="10"
          :fill="accent"
        >{{ dates[ri].s }}&ndash;{{ dates[ri].e }}</text>
      </template>

      <!-- Matches -->
      <template v-for="(round, ri) in rounds" :key="'r-' + ri">
        <template v-for="(match, mi) in round" :key="match.id">
          <!-- Slot A -->
          <SvgSlot
            side="A"
            :match="match"
            :x="layout.positions[ri][mi].x"
            :y="layout.positions[ri][mi].y - SLOT_H - 1"
            :path-seeds="pathSeeds"
            :hovered-seed="hoveredSeed"
            :is-l-b="isLB"
            :is-admin="auth.isAdmin"
            @hover="setHover"
            @click-slot="handleSlotClick(ri, mi, $event)"
          />

          <!-- Slot B -->
          <SvgSlot
            v-if="!match.isBye"
            side="B"
            :match="match"
            :x="layout.positions[ri][mi].x"
            :y="layout.positions[ri][mi].y + 1"
            :path-seeds="pathSeeds"
            :hovered-seed="hoveredSeed"
            :is-l-b="isLB"
            :is-admin="auth.isAdmin"
            @hover="setHover"
            @click-slot="handleSlotClick(ri, mi, $event)"
          />

          <!-- Undo button -->
          <g v-if="auth.isAdmin && match.winner && !match.isBye" style="cursor: pointer">
            <rect
              :x="layout.positions[ri][mi].x + SLOT_W - 30"
              :y="layout.positions[ri][mi].y - 3"
              width="28"
              height="6"
              rx="3"
              fill="#E25353"
            />
            <text
              :x="layout.positions[ri][mi].x + SLOT_W - 16"
              :y="layout.positions[ri][mi].y + 0.5"
              font-size="7"
              text-anchor="middle"
              fill="#fff"
              font-weight="500"
            >UNDO</text>
            <rect
              :x="layout.positions[ri][mi].x + SLOT_W - 32"
              :y="layout.positions[ri][mi].y - 7"
              width="32"
              height="14"
              fill="transparent"
              cursor="pointer"
              @click.stop="handleUndo(ri, mi)"
            />
          </g>
        </template>
      </template>
    </svg>
  </div>
</template>
