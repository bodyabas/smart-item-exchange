from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.recommendation_service import RecommendationService

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.get("/me")
@jwt_required()
def get_my_recommendations():
    recommendations, error = RecommendationService.get_my_recommendations(
        int(get_jwt_identity())
    )
    if error == "no_available_items":
        return (
            jsonify(
                {
                    "recommendations": [],
                    "message": "Add an available item to get recommendations",
                }
            ),
            200,
        )

    return jsonify({"recommendations": recommendations}), 200


@recommendations_bp.get("/<int:item_id>")
def get_recommendations(item_id):
    recommendations, error = RecommendationService.get_recommendations(int(item_id))
    if error == "not_found":
        return jsonify({"message": "Item not found"}), 404
    if error == "missing_embedding":
        return jsonify({"message": "Item does not have an embedding"}), 400

    return jsonify({"recommendations": recommendations}), 200
