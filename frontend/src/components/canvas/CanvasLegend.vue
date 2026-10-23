<template>
  <div v-if="items.length" class="cld-legend-canvas">
    <div class="legend-title">Legend — Archetypes</div>
    <div class="legend-grid">
      <div v-for="item in items" :key="item.id" class="legend-item">
        <span class="legend-swatch" :style="{ backgroundColor: item.color }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});
</script>