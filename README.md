<p align="center">
  <img src="./assets/optim-rag.png" alt="Oqura.ai - optim-rag" width="700"/>
</p>

<p align="center">
<a href="https://github.com/Oqura-ai/optim-rag/stargazers"><img src="https://img.shields.io/github/stars/Oqura-ai/optim-rag?style=flat-square" alt="GitHub Stars"></a>
<a href="https://github.com/Oqura-ai/optim-rag/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Oqura-ai/optim-rag?style=flat-square&color=purple" alt="License"></a>
<a href="https://github.com/Oqura-ai/optim-rag/commits/main"><img src="https://img.shields.io/github/last-commit/Oqura-ai/optim-rag?style=flat-square&color=blue" alt="Last Commit"></a>
<img src="https://img.shields.io/badge/Python-3.9%2B-blue?style=flat-square" alt="Python Version">
<a href="https://github.com/Oqura-ai/optim-rag/graphs/contributors"><img src="https://img.shields.io/github/contributors/Oqura-ai/optim-rag?style=flat-square&color=yellow" alt="Contributors"></a>
</p>

<!-- <div align="center">
  <img src="./assets/demo.gif" alt="optim-rag Demo" />
</div> -->

## Overview

`optim-rag` is a tool designed to simplify managing data in Retrieval-Augmented Generation (RAG) systems. It helps you easily add, edit, and manage document chunks used for knowledge retrieval, making it especially useful when working with frequently changing data.


## Key Features

| Core Capability                 | Technical Implementation                                                                                                                                                                                                                     |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Efficient Updates**           | Edits, additions, and deletions are saved and processed once the user confirms the changes. Then only these changes get updated for indexing and storage.                                                                           |
| **Advanced Document Ingestion** | Handles `PDF`, `DOCX`, `MD`, and `TXT` formats. Converts all to a standard format and uses the **Mistral** OCR engine for high-accuracy extraction from text documents.                                    |
| **Multi-Vector Indexing**       | Every chunk is indexed using **three distinct vector types**: Dense (`cli-MiniLM-L6-v2`), Sparse (`BM25`), and Late-Interaction (`ColBERTv2.0`). This ensures a powerful hybrid search that combines semantic context with keyword accuracy. |
| **Visual Chunk Editor**         | A dedicated **Next.js** frontend allows users to view, edit, delete, and add new chunks with a live Markdown preview and word count.                                                                                                         |

## What Makes `optim-rag` Different

`optim-rag` focuses on efficient management of embedded vector data. Instead of reprocessing all files, it only updates what has been changed. When users edit or add new contents, the system detects those changes and updates them selectively. This makes it a faster synchronization and smoother performance even with large data.

This design is ideal for production setups where data changes frequently and precision in updating is key.


## Pipeline

### **1. Document Ingestion**

This stage processes raw files and prepares them for storage.

* Users upload supported files (`.zip`)
* OCR extracts text from scanned or image-based documents
* The system splits the content into smaller chunks and attaches metadata (file name, page, etc.)
* Chunks are embedded using **dense**, **sparse**, and **late-interaction** models, then stored in **Qdrant** after the user saves them.


### **2. Chunk Editing and Updates**

This stage allows users to modify the knowledge base directly.

* Chunks can be added, edited, or deleted via the frontend
* When saved, changes are processed by the backend and reflected in the datastore
* Only the updated or new chunks are indexed, keeping data management efficient


### **3. Query and Retrieval**

This is where the stored knowledge is used during conversations or queries.

* Queries trigger a **hybrid retrieval** process combining dense, sparse, and re-ranking searches
* The top relevant chunks are compiled into a structured context
* The **LLM** generates a context-aware, accurate response using this retrieved information


Here’s your refined and **fully-detailed Markdown documentation**, optimized for clarity and professional use.
It clearly distinguishes between **Docker**, **Vanilla**, and **MCP (Prototype)** setups — explaining the *why* and *when* for each step.
You can **copy and paste** this directly into your project README or docs.



# Getting Started

optim-rag is a modular Retrieval-Augmented Generation (RAG) framework designed for flexibility and extensibility.  
You can set it up in multiple ways depending on your purpose — **Docker** for a quick launch or **Vanilla** setup for faster development and debugging.


## Prerequisites

Before starting, ensure you have the following installed:

- **docker** and **docker-compose** – for containerized setup  
- **node.js (≥22)** – for frontend
- **python (≥3.13)** – for backend
- **uv** – for Python dependency management


## Step 1: Clone the Repository & Setup Environment

Clone the project and prepare your environment variables:

```bash
git clone https://github.com/Oqura-ai/optim-rag
cd optim-rag
cp .env.example .env # Fill in the required API/auth keys for your services
cp .env ./backend/.env # Optional: Needed if backend is run standalone (without Docker)
```

## Step 2: Docker Setup (Recommended for Quick Start)

Docker setup is the **easiest and fastest** way to run optim-rag — it handles dependencies and services automatically.

```bash
# if you only want to run the main application
docker-compose -f docker-compose.yaml up frontend backend qdrant --build

# if you only want to run the mcp server (we will get into this later)
docker-compose -f docker-compose.yaml up mcp qdrant --build

# if you also want to run the mcp server alongside the main application
docker-compose -f docker-compose.yaml up --build
```

* The first build may take time as it downloads all dependencies.
* Once complete, optim-rag will be available at [http://localhost:3000](http://localhost:3000)


## Step 3: Vanilla Setup (For Local Development)

Use the vanilla setup if you want **fine-grained control** over backend/frontend development or debugging.

### 1. Start Qdrant (Vector Database)

```bash
docker-compose up -d qdrant
```

* Launches **Qdrant**, the vector store backend used by optim-rag.
* Data persists in the local `qdrant_data` directory.


### 2. Setup Backend

```bash
cd backend
uv venv

./.venv/Scripts/activate  # (Windows)
# or
source .venv/bin/activate  # (Linux/Mac)

uv pip install -e .
```

### 3. Setup Frontend

```bash
cd frontend
npm install
```

### 4. Run the Application

```bash
# Run the frontend (in frontend dir)
npm run dev

# Run the backend (in backend dir)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open your browser at: [http://localhost:3000](http://localhost:3000)


## MCP Server Setup (Prototype Stage)

The **MCP (Model Context Protocol)** server enables **AI-assisted coding clients** (like Cursor, GitHub Copilot, or VSCode) to directly access optim-rag’s vectorstore endpoints as tools.

**Note:** MCP integration is currently **in prototype stage** — features may change in future versions.


### For Cursor Editor

Create an MCP configuration file inside your project root:

```bash
mkdir .cursor
touch mcp.json
# or (on Windows)
New-Item mcp.json
```

Add this configuration:

```json
{
  "mcpServers": {
    "optim-rag": {
      "command": "python",
      "args": ["backend/mcp_server.py"],
      "cwd": "${workspaceFolder}/backend",
      "envFile": "${workspaceFolder}/.env",
      "description": "optim-rag vectorstore MCP server"
    }
  }
}
```

### For GitHub Copilot / VSCode MCP Integration

Create the config file:

```bash
mkdir .vscode
touch mcp.json
# or (on Windows)
New-Item mcp.json
```

Add this configuration:

```json
{
  "servers": {
    "optim-rag": {
      "command": "${workspaceFolder}/backend/.venv/Scripts/python.exe",
      "args": ["mcp_server.py"],
      "cwd": "${workspaceFolder}/backend",
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

### Run the MCP Server

Once your MCP client (Cursor or VSCode) is configured:

- For vanilla run
```bash
cd backend
python mcp_server.py
```

- Using docker
```bash
docker-compose -f docker-compose.yaml up mcp qdrant --build
```


The MCP server will start and expose optim-rag’s tools to your connected client.

> **Note:**
> - Make sure if you have the environment activated if running the server in vanilla setup
> - Since MCP integration is still experimental, expect rapid iteration and breaking changes.
