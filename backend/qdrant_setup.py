import os
import random
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

    return results.points

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

def rag_pipeline_setup(session_id, documents):
    points = []
    point_id = 0

    for doc_idx, doc_chunks in enumerate(documents):
        for chunk in doc_chunks:
            text = chunk["page_content"]

            point = models.PointStruct(
                id=f"{session_id}_{point_id}",  # unique across session
                vector={
                    "all-MiniLM-L6-v2": models.Document(text=text, model=dense_model_name),
                    "bm25": models.Document(text=text, model=bm25_model_name),
                    "colbertv2.0": models.Document(text=text, model=late_interaction_model_name),
                },
                payload={
                    "group_id": session_id,
                    **chunk 
                },
            )

            points.append(point)
            point_id += 1

    client.upsert(
        collection_name=collection_name,
        points=points,
    )
