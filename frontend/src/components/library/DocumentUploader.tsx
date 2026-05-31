import { Upload } from "lucide-react";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api";

const categories = ["精读文献", "组内发表论文", "组会笔记", "技术文档", "其他"];

export function DocumentUploader({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setUploading(true);
    try {
      await api.post("/api/documents/upload", data, { headers: { "Content-Type": "multipart/form-data" } });
      form.reset();
      setOpen(false);
      onUploaded();
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button className="button" onClick={() => setOpen(true)}>
        <Upload size={16} /> 上传文档
      </button>
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/50">
          <div className="ml-auto h-full w-full max-w-md bg-panel p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">上传文档</h2>
              <button className="ghost-button" onClick={() => setOpen(false)}>
                关闭
              </button>
            </div>
            <form className="space-y-4" onSubmit={(event) => void submit(event)}>
              <input className="input w-full" name="file" type="file" accept=".pdf,.docx,.md,.txt" required />
              <input className="input w-full" name="title" placeholder="标题（默认文件名）" />
              <select className="input w-full" name="category" defaultValue="其他">
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <input className="input w-full" name="tags" placeholder="标签，逗号分隔" />
              <textarea className="input min-h-28 w-full" name="description" placeholder="描述" />
              <button className="button w-full" disabled={uploading}>
                {uploading ? "上传中..." : "提交"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
