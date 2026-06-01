import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, LogIn, LogOut } from "lucide-react";
import { createGroup, joinGroup, logout } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuthStore } from "../stores/authStore";

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    setLoading(true);
    try {
      await createGroup(
        String(form.get("name")),
        String(form.get("description") || ""),
        String(form.get("invite_code"))
      );
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "创建小组失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    setLoading(true);
    try {
      await joinGroup(String(form.get("invite_code")));
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "加入小组失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    queryClient.clear();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">欢迎</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">你还没有加入任何小组，请创建或加入一个</p>
        </div>

        <Tabs defaultValue="join">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="join"><LogIn size={14} className="mr-1.5" />加入小组</TabsTrigger>
            <TabsTrigger value="create"><Plus size={14} className="mr-1.5" />创建小组</TabsTrigger>
          </TabsList>

          <TabsContent value="join">
            <form className="space-y-3 pt-3" onSubmit={(e) => void handleJoin(e)}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">邀请码</label>
                <Input name="invite_code" placeholder="向组长索取邀请码" required />
              </div>
              {error ? <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                加入
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="create">
            <form className="space-y-3 pt-3" onSubmit={(e) => void handleCreate(e)}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">小组名称</label>
                <Input name="name" placeholder="如：通信信号处理组" required minLength={2} maxLength={64} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">简介（可选）</label>
                <Textarea name="description" placeholder="一句话介绍这个小组" maxLength={500} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">邀请码</label>
                <Input name="invite_code" placeholder="设置一个邀请码（4-64 字符）" required minLength={4} maxLength={64} />
                <p className="text-xs text-muted-foreground">分享给同门用来加入小组</p>
              </div>
              {error ? <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                创建并成为管理员
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <button
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut size={12} />
            退出登录
          </button>
        </div>
      </Card>
    </div>
  );
}
