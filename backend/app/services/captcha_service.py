import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import current_app


class CaptchaService:
    VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

    @staticmethod
    def verify(token):
        if not current_app.config.get("CAPTCHA_ENABLED"):
            return True, None

        if not token:
            return False, "CAPTCHA token is required"

        secret = current_app.config.get("CAPTCHA_SECRET_KEY")
        if not secret:
            return False, "CAPTCHA is not configured"

        payload = urlencode({"secret": secret, "response": token}).encode()
        request = Request(CaptchaService.VERIFY_URL, data=payload, method="POST")
        try:
            with urlopen(request, timeout=5) as response:
                result = json.loads(response.read().decode("utf-8"))
        except Exception:
            return False, "CAPTCHA verification failed"

        if not result.get("success"):
            return False, "Invalid CAPTCHA token"

        return True, None
