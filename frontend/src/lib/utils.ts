import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(value: string | null) {
  if (!value) return "从未";
  // 后端返回的是不带时区标记的 UTC 时间（datetime.utcnow().isoformat()）。
  // 若字符串没有时区信息（结尾的 Z 或 +08:00 之类偏移），浏览器会按本地时间解析，
  // 导致显示比真实时间差 8 小时。这里补上 Z 让其按 UTC 解析后自动换算到本地时区。
  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
  const normalized = value.includes("T") && !hasTimezone ? `${value}Z` : value;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(normalized));
}

export function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// 生成本地唯一 ID（仅用于 React key / 临时消息标识，无需密码学强度）。
// 注意：crypto.randomUUID() 仅在安全上下文（HTTPS 或 localhost）可用，
// 通过 HTTP+IP 访问时不存在，直接调用会抛异常。这里做降级兼容。
export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
