import uuid
from datetime import datetime
from ..models.repositories import CLDRepository, RelationshipRepository, VariableRepository, CLDHistoryRepository
from ..models.domain_logic import CLDAnalyzer
from ..models.entities import RelationshipType, Variable, CLD, Relationship, CLDHistory, Subsystem
import secrets

class CLDViewModel:
    def __init__(self, db_session):
        self.db_session = db_session
        self.cld_repo = CLDRepository()
        self.rel_repo = RelationshipRepository()
        self.var_repo = VariableRepository()
        self.cld_history_repo = CLDHistoryRepository()
        self.analyzer = CLDAnalyzer
    
    def create_cld(
        self,
        user_id,
        name,
        date_str,
        description,
        variable_ids,
        relationships_data,
        subsystems_data=None,
    ):
        """Create a new Causal Loop Diagram"""
        # Validate date format
        try:
            cld_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return None, "Invalid date format. Use YYYY-MM-DD"
            
        # Validate relationships
        for rel in relationships_data:
            # Check if source and target are the same
            if rel['source_id'] == rel['target_id']:
                return None, "Cannot create relationship with the same source and target variable"

            # Validate relationship structure
            if not all(k in rel for k in ['source_id', 'target_id', 'type']):
                return None, "Each relationship must include source_id, target_id, and type"

            # Validate relationship type
            try:
                rel_type = RelationshipType[rel['type'].upper()]
            except KeyError:
                return None, f"Invalid relationship type. Must be one of: {[t.name for t in RelationshipType]}"
        
        try:
            # Create the CLD
            cld = self.cld_repo.create_cld(
                self.db_session,
                user_id=user_id,
                name=name,
                date=cld_date,
                description=description
            )
            
            # Add variables to CLD
            for var_id in variable_ids:
                variable = self.db_session.query(Variable).filter_by(
                    id=var_id,
                    user_id=user_id
                ).first()
                if not variable:
                    self.db_session.rollback()
                    return None, f"Variable {var_id} not found or does not belong to user"
                cld.variables.append(variable)
            
            # Create relationships
            for rel in relationships_data:
                relationship = self.rel_repo.create_relationship(
                    self.db_session,
                    cld_id=cld.id,
                    source_id=rel['source_id'],
                    target_id=rel['target_id'],
                    rel_type=RelationshipType[rel['type'].upper()],
                    has_delay=rel.get('has_delay', False)
                )

            for sub_data in subsystems_data or []:
                self.insert_subsystem(sub_data, cld_id=cld.id)

            self.db_session.commit()
            self.db_session.refresh(cld)
            
            # Format CLD for response
            cld_data = self._format_cld(cld)
            return cld_data, "CLD created successfully"
            
        except Exception as e:
            self.db_session.rollback()
            return None, f"Error creating CLD: {str(e)}"
    
    def get_user_clds(self, user_id):
        """Get all CLDs for a user"""
        clds = self.cld_repo.get_user_clds(self.db_session, user_id)
        if not clds:
            return [], "No CLDs found"
        
        # Transform to presentation format
        cld_list = [
            {
                'id': cld.id,
                'name': cld.name,
                'description': cld.description,
                'date': cld.date.isoformat(),
                'variable_count': len(cld.variables)
            }
            for cld in clds
        ]
        
        return cld_list, "CLDs retrieved successfully"
    
    def get_cld(self, cld_id):
        """Get a specific CLD by ID"""
        cld = self.cld_repo.get_cld_by_id(self.db_session, cld_id)
        if not cld:
            return None, "CLD not found or not owned by user"
        
        cld_data = self._format_cld(cld)
        return cld_data, "CLD retrieved successfully"
    
    def get_relationships_by_cld(self, cld_id, user_id):
        """Get relationships for a specific CLD"""
        cld = self.cld_repo.get_cld_by_user(self.db_session, cld_id, user_id)
        if not cld:
            return None, "CLD not found or not owned by user"
        
        relationships = self.rel_repo.get_relationships_by_cld(self.db_session, cld_id)
        
        # Format relationships for response
        relationships_data = [
            {
                'id': rel.id,
                'source_id': rel.source_id,
                'target_id': rel.target_id,
                'type': rel.type.name,
                'has_delay': rel.has_delay
            } 
            for rel in relationships
        ]
        
        # Return empty array if no relationships found
        return relationships_data, "Relationships retrieved successfully"

    def get_reusable_relationships(self, user_id, exclude_cld_id=None):
        """Get relationships from all user CLDs, optionally excluding a specific CLD"""
        rows = self.rel_repo.get_relationships_by_user_clds(self.db_session, user_id, exclude_cld_id)

        rels_data = [
            {
                'id': rel.id,
                'cld_id': rel.cld_id,
                'cld_name': cld_name,
                'source_id': rel.source_id,
                'target_id': rel.target_id,
                'type': rel.type.name,
                'has_delay': rel.has_delay
            }
            for rel, cld_name in rows
        ]

        return rels_data, "Reusable relationships retrieved successfully"
    
    def update_cld(self, cld_id, user_id, name=None, description=None, date_str=None, variables=None, relationships=None, share_token=None, subsystems = None):
        """Update an existing CLD"""
        date = None
        if date_str:
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return None, "Invalid date format. Use YYYY-MM-DD"

        try:
            # Add debug logging
            print(f"ViewModel: Updating CLD {cld_id} with name={name}, description={description}, date={date}")
            if variables:
                print(f"ViewModel: Updating variables: {variables}")
            if relationships:
                print(f"ViewModel: Updating relationships: {relationships}")
            
            # Get the CLD first to verify it exists
            if share_token:
                cld = self.db_session.query(CLD).filter_by(id=cld_id, share_token=share_token).first()
            else:
                cld = self.cld_repo.get_cld_by_user(self.db_session, cld_id, user_id)
            if not cld:
                return None, "CLD not found or not owned by user"
                
            # Update the CLD fields
            if name is not None:
                cld.name = name
            if description is not None:
                cld.description = description
            if date is not None:
                cld.date = date
            
            # Update variables if provided
            if variables is not None:
                # Clear existing variables
                cld.variables = []
                # Add new variables
                for var_id in variables:
                    variable = self.var_repo.get_variable_by_id(self.db_session, var_id)
                    if not variable:
                        self.db_session.rollback()
                        return None, f"Variable {var_id} not found or does not belong to user"
                    cld.variables.append(variable)
            
            # Update relationships if provided
            if relationships is not None:
                # Delete existing relationships
                self.db_session.query(Relationship).filter_by(cld_id=cld_id).delete()
                # Add new relationships
                for rel in relationships:
                    if rel['source_id'] == rel['target_id']:
                        self.db_session.rollback()
                        return None, "Cannot create relationship with the same source and target variable"
                    
                    # Validate relationship type
                    try:
                        rel_type = RelationshipType[rel['type'].upper()]
                    except KeyError:
                        self.db_session.rollback()
                        return None, f"Invalid relationship type. Must be one of: {[t.name for t in RelationshipType]}"

                    
                    relationship = Relationship(
                        cld_id=cld_id,
                        source_id=rel['source_id'],
                        target_id=rel['target_id'],
                        type=rel_type,
                        has_delay=rel['has_delay'],
                    )
                    self.db_session.add(relationship)

            if subsystems is not None:
                self.db_session.query(Subsystem).filter_by(cld_id=cld_id).delete()
                self.db_session.flush()
                for sub_data in subsystems:
                    self.insert_subsystem(sub_data, cld_id=cld_id)
                
            # Commit the changes directly
            self.db_session.commit()
            
            # Refresh to ensure we have the latest data
            self.db_session.refresh(cld)
            
            # Get the updated CLD data in formatted form
            cld_data = self._format_cld(cld)
            
            # Debug output to check the formatted data
            print(f"ViewModel: Updated CLD data: {cld_data}")
            
            return cld_data, "CLD updated successfully"
        except Exception as e:
            self.db_session.rollback()
            print(f"Error in update_cld: {str(e)}")
            return None, f"Error updating CLD: {str(e)}"
    
    def delete_cld(self, cld_id, user_id):
        """Delete a CLD"""
        try:
            result = self.cld_repo.delete_cld(self.db_session, cld_id, user_id)
            if not result:
                return False, "CLD not found or not owned by user"
                
            return True, "CLD deleted successfully"
        except Exception as e:
            self.db_session.rollback()
            return False, f"Error deleting CLD: {str(e)}"
    
    def identify_feedback_loops(self, cld_id):
        """Identify feedback loops in a CLD"""
        cld = self.cld_repo.get_cld_by_id(self.db_session, cld_id)
        if not cld:
            return None, "CLD not found or not owned by user"
            
        try:
            # First, clear existing feedback loops
            for loop in list(cld.feedback_loops):
                self.db_session.delete(loop)
            cld.feedback_loops = []
            self.db_session.flush()
            
            # Use domain logic to identify feedback loops
            feedback_loops = self.analyzer.identify_feedback_loops(cld, self.db_session)
            
            # Commit the changes
            self.db_session.commit()
            
            # Format feedback loops for response
            loops_data = [
                {
                    'id': loop.id,
                    'type': loop.type.name,
                    'variables': [var.id for var in loop.variables]
                }
                for loop in feedback_loops
            ]
            
            # Return empty array if no feedback loops found
            return loops_data, "Feedback loops identified successfully"
        except Exception as e:
            self.db_session.rollback()
            return None, f"Error identifying feedback loops: {str(e)}"
    
    def identify_archetypes(self, cld_id):
        """Identify system archetypes in a CLD"""
        cld = self.cld_repo.get_cld_by_id(self.db_session, cld_id)
        if not cld:
            return None, "CLD not found or not owned by user"
            
        try:
            # First, clear existing archetypes
            for arch in list(cld.archetypes):
                self.db_session.delete(arch)
            cld.archetypes = []
            self.db_session.flush()
            
            # Use domain logic to identify archetypes
            archetypes = self.analyzer.identify_archetypes(cld, self.db_session)
            
            # Commit the changes
            self.db_session.commit()
            
            # Format archetypes for response
            archetypes_data = [
                {
                    'id': arch.id,
                    'type': arch.type.name,
                    'variables': [var.id for var in arch.variables]
                }
                for arch in archetypes
            ]
            
            # Return empty array if no archetypes found
            return archetypes_data, "Archetypes identified successfully"
        except Exception as e:
            self.db_session.rollback()
            return None, f"Error identifying archetypes: {str(e)}"
    
    def _format_cld(self, cld):
        """Format a CLD entity for response"""
        relationships = self.rel_repo.get_relationships_by_cld(self.db_session, cld.id)
        
        return {
            'id': cld.id,
            'name': cld.name,
            'description': cld.description,
            'date': cld.date.isoformat(),
            'variables': [
                {
                    'id': var.id,
                    'name': var.name,
                    'description': var.description
                } 
                for var in cld.variables
            ],
            'relationships': [
                {
                    'id': rel.id,
                    'source_id': rel.source_id,
                    'target_id': rel.target_id,
                    'type': rel.type.name,
                    'has_delay': rel.has_delay,
                } 
                for rel in relationships
            ],
            'feedback_loops': [
                {
                    'id': loop.id,
                    'type': loop.type.name,
                    'variables': [var.id for var in loop.variables]
                } 
                for loop in cld.feedback_loops
            ],
            'archetypes': [
                {
                    'id': arch.id,
                    'type': arch.type.name,
                    'variables': [var.id for var in arch.variables]
                } 
                for arch in cld.archetypes
            ],
            'subsystems': self.build_subsystem_tree(cld, parent_id=None)
        }

    def generate_share_token(self, cld_id, user_id):
        """Generate or retrieve a persistent share token for a CLD.

        If the CLD does not already have a share token, create a new
        cryptographically-secure token and persist it. Returns the token
        and a status message, or (None, message) if the CLD wasn't found
        or doesn't belong to the requesting user.
        """
        cld = self.cld_repo.get_cld_by_user(self.db_session, cld_id, user_id)
        if not cld:
            return None, "CLD not found or not owned by user"

        # Se não tiver token, gera um novo seguro
        if not cld.share_token:
            cld.share_token = secrets.token_urlsafe(32)
            self.db_session.commit()

        return cld.share_token, "Share token retrieved successfully"

    def revoke_share_token(self, cld_id, user_id):
        """Revoke (delete) the current share token for a CLD.

        This removes the existing share token so any previously issued
        share links become invalid. Returns (True, message) on success
        or (False, message) if the CLD wasn't found or doesn't belong
        to the requesting user.
        """
        cld = self.cld_repo.get_cld_by_user(self.db_session, cld_id, user_id)
        if not cld:
            return False, "CLD not found or not owned by user"

        cld.share_token = None
        self.db_session.commit()
        return True, "Share token revoked successfully"

    def get_cld_by_token(self, token):
        """Retrieve a CLD by its share token for guest access.

        Look up the CLD associated with the provided share token. If the
        token is invalid or has been revoked, return (None, message).
        On success return the formatted CLD data and a success message.
        """
        cld = self.db_session.query(CLD).filter_by(share_token=token).first()
        if not cld:
            return None, "Invalid or revoked share token"

        cld_data = self._format_cld(cld)
        return cld_data, "CLD retrieved successfully"

    def get_cld_by_id(self, cld_id):
        """Get a CLD entity by its ID.

        This returns the raw CLD object (not the formatted dict). If the
        CLD does not exist return (None, message). Note: caller is
        responsible for verifying ownership where necessary.
        """
        cld = self.cld_repo.get_cld_by_id(self.db_session, cld_id)
        if not cld:
            return None, "CLD not found or not owned by user"

        return cld, "CLD retrieved successfully"

    def get_cld_owner_variables(self, user_id):
        """Return variables that belong to a given user.

        This helper fetches all variables owned by the user. Returns a
        list of Variable objects and a message, or (None, message) when
        no variables are found.
        """

        variables = self.var_repo.get_user_variables(self.db_session, user_id)
        if not variables:
            return None, "Variables not found"
        return variables, "Variables retrieved successfully"


    def get_owner_id(self, token):
        """Return the owner (user_id) of a CLD identified by a share token.

        Useful to determine which user created the shared CLD. Returns
        the user_id integer or None if the token is invalid or revoked.
        """
        cld = self.db_session.query(CLD).filter_by(share_token=token).first()
        if not cld:
            return None
        return cld.user_id

    def get_cld_history(self, cld_id):
        histories = self.cld_history_repo.get_history(self.db_session, cld_id)
        result = []
        for h in histories:
            result.append({
                'id': h.id,
                'user_name': h.user.name if h.user else 'Unknown User',
                'action_summary': h.action_summary,
                'timestamp': h.timestamp.isoformat()
            })
        return result

    def analyze_live_state(self, nodes_data, edges_data):
        try:
            class MockSession:
                def add(self, instance):
                    pass

            mock_session = MockSession()

            temp_cld = CLD(id="live-preview-id", name="Live Preview")

            for n in nodes_data:
                var = Variable(id=n.get('id'), name=n.get('name', 'Unnamed'))
                temp_cld.variables.append(var)

            for e in edges_data:
                polarity_str = str(e.get('polarity')).upper()
                rel_type = RelationshipType.POSITIVE if polarity_str in ['POSITIVE', '+'] else RelationshipType.NEGATIVE

                rel = Relationship(
                    id=str(uuid.uuid4()),
                    source_id=e.get('source'),
                    target_id=e.get('target'),
                    type=rel_type,
                    has_delay=e.get('has_delay'),
                )
                temp_cld.relationships.append(rel)


            self.analyzer.identify_feedback_loops(temp_cld, mock_session)
            self.analyzer.identify_archetypes(temp_cld, mock_session)

            loops_data = [
                {
                    'id': loop.id,
                    'type': loop.type.name if hasattr(loop.type, 'name') else str(loop.type),
                    'variables': [var.id for var in loop.variables]
                }
                for loop in temp_cld.feedback_loops
            ]

            archetypes_data = [
                {
                    'id': arch.id,
                    'type': arch.type.name if hasattr(arch.type, 'name') else str(arch.type),
                    'variables': [var.id for var in arch.variables]
                }
                for arch in temp_cld.archetypes
            ]

            return {
                "loops": loops_data,
                "archetypes": archetypes_data
            }, "Live analysis completed successfully"

        except Exception as e:
            import traceback
            traceback.print_exc()
            return None, f"Error analyzing live state: {str(e)}"


    def createEmptyCLD(self, user_id, name, date_str, description):

        try:
            cld_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return None, "Invalid date format. Use YYYY-MM-DD"

        try:
            # Create the CLD
            cld = self.cld_repo.create_cld(
                self.db_session,
                user_id=user_id,
                name=name,
                date=cld_date,
                description=description
            )
            return cld.id, "CLD created successfully"
        except Exception as e:
            self.db_session.rollback()
            return None, f"Error creating CLD: {str(e)}"

    def insert_subsystem(self, sub_data, parent_id=None, cld_id=None):
        # Prevent inserting the dummy 'global' layer from frontend
        if sub_data.get('id') == 'global':
            return

        sub_id = f"subsystem-{str(uuid.uuid4())[:8]}"

        # Create the Subsystem record
        sub_model = Subsystem(
            id=sub_id,
            name=sub_data.get('name', 'Unnamed'),
            description=sub_data.get('description', ''),
            cld_id=cld_id,
            parent_id=parent_id
        )
        self.db_session.add(sub_model)

        # Link existing variables (shapeIds) to this subsystem
        var_ids = sub_data.get('variableIds', [])
        if var_ids:
            vars_to_link = self.db_session.query(Variable).filter(Variable.id.in_(var_ids)).all()
            sub_model.variables.extend(vars_to_link)

        # Recursively process children
        for child_data in sub_data.get('sublayers', []):
            self.insert_subsystem(child_data, parent_id=sub_id, cld_id=cld_id)

    def build_subsystem_tree(self, cld, parent_id=None):
        tree = []
        # Find children for the current parent
        children = [s for s in cld.subsystems if s.parent_id == parent_id]
        for child in children:
            node = {
                'id': child.id,
                'name': child.name,
                'description': child.description,
                'variableIds': [v.id for v in child.variables],  # Extract linked variable IDs
                'sublayers': self.build_subsystem_tree(cld, child.id)  # Recurse
            }
            tree.append(node)
        return tree