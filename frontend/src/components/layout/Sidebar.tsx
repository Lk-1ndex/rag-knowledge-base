import { KeyRound, Library, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { User } from "../../lib/api";
import { cn } from "../../lib/utils";

const navItems = [
  { to: "/", label: "问答", icon: MessageSquare, end: true },
  { to: "/library", label: "知识库", icon: Library, end: false },
  { to: "/api-keys", label: "API Key", icon: KeyRound, end: false }
];

export function Sidebar({ user }: { user: User | null }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-muted/30 md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles size={18} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">研究组知识库</div>
          <div className="text-xs text-muted-foreground">Research RAG KB</div>
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
        {user?.role === "admin" ? (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <ShieldCheck size={18} />
            管理员
          </NavLink>
        ) : null}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-card p-3 text-xs text-muted-foreground shadow-sm">
          基于 DeepSeek + 本地 BGE-M3 的私有化检索问答
        </div>
      </div>
    </aside>
  );
}
