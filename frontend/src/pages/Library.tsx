import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DocumentList } from "../components/library/DocumentList";
import { DocumentUploader } from "../components/library/DocumentUploader";
import { api, type DocumentItem } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

export default function Library() {
  const [search, setSearch] = useState("");
  const user = useAuthStore((state) => state.user);
  const docs = useQuery({
    queryKey: ["documents", search],
    queryFn: async () => {
      const { data } = await api.get<{ items: DocumentItem[]; total: number }>("/api/documents", { params: { search } });
      return data.items;
    }
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-xl font-semibold">知识库</h1>
        <input className="input w-64" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题" />
        <DocumentUploader onUploaded={() => void docs.refetch()} />
      </div>
      <DocumentList docs={docs.data ?? []} user={user} onChanged={() => void docs.refetch()} />
    </div>
  );
}
