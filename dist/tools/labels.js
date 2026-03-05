import { z } from "zod";
import { createGmailClient, listLabels, createLabel, deleteLabel, modifyMessageLabels, modifyThreadLabels, getMessageMetadata, searchMessages, handleApiError, } from "../services/gmail.js";
async function getClient() {
    return createGmailClient();
}
function formatLabel(label) {
    const parts = [`  id: ${label.id}`, `  name: ${label.name}`];
    if (label.type)
        parts.push(`  type: ${label.type}`);
    if (label.messagesTotal !== undefined)
        parts.push(`  messages: ${label.messagesTotal} (${label.messagesUnread || 0} unread)`);
    return parts.join("\n");
}
export function registerLabelTools(server) {
    // List all labels
    server.registerTool("gmail_list_labels", {
        title: "List Gmail Labels",
        description: `List all labels (tags) in the Gmail account.

Returns both system labels (INBOX, SENT, TRASH, etc.) and user-created labels.
Use this to find label IDs needed for add/remove operations.

Returns: List of labels with their IDs, names, types, and message counts.

Examples:
  - Use when: "Show me all my Gmail labels"
  - Use when: "What label ID does 'Finance' have?"`,
        inputSchema: z.object({}),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async () => {
        try {
            const client = await getClient();
            const labels = await listLabels(client);
            const userLabels = labels.filter((l) => l.type === "user");
            const systemLabels = labels.filter((l) => l.type === "system");
            const text = [
                `Found ${labels.length} labels (${userLabels.length} user, ${systemLabels.length} system)`,
                "",
                "USER LABELS:",
                ...userLabels.map(formatLabel),
                "",
                "SYSTEM LABELS:",
                ...systemLabels.map(formatLabel),
            ].join("\n");
            return {
                content: [{ type: "text", text }],
                structuredContent: { labels },
            };
        }
        catch (error) {
            return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
        }
    });
    // Create a new label
    server.registerTool("gmail_create_label", {
        title: "Create Gmail Label",
        description: `Create a new user label (tag) in Gmail.

Args:
  - name (string): Label name. Supports nesting with "/" (e.g., "Finance/Invoices")

Returns: The created label with its ID, name, and visibility settings.

Examples:
  - Use when: "Create a label called 'Compliance'"
  - Use when: "Add a new Gmail tag 'Projects/Alpha'"`,
        inputSchema: z.object({
            name: z.string().min(1).max(225).describe("Label name, supports nesting with '/' (e.g. 'Finance/Invoices')"),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: false,
        },
    }, async ({ name }) => {
        try {
            const client = await getClient();
            const label = await createLabel(client, name);
            return {
                content: [{ type: "text", text: `Created label:\n${formatLabel(label)}` }],
                structuredContent: { label },
            };
        }
        catch (error) {
            return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
        }
    });
    // Delete a label
    server.registerTool("gmail_delete_label", {
        title: "Delete Gmail Label",
        description: `Delete a user-created label from Gmail. System labels cannot be deleted.

Args:
  - label_id (string): The label ID to delete (use gmail_list_labels to find IDs)

Note: Deleting a label removes it from all messages but does not delete the messages.

Examples:
  - Use when: "Delete the label with ID Label_123"
  - Use when: "Remove the 'OldProject' label"`,
        inputSchema: z.object({
            label_id: z.string().min(1).describe("The label ID to delete (e.g. 'Label_123')"),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async ({ label_id }) => {
        try {
            const client = await getClient();
            await deleteLabel(client, label_id);
            return {
                content: [{ type: "text", text: `Successfully deleted label: ${label_id}` }],
                structuredContent: { deleted: true, labelId: label_id },
            };
        }
        catch (error) {
            return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
        }
    });
    // Add/remove labels on a message
    server.registerTool("gmail_modify_message_labels", {
        title: "Modify Labels on a Gmail Message",
        description: `Add or remove labels (tags) on a specific Gmail message.

Args:
  - message_id (string): The Gmail message ID
  - add_label_ids (string[]): List of label IDs to add (optional)
  - remove_label_ids (string[]): List of label IDs to remove (optional)

Use gmail_list_labels to find label IDs. Common system label IDs:
  - INBOX, STARRED, IMPORTANT, SENT, TRASH, SPAM, UNREAD, READ

Returns: Updated message with its current label IDs.

Examples:
  - Use when: "Tag message abc123 with label Label_456"
  - Use when: "Remove INBOX label from message abc123 (archive it)"
  - Use when: "Star message abc123" -> add_label_ids: ["STARRED"]`,
        inputSchema: z.object({
            message_id: z.string().min(1).describe("Gmail message ID"),
            add_label_ids: z.array(z.string()).optional().default([]).describe("Label IDs to add (e.g. ['Label_123', 'STARRED'])"),
            remove_label_ids: z.array(z.string()).optional().default([]).describe("Label IDs to remove (e.g. ['INBOX'])"),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: false,
        },
    }, async ({ message_id, add_label_ids, remove_label_ids }) => {
        try {
            const client = await getClient();
            const result = await modifyMessageLabels(client, message_id, add_label_ids ?? [], remove_label_ids ?? []);
            const text = [
                `Updated message: ${result.id}`,
                `Current labels: ${result.labelIds.join(", ") || "(none)"}`,
            ].join("\n");
            return {
                content: [{ type: "text", text }],
                structuredContent: { message: result },
            };
        }
        catch (error) {
            return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
        }
    });
    // Add/remove labels on an entire thread
    server.registerTool("gmail_modify_thread_labels", {
        title: "Modify Labels on a Gmail Thread",
        description: `Add or remove labels on all messages in a Gmail thread at once.

Args:
  - thread_id (string): The Gmail thread ID
  - add_label_ids (string[]): Label IDs to add to all messages in the thread
  - remove_label_ids (string[]): Label IDs to remove from all messages in the thread

Returns: Updated thread with message count and affected message IDs.

Examples:
  - Use when: "Label this entire conversation as 'Compliance'"
  - Use when: "Archive this thread" -> remove_label_ids: ["INBOX"]`,
        inputSchema: z.object({
            thread_id: z.string().min(1).describe("Gmail thread ID"),
            add_label_ids: z.array(z.string()).optional().default([]).describe("Label IDs to add to all messages in the thread"),
            remove_label_ids: z.array(z.string()).optional().default([]).describe("Label IDs to remove from all messages in the thread"),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: false,
        },
    }, async ({ thread_id, add_label_ids, remove_label_ids }) => {
        try {
            const client = await getClient();
            const result = await modifyThreadLabels(client, thread_id, add_label_ids ?? [], remove_label_ids ?? []);
            const messageCount = result.messages?.length || 0;
            return {
                content: [{
                        type: "text",
                        text: `Updated thread ${result.id}: applied changes to ${messageCount} message(s)`,
                    }],
                structuredContent: { thread: result },
            };
        }
        catch (error) {
            return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
        }
    });
    // Get message metadata (to inspect current labels)
    server.registerTool("gmail_get_message_labels", {
        title: "Get Current Labels on a Gmail Message",
        description: `Retrieve the current labels on a specific Gmail message.

Args:
  - message_id (string): The Gmail message ID

Returns: Message metadata including subject, snippet, and current label IDs.

Examples:
  - Use when: "What labels does message abc123 have?"
  - Use when: "Is message abc123 starred?"`,
        inputSchema: z.object({
            message_id: z.string().min(1).describe("Gmail message ID"),
        }),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async ({ message_id }) => {
        try {
            const client = await getClient();
            const message = await getMessageMetadata(client, message_id);
            const text = [
                `Message: ${message.id}`,
                `Subject: ${message.subject || "(no subject)"}`,
                `Snippet: ${message.snippet || ""}`,
                `Labels: ${(message.labelIds || []).join(", ") || "(none)"}`,
            ].join("\n");
            return {
                content: [{ type: "text", text }],
                structuredContent: { message },
            };
        }
        catch (error) {
            return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
        }
    });
    // Search messages and bulk label them
    server.registerTool("gmail_bulk_label_by_search", {
        title: "Bulk Label Gmail Messages by Search Query",
        description: `Search Gmail messages using a query and apply label changes to all matching messages.

Args:
  - query (string): Gmail search query (same syntax as Gmail search box)
  - add_label_ids (string[]): Label IDs to add to all matching messages
  - remove_label_ids (string[]): Label IDs to remove from all matching messages
  - max_results (number): Max messages to process (default: 20, max: 100)

Common query examples:
  - "from:sender@example.com" - emails from a sender
  - "subject:invoice" - emails with 'invoice' in subject
  - "is:unread" - unread emails
  - "after:2024/01/01 before:2024/12/31" - date range

Returns: Count of messages updated and their IDs.

Examples:
  - Use when: "Label all emails from compliance@firm.com as 'Compliance'"
  - Use when: "Archive all emails with subject 'Newsletter'"`,
        inputSchema: z.object({
            query: z.string().min(1).describe("Gmail search query (e.g. 'from:user@example.com is:unread')"),
            add_label_ids: z.array(z.string()).optional().default([]).describe("Label IDs to add to matching messages"),
            remove_label_ids: z.array(z.string()).optional().default([]).describe("Label IDs to remove from matching messages"),
            max_results: z.number().int().min(1).max(100).default(20).describe("Maximum number of messages to process (default: 20)"),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
        },
    }, async ({ query, add_label_ids, remove_label_ids, max_results }) => {
        try {
            const client = await getClient();
            const messages = await searchMessages(client, query, max_results);
            if (messages.length === 0) {
                return {
                    content: [{ type: "text", text: `No messages found matching query: "${query}"` }],
                    structuredContent: { updatedCount: 0, messageIds: [] },
                };
            }
            const results = await Promise.allSettled(messages.map((m) => modifyMessageLabels(client, m.id, add_label_ids ?? [], remove_label_ids ?? [])));
            const succeeded = results.filter((r) => r.status === "fulfilled").length;
            const failed = results.filter((r) => r.status === "rejected").length;
            const text = [
                `Processed ${messages.length} messages matching "${query}"`,
                `  Succeeded: ${succeeded}`,
                ...(failed > 0 ? [`  Failed: ${failed}`] : []),
            ].join("\n");
            return {
                content: [{ type: "text", text }],
                structuredContent: {
                    updatedCount: succeeded,
                    failedCount: failed,
                    messageIds: messages.map((m) => m.id),
                },
            };
        }
        catch (error) {
            return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
        }
    });
}
//# sourceMappingURL=labels.js.map