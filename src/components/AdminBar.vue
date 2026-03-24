<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div v-if="auth.isAdmin" class="admin-bar">
    <span class="admin-label">Admin Mode</span>
    <button class="logout-btn" @click="auth.logout()">Logout</button>
  </div>
</template>

<style scoped>
.admin-bar {
  text-align: center;
  margin-bottom: 10px;
}

.admin-label {
  font-size: 11px;
  color: #007573;
  font-weight: 500;
}

.logout-btn {
  margin-left: 8px;
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
</style>
