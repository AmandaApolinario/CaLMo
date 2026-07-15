<template>
  <div class="canvas-app">
    <CanvasToolbar
      v-model:diagram-name="diagramNameRef"
      :interaction-mode="interactionMode"
      :is-delay-active="isDelayActive"
      :has-selection="hasSelection"
      :undo-count="undoStack.length"
      :is-owner="isOwner"
      @save-diagram-name="saveDiagramName"
      @go-back="goBack"
      @set-interaction-mode="setInteractionMode"
      @toggle-delay="toggleDelay"
      @delete-selected="handleDelete"
      @undo="performUndo"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @fit-view="fitView"
      @open-info="openInfoModal"
      @open-share="openShareModal"
      @open-history="openHistoryModal"
      @export-png="handleExportPNG"
      @open-settings="showSettingsModal = true"
      @save="saveDiagram"
    />

    <ErrorToast :error="error" />

    <div class="canvas-main">
      <CanvasToolsPanel v-model:expanded="leftPanelExpanded">
        <VariablesPalette
          v-model:expanded="variablesPanelExpanded"
          :loading="loading"
          :variables="variables"
          @create-variable="openCreateModal"
          @drag-start="dragStart"
          @drag-end="dragEnd"
        />

        <ReusableRelationshipsPalette
          v-model:expanded="relationshipsPanelExpanded"
          :loading="loadingRelationships"
          :relationship-groups="relationshipsByCLD"
          :get-group-expanded="getCLDGroupExpanded"
          :get-variable-name-by-id="getVariableNameById"
          :is-node-on-canvas="isNodeOnCanvas"
          @toggle-group="toggleCLDGroup"
          @drag-start="dragStartRelationship"
          @drag-end="dragEnd"
        />
      </CanvasToolsPanel>

      <div class="canvas-area" @drop="onDrop" @dragover.prevent>
        <div v-if="isLoadingDiagram" class="canvas-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading diagram...</p>
        </div>
        <div ref="networkContainer" class="network-canvas"></div>
        <CanvasLegend :items="legendArchetypes" />
      </div>

      <CanvasLayersPanel
        v-model:expanded="layersPanelExpanded"
        :flattened-layers="flattenedLayers"
        :selected-layer-id="selectedLayerId"
        :show-subsystem-borders="showSubsystemBorders"
        @toggle-subsystem-borders="toggleSubsystemBorders"
        @create-subsystem="openCreateSubsystemModal"
        @select-layer="selectLayer"
        @toggle-layer-expanded="toggleLayerExpanded"
        @toggle-layer-visibility="toggleLayerVisibility"
        @edit-subsystem="openEditSubsystemModal"
        @delete-layer="deleteSubsystem"
      />
    </div>

    <NodeDetailsPopup
      :selected-node-info="selectedNodeInfo"
      :active-node-subsystems="activeNodeSubsystems"
      :available-subsystems="availableSubsystems"
      :tint="tint"
      :get-archetype-icon="getArchetypeIcon"
      :format-archetype-name="formatArchetypeName"
      @clear="clearNodeSelection"
      @set-subsystem-ids="setSelectedNodeSubsystemIds"
    />

    <CreateVariableModal
      :visible="showCreateModal"
      v-model:name="newVariable.name"
      v-model:description="newVariable.description"
      :creating="creatingVariable"
      @close="closeCreateModal"
      @submit="handleCreateVariable"
    />

    <CreateSubsystemModal
      :visible="showSubsystemModal"
      v-model:name="newSubsystem.name"
      v-model:description="newSubsystem.description"
      :title="subsystemModalTitle"
      :submit-label="subsystemModalSubmitLabel"
      @close="closeCreateSubsystemModal"
      @submit="confirmCreateSubsystem"
    />

    <ShareDiagramModal
      :visible="showShareModal"
      :is-generating-link="isGeneratingLink"
      :current-share-token="currentShareToken"
      :shareable-url="getShareableUrl"
      @close="closeShareModal"
      @copy="copyShareLink"
      @revoke="revokeShareLink"
      @generate="openShareModal"
    />

    <HistoryModal
      :visible="isHistoryModalOpen"
      :loading="isLoadingHistory"
      :history-list="historyList"
      :format-history-text="formatHistoryText"
      @close="closeHistoryModal"
    />

    <CanvasInfoModal
      :visible="isInfoModalOpen"
      @close="closeInfoModal"
    />

    <CanvasSettingsModal
      :visible="showSettingsModal"
      :current-theme="currentTheme"
      @close="showSettingsModal = false"
      @toggle-theme="toggleTheme"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import CanvasInfoModal from '@/components/canvas/CanvasInfoModal.vue';
import CanvasLayersPanel from '@/components/canvas/CanvasLayersPanel.vue';
import CanvasLegend from '@/components/canvas/CanvasLegend.vue';
import CanvasSettingsModal from '@/components/canvas/CanvasSettingsModal.vue';
import CanvasToolbar from '@/components/canvas/CanvasToolbar.vue';
import CanvasToolsPanel from '@/components/canvas/CanvasToolsPanel.vue';
import CreateSubsystemModal from '@/components/canvas/CreateSubsystemModal.vue';
import CreateVariableModal from '@/components/canvas/CreateVariableModal.vue';
import ErrorToast from '@/components/canvas/ErrorToast.vue';
import HistoryModal from '@/components/canvas/HistoryModal.vue';
import NodeDetailsPopup from '@/components/canvas/NodeDetailsPopup.vue';
import ReusableRelationshipsPalette from '@/components/canvas/ReusableRelationshipsPalette.vue';
import ShareDiagramModal from '@/components/canvas/ShareDiagramModal.vue';
import VariablesPalette from '@/components/canvas/VariablesPalette.vue';
import { useCLDCanvasViewModel } from '@/viewmodels/CLDCanvasViewModel';
import { useCLDDiagramViewModel } from '@/viewmodels/CLDDiagramViewModel';
import { useCLDSubsystemsViewModel } from '@/viewmodels/CLDSubsystemsViewModel';
import { useTheme } from '@/viewmodels/ThemeViewModel';
import { tint } from '@/theme/colors';

const router = useRouter();
const route = useRoute();
const isOwner = ref(false);

const { currentTheme, toggleTheme, initTheme } = useTheme();
initTheme();
const showSettingsModal = ref(false);

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
  addEdge,
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
  updateLayerCollab,
  relationshipsByCLD,
  loadingRelationships,
  fetchReusableRelationships,
  addReusableRelationship,
  isDelayEnabled,
  getEdgeDelay,
  toggleEdgeDelay,
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
  exportToPNG,
  diagramLayers,
  updateVisibility,
  showSubsystemBorders,
  toggleSubsystemBorders,
} = useCLDDiagramViewModel();

const {
  selectedLayerId,
  showSubsystemModal,
  newSubsystem,
  subsystemModalTitle,
  subsystemModalSubmitLabel,
  flattenedLayers,
  availableSubsystems,
  activeNodeSubsystems,
  selectLayer,
  assignVariableToSelectedLayer,
  deleteSubsystem,
  syncSubsystems,
  openCreateSubsystemModal,
  openEditSubsystemModal,
  closeCreateSubsystemModal,
  toggleLayerExpanded,
  toggleLayerVisibility,
  confirmCreateSubsystem,
  setSelectedNodeSubsystemIds,
} = useCLDSubsystemsViewModel({
  diagram,
  nodes,
  selectedNodeInfo,
  diagramLayers,
  updateVisibility,
  updateLayerCollab,
});

const leftPanelExpanded = ref(true);
const layersPanelExpanded = ref(true);
const variablesPanelExpanded = ref(true);
const relationshipsPanelExpanded = ref(true);
const cldGroupExpanded = reactive({});

const toggleCLDGroup = (cldId) => {
  cldGroupExpanded[cldId] = !getCLDGroupExpanded(cldId);
};

const getCLDGroupExpanded = (cldId) => {
  if (cldGroupExpanded[cldId] === undefined) {
    cldGroupExpanded[cldId] = true;
  }
  return cldGroupExpanded[cldId];
};

provideStateCallback.value = getCurrentPositions;

applyStateCallback.value = (positions) => {
  if (diagram.value) {
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

const dragStart = (event, variable) => {
  event.dataTransfer.setData('application/json', JSON.stringify(variable));
  event.dataTransfer.effectAllowed = 'copy';
};

const dragStartRelationship = (event, relationship) => {
  event.dataTransfer.setData('application/json', JSON.stringify({ _type: 'relationship', ...relationship }));
  event.dataTransfer.effectAllowed = 'copy';
};

const getVariableNameById = (id) => {
  let found = variables.value.find(variable => String(variable.id) === String(id));
  if (!found) found = nodes.value.find(node => String(node.id) === String(id));
  return found ? found.name : id;
};

const isNodeOnCanvas = (id) => {
  return nodes.value.some(node => String(node.id) === String(id));
};

const dragEnd = () => {};

const onDrop = async (event) => {
  event.preventDefault();
  const jsonData = event.dataTransfer.getData('application/json');
  if (!jsonData || !network.value) return;

  try {
    const data = JSON.parse(jsonData);
    const container = networkContainer.value;
    const rect = container.getBoundingClientRect();
    const domPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const canvasPosition = network.value.DOMtoCanvas(domPosition);

    if (data._type === 'relationship') {
      const sourcePos = { x: canvasPosition.x - 80, y: canvasPosition.y - 30 };
      const targetPos = { x: canvasPosition.x + 80, y: canvasPosition.y + 30 };

      await addReusableRelationship(
        data,
        sourcePos,
        targetPos,
        getVariableNameById(data.source_id),
        getVariableNameById(data.target_id),
      );
      return;
    }

    const variable = data;
    const currentDiagramId = diagram.value?.id || 'new-temp';
    saveNodePositions(currentDiagramId, {
      [variable.id]: { x: canvasPosition.x, y: canvasPosition.y },
    });

    await addNodeToCLD(variable, canvasPosition.x, canvasPosition.y);
    assignVariableToSelectedLayer(variable.id);
  } catch (error) {
    console.error('Error adding node:', error);
  }
};

const saveDiagram = async () => {
  if (!network.value || !diagram.value) return;
  const positions = network.value.getPositions();
  saveNodePositions(diagram.value.id, positions);
  syncSubsystems();

  const success = await persistDiagram(nodes.value, edges.value);
  if (success) {
    console.log('Diagram Saved!');
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

const handleDelete = () => {
  deleteSelectedElements(removeNodeFromDiagram, removeEdgeFromDiagram);
};

const handleKeyDown = (event) => {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

  if ((event.key === 'Delete' || event.key === 'Backspace') && hasSelection.value) {
    handleDelete();
  }
};

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('beforeunload', handleBeforeUnload);
  edgeAddedCallback.value = async (source, target, polarity) => {
    const newEdge = await addEdge(source, target, polarity, isDelayEnabled.value);
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

  if (diagram.value?.id) {
    await fetchReusableRelationships(diagram.value.id, token || null);
  } else {
    await fetchReusableRelationships(null, token || null);
  }
});

const handleBeforeUnload = (event) => {
  if (hasUnsavedChanges.value) {
    event.preventDefault();
    event.returnValue = '';
  }
};

const handleExportPNG = () => {
  const fileName = diagramNameRef.value ? `${diagramNameRef.value}.png` : 'diagram_cld.png';
  exportToPNG(fileName);
};

const isDelayActive = computed(() => {
  if (hasSelection.value && network.value) {
    const selection = network.value.getSelection();
    if (selection.edges.length > 0 && selection.nodes.length === 0) {
      return getEdgeDelay(selection.edges[0]);
    }
  }
  return isDelayEnabled.value;
});

const toggleDelay = async () => {
  if (hasSelection.value && network.value) {
    const selection = network.value.getSelection();
    if (selection.edges.length > 0 && selection.nodes.length === 0) {
      if (toggleEdgeDelay(selection.edges[0])) {
        await saveDiagram();
        return;
      }
    }
  }
  isDelayEnabled.value = !isDelayEnabled.value;
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
    nextTick(() => updateVisibility());
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
<style lang="scss">
@import '@/styles/cldCanvas.scss';
</style>