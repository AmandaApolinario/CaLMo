from flask import Blueprint, request, jsonify
from .database import register_user, login_user, create_variable, get_user_variables, get_user_by_email, update_variable, delete_variable, update_cld, delete_cld
from .auth import generate_token, verify_token
from .models import (
    User, 
    Variable, 
    CLD, 
    Relationship,
    RelationshipType,
    FeedbackLoop,
    Archetype,
    LoopType,
    ArchetypeType,
    cld_variables
)
from werkzeug.security import check_password_hash
from functools import wraps
from . import db
from datetime import datetime

routes = Blueprint('routes', __name__)

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

@routes.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not 'name' in data or not 'email' in data or not 'password' in data:
        return jsonify({'message': 'Bad Request'}), 400

    name = data['name']
    email = data['email']
    password = data['password']

    user = get_user_by_email(db.session, email)
    if user:
        return jsonify({'message': 'User already exists'}), 400

    user = register_user(db.session, name, email, password)
    return jsonify({'message': 'User created successfully'}), 201

@routes.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not 'email' in data or not 'password' in data:
        return jsonify({'message': 'Bad Request'}), 400

    email = data['email']
    password = data['password']

    user = login_user(db.session, email, password)
    if not user:
        return jsonify({'message': 'Invalid credentials'}), 401

    token = generate_token(user.id)
    return jsonify({'token': token}), 200

@routes.route('/variable', methods=['POST'])
@token_required
def create_new_variable(user_id):
    data = request.get_json()
    if not data or not 'name' in data or not 'description' in data:
        return jsonify({'message': 'Bad Request'}), 400

    name = data['name']
    description = data['description']

    user_variables = get_user_variables(db.session, user_id)
    for var in user_variables:
        if var.name == name:
            return jsonify({'message': 'Variable already exists'}), 400

    new_variable = create_variable(db.session, user_id, name, description)
    return jsonify({'message': 'Variable created successfully'}), 201

@routes.route('/variables', methods=['GET'])
@token_required
def get_variables(user_id):
    variables = get_user_variables(db.session, user_id)
    if not variables:
        return jsonify({"message": "No variables created so far"}), 200
    variable_list = [{'id': var.id, 'name': var.name, 'description': var.description} for var in variables]
    return jsonify(variable_list), 200

@routes.route('/cld', methods=['POST'])
@token_required
def create_cld(user_id):
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'date', 'description', 'variables', 'relationships']
    if not all(field in data for field in required_fields):
        return jsonify({
            'message': 'Missing required fields. Need: name, date, description, variables, and relationships'
        }), 400

    # Validate date format
    try:
        cld_date = datetime.strptime(data['date'], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    try:
        # Validate relationships
        for rel in data['relationships']:
            # Check if source and target are the same
            if rel['source_id'] == rel['target_id']:
                return jsonify({
                    'message': 'Cannot create relationship with the same source and target variable'
                }), 400

            # Validate relationship structure
            if not all(k in rel for k in ['source_id', 'target_id', 'type']):
                return jsonify({
                    'message': 'Each relationship must include source_id, target_id, and type'
                }), 400

            # Validate relationship type
            try:
                rel_type = RelationshipType[rel['type'].upper()]
            except KeyError:
                return jsonify({
                    'message': f'Invalid relationship type. Must be one of: {[t.name for t in RelationshipType]}'
                }), 400

        # Create the CLD
        cld = CLD(
            user_id=user_id,
            name=data['name'],
            date=cld_date,
            description=data['description']
        )
        db.session.add(cld)
        db.session.flush()  # Get the CLD ID without committing

        # Add variables to CLD
        for var_id in data['variables']:
            variable = db.session.query(Variable).filter_by(
                id=var_id,
                user_id=user_id
            ).first()
            if not variable:
                db.session.rollback()
                return jsonify({
                    'message': f'Variable {var_id} not found or does not belong to user'
                }), 404
            cld.variables.append(variable)

        # Create relationships
        for rel in data['relationships']:
            relationship = Relationship(
                cld_id=cld.id,
                source_id=rel['source_id'],
                target_id=rel['target_id'],
                type=RelationshipType[rel['type'].upper()]
            )
            db.session.add(relationship)

        # Commit all changes
        db.session.commit()

        # Update the CLD model with relationships and archetypes
        cld = db.session.query(CLD).filter_by(id=cld.id).first()
        relationships = db.session.query(Relationship).filter_by(cld_id=cld.id).all()
        archetypes = db.session.query(Archetype).filter_by(cld_id=cld.id).all()

        return jsonify({
            'message': 'CLD created successfully',
            'cld': {
                'id': cld.id,
                'name': cld.name,
                'description': cld.description,
                'date': cld.date.isoformat(),
                'variables': [var.id for var in cld.variables],
                'relationships': [{
                    'id': rel.id,
                    'source_id': rel.source_id,
                    'target_id': rel.target_id,
                    'type': rel.type.value
                } for rel in relationships],
                'archetypes': [{
                    'id': arch.id,
                    'type': arch.type.value,
                    'variables': [var.id for var in arch.variables]
                } for arch in archetypes]
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error creating CLD: {str(e)}'}), 500

@routes.route('/clds', methods=['GET'])
@token_required
def get_user_clds(user_id):
    clds = db.session.query(CLD).filter(CLD.user_id == user_id).all()
    cld_list = []
    for cld in clds:
        # Get all relationships for this CLD
        relationships = db.session.query(Relationship).filter_by(cld_id=cld.id).all()
        
        # Get all variables associated with this CLD
        cld_variables = [{'id': var.id, 'name': var.name, 'description': var.description} for var in cld.variables]
        
        # Get all relationships
        relationship_list = [
            {
                'id': rel.id,
                'source_id': rel.source_id,
                'target_id': rel.target_id,
                'type': rel.type.value
            } for rel in relationships
        ]
        
        cld_list.append({
            'id': cld.id,
            'name': cld.name,
            'date': cld.date.isoformat(),
            'description': cld.description,
            'variables': cld_variables,
            'relationships': relationship_list
        })
    
    return jsonify(cld_list), 200

@routes.route('/cld/<cld_id>/relationships', methods=['GET'])
@token_required
def get_relationships(user_id, cld_id):
    try:
        # Verify CLD exists and belongs to user
        cld = db.session.query(CLD).filter_by(id=cld_id, user_id=user_id).first()
        if not cld:
            return jsonify({'message': 'CLD not found or access denied'}), 404

        relationships = []
        for rel in cld.relationships:
            # Get the source and target variables to include their names
            source_var = db.session.query(Variable).filter_by(id=rel.source_id).first()
            target_var = db.session.query(Variable).filter_by(id=rel.target_id).first()
            
            relationships.append({
                'id': rel.id,
                'source_id': rel.source_id,
                'target_id': rel.target_id,
                'source_name': source_var.name if source_var else None,
                'target_name': target_var.name if target_var else None,
                'type': rel.type.value
            })

        return jsonify(relationships), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching relationships: {str(e)}'}), 500

@routes.route('/cld/<cld_id>/feedback-loops', methods=['POST'])
@token_required
def identify_feedback_loops(user_id, cld_id):
    try:
        # Verify CLD exists and belongs to user
        cld = db.session.query(CLD).filter_by(id=cld_id, user_id=user_id).first()
        if not cld:
            return jsonify({'message': 'CLD not found or access denied'}), 404

        # Clear existing feedback loops
        for loop in cld.feedback_loops:
            db.session.delete(loop)
        db.session.flush()  # Ensure deletion is processed before inserting new ones

        # Identify new feedback loops
        cld.identify_feedback_loops(db.session)
        db.session.commit()

        # Return the identified loops
        loops = []
        for loop in cld.feedback_loops:
            loops.append({
                'id': loop.id,
                'type': loop.type.value,
                'variables': [
                    {
                        'id': var.id,
                        'name': var.name,
                        'description': var.description
                    } for var in loop.variables
                ]
            })

        return jsonify({
            'message': 'Feedback loops identified successfully',
            'feedback_loops': loops
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error identifying feedback loops: {str(e)}'}), 500

@routes.route('/cld/<cld_id>/feedback-loops', methods=['GET'])
@token_required
def get_feedback_loops(user_id, cld_id):
    try:
        # Verify CLD exists and belongs to user
        cld = db.session.query(CLD).filter_by(id=cld_id, user_id=user_id).first()
        if not cld:
            return jsonify({'message': 'CLD not found or access denied'}), 404

        loops = []
        for loop in cld.feedback_loops:
            # Get all relationships involved in this loop
            loop_relationships = []
            for i in range(len(loop.variables) - 1):
                current_var = loop.variables[i]
                next_var = loop.variables[i + 1]
                rel = db.session.query(Relationship).filter_by(
                    cld_id=cld_id,
                    source_id=current_var.id,
                    target_id=next_var.id
                ).first()
                if rel:
                    loop_relationships.append({
                        'source_id': rel.source_id,
                        'target_id': rel.target_id,
                        'type': rel.type.value
                    })

            loops.append({
                'id': loop.id,
                'type': loop.type.value,
                'variables': [
                    {
                        'id': var.id,
                        'name': var.name,
                        'description': var.description
                    } for var in loop.variables
                ],
                'relationships': loop_relationships
            })

        return jsonify(loops), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching feedback loops: {str(e)}'}), 500

@routes.route('/cld/<cld_id>/archetypes', methods=['POST'])
@token_required
def identify_archetypes(user_id, cld_id):
    try:
        # Verify CLD exists and belongs to user
        cld = db.session.query(CLD).filter_by(id=cld_id, user_id=user_id).first()
        if not cld:
            return jsonify({'message': 'CLD not found or access denied'}), 404

        # Clear existing archetypes
        for archetype in cld.archetypes:
            db.session.delete(archetype)
        db.session.flush()  # Ensure deletion is processed before inserting new ones

        # Identify new archetypes
        cld.identify_archetypes(db.session)
        db.session.commit()

        # Return the identified archetypes
        archetypes = []
        for archetype in cld.archetypes:
            archetypes.append({
                'id': archetype.id,
                'type': archetype.type.value,
                'variables': [
                    {
                        'id': var.id,
                        'name': var.name,
                        'description': var.description
                    } for var in archetype.variables
                ]
            })

        return jsonify({
            'message': 'Archetypes identified successfully',
            'archetypes': archetypes
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error identifying archetypes: {str(e)}'}), 500

@routes.route('/cld/<cld_id>/archetypes', methods=['GET'])
@token_required
def get_archetypes(user_id, cld_id):
    try:
        # Verify CLD exists and belongs to user
        cld = db.session.query(CLD).filter_by(id=cld_id, user_id=user_id).first()
        if not cld:
            return jsonify({'message': 'CLD not found or access denied'}), 404

        archetypes = []
        for archetype in cld.archetypes:
            # Get all relationships involved in this archetype
            archetype_relationships = []
            variables = archetype.variables
            for i in range(len(variables)):
                for j in range(len(variables)):
                    if i != j:
                        rel = db.session.query(Relationship).filter_by(
                            cld_id=cld_id,
                            source_id=variables[i].id,
                            target_id=variables[j].id
                        ).first()
                        if rel:
                            archetype_relationships.append({
                                'source_id': rel.source_id,
                                'target_id': rel.target_id,
                                'type': rel.type.value
                            })

            archetypes.append({
                'id': archetype.id,
                'type': archetype.type.value,
                'variables': [
                    {
                        'id': var.id,
                        'name': var.name,
                        'description': var.description
                    } for var in archetype.variables
                ],
                'relationships': archetype_relationships
            })

        return jsonify(archetypes), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching archetypes: {str(e)}'}), 500

@routes.route('/variable/<variable_id>', methods=['PUT'])
@token_required
def update_variable_route(user_id, variable_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400

        # Check if variable exists and belongs to user
        variable = db.session.query(Variable).filter_by(
            id=variable_id, user_id=user_id
        ).first()
        if not variable:
            return jsonify({'message': 'Variable not found or access denied'}), 404

        # Update variable
        updated_variable = update_variable(
            db.session,
            variable_id,
            user_id,
            name=data.get('name'),
            description=data.get('description')
        )

        return jsonify({
            'message': 'Variable updated successfully',
            'variable': {
                'id': updated_variable.id,
                'name': updated_variable.name,
                'description': updated_variable.description
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error updating variable: {str(e)}'}), 500

@routes.route('/variable/<variable_id>', methods=['DELETE'])
@token_required
def delete_variable_route(user_id, variable_id):
    try:
        # Check if variable exists and belongs to user
        variable = db.session.query(Variable).filter_by(
            id=variable_id, user_id=user_id
        ).first()
        if not variable:
            return jsonify({'message': 'Variable not found or access denied'}), 404

        # Check if variable is used in any CLD
        cld_usage = db.session.query(cld_variables).filter_by(
            variable_id=variable_id
        ).first()
        if cld_usage:
            return jsonify({'message': 'Cannot delete variable as it is used in one or more CLDs'}), 400

        # Delete variable
        if delete_variable(db.session, variable_id, user_id):
            return jsonify({'message': 'Variable deleted successfully'}), 200
        return jsonify({'message': 'Failed to delete variable'}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error deleting variable: {str(e)}'}), 500

@routes.route('/cld/<string:cld_id>', methods=['PUT'])
@token_required
def update_cld(user_id, cld_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400

        # Check if CLD exists and belongs to user
        cld = db.session.query(CLD).filter_by(
            id=cld_id,
            user_id=user_id
        ).first()
        if not cld:
            return jsonify({'message': 'CLD not found or access denied'}), 404

        # Update CLD fields
        if 'name' in data:
            cld.name = data['name']
        if 'description' in data:
            cld.description = data['description']
        if 'date' in data:
            try:
                cld.date = datetime.strptime(data['date'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

        # Update variables
        if 'variables' in data:
            # Clear existing variables
            cld.variables = []
            # Add new variables
            for var_id in data['variables']:
                variable = db.session.query(Variable).filter_by(
                    id=var_id,
                    user_id=user_id
                ).first()
                if not variable:
                    db.session.rollback()
                    return jsonify({
                        'message': f'Variable {var_id} not found or does not belong to user'
                    }), 404
                cld.variables.append(variable)

        # Update relationships
        if 'relationships' in data:
            # Delete existing relationships
            db.session.query(Relationship).filter_by(cld_id=cld_id).delete()
            # Add new relationships
            for rel in data['relationships']:
                if rel['source_id'] == rel['target_id']:
                    return jsonify({
                        'message': 'Cannot create relationship with the same source and target variable'
                    }), 400
                relationship = Relationship(
                    cld_id=cld_id,
                    source_id=rel['source_id'],
                    target_id=rel['target_id'],
                    type=RelationshipType[rel['type'].upper()]
                )
                db.session.add(relationship)

        # Commit all changes
        db.session.commit()

        # Update the CLD model with relationships and archetypes
        cld = db.session.query(CLD).filter_by(id=cld_id).first()
        relationships = db.session.query(Relationship).filter_by(cld_id=cld_id).all()
        archetypes = db.session.query(Archetype).filter_by(cld_id=cld_id).all()

        return jsonify({
            'message': 'CLD updated successfully',
            'cld': {
                'id': cld.id,
                'name': cld.name,
                'description': cld.description,
                'date': cld.date.isoformat(),
                'variables': [var.id for var in cld.variables],
                'relationships': [{
                    'id': rel.id,
                    'source_id': rel.source_id,
                    'target_id': rel.target_id,
                    'type': rel.type.value
                } for rel in relationships],
                'archetypes': [{
                    'id': arch.id,
                    'type': arch.type.value,
                    'variables': [var.id for var in arch.variables]
                } for arch in archetypes]
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error updating CLD: {str(e)}'}), 500

@routes.route('/cld/<cld_id>', methods=['DELETE'])
@token_required
def delete_cld_route(user_id, cld_id):
    try:
        # Check if CLD exists and belongs to user
        cld = db.session.query(CLD).filter_by(
            id=cld_id, user_id=user_id
        ).first()
        if not cld:
            return jsonify({'message': 'CLD not found or access denied'}), 404

        # Delete CLD (cascade will handle related entities)
        if delete_cld(db.session, cld_id, user_id):
            return jsonify({'message': 'CLD deleted successfully'}), 200
        return jsonify({'message': 'Failed to delete CLD'}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error deleting CLD: {str(e)}'}), 500

@routes.route('/cld/<string:cld_id>', methods=['GET'])
@token_required
def get_cld(user_id, cld_id):
    try:
        # Get the CLD
        cld = db.session.query(CLD).filter_by(
            id=cld_id,
            user_id=user_id
        ).first()
        
        if not cld:
            return jsonify({'message': 'CLD not found or access denied'}), 404

        # Get related data
        variables = [{
            'id': var.id,
            'name': var.name,
            'description': var.description
        } for var in cld.variables]

        relationships = db.session.query(Relationship).filter_by(
            cld_id=cld_id
        ).all()

        archetypes = db.session.query(Archetype).filter_by(
            cld_id=cld_id
        ).all()

        feedback_loops = db.session.query(FeedbackLoop).filter_by(
            cld_id=cld_id
        ).all()

        # Format the response
        response = {
            'id': cld.id,
            'name': cld.name,
            'description': cld.description,
            'date': cld.date.isoformat(),
            'variables': variables,
            'relationships': [{
                'id': rel.id,
                'source_id': rel.source_id,
                'target_id': rel.target_id,
                'type': rel.type.value
            } for rel in relationships],
            'archetypes': [{
                'id': arch.id,
                'type': arch.type.value,
                'variables': [var.id for var in arch.variables]
            } for arch in archetypes],
            'feedback_loops': [{
                'id': loop.id,
                'type': loop.type.value,
                'variables': [var.id for var in loop.variables]
            } for loop in feedback_loops]
        }

        return jsonify(response), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching CLD: {str(e)}'}), 500
