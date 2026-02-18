import { apiFetch } from "./client";

export interface PostMessageBody {
  session_id?: string;
  message: string;
}

export interface PostMessageResponse {
  session_id: string;
  response: string;
}

export async function postMessage(
  body: PostMessageBody
): Promise<PostMessageResponse> {
  const data = await apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data as PostMessageResponse;
}
