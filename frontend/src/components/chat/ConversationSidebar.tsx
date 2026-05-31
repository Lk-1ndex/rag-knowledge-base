import { MessageSquare, Plus, Trash2 } from "lucide-react";
import type { ConversationSummary } from "../../lib/api";
import { cn, formatTime } from "../../lib/utils";

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeId,
  loading = false,
  onSelect,
  onNew,
  onDelete
}: ConversationSidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-muted/20">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          <Plus size={16} />
          新对话
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="space-y-1.5 px-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">还没有对话记录</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => {
              const active = conversation.id === activeId;
              return (
                <li key={conversation.id}>
                  <div
                    className={cn(
                      "group flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    onClick={() => onSelect(conversation.id)}
                  >
                    <MessageSquare size={15} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{conversation.title || "未命名对话"}</div>
                      <div className="truncate text-xs text-muted-foreground">{formatTime(conversation.updated_at)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(conversation.id);
                      }}
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      title="删除对话"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
