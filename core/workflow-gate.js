const fs = require('fs');
const path = require('path');
const { loadThemeSpecs } = require('./specs-loader');
const { getApprovedThemeSource, rootDir } = require('./factory-config');

const themesDir = path.join(rootDir, 'themes');
const REQUIRED_BASE_TEMPLATE = 'raed';

function manifestPathFor(themeName) {
  return path.join(themesDir, themeName || '', '.factory', 'manifest.json');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function validateWorkflow(themeName, options = {}) {
  const themePath = path.join(themesDir, themeName || '');
  const manifestPath = manifestPathFor(themeName);
  const result = {
    theme: themeName,
    manifestPath,
    role: '',
    sourceTemplate: '',
    issues: [],
    warnings: [],
  };

  if (!themeName || !fs.existsSync(themePath)) {
    result.issues.push(`الثيم غير موجود: ${themeName || '-'}`);
    return result;
  }

  if (!fs.existsSync(manifestPath)) {
    result.issues.push(`الثيم لا يحمل توقيع المصنع: ${path.relative(rootDir, manifestPath)}`);
    result.issues.push('لا تبدأ من نسخ Raed يدوياً. ابدأ بـ: node factory.js intake <theme> ثم node factory.js manufacture <theme>');
    return result;
  }

  let manifest;
  try {
    manifest = readJson(manifestPath);
  } catch (error) {
    result.issues.push(`ملف توقيع المصنع غير صالح: ${path.relative(rootDir, manifestPath)} - ${error.message}`);
    return result;
  }

  result.role = manifest.role || '';
  result.sourceTemplate = manifest.source_template || '';

  if (manifest.schema !== 'salla-theme-factory/theme-manifest@1') {
    result.issues.push(`manifest.schema غير معروف: ${manifest.schema || '-'}`);
  }

  if (manifest.theme !== themeName) {
    result.issues.push(`manifest.theme يجب أن يطابق اسم الثيم: ${themeName}`);
  }

  if (manifest.created_by !== 'salla-theme-factory') {
    result.issues.push('created_by داخل manifest يجب أن يكون salla-theme-factory');
  }

  if (!['generated-theme', 'source-template'].includes(manifest.role)) {
    result.issues.push(`role غير معروف داخل manifest: ${manifest.role || '-'}`);
  }

  if (manifest.role === 'generated-theme') {
    if (manifest.source_template !== REQUIRED_BASE_TEMPLATE) {
      result.issues.push(`source_template يجب أن يكون ${REQUIRED_BASE_TEMPLATE}. كل الثيمات المولدة تبدأ من themes/${REQUIRED_BASE_TEMPLATE} فقط.`);
    }

    const source = getApprovedThemeSource(manifest.source_template || 'raed');
    if (!source) {
      result.issues.push(`source_template غير معتمد في factory.config.json: ${manifest.source_template || '-'}`);
    } else if (manifest.source_path && manifest.source_path !== source.path) {
      result.issues.push(`manifest.source_path لا يطابق المصدر المعتمد: ${source.path}`);
    }

    const specs = loadThemeSpecs(themeName);
    if (!specs.exists) {
      result.issues.push(`الثيم المولد يجب أن يملك عقد مواصفات: specs/${themeName}.specs.json`);
    }
    if (!manifest.specs_path) {
      result.issues.push('manifest.specs_path مفقود');
    } else if (specs.exists) {
      const expectedSpecsPath = path.relative(rootDir, specs.path).replace(/\\/g, '/');
      if (manifest.specs_path !== expectedSpecsPath) {
        result.issues.push(`manifest.specs_path يجب أن يطابق عقد الثيم: ${expectedSpecsPath}`);
      }
    }
  }

  if (manifest.role === 'source-template') {
    result.warnings.push('هذا الثيم مصدر تصنيع/معايرة، وليس مخرجاً جاهزاً للتسليم.');
    if (options.requireDeliverable) {
      result.issues.push('لا يمكن تسليم source-template. أنشئ ثيماً مولداً عبر manufacture.');
    }
  }

  return result;
}

function printGate(themeName, args = []) {
  const result = validateWorkflow(themeName, {
    requireDeliverable: args.includes('--deliverable'),
  });

  console.log(`\n🏭 Factory Workflow Gate | ${themeName || '-'}`);
  console.log('--------------------------------');
  console.log(`Manifest: ${path.relative(rootDir, result.manifestPath)}`);
  console.log(`Role: ${result.role || '-'}`);
  console.log(`Source template: ${result.sourceTemplate || '-'}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  for (const issue of result.issues) console.log(`❌ ${issue}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning}`);

  if (result.issues.length) {
    console.log('\n❌ Factory workflow gate failed.');
    process.exitCode = 1;
    return result;
  }

  console.log('\n✅ Factory workflow gate passed.');
  return result;
}

function main() {
  const [command = 'gate', themeName, ...rest] = process.argv.slice(2);
  if (command !== 'gate' || !themeName) {
    console.log('Usage: node factory.js workflow gate <theme> [--deliverable]');
    process.exitCode = 1;
    return;
  }

  printGate(themeName, rest);
}

if (require.main === module) main();

module.exports = {
  manifestPathFor,
  validateWorkflow,
};
