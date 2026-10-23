import { ref, reactive, computed } from 'vue';
import CLDService from '@/services/cld.service';
import {FileParserService} from "@/services/fileParser.service.js";
import ApiService from "@/services/api.service.js";
import {FileExportService} from "@/services/fileExport.service.js";
import {parseBoolean} from "@/services/parser/parserUtils.js";
import JSZip from "jszip";

const normalizeName = value => String(value || '').trim().toLowerCase();

const normalizePolarity = value => {
  const polarity = String(value || '').trim().toLowerCase();
  return ['-', '-1', 'negative'].includes(polarity) ? 'NEGATIVE' : 'POSITIVE';
};

const getEdgeDelay = edge => parseBoolean(
  edge?.has_delay ?? edge?.delay ?? edge?.delay_mark,
  false
);

const visitSubsystems = (subsystems, visitor) => {
  (subsystems || []).forEach(subsystem => {
    visitor(subsystem);
    visitSubsystems(subsystem.subsystems || [], visitor);
  });
};

const normalizeSubsystems = (subsystems, resolveVariableId) => (
  (subsystems || []).flatMap(subsystem => {
    const children = subsystem.subsystems || [];
    if (subsystem.id === 'global') return normalizeSubsystems(children, resolveVariableId);

    const variableIds = (subsystem.variableIds || subsystem.variables || [])
      .map(reference => resolveVariableId(reference))
      .filter(Boolean);

    const normalized = {
      name: subsystem.name || 'Unnamed',
      description: subsystem.description || '',
      variableIds: [...new Set(variableIds)],
      subsystem: normalizeSubsystems(children, resolveVariableId)
    };

    if (subsystem.id) normalized.id = subsystem.id;
    return [normalized];
  })
);

const formatPortableSubsystems = (subsystems, idToNameMap) => (
  (subsystems || []).map(subsystem => ({
    ...(subsystem.id ? { id: subsystem.id } : {}),
    name: subsystem.name || 'Unnamed',
    description: subsystem.description || '',
    variableIds: (subsystem.variableIds || []).map(id => idToNameMap[id] || id),
    subsystem: formatPortableSubsystems(subsystem.subsystem || [], idToNameMap)
  }))
);

export function useCLDListViewModel() {
  const diagrams = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const successMessage = ref('');
  const isImporting = ref(false);
  const selectedDiagrams = ref([]);

  const cldSchema = {
    xmlSelectors: {
      diagram: 'header',
      nodes: 'aux, stock, flow',
      edges: 'connector',
      groups: 'model > variables > group'
    },
    fields: {
      diagram: {
        title: { xmlNode: 'name', default: 'Imported CLD' },
        description: { xmlNode: 'doc', default: '' }
      },
      nodes: {
        name: { required: true, xmlAttr: 'name' },
        description: { xmlNode: 'doc', default: '' }
      },
      edges: {
        source: { required: true, xmlAttr: 'from' },
        target: { required: true, xmlAttr: 'to' },
        polarity: { required: false, default: 'positive', xmlAttr: 'polarity' },
        has_delay: {
          required: false,
          default: false,
          xmlAttr: 'delay_mark',
          aliases: ['delay', 'delay_mark']
        }
      }
    }
  };
  
  const state = reactive({
    filter: '',
    sorting: 'newest',
  });

  const filteredDiagrams = computed(() => {
    if (!state.filter) return diagrams.value;
    
    return diagrams.value.filter(diagram => 
      diagram.title.toLowerCase().includes(state.filter.toLowerCase()) ||
      diagram.description.toLowerCase().includes(state.filter.toLowerCase())
    );
  });

  const sortedDiagrams = computed(() => {
    const diagramsToSort = [...filteredDiagrams.value];
    
    switch (state.sorting) {
      case 'newest':
        return diagramsToSort.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return diagramsToSort.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'alphabetical':
        return diagramsToSort.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return diagramsToSort;
    }
  });

  async function fetchDiagrams() {
    loading.value = true;
    error.value = null;
    
    try {
      diagrams.value = await CLDService.getAllCLDs();
    } catch (err) {
      error.value = err.message || 'Failed to fetch diagrams';
    } finally {
      loading.value = false;
    }
  }

  async function deleteDiagram(id) {
    loading.value = true;
    error.value = null;
    
    try {
      await CLDService.deleteCLD(id);
      diagrams.value = diagrams.value.filter(diagram => diagram.id !== id);
    } catch (err) {
      error.value = err.message || 'Failed to delete diagram';
    } finally {
      loading.value = false;
    }
  }

  function setFilter(filter) {
    state.filter = filter;
  }

  function setSorting(sorting) {
    state.sorting = sorting;
  }

  const importCLDFromFile = async (file) => {
    isImporting.value = true;
    error.value = null;
    successMessage.value = '';

    try {
      const rawData = await FileParserService.parseFile(file, cldSchema);

      const rawNodes = Array.isArray(rawData.nodes) ? rawData.nodes : [];
      const rawEdges = Array.isArray(rawData.edges) ? rawData.edges : [];
      const rawSubsystems = Array.isArray(rawData.subsystems) ? rawData.subsystems : [];

      let varsResponse = await ApiService.get('variables');
      let existingVarsArray = varsResponse.data || [];
      let existingVars = new Map(existingVarsArray.map(v => [normalizeName(v.name), v.id]));
      let existingVarIds = new Set(existingVarsArray.map(v => String(v.id)));

      const nodesByReference = new Map();
      const variableCandidates = new Map();

      const addVariableCandidate = (reference, description = '') => {
        if (reference === undefined || reference === null) return;
        const rawReference = typeof reference === 'object'
          ? (reference.name ?? reference.id)
          : reference;
        const node = nodesByReference.get(String(rawReference));
        const name = typeof reference === 'object'
          ? (reference.name || node?.name)
          : (node?.name || rawReference);
        if (!name || existingVarIds.has(String(name))) return;

        const key = normalizeName(name);
        if (!variableCandidates.has(key)) {
          variableCandidates.set(key, {
            name: String(name).trim(),
            description: description || node?.description || 'Imported via CLD'
          });
        }
      };

      rawNodes.forEach(node => {
        if (!node?.name) return;
        if (node.id !== undefined && node.id !== null) nodesByReference.set(String(node.id), node);
        nodesByReference.set(String(node.name), node);
      });

      rawNodes.forEach(node => addVariableCandidate(node, node.description));
      rawEdges.forEach(edge => {
        addVariableCandidate(edge.source);
        addVariableCandidate(edge.target);
      });
      visitSubsystems(rawSubsystems, subsystem => {
        (subsystem.variableIds || subsystem.variables || []).forEach(reference => addVariableCandidate(reference));
      });

      const nodesToCreate = Array.from(variableCandidates.values())
        .filter(node => !existingVars.has(normalizeName(node.name)));

      let createdVarsCount = 0;
      if (nodesToCreate.length > 0) {
        for (const nodeData of nodesToCreate) {
          try {
            await ApiService.post('variable', {
              name: nodeData.name,
              description: nodeData.description || 'Imported via CLD'
            });
            createdVarsCount++;
          } catch (e) {
            console.warn(`Warning: Failed to create auto-imported variable: ${nodeData.name}`, e);
          }
        }

        varsResponse = await ApiService.get('variables');
        existingVarsArray = varsResponse.data || [];
        existingVars = new Map(existingVarsArray.map(v => [normalizeName(v.name), v.id]));
        existingVarIds = new Set(existingVarsArray.map(v => String(v.id)));
      }

      const resolveVariableId = reference => {
        if (reference === undefined || reference === null) return null;
        const rawReference = typeof reference === 'object'
          ? (reference.id ?? reference.name)
          : reference;
        if (existingVarIds.has(String(rawReference))) return String(rawReference);

        const node = nodesByReference.get(String(rawReference));
        const name = typeof reference === 'object'
          ? (reference.name || node?.name || rawReference)
          : (node?.name || rawReference);
        return existingVars.get(normalizeName(name)) || null;
      };

      const relationships = rawEdges.map(edge => {
        const sId = resolveVariableId(edge.source);
        const tId = resolveVariableId(edge.target);
        if (!sId || !tId) return null;

        return {
          source_id: sId,
          target_id: tId,
          type: normalizePolarity(edge.polarity ?? edge.type),
          has_delay: getEdgeDelay(edge)
        };
      }).filter(Boolean);

      const variableIds = new Set();
      rawNodes.forEach(node => {
        const id = resolveVariableId(node);
        if (id) variableIds.add(id);
      });
      relationships.forEach(r => {
        variableIds.add(r.source_id);
        variableIds.add(r.target_id);
      });

      const subsystems = normalizeSubsystems(rawSubsystems, resolveVariableId);
      visitSubsystems(subsystems, subsystem => {
        subsystem.variableIds.forEach(id => variableIds.add(id));
      });

      const cldPayload = {
        name: rawData.diagram?.title || file.name.replace(/\.[^/.]+$/, ""),
        description: rawData.diagram?.description || "Diagram imported directly from file.",
        date: new Date().toISOString().split('T')[0],
        variables: Array.from(variableIds),
        relationships,
        subsystems
      };

      await CLDService.createCLD(cldPayload);

      successMessage.value = `Diagram "${cldPayload.name}" imported successfully! (${createdVarsCount} missing variables auto-created).`;
      setTimeout(() => { successMessage.value = '' }, 6000);

      await fetchDiagrams();

    } catch (err) {
      error.value = err.message || 'Failed to import CLD';
      console.error(err);
    } finally {
      isImporting.value = false;
    }
  };

  const exportDiagram = async (diagramId, format) => {
    loading.value = true;
    try {
        const fullDiagram = await CLDService.getCLDById(diagramId);
        const filename = (fullDiagram.title || fullDiagram.name || 'Diagram').toLowerCase().replace(/\s/g, '_');

        let globalVars = [];
        try {
            const varsResponse = await ApiService.get('variables');
            globalVars = varsResponse.data || [];
        } catch (e) {
            console.warn('Could not fetch global variables for the exporter');
        }

        const idToNameMap = {};
        globalVars.forEach(v => { if (v.id) idToNameMap[v.id] = v.name; });

        const rawNodes = fullDiagram.nodes || fullDiagram.variables || [];
        rawNodes.forEach(n => { if (n.id) idToNameMap[n.id] = n.name; });

        const formattedNodes = rawNodes.map(n => ({
            name: n.name || idToNameMap[n.id] || 'Unknown',
            description: n.description || ''
        }));

        const rawEdges = fullDiagram.edges || fullDiagram.relationships || [];
        const formattedEdges = rawEdges.map(e => {
            const sId = e.source || e.source_id;
            const tId = e.target || e.target_id;

            const sourceName = e.source_name || idToNameMap[sId] || sId;
            const targetName = e.target_name || idToNameMap[tId] || tId;

            const pol = String(e.polarity || e.type || 'positive').toLowerCase();
            const cleanPol = (pol === '+' || pol === 'positive' || pol === '1') ? 'positive' : 'negative';

            return {
                source: sourceName,
                target: targetName,
                polarity: cleanPol,
                has_delay: getEdgeDelay(e)
            };
        });

        const formattedSubsystems = formatPortableSubsystems(fullDiagram.subsystems || [], idToNameMap);

        const exportData = {
            diagram: {
                title: fullDiagram.title || fullDiagram.name || 'Exported CLD',
                description: fullDiagram.description || ''
            },
            nodes: formattedNodes,
            edges: formattedEdges,
            subsystems: formattedSubsystems
        };
        let fileContent = '';
        if (format === 'json'){
            fileContent = FileExportService.exportToJSON(exportData, filename);
        }
        if (format === 'xmile'){
            fileContent = FileExportService.exportToXMILE(exportData, filename);
        }
        if (format === 'csv') {
            fileContent = FileExportService.exportToCSV(formattedEdges, filename);
        }
        FileExportService.downloadFile(fileContent, `${filename}.${format}`);
    } catch (err) {
        error.value = 'Failed to export diagram.';
        console.error(err);
    } finally {
        loading.value = false;
    }
  };

  const toggleSelectAll = () => {
    if (selectedDiagrams.value.length === sortedDiagrams.value.length && sortedDiagrams.value.length > 0) {
      selectedDiagrams.value = [];
    } else {
      selectedDiagrams.value = sortedDiagrams.value.map(d => d.id);
    }
  };

  const deleteSelectedDiagrams = async () => {
    if (selectedDiagrams.value.length === 0) return;

    loading.value = true;
    error.value = null;
    successMessage.value = '';

    let successCount = 0;
    const failedDiagrams = [];

    for (const id of selectedDiagrams.value) {
      const diagramObj = diagrams.value.find(d => d.id === id);
      const diagName = diagramObj ? diagramObj.title : `ID: ${id}`;

      try {
        await CLDService.deleteCLD(id);
        successCount++;
      } catch (err) {
        console.error(`Failed to delete diagram ${diagName}:`, err);
        failedDiagrams.push(diagName);
      }
    }

    if (failedDiagrams.length === 0) {
      successMessage.value = `Successfully deleted ${successCount} diagrams!`;
    } else if (successCount > 0) {
      error.value = `Deleted ${successCount} diagrams. Failed to delete: ${failedDiagrams.join(', ')}.`;
    } else {
      error.value = `Failed to delete diagrams: ${failedDiagrams.join(', ')}.`;
    }

    selectedDiagrams.value = [];
    await fetchDiagrams();
    loading.value = false;

    setTimeout(() => {
      if (successMessage.value) successMessage.value = '';
      if (error.value && error.value.includes('Failed to delete')) error.value = null;
    }, 6000);
  };

  const exportSelectedDiagrams = async (format) => {
    if (selectedDiagrams.value.length === 0) return;

    loading.value = true;
    error.value = null;

    try {
        const zip = new JSZip();

        let globalVars = [];
        try {
            const varsResponse = await ApiService.get('variables');
            globalVars = varsResponse.data || [];
        } catch (e) {
            console.warn('Could not fetch global variables for the exporter');
        }

        const idToNameMap = {};
        globalVars.forEach(v => { if (v.id) idToNameMap[v.id] = v.name; });

        for (const id of selectedDiagrams.value) {
            const fullDiagram = await CLDService.getCLDById(id);
            let filename = (fullDiagram.title || fullDiagram.name || 'diagrama').toLowerCase().replace(/\s/g, '_');

            const rawNodes = fullDiagram.nodes || fullDiagram.variables || [];
            rawNodes.forEach(n => { if (n.id) idToNameMap[n.id] = n.name; });

            const formattedNodes = rawNodes.map(n => ({
                name: n.name || idToNameMap[n.id] || 'Unknown Variable',
                description: n.description || ''
            }));

            const rawEdges = fullDiagram.edges || fullDiagram.relationships || [];
            const formattedEdges = rawEdges.map(e => {
                const sId = e.source || e.source_id;
                const tId = e.target || e.target_id;
                const sourceName = e.source_name || idToNameMap[sId] || sId;
                const targetName = e.target_name || idToNameMap[tId] || tId;
                const pol = String(e.polarity || e.type || 'positive').toLowerCase();
                const cleanPol = (pol === '+' || pol === 'positive' || pol === '1') ? 'positive' : 'negative';

                return {
                    source: sourceName,
                    target: targetName,
                    polarity: cleanPol,
                    has_delay: getEdgeDelay(e)
                };
            });

            const formattedSubsystems = formatPortableSubsystems(fullDiagram.subsystems || [], idToNameMap);

            const exportData = {
                diagram: {
                    title: fullDiagram.title || fullDiagram.name || 'Exported CLD',
                    description: fullDiagram.description || ''
                },
                nodes: formattedNodes,
                edges: formattedEdges,
                subsystems: formattedSubsystems
            };

            let fileContent = '';
            let fileExtension = '';

            if (format === 'json') {
                fileContent = FileExportService.exportToJSON(exportData);
                fileExtension = '.json';
            } else if (format === 'csv') {
                fileContent = FileExportService.exportToCSV(formattedEdges);
                fileExtension = '.csv';
            } else if (format === 'xmile') {
                fileContent = FileExportService.exportToXMILE(exportData);
                fileExtension = '.xmile';
            }

            let finalFilename = `${filename}${fileExtension}`;
            let counter = 1;
            while(zip.file(finalFilename)) {
                finalFilename = `${filename}_(${counter})${fileExtension}`;
                counter++;
            }

            zip.file(finalFilename, fileContent);
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `calmo_diagrams_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        successMessage.value = `Exported ${selectedDiagrams.value.length} CLDs!`;
        selectedDiagrams.value = [];

    } catch (err) {
        error.value = 'Failed to export CLD.';
        console.error(err);
    } finally {
        loading.value = false;
        setTimeout(() => { if (successMessage.value) successMessage.value = ''; }, 5000);
    }
  };



  return {
    diagrams: sortedDiagrams,
    loading,
    error,
    filter: computed(() => state.filter),
    sorting: computed(() => state.sorting),
    fetchDiagrams,
    deleteDiagram,
    setFilter,
    setSorting,
    successMessage,
    isImporting,
    importCLDFromFile,
    selectedDiagrams,
    toggleSelectAll,
    deleteSelectedDiagrams,
    exportSelectedDiagrams,
    exportDiagram
  };
} 
