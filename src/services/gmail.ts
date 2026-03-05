import axios, { AxiosInstance } from "axios";
import { getAccessToken } from "./auth.js";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

export interface GmailLabel {
  id: string;
  name: string;
  type?: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  subject?: string;
}

export interface ModifyLabelsResult {
  id: string;
  threadId: string;
  labelIds: string[];
}

export async function createGmailClient(): Promise<AxiosInstance> {
  const accessToken = await getAccessToken();
  return axios.create({
    baseURL: GMAIL_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

export async function listLabels(
  client: AxiosInstance,
  userId: string = "me"
): Promise<GmailLabel[]> {
  const response = await client.get<{ labels: GmailLabel[] }>(
    `/users/${userId}/labels`
  );
  return response.data.labels || [];
}

export async function createLabel(
  client: AxiosInstance,
  name: string,
  userId: string = "me"
): Promise<GmailLabel> {
  const response = await client.post<GmailLabel>(`/users/${userId}/labels`, {
    name,
    labelListVisibility: "labelShow",
    messageListVisibility: "show",
  });
  return response.data;
}

export async function deleteLabel(
  client: AxiosInstance,
  labelId: string,
  userId: string = "me"
): Promise<void> {
  await client.delete(`/users/${userId}/labels/${labelId}`);
}

export async function modifyMessageLabels(
  client: AxiosInstance,
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[],
  userId: string = "me"
): Promise<ModifyLabelsResult> {
  const response = await client.post<ModifyLabelsResult>(
    `/users/${userId}/messages/${messageId}/modify`,
    { addLabelIds, removeLabelIds }
  );
  return response.data;
}

export async function modifyThreadLabels(
  client: AxiosInstance,
  threadId: string,
  addLabelIds: string[],
  removeLabelIds: string[],
  userId: string = "me"
): Promise<{ id: string; messages: GmailMessage[] }> {
  const response = await client.post<{ id: string; messages: GmailMessage[] }>(
    `/users/${userId}/threads/${threadId}/modify`,
    { addLabelIds, removeLabelIds }
  );
  return response.data;
}

export async function getMessageMetadata(
  client: AxiosInstance,
  messageId: string,
  userId: string = "me"
): Promise<GmailMessage> {
  const response = await client.get<{
    id: string;
    threadId: string;
    labelIds?: string[];
    payload?: { headers?: Array<{ name: string; value: string }> };
    snippet?: string;
  }>(`/users/${userId}/messages/${messageId}?format=metadata&metadataHeaders=Subject`);

  const subject = response.data.payload?.headers?.find(
    (h) => h.name === "Subject"
  )?.value;

  return {
    id: response.data.id,
    threadId: response.data.threadId,
    labelIds: response.data.labelIds,
    snippet: response.data.snippet,
    subject,
  };
}

export async function searchMessages(
  client: AxiosInstance,
  query: string,
  maxResults: number = 20,
  userId: string = "me"
): Promise<GmailMessage[]> {
  const response = await client.get<{
    messages?: Array<{ id: string; threadId: string }>;
  }>(`/users/${userId}/messages`, {
    params: { q: query, maxResults },
  });

  return (response.data.messages || []).map((m) => ({
    id: m.id,
    threadId: m.threadId,
  }));
}

export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message || error.message;

    if (status === 401) {
      return `Authentication failed: ${message}. Ensure your GMAIL_ACCESS_TOKEN is valid and not expired.`;
    }
    if (status === 403) {
      return `Permission denied: ${message}. Ensure the token has the https://mail.google.com/ scope.`;
    }
    if (status === 404) {
      return `Resource not found: ${message}. Check the message ID or label ID is correct.`;
    }
    if (status === 429) {
      return `Rate limit exceeded: ${message}. Please wait before retrying.`;
    }
    return `Gmail API error (${status}): ${message}`;
  }
  if (error instanceof Error) {
    return `Unexpected error: ${error.message}`;
  }
  return "Unknown error occurred";
}
