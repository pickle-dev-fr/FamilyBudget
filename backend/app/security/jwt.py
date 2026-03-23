import os
from datetime import datetime, timedelta
from jose import jwt,JWTError, ExpiredSignatureError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.user_service import UserService
from sqlmodel import Session

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

security = HTTPBearer()

def create_access_token(user_id: str, session: Session) -> str:
    expire = datetime.utcnow() + timedelta(hours=EXPIRE_HOURS)
    user = UserService.get_by_id(session, user_id)
    payload = {
        "sub": user_id,
        "exp": expire,
        "username": user.username
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def validate_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        
        return payload

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
        
def decode(token: str):
    try: 
        return jwt.decode(
                token,
                SECRET_KEY,
                algorithms=[ALGORITHM],
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )