import os
import shutil
from dotenv import load_dotenv

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from qdrant_client import models
from typing import List

from models.schema import ChunkUpdateRequest, ChunkResponse, StatusResponse
from utils.chunking import process_chunks, categorize_files
from utils.qdrant_setup import (
    client,
    collection_name,
    rag_pipeline_setup,
    session_exists
)

load_dotenv()

router = APIRouter()

DATA_FOLDER = os.getenv("DATA_FOLDER", "../data-source/")

@router.get("/chunks/{session_id}", response_model=ChunkResponse)
def get_chunks(session_id: str):
    """
    Retrieve all document chunks for a specific session.

    This endpoint returns the full list of stored text chunks (and their metadata)
    belonging to the provided `session_id`. Useful for debugging or inspecting
    what content was indexed for retrieval.
    """
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
    return ChunkResponse(session_id=session_id, chunks=chunks)


@router.post("/chunks/update", response_model=StatusResponse)
def update_chunks(request: ChunkUpdateRequest):
    """
    Update or insert text chunks for a given session.

    This endpoint receives a list of chunked documents along with their metadata
    inside a `ChunkUpdateRequest`. It reprocesses and stores them in the Qdrant
    vector database under the specified `session_id`.

    Use this endpoint when you need to refresh or manually modify chunks
    for an existing session.
    """
    chunks_dict = [chunk.model_dump() for chunk in request.documents]
    rag_pipeline_setup(request.session_id, chunks_dict)
    return StatusResponse(status="success", message="chunks updated")


@router.post("/files/upload", response_model=StatusResponse)
async def upload_files(
    session_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Upload and process new files for a session.

    The files are automatically chunked and embedded into the vector store (Qdrant).
    This replaces or extends existing session data depending on configuration.
    """
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

    return StatusResponse(status="success", message="Files added")
