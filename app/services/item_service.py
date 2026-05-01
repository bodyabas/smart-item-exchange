from datetime import datetime

from sqlalchemy import or_

from app.extensions import db
from app.models.item import Item
from app.schemas.item_schema import ItemSchema
from app.services.embedding_service import EmbeddingService


class ItemService:
    @staticmethod
    def list_items(filters=None):
        filters = filters or {}
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

        items = query.order_by(Item.created_at.desc()).all()
        return ItemSchema(many=True).dump(items)

    @staticmethod
    def validate_filters(filters):
        status = filters.get("status")
        if status and status not in Item.ALLOWED_STATUSES:
            return "Invalid item status"

        for field in ("min_created_at", "max_created_at"):
            value = filters.get(field)
            if value and not ItemService._parse_datetime(value):
                return f"Invalid {field}. Use ISO 8601 format."

        return None

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
