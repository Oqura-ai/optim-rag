from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routers.editor_router import router as editor_router
from routers.session_router import router as session_router 
from routers.chat_router import router as chat_router

app = FastAPI(title="Optim-RAG Backend")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session_router, prefix="/api", tags=["Sessions"])
app.include_router(editor_router, prefix="/api", tags=["Editing"])
app.include_router(chat_router, prefix="/api", tags=["Chat"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
