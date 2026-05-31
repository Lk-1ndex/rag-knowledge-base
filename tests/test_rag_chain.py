import json

from services.rag_chain import sse_line


def test_sse_line_uses_expected_data_prefix():
    line = sse_line({"type": "delta", "content": "生成"})
    assert line.startswith("data: ")
    assert line.endswith("\n\n")
    assert json.loads(line.removeprefix("data: ").strip()) == {"type": "delta", "content": "生成"}
