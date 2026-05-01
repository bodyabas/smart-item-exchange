from marshmallow import Schema, fields, validate


class CreateExchangeRequestSchema(Schema):
    offered_item_id = fields.Int(required=True, validate=validate.Range(min=1))
    requested_item_id = fields.Int(required=True, validate=validate.Range(min=1))


class ExchangeRequestSchema(Schema):
    id = fields.Int(dump_only=True)
    sender_id = fields.Int(dump_only=True)
    receiver_id = fields.Int(dump_only=True)
    offered_item_id = fields.Int(dump_only=True)
    requested_item_id = fields.Int(dump_only=True)
    status = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
