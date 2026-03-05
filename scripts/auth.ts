#!/usr/bin/env node
/**
 * One-time OAuth2 setup script.
 * Run: npm run auth
 */
import { runAuthFlow } from "../src/auth-flow.js";

runAuthFlow().catch((err: Error) => {
  console.error("Auth failed:", err.message);
  process.exit(1);
});
