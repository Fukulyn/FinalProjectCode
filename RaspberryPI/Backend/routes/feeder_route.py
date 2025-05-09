from flask import Blueprint
from controllers.feeder_controller import *

feeder_bp = Blueprint('feeder', __name__)
feeder_bp.route('/feed', methods=['POST'])(feed_pet)
feeder_bp.route('/weight', methods=['GET'])(read_weight)
feeder_bp.route('/distance', methods=['GET'])(read_distance)