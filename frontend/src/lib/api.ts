import axios from "axios";

export interface User {
  id: number;
  username: string;
  role: "admin" | "member";
  is_active: boolean;
  created_at: string;
}

export interface ApiKey {
  id: number;
  prefix: string;
  label: string;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  category: string;
  uploaded_by: number;
  upload_time: string;
  status: "processing" | "ready" | "error";
  chunk_count: number;
  tags: string[];
  description: string;
  file_size: number;
  error_message: string;
}

export interface Source {
  document_id: string;
  document_title: string;
  category: string;
  chunk_text: string;
  similarity_score: number;
  page_number: number | null;
  chunk_index?: number | null;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  conversation_id: string;
  usage: Usage;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: Message[];
}

export interface AdminConfig {
  system_prompt: string;
  default_top_k: number;
  rate_limit_per_minute: number;
}

export const api = axios.create({
  baseURL: "",
  withCredentials: true
});

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/api/auth/me");
  return data;
}

export async function login(username: string, password: string): Promise<User> {
  const { data } = await api.post<{ user: User }>("/api/auth/login", { username, password });
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const { data } = await api.get<ConversationSummary[]>("/api/conversations");
  return data;
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  const { data } = await api.get<ConversationDetail>(`/api/conversations/${id}`);
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/api/conversations/${id}`);
}
