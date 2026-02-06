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

#### 5. Apple-Style Wheel Pickers (NEW - Février 2026)
- ✅ WheelPicker - Composant wheel picker de base style Apple iOS
- ✅ AppleTimePicker - Sélecteur d'heure avec minutes toutes les 5 min
- ✅ AppleDatePicker - Sélecteur de date sans saisie manuelle
- ✅ AppleOptionPicker - Sélecteur d'options générique
- ✅ Intégration dans le modal d'ajout d'événement

#### 6. Onboarding Initial (7 étapes)
- ✅ Step 1: Prénom
- ✅ Step 2: Date de naissance
- ✅ Step 3: Circuit(s) (ATP/WTA/ITF)
- ✅ Step 4: Niveaux de tournois
- ✅ Step 5: Classement
- ✅ Step 6: Email
- ✅ Step 7: Mot de passe (avec critères de sécurité)

#### 7. Onboarding Progressif (3 modules)
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
        │   └── inputs/     # Fluid input + Apple wheel pickers
        ├── utils/
        │   ├── onboardingStorage.ts
        │   └── progressiveOnboarding.ts
        └── context/        # React contexts
```

## Tech Stack (Updated Février 2026)
- **Frontend:** React Native, Expo SDK 54, Expo Router v6.0.23, React 19.1.0, TypeScript
- **Backend:** Python, Flask, Uvicorn
- **Database:** MongoDB
- **Email:** Resend API (test mode)
- **UI:** Custom Fluid components + Apple Wheel Pickers + LinearGradient

## Credentials
- **Admin Dashboard:** admin@lecourtcentral.com / admin123
- **Preview URL:** https://matchpoint-39.preview.emergentagent.com

## Testing Results (Février 2026)
- ✅ Application loads correctly
- ✅ Calendar day selection works
- ✅ FAB button opens add event modal
- ✅ Apple-style wheel pickers functional
- ✅ Time picker shows 5-minute increments
- ✅ Date picker is wheel-based (no manual input)
- ✅ Documents tab - minimalist design with category filters
- ✅ Documents tab - total expenses updates correctly
- ✅ Documents tab - upload modal functional
- ✅ Onboarding welcome screen displays correctly
- ✅ Onboarding navigation to step1-prenom works

## Priority Backlog

### P2 - Upcoming Tasks
- Connecter l'onboarding au backend pour sauvegarder les données utilisateur
- Intégrer les Apple wheel pickers dans d'autres formulaires de l'app

### P3 - Future Tasks
- Amélioration des core features (Calendar, Staff Management, Document Vault)
- Animations et haptic feedback sur les pickers
- Tests E2E complets sur Expo Go (iPhone/Android)
- Préparation pour publication app stores

### P4 - Backlog
- Notifications push
- Synchronisation calendrier externe
- Mode hors ligne
- Multi-langue

## Notes
- Email Resend en mode test (emails limités à l'adresse vérifiée)
- Application optimisée pour web, compatible mobile via Expo Go
- Les wheel pickers utilisent un design inspiré d'iOS avec 3 options visibles
