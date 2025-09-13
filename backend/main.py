from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from qdrant_setup import rag_pipeline_setup
from chunking import process_chunks

from editor_router import router

app = FastAPI(title="Optim-RAG Backend")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api", tags=["Chunks"])

# Startup Event
@app.on_event("startup")
def load_default_data():
    folder = "../data-source"
    print(f"[BOOTSTRAP] Processing folder: {folder}")
    output = process_chunks(folder, chunk_size=None)
    rag_pipeline_setup("1", output)  # session_id = "1"
    print("[BOOTSTRAP] Default dataset loaded into Qdrant")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
