import { BookOpen, KeyRound, Library, MessageSquare, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { User } from "../../lib/api";
import { cn } from "../../lib/utils";

const navItems = [
  { to: "/", label: "问答", icon: MessageSquare, end: true },
  { to: "/library", label: "知识库", icon: Library, end: false },
  { to: "/group", label: "小组", icon: Users, end: false },
  { to: "/api-keys", label: "API Key", icon: KeyRound, end: false }
];

export function Sidebar({ user }: { user: User | null }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-secondary/40 md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <BookOpen size={18} />
        </div>
        <div className="leading-tight">
          <div className="font-serif text-base font-semibold tracking-tight">研究组知识库</div>
          <div className="text-xs text-muted-foreground">{user?.group?.name ?? "Research RAG KB"}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-sm">
          基于 DeepSeek + BGE-M3 的私有化检索问答
        </div>
      </div>
    </aside>
  );
}
