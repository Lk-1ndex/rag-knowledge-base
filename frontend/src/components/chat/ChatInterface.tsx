import { Send } from "lucide-react";
import { useState } from "react";
import { streamQuery } from "../../hooks/useSSE";
import type { Source } from "../../lib/api";
import { MessageBubble } from "./MessageBubble";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

const categories = ["精读文献", "组内发表论文", "组会笔记", "技术文档", "其他"];

export function ChatInterface() {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [topK, setTopK] = useState(5);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleCategory(category: string) {
    setSelected((current) => (current.includes(category) ? current.filter((item) => item !== category) : [...current, category]));
  }

  async function send() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    const userMessage: LocalMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const assistantId = crypto.randomUUID();
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
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        {categories.map((category) => (
          <button
            key={category}
            className={selected.includes(category) ? "button" : "ghost-button"}
            onClick={() => toggleCategory(category)}
          >
            {category}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-300">
          top_k
          <input type="range" min={1} max={10} value={topK} onChange={(event) => setTopK(Number(event.target.value))} />
          <span className="font-mono">{topK}</span>
        </label>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="mx-auto mt-24 max-w-xl text-center text-slate-400">
            输入研究问题，系统会基于已上传文档检索并回答。
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} {...message} />)
        )}
      </div>
      <div className="border-t border-line p-4">
        <div className="flex gap-2">
          <textarea
            className="input min-h-12 flex-1 resize-none"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="输入问题，Shift+Enter 换行"
          />
          <button className="button px-4" onClick={() => void send()} disabled={loading}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
