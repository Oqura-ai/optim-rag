from openai import OpenAI
from typing import List

from models.schema import ChatMessage

client = OpenAI()

def generate_openai_reply(
    model: str,
    message_history: List[ChatMessage],
    structured_context: str,
) -> str:
    """
    Combines chat history + retrieved context and queries OpenAI.
    Returns assistant's text reply.
    """

    # Build OpenAI input: history + context
    input_messages = []

    # Add developer/system role for instruction consistency
    input_messages.append({
        "role": "developer",
        "content": "You are a helpful assistant that uses context retrieved from documents to answer accurately.",
    })

    # Append prior conversation
    for msg in message_history:
        input_messages.append({
            "role": msg.role,
            "content": msg.content
        })

    # Add retrieved context as the latest "context" block
    input_messages.append({
        "role": "developer",
        "content": f"Retrieved context:\n{structured_context}"
    })

    # Call OpenAI Responses API
    response = client.responses.create(
        model=model,
        reasoning={"effort": "low"},
        input=input_messages,
    )

    # Extract and return plain text
    return response.output_text
