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
- User onboarding (7 steps) with account creation in MongoDB
- Profile page with edit functionality (classement, email, residenceFiscale)
- Logout functionality
- Staff invitation system (create, accept, manage)
- Tournament database (228 tournaments: 60 ATP, 52 WTA, 116 ITF)
- Tournament display with prize money on week cards and detail modal
- Calendar with event creation and tournament marks
- OCR document processing
- Document management (vault) with modular components

## Bug Fixes Completed (Feb 2026)
1. **Account creation 422 error**: Root cause was Pydantic v2 rejecting `classement: 150` (number) instead of `"150"` (string). Fixed both frontend (String conversion) and backend (field_validator for coercion)
2. **Logout**: Added "Se deconnecter" button in profile.tsx
3. **Profile edit saving**: Fixed api.ts missing default export (axios instance)
4. **Prize money display**: Added to tournament week cards in index.tsx (format K/M)
5. **Null safety**: Added null check for userData in step7-password.tsx
6. **useNativeDriver**: Fixed for web compatibility in step7 success animation
7. **Error handling**: Added finally block with proper isCreating reset

## Key API Endpoints
- POST /api/users/onboarding - Create user (accepts int or str classement)
- PUT /api/users/profile/{user_id} - Update profile
- GET /api/users/profile/email/{email} - Get profile by email
- GET /api/tournaments?circuits=ATP - List tournaments
- GET /api/tournaments/weeks?circuits=ATP - Tournaments by week
- POST /api/tournaments/register - Register for tournament

## Backlog
### P1
- Document filtering by date in vault
- PDF export on frontend

### P2
- Send invitation emails via Resend
- Push notifications
- Tournament registration deadline reminders
