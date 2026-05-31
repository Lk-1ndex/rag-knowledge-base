import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { login } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const user = await login(String(form.get("username")), String(form.get("password")));
      setUser(user);
      queryClient.setQueryData(["me"], user);
      navigate("/");
    } catch {
      setError("登录失败，请检查用户名和密码");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles size={24} />
          </div>
          <h1 className="text-xl font-semibold">研究组知识库</h1>
          <p className="mt-1 text-sm text-muted-foreground">组内文献检索与 RAG 问答系统</p>
        </div>
        <form className="space-y-3" onSubmit={(event) => void submit(event)}>
          <Input name="username" placeholder="用户名" autoComplete="username" required />
          <Input
            name="password"
            type="password"
            placeholder="密码"
            autoComplete="current-password"
            required
          />
          {error ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
