from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from app.extensions import db
from app.models.exchange_request import ExchangeRequest
from app.models.item import Item
from app.models.user import User
from app.schemas.exchange_request_schema import ExchangeRequestSchema
from app.schemas.item_schema import ItemSchema
from app.schemas.user_schema import UserSchema
from app.services.admin_auth import admin_required

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/users")
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"users": UserSchema(many=True).dump(users)}), 200


@admin_bp.get("/items")
@admin_required
def list_items():
    items = Item.query.order_by(Item.created_at.desc()).all()
    return jsonify({"items": ItemSchema(many=True).dump(items)}), 200


@admin_bp.get("/exchange-requests")
@admin_required
def list_exchange_requests():
    exchange_requests = ExchangeRequest.query.order_by(
        ExchangeRequest.created_at.desc()
    ).all()
    return (
        jsonify(
            {
                "exchange_requests": ExchangeRequestSchema(many=True).dump(
                    exchange_requests
                )
            }
        ),
        200,
    )


@admin_bp.delete("/items/<int:item_id>")
@admin_required
def delete_item(item_id):
    item = db.session.get(Item, item_id)
    if not item:
        return jsonify({"message": "Item not found"}), 404

    related_requests = ExchangeRequest.query.filter(
        or_(
            ExchangeRequest.offered_item_id == item.id,
            ExchangeRequest.requested_item_id == item.id,
        )
    ).all()
    for exchange_request in related_requests:
        db.session.delete(exchange_request)

    db.session.delete(item)
    db.session.commit()
    return "", 204


@admin_bp.patch("/users/<int:user_id>/role")
@admin_required
def update_user_role(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    role = (request.get_json() or {}).get("role")
    if role not in User.ALLOWED_ROLES:
        return jsonify({"message": "Role must be user or admin"}), 400

    user.role = role
    db.session.commit()
    return jsonify({"user": UserSchema().dump(user)}), 200
