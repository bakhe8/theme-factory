const fs = require('fs');
const path = require('path');
const {
  LLMS_URL,
  OFFICIAL_THEME_REPOS,
  OFFICIAL_THEME_SOURCES,
  SEED_DOCS,
  generatedDir,
  rootDir,
} = require('./salla-docs-config');
const { ensureDir, fetchUrl, readJson, writeJson } = require('./utils');

const statusPath = path.join(generatedDir, 'url-status.json');
const reportsDir = path.join(rootDir, 'reports');

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function rel(filePath) {
  return toPosix(path.relative(rootDir, filePath));
}

function uniqueByUrl(items) {
  const byUrl = new Map();
  for (const item of items) {
    const url = String(item.url || '').trim();
    if (!url || byUrl.has(url)) continue;
    byUrl.set(url, item);
  }
  return [...byUrl.values()];
}

function configuredUrls() {
  const items = [
    {
      id: 'llms',
      title: 'Salla llms.txt',
      url: LLMS_URL,
      source: 'llms',
      critical: true,
    },
  ];

  for (const doc of SEED_DOCS) {
    items.push({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      source: 'seed-docs',
      critical: (doc.tags || []).includes('critical'),
      tags: doc.tags || [],
    });
  }

  for (const source of OFFICIAL_THEME_SOURCES) {
    items.push({
      id: source.id,
      title: source.title,
      url: source.url,
      source: 'official-theme-source',
      critical: true,
      tags: source.tags || [],
    });
    if (source.docsUrl) {
      items.push({
        id: `${source.id}-docs`,
        title: `${source.title} docs`,
        url: source.docsUrl,
        source: 'official-theme-source-docs',
        critical: false,
        tags: source.tags || [],
      });
    }
  }

  for (const repo of OFFICIAL_THEME_REPOS) {
    items.push({
      id: `${repo.id}-tree`,
      title: `${repo.title} source tree`,
      url: repo.treeUrl,
      source: 'official-theme-repo',
      critical: true,
      tags: repo.tags || [],
    });
    if (repo.repoUrl) {
      items.push({
        id: `${repo.id}-repo`,
        title: `${repo.title} repository`,
        url: repo.repoUrl,
        source: 'official-theme-repo',
        critical: false,
        tags: repo.tags || [],
      });
    }
    if (repo.docsUrl) {
      items.push({
        id: `${repo.id}-docs`,
        title: `${repo.title} docs`,
        url: repo.docsUrl,
        source: 'official-theme-repo-docs',
        critical: false,
        tags: repo.tags || [],
      });
    }
  }

  return uniqueByUrl(items);
}

function parseOptions(args = []) {
  const maxArg = args.find((arg) => arg.startsWith('--max='));
  return {
    max: maxArg ? Number(maxArg.split('=')[1]) : null,
    noNetwork: args.includes('--no-network'),
  };
}

async function checkOne(item) {
  const started = Date.now();
  try {
    const response = await fetchUrl(item.url);
    return {
      ...item,
      status: 'ok',
      http_status: response.status,
      final_url: response.url,
      duration_ms: Date.now() - started,
      error: null,
    };
  } catch (error) {
    return {
      ...item,
      status: 'failed',
      http_status: null,
      final_url: item.url,
      duration_ms: Date.now() - started,
      error: error.message,
    };
  }
}

function loadUrlStatus() {
  return readJson(statusPath, null);
}

function summarize(records) {
  const failed = records.filter((item) => item.status !== 'ok');
  const criticalFailed = failed.filter((item) => item.critical);
  return {
    total: records.length,
    ok: records.length - failed.length,
    failed: failed.length,
    critical_failed: criticalFailed.length,
  };
}

function writeUrlReport(result) {
  ensureDir(reportsDir);
  const reportPath = path.join(reportsDir, 'docs-url-status.md');
  const summary = result.summary;
  const lines = [
    '# Salla Docs URL Status',
    '',
    `- **Checked at:** ${result.checked_at}`,
    `- **URLs:** ${summary.ok}/${summary.total}`,
    `- **Failed:** ${summary.failed}`,
    `- **Critical failed:** ${summary.critical_failed}`,
    '',
  ];

  const failed = result.records.filter((item) => item.status !== 'ok');
  if (failed.length) {
    lines.push('## Failed URLs', '');
    for (const item of failed) {
      lines.push(`- ${item.critical ? '**critical** ' : ''}${item.title}: ${item.url}`);
      lines.push(`  - ${item.error || 'failed'}`);
    }
    lines.push('');
  }

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
  return reportPath;
}

async function monitorConfiguredUrls(args = []) {
  const options = parseOptions(args);
  const urls = configuredUrls();
  const selected = options.max ? urls.slice(0, options.max) : urls;

  if (options.noNetwork) {
    const result = {
      schema: 'salla-theme-factory/docs-url-status@1',
      checked_at: new Date().toISOString(),
      mode: 'no-network',
      configured_urls: urls.length,
      summary: summarize([]),
      records: [],
    };
    writeJson(statusPath, result);
    return result;
  }

  const records = [];
  console.log(`🔎 Checking configured Salla docs URLs: ${selected.length}/${urls.length}`);
  for (const item of selected) {
    process.stdout.write(`   - ${item.title} ... `);
    const record = await checkOne(item);
    records.push(record);
    console.log(record.status === 'ok' ? 'ok' : `failed (${record.error})`);
  }

  const result = {
    schema: 'salla-theme-factory/docs-url-status@1',
    checked_at: new Date().toISOString(),
    mode: options.max ? 'partial' : 'full',
    configured_urls: urls.length,
    summary: summarize(records),
    records,
  };

  ensureDir(generatedDir);
  writeJson(statusPath, result);
  writeUrlReport(result);
  return result;
}

async function printUrlStatus(args = []) {
  const result = await monitorConfiguredUrls(args);
  const reportPath = writeUrlReport(result);

  console.log('\n🔎 Salla Docs URL Monitor');
  console.log('-------------------------');
  console.log(`Checked: ${result.summary.ok}/${result.summary.total}`);
  console.log(`Failed: ${result.summary.failed}`);
  console.log(`Critical failed: ${result.summary.critical_failed}`);
  console.log(`Report: ${rel(reportPath)}`);

  if (result.summary.critical_failed > 0) {
    process.exitCode = 1;
  }
}

module.exports = {
  configuredUrls,
  loadUrlStatus,
  monitorConfiguredUrls,
  printUrlStatus,
};
