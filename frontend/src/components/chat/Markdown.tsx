import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { Check, Copy } from "lucide-react";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    // pre 下的文本内容
    const text = extractText(children);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默 */
    }
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => void copy()}
        className="absolute right-2 top-2 z-10 rounded-md border border-border bg-card p-1.5 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground group-hover:opacity-100"
        title="复制代码"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre>{children}</pre>
    </div>
  );
}

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

// DeepSeek 等模型常输出 \( ... \) / \[ ... \] 形式的 LaTeX 定界符，
// 但 Markdown 会把反斜杠当作转义，导致公式无法被 remark-math 识别。
// 这里统一转换为 KaTeX 认识的 $ ... $ / $$ ... $$ 定界符。
function normalizeMath(content: string): string {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expr) => `\n$$\n${String(expr).trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expr) => `$${String(expr).trim()}$`);
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          )
        }}
      >
        {normalizeMath(content)}
      </ReactMarkdown>
    </div>
  );
}
