import networkx as nx
from .entities import RelationshipType, LoopType, ArchetypeType, FeedbackLoop, Archetype

class CLDAnalyzer:
    """Contains logic for analyzing Causal Loop Diagrams"""
    
    @staticmethod
    def identify_feedback_loops(cld, session):
        """Identifies feedback loops within the CLD using networkx."""
        G = nx.DiGraph()
        
        # Add edges to the graph
        for rel in cld.relationships:
            G.add_edge(rel.source_id, rel.target_id, type=rel.type)

        # Find all simple cycles in the graph
        cycles = list(nx.simple_cycles(G))
        unique_cycles = set()

        for cycle in cycles:
            # Convert cycle to a canonical form (sorted tuple)
            canonical_cycle = tuple(sorted(cycle))
            if canonical_cycle not in unique_cycles:
                unique_cycles.add(canonical_cycle)
                CLDAnalyzer._classify_cycle(cld, cycle, session)
                
        return cld.feedback_loops

    @staticmethod
    def _classify_cycle(cld, cycle, session):
        """Classifies a cycle as reinforcing or balancing."""
        negative_count = 0

        for i in range(len(cycle)):
            source = cycle[i]
            target = cycle[(i + 1) % len(cycle)]
            for rel in cld.relationships:
                if rel.source_id == source and rel.target_id == target:
                    if rel.type == RelationshipType.NEGATIVE:
                        negative_count += 1

        loop_type = LoopType.REINFORCING if negative_count % 2 == 0 else LoopType.BALANCING

        feedback_loop = FeedbackLoop(type=loop_type, cld=cld)
        session.add(feedback_loop)
        
        # Verify all cycle variables are present
        cycle_variables = []
        for node in cycle:
            variable = next((var for var in cld.variables if var.id == node), None)
            if variable is None:
                raise ValueError(f"Variable with id {node} not found in CLD variables.")
            cycle_variables.append(variable)
        
        feedback_loop.variables = cycle_variables
        cld.feedback_loops.append(feedback_loop)
        
        return feedback_loop

    @staticmethod
    def identify_archetypes(cld, session):
        """Identifies system archetypes within the CLD."""
        CLDAnalyzer._identify_shifting_the_burden(cld, session)
        return cld.archetypes

    @staticmethod
    def _identify_shifting_the_burden(cld, session):
        """Identifies the 'Shifting the Burden' archetype within the CLD."""
        rel_map = {(rel.source_id, rel.target_id): rel.type for rel in cld.relationships}

        for var_ps in cld.variables:
            var_ss_candidates = [
                var for var in cld.variables 
                if rel_map.get((var.id, var_ps.id)) == RelationshipType.NEGATIVE 
                and rel_map.get((var_ps.id, var.id)) == RelationshipType.POSITIVE
            ]
            var_fs_candidates = [
                var for var in cld.variables 
                if rel_map.get((var.id, var_ps.id)) == RelationshipType.NEGATIVE 
                and rel_map.get((var_ps.id, var.id)) == RelationshipType.POSITIVE
            ]

            for var_ss in var_ss_candidates:
                for var_fs in var_fs_candidates:
                    var_se_candidates = [
                        var for var in cld.variables 
                        if rel_map.get((var_ss.id, var.id)) == RelationshipType.POSITIVE 
                        and rel_map.get((var.id, var_fs.id)) == RelationshipType.NEGATIVE
                    ]

                    for var_se in var_se_candidates:
                        archetype = Archetype(type=ArchetypeType.SHIFTING_THE_BURDEN, cld=cld)
                        archetype.variables.extend([var_ps, var_ss, var_fs, var_se])
                        session.add(archetype)
                        cld.archetypes.append(archetype)
                        
        return cld.archetypes 