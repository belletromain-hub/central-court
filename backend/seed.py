"""Seed script to populate MongoDB with demo data for Le Court Central."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from datetime import datetime, timezone

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.central_court

    # ── STAFF ──
    await db.staff.delete_many({})
    staff = [
        {"id": "staff-001", "name": "Patrick Mouratoglou", "role": "coach", "roleLabel": "Coach Principal", "email": "patrick@mouratoglou.com", "phone": "+33 6 12 34 56 78", "color": "#1976d2", "notificationPrefs": {"observations": True, "slotSuggestions": True, "tournamentUpdates": True}},
        {"id": "staff-002", "name": "Marc Dupont", "role": "physical_trainer", "roleLabel": "Préparateur Physique", "email": "marc.dupont@training.com", "phone": "+33 6 23 45 67 89", "color": "#388e3c", "notificationPrefs": {"observations": True, "slotSuggestions": True, "tournamentUpdates": False}},
        {"id": "staff-003", "name": "Dr. Sophie Laurent", "role": "physio", "roleLabel": "Kinésithérapeute", "email": "sophie.laurent@kine.fr", "phone": "+33 6 34 56 78 90", "color": "#c2185b", "notificationPrefs": {"observations": True, "slotSuggestions": True, "tournamentUpdates": False}},
        {"id": "staff-004", "name": "Claire Martin", "role": "nutritionist", "roleLabel": "Nutritionniste", "email": "claire.martin@nutrition.com", "color": "#ff9800", "notificationPrefs": {"observations": True, "slotSuggestions": False, "tournamentUpdates": False}},
        {"id": "staff-005", "name": "Jean-Pierre Blanc", "role": "mental_coach", "roleLabel": "Préparateur Mental", "email": "jp.blanc@mental.com", "color": "#9c27b0", "notificationPrefs": {"observations": True, "slotSuggestions": True, "tournamentUpdates": False}},
        {"id": "staff-006", "name": "Thomas Bernard", "role": "agent", "roleLabel": "Agent", "email": "thomas@agence-sport.com", "phone": "+33 6 45 67 89 01", "color": "#607d8b", "notificationPrefs": {"observations": False, "slotSuggestions": False, "tournamentUpdates": True}},
    ]
    await db.staff.insert_many(staff)
    print(f"✅ Seeded {len(staff)} staff members")

    # ── TOURNAMENT WEEKS ──
    await db.tournament_weeks.delete_many({})
    weeks = [
        {"weekNumber": 6, "weekLabel": "2-8 février 2026", "startDate": "2026-02-02", "endDate": "2026-02-08"},
        {"weekNumber": 7, "weekLabel": "9-15 février 2026", "startDate": "2026-02-09", "endDate": "2026-02-15"},
        {"weekNumber": 8, "weekLabel": "16-22 février 2026", "startDate": "2026-02-16", "endDate": "2026-02-22"},
        {"weekNumber": 9, "weekLabel": "23 fév - 1 mars 2026", "startDate": "2026-02-23", "endDate": "2026-03-01"},
    ]
    await db.tournament_weeks.insert_many(weeks)
    print(f"✅ Seeded {len(weeks)} tournament weeks")

    # ── TOURNAMENTS (with circuit field) ──
    await db.tournaments.delete_many({})
    tournaments = [
        # ATP - Semaine 6
        {"id": "montpellier-2026", "name": "Open Occitanie", "city": "Montpellier", "country": "France", "countryFlag": "🇫🇷", "category": "ATP 250", "circuit": "atp", "surface": "Hard Indoor", "prize": "€768,735", "playerZoneLink": "https://playerzone.atptour.com/tournaments/montpellier", "deadlineDate": "2026-01-26", "startDate": "2026-02-02", "endDate": "2026-02-08", "weekNumber": 6},
        {"id": "pune-2026", "name": "Tata Open Maharashtra", "city": "Pune", "country": "Inde", "countryFlag": "🇮🇳", "category": "ATP 250", "circuit": "atp", "surface": "Hard Outdoor", "prize": "$661,145", "playerZoneLink": "https://playerzone.atptour.com/tournaments/pune", "deadlineDate": "2026-01-26", "startDate": "2026-02-02", "endDate": "2026-02-08", "weekNumber": 6},
        # ATP - Semaine 7
        {"id": "rotterdam-2026", "name": "ABN AMRO Open", "city": "Rotterdam", "country": "Pays-Bas", "countryFlag": "🇳🇱", "category": "ATP 500", "circuit": "atp", "surface": "Hard Indoor", "prize": "€2,477,345", "playerZoneLink": "https://playerzone.atptour.com/tournaments/rotterdam", "deadlineDate": "2026-02-02", "startDate": "2026-02-09", "endDate": "2026-02-15", "weekNumber": 7},
        {"id": "delray-2026", "name": "Delray Beach Open", "city": "Delray Beach", "country": "USA", "countryFlag": "🇺🇸", "category": "ATP 250", "circuit": "atp", "surface": "Hard Outdoor", "prize": "$768,735", "playerZoneLink": "https://playerzone.atptour.com/tournaments/delray-beach", "deadlineDate": "2026-02-02", "startDate": "2026-02-09", "endDate": "2026-02-15", "weekNumber": 7},
        # ATP - Semaine 8
        {"id": "doha-2026", "name": "Qatar ExxonMobil Open", "city": "Doha", "country": "Qatar", "countryFlag": "🇶🇦", "category": "ATP 250", "circuit": "atp", "surface": "Hard Outdoor", "prize": "$1,495,665", "playerZoneLink": "https://playerzone.atptour.com/tournaments/doha", "deadlineDate": "2026-02-09", "startDate": "2026-02-16", "endDate": "2026-02-22", "weekNumber": 8},
        {"id": "buenos-aires-2026", "name": "Argentina Open", "city": "Buenos Aires", "country": "Argentine", "countryFlag": "🇦🇷", "category": "ATP 250", "circuit": "atp", "surface": "Clay", "prize": "$768,735", "playerZoneLink": "https://playerzone.atptour.com/tournaments/buenos-aires", "deadlineDate": "2026-02-09", "startDate": "2026-02-16", "endDate": "2026-02-22", "weekNumber": 8},
        # ATP - Semaine 9
        {"id": "acapulco-2026", "name": "Abierto Mexicano Telcel", "city": "Acapulco", "country": "Mexique", "countryFlag": "🇲🇽", "category": "ATP 500", "circuit": "atp", "surface": "Hard Outdoor", "prize": "$2,234,550", "playerZoneLink": "https://playerzone.atptour.com/tournaments/acapulco", "deadlineDate": "2026-02-16", "startDate": "2026-02-23", "endDate": "2026-03-01", "weekNumber": 9},
        {"id": "dubai-2026", "name": "Dubai Duty Free Championships", "city": "Dubai", "country": "Émirats", "countryFlag": "🇦🇪", "category": "ATP 500", "circuit": "atp", "surface": "Hard Outdoor", "prize": "$2,794,840", "playerZoneLink": "https://playerzone.atptour.com/tournaments/dubai", "deadlineDate": "2026-02-16", "startDate": "2026-02-23", "endDate": "2026-03-01", "weekNumber": 9},
        {"id": "santiago-2026", "name": "Chile Dove Men+Care Open", "city": "Santiago", "country": "Chili", "countryFlag": "🇨🇱", "category": "ATP 250", "circuit": "atp", "surface": "Clay", "prize": "$768,735", "playerZoneLink": "https://playerzone.atptour.com/tournaments/santiago", "deadlineDate": "2026-02-16", "startDate": "2026-02-23", "endDate": "2026-03-01", "weekNumber": 9},
        # WTA - Semaine 6
        {"id": "linz-wta-2026", "name": "Upper Austria Ladies Linz", "city": "Linz", "country": "Autriche", "countryFlag": "🇦🇹", "category": "WTA 250", "circuit": "wta", "surface": "Hard Indoor", "prize": "$267,082", "playerZoneLink": "https://www.wtatennis.com", "deadlineDate": "2026-01-26", "startDate": "2026-02-02", "endDate": "2026-02-08", "weekNumber": 6},
        # WTA - Semaine 7
        {"id": "doha-wta-2026", "name": "Qatar TotalEnergies Open", "city": "Doha", "country": "Qatar", "countryFlag": "🇶🇦", "category": "WTA 500", "circuit": "wta", "surface": "Hard Outdoor", "prize": "$780,637", "playerZoneLink": "https://www.wtatennis.com", "deadlineDate": "2026-02-02", "startDate": "2026-02-09", "endDate": "2026-02-15", "weekNumber": 7},
        # WTA - Semaine 8
        {"id": "dubai-wta-2026", "name": "Dubai Duty Free Tennis Championships", "city": "Dubai", "country": "Émirats", "countryFlag": "🇦🇪", "category": "WTA 1000", "circuit": "wta", "surface": "Hard Outdoor", "prize": "$3,211,715", "playerZoneLink": "https://www.wtatennis.com", "deadlineDate": "2026-02-09", "startDate": "2026-02-16", "endDate": "2026-02-22", "weekNumber": 8},
        # ITF - Semaine 6
        {"id": "antalya-itf-2026", "name": "Antalya ITF M25", "city": "Antalya", "country": "Turquie", "countryFlag": "🇹🇷", "category": "ITF M25", "circuit": "itf", "surface": "Clay", "prize": "$25,000", "playerZoneLink": "https://www.itftennis.com", "deadlineDate": "2026-01-26", "startDate": "2026-02-02", "endDate": "2026-02-08", "weekNumber": 6},
        # ITF - Semaine 7
        {"id": "sharm-itf-2026", "name": "Sharm El Sheikh ITF M15", "city": "Sharm El Sheikh", "country": "Egypte", "countryFlag": "🇪🇬", "category": "ITF M15", "circuit": "itf", "surface": "Hard Outdoor", "prize": "$15,000", "playerZoneLink": "https://www.itftennis.com", "deadlineDate": "2026-02-02", "startDate": "2026-02-09", "endDate": "2026-02-15", "weekNumber": 7},
        # ITF Wheelchair - Semaine 7
        {"id": "bolton-wheelchair-2026", "name": "Bolton Indoor ITF 1", "city": "Bolton", "country": "Royaume-Uni", "countryFlag": "🇬🇧", "category": "ITF Wheelchair 1", "circuit": "itf_wheelchair", "surface": "Hard Indoor", "prize": "$10,000", "playerZoneLink": "https://www.itftennis.com", "deadlineDate": "2026-02-02", "startDate": "2026-02-09", "endDate": "2026-02-15", "weekNumber": 7},
    ]
    await db.tournaments.insert_many(tournaments)
    print(f"✅ Seeded {len(tournaments)} tournaments (ATP: {sum(1 for t in tournaments if t['circuit']=='atp')}, WTA: {sum(1 for t in tournaments if t['circuit']=='wta')}, ITF: {sum(1 for t in tournaments if t['circuit']=='itf')}, ITF Wheelchair: {sum(1 for t in tournaments if t['circuit']=='itf_wheelchair')})")

    # ── EVENTS ──
    await db.events.delete_many({})
    events = [
        {"id": "evt-001", "type": "training_tennis", "title": "Entraînement Service", "date": "2026-02-03", "time": "09:00", "endTime": "11:00", "location": "Mouratoglou Academy, Nice", "observations": [{"id": "obs-001", "author": "Patrick Mouratoglou", "role": "Coach", "text": "Focus service slice. 45 min travail rebond haut. Amélioration visible.", "createdAt": "2026-02-03T11:15:00"}], "visibleToStaff": True, "assignedStaffIds": ["staff-001"]},
        {"id": "evt-002", "type": "training_tennis", "title": "Match entraînement", "date": "2026-02-05", "time": "10:00", "endTime": "12:00", "location": "Mouratoglou Academy, Nice", "observations": [], "visibleToStaff": True, "assignedStaffIds": ["staff-001"]},
        {"id": "evt-003", "type": "training_tennis", "title": "Séance retour de fond", "date": "2026-02-10", "time": "09:30", "endTime": "11:30", "location": "CNE Paris", "observations": [], "visibleToStaff": True, "assignedStaffIds": ["staff-001"]},
        {"id": "evt-010", "type": "training_physical", "title": "Renforcement musculaire", "date": "2026-02-04", "time": "07:00", "endTime": "08:30", "location": "Salle de sport, Nice", "observations": [{"id": "obs-010", "author": "Marc Dupont", "role": "Préparateur Physique", "text": "Séance complète. Augmentation charges 5%. RAS.", "createdAt": "2026-02-04T08:45:00"}], "visibleToStaff": True, "assignedStaffIds": ["staff-002"]},
        {"id": "evt-011", "type": "training_physical", "title": "Cardio + explosivité", "date": "2026-02-06", "time": "07:00", "endTime": "08:00", "location": "Salle de sport, Nice", "observations": [], "visibleToStaff": True, "assignedStaffIds": ["staff-002"]},
        {"id": "evt-020", "type": "medical_kine", "title": "Séance Kiné Épaule", "date": "2026-02-04", "time": "16:00", "endTime": "17:00", "location": "Cabinet Dr. Laurent, Paris", "observations": [{"id": "obs-020", "author": "Dr. Sophie Laurent", "role": "Kiné", "text": "Épaule droite OK pour entraînement. Pas de smash pendant 3j. Continuer exercices renfo.", "createdAt": "2026-02-04T17:10:00"}], "cost": 80, "visibleToStaff": True, "assignedStaffIds": ["staff-003"]},
        {"id": "evt-021", "type": "medical_kine", "title": "Récupération massage", "date": "2026-02-07", "time": "18:00", "endTime": "19:00", "location": "Cabinet Dr. Laurent, Paris", "observations": [], "cost": 90, "visibleToStaff": True, "assignedStaffIds": ["staff-003"]},
        {"id": "evt-030", "type": "media", "title": "Interview L'Équipe", "date": "2026-02-12", "time": "14:00", "endTime": "15:00", "location": "Siège L'Équipe, Paris", "observations": [], "visibleToStaff": True},
        {"id": "evt-040", "type": "sponsor", "title": "Shooting photo Nike", "date": "2026-02-14", "time": "10:00", "endTime": "13:00", "location": "Studio Paris 8e", "observations": [], "visibleToStaff": True},
        {"id": "evt-050", "type": "personal", "title": "RDV personnel", "date": "2026-02-08", "time": "09:30", "endTime": "11:00", "observations": [], "visibleToStaff": False},
        {"id": "evt-051", "type": "personal", "title": "Anniversaire famille", "date": "2026-02-15", "time": "19:00", "endTime": "23:00", "observations": [], "visibleToStaff": False},
        {"id": "evt-060", "type": "travel", "title": "Vol Nice → Rotterdam", "date": "2026-02-08", "time": "15:30", "endTime": "17:45", "location": "AF1234", "cost": 285, "observations": [], "visibleToStaff": True, "tournamentId": "rotterdam-2026"},
        {"id": "evt-061", "type": "travel", "title": "Vol Rotterdam → Nice", "date": "2026-02-16", "time": "18:00", "endTime": "20:15", "location": "AF5678", "cost": 310, "observations": [], "visibleToStaff": True, "tournamentId": "rotterdam-2026"},
        {"id": "evt-070", "type": "hotel", "title": "Hôtel Mainport Rotterdam", "date": "2026-02-08", "endDate": "2026-02-16", "location": "Leuvehaven 77, Rotterdam", "cost": 1890, "observations": [], "visibleToStaff": True, "tournamentId": "rotterdam-2026"},
        {"id": "evt-080", "type": "travel", "title": "Vol Paris → Acapulco", "date": "2026-02-22", "time": "11:00", "endTime": "18:00", "location": "AM456 via Mexico City", "cost": 1450, "observations": [], "visibleToStaff": True, "tournamentId": "acapulco-2026"},
    ]
    await db.events.insert_many(events)
    print(f"✅ Seeded {len(events)} events")

    # ── ALERTS (demo) ──
    await db.alerts.delete_many({})
    now = datetime.now(timezone.utc).isoformat()
    alerts = [
        {"id": "demo-alert-1", "type": "flight_missing", "priority": "high", "title": "Vol non réservé", "message": "Open Occitanie dans 5j", "tournamentId": "montpellier-2026", "tournamentName": "Open Occitanie", "tournamentCity": "Montpellier", "tournamentCountry": "France", "tournamentStartDate": "2026-02-02", "tournamentEndDate": "2026-02-08", "createdAt": now, "dueDate": "2026-02-02", "read": False, "dismissed": False},
        {"id": "demo-alert-2", "type": "hotel_missing", "priority": "high", "title": "Hôtel non réservé", "message": "Open Occitanie dans 5j", "tournamentId": "montpellier-2026", "tournamentName": "Open Occitanie", "tournamentCity": "Montpellier", "tournamentCountry": "France", "tournamentStartDate": "2026-02-02", "tournamentEndDate": "2026-02-08", "createdAt": now, "dueDate": "2026-02-02", "read": False, "dismissed": False},
        {"id": "demo-alert-3", "type": "hotel_missing", "priority": "medium", "title": "Hôtel non réservé", "message": "Acapulco dans 14j", "tournamentId": "acapulco-2026", "tournamentName": "Abierto Mexicano Telcel", "tournamentCity": "Acapulco", "tournamentCountry": "Mexique", "tournamentStartDate": "2026-02-23", "tournamentEndDate": "2026-03-01", "createdAt": now, "dueDate": "2026-02-23", "read": False, "dismissed": False},
        {"id": "demo-alert-4", "type": "observation_new", "priority": "low", "title": "Dr. Sophie Laurent", "message": "\"Épaule droite OK pour entraînement...\"", "eventId": "evt-020", "createdAt": now, "read": True, "dismissed": False, "fromUserName": "Dr. Sophie Laurent", "fromUserRole": "Kiné"},
        {"id": "demo-alert-5", "type": "slot_suggestion", "priority": "medium", "title": "Marc Dupont suggère un créneau", "message": "16:00-17:00 • \"Séance récup après le match\"", "createdAt": now, "read": False, "dismissed": False, "fromUserName": "Marc Dupont", "fromUserRole": "Préparateur Physique", "targetSlot": {"date": "2026-02-05", "time": "16:00", "endTime": "17:00"}},
    ]
    await db.alerts.insert_many(alerts)
    print(f"✅ Seeded {len(alerts)} alerts")

    # ── CLEAN registrations and hidden ──
    await db.tournament_registrations.delete_many({})
    await db.tournament_hidden.delete_many({})
    await db.user_preferences.delete_many({})
    print("✅ Cleared registrations, hidden, and preferences")

    # ── Create indexes ──
    await db.tournaments.create_index("circuit")
    await db.tournaments.create_index("weekNumber")
    await db.events.create_index("date")
    await db.alerts.create_index("type")
    await db.alerts.create_index([("read", 1), ("dismissed", 1)])
    print("✅ Created indexes")

    print("\n🎾 Seed complete!")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
