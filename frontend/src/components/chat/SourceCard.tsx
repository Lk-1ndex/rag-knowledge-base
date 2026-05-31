import type { Source } from "../../lib/api";

export function SourceCard({ source }: { source: Source }) {
  return (
    <details className="rounded-md border border-line bg-bg p-3 text-sm">
      <summary className="cursor-pointer text-slate-200">
        {source.document_title} · {source.category} · {(source.similarity_score * 100).toFixed(1)}%
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-slate-400">{source.chunk_text}</p>
      {source.page_number ? <div className="mt-2 text-xs text-slate-500">页码：{source.page_number}</div> : null}
    </details>
  );
}
