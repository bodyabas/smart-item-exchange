from datetime import datetime, timezone

from app.extensions import db


class ExchangeRequest(db.Model):
    __tablename__ = "exchange_requests"

    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"

    ACTIVE_STATUSES = (STATUS_PENDING,)
    ALLOWED_STATUSES = (
        STATUS_PENDING,
        STATUS_ACCEPTED,
        STATUS_REJECTED,
        STATUS_CANCELLED,
    )

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    offered_item_id = db.Column(
        db.Integer,
        db.ForeignKey("items.id"),
        nullable=False,
        index=True,
    )
    requested_item_id = db.Column(
        db.Integer,
        db.ForeignKey("items.id"),
        nullable=False,
        index=True,
    )
    status = db.Column(
        db.String(20),
        nullable=False,
        default=STATUS_PENDING,
        index=True,
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    sender = db.relationship(
        "User",
        foreign_keys=[sender_id],
        back_populates="sent_exchange_requests",
    )
    receiver = db.relationship(
        "User",
        foreign_keys=[receiver_id],
        back_populates="received_exchange_requests",
    )
    offered_item = db.relationship(
        "Item",
        foreign_keys=[offered_item_id],
        back_populates="offered_exchange_requests",
    )
    requested_item = db.relationship(
        "Item",
        foreign_keys=[requested_item_id],
        back_populates="requested_exchange_requests",
    )
