import uuid

from config import settings
from services.document_processor import Chunk

_NAMESPACE = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")


def _point_id(document_id: str, chunk_index: int) -> str:
    return str(uuid.uuid5(_NAMESPACE, f"{document_id}:{chunk_index}"))


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
        group_id: int,
        chunks: list[Chunk],
        vectors: list[list[float]],
    ) -> None:
        from qdrant_client.http import models as qm

        points = []
        for chunk, vector in zip(chunks, vectors, strict=True):
            points.append(
                qm.PointStruct(
                    id=_point_id(document_id, chunk.chunk_index),
                    vector=vector,
                    payload={
                        "document_id": document_id,
                        "document_title": document_title,
                        "category": category,
                        "group_id": group_id,
                        "chunk_index": chunk.chunk_index,
                        "chunk_text": chunk.text,
                        "page_number": chunk.page_number,
                    },
                )
            )
        if points:
            await self.client.upsert(collection_name=self.collection, points=points)

    async def search(
        self,
        query_vector: list[float],
        top_k: int,
        group_id: int,
        categories: list[str] | None = None,
    ) -> list[dict]:
        from qdrant_client.http import models as qm

        must = [qm.FieldCondition(key="group_id", match=qm.MatchValue(value=group_id))]
        if categories:
            must.append(qm.FieldCondition(key="category", match=qm.MatchAny(any=categories)))
        query_filter = qm.Filter(must=must)
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

    async def delete_group(self, group_id: int) -> None:
        from qdrant_client.http import models as qm

        await self.client.delete(
            collection_name=self.collection,
            points_selector=qm.FilterSelector(
                filter=qm.Filter(must=[qm.FieldCondition(key="group_id", match=qm.MatchValue(value=group_id))])
            ),
        )
