from sqlalchemy import text

from app.extensions import db


def ensure_database_extensions():
    db.session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    db.session.commit()


def register_commands(app):
    @app.cli.command("init-db")
    def init_db():
        ensure_database_extensions()
        db.create_all()
        print("Database tables created.")
