// Writes dist/version.json with the app version, commit SHA and build time.
// This lets anyone (including the AI agent) confirm that a deployment actually
// shipped by fetching GET /version.json — no browser required.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const configSource = readFileSync('src/constants/config.ts', 'utf8');
const versionMatch = configSource.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
const version = versionMatch ? versionMatch[1] : 'unknown';

let commit = 'unknown';
const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
if (sha) {
  commit = sha.slice(0, 7);
} else {
  try {
    commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    commit = 'unknown';
  }
}

const info = { version, commit, builtAt: new Date().toISOString() };
writeFileSync('dist/version.json', JSON.stringify(info, null, 2) + '\n');
console.log('[version] wrote dist/version.json', JSON.stringify(info));
