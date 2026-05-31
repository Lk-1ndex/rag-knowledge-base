import { useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { api, type AdminConfig, type User } from "../lib/api";
import { formatTime } from "../lib/utils";

interface Stats {
  total_documents: number;
  total_chunks: number;
  total_users: number;
  monthly_queries: number;
  total_tokens: number;
}

interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  detail: string;
  ip: string;
  created_at: string;
}

export default function Admin() {
  const [tab, setTab] = useState<"users" | "stats" | "config" | "logs">("users");
  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-5 text-xl font-semibold">管理员面板</h1>
      <div className="mb-5 flex gap-2">
        {[
          ["users", "用户管理"],
          ["stats", "系统统计"],
          ["config", "系统配置"],
          ["logs", "操作日志"]
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? "button" : "ghost-button"} onClick={() => setTab(key as typeof tab)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "users" ? <UsersTab /> : null}
      {tab === "stats" ? <StatsTab /> : null}
      {tab === "config" ? <ConfigTab /> : null}
      {tab === "logs" ? <LogsTab /> : null}
    </div>
  );
}

function UsersTab() {
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.get<{ items: User[]; total: number }>("/api/admin/users");
      return data.items;
    }
  });

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.post("/api/admin/users", {
      username: String(form.get("username")),
      password: String(form.get("password")),
      role: String(form.get("role"))
    });
    event.currentTarget.reset();
    await users.refetch();
  }

  async function toggle(user: User) {
    await api.patch(`/api/admin/users/${user.id}`, { is_active: !user.is_active });
    await users.refetch();
  }

  return (
    <div className="space-y-4">
      <form className="panel flex flex-wrap gap-3 p-4" onSubmit={(event) => void create(event)}>
        <input className="input" name="username" placeholder="用户名" required />
        <input className="input" name="password" placeholder="初始密码" required />
        <select className="input" name="role" defaultValue="member">
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
        <button className="button">创建用户</button>
      </form>
      {(users.data ?? []).map((user) => (
        <div key={user.id} className="panel flex items-center gap-3 p-4 text-sm">
          <div className="mr-auto">
            <div className="font-medium">{user.username}</div>
            <div className="text-slate-500">
              {user.role} · {user.is_active ? "启用" : "禁用"} · {formatTime(user.created_at)}
            </div>
          </div>
          <button className="ghost-button" onClick={() => void toggle(user)}>
            {user.is_active ? "禁用" : "启用"}
          </button>
        </div>
      ))}
    </div>
  );
}

function StatsTab() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data } = await api.get<Stats>("/api/admin/stats");
      return data;
    }
  });
  const item = stats.data;
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {item
        ? [
            ["总文档数", item.total_documents],
            ["总 Chunk 数", item.total_chunks],
            ["用户数", item.total_users],
            ["查询次数", item.monthly_queries]
          ].map(([label, value]) => (
            <div key={label} className="panel p-4">
              <div className="text-sm text-slate-400">{label}</div>
              <div className="mt-2 text-3xl font-semibold">{value}</div>
            </div>
          ))
        : null}
    </div>
  );
}

function ConfigTab() {
  const config = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const { data } = await api.get<AdminConfig>("/api/admin/config");
      return data;
    }
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.patch("/api/admin/config", {
      system_prompt: String(form.get("system_prompt")),
      default_top_k: Number(form.get("default_top_k")),
      rate_limit_per_minute: Number(form.get("rate_limit_per_minute"))
    });
    await config.refetch();
  }

  if (!config.data) return null;
  return (
    <form className="panel space-y-4 p-4" onSubmit={(event) => void save(event)}>
      <textarea className="input min-h-60 w-full" name="system_prompt" defaultValue={config.data.system_prompt} />
      <input className="input w-full" name="default_top_k" type="number" min={1} max={10} defaultValue={config.data.default_top_k} />
      <input
        className="input w-full"
        name="rate_limit_per_minute"
        type="number"
        min={1}
        defaultValue={config.data.rate_limit_per_minute}
      />
      <button className="button">保存配置</button>
    </form>
  );
}

function LogsTab() {
  const logs = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const { data } = await api.get<{ items: AuditLog[]; total: number }>("/api/admin/logs");
      return data.items;
    }
  });
  return (
    <div className="space-y-2">
      {(logs.data ?? []).map((log) => (
        <div key={log.id} className="panel p-3 text-sm">
          <div className="text-slate-200">{log.action}</div>
          <div className="text-slate-500">
            {formatTime(log.created_at)} · user {log.user_id ?? "-"} · {log.ip}
          </div>
          <div className="mt-1 text-slate-400">{log.detail}</div>
        </div>
      ))}
    </div>
  );
}
