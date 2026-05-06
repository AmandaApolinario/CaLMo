import { ref, reactive, computed } from 'vue';
import CLDService from '@/services/cld.service';
import {FileParserService} from "@/services/fileParser.service.js";
import ApiService from "@/services/api.service.js";

export function useCLDListViewModel() {
  const diagrams = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const successMessage = ref('');
  const isImporting = ref(false);

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
            console.warn(`Aviso: Falha ao criar variável auto-importada: ${name}`, e);
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
  };
} 