import axios from "axios";
import { getAccessToken } from "./auth.js";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";
export async function createGmailClient() {
    const accessToken = await getAccessToken();
    return axios.create({
        baseURL: GMAIL_API_BASE,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });
}
export async function listLabels(client, userId = "me") {
    const response = await client.get(`/users/${userId}/labels`);
    return response.data.labels || [];
}
export async function createLabel(client, name, userId = "me") {
    const response = await client.post(`/users/${userId}/labels`, {
        name,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
    });
    return response.data;
}
export async function deleteLabel(client, labelId, userId = "me") {
    await client.delete(`/users/${userId}/labels/${labelId}`);
}
export async function modifyMessageLabels(client, messageId, addLabelIds, removeLabelIds, userId = "me") {
    const response = await client.post(`/users/${userId}/messages/${messageId}/modify`, { addLabelIds, removeLabelIds });
    return response.data;
}
export async function modifyThreadLabels(client, threadId, addLabelIds, removeLabelIds, userId = "me") {
    const response = await client.post(`/users/${userId}/threads/${threadId}/modify`, { addLabelIds, removeLabelIds });
    return response.data;
}
export async function getMessageMetadata(client, messageId, userId = "me") {
    const response = await client.get(`/users/${userId}/messages/${messageId}?format=metadata&metadataHeaders=Subject`);
    const subject = response.data.payload?.headers?.find((h) => h.name === "Subject")?.value;
    return {
        id: response.data.id,
        threadId: response.data.threadId,
        labelIds: response.data.labelIds,
        snippet: response.data.snippet,
        subject,
    };
}
export async function searchMessages(client, query, maxResults = 20, userId = "me") {
    const response = await client.get(`/users/${userId}/messages`, {
        params: { q: query, maxResults },
    });
    return (response.data.messages || []).map((m) => ({
        id: m.id,
        threadId: m.threadId,
    }));
}
export function handleApiError(error) {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        if (status === 401) {
            return `Authentication failed: ${message}. Run 'npm run auth' to re-authenticate.`;
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
//# sourceMappingURL=gmail.js.map