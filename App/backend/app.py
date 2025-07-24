from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)

FCM_TOKEN_FILE = 'fcm_tokens.json'

def load_tokens():
    if os.path.exists(FCM_TOKEN_FILE):
        with open(FCM_TOKEN_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_tokens(tokens):
    with open(FCM_TOKEN_FILE, 'w', encoding='utf-8') as f:
        json.dump(tokens, f, ensure_ascii=False, indent=2)

@app.route('/api/save-fcm-token', methods=['POST'])
def save_fcm_token():
    data = request.get_json()
    user_id = data.get('userId')
    fcm_token = data.get('fcmToken')
    if not user_id or not fcm_token:
        return jsonify({'error': '缺少 userId 或 fcmToken'}), 400
    tokens = load_tokens()
    tokens[user_id] = fcm_token
    save_tokens(tokens)
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(port=3001) 