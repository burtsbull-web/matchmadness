<script setup lang="ts">
import { computed } from 'vue'
import type { Match, Side } from '@/shared/types'
import { SLOT_W, SLOT_H } from '@/shared/constants'

const props = defineProps<{
  match: Match
  side: Side
  x: number
  y: number
  pathSeeds: Set<number>
  hoveredSeed: number | null
  isLB: boolean
  isAdmin: boolean
}>()

const emit = defineEmits<{
  hover: [seed: number | null]
  clickSlot: [side: Side]
}>()

const team = computed(() => props.side === 'A' ? props.match.tA : props.match.tB)
const isWinner = computed(() => team.value && props.match.winner && props.match.winner.s === team.value.s)
const canClick = computed(() => !props.match.isBye && props.match.tA && props.match.tB)
const isHovered = computed(() => team.value && props.pathSeeds.has(team.value.s) && props.hoveredSeed !== null)
const isMain = computed(() => team.value && team.value.s === props.hoveredSeed)
const accent = computed(() => props.isLB ? '#E25353' : '#FA8D29')

const fill = computed(() => {
  if (isMain.value) { return accent.value }
  if (isHovered.value) { return props.isLB ? '#FDE8E8' : '#FFF3E8' }
  if (isWinner.value) { return props.isLB ? '#FDF5F5' : '#FFF8F0' }
  if (props.match.isBye) { return props.isLB ? '#FDF8F8' : '#FFFAF5' }
  return '#fff'
})

const stroke = computed(() => {
  if (isMain.value) { return accent.value }
  if (isHovered.value) { return `${accent.value}80` }
  if (isWinner.value) { return `${accent.value}60` }
  return 'rgba(128,128,128,0.25)'
})

const strokeWidth = computed(() => {
  if (isMain.value) { return '1.5' }
  if (isHovered.value) { return '1' }
  return '0.5'
})

const pts = computed(() => props.side === 'A' ? props.match.pA : props.match.pB)

const displayName = computed(() => {
  if (!team.value) { return '' }
  const maxChars = 14
  return team.value.n.length > maxChars
    ? team.value.n.slice(0, maxChars - 1) + '\u2026'
    : team.value.n
})

const seedColor = computed(() => {
  if (isMain.value) { return 'rgba(255,255,255,0.8)' }
  if (isHovered.value) { return accent.value }
  return '#aaa'
})

const nameColor = computed(() => isMain.value ? '#fff' : '#1a1a1a')
const ptsColor = computed(() => isMain.value ? 'rgba(255,255,255,0.9)' : accent.value)

function onEnter(): void {
  if (team.value) { emit('hover', team.value.s) }
}

function onLeave(): void {
  emit('hover', null)
}

function onClick(): void {
  if (canClick.value && team.value) {
    emit('clickSlot', props.side)
  }
}
</script>

<template>
  <g>
    <rect
      :x="x"
      :y="y"
      :width="SLOT_W"
      :height="SLOT_H"
      rx="4"
      :fill="fill"
      :stroke="stroke"
      :stroke-width="strokeWidth"
    />

    <!-- TBD -->
    <text
      v-if="!team"
      :x="x + 6"
      :y="y + SLOT_H / 2 + 4"
      font-size="10"
      fill="#bbb"
    >TBD</text>

    <!-- Team content -->
    <template v-if="team">
      <text
        :x="x + 5"
        :y="y + SLOT_H / 2 + 4"
        font-size="9.5"
        :fill="seedColor"
        :font-weight="isHovered ? '500' : '400'"
      >{{ team.s }}</text>

      <text
        :x="x + 20"
        :y="y + SLOT_H / 2 + 4"
        font-size="10.5"
        :fill="nameColor"
        :font-weight="isMain || isWinner ? '500' : '400'"
      >{{ displayName }}</text>

      <text
        v-if="pts > 0"
        :x="x + SLOT_W - 4"
        :y="y + SLOT_H / 2 + 4"
        font-size="9.5"
        :fill="ptsColor"
        text-anchor="end"
      >{{ pts }}</text>

      <!-- BYE badge -->
      <template v-if="match.isBye">
        <rect
          :x="x + SLOT_W - 26"
          :y="y + 4"
          width="22"
          height="14"
          rx="3"
          :fill="accent"
        />
        <text
          :x="x + SLOT_W - 15"
          :y="y + 15"
          font-size="8"
          text-anchor="middle"
          fill="#fff"
          font-weight="500"
        >BYE</text>
      </template>
    </template>

    <!-- Hit area -->
    <rect
      :x="x"
      :y="y"
      :width="SLOT_W"
      :height="SLOT_H"
      rx="4"
      fill="transparent"
      :cursor="canClick ? 'pointer' : 'default'"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
      @click="onClick"
    />
  </g>
</template>
