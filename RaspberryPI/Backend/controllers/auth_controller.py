from flask import request, jsonify
from utils.jwt_handler import generate_token

def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if username == 'demo' and password == '1234':
        token = generate_token({"user": username})
        return jsonify({"token": token})
    return jsonify({"error": "登入失敗"}), 401
