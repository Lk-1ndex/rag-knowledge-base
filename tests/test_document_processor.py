from pathlib import Path

import pytest

from services.document_processor import (
    chunk_pages,
    file_type_from_name,
    secure_filename,
    validate_magic_bytes,
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
