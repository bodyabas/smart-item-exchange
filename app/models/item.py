from datetime import datetime, timezone

from app.extensions import db


class Item(db.Model):
    __tablename__ = "items"

    STATUS_AVAILABLE = "available"
    STATUS_EXCHANGED = "exchanged"
    ALLOWED_STATUSES = (STATUS_AVAILABLE, STATUS_EXCHANGED)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(80), nullable=False, index=True)
    condition = db.Column(db.String(80), nullable=False)
    city = db.Column(db.String(120), nullable=False, index=True)
    desired_exchange = db.Column(db.String(255), nullable=True)
    status = db.Column(
        db.String(20),
        nullable=False,
        default=STATUS_AVAILABLE,
        index=True,
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User", back_populates="items")
    offered_exchange_requests = db.relationship(
        "ExchangeRequest",
        foreign_keys="ExchangeRequest.offered_item_id",
        back_populates="offered_item",
    )
    requested_exchange_requests = db.relationship(
        "ExchangeRequest",
        foreign_keys="ExchangeRequest.requested_item_id",
        back_populates="requested_item",
    )
