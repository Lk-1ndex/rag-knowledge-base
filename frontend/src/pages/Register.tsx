import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Loader2 } from "lucide-react";
import { register } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";

export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    try {
      const user = await register(
        String(form.get("username")),
        String(form.get("display_name")),
        password
      );
      setUser(user);
      queryClient.setQueryData(["me"], user);
      navigate("/");
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      setError(msg || "注册失败，请检查输入");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm animate-slide-up p-8 shadow-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <BookOpen size={26} />
          </div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">注册账号</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">注册后可创建小组或使用邀请码加入小组</p>
        </div>
        <form className="space-y-3" onSubmit={(event) => void submit(event)}>
          <Input name="username" placeholder="登录账号（英文/数字/下划线）" autoComplete="username" required minLength={2} maxLength={64} pattern="[A-Za-z0-9_]+" title="只能包含英文、数字和下划线" />
          <Input name="display_name" placeholder="昵称（可中文，如：张三）" required minLength={1} maxLength={64} />
          <Input name="password" type="password" placeholder="密码（至少8位）" autoComplete="new-password" required minLength={8} />
          <Input name="confirm" type="password" placeholder="确认密码" autoComplete="new-password" required minLength={8} />
          {error ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "注册中..." : "注册"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          已有账号？<Link to="/login" className="text-primary hover:underline">去登录</Link>
        </p>
      </Card>
    </div>
  );
}