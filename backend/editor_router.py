from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

from qdrant_setup import (
    client,
    collection_name,
    rag_pipeline_setup,
    remove_data_from_store,
    session_exists,
)

from qdrant_client import models

router = APIRouter()


# --- Request/Response Schemas ---
class Chunk(BaseModel):
    page_content: str
    chunk_hash: str
    previous_hash: str | None = None
    metadata: Dict[str, Any] | None = None


class ChunkUpdateRequest(BaseModel):
    session_id: str
    documents: List[List[Chunk]]


# --- Endpoints ---

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
    print(chunks[0])
    return {"session_id": session_id, "chunks": chunks}


@router.post("/chunks/update")
def update_chunks(request: ChunkUpdateRequest):
    """Upsert or update chunks for a session_id"""
    rag_pipeline_setup(request.session_id, request.documents)
    return {"status": "success", "message": "Chunks updated"}


@router.delete("/session/{session_id}")
def delete_session(session_id: str):
    """Delete all chunks for a given session_id"""
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    remove_data_from_store(session_id)
    return {"status": "success", "message": f"Session {session_id} deleted"}
