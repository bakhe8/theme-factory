const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableId(value) {
  return String(value)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function normalizeUrl(url) {
  const clean = String(url || '').trim().replace(/#.*$/, '');
  if (!clean) return clean;
  if (clean.startsWith('http')) return clean;
  return `https://docs.salla.dev/${clean.replace(/^\/+/, '')}`;
}

function fetchUrl(url, redirectCount = 0) {
  if (redirectCount > 5) {
    return Promise.reject(new Error(`Too many redirects: ${url}`));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'user-agent': 'Salla Theme Factory Docs Intelligence/1.0',
        accept: 'text/html,text/plain,application/json,*/*',
      },
    }, (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location;

      if ([301, 302, 303, 307, 308].includes(status) && location) {
        response.resume();
        const next = new URL(location, url).toString();
        resolve(fetchUrl(next, redirectCount + 1));
        return;
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        if (status >= 400) {
          reject(new Error(`HTTP ${status} for ${url}`));
          return;
        }
        resolve({
          body,
          contentType: response.headers['content-type'] || '',
          status,
          url,
        });
      });
    });

    request.setTimeout(30000, () => {
      request.destroy(new Error(`Timeout fetching ${url}`));
    });
    request.on('error', reject);
  });
}

function extractMarkdownLinks(markdown) {
  const links = [];
  const pattern = /\[([^\]]+)\]\((https:\/\/docs\.salla\.dev\/[^)\s]+)\)/g;
  let match;

  while ((match = pattern.exec(markdown))) {
    links.push({
      title: cleanText(match[1]),
      url: normalizeUrl(match[2]),
      context: cleanText(markdown.slice(match.index, Math.min(markdown.length, match.index + 500))),
    });
  }

  return links;
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function htmlToText(html) {
  return cleanText(decodeEntities(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')));
}

function cleanText(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTitle(raw, fallback = '') {
  const markdownTitle = raw.match(/^#\s+(.+)$/m);
  if (markdownTitle) return cleanText(markdownTitle[1]);

  const h1 = raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return cleanText(htmlToText(h1[1]));

  const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return cleanText(htmlToText(title[1]).replace(/\s*\|\s*Salla Docs\s*$/i, ''));

  return fallback;
}

function extractCodeTokens(raw) {
  const tokens = new Set();
  const htmlCode = /<code[^>]*>([\s\S]*?)<\/code>/gi;
  let match;
  while ((match = htmlCode.exec(raw))) {
    const token = cleanText(htmlToText(match[1]));
    if (token && token.length <= 120) tokens.add(token);
  }

  let inFence = false;
  for (const line of String(raw || '').split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const inlineCode = /`([^`]+)`/g;
    while ((match = inlineCode.exec(line))) {
      const token = cleanText(htmlToText(match[1]));
      if (token && token.length <= 120) tokens.add(token);
    }
  }

  return [...tokens];
}

function sectionText(text, sectionTitle, stopTitles = []) {
  const escaped = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = text.search(new RegExp(`(^|\\n)\\s*${escaped}\\b`, 'i'));
  if (start === -1) return '';

  const rest = text.slice(start);
  let end = rest.length;
  for (const stop of stopTitles) {
    const escapedStop = stop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const index = rest.search(new RegExp(`\\n\\s*${escapedStop}\\b`, 'i'));
    if (index > 0 && index < end) end = index;
  }

  return cleanText(rest.slice(0, end));
}

module.exports = {
  cleanText,
  decodeEntities,
  ensureDir,
  extractCodeTokens,
  extractMarkdownLinks,
  extractTitle,
  fetchUrl,
  htmlToText,
  normalizeUrl,
  readJson,
  sectionText,
  sha256,
  stableId,
  writeJson,
};
