# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

MCP server that exposes Gmail label management via the Gmail REST API. Complements the official Gmail MCP connector, which lacks label/tag operations. Runs over stdio transport.

## Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript (tsc)
npm run dev          # Watch mode (tsc --watch)
npm run start        # Run compiled server (node dist/index.js)
```

No test framework is configured.

## Architecture

Three-file TypeScript project using `@modelcontextprotocol/sdk`:

- **`src/index.ts`** — Entry point. Creates `McpServer`, registers tools, connects stdio transport.
- **`src/tools/labels.ts`** — Tool definitions. Registers 7 MCP tools with Zod input schemas and tool annotations. Each tool handler calls into the Gmail service layer.
- **`src/services/gmail.ts`** — Gmail REST API client. Stateless functions that take an Axios instance and call `https://gmail.googleapis.com/gmail/v1`. Handles label CRUD, message/thread label modification, message search, and API error formatting.
- **`src/services/auth.ts`** — OAuth2 token management. Reads credentials from `~/.gmail-labels-mcp/credentials.json`, caches access tokens in memory, and auto-refreshes via `google-auth-library`. Also supports legacy `GMAIL_ACCESS_TOKEN` env var.
- **`scripts/auth.ts`** — One-time OAuth2 setup script. Opens browser for Google consent, saves refresh token to credentials file.

## Key Conventions

- ESM modules (`"type": "module"` in package.json, `Node16` module resolution)
- All imports use `.js` extensions (required for ESM with TypeScript)
- Tool registration uses `server.registerTool()` with Zod schemas and MCP tool annotations (`readOnlyHint`, `destructiveHint`, etc.)
- Tools return both `content` (text for display) and `structuredContent` (typed data)
- Auth: OAuth2 with auto-refresh via `~/.gmail-labels-mcp/credentials.json` (run `npm run auth` once). Falls back to `GMAIL_ACCESS_TOKEN` env var if credentials file not present.
