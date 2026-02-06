from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from services.email_service import (
    send_email,
    build_tournament_alert_email,
    build_observation_notification_email,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/email", tags=["email"])


class SendEmailRequest(BaseModel):
    recipient_email: str
    subject: str
    html_content: str


class TournamentAlertRequest(BaseModel):
    recipient_email: str
    player_name: str
    tournament_name: str
    tournament_city: str
    tournament_country: str
    start_date: str


class ObservationNotificationRequest(BaseModel):
    recipient_email: str
    player_name: str
    observer_name: str
    observer_role: str
    event_title: str
    observation_text: str


@router.post("/send")
async def send_generic_email(req: SendEmailRequest):
    """Send a generic email"""
    if not req.html_content.strip():
        raise HTTPException(status_code=400, detail="html_content cannot be empty")
    result = await send_email(req.recipient_email, req.subject, req.html_content)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.post("/tournament-alert")
async def send_tournament_alert(req: TournamentAlertRequest):
    """Send a tournament booking reminder email"""
    html = build_tournament_alert_email(
        player_name=req.player_name,
        tournament_name=req.tournament_name,
        tournament_city=req.tournament_city,
        tournament_country=req.tournament_country,
        start_date=req.start_date,
    )
    subject = f"\U0001f3be Rappel : Réservations pour {req.tournament_name}"
    result = await send_email(req.recipient_email, subject, html)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.post("/observation-notification")
async def send_observation_notification(req: ObservationNotificationRequest):
    """Send an observation notification email to relevant staff/player"""
    html = build_observation_notification_email(
        player_name=req.player_name,
        observer_name=req.observer_name,
        observer_role=req.observer_role,
        event_title=req.event_title,
        observation_text=req.observation_text,
    )
    subject = f"\U0001f4ac Nouvelle observation sur {req.event_title}"
    result = await send_email(req.recipient_email, subject, html)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
    return result
