import json
from collections.abc import AsyncGenerator

import httpx
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.message import Message
from services.retriever import Retriever
from services.system_config import get_config_value


class RagChain:
    def __init__(self, retriever: Retriever | None = None) -> None:
        self.retriever = retriever or Retriever()
        self.client = AsyncOpenAI(api_key=settings.deepseek_api_key, base_url=settings.deepseek_base_url)

    async def answer(
        self,
        db: AsyncSession,
        question: str,
        top_k: int,
        categories: list[str] | None,
        conversation_id: str | None,
    ) -> dict:
        sources = await self.retriever.retrieve(question, top_k, categories)
        messages = await self._build_messages(db, question, sources, conversation_id)
        if settings.openai_wire_api == "responses":
            return await self._answer_with_responses_api(messages, sources)
        kwargs = self._chat_kwargs(messages)
        response = await self.client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content or ""
        usage = response.usage
        return {
            "answer": content,
            "sources": sources,
            "usage": {
                "prompt_tokens": getattr(usage, "prompt_tokens", 0) if usage else 0,
                "completion_tokens": getattr(usage, "completion_tokens", 0) if usage else 0,
                "total_tokens": getattr(usage, "total_tokens", 0) if usage else 0,
            },
        }

    async def stream_answer(
        self,
        db: AsyncSession,
        question: str,
        top_k: int,
        categories: list[str] | None,
        conversation_id: str | None,
    ) -> AsyncGenerator[dict, None]:
        sources = await self.retriever.retrieve(question, top_k, categories)
        messages = await self._build_messages(db, question, sources, conversation_id)
        if settings.openai_wire_api == "responses":
            result = await self._answer_with_responses_api(messages, sources)
            for piece in chunk_for_sse(result["answer"]):
                yield {"type": "delta", "content": piece}
            yield {"type": "sources", "sources": sources}
            yield {"type": "done", "usage": result["usage"]}
            return
        usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        kwargs = self._chat_kwargs(messages, stream=True)
        stream = await self.client.chat.completions.create(**kwargs)
        async for event in stream:
            if event.usage:
                usage = {
                    "prompt_tokens": event.usage.prompt_tokens,
                    "completion_tokens": event.usage.completion_tokens,
                    "total_tokens": event.usage.total_tokens,
                }
            if not event.choices:
                continue
            delta = event.choices[0].delta.content
            if delta:
                yield {"type": "delta", "content": delta}
        yield {"type": "sources", "sources": sources}
        yield {"type": "done", "usage": usage}

    async def _build_messages(
        self,
        db: AsyncSession,
        question: str,
        sources: list[dict],
        conversation_id: str | None,
    ) -> list[dict]:
        prompt_template = await get_config_value(db, "system_prompt")
        context = "\n\n".join(
            f"[{idx + 1}] {source.get('document_title')} / {source.get('category')}\n{source.get('chunk_text')}"
            for idx, source in enumerate(sources)
        )
        messages: list[dict] = [{"role": "system", "content": prompt_template.format(context=context)}]
        if conversation_id:
            stmt = (
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc())
                .limit(12)
            )
            history = list((await db.execute(stmt)).scalars().all())
            for item in reversed(history):
                messages.append({"role": item.role, "content": item.content})
        messages.append({"role": "user", "content": question})
        return messages

    def _thinking_body(self) -> dict | None:
        # DeepSeek 官方：thinking={"type":"enabled"} 开启，reasoning_effort 调深度。
        # 用 OpenAI 网关时由 responses 分支处理，这里只负责 DeepSeek chat_completions。
        if settings.deepseek_thinking_mode == "on":
            return {
                "thinking": {"type": "enabled"},
                "reasoning_effort": settings.deepseek_reasoning_effort,
            }
        return None

    def _chat_kwargs(self, messages: list[dict], stream: bool = False) -> dict:
        kwargs = {"model": settings.chat_model, "messages": messages}
        if stream:
            kwargs["stream"] = True
            kwargs["stream_options"] = {"include_usage": True}
        thinking_body = self._thinking_body()
        if thinking_body:
            kwargs["extra_body"] = thinking_body
        return kwargs

    async def _answer_with_responses_api(self, messages: list[dict], sources: list[dict]) -> dict:
        payload: dict = {
            "model": settings.chat_model,
            "input": messages,
            "store": not settings.openai_disable_response_storage,
        }
        if settings.openai_reasoning_effort:
            payload["reasoning"] = {"effort": settings.openai_reasoning_effort}

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{settings.provider_base_url.rstrip('/')}/responses",
                headers={"Authorization": f"Bearer {settings.provider_api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        answer = extract_response_text(data)
        usage_data = data.get("usage") or {}
        return {
            "answer": answer,
            "sources": sources,
            "usage": {
                "prompt_tokens": int(usage_data.get("input_tokens", usage_data.get("prompt_tokens", 0)) or 0),
                "completion_tokens": int(usage_data.get("output_tokens", usage_data.get("completion_tokens", 0)) or 0),
                "total_tokens": int(usage_data.get("total_tokens", 0) or 0),
            },
        }


def sse_line(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def extract_response_text(data: dict) -> str:
    if data.get("output_text"):
        return str(data["output_text"])
    parts: list[str] = []
    for item in data.get("output", []) or []:
        for content in item.get("content", []) or []:
            text = content.get("text") or content.get("output_text")
            if text:
                parts.append(str(text))
    return "".join(parts)


def chunk_for_sse(text: str, size: int = 24) -> list[str]:
    if not text:
        return [""]
    return [text[index : index + size] for index in range(0, len(text), size)]
