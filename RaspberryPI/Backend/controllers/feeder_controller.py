from flask import request, jsonify
from services.feeder_service import do_feed, get_weight, get_distance
from utils.jwt_handler import token_required

@token_required
def feed_pet():
    angle = float(request.json.get("angle", 45))
    grams = do_feed(angle)
    return jsonify({"fed_grams": grams})

@token_required
def read_weight():
    return jsonify({"weight": get_weight()})

@token_required
def read_distance():
    cm, mm = get_distance()
    return jsonify({"distance_cm": cm, "distance_mm": mm})