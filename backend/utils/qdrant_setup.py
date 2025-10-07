import os
import uuid
import random
from datetime import datetime
from dotenv import load_dotenv

from qdrant_client import QdrantClient, models
from fastembed import TextEmbedding, LateInteractionTextEmbedding, SparseTextEmbedding 

load_dotenv()

client = QdrantClient(url=os.getenv("QDRANT_URL"), timeout=500)
collection_name = os.getenv("COLLECTION_NAME")
dense_model_name = os.getenv("DENSE_EMBEDDING_MODEL")
bm25_model_name = os.getenv("BM25_EMBEDDING_MODEL")
late_interaction_model_name = os.getenv("LATE_INTERACTION_EMBEDDING_MODEL")

dense_embedding_model = TextEmbedding(os.getenv("DENSE_EMBEDDING_MODEL"))
bm25_embedding_model = SparseTextEmbedding(os.getenv("BM25_EMBEDDING_MODEL"))
late_interaction_embedding_model = LateInteractionTextEmbedding(os.getenv("LATE_INTERACTION_EMBEDDING_MODEL"))

if not client.collection_exists(collection_name=collection_name):
    client.create_collection(
        collection_name=collection_name,
        vectors_config={
        "all-MiniLM-L6-v2": models.VectorParams(
            size=384,
            distance=models.Distance.COSINE,
        ),
        "colbertv2.0": models.VectorParams(
            size=128,
            distance=models.Distance.COSINE,
            multivector_config=models.MultiVectorConfig(
                comparator=models.MultiVectorComparator.MAX_SIM,
            ),
            hnsw_config=models.HnswConfigDiff(m=0)
        ),
    },
    sparse_vectors_config={
        "bm25": models.SparseVectorParams(modifier=models.Modifier.IDF)
    })

def session_exists(session_id: str) -> bool:
    results = client.scroll(
        collection_name=collection_name,
        scroll_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="group_id",
                    match=models.MatchValue(value=session_id)
                )
            ]
        ),
        limit=1
    )
    return len(results[0]) > 0

def retrieve_from_store(question: str, session_id:str, n_points: int = 10) -> str:
    prefetch = [
        models.Prefetch(
            query=models.Document(text=question, model=dense_model_name),
            using="all-MiniLM-L6-v2",
            limit=2*n_points,
        ),
        models.Prefetch(
            query=models.Document(text=question, model=bm25_model_name),
            using="bm25",
            limit=2*n_points,
        ),
    ]
    results = client.query_points(
            collection_name=collection_name,
            prefetch=prefetch,
            query=models.Document(text=question, model=late_interaction_model_name),
            query_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="group_id",
                    match=models.MatchValue(
                        value=session_id,
                    ),
                )
            ]
        ),
            using="colbertv2.0",
            with_payload=True,
            limit=n_points,
    )

    return [result.payload for result in results.points]

def remove_data_from_store(session_id:str) -> str:
    client.delete(
        collection_name=collection_name,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="group_id",
                        match=models.MatchValue(
                            value=session_id,
                        ),
                    )
                ]
            )
        )
    )

def rag_pipeline_setup(session_id, documents, is_new=False):
    points_to_upsert = []
    deleted_hashes = []

    # --- 1. Fetch existing chunks for this session ---
    existing_chunks, _ = client.scroll(
        collection_name=collection_name,
        scroll_filter={"must": [{"key": "group_id", "match": {"value": session_id}}]},
        limit=10_000
    )

    # Map by chunk_hash for fast lookup
    existing_map = {chunk.payload.get("chunk_hash"): chunk for chunk in existing_chunks}

    # Collect numeric ids if available so we can continue numbering
    existing_int_ids = []
    for c in existing_chunks:
        try:
            existing_int_ids.append(int(c.id))
        except Exception:
            # non-numeric id (e.g., uuid) — ignore for numeric sequencing
            pass

    use_numeric_ids = len(existing_int_ids) > 0
    if use_numeric_ids:
        next_numeric_id = max(existing_int_ids) + 1
    else:
        next_numeric_id = None

    def gen_new_id():
        nonlocal next_numeric_id
        if use_numeric_ids:
            nid = next_numeric_id
            next_numeric_id += 1
            return nid
        else:
            return uuid.uuid4().hex

    # --- 2. Iterate over incoming documents ---
    for chunk in documents:
        text = chunk.get("page_content", "")
        chunk_hash = chunk.get("chunk_hash")
        previous_hash = chunk.get("previous_hash")
        status = chunk.get("status")

        # If this is a new-file upload, we always append new points (do not reuse existing IDs)
        if is_new:
            point_id = gen_new_id()
            # Optionally annotate uploaded metadata for traceability:
            chunk.setdefault("source_type", "upload")
            chunk.setdefault("uploaded_at", datetime.utcnow().isoformat())
            # Do not try to delete/replace existing_map entries — we intentionally append
            print(f"[NEW-UPLOAD] Appending chunk {chunk_hash} as id={point_id}")

        else:
            if status == "deleted":
                deleted_hashes.append(chunk_hash)

            elif status == "modified":
                old_point = existing_map[previous_hash]
                point_id = old_point.id
                print(f"[UPDATE] Replacing chunk {previous_hash} -> {chunk_hash} using id {point_id}")

            # # non-upload mode: preserve original update/delete behavior
            elif status == "unchanged":
                # Drift detection: check content and metadata differences
                existing_payload = existing_map[chunk_hash].payload
                # text_changed = existing_payload.get("page_content") != text
                metadata_changed = any(
                    existing_payload.get(k) != v
                    for k, v in chunk.items()
                )
                if metadata_changed:
                    print(f"[DRIFT] Metadata/content changed for {chunk_hash}, id={existing_map[chunk_hash].id}")
                    point_id = existing_map[chunk_hash].id
                else:
                    # unchanged -> skip
                    continue

            elif status == "new":
                # truly new chunk in update-mode
                point_id = gen_new_id()
                print(f"[NEW] Inserting new chunk {chunk_hash} as id={point_id}")

        # Build/upsert the new point
        if status != "deleted":
            point = models.PointStruct(
                id=point_id,
                vector={
                    "all-MiniLM-L6-v2": models.Document(text=text, model=dense_model_name),
                    "bm25": models.Document(text=text, model=bm25_model_name),
                    "colbertv2.0": models.Document(text=text, model=late_interaction_model_name),
                },
                payload={"group_id": session_id, **chunk},
            )
            points_to_upsert.append(point)

    # --- 3. Detect deleted chunks (only when deletions were requested) ---
    if deleted_hashes:
        # Build OR (should) conditions — one per hash
        should_conditions = [
            models.FieldCondition(key="chunk_hash", match=models.MatchValue(value=h))
            for h in deleted_hashes
        ]

        print(f"[DELETE] Removing {len(deleted_hashes)} chunks from DB (by payload chunk_hash)")
        client.delete(
            collection_name=collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(should=should_conditions)
            ),
        )

    # --- 4. Perform upsert for new/updated points ---
    if points_to_upsert:
        print(f"[UPSERT] Writing {len(points_to_upsert)} chunks to DB")
        client.upsert(
            collection_name=collection_name,
            points=points_to_upsert,
        )
    else:
        print("[UPSERT] Nothing new to write")


# def rag_pipeline_setup(session_id, documents, is_new=False):
#     points_to_upsert = []
#     new_point_id = 0

#     deleted_id = []

#     # --- 1. Fetch existing chunks for this session ---
#     existing_chunks, _ = client.scroll(
#         collection_name=collection_name,
#         scroll_filter={"must": [{"key": "group_id", "match": {"value": session_id}}]},
#         limit=10_000  # adjust as needed
#     )

#     # Map by chunk_hash for fast lookup
#     existing_map = {chunk.payload.get("chunk_hash"): chunk for chunk in existing_chunks}

#     # Keep track of all current hashes
#     incoming_hashes = set()

#     # --- 2. Iterate over incoming documents ---
#     for doc_idx, chunk in enumerate(documents):
#         seen_in_doc = set()  # detect duplicates inside one doc
#         text = chunk["page_content"]
#         chunk_hash = chunk["chunk_hash"]
#         previous_hash = chunk.get("previous_hash")
#         status = chunk.get("status")
#         chunk_id = chunk.get("id")

#         # --- Duplicate detection (in same input batch) ---
#         if chunk_hash in seen_in_doc:
#             print(f"[DUPLICATE] Skipping duplicate chunk {chunk_hash}")
#             continue
#         seen_in_doc.add(chunk_hash)
#         incoming_hashes.add(chunk_hash)

#         # --- Case 1: Unchanged chunk (already exists, same hash) ---
#         if chunk_hash in existing_map:
#             # Drift detection: metadata changed?
#             existing_payload = existing_map[chunk_hash].payload
#             metadata_changed = any(
#                 existing_payload.get(k) != v
#                 for k, v in chunk.items()
#                 if k != "page_content"  # ignore content
#             )
#             if metadata_changed:
#                 print(f"[DRIFT] Metadata drift detected for {chunk_hash}, updating payload")
#                 point_id = existing_map[chunk_hash].id
#             else:
#                 continue  # completely unchanged → skip

#         # --- Case 2: Updated chunk (previous_hash found) ---
#         elif previous_hash and previous_hash in existing_map:
#             old_point = existing_map[previous_hash]
#             point_id = old_point.id  # reuse same ID → replacement
#             print(f"[UPDATE] Replacing chunk {previous_hash} → {chunk_hash}")

#         # --- Case 3: Deleted Chunk
#         elif status == "deleted":
#             deleted_ids.append(chunk_id)

#         # --- Case 4: New chunk ---
#         else:
#             point_id = new_point_id
#             new_point_id += 1
#             print(f"[NEW] Inserting new chunk {chunk_hash}")

#         # Build the new point
#         point = models.PointStruct(
#             id=point_id,
#             vector={
#                 "all-MiniLM-L6-v2": models.Document(text=text, model=dense_model_name),
#                 "bm25": models.Document(text=text, model=bm25_model_name),
#                 "colbertv2.0": models.Document(text=text, model=late_interaction_model_name),
#             },
#             payload={"group_id": session_id, **chunk},
#         )
#         points_to_upsert.append(point)

#     # --- 3. Detect deleted chunks ---
#     if deleted_ids and not is_new:
#         print(f"[DELETE] Removing {len(deleted_ids)} chunks from DB")
#         client.delete(
#             collection_name=collection_name,
#             points_selector=models.PointIdsList(points=deleted_ids),
#         )

#     # --- 4. Perform upsert for new/updated points ---
#     if points_to_upsert:
#         print(f"[UPSERT] Writing {len(points_to_upsert)} chunks to DB")
#         client.upsert(
#             collection_name=collection_name,
#             points=points_to_upsert,
#         )
#     else:
#         print("[UPSERT] Nothing new to write")