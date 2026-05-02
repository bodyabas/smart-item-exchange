from authlib.integrations.flask_client import OAuth
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()
jwt = JWTManager()
oauth = OAuth()
limiter = Limiter(key_func=get_remote_address)
