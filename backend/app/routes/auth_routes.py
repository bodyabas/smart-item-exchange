from flask import Blueprint, current_app, jsonify, request
from marshmallow import ValidationError

from app.schemas.auth_schema import LoginSchema, RegisterSchema
from app.services.auth_service import AuthService
from app.services.captcha_service import CaptchaService

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    try:
        data = RegisterSchema().load(request.get_json() or {})
    except ValidationError as error:
        return jsonify({"errors": error.messages}), 400

    valid_captcha, captcha_error = CaptchaService.verify(data.get("captcha_token"))
    if not valid_captcha:
        return jsonify({"message": captcha_error}), 400

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

    valid_captcha, captcha_error = CaptchaService.verify(data.get("captcha_token"))
    if not valid_captcha:
        return jsonify({"message": captcha_error}), 400

    result, error = AuthService.authenticate_user(data)
    if error:
        return jsonify({"message": error}), 401

    return jsonify(result), 200


@auth_bp.get("/google/login")
def google_login():
    if not current_app.config.get("GOOGLE_CLIENT_ID"):
        return jsonify({"message": "Google login coming soon"}), 501

    return jsonify({"message": "Google OAuth is not fully configured yet"}), 501


@auth_bp.get("/google/callback")
def google_callback():
    return jsonify({"message": "Google OAuth callback placeholder"}), 501
