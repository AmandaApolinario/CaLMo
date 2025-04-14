import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")

def generate_token(user_id):
    payload = {
        'user_id': str(user_id),
        'exp': datetime.utcnow() + timedelta(hours=1) 
    }
    print("this is the payload", payload, flush=True)
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            user_id = verify_token(token)
            if user_id is None:
                return jsonify({'message': 'Token is invalid!'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(user_id, *args, **kwargs)

    return decorated