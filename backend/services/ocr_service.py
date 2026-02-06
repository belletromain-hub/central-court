import os
import json
import asyncio
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv()

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Category mapping for French receipts
CATEGORY_KEYWORDS = {
    'travel': ['avion', 'billet', 'vol', 'airport', 'aéroport', 'train', 'sncf', 'eurostar', 'taxi', 'uber', 'vtc', 'location voiture', 'hertz', 'avis', 'europcar'],
    'invoices': ['restaurant', 'repas', 'déjeuner', 'dîner', 'café', 'bar', 'brasserie', 'pizzeria', 'sushi', 'burger', 'mcdonalds', 'starbucks', 'supermarché', 'carrefour', 'leclerc', 'auchan'],
    'medical': ['pharmacie', 'médecin', 'docteur', 'kiné', 'kinésithérapeute', 'ostéopathe', 'hôpital', 'clinique', 'dentiste', 'opticien', 'lunettes', 'santé', 'mutuelle'],
    'other': []
}

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
            system_message="""Tu es un assistant spécialisé dans l'analyse de reçus, factures et tickets.
            
Ton rôle est d'extraire les informations suivantes de l'image:
1. Le montant total (en euros, nombre seulement)
2. La date du document (format JJ/MM/AAAA)
3. Le nom du marchand ou de l'entreprise
4. Une catégorie suggérée parmi: travel (voyages), invoices (factures/restaurants), medical (médical), other (autre)

Tu dois TOUJOURS répondre en JSON avec ce format exact:
{
    "amount": 123.45,
    "date": "15/02/2026",
    "merchant": "Nom du marchand",
    "category": "invoices",
    "confidence": 0.95,
    "description": "Brève description du document"
}

Si tu ne peux pas lire une information, utilise null pour cette valeur.
Le montant doit être un nombre décimal (pas de symbole €).
La confiance est un nombre entre 0 et 1 indiquant ta certitude."""
        ).with_model("openai", "gpt-4o")
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Send message with image
        user_message = UserMessage(
            text="Analyse ce document et extrait les informations demandées. Réponds uniquement en JSON.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        # Clean the response - remove markdown code blocks if present
        cleaned_response = response.strip()
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith('```'):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]
        cleaned_response = cleaned_response.strip()
        
        result = json.loads(cleaned_response)
        
        return {
            'success': True,
            'data': result
        }
        
    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f'Failed to parse AI response: {str(e)}',
            'raw_response': response if 'response' in dir() else None
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
