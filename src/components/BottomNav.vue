<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBracketStore } from '@/stores/bracket'
import { TABS, selectTab as doSelectTab } from '@/shared/tabs'

const auth = useAuthStore()
const store = useBracketStore()

const visibleTabs = computed(() => {
  if (auth.isAdmin) { return TABS }
  return TABS.filter(t => !t.adminOnly)
})

function selectTab(key: string): void {
  doSelectTab(key, auth, store)
}
</script>

<template>
  <nav class="bottom-nav">
    <button
      v-for="tab in visibleTabs"
      :key="tab.key"
      class="nav-item"
      :class="{ active: store.activeTab === tab.key }"
      @click="selectTab(tab.key)"
    >
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <!-- Trophy -->
        <template v-if="tab.icon === 'trophy'">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </template>
        <template v-else-if="tab.icon === 'list'">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </template>
        <template v-else-if="tab.icon === 'book'">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </template>
        <template v-else-if="tab.icon === 'edit'">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </template>
        <template v-else-if="tab.icon === 'upload'">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </template>
      </svg>
      <span class="nav-label">{{ tab.mobileLabel }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-top: 1px solid #eee;
    padding: 6px 0;
    padding-bottom: max(6px, env(safe-area-inset-bottom));
    z-index: 900;
    justify-content: space-around;
  }
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.nav-item.active {
  color: #FA8D29;
}

.nav-icon {
  width: 22px;
  height: 22px;
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
}
</style>
