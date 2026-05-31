from services.embedder import Embedder
from services.vector_store import VectorStore


class Retriever:
    def __init__(self, embedder: Embedder | None = None, vector_store: VectorStore | None = None) -> None:
        self.embedder = embedder or Embedder()
        self.vector_store = vector_store or VectorStore()

    async def retrieve(self, question: str, top_k: int, categories: list[str] | None = None) -> list[dict]:
        vector = await self.embedder.embed_query(question)
        hits = await self.vector_store.search(vector, top_k, categories)
        return merge_adjacent_chunks(hits)


def merge_adjacent_chunks(hits: list[dict]) -> list[dict]:
    merged: list[dict] = []
    for hit in sorted(hits, key=lambda item: (item.get("document_id", ""), item.get("chunk_index", 0))):
        if (
            merged
            and merged[-1].get("document_id") == hit.get("document_id")
            and isinstance(merged[-1].get("chunk_index"), int)
            and isinstance(hit.get("chunk_index"), int)
            and hit["chunk_index"] == merged[-1]["chunk_index"] + 1
        ):
            merged[-1]["chunk_text"] = f"{merged[-1].get('chunk_text', '')}\n\n{hit.get('chunk_text', '')}"
            merged[-1]["similarity_score"] = max(merged[-1].get("similarity_score", 0), hit.get("similarity_score", 0))
            continue
        merged.append(dict(hit))
    return sorted(merged, key=lambda item: item.get("similarity_score", 0), reverse=True)
