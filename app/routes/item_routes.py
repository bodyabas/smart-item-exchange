from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.schemas.item_schema import CreateItemSchema
from app.services.item_service import ItemService

items_bp = Blueprint("items", __name__)


@items_bp.get("")
def list_items():
    return jsonify({"items": ItemService.list_items()}), 200


@items_bp.post("")
@jwt_required()
def create_item():
    try:
        data = CreateItemSchema().load(request.get_json() or {})
    except ValidationError as error:
        return jsonify({"errors": error.messages}), 400

    item = ItemService.create_item(int(get_jwt_identity()), data)
    return jsonify({"item": item}), 201
