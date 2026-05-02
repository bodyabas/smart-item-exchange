from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from app.constants import ITEM_CATEGORIES


class ItemImageSchema(Schema):
    id = fields.Int(dump_only=True)
    image_url = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class ItemSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    description = fields.Str(required=True)
    category = fields.Str(required=True)
    condition = fields.Str(required=True)
    city = fields.Str(required=True)
    desired_exchange = fields.Str(allow_none=True)
    status = fields.Str(dump_only=True)
    images = fields.Nested(ItemImageSchema, many=True, dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class CreateItemSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=2, max=150))
    description = fields.Str(required=True, validate=validate.Length(min=5))
    category = fields.Str(required=True, validate=validate.OneOf(ITEM_CATEGORIES))
    condition = fields.Str(required=True, validate=validate.Length(min=2, max=80))
    city = fields.Str(required=True, validate=validate.Length(min=2, max=120))
    desired_exchange = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=255),
    )


class UpdateItemSchema(Schema):
    title = fields.Str(validate=validate.Length(min=2, max=150))
    description = fields.Str(validate=validate.Length(min=5))
    category = fields.Str(validate=validate.OneOf(ITEM_CATEGORIES))
    condition = fields.Str(validate=validate.Length(min=2, max=80))
    city = fields.Str(validate=validate.Length(min=2, max=120))
    desired_exchange = fields.Str(allow_none=True, validate=validate.Length(max=255))

    @validates_schema
    def validate_has_fields(self, data, **kwargs):
        if not data:
            raise ValidationError("At least one item field is required.")
