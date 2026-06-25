<template>
  <section>
    <div class="relationships-toggle-header panel-section-toggle" @click="$emit('update:expanded', !expanded)">
      <span :key="expanded ? 'open' : 'closed'">
        <i :class="expanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
      </span>
      <span class="panel-section-title">Relationships from other CLDs</span>
    </div>

    <transition name="fade">
      <div v-show="expanded">
        <div v-if="loading" class="loading-spinner">Loading relationships...</div>
        <div v-else-if="relationshipGroups.length === 0" class="empty-relationships-msg">
          No reusable relationships found.
        </div>
        <div v-else class="variables-list-container">
          <div v-for="group in relationshipGroups" :key="group.cld_id" class="relationship-group">
            <div class="relationship-group-header" @click="$emit('toggle-group', group.cld_id)">
              <span>
                <i :class="getGroupExpanded(group.cld_id) ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"></i>
              </span>
              <i class="fas fa-diagram-project"></i>
              {{ group.cld_name }}
              <span class="relationship-group-count">{{ group.relationships.length }}</span>
            </div>
            <template v-if="getGroupExpanded(group.cld_id)">
              <div
                v-for="relationship in group.relationships"
                :key="relationship.id"
                class="draggable-item relationship-item"
                draggable="true"
                @dragstart="$emit('drag-start', $event, relationship)"
                @dragend="$emit('drag-end')"
              >
                <i class="fas fa-code-branch relationship-arrow-icon"></i>
                <span
                  :class="['relationship-source-name', { 'on-canvas': isNodeOnCanvas(relationship.source_id) }]"
                >
                  {{ getVariableNameById(relationship.source_id) }}
                </span>
                <i class="fas fa-long-arrow-alt-right relationship-connector"></i>
                <span
                  :class="['relationship-target-name', { 'on-canvas': isNodeOnCanvas(relationship.target_id) }]"
                >
                  {{ getVariableNameById(relationship.target_id) }}
                </span>
                <span :class="['relationship-polarity', relationship.type === 'NEGATIVE' ? 'negative' : 'positive']">
                  {{ relationship.type === 'NEGATIVE' ? '-' : '+' }}
                </span>
                <span v-if="relationship.has_delay" class="relationship-delay" title="Has delay">||</span>
              </div>
            </template>
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
  relationshipGroups: {
    type: Array,
    default: () => [],
  },
  getGroupExpanded: {
    type: Function,
    required: true,
  },
  getVariableNameById: {
    type: Function,
    required: true,
  },
  isNodeOnCanvas: {
    type: Function,
    required: true,
  },
});

defineEmits([
  'update:expanded',
  'toggle-group',
  'drag-start',
  'drag-end',
]);
</script>
