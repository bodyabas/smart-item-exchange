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

        if not user or not user.check_password(data["password"]):
            return None, "Invalid email or password"

        access_token = create_access_token(identity=str(user.id))
        return {"user": AuthService.serialize_user(user), "access_token": access_token}, None

    @staticmethod
    def serialize_user(user):
        return UserSchema().dump(user)
