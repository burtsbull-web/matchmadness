<script setup lang="ts">
defineProps<{
  tabs: Array<{ key: string; label: string }>
  active: string
  accent?: string
}>()

const emit = defineEmits<{
  select: [key: string]
}>()
</script>

<template>
  <div class="sub-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="sub-tab"
      :class="{ active: active === tab.key }"
      :style="active === tab.key && accent ? { color: accent, borderBottomColor: accent } : undefined"
      @click="emit('select', tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.sub-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1rem;
  border-bottom: 2px solid #eee;
}

.sub-tab {
  flex-shrink: 0;
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #999;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.sub-tab.active {
  color: #FA8D29;
  border-bottom-color: #FA8D29;
}
</style>
