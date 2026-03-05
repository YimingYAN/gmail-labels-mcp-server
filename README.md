# Gmail Labels MCP Server

An MCP server for Gmail label management. Fills the gap in the official Gmail MCP connector, which lacks label/tag operations.

Handles OAuth2 automatically — run `npm run auth` once, and the server refreshes tokens forever.

## Tools

| Tool | Description |
|------|-------------|
| `gmail_list_labels` | List all labels with IDs, names, and message counts |
| `gmail_create_label` | Create a new label (supports nesting with `/`) |
| `gmail_delete_label` | Delete a user-created label |
| `gmail_get_message_labels` | Get current labels on a specific message |
| `gmail_modify_message_labels` | Add/remove labels on a specific message |
| `gmail_modify_thread_labels` | Add/remove labels on an entire thread |
| `gmail_bulk_label_by_search` | Search messages and bulk apply label changes |

## Setup

### 1. Create Google OAuth2 credentials (one-time)

1. Go to https://console.cloud.google.com/
2. Create a project (or use an existing one) and enable the **Gmail API**
3. Go to **APIs & Services > Credentials > Create Credentials > OAuth Client ID**
4. Choose **Desktop app** as the application type
5. Copy the **Client ID** and **Client Secret**

### 2. Install and build

```bash
npm install
npm run build
```

### 3. Run the auth flow (one-time)

```bash
GOOGLE_CLIENT_ID=your_client_id GOOGLE_CLIENT_SECRET=your_client_secret npm run auth
```

This opens a browser, you approve Gmail access, and credentials are saved to `~/.gmail-labels-mcp/credentials.json`. You never need to do this again unless you revoke access.

### 4. Configure your client

#### Claude Code

Via the CLI:

```bash
claude mcp add gmail-labels -- node /path/to/gmail-labels-mcp-server/dist/index.js
```

Or add manually to `.claude.json` (or project-level `.mcp.json`):

```json
{
  "mcpServers": {
    "gmail-labels": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/gmail-labels-mcp-server/dist/index.js"]
    }
  }
}
```

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gmail-labels": {
      "command": "node",
      "args": ["/path/to/gmail-labels-mcp-server/dist/index.js"]
    }
  }
}
```

No env vars needed — the server reads credentials from `~/.gmail-labels-mcp/credentials.json` and auto-refreshes tokens.

## Example Usage

- "List all my Gmail labels"
- "Create a label called 'Crypto/Compliance'"
- "Tag message [id] with the Finance label"
- "Archive all emails from newsletter@example.com"
- "Star message [id]" (adds STARRED label)
- "What labels does message [id] currently have?"

## Notes

- System label IDs: `INBOX`, `SENT`, `TRASH`, `SPAM`, `STARRED`, `IMPORTANT`, `UNREAD`
- User label IDs follow the format `Label_XXXXXXXXXX`
- Use `gmail_list_labels` first to discover label IDs before modifying messages
- To re-authenticate: delete `~/.gmail-labels-mcp/credentials.json` and run `npm run auth` again
