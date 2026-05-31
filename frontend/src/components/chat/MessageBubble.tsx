import { Bot, User as UserIcon } from "lucide-react";
import type { Source } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Markdown } from "./Markdown";
import { SourceCard } from "./SourceCard";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  loading?: boolean;
}

export function MessageBubble({ role, content, sources = [], loading = false }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
        )}
      >
        {isUser ? <UserIcon size={16} /> : <Bot size={16} />}
      </div>
      <div className={cn("flex min-w-0 max-w-[calc(100%-3rem)] flex-col gap-2", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-7",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm border border-border bg-card text-foreground"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : content ? (
            <Markdown content={content} />
          ) : loading ? (
            <span className="inline-flex items-center gap-1 py-1 text-muted-foreground">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
            </span>
          ) : null}
        </div>
        {!isUser && sources.length > 0 ? (
          <div className="w-full space-y-1.5">
            <div className="px-1 text-xs font-medium text-muted-foreground">参考来源 · {sources.length}</div>
            {sources.map((source, i) => (
              <SourceCard
                key={`${source.document_id}-${source.chunk_index ?? source.chunk_text.slice(0, 12)}`}
                source={source}
                index={i}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
