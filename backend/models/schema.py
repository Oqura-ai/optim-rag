from pydantic import BaseModel
from typing import List, Optional, Literal

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


ChatRole = Literal["developer", "user", "assistant"]
ChatModel = Literal["ollama-local", "gpt-5"]

# Request/Response models
class ChatMessage(BaseModel):
    role: ChatRole
    content: str

class SendChatRequest(BaseModel):
    session_id: str
    messages: List[ChatMessage]
    model: Optional[ChatModel] = "ollama-local"

class SendChatResponse(BaseModel):
    session_id: str
    reply: ChatMessage
    messages: List[ChatMessage]