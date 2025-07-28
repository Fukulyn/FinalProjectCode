from flask import Blueprint
from RaspberryPI.Backend.Archive.auth_controller import login

auth_bp = Blueprint('auth', __name__)
auth_bp.route('/login', methods=['POST'])(login)
