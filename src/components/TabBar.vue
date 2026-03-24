<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useBracketStore } from '@/stores/bracket'
import { TABS, selectTab as doSelectTab } from '@/shared/tabs'

const auth = useAuthStore()
const store = useBracketStore()

function onSelect(key: string): void {
  doSelectTab(key, auth, store)
}
</script>

<template>
  <div class="tabs">
    <button
      v-for="tab in TABS"
      :key="tab.key"
      class="tab"
      :class="{ active: store.activeTab === tab.key }"
      @click="onSelect(tab.key)"
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
