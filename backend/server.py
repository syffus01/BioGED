from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import uuid
import hashlib
import jwt
import bcrypt
import json
import base64
from pathlib import Path
import shutil
import mimetypes
from bson import ObjectId
from fastapi.encoders import jsonable_encoder

# Custom JSON encoder for MongoDB ObjectId
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Custom jsonable_encoder to handle MongoDB ObjectId
def custom_jsonable_encoder(obj, **kwargs):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, list):
        return [custom_jsonable_encoder(item, **kwargs) for item in obj]
    if isinstance(obj, dict):
        return {k: custom_jsonable_encoder(v, **kwargs) for k, v in obj.items()}
    return jsonable_encoder(obj, **kwargs)

load_dotenv()

# Custom response class to handle MongoDB ObjectId serialization
class MongoJSONResponse(JSONResponse):
    def render(self, content):
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
            cls=CustomJSONEncoder,
        ).encode("utf-8")

app = FastAPI(title="PharmaVault EDMS", version="1.0.0", default_response_class=MongoJSONResponse)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
SECRET_KEY = "pharmavault-secret-key-2025"

# MongoDB setup
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "pharmavault_db")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# File storage
UPLOAD_DIR = Path("/tmp/pharmavault_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Pydantic models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str  # Admin, QualityManager, RegulatoryAffairs, ClinicalResearch, Manufacturing, User
    department: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    department: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    document_type: str  # CTD, eCTD, SOP, Protocol, ClinicalReport, Manufacturing, Regulatory
    category: str
    version: str = "1.0"
    status: str = "Draft"  # Draft, UnderReview, Approved, Rejected, Archived
    file_path: str
    file_name: str
    file_size: int
    mime_type: str
    uploaded_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    modified_at: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    approval_workflow: List[Dict[str, Any]] = Field(default_factory=list)
    signatures: List[Dict[str, Any]] = Field(default_factory=list)

class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    action: str
    resource_type: str
    resource_id: str
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.now)
    ip_address: Optional[str] = None

class WorkflowStep(BaseModel):
    step_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    step_name: str
    assignee_role: str
    assignee_id: Optional[str] = None
    status: str = "Pending"  # Pending, InProgress, Completed, Rejected
    completed_at: Optional[datetime] = None
    comments: Optional[str] = None

class ElectronicSignature(BaseModel):
    signer_id: str
    signer_name: str
    signer_role: str
    signature_hash: str
    signed_at: datetime = Field(default_factory=datetime.now)
    reason: str
    location: str = "Digital"

# Utility functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_data: dict) -> str:
    payload = {
        "user_id": user_data["id"],
        "email": user_data["email"],
        "role": user_data["role"],
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    user = await db.users.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def log_audit(user_id: str, user_name: str, action: str, resource_type: str, resource_id: str, details: dict = None):
    audit_log = AuditLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {}
    )
    await db.audit_logs.insert_one(audit_log.dict())

# Document type categories
DOCUMENT_CATEGORIES = {
    "CTD": ["Module 1", "Module 2", "Module 3", "Module 4", "Module 5"],
    "eCTD": ["Administrative", "Summaries", "Quality", "Nonclinical", "Clinical"],
    "SOP": ["Quality Control", "Manufacturing", "Regulatory", "Clinical", "General"],
    "Protocol": ["Clinical Trial", "Validation", "Cleaning", "Analytical"],
    "ClinicalReport": ["Study Report", "Safety Report", "Efficacy Report", "Statistical Report"],
    "Manufacturing": ["Batch Records", "Specifications", "Validation", "Change Control"],
    "Regulatory": ["Submissions", "Correspondence", "Approvals", "Inspections"]
}

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# Authentication
@app.post("/api/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        department=user_data.department
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    await log_audit(user.id, user.full_name, "USER_REGISTERED", "User", user.id)
    
    return {"message": "User registered successfully", "user_id": user.id}

@app.post("/api/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account deactivated")
    
    token = create_jwt_token(user)
    await log_audit(user["id"], user["full_name"], "USER_LOGIN", "User", user["id"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "department": user["department"]
        }
    }

# Document Management
@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    document_type: str = Form(...),
    category: str = Form(...),
    tags: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    # Validate file
    if file.size > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File too large")
    
    # Create file path
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix
    file_path = UPLOAD_DIR / f"{file_id}{file_extension}"
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create document record
    document = Document(
        title=title,
        description=description,
        document_type=document_type,
        category=category,
        file_path=str(file_path),
        file_name=file.filename,
        file_size=file.size,
        mime_type=file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream",
        uploaded_by=current_user["id"],
        tags=tags.split(",") if tags else [],
        metadata={
            "uploaded_by_name": current_user["full_name"],
            "uploaded_by_role": current_user["role"],
            "uploaded_by_department": current_user["department"]
        }
    )
    
    # Initialize approval workflow based on document type
    if document_type in ["CTD", "eCTD", "Regulatory"]:
        document.approval_workflow = [
            {"step_name": "Quality Review", "assignee_role": "QualityManager", "status": "Pending"},
            {"step_name": "Regulatory Review", "assignee_role": "RegulatoryAffairs", "status": "Pending"},
            {"step_name": "Final Approval", "assignee_role": "Admin", "status": "Pending"}
        ]
    elif document_type in ["SOP", "Protocol"]:
        document.approval_workflow = [
            {"step_name": "Technical Review", "assignee_role": "QualityManager", "status": "Pending"},
            {"step_name": "Management Approval", "assignee_role": "Admin", "status": "Pending"}
        ]
    
    await db.documents.insert_one(document.dict())
    await log_audit(current_user["id"], current_user["full_name"], "DOCUMENT_UPLOADED", "Document", document.id, {"title": title, "type": document_type})
    
    return {"message": "Document uploaded successfully", "document_id": document.id}

@app.get("/api/documents")
async def get_documents(
    skip: int = 0,
    limit: int = 50,
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    filter_query = {}
    if document_type:
        filter_query["document_type"] = document_type
    if status:
        filter_query["status"] = status
    
    documents = await db.documents.find(filter_query).skip(skip).limit(limit).to_list(length=limit)
    total = await db.documents.count_documents(filter_query)
    
    # Convert ObjectId to string
    for doc in documents:
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])
    
    return {
        "documents": documents,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@app.get("/api/documents/{document_id}")
async def get_document(document_id: str, current_user: dict = Depends(get_current_user)):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Convert ObjectId to string
    if '_id' in document:
        document['_id'] = str(document['_id'])
    
    await log_audit(current_user["id"], current_user["full_name"], "DOCUMENT_VIEWED", "Document", document_id)
    return document

@app.get("/api/documents/{document_id}/download")
async def download_document(document_id: str, current_user: dict = Depends(get_current_user)):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = Path(document["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    await log_audit(current_user["id"], current_user["full_name"], "DOCUMENT_DOWNLOADED", "Document", document_id)
    return FileResponse(file_path, filename=document["file_name"])

# Workflow Management
@app.post("/api/documents/{document_id}/approve")
async def approve_document_step(
    document_id: str,
    step_index: int,
    comments: str = "",
    current_user: dict = Depends(get_current_user)
):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    workflow = document["approval_workflow"]
    if step_index >= len(workflow):
        raise HTTPException(status_code=400, detail="Invalid workflow step")
    
    step = workflow[step_index]
    if step["assignee_role"] != current_user["role"] and current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized for this approval step")
    
    # Update workflow step
    workflow[step_index].update({
        "status": "Completed",
        "assignee_id": current_user["id"],
        "completed_at": datetime.now(),
        "comments": comments
    })
    
    # Check if all steps are completed
    all_completed = all(step["status"] == "Completed" for step in workflow)
    new_status = "Approved" if all_completed else "UnderReview"
    
    await db.documents.update_one(
        {"id": document_id},
        {"$set": {"approval_workflow": workflow, "status": new_status, "modified_at": datetime.now()}}
    )
    
    await log_audit(current_user["id"], current_user["full_name"], "DOCUMENT_APPROVED", "Document", document_id, {"step": step_index, "comments": comments})
    
    return {"message": f"Document {'approved' if all_completed else 'step approved'}", "status": new_status}

@app.post("/api/documents/{document_id}/reject")
async def reject_document(
    document_id: str,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.documents.update_one(
        {"id": document_id},
        {"$set": {"status": "Rejected", "modified_at": datetime.now()}}
    )
    
    await log_audit(current_user["id"], current_user["full_name"], "DOCUMENT_REJECTED", "Document", document_id, {"reason": reason})
    
    return {"message": "Document rejected", "reason": reason}

# Electronic Signatures
@app.post("/api/documents/{document_id}/sign")
async def sign_document(
    document_id: str,
    reason: str,
    password: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify user password
    user = await db.users.find_one({"id": current_user["id"]})
    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid password for signature")
    
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Create signature hash
    signature_data = f"{current_user['id']}{document_id}{reason}{datetime.now().isoformat()}"
    signature_hash = hashlib.sha256(signature_data.encode()).hexdigest()
    
    signature = ElectronicSignature(
        signer_id=current_user["id"],
        signer_name=current_user["full_name"],
        signer_role=current_user["role"],
        signature_hash=signature_hash,
        reason=reason
    )
    
    # Add signature to document
    signatures = document.get("signatures", [])
    signatures.append(signature.dict())
    
    await db.documents.update_one(
        {"id": document_id},
        {"$set": {"signatures": signatures, "modified_at": datetime.now()}}
    )
    
    await log_audit(current_user["id"], current_user["full_name"], "DOCUMENT_SIGNED", "Document", document_id, {"reason": reason})
    
    return {"message": "Document signed successfully", "signature_id": signature_hash}

# Audit Trail
@app.get("/api/audit")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    resource_id: Optional[str] = None,
    action: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["Admin", "QualityManager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    filter_query = {}
    if resource_id:
        filter_query["resource_id"] = resource_id
    if action:
        filter_query["action"] = action
    
    logs = await db.audit_logs.find(filter_query).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.audit_logs.count_documents(filter_query)
    
    return {
        "logs": logs,
        "total": total,
        "skip": skip,
        "limit": limit
    }

# Dashboard
@app.get("/api/dashboard")
async def get_dashboard_data(current_user: dict = Depends(get_current_user)):
    total_documents = await db.documents.count_documents({})
    pending_approvals = await db.documents.count_documents({"status": "UnderReview"})
    approved_documents = await db.documents.count_documents({"status": "Approved"})
    draft_documents = await db.documents.count_documents({"status": "Draft"})
    
    # Recent documents
    recent_docs = await db.documents.find().sort("created_at", -1).limit(10).to_list(length=10)
    
    # Convert ObjectId to string in recent_docs
    for doc in recent_docs:
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])
    
    # Document types distribution
    pipeline = [
        {"$group": {"_id": "$document_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    doc_types = await db.documents.aggregate(pipeline).to_list(length=None)
    
    # Convert ObjectId to string in doc_types
    for doc_type in doc_types:
        if '_id' in doc_type:
            doc_type['_id'] = str(doc_type['_id'])
    
    return {
        "stats": {
            "total_documents": total_documents,
            "pending_approvals": pending_approvals,
            "approved_documents": approved_documents,
            "draft_documents": draft_documents
        },
        "recent_documents": recent_docs,
        "document_types": doc_types
    }

# Search
@app.get("/api/search")
async def search_documents(
    q: str,
    document_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    filter_query = {
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}}
        ]
    }
    
    if document_type:
        filter_query["document_type"] = document_type
    
    documents = await db.documents.find(filter_query).limit(20).to_list(length=20)
    
    await log_audit(current_user["id"], current_user["full_name"], "SEARCH_PERFORMED", "Search", q, {"query": q, "type": document_type})
    
    return {"results": documents, "query": q}

# Configuration
@app.get("/api/config/document-types")
async def get_document_types():
    return {"document_types": DOCUMENT_CATEGORIES}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)