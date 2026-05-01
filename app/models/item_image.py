from datetime import datetime, timezone

from app.extensions import db


class ItemImage(db.Model):
    __tablename__ = "item_images"

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False, index=True)
    image_url = db.Column(db.String(1000), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    item = db.relationship("Item", back_populates="images")
