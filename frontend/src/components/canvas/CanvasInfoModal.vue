<template>
  <div v-if="visible" class="archetype-popup">
    <div class="popup-overlay" @click="$emit('close')"></div>
    <div class="popup-card">
      <div class="popup-header">
        <h3>
          <i class="fas fa-info-circle info-title-icon"></i>
          CaLMo Canvas Info
        </h3>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </div>

      <div class="popup-body info-popup-body">
        <div class="loop-section info-section-spacing">
          <h4 class="section-title"><i class="fas fa-tools"></i> Toolbar Controls</h4>
          <div class="controls-grid">
            <div class="control-item"><i class="fas fa-hand-paper"></i> <span><strong class="toolbar-info">Pan:</strong> Move view.</span></div>
            <div class="control-item"><i class="fas fa-plus-circle"></i> <span><strong class="toolbar-info">Add Var:</strong> New variable.</span></div>
            <div class="control-item"><i class="fa fa-compress"></i> <span><strong class="toolbar-info">Fit:</strong> Center diagram.</span></div>
            <div class="control-item">
              <i class="fas fa-share-alt"></i>
              <span><strong class="toolbar-info">Share:</strong> Creates a shareable link. Invited users can add new variables to this diagram.</span>
            </div>
            <div class="control-item">
              <i class="fas fa-mouse-pointer"></i>
              <span><strong class="toolbar-info">Select:</strong> <span> Standard mode. Move view or variables, and select items. Double-click a variable to see its loops and archetypes.</span></span>
            </div>
            <div class="control-item">
              <i class="fas fa-plus"></i>
              <span><strong class="toolbar-info">Add Positive (+):</strong> Creates a positive relationship. Click the origin variable and drag the arrow to the destination.</span>
            </div>
            <div class="control-item">
              <i class="fas fa-minus"></i>
              <span><strong class="toolbar-info">Add Negative (-):</strong> Creates a negative relationship. Click the origin variable and drag the arrow to the destination.</span>
            </div>
            <div class="control-item">
              <i class="fas fa-trash-alt"></i>
              <span><strong class="toolbar-info">Delete:</strong> Deletes the currently selected variable or relationship.</span>
            </div>
            <div class="control-item">
              <i class="fas fa-undo"></i>
              <span><strong class="toolbar-info">Undo:</strong> Reverts your last action on the canvas.</span>
            </div>
            <div class="control-item">
              <i class="fas fa-search-plus"></i>
              <span><strong class="toolbar-info">Zoom In:</strong> Increases the zoom level. You can also use the mouse scroll wheel.</span>
            </div>
            <div class="control-item">
              <i class="fas fa-search-minus"></i>
              <span><strong class="toolbar-info">Zoom Out:</strong> Decreases the zoom level. You can also use the mouse scroll wheel.</span>
            </div>
          </div>
        </div>

        <div class="loop-section info-section-spacing">
          <h4 class="section-title"><i class="fas fa-recycle"></i> Reuse</h4>
          <div class="controls-grid">
            <div class="control-item">
              <i class="fas fa-code-branch"></i>
              <span><strong class="toolbar-info">Reusable relationships:</strong> Existing relationships from other CLDs appear grouped by diagram and can be dragged into this canvas with their polarity and delay information.</span>
            </div>
          </div>
        </div>

        <div class="loop-section info-section-spacing">
          <h4 class="section-title"><i class="fas fa-layer-group"></i> Subsystems</h4>
          <div class="controls-grid">
            <div class="control-item">
              <i class="fas fa-layer-group"></i>
              <span><strong class="toolbar-info">Subsystems:</strong> Use subsystems to group variables, control visibility, and organize nested parts of a model. Double-click a subsystem name to edit its name and description.</span>
            </div>
            <div class="control-item">
              <i class="fas fa-plus-square"></i>
              <span><strong class="toolbar-info">Add variable to subsystem:</strong> Select a variable on the canvas, open its details, expand Manage Subsystems, and check the subsystem where the variable should belong.</span>
            </div>
            <div class="control-item">
              <i class="fas fa-object-group"></i>
              <span><strong class="toolbar-info">Show subsystem borders:</strong> Use the subsystem visualization button in the Subsystem panel to show or hide the subsystem areas directly on the canvas.</span>
            </div>
          </div>
        </div>

        <div class="archetype-section info-section-spacing">
          <h4 class="section-title"><i class="fas fa-shapes"></i> Archetypes detected by CaLMo</h4>
          <div class="static-archetypes-grid">
            <ul class="static-archetypes-list">
              <li class="static-arch-card">Fixes that Fail</li>
              <li class="static-arch-card">Shifting the Burden</li>
              <li class="static-arch-card">Limits to Success</li>
            </ul>
            <ul class="static-archetypes-list">
              <li class="static-arch-card">Growth & Underinvestment</li>
              <li class="static-arch-card">Escalation</li>
              <li class="static-arch-card">Tragedy of the Commons</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['close']);
</script>
