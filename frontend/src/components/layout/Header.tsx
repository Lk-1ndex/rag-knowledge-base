import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LogOut, Pencil, User as UserIcon, Loader2 } from "lucide-react";
import { logout, updateMe } from "../../lib/api";
import type { User } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";

export function Header({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    await logout();
    setUser(null);
    queryClient.clear();
    navigate("/login");
  }

  async function handleSaveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const newName = String(form.get("display_name") || "").trim();
    if (!newName) {
      setError("昵称不能为空");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMe(newName);
      setUser(updated);
      queryClient.setQueryData(["me"], updated);
      await queryClient.invalidateQueries({ queryKey: ["group-members"] });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      setEditOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "修改失败");
    } finally {
      setSaving(false);
    }
  }

  const groupRoleLabel = user?.group_role === "admin" ? "组长" : user?.group_role === "member" ? "组员" : "未加组";
  const displayName = user?.display_name || user?.username || "";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="font-serif text-sm font-medium text-muted-foreground">
        {user?.group ? user.group.name : "私有化 RAG 知识库"}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-sm transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initial}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block font-medium text-foreground">{displayName}</span>
            <span className="block text-xs text-muted-foreground">{groupRoleLabel}</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="flex items-center gap-2">
            <UserIcon size={14} />
            {displayName} · {groupRoleLabel}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { setError(""); setEditOpen(true); }}>
            <Pencil size={14} />
            修改昵称
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void handleLogout()}>
            <LogOut size={16} />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改昵称</DialogTitle>
            <DialogDescription>昵称用于在文档列表、组员列表等地方显示，登录账号不变。</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => void handleSaveName(e)}>
            <Input
              name="display_name"
              defaultValue={user?.display_name || ""}
              minLength={1}
              maxLength={64}
              required
              autoFocus
            />
            {error ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
            ) : null}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              保存
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
