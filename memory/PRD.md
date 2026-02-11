# Le Court Central - PRD

## Original Problem Statement
Application professionnelle de tennis avec:
- Backend FastAPI modulaire + MongoDB
- Frontend React Native (Expo) avec TypeScript
- Calendrier dynamique, gestion de profil, OCR, invitations staff, tournois

## Architecture
- **Frontend:** React Native, Expo, Expo Router, TypeScript, Axios
- **Backend:** Python, FastAPI, Motor (async MongoDB), Pydantic v2
- **Database:** MongoDB

## Completed Features (Feb 2026)

### Core
- User onboarding (7 steps), profile edit, logout
- Staff invitation system, OCR document processing

### Phase 1 — Tournament Display
- Country flags (45+ countries), future-only filtering, "Pas intéressé" hide/unhide

### Phase 2 — Tournament Filters & Statuses
- Multi-filter: surface, level, prize money, country (with flags)
- Category badges (ATP 500, Masters 1000, Grand Chelem, etc.)
- Simplified statuses: pending → Participant/Décliné only
- Terminal states (participating/declined) → "Réinitialiser le statut"
- Current status indicator with colored icon
- Reactive modal via useMemo (selectedWeek derived from tournamentWeeks)

### Phase 3 — Conflict Detection
- Backend: GET /api/tournaments/conflicts/{id} detects overlapping calendar events + registered tournaments
- Frontend: Conflict modal with warning, list of conflicts, "Continuer quand même" / "Annuler"
- Bidirectional: dallas ↔ rotterdam correctly detected
- 1-day buffer before/after tournament dates
- Declined tournaments excluded from conflicts

## Key API Endpoints
- POST /api/users/onboarding, PUT /api/users/profile/{user_id}
- GET /api/tournaments/weeks?circuits=ATP
- GET /api/tournaments/conflicts/{tournament_id} ← NEW
- POST /api/tournaments/register, POST /api/tournaments/hide, DELETE /api/tournaments/hide/{id}

## Backlog
### P1
- Document filtering by date in vault
- PDF export on frontend

### P2
- Invitation emails via Resend
- Push notifications
- Tournament registration deadline reminders
