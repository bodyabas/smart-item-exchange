from datetime import datetime, timezone

from app.extensions import db


class ExchangeRequest(db.Model):
    __tablename__ = "exchange_requests"

    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"
    STATUS_COUNTERED = "countered"

    CASH_DIRECTION_NONE = "none"
    CASH_DIRECTION_SENDER_PAYS = "sender_pays"
    CASH_DIRECTION_RECEIVER_PAYS = "receiver_pays"

    ACTIVE_STATUSES = (STATUS_PENDING, STATUS_COUNTERED)
    ALLOWED_STATUSES = (
        STATUS_PENDING,
        STATUS_ACCEPTED,
        STATUS_REJECTED,
        STATUS_CANCELLED,
        STATUS_COUNTERED,
    )
    ALLOWED_CASH_DIRECTIONS = (
        CASH_DIRECTION_NONE,
        CASH_DIRECTION_SENDER_PAYS,
        CASH_DIRECTION_RECEIVER_PAYS,
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
    cash_adjustment_amount = db.Column(db.Float, nullable=False, default=0)
    cash_adjustment_direction = db.Column(
        db.String(20),
        nullable=True,
        default=CASH_DIRECTION_NONE,
    )
    message = db.Column(db.Text, nullable=True)
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
    offers = db.relationship(
        "ExchangeOffer",
        back_populates="exchange_request",
        cascade="all, delete-orphan",
        order_by="ExchangeOffer.created_at",
    )


class ExchangeOffer(db.Model):
    __tablename__ = "exchange_offers"

    id = db.Column(db.Integer, primary_key=True)
    exchange_request_id = db.Column(
        db.Integer,
        db.ForeignKey("exchange_requests.id"),
        nullable=False,
        index=True,
    )
    proposed_by_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    cash_adjustment_amount = db.Column(db.Float, nullable=False, default=0)
    cash_adjustment_direction = db.Column(
        db.String(20),
        nullable=True,
        default=ExchangeRequest.CASH_DIRECTION_NONE,
    )
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    exchange_request = db.relationship("ExchangeRequest", back_populates="offers")
    proposed_by = db.relationship(
        "User",
        foreign_keys=[proposed_by_user_id],
        back_populates="exchange_offers",
    )
