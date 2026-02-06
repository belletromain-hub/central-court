# Le Court Central - Tennis Application PRD

## Original Problem Statement
Construire une application professionnelle de tennis pour les joueurs professionnels et leur staff, avec des fonctionnalités de gestion de tournois, calendrier, préférences de voyage, et plus.

## User Personas
- **Joueurs professionnels ATP/WTA/ITF** : Gestion de leur carrière tennistique
- **Staff / Coaches** : Accompagnement des joueurs
- **Administrateurs** : Gestion de l'application via le dashboard admin

## Core Features

### Implemented Features

#### 1. Backend API (Flask + MongoDB)
- ✅ API REST avec routes modulaires
- ✅ Base de données MongoDB avec seed data
- ✅ Endpoints pour tournois, utilisateurs, alertes
- ✅ Intégration Resend pour emails (mode test)

#### 2. Frontend Mobile/Web (React Native + Expo)
- ✅ Application web responsive avec Expo Router
- ✅ Calendrier interactif des tournois
- ✅ Navigation par onglets (Calendrier, Documents, Profil)
- ✅ Gestion des notifications

#### 3. Admin Dashboard
- ✅ Interface complète à `/admin`
- ✅ Métriques utilisateurs et activité
- ✅ Gestion des utilisateurs
- ✅ Authentification admin (admin@lecourtcentral.com / admin123)

#### 4. Fluid Input Components (9/9)
- ✅ FluidDatePicker - Sélecteur de date avec raccourcis
- ✅ FluidTimePicker - Sélecteur d'heure fluide
- ✅ SmartTextInput - Input texte avec suggestions
- ✅ SmartLocationInput - Sélecteur de lieu intelligent
- ✅ SmartContactPicker - Sélecteur de contacts
- ✅ Stepper - Incrémenteur/décrémenteur
- ✅ CurrencyInput - Saisie de montants
- ✅ NotesInput - Zone de notes avec templates
- ✅ RecurrencePicker - Sélecteur de récurrence

#### 5. Onboarding Initial (7 étapes)
- ✅ Step 1: Prénom
- ✅ Step 2: Date de naissance
- ✅ Step 3: Circuit(s) (ATP/WTA/ITF)
- ✅ Step 4: Niveaux de tournois
- ✅ Step 5: Classement
- ✅ Step 6: Email
- ✅ Step 7: Mot de passe (avec critères de sécurité)

#### 6. Onboarding Progressif (3 modules)
- ✅ Module Voyage - Classe de vol et compagnies préférées
- ✅ Module Hôtel - Équipements essentiels
- ✅ Module Alimentation - Cuisines et restrictions alimentaires

## Technical Architecture

```
/app
├── backend/
│   ├── server.py           # Main Flask app
│   ├── routes/             # API route modules
│   │   ├── admin.py
│   │   ├── email_routes.py
│   │   ├── tournaments.py
│   │   └── users.py
│   ├── services/           # Business logic
│   └── seed.py             # Database seeder
└── frontend/
    ├── app/                # Expo Router pages
    │   ├── (tabs)/         # Main app tabs
    │   ├── admin/          # Admin dashboard
    │   ├── onboarding/     # 7-step onboarding
    │   └── preferences/    # Progressive modules
    └── src/
        ├── components/
        │   ├── admin/      # Admin components
        │   └── inputs/     # Fluid input components
        ├── utils/
        │   ├── onboardingStorage.ts
        │   └── progressiveOnboarding.ts
        └── context/        # React contexts
```

## API Endpoints

### Public
- `GET /api/tournaments/weeks?circuits=atp`
- `GET /api/tournaments/by-week`
- `POST /api/users/:userId/register/:tournamentId`
- `GET /api/users/:userId/alerts`

### Admin
- `POST /api/admin/login`
- `GET /api/admin/metrics`
- `GET /api/admin/users`
- `GET /api/admin/activity/recent`

## Database Schema

### tournaments
```json
{
  "id": "string",
  "name": "string",
  "city": "string",
  "country": "string",
  "circuit": "atp|wta|itf",
  "surface": "string",
  "category": "string",
  "prize": "string"
}
```

### users
```json
{
  "email": "string",
  "prenom": "string",
  "dateNaissance": "date",
  "circuits": ["string"],
  "classement": "number"
}
```

## Tech Stack
- **Frontend:** React Native, Expo SDK 54, Expo Router v5, TypeScript
- **Backend:** Python, Flask, Uvicorn
- **Database:** MongoDB
- **Email:** Resend API (test mode)
- **UI:** Custom Fluid components + LinearGradient

## Credentials
- **Admin Dashboard:** admin@lecourtcentral.com / admin123
- **Preview URL:** https://matchpoint-39.preview.emergentagent.com

## Priority Backlog

### P2 - In Progress Tasks
- Intégrer les Fluid Inputs dans les formulaires existants de l'app
- Connecter l'onboarding au backend pour sauvegarder les données utilisateur

### P3 - Upcoming Tasks
- Amélioration des core features (Calendar, Staff Management, Document Vault)
- Animations et haptic feedback
- Tests E2E complets
- Préparation pour publication app stores

### P4 - Future/Backlog
- Notifications push
- Synchronisation calendrier externe
- Mode hors ligne
- Multi-langue

## Notes
- Email Resend en mode test (emails limités à l'adresse vérifiée)
- Application optimisée pour web, adaptation mobile en cours
