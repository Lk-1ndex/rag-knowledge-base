import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const user = await login(String(form.get("username")), String(form.get("password")));
      setUser(user);
      queryClient.setQueryData(["me"], user);
      navigate("/");
    } catch {
      setError("登录失败，请检查用户名和密码");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form className="panel w-full max-w-sm space-y-4 p-6" onSubmit={(event) => void submit(event)}>
        <div>
          <h1 className="text-xl font-semibold">研究组知识库</h1>
          <p className="mt-1 text-sm text-slate-400">组内文献检索与 RAG 问答系统</p>
        </div>
        <input className="input w-full" name="username" placeholder="用户名" autoComplete="username" />
        <input className="input w-full" name="password" type="password" placeholder="密码" autoComplete="current-password" />
        {error ? <div className="text-sm text-red-300">{error}</div> : null}
        <button className="button w-full">登录</button>
      </form>
    </div>
  );
}
