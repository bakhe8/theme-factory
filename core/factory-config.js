const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'factory.config.json');

const fallbackConfig = {
  factory_version: '10.0.0',
  workspaces: {
    workorders: 'workorders',
    specs: 'specs',
    themes: 'themes',
    innovations: 'innovations',
    build: 'build',
    reports: 'reports',
    deliverables: 'deliverables',
  },
  approved_theme_sources: {
    raed: {
      path: 'themes/raed',
      role: 'official-open-source-base',
      source_url: 'https://github.com/SallaApp/theme-raed',
      locked: true,
    },
  },
};

function loadFactoryConfig() {
  if (!fs.existsSync(configPath)) return fallbackConfig;
  return {
    ...fallbackConfig,
    ...JSON.parse(fs.readFileSync(configPath, 'utf8')),
  };
}

function workspacePath(name) {
  const config = loadFactoryConfig();
  return path.join(rootDir, config.workspaces?.[name] || fallbackConfig.workspaces[name] || name);
}

function getApprovedThemeSource(sourceId = 'raed') {
  const config = loadFactoryConfig();
  const source = config.approved_theme_sources?.[sourceId];
  if (!source) return null;
  return {
    id: sourceId,
    ...source,
    absolutePath: path.join(rootDir, source.path),
  };
}

function listApprovedThemeSources() {
  const config = loadFactoryConfig();
  return Object.keys(config.approved_theme_sources || {}).map(getApprovedThemeSource).filter(Boolean);
}

module.exports = {
  configPath,
  getApprovedThemeSource,
  listApprovedThemeSources,
  loadFactoryConfig,
  rootDir,
  workspacePath,
};
