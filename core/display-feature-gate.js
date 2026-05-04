const fs = require('fs');
const path = require('path');
const {
  componentPathFor,
  defaultSlugFor,
  getExperience,
  isImplemented,
  listExperiences,
  normalizeExperienceId,
} = require('./experience-registry');
const { loadThemeSpecs, requiredSpecEntries } = require('./specs-loader');
const { getApprovedThemeSource } = require('./factory-config');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');
const generatedDir = path.join(__dirname, 'docs-intelligence', 'generated');

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function rel(file) {
  return path.relative(rootDir, file).replace(/\\/g, '/');
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((entry) => entry.endsWith(ext))
    .map((entry) => path.join(dir, entry));
}

function officialHomeComponentPaths(themeName) {
  const templateComponents = readJson(path.join(generatedDir, 'template-components.json'), []);
  const paths = new Set();

  for (const component of templateComponents || []) {
    const name = component.name || path.basename(component.path || '', '.twig');
    if (!name || name.includes('/')) continue;
    paths.add(`home.${name}`);
  }

  const source = getApprovedThemeSource('raed');
  const sourceTwilight = source ? readJson(path.join(source.absolutePath, 'twilight.json'), null) : null;
  for (const component of sourceTwilight?.components || []) {
    if (knownFactoryExperienceByComponentPath(component.path || '')) continue;
    if (component.path) paths.add(component.path);
  }
  if (source?.absolutePath) {
    const sourceHomeDir = path.join(source.absolutePath, 'src', 'views', 'components', 'home');
    for (const file of listFiles(sourceHomeDir, '.twig')) {
      const componentPath = `home.${path.basename(file, '.twig')}`;
      if (knownFactoryExperienceByComponentPath(componentPath)) continue;
      paths.add(componentPath);
    }
  }

  const themeManifest = readJson(path.join(themesDir, themeName || '', '.factory', 'manifest.json'), null);
  if (themeManifest?.source_template && themeManifest.source_template !== 'raed') {
    const themeSource = getApprovedThemeSource(themeManifest.source_template);
    const twilight = themeSource ? readJson(path.join(themeSource.absolutePath, 'twilight.json'), null) : null;
    for (const component of twilight?.components || []) {
      if (knownFactoryExperienceByComponentPath(component.path || '')) continue;
      if (component.path) paths.add(component.path);
    }
    if (themeSource?.absolutePath) {
      const sourceHomeDir = path.join(themeSource.absolutePath, 'src', 'views', 'components', 'home');
      for (const file of listFiles(sourceHomeDir, '.twig')) {
        const componentPath = `home.${path.basename(file, '.twig')}`;
        if (knownFactoryExperienceByComponentPath(componentPath)) continue;
        paths.add(componentPath);
      }
    }
  }

  return paths;
}

function requiredExperienceComponents(themeName) {
  const loaded = loadThemeSpecs(themeName);
  const issues = [];
  const required = new Map();

  if (!loaded.exists) {
    issues.push(`ملف المواصفات غير موجود: specs/${themeName}.specs.json`);
    return { specsPath: loaded.path, specsExists: false, required, issues };
  }

  if (!loaded.valid) {
    issues.push(`ملف المواصفات غير صالح: ${rel(loaded.path)} - ${loaded.error}`);
    return { specsPath: loaded.path, specsExists: true, required, issues };
  }

  for (const item of requiredSpecEntries(loaded.specs, 'experiences', normalizeExperienceId)) {
    const experience = getExperience(item.id);
    if (!experience) {
      issues.push(`specs.experiences يطلب تجربة غير معروفة: ${item.key}`);
      continue;
    }
    if (!isImplemented(experience)) {
      issues.push(`specs.experiences يطلب تجربة غير منفذة في المصنع: ${experience.id}`);
      continue;
    }

    const slug = defaultSlugFor(experience, item.config?.slug);
    required.set(componentPathFor(experience, slug), {
      id: experience.id,
      slug,
      componentPath: componentPathFor(experience, slug),
    });
  }

  return {
    specsPath: loaded.path,
    specsExists: loaded.exists,
    required,
    issues,
  };
}

function knownFactoryExperienceByComponentPath(componentPath) {
  for (const experience of listExperiences().filter(isImplemented)) {
    const prefix = `${experience.componentPathPrefix || 'home'}.`;
    if (!componentPath.startsWith(prefix)) continue;
    const slug = componentPath.slice(prefix.length);
    if (!slug) continue;
    if (slug === defaultSlugFor(experience) || slug === experience.id || slug === experience.defaultSlug) {
      return { experience, slug };
    }
    if (componentPath.includes(experience.id) || componentPath.includes(experience.defaultSlug || '')) {
      return { experience, slug };
    }
  }
  return null;
}

function validateDisplayFeatures(themeName) {
  const themePath = path.join(themesDir, themeName || '');
  const result = {
    theme: themeName,
    specsPath: '',
    officialComponents: [],
    requiredFactoryExperiences: [],
    issues: [],
    warnings: [],
  };

  if (!themeName || !fs.existsSync(themePath)) {
    result.issues.push(`الثيم غير موجود: ${themeName || '-'}`);
    return result;
  }

  const twilightPath = path.join(themePath, 'twilight.json');
  const twilight = readJson(twilightPath, null);
  if (!twilight) {
    result.issues.push(`twilight.json غير صالح أو مفقود: ${rel(twilightPath)}`);
    return result;
  }

  const officialPaths = officialHomeComponentPaths(themeName);
  const required = requiredExperienceComponents(themeName);
  result.specsPath = required.specsPath;
  result.issues.push(...required.issues);
  result.officialComponents = [...officialPaths].sort();
  result.requiredFactoryExperiences = [...required.required.values()].map((item) => item.componentPath).sort();

  const componentPaths = new Set((twilight.components || []).map((component) => component.path).filter(Boolean));
  for (const component of twilight.components || []) {
    const componentPath = component.path || '';
    if (!componentPath) continue;
    if (officialPaths.has(componentPath)) continue;
    if (required.required.has(componentPath)) continue;

    const knownExperience = knownFactoryExperienceByComponentPath(componentPath);
    if (knownExperience) {
      result.issues.push(
        `${componentPath}: تجربة ${knownExperience.experience.id} موجودة في الثيم لكنها غير مطلوبة في specs.experiences`,
      );
      continue;
    }

    result.issues.push(
      `${componentPath}: مكون عرض غير مسجل في المصنع. طوّر الميزة داخل Registry/Factory أولاً ثم اطلبها من specs.`,
    );
  }

  for (const requiredPath of required.required.keys()) {
    if (!componentPaths.has(requiredPath)) {
      result.issues.push(`${requiredPath}: تجربة مطلوبة في specs لكنها غير مسجلة داخل twilight.components`);
    }
  }

  const homeDir = path.join(themePath, 'src', 'views', 'components', 'home');
  for (const file of listFiles(homeDir, '.twig')) {
    const slug = path.basename(file, '.twig');
    const componentPath = `home.${slug}`;
    if (officialPaths.has(componentPath) || required.required.has(componentPath)) continue;
    result.issues.push(
      `${rel(file)}: ملف عرض home غير تابع لقالب سلة ولا لتجربة مصنع مطلوبة في specs`,
    );
  }

  const jsComponentsDir = path.join(themePath, 'src', 'assets', 'js', 'components');
  const requiredSlugs = new Set([...required.required.values()].map((item) => item.slug));
  for (const file of listFiles(jsComponentsDir, '.js')) {
    const slug = path.basename(file, '.js');
    if (requiredSlugs.has(slug)) continue;
    result.issues.push(
      `${rel(file)}: JS تجربة عرض غير مطلوب في specs. انقل التطوير إلى المصنع أو احذفه من الثيم.`,
    );
  }

  return result;
}

function printGate(themeName) {
  const result = validateDisplayFeatures(themeName);

  console.log(`\n🧩 Factory Display Feature Gate | ${themeName || '-'}`);
  console.log('----------------------------------------');
  if (result.specsPath) console.log(`Specs: ${rel(result.specsPath)}`);
  console.log(`Official/template components: ${result.officialComponents.length}`);
  console.log(`Required factory experiences: ${result.requiredFactoryExperiences.join(', ') || '-'}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  for (const issue of result.issues) console.log(`❌ ${issue}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning}`);

  if (result.issues.length) {
    console.log('\n❌ Factory display feature gate failed.');
    process.exitCode = 1;
    return result;
  }

  console.log('\n✅ Factory display feature gate passed.');
  return result;
}

function main() {
  const [command = 'gate', themeName] = process.argv.slice(2);
  if (command !== 'gate' || !themeName) {
    console.log('Usage: node factory.js display gate <theme>');
    process.exitCode = 1;
    return;
  }

  printGate(themeName);
}

if (require.main === module) main();

module.exports = {
  validateDisplayFeatures,
};
