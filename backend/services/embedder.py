import asyncio

from openai import AsyncOpenAI

from config import settings


class Embedder:
    """DeepSeek 兼容 OpenAI Embedding API 的轻量封装。"""

    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.provider_api_key, base_url=settings.provider_base_url)

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), 100):
            batch = texts[start : start + 100]
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
            except Exception as exc:  # pragma: no cover - 外部 API 错误由集成环境验证
                last_error = exc
                await asyncio.sleep(0.5 * (attempt + 1))
        raise RuntimeError(f"Embedding API 调用失败: {last_error}")
