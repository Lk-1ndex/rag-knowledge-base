import { Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { streamQuery } from "../../hooks/useSSE";
import type { Source } from "../../lib/api";
import { cn, uid } from "../../lib/utils";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { MessageBubble } from "./MessageBubble";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

const categories = ["精读文献", "组内发表论文", "组会笔记", "技术文档", "其他"];

const examples = [
  "总结一下这篇论文的核心贡献",
  "这个方法和已有工作有什么区别？",
  "实验部分用了哪些数据集和指标？",
  "帮我列出文档里提到的关键公式"
];

export function ChatInterface() {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [topK, setTopK] = useState(5);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function toggleCategory(category: string) {
    setSelected((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  }

  async function send(preset?: string) {
    const trimmed = (preset ?? question).trim();
    if (!trimmed || loading) return;
    const userMessage: LocalMessage = { id: uid(), role: "user", content: trimmed };
    const assistantId = uid();
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "" }]);
    setQuestion("");
    setLoading(true);
    try {
      await streamQuery(
        { question: trimmed, categories: selected, top_k: topK, conversation_id: conversationId },
        {
          onDelta: (content) =>
            setMessages((current) =>
              current.map((item) => (item.id === assistantId ? { ...item, content: item.content + content } : item))
            ),
          onSources: (sources) =>
            setMessages((current) => current.map((item) => (item.id === assistantId ? { ...item, sources } : item))),
          onDone: (_usage, nextConversationId) => {
            if (nextConversationId) setConversationId(nextConversationId);
          }
        }
      );
    } catch (error) {
      setMessages((current) =>
        current.map((item) => (item.id === assistantId ? { ...item, content: `请求失败：${String(error)}` } : item))
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-muted/20">
      {/* 分类过滤 + top_k */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-6 py-3">
        {categories.map((category) => {
          const active = selected.includes(category);
          return (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {category}
            </button>
          );
        })}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          top_k
          <input
            type="range"
            min={1}
            max={10}
            value={topK}
            onChange={(event) => setTopK(Number(event.target.value))}
            className="accent-primary"
          />
          <span className="w-4 font-mono font-medium text-foreground">{topK}</span>
        </label>
      </div>

      {/* 消息区 */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto mt-16 max-w-xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles size={26} />
            </div>
            <h2 className="text-lg font-semibold">向知识库提问</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              系统会基于已上传文档检索相关内容，并由 DeepSeek 生成带引用的回答。
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => void send(example)}
                  className="rounded-lg border border-border bg-card p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((message, i) => (
              <MessageBubble
                key={message.id}
                {...message}
                loading={loading && i === messages.length - 1 && message.role === "assistant"}
              />
            ))}
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            className="max-h-40 min-h-[44px] flex-1 resize-none"
            rows={1}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          />
          <Button size="icon" className="h-11 w-11 shrink-0" onClick={() => void send()} disabled={loading || !question.trim()}>
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
