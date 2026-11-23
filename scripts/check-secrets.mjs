#!/usr/bin/env node
// Blocks commits that contain secrets. Scans staged files (or the whole tree with --all).
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const all = process.argv.includes('--all');
const files = execSync(all ? 'git ls-files' : 'git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' })
  .split('\n').filter(Boolean);

const allowedPath = (f) => /(^|\/)\.env\.example$/.test(f) || /(^|\/)package-lock\.json$/.test(f) || /(^|\/)fixtures\//.test(f);
const problems = [];

for (const f of files) {
  if (allowedPath(f)) continue;
  if (/(^|\/)\.env($|\.)/.test(f)) { problems.push(`${f}: .env files must not be committed`); continue; }
  if (/\.(pem|key|p12|pfx)$/.test(f) || /(^|\/)id_(rsa|ed25519|ecdsa)$/.test(f)) { problems.push(`${f}: key file`); continue; }
  if (!existsSync(f)) continue;
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  if (text.includes('\0') || text.length > 2_000_000) continue;
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)) problems.push(`${f}: private key block`);
  for (const m of text.matchAll(/postgres(?:ql)?:\/\/([^:\s/@]+):([^@\s]+)@([^/\s:]+)/g)) {
    const host = m[3];
    if (!['localhost', '127.0.0.1', 'postgres', 'db'].includes(host) && !/^\$\{?/.test(m[2]) && !m[2].startsWith('${')) {
      problems.push(`${f}: database URL with password for non-local host "${host}"`);
    }
  }
  for (const m of text.matchAll(/(?:secret|token|password|api[_-]?key)["']?\s*[:=]\s*["']([A-Za-z0-9+/_\-]{32,})["']/gi)) {
    if (/^(change-me|x+$)/i.test(m[1])) continue;
    problems.push(`${f}: long random-looking secret value`);
  }
  if (/(gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{32,})/.test(text)) problems.push(`${f}: known token pattern`);
}

if (problems.length) {
  console.error('secrets:check FAILED:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log(`secrets:check OK (${files.length} files)`);
