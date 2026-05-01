from flask import Flask, jsonify

from app.commands import register_commands
from app.config import Config
from app.extensions import db, jwt
from app.routes.auth_routes import auth_bp
from app.routes.exchange_request_routes import exchange_requests_bp
from app.routes.item_routes import items_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(items_bp, url_prefix="/items")
    app.register_blueprint(exchange_requests_bp, url_prefix="/exchange-requests")

    register_error_handlers(app)
    register_commands(app)

    @app.get("/health")
    def health_check():
        return {"status": "ok"}, 200

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
