import { useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { api, type ApiKey } from "../lib/api";
import { formatTime } from "../lib/utils";

export default function ApiKeys() {
  const [newKey, setNewKey] = useState("");
  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data } = await api.get<ApiKey[]>("/api/keys");
      return data;
    }
  });

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { data } = await api.post<{ key: string; api_key: ApiKey }>("/api/keys", {
      label: String(form.get("label")),
      expires_at: null
    });
    setNewKey(data.key);
    event.currentTarget.reset();
    await keys.refetch();
  }

  async function revoke(id: number) {
    await api.delete(`/api/keys/${id}`);
    await keys.refetch();
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-5 text-xl font-semibold">API Key 管理</h1>
      <form className="panel mb-5 flex flex-wrap gap-3 p-4" onSubmit={(event) => void create(event)}>
        <input className="input min-w-64 flex-1" name="label" placeholder="备注，如 实验室台式机" required />
        <button className="button">新建 API Key</button>
      </form>
      {newKey ? (
        <div className="mb-5 rounded-lg border border-indigo-500 bg-indigo-500/10 p-4">
          <div className="mb-2 text-sm text-indigo-200">此密钥只显示一次，请立即复制。</div>
          <code className="block break-all rounded bg-bg p-3 font-mono text-sm">{newKey}</code>
        </div>
      ) : null}
      <div className="space-y-3">
        {(keys.data ?? []).map((key) => (
          <div key={key.id} className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
            <div className="mr-auto">
              <div className="font-medium">{key.label}</div>
              <div className="text-slate-500">
                {key.prefix} · 创建 {formatTime(key.created_at)} · 最后使用 {formatTime(key.last_used_at)}
              </div>
            </div>
            <button className="ghost-button" onClick={() => void revoke(key.id)}>
              撤销
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
