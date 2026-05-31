from config import settings
from services.document_processor import Chunk


class VectorStore:
    """封装 Qdrant collection 初始化、写入、检索和删除。"""

    def __init__(self) -> None:
        from qdrant_client import AsyncQdrantClient

        self.client = AsyncQdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        self.collection = settings.qdrant_collection

    async def ensure_collection(self) -> None:
        from qdrant_client.http import models as qm

        collections = await self.client.get_collections()
        names = {item.name for item in collections.collections}
        if self.collection in names:
            return
        await self.client.create_collection(
            collection_name=self.collection,
            vectors_config=qm.VectorParams(size=settings.qdrant_vector_size, distance=qm.Distance.COSINE),
        )

    async def health(self) -> bool:
        try:
            await self.client.get_collections()
            return True
        except Exception:
            return False

    async def upsert_chunks(
        self,
        document_id: str,
        document_title: str,
        category: str,
        chunks: list[Chunk],
        vectors: list[list[float]],
    ) -> None:
        from qdrant_client.http import models as qm

        points = []
        for chunk, vector in zip(chunks, vectors, strict=True):
            points.append(
                qm.PointStruct(
                    id=f"{document_id}:{chunk.chunk_index}",
                    vector=vector,
                    payload={
                        "document_id": document_id,
                        "document_title": document_title,
                        "category": category,
                        "chunk_index": chunk.chunk_index,
                        "chunk_text": chunk.text,
                        "page_number": chunk.page_number,
                    },
                )
            )
        if points:
            await self.client.upsert(collection_name=self.collection, points=points)

    async def search(self, query_vector: list[float], top_k: int, categories: list[str] | None = None) -> list[dict]:
        from qdrant_client.http import models as qm

        query_filter = None
        if categories:
            query_filter = qm.Filter(
                must=[qm.FieldCondition(key="category", match=qm.MatchAny(any=categories))]
            )
        hits = await self.client.search(
            collection_name=self.collection,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=top_k,
            with_payload=True,
        )
        return [
            {
                **(hit.payload or {}),
                "similarity_score": float(hit.score),
            }
            for hit in hits
        ]

    async def delete_document(self, document_id: str) -> None:
        from qdrant_client.http import models as qm

        await self.client.delete(
            collection_name=self.collection,
            points_selector=qm.FilterSelector(
                filter=qm.Filter(must=[qm.FieldCondition(key="document_id", match=qm.MatchValue(value=document_id))])
            ),
        )
