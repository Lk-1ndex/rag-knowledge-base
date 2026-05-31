import { useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { api, type ApiKey } from "../lib/api";
import { formatTime } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";

export default function ApiKeys() {
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);
  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data } = await api.get<ApiKey[]>("/api/keys");
      return data;
    }
  });

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const { data: res } = await api.post<{ key: string; api_key: ApiKey }>("/api/keys", {
      label: String(data.get("label")),
      expires_at: null
    });
    setNewKey(res.key);
    form.reset();
    await keys.refetch();
  }

  async function revoke(id: number) {
    if (!confirm("确认撤销该 API Key？使用它的客户端将立即失效。")) return;
    await api.delete(`/api/keys/${id}`);
    await keys.refetch();
  }

  async function copyKey() {
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const items = keys.data ?? [];

  return (
    <div className="h-full overflow-y-auto bg-muted/20 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">API Key 管理</h1>
          <p className="text-sm text-muted-foreground">用于在脚本或外部客户端中调用问答接口</p>
        </div>

        <Card className="mb-5 p-4">
          <form className="flex flex-wrap gap-3" onSubmit={(event) => void create(event)}>
            <Input className="min-w-64 flex-1" name="label" placeholder="备注，如 实验室台式机" required />
            <Button type="submit">
              <KeyRound size={16} />
              新建 Key
            </Button>
          </form>
        </Card>

        {newKey ? (
          <Card className="mb-5 border-primary/40 bg-primary/5 p-4">
            <div className="mb-2 text-sm font-medium text-primary">此密钥只显示一次，请立即复制保存。</div>
            <div className="flex items-center gap-2">
              <code className="block flex-1 break-all rounded-md border border-border bg-card p-3 font-mono text-sm">
                {newKey}
              </code>
              <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={() => void copyKey()}>
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </Button>
            </div>
          </Card>
        ) : null}

        {keys.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <KeyRound size={22} />
            </div>
            <p className="text-sm text-muted-foreground">还没有 API Key，新建一个开始使用。</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((key) => (
              <Card key={key.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <KeyRound size={16} />
                </div>
                <div className="mr-auto min-w-0">
                  <div className="font-medium">{key.label}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{key.prefix}</span> · 创建 {formatTime(key.created_at)} · 最后使用{" "}
                    {formatTime(key.last_used_at)}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => void revoke(key.id)}>
                  撤销
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
