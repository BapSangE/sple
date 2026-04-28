from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from google.oauth2 import id_token
from google.auth.transport import requests
import os
import jwt
from datetime import datetime, timedelta, timezone

from database import get_db, User

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
# 프론트엔드의 NEXTAUTH_SECRET과 동일하거나, 백엔드 전용 SECRET을 사용합니다.
JWT_SECRET = os.getenv("NEXTAUTH_SECRET", os.getenv("JWT_SECRET", "super-secret-key-change-me-later"))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

class GoogleLoginRequest(BaseModel):
    id_token: str

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/google")
async def google_login(request: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    token = request.id_token
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured on the server")
        
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        
        # Check if email is available
        if "email" not in idinfo:
            raise HTTPException(status_code=400, detail="Email not found in Google token")
            
        google_id = idinfo["sub"]
        email = idinfo["email"]
        name = idinfo.get("name", "")
        picture = idinfo.get("picture", "")
        
        # Check if user exists
        result = await db.execute(select(User).where(User.google_id == google_id))
        user = result.scalars().first()
        
        if not user:
            # Create new user
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                profile_image=picture,
                last_login=datetime.now(timezone.utc)
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # Update last login
            user.last_login = datetime.now(timezone.utc)
            await db.commit()
            
        # Create JWT access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "google_id": google_id}, 
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.profile_image
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
