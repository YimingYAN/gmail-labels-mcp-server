#!/usr/bin/env node
/**
 * One-time OAuth2 setup script.
 * Run: npm run auth
 *
 * Opens a browser for Google consent, then saves credentials to
 * ~/.gmail-labels-mcp/credentials.json for the MCP server to use.
 */

import { OAuth2Client } from "google-auth-library";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { URL } from "url";

const SCOPES = ["https://mail.google.com/"];
const CREDENTIALS_DIR = path.join(os.homedir(), ".gmail-labels-mcp");
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, "credentials.json");
const REDIRECT_PORT = 3000;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth/callback`;

// Read client credentials from env or prompt
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`
Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.

To get these:
  1. Go to https://console.cloud.google.com/
  2. Create a project and enable the Gmail API
  3. Go to APIs & Services > Credentials > Create Credentials > OAuth Client ID
  4. Choose "Desktop app" as the application type
  5. Copy the Client ID and Client Secret

Then run:
  GOOGLE_CLIENT_ID=your_id GOOGLE_CLIENT_SECRET=your_secret npm run auth
`);
  process.exit(1);
}

async function runAuthFlow(): Promise<void> {
  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // force consent to always get refresh_token
  });

  console.log("\nOpening browser for Google OAuth consent...");
  console.log("If the browser does not open, visit this URL manually:\n");
  console.log(authUrl, "\n");

  // Try to open browser cross-platform
  const { exec } = await import("child_process");
  const opener =
    process.platform === "darwin"
      ? `open "${authUrl}"`
      : process.platform === "win32"
      ? `start "" "${authUrl}"`
      : `xdg-open "${authUrl}"`;
  exec(opener);

  // Start local server to receive the callback
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith("/oauth/callback")) return;

      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400);
        res.end(`<h2>Auth failed: ${error}</h2><p>You can close this tab.</p>`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400);
        res.end("<h2>No code received.</h2><p>You can close this tab.</p>");
        server.close();
        reject(new Error("No authorization code in callback"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html><body style="font-family:sans-serif;padding:2rem;">
          <h2>✅ Authorization successful!</h2>
          <p>You can close this tab and return to your terminal.</p>
        </body></html>
      `);
      server.close();
      resolve(code);
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`Waiting for OAuth callback on http://localhost:${REDIRECT_PORT}...`);
    });

    server.on("error", reject);
  });

  // Exchange code for tokens
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh_token received. Try revoking app access at " +
      "https://myaccount.google.com/permissions and running auth again."
    );
  }

  // Save credentials
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  fs.writeFileSync(
    CREDENTIALS_FILE,
    JSON.stringify(
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        token_type: "authorized_user",
      },
      null,
      2
    ),
    { mode: 0o600 } // owner read/write only
  );

  console.log(`\n✅ Credentials saved to: ${CREDENTIALS_FILE}`);
  console.log("\nYou can now start the MCP server — no more manual token steps.\n");
}

runAuthFlow().catch((err) => {
  console.error("Auth failed:", err.message);
  process.exit(1);
});
