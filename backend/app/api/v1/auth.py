import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import User, AuditLog
from backend.app.schemas.schemas import Token, UserResponse, UserLogin
from backend.app.core.security import (
    verify_password, get_password_hash, create_access_token, get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        # Audit failed login
        db.add(AuditLog(
            username=form_data.username,
            action="login_failed",
            resource_type="auth",
            outcome="denied",
            metadata_json={"reason": "invalid_credentials"}
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    user.last_login_at = datetime.datetime.now(datetime.timezone.utc)
    
    # Audit successful login
    db.add(AuditLog(
        user_id=user.id,
        username=user.username,
        action="login_success",
        resource_type="auth",
        outcome="success",
        metadata_json={"role": user.role}
    ))
    db.commit()

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="logout",
        resource_type="auth",
        outcome="success"
    ))
    db.commit()
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    old_pw = data.get("old_password")
    new_pw = data.get("new_password")
    if not old_pw or not new_pw:
        raise HTTPException(status_code=400, detail="Both old_password and new_password are required")
    if not verify_password(old_pw, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password does not match")
    if len(new_pw) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        
    current_user.password_hash = get_password_hash(new_pw)
    current_user.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="password_change",
        resource_type="user",
        resource_id=str(current_user.id),
        outcome="success"
    ))
    db.commit()
    return {"message": "Password changed successfully"}
