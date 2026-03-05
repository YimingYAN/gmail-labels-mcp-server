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
- **`src/tools/labels.ts`** — Tool definitions. Registers 7 MCP tools with Zod input schemas and tool annotations. Each tool handler calls into the Gmail service layer. `getClient()` reads `GMAIL_ACCESS_TOKEN` from env.
- **`src/services/gmail.ts`** — Gmail REST API client. Stateless functions that take an Axios instance and call `https://gmail.googleapis.com/gmail/v1`. Handles label CRUD, message/thread label modification, message search, and API error formatting.

## Key Conventions

- ESM modules (`"type": "module"` in package.json, `Node16` module resolution)
- All imports use `.js` extensions (required for ESM with TypeScript)
- Tool registration uses `server.registerTool()` with Zod schemas and MCP tool annotations (`readOnlyHint`, `destructiveHint`, etc.)
- Tools return both `content` (text for display) and `structuredContent` (typed data)
- Auth: single `GMAIL_ACCESS_TOKEN` env var (OAuth2 bearer token with `https://mail.google.com/` scope)
