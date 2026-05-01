from datetime import datetime, timezone

from sqlalchemy import literal

from app.extensions import db
from app.models.item import Item
from app.schemas.item_schema import ItemSchema
from app.services.embedding_service import EmbeddingService


class RecommendationService:
    SOURCE_LIMIT = 5
    ME_LIMIT = 10
    CANDIDATE_LIMIT = 50
    CONDITION_SCORES = {
        "new": {
            "new": 1.0,
            "like_new": 0.9,
            "used": 0.5,
            "refurbished": 0.5,
            "broken": 0.1,
        },
        "like_new": {
            "new": 0.9,
            "like_new": 1.0,
            "used": 0.7,
            "refurbished": 0.7,
            "broken": 0.1,
        },
        "used": {
            "new": 0.5,
            "like_new": 0.7,
            "used": 1.0,
            "refurbished": 0.8,
            "broken": 0.2,
        },
        "refurbished": {
            "new": 0.5,
            "like_new": 0.7,
            "used": 0.8,
            "refurbished": 1.0,
            "broken": 0.2,
        },
        "broken": {
            "new": 0.1,
            "like_new": 0.1,
            "used": 0.2,
            "refurbished": 0.2,
            "broken": 1.0,
        },
    }
    CATEGORY_GROUPS = {
        "electronics": {
            "computer",
            "console",
            "desktop",
            "device",
            "electronics",
            "gadget",
            "headphones",
            "keyboard",
            "laptop",
            "monitor",
            "notebook",
            "pc",
            "phone",
            "smartphone",
            "tablet",
            "tv",
        },
        "mobile": {
            "android",
            "iphone",
            "mobile",
            "phone",
            "smartphone",
            "tablet",
        },
        "computers": {
            "computer",
            "desktop",
            "laptop",
            "monitor",
            "notebook",
            "pc",
            "tablet",
        },
    }

    @staticmethod
    def get_recommendations(item_id, limit=SOURCE_LIMIT):
        source_item = db.session.get(Item, item_id)
        if not source_item:
            return None, "not_found"

        if source_item.embedding is None:
            return None, "missing_embedding"

        recommendations = RecommendationService._recommend_for_source(
            source_item,
            limit=limit,
        )
        return recommendations, None

    @staticmethod
    def get_my_recommendations(user_id):
        source_items = (
            Item.query.filter_by(user_id=user_id, status=Item.STATUS_AVAILABLE)
            .filter(Item.embedding.isnot(None))
            .order_by(Item.created_at.desc())
            .all()
        )
        if not source_items:
            return [], "no_available_items"

        best_by_item_id = {}
        for source_item in source_items:
            recommendations = RecommendationService._recommend_for_source(
                source_item,
                limit=RecommendationService.CANDIDATE_LIMIT,
            )
            for recommendation in recommendations:
                item_id = recommendation["recommended_item"]["id"]
                recommendation = RecommendationService._me_response_item(
                    recommendation
                )
                current_best = best_by_item_id.get(item_id)
                if (
                    not current_best
                    or recommendation["final_score"] > current_best["final_score"]
                ):
                    best_by_item_id[item_id] = recommendation

        sorted_recommendations = sorted(
            best_by_item_id.values(),
            key=lambda recommendation: recommendation["final_score"],
            reverse=True,
        )
        return sorted_recommendations[: RecommendationService.ME_LIMIT], None

    @staticmethod
    def _recommend_for_source(source_item, limit):
        rows = RecommendationService._candidate_rows(source_item)
        schema = ItemSchema()
        recommendations = []

        for candidate, desired_score, item_score in rows:
            city_match = RecommendationService._exact_match(
                source_item.city,
                candidate.city,
            )
            mutual_interest_score = RecommendationService._mutual_interest_score(
                source_item,
                candidate,
            )
            category_relevance = RecommendationService._category_relevance(
                source_item.desired_exchange,
                candidate,
            )
            components = {
                "desired_exchange_similarity": RecommendationService._round_score(
                    desired_score
                ),
                "item_similarity": RecommendationService._round_score(item_score),
                "mutual_interest_score": mutual_interest_score,
                "category_relevance": category_relevance,
                "city_match": city_match,
                "condition_score": RecommendationService._condition_score(
                    source_item.condition,
                    candidate.condition,
                ),
                "freshness_score": RecommendationService._freshness_score(
                    candidate.created_at
                ),
            }
            final_score = (
                0.40 * components["desired_exchange_similarity"]
                + 0.20 * components["item_similarity"]
                + 0.15 * components["mutual_interest_score"]
                + 0.10 * components["category_relevance"]
                + 0.05 * components["city_match"]
                + 0.05 * components["condition_score"]
                + 0.05 * components["freshness_score"]
            )
            recommendations.append(
                {
                    "source_item": schema.dump(source_item),
                    "recommended_item": schema.dump(candidate),
                    "item": schema.dump(candidate),
                    "final_score": round(final_score, 4),
                    "components": components,
                }
            )

        recommendations.sort(
            key=lambda recommendation: recommendation["final_score"],
            reverse=True,
        )
        return recommendations[:limit]

    @staticmethod
    def _candidate_rows(source_item):
        item_distance = Item.embedding.cosine_distance(source_item.embedding)
        item_similarity = (1 - item_distance).label("item_similarity")

        desired_exchange = (source_item.desired_exchange or "").strip()
        if desired_exchange:
            desired_embedding = EmbeddingService.generate_text_embedding(desired_exchange)
            desired_distance = Item.matching_embedding.cosine_distance(desired_embedding)
            desired_similarity = (1 - desired_distance).label(
                "desired_exchange_similarity"
            )
            order_by = desired_distance
        else:
            desired_similarity = literal(0.0).label("desired_exchange_similarity")
            order_by = item_distance

        return (
            db.session.query(Item, desired_similarity, item_similarity)
            .filter(Item.id != source_item.id)
            .filter(Item.user_id != source_item.user_id)
            .filter(Item.status == Item.STATUS_AVAILABLE)
            .filter(Item.embedding.isnot(None))
            .filter(Item.matching_embedding.isnot(None))
            .order_by(order_by)
            .limit(RecommendationService.CANDIDATE_LIMIT)
            .all()
        )

    @staticmethod
    def _exact_match(first, second):
        if first and second and first.strip().lower() == second.strip().lower():
            return 1.0
        return 0.0

    @staticmethod
    def _condition_score(source_condition, candidate_condition):
        source = RecommendationService._normalize_condition(source_condition)
        candidate = RecommendationService._normalize_condition(candidate_condition)
        return RecommendationService.CONDITION_SCORES.get(source, {}).get(
            candidate,
            0.4,
        )

    @staticmethod
    def _normalize_condition(condition):
        return (condition or "").strip().lower().replace(" ", "_").replace("-", "_")

    @staticmethod
    def _freshness_score(created_at):
        if not created_at:
            return 0.2

        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        age_days = (datetime.now(timezone.utc) - created_at).days
        if age_days <= 1:
            return 1.0
        if age_days <= 7:
            return 0.8
        if age_days <= 30:
            return 0.5
        return 0.2

    @staticmethod
    def _mutual_interest_score(source_item, candidate_item):
        desired_exchange = (candidate_item.desired_exchange or "").strip()
        if not desired_exchange or source_item.matching_embedding is None:
            return 0.0

        desired_embedding = EmbeddingService.generate_text_embedding(desired_exchange)
        embedding_score = RecommendationService._round_score(
            RecommendationService._cosine_similarity(
                desired_embedding,
                source_item.matching_embedding,
            )
        )
        keyword_score = RecommendationService._keyword_interest_score(
            desired_exchange,
            source_item,
        )

        return max(embedding_score, keyword_score)

    @staticmethod
    def _keyword_interest_score(desired_exchange, source_item):
        desired_tokens = RecommendationService._expanded_tokens(desired_exchange)
        source_text = " ".join(
            part
            for part in (
                source_item.title,
                source_item.category,
                source_item.description,
            )
            if part
        )
        source_tokens = RecommendationService._expanded_tokens(source_text)

        if not desired_tokens or not source_tokens:
            return 0.0

        overlap = desired_tokens.intersection(source_tokens)
        if not overlap:
            return 0.0

        direct_overlap = RecommendationService._tokens(desired_exchange).intersection(
            RecommendationService._tokens(source_text)
        )
        if direct_overlap:
            return 1.0

        return 0.8

    @staticmethod
    def _category_relevance(desired_exchange, candidate_item):
        desired_tokens = RecommendationService._expanded_tokens(desired_exchange)
        candidate_text = " ".join(
            part
            for part in (
                candidate_item.category,
                candidate_item.title,
                candidate_item.description,
            )
            if part
        )
        candidate_tokens = RecommendationService._expanded_tokens(candidate_text)

        if not desired_tokens or not candidate_tokens:
            return 0.0

        overlap = desired_tokens.intersection(candidate_tokens)
        if not overlap:
            return 0.0

        direct_desired = RecommendationService._tokens(desired_exchange)
        direct_candidate = RecommendationService._tokens(candidate_text)
        direct_overlap = direct_desired.intersection(direct_candidate)
        score = len(overlap) / max(len(desired_tokens), 1)

        if direct_overlap:
            score += 0.25

        return RecommendationService._round_score(score)

    @staticmethod
    def _expanded_tokens(text):
        tokens = RecommendationService._tokens(text)
        expanded = set(tokens)
        for token in tokens:
            for group in RecommendationService.CATEGORY_GROUPS.values():
                if token in group:
                    expanded.update(group)
        return expanded

    @staticmethod
    def _tokens(text):
        import re

        return {
            RecommendationService._normalize_token(token)
            for token in re.findall(r"[a-z0-9]+", (text or "").lower())
        }

    @staticmethod
    def _normalize_token(token):
        if token.endswith("ies") and len(token) > 3:
            return f"{token[:-3]}y"
        if token.endswith("es") and len(token) > 3:
            return token[:-2]
        if token.endswith("s") and len(token) > 3:
            return token[:-1]
        return token

    @staticmethod
    def _cosine_similarity(first, second):
        first = [float(value) for value in first]
        second = [float(value) for value in second]
        dot_product = sum(a * b for a, b in zip(first, second))
        first_norm = sum(value * value for value in first) ** 0.5
        second_norm = sum(value * value for value in second) ** 0.5
        if first_norm == 0 or second_norm == 0:
            return 0.0
        return dot_product / (first_norm * second_norm)

    @staticmethod
    def _round_score(score):
        score = float(score or 0.0)
        return round(max(0.0, min(1.0, score)), 4)

    @staticmethod
    def _me_response_item(recommendation):
        return {
            "source_item": recommendation["source_item"],
            "recommended_item": recommendation["recommended_item"],
            "final_score": recommendation["final_score"],
            "components": recommendation["components"],
        }
