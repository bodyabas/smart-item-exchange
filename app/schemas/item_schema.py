from marshmallow import Schema, fields, validate


class ItemSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    description = fields.Str(required=True)
    category = fields.Str(required=True)
    condition = fields.Str(required=True)
    city = fields.Str(required=True)
    desired_exchange = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class CreateItemSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=2, max=150))
    description = fields.Str(required=True, validate=validate.Length(min=5))
    category = fields.Str(required=True, validate=validate.Length(min=2, max=80))
    condition = fields.Str(required=True, validate=validate.Length(min=2, max=80))
    city = fields.Str(required=True, validate=validate.Length(min=2, max=120))
    desired_exchange = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=255),
    )
