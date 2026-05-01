from app.extensions import db
from app.models.item import Item
from app.schemas.item_schema import ItemSchema


class ItemService:
    @staticmethod
    def list_items():
        items = Item.query.order_by(Item.created_at.desc()).all()
        return ItemSchema(many=True).dump(items)

    @staticmethod
    def create_item(user_id, data):
        item = Item(user_id=user_id, **data)

        db.session.add(item)
        db.session.commit()

        return ItemSchema().dump(item)
