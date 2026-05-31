import { Trash2 } from "lucide-react";
import type { DocumentItem } from "../../lib/api";
import { api, type User } from "../../lib/api";
import { formatTime } from "../../lib/utils";

export function DocumentList({ docs, user, onChanged }: { docs: DocumentItem[]; user: User | null; onChanged: () => void }) {
  async function remove(id: string) {
    if (!confirm("确认删除该文档及其向量？")) return;
    await api.delete(`/api/documents/${id}`);
    onChanged();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-panel text-slate-400">
          <tr>
            <th className="p-3">标题</th>
            <th className="p-3">分类</th>
            <th className="p-3">状态</th>
            <th className="p-3">Chunk</th>
            <th className="p-3">上传时间</th>
            <th className="p-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <tr key={doc.id} className="border-t border-line">
              <td className="p-3">
                <div className="font-medium text-slate-100">{doc.title}</div>
                <div className="text-xs text-slate-500">{doc.filename}</div>
              </td>
              <td className="p-3">{doc.category}</td>
              <td className="p-3">{doc.status}</td>
              <td className="p-3">{doc.chunk_count}</td>
              <td className="p-3">{formatTime(doc.upload_time)}</td>
              <td className="p-3">
                {user?.role === "admin" || user?.id === doc.uploaded_by ? (
                  <button className="ghost-button" onClick={() => void remove(doc.id)} title="删除">
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
