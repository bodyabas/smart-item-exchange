from flask import current_app
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models.user import User
from app.schemas.user_schema import UserSchema


class AuthService:
    @staticmethod
    def register_user(data):
        email = data["email"].lower().strip()

        if User.query.filter_by(email=email).first():
            return None, "Email is already registered"

        role = (
            User.ROLE_ADMIN
            if current_app.config.get("ADMIN_EMAIL") == email
            else User.ROLE_USER
        )
        user = User(name=data["name"].strip(), email=email, role=role)
        user.set_password(data["password"])

        db.session.add(user)
        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        return {
            "user": AuthService.serialize_user(user),
            "access_token": access_token,
        }, None

    @staticmethod
    def authenticate_user(data):
        email = data["email"].lower().strip()
        user = User.query.filter_by(email=email).first()

        if user and not user.has_password():
            return (
                None,
                "This account was created using Google. Please sign in with Google or set a password from your profile.",
            )

        if not user or not user.check_password(data["password"]):
            return None, "Invalid email or password"

        access_token = create_access_token(identity=str(user.id))
        return {"user": AuthService.serialize_user(user), "access_token": access_token}, None

    @staticmethod
    def authenticate_google_user(profile):
        google_id = str(profile["google_id"])
        email = profile["email"].lower().strip()

        user = User.query.filter_by(google_id=google_id).first()
        if not user:
            user = User.query.filter_by(email=email).first()

        if user:
            user.google_id = google_id
            user.auth_provider = User.AUTH_PROVIDER_GOOGLE
            if not user.avatar_url and profile.get("avatar_url"):
                user.avatar_url = profile["avatar_url"]
        else:
            user = User(
                name=profile.get("name") or email.split("@")[0],
                email=email,
                avatar_url=profile.get("avatar_url"),
                google_id=google_id,
                auth_provider=User.AUTH_PROVIDER_GOOGLE,
                role=User.ROLE_USER,
                password_hash=None,
            )
            db.session.add(user)

        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        return {
            "user": AuthService.serialize_user(user),
            "access_token": access_token,
        }

    @staticmethod
    def set_password(user_id, password):
        user = db.session.get(User, user_id)
        if not user:
            return "User not found"

        if user.has_password():
            return "Password is already set. Use change password instead."

        user.set_password(password)
        db.session.commit()
        return None

    @staticmethod
    def serialize_user(user):
        return UserSchema().dump(user)
