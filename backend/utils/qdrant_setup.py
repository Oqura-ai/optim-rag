import os
import uuid
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

def rag_pipeline_setup(session_id, session_name, documents, is_new=False, batch_size=20):
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
            pass  # non-numeric id (e.g., uuid)

    use_numeric_ids = len(existing_int_ids) > 0
    next_numeric_id = max(existing_int_ids) + 1 if use_numeric_ids else None

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

        if is_new:
            point_id = gen_new_id()
            chunk.setdefault("source_type", "upload")
            chunk.setdefault("uploaded_at", datetime.utcnow().isoformat())
            print(f"[NEW-UPLOAD] Appending chunk {chunk_hash} as id={point_id}")
        else:
            if status == "deleted":
                deleted_hashes.append(chunk_hash)
                continue  # nothing to upsert for deleted chunks

            elif status == "modified":
                old_point = existing_map[previous_hash]
                point_id = old_point.id
                print(f"[UPDATE] Replacing chunk {previous_hash} -> {chunk_hash} using id {point_id}")

            elif status == "unchanged":
                existing_payload = existing_map[chunk_hash].payload
                metadata_changed = any(existing_payload.get(k) != v for k, v in chunk.items())
                if metadata_changed:
                    print(f"[DRIFT] Metadata/content changed for {chunk_hash}, id={existing_map[chunk_hash].id}")
                    point_id = existing_map[chunk_hash].id
                else:
                    continue  # unchanged -> skip

            elif status == "new":
                point_id = gen_new_id()
                print(f"[NEW] Inserting new chunk {chunk_hash} as id={point_id}")

        # Build point
        point = models.PointStruct(
            id=point_id,
            vector={
                "all-MiniLM-L6-v2": models.Document(text=text, model=dense_model_name),
                "bm25": models.Document(text=text, model=bm25_model_name),
                "colbertv2.0": models.Document(text=text, model=late_interaction_model_name),
            },
            payload={"group_id": session_id, "session_name": session_name, **chunk},
        )
        points_to_upsert.append(point)

        # --- 3. Batch upsert if we hit batch size ---
        if len(points_to_upsert) >= batch_size:
            print(f"[UPSERT] Writing batch of {len(points_to_upsert)} chunks to DB")
            client.upsert(collection_name=collection_name, points=points_to_upsert)
            points_to_upsert.clear()

    # --- 4. Final upsert for remaining points ---
    if points_to_upsert:
        print(f"[UPSERT] Writing final batch of {len(points_to_upsert)} chunks to DB")
        client.upsert(collection_name=collection_name, points=points_to_upsert)
    else:
        print("[UPSERT] Nothing new to write")

    # --- 5. Delete requested chunks ---
    if deleted_hashes:
        should_conditions = [
            models.FieldCondition(key="chunk_hash", match=models.MatchValue(value=h))
            for h in deleted_hashes
        ]
        print(f"[DELETE] Removing {len(deleted_hashes)} chunks from DB (by payload chunk_hash)")
        client.delete(
            collection_name=collection_name,
            points_selector=models.FilterSelector(filter=models.Filter(should=should_conditions)),
        )
