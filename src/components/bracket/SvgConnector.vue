<script setup lang="ts">
defineProps<{
  d: string
  highlighted: boolean
  color: string
}>()
</script>

<template>
  <path
    :d="d"
    :stroke="highlighted ? color : 'rgba(128,128,128,0.18)'"
    :stroke-width="highlighted ? '2' : '1'"
    :stroke-dasharray="highlighted ? 'none' : '4 3'"
    fill="none"
    stroke-linecap="round"
  />
</template>
