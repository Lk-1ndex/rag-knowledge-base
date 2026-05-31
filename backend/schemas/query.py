from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(min_length=1)
    categories: list[str] | None = None
    top_k: int = Field(default=5, ge=1, le=10)
    conversation_id: str | None = None


class SourceOut(BaseModel):
    document_id: str
    document_title: str
    category: str
    chunk_text: str
    similarity_score: float
    page_number: int | None = None
    chunk_index: int | None = None


class UsageOut(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceOut]
    conversation_id: str
    usage: UsageOut


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    sources: list[SourceOut]
    created_at: str


class ConversationDetail(BaseModel):
    id: str
    title: str
    messages: list[MessageOut]
