# `optim-rag`

## Overview

`optim-rag` is a tool designed to simplify managing data in Retrieval-Augmented Generation (RAG) systems. It helps you easily add, edit, and manage document chunks used for knowledge retrieval, making it especially useful when working with frequently changing data.

---

## Key Features

| Core Capability                 | Technical Implementation                                                                                                                                                                                                                     |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Efficient Updates**           | Edits, additions, and deletions are saved and processed once the user confirms the changes. Then only these changes get updated for indexing and storage.                                                                           |
| **Advanced Document Ingestion** | Handles `PDF`, `DOCX`, `MD`, and `TXT` formats. Converts all to a standard format and uses the **Mistral** OCR engine for high-accuracy extraction from text documents.                                    |
| **Multi-Vector Indexing**       | Every chunk is indexed using **three distinct vector types**: Dense (`cli-MiniLM-L6-v2`), Sparse (`BM25`), and Late-Interaction (`ColBERTv2.0`). This ensures a powerful hybrid search that combines semantic context with keyword accuracy. |
| **Visual Chunk Editor**         | A dedicated **Next.js** frontend allows users to view, edit, delete, and add new chunks with a live Markdown preview and word count.                                                                                                         |
---

## What Makes `optim-rag` Different

`optim-rag` focuses on efficient management of embedded vector data. Instead of reprocessing all files, it only updates what has been changed. When users edit or add new contents, the system detects those changes and updates them selectively. This makes it a faster synchronization and smoother performance even with large data.

This design is ideal for production setups where data changes frequently and precision in updating is key.

---

## Pipeline

### **1. Document Ingestion**

This stage processes raw files and prepares them for storage.

* Users upload supported files (`.zip`)
* OCR extracts text from scanned or image-based documents
* The system splits the content into smaller chunks and attaches metadata (file name, page, etc.)
* Chunks are embedded using **dense**, **sparse**, and **late-interaction** models, then stored in **Qdrant** after the user saves them.

---

### **2. Chunk Editing and Updates**

This stage allows users to modify the knowledge base directly.

* Chunks can be added, edited, or deleted via the frontend
* When saved, changes are processed by the backend and reflected in the datastore
* Only the updated or new chunks are indexed, keeping data management efficient

---

### **3. Query and Retrieval**

This is where the stored knowledge is used during conversations or queries.

* Queries trigger a **hybrid retrieval** process combining dense, sparse, and re-ranking searches
* The top relevant chunks are compiled into a structured context
* The **LLM** generates a context-aware, accurate response using this retrieved information

---

## Getting Started

### Requirements

* **Node.js**
* **Python 3.13**
* **Docker** (for Qdrant vector database)

### Setup Steps

1. **Start Qdrant**

   ```bash
   docker-compose up -d qdrant
   ```

   This launches Qdrant and persists data in `qdrant_data`.

2. **Install Backend Dependencies**

   ```bash
   cd backend
   uv sync
   ```

3. **Install Frontend Dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

4. **Run the App**

   ```bash
   npm run dev
   ```

   Open in browser: [http://localhost:3000](http://localhost:3000)
