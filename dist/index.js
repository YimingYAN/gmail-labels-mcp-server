#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerLabelTools } from "./tools/labels.js";
import { runAuthFlow } from "./auth-flow.js";
if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`gmail-labels-mcp-server - MCP server for Gmail label management

Usage:
  gmail-labels-mcp-server           Start the MCP server (stdio transport)
  gmail-labels-mcp-server --auth    Run one-time OAuth2 setup

Auth requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars.
See https://github.com/YimingYAN/gmail-labels-mcp-server for setup instructions.`);
    process.exit(0);
}
else if (process.argv.includes("--auth")) {
    runAuthFlow().catch((error) => {
        console.error("Auth failed:", error instanceof Error ? error.message : error);
        process.exit(1);
    });
}
else {
    const server = new McpServer({
        name: "gmail-labels-mcp-server",
        version: "1.0.0",
    });
    registerLabelTools(server);
    async function main() {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Gmail Labels MCP server running on stdio");
    }
    main().catch((error) => {
        console.error("Server error:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map