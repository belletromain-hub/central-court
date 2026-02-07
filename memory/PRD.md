# Le Court Central - Tennis Application PRD

## Original Problem Statement
Construire une application professionnelle de tennis pour les joueurs professionnels et leur staff, avec des fonctionnalités de gestion de tournois, calendrier, préférences de voyage, et plus.

## User Personas
- **Joueurs professionnels ATP/WTA/ITF** : Gestion de leur carrière tennistique
- **Staff / Coaches** : Accompagnement des joueurs
- **Administrateurs** : Gestion de l'application via le dashboard admin

## Core Features

### Implemented Features

#### 1. Backend API (FastAPI + MongoDB)
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

#### 5. Apple-Style Wheel Pickers
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

#### 8. Système OCR Ultra-Performant (NEW - Février 2026)
- ✅ Support images (JPG, PNG, WEBP) et PDF
- ✅ Conversion PDF → Image avec pdf2image
- ✅ Prétraitement d'image avancé avec Pillow
- ✅ Extraction via OpenAI Vision (GPT-4o)
- ✅ Données extraites:
  - Montant Total TTC (priorité absolue)
  - Montant HT et TVA
  - Date de facture (format JJ/MM/AAAA)
  - Fournisseur et adresse
  - N° de facture
  - Lignes de facture (description, quantité, prix unitaire, montant)
  - Catégorie auto-détectée (Transport, Hébergement, Restauration, Médical, Matériel, Services)
  - Score de confiance (0-1)
- ✅ Validation des données:
  - Vérification HT + TVA = TTC (tolérance 0.10€)
  - Détection montants hors plage (< 0.50€ ou > 50 000€)
  - Avertissement dates futures ou > 2 ans
- ✅ Retry logic pour appels OpenAI
- ✅ Frontend avec écran de vérification inline

## Technical Architecture

```
/app
├── backend/
│   ├── server.py           # Main FastAPI app
│   ├── routes/
│   │   ├── admin.py
│   │   ├── documents.py    # OCR endpoints
│   │   ├── email_routes.py
│   │   ├── tournaments.py
│   │   └── users.py
│   ├── services/
│   │   └── ocr_service.py  # OCR avec OpenAI Vision
│   └── tests/
│       └── test_ocr_endpoints.py
└── frontend/
    ├── app/                # Expo Router pages
    │   ├── (tabs)/
    │   │   ├── vault.tsx   # Documents tab avec OCR
    │   │   └── index.tsx
    │   ├── admin/
    │   ├── onboarding/
    │   └── preferences/
    └── src/
        ├── components/
        │   ├── admin/
        │   ├── documents/  # OCR components
        │   │   ├── EditableField.tsx
        │   │   ├── InvoiceVerification.tsx
        │   │   └── index.ts
        │   └── inputs/     # Apple wheel pickers
        ├── utils/
        └── context/
```

## API Endpoints - OCR System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/invoices/analyze-base64` | POST | Analyse OCR avec base64 (images & PDF) |
| `/api/invoices/upload` | POST | Upload multipart (FormData) |
| `/api/documents/analyze` | POST | Endpoint legacy (images uniquement) |
| `/api/documents/categories` | GET | Liste des catégories disponibles |

## Tech Stack (Février 2026)
- **Frontend:** React Native, Expo SDK 54, Expo Router v6.0.23, React 19.1.0, TypeScript
- **Backend:** Python, FastAPI, Uvicorn
- **Database:** MongoDB
- **OCR:** OpenAI Vision (GPT-4o) via emergentintegrations
- **PDF Processing:** pdf2image, Pillow
- **Email:** Resend API (test mode)

## Credentials
- **Admin Dashboard:** admin@lecourtcentral.com / admin123
- **Preview URL:** https://smart-receipt-26.preview.emergentagent.com

## Testing Results (Février 2026)
- ✅ Backend OCR: 13/13 tests passés (100%)
- ✅ Frontend Documents: Toutes fonctionnalités vérifiées
- ✅ OCR extrait montantTotal, dateFacture, fournisseur, categorie correctement
- ✅ OCR détecte les lignes de facture avec détails
- ✅ Validation HT + TVA = TTC fonctionne
- ✅ Upload modal affiche options photo/fichier avec info PDF
- ✅ Filtres par catégorie fonctionnent correctement

## Third-Party Integrations
- **Resend** - Email API for transactional emails (test mode)
- **OpenAI Vision (GPT-4o)** - Document OCR via emergentintegrations library

## Priority Backlog

### P2 - Upcoming Tasks
- Connecter l'onboarding au backend pour sauvegarder les données utilisateur
- Intégrer les Apple wheel pickers dans d'autres formulaires de l'app
- Édition inline des champs dans l'écran de vérification OCR

### P3 - Future Tasks
- Export des dépenses en PDF
- Notifications push
- Synchronisation calendrier externe

### P4 - Backlog
- Mode hors ligne
- Multi-langue
- Animations et haptic feedback sur les pickers
- Tests E2E complets sur Expo Go (iPhone/Android)
- Préparation pour publication app stores

## Notes
- Email Resend en mode test (emails limités à l'adresse vérifiée)
- Application optimisée pour web, compatible mobile via Expo Go
- Les wheel pickers utilisent un design inspiré d'iOS avec 3 options visibles
- L'OCR utilise l'API OpenAI Vision (GPT-4o) - pas mocké, vraie intégration
