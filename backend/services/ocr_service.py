"""
OCR Service Ultra-Performant pour Factures et Notes de Frais
Utilise OpenAI Vision (GPT-4o) pour extraction haute précision
Taux de réussite cible: >95%
"""

import os
import json
import asyncio
import re
import base64
import tempfile
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dotenv import load_dotenv
from PIL import Image
import io

load_dotenv()

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Structure de données pour facture
class InvoiceData:
    def __init__(self):
        self.montant_total: Optional[float] = None
        self.montant_ht: Optional[float] = None
        self.montant_tva: Optional[float] = None
        self.currency: str = "EUR"
        self.numero_facture: Optional[str] = None
        self.date_facture: Optional[str] = None
        self.date_echeance: Optional[str] = None
        self.fournisseur_nom: Optional[str] = None
        self.fournisseur_adresse: Optional[str] = None
        self.categorie: str = "Autre"
        self.confidence: float = 0.0
        self.needs_review: bool = True
        self.lignes: List[Dict] = []


# Catégories disponibles
CATEGORIES = {
    'travel': {
        'label': 'Transport',
        'keywords': ['avion', 'billet', 'vol', 'flight', 'train', 'sncf', 'taxi', 'uber', 'vtc', 'parking', 'péage', 'essence', 'carburant']
    },
    'accommodation': {
        'label': 'Hébergement', 
        'keywords': ['hotel', 'hôtel', 'hilton', 'ibis', 'novotel', 'airbnb', 'booking', 'chambre', 'nuit', 'séjour']
    },
    'restaurant': {
        'label': 'Restauration',
        'keywords': ['restaurant', 'repas', 'déjeuner', 'dîner', 'café', 'bar', 'brasserie', 'pizzeria', 'menu', 'addition']
    },
    'medical': {
        'label': 'Médical',
        'keywords': ['pharmacie', 'médecin', 'kiné', 'ostéo', 'hôpital', 'clinique', 'dentiste', 'santé', 'ordonnance']
    },
    'equipment': {
        'label': 'Matériel',
        'keywords': ['raquette', 'cordage', 'chaussure', 'vêtement', 'équipement', 'sport', 'tennis', 'matériel']
    },
    'services': {
        'label': 'Services',
        'keywords': ['coaching', 'entraînement', 'cours', 'formation', 'consulting', 'service']
    },
    'other': {
        'label': 'Autre',
        'keywords': []
    }
}


def optimize_image_for_ocr(image_base64: str) -> str:
    """
    Optimise l'image pour une meilleure reconnaissance OCR
    - Redimensionne si trop grande
    - Améliore le contraste
    - Convertit en PNG
    """
    try:
        # Décoder l'image base64
        image_data = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(image_data))
        
        # Convertir en RGB si nécessaire
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Redimensionner si trop grande (max 2000px de large)
        max_width = 2000
        if img.width > max_width:
            ratio = max_width / img.width
            new_size = (max_width, int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Sauvegarder en PNG haute qualité
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', optimize=True)
        buffer.seek(0)
        
        return base64.b64encode(buffer.read()).decode('utf-8')
        
    except Exception as e:
        print(f"Image optimization error: {e}")
        return image_base64  # Retourner l'original en cas d'erreur


def detect_category_from_text(text: str) -> str:
    """Détecte la catégorie basée sur les mots-clés"""
    text_lower = text.lower()
    
    for cat_id, cat_info in CATEGORIES.items():
        for keyword in cat_info['keywords']:
            if keyword in text_lower:
                return cat_info['label']
    
    return 'Autre'


def validate_extracted_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validation et nettoyage des données extraites
    Applique les règles métier
    """
    warnings = []
    
    # 1. Validation montant total (CRITIQUE)
    if data.get('montantTotal') is not None:
        try:
            amount = float(data['montantTotal'])
            if amount <= 0:
                warnings.append("Montant négatif ou nul")
                data['needsReview'] = True
            elif amount < 0.5:
                warnings.append("Montant très faible (<0.50€)")
                data['needsReview'] = True
            elif amount > 50000:
                warnings.append("Montant très élevé (>50 000€)")
                data['needsReview'] = True
            data['montantTotal'] = round(amount, 2)
        except (ValueError, TypeError):
            data['montantTotal'] = None
            data['needsReview'] = True
    
    # 2. Validation et conversion de la date
    if data.get('dateFacture'):
        date_str = str(data['dateFacture'])
        # Convertir différents formats vers JJ/MM/AAAA
        date_patterns = [
            (r'(\d{4})-(\d{2})-(\d{2})', lambda m: f"{m.group(3)}/{m.group(2)}/{m.group(1)}"),
            (r'(\d{2})/(\d{2})/(\d{4})', lambda m: f"{m.group(1)}/{m.group(2)}/{m.group(3)}"),
            (r'(\d{2})-(\d{2})-(\d{4})', lambda m: f"{m.group(1)}/{m.group(2)}/{m.group(3)}"),
            (r'(\d{2})\.(\d{2})\.(\d{4})', lambda m: f"{m.group(1)}/{m.group(2)}/{m.group(3)}"),
        ]
        
        for pattern, converter in date_patterns:
            match = re.match(pattern, date_str)
            if match:
                data['dateFacture'] = converter(match)
                break
        
        # Vérifier si la date est valide
        try:
            parts = data['dateFacture'].split('/')
            if len(parts) == 3:
                day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                parsed_date = datetime(year, month, day)
                
                # Date dans le futur?
                if parsed_date > datetime.now():
                    warnings.append("Date dans le futur")
                    data['needsReview'] = True
                
                # Date trop ancienne (> 2 ans)?
                two_years_ago = datetime.now() - timedelta(days=730)
                if parsed_date < two_years_ago:
                    warnings.append("Date de plus de 2 ans")
        except:
            pass
    
    # 3. Cohérence HT + TVA = TTC
    if data.get('montantHT') and data.get('montantTVA') and data.get('montantTotal'):
        try:
            ht = float(data['montantHT'])
            tva = float(data['montantTVA'])
            total = float(data['montantTotal'])
            
            calculated = ht + tva
            diff = abs(calculated - total)
            
            if diff > 0.05:  # Tolérance de 5 centimes
                warnings.append(f"Incohérence: HT({ht}) + TVA({tva}) ≠ TTC({total})")
                data['needsReview'] = True
            
            # Vérifier taux TVA standard
            if ht > 0:
                taux = (tva / ht) * 100
                taux_standards = [5.5, 10, 20]
                if not any(abs(taux - t) < 1 for t in taux_standards):
                    warnings.append(f"Taux TVA inhabituel: {taux:.1f}%")
        except:
            pass
    
    # 4. Confiance faible
    if data.get('confidence', 0) < 0.7:
        data['needsReview'] = True
    
    if warnings:
        print(f"Validation warnings: {warnings}")
    
    return data


async def extract_invoice_data_with_ai(image_base64: str, filename: str = "") -> Dict[str, Any]:
    """
    Extraction haute précision via OpenAI Vision (GPT-4o)
    Prompt optimisé pour taux de réussite >95%
    """
    if not OPENAI_API_KEY:
        return {
            'success': False,
            'error': 'OpenAI API key not configured'
        }
    
    # Importer emergentintegrations
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    
    # Optimiser l'image
    optimized_base64 = optimize_image_for_ocr(image_base64)
    
    # Prompt système ultra-optimisé
    system_prompt = """Tu es un EXPERT en extraction de données de factures et notes de frais avec une précision de 99%.

🎯 MISSION CRITIQUE: Extraire TOUTES les informations financières avec PRÉCISION ABSOLUE.

📋 RÈGLES IMPÉRATIVES:

1. MONTANT TOTAL (TTC) = PRIORITÉ #1
   - Cherche: "TOTAL", "MONTANT", "NET À PAYER", "TTC", "TOTAL TTC", "À PAYER"
   - C'est généralement le PLUS GRAND montant en bas du document
   - Format: nombre décimal avec point (ex: 125.50 PAS 125,50)
   - VÉRIFIE 3 FOIS avant de répondre

2. DATE DE FACTURE
   - Cherche en haut du document ou près du numéro
   - Convertis TOUJOURS en format: JJ/MM/AAAA
   - Exemples: "15 janvier 2026" → "15/01/2026"

3. FOURNISSEUR
   - Nom de l'entreprise/commerce (en-tête ou tampon)
   - Ignore les mentions "client" ou "destinataire"

4. TVA & HT
   - Montant HT (Hors Taxes) si visible
   - Montant TVA si visible
   - Vérifie: HT + TVA ≈ TTC

5. CATÉGORIE
   - Hébergement: hôtel, airbnb
   - Transport: avion, train, taxi, uber, parking
   - Restauration: restaurant, café, repas
   - Médical: pharmacie, médecin, kiné
   - Matériel: équipement, sport
   - Services: coaching, formation
   - Autre: si aucune catégorie

6. CONFIANCE
   - 0.95+ : Données parfaitement lisibles
   - 0.80-0.94 : Quelques doutes mineurs
   - 0.60-0.79 : Révision recommandée
   - <0.60 : Données incertaines

⚠️ Si une information N'EST PAS visible, mets null (pas d'invention!)"""

    user_prompt = """ANALYSE cette facture/ticket et extrais les données en JSON STRICT.

RÉPONDS UNIQUEMENT avec ce JSON (sans texte avant/après):

{
  "montantTotal": <nombre décimal du TOTAL TTC - VÉRIFIE 3 FOIS>,
  "montantHT": <nombre décimal HT ou null>,
  "montantTVA": <nombre décimal TVA ou null>,
  "currency": "EUR",
  "numeroFacture": "<numéro facture ou null>",
  "dateFacture": "<JJ/MM/AAAA>",
  "fournisseur": "<nom du vendeur/fournisseur>",
  "adresse": "<adresse complète ou null>",
  "categorie": "<Hébergement|Transport|Restauration|Médical|Matériel|Services|Autre>",
  "confidence": <0.0 à 1.0>,
  "needsReview": <true si doutes, false si certain>,
  "description": "<description courte du document>"
}

🔴 ATTENTION: Le montantTotal est CRITIQUE. Vérifie-le 3 FOIS!"""

    try:
        # Initialiser le chat
        chat = LlmChat(
            api_key=OPENAI_API_KEY,
            session_id=f"ocr-invoice-{datetime.now().timestamp()}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4o")
        
        # Créer le contenu image
        image_content = ImageContent(image_base64=optimized_base64)
        
        # Envoyer le message
        user_message = UserMessage(
            text=user_prompt,
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parser la réponse JSON
        cleaned = response.strip()
        
        # Nettoyer les blocs markdown
        if '```json' in cleaned:
            cleaned = cleaned.split('```json')[1].split('```')[0]
        elif '```' in cleaned:
            cleaned = cleaned.split('```')[1].split('```')[0]
        
        cleaned = cleaned.strip()
        
        # Extraire le JSON
        json_match = re.search(r'\{[\s\S]*\}', cleaned)
        if json_match:
            cleaned = json_match.group(0)
        
        result = json.loads(cleaned)
        
        # Valider et nettoyer les données
        result = validate_extracted_data(result)
        
        # Détecter catégorie si non fournie
        if not result.get('categorie') or result.get('categorie') == 'Autre':
            text_to_analyze = f"{result.get('fournisseur', '')} {result.get('description', '')} {filename}"
            result['categorie'] = detect_category_from_text(text_to_analyze)
        
        return {
            'success': True,
            'data': result
        }
        
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        print(f"Raw response: {response if 'response' in dir() else 'N/A'}")
        
        # Tentative d'extraction de secours avec regex
        fallback = extract_fallback_data(response if 'response' in dir() else '', filename)
        return fallback
        
    except Exception as e:
        print(f"OCR Error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def extract_fallback_data(text: str, filename: str = "") -> Dict[str, Any]:
    """
    Extraction de secours avec regex si le JSON parsing échoue
    """
    result = {
        'success': False,
        'data': {
            'montantTotal': None,
            'dateFacture': None,
            'fournisseur': None,
            'categorie': 'Autre',
            'confidence': 0.3,
            'needsReview': True
        }
    }
    
    # Chercher montant
    amount_patterns = [
        r'montantTotal["\s:]+(\d+[.,]\d{2})',
        r'total["\s:]+(\d+[.,]\d{2})',
        r'(\d+[.,]\d{2})\s*€',
        r'€\s*(\d+[.,]\d{2})',
    ]
    
    for pattern in amount_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                amount = float(match.group(1).replace(',', '.'))
                result['data']['montantTotal'] = amount
                result['success'] = True
                break
            except:
                pass
    
    # Chercher date
    date_patterns = [
        r'(\d{2})/(\d{2})/(\d{4})',
        r'(\d{2})-(\d{2})-(\d{4})',
        r'(\d{4})-(\d{2})-(\d{2})',
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            groups = match.groups()
            if len(groups[0]) == 4:  # YYYY-MM-DD
                result['data']['dateFacture'] = f"{groups[2]}/{groups[1]}/{groups[0]}"
            else:  # DD/MM/YYYY
                result['data']['dateFacture'] = f"{groups[0]}/{groups[1]}/{groups[2]}"
            break
    
    # Catégorie depuis filename
    result['data']['categorie'] = detect_category_from_text(filename)
    
    return result


async def analyze_document(image_base64: str, filename: str = "") -> Dict[str, Any]:
    """
    Point d'entrée principal pour l'analyse de document
    Gère les retries et la validation
    """
    max_retries = 2
    last_error = None
    
    for attempt in range(max_retries + 1):
        try:
            result = await extract_invoice_data_with_ai(image_base64, filename)
            
            if result.get('success'):
                return result
            
            # Si échec mais pas d'exception, continuer
            if attempt < max_retries:
                await asyncio.sleep(1)  # Attendre avant retry
                
        except Exception as e:
            last_error = e
            print(f"Attempt {attempt + 1} failed: {e}")
            
            if attempt < max_retries:
                await asyncio.sleep(1)
    
    # Retourner le dernier résultat ou l'erreur
    return {
        'success': False,
        'error': str(last_error) if last_error else 'Extraction failed after retries',
        'data': {
            'montantTotal': None,
            'dateFacture': datetime.now().strftime('%d/%m/%Y'),
            'categorie': detect_category_from_text(filename),
            'confidence': 0.1,
            'needsReview': True
        }
    }
