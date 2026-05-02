from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.user import User


def admin_required(view):
    @wraps(view)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = db.session.get(User, int(get_jwt_identity()))
        if not user:
            return jsonify({"message": "User not found"}), 404
        if user.role != User.ROLE_ADMIN:
            return jsonify({"message": "Admin access required"}), 403

        return view(*args, **kwargs)

    return wrapper
