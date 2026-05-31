import { LogOut, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../lib/api";
import type { User } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";

export function Header({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  async function handleLogout() {
    await logout();
    setUser(null);
    navigate("/login");
  }

  const roleLabel = user?.role === "admin" ? "管理员" : "组员";
  const initial = user?.username?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="font-serif text-sm font-medium text-muted-foreground">私有化 RAG 知识库</div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-sm transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initial}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block font-medium text-foreground">{user?.username}</span>
            <span className="block text-xs text-muted-foreground">{roleLabel}</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="flex items-center gap-2">
            <UserIcon size={14} />
            {user?.username} · {roleLabel}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void handleLogout()}>
            <LogOut size={16} />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
