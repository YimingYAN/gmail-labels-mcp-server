/**
 * OAuth2 authentication flow.
 * Used by both `scripts/auth.ts` and `--auth` CLI flag.
 */

import { OAuth2Client } from "google-auth-library";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { URL } from "url";

const SCOPES = ["https://mail.google.com/"];
const CREDENTIALS_DIR = path.join(os.homedir(), ".gmail-labels-mcp");
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, "credentials.json");
const REDIRECT_PORT = 3000;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth/callback`;

export async function runAuthFlow(): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(`
Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.

To get these:
  1. Go to https://console.cloud.google.com/
  2. Create a project and enable the Gmail API
  3. Go to APIs & Services > Credentials > Create Credentials > OAuth Client ID
  4. Choose "Desktop app" as the application type
  5. Copy the Client ID and Client Secret

Then run:
  GOOGLE_CLIENT_ID=your_id GOOGLE_CLIENT_SECRET=your_secret gmail-labels-mcp-server --auth
`);
    process.exit(1);
  }

  const client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\nOpening browser for Google OAuth consent...");
  console.log("If the browser does not open, visit this URL manually:\n");
  console.log(authUrl, "\n");

  const opener =
    process.platform === "darwin"
      ? `open "${authUrl}"`
      : process.platform === "win32"
      ? `start "" "${authUrl}"`
      : `xdg-open "${authUrl}"`;
  exec(opener);

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith("/oauth/callback")) return;

      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const authCode = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        const safeError = error.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
        res.writeHead(400);
        res.end(`<h2>Auth failed: ${safeError}</h2><p>You can close this tab.</p>`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!authCode) {
        res.writeHead(400);
        res.end("<h2>No code received.</h2><p>You can close this tab.</p>");
        server.close();
        reject(new Error("No authorization code in callback"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html><body style="font-family:sans-serif;padding:2rem;">
          <h2>Authorization successful!</h2>
          <p>You can close this tab and return to your terminal.</p>
        </body></html>
      `);
      server.close();
      resolve(authCode);
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`Waiting for OAuth callback on http://localhost:${REDIRECT_PORT}...`);
    });

    server.on("error", reject);
  });

  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh_token received. Try revoking app access at " +
      "https://myaccount.google.com/permissions and running auth again."
    );
  }

  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  fs.writeFileSync(
    CREDENTIALS_FILE,
    JSON.stringify(
      {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refresh_token,
        token_type: "authorized_user",
      },
      null,
      2
    ),
    { mode: 0o600 }
  );

  console.log(`\nCredentials saved to: ${CREDENTIALS_FILE}`);
  console.log("You can now start the MCP server.\n");
}
