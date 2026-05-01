from app.extensions import db
from app.models.user import User
from app.schemas.user_schema import UserSchema


class UserService:
    @staticmethod
    def get_current_user(user_id):
        user = db.session.get(User, user_id)
        if not user:
            return None

        return UserSchema().dump(user)

    @staticmethod
    def update_current_user(user_id, data):
        user = db.session.get(User, user_id)
        if not user:
            return None

        if "name" in data:
            user.name = data["name"].strip()
        if "avatar_url" in data:
            user.avatar_url = data["avatar_url"]

        db.session.commit()
        return UserSchema().dump(user)
