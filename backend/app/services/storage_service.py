from pathlib import Path
from uuid import uuid4

from flask import current_app
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.item import Item
from app.models.item_image import ItemImage
from app.models.user import User
from app.schemas.item_schema import ItemImageSchema


class StorageService:
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    MAX_FILE_SIZE = 5 * 1024 * 1024
    MAX_ITEM_IMAGES = 5

    @staticmethod
    def upload_avatar(user_id, file):
        error = StorageService._validate_file(file)
        if error:
            return None, error

        user = db.session.get(User, user_id)
        if not user:
            return None, "user_not_found"

        url = StorageService._save_local_file(file, Path("avatars"))
        user.avatar_url = url
        db.session.commit()

        return {"avatar_url": url}, None

    @staticmethod
    def upload_item_image(user_id, item_id, file):
        error = StorageService._validate_file(file)
        if error:
            return None, error

        item = db.session.get(Item, item_id)
        if not item:
            return None, "item_not_found"

        if item.user_id != user_id:
            return None, "forbidden"

        if len(item.images or []) >= StorageService.MAX_ITEM_IMAGES:
            return None, "too_many_item_images"

        url = StorageService._save_local_file(file, Path("items") / str(item.id))
        image = ItemImage(item_id=item.id, image_url=url)
        db.session.add(image)
        db.session.commit()

        return ItemImageSchema().dump(image), None

    @staticmethod
    def create_item_images(item, files):
        files = [file for file in files if file and file.filename]
        if not files:
            return "missing_file"

        existing_count = len(item.images or [])
        if existing_count + len(files) > StorageService.MAX_ITEM_IMAGES:
            return "too_many_item_images"

        for file in files:
            error = StorageService._validate_file(file)
            if error:
                return error

        for file in files:
            url = StorageService._save_local_file(file, Path("items") / str(item.id))
            db.session.add(ItemImage(item_id=item.id, image_url=url))

        return None

    @staticmethod
    def _save_local_file(file, relative_dir):
        upload_root = Path(current_app.config.get("UPLOAD_FOLDER", "uploads"))
        target_dir = upload_root / relative_dir
        target_dir.mkdir(parents=True, exist_ok=True)

        extension = StorageService._extension(file.filename)
        stem = Path(secure_filename(file.filename)).stem or "image"
        filename = f"{uuid4().hex}-{stem}.{extension}"
        file.save(target_dir / filename)

        return f"/uploads/{relative_dir.as_posix()}/{filename}"

    @staticmethod
    def _validate_file(file):
        if not file or not file.filename:
            return "missing_file"

        extension = StorageService._extension(file.filename)
        if extension not in StorageService.ALLOWED_EXTENSIONS:
            return "invalid_file_type"

        file.stream.seek(0, 2)
        size = file.stream.tell()
        file.stream.seek(0)
        if size > StorageService.MAX_FILE_SIZE:
            return "file_too_large"

        return None

    @staticmethod
    def _extension(filename):
        return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
