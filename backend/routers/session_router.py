import os
import uuid
import shutil
import zipfile
from datetime import datetime
import datetime as dt
from dotenv import load_dotenv

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional, Dict

from models.schema import SessionMeta, DeleteSessionResponse
from utils.chunking import process_chunks, categorize_files
from utils.qdrant_setup import (
    client,
    collection_name,
    rag_pipeline_setup,
    session_exists,
    remove_data_from_store
)

load_dotenv()

router = APIRouter()

DATA_FOLDER = os.getenv("DATA_FOLDER", "../data-source/")

@router.get("/sessions", response_model=List[SessionMeta])
def list_sessions():
    """
    Retrieve metadata for all stored sessions.

    Each session corresponds to a distinct uploaded dataset or document archive
    that has been processed and indexed in the vector store (Qdrant).

    Returns:
        A list of `SessionMeta` objects containing ID, name, creation timestamp,
        and basic archive information for each session found.
    """
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
    """
    Create and process a new session from an uploaded document archive.

    The uploaded file may be a ZIP containing multiple documents or a single
    standalone document. Files are extracted, categorized, chunked, and stored
    in the Qdrant vector database as embeddings.

    Args:
        archive: The uploaded document archive (ZIP or single file).
        name: Optional human-readable name for the session.

    Returns:
        A `SessionMeta` object describing the created session, including
        generated session ID, creation timestamp, archive name, and size.
    """
    # Generate session_id (UUID ensures uniqueness, fallback to filename stem if needed)
    session_id = str(uuid.uuid4())
    createdAt = datetime.now(dt.timezone.utc)

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
        createdAt=str(createdAt),
        name=name or os.path.splitext(archive.filename)[0],
        archiveName=archive.filename,
        archiveSize=archive.size,
    )

@router.get("/session/{session_id}", response_model=SessionMeta)
def get_session(session_id: str):
    """
    Retrieve metadata for a specific session.

    Returns minimal session metadata such as ID and creation time. This
    endpoint can be extended to include additional metadata (like document
    count or vector stats) as needed.

    Args:
        session_id: Unique identifier of the target session.

    Raises:
        HTTPException(404): If the session does not exist.

    Returns:
        A `SessionMeta` object describing the session.
    """
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    # Just return minimal meta — could expand if needed
    return SessionMeta(
        id=session_id,
        createdAt=datetime.utcnow().isoformat(),
    )

@router.delete("/session/{session_id}", response_model=DeleteSessionResponse)
def delete_session(session_id: str):
    """
    Delete an existing session and all its stored chunks.

    Removes all associated embeddings and payloads from the vector store
    (Qdrant) corresponding to the specified session ID.

    Args:
        session_id: Unique identifier of the session to delete.

    Raises:
        HTTPException(404): If the session does not exist.

    Returns:
        A `DeleteSessionResponse` confirming the deletion status.
    """
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    remove_data_from_store(session_id)
    return DeleteSessionResponse(
        status="success",
        message=f"Session {session_id} deleted"
    )