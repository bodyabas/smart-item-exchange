from marshmallow import Schema, ValidationError, fields, validate, validates_schema


class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)
    email = fields.Email(dump_only=True)
    avatar_url = fields.Str(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class UpdateUserSchema(Schema):
    name = fields.Str(validate=validate.Length(min=2, max=120))
    avatar_url = fields.Str(allow_none=True, validate=validate.Length(max=500))

    @validates_schema
    def validate_has_fields(self, data, **kwargs):
        if not data:
            raise ValidationError("At least one profile field is required.")
