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

### Documents - NEW REDESIGN
- Monthly view with slider (prev/next month)
- Monthly total with category breakdown (progress bars + percentages)
- Receipts grouped by day (Aujourd'hui, Hier, date)
- Category icons: Transport, Hébergement, Restauration, Médical, Équipement, Services, Autre
- FAB camera button for quick receipt scanning
- OCR integration (OpenAI Vision) with verification modal
- Upload: camera, gallery, PDF file picker
- Document detail modal with delete
- "Voir tout" toggle for category list

## Key API Endpoints
- POST /api/users/onboarding, PUT /api/users/profile/{user_id}
- GET /api/tournaments/weeks, /conflicts/{id}, /register, /hide
- GET /api/documents, POST /api/documents, PUT/DELETE /api/documents/{id}
- POST /api/invoices/analyze-base64 (OCR)

## Backlog
### P1
- PDF export of documents
### P2
- Invitation emails via Resend, push notifications, deadline reminders
