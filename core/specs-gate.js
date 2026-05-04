const fs = require('fs');
const path = require('path');
const { loadThemeSpecs } = require('./specs-loader');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');

const REQUIRED_SECTIONS = [
  'brand',
  'visual_identity',
  'features',
  'verticals',
  'experiences',
  'page_experiences',
  'integrations',
  'innovation',
];

function requiredItems(specs, section) {
  return Object.entries(specs?.[section] || {})
    .filter(([, config]) => config && config.required === true)
    .map(([key, config]) => config.id || config.vertical || config.experience || key);
}

function validateSpecsContract(themeName, args = []) {
  const loaded = loadThemeSpecs(themeName, args);
  const result = {
    theme: themeName,
    specsPath: loaded.path,
    specsExists: loaded.exists,
    sections: [],
    required: {
      verticals: [],
      experiences: [],
      page_experiences: [],
      integrations: [],
      innovation: [],
    },
    issues: [],
    warnings: [],
  };

  const themePath = path.join(themesDir, themeName || '');
  if (!themeName || !fs.existsSync(themePath)) {
    result.issues.push(`الثيم غير موجود: ${themeName || '-'}`);
    return result;
  }

  if (!loaded.exists) {
    result.issues.push(`ملف المواصفات إلزامي للاعتماد: ${path.relative(rootDir, loaded.path)}`);
    return result;
  }

  if (!loaded.valid) {
    result.issues.push(`ملف المواصفات غير صالح: ${path.relative(rootDir, loaded.path)} - ${loaded.error}`);
    return result;
  }

  const specs = loaded.specs;
  for (const section of REQUIRED_SECTIONS) {
    if (Object.prototype.hasOwnProperty.call(specs, section)) {
      result.sections.push(section);
    } else {
      result.issues.push(`قسم المواصفات مفقود: ${section}`);
    }
  }

  if (specs.brand?.identifier && specs.brand.identifier !== themeName) {
    result.issues.push(`brand.identifier يجب أن يطابق اسم مجلد الثيم: ${themeName}`);
  }

  if (!specs.brand?.name_ar && !specs.brand?.name_en) {
    result.warnings.push('brand.name_ar أو brand.name_en غير محدد');
  }

  if (!specs.visual_identity?.preset) {
    result.warnings.push('visual_identity.preset غير محدد');
  }

  if (specs.visual_identity?.preset === 'custom') {
    for (const color of ['primary', 'accent', 'background', 'text']) {
      if (!specs.visual_identity?.colors?.[color]) {
        result.issues.push(`visual_identity.colors.${color} مطلوب عند استخدام preset=custom`);
      }
    }
  }

  if (specs.innovation && !Array.isArray(specs.innovation.experiments)) {
    result.issues.push('innovation.experiments يجب أن يكون array');
  }

  result.required.verticals = requiredItems(specs, 'verticals');
  result.required.experiences = requiredItems(specs, 'experiences');
  result.required.page_experiences = requiredItems(specs, 'page_experiences');
  result.required.integrations = requiredItems(specs, 'integrations');
  result.required.innovation = Array.isArray(specs.innovation?.experiments)
    ? specs.innovation.experiments
      .map((entry) => (typeof entry === 'string' ? entry : entry?.id))
      .filter(Boolean)
    : [];

  return result;
}

function printGate(themeName, args = []) {
  const result = validateSpecsContract(themeName, args);

  console.log(`\n📋 Specs Contract Gate | ${themeName || '-'}`);
  console.log('--------------------------------');
  console.log(`Specs: ${path.relative(rootDir, result.specsPath)}${result.specsExists ? '' : ' (not found)'}`);
  console.log(`Sections: ${result.sections.length}/${REQUIRED_SECTIONS.length}`);
  console.log(`Required verticals: ${result.required.verticals.join(', ') || '-'}`);
  console.log(`Required experiences: ${result.required.experiences.join(', ') || '-'}`);
  console.log(`Required page experiences: ${result.required.page_experiences.join(', ') || '-'}`);
  console.log(`Required integrations: ${result.required.integrations.join(', ') || '-'}`);
  console.log(`Innovation experiments: ${result.required.innovation.join(', ') || '-'}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  for (const issue of result.issues) console.log(`❌ ${issue}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning}`);

  if (result.issues.length) {
    console.log('\n❌ Specs contract gate failed.');
    process.exitCode = 1;
    return result;
  }

  console.log('\n✅ Specs contract gate passed.');
  return result;
}

function main() {
  const [command = 'gate', themeName, ...rest] = process.argv.slice(2);

  if (command !== 'gate' || !themeName) {
    console.log('Usage: node factory.js specs gate <theme> [--specs=path]');
    process.exitCode = 1;
    return;
  }

  printGate(themeName, rest);
}

if (require.main === module) {
  main();
}

module.exports = {
  validateSpecsContract,
};
