from app.extensions import db
from app.models.item import Item
from app.schemas.item_schema import ItemSchema


class ItemService:
    @staticmethod
    def list_items(status=None):
        query = Item.query
        if status:
            query = query.filter_by(status=status)

        items = query.order_by(Item.created_at.desc()).all()
        return ItemSchema(many=True).dump(items)

    @staticmethod
    def get_item(item_id):
        item = db.session.get(Item, item_id)
        if not item:
            return None

        return ItemSchema().dump(item)

    @staticmethod
    def create_item(user_id, data):
        item = Item(user_id=user_id, **data)

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
