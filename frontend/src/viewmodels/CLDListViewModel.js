import { ref, reactive, computed } from 'vue';
import CLDService from '@/services/cld.service';
import {FileParserService} from "@/services/fileParser.service.js";
import ApiService from "@/services/api.service.js";
import {FileExportService} from "@/services/fileExport.service.js";
import JSZip from "jszip";

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
      edges: 'connector'
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
        polarity: { required: false, default: 'positive', xmlAttr: 'polarity' }
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

      let varsResponse = await ApiService.get('variables');
      let existingVarsArray = varsResponse.data || [];
      let existingVars = new Map(existingVarsArray.map(v => [v.name.toLowerCase().trim(), v.id]));

      const nodeNames = new Set((rawData.nodes || []).map(n => n.name.trim()));
      const nodesToCreate = [...nodeNames].filter(name => !existingVars.has(name.toLowerCase()));

      let createdVarsCount = 0;
      if (nodesToCreate.length > 0) {
        for (const name of nodesToCreate) {
          const nodeData = (rawData.nodes || []).find(n => n.name === name) || { name };
          try {
            await ApiService.post('variable', {
              name: nodeData.name,
              description: nodeData.description || 'Imported via CLD'
            });
            createdVarsCount++;
          } catch (e) {
            console.warn(`Warning: Failed to create auto-imported variable: ${name}`, e);
          }
        }

        varsResponse = await ApiService.get('variables');
        existingVarsArray = varsResponse.data || [];
        existingVars = new Map(existingVarsArray.map(v => [v.name.toLowerCase().trim(), v.id]));
      }


      const relationships = (rawData.edges || []).map(edge => {
        const sId = existingVars.get(edge.source.toLowerCase().trim());
        const tId = existingVars.get(edge.target.toLowerCase().trim());
        if (!sId || !tId) return null;

        let pol = String(edge.polarity).toLowerCase();
        if (['+', '1', 'positive', 'reinforcing'].includes(pol)) pol = 'POSITIVE';
        else if (['-', '-1', 'negative', 'balancing'].includes(pol)) pol = 'NEGATIVE';
        else pol = 'POSITIVE';

        return { source_id: sId, target_id: tId, type: pol };
      }).filter(Boolean);

      const variableIds = new Set();
      (rawData.nodes || []).forEach(n => {
        const id = existingVars.get(n.name.toLowerCase().trim());
        if (id) variableIds.add(id);
      });
      relationships.forEach(r => {
        variableIds.add(r.source_id);
        variableIds.add(r.target_id);
      });

      const cldPayload = {
        name: rawData.diagram?.title || file.name.replace(/\.[^/.]+$/, ""),
        description: rawData.diagram?.description || "Diagram imported directly from file.",
        date: new Date().toISOString().split('T')[0],
        variables: Array.from(variableIds),
        relationships: relationships
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
                polarity: cleanPol
            };
        });

        const exportData = {
            diagram: {
                title: fullDiagram.title || fullDiagram.name || 'Exported CLD',
                description: fullDiagram.description || ''
            },
            nodes: formattedNodes,
            edges: formattedEdges
        };

        if (format === 'json') FileExportService.exportToJSON(exportData, filename);
        if (format === 'xmile') FileExportService.exportToXMILE(exportData, filename);
        if (format === 'csv') {
            FileExportService.exportToCSV(formattedEdges, filename);
        }
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
                name: n.name || idToNameMap[n.id] || 'Variável Desconhecida',
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

                return { source: sourceName, target: targetName, polarity: cleanPol };
            });

            const exportData = {
                diagram: {
                    title: fullDiagram.title || fullDiagram.name || 'Exported CLD',
                    description: fullDiagram.description || ''
                },
                nodes: formattedNodes,
                edges: formattedEdges
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