from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from app.models.exchange_request import ExchangeRequest


class ExchangeOfferInputSchema(Schema):
    cash_adjustment_amount = fields.Float(
        missing=0,
        validate=validate.Range(min=0),
    )
    cash_adjustment_direction = fields.Str(
        missing=ExchangeRequest.CASH_DIRECTION_NONE,
        validate=validate.OneOf(ExchangeRequest.ALLOWED_CASH_DIRECTIONS),
    )
    message = fields.Str(required=False, allow_none=True)

    @validates_schema
    def validate_cash_fields(self, data, **kwargs):
        amount = data.get("cash_adjustment_amount") or 0
        direction = data.get("cash_adjustment_direction")

        if amount == 0 and direction != ExchangeRequest.CASH_DIRECTION_NONE:
            raise ValidationError(
                "cash_adjustment_direction must be none when amount is 0."
            )

        if amount > 0 and direction == ExchangeRequest.CASH_DIRECTION_NONE:
            raise ValidationError(
                "cash_adjustment_direction is required when amount is greater than 0."
            )


class CreateExchangeRequestSchema(ExchangeOfferInputSchema):
    offered_item_id = fields.Int(required=True, validate=validate.Range(min=1))
    requested_item_id = fields.Int(required=True, validate=validate.Range(min=1))


class CounterExchangeRequestSchema(ExchangeOfferInputSchema):
    pass


class ExchangeOfferSchema(Schema):
    id = fields.Int(dump_only=True)
    exchange_request_id = fields.Int(dump_only=True)
    proposed_by_user_id = fields.Int(dump_only=True)
    cash_adjustment_amount = fields.Float(dump_only=True)
    cash_adjustment_direction = fields.Str(dump_only=True)
    message = fields.Str(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class ExchangeRequestSchema(Schema):
    id = fields.Int(dump_only=True)
    sender_id = fields.Int(dump_only=True)
    receiver_id = fields.Int(dump_only=True)
    offered_item_id = fields.Int(dump_only=True)
    requested_item_id = fields.Int(dump_only=True)
    status = fields.Str(dump_only=True)
    cash_adjustment_amount = fields.Float(dump_only=True)
    cash_adjustment_direction = fields.Str(dump_only=True)
    message = fields.Str(dump_only=True, allow_none=True)
    latest_offer = fields.Method("get_latest_offer", dump_only=True)
    offers_count = fields.Method("get_offers_count", dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    def get_latest_offer(self, obj):
        latest_offer = obj.offers[-1] if obj.offers else None
        if not latest_offer:
            return None
        return ExchangeOfferSchema().dump(latest_offer)

    def get_offers_count(self, obj):
        return len(obj.offers or [])
