# Le Court Central - PRD

## Original Problem Statement
Application professionnelle de tennis avec:
- Backend FastAPI modulaire + MongoDB
- Frontend React Native (Expo) avec TypeScript
- Système OCR pour documents, calendrier dynamique, gestion de profil
- Système d'invitation staff, base de données tournois (ATP, WTA, ITF)

## Architecture
- **Frontend:** React Native, Expo, Expo Router, TypeScript, Axios
- **Backend:** Python, FastAPI, Motor (async MongoDB), Pydantic v2
- **Database:** MongoDB (collections: users, documents, invitations, tournaments, tournament_registrations, tournament_hidden)
- **AI/ML:** OpenAI Vision API (gpt-4o) for OCR

## Completed Features
- User onboarding (7 steps) with account creation
- Profile page with edit + logout
- Staff invitation system
- Tournament database (228 tournaments: 60 ATP, 52 WTA, 116 ITF)
- OCR document processing + modular vault
- Calendar with event creation

## Phase 1 Tournament Optimizations (Feb 2026)
1. Country flags (45+ countries) on tournament cards and modal
2. Future tournaments only (past filtered out)
3. "Pas intéressé" hide/unhide with backend API

## Phase 2 Tournament Optimizations (Feb 2026)
1. **Filtres multi-critères** : Surface (Hard/Clay/Grass/Carpet), Niveau (Grand Chelem, Masters 1000, ATP 500, ATP 250, etc.), Prize Money (>5M, 1M-5M, 500K-1M, <500K), Pays (avec drapeaux)
2. **Badges de niveau** : Affichés en couleur sur les cartes (ATP 500 bleu, Masters 1000 rouge, Grand Chelem doré, etc.)
3. **Statuts simplifiés** : Depuis "En attente" (pending), seuls "Participant" et "Décliné" sont proposés
4. **Modal réactif** : selectedWeek dérivé via useMemo pour mise à jour en temps réel

## Key API Endpoints
- POST /api/users/onboarding, PUT /api/users/profile/{user_id}
- GET /api/tournaments/weeks?circuits=ATP (with category, surface, prizeMoney)
- POST /api/tournaments/hide, DELETE /api/tournaments/hide/{id}
- POST /api/tournaments/register (status: interested/pending/participating/declined)

## Backlog
### Phase 3 (Tournament Optimizations)
- Détection de conflits avec le calendrier

### P1 General
- Document filtering by date in vault
- PDF export on frontend

### P2 General
- Send invitation emails via Resend
- Push notifications
- Tournament registration deadline reminders
