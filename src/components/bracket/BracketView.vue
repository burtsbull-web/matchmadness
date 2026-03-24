<script setup lang="ts">
import { computed } from 'vue'
import { useBracketStore } from '@/stores/bracket'
import { useAuthStore } from '@/stores/auth'
import { useIsMobile } from '@/composables/useIsMobile'
import SvgBracket from './SvgBracket.vue'
import MobileBracket from './MobileBracket.vue'

const store = useBracketStore()
const auth = useAuthStore()
const isMobile = useIsMobile()

const showMobile = computed(() => isMobile.value && !auth.isAdmin)

function showView(type: 'wb' | 'lb'): void {
  store.activeBracketView = type
}
</script>

<template>
  <div>
    <div class="toggle-row">
      <button
        class="bracket-toggle"
        :class="{ active: store.activeBracketView === 'wb', wb: store.activeBracketView === 'wb' }"
        @click="showView('wb')"
      >
        Winner's Bracket
      </button>
      <button
        class="bracket-toggle"
        :class="{ active: store.activeBracketView === 'lb', lb: store.activeBracketView === 'lb' }"
        @click="showView('lb')"
      >
        Loser's Bracket
      </button>
    </div>

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
.toggle-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 12px;
}

.bracket-toggle {
  padding: 7px 18px;
  border: 0.5px solid #ccc;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  background: transparent;
  color: #555;
  font-weight: 500;
}

.bracket-toggle.active.wb {
  background: #007573;
  color: #fff;
  border-color: #007573;
}

.bracket-toggle.active.lb {
  background: #E25353;
  color: #fff;
  border-color: #E25353;
}

.lb-subtitle {
  font-size: 11px;
  color: #888;
  text-align: center;
  margin-bottom: 8px;
}
</style>
