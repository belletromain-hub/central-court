import os
import asyncio
import logging
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Configure Resend
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "onboarding@resend.dev")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


async def send_email(to: str, subject: str, html_content: str) -> dict:
    """Send an email via Resend (non-blocking)"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return {"status": "skipped", "reason": "No API key"}

    params = {
        "from": SENDER_EMAIL,
        "to": [to],
        "subject": subject,
        "html": html_content,
    }

    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: {result}")
        return {"status": "success", "email_id": result.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return {"status": "error", "error": str(e)}


def build_tournament_alert_email(player_name: str, tournament_name: str, tournament_city: str, tournament_country: str, start_date: str) -> str:
    """Build HTML email for tournament booking alert"""
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: linear-gradient(135deg, #1976d2, #1565c0); border-radius: 12px; padding: 24px; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">\U0001f3be Le Court Central</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">Alerte Tournoi</p>
      </div>
      
      <div style="padding: 24px 0;">
        <p style="font-size: 16px; color: #333;">Bonjour <strong>{player_name}</strong>,</p>
        <p style="font-size: 15px; color: #555; line-height: 1.6;">Tu es inscrit(e) au tournoi <strong>{tournament_name}</strong> \u00e0 {tournament_city}, {tournament_country} (d\u00e9but le {start_date}).</p>
        
        <div style="background: #FFF3E0; border-left: 4px solid #FF9800; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #E65100;"><strong>\u26a0\ufe0f Rappel :</strong> Pense \u00e0 r\u00e9server ton vol et ton h\u00f4tel si ce n'est pas d\u00e9j\u00e0 fait !</p>
        </div>
        
        <p style="font-size: 14px; color: #888; margin-top: 24px;">\u2014 L'\u00e9quipe Le Court Central</p>
      </div>
    </div>
    """


def build_observation_notification_email(player_name: str, observer_name: str, observer_role: str, event_title: str, observation_text: str) -> str:
    """Build HTML email for staff observation notification"""
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: linear-gradient(135deg, #1976d2, #1565c0); border-radius: 12px; padding: 24px; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">\U0001f3be Le Court Central</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">Nouvelle Observation</p>
      </div>
      
      <div style="padding: 24px 0;">
        <p style="font-size: 16px; color: #333;">Bonjour <strong>{player_name}</strong>,</p>
        <p style="font-size: 15px; color: #555; line-height: 1.6;"><strong>{observer_name}</strong> ({observer_role}) a ajout\u00e9 une observation sur <strong>{event_title}</strong> :</p>
        
        <div style="background: #F5F5F5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
          <p style="margin: 0; font-size: 15px; color: #333; font-style: italic;">\"{observation_text}\"</p>
        </div>
        
        <p style="font-size: 14px; color: #888; margin-top: 24px;">\u2014 L'\u00e9quipe Le Court Central</p>
      </div>
    </div>
    """
