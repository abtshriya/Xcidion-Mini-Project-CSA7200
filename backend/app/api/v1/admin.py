import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import User, AuditLog
from backend.app.schemas.schemas import UserResponse, UserCreate, UserUpdate
from backend.app.core.security import (
    get_current_user, require_role, get_password_hash
)

router = APIRouter(prefix="/admin", tags=["Administration"])

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    return db.query(User).all()

@router.post("/users", response_model=UserResponse)
def create_new_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user = User(
        username=data.username,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=data.role,
        active=True
    )
    db.add(user)
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="user_created",
        resource_type="user",
        resource_id=data.username,
        outcome="success",
        metadata_json={"role": data.role}
    ))
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if data.email:
        user.email = data.email
    if data.role:
        user.role = data.role
    if data.active is not None:
        user.active = data.active
    if data.password:
        user.password_hash = get_password_hash(data.password)
        
    user.updated_at = datetime.datetime.now(datetime.timezone.utc)
    
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="user_modified",
        resource_type="user",
        resource_id=str(user.id),
        outcome="success"
    ))
    db.commit()
    db.refresh(user)
    return user
