<script setup lang="ts">
import type { TabName } from '@/shared/types'
import { useAuthStore } from '@/stores/auth'
import { useBracketStore } from '@/stores/bracket'

const auth = useAuthStore()
const store = useBracketStore()

const tabs: Array<{ key: TabName; label: string }> = [
  { key: 'bracket', label: 'Bracket' },
  { key: 'score', label: 'Enter Scores' },
  { key: 'rules', label: 'Scoring Rules' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'import', label: 'Import Teams' },
]

function selectTab(tab: TabName): void {
  if ((tab === 'score' || tab === 'import') && !auth.isAdmin) {
    auth.requireAdmin(() => { store.activeTab = tab })
    return
  }
  store.activeTab = tab
}
</script>

<template>
  <div class="tabs">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab"
      :class="{ active: store.activeTab === tab.key }"
      @click="selectTab(tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
  justify-content: center;
}

.tab {
  padding: 7px 15px;
  border: 0.5px solid #ccc;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  background: transparent;
  color: #555;
}

.tab.active {
  background: #FA8D29;
  color: #fff;
  border-color: #FA8D29;
  font-weight: 500;
}
</style>
