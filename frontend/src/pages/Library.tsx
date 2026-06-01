import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FolderOpen, Search } from "lucide-react";
import { DocumentList } from "../components/library/DocumentList";
import { DocumentUploader } from "../components/library/DocumentUploader";
import { api, type DocumentItem } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";

const categories = ["全部", "精读文献", "组内发表论文", "组会笔记", "技术文档", "其他"];

export default function Library() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [uploader, setUploader] = useState("全部");
  const user = useAuthStore((state) => state.user);

  const docs = useQuery({
    queryKey: ["documents", search, category, uploader],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (category !== "全部") params.category = category;
      if (uploader !== "全部") params.uploader = uploader;
      const { data } = await api.get<{ items: DocumentItem[]; total: number }>("/api/documents", { params });
      return data.items;
    }
  });

  const uploaders = useQuery({
    queryKey: ["document-uploaders"],
    queryFn: async () => {
      const { data } = await api.get<{ items: DocumentItem[]; total: number }>("/api/documents", {
        params: { limit: 200 }
      });
      const names = [...new Set(data.items.map((d) => d.uploader_name).filter(Boolean))];
      return names.sort();
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

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="按分类筛选" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={uploader} onValueChange={setUploader}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="按上传者筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              {(uploaders.data ?? []).map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
