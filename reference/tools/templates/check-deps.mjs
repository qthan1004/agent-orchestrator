#!/usr/bin/env node
/**
 * check-deps.mjs — Verify all imports are declared in package.json
 *
 * Scans src/ and tests/ for external imports and checks each package
 * is listed in dependencies, peerDependencies, or devDependencies.
 *
 * Usage (from lib root):
 *   node check-deps.mjs
 *
 * Exit code 0 = all good, 1 = missing deps found.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load package.json ──────────────────────────────────
const pkgPath = join(__dirname, 'package.json');
if (!existsSync(pkgPath)) {
  console.error('❌ No package.json found in', __dirname);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const declared = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
]);

// ─── Node.js builtins to skip ───────────────────────────
const BUILTINS = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants',
  'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https',
  'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode',
  'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys',
  'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads', 'zlib',
]);

// ─── Recursively find .ts/.tsx files (skip stories) ─────
function findFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.stories.')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Extract imports from file content ──────────────────
function extractImports(content) {
  const imports = new Set();
  // Match: import ... from 'pkg', import 'pkg', require('pkg')
  const regex = /(?:from|import|require\()\s*['"]([^'"./][^'"]*)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  return imports;
}

// ─── Normalize to package name ──────────────────────────
function normalizePackage(imp) {
  // @scope/pkg/subpath → @scope/pkg
  if (imp.startsWith('@')) {
    const parts = imp.split('/');
    return parts.slice(0, 2).join('/');
  }
  // pkg/subpath → pkg
  return imp.split('/')[0];
}

// ─── Main ───────────────────────────────────────────────
const srcDir = join(__dirname, 'src');
const testsDir = join(__dirname, 'tests');

const files = [...findFiles(srcDir), ...findFiles(testsDir)];
const allImports = new Set();

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  for (const imp of extractImports(content)) {
    allImports.add(imp);
  }
}

// Normalize and check
const checked = new Set();
const missing = [];

for (const imp of allImports) {
  const pkg = normalizePackage(imp);

  // Skip builtins and node: protocol
  if (BUILTINS.has(pkg) || pkg.startsWith('node:')) continue;
  // Skip react internals (jsx-runtime etc.)
  if (imp === 'react/jsx-runtime' || imp === 'react/jsx-dev-runtime') continue;

  if (checked.has(pkg)) continue;
  checked.add(pkg);

  if (!declared.has(pkg)) {
    // Find which file uses it
    const usedIn = files
      .filter(f => readFileSync(f, 'utf-8').includes(`'${imp}'`) || readFileSync(f, 'utf-8').includes(`"${imp}"`))
      .map(f => f.replace(__dirname, '.').replace(/\\/g, '/'))
      .slice(0, 3);
    missing.push({ pkg, usedIn });
  }
}

// ─── Report ─────────────────────────────────────────────
console.log('');
console.log(`🔍 Dependency check: ${declared.size} declared, ${checked.size} imports scanned`);

if (missing.length === 0) {
  console.log('✅ All imports are covered by package.json!');
  console.log('');
  process.exit(0);
} else {
  console.log(`❌ Missing ${missing.length} package(s):`);
  console.log('');
  for (const { pkg, usedIn } of missing) {
    console.log(`   ❌ ${pkg}`);
    if (usedIn.length > 0) {
      console.log(`      └─ used in: ${usedIn.join(', ')}`);
    }
  }
  console.log('');
  console.log('💡 Add them to peerDependencies or devDependencies in package.json');
  console.log('');
  process.exit(1);
}
