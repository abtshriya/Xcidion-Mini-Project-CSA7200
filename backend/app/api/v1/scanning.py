from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.core.security import get_current_user
from backend.app.models.entities import User, ApprovedSubnet, ScanJob
from backend.app.schemas.schemas import (
    ApprovedSubnetCreate, ApprovedSubnetResponse,
    ScanInitiateRequest, ScanJobResponse
)
from backend.app.services.scanner.network_scanner import NetworkScannerService

router = APIRouter(prefix="/scanning", tags=["scanning"])

@router.get("/approved-subnets", response_model=List[ApprovedSubnetResponse])
def get_approved_subnets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns list of authorized networks / subnets.
    """
    return NetworkScannerService.get_approved_subnets(db)

@router.post("/approved-subnets", response_model=ApprovedSubnetResponse)
def add_approved_subnet(
    payload: ApprovedSubnetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registers a new authorized subnet for scanning.
    Strictly restricted to administrators.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied. Only administrators can add approved scanning subnets."
        )

    # Check duplicate
    existing = db.query(ApprovedSubnet).filter(ApprovedSubnet.cidr == payload.cidr.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subnet CIDR already approved in scope.")

    sub = ApprovedSubnet(
        cidr=payload.cidr.strip(),
        label=payload.label.strip(),
        description=payload.description,
        is_active=True
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

@router.post("/start", response_model=ScanJobResponse)
async def start_authorized_scan(
    payload: ScanInitiateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Initiates an authorized scan on a verified target subnet.
    Strictly restricted to administrators.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied. Only administrators can initiate network scans."
        )

    job = await NetworkScannerService.execute_scan(
        db=db,
        target_subnet=payload.subnet,
        initiated_by=current_user.username
    )
    return job

@router.post("/scan-all", response_model=ScanJobResponse)
async def scan_all_network_systems(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Initiates an authorized live threat & exposure scan across ALL monitored systems.
    Accessible to both Administrators and Standard Users.
    """
    job = await NetworkScannerService.execute_scan(
        db=db,
        target_subnet="all",
        initiated_by=current_user.username
    )
    return job

@router.get("/jobs", response_model=List[ScanJobResponse])
def list_scan_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns history of executed network scan jobs.
    """
    return db.query(ScanJob).order_by(ScanJob.created_at.desc()).limit(20).all()

@router.get("/jobs/{job_id}", response_model=ScanJobResponse)
def get_scan_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns specific scan job details and terminal logs.
    """
    job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Scan job not found")
    return job
