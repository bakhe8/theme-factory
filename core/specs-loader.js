const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const specsDir = path.join(rootDir, 'specs');

function specsPathForTheme(themeName, args = []) {
  const explicit = (args || []).find((arg) => String(arg).startsWith('--specs='));
  if (explicit) return path.resolve(String(explicit).slice('--specs='.length));
  return path.join(specsDir, `${themeName}.specs.json`);
}

function loadThemeSpecs(themeName, args = []) {
  const specsPath = specsPathForTheme(themeName, args);

  if (!fs.existsSync(specsPath)) {
    return {
      path: specsPath,
      exists: false,
      valid: true,
      specs: {},
      error: null,
    };
  }

  try {
    const specs = JSON.parse(fs.readFileSync(specsPath, 'utf8'));
    return {
      path: specsPath,
      exists: true,
      valid: true,
      specs: specs || {},
      error: null,
    };
  } catch (error) {
    return {
      path: specsPath,
      exists: true,
      valid: false,
      specs: {},
      error: error.message,
    };
  }
}

function requiredSpecEntries(specs, section, normalizeId) {
  const entries = [];
  for (const [key, config] of Object.entries(specs?.[section] || {})) {
    if (!config || config.required !== true) continue;
    const id = normalizeId(config.id || config.vertical || config.experience || key);
    entries.push({ id, key, config });
  }
  return entries;
}

module.exports = {
  loadThemeSpecs,
  requiredSpecEntries,
  specsPathForTheme,
};
