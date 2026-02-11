from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import asyncio

from services.email_service import send_email, build_tournament_alert_email

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

db = None

def init_db(database):
    global db
    db = database


class CreateAlertRequest(BaseModel):
    type: str  # flight_missing, hotel_missing, registration_pending, observation_new, slot_suggestion, reminder
    priority: str = "medium"  # high, medium, low
    title: str
    message: str
    tournamentId: Optional[str] = None
    tournamentName: Optional[str] = None
    tournamentCity: Optional[str] = None
    tournamentCountry: Optional[str] = None
    tournamentStartDate: Optional[str] = None
    tournamentEndDate: Optional[str] = None
    eventId: Optional[str] = None
    dueDate: Optional[str] = None
    fromUserName: Optional[str] = None
    fromUserRole: Optional[str] = None
    targetSlot: Optional[dict] = None


@router.get("")
async def list_alerts(unread_only: bool = False):
    """List all alerts"""
    query = {}
    if unread_only:
        query["read"] = False
        query["dismissed"] = False
    alerts = await db.alerts.find(query, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return alerts


@router.post("")
async def create_alert(req: CreateAlertRequest):
    """Create a new alert/notification"""
    alert = {
        "id": f"alert-{uuid.uuid4().hex[:8]}",
        "type": req.type,
        "priority": req.priority,
        "title": req.title,
        "message": req.message,
        "tournamentId": req.tournamentId,
        "tournamentName": req.tournamentName,
        "tournamentCity": req.tournamentCity,
        "tournamentCountry": req.tournamentCountry,
        "tournamentStartDate": req.tournamentStartDate,
        "tournamentEndDate": req.tournamentEndDate,
        "eventId": req.eventId,
        "dueDate": req.dueDate,
        "fromUserName": req.fromUserName,
        "fromUserRole": req.fromUserRole,
        "targetSlot": req.targetSlot,
        "read": False,
        "dismissed": False,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.alerts.insert_one(alert)
    alert.pop("_id", None)
    return alert


@router.put("/{alert_id}/read")
async def mark_alert_read(alert_id: str):
    """Mark an alert as read"""
    result = await db.alerts.update_one({"id": alert_id}, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}


@router.put("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str):
    """Dismiss an alert"""
    result = await db.alerts.update_one({"id": alert_id}, {"$set": {"dismissed": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}


@router.put("/read-all")
async def mark_all_read():
    """Mark all alerts as read"""
    await db.alerts.update_many({"read": False}, {"$set": {"read": True}})
    return {"success": True}


@router.post("/generate")
async def generate_alerts():
    """Generate alerts based on tournament registrations and missing bookings.
    Also sends email notifications for high-priority alerts."""
    # Get active registrations
    registrations = await db.tournament_registrations.find(
        {"status": {"$in": ["participating", "accepted", "pending"]}},
        {"_id": 0}
    ).to_list(100)

    if not registrations:
        return {"generated": 0}

    # Get events with projection and limit
    events = await db.events.find(
        {}, {"_id": 0, "id": 1, "title": 1, "date": 1, "time": 1, "type": 1, "tournamentId": 1}
    ).limit(200).to_list(200)

    today = datetime.now(timezone.utc).date()
    new_alerts = []

    for reg in registrations:
        tournament = await db.tournaments.find_one({"id": reg["tournamentId"]}, {"_id": 0})
        if not tournament:
            continue

        start = datetime.strptime(tournament["startDate"], "%Y-%m-%d").date()
        days_until = (start - today).days
        if days_until <= 0 or days_until > 14:
            continue

        tid = tournament["id"]
        priority = "high" if days_until <= 3 else "medium"

        # Check flight
        has_flight = any(
            e.get("type") == "travel" and (
                e.get("tournamentId") == tid or
                tournament["city"].lower() in (e.get("title") or "").lower()
            )
            for e in events
        )
        if not has_flight:
            existing = await db.alerts.find_one({"id": f"alert-flight-{tid}"}, {"_id": 0})
            if not existing:
                alert = {
                    "id": f"alert-flight-{tid}",
                    "type": "flight_missing",
                    "priority": priority,
                    "title": "Vol non réservé",
                    "message": f"{tournament['name']} dans {days_until}j",
                    "tournamentId": tid,
                    "tournamentName": tournament["name"],
                    "tournamentCity": tournament["city"],
                    "tournamentCountry": tournament["country"],
                    "tournamentStartDate": tournament["startDate"],
                    "tournamentEndDate": tournament["endDate"],
                    "dueDate": tournament["startDate"],
                    "read": False,
                    "dismissed": False,
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                }
                await db.alerts.insert_one(alert)
                new_alerts.append(alert)

        # Check hotel
        has_hotel = any(
            e.get("type") == "hotel" and (
                e.get("tournamentId") == tid or
                tournament["city"].lower() in (e.get("title") or "").lower()
            )
            for e in events
        )
        if not has_hotel:
            existing = await db.alerts.find_one({"id": f"alert-hotel-{tid}"}, {"_id": 0})
            if not existing:
                alert = {
                    "id": f"alert-hotel-{tid}",
                    "type": "hotel_missing",
                    "priority": priority,
                    "title": "Hôtel non réservé",
                    "message": f"{tournament['name']} dans {days_until}j",
                    "tournamentId": tid,
                    "tournamentName": tournament["name"],
                    "tournamentCity": tournament["city"],
                    "tournamentCountry": tournament["country"],
                    "tournamentStartDate": tournament["startDate"],
                    "tournamentEndDate": tournament["endDate"],
                    "dueDate": tournament["startDate"],
                    "read": False,
                    "dismissed": False,
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                }
                await db.alerts.insert_one(alert)
                new_alerts.append(alert)

        # Check pending registration
        if reg["status"] == "pending":
            existing = await db.alerts.find_one({"id": f"alert-reg-{tid}"}, {"_id": 0})
            if not existing:
                alert = {
                    "id": f"alert-reg-{tid}",
                    "type": "registration_pending",
                    "priority": priority,
                    "title": "Inscription en attente",
                    "message": f"{tournament['name']} dans {days_until}j",
                    "tournamentId": tid,
                    "tournamentName": tournament["name"],
                    "tournamentCity": tournament["city"],
                    "tournamentCountry": tournament["country"],
                    "tournamentStartDate": tournament["startDate"],
                    "tournamentEndDate": tournament["endDate"],
                    "dueDate": tournament["startDate"],
                    "read": False,
                    "dismissed": False,
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                }
                await db.alerts.insert_one(alert)
                new_alerts.append(alert)

    # Send email for high priority alerts (fire and forget)
    for alert in new_alerts:
        if alert["priority"] == "high" and alert.get("tournamentName"):
            asyncio.create_task(
                send_email(
                    "romainbasket77@gmail.com",
                    f"🎾 {alert['title']} - {alert['tournamentName']}",
                    build_tournament_alert_email(
                        "Joueur",
                        alert["tournamentName"],
                        alert.get("tournamentCity", ""),
                        alert.get("tournamentCountry", ""),
                        alert.get("tournamentStartDate", ""),
                    )
                )
            )

    return {"generated": len(new_alerts), "alerts": [{"id": a["id"], "type": a["type"]} for a in new_alerts]}
