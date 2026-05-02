import re

from marshmallow import Schema, ValidationError, fields, validate, validates


def validate_strong_password(password):
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Za-z]", password):
        raise ValidationError("Password must contain at least one letter.")
    if not re.search(r"\d", password):
        raise ValidationError("Password must contain at least one number.")


class RegisterSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=2, max=120))
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)
    captcha_token = fields.Str(required=False, load_only=True, allow_none=True)

    @validates("password")
    def validate_password(self, value):
        validate_strong_password(value)


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)
    captcha_token = fields.Str(required=False, load_only=True, allow_none=True)


class SetPasswordSchema(Schema):
    new_password = fields.Str(required=True, load_only=True)

    @validates("new_password")
    def validate_new_password(self, value):
        validate_strong_password(value)
