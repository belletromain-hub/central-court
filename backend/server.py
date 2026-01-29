from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import uuid
import httpx
import secrets

load_dotenv()

app = FastAPI(title="Central Court API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.central_court

# ============ MODELS ============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "player"  # player, agent, medical, technical, logistics
    player_id: Optional[str] = None  # For staff: which player they belong to
    created_at: datetime

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str
    player_id: Optional[str] = None

class Invitation(BaseModel):
    invitation_id: str
    code: str
    player_id: str
    player_name: str
    role: str  # agent, medical, technical, logistics
    created_at: datetime
    expires_at: datetime
    used_count: int = 0

class CreateInvitationRequest(BaseModel):
    role: str

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class ExchangeSessionRequest(BaseModel):
    session_id: str

class RegisterWithInvitationRequest(BaseModel):
    session_id: str
    invitation_code: str

# ============ AUTH HELPERS ============

async def get_session_from_emergent(session_id: str) -> Optional[SessionDataResponse]:
    """Exchange session_id for user data from Emergent Auth"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if response.status_code == 200:
                data = response.json()
                return SessionDataResponse(**data)
    except Exception as e:
        print(f"Error exchanging session: {e}")
    return None

async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from session token (cookie or header)"""
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    # Find session
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        return None
    
    # Check expiry (handle timezone-naive datetimes)
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at <= datetime.now(timezone.utc):
        return None
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    """Require authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_player(request: Request) -> User:
    """Require player role"""
    user = await require_auth(request)
    if user.role != "player":
        raise HTTPException(status_code=403, detail="Player role required")
    return user

# ============ AUTH ENDPOINTS ============

@app.post("/api/auth/exchange-session")
async def exchange_session(req: ExchangeSessionRequest, response: Response):
    """Exchange session_id for session_token and create/get user"""
    session_data = await get_session_from_emergent(req.session_id)
    
    if not session_data:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": session_data.email},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new player user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": session_data.email,
            "name": session_data.name,
            "picture": session_data.picture,
            "role": "player",
            "player_id": None,
            "created_at": datetime.now(timezone.utc)
        })
    
    # Create session
    session_token = f"session_{secrets.token_urlsafe(32)}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    # Get user data
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "session_token": session_token,
        "user": UserResponse(**user)
    }

@app.post("/api/auth/register-with-invitation")
async def register_with_invitation(req: RegisterWithInvitationRequest, response: Response):
    """Register a staff member using an invitation link"""
    # Validate invitation
    invitation = await db.invitations.find_one(
        {"code": req.invitation_code},
        {"_id": 0}
    )
    
    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid invitation code")
    
    # Check expiry
    expires_at = invitation["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation expired")
    
    # Exchange session
    session_data = await get_session_from_emergent(req.session_id)
    if not session_data:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check if user already exists
    existing_user = await db.users.find_one(
        {"email": session_data.email},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update role if joining a player's team
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "role": invitation["role"],
                "player_id": invitation["player_id"]
            }}
        )
    else:
        # Create new staff user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": session_data.email,
            "name": session_data.name,
            "picture": session_data.picture,
            "role": invitation["role"],
            "player_id": invitation["player_id"],
            "created_at": datetime.now(timezone.utc)
        })
    
    # Increment usage count
    await db.invitations.update_one(
        {"code": req.invitation_code},
        {"$inc": {"used_count": 1}}
    )
    
    # Create session
    session_token = f"session_{secrets.token_urlsafe(32)}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    # Get user data
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "session_token": session_token,
        "user": UserResponse(**user),
        "player_name": invitation["player_name"]
    }

@app.get("/api/auth/me")
async def get_me(user: User = Depends(require_auth)):
    """Get current user info"""
    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        role=user.role,
        player_id=user.player_id
    )

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    """Logout current user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"success": True}

# ============ INVITATION ENDPOINTS ============

@app.post("/api/invitations")
async def create_invitation(req: CreateInvitationRequest, user: User = Depends(require_player)):
    """Create an invitation link for staff members"""
    if req.role not in ["agent", "medical", "technical", "logistics"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    code = secrets.token_urlsafe(16)
    invitation_id = f"inv_{uuid.uuid4().hex[:12]}"
    
    invitation = {
        "invitation_id": invitation_id,
        "code": code,
        "player_id": user.user_id,
        "player_name": user.name,
        "role": req.role,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "used_count": 0
    }
    
    await db.invitations.insert_one(invitation)
    
    return {
        "invitation_id": invitation_id,
        "code": code,
        "role": req.role,
        "expires_at": invitation["expires_at"].isoformat()
    }

@app.get("/api/invitations")
async def get_my_invitations(user: User = Depends(require_player)):
    """Get all invitations created by the player"""
    invitations = await db.invitations.find(
        {"player_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return invitations

@app.delete("/api/invitations/{invitation_id}")
async def delete_invitation(invitation_id: str, user: User = Depends(require_player)):
    """Delete an invitation"""
    result = await db.invitations.delete_one({
        "invitation_id": invitation_id,
        "player_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    return {"success": True}

@app.get("/api/invitations/validate/{code}")
async def validate_invitation(code: str):
    """Validate an invitation code (public endpoint)"""
    invitation = await db.invitations.find_one(
        {"code": code},
        {"_id": 0}
    )
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    expires_at = invitation["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation expired")
    
    role_labels = {
        "agent": "Agent",
        "medical": "Staff Médical",
        "technical": "Staff Technique",
        "logistics": "Logistique"
    }
    
    return {
        "valid": True,
        "player_name": invitation["player_name"],
        "role": invitation["role"],
        "role_label": role_labels.get(invitation["role"], invitation["role"])
    }

# ============ TEAM ENDPOINTS ============

@app.get("/api/team")
async def get_my_team(user: User = Depends(require_player)):
    """Get all staff members for the player"""
    team = await db.users.find(
        {"player_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    return [UserResponse(**member) for member in team]

@app.delete("/api/team/{user_id}")
async def remove_team_member(user_id: str, user: User = Depends(require_player)):
    """Remove a team member"""
    result = await db.users.update_one(
        {"user_id": user_id, "player_id": user.user_id},
        {"$set": {"player_id": None, "role": "player"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    return {"success": True}

# ============ AI QUICK REPLIES ============

class QuickReplyContext(BaseModel):
    channelType: str
    lastMessages: List[str]
    senderRole: str

class QuickReply(BaseModel):
    id: str
    text: str
    tone: str

@app.post("/api/ai/quick-replies")
async def generate_quick_replies(context: QuickReplyContext):
    """Generate AI-powered quick reply suggestions using OpenAI via Emergent LLM Key"""
    try:
        emergent_key = os.getenv("EMERGENT_LLM_KEY", "")
        
        if not emergent_key:
            # Return fallback replies if no key
            return {"replies": get_fallback_replies(context)}
        
        # Build prompt for OpenAI
        last_msg = context.lastMessages[-1] if context.lastMessages else ""
        
        prompt = f"""Tu es un assistant pour un joueur de tennis professionnel. 
Génère 3 réponses courtes et appropriées pour ce message de son {context.senderRole} ({context.channelType}):

Message reçu: "{last_msg}"

Réponds en français avec 3 suggestions de réponses différentes:
1. Une réponse courte et directe
2. Une réponse amicale et chaleureuse
3. Une réponse professionnelle et formelle

Format de réponse JSON:
[{{"id": "1", "text": "...", "tone": "brief"}}, {{"id": "2", "text": "...", "tone": "friendly"}}, {{"id": "3", "text": "...", "tone": "formal"}}]"""

        # Call OpenAI via Emergent integration
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {emergent_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 300,
                    "temperature": 0.7
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # Parse JSON from response
                import json
                try:
                    # Extract JSON array from response
                    start = content.find('[')
                    end = content.rfind(']') + 1
                    if start >= 0 and end > start:
                        replies = json.loads(content[start:end])
                        return {"replies": replies}
                except:
                    pass
        
        # Fallback if AI fails
        return {"replies": get_fallback_replies(context)}
        
    except Exception as e:
        print(f"AI reply error: {e}")
        return {"replies": get_fallback_replies(context)}

def get_fallback_replies(context: QuickReplyContext) -> List[dict]:
    """Fallback replies when AI is unavailable"""
    last_msg = context.lastMessages[-1].lower() if context.lastMessages else ""
    
    if 'confirmé' in last_msg or 'rdv' in last_msg:
        return [
            {"id": "1", "text": "Parfait, merci !", "tone": "brief"},
            {"id": "2", "text": "Super, j'y serai ! 👍", "tone": "friendly"},
            {"id": "3", "text": "Bien reçu, je confirme ma présence.", "tone": "formal"}
        ]
    
    if '?' in last_msg:
        return [
            {"id": "1", "text": "Je vérifie et te dis.", "tone": "brief"},
            {"id": "2", "text": "Bonne question ! Je regarde ça.", "tone": "friendly"},
            {"id": "3", "text": "Je vous reviens rapidement.", "tone": "formal"}
        ]
    
    return [
        {"id": "1", "text": "Merci !", "tone": "brief"},
        {"id": "2", "text": "Parfait, merci pour l'info ! 😊", "tone": "friendly"},
        {"id": "3", "text": "Bien noté, merci.", "tone": "formal"}
    ]

# ============ HEALTH CHECK ============

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "central-court-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
