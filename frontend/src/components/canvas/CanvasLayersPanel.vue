<template>
  <div class="layers-panel" :class="{ collapsed: !expanded }">
    <div class="panel-header" @click="$emit('update:expanded', !expanded)">
      <span class="panel-title-strong">Subsystem</span>
      <i :class="expanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"></i>
    </div>

    <div v-if="expanded" class="panel-content">
      <div class="layers-header" :key="'border-btn-' + showSubsystemBorders">
        <button
          class="add-layer-btn subsystem-borders-button"
          @click="$emit('toggle-subsystem-borders')"
          :title="showSubsystemBorders ? 'Hide Visual Borders' : 'Show Visual Borders'"
          :style="{ backgroundColor: !showSubsystemBorders ? '#f1f5f9' : '#1177bb' }"
        >
          <i
            :class="showSubsystemBorders ? 'fas fa-object-ungroup' : 'fas fa-object-group'"
            :style="{ color: showSubsystemBorders ? '#ffffff' : '#000000' }"
          ></i>
        </button>

        <button class="add-layer-btn" @click="$emit('create-subsystem', null)" title="Create Subsystem">
          <i class="fas fa-plus"></i>
        </button>
      </div>

      <div class="layers-list">
        <div v-for="{ layer, depth } in flattenedLayers" :key="layer.id + '_' + layer.visible">
          <div
            class="layer-item"
            :class="{
              active: selectedLayerId === layer.id,
              'global-layer': layer.id === 'global'
            }"
            :style="{
              marginLeft: (depth * 15) + 'px',
              borderLeft: layer.id !== 'global' ? `4px solid ${layer.color}` : 'none'
            }"
          >
            <div class="layer-content" @click="$emit('select-layer', layer.id)">
              <button
                v-if="layer.subsystems && layer.subsystems.length > 0"
                class="expand-btn"
                @click.stop="$emit('toggle-layer-expanded', layer.id)"
              >
                <i :class="layer.expanded ? 'fas fa-caret-down' : 'fas fa-caret-right'"></i>
              </button>
              <div v-else class="expand-placeholder"></div>

              <button class="layer-visibility-btn" @click.stop="$emit('toggle-layer-visibility', layer.id)">
                <i :class="{ fas: true, 'fa-eye': layer.visible, 'fa-eye-slash': !layer.visible }"></i>
              </button>

              <span
                class="layer-name"
                :title="layer.id !== 'global' ? 'Double-click to edit name and description' : ''"
                @dblclick.stop="layer.id !== 'global' && $emit('edit-subsystem', layer.id)"
              >
                {{ layer.name }}
              </span>
            </div>

            <div class="layer-controls" v-if="layer.id !== 'global'">
              <button
                class="add-sublayer-btn"
                @click.stop="$emit('create-subsystem', layer.id)"
                title="Add Subsystem"
              >
                <i class="fas fa-plus"></i>
              </button>
              <button
                class="delete-layer-btn"
                @click.stop="$emit('delete-layer', layer.id)"
                title="Delete"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  expanded: {
    type: Boolean,
    required: true,
  },
  flattenedLayers: {
    type: Array,
    default: () => [],
  },
  selectedLayerId: {
    type: String,
    required: true,
  },
  showSubsystemBorders: {
    type: Boolean,
    default: false,
  },
});

defineEmits([
  'update:expanded',
  'toggle-subsystem-borders',
  'create-subsystem',
  'select-layer',
  'toggle-layer-expanded',
  'toggle-layer-visibility',
  'edit-subsystem',
  'delete-layer',
]);
</script>
