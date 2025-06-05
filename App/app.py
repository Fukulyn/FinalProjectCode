from flask import Flask, jsonify
import sqlite3

app = Flask(__name__)

@app.route('/messages', methods=['GET'])
def get_messages():
    conn = sqlite3.connect('mqtt_messages.db')
    c = conn.cursor()
    c.execute("SELECT * FROM messages")
    messages = c.fetchall()
    conn.close()
    return jsonify(messages)

if __name__ == '__main__':
    app.run(debug=True) 