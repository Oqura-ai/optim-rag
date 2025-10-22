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
    """
    Execute a retrieval-augmented chat query for a given session.

    This endpoint performs a semantic search across the vectorstore (Qdrant)
    associated with the specified `session_id`, retrieves the most relevant
    document chunks, and generates an answer using the active LLM pipeline.

    Args:
        req: A `SendChatRequest` containing:
            - `session_id`: The target session to query.
            - `query`: The user’s natural-language question or message.
            - (Optional) `top_k`: Number of chunks to retrieve.
            - (Optional) `history`: Prior chat context (if multi-turn chat).

    Returns:
        A `SendChatResponse` containing:
            - `answer`: The LLM-generated response based on retrieved context.
            - `sources`: Metadata for the retrieved chunks (document, score, etc.).
            - `session_id`: The session ID used for the query.
            - (Optional) `latency_ms`: Time taken to generate the response.

    Typical use case:
        This route enables a conversational interface on top of the session’s
        indexed knowledge base. It is used by frontend chat UIs and by MCP
        clients to perform retrieval-augmented generation queries.

    Example:
        ```json
        {
          "session_id": "1234-5678",
          "query": "Summarize the discussion on oxidative phosphorylation.",
          "top_k": 3
        }
        ```
    """
    session_id = req.session_id
    model = req.model or "gpt-5"  # default to OpenAI

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