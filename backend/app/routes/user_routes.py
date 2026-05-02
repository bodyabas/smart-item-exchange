from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.schemas.user_schema import UpdateUserSchema
from app.services.user_service import UserService

users_bp = Blueprint("users", __name__)


@users_bp.get("/me")
@jwt_required()
def get_me():
    user = UserService.get_current_user(int(get_jwt_identity()))
    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"user": user}), 200


@users_bp.put("/me")
@jwt_required()
def update_me():
    try:
        data = UpdateUserSchema().load(request.get_json() or {})
    except ValidationError as error:
        return jsonify({"errors": error.messages}), 400

    user = UserService.update_current_user(int(get_jwt_identity()), data)
    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"user": user}), 200
