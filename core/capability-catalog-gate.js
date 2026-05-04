const fs = require('fs');
const path = require('path');
const { listExperiences, normalizeExperienceId } = require('./experience-registry');
const { listIntegrations, normalizeIntegrationId } = require('./integration-registry');
const { listPageExperiences, normalizePageExperienceId } = require('./page-experience-registry');
const { listVerticals, normalizeVerticalId } = require('./vertical-registry');
const { loadThemeSpecs, requiredSpecEntries } = require('./specs-loader');

const rootDir = path.join(__dirname, '..');
const capabilitiesDir = path.join(rootDir, 'capabilities');
const reportsDir = path.join(rootDir, 'reports');
const schema = 'salla-theme-factory/capability@1';

const HELP = `
Usage:
  node factory.js capabilities list
  node factory.js capabilities show <capability-id>
  node factory.js capabilities new <capability-id> --type=<type> [--dry-run]
  node factory.js capabilities gate [theme] [--specs=path]

Examples:
  node factory.js capabilities list
  node factory.js capabilities show fragrance-discovery
  node factory.js capabilities new scent-quiz --type=home-experience
  node factory.js capabilities gate luxury-fragrance
`;

const allowedTypes = new Set(['home-experience', 'page-experience', 'integration', 'vertical']);
const allowedStatuses = new Set([
  'research',
  'proposed',
  'experimental',
  'planned',
  'implemented',
  'certified',
  'requires-contract',
  'rejected',
]);
const productionStatuses = new Set(['implemented', 'certified']);
const allowedDecisions = new Set([
  'allowed',
  'allowed_with_conditions',
  'requires_contract',
  'needs_exception',
  'unknown',
  'rejected',
]);

const typeSections = {
  'home-experience': 'experiences',
  'page-experience': 'page_experiences',
  integration: 'integrations',
  vertical: 'verticals',
};

const typeNormalizers = {
  'home-experience': normalizeExperienceId,
  'page-experience': normalizePageExperienceId,
  integration: normalizeIntegrationId,
  vertical: normalizeVerticalId,
};

const typeDirs = {
  'home-experience': 'home',
  'page-experience': 'page',
  integration: 'integrations',
  vertical: 'verticals',
};

const factoryDefaults = {
  'home-experience': {
    registry: 'core/experience-registry.js',
    generator: 'core/experience-factory.js',
    gate: 'core/experience-gate.js',
    spec_section: 'experiences',
  },
  'page-experience': {
    registry: 'core/page-experience-registry.js',
    generator: 'core/page-experience-factory.js',
    gate: 'core/page-experience-gate.js',
    spec_section: 'page_experiences',
  },
  integration: {
    registry: 'core/integration-registry.js',
    generator: 'core/integration-factory.js',
    gate: 'core/integration-factory.js',
    spec_section: 'integrations',
  },
  vertical: {
    registry: 'core/vertical-registry.js',
    generator: 'core/vertical-factory.js',
    gate: 'core/vertical-factory.js',
    spec_section: 'verticals',
  },
};

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function rel(filePath) {
  return toPosix(path.relative(rootDir, filePath));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureReportsDir() {
  fs.mkdirSync(reportsDir, { recursive: true });
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isReference(value) {
  return /^https?:\/\/[^\s]+$/i.test(String(value || '')) || /^[a-z0-9_.\-\/]+$/i.test(String(value || ''));
}

function collectCapabilityFiles(dir = capabilitiesDir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCapabilityFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.capability.json')) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => rel(a).localeCompare(rel(b)));
}

function normalizeCapabilityId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function specKeyFor(id) {
  return normalizeCapabilityId(id).replace(/-/g, '_');
}

function registryEntriesFor(type) {
  if (type === 'home-experience') {
    return listExperiences()
      .filter((item) => item.status === 'implemented' && item.componentPreset)
      .map((item) => ({ id: item.id, status: item.status }));
  }

  if (type === 'page-experience') {
    return listPageExperiences()
      .filter((item) => item.status === 'implemented')
      .map((item) => ({ id: item.id, status: item.status }));
  }

  if (type === 'integration') {
    return listIntegrations().map((item) => ({ id: item.id, status: item.status }));
  }

  if (type === 'vertical') {
    return listVerticals().map((item) => ({ id: item.id, status: 'implemented' }));
  }

  return [];
}

function registryHas(type, id) {
  const normalize = typeNormalizers[type] || normalizeCapabilityId;
  const normalizedId = normalize(id);
  return registryEntriesFor(type).some((item) => normalize(item.id) === normalizedId);
}

function validateCapabilityShape(record, file, result) {
  const fileLabel = rel(file);

  if (!isObject(record)) {
    result.issues.push(`${fileLabel}: الملف يجب أن يحتوي JSON object`);
    return;
  }

  if (record.schema !== schema) {
    result.issues.push(`${fileLabel}: schema غير صحيح. المتوقع ${schema}`);
  }

  const normalizedId = normalizeCapabilityId(record.id);
  if (!normalizedId || normalizedId !== record.id) {
    result.issues.push(`${fileLabel}: id يجب أن يكون kebab-case واضح`);
  }

  if (path.basename(file) !== `${record.id}.capability.json`) {
    result.issues.push(`${fileLabel}: اسم الملف يجب أن يطابق id: ${record.id}.capability.json`);
  }

  if (!allowedTypes.has(record.type)) {
    result.issues.push(`${fileLabel}: type غير معروف: ${record.type || '-'}`);
  }

  if (!allowedStatuses.has(record.status)) {
    result.issues.push(`${fileLabel}: status غير معروف: ${record.status || '-'}`);
  }

  if (!isObject(record.title) || (!record.title.ar && !record.title.en)) {
    result.issues.push(`${fileLabel}: title.ar أو title.en مطلوب`);
  }

  if (!record.summary) {
    result.issues.push(`${fileLabel}: summary مطلوب`);
  }

  if (!isObject(record.source)) {
    result.issues.push(`${fileLabel}: source مطلوب`);
  } else {
    if (!record.source.kind) result.issues.push(`${fileLabel}: source.kind مطلوب`);
    if (!Array.isArray(record.source.links)) {
      result.issues.push(`${fileLabel}: source.links يجب أن يكون array`);
    } else {
      for (const [index, link] of record.source.links.entries()) {
        if (!isObject(link) || !link.title || !isReference(link.url)) {
          result.issues.push(`${fileLabel}: source.links[${index}] يحتاج title وurl صحيح`);
        }
      }
    }
  }

  if (!isObject(record.policy)) {
    result.issues.push(`${fileLabel}: policy مطلوب`);
  } else {
    if (!allowedDecisions.has(record.policy.decision)) {
      result.issues.push(`${fileLabel}: policy.decision غير معروف: ${record.policy.decision || '-'}`);
    }
    if (!Array.isArray(record.policy.conditions) || !record.policy.conditions.length) {
      result.issues.push(`${fileLabel}: policy.conditions مطلوبة ولو بشرط واحد`);
    }
  }

  if (!isObject(record.factory)) {
    result.issues.push(`${fileLabel}: factory مطلوب`);
  } else {
    for (const field of ['registry', 'generator', 'gate', 'spec_section', 'spec_key', 'registry_id']) {
      if (!record.factory[field]) result.issues.push(`${fileLabel}: factory.${field} مطلوب`);
    }

    if (record.type && typeSections[record.type] && record.factory.spec_section !== typeSections[record.type]) {
      result.issues.push(`${fileLabel}: factory.spec_section يجب أن يكون ${typeSections[record.type]} لهذا النوع`);
    }

    if (
      record.type
      && record.factory.registry_id
      && productionStatuses.has(record.status)
      && !registryHas(record.type, record.factory.registry_id)
    ) {
      result.issues.push(`${fileLabel}: factory.registry_id غير موجود في registry: ${record.factory.registry_id}`);
    }
  }

  if (!isObject(record.quality) || !Array.isArray(record.quality.required_gates) || !record.quality.required_gates.length) {
    result.issues.push(`${fileLabel}: quality.required_gates مطلوبة`);
  }
}

function loadCapabilities() {
  const result = {
    capabilities: [],
    byId: new Map(),
    issues: [],
    warnings: [],
  };

  const files = collectCapabilityFiles();
  if (!files.length) {
    result.issues.push('capabilities/: لا توجد ملفات capability catalog');
    return result;
  }

  for (const file of files) {
    try {
      const record = readJson(file);
      record.__file = file;
      validateCapabilityShape(record, file, result);

      if (record.id) {
        if (result.byId.has(record.id)) {
          result.issues.push(`${rel(file)}: capability id مكرر مع ${rel(result.byId.get(record.id).__file)}`);
        } else {
          result.byId.set(record.id, record);
        }
      }

      result.capabilities.push(record);
    } catch (error) {
      result.issues.push(`${rel(file)}: JSON غير صالح - ${error.message}`);
    }
  }

  return result;
}

function capabilityForRequirement(catalog, type, id) {
  const normalize = typeNormalizers[type] || normalizeCapabilityId;
  const normalizedId = normalize(id);

  return catalog.capabilities.find((capability) => {
    if (capability.type !== type || !capability.factory) return false;
    return normalize(capability.id) === normalizedId || normalize(capability.factory.registry_id) === normalizedId;
  }) || null;
}

function validateRegistryCoverage(catalog, result) {
  for (const type of allowedTypes) {
    const normalize = typeNormalizers[type] || normalizeCapabilityId;
    for (const entry of registryEntriesFor(type)) {
      const capability = capabilityForRequirement(catalog, type, normalize(entry.id));
      if (!capability) {
        result.issues.push(`${type}: registry entry بلا capability catalog: ${entry.id}`);
      }
    }
  }
}

function activeRequirementsFromSpecs(themeName, args, result) {
  const loaded = loadThemeSpecs(themeName, args);
  result.specsPath = loaded.path;
  result.specsExists = loaded.exists;

  if (!loaded.exists) {
    result.issues.push(`${themeName}: ملف المواصفات غير موجود: ${rel(loaded.path)}`);
    return [];
  }

  if (!loaded.valid) {
    result.issues.push(`${themeName}: ملف المواصفات غير صالح: ${loaded.error}`);
    return [];
  }

  const specs = loaded.specs || {};
  const requirements = [
    ...requiredSpecEntries(specs, 'experiences', normalizeExperienceId).map((item) => ({ ...item, type: 'home-experience' })),
    ...requiredSpecEntries(specs, 'page_experiences', normalizePageExperienceId).map((item) => ({ ...item, type: 'page-experience' })),
    ...requiredSpecEntries(specs, 'verticals', normalizeVerticalId).map((item) => ({ ...item, type: 'vertical' })),
    ...requiredSpecEntries(specs, 'integrations', normalizeIntegrationId).map((item) => ({ ...item, type: 'integration' })),
  ];

  for (const [key, config] of Object.entries(specs.integrations || {})) {
    if (!config || config.required === true) continue;
    const id = normalizeIntegrationId(config.id || key);
    const capability = capabilityForRequirement({ capabilities: result.capabilities }, 'integration', id);
    if (!capability) {
      result.warnings.push(`${themeName}: تكامل اختياري غير مسجل في catalog: ${key}`);
    }
  }

  return requirements;
}

function validateThemeRequirements(themeName, args, catalog, result) {
  const themePath = path.join(rootDir, 'themes', themeName || '');
  if (!themeName || !fs.existsSync(themePath)) {
    result.issues.push(`الثيم غير موجود: ${themeName || '-'}`);
    return;
  }

  const requirements = activeRequirementsFromSpecs(themeName, args, result);
  result.requirements = requirements.map((item) => ({
    type: item.type,
    id: item.id,
    key: item.key,
  }));

  for (const requirement of requirements) {
    const capability = capabilityForRequirement(catalog, requirement.type, requirement.id);
    if (!capability) {
      result.issues.push(`${themeName}: ${requirement.type}/${requirement.key} مطلوب في specs لكن لا يملك capability catalog`);
      continue;
    }

    if (!productionStatuses.has(capability.status)) {
      result.issues.push(`${themeName}: ${capability.id} مطلوب للإنتاج لكن حالته ${capability.status}. المطلوب implemented أو certified`);
    }

    if (capability.policy?.decision === 'rejected' || capability.policy?.decision === 'unknown') {
      result.issues.push(`${themeName}: ${capability.id} لا يملك قرار سياسة يسمح بالإنتاج: ${capability.policy.decision}`);
    }

    result.active.push({
      type: requirement.type,
      id: capability.id,
      status: capability.status,
      spec_key: requirement.key,
      file: rel(capability.__file),
    });
  }
}

function validateCatalog(themeName = null, args = []) {
  const catalog = loadCapabilities();
  const result = {
    schema: 'salla-theme-factory/capability-gate@1',
    theme: themeName || null,
    specsPath: null,
    specsExists: false,
    capabilities: catalog.capabilities,
    active: [],
    requirements: [],
    issues: [...catalog.issues],
    warnings: [...catalog.warnings],
  };

  validateRegistryCoverage(catalog, result);

  if (themeName) {
    validateThemeRequirements(themeName, args, catalog, result);
  }

  return result;
}

function writeReport(result) {
  ensureReportsDir();

  const suffix = result.theme ? `-${result.theme}` : '';
  const reportPath = path.join(reportsDir, `capability-catalog${suffix}.md`);
  const reportJsonPath = path.join(reportsDir, `capability-catalog${suffix}.json`);
  const status = result.issues.length ? 'failed' : 'passed';

  const lines = [
    '# Capability Catalog Gate',
    '',
    `- **Status:** ${status}`,
    `- **Theme:** ${result.theme || '-'}`,
    `- **Capabilities:** ${result.capabilities.length}`,
    `- **Active requirements:** ${result.active.length}`,
    `- **Issues:** ${result.issues.length}`,
    `- **Warnings:** ${result.warnings.length}`,
    '',
  ];

  if (result.specsPath) lines.push(`- **Specs:** ${rel(result.specsPath)}`, '');

  if (result.active.length) {
    lines.push('## Active Capabilities', '');
    for (const item of result.active) {
      lines.push(`- ${item.type}/${item.id} [${item.status}] from ${item.spec_key}`);
    }
    lines.push('');
  }

  if (result.issues.length) {
    lines.push('## Issues', '');
    for (const issue of result.issues) lines.push(`- ${issue}`);
    lines.push('');
  }

  if (result.warnings.length) {
    lines.push('## Warnings', '');
    for (const warning of result.warnings) lines.push(`- ${warning}`);
    lines.push('');
  }

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
  fs.writeFileSync(reportJsonPath, `${JSON.stringify({
    ...result,
    capabilities: result.capabilities.map((capability) => ({
      id: capability.id,
      type: capability.type,
      status: capability.status,
      file: rel(capability.__file),
    })),
  }, null, 2)}\n`);

  return { reportPath, reportJsonPath };
}

function printList() {
  const result = validateCatalog();
  console.log('\n🧭 Factory Capability Catalog');
  console.log('-----------------------------');
  for (const capability of result.capabilities) {
    const title = capability.title?.ar || capability.title?.en || '';
    console.log(`- ${capability.id} [${capability.type}/${capability.status}] ${title}`);
  }

  if (result.issues.length || result.warnings.length) {
    console.log(`\nIssues: ${result.issues.length}`);
    console.log(`Warnings: ${result.warnings.length}`);
    for (const issue of result.issues) console.log(`❌ ${issue}`);
    for (const warning of result.warnings) console.log(`⚠️ ${warning}`);
  }

  if (result.issues.length) process.exitCode = 1;
}

function printShow(id) {
  const result = loadCapabilities();
  const normalizedId = normalizeCapabilityId(id);
  const capability = result.capabilities.find((item) => normalizeCapabilityId(item.id) === normalizedId);

  if (!capability) {
    console.error(`❌ Capability غير معروف: ${id}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n🧩 ${capability.id}`);
  console.log('----------------------');
  console.log(`Type: ${capability.type}`);
  console.log(`Status: ${capability.status}`);
  console.log(`Title: ${capability.title?.ar || '-'} / ${capability.title?.en || '-'}`);
  console.log(`Summary: ${capability.summary || '-'}`);
  console.log(`Policy: ${capability.policy?.decision || '-'}`);
  console.log(`Specs: ${capability.factory?.spec_section || '-'}.${capability.factory?.spec_key || '-'}`);
  console.log(`Registry: ${capability.factory?.registry_id || '-'}`);
  console.log(`File: ${rel(capability.__file)}`);

  if (capability.policy?.conditions?.length) {
    console.log('\nConditions:');
    for (const condition of capability.policy.conditions) console.log(`- ${condition}`);
  }
}

function parseNewOptions(args) {
  const typeArg = args.find((arg) => arg.startsWith('--type='));
  const sourceKindArg = args.find((arg) => arg.startsWith('--source-kind='));
  const statusArg = args.find((arg) => arg.startsWith('--status='));
  const titleArArg = args.find((arg) => arg.startsWith('--title-ar='));
  const titleEnArg = args.find((arg) => arg.startsWith('--title-en='));

  return {
    type: typeArg ? typeArg.split('=').slice(1).join('=').trim() : '',
    sourceKind: sourceKindArg ? sourceKindArg.split('=').slice(1).join('=').trim() : 'client-request',
    status: statusArg ? statusArg.split('=').slice(1).join('=').trim() : 'proposed',
    titleAr: titleArArg ? titleArArg.split('=').slice(1).join('=').trim() : '',
    titleEn: titleEnArg ? titleEnArg.split('=').slice(1).join('=').trim() : '',
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
  };
}

function capabilityTemplate(id, options) {
  const normalizedId = normalizeCapabilityId(id);
  const defaults = factoryDefaults[options.type];

  return {
    schema,
    id: normalizedId,
    type: options.type,
    status: options.status,
    title: {
      ar: options.titleAr || `TODO: ${normalizedId}`,
      en: options.titleEn || `TODO: ${normalizedId}`,
    },
    summary: 'TODO: اشرح القيمة التجارية والسلوك المتوقع بدون نسخ تصميم أو كود خارجي.',
    source: {
      kind: options.sourceKind,
      links: [],
      notes: 'TODO: اربط هذه القدرة بوثائق سلة أو Raed أو طلب عميل أو benchmark موثق.',
    },
    policy: {
      decision: 'unknown',
      conditions: [
        'TODO: حدد شروط السماح أو سبب بقاء القدرة قيد البحث.',
      ],
    },
    factory: {
      ...defaults,
      spec_key: specKeyFor(normalizedId),
      registry_id: normalizedId,
    },
    quality: {
      required_gates: [
        'specs',
        'capabilities',
        defaults.spec_section === 'page_experiences' ? 'page-experience' : defaults.spec_section.replace(/s$/, ''),
        'policy',
        'preview',
        'browser',
        'rtl',
        'visual',
      ],
    },
  };
}

function createCapability(id, args = []) {
  const options = parseNewOptions(args);
  const normalizedId = normalizeCapabilityId(id);

  if (!normalizedId) {
    throw new Error('Usage: node factory.js capabilities new <id> --type=<home-experience|page-experience|integration|vertical>');
  }

  if (!allowedTypes.has(options.type)) {
    throw new Error(`--type مطلوب ويجب أن يكون واحدا من: ${[...allowedTypes].join(', ')}`);
  }

  if (!allowedStatuses.has(options.status)) {
    throw new Error(`--status غير معروف: ${options.status}`);
  }

  const targetDir = path.join(capabilitiesDir, typeDirs[options.type]);
  const targetFile = path.join(targetDir, `${normalizedId}.capability.json`);
  const template = capabilityTemplate(normalizedId, options);

  if (fs.existsSync(targetFile) && !options.force) {
    throw new Error(`Capability موجودة مسبقا: ${rel(targetFile)}. استخدم --force للاستبدال.`);
  }

  if (options.dryRun) {
    console.log(JSON.stringify(template, null, 2));
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, `${JSON.stringify(template, null, 2)}\n`);
  console.log(`✅ تم إنشاء capability skeleton: ${rel(targetFile)}`);
  console.log('الخطوة التالية: اربطها بـ registry/generator/gate ثم غيّر status إلى implemented أو certified.');
}

function printGate(themeName, args = []) {
  const result = validateCatalog(themeName, args);
  const reports = writeReport(result);

  console.log(`\n🧭 Capability Catalog Gate${themeName ? ` | ${themeName}` : ''}`);
  console.log('-----------------------------');
  console.log(`Capabilities: ${result.capabilities.length}`);
  if (result.specsPath) console.log(`Specs: ${rel(result.specsPath)}`);
  console.log(`Active requirements: ${result.active.length}`);
  for (const item of result.active) {
    console.log(`- ${item.type}/${item.id} [${item.status}] from ${item.spec_key}`);
  }
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  for (const issue of result.issues) console.log(`❌ ${issue}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning}`);
  console.log(`Report: ${rel(reports.reportPath)}`);

  if (result.issues.length) {
    console.log('\n❌ Capability catalog gate failed.');
    process.exitCode = 1;
    return result;
  }

  console.log('\n✅ Capability catalog gate passed.');
  return result;
}

function main() {
  const [command = 'list', first, ...rest] = process.argv.slice(2);

  if (['help', '-h', '--help'].includes(command)) {
    console.log(HELP.trim());
    return;
  }

  if (command === 'list') {
    printList();
    return;
  }

  if (command === 'show') {
    printShow(first);
    return;
  }

  if (command === 'new') {
    createCapability(first, rest);
    return;
  }

  if (command === 'gate') {
    printGate(first || null, rest);
    return;
  }

  console.log(HELP.trim());
  process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`\n❌ Capability catalog gate failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  loadCapabilities,
  validateCatalog,
};
