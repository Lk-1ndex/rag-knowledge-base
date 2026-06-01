import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, LogOut, Trash2, UserMinus, UserPlus, Users, Loader2 } from "lucide-react";
import {
  demoteSelf,
  dissolveGroup,
  getMyGroup,
  kickMember,
  leaveGroup,
  listGroupMembers,
  promoteMember,
  updateGroup,
  type GroupMember
} from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { formatTime } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";

export default function GroupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.group_role === "admin";

  const group = useQuery({ queryKey: ["my-group"], queryFn: getMyGroup });
  const members = useQuery({ queryKey: ["group-members"], queryFn: listGroupMembers });

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-group"] }),
      queryClient.invalidateQueries({ queryKey: ["group-members"] }),
      queryClient.invalidateQueries({ queryKey: ["me"] })
    ]);
  }

  async function onLeave() {
    if (!confirm("确认退出小组？退出后将无法访问该小组的文档与问答。")) return;
    try {
      await leaveGroup();
      await refreshAll();
      navigate("/onboarding");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "退出失败");
    }
  }

  async function onDissolve() {
    if (!confirm("确认解散小组？所有文档、向量数据将被永久删除，且不可恢复！")) return;
    if (!confirm("再次确认：解散后所有成员将被移出，操作不可撤销。")) return;
    try {
      await dissolveGroup();
      await refreshAll();
      navigate("/onboarding");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "解散失败");
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/20 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users size={20} />
          </div>
          <div className="mr-auto">
            <h1 className="text-xl font-semibold">{group.data?.name ?? "小组"}</h1>
            <p className="text-sm text-muted-foreground">
              {group.data?.description || "暂无简介"} · {group.data?.member_count ?? 0} 人 · {group.data?.document_count ?? 0} 份文档
            </p>
          </div>
          {isAdmin ? (
            <Button variant="destructive" onClick={() => void onDissolve()}>
              <Trash2 size={14} />
              解散小组
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void onLeave()}>
              <LogOut size={14} />
              退出小组
            </Button>
          )}
        </div>

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">成员</TabsTrigger>
            {isAdmin ? <TabsTrigger value="settings">小组配置</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="members">
            <Card className="overflow-hidden">
              {members.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>昵称</TableHead>
                      <TableHead>登录账号</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>加入时间</TableHead>
                      <TableHead className="w-44 text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(members.data ?? []).map((m) => (
                      <MemberRow key={m.id} member={m} currentUserId={user?.id ?? 0} isAdmin={isAdmin} onChanged={() => void refreshAll()} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {isAdmin ? (
            <TabsContent value="settings">
              <GroupSettingsForm onSaved={() => void refreshAll()} />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  currentUserId,
  isAdmin,
  onChanged
}: {
  member: GroupMember;
  currentUserId: number;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSelf = member.id === currentUserId;
  const isMemberAdmin = member.group_role === "admin";

  const promote = useMutation({
    mutationFn: () => promoteMember(member.id),
    onSuccess: onChanged,
    onError: (e: any) => alert(e?.response?.data?.detail || "提升失败")
  });
  const demote = useMutation({
    mutationFn: () => demoteSelf(member.id),
    onSuccess: onChanged,
    onError: (e: any) => alert(e?.response?.data?.detail || "降级失败")
  });
  const kick = useMutation({
    mutationFn: () => kickMember(member.id),
    onSuccess: onChanged,
    onError: (e: any) => alert(e?.response?.data?.detail || "移出失败")
  });

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {(member.display_name || member.username)[0]?.toUpperCase()}
          </span>
          <span className="font-medium">{member.display_name || member.username}</span>
          {isSelf ? <Badge variant="outline">我</Badge> : null}
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">{member.username}</TableCell>
      <TableCell>
        {isMemberAdmin ? (
          <Badge variant="default"><Crown size={11} className="mr-1" />管理员</Badge>
        ) : (
          <Badge variant="secondary">组员</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{member.joined_at ? formatTime(member.joined_at) : "-"}</TableCell>
      <TableCell className="text-right">
        {isAdmin && !isMemberAdmin && !isSelf ? (
          <div className="flex justify-end gap-1.5">
            <Button variant="outline" size="sm" disabled={promote.isPending} onClick={() => promote.mutate()}>
              <UserPlus size={13} />
              提为管理员
            </Button>
            <Button variant="outline" size="sm" disabled={kick.isPending} onClick={() => {
              if (confirm(`确认将 ${member.display_name || member.username} 移出小组？`)) kick.mutate();
            }}>
              <UserMinus size={13} />
              移出
            </Button>
          </div>
        ) : null}
        {isAdmin && isSelf && isMemberAdmin ? (
          <Button variant="outline" size="sm" disabled={demote.isPending} onClick={() => {
            if (confirm("确认将自己降为普通成员？")) demote.mutate();
          }}>
            自己降级
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

function GroupSettingsForm({ onSaved }: { onSaved: () => void }) {
  const group = useQuery({ queryKey: ["my-group"], queryFn: getMyGroup });
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await updateGroup({
        name: String(form.get("name")),
        description: String(form.get("description") || ""),
        invite_code: String(form.get("invite_code")),
        system_prompt: String(form.get("system_prompt")),
        default_top_k: Number(form.get("default_top_k")),
        rate_limit_per_minute: Number(form.get("rate_limit_per_minute"))
      });
      onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "保存失败");
    }
  }

  if (group.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!group.data) return null;

  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(e) => void save(e)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">小组名称</label>
            <Input name="name" defaultValue={group.data.name} required minLength={2} maxLength={64} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">邀请码</label>
            <Input name="invite_code" defaultValue={group.data.invite_code} required minLength={4} maxLength={64} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">简介</label>
          <Textarea name="description" defaultValue={group.data.description} maxLength={500} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">系统提示词</label>
          <Textarea className="min-h-60" name="system_prompt" defaultValue={group.data.system_prompt} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">默认 top_k</label>
            <Input name="default_top_k" type="number" min={1} max={10} defaultValue={group.data.default_top_k} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">每分钟限流</label>
            <Input name="rate_limit_per_minute" type="number" min={1} defaultValue={group.data.rate_limit_per_minute} />
          </div>
        </div>
        <Button type="submit">{saved ? "已保存" : "保存配置"}</Button>
      </form>
    </Card>
  );
}
