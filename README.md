# Gmail Labels MCP Server

An MCP server for Gmail label management. Fills the gap in the official Gmail MCP connector, which lacks label/tag operations.

Handles OAuth2 automatically — authenticate once, and the server refreshes tokens forever.

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

### 1. Create a Google Cloud project and enable the Gmail API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Library**
4. Search for **Gmail API** and click **Enable**

### 2. Create OAuth2 credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth Client ID**
3. If prompted, configure the **OAuth consent screen** first:
   - Choose **External** user type (or **Internal** if using Google Workspace)
   - Fill in the app name (e.g. "Gmail Labels MCP") and your email
   - Add the scope `https://mail.google.com/`
   - Add your email as a test user
   - Save and go back to creating credentials
4. Select **Desktop app** as the application type
5. Give it a name (e.g. "Gmail Labels MCP")
6. Click **Create** and copy the **Client ID** and **Client Secret**

### 3. Install and authenticate

**Option A: Install from npm (recommended)**

```bash
npm install -g gmail-labels-mcp-server
GOOGLE_CLIENT_ID=your_client_id GOOGLE_CLIENT_SECRET=your_client_secret gmail-labels-mcp-server --auth
```

**Option B: Clone and build from source**

```bash
git clone https://github.com/YimingYAN/gmail-labels-mcp-server.git
cd gmail-labels-mcp-server
npm install && npm run build
GOOGLE_CLIENT_ID=your_client_id GOOGLE_CLIENT_SECRET=your_client_secret npm run auth
```

This opens a browser for Google consent. Approve Gmail access, and credentials are saved to `~/.gmail-labels-mcp/credentials.json`. You only need to do this once.

### 4. Configure your client

#### Claude Code

```bash
claude mcp add gmail-labels -- npx gmail-labels-mcp-server
```

Or if installed from source:

```bash
claude mcp add gmail-labels -- node /path/to/gmail-labels-mcp-server/dist/index.js
```

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gmail-labels": {
      "command": "npx",
      "args": ["gmail-labels-mcp-server"]
    }
  }
}
```

No env vars needed — the server reads credentials from `~/.gmail-labels-mcp/credentials.json` and auto-refreshes tokens.

## Example Usage

- "List all my Gmail labels"
- "Create a label called 'Crypto/Compliance'"
- "Tag message [id] with the Finance label"
- "Mark message [id] as read" (removes UNREAD label)
- "Archive all emails from newsletter@example.com"
- "Star message [id]" (adds STARRED label)
- "What labels does message [id] currently have?"

## Notes

- System label IDs: `INBOX`, `SENT`, `TRASH`, `SPAM`, `STARRED`, `IMPORTANT`, `UNREAD`
- User label IDs follow the format `Label_XXXXXXXXXX`
- Use `gmail_list_labels` first to discover label IDs before modifying messages
- "Mark as read" = remove `UNREAD` label; "Mark as unread" = add `UNREAD` label
- To re-authenticate: delete `~/.gmail-labels-mcp/credentials.json` and re-run the auth step

## License

MIT
