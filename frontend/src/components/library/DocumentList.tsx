import { FileText, FileType, FileCode, File, Loader2, Trash2 } from "lucide-react";
import type { DocumentItem } from "../../lib/api";
import { api, type User } from "../../lib/api";
import { formatFileSize, formatTimeShort } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

function FileIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t.includes("pdf")) return <FileText size={18} className="text-red-500" />;
  if (t.includes("doc")) return <FileType size={18} className="text-blue-500" />;
  if (t.includes("md")) return <FileCode size={18} className="text-purple-500" />;
  if (t.includes("txt")) return <FileText size={18} className="text-muted-foreground" />;
  return <File size={18} className="text-muted-foreground" />;
}

function StatusBadge({ status }: { status: DocumentItem["status"] }) {
  if (status === "ready") return <Badge variant="success">就绪</Badge>;
  if (status === "error") return <Badge variant="destructive">失败</Badge>;
  return (
    <Badge variant="warning">
      <Loader2 size={11} className="animate-spin" />
      处理中
    </Badge>
  );
}

function titleMatchesFilename(title: string, filename: string) {
  const cleanFilename = filename.replace(/\.[^.]+$/, "");
  return title === filename || title === cleanFilename;
}

export function DocumentList({
  docs,
  user,
  onChanged
}: {
  docs: DocumentItem[];
  user: User | null;
  onChanged: () => void;
}) {
  async function remove(id: string) {
    if (!confirm("确认删除该文档及其向量？")) return;
    await api.delete(`/api/documents/${id}`);
    onChanged();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>标题</TableHead>
            <TableHead className="w-24 whitespace-nowrap">分类</TableHead>
            <TableHead className="w-20 whitespace-nowrap">状态</TableHead>
            <TableHead className="w-16 text-right">Chunk</TableHead>
            <TableHead className="w-20 whitespace-nowrap">大小</TableHead>
            <TableHead className="w-24 whitespace-nowrap">上传者</TableHead>
            <TableHead className="w-32 whitespace-nowrap">上传时间</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc) => {
            const showFilename = !titleMatchesFilename(doc.title, doc.filename);
            return (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <FileIcon type={doc.file_type} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground" title={doc.title}>{doc.title}</div>
                      {showFilename ? (
                        <div className="truncate text-xs text-muted-foreground" title={doc.filename}>{doc.filename}</div>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="secondary">{doc.category}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <StatusBadge status={doc.status} />
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{doc.chunk_count}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatFileSize(doc.file_size)}</TableCell>
                <TableCell className="truncate text-muted-foreground" title={doc.uploader_name || "-"}>{doc.uploader_name || "-"}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatTimeShort(doc.upload_time)}</TableCell>
                <TableCell>
                  {user?.group_role === "admin" || user?.id === doc.uploaded_by ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => void remove(doc.id)}
                      title="删除"
                    >
                      <Trash2 size={15} />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
