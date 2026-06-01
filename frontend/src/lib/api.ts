import axios from "axios";

export interface GroupBrief {
  id: number;
  name: string;
  description: string;
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  group_id: number | null;
  group_role: "admin" | "member" | null;
  group: GroupBrief | null;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  invite_code: string;
  system_prompt: string;
  default_top_k: number;
  rate_limit_per_minute: number;
  created_at: string;
  member_count: number;
  document_count: number;
}

export interface GroupMember {
  id: number;
  username: string;
  display_name: string;
  group_role: "admin" | "member";
  joined_at: string | null;
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
  uploader_name: string;
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

export async function register(username: string, display_name: string, password: string): Promise<User> {
  const { data } = await api.post<{ user: User }>("/api/auth/register", { username, display_name, password });
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
}

export async function getMyGroup(): Promise<Group> {
  const { data } = await api.get<Group>("/api/groups/me");
  return data;
}

export async function createGroup(name: string, description: string, invite_code: string): Promise<Group> {
  const { data } = await api.post<Group>("/api/groups", { name, description, invite_code });
  return data;
}

export async function joinGroup(invite_code: string): Promise<Group> {
  const { data } = await api.post<Group>("/api/groups/join", { invite_code });
  return data;
}

export async function leaveGroup(): Promise<void> {
  await api.post("/api/groups/leave");
}

export async function dissolveGroup(): Promise<void> {
  await api.delete("/api/groups/me");
}

export async function updateGroup(payload: Partial<Pick<Group, "name" | "description" | "invite_code" | "system_prompt" | "default_top_k" | "rate_limit_per_minute">>): Promise<Group> {
  const { data } = await api.patch<Group>("/api/groups/me", payload);
  return data;
}

export async function listGroupMembers(): Promise<GroupMember[]> {
  const { data } = await api.get<GroupMember[]>("/api/groups/me/members");
  return data;
}

export async function promoteMember(userId: number): Promise<GroupMember> {
  const { data } = await api.post<GroupMember>(`/api/groups/me/members/${userId}/promote`);
  return data;
}

export async function demoteSelf(userId: number): Promise<GroupMember> {
  const { data } = await api.post<GroupMember>(`/api/groups/me/members/${userId}/demote`);
  return data;
}

export async function kickMember(userId: number): Promise<void> {
  await api.delete(`/api/groups/me/members/${userId}`);
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
