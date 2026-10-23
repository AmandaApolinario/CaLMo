<template>
  <div class="top-toolbar">
    <div class="toolbar-left">
      <button class="tool-btn back-btn" @click="$emit('go-back')" title="Back">
        <i class="fas fa-arrow-left"></i>
      </button>
      <div class="toolbar-divider"></div>
      <input
        type="text"
        :value="diagramName"
        @input="$emit('update:diagramName', $event.target.value)"
        @blur="$emit('save-diagram-name')"
        @keyup.enter="$event.target.blur()"
        class="diagram-title-input"
        placeholder="Nome do Diagrama"
      />
    </div>

    <div class="toolbar-center">
      <button
        class="tool-btn"
        :class="{ active: interactionMode === 'pan' }"
        @click="$emit('set-interaction-mode', 'pan')"
        title="Pan"
      >
        <i class="fas fa-hand-paper"></i>
      </button>
      <button
        class="tool-btn"
        :class="{ active: interactionMode === 'select' }"
        @click="$emit('set-interaction-mode', 'select')"
        title="Select"
      >
        <i class="fas fa-mouse-pointer"></i>
      </button>
      <div class="toolbar-divider"></div>
      <button
        class="tool-btn"
        :class="{ active: interactionMode === 'addPositiveEdge' }"
        @click="$emit('set-interaction-mode', 'addPositiveEdge')"
        title="Add Positive Connection"
      >
        <i class="fas fa-plus"></i>
      </button>

      <button
        class="tool-btn"
        :class="{ active: interactionMode === 'addNegativeEdge' }"
        @click="$emit('set-interaction-mode', 'addNegativeEdge')"
        title="Add Negative Connection"
      >
        <i class="fas fa-minus"></i>
      </button>

      <button
        class="tool-btn"
        :class="{ active: isDelayActive }"
        @click="$emit('toggle-delay')"
        title="Toggle Delay"
      >
        <strong>||</strong>
      </button>

      <div class="toolbar-divider"></div>

      <button
        class="tool-btn"
        :disabled="!hasSelection"
        :style="{ opacity: hasSelection ? '1' : '0.4', color: hasSelection ? '#f48771' : '' }"
        @click="$emit('delete-selected')"
        title="Delete Selected (Del)"
      >
        <i class="fas fa-trash"></i>
      </button>

      <button class="tool-btn" @click="$emit('undo')" :disabled="undoCount === 0" title="Undo">
        <i class="fas fa-undo"></i>
      </button>

      <div class="toolbar-divider"></div>
      <button class="tool-btn" @click="$emit('zoom-in')" title="Zoom In">
        <i class="fas fa-search-plus"></i>
      </button>
      <button class="tool-btn" @click="$emit('zoom-out')" title="Zoom Out">
        <i class="fas fa-search-minus"></i>
      </button>
      <button class="tool-btn" @click="$emit('fit-view')" title="Fit View">
        <i class="fa fa-compress"></i>
      </button>
    </div>

    <div class="toolbar-right">
      <button @click="$emit('open-info')" class="btn-history" title="Diagram Information">
        <i class="fas fa-info-circle"></i> Info
      </button>
      <button
        v-if="isOwner"
        class="tool-btn primary share-button"
        @click="$emit('open-share')"
        title="Share Diagram"
      >
        <i class="fas fa-share-alt"></i> Share
      </button>
      <button @click="$emit('open-history')" class="btn-history">
        <i class="fa-solid fa-clock-rotate-left"></i> CLD History
      </button>
      <button @click="$emit('export-png')" class="tool-btn primary" title="Exportar as PNG">
        <i class="fas fa-image"></i> Export as PNG
      </button>
      <button class="tool-btn" @click="$emit('open-settings')" title="Settings">
        <i class="fas fa-cog"></i>
      </button>
      <button class="tool-btn primary" @click="$emit('save')" title="Save">
        <i class="fas fa-save"></i> Save
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  diagramName: {
    type: String,
    default: '',
  },
  interactionMode: {
    type: String,
    required: true,
  },
  isDelayActive: {
    type: Boolean,
    default: false,
  },
  hasSelection: {
    type: Boolean,
    default: false,
  },
  undoCount: {
    type: Number,
    default: 0,
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
});

defineEmits([
  'update:diagramName',
  'save-diagram-name',
  'go-back',
  'set-interaction-mode',
  'toggle-delay',
  'delete-selected',
  'undo',
  'zoom-in',
  'zoom-out',
  'fit-view',
  'open-info',
  'open-share',
  'open-history',
  'export-png',
  'open-settings',
  'save',
]);
</script>