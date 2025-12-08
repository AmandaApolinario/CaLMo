from flask import Blueprint, request, jsonify
from ..viewmodels import CLDViewModel
from ..auth import verify_token
from functools import wraps
from .. import db

cld_routes = Blueprint('cld_routes', __name__)

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

@cld_routes.route('/cld', methods=['POST'])
@token_required
def create_cld(user_id):
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'date', 'description', 'variables', 'relationships']
    if not all(field in data for field in required_fields):
        return jsonify({
            'message': 'Missing required fields. Need: name, date, description, variables, and relationships'
        }), 400

    view_model = CLDViewModel(db.session)
    result, message = view_model.create_cld(
        user_id,
        data['name'],
        data['date'],
        data['description'],
        data['variables'],
        data['relationships']
    )
    
    if not result:
        return jsonify({'message': message}), 400

    return jsonify({
        'message': 'CLD created successfully',
        'cld': result
    }), 201

@cld_routes.route('/clds', methods=['GET'])
@token_required
def get_user_clds(user_id):
    view_model = CLDViewModel(db.session)
    clds, message = view_model.get_user_clds(user_id)
    
    # Always return an array (even if empty) for consistent frontend handling
    return jsonify(clds), 200

@cld_routes.route('/cld/<string:cld_id>', methods=['GET'])
@token_required
def get_cld(user_id, cld_id):
    view_model = CLDViewModel(db.session)
    cld, message = view_model.get_cld(cld_id, user_id)
    
    if cld is None:  # Error case - CLD not found
        return jsonify({'message': message}), 404
        
    return jsonify(cld), 200

@cld_routes.route('/cld/<cld_id>/relationships', methods=['GET'])
@token_required
def get_relationships(user_id, cld_id):
    view_model = CLDViewModel(db.session)
    relationships, message = view_model.get_relationships_by_cld(cld_id, user_id)
    
    if relationships is None:  # Error case - CLD not found
        return jsonify({'message': message}), 404
    
    # Return empty array with 200 status if no relationships (instead of 404)
    return jsonify({
        'relationships': relationships,
        'cld_id': cld_id,
        'message': message
    }), 200

@cld_routes.route('/cld/<string:cld_id>', methods=['PUT'])
@token_required
def update_cld_route(user_id, cld_id):
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Bad Request'}), 400
        
    # Extract the updatable fields
    name = data.get('name')
    description = data.get('description')
    date = data.get('date')
    variables = data.get('variables')
    relationships = data.get('relationships')
    
    # Validate that at least one field to update is provided
    if not any([name, description, date, variables, relationships]):
        return jsonify({'message': 'At least one field to update must be provided'}), 400
    
    view_model = CLDViewModel(db.session)
    
    # Add debug logging
    print(f"Updating CLD {cld_id} with data: {data}")
    
    # Pass all updatable fields to the view model
    cld, message = view_model.update_cld(
        cld_id, 
        user_id, 
        name, 
        description, 
        date,
        variables,
        relationships
    )
    
    if not cld:
        return jsonify({'message': message}), 404
    
    # Debug output to see what's being returned
    print(f"Update successful: {message}")
    print(f"Updated CLD: {cld}")
        
    # Return both the message and the complete CLD data
    return jsonify(cld), 200

@cld_routes.route('/cld/<cld_id>', methods=['DELETE'])
@token_required
def delete_cld_route(user_id, cld_id):
    view_model = CLDViewModel(db.session)
    success, message = view_model.delete_cld(cld_id, user_id)
    
    if not success:
        return jsonify({'message': message}), 404
        
    return jsonify({'message': message}), 200

@cld_routes.route('/cld/<cld_id>/feedback-loops', methods=['POST', 'GET'])
@token_required
def identify_feedback_loops(user_id, cld_id):
    view_model = CLDViewModel(db.session)
    
    # For GET requests, retrieve existing feedback loops without re-analyzing
    if request.method == 'GET':
        cld, get_message = view_model.get_cld(cld_id, user_id)
        
        if cld is None:  # Error case - CLD not found
            return jsonify({'message': get_message}), 404
            
        # Extract feedback loops from the CLD data
        feedback_loops = cld.get('feedback_loops', [])
        
        return jsonify({
            'message': "Feedback loops retrieved successfully",
            'feedback_loops': feedback_loops
        }), 200
    
    # POST request - analyze and identify feedback loops
    try:
        print(f"Identifying feedback loops for CLD {cld_id}")
        loops, message = view_model.identify_feedback_loops(cld_id, user_id)
        
        if loops is None:  # Error case - CLD not found
            print(f"Error identifying feedback loops: {message}")
            return jsonify({'message': message}), 404
        
        print(f"Successfully identified {len(loops)} feedback loops")
        # Return empty array with 200 status if no feedback loops (instead of 404)
        return jsonify({
            'message': message,
            'feedback_loops': loops
        }), 200
    except Exception as e:
        print(f"Exception in feedback loops endpoint: {str(e)}")
        return jsonify({'message': f"Server error: {str(e)}"}), 500

@cld_routes.route('/cld/<cld_id>/archetypes', methods=['POST', 'GET'])
@token_required
def identify_archetypes(user_id, cld_id):
    view_model = CLDViewModel(db.session)
    
    # For GET requests, retrieve existing archetypes without re-analyzing
    if request.method == 'GET':
        cld, get_message = view_model.get_cld(cld_id, user_id)
        
        if cld is None:  # Error case - CLD not found
            return jsonify({'message': get_message}), 404
            
        # Extract archetypes from the CLD data
        archetypes = cld.get('archetypes', [])
        
        return jsonify({
            'message': "Archetypes retrieved successfully",
            'archetypes': archetypes
        }), 200
        
    # POST request - analyze and identify archetypes
    try:
        print(f"Identifying archetypes for CLD {cld_id}")
        archetypes, message = view_model.identify_archetypes(cld_id, user_id)
        
        if archetypes is None:  # Error case - CLD not found
            print(f"Error identifying archetypes: {message}")
            return jsonify({'message': message}), 404
        
        print(f"Successfully identified {len(archetypes)} archetypes")
        # Return empty array with 200 status if no archetypes (instead of 404)
        return jsonify({
            'message': message,
            'archetypes': archetypes
        }), 200
    except Exception as e:
        print(f"Exception in archetypes endpoint: {str(e)}")
        return jsonify({'message': f"Server error: {str(e)}"}), 500
    
@cld_routes.route('/cld/import', methods=['POST'])
@token_required
def import_clds(user_id):
    data = request.get_json()
    clds = data.get('clds', [])
    if not isinstance(clds, list) or clds is None:
        return jsonify({'message': 'Provide a list of clds'}), 400

    view_model = CLDViewModel(db.session)
    clds_data, message = view_model.import_clds(user_id, clds)

    return jsonify({
        'message': 'Selected CLDs imported successfully',
        'clds': clds_data
    }), 200
    
@cld_routes.route('/cld/export-selected', methods=['POST'])
@token_required
def export_selected_clds(user_id):
    data = request.get_json()
    cld_ids = data.get('cld_ids', [])
    if not isinstance(cld_ids, list):
        return jsonify({'message': 'Provide a list of cld_ids'}), 400

    view_model = CLDViewModel(db.session)
    clds_data, message = view_model.export_clds_by_ids(user_id, cld_ids)

    if clds_data is None or len(clds_data) == 0:
        clds_data = [{
            'date': '',
            'description': '',
            'name': '',
            'relationships': [
                {
                    'source': {'name': '', 'description': ''},
                    'target': {'name': '', 'description': ''},
                    'polarity': ''
                }
            ]
        }]

    return jsonify({
        'message': 'Selected CLDs exported successfully',
        'clds': clds_data
    }), 200