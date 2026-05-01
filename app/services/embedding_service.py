import hashlib
import math
import os
import re

from openai import OpenAI, OpenAIError


class EmbeddingService:
    MODEL = "text-embedding-3-small"
    DIMENSIONS = 1536

    @staticmethod
    def item_text(data):
        parts = [
            data.get("title"),
            data.get("description"),
            data.get("category"),
            data.get("condition"),
            data.get("city"),
            data.get("desired_exchange"),
        ]
        return " ".join(str(part).strip() for part in parts if part)

    @staticmethod
    def item_matching_text(data):
        parts = [
            data.get("title"),
            data.get("category"),
            data.get("description"),
        ]
        return " ".join(str(part).strip() for part in parts if part)

    @staticmethod
    def generate_text_embedding(text):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return EmbeddingService._fallback_embedding(text)

        try:
            client = OpenAI(api_key=api_key)
            response = client.embeddings.create(
                model=EmbeddingService.MODEL,
                input=text,
            )
            return response.data[0].embedding
        except OpenAIError:
            return EmbeddingService._fallback_embedding(text)

    @staticmethod
    def generate_item_embedding(data):
        return EmbeddingService.generate_text_embedding(EmbeddingService.item_text(data))

    @staticmethod
    def generate_item_matching_embedding(data):
        return EmbeddingService.generate_text_embedding(
            EmbeddingService.item_matching_text(data)
        )

    @staticmethod
    def _fallback_embedding(text):
        vector = [0.0] * EmbeddingService.DIMENSIONS
        tokens = re.findall(r"[a-z0-9]+", text.lower())

        if not tokens:
            tokens = ["empty"]

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % EmbeddingService.DIMENSIONS
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector

        return [value / norm for value in vector]
