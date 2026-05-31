import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import type { Source } from "../../lib/api";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

export function SourceCard({ source, index }: { source: Source; index: number }) {
  const [open, setOpen] = useState(false);
  const score = (source.similarity_score * 100).toFixed(1);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-medium text-primary">
          {index + 1}
        </span>
        <FileText size={15} className="shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{source.document_title}</span>
        <Badge variant="secondary" className="shrink-0">
          {source.category}
        </Badge>
        <Badge variant="outline" className="shrink-0 font-mono">
          {score}%
        </Badge>
        <ChevronDown size={15} className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="border-t border-border px-3 py-2.5">
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{source.chunk_text}</p>
          {source.page_number ? (
            <div className="mt-2 text-xs text-muted-foreground">页码：{source.page_number}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
