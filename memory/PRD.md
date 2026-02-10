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
- ✅ AppleDatePickerFR - Sélecteur de date format français (JJ/MM/AAAA)
- ✅ Intégration dans le modal d'ajout d'événement
- ✅ **Intégration dans l'onboarding step 2 (date de naissance)**

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
- ✅ **Édition inline des champs OCR**:
  - Montant TTC éditable avec formatage automatique
  - Date avec auto-format JJ/MM/AAAA
  - Fournisseur modifiable
  - Sélecteur de catégorie (7 catégories)
  - Montants HT et TVA éditables
  - Indicateur visuel pour les champs à faible confiance

#### 9. Sauvegarde MongoDB des Documents (NEW - Février 2026)
- ✅ Collection `documents` avec schéma complet
- ✅ Stockage du fichier original en base64 (image/PDF)
- ✅ CRUD complet via API:
  - `POST /api/documents` - Créer un document
  - `GET /api/documents` - Lister avec filtres (catégorie, période)
  - `GET /api/documents/{id}` - Obtenir un document
  - `GET /api/documents/{id}/file` - Télécharger le fichier original
  - `PUT /api/documents/{id}` - Modifier un document
  - `DELETE /api/documents/{id}` - Supprimer un document
- ✅ Frontend connecté à MongoDB (plus de données statiques)

#### 10. Onboarding Backend (NEW - Février 2026)
- ✅ Endpoint `POST /api/users/onboarding` pour sauvegarder les données
- ✅ Schéma utilisateur complet:
  - Infos de base: prénom, dateNaissance, email
  - Tennis: circuits, niveaux, classement
  - Préférences voyage: classe vol, compagnies préférées
  - Préférences hôtel: équipements essentiels
  - Préférences alimentation: cuisines, restrictions, allergies
- ✅ Endpoints supplémentaires:
  - `GET /api/users/profile/{id}` - Profil par ID
  - `GET /api/users/profile/email/{email}` - Profil par email
  - `PUT /api/users/onboarding/{id}` - Mise à jour partielle
  - `POST /api/users/onboarding/complete/{id}` - Marquer terminé

#### 11. Export PDF des Dépenses (NEW - Février 2026)
- ✅ Endpoint `GET /api/documents/export/pdf`
- ✅ Filtres disponibles:
  - `period=month` - Mois en cours
  - `period=year` - Année en cours
  - `period=all` ou aucun - Toutes les dépenses
  - `startDate` et `endDate` - Période personnalisée
  - `category` - Filtrer par catégorie
- ✅ Contenu du PDF:
  - Résumé par catégorie avec totaux
  - Liste détaillée des dépenses
  - Total général
  - Date de génération

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
- **Preview URL:** https://serve-preview.preview.emergentagent.com

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

## Recent Updates (10 Février 2026)

### Session Actuelle - Optimisation Codebase & Profil

#### Refactoring Profil (NOUVEAU)
- ✅ **Page profil réécrite** - Code optimisé et simplifié (~500 lignes vs 900+)
- ✅ **Affichage circuits** - ATP, WTA, ITF avec badges colorés
- ✅ **Affichage niveaux tournois** - Grand Slam, 1000, 500, 250, etc.
- ✅ **Suppression sections non-fonctionnelles** - Aide & Support, Confidentialité, Notifications
- ✅ **Source unique de données** - MongoDB uniquement (plus de duplication AsyncStorage)

#### Nettoyage Codebase
- ✅ **Supprimé `staff_routes.py`** - Remplacé par `invitation_routes.py` plus complet
- ✅ **Supprimé `events.ts`** - Fichier obsolète (utilise `eventsV1.ts`)
- ✅ **Supprimé `tournaments.ts`** - Fichier obsolète (utilise `tournamentsV1.ts`)
- ✅ **Supprimé `locationService.ts`** - Non utilisé
- ✅ **Onboarding connecté au backend** - Les données sont maintenant sauvegardées dans MongoDB à la fin de l'onboarding

#### Import des Tournois
- ✅ **228 tournois importés** (ATP:60, WTA:52, ITF:116)
- ✅ **Filtrage par circuits utilisateur** depuis préférences onboarding
- ✅ **46/46 tests passés** (iteration_10)

### Bugs Corrigés
- ✅ **Route API `/api/documents/stats`** - Corrigé le conflit de route
- ✅ **Champ `residenceFiscale` manquant** - Ajouté dans onboarding
- ✅ **Bug datetime timezone** - Ajouté `make_aware()` pour les comparaisons
- ✅ **Bug `weekNumber` dans /register** - Corrigé en `week`

## Priority Backlog

### P1 - Tâches à venir
- ✅ **DONE** - Wheel picker Apple intégré dans la modification des documents
- ✅ **DONE** - Refactoring vault.tsx (1870 → 968 lignes = **-48%**)
- Export PDF côté frontend (bouton pour télécharger)

### P2 - Refactoring
- ✅ **DONE** - vault.tsx refactorisé (1870 → 968 lignes = **-48%**)
- ✅ **DONE** - AppContext.tsx simplifié (suppression données statiques obsolètes)
- ✅ **DONE** - Composants documents créés (DocumentCard, UploadModal, DocumentEditModal)

### P3 - Future Tasks
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

