const sameId = (left, right) => String(left) === String(right);

const sameEdge = (left, right) => {
  if (!left || !right) return false;

  if (left.id != null && right.id != null) {
    return sameId(left.id, right.id);
  }

  return sameId(left.source, right.source) && sameId(left.target, right.target);
};

const appendEdgeIfMissing = (edges, edge) => {
  if (!edge || edges.some(existingEdge => sameEdge(existingEdge, edge))) {
    return [...edges];
  }

  return [...edges, edge];
};

export const appendVariableIfMissing = (variables, variable) => {
  if (!variable || variable.id == null) return [...variables];

  if (variables.some(existingVariable => sameId(existingVariable.id, variable.id))) {
    return [...variables];
  }

  return [...variables, variable];
};

export const getCreatedVariableFromResponse = (responseData) => {
  if (responseData?.variable?.id != null) return responseData.variable;
  if (responseData?.id != null) return responseData;
  return null;
};

export function applyUndoGraphMutation(state, lastAction, clientId) {
  const nodes = [...(state.nodes || [])];
  const edges = [...(state.edges || [])];
  const { action, data = {} } = lastAction || {};

  switch (action) {
    case 'NODE_ADDED': {
      const nodeId = data.node?.id;
      const removedEdges = edges.filter(edge => sameId(edge.source, nodeId) || sameId(edge.target, nodeId));

      return {
        nodes: nodes.filter(node => !sameId(node.id, nodeId)),
        edges: edges.filter(edge => !sameId(edge.source, nodeId) && !sameId(edge.target, nodeId)),
        inverseAction: 'NODE_REMOVED',
        inverseData: { nodeId, clientId },
        removedNodeId: nodeId,
        removedEdges,
        restoredEdges: [],
        requiresAnalysis: true,
      };
    }

    case 'NODE_REMOVED': {
      const restoredNode = data.node;
      const restoredEdges = data.deletedEdges || [];
      const nextNodes = nodes.some(node => sameId(node.id, restoredNode?.id))
        ? nodes
        : [...nodes, restoredNode];
      const nextEdges = restoredEdges.reduce(appendEdgeIfMissing, edges);

      return {
        nodes: nextNodes,
        edges: nextEdges,
        inverseAction: 'NODE_ADDED',
        inverseData: { node: restoredNode, clientId },
        restoredNode,
        removedEdges: [],
        restoredEdges,
        requiresAnalysis: true,
      };
    }

    case 'EDGE_ADDED': {
      const removedEdge = data.edge;

      return {
        nodes,
        edges: edges.filter(edge => !sameEdge(edge, removedEdge)),
        inverseAction: 'EDGE_REMOVED',
        inverseData: { edgeId: removedEdge?.id, clientId },
        removedEdges: removedEdge ? [removedEdge] : [],
        restoredEdges: [],
        requiresAnalysis: true,
      };
    }

    case 'EDGE_REMOVED': {
      const restoredEdge = data.edge;

      return {
        nodes,
        edges: appendEdgeIfMissing(edges, restoredEdge),
        inverseAction: 'EDGE_ADDED',
        inverseData: { edge: restoredEdge, clientId },
        removedEdges: [],
        restoredEdges: restoredEdge ? [restoredEdge] : [],
        requiresAnalysis: true,
      };
    }

    default:
      return {
        nodes,
        edges,
        unsupported: true,
        requiresAnalysis: false,
      };
  }
}
