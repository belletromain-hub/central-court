import os
import json
import asyncio
import re
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv()

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Category mapping for French receipts
CATEGORY_KEYWORDS = {
    'travel': ['avion', 'billet', 'vol', 'airport', 'aéroport', 'train', 'sncf', 'eurostar', 'taxi', 'uber', 'vtc', 'location voiture', 'hertz', 'avis', 'europcar', 'hotel', 'hôtel', 'hilton', 'ibis', 'novotel', 'booking'],
    'invoices': ['restaurant', 'repas', 'déjeuner', 'dîner', 'café', 'bar', 'brasserie', 'pizzeria', 'sushi', 'burger', 'mcdonalds', 'starbucks', 'supermarché', 'carrefour', 'leclerc', 'auchan', 'monoprix'],
    'medical': ['pharmacie', 'médecin', 'docteur', 'kiné', 'kinésithérapeute', 'ostéopathe', 'hôpital', 'clinique', 'dentiste', 'opticien', 'lunettes', 'santé', 'mutuelle', 'ordonnance'],
    'other': []
}

def extract_amount_from_text(text: str) -> float | None:
    """Extract numeric amount from text using regex patterns"""
    if not text:
        return None
    
    # Common patterns for amounts in French/European format
    patterns = [
        r'total[:\s]*(\d+[.,]\d{2})\s*€?',  # Total: 123.45
        r'montant[:\s]*(\d+[.,]\d{2})\s*€?',  # Montant: 123.45
        r'(\d+[.,]\d{2})\s*€',  # 123.45 €
        r'€\s*(\d+[.,]\d{2})',  # € 123.45
        r'ttc[:\s]*(\d+[.,]\d{2})',  # TTC: 123.45
        r'(\d+[.,]\d{2})\s*eur',  # 123.45 EUR
    ]
    
    text_lower = text.lower()
    for pattern in patterns:
        match = re.search(pattern, text_lower, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(',', '.')
            try:
                return float(amount_str)
            except ValueError:
                continue
    
    return None

def extract_date_from_text(text: str) -> str | None:
    """Extract date from text using regex patterns"""
    if not text:
        return None
    
    # Common date patterns
    patterns = [
        r'(\d{2})/(\d{2})/(\d{4})',  # DD/MM/YYYY
        r'(\d{2})-(\d{2})-(\d{4})',  # DD-MM-YYYY
        r'(\d{2})\.(\d{2})\.(\d{4})',  # DD.MM.YYYY
        r'(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})',  # 15 janvier 2026
    ]
    
    months_fr = {
        'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
        'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
        'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
    }
    
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            groups = match.groups()
            if len(groups) == 3:
                if groups[1] in months_fr:
                    # French month format
                    day = groups[0].zfill(2)
                    month = months_fr[groups[1]]
                    year = groups[2]
                    return f"{day}/{month}/{year}"
                else:
                    # Numeric format
                    return f"{groups[0]}/{groups[1]}/{groups[2]}"
    
    return None


async def analyze_document_with_ai(image_base64: str) -> dict:
    """
    Analyze a document image using OpenAI Vision to extract:
    - Amount (montant)
    - Date
    - Category suggestion
    - Merchant name
    """
    if not OPENAI_API_KEY:
        return {
            'success': False,
            'error': 'OpenAI API key not configured'
        }
    
    try:
        # Initialize the chat with OpenAI Vision
        chat = LlmChat(
            api_key=OPENAI_API_KEY,
            session_id=f"ocr-{asyncio.get_event_loop().time()}",
            system_message="""Tu es un assistant expert en extraction de données depuis des reçus, factures et tickets de caisse.

MISSION CRITIQUE: Tu dois extraire avec précision:
1. Le MONTANT TOTAL à payer (le plus grand montant visible, généralement en bas du ticket)
2. La DATE du document (cherche des formats comme JJ/MM/AAAA ou "15 janvier 2026")
3. Le nom du MARCHAND ou de l'entreprise
4. Une CATÉGORIE parmi: travel (voyages, hôtels, transports), invoices (restaurants, commerces), medical (santé, pharmacie), other (autre)

RÈGLES IMPORTANTES pour le montant:
- Cherche "TOTAL", "MONTANT", "A PAYER", "TTC", "NET A PAYER"
- Le montant est TOUJOURS un nombre décimal (ex: 45.90, 123.50)
- Ignore les sous-totaux, TVA, remises - prends le TOTAL FINAL
- Si plusieurs montants, prends le plus élevé en bas du document

RÈGLES pour la date:
- Cherche en haut du document ou près du numéro de ticket
- Formats courants: JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA

Tu DOIS répondre UNIQUEMENT en JSON valide avec ce format:
{
    "amount": 45.90,
    "date": "15/02/2026",
    "merchant": "Nom exact du marchand",
    "category": "invoices",
    "confidence": 0.95,
    "raw_text": "Texte visible pertinent",
    "description": "Type de document détecté"
}

Si tu ne trouves pas une valeur, utilise null mais ESSAIE TOUJOURS de trouver le montant."""
        ).with_model("openai", "gpt-4o")
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Send message with image
        user_message = UserMessage(
            text="Analyse ce document et extrait les informations. TROUVE le montant total et la date. Réponds UNIQUEMENT en JSON.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        cleaned_response = response.strip()
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith('```'):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]
        cleaned_response = cleaned_response.strip()
        
        result = json.loads(cleaned_response)
        
        # Validate and clean the amount
        if result.get('amount') is not None:
            try:
                result['amount'] = float(result['amount'])
            except (ValueError, TypeError):
                # Try to extract from raw_text as fallback
                if result.get('raw_text'):
                    extracted = extract_amount_from_text(result['raw_text'])
                    result['amount'] = extracted
        
        # Validate date format
        if result.get('date') and not re.match(r'\d{2}/\d{2}/\d{4}', result['date']):
            # Try to extract from raw_text as fallback
            if result.get('raw_text'):
                extracted = extract_date_from_text(result['raw_text'])
                if extracted:
                    result['date'] = extracted
        
        return {
            'success': True,
            'data': result
        }
        
    except json.JSONDecodeError as e:
        # Try to extract values using regex from the raw response
        amount = extract_amount_from_text(response if 'response' in dir() else '')
        date = extract_date_from_text(response if 'response' in dir() else '')
        
        return {
            'success': False,
            'error': f'Failed to parse AI response: {str(e)}',
            'fallback_amount': amount,
            'fallback_date': date
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def suggest_category_from_text(text: str) -> str:
    """
    Suggest a category based on text content (fallback if AI fails)
    """
    text_lower = text.lower()
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return category
    
    return 'other'
