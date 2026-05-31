import type { Source } from "../../lib/api";
import { SourceCard } from "./SourceCard";

export function MessageBubble({ role, content, sources = [] }: { role: "user" | "assistant"; content: string; sources?: Source[] }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-3xl rounded-lg px-4 py-3 ${isUser ? "bg-brand text-white" : "bg-panel text-slate-100"}`}>
        <div className="whitespace-pre-wrap text-sm leading-6">{content}</div>
        {!isUser && sources.length > 0 ? (
          <div className="mt-3 space-y-2">
            {sources.map((source) => (
              <SourceCard key={`${source.document_id}-${source.chunk_index ?? source.chunk_text.slice(0, 12)}`} source={source} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
