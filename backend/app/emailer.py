"""Sends password-reset emails via the Brevo HTTP API.

Render's free tier blocks outbound SMTP ports (25/465/587), so we use
Brevo's REST API over HTTPS instead. If BREVO_API_KEY is empty, the
reset link is printed to the server console (dev mode).
"""
import requests

from .database import settings

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def send_reset_email(to: str, link: str) -> None:
    if not settings.BREVO_API_KEY:
        print(f"\n[DEV] Password reset link for {to}:\n{link}\n")
        return

    resp = requests.post(
        BREVO_URL,
        headers={
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
        },
        json={
            "sender": {"email": settings.EMAIL_FROM, "name": "Finance Tracker"},
            "to": [{"email": to}],
            "subject": "Reset your Finance Tracker password",
            "textContent": (
                "Someone requested a password reset for your Finance Tracker "
                "account.\n\n"
                f"Reset your password (link valid for 30 minutes):\n{link}\n\n"
                "If this wasn't you, you can safely ignore this email."
            ),
        },
        timeout=10,
    )
    resp.raise_for_status()