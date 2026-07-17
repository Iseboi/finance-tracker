"""Sends password-reset emails via SMTP (Brevo free tier).

If SMTP is not configured (empty SMTP_HOST), the reset link is printed
to the server console instead — so the full flow can be developed and
tested with zero email setup. Configuration-driven behavior.
"""
import smtplib
from email.message import EmailMessage

from .database import settings


def send_reset_email(to: str, link: str) -> None:
    if not settings.SMTP_HOST:
        print(f"\n[DEV] Password reset link for {to}:\n{link}\n")
        return

    msg = EmailMessage()
    msg["Subject"] = "Reset your Finance Tracker password"
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg.set_content(
        "Someone requested a password reset for your Finance Tracker "
        "account.\n\n"
        f"Reset your password (link valid for 30 minutes):\n{link}\n\n"
        "If this wasn't you, you can safely ignore this email."
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.send_message(msg)
