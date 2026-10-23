<template>
  <section>
    <div class="variables-toggle-header panel-section-toggle" @click="$emit('update:expanded', !expanded)">
      <span :key="expanded ? 'open' : 'closed'">
        <i :class="expanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
      </span>
      <span class="panel-section-title">Variables</span>
    </div>

    <transition name="fade">
      <div v-show="expanded">
        <div v-if="loading" class="loading-spinner">Loading variables...</div>
        <div class="variables-header">
          <button class="add-variable-btn" @click="$emit('create-variable')">
            <i class="fas fa-plus"></i> New Variable
          </button>
        </div>
        <div v-if="!loading" class="variables-list-container">
          <div
            v-for="variable in variables"
            :key="variable.id"
            class="draggable-item"
            draggable="true"
            @dragstart="$emit('drag-start', $event, variable)"
            @dragend="$emit('drag-end')"
          >
            <i class="fas fa-grip-vertical"></i>
            {{ variable.name }}
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup>
defineProps({
  expanded: {
    type: Boolean,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  variables: {
    type: Array,
    default: () => [],
  },
});

defineEmits([
  'update:expanded',
  'create-variable',
  'drag-start',
  'drag-end',
]);
</script>