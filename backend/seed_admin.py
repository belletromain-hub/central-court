"""Seed script for admin dashboard demo data."""
import asyncio
import random
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {"id": "user-001", "prenom": "Thomas", "nom": "Dubois", "email": "thomas.dubois@tennis.fr", "telephone": "+33 6 12 34 56 78", "dateNaissance": "1998-03-15", "circuits": ["ATP"], "niveauxTournois": ["ATP 250", "ATP 500"], "classement": 125, "status": "active"},
    {"id": "user-002", "prenom": "Sarah", "nom": "Martin", "email": "sarah.martin@tennis.fr", "telephone": "+33 6 23 45 67 89", "dateNaissance": "2000-07-22", "circuits": ["WTA"], "niveauxTournois": ["WTA 250", "WTA 500"], "classement": 87, "status": "active"},
    {"id": "user-003", "prenom": "Alex", "nom": "Chen", "email": "alex.chen@tennis.com", "telephone": "+1 555 234 5678", "dateNaissance": "2001-11-08", "circuits": ["ITF"], "niveauxTournois": ["ITF M25", "ITF M15"], "classement": 450, "status": "inactive"},
    {"id": "user-004", "prenom": "Emma", "nom": "Wilson", "email": "emma.wilson@tennis.co.uk", "telephone": "+44 7700 900000", "dateNaissance": "1999-01-30", "circuits": ["WTA", "ITF"], "niveauxTournois": ["WTA 250", "ITF W25"], "classement": 210, "status": "active"},
    {"id": "user-005", "prenom": "Lucas", "nom": "Fernández", "email": "lucas.fernandez@tennis.es", "telephone": "+34 612 345 678", "dateNaissance": "1997-05-12", "circuits": ["ATP"], "niveauxTournois": ["ATP 250", "ATP 500", "Masters 1000"], "classement": 45, "status": "active"},
    {"id": "user-006", "prenom": "Yuki", "nom": "Tanaka", "email": "yuki.tanaka@tennis.jp", "dateNaissance": "2002-09-18", "circuits": ["ATP", "ITF"], "niveauxTournois": ["ITF M25", "ATP 250"], "classement": 320, "status": "active"},
    {"id": "user-007", "prenom": "Marie", "nom": "Lefèvre", "email": "marie.lefevre@tennis.fr", "telephone": "+33 6 45 67 89 01", "dateNaissance": "2003-04-25", "circuits": ["ITF"], "niveauxTournois": ["ITF W15", "ITF W25"], "classement": 580, "status": "active"},
    {"id": "user-008", "prenom": "Nicolas", "nom": "Petit", "email": "nicolas.petit@tennis.fr", "dateNaissance": "1996-12-03", "circuits": ["ATP"], "niveauxTournois": ["ATP 250"], "classement": 190, "status": "suspended"},
    {"id": "user-009", "prenom": "Léa", "nom": "Bernard", "email": "lea.bernard@tennis.fr", "telephone": "+33 6 56 78 90 12", "dateNaissance": "2001-08-14", "circuits": ["WTA"], "niveauxTournois": ["WTA 250", "WTA 500", "WTA 1000"], "classement": 62, "status": "active"},
    {"id": "user-010", "prenom": "Julien", "nom": "Moreau", "email": "julien.moreau@wheelchair.fr", "telephone": "+33 6 67 89 01 23", "dateNaissance": "1995-06-20", "circuits": ["ITF Wheelchair"], "niveauxTournois": ["ITF Wheelchair 1", "ITF Wheelchair 2"], "classement": 15, "status": "active"},
]

DEMO_STAFF = [
    {"id": "sm-001", "userId": "user-001", "prenom": "Marc", "nom": "Leblanc", "email": "marc.leblanc@coach.fr", "telephone": "+33 6 11 22 33 44", "role": "coach", "status": "active"},
    {"id": "sm-002", "userId": "user-001", "prenom": "Sophie", "nom": "Durant", "email": "sophie.durant@manage.fr", "telephone": "+33 6 22 33 44 55", "role": "manager", "status": "active"},
    {"id": "sm-003", "userId": "user-001", "prenom": "Julie", "nom": "Martin", "email": "julie.martin@kine.fr", "telephone": "+33 6 33 44 55 66", "role": "physio", "status": "active"},
    {"id": "sm-004", "userId": "user-002", "prenom": "Pierre", "nom": "Roux", "email": "pierre.roux@coach.fr", "role": "coach", "status": "active"},
    {"id": "sm-005", "userId": "user-002", "prenom": "Claire", "nom": "Fontaine", "email": "claire.fontaine@nutri.fr", "role": "nutritionist", "status": "active"},
    {"id": "sm-006", "userId": "user-004", "prenom": "James", "nom": "Brown", "email": "james.brown@coach.uk", "role": "coach", "status": "active"},
    {"id": "sm-007", "userId": "user-005", "prenom": "Carlos", "nom": "Ruiz", "email": "carlos.ruiz@coach.es", "role": "coach", "status": "active"},
    {"id": "sm-008", "userId": "user-005", "prenom": "Ana", "nom": "García", "email": "ana.garcia@physio.es", "role": "physio", "status": "active"},
    {"id": "sm-009", "userId": "user-005", "prenom": "Miguel", "nom": "López", "email": "miguel.lopez@agent.es", "role": "manager", "status": "active"},
    {"id": "sm-010", "userId": "user-005", "prenom": "Elena", "nom": "Sánchez", "email": "elena.sanchez@nutri.es", "role": "nutritionist", "status": "active"},
    {"id": "sm-011", "userId": "user-009", "prenom": "Antoine", "nom": "Girard", "email": "antoine.girard@coach.fr", "role": "coach", "status": "active"},
    {"id": "sm-012", "userId": "user-009", "prenom": "Nathalie", "nom": "Blanc", "email": "nathalie.blanc@physio.fr", "role": "physio", "status": "active"},
    {"id": "sm-013", "userId": "user-010", "prenom": "David", "nom": "Chevalier", "email": "david.chevalier@coach.fr", "role": "coach", "status": "active"},
    {"id": "sm-014", "userId": "user-003", "prenom": "Wei", "nom": "Zhang", "email": "wei.zhang@coach.cn", "role": "coach", "status": "inactive"},
]

ACTIVITY_TYPES = ["login", "upload", "invite", "event_create", "event_update"]
ACTIVITY_DESCS = {
    "login": "s'est connecté(e)",
    "upload": "a uploadé des documents",
    "invite": "a invité un membre du staff",
    "event_create": "a créé un événement",
    "event_update": "a modifié un événement",
}


def gen_logins_by_day(avg_per_day: float, days: int = 30):
    today = datetime.now(timezone.utc).date()
    result = {}
    for i in range(days):
        d = (today - timedelta(days=i)).isoformat()
        result[d] = max(0, int(random.gauss(avg_per_day, avg_per_day * 0.5)))
    return result


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.central_court

    # ── Admin user ──
    await db.admin_users.delete_many({})
    await db.admin_users.insert_one({
        "id": "admin-001",
        "email": "admin@lecourtcentral.com",
        "name": "Admin",
        "passwordHash": pwd_context.hash("admin123"),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })
    print("\u2705 Admin user: admin@lecourtcentral.com / admin123")

    # ── App Users ──
    await db.app_users.delete_many({})
    now = datetime.now(timezone.utc)
    cities = [
        ("Paris", "France", 48.8566, 2.3522),
        ("Nice", "France", 43.7102, 7.2620),
        ("London", "UK", 51.5074, -0.1278),
        ("Madrid", "Spain", 40.4168, -3.7038),
        ("Tokyo", "Japan", 35.6762, 139.6503),
        ("Miami", "USA", 25.7617, -80.1918),
    ]

    login_profiles = [4.8, 3.2, 0.4, 2.1, 6.5, 1.8, 0.8, 0.1, 5.2, 3.5]
    event_totals = [87, 65, 12, 45, 120, 28, 8, 5, 95, 42]

    for i, u in enumerate(DEMO_USERS):
        login_avg = login_profiles[i]
        logins_by_day = gen_logins_by_day(login_avg)
        total_logins = sum(logins_by_day.values())
        days_since_login = random.choice([0, 0, 1, 2, 5, 10, 25, 45, 0, 1])
        if i == 2: days_since_login = 35
        if i == 7: days_since_login = 60

        city = cities[i % len(cities)]
        staff_ids = [s["id"] for s in DEMO_STAFF if s["userId"] == u["id"]]
        evt_total = event_totals[i]

        user_doc = {
            **u,
            "activation": {
                "hasCompletedOnboarding": i not in [2, 6],
                "onboardingCompletionDate": (now - timedelta(days=random.randint(10, 90))).isoformat() if i not in [2, 6] else None,
                "hasInvitedMembers": len(staff_ids) > 0,
                "invitedMembersCount": len(staff_ids),
                "hasUploadedDocuments": i not in [2, 7],
                "hasCreatedEvent": i not in [7],
            },
            "preferences": {
                "voyage": {"travelClass": random.choice(["economy", "business", "first"]), "airlines": random.sample(["Air France", "KLM", "Emirates", "British Airways", "Iberia"], 2)} if i % 2 == 0 else None,
                "hotel": {"amenities": random.sample(["WiFi", "Gym", "Pool", "Spa", "Restaurant"], 3)} if i % 3 != 2 else None,
                "food": {"cuisines": random.sample(["Française", "Japonaise", "Italienne", "Méditerranéenne"], 2), "restrictions": []} if i < 7 else None,
            },
            "activity": {
                "lastLoginAt": (now - timedelta(days=days_since_login, hours=random.randint(0, 12))).isoformat(),
                "loginCount": total_logins,
                "loginsByDay": logins_by_day,
                "averageLoginsPerWeek": round(total_logins / 4.3, 1),
            },
            "geolocation": {
                "enabled": i not in [2, 7],
                "lastKnownLocation": {
                    "lat": city[2], "lng": city[3],
                    "city": city[0], "country": city[1],
                    "timestamp": (now - timedelta(hours=random.randint(1, 48))).isoformat(),
                } if i not in [2, 7] else None,
            },
            "events": {
                "total": evt_total,
                "accepted": int(evt_total * random.uniform(0.7, 0.95)),
                "declined": int(evt_total * random.uniform(0.02, 0.1)),
                "rescheduled": int(evt_total * random.uniform(0.01, 0.08)),
                "withNotes": int(evt_total * random.uniform(0.3, 0.6)),
            },
            "documents": {
                "vaultItemsCount": random.randint(0, 35),
                "invoicesCount": random.randint(0, 20),
                "totalStorageUsed": round(random.uniform(5, 500), 1),
            },
            "staffMembers": staff_ids,
            "createdAt": (now - timedelta(days=random.randint(30, 180))).isoformat(),
            "updatedAt": now.isoformat(),
        }
        await db.app_users.insert_one(user_doc)
    print(f"\u2705 Seeded {len(DEMO_USERS)} app users")

    # ── Staff Members ──
    await db.staff_members.delete_many({})
    for s in DEMO_STAFF:
        login_avg = random.uniform(0.5, 4.0)
        logins = gen_logins_by_day(login_avg, 30)
        staff_doc = {
            **s,
            "activity": {
                "lastLoginAt": (now - timedelta(days=random.randint(0, 20), hours=random.randint(0, 12))).isoformat(),
                "loginCount": sum(logins.values()),
                "loginsByDay": logins,
            },
            "events": {
                "created": random.randint(2, 25),
                "modified": random.randint(1, 15),
                "deleted": random.randint(0, 3),
            },
            "documentsAccess": {
                "canView": True,
                "canEdit": s["role"] in ["coach", "manager"],
                "canUpload": s["role"] in ["coach", "manager", "physio"],
            },
            "createdAt": (now - timedelta(days=random.randint(20, 150))).isoformat(),
            "invitedAt": (now - timedelta(days=random.randint(20, 150))).isoformat(),
            "acceptedAt": (now - timedelta(days=random.randint(15, 145))).isoformat() if s["status"] == "active" else None,
        }
        await db.staff_members.insert_one(staff_doc)
    print(f"\u2705 Seeded {len(DEMO_STAFF)} staff members")

    # ── Activity Logs ──
    await db.activity_logs.delete_many({})
    logs = []
    for i in range(30):
        user = random.choice(DEMO_USERS)
        atype = random.choice(ACTIVITY_TYPES)
        logs.append({
            "type": atype,
            "userId": user["id"],
            "userName": f"{user['prenom']} {user['nom']}",
            "description": f"{user['prenom']} {user['nom']} {ACTIVITY_DESCS[atype]}",
            "timestamp": (now - timedelta(minutes=random.randint(1, 2880))).isoformat(),
        })
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    await db.activity_logs.insert_many(logs)
    print(f"\u2705 Seeded {len(logs)} activity logs")

    # ── Indexes ──
    await db.app_users.create_index("email", unique=True)
    await db.app_users.create_index("status")
    await db.app_users.create_index("circuits")
    await db.staff_members.create_index("userId")
    await db.activity_logs.create_index([("timestamp", -1)])
    print("\u2705 Created indexes")

    print("\n\U0001f3be Admin seed complete!")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
