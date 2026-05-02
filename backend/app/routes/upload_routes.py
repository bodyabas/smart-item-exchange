from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.storage_service import StorageService

uploads_bp = Blueprint("uploads", __name__)


@uploads_bp.post("/avatar")
@jwt_required()
def upload_avatar():
    result, error = StorageService.upload_avatar(
        int(get_jwt_identity()),
        request.files.get("file"),
    )
    if error:
        return _upload_error_response(error)

    return jsonify(result), 200


@uploads_bp.post("/items/<int:item_id>")
@jwt_required()
def upload_item_image(item_id):
    image, error = StorageService.upload_item_image(
        int(get_jwt_identity()),
        int(item_id),
        request.files.get("file"),
    )
    if error:
        return _upload_error_response(error)

    return jsonify({"image": image}), 201


def _upload_error_response(error):
    if error == "missing_file":
        return jsonify({"message": "File field is required"}), 400
    if error == "invalid_file_type":
        return jsonify({"message": "Only JPG, PNG and WEBP images are allowed"}), 400
    if error == "file_too_large":
        return jsonify({"message": "Image size must be less than 5MB"}), 400
    if error == "too_many_item_images":
        return jsonify({"message": "Maximum 5 images per item"}), 400
    if error == "user_not_found":
        return jsonify({"message": "User not found"}), 404
    if error == "item_not_found":
        return jsonify({"message": "Item not found"}), 404
    if error == "forbidden":
        return jsonify({"message": "You can only upload images for your own items"}), 403

    return jsonify({"message": "Upload failed"}), 400
