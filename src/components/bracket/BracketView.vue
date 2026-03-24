<script setup lang="ts">
import { computed } from 'vue'
import { useBracketStore } from '@/stores/bracket'
import { useAuthStore } from '@/stores/auth'
import { useIsMobile } from '@/composables/useIsMobile'
import { WB_TEAL, LB_ACCENT } from '@/shared/constants'
import SubTabs from '@/components/SubTabs.vue'
import SvgBracket from './SvgBracket.vue'
import MobileBracket from './MobileBracket.vue'

const store = useBracketStore()
const auth = useAuthStore()
const isMobile = useIsMobile()

const showMobile = computed(() => isMobile.value)

const bracketTabs = [
  { key: 'wb', label: "Winner's Bracket" },
  { key: 'lb', label: "Loser's Bracket" },
]

const activeAccent = computed(() =>
  store.activeBracketView === 'lb' ? LB_ACCENT : WB_TEAL,
)

function onSelect(key: string): void {
  store.activeBracketView = key as 'wb' | 'lb'
}
</script>

<template>
  <div>
    <SubTabs
      :tabs="bracketTabs"
      :active="store.activeBracketView"
      :accent="activeAccent"
      @select="onSelect"
    />

    <p v-if="store.activeBracketView === 'lb'" class="lb-subtitle">
      First-round losers get a second chance
    </p>

    <template v-if="showMobile">
      <MobileBracket :is-l-b="store.activeBracketView === 'lb'" />
    </template>
    <template v-else>
      <SvgBracket :is-l-b="store.activeBracketView === 'lb'" />
    </template>
  </div>
</template>

<style scoped>
.lb-subtitle {
  font-size: 11px;
  color: #888;
  text-align: center;
  margin-bottom: 8px;
}
</style>
