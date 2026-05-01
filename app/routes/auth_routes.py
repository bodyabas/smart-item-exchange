from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from app.schemas.auth_schema import LoginSchema, RegisterSchema
from app.services.auth_service import AuthService

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    try:
        data = RegisterSchema().load(request.get_json() or {})
    except ValidationError as error:
        return jsonify({"errors": error.messages}), 400

    result, error = AuthService.register_user(data)
    if error:
        return jsonify({"message": error}), 409

    return jsonify(result), 201


@auth_bp.post("/login")
def login():
    try:
        data = LoginSchema().load(request.get_json() or {})
    except ValidationError as error:
        return jsonify({"errors": error.messages}), 400

    result, error = AuthService.authenticate_user(data)
    if error:
        return jsonify({"message": error}), 401

    return jsonify(result), 200
