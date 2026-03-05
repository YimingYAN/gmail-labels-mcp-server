import { OAuth2Client } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CREDENTIALS_FILE = path.join(
  os.homedir(),
  ".gmail-labels-mcp",
  "credentials.json"
);

interface StoredCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  token_type: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // ms since epoch
}

let cachedToken: CachedToken | null = null;
let oauthClient: OAuth2Client | null = null;

function loadCredentials(): StoredCredentials {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    throw new Error(
      `Credentials not found at ${CREDENTIALS_FILE}. ` +
        "Run 'npm run auth' to complete the one-time OAuth setup."
    );
  }

  try {
    const raw = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
    return JSON.parse(raw) as StoredCredentials;
  } catch {
    throw new Error(
      `Failed to read credentials from ${CREDENTIALS_FILE}. ` +
        "Run 'npm run auth' to re-authenticate."
    );
  }
}

function getOAuthClient(): OAuth2Client {
  if (oauthClient) return oauthClient;

  // Support both env-based token (legacy) and credentials file
  if (process.env.GMAIL_ACCESS_TOKEN) {
    // Minimal client that just uses the static token
    oauthClient = new OAuth2Client();
    oauthClient.setCredentials({ access_token: process.env.GMAIL_ACCESS_TOKEN });
    return oauthClient;
  }

  const creds = loadCredentials();
  oauthClient = new OAuth2Client(creds.client_id, creds.client_secret);
  oauthClient.setCredentials({ refresh_token: creds.refresh_token });
  return oauthClient;
}

export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  // Static token from env — no refresh possible
  if (process.env.GMAIL_ACCESS_TOKEN && !fs.existsSync(CREDENTIALS_FILE)) {
    return process.env.GMAIL_ACCESS_TOKEN;
  }

  const client = getOAuthClient();
  const response = await client.getAccessToken();

  if (!response.token) {
    throw new Error(
      "Failed to obtain access token. Run 'npm run auth' to re-authenticate."
    );
  }

  // Cache the token
  const expiryDate = client.credentials.expiry_date;
  cachedToken = {
    accessToken: response.token,
    expiresAt: expiryDate ?? Date.now() + 3600_000, // default 1h
  };

  return cachedToken.accessToken;
}
