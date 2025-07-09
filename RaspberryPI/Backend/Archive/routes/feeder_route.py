from flask import Blueprint
from controllers.feeder_controller import *

feeder_bp = Blueprint('feeder', __name__)
feeder_bp.route('/feed', methods=['POST'])(feed_once)
feeder_bp.route('/status', methods=['GET'])(broadcast_status_loop)
feeder_bp.route('/waste/open', methods=['POST'])(open_waste)
feeder_bp.route('/waste/close', methods=['POST'])(close_waste)
