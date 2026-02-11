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
- **3rd Party:** Resend (planned), reportlab (PDF)

## Completed Features
- User onboarding (7 steps) with account creation
- Profile page with edit + logout
- Staff invitation system
- Tournament database (228 tournaments)
- OCR document processing + modular vault
- Calendar with event creation

## Phase 1 Tournament Optimizations (Feb 2026)
1. **Country flags** - Emoji flags (45+ countries) on tournament cards and detail modal
2. **Future tournaments only** - Past tournaments filtered out from the scroll list
3. **"Pas intéressé" option** - Hide/unhide tournaments via backend API + UI toggle
4. **Country flag utility** - `src/utils/countryFlags.ts` with mapping for all tournament countries

## Bug Fixes (Feb 2026)
- Account creation 422: Pydantic v2 classement coercion (int→str)
- Profile edit: api.ts missing default export
- Expo Go tunnel: Fixed EXPO_PACKAGER_PROXY_URL pointing to dead tunnel
- Step7 robustness: null safety, timeout, useNativeDriver web fix

## Key API Endpoints
- POST /api/users/onboarding, PUT /api/users/profile/{user_id}
- GET /api/tournaments/weeks?circuits=ATP
- POST /api/tournaments/hide, DELETE /api/tournaments/hide/{id}
- POST /api/tournaments/register

## Backlog
### Phase 2 (Tournament Optimizations)
- Statuts simplifiés (pending → registered/declined)
- Groupement par semaine amélioré

### Phase 3 (Tournament Optimizations)
- Détection de conflits avec le calendrier

### P1 General
- Document filtering by date in vault
- PDF export on frontend

### P2 General
- Send invitation emails via Resend
- Push notifications
- Tournament registration deadline reminders
