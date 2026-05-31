import { Upload } from "lucide-react";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

const categories = ["精读文献", "组内发表论文", "组会笔记", "技术文档", "其他"];

export function DocumentUploader({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("其他");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("category", category);
    setUploading(true);
    try {
      await api.post("/api/documents/upload", data, { headers: { "Content-Type": "multipart/form-data" } });
      form.reset();
      setCategory("其他");
      setOpen(false);
      onUploaded();
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload size={16} />
          上传文档
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>上传文档</DialogTitle>
          <DialogDescription>支持 PDF、Word、Markdown、纯文本，上传后将自动解析并向量化。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">文件</label>
            <Input name="file" type="file" accept=".pdf,.docx,.md,.txt" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">标题</label>
            <Input name="title" placeholder="默认使用文件名" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">分类</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">标签</label>
            <Input name="tags" placeholder="逗号分隔，如 transformer, attention" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">描述</label>
            <Textarea name="description" placeholder="可选的文档说明" className="min-h-20" />
          </div>
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? "上传中..." : "提交"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
