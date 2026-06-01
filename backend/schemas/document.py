from datetime import datetime

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: str
    title: str
    filename: str
    file_type: str
    category: str
    uploaded_by: int
    uploader_name: str = ""
    upload_time: datetime
    status: str
    chunk_count: int
    tags: list[str]
    description: str
    file_size: int
    error_message: str


class DocumentListResponse(BaseModel):
    items: list[DocumentOut]
    total: int


class DocumentUploadResponse(BaseModel):
    document_id: str
    status: str
