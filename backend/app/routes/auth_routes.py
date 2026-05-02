from urllib.parse import urlencode

from flask import Blueprint, current_app, jsonify, redirect, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.extensions import limiter, oauth
from app.schemas.auth_schema import LoginSchema, RegisterSchema, SetPasswordSchema
from app.services.auth_service import AuthService
from app.services.captcha_service import CaptchaService

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
@limiter.limit("3 per minute")
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
@limiter.limit("5 per minute")
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


@auth_bp.post("/set-password")
@jwt_required()
def set_password():
    try:
        data = SetPasswordSchema().load(request.get_json() or {})
    except ValidationError as error:
        return jsonify({"errors": error.messages}), 400

    error = AuthService.set_password(
        int(get_jwt_identity()),
        data["new_password"],
    )
    if error == "User not found":
        return jsonify({"message": error}), 404
    if error:
        return jsonify({"message": error}), 400

    return jsonify({"message": "Password has been set successfully"}), 200


@auth_bp.get("/google/login")
def google_login():
    google = oauth.create_client("google")
    if not google:
        return redirect(_frontend_error_url())

    return google.authorize_redirect(
        redirect_uri=current_app.config.get("GOOGLE_REDIRECT_URI")
    )


@auth_bp.get("/google/callback")
def google_callback():
    google = oauth.create_client("google")
    if not google:
        return redirect(_frontend_error_url())

    try:
        token = google.authorize_access_token()
        userinfo = token.get("userinfo")
        if not userinfo:
            userinfo = google.userinfo(token=token)

        profile = {
            "google_id": userinfo.get("sub"),
            "email": userinfo.get("email"),
            "name": userinfo.get("name"),
            "avatar_url": userinfo.get("picture"),
        }
        if not profile["google_id"] or not profile["email"]:
            return redirect(_frontend_error_url())

        result = AuthService.authenticate_google_user(profile)
        return redirect(_frontend_success_url(result["access_token"]))
    except Exception:
        return redirect(_frontend_error_url())


def _frontend_success_url(access_token):
    frontend_url = current_app.config.get("FRONTEND_URL").rstrip("/")
    return f"{frontend_url}/oauth-success?{urlencode({'token': access_token})}"


def _frontend_error_url():
    frontend_url = current_app.config.get("FRONTEND_URL").rstrip("/")
    return f"{frontend_url}/login?{urlencode({'error': 'google_auth_failed'})}"
