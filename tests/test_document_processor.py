from pathlib import Path

import pytest

from services.document_processor import (
    chunk_blocks,
    chunk_pages,
    extract_markdown_blocks,
    file_type_from_name,
    secure_filename,
    validate_magic_bytes,
    Block,
    TextPage,
)


def test_file_type_from_name_accepts_supported_formats():
    assert file_type_from_name("paper.pdf") == "pdf"
    assert file_type_from_name("notes.docx") == "docx"
    assert file_type_from_name("meeting.md") == "md"
    assert file_type_from_name("plain.txt") == "txt"


def test_file_type_from_name_rejects_unknown_format():
    with pytest.raises(ValueError):
        file_type_from_name("archive.zip")


def test_secure_filename_removes_path_and_unsafe_chars():
    assert secure_filename("../../论文:草稿?.pdf") == "论文_草稿_.pdf"


def test_validate_magic_bytes_checks_pdf_header():
    validate_magic_bytes("paper.pdf", b"%PDF-1.7 content")
    with pytest.raises(ValueError):
        validate_magic_bytes("paper.pdf", b"not a pdf")


def test_chunk_pages_preserves_page_number_and_paragraph_boundary():
    pages = [TextPage("第一段内容。\n\n第二段内容。\n\n第三段内容。", page_number=3)]
    chunks = chunk_pages(pages, chunk_size=12, chunk_overlap=2)
    assert chunks
    assert all(chunk.page_number == 3 for chunk in chunks)
    assert "第一段内容" in chunks[0].text


def test_extract_markdown_blocks_marks_heading_levels():
    text = "# 方法\n\n正文一。\n\n## 信道估计\n\n正文二。"
    blocks = extract_markdown_blocks(text)
    headings = [(b.text, b.heading_level) for b in blocks if b.heading_level > 0]
    assert ("方法", 1) in headings
    assert ("信道估计", 2) in headings


def test_chunk_blocks_injects_heading_path_prefix():
    blocks = [
        Block(text="方法", heading_level=1),
        Block(text="信道估计", heading_level=2),
        Block(text="这一段属于信道估计小节。", heading_level=0),
    ]
    chunks = chunk_blocks(blocks, chunk_size=100, chunk_overlap=0)
    assert chunks
    assert chunks[0].text.startswith("[方法 > 信道估计]")
    assert "这一段属于信道估计小节" in chunks[0].text


def test_chunk_blocks_breaks_at_heading_boundary():
    blocks = [
        Block(text="引言", heading_level=1),
        Block(text="引言正文。", heading_level=0),
        Block(text="结论", heading_level=1),
        Block(text="结论正文。", heading_level=0),
    ]
    chunks = chunk_blocks(blocks, chunk_size=1000, chunk_overlap=0)
    assert len(chunks) == 2
    assert chunks[0].text.startswith("[引言]")
    assert chunks[1].text.startswith("[结论]")
