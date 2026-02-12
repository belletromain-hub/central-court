# Le Court Central - PRD

## Original Problem Statement
Application professionnelle de tennis: FastAPI + MongoDB + React Native (Expo)

## Completed Features (Feb 2026)

### Core
- User onboarding (7 steps), profile edit, logout, staff invitations, OCR

### Tournaments (Phase 1-3)
- Country flags, future-only filtering, "Pas intéressé" hide/unhide
- Multi-filter: surface, level, prize money, country
- Category badges (ATP 500, Masters 1000, Grand Chelem)
- Simplified statuses: pending → Participant/Décliné
- Conflict detection: GET /api/tournaments/conflicts/{id}

### Documents - REDESIGN
- Monthly view with slider (prev/next month)
- Monthly total with category breakdown (progress bars + percentages)
- Receipts grouped by day (Aujourd'hui, Hier, date)
- Category icons: Transport, Hébergement, Restauration, Médical, Équipement, Services, Autre
- FAB camera button for quick receipt scanning
- OCR integration with verification modal
- Upload: camera, gallery, PDF file picker
- Document detail modal with delete
- "Voir tout" toggle for category list

### Résidence Fiscale - Phase 1 (NEW - Feb 12, 2026)
- Nouvel onglet "Résidence" dans la tab bar avec icône globe
- Dashboard des jours par pays avec barres de progression
- Alertes visuelles pour seuils fiscaux (75% warning, 100% critical)
- API Backend complète:
  - GET /api/residence/countries (40 pays disponibles)
  - GET /api/residence/stats?year=YYYY (stats + warnings)
  - POST /api/residence/days (ajouter un jour)
  - POST /api/residence/days/bulk (ajouter un séjour, max 90 jours)
  - DELETE /api/residence/days/{date}
- Modal d'ajout de jour unique
- Modal d'ajout de séjour (plage de dates)
- Affichage des séries consécutives (longest streak)
- Calcul automatique des pourcentages de seuil (183 jours)

## Key API Endpoints
- POST /api/users/onboarding, PUT /api/users/profile/{user_id}
- GET /api/tournaments/weeks, /conflicts/{id}, /register, /hide
- GET /api/documents, POST /api/documents, PUT/DELETE /api/documents/{id}
- POST /api/invoices/analyze-base64 (OCR)
- GET /api/residence/countries, /stats, /days
- POST /api/residence/days, /days/bulk
- DELETE /api/residence/days/{date}

## Backlog

### P0 - In Progress
- **Phase 2 - Résidence Fiscale**: Saisie manuelle facilitée + tracking automatique GPS (avec consentement)
- **Phase 3 - Résidence Fiscale**: Alertes push + génération de rapports PDF

### P1
- PDF export of documents
- Bug modal tournoi non réactif après changement de statut

### P2
- Invitation emails via Resend
- Push notifications
- Deadline reminders
- "Pas intéressé" - demander la raison (conflit calendrier, surface, etc.)
- UI de reprogrammation des conflits de calendrier

## Architecture
```
/app
├── frontend/          # React Native (Expo)
│   ├── app/(tabs)/    # Écrans principaux
│   │   ├── index.tsx  # Calendrier/Tournois
│   │   ├── vault.tsx  # Documents
│   │   ├── residence.tsx  # Résidence fiscale (NEW)
│   │   └── profile.tsx
│   └── src/services/api.ts  # Appels API
├── backend/           # FastAPI + MongoDB
│   ├── server.py      # Entry point
│   └── routes/
│       ├── residence_routes.py (NEW)
│       ├── tournament_routes.py
│       ├── documents.py
│       └── user_routes.py
```
