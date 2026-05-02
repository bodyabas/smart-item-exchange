from sqlalchemy import or_

from app.extensions import db
from app.models.exchange_request import ExchangeOffer, ExchangeRequest
from app.models.item import Item
from app.schemas.exchange_request_schema import ExchangeOfferSchema, ExchangeRequestSchema


class ExchangeRequestService:
    @staticmethod
    def create_exchange_request(sender_id, data):
        offered_item = db.session.get(Item, data["offered_item_id"])
        requested_item = db.session.get(Item, data["requested_item_id"])

        if not offered_item or not requested_item:
            return None, "not_found"

        if offered_item.user_id != sender_id:
            return None, "offered_item_forbidden"

        if requested_item.user_id == sender_id:
            return None, "own_item"

        if (
            offered_item.status != Item.STATUS_AVAILABLE
            or requested_item.status != Item.STATUS_AVAILABLE
        ):
            return None, "items_not_available"

        pair_request = ExchangeRequest.query.filter(
            ExchangeRequest.offered_item_id == offered_item.id,
            ExchangeRequest.requested_item_id == requested_item.id,
            ExchangeRequest.status.in_(
                (
                    ExchangeRequest.STATUS_PENDING,
                    ExchangeRequest.STATUS_COUNTERED,
                    ExchangeRequest.STATUS_ACCEPTED,
                )
            ),
        ).first()
        if pair_request and pair_request.status in ExchangeRequest.ACTIVE_STATUSES:
            return None, "duplicate_pending_pair"
        if pair_request and pair_request.status == ExchangeRequest.STATUS_ACCEPTED:
            return None, "accepted_pair"

        accepted_item_request = ExchangeRequest.query.filter(
            ExchangeRequest.status == ExchangeRequest.STATUS_ACCEPTED,
            or_(
                ExchangeRequest.offered_item_id.in_(
                    (offered_item.id, requested_item.id)
                ),
                ExchangeRequest.requested_item_id.in_(
                    (offered_item.id, requested_item.id)
                ),
            ),
        ).first()
        if accepted_item_request:
            return None, "accepted_item_involved"

        exchange_request = ExchangeRequest(
            sender_id=sender_id,
            receiver_id=requested_item.user_id,
            offered_item_id=offered_item.id,
            requested_item_id=requested_item.id,
            cash_adjustment_amount=data["cash_adjustment_amount"],
            cash_adjustment_direction=data["cash_adjustment_direction"],
            message=data.get("message"),
        )
        db.session.add(exchange_request)
        db.session.flush()

        ExchangeRequestService._add_offer(exchange_request, sender_id, data)
        db.session.commit()

        return ExchangeRequestSchema().dump(exchange_request), None

    @staticmethod
    def list_exchange_requests(user_id):
        exchange_requests = (
            ExchangeRequest.query.filter(
                or_(
                    ExchangeRequest.sender_id == user_id,
                    ExchangeRequest.receiver_id == user_id,
                )
            )
            .order_by(ExchangeRequest.created_at.desc())
            .all()
        )
        return ExchangeRequestSchema(many=True).dump(exchange_requests)

    @staticmethod
    def get_exchange_request(exchange_request_id, user_id):
        exchange_request = db.session.get(ExchangeRequest, exchange_request_id)
        if not exchange_request:
            return None, "not_found"

        if not ExchangeRequestService._is_participant(exchange_request, user_id):
            return None, "forbidden"

        return ExchangeRequestSchema().dump(exchange_request), None

    @staticmethod
    def list_offers(exchange_request_id, user_id):
        exchange_request = db.session.get(ExchangeRequest, exchange_request_id)
        if not exchange_request:
            return None, "not_found"

        if not ExchangeRequestService._is_participant(exchange_request, user_id):
            return None, "forbidden"

        offers = (
            ExchangeOffer.query.filter_by(exchange_request_id=exchange_request.id)
            .order_by(ExchangeOffer.created_at.asc())
            .all()
        )
        return ExchangeOfferSchema(many=True).dump(offers), None

    @staticmethod
    def counter_exchange_request(exchange_request_id, user_id, data):
        exchange_request = db.session.get(ExchangeRequest, exchange_request_id)
        if not exchange_request:
            return None, "not_found"

        if not ExchangeRequestService._is_participant(exchange_request, user_id):
            return None, "forbidden"

        if exchange_request.status in (
            ExchangeRequest.STATUS_ACCEPTED,
            ExchangeRequest.STATUS_REJECTED,
            ExchangeRequest.STATUS_CANCELLED,
        ):
            return None, "closed"

        latest_offer = ExchangeRequestService._latest_offer(exchange_request)
        if latest_offer and latest_offer.proposed_by_user_id == user_id:
            return None, "own_latest_offer"

        exchange_request.cash_adjustment_amount = data["cash_adjustment_amount"]
        exchange_request.cash_adjustment_direction = data["cash_adjustment_direction"]
        exchange_request.message = data.get("message")
        exchange_request.status = ExchangeRequest.STATUS_COUNTERED

        ExchangeRequestService._add_offer(exchange_request, user_id, data)
        db.session.commit()

        return ExchangeRequestSchema().dump(exchange_request), None

    @staticmethod
    def accept_exchange_request(exchange_request_id, user_id):
        exchange_request = db.session.get(ExchangeRequest, exchange_request_id)
        if not exchange_request:
            return None, "not_found"

        if not ExchangeRequestService._is_participant(exchange_request, user_id):
            return None, "forbidden"

        if exchange_request.status not in ExchangeRequest.ACTIVE_STATUSES:
            return None, "not_pending"

        latest_offer = ExchangeRequestService._latest_offer(exchange_request)
        if not latest_offer:
            return None, "missing_offer"

        if latest_offer.proposed_by_user_id == user_id:
            return None, "own_latest_offer"

        if (
            exchange_request.offered_item.status != Item.STATUS_AVAILABLE
            or exchange_request.requested_item.status != Item.STATUS_AVAILABLE
        ):
            return None, "items_not_available"

        exchange_request.offered_item.status = Item.STATUS_EXCHANGED
        exchange_request.requested_item.status = Item.STATUS_EXCHANGED
        exchange_request.status = ExchangeRequest.STATUS_ACCEPTED
        db.session.commit()

        return ExchangeRequestSchema().dump(exchange_request), None

    @staticmethod
    def reject_exchange_request(exchange_request_id, user_id):
        exchange_request = db.session.get(ExchangeRequest, exchange_request_id)
        if not exchange_request:
            return None, "not_found"

        if not ExchangeRequestService._is_participant(exchange_request, user_id):
            return None, "forbidden"

        if exchange_request.status not in ExchangeRequest.ACTIVE_STATUSES:
            return None, "not_pending"

        latest_offer = ExchangeRequestService._latest_offer(exchange_request)
        if not latest_offer:
            return None, "missing_offer"

        if latest_offer.proposed_by_user_id == user_id:
            return None, "own_latest_offer"

        exchange_request.status = ExchangeRequest.STATUS_REJECTED
        db.session.commit()

        return ExchangeRequestSchema().dump(exchange_request), None

    @staticmethod
    def cancel_exchange_request(exchange_request_id, user_id):
        exchange_request = db.session.get(ExchangeRequest, exchange_request_id)
        if not exchange_request:
            return None, "not_found"

        if exchange_request.sender_id != user_id:
            return None, "forbidden"

        if exchange_request.status not in ExchangeRequest.ACTIVE_STATUSES:
            return None, "not_pending"

        exchange_request.status = ExchangeRequest.STATUS_CANCELLED
        db.session.commit()

        return ExchangeRequestSchema().dump(exchange_request), None

    @staticmethod
    def _add_offer(exchange_request, user_id, data):
        offer = ExchangeOffer(
            exchange_request_id=exchange_request.id,
            proposed_by_user_id=user_id,
            cash_adjustment_amount=data["cash_adjustment_amount"],
            cash_adjustment_direction=data["cash_adjustment_direction"],
            message=data.get("message"),
        )
        db.session.add(offer)
        return offer

    @staticmethod
    def _latest_offer(exchange_request):
        if not exchange_request.offers:
            return None
        return exchange_request.offers[-1]

    @staticmethod
    def _is_participant(exchange_request, user_id):
        return user_id in (exchange_request.sender_id, exchange_request.receiver_id)
