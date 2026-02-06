from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncio
from services.ocr_service import analyze_document_with_ai, suggest_category_from_text

router = APIRouter()

class AnalyzeDocumentRequest(BaseModel):
    image_base64: str
    filename: str | None = None

class AnalyzeDocumentResponse(BaseModel):
    success: bool
    amount: float | None = None
    date: str | None = None
    category: str | None = None
    merchant: str | None = None
    confidence: float | None = None
    description: str | None = None
    error: str | None = None

@router.post("/documents/analyze", response_model=AnalyzeDocumentResponse)
async def analyze_document(request: AnalyzeDocumentRequest):
    """
    Analyze a document image using AI (OpenAI Vision) to extract:
    - Amount
    - Date
    - Category
    - Merchant name
    """
    try:
        # Call the AI service
        result = await analyze_document_with_ai(request.image_base64)
        
        if result['success']:
            data = result['data']
            return AnalyzeDocumentResponse(
                success=True,
                amount=data.get('amount'),
                date=data.get('date'),
                category=data.get('category', 'other'),
                merchant=data.get('merchant'),
                confidence=data.get('confidence'),
                description=data.get('description')
            )
        else:
            # Fallback: try to suggest category from filename
            category = 'other'
            if request.filename:
                category = suggest_category_from_text(request.filename)
            
            return AnalyzeDocumentResponse(
                success=False,
                category=category,
                error=result.get('error', 'Unknown error')
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/categories")
async def get_categories():
    """
    Get available document categories
    """
    return {
        "categories": [
            {"id": "travel", "label": "Voyages", "icon": "airplane"},
            {"id": "invoices", "label": "Factures", "icon": "receipt"},
            {"id": "medical", "label": "Médical", "icon": "medkit"},
            {"id": "other", "label": "Autres", "icon": "document"}
        ]
    }
