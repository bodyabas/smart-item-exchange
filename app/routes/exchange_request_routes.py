from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.schemas.exchange_request_schema import CreateExchangeRequestSchema
from app.services.exchange_request_service import ExchangeRequestService

exchange_requests_bp = Blueprint("exchange_requests", __name__)


@exchange_requests_bp.post("")
@jwt_required()
def create_exchange_request():
    try:
        data = CreateExchangeRequestSchema().load(request.get_json() or {})
    except ValidationError as error:
        return jsonify({"errors": error.messages}), 400

    exchange_request, error = ExchangeRequestService.create_exchange_request(
        int(get_jwt_identity()),
        data,
    )
    if error == "not_found":
        return jsonify({"message": "Offered or requested item not found"}), 404
    if error == "offered_item_forbidden":
        return jsonify({"message": "You can only offer your own items"}), 403
    if error == "own_item":
        return jsonify({"message": "You cannot request your own item"}), 400
    if error == "duplicate_active":
        return jsonify({"message": "An active exchange request already exists"}), 400

    return jsonify({"exchange_request": exchange_request}), 201


@exchange_requests_bp.get("")
@jwt_required()
def list_exchange_requests():
    exchange_requests = ExchangeRequestService.list_exchange_requests(
        int(get_jwt_identity())
    )
    return jsonify({"exchange_requests": exchange_requests}), 200


@exchange_requests_bp.get("/<int:exchange_request_id>")
@jwt_required()
def get_exchange_request(exchange_request_id):
    exchange_request, error = ExchangeRequestService.get_exchange_request(
        int(exchange_request_id),
        int(get_jwt_identity()),
    )
    if error == "not_found":
        return jsonify({"message": "Exchange request not found"}), 404
    if error == "forbidden":
        return jsonify({"message": "You can only view your exchange requests"}), 403

    return jsonify({"exchange_request": exchange_request}), 200


@exchange_requests_bp.put("/<int:exchange_request_id>/accept")
@jwt_required()
def accept_exchange_request(exchange_request_id):
    exchange_request, error = ExchangeRequestService.accept_exchange_request(
        int(exchange_request_id),
        int(get_jwt_identity()),
    )
    return _status_response(exchange_request, error, "accept")


@exchange_requests_bp.put("/<int:exchange_request_id>/reject")
@jwt_required()
def reject_exchange_request(exchange_request_id):
    exchange_request, error = ExchangeRequestService.reject_exchange_request(
        int(exchange_request_id),
        int(get_jwt_identity()),
    )
    return _status_response(exchange_request, error, "reject")


@exchange_requests_bp.put("/<int:exchange_request_id>/cancel")
@jwt_required()
def cancel_exchange_request(exchange_request_id):
    exchange_request, error = ExchangeRequestService.cancel_exchange_request(
        int(exchange_request_id),
        int(get_jwt_identity()),
    )
    return _status_response(exchange_request, error, "cancel")


def _status_response(exchange_request, error, action):
    if error == "not_found":
        return jsonify({"message": "Exchange request not found"}), 404
    if error == "forbidden":
        if action == "cancel":
            return jsonify({"message": "Only the sender can cancel this request"}), 403
        return jsonify({"message": f"Only the receiver can {action} this request"}), 403
    if error == "not_pending":
        return jsonify({"message": "Only pending exchange requests can be updated"}), 400

    return jsonify({"exchange_request": exchange_request}), 200
