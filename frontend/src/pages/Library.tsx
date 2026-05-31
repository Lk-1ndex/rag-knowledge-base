import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FolderOpen, Search } from "lucide-react";
import { DocumentList } from "../components/library/DocumentList";
import { DocumentUploader } from "../components/library/DocumentUploader";
import { api, type DocumentItem } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";

export default function Library() {
  const [search, setSearch] = useState("");
  const user = useAuthStore((state) => state.user);
  const docs = useQuery({
    queryKey: ["documents", search],
    queryFn: async () => {
      const { data } = await api.get<{ items: DocumentItem[]; total: number }>("/api/documents", {
        params: { search }
      });
      return data.items;
    }
  });

  const items = docs.data ?? [];

  return (
    <div className="h-full overflow-y-auto bg-muted/20 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold">知识库</h1>
            <p className="text-sm text-muted-foreground">管理已上传的文献与文档</p>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索标题"
            />
          </div>
          <DocumentUploader onUploaded={() => void docs.refetch()} />
        </div>

        {docs.isLoading ? (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FolderOpen size={26} />
            </div>
            <h3 className="text-base font-semibold">{search ? "没有匹配的文档" : "知识库还是空的"}</h3>
            <p className="mb-5 mt-1 max-w-sm text-sm text-muted-foreground">
              {search ? "试试其他关键词，或清空搜索框。" : "上传第一份文档，系统会自动解析并建立向量索引。"}
            </p>
            {!search ? <DocumentUploader onUploaded={() => void docs.refetch()} /> : null}
          </div>
        ) : (
          <DocumentList docs={items} user={user} onChanged={() => void docs.refetch()} />
        )}
      </div>
    </div>
  );
}
