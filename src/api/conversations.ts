import { apiFetch } from "./client";

export interface RawSession {
  session_id: string;
  message_count: number;
  last_activity: string;
}

export interface RawMessage {
  role: string;
  content: string | RawContentBlock[];
  timestamp: string;
}

export interface RawContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

export interface ListConversationsResponse {
  conversations: RawSession[];
}

export interface GetConversationResponse {
  session_id: string;
  messages: RawMessage[];
  message_count: number;
}

export async function listConversations(): Promise<ListConversationsResponse> {
  const data = await apiFetch("/conversations");
  return data as ListConversationsResponse;
}

export async function getConversation(
  id: string
): Promise<GetConversationResponse> {
  const data = await apiFetch(`/conversations/${encodeURIComponent(id)}`);
  return data as GetConversationResponse;
}
