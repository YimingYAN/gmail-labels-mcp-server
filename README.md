# Gmail Labels MCP Server

An MCP server that exposes Gmail label management via the Gmail REST API. Fills the gap in the official Gmail MCP, which lacks label/tag operations.

## Tools

| Tool | Description |
|------|-------------|
| `gmail_list_labels` | List all labels with IDs, names, and message counts |
| `gmail_create_label` | Create a new label (supports nested labels with `/`) |
| `gmail_delete_label` | Delete a user-created label |
| `gmail_get_message_labels` | Get current labels on a specific message |
| `gmail_modify_message_labels` | Add/remove labels on a specific message |
| `gmail_modify_thread_labels` | Add/remove labels on an entire thread |
| `gmail_bulk_label_by_search` | Search messages and bulk apply label changes |

## Setup

### 1. Get a Gmail OAuth2 Access Token

You need an access token with the `https://mail.google.com/` scope. Options:

**Option A — Google OAuth Playground (quickest for testing):**
1. Go to https://developers.google.com/oauthplayground
2. Select `Gmail API v1` → `https://mail.google.com/`
3. Authorise and exchange for an access token
4. Copy the access token

**Option B — Your own OAuth2 app (for production):**
1. Create a project in Google Cloud Console
2. Enable the Gmail API
3. Create OAuth2 credentials (Desktop app)
4. Run the OAuth flow to get a refresh token, then exchange for an access token

### 2. Install and Build

```bash
npm install
npm run build
```

### 3. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gmail-labels": {
      "command": "node",
      "args": ["/path/to/gmail-labels-mcp-server/dist/index.js"],
      "env": {
        "GMAIL_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

### 4. Refresh Tokens (Production)

Access tokens expire after ~1 hour. For production use, implement token refresh:
- Store refresh token alongside access token
- Add a token refresh helper that calls `https://oauth2.googleapis.com/token`
- Call it before each API request if the access token is expired

## Example Usage

Once connected, you can ask Claude:

- "List all my Gmail labels"
- "Create a label called 'Crypto/Compliance'"
- "Tag message [id] with the Finance label"
- "Archive all emails from newsletter@example.com"
- "Add the STARRED label to message [id]"
- "What labels does message [id] currently have?"

## Notes

- System label IDs: `INBOX`, `SENT`, `TRASH`, `SPAM`, `STARRED`, `IMPORTANT`, `UNREAD`
- User label IDs follow the format `Label_XXXXXXXXXX`
- Use `gmail_list_labels` first to discover label IDs before modifying messages
