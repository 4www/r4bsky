#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment variables
const CF_PAGES_URL = process.env.CF_PAGES_URL; // Full URL like https://branch.project.pages.dev
const CF_PAGES_BRANCH = process.env.CF_PAGES_BRANCH; // Branch name
const DEV_URL = process.env.DEV_URL; // Local development URL override
const IS_PRODUCTION = CF_PAGES_BRANCH === 'main' || CF_PAGES_BRANCH === 'master';

// Determine the base URL
let baseUrl;
if (DEV_URL) {
  // Local development override (highest priority)
  baseUrl = DEV_URL;
} else if (CF_PAGES_URL) {
  // Running in Cloudflare Pages build
  baseUrl = CF_PAGES_URL;
} else if (IS_PRODUCTION) {
  // Fallback for production
  baseUrl = 'https://atproto.radio4000.com';
} else {
  // Local development default
  baseUrl = 'http://localhost:5173';
}

// Remove trailing slash if present
baseUrl = baseUrl.replace(/\/$/, '');

const clientMetadata = {
  client_id: `${baseUrl}/client-metadata.json`,
  client_name: 'r4.atproto',
  client_uri: baseUrl,
  logo_uri: `${baseUrl}/logo.png`,
  tos_uri: `${baseUrl}/tos`,
  policy_uri: `${baseUrl}/privacy`,
  redirect_uris: [
    baseUrl,
    `${baseUrl}/`
  ],
  scope: 'atproto transition:generic',
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  application_type: 'web',
  token_endpoint_auth_method: 'none',
  dpop_bound_access_tokens: true
};

// Write to static directory
const outputPath = join(__dirname, '../static/client-metadata.json');
writeFileSync(outputPath, JSON.stringify(clientMetadata, null, 2) + '\n');

console.log(`✓ Generated client-metadata.json for: ${baseUrl}`);
console.log(`  Branch: ${CF_PAGES_BRANCH || 'local'}`);
console.log(`  Production: ${IS_PRODUCTION}`);
