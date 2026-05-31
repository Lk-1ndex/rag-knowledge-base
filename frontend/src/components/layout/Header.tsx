import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../lib/api";
import type { User } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";

export function Header({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  async function handleLogout() {
    await logout();
    setUser(null);
    navigate("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-bg px-4">
      <div className="text-sm text-slate-400">私有化 RAG 知识库</div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-300">
          {user?.username} · {user?.role === "admin" ? "管理员" : "组员"}
        </span>
        <button className="ghost-button" onClick={handleLogout} title="登出">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
