"""
Routes pour l'analyse de documents (OCR)
Endpoint principal pour l'upload et l'analyse de factures/tickets
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import base64
import asyncio
from services.ocr_service import analyze_document, analyze_document_with_ai, suggest_category_from_text

router = APIRouter(prefix="/api")


# ============ MODELS ============

class AnalyzeDocumentRequest(BaseModel):
    image_base64: str
    filename: Optional[str] = None


class AnalyzeDocumentResponse(BaseModel):
    success: bool
    amount: Optional[float] = None
    date: Optional[str] = None
    category: Optional[str] = None
    merchant: Optional[str] = None
    confidence: Optional[float] = None
    description: Optional[str] = None
    needsReview: Optional[bool] = True
    error: Optional[str] = None


class InvoiceLineItem(BaseModel):
    description: str
    quantite: Optional[int] = 1
    prixUnitaire: Optional[float] = None
    montant: Optional[float] = None


class InvoiceData(BaseModel):
    montantTotal: Optional[float] = None
    montantHT: Optional[float] = None
    montantTVA: Optional[float] = None
    currency: str = "EUR"
    numeroFacture: Optional[str] = None
    dateFacture: Optional[str] = None
    fournisseur: Optional[str] = None
    adresse: Optional[str] = None
    categorie: str = "Autre"
    lignes: Optional[List[InvoiceLineItem]] = []
    confidence: float = 0.0
    needsReview: bool = True
    description: Optional[str] = None
    fileType: Optional[str] = None
    pageCount: Optional[int] = None
    warnings: Optional[List[str]] = None


class InvoiceUploadResponse(BaseModel):
    success: bool
    data: Optional[InvoiceData] = None
    error: Optional[str] = None


# ============ ENDPOINTS ============

@router.post("/documents/analyze", response_model=AnalyzeDocumentResponse)
async def analyze_document_endpoint(request: AnalyzeDocumentRequest):
    """
    Endpoint de compatibilité pour l'analyse d'images uniquement
    Utilise l'ancien format de réponse
    """
    try:
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
                description=data.get('description'),
                needsReview=data.get('needsReview', True)
            )
        else:
            # Fallback: suggérer catégorie depuis filename
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


@router.post("/invoices/upload", response_model=InvoiceUploadResponse)
async def upload_invoice(
    file: UploadFile = File(...),
):
    """
    Nouvel endpoint principal pour l'upload de factures/tickets
    Supporte images (JPG, PNG, WEBP) et PDF
    Retourne des données structurées complètes
    """
    try:
        # Valider le type de fichier
        allowed_types = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
            'application/pdf'
        ]
        
        content_type = file.content_type or ''
        filename = file.filename or 'document'
        
        # Détecter le type depuis l'extension si content_type manquant
        file_extension = filename.lower().split('.')[-1] if '.' in filename else ''
        
        if content_type not in allowed_types:
            # Essayer de déduire depuis l'extension
            ext_to_type = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'webp': 'image/webp',
                'pdf': 'application/pdf'
            }
            content_type = ext_to_type.get(file_extension, content_type)
        
        if content_type not in allowed_types:
            return InvoiceUploadResponse(
                success=False,
                error=f"Type de fichier non supporté: {content_type}. Utilisez JPG, PNG, WEBP ou PDF."
            )
        
        # Lire le contenu du fichier
        file_bytes = await file.read()
        
        if len(file_bytes) == 0:
            return InvoiceUploadResponse(
                success=False,
                error="Le fichier est vide"
            )
        
        # Limite de taille: 20MB
        max_size = 20 * 1024 * 1024
        if len(file_bytes) > max_size:
            return InvoiceUploadResponse(
                success=False,
                error=f"Le fichier est trop volumineux ({len(file_bytes) / 1024 / 1024:.1f}MB). Maximum: 20MB"
            )
        
        # Déterminer le type de fichier
        file_type = 'pdf' if content_type == 'application/pdf' or file_extension == 'pdf' else 'image'
        
        # Analyser le document
        result = await analyze_document(file_bytes, filename, file_type)
        
        if result.get('success'):
            data = result.get('data', {})
            
            # Construire les lignes de facture
            lignes = []
            for ligne in data.get('lignes', []):
                if isinstance(ligne, dict):
                    lignes.append(InvoiceLineItem(
                        description=ligne.get('description', ''),
                        quantite=ligne.get('quantite', 1),
                        prixUnitaire=ligne.get('prixUnitaire'),
                        montant=ligne.get('montant')
                    ))
            
            invoice_data = InvoiceData(
                montantTotal=data.get('montantTotal'),
                montantHT=data.get('montantHT'),
                montantTVA=data.get('montantTVA'),
                currency=data.get('currency', 'EUR'),
                numeroFacture=data.get('numeroFacture'),
                dateFacture=data.get('dateFacture'),
                fournisseur=data.get('fournisseur'),
                adresse=data.get('adresse'),
                categorie=data.get('categorie', 'Autre'),
                lignes=lignes,
                confidence=data.get('confidence', 0.5),
                needsReview=data.get('needsReview', True),
                description=data.get('description'),
                fileType=data.get('fileType'),
                pageCount=data.get('pageCount'),
                warnings=data.get('warnings')
            )
            
            return InvoiceUploadResponse(
                success=True,
                data=invoice_data
            )
        else:
            return InvoiceUploadResponse(
                success=False,
                error=result.get('error', 'Erreur inconnue lors de l\'analyse')
            )
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoices/analyze-base64", response_model=InvoiceUploadResponse)
async def analyze_invoice_base64(request: AnalyzeDocumentRequest):
    """
    Endpoint alternatif pour analyser un document en base64
    Utile pour le frontend mobile qui lit les fichiers en base64
    """
    try:
        # Décoder le base64
        try:
            file_bytes = base64.b64decode(request.image_base64)
        except Exception as e:
            return InvoiceUploadResponse(
                success=False,
                error=f"Erreur de décodage base64: {str(e)}"
            )
        
        # Détecter le type de fichier depuis le contenu
        is_pdf = file_bytes[:4] == b'%PDF'
        file_type = 'pdf' if is_pdf else 'image'
        
        # Analyser le document
        result = await analyze_document(file_bytes, request.filename or '', file_type)
        
        if result.get('success'):
            data = result.get('data', {})
            
            # Construire les lignes de facture
            lignes = []
            for ligne in data.get('lignes', []):
                if isinstance(ligne, dict):
                    lignes.append(InvoiceLineItem(
                        description=ligne.get('description', ''),
                        quantite=ligne.get('quantite', 1),
                        prixUnitaire=ligne.get('prixUnitaire'),
                        montant=ligne.get('montant')
                    ))
            
            invoice_data = InvoiceData(
                montantTotal=data.get('montantTotal'),
                montantHT=data.get('montantHT'),
                montantTVA=data.get('montantTVA'),
                currency=data.get('currency', 'EUR'),
                numeroFacture=data.get('numeroFacture'),
                dateFacture=data.get('dateFacture'),
                fournisseur=data.get('fournisseur'),
                adresse=data.get('adresse'),
                categorie=data.get('categorie', 'Autre'),
                lignes=lignes,
                confidence=data.get('confidence', 0.5),
                needsReview=data.get('needsReview', True),
                description=data.get('description'),
                fileType=data.get('fileType'),
                pageCount=data.get('pageCount'),
                warnings=data.get('warnings')
            )
            
            return InvoiceUploadResponse(
                success=True,
                data=invoice_data
            )
        else:
            return InvoiceUploadResponse(
                success=False,
                error=result.get('error', 'Erreur inconnue lors de l\'analyse')
            )
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/categories")
async def get_categories():
    """
    Retourne la liste des catégories disponibles
    """
    return {
        "categories": [
            {"id": "travel", "label": "Transport", "icon": "airplane"},
            {"id": "accommodation", "label": "Hébergement", "icon": "bed"},
            {"id": "restaurant", "label": "Restauration", "icon": "restaurant"},
            {"id": "medical", "label": "Médical", "icon": "medkit"},
            {"id": "equipment", "label": "Matériel", "icon": "tennisball"},
            {"id": "services", "label": "Services", "icon": "briefcase"},
            {"id": "other", "label": "Autre", "icon": "document"}
        ]
    }
