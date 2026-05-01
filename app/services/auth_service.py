from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models.user import User


class AuthService:
    @staticmethod
    def register_user(data):
        email = data["email"].lower().strip()

        if User.query.filter_by(email=email).first():
            return None, "Email is already registered"

        user = User(name=data["name"].strip(), email=email)
        user.set_password(data["password"])

        db.session.add(user)
        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        return {"user": AuthService.serialize_user(user), "access_token": access_token}, None

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
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
