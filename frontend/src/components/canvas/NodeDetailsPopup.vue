<template>
  <div
    v-if="selectedNodeInfo && (selectedNodeInfo.loops.length > 0 || selectedNodeInfo.archetypes.length > 0)"
    class="archetype-popup"
  >
    <div class="popup-overlay" @click="$emit('clear')"></div>

    <div class="popup-card">
      <div class="popup-header">
        <h3>Node Details</h3>
        <button @click="$emit('clear')" class="close-button">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="popup-body">
        <div class="node-name-section">
          <h4 class="section-title">
            <i class="fas fa-circle"></i> Node Name
          </h4>
          <div class="node-name">{{ selectedNodeInfo.nodeName }}</div>
        </div>

        <div class="node-name-section">
          <h4 class="section-title">
            <i class="fas fa-circle"></i> Variable
          </h4>
          <div class="node-name">{{ selectedNodeInfo.nodeName }}</div>
        </div>

        <div class="node-name-section subsystem-display-section">
          <h4 class="section-title">
            <i class="fas fa-layer-group"></i> Subsystems
          </h4>

          <div class="loop-container" v-if="activeNodeSubsystems.length > 0">
            <div
              v-for="subsystem in activeNodeSubsystems"
              :key="subsystem.id"
              class="loop-item"
              :style="{ borderLeftColor: subsystem.color }"
            >
              <div
                class="loop-badge"
                :style="{
                  backgroundColor: tint(subsystem.color, 0.18),
                  borderColor: tint(subsystem.color, 0.35)
                }"
              >
                {{ subsystem.hierarchy }}
              </div>

              <p v-if="subsystem.description" class="subsystem-card-desc">
                {{ subsystem.description }}
              </p>

              <div class="loop-variables" v-if="subsystem.allVariables.length > 0">
                <span
                  v-for="(variableName, index) in subsystem.allVariables"
                  :key="index"
                  class="variable-tag"
                  :style="{
                    backgroundColor: tint(subsystem.color, 0.12),
                    borderColor: tint(subsystem.color, 0.28)
                  }"
                >
                  {{ variableName }}
                </span>
              </div>
            </div>
          </div>

          <div v-else class="empty-subsystems-msg">
            <i class="fas fa-folder-open empty-subsystems-icon"></i>
            This variable does not belong to any subsystem.
          </div>

          <div class="subsystem-edit-wrapper">
            <details class="manage-subsystems-details">
              <summary>
                <i class="fas fa-edit"></i> Manage Subsystems
              </summary>
              <div class="custom-checkbox-list">
                <div v-if="availableSubsystems.length === 0" class="empty-list-msg">
                  No subsystem detected.
                </div>

                <label v-for="subsystem in availableSubsystems" :key="subsystem.id" class="custom-checkbox-item">
                  <input
                    type="checkbox"
                    :value="subsystem.id"
                    :checked="isSubsystemChecked(subsystem.id)"
                    @change="toggleSubsystem(subsystem.id, $event.target.checked)"
                  />
                  <span class="checkbox-box"></span>
                  <span class="checkbox-label">{{ subsystem.name }}</span>
                </label>
              </div>
            </details>
          </div>
        </div>

        <div v-if="selectedNodeInfo.loops.length > 0" class="loop-section">
          <h4 class="section-title">
            <i class="fas fa-circle-notch"></i> Feedback Loops
          </h4>

          <div class="loop-container">
            <div
              v-for="(loop, index) in selectedNodeInfo.loops"
              :key="'loop-' + index"
              class="loop-item"
            >
              <div
                class="loop-badge"
                :style="{
                  backgroundColor: tint(loop.color, 0.18),
                  borderColor: tint(loop.color, 0.35)
                }"
              >
                {{ loop.type }}
              </div>

              <div class="loop-variables">
                <span
                  v-for="(variable, index) in loop.variables"
                  :key="index"
                  class="variable-tag"
                  :style="{
                    backgroundColor: tint(loop.color, 0.12),
                    borderColor: tint(loop.color, 0.28)
                  }"
                >
                  {{ variable }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedNodeInfo.archetypes.length > 0" class="archetype-section">
          <h4 class="section-title">
            <i class="fas fa-shapes"></i> Archetypes
          </h4>

          <div class="archetype-container">
            <div
              v-for="archetype in selectedNodeInfo.archetypes"
              :key="'arch-' + archetype.id"
              class="archetype-item"
              :style="{ borderLeftColor: archetype.color }"
            >
              <div class="arch-col">
                <span class="arch-dot" :style="{ backgroundColor: archetype.color }"></span>
              </div>

              <div class="arch-content">
                <div class="archetype-header">
                  <i class="fas" :class="getArchetypeIcon(archetype.type)"></i>
                  <span class="archetype-name">{{ formatArchetypeName(archetype.type) }}</span>
                </div>

                <div class="archetype-variables" v-if="archetype.variables?.length">
                  <span
                    v-for="(variable, index) in archetype.variables"
                    :key="index"
                    class="variable-chip"
                    :style="{ borderColor: archetype.color }"
                  >
                    {{ variable }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  selectedNodeInfo: {
    type: Object,
    default: null,
  },
  activeNodeSubsystems: {
    type: Array,
    default: () => [],
  },
  availableSubsystems: {
    type: Array,
    default: () => [],
  },
  tint: {
    type: Function,
    required: true,
  },
  getArchetypeIcon: {
    type: Function,
    required: true,
  },
  formatArchetypeName: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['clear', 'set-subsystem-ids']);

const currentSubsystemIds = () => props.selectedNodeInfo?.subsystemIds || [];

const isSubsystemChecked = (subsystemId) => currentSubsystemIds().includes(subsystemId);

const toggleSubsystem = (subsystemId, checked) => {
  const nextIds = new Set(currentSubsystemIds());

  if (checked) {
    nextIds.add(subsystemId);
  } else {
    nextIds.delete(subsystemId);
  }

  emit('set-subsystem-ids', Array.from(nextIds));
};
</script>