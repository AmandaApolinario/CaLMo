<template>
  <div class="left-panel" :class="{ collapsed: !expanded }">
    <div class="panel-header" @click="$emit('update:expanded', !expanded)">
      <span :key="expanded ? 'open' : 'closed'">
        <i :class="expanded ? 'fas fa-chevron-left' : 'fas fa-chevron-right'"></i>
      </span>
      <span v-if="expanded">Tools</span>
    </div>

    <div v-if="expanded" class="panel-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  expanded: {
    type: Boolean,
    required: true,
  },
});

defineEmits(['update:expanded']);
</script>