from flask import Blueprint, request, jsonify
from .database import register_user, login_user, create_object, get_user_objects, get_user_by_email
from .auth import generate_token, verify_token
from .models import User, Object, CLD, VariableCLD, RelationshipType
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

@routes.route('/object', methods=['POST'])
@token_required
def create_new_object(user_id):
    data = request.get_json()
    if not data or not 'name' in data or not 'description' in data:
        return jsonify({'message': 'Bad Request'}), 400

    name = data['name']
    description = data['description']

    user_objects = get_user_objects(db.session, user_id)
    for obj in user_objects:
        if obj.name == name:
            return jsonify({'message': 'Object already exists'}), 400

    new_object = create_object(db.session, user_id, name, description)
    return jsonify({'message': 'Object created successfully'}), 201

@routes.route('/objects', methods=['GET'])
@token_required
def get_objects(user_id):
    objects = get_user_objects(db.session, user_id)
    if not objects:
        return jsonify({'message': 'No objects found'}), 404

    object_list = [{'id': obj.id, 'name': obj.name, 'description': obj.description} for obj in objects]
    return jsonify(object_list), 200

@routes.route('/cld', methods=['POST'])
@token_required
def create_cld(user_id):
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'date', 'description', 'variable_clds']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required fields. Need: name, date, description, and variable_clds'}), 400

    # Validate date format
    try:
        cld_date = datetime.strptime(data['date'], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    try:
        # Create the CLD
        cld = CLD(
            user_id=user_id,
            name=data['name'],
            date=cld_date,
            description=data['description']
        )
        db.session.add(cld)
        db.session.flush()  # Get the CLD ID without committing

        # Validate and create variable relationships
        for rel in data['variable_clds']:
            # Validate relationship structure
            if not all(k in rel for k in ['from_variable_id', 'to_variable_id', 'type']):
                db.session.rollback()
                return jsonify({
                    'message': 'Each variable relationship must include from_variable_id, to_variable_id, and type'
                }), 400

            # Validate relationship type
            if rel['type'] not in ['Positive', 'Negative']:
                db.session.rollback()
                return jsonify({
                    'message': f"Invalid relationship type: {rel['type']}. Must be 'Positive' or 'Negative'"
                }), 400

            # Validate that variables exist
            from_var = db.session.query(Object).filter_by(
                id=rel['from_variable_id'], 
                user_id=user_id
            ).first()
            to_var = db.session.query(Object).filter_by(
                id=rel['to_variable_id'], 
                user_id=user_id
            ).first()

            if not from_var or not to_var:
                db.session.rollback()
                return jsonify({
                    'message': 'One or more variables not found or do not belong to the user'
                }), 404

            # Create the relationship
            variable_cld = VariableCLD(
                cld_id=cld.id,
                from_variable_id=rel['from_variable_id'],
                to_variable_id=rel['to_variable_id'],
                type=RelationshipType(rel['type'])
            )
            db.session.add(variable_cld)

        # Commit all changes
        db.session.commit()

        return jsonify({
            'message': 'CLD created successfully',
            'cld_id': cld.id
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
        variable_clds = db.session.query(VariableCLD).filter_by(cld_id=cld.id).all()
        variables = [
            {
                'id': v.id,
                'from_variable_id': v.from_variable_id,
                'to_variable_id': v.to_variable_id,
                'type': v.type.value
            } for v in variable_clds
        ]
        cld_list.append({
            'id': cld.id,
            'name': cld.name,
            'date': cld.date.isoformat(),
            'description': cld.description,
            'variables': variables
        })
    return jsonify(cld_list), 200

@routes.route('/variables', methods=['GET'])
@token_required
def get_variables(user_id):
    variables = db.session.query(Object).filter_by(user_id=user_id).all()
    var_list = [{'id': v.id, 'name': v.name} for v in variables]
    return jsonify(var_list), 200
