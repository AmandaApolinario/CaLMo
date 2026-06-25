import { computed, reactive, ref, watch } from 'vue';

const SUBSYSTEM_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c'];

const createGlobalLayer = () => ({
  id: 'global',
  name: 'Global',
  visible: true,
  expanded: false,
  subsystems: [],
  variableIds: [],
});

export const findLayerDeep = (layerList, id) => {
  for (const layer of layerList) {
    if (layer.id === id) return layer;
    if (layer.subsystems) {
      const found = findLayerDeep(layer.subsystems, id);
      if (found) return found;
    }
  }
  return null;
};

export const formatSubsystems = (layerList) => {
  return layerList.map(layer => ({
    id: layer.id,
    name: layer.name,
    description: layer.description || '',
    variableIds: layer.variableIds || [],
    subsystems: layer.subsystems ? formatSubsystems(layer.subsystems) : [],
  }));
};

export function useCLDSubsystemsViewModel({
  diagram,
  nodes,
  selectedNodeInfo,
  diagramLayers,
  updateVisibility,
  updateLayerCollab,
}) {
  const layers = ref([createGlobalLayer()]);
  const selectedLayerId = ref('global');
  const editingSubsystemId = ref(null);
  const showSubsystemModal = ref(false);
  const newSubsystem = reactive({ name: '', description: '', parentId: null });
  let layerCounter = 1;

  const syncDiagramLayers = () => {
    diagramLayers.value = layers.value;
  };

  const rootSubsystems = () => {
    const globalLayer = layers.value.find(layer => layer.id === 'global');
    return globalLayer?.subsystems || [];
  };

  const syncSubsystems = () => {
    if (!diagram.value) return;
    diagram.value.subsystems = formatSubsystems(rootSubsystems());
  };

  const broadcastSubsystems = () => {
    updateLayerCollab(JSON.parse(JSON.stringify(rootSubsystems())));
  };

  const selectLayer = (layerId) => {
    selectedLayerId.value = layerId;
  };

  const assignVariableToSelectedLayer = (variableId) => {
    const selectedLayer = findLayerDeep(layers.value, selectedLayerId.value);
    if (!selectedLayer) return;

    if (!selectedLayer.variableIds.includes(variableId)) {
      selectedLayer.variableIds.push(variableId);
    }

    syncSubsystems();
    updateVisibility();
  };

  const deleteLayerDeep = (layerList, id) => {
    for (let index = 0; index < layerList.length; index++) {
      if (layerList[index].id === id) {
        layerList.splice(index, 1);
        return true;
      }
      if (layerList[index].subsystems && deleteLayerDeep(layerList[index].subsystems, id)) {
        return true;
      }
    }
    return false;
  };

  const deleteSubsystem = (layerId) => {
    if (!deleteLayerDeep(layers.value, layerId)) return;

    if (selectedLayerId.value === layerId) {
      selectedLayerId.value = 'global';
    }

    syncSubsystems();
    broadcastSubsystems();
    syncDiagramLayers();
    updateVisibility();
  };

  const flattenedLayers = computed(() => {
    const result = [];

    const flatten = (layerList, depth) => {
      layerList.forEach(layer => {
        result.push({ layer, depth });
        if (layer.expanded && layer.subsystems && layer.subsystems.length > 0) {
          flatten(layer.subsystems, depth + 1);
        }
      });
    };

    flatten(layers.value, 0);
    return result;
  });

  const availableSubsystems = computed(() => {
    const list = [];
    const traverse = (layerList, prefix) => {
      layerList.forEach(layer => {
        if (layer.id !== 'global') {
          list.push({ id: layer.id, name: `${prefix}${layer.name}` });
        }
        if (layer.subsystems) {
          const newPrefix = layer.id === 'global' ? '' : `${prefix}↳ `;
          traverse(layer.subsystems, newPrefix);
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
      const search = (layerList, currentPath) => {
        for (const layer of layerList) {
          if (layer.id === targetId) {
            if (layer.id !== 'global') path = [...currentPath, layer.name];
            return true;
          }
          if (
            layer.subsystems &&
            search(layer.subsystems, layer.id !== 'global' ? [...currentPath, layer.name] : currentPath)
          ) {
            return true;
          }
        }
        return false;
      };
      search(layers.value, []);
      return path.join(' ▸ ');
    };

    activeIds.forEach(subsystemId => {
      const layer = findLayerDeep(layers.value, subsystemId);
      if (!layer) return;

      const allVariables = (layer.variableIds || []).map(id => {
        const node = nodes.value.find(item => String(item.id) === String(id));
        return node ? node.name : 'Unknown';
      });

      result.push({
        id: layer.id,
        name: layer.name,
        hierarchy: getPath(layer.id) || layer.name,
        description: layer.description,
        color: layer.color || '#3498db',
        allVariables,
      });
    });

    return result;
  });

  const openCreateSubsystemModal = (parentId = null) => {
    editingSubsystemId.value = null;
    newSubsystem.name = '';
    newSubsystem.description = '';
    newSubsystem.parentId = parentId;
    showSubsystemModal.value = true;
  };

  const openEditSubsystemModal = (subsystemId) => {
    const subsystem = findLayerDeep(layers.value, subsystemId);
    if (!subsystem || subsystem.id === 'global') return;

    editingSubsystemId.value = subsystem.id;
    newSubsystem.name = subsystem.name || '';
    newSubsystem.description = subsystem.description || '';
    newSubsystem.parentId = null;
    showSubsystemModal.value = true;
  };

  const closeCreateSubsystemModal = () => {
    editingSubsystemId.value = null;
    showSubsystemModal.value = false;
  };

  const toggleLayerExpanded = (layerId) => {
    const layer = findLayerDeep(layers.value, layerId);
    if (layer) layer.expanded = !layer.expanded;
  };

  const toggleLayerVisibility = (layerId) => {
    const layer = findLayerDeep(layers.value, layerId);
    if (!layer) return;

    const newState = !layer.visible;
    const toggleRecursively = (item, state) => {
      item.visible = state;
      if (item.subsystems) item.subsystems.forEach(subsystem => toggleRecursively(subsystem, state));
    };

    toggleRecursively(layer, newState);
    updateVisibility();
  };

  const confirmCreateSubsystem = () => {
    if (!newSubsystem.name.trim()) return;

    if (editingSubsystemId.value) {
      const subsystem = findLayerDeep(layers.value, editingSubsystemId.value);
      if (!subsystem) return;

      subsystem.name = newSubsystem.name.trim();
      subsystem.description = newSubsystem.description || '';
      syncSubsystems();
      broadcastSubsystems();
      closeCreateSubsystemModal();
      updateVisibility();
      return;
    }

    if (newSubsystem.parentId) {
      const parent = findLayerDeep(layers.value, newSubsystem.parentId);
      if (parent) {
        const availableColors = SUBSYSTEM_COLORS.filter(color => color !== parent.color);
        const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];

        if (!parent.subsystems) parent.subsystems = [];

        parent.subsystems.push({
          id: `${parent.id}-sub-${Date.now()}`,
          name: newSubsystem.name,
          description: newSubsystem.description,
          color: randomColor,
          visible: true,
          expanded: true,
          variableIds: [],
          subsystems: [],
        });
        parent.expanded = true;
      }
    } else {
      const color = SUBSYSTEM_COLORS[layerCounter % SUBSYSTEM_COLORS.length];
      const globalLayer = layers.value.find(layer => layer.id === 'global');
      if (globalLayer) {
        if (!globalLayer.subsystems) globalLayer.subsystems = [];
        globalLayer.subsystems.push({
          id: `subsystem-${Date.now()}`,
          name: newSubsystem.name,
          description: newSubsystem.description,
          color,
          visible: true,
          expanded: false,
          variableIds: [],
          subsystems: [],
        });
        globalLayer.expanded = true;
      }
      layerCounter++;
    }

    syncSubsystems();
    broadcastSubsystems();
    closeCreateSubsystemModal();
    updateVisibility();
  };

  const setSelectedNodeSubsystemIds = (subsystemIds) => {
    if (!selectedNodeInfo.value) return;
    selectedNodeInfo.value.subsystemIds = subsystemIds;
    toggleVariableSubsystem();
  };

  const toggleVariableSubsystem = () => {
    const nodeId = selectedNodeInfo.value?.nodeId;
    const selectedIds = selectedNodeInfo.value?.subsystemIds || [];
    if (!nodeId) return;

    const updateNodeInLayers = (layerList) => {
      layerList.forEach(layer => {
        if (layer.id !== 'global') {
          const shouldBeInLayer = selectedIds.includes(layer.id);
          const isInLayer = layer.variableIds.includes(nodeId);

          if (shouldBeInLayer && !isInLayer) layer.variableIds.push(nodeId);
          if (!shouldBeInLayer && isInLayer) layer.variableIds = layer.variableIds.filter(id => id !== nodeId);
        }
        if (layer.subsystems) updateNodeInLayers(layer.subsystems);
      });
    };

    updateNodeInLayers(layers.value);
    syncSubsystems();
    broadcastSubsystems();
    updateVisibility();
  };

  const hydrateSubsystemsFromDiagram = (newSubsystems) => {
    if (!newSubsystems) return;

    let colorCounter = 0;
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
          subsystems: incomingLayer.subsystems ? mergeUIState(incomingLayer.subsystems, currentList) : [],
        };
      });
    };

    const existingGlobal = layers.value.find(layer => layer.id === 'global') || createGlobalLayer();
    existingGlobal.subsystems = mergeUIState(newSubsystems, layers.value);

    layers.value = [existingGlobal];
    syncDiagramLayers();
    updateVisibility();
  };

  watch(() => diagram.value?.subsystems, hydrateSubsystemsFromDiagram, { deep: true, immediate: true });
  syncDiagramLayers();

  const subsystemModalTitle = computed(() => (
    editingSubsystemId.value ? 'Edit Subsystem' : 'Create Subsystem'
  ));

  const subsystemModalSubmitLabel = computed(() => (
    editingSubsystemId.value ? 'Save Changes' : 'Create'
  ));

  return {
    layers,
    selectedLayerId,
    editingSubsystemId,
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
    broadcastSubsystems,
    openCreateSubsystemModal,
    openEditSubsystemModal,
    closeCreateSubsystemModal,
    toggleLayerExpanded,
    toggleLayerVisibility,
    confirmCreateSubsystem,
    setSelectedNodeSubsystemIds,
    toggleVariableSubsystem,
    formatSubsystems,
    findLayerDeep,
  };
}
