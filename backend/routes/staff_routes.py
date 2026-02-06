from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/api/staff", tags=["staff"])

# DB reference (set from server.py)
db = None

def init_db(database):
    global db
    db = database


@router.get("")
async def list_staff():
    """List all staff members"""
    staff = await db.staff.find({}, {"_id": 0}).to_list(100)
    return staff


@router.get("/{staff_id}")
async def get_staff(staff_id: str):
    """Get a staff member by ID"""
    member = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Staff not found")
    return member
