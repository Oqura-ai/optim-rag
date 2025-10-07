from fastapi import APIRouter

from models.schema import (
    ChatMessage,
    SendChatRequest, 
    SendChatResponse,
) 
from chat_clients.openai_client import generate_openai_reply
from utils.qdrant_setup import retrieve_from_store

router = APIRouter()

@router.post("/chat/send", response_model=SendChatResponse)
def send_chat(req: SendChatRequest):
    session_id = req.session_id
    model = req.model or "ollama-local"  # default to OpenAI

    # Get last user message
    last_user = next((m for m in reversed(req.messages) if m.role == "user"), None)
    retrieved_chunks = retrieve_from_store(last_user.content, session_id) if last_user else []

    # Build structured context
    if retrieved_chunks:
        context_lines = ["Context Retrieved:"]
        for idx, chunk in enumerate(retrieved_chunks, start=1):
            filename = chunk.get("filename", "Unknown File")
            page_num = chunk.get("page_number", "N/A")
            content = chunk.get("page_content", "").strip()
            if len(content) > 800:
                content = content[:800] + "..."
            context_lines.append(f"[{idx}] File: {filename} (Page {page_num})\n{content}\n")
        structured_context = "\n".join(context_lines)
    else:
        structured_context = "(No relevant context found.)"

    # Generate OpenAI reply using message history + context
    ai_reply_text = generate_openai_reply(model, req.messages, structured_context)

    reply = ChatMessage(role="assistant", content=ai_reply_text)

    return SendChatResponse(
        session_id=session_id,
        reply=reply,
        messages=req.messages
    )