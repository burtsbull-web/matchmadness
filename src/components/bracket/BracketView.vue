<script setup lang="ts">
import { useBracketStore } from '@/stores/bracket'
import SvgBracket from './SvgBracket.vue'

const store = useBracketStore()

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

    <div v-if="store.activeBracketView === 'wb'">
      <SvgBracket :is-l-b="false" />
    </div>

    <div v-if="store.activeBracketView === 'lb'">
      <p class="lb-subtitle">First-round losers get a second chance</p>
      <SvgBracket :is-l-b="true" />
    </div>
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
