<script setup lang="ts">
import { useBracketStore } from '@/stores/bracket'

const store = useBracketStore()

const statusLabel: Record<string, string> = {
  'active': 'WB Active',
  'lb-active': 'LB Active',
  'eliminated': 'Eliminated',
  'waiting': 'Waiting',
}

const statusClass: Record<string, string> = {
  'active': 's-active',
  'lb-active': 's-lb',
  'eliminated': 's-eliminated',
  'waiting': 's-waiting',
}
</script>

<template>
  <div class="lboard">
    <div
      v-for="(team, i) in store.leaderboard"
      :key="team.s"
      class="lbr"
    >
      <span class="lbrnk">{{ i + 1 }}</span>
      <span class="lbnm">
        <strong>#{{ team.s }}</strong> {{ team.n }}
        <span class="dm">{{ team.dm }}</span>
      </span>
      <span class="lbpts">{{ team.pts }} pts</span>
      <span class="lbst" :class="statusClass[team.status]">
        {{ statusLabel[team.status] }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.lboard {
  background: #fff;
  border: 0.5px solid #ddd;
  border-radius: 12px;
  overflow: hidden;
}

.lbr {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 0.5px solid #eee;
  font-size: 12px;
}

.lbr:last-child {
  border-bottom: none;
}

.lbrnk {
  font-weight: 500;
  color: #FA8D29;
  min-width: 26px;
}

.lbnm {
  flex: 1;
}

.dm {
  font-size: 11px;
  color: #888;
}

.lbpts {
  font-weight: 500;
  min-width: 46px;
  text-align: right;
}

.lbst {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  min-width: 68px;
  text-align: center;
}

.s-active { background: #00757320; color: #007573; }
.s-lb { background: #FA8D2920; color: #FA8D29; }
.s-eliminated { background: #E2535320; color: #A32D2D; }
.s-waiting { background: #f5f5f5; color: #888; }
</style>
