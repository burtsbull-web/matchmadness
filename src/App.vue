<script setup lang="ts">
import { onMounted } from 'vue'
import { useBracketStore } from '@/stores/bracket'
import { useAuthStore } from '@/stores/auth'
import AdminBar from '@/components/AdminBar.vue'
import PasswordModal from '@/components/PasswordModal.vue'
import TabBar from '@/components/TabBar.vue'
import BottomNav from '@/components/BottomNav.vue'
import BracketView from '@/components/bracket/BracketView.vue'
import ScoreEntry from '@/components/score/ScoreEntry.vue'
import ScoringRules from '@/components/rules/ScoringRules.vue'
import LeaderboardView from '@/components/leaderboard/LeaderboardView.vue'
import CsvImporter from '@/components/import/CsvImporter.vue'

const store = useBracketStore()
const auth = useAuthStore()

onMounted(() => {
  auth.initLocalDev()
  store.loadState()
})
</script>

<template>
  <div class="app">
    <div class="header">
      <h1>Wireless Vision — District March Madness</h1>
      <p class="header-subtitle desktop-only">
        43 Districts &nbsp;&middot;&nbsp; Ends April 5, 2026
        &nbsp;&middot;&nbsp; Seed #1 Michigan West receives bye into Round of 32
        &nbsp;&middot;&nbsp; Hover any team to see their path
        &nbsp;&middot;&nbsp; Click to advance
      </p>
      <p class="header-subtitle mobile-only">
        43 Districts &nbsp;&middot;&nbsp; Ends April 5
      </p>
    </div>

    <AdminBar />
    <div class="desktop-only">
      <TabBar />
    </div>
    <PasswordModal />

    <div class="content">
      <BracketView v-if="store.activeTab === 'bracket'" />
      <ScoreEntry v-if="store.activeTab === 'score'" />
      <ScoringRules v-if="store.activeTab === 'rules'" />
      <LeaderboardView v-if="store.activeTab === 'leaderboard'" />
      <CsvImporter v-if="store.activeTab === 'import'" />
    </div>

    <BottomNav />
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f5;
  color: #1a1a1a;
  -webkit-font-smoothing: antialiased;
}

.app {
  padding: 1.2rem;
  max-width: 1500px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 1.2rem;
}

.header h1 {
  font-size: 22px;
  font-weight: 500;
  color: #FA8D29;
}

.header-subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 3px;
}

.desktop-only {
  display: block;
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .app {
    padding: 0.8rem 0.6rem;
    padding-bottom: 80px;
  }

  .header h1 {
    font-size: 18px;
  }

  .header {
    margin-bottom: 0.8rem;
  }

  .desktop-only {
    display: none;
  }

  .mobile-only {
    display: block;
  }
}
</style>
