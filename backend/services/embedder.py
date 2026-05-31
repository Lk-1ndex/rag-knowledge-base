import asyncio

from openai import AsyncOpenAI

from config import settings


class Embedder:
    """本地 Infinity（BGE-M3）Embedding 服务的轻量封装。

    Infinity 暴露 OpenAI 兼容的 /v1/embeddings 接口，因此复用 AsyncOpenAI，
    但 base_url 指向本地 embedding 服务，而非 LLM provider。
    """

    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.embedding_api_key,
            base_url=settings.embedding_base_url,
        )
        self.batch_size = settings.embedding_batch_size

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), self.batch_size):
            batch = texts[start : start + self.batch_size]
            vectors.extend(await self._embed_batch(batch))
        return vectors

    async def embed_query(self, text: str) -> list[float]:
        return (await self.embed_texts([text]))[0]

    async def _embed_batch(self, batch: list[str]) -> list[list[float]]:
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await self.client.embeddings.create(
                    model=settings.embedding_model,
                    input=batch,
                )
                return [item.embedding for item in response.data]
            except Exception as exc:  # pragma: no cover - 外部服务错误由集成环境验证
                last_error = exc
                await asyncio.sleep(0.5 * (attempt + 1))
        raise RuntimeError(f"Embedding 服务调用失败: {last_error}")
