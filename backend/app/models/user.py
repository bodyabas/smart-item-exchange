from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    ROLE_USER = "user"
    ROLE_ADMIN = "admin"
    ALLOWED_ROLES = (ROLE_USER, ROLE_ADMIN)

    AUTH_PROVIDER_LOCAL = "local"
    AUTH_PROVIDER_GOOGLE = "google"
    ALLOWED_AUTH_PROVIDERS = (AUTH_PROVIDER_LOCAL, AUTH_PROVIDER_GOOGLE)

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    avatar_url = db.Column(db.String(500), nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(20), nullable=False, default=ROLE_USER, index=True)
    google_id = db.Column(db.String(255), nullable=True, unique=True, index=True)
    auth_provider = db.Column(
        db.String(20),
        nullable=False,
        default=AUTH_PROVIDER_LOCAL,
    )
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
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def has_password(self):
        if not self.password_hash:
            return False
        if self.auth_provider == self.AUTH_PROVIDER_GOOGLE:
            return not check_password_hash(self.password_hash, "google-oauth-only")
        return True
