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

### Résidence Fiscale - Phase 1 (Feb 12, 2026)
- Nouvel onglet "Résidence" dans la tab bar avec icône globe
- Dashboard des jours par pays avec barres de progression
- Alertes visuelles pour seuils fiscaux (75% warning, 100% critical)
- API Backend complète pour CRUD des jours de présence
- Calcul automatique des pourcentages de seuil (183 jours)

### Résidence Fiscale - Phase 2 (Feb 12, 2026) ✅ NEW
- **GPS Tracking automatique** :
  - Détection du pays actuel via expo-location
  - Bouton "Aujourd'hui" pour enregistrer la présence GPS en 1 clic
  - Prévention de double enregistrement le même jour
  - Status "confirmed" pour GPS vs "manual" pour saisie manuelle
- **Saisie facilitée** :
  - DatePicker natif pour sélection de dates
  - Indicateur de durée pour les séjours (bulk)
  - Suggestion GPS dans le modal d'ajout de jour
- **Paramètres GPS** :
  - Modal de configuration avec Switch on/off
  - Affichage du statut de permission
  - Message de confidentialité des données

### Bug Fix P1 - Modification des périodes (Feb 13, 2026) ✅ NEW
- **Backend** : Nouvel endpoint PUT /api/residence/days/{date}
  - Modification du pays, notes, statut d'un jour existant
  - Validation d'existence (404 si jour non trouvé)
  - Mise à jour automatique du timestamp updatedAt
- **Frontend** : Modal d'édition dans residence.tsx
  - Bouton édition (crayon) à côté de chaque jour
  - Sélecteur de pays avec drapeaux
  - Champ notes modifiable
  - Affichage de la date (non modifiable)
- **API** : updateDayPresence() dans api.ts

## Key API Endpoints
- POST /api/users/onboarding, PUT /api/users/profile/{user_id}
- GET /api/tournaments/weeks, /conflicts/{id}, /register, /hide
- GET /api/documents, POST /api/documents, PUT/DELETE /api/documents/{id}
- POST /api/invoices/analyze-base64 (OCR)
- GET /api/residence/countries, /stats, /days
- POST /api/residence/days, /days/bulk
- PUT /api/residence/days/{date} ✅ NEW
- DELETE /api/residence/days/{date}

## Backlog

### P0 - Next
- **Phase 3 - Résidence Fiscale**: Alertes push + génération de rapports PDF
- **Bug P0 - Sauvegarde dépenses**: Backend vérifié OK - peut être un problème de cache client Expo Go. Surveiller les rapports utilisateur.

### P1
- PDF export of documents
- Bug modal tournoi non réactif après changement de statut

### P2
- Invitation emails via Resend
- Push notifications
- Deadline reminders
- "Pas intéressé" - demander la raison
- UI de reprogrammation des conflits de calendrier

## Architecture
```
/app
├── frontend/          # React Native (Expo)
│   ├── app/(tabs)/
│   │   ├── index.tsx     # Calendrier/Tournois
│   │   ├── vault.tsx     # Documents
│   │   ├── residence.tsx # Résidence fiscale (GPS + manual)
│   │   └── profile.tsx
│   └── src/services/api.ts
├── backend/
│   ├── server.py
│   └── routes/
│       ├── residence_routes.py
│       ├── tournament_routes.py
│       ├── documents.py
│       └── user_routes.py
```

## Test Reports
- /app/test_reports/iteration_16.json - Phase 1 (20/20 tests)
- /app/test_reports/iteration_17.json - Phase 2 (23/23 tests)
