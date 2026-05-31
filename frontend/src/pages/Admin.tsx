import { useQuery } from "@tanstack/react-query";
import { FormEvent } from "react";
import { Activity, FileText, Layers, MessageSquare, Users } from "lucide-react";
import { api, type AdminConfig, type User } from "../lib/api";
import { formatTime } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { useState } from "react";

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
  return (
    <div className="h-full overflow-y-auto bg-muted/20 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">管理员面板</h1>
          <p className="text-sm text-muted-foreground">用户、统计、系统配置与操作日志</p>
        </div>
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">用户管理</TabsTrigger>
            <TabsTrigger value="stats">系统统计</TabsTrigger>
            <TabsTrigger value="config">系统配置</TabsTrigger>
            <TabsTrigger value="logs">操作日志</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          <TabsContent value="stats">
            <StatsTab />
          </TabsContent>
          <TabsContent value="config">
            <ConfigTab />
          </TabsContent>
          <TabsContent value="logs">
            <LogsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function UsersTab() {
  const [role, setRole] = useState("member");
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.get<{ items: User[]; total: number }>("/api/admin/users");
      return data.items;
    }
  });

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await api.post("/api/admin/users", {
      username: String(data.get("username")),
      password: String(data.get("password")),
      role
    });
    form.reset();
    setRole("member");
    await users.refetch();
  }

  async function toggle(user: User) {
    await api.patch(`/api/admin/users/${user.id}`, { is_active: !user.is_active });
    await users.refetch();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => void create(event)}>
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">用户名</label>
            <Input name="username" placeholder="用户名" required />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">初始密码</label>
            <Input name="password" placeholder="初始密码" required />
          </div>
          <div className="w-32 space-y-1.5">
            <label className="text-sm font-medium">角色</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">member</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">创建用户</Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>用户名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users.data ?? []).map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  {user.is_active ? <Badge variant="success">启用</Badge> : <Badge variant="outline">禁用</Badge>}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatTime(user.created_at)}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => void toggle(user)}>
                    {user.is_active ? "禁用" : "启用"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
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

  if (stats.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  const cards = item
    ? [
        { label: "总文档数", value: item.total_documents, icon: FileText },
        { label: "总 Chunk 数", value: item.total_chunks, icon: Layers },
        { label: "用户数", value: item.total_users, icon: Users },
        { label: "查询次数", value: item.monthly_queries, icon: MessageSquare }
      ]
    : [];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon size={16} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-semibold tabular-nums">{value}</div>
        </Card>
      ))}
      {item ? (
        <Card className="p-5 sm:col-span-2 lg:col-span-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">累计 Token 消耗</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Activity size={16} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-semibold tabular-nums">{item.total_tokens.toLocaleString()}</div>
        </Card>
      ) : null}
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
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.patch("/api/admin/config", {
      system_prompt: String(form.get("system_prompt")),
      default_top_k: Number(form.get("default_top_k")),
      rate_limit_per_minute: Number(form.get("rate_limit_per_minute"))
    });
    await config.refetch();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (config.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!config.data) return null;

  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(event) => void save(event)}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">系统提示词</label>
          <Textarea className="min-h-60" name="system_prompt" defaultValue={config.data.system_prompt} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">默认 top_k</label>
            <Input name="default_top_k" type="number" min={1} max={10} defaultValue={config.data.default_top_k} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">每分钟限流</label>
            <Input
              name="rate_limit_per_minute"
              type="number"
              min={1}
              defaultValue={config.data.rate_limit_per_minute}
            />
          </div>
        </div>
        <Button type="submit">{saved ? "已保存" : "保存配置"}</Button>
      </form>
    </Card>
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

  if (logs.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {(logs.data ?? []).map((log) => (
        <Card key={log.id} className="p-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {log.action}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTime(log.created_at)} · user {log.user_id ?? "-"} · {log.ip}
            </span>
          </div>
          {log.detail ? <div className="mt-1.5 text-sm text-muted-foreground">{log.detail}</div> : null}
        </Card>
      ))}
    </div>
  );
}
