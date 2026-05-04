const fs = require('fs');
const path = require('path');
const {
  DISCOVERY_TERMS,
  LLMS_URL,
  OFFICIAL_THEME_REPOS,
  OFFICIAL_THEME_SOURCES,
  SEED_DOCS,
  generatedDir,
  rawDir,
  rootDir,
} = require('./salla-docs-config');
const {
  ensureDir,
  extractMarkdownLinks,
  extractTitle,
  fetchUrl,
  readJson,
  sha256,
  stableId,
  writeJson,
} = require('./utils');

const manifestPath = path.join(generatedDir, 'manifest.json');
const previousManifestPath = path.join(generatedDir, 'manifest.previous.json');

function okDocsCount(manifest) {
  return (manifest?.docs || []).filter((doc) => doc.status === 'ok').length;
}

function healthierManifest(left, right) {
  return okDocsCount(right) > okDocsCount(left) ? right : left;
}

function fallbackDocsByKey(manifests) {
  const docs = new Map();

  for (const manifest of manifests.filter(Boolean)) {
    for (const doc of manifest.docs || []) {
      if (doc.status !== 'ok' || !doc.rawPath) continue;
      const rawPath = path.join(rootDir, doc.rawPath);
      if (!fs.existsSync(rawPath)) continue;
      const key = docKey(doc.url);
      if (!docs.has(key)) docs.set(key, doc);
    }
  }

  return docs;
}

function fallbackOfficialSourcesByKey(manifests) {
  const sources = new Map();

  for (const manifest of manifests.filter(Boolean)) {
    for (const source of manifest.officialSources || []) {
      if (source.status !== 'ok' || !source.rawPath) continue;
      const rawPath = path.join(rootDir, source.rawPath);
      if (!fs.existsSync(rawPath)) continue;
      sources.set(String(source.url || '').toLowerCase(), source);
    }
  }

  return sources;
}

function parseArgs(argv) {
  const args = new Set(argv);
  const maxArg = argv.find((arg) => arg.startsWith('--max='));
  return {
    compile: args.has('--compile'),
    seedsOnly: args.has('--seeds-only'),
    max: maxArg ? Number(maxArg.split('=')[1]) : 120,
  };
}

function themeDocScore(link) {
  const haystack = `${link.title}\n${link.context}`;
  let score = 0;

  if (/Twilight Documentation|Salla Storefront|Theme Architecture/i.test(haystack)) score += 100;
  if (/Web Components?|<salla-|salla-[a-z0-9-]+/i.test(haystack)) score += 80;
  if (/Requirements & Review|Technical Theme Review|UX\/UI Review|Theme Metadata|Theme Publish/i.test(haystack)) score += 70;
  if (/Themes? (Pages?|Layouts?|Hooks|Global Variables|CSS Variables|Localizations|Directory Structure|Basic Syntax)/i.test(haystack)) score += 55;
  if (/Theme Architecture > Components|Elements|Form \[Salla|Product \[Salla|User \[Salla/i.test(haystack)) score += 45;
  if (/Wishlist|Notifications|Cart Page|Product Listing|Single Product|Landing Page|Customer Pages/i.test(haystack)) score += 25;
  if (DISCOVERY_TERMS.some((pattern) => pattern.test(haystack))) score += 10;

  if (/Merchant API|Embedded App SDK|Partners Apps APIs|App Builder|App Functions|Shipping|Webhooks/i.test(haystack)) score -= 140;

  return score;
}

function shouldIncludeDoc(link) {
  return themeDocScore(link) > 0;
}

function docKey(url) {
  const value = String(url || '').split('#')[0].split('?')[0].replace(/\.md$/i, '');
  const idMatch = value.match(/\/(?:doc-)?(\d+)(?:[a-z]\d+)?$/i);
  return idMatch ? idMatch[1] : value.toLowerCase();
}

function mergeDocs(discovered, seedsOnly, max) {
  const docs = new Map();

  for (const doc of SEED_DOCS) {
    docs.set(docKey(doc.url), { ...doc, discovered: false });
  }

  if (!seedsOnly) {
    const prioritized = discovered
      .map((link, index) => ({ link, index, score: themeDocScore(link) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index);

    for (const { link } of prioritized) {
      if (!shouldIncludeDoc(link)) continue;
      const key = docKey(link.url);
      if (!docs.has(key)) {
        docs.set(key, {
          id: stableId(link.url),
          title: link.title,
          url: link.url,
          tags: ['discovered'],
          discovered: true,
        });
      }
      if (docs.size >= max) break;
    }
  }

  return [...docs.values()];
}

function officialSourceKey(source) {
  return String(source.url || '').toLowerCase();
}

function officialSourceId(repo, sourcePath) {
  return `${repo.id}-${stableId(sourcePath)}`;
}

function isIncludedOfficialRepoPath(repo, sourcePath) {
  return (repo.include || []).some((pattern) => pattern.test(sourcePath));
}

function mergeOfficialSources(sources) {
  const byUrl = new Map();

  for (const source of sources) {
    const key = officialSourceKey(source);
    if (!key || byUrl.has(key)) continue;
    byUrl.set(key, source);
  }

  return [...byUrl.values()];
}

async function discoverOfficialRepoSources(cachedOfficialSources) {
  const sources = [];

  for (const repo of OFFICIAL_THEME_REPOS) {
    try {
      const response = await fetchUrl(repo.treeUrl);
      const tree = JSON.parse(response.body);
      for (const item of tree.tree || []) {
        if (item.type !== 'blob' || !isIncludedOfficialRepoPath(repo, item.path)) continue;
        sources.push({
          id: officialSourceId(repo, item.path),
          title: `${repo.title}: ${item.path}`,
          url: `${repo.rawBaseUrl}${item.path}`,
          docsUrl: item.path === 'README.md' ? repo.repoUrl : repo.docsUrl,
          repoUrl: repo.repoUrl,
          repoId: repo.id,
          sourcePath: item.path,
          tags: [
            ...(repo.tags || []),
            ...(item.path === 'README.md' ? ['readme'] : []),
            ...(item.path.endsWith('.twig') ? ['twig-template'] : []),
            ...(item.path.endsWith('.js') ? ['javascript'] : []),
            ...(item.path === 'twilight.json' ? ['config'] : []),
          ],
        });
      }
    } catch (error) {
      console.log(`   ! ${repo.title} source tree cached (${error.message})`);
      for (const cached of cachedOfficialSources.values()) {
        if (cached.repoId === repo.id || (cached.tags || []).includes('repo-source')) sources.push(cached);
      }
    }
  }

  return sources;
}

function diffManifests(previous, current) {
  const before = new Map((previous?.docs || []).map((doc) => [docKey(doc.url), doc]));
  const after = new Map((current.docs || []).map((doc) => [docKey(doc.url), doc]));

  const added = [];
  const changed = [];
  const removed = [];

  for (const [url, doc] of after) {
    if (!before.has(url)) {
      added.push({ url: doc.url, title: doc.title });
    } else if (before.get(url).sha256 !== doc.sha256) {
      changed.push({
        url: doc.url,
        title: doc.title,
        before: before.get(url).sha256,
        after: doc.sha256,
      });
    }
  }

  for (const [url, doc] of before) {
    if (!after.has(url)) removed.push({ url: doc.url, title: doc.title });
  }

  return { added, changed, removed };
}

async function syncDocs(argv = []) {
  const options = parseArgs(argv);
  ensureDir(rawDir);
  ensureDir(generatedDir);

  const previous = readJson(manifestPath, null);
  const archivedPrevious = readJson(previousManifestPath, null);
  const driftBase = healthierManifest(previous, archivedPrevious);
  const cachedDocs = fallbackDocsByKey([previous, archivedPrevious]);
  const cachedOfficialSources = fallbackOfficialSourcesByKey([previous, archivedPrevious]);
  if (previous) writeJson(previousManifestPath, previous);

  console.log('📚 Syncing Salla docs intelligence...');
  console.log(`   Source: ${LLMS_URL}`);

  const llms = await fetchUrl(LLMS_URL);
  const llmsHash = sha256(llms.body);
  const llmsPath = path.join(rawDir, 'llms.txt');
  fs.writeFileSync(llmsPath, llms.body);

  const discovered = extractMarkdownLinks(llms.body);
  const docs = mergeDocs(discovered, options.seedsOnly, options.max);
  const records = [];
  const officialRecords = [];

  console.log(`   Selected docs: ${docs.length}${options.seedsOnly ? ' (seeds only)' : ''}`);

  for (const doc of docs) {
    try {
      process.stdout.write(`   - ${doc.title} ... `);
      const response = await fetchUrl(doc.url);
      const hash = sha256(response.body);
      const title = extractTitle(response.body, doc.title);
      const fileName = `${doc.id || stableId(doc.url)}.html`;
      const rawPath = path.join(rawDir, fileName);
      fs.writeFileSync(rawPath, response.body);

      records.push({
        id: doc.id || stableId(doc.url),
        title,
        url: doc.url,
        tags: doc.tags || [],
        discovered: Boolean(doc.discovered),
        sha256: hash,
        bytes: Buffer.byteLength(response.body),
        contentType: response.contentType,
        rawPath: path.relative(rootDir, rawPath).replace(/\\/g, '/'),
        status: 'ok',
      });
      console.log('ok');
    } catch (error) {
      const cached = cachedDocs.get(docKey(doc.url));
      if (cached) {
        records.push({
          ...cached,
          id: doc.id || cached.id || stableId(doc.url),
          title: cached.title || doc.title,
          url: doc.url,
          tags: doc.tags || cached.tags || [],
          discovered: Boolean(doc.discovered),
          status: 'ok',
          cached: true,
          cachedBecause: error.message,
        });
        console.log(`cached (${error.message})`);
        continue;
      }

      records.push({
        id: doc.id || stableId(doc.url),
        title: doc.title,
        url: doc.url,
        tags: doc.tags || [],
        discovered: Boolean(doc.discovered),
        status: 'error',
        error: error.message,
      });
      console.log(`failed (${error.message})`);
    }
  }

  const officialSources = mergeOfficialSources([
    ...OFFICIAL_THEME_SOURCES,
    ...await discoverOfficialRepoSources(cachedOfficialSources),
  ]);

  console.log(`   Official theme sources: ${officialSources.length}`);

  for (const source of officialSources) {
    try {
      process.stdout.write(`   - ${source.title} ... `);
      const response = await fetchUrl(source.url);
      const hash = sha256(response.body);
      const extension = path.extname(new URL(source.url).pathname) || '.txt';
      const fileName = `official-${source.id}${extension}`;
      const rawPath = path.join(rawDir, fileName);
      fs.writeFileSync(rawPath, response.body);

      officialRecords.push({
        id: source.id,
        title: source.title,
        url: source.url,
        docsUrl: source.docsUrl,
        tags: source.tags || [],
        sha256: hash,
        bytes: Buffer.byteLength(response.body),
        contentType: response.contentType,
        rawPath: path.relative(rootDir, rawPath).replace(/\\/g, '/'),
        status: 'ok',
      });
      console.log('ok');
    } catch (error) {
      const cached = cachedOfficialSources.get(String(source.url || '').toLowerCase());
      if (cached) {
        officialRecords.push({
          ...cached,
          id: source.id,
          title: cached.title || source.title,
          url: source.url,
          docsUrl: source.docsUrl || cached.docsUrl,
          tags: source.tags || cached.tags || [],
          status: 'ok',
          cached: true,
          cachedBecause: error.message,
        });
        console.log(`cached (${error.message})`);
        continue;
      }

      officialRecords.push({
        id: source.id,
        title: source.title,
        url: source.url,
        docsUrl: source.docsUrl,
        tags: source.tags || [],
        status: 'error',
        error: error.message,
      });
      console.log(`failed (${error.message})`);
    }
  }

  const manifest = {
    version: 1,
    syncedAt: new Date().toISOString(),
    llms: {
      url: LLMS_URL,
      sha256: llmsHash,
      rawPath: path.relative(rootDir, llmsPath).replace(/\\/g, '/'),
      discoveredLinks: discovered.length,
    },
    docs: records,
    officialSources: officialRecords,
  };
  manifest.drift = diffManifests(driftBase, manifest);

  writeJson(manifestPath, manifest);
  console.log(`\n✅ Docs manifest written: ${path.relative(process.cwd(), manifestPath)}`);
  console.log(`   Added: ${manifest.drift.added.length}, Changed: ${manifest.drift.changed.length}, Removed: ${manifest.drift.removed.length}`);

  return manifest;
}

module.exports = {
  syncDocs,
};
