import json
import re
from dataclasses import dataclass
from pathlib import Path

import fitz
from docx import Document as DocxDocument

from config import settings


@dataclass
class TextPage:
    text: str
    page_number: int | None = None


@dataclass
class Chunk:
    text: str
    chunk_index: int
    page_number: int | None = None


SUPPORTED_TYPES = {".pdf": "pdf", ".docx": "docx", ".md": "md", ".txt": "txt"}


def file_type_from_name(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_TYPES:
        raise ValueError("仅支持 PDF、DOCX、Markdown、TXT 文件")
    return SUPPORTED_TYPES[suffix]


def secure_filename(filename: str) -> str:
    name = Path(filename).name
    name = re.sub(r"[^\w.\-\u4e00-\u9fa5]+", "_", name, flags=re.UNICODE).strip("._")
    return name or "upload.bin"


def validate_magic_bytes(filename: str, data: bytes) -> None:
    file_type = file_type_from_name(filename)
    head = data[:8]
    if file_type == "pdf" and not head.startswith(b"%PDF"):
        raise ValueError("PDF 文件头校验失败")
    if file_type == "docx" and not head.startswith(b"PK"):
        raise ValueError("DOCX 文件头校验失败")
    if file_type in {"md", "txt"}:
        try:
            data[:4096].decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError("文本文件必须使用 UTF-8 编码") from exc


def extract_text_pages(path: Path, file_type: str) -> list[TextPage]:
    if file_type == "pdf":
        return extract_pdf(path)
    if file_type == "docx":
        return extract_docx(path)
    return [TextPage(path.read_text(encoding="utf-8"), None)]


def extract_pdf(path: Path) -> list[TextPage]:
    pages: list[TextPage] = []
    with fitz.open(path) as doc:
        for index, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if text:
                pages.append(TextPage(text=text, page_number=index))
    return pages


def extract_docx(path: Path) -> list[TextPage]:
    doc = DocxDocument(path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return [TextPage("\n\n".join(paragraphs), None)]


def rough_token_len(text: str) -> int:
    ascii_words = re.findall(r"[A-Za-z0-9_]+", text)
    cjk_chars = re.findall(r"[\u4e00-\u9fff]", text)
    other = max(len(text) - sum(len(w) for w in ascii_words) - len(cjk_chars), 0) // 4
    return len(ascii_words) + len(cjk_chars) + other


def split_paragraphs(text: str) -> list[str]:
    parts = re.split(r"\n\s*\n", text)
    return [part.strip() for part in parts if part.strip()]


def chunk_pages(
    pages: list[TextPage],
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[Chunk]:
    size = chunk_size or settings.default_chunk_size
    overlap = chunk_overlap or settings.default_chunk_overlap
    chunks: list[Chunk] = []
    carry = ""

    for page in pages:
        current = carry
        for paragraph in split_paragraphs(page.text):
            candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
            if rough_token_len(candidate) <= size:
                current = candidate
                continue
            if current:
                chunks.append(Chunk(current, len(chunks), page.page_number))
                current = build_overlap(current, overlap)
            if rough_token_len(paragraph) > size:
                for piece in split_long_text(paragraph, size):
                    candidate = f"{current}\n\n{piece}".strip() if current else piece
                    chunks.append(Chunk(candidate, len(chunks), page.page_number))
                    current = build_overlap(candidate, overlap)
            else:
                current = f"{current}\n\n{paragraph}".strip() if current else paragraph
        carry = current

    if carry:
        chunks.append(Chunk(carry, len(chunks), pages[-1].page_number if pages else None))
    return chunks


def split_long_text(text: str, size: int) -> list[str]:
    sentences = re.split(r"(?<=[。！？.!?])\s*", text)
    pieces: list[str] = []
    current = ""
    for sentence in sentences:
        if not sentence:
            continue
        candidate = current + sentence
        if rough_token_len(candidate) <= size:
            current = candidate
        else:
            if current:
                pieces.append(current)
            current = sentence
    if current:
        pieces.append(current)
    return pieces


def build_overlap(text: str, overlap: int) -> str:
    if overlap <= 0:
        return ""
    words = re.findall(r"\S+", text)
    return " ".join(words[-overlap:])


def parse_tags(raw: str | None) -> str:
    if not raw:
        return "[]"
    tags = [tag.strip() for tag in raw.split(",") if tag.strip()]
    return json.dumps(tags, ensure_ascii=False)
