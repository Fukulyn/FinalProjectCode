import jwt
from datetime import datetime, timedelta
from flask import current_app, request, jsonify
from functools import wraps

def generate_token(payload):
    payload["exp"] = datetime.utcnow() + timedelta(hours=1)
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split()[1]
        if not token:
            return jsonify({'error': '缺少 token'}), 403
        try:
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        except:
            return jsonify({'error': '無效或過期的 token'}), 403
        return f(*args, **kwargs)
    return decorated