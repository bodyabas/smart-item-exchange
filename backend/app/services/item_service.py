from datetime import datetime

from sqlalchemy import or_

from app.constants import ITEM_CATEGORIES
from app.extensions import db
from app.models.item import Item
from app.schemas.item_schema import ItemSchema
from app.services.embedding_service import EmbeddingService
from app.services.storage_service import StorageService


class ItemService:
    ALLOWED_SORTS = ("newest", "condition", "city")

    @staticmethod
    def list_items(filters=None, page=1, limit=10, sort="newest"):
        filters = filters or {}
        sort = sort if sort in ItemService.ALLOWED_SORTS else "newest"
        query = Item.query

        for field in ("status", "category", "city", "condition"):
            value = filters.get(field)
            if value:
                query = query.filter(getattr(Item, field).ilike(value))

        min_created_at = ItemService._parse_datetime(filters.get("min_created_at"))
        if min_created_at:
            query = query.filter(Item.created_at >= min_created_at)

        max_created_at = ItemService._parse_datetime(filters.get("max_created_at"))
        if max_created_at:
            query = query.filter(Item.created_at <= max_created_at)

        search = filters.get("search")
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Item.title.ilike(pattern),
                    Item.description.ilike(pattern),
                    Item.category.ilike(pattern),
                    Item.desired_exchange.ilike(pattern),
                )
            )

        total_items = query.count()
        total_pages = max((total_items + limit - 1) // limit, 1)
        page = min(page, total_pages)
        items = (
            ItemService._apply_sort(query, sort)
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return {
            "items": ItemSchema(many=True).dump(items),
            "page": page,
            "total_pages": total_pages,
            "total_items": total_items,
        }

    @staticmethod
    def validate_filters(filters, page=1, limit=10):
        status = filters.get("status")
        if status and status not in Item.ALLOWED_STATUSES:
            return "Invalid item status"

        category = filters.get("category")
        if category and category not in ITEM_CATEGORIES:
            return "Invalid item category"

        for field in ("min_created_at", "max_created_at"):
            value = filters.get(field)
            if value and not ItemService._parse_datetime(value):
                return f"Invalid {field}. Use ISO 8601 format."

        if page < 1:
            return "Page must be greater than or equal to 1"
        if limit < 1 or limit > 100:
            return "Limit must be between 1 and 100"

        return None

    @staticmethod
    def _apply_sort(query, sort):
        if sort == "condition":
            return query.order_by(Item.condition.asc(), Item.created_at.desc())
        if sort == "city":
            return query.order_by(Item.city.asc(), Item.created_at.desc())
        return query.order_by(Item.created_at.desc())

    @staticmethod
    def get_item(item_id):
        item = db.session.get(Item, item_id)
        if not item:
            return None

        return ItemSchema().dump(item)

    @staticmethod
    def create_item(user_id, data):
        item = Item(
            user_id=user_id,
            embedding=EmbeddingService.generate_item_embedding(data),
            matching_embedding=EmbeddingService.generate_item_matching_embedding(data),
            **data,
        )

        db.session.add(item)
        db.session.commit()

        return ItemSchema().dump(item)

    @staticmethod
    def create_item_with_images(user_id, data, image_files):
        item = Item(
            user_id=user_id,
            embedding=EmbeddingService.generate_item_embedding(data),
            matching_embedding=EmbeddingService.generate_item_matching_embedding(data),
            **data,
        )

        db.session.add(item)
        db.session.flush()

        error = StorageService.create_item_images(item, image_files)
        if error:
            db.session.rollback()
            return None, error

        db.session.commit()
        return ItemSchema().dump(item), None

    @staticmethod
    def update_item(item_id, user_id, data):
        item = db.session.get(Item, item_id)
        if not item:
            return None, "not_found"

        if item.user_id != user_id:
            return None, "forbidden"

        for field, value in data.items():
            setattr(item, field, value)

        item_data = ItemSchema().dump(item)
        item.embedding = EmbeddingService.generate_item_embedding(item_data)
        item.matching_embedding = EmbeddingService.generate_item_matching_embedding(
            item_data
        )

        db.session.commit()
        return ItemSchema().dump(item), None

    @staticmethod
    def delete_item(item_id, user_id):
        item = db.session.get(Item, item_id)
        if not item:
            return "not_found"

        if item.user_id != user_id:
            return "forbidden"

        db.session.delete(item)
        db.session.commit()
        return None

    @staticmethod
    def _parse_datetime(value):
        if not value:
            return None

        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
