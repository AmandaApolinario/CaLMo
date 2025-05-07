from flask import Blueprint, request, jsonify
from ..viewmodels import AuthViewModel
from .. import db

auth_routes = Blueprint('auth_routes', __name__)

@auth_routes.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not 'name' in data or not 'email' in data or not 'password' in data:
        return jsonify({'message': 'Bad Request'}), 400

    name = data['name']
    email = data['email']
    password = data['password']

    view_model = AuthViewModel(db.session)
    user, message = view_model.register_user(name, email, password)
    
    if not user:
        return jsonify({'message': message}), 400

    return jsonify({'message': message}), 201

@auth_routes.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not 'email' in data or not 'password' in data:
        return jsonify({'message': 'Bad Request'}), 400

    email = data['email']
    password = data['password']

    view_model = AuthViewModel(db.session)
    token, message = view_model.login_user(email, password)
    
    if not token:
        return jsonify({'message': message}), 401

    return jsonify({'token': token}), 200 