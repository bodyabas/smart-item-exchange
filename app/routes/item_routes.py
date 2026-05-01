from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.models.item import Item
from app.schemas.item_schema import CreateItemSchema, UpdateItemSchema
from app.services.item_service import ItemService

items_bp = Blueprint("items", __name__)


@items_bp.get("")
def list_items():
    status = request.args.get("status")
    if status and status not in Item.ALLOWED_STATUSES:
        return jsonify({"message": "Invalid item status"}), 400

    return jsonify({"items": ItemService.list_items(status=status)}), 200


@items_bp.get("/<int:item_id>")
def get_item(item_id):
    item = ItemService.get_item(item_id)
    if not item:
        return jsonify({"message": "Item not found"}), 404

    return jsonify({"item": item}), 200


@items_bp.post("")
@jwt_required()
def create_item():
    try:
        data = CreateItemSchema().load(request.get_json() or {})
    except ValidationError as error:
        return jsonify({"errors": error.messages}), 400

    item = ItemService.create_item(int(get_jwt_identity()), data)
    return jsonify({"item": item}), 201


@items_bp.put("/<int:item_id>")
@jwt_required()
def update_item(item_id):
    try:
        data = UpdateItemSchema().load(request.get_json() or {})
    except ValidationError as error:
        return jsonify({"errors": error.messages}), 400

    item, error = ItemService.update_item(int(item_id), int(get_jwt_identity()), data)
    if error == "not_found":
        return jsonify({"message": "Item not found"}), 404
    if error == "forbidden":
        return jsonify({"message": "You can only update your own items"}), 403

    return jsonify({"item": item}), 200


@items_bp.delete("/<int:item_id>")
@jwt_required()
def delete_item(item_id):
    error = ItemService.delete_item(int(item_id), int(get_jwt_identity()))
    if error == "not_found":
        return jsonify({"message": "Item not found"}), 404
    if error == "forbidden":
        return jsonify({"message": "You can only delete your own items"}), 403

    return "", 204
