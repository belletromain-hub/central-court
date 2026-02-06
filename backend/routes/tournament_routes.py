from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])

db = None

def init_db(database):
    global db
    db = database


class RegisterTournamentRequest(BaseModel):
    tournamentId: str
    status: str  # interested, pending, accepted, participating, declined


class HideTournamentRequest(BaseModel):
    tournamentId: str


@router.get("")
async def list_tournaments(circuit: Optional[str] = None):
    """List all tournaments, optionally filtered by circuit (atp, wta, itf, itf_wheelchair)"""
    query = {}
    if circuit:
        query["circuit"] = circuit
    tournaments = await db.tournaments.find(query, {"_id": 0}).sort("startDate", 1).to_list(500)
    return tournaments


@router.get("/weeks")
async def list_tournament_weeks(
    circuits: Optional[str] = Query(None, description="Comma-separated circuit filter: atp,wta,itf,itf_wheelchair")
):
    """Get tournaments grouped by week with registrations and hidden status.
    Filter by circuits (comma-separated) to show only relevant tournaments."""
    # Parse circuit filter
    circuit_filter = None
    if circuits:
        circuit_filter = [c.strip().lower() for c in circuits.split(",") if c.strip()]

    # Get all weeks
    weeks = await db.tournament_weeks.find({}, {"_id": 0}).sort("weekNumber", 1).to_list(100)

    # Get all tournaments
    t_query = {}
    if circuit_filter:
        t_query["circuit"] = {"$in": circuit_filter}
    all_tournaments = await db.tournaments.find(t_query, {"_id": 0}).to_list(500)

    # Group tournaments by week
    tournaments_by_week = {}
    for t in all_tournaments:
        wn = t.get("weekNumber")
        if wn not in tournaments_by_week:
            tournaments_by_week[wn] = []
        tournaments_by_week[wn].append(t)

    # Get registrations and hidden for current user (demo: no auth yet)
    registrations = await db.tournament_registrations.find({}, {"_id": 0}).to_list(500)
    hidden = await db.tournament_hidden.find({}, {"_id": 0}).to_list(500)

    reg_by_week = {}
    for r in registrations:
        # Find tournament to get its week
        t = next((t for t in all_tournaments if t["id"] == r["tournamentId"]), None)
        if not t:
            # Tournament might be in another circuit, check all
            t_full = await db.tournaments.find_one({"id": r["tournamentId"]}, {"_id": 0})
            if t_full:
                wn = t_full.get("weekNumber")
            else:
                continue
        else:
            wn = t.get("weekNumber")
        if wn not in reg_by_week:
            reg_by_week[wn] = []
        reg_by_week[wn].append({"tournamentId": r["tournamentId"], "status": r["status"]})

    hidden_ids = {h["tournamentId"] for h in hidden}

    # Build response
    result = []
    for week in weeks:
        wn = week["weekNumber"]
        week_tournaments = tournaments_by_week.get(wn, [])
        # Only include weeks that have tournaments for the requested circuits
        if circuit_filter and not week_tournaments:
            continue
        result.append({
            **week,
            "tournaments": week_tournaments,
            "registrations": reg_by_week.get(wn, []),
            "hiddenTournamentIds": [tid for tid in hidden_ids
                                    if any(t["id"] == tid for t in week_tournaments)],
        })

    return result


@router.post("/register")
async def register_tournament(req: RegisterTournamentRequest):
    """Register or update registration for a tournament"""
    valid_statuses = ["interested", "pending", "accepted", "participating", "declined"]
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    # Check tournament exists
    tournament = await db.tournaments.find_one({"id": req.tournamentId}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Upsert registration
    await db.tournament_registrations.update_one(
        {"tournamentId": req.tournamentId},
        {"$set": {
            "tournamentId": req.tournamentId,
            "status": req.status,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )

    # If participating, hide other tournaments in same week
    if req.status == "participating":
        week_tournaments = await db.tournaments.find(
            {"weekNumber": tournament["weekNumber"], "id": {"$ne": req.tournamentId}},
            {"_id": 0, "id": 1}
        ).to_list(100)
        for t in week_tournaments:
            await db.tournament_hidden.update_one(
                {"tournamentId": t["id"]},
                {"$set": {"tournamentId": t["id"]}},
                upsert=True
            )

    # Remove from hidden if registering
    await db.tournament_hidden.delete_one({"tournamentId": req.tournamentId})

    return {"success": True, "tournamentId": req.tournamentId, "status": req.status}


@router.post("/hide")
async def hide_tournament(req: HideTournamentRequest):
    """Hide a tournament (not interested)"""
    await db.tournament_hidden.update_one(
        {"tournamentId": req.tournamentId},
        {"$set": {"tournamentId": req.tournamentId}},
        upsert=True
    )
    # Remove registration if exists
    await db.tournament_registrations.delete_one({"tournamentId": req.tournamentId})
    return {"success": True}


@router.delete("/hide/{tournament_id}")
async def unhide_tournament(tournament_id: str):
    """Unhide a tournament"""
    await db.tournament_hidden.delete_one({"tournamentId": tournament_id})
    return {"success": True}
