from datetime import datetime
from ..models.repositories import CLDRepository, RelationshipRepository, VariableRepository
from ..models.domain_logic import CLDAnalyzer
from ..models.entities import RelationshipType, Variable, CLD, Relationship

class CLDViewModel:
    def __init__(self, db_session):
        self.db_session = db_session
        self.cld_repo = CLDRepository()
        self.rel_repo = RelationshipRepository()
        self.var_repo = VariableRepository()
        self.analyzer = CLDAnalyzer
    
    def create_cld(self, user_id, name, date_str, description, variable_ids, relationships_data):
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
                    rel_type=RelationshipType[rel['type'].upper()]
                )
            
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
    
    def get_cld(self, cld_id, user_id):
        """Get a specific CLD by ID"""
        cld = self.cld_repo.get_cld_by_user(self.db_session, cld_id, user_id)
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
                'type': rel.type.value
            } 
            for rel in relationships
        ]
        
        # Return empty array if no relationships found
        return relationships_data, "Relationships retrieved successfully"
    
    def update_cld(self, cld_id, user_id, name=None, description=None, date_str=None, variables=None, relationships=None):
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
                    variable = self.db_session.query(Variable).filter_by(
                        id=var_id,
                        user_id=user_id
                    ).first()
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
                        type=rel_type
                    )
                    self.db_session.add(relationship)
                
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
            return False, f"Error deleting CLD: {str(e)}"
    
    def identify_feedback_loops(self, cld_id, user_id):
        """Identify feedback loops in a CLD"""
        cld = self.cld_repo.get_cld_by_user(self.db_session, cld_id, user_id)
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
                    'type': loop.type.value,
                    'variables': [var.id for var in loop.variables]
                }
                for loop in feedback_loops
            ]
            
            # Return empty array if no feedback loops found
            return loops_data, "Feedback loops identified successfully"
        except Exception as e:
            self.db_session.rollback()
            return None, f"Error identifying feedback loops: {str(e)}"
    
    def identify_archetypes(self, cld_id, user_id):
        """Identify system archetypes in a CLD"""
        cld = self.cld_repo.get_cld_by_user(self.db_session, cld_id, user_id)
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
                    'type': arch.type.value,
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
                    'type': rel.type.value
                } 
                for rel in relationships
            ],
            'feedback_loops': [
                {
                    'id': loop.id,
                    'type': loop.type.value,
                    'variables': [var.id for var in loop.variables]
                } 
                for loop in cld.feedback_loops
            ],
            'archetypes': [
                {
                    'id': arch.id,
                    'type': arch.type.value,
                    'variables': [var.id for var in arch.variables]
                } 
                for arch in cld.archetypes
            ]
        } 