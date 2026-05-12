#!/usr/bin/env node
import crypto from "crypto";

const password = String(process.argv[2] || "").trim();
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(password, salt, 64).toString("hex");
console.log(JSON.stringify({ pinSalt: salt, pinHash: hash }, null, 2));
