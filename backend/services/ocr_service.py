"""
OCR Service Ultra-Performant pour Factures et Notes de Frais
Utilise OpenAI Vision (GPT-4o) pour extraction haute précision
Supporte images (JPG, PNG, WEBP) et PDF (conversion via pdf2image)
Taux de réussite cible: >95%
"""

import os
import json
import asyncio
import re
import base64
import tempfile
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from dotenv import load_dotenv
from PIL import Image, ImageEnhance, ImageFilter
import io

load_dotenv()

# Clé Emergent LLM pour OpenAI (Universal Key)
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-56a3f663d91F5Ae936')

# Catégories disponibles avec mots-clés
CATEGORIES = {
    'travel': {
        'label': 'Transport',
        'keywords': ['avion', 'billet', 'vol', 'flight', 'train', 'sncf', 'taxi', 'uber', 'vtc', 
                    'parking', 'péage', 'essence', 'carburant', 'lufthansa', 'air france', 'easyjet',
                    'ryanair', 'eurostar', 'thalys', 'blablacar']
    },
    'accommodation': {
        'label': 'Hébergement', 
        'keywords': ['hotel', 'hôtel', 'hilton', 'ibis', 'novotel', 'airbnb', 'booking', 
                    'chambre', 'nuit', 'séjour', 'marriott', 'accor', 'mercure', 'logement']
    },
    'restaurant': {
        'label': 'Restauration',
        'keywords': ['restaurant', 'repas', 'déjeuner', 'dîner', 'café', 'bar', 'brasserie', 
                    'pizzeria', 'menu', 'addition', 'mcdonalds', 'burger', 'sandwich', 'traiteur']
    },
    'medical': {
        'label': 'Médical',
        'keywords': ['pharmacie', 'médecin', 'kiné', 'ostéo', 'hôpital', 'clinique', 'dentiste', 
                    'santé', 'ordonnance', 'mutuelle', 'sécurité sociale', 'analyse', 'laboratoire']
    },
    'equipment': {
        'label': 'Matériel',
        'keywords': ['raquette', 'cordage', 'chaussure', 'vêtement', 'équipement', 'sport', 
                    'tennis', 'matériel', 'babolat', 'wilson', 'head', 'nike', 'adidas']
    },
    'services': {
        'label': 'Services',
        'keywords': ['coaching', 'entraînement', 'cours', 'formation', 'consulting', 'service',
                    'abonnement', 'licence', 'fédération', 'assurance']
    },
    'other': {
        'label': 'Autre',
        'keywords': []
    }
}


def convert_pdf_to_images(pdf_bytes: bytes, dpi: int = 200) -> List[Image.Image]:
    """
    Convertit un PDF en liste d'images PIL
    Utilise pdf2image (poppler)
    """
    try:
        from pdf2image import convert_from_bytes
        
        # Convertir toutes les pages (limité à 5 pour performance)
        images = convert_from_bytes(
            pdf_bytes, 
            dpi=dpi,
            first_page=1,
            last_page=5,  # Max 5 pages
            fmt='PNG'
        )
        
        return images
        
    except Exception as e:
        print(f"PDF conversion error: {e}")
        return []


def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """
    Prétraitement avancé de l'image pour améliorer la reconnaissance OCR
    - Redimensionnement intelligent
    - Amélioration du contraste
    - Conversion en niveaux de gris si nécessaire
    - Réduction du bruit
    """
    try:
        # Convertir en RGB si nécessaire
        if image.mode in ('RGBA', 'P', 'LA'):
            # Créer un fond blanc pour les images avec transparence
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'RGBA' or image.mode == 'LA':
                background.paste(image, mask=image.split()[-1])
                image = background
            else:
                image = image.convert('RGB')
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Redimensionner si trop grande ou trop petite
        min_dimension = 800
        max_dimension = 2500
        
        width, height = image.size
        
        # Agrandir si trop petite
        if max(width, height) < min_dimension:
            scale = min_dimension / max(width, height)
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Réduire si trop grande
        elif max(width, height) > max_dimension:
            scale = max_dimension / max(width, height)
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Améliorer le contraste
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.3)
        
        # Améliorer la netteté
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(1.5)
        
        return image
        
    except Exception as e:
        print(f"Image preprocessing error: {e}")
        return image


def image_to_base64(image: Image.Image, format: str = 'PNG', quality: int = 90) -> str:
    """
    Convertit une image PIL en base64
    """
    buffer = io.BytesIO()
    
    if format.upper() == 'JPEG':
        # JPEG ne supporte pas la transparence
        if image.mode in ('RGBA', 'P', 'LA'):
            image = image.convert('RGB')
        image.save(buffer, format='JPEG', quality=quality, optimize=True)
    else:
        image.save(buffer, format='PNG', optimize=True)
    
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def detect_category_from_text(text: str) -> str:
    """Détecte la catégorie basée sur les mots-clés"""
    text_lower = text.lower()
    
    # Compter les correspondances pour chaque catégorie
    scores = {}
    for cat_id, cat_info in CATEGORIES.items():
        score = 0
        for keyword in cat_info['keywords']:
            if keyword in text_lower:
                score += 1
        scores[cat_id] = score
    
    # Retourner la catégorie avec le meilleur score
    best_cat = max(scores, key=scores.get)
    if scores[best_cat] > 0:
        return CATEGORIES[best_cat]['label']
    
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
    
    # 2. Validation et normalisation de la date
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
    
    # 3. Validation HT + TVA
    if data.get('montantHT') is not None:
        try:
            data['montantHT'] = round(float(data['montantHT']), 2)
        except:
            data['montantHT'] = None
    
    if data.get('montantTVA') is not None:
        try:
            data['montantTVA'] = round(float(data['montantTVA']), 2)
        except:
            data['montantTVA'] = None
    
    # 4. Cohérence HT + TVA = TTC
    if data.get('montantHT') and data.get('montantTVA') and data.get('montantTotal'):
        try:
            ht = float(data['montantHT'])
            tva = float(data['montantTVA'])
            total = float(data['montantTotal'])
            
            calculated = ht + tva
            diff = abs(calculated - total)
            
            if diff > 0.10:  # Tolérance de 10 centimes
                warnings.append(f"Incohérence: HT({ht}) + TVA({tva}) ≠ TTC({total})")
                data['needsReview'] = True
            
            # Vérifier taux TVA standard (France)
            if ht > 0:
                taux = (tva / ht) * 100
                taux_standards = [5.5, 10, 20]
                if not any(abs(taux - t) < 1.5 for t in taux_standards):
                    warnings.append(f"Taux TVA inhabituel: {taux:.1f}%")
        except:
            pass
    
    # 5. Confiance faible
    if data.get('confidence', 0) < 0.7:
        data['needsReview'] = True
    
    # 6. Validation des lignes de facture
    if data.get('lignes'):
        validated_lignes = []
        for ligne in data['lignes']:
            if isinstance(ligne, dict):
                validated_ligne = {
                    'description': ligne.get('description', ''),
                    'quantite': ligne.get('quantite', 1),
                    'prixUnitaire': ligne.get('prixUnitaire'),
                    'montant': ligne.get('montant')
                }
                # Calculer montant si manquant
                if validated_ligne['prixUnitaire'] and not validated_ligne['montant']:
                    try:
                        validated_ligne['montant'] = round(
                            float(validated_ligne['prixUnitaire']) * float(validated_ligne['quantite']), 2
                        )
                    except:
                        pass
                validated_lignes.append(validated_ligne)
        data['lignes'] = validated_lignes
    
    if warnings:
        print(f"Validation warnings: {warnings}")
        data['warnings'] = warnings
    
    return data


async def extract_invoice_data_with_openai(image_base64: str, filename: str = "") -> Dict[str, Any]:
    """
    Extraction haute précision via OpenAI Vision (GPT-4o)
    Prompt ultra-optimisé pour taux de réussite >95%
    """
    if not OPENAI_API_KEY:
        return {
            'success': False,
            'error': 'OpenAI API key not configured'
        }
    
    # Import emergentintegrations
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    
    # Prompt système expert
    system_prompt = """Tu es un EXPERT COMPTABLE spécialisé dans l'extraction de données de factures, tickets de caisse et notes de frais.
Ta mission est d'extraire TOUTES les informations avec une PRÉCISION MAXIMALE (>95%).

📋 RÈGLES D'EXTRACTION STRICTES:

1. MONTANT TOTAL TTC (PRIORITÉ ABSOLUE)
   - C'est le montant final que le client doit payer
   - Cherche: "TOTAL", "TOTAL TTC", "NET À PAYER", "À PAYER", "MONTANT TOTAL", "SOMME"
   - Généralement en GRAS ou en plus GRANDE taille
   - Souvent situé en BAS du document
   - VÉRIFIE 3 FOIS ce montant avant de répondre

2. DATE DE FACTURE
   - Cherche près du mot "Date", "Le", ou en haut du document
   - Formats acceptés: JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA, "15 janvier 2024"
   - Retourne TOUJOURS au format: JJ/MM/AAAA

3. MONTANTS HT et TVA (si présents)
   - HT = Hors Taxes (avant TVA)
   - TVA = Taxe sur Valeur Ajoutée
   - Vérifie: HT + TVA ≈ TTC (à 0.10€ près)

4. FOURNISSEUR
   - Nom de l'entreprise/commerce émetteur
   - Généralement en HAUT ou dans l'en-tête
   - Peut être un logo ou un tampon

5. LIGNES DE FACTURE (détail des achats)
   - Description de chaque article/service
   - Quantité et prix unitaire si disponibles
   - Montant par ligne

6. CATÉGORIE
   Choisis parmi:
   - Transport: avion, train, taxi, uber, parking, essence
   - Hébergement: hôtel, airbnb, location
   - Restauration: restaurant, café, repas
   - Médical: pharmacie, médecin, kiné, hôpital
   - Matériel: équipement sportif, vêtements
   - Services: abonnements, formations, coaching
   - Autre: si aucune catégorie ne correspond

7. DEVISE
   - EUR par défaut
   - Cherche le symbole €, $ ou autres indicateurs

8. SCORE DE CONFIANCE
   - 0.95+ : Document parfaitement lisible, toutes infos claires
   - 0.80-0.94 : Bonne lisibilité, quelques doutes mineurs
   - 0.60-0.79 : Lisibilité moyenne, vérification recommandée
   - <0.60 : Mauvaise qualité, données incertaines

⚠️ RÈGLES CRITIQUES:
- Si une information N'EST PAS visible, retourne null (pas d'invention)
- Les montants sont TOUJOURS des nombres décimaux avec point (125.50 pas 125,50)
- Le montant total est CRITIQUE - vérifie-le 3 fois
- needsReview = true si confiance < 0.8 ou si des doutes existent"""

    user_prompt = """ANALYSE cette facture/ticket et extrais les données en JSON.

RÉPONDS UNIQUEMENT avec ce JSON (pas de texte avant ou après):

{
  "montantTotal": <NOMBRE TTC - vérifie 3 fois>,
  "montantHT": <NOMBRE ou null>,
  "montantTVA": <NOMBRE ou null>,
  "currency": "EUR",
  "numeroFacture": "<numéro ou null>",
  "dateFacture": "<JJ/MM/AAAA>",
  "fournisseur": "<nom du vendeur>",
  "adresse": "<adresse complète ou null>",
  "categorie": "<Transport|Hébergement|Restauration|Médical|Matériel|Services|Autre>",
  "lignes": [
    {
      "description": "<description article>",
      "quantite": <nombre>,
      "prixUnitaire": <nombre ou null>,
      "montant": <nombre>
    }
  ],
  "confidence": <0.0 à 1.0>,
  "needsReview": <true ou false>,
  "description": "<résumé court du document>"
}

🔴 CRITIQUE: Le montantTotal doit être exact. C'est la donnée la plus importante!"""

    try:
        # Initialiser le chat avec emergentintegrations
        chat = LlmChat(
            api_key=OPENAI_API_KEY,
            session_id=f"ocr-invoice-{datetime.now().timestamp()}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4o")
        
        # Créer le contenu image
        image_content = ImageContent(image_base64=image_base64)
        
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
        
        # Détecter catégorie automatiquement si non fournie ou "Autre"
        if not result.get('categorie') or result.get('categorie') == 'Autre':
            text_to_analyze = f"{result.get('fournisseur', '')} {result.get('description', '')} {filename}"
            detected = detect_category_from_text(text_to_analyze)
            if detected != 'Autre':
                result['categorie'] = detected
        
        return {
            'success': True,
            'data': result
        }
        
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        print(f"Raw response: {response if 'response' in dir() else 'N/A'}")
        
        # Tentative d'extraction de secours
        return extract_fallback_data(response if 'response' in dir() else '', filename)
        
    except Exception as e:
        print(f"OpenAI OCR Error: {e}")
        import traceback
        traceback.print_exc()
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
    
    if not text:
        return result
    
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
                if 0.5 <= amount <= 100000:
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


async def analyze_document(file_bytes: bytes, filename: str = "", file_type: str = "image") -> Dict[str, Any]:
    """
    Point d'entrée principal pour l'analyse de document
    Supporte images (JPG, PNG, WEBP) et PDF
    Gère les retries et la validation
    """
    max_retries = 2
    last_error = None
    images_to_process = []
    
    # Détecter le type de fichier
    is_pdf = file_bytes[:4] == b'%PDF' or file_type.lower() == 'pdf'
    
    if is_pdf:
        # Convertir PDF en images
        print(f"Processing PDF: {filename}")
        images = convert_pdf_to_images(file_bytes)
        
        if not images:
            return {
                'success': False,
                'error': 'Impossible de convertir le PDF en images. Vérifiez que le fichier n\'est pas corrompu.',
                'data': {
                    'montantTotal': None,
                    'dateFacture': datetime.now().strftime('%d/%m/%Y'),
                    'categorie': detect_category_from_text(filename),
                    'confidence': 0.1,
                    'needsReview': True
                }
            }
        
        # Prétraiter chaque page
        for img in images:
            processed = preprocess_image_for_ocr(img)
            images_to_process.append(processed)
    else:
        # Traiter comme image
        try:
            image = Image.open(io.BytesIO(file_bytes))
            processed = preprocess_image_for_ocr(image)
            images_to_process.append(processed)
        except Exception as e:
            return {
                'success': False,
                'error': f'Impossible d\'ouvrir l\'image: {str(e)}',
                'data': {
                    'montantTotal': None,
                    'dateFacture': datetime.now().strftime('%d/%m/%Y'),
                    'categorie': detect_category_from_text(filename),
                    'confidence': 0.1,
                    'needsReview': True
                }
            }
    
    # Analyser la première page (ou image unique)
    if images_to_process:
        primary_image = images_to_process[0]
        image_base64 = image_to_base64(primary_image)
        
        # Retry logic
        for attempt in range(max_retries + 1):
            try:
                result = await extract_invoice_data_with_openai(image_base64, filename)
                
                if result.get('success'):
                    # Ajouter info sur le nombre de pages si PDF
                    if is_pdf:
                        result['data']['pageCount'] = len(images_to_process)
                        result['data']['fileType'] = 'pdf'
                    else:
                        result['data']['fileType'] = 'image'
                    
                    return result
                
                # Si échec mais pas d'exception, continuer
                if attempt < max_retries:
                    await asyncio.sleep(1)
                    
            except Exception as e:
                last_error = e
                print(f"OCR Attempt {attempt + 1} failed: {e}")
                
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


# Fonctions de compatibilité avec l'ancien code
async def analyze_document_with_ai(image_base64: str) -> Dict[str, Any]:
    """
    Fonction de compatibilité pour l'ancien endpoint
    Convertit base64 en bytes et appelle analyze_document
    """
    try:
        file_bytes = base64.b64decode(image_base64)
        result = await analyze_document(file_bytes, filename="", file_type="image")
        
        # Adapter la réponse au format attendu par l'ancien endpoint
        if result.get('success'):
            data = result.get('data', {})
            return {
                'success': True,
                'data': {
                    'amount': data.get('montantTotal'),
                    'date': data.get('dateFacture'),
                    'category': map_category_to_old_format(data.get('categorie', 'Autre')),
                    'merchant': data.get('fournisseur'),
                    'confidence': data.get('confidence', 0.5),
                    'description': data.get('description'),
                    'needsReview': data.get('needsReview', True)
                }
            }
        else:
            return result
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def map_category_to_old_format(category: str) -> str:
    """Mappe les nouvelles catégories vers l'ancien format"""
    category_map = {
        'Transport': 'travel',
        'Hébergement': 'travel',
        'Restauration': 'invoices',
        'Médical': 'medical',
        'Matériel': 'other',
        'Services': 'invoices',
        'Autre': 'other'
    }
    return category_map.get(category, 'other')


def suggest_category_from_text(text: str) -> str:
    """
    Fonction de compatibilité pour suggérer une catégorie
    """
    category = detect_category_from_text(text)
    return map_category_to_old_format(category)
