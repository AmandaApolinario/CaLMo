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
        CLDAnalyzer._identify_fixes_that_fail(cld, session)
        CLDAnalyzer._identify_limits_to_success(cld, session)
        CLDAnalyzer._identify_drifting_goals(cld, session)
        CLDAnalyzer._identify_growth_and_underinvestment(cld, session)
        CLDAnalyzer._identify_success_to_the_successful(cld, session)
        CLDAnalyzer._identify_escalation(cld, session)
        CLDAnalyzer._identify_tragedy_of_the_commons(cld, session)
        return cld.archetypes

    @staticmethod
    def _identify_shifting_the_burden(cld, session):
        """
        Identify the 'Shifting the Burden' archetype.
        Canonical pattern:
            Problem Symptom (PS) <-> Symptomatic Solution (SS) : PS->SS (+), SS->PS (−)
            Problem Symptom (PS) <-> Fundamental Solution (FS) : PS->FS (+), FS->PS (−)
            Side-effect (SE): SS->SE (+), SE->FS (−)
        This implementation searches for the qualitative wiring consistent with the pattern.
        """
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
    
    @staticmethod
    def _identify_fixes_that_fail(cld, session):
        """
        Identify the 'Fixes that Fail' archetype.
        Canonical pattern (no explicit delay modeled here):
            Problem Symptom (PS) -> Fix / Quick Solution (F) : (+)
            Fix (F) -> Problem Symptom (PS) : (−)         [short balancing loop]
            Fix (F) -> Unintended Consequence (UC) : (+)
            Unintended Consequence (UC) -> Problem Symptom (PS) : (+)  [reinforcing drift back]
        """
        rel_map = {(rel.source_id, rel.target_id): rel.type for rel in cld.relationships}
        created = set()  # avoid duplicates for the same trio

        for var_ps in cld.variables:
            # Step 1: candidates for F (quick fix) forming the short balancing loop with PS
            f_candidates = [
                v for v in cld.variables
                if v.id != var_ps.id
                and rel_map.get((var_ps.id, v.id)) == RelationshipType.POSITIVE
                and rel_map.get((v.id, var_ps.id)) == RelationshipType.NEGATIVE
            ]

            for var_f in f_candidates:
                # Step 2: candidates for UC (unintended consequence)
                uc_candidates = [
                    v for v in cld.variables
                    if v.id not in {var_ps.id, var_f.id}
                    and rel_map.get((var_f.id, v.id)) == RelationshipType.POSITIVE
                    and rel_map.get((v.id, var_ps.id)) == RelationshipType.POSITIVE
                ]

                for var_uc in uc_candidates:
                    key = tuple(sorted([var_ps.id, var_f.id, var_uc.id]))
                    if key in created:
                        continue

                    archetype = Archetype(type=ArchetypeType.FIXES_THAT_FAIL, cld=cld)
                    session.add(archetype)
                    cld.archetypes.append(archetype)
                    archetype.variables.extend([var_ps, var_f, var_uc])
                    created.add(key)
        
        return cld.archetypes

    @staticmethod
    def _identify_limits_to_success(cld, session):
        """
        Identify the 'Limits to Success' archetype (simplified, no explicit delays).
        Canonical pattern:
            Efforts (E) -> Performance (P) : (+)
            Performance (P) -> Efforts (E) : (+)         [reinforcing loop R1]
            Performance (P) -> Limiting Action (LA) : (+)
            Limiting Action (LA) -> Performance (P) : (−) [balancing loop B2]
            Constraint (C) -> Limiting Action (LA) : (+)
        """
        rel_map = {(rel.source_id, rel.target_id): rel.type for rel in cld.relationships}
        created = set()

        for var_p in cld.variables:
            # Step 1: candidates for E (efforts) forming a 2-link reinforcing loop with P
            e_candidates = [
                v for v in cld.variables
                if v.id != var_p.id
                and rel_map.get((v.id, var_p.id)) == RelationshipType.POSITIVE   # E -> P (+)
                and rel_map.get((var_p.id, v.id)) == RelationshipType.POSITIVE   # P -> E (+)
            ]

            # Step 2: candidates for LA (limiting action) tied to performance
            la_candidates = [
                v for v in cld.variables
                if v.id != var_p.id
                and rel_map.get((var_p.id, v.id)) == RelationshipType.POSITIVE   # P -> LA (+)
                and rel_map.get((v.id, var_p.id)) == RelationshipType.NEGATIVE   # LA -> P (−)
            ]

            if not e_candidates or not la_candidates:
                continue

            for var_la in la_candidates:
                # Step 3: candidates for C (constraint) driving LA
                c_candidates = [
                    v for v in cld.variables
                    if v.id not in {var_p.id, var_la.id}
                    and rel_map.get((v.id, var_la.id)) == RelationshipType.POSITIVE  # C -> LA (+)
                ]

                for var_e in e_candidates:
                    for var_c in c_candidates:
                        key = tuple(sorted([var_e.id, var_p.id, var_la.id, var_c.id]))
                        if key in created:
                            continue

                        archetype = Archetype(type=ArchetypeType.LIMITS_TO_SUCCESS, cld=cld)
                        session.add(archetype)
                        cld.archetypes.append(archetype)
                        archetype.variables.extend([var_e, var_p, var_la, var_c])
                        created.add(key)

        return cld.archetypes

    @staticmethod
    def _identify_drifting_goals(cld, session):
        """
        Identify the 'Drifting Goals' (Eroding Goals) archetype.
        Wiring (Gap central to both loops):
        - G -> Gap (+), A -> Gap (-)
        - [B1] A (-) -> Gap (+) -> CA (+) -> A
        - [B2] G (+) -> Gap (+) -> PLG (-) -> G
        """
        rel_map = {(rel.source_id, rel.target_id): rel.type for rel in cld.relationships}
        created = set()

        for var_g in cld.variables:
            # Step 1a: choose a Gap variable influenced by Goal (+)
            gap_candidates = [
                v for v in cld.variables
                if v.id != var_g.id and rel_map.get((var_g.id, v.id)) == RelationshipType.POSITIVE
            ]
            for var_gap in gap_candidates:
                # Step 1b: find Actual with A -> Gap (-)
                a_candidates = [
                    v for v in cld.variables
                    if v.id not in {var_g.id, var_gap.id}
                    and rel_map.get((v.id, var_gap.id)) == RelationshipType.NEGATIVE
                ]
                if not a_candidates:
                    continue

                # Step 3: PLG for this (G, Gap)
                plg_candidates = [
                    v for v in cld.variables
                    if v.id not in {var_g.id, var_gap.id}
                    and rel_map.get((var_gap.id, v.id)) == RelationshipType.POSITIVE   # Gap -> PLG (+)
                    and rel_map.get((v.id, var_g.id)) == RelationshipType.NEGATIVE     # PLG -> Goal (-)
                ]
                if not plg_candidates:
                    continue

                for var_a in a_candidates:
                    # Step 2: CA for this (Gap, A)
                    ca_candidates = [
                        v for v in cld.variables
                        if v.id not in {var_g.id, var_gap.id, var_a.id}
                        and rel_map.get((var_gap.id, v.id)) == RelationshipType.POSITIVE  # Gap -> CA (+)
                        and rel_map.get((v.id, var_a.id)) == RelationshipType.POSITIVE    # CA -> A (+)
                    ]
                    if not ca_candidates:
                        continue

                    for var_ca in ca_candidates:
                        for var_plg in plg_candidates:
                            key = tuple(sorted([var_g.id, var_a.id, var_gap.id, var_ca.id, var_plg.id]))
                            if key in created:
                                continue

                            archetype = Archetype(type=ArchetypeType.DRIFTING_GOALS, cld=cld)
                            session.add(archetype)
                            cld.archetypes.append(archetype)
                            archetype.variables.extend([var_g, var_a, var_gap, var_ca, var_plg])
                            created.add(key)

        return cld.archetypes

    @staticmethod
    def _identify_growth_and_underinvestment(cld, session):
        """
        Identify the 'Growth and Underinvestment' archetype.

        Canonical pattern (no explicit delays modeled here):
            Reinforcing growth (R1):
                Growth Effort (E) -> Demand (D) : (+)
                Demand (D) -> Growth Effort (E) : (+)

            Service shortfall / limiting path (B2):
                Demand (D) -> Impact of Limiting Factor (ILF) : (+)
                Impact of Limiting Factor (ILF) -> Demand (D) : (−)

            Investment/capacity build-up (B3):
                ILF -> Perceived Need to Invest (PNI) : (+)
                Performance Standard (PS) -> PNI : (+)
                PNI -> Investment in Capacity (IC) : (+)
                IC -> Capacity (C) : (+)
                Capacity (C) -> Impact of Limiting Factor (ILF) : (−)
        """
        rel_map = {(rel.source_id, rel.target_id): rel.type for rel in cld.relationships}
        created = set()

        # Step 1: choose Demand (D) and find Growth Effort (E) forming R1
        for var_d in cld.variables:
            e_candidates = [
                v for v in cld.variables
                if v.id != var_d.id
                and rel_map.get((v.id, var_d.id)) == RelationshipType.POSITIVE   # E -> D (+)
                and rel_map.get((var_d.id, v.id)) == RelationshipType.POSITIVE   # D -> E (+)
            ]
            if not e_candidates:
                continue

            # Step 2: ILF tied to Demand both ways B2
            ilf_candidates = [
                v for v in cld.variables
                if v.id != var_d.id
                and rel_map.get((var_d.id, v.id)) == RelationshipType.POSITIVE   # D -> ILF (+)
                and rel_map.get((v.id, var_d.id)) == RelationshipType.NEGATIVE   # ILF -> D (−)
            ]
            if not ilf_candidates:
                continue

            # Step 3: capacity chain ending at ILF B3
            c_candidates = [
                v for v in cld.variables
                if v.id != var_d.id
            ]

            for var_ilf in ilf_candidates:
                # C -> ILF (−)
                c_to_ilf = [
                    v for v in c_candidates
                    if rel_map.get((v.id, var_ilf.id)) == RelationshipType.NEGATIVE
                ]
                if not c_to_ilf:
                    continue

                for var_c in c_to_ilf:
                    # IC -> C (+)
                    ic_candidates = [
                        v for v in cld.variables
                        if v.id not in {var_d.id, var_ilf.id, var_c.id}
                        and rel_map.get((v.id, var_c.id)) == RelationshipType.POSITIVE
                    ]
                    if not ic_candidates:
                        continue

                    for var_ic in ic_candidates:
                        # PNI -> IC (+)
                        pni_candidates = [
                            v for v in cld.variables
                            if v.id not in {var_d.id, var_ilf.id, var_c.id, var_ic.id}
                            and rel_map.get((v.id, var_ic.id)) == RelationshipType.POSITIVE
                        ]
                        if not pni_candidates:
                            continue

                        for var_pni in pni_candidates:
                            # Step 4: PNI parents: ILF -> PNI (+), PS -> PNI (+)
                            if rel_map.get((var_ilf.id, var_pni.id)) != RelationshipType.POSITIVE:
                                continue
                            ps_candidates = [
                                v for v in cld.variables
                                if v.id not in {var_d.id, var_ilf.id, var_c.id, var_ic.id, var_pni.id}
                                and rel_map.get((v.id, var_pni.id)) == RelationshipType.POSITIVE
                            ]
                            if not ps_candidates:
                                continue

                            for var_e in e_candidates:
                                for var_ps in ps_candidates:
                                    key = tuple(sorted([
                                        var_e.id, var_d.id, var_ilf.id, var_pni.id, var_ic.id, var_c.id, var_ps.id
                                    ]))
                                    if key in created:
                                        continue

                                    archetype = Archetype(type=ArchetypeType.GROWTH_AND_UNDERINVESTMENT, cld=cld)
                                    session.add(archetype)
                                    cld.archetypes.append(archetype)
                                    archetype.variables.extend([var_e, var_d, var_ilf, var_pni, var_ic, var_c, var_ps])
                                    created.add(key)
        return cld.archetypes

    @staticmethod
    def _identify_success_to_the_successful(cld, session):
        """
        Identify the 'Success to the Successful' archetype.

        Canonical pattern (two competing reinforcing loops sharing an allocation variable A):
            Branch A (R1):
                Success_A (SA)  -> Allocation_to_A_instead_of_B (A) : (+)
                A               -> Resources_to_A (RA)              : (+)
                RA              -> SA                               : (+)

            Branch B (R2):
                Success_B (SB)  -> A                                : (−)
                A               -> Resources_to_B (RB)              : (−)
                RB              -> SB                               : (+)
        """
        rel_map = {(rel.source_id, rel.target_id): rel.type for rel in cld.relationships}
        created = set()

        for alloc in cld.variables:
            # Step 1 (Branch A): alloc -> RA (+), RA -> SA (+), SA -> alloc (+)
            ra_candidates = [
                v for v in cld.variables
                if v.id != alloc.id and rel_map.get((alloc.id, v.id)) == RelationshipType.POSITIVE
            ]
            branch_a = []
            for ra in ra_candidates:
                sa_list = [
                    v for v in cld.variables
                    if v.id not in {alloc.id, ra.id}
                    and rel_map.get((ra.id, v.id)) == RelationshipType.POSITIVE
                    and rel_map.get((v.id, alloc.id)) == RelationshipType.POSITIVE
                ]
                for sa in sa_list:
                    branch_a.append((ra, sa))
            if not branch_a:
                continue

            # Step 2 (Branch B): alloc -> RB (−), RB -> SB (+), SB -> alloc (−)
            rb_candidates = [
                v for v in cld.variables
                if v.id != alloc.id and rel_map.get((alloc.id, v.id)) == RelationshipType.NEGATIVE
            ]
            branch_b = []
            for rb in rb_candidates:
                sb_list = [
                    v for v in cld.variables
                    if v.id not in {alloc.id, rb.id}
                    and rel_map.get((rb.id, v.id)) == RelationshipType.POSITIVE
                    and rel_map.get((v.id, alloc.id)) == RelationshipType.NEGATIVE
                ]
                for sb in sb_list:
                    branch_b.append((rb, sb))
            if not branch_b:
                continue

            # Step 3: combine branches ensuring distinct nodes
            for (ra, sa) in branch_a:
                for (rb, sb) in branch_b:
                    ids = {alloc.id, ra.id, sa.id, rb.id, sb.id}
                    if len(ids) < 5:
                        continue

                    key = tuple(sorted(ids))
                    if key in created:
                        continue

                    archetype = Archetype(type=ArchetypeType.SUCCESS_TO_THE_SUCCESSFUL, cld=cld)
                    session.add(archetype)
                    cld.archetypes.append(archetype)
                    archetype.variables.extend([alloc, ra, sa, rb, sb])
                    created.add(key)
                
        return cld.archetypes
    
    @staticmethod
    def _identify_escalation(cld, session):
        """
        Identify the 'Escalation' archetype.

        Canonical pattern (no delays modeled):
            Center variable Q = "Quality of A's Position Relative to B's"

            Loop B1 (A-side):
                Threat_A (TA) -> Activity_A (ActA) : (+)
                Activity_A (ActA) -> Result_A (ResA) : (+)
                Result_A (ResA) -> Q : (+)
                Q -> Threat_A (TA) : (−)

            Loop B2 (B-side):
                Threat_B (TB) -> Activity_B (ActB) : (+)
                Activity_B (ActB) -> Result_B (ResB) : (+)
                Result_B (ResB) -> Q : (−)
                Q -> Threat_B (TB) : (+)
        """
        rel_map = {(rel.source_id, rel.target_id): rel.type for rel in cld.relationships}
        created = set()

        for var_q in cld.variables:
            # Step 1: A-side (B1)
            ta_candidates = [
                v for v in cld.variables
                if v.id != var_q.id and rel_map.get((var_q.id, v.id)) == RelationshipType.NEGATIVE  # Q -> TA (−)
            ]
            a_side = []
            for var_ta in ta_candidates:
                acta_list = [
                    v for v in cld.variables
                    if v.id not in {var_q.id, var_ta.id}
                    and rel_map.get((var_ta.id, v.id)) == RelationshipType.POSITIVE  # TA -> ActA (+)
                ]
                for var_acta in acta_list:
                    resa_list = [
                        v for v in cld.variables
                        if v.id not in {var_q.id, var_ta.id, var_acta.id}
                        and rel_map.get((var_acta.id, v.id)) == RelationshipType.POSITIVE  # ActA -> ResA (+)
                        and rel_map.get((v.id, var_q.id)) == RelationshipType.POSITIVE    # ResA -> Q (+)
                    ]
                    for var_resa in resa_list:
                        a_side.append((var_ta, var_acta, var_resa))
            if not a_side:
                continue

            # Step 2: B-side (B2)
            tb_candidates = [
                v for v in cld.variables
                if v.id != var_q.id and rel_map.get((var_q.id, v.id)) == RelationshipType.POSITIVE  # Q -> TB (+)
            ]
            b_side = []
            for var_tb in tb_candidates:
                actb_list = [
                    v for v in cld.variables
                    if v.id not in {var_q.id, var_tb.id}
                    and rel_map.get((var_tb.id, v.id)) == RelationshipType.POSITIVE  # TB -> ActB (+)
                ]
                for var_actb in actb_list:
                    resb_list = [
                        v for v in cld.variables
                        if v.id not in {var_q.id, var_tb.id, var_actb.id}
                        and rel_map.get((var_actb.id, v.id)) == RelationshipType.POSITIVE  # ActB -> ResB (+)
                        and rel_map.get((v.id, var_q.id)) == RelationshipType.NEGATIVE     # ResB -> Q (−)
                    ]
                    for var_resb in resb_list:
                        b_side.append((var_tb, var_actb, var_resb))
            if not b_side:
                continue

            # Step 3: combine sides ensuring distinct nodes
            for (var_ta, var_acta, var_resa) in a_side:
                for (var_tb, var_actb, var_resb) in b_side:
                    ids = {var_q.id, var_ta.id, var_acta.id, var_resa.id, var_tb.id, var_actb.id, var_resb.id}
                    if len(ids) < 7:
                        continue

                    key = tuple(sorted(ids))
                    if key in created:
                        continue

                    archetype = Archetype(type=ArchetypeType.ESCALATION, cld=cld)
                    session.add(archetype)
                    cld.archetypes.append(archetype)
                    archetype.variables.extend([var_q, var_ta, var_acta, var_resa, var_tb, var_actb, var_resb])
                    created.add(key)
        
        return cld.archetypes
    
    @staticmethod
    def _identify_tragedy_of_the_commons(cld, session):
        """
        Identify the 'Tragedy of the Commons' archetype.

        Canonical pattern (no explicit delays modeled here):
            Two actors (A and B) draw from a shared commons.

            R1 (A-side reinforcement):
                A_Activity -> NetGains_A : (+)
                NetGains_A -> A_Activity : (+)

            R2 (B-side reinforcement):
                B_Activity -> NetGains_B : (+)
                NetGains_B -> B_Activity : (+)

            Shared commons coupling:
                A_Activity -> TotalActivity : (+)
                B_Activity -> TotalActivity : (+)
                TotalActivity -> GainPerIndividual : (−)
                GainPerIndividual -> A_Activity : (−)
                GainPerIndividual -> B_Activity : (−)

            Additional balancing links (as in the diagram):
                GainPerIndividual -> NetGains_A : (+)
                GainPerIndividual -> NetGains_B : (+)
                ResourceLimit -> GainPerIndividual : (+)
        """
        rel_map = {(rel.source_id, rel.target_id): rel.type for rel in cld.relationships}
        created = set()

        # Step 1: choose Total and GainPer with the negative link Total -> GainPer
        for var_total in cld.variables:
            gain_candidates = [
                v for v in cld.variables
                if v.id != var_total.id and rel_map.get((var_total.id, v.id)) == RelationshipType.NEGATIVE
            ]
            for var_gain in gain_candidates:
                # Resource limit must boost gain per individual
                rl_candidates = [
                    v for v in cld.variables
                    if v.id not in {var_total.id, var_gain.id}
                    and rel_map.get((v.id, var_gain.id)) == RelationshipType.POSITIVE
                ]
                if not rl_candidates:
                    continue

                # Step 2: A branch
                a_act_candidates = [
                    v for v in cld.variables
                    if v.id not in {var_total.id, var_gain.id}
                    and rel_map.get((var_gain.id, v.id)) == RelationshipType.NEGATIVE  # Gain -> A (−)
                    and rel_map.get((v.id, var_total.id)) == RelationshipType.POSITIVE  # A -> Total (+)
                ]
                a_branch = []
                for var_a_act in a_act_candidates:
                    a_ng_list = [
                        v for v in cld.variables
                        if v.id not in {var_total.id, var_gain.id, var_a_act.id}
                        and rel_map.get((var_a_act.id, v.id)) == RelationshipType.POSITIVE   # A -> NG_A (+)
                        and rel_map.get((v.id, var_a_act.id)) == RelationshipType.POSITIVE   # NG_A -> A (+)
                        and rel_map.get((var_gain.id, v.id)) == RelationshipType.POSITIVE    # Gain -> NG_A (+)
                    ]
                    for var_a_ng in a_ng_list:
                        a_branch.append((var_a_act, var_a_ng))
                if not a_branch:
                    continue

                # Step 3: B branch
                b_act_candidates = [
                    v for v in cld.variables
                    if v.id not in {var_total.id, var_gain.id}
                    and rel_map.get((var_gain.id, v.id)) == RelationshipType.NEGATIVE  # Gain -> B (−)
                    and rel_map.get((v.id, var_total.id)) == RelationshipType.POSITIVE  # B -> Total (+)
                ]
                b_branch = []
                for var_b_act in b_act_candidates:
                    b_ng_list = [
                        v for v in cld.variables
                        if v.id not in {var_total.id, var_gain.id, var_b_act.id}
                        and rel_map.get((var_b_act.id, v.id)) == RelationshipType.POSITIVE   # B -> NG_B (+)
                        and rel_map.get((v.id, var_b_act.id)) == RelationshipType.POSITIVE   # NG_B -> B (+)
                        and rel_map.get((var_gain.id, v.id)) == RelationshipType.POSITIVE    # Gain -> NG_B (+)
                    ]
                    for var_b_ng in b_ng_list:
                        b_branch.append((var_b_act, var_b_ng))
                if not b_branch:
                    continue

                # Step 4: combine branches and resource limit
                for (var_a_act, var_a_ng) in a_branch:
                    for (var_b_act, var_b_ng) in b_branch:
                        for var_rl in rl_candidates:
                            ids = {var_total.id, var_gain.id, var_rl.id, var_a_act.id, var_a_ng.id, var_b_act.id, var_b_ng.id}
                            if len(ids) < 7:
                                continue
                            key = tuple(sorted(ids))
                            if key in created:
                                continue

                            archetype = Archetype(type=ArchetypeType.TRAGEDY_OF_THE_COMMONS, cld=cld)
                            session.add(archetype)
                            cld.archetypes.append(archetype)
                            archetype.variables.extend([var_total, var_gain, var_rl, var_a_act, var_a_ng, var_b_act, var_b_ng])
                            created.add(key)

        return cld.archetypes