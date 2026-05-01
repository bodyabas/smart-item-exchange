from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    items = db.relationship("Item", back_populates="user", cascade="all, delete-orphan")
    sent_exchange_requests = db.relationship(
        "ExchangeRequest",
        foreign_keys="ExchangeRequest.sender_id",
        back_populates="sender",
    )
    received_exchange_requests = db.relationship(
        "ExchangeRequest",
        foreign_keys="ExchangeRequest.receiver_id",
        back_populates="receiver",
    )
    exchange_offers = db.relationship(
        "ExchangeOffer",
        foreign_keys="ExchangeOffer.proposed_by_user_id",
        back_populates="proposed_by",
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
