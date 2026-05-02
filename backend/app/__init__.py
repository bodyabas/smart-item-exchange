from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from app.commands import ensure_database_extensions, register_commands
from app.config import Config
from app.extensions import db, jwt
from app.routes.auth_routes import auth_bp
from app.routes.exchange_request_routes import exchange_requests_bp
from app.routes.item_routes import items_bp
from app.routes.recommendation_routes import recommendations_bp
from app.routes.upload_routes import uploads_bp
from app.routes.user_routes import users_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    jwt.init_app(app)
    CORS(
        app,
        origins=[
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(items_bp, url_prefix="/items")
    app.register_blueprint(exchange_requests_bp, url_prefix="/exchange-requests")
    app.register_blueprint(recommendations_bp, url_prefix="/recommendations")
    app.register_blueprint(users_bp, url_prefix="/users")
    app.register_blueprint(uploads_bp, url_prefix="/uploads")

    register_error_handlers(app)
    register_commands(app)

    with app.app_context():
        ensure_database_extensions()

    @app.get("/health")
    def health_check():
        return {"status": "ok"}, 200

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config.get("UPLOAD_FOLDER", "uploads"), filename)

    return app


def register_error_handlers(app):
    @jwt.unauthorized_loader
    def missing_token(error):
        return jsonify({"message": "Missing or invalid authorization token"}), 401

    @jwt.invalid_token_loader
    def invalid_token(error):
        return jsonify({"message": "Invalid authorization token"}), 422

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({"message": "Authorization token has expired"}), 401

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"message": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"message": "Internal server error"}), 500
