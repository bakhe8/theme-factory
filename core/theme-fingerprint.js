const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_EXCLUDED_ENTRIES = new Set([
  '.git',
  '.github',
  '.factory',
  '.salla-cache',
  '.turbo',
  '.cache',
  'node_modules',
  'build',
]);

const DEFAULT_EXCLUDED_FILES = new Set([
  '.gitignore',
]);

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function createThemeFingerprint(themePath, options = {}) {
  const excludedEntries = new Set([
    ...DEFAULT_EXCLUDED_ENTRIES,
    ...(options.excludedEntries || []),
  ]);
  const excludedFiles = new Set([
    ...DEFAULT_EXCLUDED_FILES,
    ...(options.excludedFiles || []),
  ]);

  const hash = crypto.createHash('sha256');
  const files = [];
  let bytes = 0;

  function walk(current) {
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) return;

    const entry = path.basename(current);
    if (stat.isDirectory()) {
      if (current !== themePath && excludedEntries.has(entry)) return;
      for (const child of fs.readdirSync(current).sort()) {
        walk(path.join(current, child));
      }
      return;
    }

    if (excludedFiles.has(entry)) return;

    const relative = toPosix(path.relative(themePath, current));
    const content = fs.readFileSync(current);
    hash.update(relative);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    files.push(relative);
    bytes += content.length;
  }

  walk(themePath);

  return {
    algorithm: 'sha256',
    hash: hash.digest('hex'),
    files: files.length,
    bytes,
    excluded_entries: [...excludedEntries].sort(),
    excluded_files: [...excludedFiles].sort(),
  };
}

module.exports = {
  DEFAULT_EXCLUDED_ENTRIES,
  DEFAULT_EXCLUDED_FILES,
  createThemeFingerprint,
};
