import { AxiosInstance } from "axios";
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
export declare function createGmailClient(): Promise<AxiosInstance>;
export declare function listLabels(client: AxiosInstance, userId?: string): Promise<GmailLabel[]>;
export declare function createLabel(client: AxiosInstance, name: string, userId?: string): Promise<GmailLabel>;
export declare function deleteLabel(client: AxiosInstance, labelId: string, userId?: string): Promise<void>;
export declare function modifyMessageLabels(client: AxiosInstance, messageId: string, addLabelIds: string[], removeLabelIds: string[], userId?: string): Promise<ModifyLabelsResult>;
export declare function modifyThreadLabels(client: AxiosInstance, threadId: string, addLabelIds: string[], removeLabelIds: string[], userId?: string): Promise<{
    id: string;
    messages: GmailMessage[];
}>;
export declare function getMessageMetadata(client: AxiosInstance, messageId: string, userId?: string): Promise<GmailMessage>;
export declare function searchMessages(client: AxiosInstance, query: string, maxResults?: number, userId?: string): Promise<GmailMessage[]>;
export declare function handleApiError(error: unknown): string;
//# sourceMappingURL=gmail.d.ts.map