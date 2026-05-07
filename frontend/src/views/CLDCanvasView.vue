<template>
    <div class="canvas-app">
        <div class="top-toolbar">
            <div class="toolbar-left">
                <button class="tool-btn back-btn" @click="goBack" title="Back">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="toolbar-divider"></div>
                <input
                    type="text"
                    v-model="diagramNameRef"
                    @blur="saveDiagramName"
                    @keyup.enter="$event.target.blur()"
                    class="diagram-title-input"
                    placeholder="Nome do Diagrama"
                />
            </div>

            <div class="toolbar-center">
              <button
                  class="tool-btn"
                  :class="{ 'active': interactionMode === 'pan' }"
                  @click="setInteractionMode('pan')"
                  title="Pan"
              >
                  <i class="fas fa-hand-paper"></i>
              </button>
              <button
                  class="tool-btn"
                  :class="{ 'active': interactionMode === 'select' }"
                  @click="setInteractionMode('select')"
                  title="Select"
              >
                  <i class="fas fa-mouse-pointer"></i>
              </button>
              <div class="toolbar-divider"></div>
              <button
                  class="tool-btn"
                  :class="{ 'active': interactionMode === 'addPositiveEdge' }"
                  @click="setInteractionMode('addPositiveEdge')"
                  title="Add Positive Connection"
              >
                  <i class="fas fa-plus"></i>
              </button>

              <button
                  class="tool-btn"
                  :class="{ 'active': interactionMode === 'addNegativeEdge' }"
                  @click="setInteractionMode('addNegativeEdge')"
                  title="Add Negative Connection"
              >
                  <i class="fas fa-minus"></i>
              </button>

              <button
                  class="tool-btn"
                  :disabled="!hasSelection"
                  :style="{ opacity: hasSelection ? '1' : '0.4', color: hasSelection ? '#f48771' : '' }"
                  @click="handleDelete"
                  title="Excluir Selecionado (Del)"
              >
                  <i class="fas fa-trash"></i>
              </button>

              <button class="tool-btn" @click="performUndo" :disabled="undoStack.length === 0" title="Undo">
                <i class="fas fa-undo"></i>
              </button>

              <div class="toolbar-divider"></div>
              <button class="tool-btn" @click="zoomIn" title="Zoom In">
                  <i class="fas fa-search-plus"></i>
              </button>
              <button class="tool-btn" @click="zoomOut" title="Zoom Out">
                  <i class="fas fa-search-minus"></i>
              </button>
              <button class="tool-btn" @click="fitView" title="Fit View">
                  <i class="fas fa-compress"></i>
              </button>
          </div>

            <div class="toolbar-right">
                <button @click="openInfoModal" class="btn-history" title="Informações do Diagrama">
                    <i class="fas fa-info-circle"></i> Info
                </button>
                <button class="tool-btn primary" v-if="isOwner" style="background-color: #2b7042; border-color: #3b8c56;" @click="openShareModal" title="Share Diagram">
                  <i class="fas fa-share-alt"></i> Share
                </button>
                <button @click="openHistoryModal" class="btn-history">
                    <i class="fa-solid fa-clock-rotate-left"></i> CLD History
                </button>
                <button @click="handleExportPNG" class="tool-btn primary" title="Exportar as PNG">
                  <i class="fas fa-image"></i> Export as PNG
                </button>
                <button class="tool-btn primary" @click="saveDiagram" title="Save">
                    <i class="fas fa-save"></i> Save
                </button>
            </div>
        </div>

        <transition name="toast-fade">
            <div v-if="error" class="toast-error">
                <i class="fas fa-exclamation-circle"></i> {{ error }}
            </div>
        </transition>

        <div class="canvas-main">
            <div class="left-panel" :class="{ collapsed: !leftPanelExpanded }">
                <div class="panel-header" @click="leftPanelExpanded = !leftPanelExpanded">
                    <span :key="leftPanelExpanded ? 'open' : 'closed'">
                        <i :class="leftPanelExpanded ? 'fas fa-chevron-left' : 'fas fa-chevron-right'"></i>
                    </span>
                    <span v-if="leftPanelExpanded">Tools</span>
                </div>

                <div v-if="leftPanelExpanded" class="panel-content">


                    <div class="variables-toggle-header" @click="variablesPanelExpanded = !variablesPanelExpanded" style="cursor:pointer;display:flex;align-items:center;gap:8px;margin:8px 0;">
                        <span :key="variablesPanelExpanded ? 'open' : 'closed'">
                            <i :class="variablesPanelExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </span>
                        <span style="font-weight:600;">Variables</span>
                    </div>

                    <transition name="fade">
                        <div v-show="variablesPanelExpanded">
                            <div v-if="loading" class="loading-spinner">Loading variables...</div>
                            <div class="variables-header">
                              <button class="add-variable-btn" @click="openCreateModal">
                                  <i class="fas fa-plus"></i> New Variable
                              </button>
                            </div>
                            <div v-if="!loading" class="variables-list-container">
                                <div v-for="variable in variables" :key="variable.id" class="draggable-item" draggable="true" @dragstart="dragStart($event, variable)" @dragend="dragEnd">
                                    <i class="fas fa-grip-vertical"></i>
                                    {{ variable.name }}
                                </div>
                            </div>
                        </div>
                    </transition>
                </div>
            </div>

            <div class="canvas-area" @drop="onDrop" @dragover.prevent>
                <div v-if="isLoadingDiagram" class="canvas-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading diagram...</p>
                </div>
                <div ref="networkContainer" class="network-canvas"></div>

                <div v-if="legendArchetypes.length" class="cld-legend-canvas">
                    <div class="legend-title">Legend — Archetypes</div>
                    <div class="legend-grid">
                        <div v-for="item in legendArchetypes" :key="item.id" class="legend-item">
                            <span class="legend-swatch" :style="{ backgroundColor: item.color }"></span>
                            <span class="legend-label">{{ item.label }}</span>
                        </div>
                    </div>
                </div>
            </div>

<!--            <div class="layers-panel" :class="{ collapsed: !layersPanelExpanded }">-->
<!--                <div class="panel-header" @click="layersPanelExpanded = !layersPanelExpanded">-->
<!--                    <span v-if="layersPanelExpanded">Layers</span>-->
<!--                    <i :class="layersPanelExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"></i>-->
<!--                </div>-->

<!--                <div v-if="layersPanelExpanded" class="panel-content">-->
<!--                    <div class="layers-header">-->
<!--                        <button class="add-layer-btn" @click="addLayer" title="Add Layer">-->
<!--                            <i class="fas fa-plus"></i>-->
<!--                        </button>-->
<!--                    </div>-->

<!--                    <div class="layers-list">-->
<!--                        <div-->
<!--                            class="layer-item"-->
<!--                            :class="{ active: selectedLayerId === 'global' }"-->
<!--                            @click="selectLayer('global')"-->
<!--                        >-->
<!--                            <div class="layer-content">-->
<!--                                <button class="layer-visibility-btn" @click.stop="toggleLayerVisibility('global')">-->
<!--                                    <i :class="isLayerVisible('global') ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>-->
<!--                                </button>-->
<!--                                <span class="layer-name">Global</span>-->
<!--                                <span class="layer-shape-count">{{ getLayerShapeCount('global') }}</span>-->
<!--                            </div>-->
<!--                        </div>-->

<!--                        <div v-for="layer in layers.filter(l => l.id !== 'global')" :key="layer.id">-->
<!--                            <div-->
<!--                                class="layer-item"-->
<!--                                :class="{ active: selectedLayerId === layer.id }"-->
<!--                            >-->
<!--                                <div class="layer-content" @click="selectLayer(layer.id)">-->
<!--                                    <button class="expand-btn" @click.stop="toggleLayerExpanded(layer.id)" v-if="layer.sublayers.length > 0">-->
<!--                                        <i :class="layer.expanded ? 'fas fa-caret-down' : 'fas fa-caret-right'"></i>-->
<!--                                    </button>-->
<!--                                    <div v-else class="expand-placeholder"></div>-->

<!--                                    <button class="layer-visibility-btn" @click.stop="toggleLayerVisibility(layer.id)">-->
<!--                                        <i :class="layer.visible ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>-->
<!--                                    </button>-->

<!--                                    <input-->
<!--                                        v-if="editingLayerId === layer.id"-->
<!--                                        class="layer-name-input"-->
<!--                                        v-model="layer.name"-->
<!--                                        @blur="editingLayerId = null"-->
<!--                                        @keyup.enter="editingLayerId = null"-->
<!--                                        @click.stop-->
<!--                                    />-->
<!--                                    <span v-else class="layer-name" @dblclick.stop="editingLayerId = layer.id">-->
<!--                                        {{ layer.name }}-->
<!--                                    </span>-->

<!--                                    <span class="layer-shape-count">{{ getLayerShapeCount(layer.id) }}</span>-->
<!--                                </div>-->

<!--                                <div class="layer-controls">-->
<!--                                    <button class="add-sublayer-btn" @click.stop="addSubLayer(layer.id)" title="Add Sublayer">-->
<!--                                        <i class="fas fa-plus"></i>-->
<!--                                    </button>-->
<!--                                    <button class="delete-layer-btn" @click.stop="deleteLayer(layer.id)" title="Delete Layer">-->
<!--                                        <i class="fas fa-times"></i>-->
<!--                                    </button>-->
<!--                                </div>-->
<!--                            </div>-->

<!--                            <div v-if="layer.expanded" v-for="sublayer in layer.sublayers" :key="sublayer.id">-->
<!--                                <div-->
<!--                                    class="sublayer-item"-->
<!--                                    :class="{ active: selectedLayerId === sublayer.id }"-->
<!--                                >-->
<!--                                    <div class="sublayer-content" @click="selectLayer(sublayer.id)">-->
<!--                                        <span class="sublayer-indent">└</span>-->
<!--                                        <button class="layer-visibility-btn" @click.stop="toggleLayerVisibility(sublayer.id)">-->
<!--                                            <i :class="sublayer.visible ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>-->
<!--                                        </button>-->

<!--                                        <input-->
<!--                                            v-if="editingLayerId === sublayer.id"-->
<!--                                            class="layer-name-input"-->
<!--                                            v-model="sublayer.name"-->
<!--                                            @blur="editingLayerId = null"-->
<!--                                            @keyup.enter="editingLayerId = null"-->
<!--                                            @click.stop-->
<!--                                        />-->
<!--                                        <span v-else class="layer-name" @dblclick.stop="editingLayerId = sublayer.id">-->
<!--                                            {{ sublayer.name }}-->
<!--                                        </span>-->

<!--                                        <span class="layer-shape-count">{{ getLayerShapeCount(sublayer.id) }}</span>-->
<!--                                    </div>-->

<!--                                    <button class="delete-layer-btn" @click.stop="deleteSubLayer(layer.id, sublayer.id)">-->
<!--                                        <i class="fas fa-times"></i>-->
<!--                                    </button>-->
<!--                                </div>-->
<!--                            </div>-->
<!--                        </div>-->
<!--                    </div>-->
<!--                </div>-->
<!--            </div>-->
        </div>

        <div
            v-if="selectedNodeInfo && (selectedNodeInfo.loops.length > 0 || selectedNodeInfo.archetypes.length > 0)"
            class="archetype-popup"
        >
            <div class="popup-overlay" @click="clearNodeSelection"></div>

      <div class="popup-card">
        <div class="popup-header">
          <h3>Node Details</h3>
          <button @click="clearNodeSelection" class="close-button">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="popup-body">
          <!-- Node name (simple header) -->
          <div class="node-name-section">
            <h4 class="section-title">
              <i class="fas fa-circle"></i> Node Name
            </h4>
            <div class="node-name">{{ selectedNodeInfo.nodeName }}</div>
          </div>

          <!-- Feedback Loops -->
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
                <!-- light background from loop.color + dark text -->
                <div
                  class="loop-badge"
                  :style="{
                    backgroundColor: tint(loop.color, 0.18),
                    color: '#0F172A',
                    borderColor: tint(loop.color, 0.35)
                  }"
                >
                  {{ loop.type }}
                </div>

                <!-- chips (no commas) -->
                <div class="loop-variables">
                  <span
                    v-for="(variable, idx) in loop.variables"
                    :key="idx"
                    class="variable-tag"
                    :style="{
                      backgroundColor: tint(loop.color, 0.12),
                      color: '#0F172A',
                      borderColor: tint(loop.color, 0.28)
                    }"
                  >
                    {{ variable }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Archetypes -->
          <div v-if="selectedNodeInfo.archetypes.length > 0" class="archetype-section">
            <h4 class="section-title">
              <i class="fas fa-shapes"></i> Archetypes
            </h4>

            <div class="archetype-container">
              <div
                v-for="arch in selectedNodeInfo.archetypes"
                :key="'arch-' + arch.id"
                class="archetype-item"
                :style="{ borderLeftColor: arch.color }"
              >
                <!-- coluna fixa só para o dot (não encolhe) -->
                <div class="arch-col">
                  <span class="arch-dot" :style="{ backgroundColor: arch.color }"></span>
                </div>

                <!-- conteúdo flexível -->
                <div class="arch-content">
                  <div class="archetype-header">
                    <i class="fas" :class="getArchetypeIcon(arch.type)"></i>
                    <span class="archetype-name">{{ formatArchetypeName(arch.type) }}</span>
                  </div>

                  <div class="archetype-variables" v-if="arch.variables?.length">
                    <span
                      v-for="(v, i) in arch.variables"
                      :key="i"
                      class="variable-chip"
                      :style="{ borderColor: arch.color }"
                    >
                      {{ v }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
        </div>

        <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
            <div class="modal-content" @click.stop>
                <h3>Create New Variable</h3>
                <form @submit.prevent="handleCreateVariable">
                    <div class="form-group">
                        <label>Name:</label>
                        <input v-model="newVariable.name" type="text" required />
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea v-model="newVariable.description" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" @click="closeCreateModal" class="btn-cancel">Cancel</button>
                        <button type="submit" :disabled="creatingVariable" class="btn-create">
                            {{ creatingVariable ? 'Creating...' : 'Create' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <div v-if="showShareModal" class="modal-overlay" @click="closeShareModal">
            <div class="modal-content" @click.stop>
                <h3><i class="fas fa-share-alt"></i> Share Diagram</h3>

                <div v-if="isGeneratingLink" class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i> Processing...
                </div>

                <div v-else-if="currentShareToken" class="share-container">
                    <p style="color: #ccc; font-size: 13px; margin-bottom: 12px;">
                        Anyone with this link and an active account can access this diagram in real-time.
                    </p>
                    <div class="share-link-box">
                        <input type="text" readonly :value="getShareableUrl" />
                        <button @click="copyShareLink" class="btn-copy">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>

                    <div class="form-actions" style="margin-top: 24px; justify-content: space-between;">
                        <button type="button" @click="revokeShareLink" class="btn-cancel" style="color: #f48771;">
                            Revoke Link
                        </button>
                        <button type="button" @click="closeShareModal" class="btn-create">Done</button>
                    </div>
                </div>

                <div v-else class="share-container">
                    <p style="color: #ccc; font-size: 13px; margin-bottom: 12px;">
                        The share link for this diagram has been revoked. Generate a new one to enable collaboration again.
                    </p>
                    <div class="form-actions">
                        <button type="button" @click="closeShareModal" class="btn-cancel">Close</button>
                        <button type="button" @click="openShareModal" class="btn-create">Generate New Link</button>
                    </div>
                </div>
            </div>
      </div>

      <div v-if="isHistoryModalOpen" class="history-modal-overlay" @click.self="closeHistoryModal">
          <div class="history-modal-content">
              <div class="history-header">
                  <h2>CLD History</h2>
                  <button @click="closeHistoryModal" class="close-btn">✖</button>
              </div>

              <div v-if="isLoadingHistory" class="history-loading">
                  Loading CLD History...
              </div>

              <div v-else-if="historyList.length === 0" class="history-empty">
                  No changes saved yet.
              </div>

              <ul v-else class="history-list">
                  <li v-for="item in historyList" :key="item.id" class="history-item">
                      <div class="history-meta">
                          <strong>{{ item.user_name }}</strong> saved on
                          <span>{{ new Date(item.timestamp).toLocaleString() }}</span>
                      </div>
                      <div class="history-summary" v-html="formatHistoryText(item.action_summary)"></div>
                  </li>
              </ul>
          </div>
      </div>
      <div v-if="isInfoModalOpen" class="archetype-popup">
          <div class="popup-overlay" @click="closeInfoModal"></div>
          <div class="popup-card"> <div class="popup-header">
                  <h3><i class="fas fa-info-circle" style="color: #3498db; margin-right: 8px;"></i>CaLMo Canvas Info</h3>
                  <button class="close-button" @click="closeInfoModal">&times;</button>
              </div>

              <div class="popup-body" style="max-height: 70vh; overflow-y: auto;">
                  <div class="loop-section" style="margin-top: 20px;">
                      <h4 class="section-title"><i class="fas fa-tools"></i> Toolbar Controls</h4>
                      <div class="controls-grid">
                          <div class="control-item"><i class="fas fa-hand-paper"></i> <span><strong class="toolbar-info">Pan:</strong> Move view.</span></div>
                          <div class="control-item"><i class="fas fa-plus-circle"></i> <span><strong class="toolbar-info">Add Var:</strong> New variable.</span></div>
                          <div class="control-item"><i class="fas compress"></i> <span><strong class="toolbar-info">Fit:</strong> Center diagram.</span></div>
                          <div class="control-item">
                              <i class="fas fa-share-alt"></i>
                              <span><strong class="toolbar-info">Share:</strong> Creates a shareable link. Invited users can add new variables to this diagram.</span>
                          </div>
                          <div class="control-item">
                              <i class="fas fa-mouse-pointer"></i>
                            <span><strong class="toolbar-info">Select:</strong> <span> Standard mode. Move the view or variables, and select items to delete. Double-click a variable to see its loops and archetypes.</span></span>
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

                  <div class="archetype-section" style="margin-top: 20px;">
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
    </div>
</template>

<script setup>
import {onMounted, ref, nextTick, watch, onUnmounted, onBeforeUnmount} from 'vue';
import {useRouter, useRoute, onBeforeRouteLeave} from 'vue-router';
import { useCLDCanvasViewModel } from '@/viewmodels/CLDCanvasViewModel';
import { useCLDDiagramViewModel } from '@/viewmodels/CLDDiagramViewModel';

const router = useRouter();
const route = useRoute();
const isOwner = ref(false);

// ViewModels
const {
    variables,
    loading,
    error,
    showCreateModal,
    creatingVariable,
    diagram,
    nodes,
    edges,
    isLoadingDiagram,
    newVariable,
    fetchVariables,
    fetchDiagram,
    createVariable,
    openCreateModal,
    closeCreateModal,
    addNodeToCLD,
    addConnection,
    persistDiagram,
    removeNodeFromDiagram,
    removeEdgeFromDiagram,
    initCollabMode,
    stopCollabMode,
    performUndo,
    undoStack,
    showShareModal,
    currentShareToken,
    isGeneratingLink,
    getShareableUrl,
    openShareModal,
    closeShareModal,
    revokeShareLink,
    copyShareLink,
    provideStateCallback,
    applyStateCallback,
    remoteNodeMovedCallback,
    emitNodeMovement,
    fetchSharedDiagram,
    remoteNodeAddedCallback,
    remoteNodeRemovedCallback,
    remoteEdgeAddedCallback,
    remoteEdgeRemovedCallback,
    clientId,
    diagramNameRef,
    saveDiagramName,
    hasUnsavedChanges,
    isHistoryModalOpen,
    openHistoryModal,
    closeHistoryModal,
    historyList,
    isLoadingHistory,
    formatHistoryText,
    clearError,
    isInfoModalOpen,
    openInfoModal,
    closeInfoModal,
} = useCLDCanvasViewModel();

const {
    networkContainer,
    network,
    selectedNodeInfo,
    legendArchetypes,
    createDiagram,
    clearNodeSelection,
    zoomIn,
    zoomOut,
    redistributeNodes,
    getArchetypeIcon,
    formatArchetypeName,
    saveNodePositions,
    interactionMode,
    setInteractionMode,
    fitView,
    edgeAddedCallback,
    addEdgeToCanvas,
    hasSelection,
    deleteSelectedElements,
    getCurrentPositions,
    updateNodePosition,
    nodeDraggedCallback,
    addNodeToCanvas,
    removeNodeFromCanvas,
    removeEdgeFromCanvas,
    exportToPNG
} = useCLDDiagramViewModel();

// UI State
const leftPanelExpanded = ref(true);
const layersPanelExpanded = ref(true);
const variablesPanelExpanded = ref(true);

provideStateCallback.value = getCurrentPositions;

applyStateCallback.value = (positions) => {
    if(diagram.value) {
        saveNodePositions(diagram.value.id, positions);
    }
    if (network.value) {
        network.value.setOptions({ physics: { enabled: false } });
        network.value.stopSimulation();
        Object.entries(positions).forEach(([id, pos]) => {
            updateNodePosition(id, pos.x, pos.y);
        });
        setTimeout(() => {
            network.value.fit({ animation: false });
        }, 100);
    }
};

remoteNodeMovedCallback.value = updateNodePosition;

nodeDraggedCallback.value = (nodeId, position) => {
    emitNodeMovement(nodeId, position);
};


remoteNodeAddedCallback.value = addNodeToCanvas;
remoteNodeRemovedCallback.value = removeNodeFromCanvas;
remoteEdgeAddedCallback.value = addEdgeToCanvas;
remoteEdgeRemovedCallback.value = removeEdgeFromCanvas;

// Layers System
const layers = ref([
    {
        id: 'global',
        name: 'Global',
        visible: true,
        expanded: false,
        sublayers: [],
        shapeIds: []
    }
]);

const selectedLayerId = ref('global');
const editingLayerId = ref(null);
let layerCounter = 1;
let sublayerCounter = {};

// Layer Methods
const selectLayer = (layerId) => {
    selectedLayerId.value = layerId;
};

const isLayerVisible = (layerId) => {
    const layer = layers.value.find(l => l.id === layerId);
    if (layer) return layer.visible;

    for (const mainLayer of layers.value) {
        const sublayer = mainLayer.sublayers?.find(s => s.id === layerId);
        if (sublayer) return sublayer.visible;
    }
    return true;
};

const addLayer = () => {
    const newLayer = {
        id: `layer-${layerCounter}`,
        name: `Layer ${layerCounter}`,
        visible: true,
        expanded: false,
        sublayers: [],
        shapeIds: []
    };
    layers.value.push(newLayer);
    sublayerCounter[newLayer.id] = 1;
    layerCounter++;
    selectLayer(newLayer.id);
};

const addSubLayer = (layerId) => {
    const layer = layers.value.find(l => l.id === layerId);
    if (!layer) return;

    if (!sublayerCounter[layerId]) {
        sublayerCounter[layerId] = 1;
    }

    const newSublayer = {
        id: `${layerId}-sub-${sublayerCounter[layerId]}`,
        name: `Sublayer ${sublayerCounter[layerId]}`,
        visible: true,
        shapeIds: []
    };

    layer.sublayers.push(newSublayer);
    sublayerCounter[layerId]++;
    selectLayer(newSublayer.id);
};

const deleteLayer = (layerId) => {
    if (layerId === 'global') return;

    const layerIndex = layers.value.findIndex(l => l.id === layerId);
    if (layerIndex > -1) {
        layers.value.splice(layerIndex, 1);
        if (selectedLayerId.value === layerId) {
            selectLayer('global');
        }
    }
};

const deleteSubLayer = (layerId, sublayerId) => {
    const layer = layers.value.find(l => l.id === layerId);
    if (!layer) return;

    const sublayerIndex = layer.sublayers.findIndex(s => s.id === sublayerId);
    if (sublayerIndex > -1) {
        layer.sublayers.splice(sublayerIndex, 1);
        if (selectedLayerId.value === sublayerId) {
            selectLayer(layerId);
        }
    }
};

const toggleLayerExpanded = (layerId) => {
    const layer = layers.value.find(l => l.id === layerId);
    if (layer) {
        layer.expanded = !layer.expanded;
    }
};

const toggleLayerVisibility = (layerId) => {
    const layer = layers.value.find(l => l.id === layerId);
    if (layer) {
        layer.visible = !layer.visible;
        return;
    }

    for (const mainLayer of layers.value) {
        const sublayer = mainLayer.sublayers?.find(s => s.id === layerId);
        if (sublayer) {
            sublayer.visible = !sublayer.visible;
            return;
        }
    }
};

const getLayerShapeCount = (layerId) => {
    const layer = layers.value.find(l => l.id === layerId);
    if (layer) return layer.shapeIds.length;

    for (const mainLayer of layers.value) {
        const sublayer = mainLayer.sublayers?.find(s => s.id === layerId);
        if (sublayer) return sublayer.shapeIds.length;
    }

    return 0;
};

// Drag and Drop
const dragStart = (event, variable) => {
    event.dataTransfer.setData('application/json', JSON.stringify(variable));
    event.dataTransfer.effectAllowed = 'copy';
};

const dragEnd = () => {};

const onDrop = (event) => {
    event.preventDefault();
    const variableJson = event.dataTransfer.getData('application/json');
    if (!variableJson || !network.value) return;

    try {
        const variable = JSON.parse(variableJson);
        const container = networkContainer.value;

        const rect = container.getBoundingClientRect();
        const domPosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };

        const canvasPosition = network.value.DOMtoCanvas(domPosition);

        const currentDiagramId = diagram.value?.id || `new-temp`;
        saveNodePositions(currentDiagramId, {
            [variable.id]: { x: canvasPosition.x, y: canvasPosition.y }
        });

        addNodeToCLD(variable, canvasPosition.x, canvasPosition.y);

        const layer = layers.value.find(l => l.id === selectedLayerId.value);
        if (layer) {
            layer.shapeIds.push(variable.id);
        } else {
            for (const mainLayer of layers.value) {
                const sublayer = mainLayer.sublayers?.find(s => s.id === selectedLayerId.value);
                if (sublayer) {
                    sublayer.shapeIds.push(variable.id);
                    break;
                }
            }
        }
    } catch (e) {
        console.error('Error adding node:', e);
    }
};

const saveDiagram = async () => {
    if (!network.value || !diagram.value) return;

    const positions = network.value.getPositions();

    saveNodePositions(diagram.value.id, positions);

    const success = await persistDiagram(nodes.value, edges.value);

    if (success) {
        console.log('Diagrama salvo com sucesso!');
    }
};

const goBack = () => {
    router.back();
};

const handleCreateVariable = async () => {
    const shareToken = route.params.token;
    const success = await createVariable(shareToken);
    if (success) {
        console.log('Variable created successfully');
    }
};

const tint = (hex, alpha = 0.16) => {
    if (!hex) return 'rgba(200, 200, 200, 0.2)';
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const handleDelete = () => {
    deleteSelectedElements(removeNodeFromDiagram, removeEdgeFromDiagram);
};

const handleKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (hasSelection.value) {
            handleDelete();
        }
    }
};

onMounted(async () => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
    edgeAddedCallback.value = (source, target, polarity) => {
        const newEdge = addConnection(source, target, polarity);
        if (newEdge) {
            addEdgeToCanvas(newEdge);
        }
    };

    const diagramId = route.params.id;
    const token = route.params.token;

    if (token) {
        await fetchSharedDiagram(token);
        isOwner.value = false;
        if (diagram.value) {
            await fetchVariables(null, token);
            initCollabMode(diagram.value.id, clientId.value);
        }
    } else if (diagramId) {
        await fetchDiagram(diagramId);
        isOwner.value = true;
        if (diagram.value) {
            await fetchVariables(diagramId, null);
            initCollabMode(diagram.value.id, clientId.value);
        }
    } else {
        await fetchVariables();
    }

    await nextTick();
    if (diagram.value && networkContainer.value) {
        createDiagram(diagram.value, networkContainer.value);
    }
});

const handleBeforeUnload = (event) => {
    if (hasUnsavedChanges.value) {
        event.preventDefault();
        event.returnValue = '';
    }
};

const handleExportPNG = () => {
    const fileName = diagramNameRef.value ? `${diagramNameRef.value}.png` : 'diagrama_cld.png';
    exportToPNG(fileName);
};



onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('keydown', handleKeyDown);
    stopCollabMode();
});

onBeforeRouteLeave((to, from, next) => {
    if (hasUnsavedChanges.value) {

        const userConfirmed = window.confirm('There are unsaved changes! Want to proceed?');
        if (userConfirmed) {
            next();
        } else {
            next(false);
        }
    } else {
        next();
    }
});


watch(() => diagram.value, (newDiagram) => {
    if (newDiagram && networkContainer.value) {
      if (network.value) {
            saveNodePositions(newDiagram.id);
      }
      clearNodeSelection();
      createDiagram(newDiagram, networkContainer.value);
      if (network.value) {
            network.value.redraw();
        }
    }
}, { deep: true });

watch(() => error.value, (newVal) => {
    if (newVal) {
        setTimeout(() => {
            clearError();
        }, 4000);
    }
});
</script>

<style scoped>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.canvas-app {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    background-color: #1e1e1e;
    color: #ffffff;
    overflow: hidden;
}

.top-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #2d2d2d;
    border-bottom: 1px solid #3d3d3d;
    padding: 8px 16px;
    height: 50px;
    z-index: 100;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.toolbar-center {
    flex: 1;
    justify-content: center;
}

.canvas-title {
    font-size: 14px;
    font-weight: 500;
    color: #cccccc;
    margin: 0;
}

.tool-btn {
    background-color: #3d3d3d;
    color: #cccccc;
    border: 1px solid #4d4d4d;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}

.tool-btn:hover {
    background-color: #4d4d4d;
    color: #ffffff;
}

.tool-btn.primary {
    background-color: #0e639c;
    border-color: #1177bb;
    color: #ffffff;
}

.tool-btn.primary:hover {
    background-color: #1177bb;
}

.toolbar-divider {
    width: 1px;
    height: 24px;
    background-color: #4d4d4d;
    margin: 0 4px;
}

.canvas-main {
    display: flex;
    flex: 1;
    position: relative;
    overflow: hidden;
}

.left-panel {
    display: flex;
    flex-direction: column;
    background-color: #252526;
    border-right: 1px solid #3d3d3d;
    width: 280px;
    transition: width 0.3s;
    z-index: 50;
}

.left-panel.collapsed {
    width: 40px;
}

.panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background-color: #2d2d2d;
    border-bottom: 1px solid #3d3d3d;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    color: #cccccc;
}

.panel-header:hover {
    background-color: #333333;
}

.panel-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    overflow-y: auto;
    flex: 1;
}

.variables-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.add-variable-btn {
    background-color: #0e639c;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: background 0.2s;
}

.add-variable-btn:hover {
    background-color: #1177bb;
}

.variables-toggle-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
}

.variables-list-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.category {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.category-btn {
    background-color: #333333;
    color: #cccccc;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s;
}

.category-btn:hover {
    background-color: #3d3d3d;
}

.var-count {
    margin-left: auto;
    opacity: 0.6;
    font-size: 12px;
}

.variables-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: 24px;
}

.draggable-item {
    background-color: #2d2d2d;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: grab;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #cccccc;
    transition: background 0.2s;
}

.draggable-item:hover {
    background-color: #3d3d3d;
}

.draggable-item:active {
    cursor: grabbing;
}

.loading-spinner,
.error-message {
    padding: 12px;
    text-align: center;
    font-size: 13px;
}

.error-message {
    background-color: #5a1d1d;
    color: #f48771;
    border-radius: 4px;
}

.canvas-area {
    flex: 1;
    position: relative;
    background-color: #1e1e1e;
    background-image:
        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 20px 20px;
}

.canvas-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: #cccccc;
}

.canvas-loading i {
    font-size: 48px;
    margin-bottom: 16px;
}

.network-canvas {
    width: 100%;
    height: 100%;
}

.layers-panel {
    position: absolute;
    bottom: 16px;
    right: 16px;
    background-color: #252526;
    border: 1px solid #3d3d3d;
    border-radius: 8px;
    width: 320px;
    max-height: 400px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    transition: max-height 0.3s;
    z-index: 40;
}

.layers-panel.collapsed {
    max-height: 40px;
}

.layers-panel .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background-color: #2d2d2d;
    border-radius: 8px 8px 0 0;
    cursor: pointer;
}

.layers-panel .panel-content {
    max-height: 350px;
    overflow-y: auto;
    padding: 12px;
}

.layers-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
}

.add-layer-btn {
    background-color: #0e639c;
    color: white;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.add-layer-btn:hover {
    background-color: #1177bb;
}

.layers-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.layer-item,
.sublayer-item {
    background-color: #2d2d2d;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.2s;
}

.layer-item:hover,
.sublayer-item:hover {
    background-color: #333333;
}

.layer-item.active,
.sublayer-item.active {
    background-color: #094771;
}

.sublayer-item {
    margin-left: 16px;
    background-color: #252526;
}

.layer-content,
.sublayer-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
}

.expand-btn,
.layer-visibility-btn {
    background: transparent;
    color: #cccccc;
    border: none;
    cursor: pointer;
    padding: 4px;
    transition: color 0.2s;
}

.expand-btn:hover,
.layer-visibility-btn:hover {
    color: #ffffff;
}

.expand-placeholder {
    width: 20px;
}

.layer-name,
.layer-name-input {
    flex: 1;
    font-size: 13px;
    color: #cccccc;
}

.layer-name-input {
    background-color: #1e1e1e;
    border: 1px solid #0e639c;
    padding: 4px;
    border-radius: 2px;
    color: #ffffff;
}

.layer-shape-count {
    font-size: 11px;
    opacity: 0.6;
}

.layer-controls {
    display: flex;
    gap: 4px;
}

.add-sublayer-btn,
.delete-layer-btn {
    background-color: transparent;
    color: #cccccc;
    border: none;
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
}

.add-sublayer-btn:hover {
    background-color: #0e639c;
    color: #ffffff;
}

.delete-layer-btn:hover {
    background-color: #a12d2d;
    color: #ffffff;
}

.sublayer-indent {
    opacity: 0.6;
    margin-right: 4px;
}

.cld-legend-canvas {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
  padding: 12px 14px;
  border: 1px solid #3d3d3d;
  border-radius: 10px;
  background: rgba(37, 37, 38, 0.9);
  backdrop-filter: blur(4px);
  max-height: 180px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  color: #ccc;
}

.legend-title {
  font-weight: 600;
  font-size: 13px;
  color: #fff;
  margin-bottom: 8px;
}

.legend-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
}

.legend-label { font-size: 12px; }

.archetype-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
}

.popup-card {
  position: relative;
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: min(96vw, 980px);
  max-height: 80vh;
  overflow-y: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: popupFadeIn 0.3s ease-out;
  z-index: 1001;
}

@keyframes popupFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #eee;
}

.popup-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #2c3e50;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #7f8c8d;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0.5rem;
}

.close-button:hover {
  color: #e74c3c;
}

.popup-body {
  padding: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  color: #3498db;
  margin: 0 0 1rem 0;
}

.section-title i {
  color: #3498db;
}

.loop-container, .archetype-container {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}

.loop-item {
  padding: 0.8rem;
  border-radius: 8px;
  background: #f8f9fa;
  border-left: 4px solid #42b983;
}

.loop-item.reinforcing {
  border-left-color: #e74c3c;
}

.loop-item.balancing {
  border-left-color: #3498db;
}

.loop-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.loop-item.reinforcing .loop-badge {
  background: #fde8e8;
  color: #e74c3c;
}

.loop-item.balancing .loop-badge {
  background: #e8f4fc;
  color: #3498db;
}

.loop-variables {
  font-size: 0.95rem;
  color: #34495e;
}

.variable-tag {
  background: #e8f4fc;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-right: 0.3rem;
  display: inline-block;
}

.archetype-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem;
  border-radius: 8px;
  background: #f8f9fa;
  transition: transform 0.2s;
}

.archetype-item:hover {
  transform: translateX(5px);
  background: #f1f8fe;
}

.archetype-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e8f4fc;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3498db;
}

.archetype-name {
  font-weight: 500;
  color: #2c3e50;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .popup-card {
    width: 95%;
  }

  .loop-item, .archetype-item {
    padding: 0.6rem;
  }
}

.node-name-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.node-name {
  font-size: 1.1rem;
  font-weight: 500;
  color: #2c3e50;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 6px;
  margin-top: 0.5rem;
}

/* Adjust spacing for sections to account for new node name section */
.loop-section, .archetype-section {
  margin-top: 1.5rem;
}

/* Loops */
.loop-container { display: grid; gap: 12px; }
.loop-item { padding: 10px; border-left: 4px solid #D0D7DE; border-radius: 10px; background: #F7FBFF; }
.loop-badge { display: inline-block; color: #FFFFFF; padding: 4px 10px; border-radius: 8px; font-weight: 700; }
.variable-tag { display: inline-block; margin: 2px 6px 0 0; padding: 2px 8px; border: 2px solid #CBD5E1; border-radius: 999px; background: #FFFFFF; }

/* Archetypes */
.archetype-popup .popup-card {
  width: min(96vw, 980px);   /* wider popup but still responsive */
  max-height: 84vh;
}
.archetype-popup .popup-body {
  max-height: calc(84vh - 64px); /* scroll area below header */
  overflow: auto;
}

/* ===== Archetypes layout ===== */
.archetype-container {
  display: grid;
  gap: 14px;
}

/* two-column grid: fixed dot column + flexible content column */
.archetype-item {
  display: grid;
  grid-template-columns: 28px 1fr; /* 28px reserved for the dot */
  column-gap: 12px;
  align-items: start;

  /* subtle full border plus a stronger colored left accent */
  border: 2px solid rgba(208, 215, 222, 0.6);
  border-left: 6px solid #D0D7DE; /* overridden inline with arch.color */
  background: #F7FBFF;
  border-radius: 18px; /* increased rounding */
  padding: 8px 20px; /* smaller vertical, larger lateral padding */
  min-height: 38px; /* slightly reduced overall height */
}

/* fixed column: dot never shrinks */
.arch-col {
  grid-column: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

/* the colored dot */
.arch-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 3px #FFFFFF; /* WHITE ring for contrast */
  flex: 0 0 16px; /* prevent grow/shrink */
}

/* flexible content column */
.arch-content {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  align-items: center; /* center header and name */
}

.archetype-header {
  display: flex;
  align-items: center;
  color: #2c3e50;
  gap: 10px;
  margin-bottom: 6px;
  justify-content: center; /* center icon + name */
}

.archetype-name { font-weight: 700; line-height: 1.25; text-align: center; width: 100%; }

/* variable chips (no commas) */
.archetype-variables {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.variable-chip {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border: 2px solid #CBD5E1; /* overridden inline with arch.color */
  border-radius: 999px;
  background: #FFFFFF;
}
.variable-chip {
  display: inline-block;
  font-size: 0.85rem;
  padding: 2px 8px;
  border: 1px solid #CBD5E1;
  border-radius: 999px;
  background: #FFFFFF;
  color: #2c3e50;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: #2d2d2d;
    border: 1px solid #3d3d3d;
    border-radius: 8px;
    padding: 24px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}

.modal-content h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #ffffff;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    color: #cccccc;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 8px 12px;
    background-color: #1e1e1e;
    border: 1px solid #3d3d3d;
    border-radius: 4px;
    color: #ffffff;
    font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #0e639c;
}

.form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
}

.btn-cancel,
.btn-create {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
}

.btn-cancel {
    background-color: #3d3d3d;
    color: #cccccc;
}

.btn-cancel:hover {
    background-color: #4d4d4d;
}

.btn-create {
    background-color: #0e639c;
    color: #ffffff;
}

.btn-create:hover {
    background-color: #1177bb;
}

.btn-create:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}

::-webkit-scrollbar-track {
    background: #1e1e1e;
}

::-webkit-scrollbar-thumb {
    background: #3d3d3d;
    border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
    background: #4d4d4d;
}

.tool-btn.active {
    background-color: #0e639c;
    color: #ffffff;
    border-color: #1177bb;
}

.diagram-title-input {
    background: transparent;
    border: 2px solid transparent;
    border-radius: 6px;
    outline: none;
    box-shadow: none;

    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    font-family: inherit;

    padding: 4px 8px;
    margin: 0;
    width: auto;
    min-width: 250px;
    max-width: 100%;

    transition: all 0.2s ease-in-out;
}

.diagram-title-input:hover {
    background-color: rgba(0, 0, 0, 0.04);
    cursor: text;
}

.diagram-title-input:focus {
    background-color: #ffffff;
    border-bottom: 2px solid #42b883;
    border-radius: 6px 6px 0 0;
    color: #2c3e50;
}

@media (prefers-color-scheme: dark) {
    .diagram-title-input {
        color: #f8f9fa;
    }
    .diagram-title-input:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
    .diagram-title-input:focus {
        background-color: #1e1e1e;
        border-bottom-color: #42b883;
    }
}

.btn-history {
    background-color: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: 0.2s;
}
.btn-history:hover {
    background-color: #e2e8f0;
}

.history-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.history-modal-content {
    background: white;
    width: 500px;
    max-width: 90%;
    max-height: 80vh;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
}

.history-header h2 { margin: 0; font-size: 1.25rem; }

.close-btn {
    background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #64748b;
}

.history-list {
    list-style: none;
    padding: 0; margin: 0;
    overflow-y: auto;
    padding: 20px;
}

.history-item {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px dashed #e2e8f0;
}

.history-item:last-child { border-bottom: none; }

.history-meta {
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 8px;
}

.history-meta strong { color: #0f172a; }

.history-summary {
    font-family: monospace;
    background-color: #f8fafc;
    padding: 10px;
    border-radius: 6px;
    white-space: pre-wrap;
    font-size: 0.9rem;
    color: #334155;
    border: 1px solid #e2e8f0;
}

.history-loading, .history-empty {
    padding: 40px; text-align: center; color: #64748b;
}

.history-line {
    padding: 4px 0;
    line-height: 1.5;
}

.text-positive {
    color: #10b981;
    margin: 0 8px;
    font-size: 1.1em;
}

/* Seta Vermelha */
.text-negative {
    color: #ef4444;
    margin: 0 8px;
    font-size: 1.1em;
}

.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 1rem;
    font-weight: bold;
    margin-left: 8px;
    vertical-align: middle;
}

.badge-positive {
    background-color: #10b981;
}

.badge-negative {
    background-color: #ef4444;
}

.toast-error {
    position: fixed;
    top: 70px;
    right: 20px;
    background-color: #ef4444;
    color: white;
    padding: 14px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 3000;
    font-weight: 500;
    font-size: 14px;
    border-left: 4px solid #b91c1c;
}

.toast-fade-enter-active, .toast-fade-leave-active {
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
.toast-fade-enter-from, .toast-fade-leave-to {
    opacity: 0;
    transform: translateX(50px);
}

.info-modal-card {
    width: min(96vw, 750px) !important; /* Ligeiramente mais estreito que o de arquétipos */
}

.interaction-tips-list {
    list-style: none;
    padding: 0;
    margin: 16px 0 24px 0;
    color: #cccccc;
}

.interaction-tips-list li {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
    font-size: 0.95rem;
    line-height: 1.4;
}

.interaction-tips-list i {
    width: 24px;
    color: #3498db;
    font-size: 1.1rem;
    text-align: center;
}

.dark-panel {
    background: #1e1e1e;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #3d3d3d;
    border-left: 4px solid #3498db;
}

.mt-4 {
    margin-top: 2rem;
}

.controls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
}

.control-item {
    padding: 10px;
    border-left: 4px solid #D0D7DE;
    border-radius: 10px;
    background: #F7FBFF;
    color:rgb(15, 23, 42);
}

.control-item i {
    color: #42b983;
    width: 15px;
}

/* Estilo das listas de arquétipos dentro do modal */
.static-archetypes-grid {
    display: flex;
    gap: 12px;
}

.static-archetypes-list {
    flex: 1;
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.static-arch-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.28rem 1.6rem;
    background: #f0fcf5;
    border: 3px solid #18843a;
    border-radius: 18px;
    min-height: 20px;
    box-shadow: none;
    width: 100%;
    box-sizing: border-box;
    color: #0f172a;
    justify-content: center;
}

/* Interaction tips list reset */
.interaction-tips-list li {
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgb(15, 23, 42);
    margin-bottom: 8px;
    font-size: 0.9rem;
}

::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: grey;
    border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
    background: #4d4d4d;
}

.toolbar-info {
  font-weight: 700;
  margin-left: 0.5rem;
}

</style>