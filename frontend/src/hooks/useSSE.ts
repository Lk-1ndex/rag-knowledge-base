import type { Source, Usage } from "../lib/api";

export interface StreamHandlers {
  onDelta: (content: string) => void;
  onSources: (sources: Source[]) => void;
  onDone: (usage: Usage, conversationId?: string) => void;
}

type StreamEvent =
  | { type: "delta"; content: string }
  | { type: "sources"; sources: Source[] }
  | { type: "done"; usage: Usage; conversation_id?: string };

export async function streamQuery(
  payload: { question: string; categories: string[]; top_k: number; conversation_id?: string | null },
  handlers: StreamHandlers
) {
  const response = await fetch("/api/query/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  if (!response.ok || !response.body) {
    throw new Error("流式问答请求失败");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      const event = JSON.parse(line.slice(6)) as StreamEvent;
      if (event.type === "delta") handlers.onDelta(event.content);
      if (event.type === "sources") handlers.onSources(event.sources);
      if (event.type === "done") handlers.onDone(event.usage, event.conversation_id);
    }
  }
}
