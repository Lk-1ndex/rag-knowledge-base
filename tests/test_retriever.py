from services.retriever import merge_adjacent_chunks


def test_merge_adjacent_chunks_combines_same_document_neighbors():
    hits = [
        {"document_id": "doc1", "chunk_index": 1, "chunk_text": "下文", "similarity_score": 0.7},
        {"document_id": "doc1", "chunk_index": 0, "chunk_text": "上文", "similarity_score": 0.8},
        {"document_id": "doc2", "chunk_index": 0, "chunk_text": "其他", "similarity_score": 0.9},
    ]
    merged = merge_adjacent_chunks(hits)
    assert merged[0]["document_id"] == "doc2"
    assert any(item["chunk_text"] == "上文\n\n下文" for item in merged)
