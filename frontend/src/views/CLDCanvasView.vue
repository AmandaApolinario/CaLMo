<template>
    <div class="canvas-app">
        <div class="top-toolbar">
            <div class="toolbar-left">
                <button class="tool-btn back-btn" @click="goBack" title="Back">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="toolbar-divider"></div>
                <h2 class="canvas-title">{{ diagram ? diagram.title : 'New Canvas' }}</h2>
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
                <button class="tool-btn" @click="redistributeNodes" title="Redistribute Nodes">
                    <i class="fas fa-sync"></i>
                </button>
                <button class="tool-btn primary" @click="saveDiagram" title="Save">
                    <i class="fas fa-save"></i> Save
                </button>
            </div>
        </div>

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
                            <div v-if="error" class="error-message">{{ error }}</div>
                            <div class="variables-header">
                              <button class="add-variable-btn" @click="openCreateModal">
                                  <i class="fas fa-plus"></i> New Variable
                              </button>
                            </div>
                            <div v-if="!loading && !error" class="variables-list-container">
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
                    <button class="close-button" @click="clearNodeSelection">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="popup-body">
                    <div class="node-name-section">
                        <h4 class="section-title"><i class="fas fa-circle"></i> Node Name</h4>
                        <div class="node-name">{{ selectedNodeInfo.nodeName }}</div>
                    </div>

                    <div v-if="selectedNodeInfo.loops.length > 0" class="loop-section">
                        <h4 class="section-title"><i class="fas fa-circle-notch"></i> Feedback Loops</h4>
                        <div class="loop-container">
                            <div
                                v-for="(loop, index) in selectedNodeInfo.loops"
                                :key="'loop-' + index"
                                class="loop-item"
                            >
                                <div class="loop-badge" :style="{ backgroundColor: tint(loop.color, 0.18), color: '#0F172A', borderColor: tint(loop.color, 0.35) }">
                                    {{ loop.type }}
                                </div>
                                <div class="loop-variables">
                                    <span
                                        v-for="(variable, idx) in loop.variables"
                                        :key="idx"
                                        class="variable-tag"
                                        :style="{ backgroundColor: tint(loop.color, 0.12), color: '#0F172A', borderColor: tint(loop.color, 0.28) }"
                                    >
                                        {{ variable.name || variable }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="selectedNodeInfo.archetypes.length > 0" class="archetype-section">
                        <h4 class="section-title"><i class="fas fa-shapes"></i> Archetypes</h4>
                        <div class="archetype-container">
                            <div
                                v-for="arch in selectedNodeInfo.archetypes"
                                :key="'arch-' + arch.id"
                                class="archetype-item"
                                :style="{ borderLeftColor: arch.color }"
                            >
                                <div class="arch-col">
                                    <span class="arch-dot" :style="{ backgroundColor: arch.color }"></span>
                                </div>
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
                                            {{ v.name || v }}
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
    </div>
</template>

<script setup>
import { onMounted, ref, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCLDCanvasViewModel } from '@/viewmodels/CLDCanvasViewModel';
import { useCLDDiagramViewModel } from '@/viewmodels/CLDDiagramViewModel';

const router = useRouter();
const route = useRoute();

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
    addNodeToDiagram,
    addConnection
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
    addEdgeToCanvas
} = useCLDDiagramViewModel();

// UI State
const leftPanelExpanded = ref(true);
const layersPanelExpanded = ref(true);
const variablesPanelExpanded = ref(true);

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

        addNodeToDiagram(variable);

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
    const container = networkContainer.value;
    if (!container || !container.network) return;

    const networkInstance = container.network;
    const positions = networkInstance.getPositions();
    const updatedNodes = Object.keys(positions).map(nodeId => {
        const node = nodes.value.find(n => n.id === nodeId);
        return {
            ...node,
            x: positions[nodeId].x,
            y: positions[nodeId].y
        };
    });

    console.log('Saving diagram positions:', updatedNodes);
};

const goBack = () => {
    router.back();
};

const handleCreateVariable = async () => {
    const success = await createVariable();
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

onMounted(async () => {

    edgeAddedCallback.value = (source, target, polarity) => {
        const newEdge = addConnection(source, target, polarity);
        if (newEdge) {
            addEdgeToCanvas(newEdge);
        }
    };

    await fetchVariables();
    const diagramId = route.params.id;

    if (diagramId) {
        await fetchDiagram(diagramId);
    }

    await nextTick();
    if (diagram.value && networkContainer.value) {
        createDiagram(diagram.value, networkContainer.value);
    }
});

watch(() => diagram.value, (newDiagram) => {
    if (newDiagram && networkContainer.value) {
        createDiagram(newDiagram, networkContainer.value);
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  top: 0; left: 0; width: 100%; height: 100%;
  display: flex; justify-content: center; align-items: center;
  z-index: 2000;
}

.popup-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(3px);
}

.popup-card {
  position: relative;
  background: #2d2d2d;
  border: 1px solid #3d3d3d;
  border-radius: 12px;
  width: 90%; max-width: min(96vw, 800px); max-height: 80vh;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  display: flex; flex-direction: column;
  z-index: 2001;
}

.popup-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #444;
}

.popup-header h3 { margin: 0; font-size: 1.2rem; color: #fff; }
.close-button { background: none; border: none; font-size: 1.2rem; color: #aaa; cursor: pointer; }
.close-button:hover { color: #fff; }

.popup-body {
  padding: 1.5rem; overflow-y: auto; flex: 1;
}

.section-title { font-size: 1.1rem; color: #3498db; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem; }
.node-name-section { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #444; }
.node-name { font-size: 1.1rem; color: #eee; padding: 0.5rem 1rem; background: #1e1e1e; border-radius: 6px; margin-top: 0.5rem; }

.loop-container, .archetype-container { display: grid; gap: 12px; }
.loop-item { padding: 12px; border-radius: 8px; background: #252526; border-left: 4px solid #3498db; }
.loop-badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-weight: bold; font-size: 0.85rem; margin-bottom: 8px; }
.variable-tag { display: inline-block; margin: 2px 6px 0 0; padding: 2px 8px; border: 1px solid #555; border-radius: 999px; font-size: 0.85rem; }

.archetype-item {
  display: grid; grid-template-columns: 28px 1fr; column-gap: 12px; align-items: start;
  border: 1px solid #444; border-left: 6px solid #D0D7DE; background: #252526;
  border-radius: 12px; padding: 12px 16px;
}
.arch-col { grid-column: 1; display: flex; justify-content: center; }
.arch-dot { width: 16px; height: 16px; border-radius: 50%; box-shadow: inset 0 0 0 2px #2d2d2d; }
.arch-content { grid-column: 2; display: flex; flex-direction: column; align-items: flex-start; }
.archetype-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: #ddd; font-weight: bold; }
.archetype-variables { display: flex; flex-wrap: wrap; gap: 8px; }
.variable-chip { display: inline-block; font-size: 0.85rem; padding: 2px 8px; border: 1px solid #555; border-radius: 999px; color: #ccc; }

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
</style>