from ..models.repositories import VariableRepository

class VariableViewModel:
    def __init__(self, db_session):
        self.db_session = db_session
        self.variable_repo = VariableRepository()
    
    def create_variable(self, user_id, name, description):
        """Create a new variable for a user"""
        # Check if variable with same name already exists for this user
        existing_variables = self.variable_repo.get_user_variables(self.db_session, user_id)
        for var in existing_variables:
            if var.name == name:
                return None, "Variable with this name already exists"
        
        # Create new variable
        try:
            variable = self.variable_repo.create_variable(self.db_session, user_id, name, description)
            return variable, "Variable created successfully"
        except Exception as e:
            return None, f"Error creating variable: {str(e)}"
    
    def get_user_variables(self, user_id):
        """Get all variables for a user"""
        variables = self.variable_repo.get_user_variables(self.db_session, user_id)
        if not variables:
            return [], "No variables found"
        
        # Transform to presentation format
        variable_list = [
            {
                'id': var.id, 
                'name': var.name, 
                'description': var.description
            } 
            for var in variables
        ]
        
        return variable_list, "Variables retrieved successfully"
    
    def update_variable(self, variable_id, user_id, name=None, description=None):
        """Update an existing variable"""
        try:
            variable = self.variable_repo.update_variable(
                self.db_session, 
                variable_id, 
                user_id, 
                name, 
                description
            )
            
            if not variable:
                return None, "Variable not found or not owned by user"
                
            return variable, "Variable updated successfully"
        except Exception as e:
            return None, f"Error updating variable: {str(e)}"
    
    def delete_variable(self, variable_id, user_id):
        """Delete a variable"""
        try:
            result = self.variable_repo.delete_variable(self.db_session, variable_id, user_id)
            if not result:
                return False, "Variable not found or not owned by user"
                
            return True, "Variable deleted successfully"
        except Exception as e:
            return False, f"Error deleting variable: {str(e)}" 