from authlib.integrations.flask_client import OAuth
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()
jwt = JWTManager()
oauth = OAuth()
