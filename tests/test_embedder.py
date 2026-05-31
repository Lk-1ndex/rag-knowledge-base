import pytest

from services.embedder import Embedder


class FakeEmbedding:
    def __init__(self, embedding):
        self.embedding = embedding


class FakeEmbeddingsClient:
    async def create(self, model: str, input: list[str]):
        class Response:
            data = [FakeEmbedding([float(len(text)), 0.0, 1.0]) for text in input]

        return Response()


class FakeClient:
    embeddings = FakeEmbeddingsClient()


@pytest.mark.asyncio
async def test_embed_texts_batches_inputs(monkeypatch):
    embedder = Embedder()
    embedder.client = FakeClient()
    vectors = await embedder.embed_texts(["a", "abcd"])
    assert vectors == [[1.0, 0.0, 1.0], [4.0, 0.0, 1.0]]
