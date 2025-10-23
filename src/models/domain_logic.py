import networkx as nx
from .entities import RelationshipType, LoopType, ArchetypeType, FeedbackLoop, Archetype
from collections import defaultdict, deque

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

    # === Helpers para loops assinados ===
    @staticmethod
    def _edge_sign_map(cld):
        """Mapeia (u,v) -> +1|-1."""
        emap = {}
        for r in cld.relationships:
            emap[(r.source_id, r.target_id)] = +1 if r.type == RelationshipType.POSITIVE else -1
        return emap

    @staticmethod
    def _path_sign_on_cycle(cycle, i, j, edge_sign):
        """
        Produto de sinais ao andar no ciclo de cycle[i] -> ... -> cycle[j] (seguindo a ordem da lista, circular).
        cycle é uma lista de nós sem repetição; o último liga de volta ao primeiro.
        """
        n = len(cycle)
        if n == 0 or i == j:
            return +1  # empty path: +1
        s = +1
        k = i
        while k != j:
            u = cycle[k]
            v = cycle[(k + 1) % n]
            s *= edge_sign.get((u, v), +1)  # assume +1 if missing (shouldn't happen)
            k = (k + 1) % n
        return s

    @staticmethod
    def _cycle_net_sign(cycle, edge_sign):
        """Produto de sinais do ciclo inteiro."""
        n = len(cycle)
        s = +1
        for k in range(n):
            u = cycle[k]
            v = cycle[(k + 1) % n]
            s *= edge_sign.get((u, v), +1)
        return s  # +1 => REINFORCING ; -1 => BALANCING
    
    @staticmethod
    def _archetype_key(type_, vars_):
        """
        Build a stable deduplication key based on archetype type and
        the unordered set of variable IDs.
        """
        var_ids = sorted(v.id for v in vars_)
        return (type_.value, tuple(var_ids))

    @staticmethod
    def _archetype_exists(cld, type_, var_ids_set):
        """
        Return True if an archetype of the same type with the exact same
        set of variables is already attached to this CLD.
        """
        target = set(var_ids_set)
        for a in cld.archetypes:
            if a.type == type_:
                current = {v.id for v in a.variables}
                if current == target:
                    return True
        return False
    
    @staticmethod
    def _find_ftf_by_ps_f(cld, ps_id, f_id):
        """
        Return an existing 'Fixes that Fail' archetype instance on this CLD
        that already contains both PS and F (order-independent).
        """
        for a in cld.archetypes:
            if a.type != ArchetypeType.FIXES_THAT_FAIL:
                continue
            ids = {v.id for v in a.variables}
            if ps_id in ids and f_id in ids:
                return a
        return None


    @staticmethod
    def identify_archetypes(cld, session):
        """Identifies system archetypes within the CLD."""
        CLDAnalyzer._identify_fixes_that_fail(cld, session, replace=True)
        CLDAnalyzer._identify_shifting_the_burden(cld, session)
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
        Detect 'Shifting the Burden' allowing intermediate nodes, but stricter to avoid
        false positives when the structure is really just 'Fixes that Fail'.

        Required pattern:
        • Two distinct BALANCING loops that share only the same PS node:
            B1 includes (PS, SS)  and has net sign = NEGATIVE
            B2 includes (PS, FS)  and has net sign = NEGATIVE
            Constraint: SS ∉ B2 and FS ∉ B1  (prevents one single loop serving both sides).
        • A reinforcing detour R3:
            sign(SS → … → SE) = POSITIVE
            sign(SE → … → FS) = NEGATIVE
            Constraint: SE ∉ (B1 ∪ B2)  (keeps the side-effect as a separate detour).

        We enumerate simple cycles for candidates of B1/B2 and use a signed-path BFS to
        validate the detour R3. We also prune any previously created Fixes-That-Fail
        whose variables are fully contained in the STB instance found.
        """
        import networkx as nx
        from collections import defaultdict, deque

        POS, NEG = +1, -1

        # ---- Signed edges + digraph for cycles
        edge_sign = CLDAnalyzer._edge_sign_map(cld)
        G = nx.DiGraph()
        for v in cld.variables:
            G.add_node(v.id)
        for (u, v), _s in edge_sign.items():
            G.add_edge(u, v)

        # ---- All balancing cycles (net sign = −1)
        all_cycles = list(nx.simple_cycles(G))
        bal_cycles = [cyc for cyc in all_cycles
                    if CLDAnalyzer._cycle_net_sign(cyc, edge_sign) == NEG]

        def in_cycle(cyc, *nodes):
            return all(n in cyc for n in nodes)

        # ---- Signed simple-path BFS (find one path with a desired sign)
        MAX_HOPS = 100
        adj = defaultdict(list)
        for (u, v), s in edge_sign.items():
            adj[u].append((v, s))

        def find_one_signed_path(src, dst, desired_sign):
            q = deque([(src, POS)])
            prev = {(src, POS): None}
            hops = {(src, POS): 0}
            while q:
                node, acc = q.popleft()
                if node == dst and acc == desired_sign:
                    # rebuild
                    path = []
                    cur = (node, acc)
                    while cur is not None:
                        path.append(cur[0])
                        cur = prev[cur]
                    return list(reversed(path))
                if hops[(node, acc)] >= MAX_HOPS:
                    continue
                for nb, es in adj.get(node, []):
                    ns = POS if (acc == es) else NEG
                    st = (nb, ns)
                    if st in hops:
                        continue
                    hops[st] = hops[(node, acc)] + 1
                    prev[st] = (node, acc)
                    q.append(st)
            return None

        created = set()
        id2var = {v.id: v for v in cld.variables}

        def add_if_new(type_, node_ids):
            key = (type_.value, tuple(sorted(node_ids)))
            if key in created or CLDAnalyzer._archetype_exists(cld, type_, node_ids):
                return None
            a = Archetype(type=type_, cld=cld)
            session.add(a)
            cld.archetypes.append(a)
            for nid in node_ids:
                if nid in id2var:
                    a.variables.append(id2var[nid])
            created.add(key)
            return a

        def prune_ftfs_contained(nodes_set_ids):
            """
            Remove any Fixes-That-Fail archetype whose variable set is a subset
            of 'nodes_set_ids'. This is used to suppress FTFs fully covered by a STB.
            """
            to_drop = []
            # iterate over a copy, because we'll mutate cld.archetypes
            for a in list(cld.archetypes):
                if a.type != ArchetypeType.FIXES_THAT_FAIL:
                    print("skip", a.type)
                    continue
                a_ids = {v.id for v in a.variables}
                print("check", a_ids, nodes_set_ids)
                if a_ids and a_ids.issubset(nodes_set_ids):
                    to_drop.append(a)
            if not to_drop:
                return
            # remove from CLD and try to mark for deletion in the session
            for a in to_drop:
                try:
                    cld.archetypes.remove(a)
                except ValueError:
                    pass
                try:
                    session.delete(a)
                except Exception:
                    # if it's not persistent yet, ignore
                    pass

        # ---- Search
        for ps_var in cld.variables:
            ps = ps_var.id

            # Try every SS and FS
            for ss_var in cld.variables:
                ss = ss_var.id
                if ss == ps:
                    continue

                # B1 cycles that contain (PS, SS)
                b1_list = [cyc for cyc in bal_cycles if in_cycle(cyc, ps, ss)]
                if not b1_list:
                    continue

                for fs_var in cld.variables:
                    fs = fs_var.id
                    if fs in (ps, ss):
                        continue

                    # B2 cycles that contain (PS, FS)
                    b2_list = [cyc for cyc in bal_cycles if in_cycle(cyc, ps, fs)]
                    if not b2_list:
                        continue

                    # --- Enforce separation: SS not in B2 and FS not in B1,
                    #     and the intersection of chosen B1/B2 is exactly {PS}.
                    good_pairs = []
                    for b1 in b1_list:
                        if fs in b1:
                            continue
                        set_b1 = set(b1)
                        for b2 in b2_list:
                            if ss in b2:
                                continue
                            set_b2 = set(b2)
                            inter = set_b1 & set_b2
                            if inter == {ps}:           # share only PS
                                good_pairs.append((set_b1, set_b2))
                    if not good_pairs:
                        continue

                    # --- Detour R3: SS -> … -> SE ( + ), SE -> … -> FS ( − ), with SE outside B1∪B2
                    for b1_nodes, b2_nodes in good_pairs:
                        core_nodes = b1_nodes | b2_nodes
                        for se_var in cld.variables:
                            se = se_var.id
                            if se in core_nodes or se in (ps, ss, fs):
                                continue
                            p1 = find_one_signed_path(ss, se, POS)
                            if not p1:
                                continue
                            p2 = find_one_signed_path(se, fs, NEG)
                            if not p2:
                                continue

                            # candidate node set for this STB
                            stb_nodes = set(p1) | set(p2) | core_nodes
                            
                            prune_ftfs_contained(stb_nodes)

                            # add STB if still new
                            add_if_new(ArchetypeType.SHIFTING_THE_BURDEN, stb_nodes)

        return cld.archetypes

    
    @staticmethod
    def _identify_fixes_that_fail(cld, session, replace: bool = False, uc_must_be_internal: bool = True, strict_b1=False):
        """
        Identify the 'Fixes that Fail' archetype, allowing intermediate nodes.

        Required structure:
        • B1 (balancing): NEGATIVE cycle containing PS and F with
            sign(PS → … → F) = + , sign(F → … → PS) = −
        • R2 (reinforcing): POSITIVE cycle containing PS and F with
            sign(F → … → PS) = +
        • UCs: along the F … PS arc of R2, any node UC with
            sign(F → … → UC) = + and sign(UC → … → PS) = +

        We also include *intermediate* nodes from:
        • the PS … F arc of B1
        • the F … PS arc of R2
        """

        # Optional reset
        if replace:
            cld.archetypes[:] = [a for a in cld.archetypes if a.type != ArchetypeType.FIXES_THAT_FAIL]

        # Signed edges + graph
        edge_sign = CLDAnalyzer._edge_sign_map(cld)
        G = nx.DiGraph()
        for v in cld.variables:
            G.add_node(v.id)
        for (u, v), _ in edge_sign.items():
            G.add_edge(u, v)

        # Cycles (bounded)
        MAX_CYCLES = 5000
        MAX_CYCLE_LEN = 12
        cycles = []
        for cyc in nx.simple_cycles(G):
            if 2 <= len(cyc) <= MAX_CYCLE_LEN:
                cycles.append(cyc)
                if len(cycles) >= MAX_CYCLES:
                    break

        # Index cycles by node
        idx_by_node = {}
        for ci, cyc in enumerate(cycles):
            for n in cyc:
                idx_by_node.setdefault(n, []).append(ci)

        id2var = {v.id: v for v in cld.variables}

        # small helper: nodes strictly between i and j along the directed cycle order
        def arc_nodes(cyc, i, j):
            n = len(cyc)
            out = []
            k = (i + 1) % n
            while k != j:
                out.append(cyc[k])
                k = (k + 1) % n
            return out

        grouped = {}  # (ps_id, f_id) -> {"ucs": set(), "supp": set()}

        for ps in cld.variables:
            for f in cld.variables:
                if f.id == ps.id:
                    continue

                # ---------- 1) B1 candidates ----------
                b1_cycles = []
                cand = set(idx_by_node.get(ps.id, [])) & set(idx_by_node.get(f.id, []))
                for ci in cand:
                    cyc = cycles[ci]
                    i = cyc.index(ps.id)
                    j = cyc.index(f.id)
                    s_ps_f = CLDAnalyzer._path_sign_on_cycle(cyc, i, j, edge_sign)
                    s_f_ps = CLDAnalyzer._path_sign_on_cycle(cyc, j, i, edge_sign)

                    neg_cycle = (CLDAnalyzer._cycle_net_sign(cyc, edge_sign) == -1)

                    # Strict B1 (textbook): cycle NEGATIVE and PS→…→F = +, F→…→PS = −
                    if neg_cycle and s_ps_f == +1 and s_f_ps == -1:
                        b1_cycles.append(cyc)
                        continue

                    # Lenient B1: accept any cycle having F→…→PS negative
                    if not strict_b1 and s_f_ps == -1:
                        b1_cycles.append(cyc)

                if not b1_cycles:
                    continue

                # ---------- 2) R2 candidates ----------
                r2_cycles = []
                for ci in cand:
                    cyc = cycles[ci]
                    if CLDAnalyzer._cycle_net_sign(cyc, edge_sign) != +1:  # POSITIVE
                        continue
                    j = cyc.index(f.id)
                    i = cyc.index(ps.id)
                    s_f_ps = CLDAnalyzer._path_sign_on_cycle(cyc, j, i, edge_sign)
                    if s_f_ps == +1:
                        r2_cycles.append(cyc)
                if not r2_cycles:
                    continue

                # ---------- 3) Coletar UCs e intermediários ----------
                ucs_union = set()
                support_nodes_union = set()

                # Intermediários do PS..F (em B1)
                for b1 in b1_cycles:
                    i_ps_b1 = b1.index(ps.id)
                    j_f_b1  = b1.index(f.id)
                    support_nodes_union.update(arc_nodes(b1, i_ps_b1, j_f_b1))
                    support_nodes_union.update(arc_nodes(b1, j_f_b1, i_ps_b1))

                # Intermediários e UCs no F..PS (em R2)
                for r2 in r2_cycles:
                    n = len(r2)
                    idx_f  = r2.index(f.id)
                    idx_ps = r2.index(ps.id)

                    # intermediários no arco F..PS
                    support_nodes_union.update(arc_nodes(r2, idx_f, idx_ps))

                    # UCs = nós no arco F..PS com (+) nos dois segmentos
                    k = (idx_f + 1) % n
                    while k != idx_ps:
                        uc_id = r2[k]
                        s_f_uc  = CLDAnalyzer._path_sign_on_cycle(r2, idx_f, k,      edge_sign)
                        s_uc_ps = CLDAnalyzer._path_sign_on_cycle(r2, k,     idx_ps, edge_sign)
                        if s_f_uc == +1 and s_uc_ps == +1:
                            if uc_must_be_internal:
                                r2_nodes = set(r2)
                                if any(p not in r2_nodes for p in G.predecessors(uc_id)):
                                    k = (k + 1) % n
                                    continue
                            ucs_union.add(uc_id)
                        k = (k + 1) % n

                if not ucs_union and not support_nodes_union:
                    continue

                key = (ps.id, f.id)
                entry = grouped.setdefault(key, {"ucs": set(), "supp": set()})
                entry["ucs"].update(ucs_union)
                entry["supp"].update(support_nodes_union)

        # ---------- 4) Merge: um FTF por (PS,F) com UCs + intermediários ----------
        for (ps_id, f_id), payload in grouped.items():
            ps = id2var[ps_id]
            f  = id2var[f_id]
            ucs   = sorted((id2var[u] for u in payload["ucs"]),  key=lambda x: x.name.lower())
            supp  = sorted((id2var[s] for s in payload["supp"]), key=lambda x: x.name.lower())

            existing = CLDAnalyzer._find_ftf_by_ps_f(cld, ps_id, f_id)
            if existing:
                keep = {v.id: v for v in existing.variables}
                keep[ps_id] = ps
                keep[f_id]  = f
                for node in (*supp, *ucs):
                    keep[node.id] = node
                existing.variables.clear()
                existing.variables.extend(
                    [ps, f] + sorted(
                        [v for vid, v in keep.items() if vid not in {ps_id, f_id}],
                        key=lambda x: x.name.lower()
                    )
                )
            else:
                a = Archetype(type=ArchetypeType.FIXES_THAT_FAIL, cld=cld)
                cld.archetypes.append(a)
                session.add(a)
                a.variables.extend([ps, f, *supp, *ucs])

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