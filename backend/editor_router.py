from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal
import os
import shutil
from datetime import datetime
from dotenv import load_dotenv
import zipfile
import uuid

load_dotenv()

from chunking import process_chunks, categorize_files

from qdrant_setup import (
    client,
    collection_name,
    rag_pipeline_setup,
    remove_data_from_store,
    session_exists,
)

from qdrant_client import models

router = APIRouter()

DATA_FOLDER = "../data-source/"


# --- Request/Response Schemas ---
class Chunk(BaseModel):
    chunk_id: str
    chunk_hash: str
    previous_hash: Optional[str] = None
    filename: str
    filetype: str
    page_number: int
    page_content: str
    status: Literal["unchanged", "modified", "new", "deleted"] = "new"
    lastEdited: Optional[str] = None
    originalHash: Optional[str] = None


class ChunkUpdateRequest(BaseModel):
    session_id: str
    documents: List[Chunk]


class SessionMeta(BaseModel):
    id: str
    createdAt: str
    name: Optional[str] = None
    archiveName: Optional[str] = None
    archiveSize: Optional[int] = None


# --- Session Routes (for frontend integration) ---

@router.get("/sessions", response_model=List[SessionMeta])
def list_sessions():
    """List all sessions (meta only)."""
    results, _ = client.scroll(
        collection_name=collection_name,
        limit=10_000,
        with_payload=True,
    )

    # Collect unique sessions
    sessions: Dict[str, SessionMeta] = {}
    for point in results:
        payload = point.payload or {}
        sid = payload.get("group_id")
        if sid and sid not in sessions:
            sessions[sid] = SessionMeta(
                id=sid,
                createdAt=payload.get("createdAt", datetime.utcnow().isoformat()),
                name=payload.get("name"),
                archiveName=payload.get("archiveName"),
                archiveSize=payload.get("archiveSize"),
            )
    return list(sessions.values())

@router.post("/sessions", response_model=SessionMeta)
async def create_session(
    archive: UploadFile = File(...),
    name: Optional[str] = Form(None),
):
    """Create a new session by uploading a ZIP archive (preferred)."""

    # Generate session_id (UUID ensures uniqueness, fallback to filename stem if needed)
    session_id = str(uuid.uuid4())
    createdAt = datetime.utcnow().isoformat()

    # Make session-specific temp dir
    session_dir = os.path.join(DATA_FOLDER, session_id)
    os.makedirs(session_dir, exist_ok=True)

    archive_path = os.path.join(session_dir, archive.filename)

    # Save uploaded archive
    with open(archive_path, "wb") as buffer:
        shutil.copyfileobj(archive.file, buffer)

    extracted_files = []

    # If ZIP → extract
    if archive.filename.lower().endswith(".zip"):
        with zipfile.ZipFile(archive_path, "r") as zip_ref:
            zip_ref.extractall(session_dir)
            extracted_files = [
                os.path.join(session_dir, f)
                for f in zip_ref.namelist()
                if not f.endswith("/")  # skip dirs
            ]
    else:
        # Treat as single doc
        extracted_files = [archive_path]

    # Categorize & chunk
    categorized = categorize_files(extracted_files)
    output = process_chunks(categorized, chunk_size=None)
    rag_pipeline_setup(session_id, output, True)

    # Compose session meta
    return SessionMeta(
        id=session_id,
        createdAt=createdAt,
        name=name or os.path.splitext(archive.filename)[0],
        archiveName=archive.filename,
        archiveSize=archive.size,
    )


@router.get("/session/{session_id}", response_model=SessionMeta)
def get_session(session_id: str):
    """Get single session meta."""
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    # Just return minimal meta — could expand if needed
    return SessionMeta(
        id=session_id,
        createdAt=datetime.utcnow().isoformat(),
    )


# --- Existing Chunks Routes ---

@router.get("/chunks/{session_id}")
def get_chunks(session_id: str):
    """Retrieve all chunks for a given session_id"""
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    results, _ = client.scroll(
        collection_name=collection_name,
        scroll_filter=models.Filter(
            must=[models.FieldCondition(
                key="group_id",
                match=models.MatchValue(value=session_id)
            )]
        ),
        limit=10_000,
        with_payload=True,
    )

    chunks = [point.payload for point in results]
    return {"session_id": session_id, "chunks": chunks}


@router.post("/chunks/update")
def update_chunks(request: ChunkUpdateRequest):
    """Upsert or update chunks for a session_id"""
    chunks_dict = [chunk.model_dump() for chunk in request.documents]
    rag_pipeline_setup(request.session_id, chunks_dict)
    return {"status": "success", "message": "Chunks updated"}


@router.delete("/session/{session_id}")
def delete_session(session_id: str):
    """Delete all chunks for a given session_id"""
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    remove_data_from_store(session_id)
    return {"status": "success", "message": f"Session {session_id} deleted"}


@router.post("/files/upload")
async def upload_files(
    session_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    os.makedirs(DATA_FOLDER, exist_ok=True)

    saved_files = []
    for file in files:
        file_path = os.path.join(DATA_FOLDER, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_files.append(file_path)

    print(f"[UPLOAD] Processing files for session: {session_id}")
    categorized = categorize_files(saved_files)
    output = process_chunks(categorized, chunk_size=None)
    rag_pipeline_setup(session_id, output, True)
    print(f"[UPLOAD] Session {session_id}: {len(output)} chunks stored")

    return {"status": "success", "message": "Files Added"}
