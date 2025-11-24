from flask import Blueprint, request, jsonify
from ..viewmodels import VariableViewModel
from ..auth import verify_token
from functools import wraps
from .. import db

variable_routes = Blueprint('variable_routes', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            user_id = verify_token(token)
            if not user_id:
                return jsonify({'message': 'Invalid Token'}), 401
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(user_id, *args, **kwargs)
    return decorated

@variable_routes.route('/variable', methods=['POST'])
@token_required
def create_new_variable(user_id):
    data = request.get_json()
    if not data or not 'name' in data or not 'description' in data:
        return jsonify({'message': 'Bad Request'}), 400

    name = data['name']
    description = data['description']

    view_model = VariableViewModel(db.session)
    variable, message = view_model.create_variable(user_id, name, description)
    
    if not variable:
        return jsonify({'message': message}), 400

    return jsonify({'message': message}), 201

@variable_routes.route('/variables', methods=['GET'])
@token_required
def get_variables(user_id):
    view_model = VariableViewModel(db.session)
    variables, message = view_model.get_user_variables(user_id)
    
    if not variables:
        return jsonify({"message": message}), 200
        
    return jsonify(variables), 200

@variable_routes.route('/variable/<variable_id>', methods=['PUT'])
@token_required
def update_variable_route(user_id, variable_id):
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Bad Request'}), 400
        
    name = data.get('name')
    description = data.get('description')
    
    if not name and not description:
        return jsonify({'message': 'At least one field to update must be provided'}), 400
    
    view_model = VariableViewModel(db.session)
    variable, message = view_model.update_variable(variable_id, user_id, name, description)
    
    if not variable:
        return jsonify({'message': message}), 404
        
    return jsonify({
        'message': message,
        'variable': {
            'id': variable.id,
            'name': variable.name,
            'description': variable.description
        }
    }), 200

@variable_routes.route('/variable/<variable_id>', methods=['DELETE'])
@token_required
def delete_variable_route(user_id, variable_id):
    view_model = VariableViewModel(db.session)
    success, message = view_model.delete_variable(variable_id, user_id)
    
    if not success:
        return jsonify({'message': message}), 404
        
    return jsonify({'message': message}), 200 

@variable_routes.route('/variable/import', methods=['POST'])
@token_required
def import_new_variables(user_id):
    variables_data = request.get_json()
    view_model = VariableViewModel(db.session)
    imported_variables, message = view_model.import_variables(user_id, variables_data)
    
    if not imported_variables:
        return jsonify({'message': message}), 400

    return jsonify({
        'message': message,
        'imported_variables': imported_variables
    }), 201