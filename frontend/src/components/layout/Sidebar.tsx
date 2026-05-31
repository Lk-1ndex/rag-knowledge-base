import { KeyRound, Library, MessageSquare, Settings, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { User } from "../../lib/api";

const base = "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800";
const active = "bg-slate-800 text-white";

export function Sidebar({ user }: { user: User | null }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-panel p-4 md:block">
      <div className="mb-8">
        <div className="text-lg font-semibold">研究组知识库</div>
        <div className="mt-1 text-xs text-slate-400">Research RAG KB</div>
      </div>
      <nav className="space-y-1">
        <NavLink to="/" className={({ isActive }) => `${base} ${isActive ? active : ""}`}>
          <MessageSquare size={16} /> 问答
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => `${base} ${isActive ? active : ""}`}>
          <Library size={16} /> 知识库
        </NavLink>
        <NavLink to="/api-keys" className={({ isActive }) => `${base} ${isActive ? active : ""}`}>
          <KeyRound size={16} /> API Key
        </NavLink>
        {user?.role === "admin" ? (
          <NavLink to="/admin" className={({ isActive }) => `${base} ${isActive ? active : ""}`}>
            <ShieldCheck size={16} /> 管理员
          </NavLink>
        ) : null}
      </nav>
      <div className="absolute bottom-4 text-xs text-slate-500">
        <Settings size={14} className="mb-2" />
        OpenAI 费用由管理员统一配置
      </div>
    </aside>
  );
}
