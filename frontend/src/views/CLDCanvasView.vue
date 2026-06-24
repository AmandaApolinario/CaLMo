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
                  :class="{ 'active': isDelayActive }"
                  @click="toggleDelay"
                  title="Toggle Delay"
              >
                  <strong>||</strong>
              </button>

              <div class="toolbar-divider"></div>

              <button
                  class="tool-btn"
                  :disabled="!hasSelection"
                  :style="{ opacity: hasSelection ? '1' : '0.4', color: hasSelection ? '#f48771' : '' }"
                  @click="handleDelete"
                  title="Delete Selected (Del)"
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
                  <i class="fa fa-compress"></i>
              </button>
          </div>

            <div class="toolbar-right">
                <button @click="openInfoModal" class="btn-history" title="Diagram Information">
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
                <button class="tool-btn" @click="showSettingsModal = true" title="Settings">
                    <i class="fas fa-cog"></i>
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

                    <div class="relationships-toggle-header" @click="relationshipsPanelExpanded = !relationshipsPanelExpanded" style="cursor:pointer;display:flex;align-items:center;gap:8px;margin:8px 0;">
                        <span :key="relationshipsPanelExpanded ? 'open' : 'closed'">
                            <i :class="relationshipsPanelExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </span>
                        <span style="font-weight:600;">Relationships from other CLDs</span>
                    </div>

                    <transition name="fade">
                        <div v-show="relationshipsPanelExpanded">
                            <div v-if="loadingRelationships" class="loading-spinner">Loading relationships...</div>
                            <div v-else-if="relationshipsByCLD.length === 0" class="empty-relationships-msg">
                                No reusable relationships found.
                            </div>
                            <div v-else class="variables-list-container">
                                <div v-for="group in relationshipsByCLD" :key="group.cld_id" class="relationship-group">
                                    <div class="relationship-group-header" @click="toggleCLDGroup(group.cld_id)">
                                        <span>
                                            <i :class="getCLDGroupExpanded(group.cld_id) ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"></i>
                                        </span>
                                        <i class="fas fa-diagram-project"></i>
                                        {{ group.cld_name }}
                                        <span class="relationship-group-count">{{ group.relationships.length }}</span>
                                    </div>
                                    <template v-if="getCLDGroupExpanded(group.cld_id)">
                                        <div
                                            v-for="rel in group.relationships"
                                            :key="rel.id"
                                            class="draggable-item relationship-item"
                                            draggable="true"
                                            @dragstart="dragStartRelationship($event, rel)"
                                            @dragend="dragEnd"
                                        >
                                            <i class="fas fa-code-branch relationship-arrow-icon"></i>
                                            <span
                                                :class="['relationship-source-name', { 'on-canvas': isNodeOnCanvas(rel.source_id) }]"
                                            >{{ getVariableNameById(rel.source_id) }}</span>
                                            <i class="fas fa-long-arrow-alt-right relationship-connector"></i>
                                            <span
                                                :class="['relationship-target-name', { 'on-canvas': isNodeOnCanvas(rel.target_id) }]"
                                            >{{ getVariableNameById(rel.target_id) }}</span>
                                            <span :class="['relationship-polarity', rel.type === 'NEGATIVE' ? 'negative' : 'positive']">
                                                {{ rel.type === 'NEGATIVE' ? '-' : '+' }}
                                            </span>
                                            <span v-if="rel.has_delay" class="relationship-delay" title="Has delay">||</span>
                                        </div>
                                    </template>
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
            <div class="layers-panel" :class="{ collapsed: !layersPanelExpanded }">
                <div class="panel-header" @click="layersPanelExpanded = !layersPanelExpanded">
                    <span style="font-weight: bold">Subsystem</span>
                    <i :class="layersPanelExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"></i>
                </div>

                <div v-if="layersPanelExpanded" class="panel-content">
                    <div class="layers-header" :key="'border-btn-' + showSubsystemBorders">
                        <button class="add-layer-btn"
                                @click="toggleSubsystemBorders"
                                :title="showSubsystemBorders ? 'Hide Visual Borders' : 'Show Visual Borders'"
                                :style="{ backgroundColor: !showSubsystemBorders ? '#f1f5f9' : '#1177bb' }"
                                style="margin-right: 8px;">
                            <i :class="showSubsystemBorders ? 'fas fa-object-ungroup' : 'fas fa-object-group'"
                               :style="{ color: showSubsystemBorders ? '#ffffff' : '#000000' }">
                            </i>
                        </button>

                        <button class="add-layer-btn" @click="openCreateSubsystemModal(null)" title="Create Subsystem">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>

                    <div class="layers-list">
                        <div v-for="{ layer, depth } in flattenedLayers" :key="layer.id + '_' + layer.visible">

                             <div class="layer-item"
                                 :class="{
                                     active: selectedLayerId === layer.id,
                                     'global-layer': layer.id === 'global'
                                 }"
                                 :style="{ marginLeft: (depth * 15) + 'px', borderLeft: layer.id !== 'global' ? `4px solid ${layer.color}` : 'none' }">

                                <div class="layer-content" @click="selectLayer(layer.id)">
                                    <button class="expand-btn" @click.stop="toggleLayerExpanded(layer.id)" v-if="layer.subsystems && layer.subsystems.length > 0">
                                        <i :class="layer.expanded ? 'fas fa-caret-down' : 'fas fa-caret-right'"></i>
                                    </button>
                                    <div v-else class="expand-placeholder"></div>

                                    <button class="layer-visibility-btn" @click.stop="toggleLayerVisibility(layer.id)">
                                        <i :class="{  fas: true,  'fa-eye': layer.visible,  'fa-eye-slash': !layer.visible}"></i>
                                    </button>

                                    <input v-if="editingLayerId === layer.id" class="layer-name-input" v-model="layer.name" @blur="editingLayerId = null" @keyup.enter="editingLayerId = null" @click.stop />
                                    <span v-else class="layer-name" @dblclick.stop="editingLayerId = layer.id">{{ layer.name }}</span>
                                </div>

                                <div class="layer-controls" v-if="layer.id !== 'global'">
                                    <button class="add-sublayer-btn" @click.stop="openCreateSubsystemModal(layer.id)" title="Add Subsystem"><i class="fas fa-plus"></i></button>
                                    <button class="delete-layer-btn" @click.stop="deleteLayerDeep(layers, layer.id); syncSubsystems(); broadcastSubsystems(); updateVisibility();" title="Delete"><i class="fas fa-times"></i></button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
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
              <div v-for="sub in activeNodeSubsystems" :key="sub.id" class="loop-item" :style="{ borderLeftColor: sub.color }">

                  <div class="loop-badge" :style="{ backgroundColor: tint(sub.color, 0.18), borderColor: tint(sub.color, 0.35) }">
                      {{ sub.hierarchy }}
                  </div>

                  <p class="subsystem-card-desc" v-if="sub.description" style="margin-top: 4px; margin-bottom: 8px; font-size: 0.9rem; color: #64748b;">
                      {{ sub.description }}
                  </p>

                  <div class="loop-variables" v-if="sub.allVariables.length > 0">
                      <span v-for="(vName, idx) in sub.allVariables" :key="idx" class="variable-tag" :style="{ backgroundColor: tint(sub.color, 0.12), borderColor: tint(sub.color, 0.28) }">
                          {{ vName }}
                      </span>
                  </div>
              </div>
            </div>

            <div v-else class="empty-subsystems-msg">
              <i class="fas fa-folder-open" style="margin-bottom: 8px; display: block; font-size: 1.5rem; opacity: 0.5;"></i>
              This variable does not belong to any subsystem.
            </div>

            <div class="subsystem-edit-wrapper" style="margin-top: 15px;">
                <details class="manage-subsystems-details">
                    <summary>
                        <i class="fas fa-edit"></i> Manage Subsystems
                    </summary>
                    <div class="custom-checkbox-list">
                        <div v-if="availableSubsystems.length === 0" class="empty-list-msg">
                            No subsystem detected.
                        </div>

                        <label v-for="sub in availableSubsystems" :key="sub.id" class="custom-checkbox-item">
                            <input
                                type="checkbox"
                                :value="sub.id"
                                v-model="selectedNodeInfo.subsystemIds"
                                @change="toggleVariableSubsystem"
                            />
                            <span class="checkbox-box"></span>
                            <span class="checkbox-label">{{ sub.name }}</span>
                        </label>
                    </div>
                </details>
            </div>
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
                    v-for="(variable, idx) in loop.variables"
                    :key="idx"
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

      <div v-if="showSubsystemModal" class="modal-overlay" @click="showSubsystemModal = false">
            <div class="modal-content" @click.stop>
                <h3>Create Subsystem</h3>
                <form @submit.prevent="confirmCreateSubsystem">
                    <div class="form-group">
                        <label>Subsystem Name:</label>
                        <input v-model="newSubsystem.name" type="text" required placeholder="Ex: Marketing..." />
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea v-model="newSubsystem.description" rows="3" placeholder="Description"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" @click="showSubsystemModal = false" class="btn-cancel">Cancel</button>
                        <button type="submit" class="btn-create">Create</button>
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

      <div v-if="showSettingsModal" class="modal-overlay" @click="showSettingsModal = false">
          <div class="modal-content settings-modal" @click.stop>
              <div class="settings-header">
                  <h3><i class="fas fa-cog"></i> Settings</h3>
                  <button class="close-button" @click="showSettingsModal = false">&times;</button>
              </div>
              <div class="settings-body">
                  <div class="setting-item">
                      <div class="setting-info">
                          <span class="setting-label">Theme</span>
                          <span class="setting-description">Switch between light and dark mode</span>
                      </div>
                      <label class="toggle-switch">
                          <input type="checkbox" :checked="currentTheme === 'light'" @change="toggleTheme" />
                          <span class="toggle-slider">
                              <i class="fas fa-sun"></i>
                              <i class="fas fa-moon"></i>
                          </span>
                      </label>
                  </div>
              </div>
          </div>
      </div>
    </div>
</template>

<script setup>
import {onMounted, ref, nextTick, watch, onBeforeUnmount, computed, reactive} from 'vue';
import {useRouter, useRoute, onBeforeRouteLeave} from 'vue-router';
import { useCLDCanvasViewModel } from '@/viewmodels/CLDCanvasViewModel';
import { useCLDDiagramViewModel } from '@/viewmodels/CLDDiagramViewModel';
import { useTheme } from '@/viewmodels/ThemeViewModel';
import { tint } from '@/theme/colors';

const router = useRouter();
const route = useRoute();
const isOwner = ref(false);

const { currentTheme, toggleTheme, initTheme } = useTheme();
initTheme();
const showSettingsModal = ref(false);

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
    formatSubsystems,
    findLayerDeep,
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

// UI State
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
const showSubsystemModal = ref(false);
const newSubsystem = reactive({ name: '', description: '', parentId: null });

const SUBSYSTEM_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c'];


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

const layers = ref([
    {
        id: 'global',
        name: 'Global',
        visible: true,
        expanded: false,
        subsystems: [],
        variableIds: []
    }
]);

const selectedLayerId = ref('global');
const editingLayerId = ref(null);
let layerCounter = 1;
let sublayerCounter = {};
diagramLayers.value = layers.value;

const broadcastSubsystems = () => {
    const globalLayer = layers.value.find(l => l.id === 'global');
    const cleanLayers = JSON.parse(JSON.stringify(globalLayer && globalLayer.subsystems ? globalLayer.subsystems : []));
    updateLayerCollab(cleanLayers);
};

// Layer Methods
const selectLayer = (layerId) => {
    selectedLayerId.value = layerId;
};





// Drag and Drop
const dragStart = (event, variable) => {
    event.dataTransfer.setData('application/json', JSON.stringify(variable));
    event.dataTransfer.effectAllowed = 'copy';
};

const dragStartRelationship = (event, rel) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ _type: 'relationship', ...rel }));
    event.dataTransfer.effectAllowed = 'copy';
};

const getVariableNameById = (id) => {
    let found = variables.value.find(v => String(v.id) === String(id));
    if (!found) found = nodes.value.find(n => String(n.id) === String(id));
    return found ? found.name : id;
};

const isNodeOnCanvas = (id) => {
    return nodes.value.some(n => String(n.id) === String(id));
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
            y: event.clientY - rect.top
        };
        const canvasPosition = network.value.DOMtoCanvas(domPosition);

        if (data._type === 'relationship') {
            const sourcePos = { x: canvasPosition.x - 80, y: canvasPosition.y - 30 };
            const targetPos = { x: canvasPosition.x + 80, y: canvasPosition.y + 30 };

            const sourceVarName = getVariableNameById(data.source_id);
            const targetVarName = getVariableNameById(data.target_id);

            await addReusableRelationship(
                data,
                sourcePos,
                targetPos,
                sourceVarName,
                targetVarName
            );
            return;
        }

        const variable = data;
        const currentDiagramId = diagram.value?.id || `new-temp`;
        saveNodePositions(currentDiagramId, {
            [variable.id]: { x: canvasPosition.x, y: canvasPosition.y }
        });

        await addNodeToCLD(variable, canvasPosition.x, canvasPosition.y);

        const layer = layers.value.find(l => l.id === selectedLayerId.value);
        if (layer) {
            layer.variableIds.push(variable.id);
        } else {
            for (const mainLayer of layers.value) {
                const sublayer = mainLayer.subsystems?.find(s => s.id === selectedLayerId.value);
                if (sublayer) {
                    sublayer.variableIds.push(variable.id);
                    break;
                }
            }
        }

        syncSubsystems();
    } catch (e) {
        console.error('Error adding node:', e);
    }
};

const saveDiagram = async () => {
    if (!network.value || !diagram.value) return;
    const positions = network.value.getPositions();
    saveNodePositions(diagram.value.id, positions);

    const globalLayer = layers.value.find(l => l.id === 'global');
    const rawSubsystems = globalLayer ? globalLayer.subsystems : [];
    diagram.value.subsystems = formatSubsystems(rawSubsystems);

    const success = await persistDiagram(nodes.value, edges.value);
    if (success) { console.log('Diagram Saved!'); }
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

// Delegates to VM — returns delay state for the selected edge, falls back to isDelayEnabled
const isDelayActive = computed(() => {
    if (hasSelection.value && network.value) {
        const selection = network.value.getSelection();
        if (selection.edges.length > 0 && selection.nodes.length === 0) {
            return getEdgeDelay(selection.edges[0]);
        }
    }
    return isDelayEnabled.value;
});

// Delegates to VM — toggles delay on the selected edge, or the global default
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




// Syncs layers.value into diagram.value.subsystems so the subsystems watcher never overwrites with stale data
const syncSubsystems = () => {
    const gl = layers.value.find(l => l.id === 'global');
    diagram.value.subsystems = formatSubsystems(gl ? gl.subsystems : []);
};

const deleteLayerDeep = (layerList, id) => {
    for (let i = 0; i < layerList.length; i++) {
        if (layerList[i].id === id) {
            layerList.splice(i, 1);
            return true;
        }
        if (layerList[i].subsystems) {
            if (deleteLayerDeep(layerList[i].subsystems, id)) return true;
        }
    }
    return false;
};


const flattenedLayers = computed(() => {
    const result = [];

    const globalLayer = layers.value.find(l => l.id === 'global');
    if (globalLayer) {
        const _vis = globalLayer.visible;
    }

    const flatten = (layerList, depth) => {
        layerList.forEach(l => {
            const _trackVis = l.visible;
            result.push({ layer: l, depth });
            if (l.expanded && l.subsystems && l.subsystems.length > 0) {
                flatten(l.subsystems, depth + 1);
            }
        });
    };

    flatten(layers.value, 0);
    return result;
});

const availableSubsystems = computed(() => {
    const list = [];
    const traverse = (layerList, prefix) => {
        layerList.forEach(l => {
            if (l.id !== 'global') {
                list.push({ id: l.id, name: `${prefix}${l.name}` });
            }
            if (l.subsystems) {
                const newPrefix = l.id === 'global' ? '' : prefix + '↳ ';
                traverse(l.subsystems, newPrefix);
            }
        });
    };
    traverse(layers.value, '');
    return list;
});

const activeNodeSubsystems = computed(() => {
    if (!selectedNodeInfo.value || !selectedNodeInfo.value.subsystemIds) return [];

    const activeIds = selectedNodeInfo.value.subsystemIds;
    const result = [];

    const getPath = (targetId) => {
        let path = [];
        const search = (list, currentPath) => {
            for (const l of list) {
                if (l.id === targetId) {
                    if (l.id !== 'global') path = [...currentPath, l.name];
                    return true;
                }
                if (l.subsystems && search(l.subsystems, l.id !== 'global' ? [...currentPath, l.name] : currentPath)) {
                    return true;
                }
            }
            return false;
        };
        search(layers.value, []);
        return path.join(' ▸ ');
    };

    activeIds.forEach(subId => {
        const layer = findLayerDeep(layers.value, subId);
        if (layer) {
            const allVarNames = (layer.variableIds || []).map(id => {
                const node = nodes.value.find(n => n.id === id);
                return node ? node.name : 'Unknown';
            });

            result.push({
                id: layer.id,
                name: layer.name,
                hierarchy: getPath(layer.id) || layer.name,
                description: layer.description,
                color: layer.color || '#3498db',
                allVariables: allVarNames
            });
        }
    });
    return result;
});
const openCreateSubsystemModal = (parentId = null) => {
    newSubsystem.name = '';
    newSubsystem.description = '';
    newSubsystem.parentId = parentId;
    showSubsystemModal.value = true;
};

const toggleLayerExpanded = (layerId) => {
    const layer = findLayerDeep(layers.value, layerId);
    if (layer) layer.expanded = !layer.expanded;
};

const toggleLayerVisibility = (layerId) => {
    const layer = findLayerDeep(layers.value, layerId);
    if (!layer) return;

    const newState = !layer.visible;

    const toggleRecursively = (l, state) => {
        l.visible = state;
        if (l.subsystems) l.subsystems.forEach(sub => toggleRecursively(sub, state));
    };

    toggleRecursively(layer, newState);
    updateVisibility();
};


const confirmCreateSubsystem = () => {
    if (!newSubsystem.name.trim()) return;

    if (newSubsystem.parentId) {
        const parent = findLayerDeep(layers.value, newSubsystem.parentId);
        if (parent) {
            const availableColors = SUBSYSTEM_COLORS.filter(c => c !== parent.color);
            const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];

            if (!sublayerCounter[parent.id]) sublayerCounter[parent.id] = 1;
            if (!parent.subsystems) parent.subsystems = [];

            parent.subsystems.push({
                id: `${parent.id}-sub-${Date.now()}`,
                name: newSubsystem.name,
                description: newSubsystem.description,
                color: randomColor,
                visible: true,
                expanded: true,
                variableIds: [],
                subsystems: []
            });
            parent.expanded = true;
        }
    } else {
        const color = SUBSYSTEM_COLORS[layerCounter % SUBSYSTEM_COLORS.length];
        const globalLayer = layers.value.find(l => l.id === 'global');
        if (globalLayer) {
            if (!globalLayer.subsystems) globalLayer.subsystems = [];
            globalLayer.subsystems.push({
                id: `subsystem-${Date.now()}`,
                name: newSubsystem.name,
                description: newSubsystem.description,
                color: color,
                visible: true,
                expanded: false,
                variableIds: [],
                subsystems: []
            });
            globalLayer.expanded = true;
        }
        layerCounter++;
    }
    syncSubsystems();
    broadcastSubsystems();
    showSubsystemModal.value = false;
    updateVisibility();
};

const toggleVariableSubsystem = () => {
    const nodeId = selectedNodeInfo.value.nodeId;
    const selectedIds = selectedNodeInfo.value.subsystemIds || [];

    const updateNodeInLayers = (layerList) => {
        layerList.forEach(l => {
            if (l.id !== 'global') {
                const shouldBeInLayer = selectedIds.includes(l.id);
                const isInLayer = l.variableIds.includes(nodeId);

                if (shouldBeInLayer && !isInLayer) l.variableIds.push(nodeId);
                if (!shouldBeInLayer && isInLayer) l.variableIds = l.variableIds.filter(id => id !== nodeId);
            }
            if (l.subsystems) updateNodeInLayers(l.subsystems);
        });
    };

    updateNodeInLayers(layers.value);
    syncSubsystems();
    updateLayerCollab(layers.value.filter(l => l.id !== 'global'));
    updateVisibility();
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

watch(() => diagram.value?.subsystems, (newSubsystems) => {
    if (newSubsystems) {
        let colorCounter = 0;

        // Persisted/collaborative subsystem data intentionally excludes UI-only state.
        // Rebuild the canonical tree while preserving local colors, visibility, and
        // expansion flags so a remote update does not collapse or recolor the panel.
        const mergeUIState = (incomingList, currentList) => {
            return incomingList.map(incomingLayer => {
                const existingLayer = findLayerDeep(currentList, incomingLayer.id);

                const assignedColor = existingLayer?.color || incomingLayer.color || SUBSYSTEM_COLORS[colorCounter % SUBSYSTEM_COLORS.length];

                if (!existingLayer && !incomingLayer.color) {
                    colorCounter++;
                }

                return {
                    ...incomingLayer,
                    color: assignedColor,
                    visible: existingLayer ? existingLayer.visible : true,
                    expanded: existingLayer ? existingLayer.expanded : false,
                    subsystems: incomingLayer.subsystems ? mergeUIState(incomingLayer.subsystems, currentList) : []
                };
            });
        };

        const existingGlobal = layers.value.find(l => l.id === 'global') || {
            id: 'global', name: 'Global', visible: true, expanded: true, subsystems: [], variableIds: []
        };

        existingGlobal.subsystems = mergeUIState(newSubsystems, layers.value);

        layers.value = [existingGlobal];
        diagramLayers.value = layers.value;
        updateVisibility();
    }
}, { deep: true, immediate: true });

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

<style>
:root {
    --bg-primary: #1e1e1e;
    --bg-secondary: #252526;
    --bg-tertiary: #2d2d2d;
    --bg-hover: #3d3d3d;
    --bg-active: #4d4d4d;
    --border-color: #3d3d3d;
    --border-light: #4d4d4d;
    --text-primary: #ffffff;
    --text-secondary: #cccccc;
    --text-muted: #9ca3af;
    --accent-primary: #0e639c;
    --accent-hover: #1177bb;
    --danger-bg: #5a1d1d;
    --danger-text: #f48771;
    --canvas-bg: #1e1e1e;
}

[data-theme="light"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f3f4f6;
    --bg-tertiary: #e5e7eb;
    --bg-hover: #d1d5db;
    --bg-active: #9ca3af;
    --border-color: #d1d5db;
    --border-light: #e5e7eb;
    --text-primary: #111827;
    --text-secondary: #374151;
    --text-muted: #6b7280;
    --accent-primary: #2563eb;
    --accent-hover: #3b82f6;
    --danger-bg: #fef2f2;
    --danger-text: #dc2626;
    --canvas-bg: #f9fafb;
}

</style>

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
    background-color: var(--bg-primary);
    color: var(--text-primary);
    overflow: hidden;
}

.top-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    padding: 8px 16px;
    min-height: 50px;
    z-index: 100;
    flex-wrap: wrap;
    gap: 4px;
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

.tool-btn {
    background-color: var(--bg-hover);
    color: var(--text-secondary);
    border: 1px solid var(--border-light);
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    white-space: nowrap;
}

.tool-btn:hover {
    background-color: var(--bg-active);
    color: var(--text-primary);
}

.tool-btn.primary {
    background-color: var(--accent-primary);
    border-color: var(--accent-hover);
    color: #ffffff;
}

.tool-btn.primary:hover {
    background-color: var(--accent-hover);
}

.toolbar-divider {
    width: 1px;
    height: 24px;
    background-color: var(--border-light);
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
    background-color: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    width: 280px;
    min-width: 40px;
    transition: width 0.3s, min-width 0.3s;
    z-index: 50;
}

.left-panel.collapsed {
    width: 40px;
    min-width: 40px;
}

.panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background-color: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    color: var(--text-secondary);
}

.panel-header:hover {
    background-color: var(--bg-hover);
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
    background-color: var(--accent-primary);
    color: #ffffff;
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
    background-color: var(--accent-hover);
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

.draggable-item {
    background-color: var(--bg-tertiary);
    padding: 8px 12px;
    border-radius: 4px;
    cursor: grab;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    transition: background 0.2s;
}

.draggable-item:hover {
    background-color: var(--bg-hover);
}

.draggable-item:active {
    cursor: grabbing;
}

.loading-spinner {
    padding: 12px;
    text-align: center;
    font-size: 13px;
}

.canvas-area {
    flex: 1;
    position: relative;
    background-color: var(--canvas-bg);
    background-image:
        linear-gradient(rgba(128, 128, 128, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(128, 128, 128, 0.08) 1px, transparent 1px);
    background-size: 20px 20px;
}

.canvas-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: var(--text-secondary);
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
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    width: min(320px, calc(100vw - 32px));
    max-height: 400px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    transition: max-height 0.3s, width 0.3s;
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
    background-color: var(--bg-tertiary);
    border-radius: 8px 8px 0 0;
    cursor: pointer;
}

.layers-panel .panel-content {
    max-height: 350px;
    overflow-y: auto;
    padding: 12px;
    background-color: var(--bg-secondary);
    border-radius: 0 0 8px 8px;
}

.layers-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
}

.add-layer-btn {
    background-color: var(--accent-primary);
    color: #ffffff;
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
    background-color: var(--accent-hover);
}

.layers-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.layer-item {
    background-color: var(--bg-tertiary);
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.2s;
}

.layer-item:hover {
    background-color: var(--bg-hover);
}

.layer-item.active {
    background-color: var(--accent-primary);
}

.layer-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-primary);
}

.expand-btn,
.layer-visibility-btn {
    background: transparent;
    color: var(--text-secondary);
    border: none;
    cursor: pointer;
    padding: 4px;
    transition: color 0.2s;
}

.expand-btn:hover,
.layer-visibility-btn:hover {
    color: var(--text-primary);
}

.expand-placeholder {
    width: 20px;
}

.layer-name,
.layer-name-input {
    flex: 1;
    font-size: 13px;
    color: var(--text-primary);
}

.global-layer .layer-name,
.global-layer .layer-name-input {
    color: #000000;
}

.global-layer.active .layer-name,
.global-layer.active .layer-name-input {
    color: #ffffff;
}

.global-layer .layer-visibility-btn,
.global-layer .expand-btn {
    color: #000000;
}

.global-layer.active .layer-visibility-btn,
.global-layer.active .expand-btn {
    color: #ffffff;
}

.global-layer .layer-visibility-btn:hover,
.global-layer .expand-btn:hover {
    color: inherit;
}

.layer-name-input {
    background-color: var(--bg-primary);
    border: 1px solid var(--accent-primary);
    padding: 4px;
    border-radius: 2px;
    color: var(--text-primary);
}

.layer-controls {
    display: flex;
    gap: 4px;
}

.add-sublayer-btn,
.delete-layer-btn {
    background-color: transparent;
    color: var(--text-primary);
    border: none;
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
}

.add-sublayer-btn:hover {
    background-color: var(--accent-primary);
    color: var(--text-primary);
}

.delete-layer-btn:hover {
    background-color: #a12d2d;
    color: var(--text-primary);
}

.cld-legend-canvas {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  max-height: 180px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  color: var(--text-secondary);
}

.legend-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
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
  border: 1px solid rgba(128,128,128,0.3);
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
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 90%;
  max-width: min(96vw, 980px);
  max-height: 80vh;
  overflow-y: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
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
  border-bottom: 1px solid var(--border-color);
}

.popup-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--text-primary);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--text-muted);
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
  background: var(--bg-tertiary);
  border-left: 4px solid #42b983;
}

.loop-item.reinforcing {
  border-left-color: #e74c3c;
}

.loop-item.balancing {
  border-left-color: var(--accent-primary);
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
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
}

.loop-item.balancing .loop-badge {
  background: rgba(52, 152, 219, 0.15);
  color: #3498db;
}

.loop-variables {
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.variable-tag {
  background: var(--bg-hover);
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
  background: var(--bg-tertiary);
  transition: transform 0.2s;
}

.archetype-item:hover {
  transform: translateX(5px);
  background: var(--bg-hover);
}

.archetype-name {
  font-weight: 500;
  color: var(--text-primary);
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
  border-bottom: 1px solid var(--border-color);
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
.loop-item { padding: 10px; border-left: 4px solid var(--border-color); border-radius: 10px; background: var(--bg-tertiary); }
.loop-badge { display: inline-block; color: var(--text-primary); padding: 4px 10px; border-radius: 8px; font-weight: 700; }
.variable-tag { display: inline-block; margin: 2px 6px 0 0; padding: 2px 8px; border: 2px solid var(--border-color); border-radius: 999px; background: var(--bg-tertiary); color: var(--text-primary); }

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

  border: 2px solid var(--border-color);
  border-left: 6px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: 18px;
  padding: 8px 20px;
  min-height: 38px;
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
  box-shadow: inset 0 0 0 3px var(--bg-primary);
  flex: 0 0 16px;
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
  color: var(--text-primary);
  gap: 10px;
  margin-bottom: 6px;
  justify-content: center;
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
  border: 2px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-tertiary);
}
.variable-chip {
  display: inline-block;
  font-size: 0.85rem;
  padding: 2px 8px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
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
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 24px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    max-height: 80vh;
    overflow-y: auto;
}

.modal-content h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: var(--text-primary);
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    color: var(--text-secondary);
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 8px 12px;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--accent-primary);
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
    background-color: var(--bg-hover);
    color: var(--text-secondary);
}

.btn-cancel:hover {
    background-color: var(--bg-active);
}

.btn-create {
    background-color: var(--accent-primary);
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
    background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
    background: var(--bg-hover);
    border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--bg-active);
}

.tool-btn.active {
    background-color: var(--accent-primary);
    color: var(--text-primary);
    border-color: var(--accent-hover);
}

.diagram-title-input {
    background: transparent;
    border: 2px solid transparent;
    border-radius: 6px;
    outline: none;
    box-shadow: none;

    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    font-family: inherit;

    padding: 4px 8px;
    margin: 0;
    width: auto;
    min-width: 150px;
    max-width: 100%;

    transition: all 0.2s ease-in-out;
}

.diagram-title-input:hover {
    background-color: rgba(128, 128, 128, 0.1);
    cursor: text;
}

.diagram-title-input:focus {
    background-color: var(--bg-tertiary);
    border-bottom: 2px solid #42b883;
    border-radius: 6px 6px 0 0;
    color: var(--text-primary);
}

.btn-history {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: 0.2s;
}
.btn-history:hover {
    background-color: var(--bg-hover);
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
    background: var(--bg-tertiary);
    width: 500px;
    max-width: 90%;
    max-height: 80vh;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    border: 1px solid var(--border-color);
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
}

.history-header h2 { margin: 0; font-size: 1.25rem; color: var(--text-primary); }

.close-btn {
    background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted);
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
    border-bottom: 1px dashed var(--border-color);
}

.history-item:last-child { border-bottom: none; }

.history-meta {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 8px;
}

.history-meta strong { color: var(--text-primary); }

.history-summary {
    font-family: monospace;
    background-color: var(--bg-tertiary);
    padding: 10px;
    border-radius: 6px;
    white-space: pre-wrap;
    font-size: 0.9rem;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}

.history-loading, .history-empty {
    padding: 40px; text-align: center; color: var(--text-muted);
}

.history-line {
    padding: 4px 0;
    line-height: 1.5;
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

.controls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
}

.control-item {
    padding: 10px;
    border-left: 4px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
}

.control-item i {
    color: #42b983;
    width: 15px;
}

/* Archetype list styling inside the modal */
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


.toolbar-info {
  font-weight: 700;
  margin-left: 0.5rem;
}

.empty-subsystems-msg {
    background: var(--bg-tertiary);
    color: var(--text-muted);
    padding: 20px 12px;
    border-radius: 8px;
    text-align: center;
    font-size: 0.95rem;
    border: 1px dashed var(--border-color);
    margin-top: 10px;
}

/* Redesigned Management Accordion */
.manage-subsystems-details {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
}

.manage-subsystems-details summary {
    cursor: pointer;
    font-size: 0.95rem;
    color: var(--text-primary);
    font-weight: 600;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    transition: background 0.2s;
}

.manage-subsystems-details summary::-webkit-details-marker { display: none; }
.manage-subsystems-details summary:hover { background: var(--bg-hover); }

/* Custom Checkbox List */
.custom-checkbox-list {
    max-height: 200px;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-top: 1px solid var(--border-color);
}

.custom-checkbox-item {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 6px;
    transition: background 0.2s;
}

.custom-checkbox-item:hover {
    background: var(--bg-hover);
}

.custom-checkbox-item input[type="checkbox"] {
    display: none;
}

.checkbox-box {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    background: var(--bg-primary);
    flex-shrink: 0;
}

.custom-checkbox-item input[type="checkbox"]:checked + .checkbox-box {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
}

.custom-checkbox-item input[type="checkbox"]:checked + .checkbox-box::after {
    content: '\f00c';
    font-family: 'Font Awesome 5 Free';
    font-weight: 900;
    color: white;
    font-size: 11px;
}

.checkbox-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    user-select: none;
    font-weight: 500;
}

.empty-list-msg {
    font-size: 13px;
    color: var(--text-muted);
    font-style: italic;
    text-align: center;
    padding: 10px 0;
}

.relationship-item {
    border-left: 3px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.relationship-arrow-icon {
    color: var(--text-muted);
    font-size: 11px;
}

.relationship-source-name,
.relationship-target-name {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
}

.relationship-source-name.on-canvas,
.relationship-target-name.on-canvas {
    font-weight: 700;
    color: var(--text-primary);
}

.relationship-connector {
    color: var(--text-muted);
    font-size: 12px;
}

.relationship-polarity {
    font-size: 11px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    margin-left: auto;
}

.relationship-polarity.positive {
    color: #10b981;
    background-color: rgba(16, 185, 129, 0.15);
}

.relationship-polarity.negative {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.15);
}

.relationship-group {
    margin-bottom: 8px;
}

.relationship-group-header {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 4px 8px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.relationship-group-header i {
    font-size: 11px;
    color: var(--text-muted);
}

.relationship-group-count {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-muted);
    background-color: var(--bg-hover);
    padding: 0 6px;
    border-radius: 8px;
    font-weight: 600;
}

.relationship-delay {
    font-weight: 700;
    font-size: 11px;
    color: var(--text-muted);
    margin-left: 4px;
}

.empty-relationships-msg {
    padding: 12px;
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
    font-style: italic;
}

.relationships-toggle-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
}

/* Settings Modal */
.settings-modal {
    max-width: 400px;
}

.settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
}

.settings-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.settings-body {
    padding: 20px;
}

.setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.setting-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.setting-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
}

.setting-description {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.toggle-switch {
    position: relative;
    display: inline-block;
    width: 52px;
    height: 26px;
    flex-shrink: 0;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: var(--bg-hover);
    border-radius: 26px;
    transition: 0.3s;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 6px;
}

.toggle-slider .fa-sun {
    color: #f59e0b;
    font-size: 12px;
}

.toggle-slider .fa-moon {
    color: #818cf8;
    font-size: 12px;
}

.toggle-switch input:checked + .toggle-slider {
    background-color: var(--accent-primary);
}

.toggle-slider::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    left: 3px;
    bottom: 3px;
    background-color: #ffffff;
    border-radius: 50%;
    transition: 0.3s;
    z-index: 1;
}

.toggle-switch input:checked + .toggle-slider::before {
    transform: translateX(26px);
}

/* Responsive styles */
@media (max-width: 1024px) {
    .left-panel {
        width: 240px;
    }

    .top-toolbar {
        padding: 6px 10px;
    }

    .tool-btn {
        padding: 5px 8px;
        font-size: 12px;
    }

    .toolbar-center .tool-btn span,
    .toolbar-right .btn-history span,
    .toolbar-right .tool-btn.primary span {
        display: none;
    }

    .diagram-title-input {
        min-width: 100px;
        font-size: 1.1rem;
    }
}

@media (max-width: 768px) {
    .left-panel {
        width: 200px;
    }

    .left-panel .panel-content {
        padding: 10px;
    }

    .layers-panel {
        width: min(280px, calc(100vw - 24px));
        right: 8px;
        bottom: 8px;
    }

    .layers-panel .panel-content {
        padding: 8px;
    }

    .top-toolbar {
        padding: 4px 8px;
        min-height: 44px;
        overflow-x: auto;
        overflow-y: hidden;
        flex-wrap: nowrap;
    }

    .toolbar-center {
        flex-shrink: 0;
        gap: 4px;
    }

    .toolbar-left,
    .toolbar-right {
        flex-shrink: 0;
        flex-wrap: nowrap;
    }

    .diagram-title-input {
        min-width: 80px;
        font-size: 1rem;
    }

    .toolbar-right .btn-history:not(:first-child) {
        display: none;
    }
}

@media (max-width: 480px) {
    .left-panel {
        width: 160px;
    }

    .left-panel.collapsed {
        width: 36px;
    }

    .left-panel .panel-content {
        padding: 6px;
    }

    .draggable-item {
        padding: 6px 8px;
        font-size: 11px;
    }

    .layers-panel {
        width: calc(100vw - 16px);
        right: 8px;
        bottom: 8px;
    }

    .top-toolbar {
        padding: 4px 6px;
        overflow-x: auto;
        overflow-y: hidden;
        flex-wrap: nowrap;
    }

    .toolbar-center {
        flex-shrink: 0;
        gap: 2px;
    }

    .toolbar-left,
    .toolbar-right {
        flex-shrink: 0;
    }

    .tool-btn {
        padding: 4px 6px;
        font-size: 11px;
    }
}

</style>
