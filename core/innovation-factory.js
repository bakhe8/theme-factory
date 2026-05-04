const fs = require('fs');
const path = require('path');
const { loadThemeSpecs, requiredSpecEntries } = require('./specs-loader');
const { normalizeExperienceId } = require('./experience-registry');
const { normalizePageExperienceId } = require('./page-experience-registry');
const { normalizeIntegrationId } = require('./integration-registry');
const { normalizeVerticalId } = require('./vertical-registry');
const { rootDir, workspacePath } = require('./factory-config');

const innovationsDir = workspacePath('innovations');
const themesDir = workspacePath('themes');

const SCHEMA = 'salla-theme-factory/innovation@1';
const ALLOWED_TYPES = new Set([
  'component',
  'experience',
  'page-experience',
  'integration',
  'vertical',
  'runtime',
  'policy',
]);
const ALLOWED_STATUSES = ['proposed', 'experimental', 'implemented', 'certified', 'rejected'];
const PRODUCTION_STATUSES = new Set(['implemented', 'certified']);

const HELP = `
Usage:
  node factory.js innovation list
  node factory.js innovation show <innovation-id>
  node factory.js innovation gate [theme] [--allow-experimental] [--specs=path]
  node factory.js innovation propose <innovation-id> --type=experience --title-ar="..." --title-en="..." --summary="..."
  node factory.js innovation promote <innovation-id> --status=experimental|implemented|certified|rejected [--force] [--note="..."]

Examples:
  node factory.js innovation list
  node factory.js innovation show zen-products-grid
  node factory.js innovation gate luxury-fragrance
  node factory.js innovation propose scent-quiz --type=experience --title-ar="اختبار الرائحة" --title-en="Scent Quiz"
`;

function rel(file) {
  return path.relative(rootDir, file).replace(/\\/g, '/');
}

function valueAfterEquals(value) {
  return String(value).slice(String(value).indexOf('=') + 1).trim();
}

function parseOptions(args) {
  const options = {
    allowExperimental: false,
    force: false,
    docsSources: [],
  };
  const positional = [];

  for (const arg of args) {
    if (arg === '--allow-experimental') {
      options.allowExperimental = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--type=')) {
      options.type = valueAfterEquals(arg);
    } else if (arg.startsWith('--status=')) {
      options.status = valueAfterEquals(arg);
    } else if (arg.startsWith('--title-ar=')) {
      options.titleAr = valueAfterEquals(arg);
    } else if (arg.startsWith('--title-en=')) {
      options.titleEn = valueAfterEquals(arg);
    } else if (arg.startsWith('--summary=')) {
      options.summary = valueAfterEquals(arg);
    } else if (arg.startsWith('--note=')) {
      options.note = valueAfterEquals(arg);
    } else if (arg.startsWith('--source=')) {
      options.docsSources.push(valueAfterEquals(arg));
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}

function normalizeInnovationId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function fileForInnovation(id) {
  return path.join(innovationsDir, `${normalizeInnovationId(id)}.innovation.json`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function listInnovationFiles() {
  if (!fs.existsSync(innovationsDir)) return [];
  return fs.readdirSync(innovationsDir)
    .filter((entry) => entry.endsWith('.innovation.json'))
    .map((entry) => path.join(innovationsDir, entry))
    .sort();
}

function titleFromId(id) {
  return String(id || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function validateInnovationRecord(record, file) {
  const result = {
    file,
    id: record?.id || path.basename(file, '.innovation.json'),
    record,
    issues: [],
    warnings: [],
  };

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    result.issues.push(`${rel(file)}: ملف الابتكار يجب أن يكون JSON object`);
    return result;
  }

  const expectedId = normalizeInnovationId(record.id);
  const expectedFile = `${expectedId}.innovation.json`;
  if (!record.id || expectedId !== record.id) {
    result.issues.push(`${rel(file)}: id يجب أن يكون kebab-case`);
  }
  if (path.basename(file) !== expectedFile) {
    result.issues.push(`${rel(file)}: اسم الملف يجب أن يطابق id: ${expectedFile}`);
  }
  if (record.schema !== SCHEMA) {
    result.issues.push(`${record.id}: schema يجب أن يكون ${SCHEMA}`);
  }
  if (!ALLOWED_TYPES.has(record.type)) {
    result.issues.push(`${record.id}: type غير معروف: ${record.type || '-'}`);
  }
  if (!ALLOWED_STATUSES.includes(record.status)) {
    result.issues.push(`${record.id}: status غير معروف: ${record.status || '-'}`);
  }
  if (!record.title?.ar && !record.title?.en) {
    result.issues.push(`${record.id}: title.ar أو title.en مطلوب`);
  }
  if (!record.summary) {
    result.warnings.push(`${record.id}: summary غير محدد`);
  }

  if (!record.salla_policy || typeof record.salla_policy !== 'object') {
    result.issues.push(`${record.id}: salla_policy مطلوب`);
  } else {
    for (const key of ['docs_sources', 'risk_notes', 'forbidden_if']) {
      if (!Array.isArray(record.salla_policy[key])) {
        result.issues.push(`${record.id}: salla_policy.${key} يجب أن يكون array`);
      }
    }
  }

  if (!record.factory_plan || typeof record.factory_plan !== 'object') {
    result.issues.push(`${record.id}: factory_plan مطلوب`);
  }

  const checklist = record.promotion_checklist || {};
  if (!record.promotion_checklist || typeof record.promotion_checklist !== 'object') {
    result.issues.push(`${record.id}: promotion_checklist مطلوب`);
  }

  if (['implemented', 'certified'].includes(record.status)) {
    for (const field of ['registered_in_factory', 'has_generator', 'has_gate', 'docs_sources_mapped', 'passes_policy']) {
      if (checklist[field] !== true) {
        result.issues.push(`${record.id}: لا يمكن اعتماد status=${record.status} قبل إكمال promotion_checklist.${field}`);
      }
    }
  }

  if (record.status === 'certified') {
    if (checklist.passes_browser !== true) {
      result.issues.push(`${record.id}: certified يتطلب promotion_checklist.passes_browser=true`);
    }
    if (!record.salla_policy?.docs_sources?.length) {
      result.issues.push(`${record.id}: certified يتطلب docs_sources مرتبطة بمصدر سلة أو قرار سياسة محلي موثق`);
    }
  }

  return result;
}

function loadInnovations() {
  const result = {
    items: [],
    byId: new Map(),
    issues: [],
    warnings: [],
  };

  const files = listInnovationFiles();
  if (!files.length) {
    result.warnings.push(`لا توجد ملفات ابتكار داخل ${rel(innovationsDir)}`);
    return result;
  }

  for (const file of files) {
    try {
      const record = readJson(file);
      const validation = validateInnovationRecord(record, file);
      result.items.push(validation);
      result.issues.push(...validation.issues);
      result.warnings.push(...validation.warnings);

      if (record?.id) {
        if (result.byId.has(record.id)) {
          result.issues.push(`${record.id}: id مكرر في سجل الابتكار`);
        }
        result.byId.set(record.id, validation);
      }
    } catch (error) {
      result.issues.push(`${rel(file)}: JSON غير صالح - ${error.message}`);
    }
  }

  return result;
}

function innovationExperimentsFromSpecs(specs, result) {
  const experiments = specs?.innovation?.experiments || [];
  if (!Array.isArray(experiments)) {
    result.issues.push('specs.innovation.experiments يجب أن يكون array');
    return [];
  }

  return experiments
    .map((entry) => {
      if (typeof entry === 'string') {
        return { id: normalizeInnovationId(entry), config: { required: true } };
      }
      if (entry && typeof entry === 'object') {
        return {
          id: normalizeInnovationId(entry.id),
          config: {
            required: entry.required !== false,
            allow_experimental: entry.allow_experimental === true,
            slug: entry.slug || '',
            note: entry.note || '',
          },
        };
      }
      result.issues.push('كل عنصر داخل specs.innovation.experiments يجب أن يكون string أو object يحتوي id');
      return null;
    })
    .filter(Boolean)
    .filter((entry) => entry.config.required !== false);
}

function fulfillmentPlanForInnovation(record, config = {}) {
  const explicit = record?.factory_plan?.fulfillment || {};
  const rawType = explicit.type || explicit.kind || explicit.spec_section || record?.type || '';
  const type = String(rawType)
    .replace(/_/g, '-')
    .replace(/s$/, '');
  const normalizedType = {
    component: 'experience',
    experience: 'experience',
    'page-experience': 'page-experience',
    page: 'page-experience',
    integration: 'integration',
    vertical: 'vertical',
  }[type] || '';

  const rawId = explicit.id
    || explicit.experience_id
    || explicit.page_experience_id
    || explicit.integration_id
    || explicit.vertical_id
    || record?.id;

  const normalizers = {
    experience: normalizeExperienceId,
    'page-experience': normalizePageExperienceId,
    integration: normalizeIntegrationId,
    vertical: normalizeVerticalId,
  };
  const normalize = normalizers[normalizedType] || ((value) => String(value || '').trim());
  const id = normalize(rawId);

  return {
    type: normalizedType,
    section: {
      experience: 'experiences',
      'page-experience': 'page_experiences',
      integration: 'integrations',
      vertical: 'verticals',
    }[normalizedType] || '',
    id,
    slug: config.slug || explicit.slug || '',
    specKey: explicit.spec_key || id.replace(/-/g, '_'),
    specDefaults: explicit.spec_defaults || {},
  };
}

function applyInnovationFulfillmentToSpecs(specs, record, config = {}) {
  const plan = fulfillmentPlanForInnovation(record, config);
  if (!plan.section || !plan.id) return [];

  specs[plan.section] = specs[plan.section] || {};
  const existing = specs[plan.section][plan.specKey] || {};
  specs[plan.section][plan.specKey] = {
    ...plan.specDefaults,
    ...existing,
    id: existing.id || plan.id,
    required: true,
  };

  if (plan.type === 'experience' && plan.slug && !specs[plan.section][plan.specKey].slug) {
    specs[plan.section][plan.specKey].slug = plan.slug;
  }

  return [plan];
}

function requiredEntryForPlan(specs, plan) {
  const normalizers = {
    experiences: normalizeExperienceId,
    page_experiences: normalizePageExperienceId,
    integrations: normalizeIntegrationId,
    verticals: normalizeVerticalId,
  };
  const normalize = normalizers[plan.section];
  if (!normalize) return null;
  return requiredSpecEntries(specs, plan.section, normalize).find((item) => item.id === plan.id) || null;
}

function addStructuredGateFindings(result, record, gateResult, formatIssue, formatWarning = formatIssue) {
  for (const item of gateResult.issues || []) {
    result.issues.push(`${record.id}: ${formatIssue(item)}`);
  }
  for (const item of gateResult.warnings || []) {
    result.warnings.push(`${record.id}: ${formatWarning(item)}`);
  }
}

function validateInnovationFulfillment(themeName, specs, record, experiment, result) {
  const plan = fulfillmentPlanForInnovation(record, experiment.config);
  if (!plan.section || !plan.id) {
    result.issues.push(`${record.id}: لا يوجد fulfillment واضح يربط الابتكار بمخرجات المصنع الفعلية`);
    return;
  }

  const required = requiredEntryForPlan(specs, plan);
  if (!required) {
    result.issues.push(`${record.id}: specs.innovation يطلب الابتكار لكن specs.${plan.section} لا يطلب ${plan.id} كعنصر required`);
    return;
  }

  if (plan.type === 'experience') {
    const { validateExperience } = require('./experience-gate');
    const slug = required.config?.slug || plan.slug || '';
    const gate = validateExperience(themeName, plan.id, slug);
    addStructuredGateFindings(
      result,
      record,
      gate,
      (item) => `فشل fulfillment experience ${plan.id}${slug ? `:${slug}` : ''} - ${item.file}: ${item.detail}`,
      (item) => `تحذير fulfillment experience ${plan.id}${slug ? `:${slug}` : ''} - ${item.file}: ${item.detail}`,
    );
    return;
  }

  if (plan.type === 'page-experience') {
    const { validatePageExperience } = require('./page-experience-gate');
    const gate = validatePageExperience(themeName, plan.id);
    addStructuredGateFindings(
      result,
      record,
      gate,
      (item) => `فشل fulfillment page-experience ${plan.id} - ${item.file}: ${item.detail}`,
      (item) => `تحذير fulfillment page-experience ${plan.id} - ${item.file}: ${item.detail}`,
    );
    return;
  }

  if (plan.type === 'integration') {
    const { validateThemeIntegrations } = require('./integration-factory');
    const gate = validateThemeIntegrations(themeName);
    for (const issue of gate.issues || []) result.issues.push(`${record.id}: فشل fulfillment integration ${plan.id} - ${issue}`);
    for (const warning of gate.warnings || []) result.warnings.push(`${record.id}: تحذير fulfillment integration ${plan.id} - ${warning}`);
    return;
  }

  if (plan.type === 'vertical') {
    const { validateThemeVertical } = require('./vertical-registry');
    const gate = validateThemeVertical(themeName, plan.id, { fixture: required.config?.fixture || '' });
    for (const issue of gate.issues || []) result.issues.push(`${record.id}: فشل fulfillment vertical ${plan.id} - ${issue}`);
    for (const warning of gate.warnings || []) result.warnings.push(`${record.id}: تحذير fulfillment vertical ${plan.id} - ${warning}`);
  }
}

function validateThemeInnovations(themeName, args = []) {
  const { options } = parseOptions(args);
  const registry = loadInnovations();
  const result = {
    theme: themeName || '',
    specsPath: '',
    active: [],
    issues: [...registry.issues],
    warnings: [...registry.warnings],
  };

  if (!themeName) return result;

  const themePath = path.join(themesDir, themeName);
  if (!fs.existsSync(themePath)) {
    result.issues.push(`الثيم غير موجود: ${themeName}`);
    return result;
  }

  const loaded = loadThemeSpecs(themeName, args);
  result.specsPath = loaded.path;
  if (!loaded.exists) {
    result.issues.push(`ملف المواصفات غير موجود: ${rel(loaded.path)}`);
    return result;
  }
  if (!loaded.valid) {
    result.issues.push(`ملف المواصفات غير صالح: ${rel(loaded.path)} - ${loaded.error}`);
    return result;
  }

  if (!loaded.specs.innovation) {
    result.issues.push('قسم specs.innovation مفقود');
    return result;
  }

  const experiments = innovationExperimentsFromSpecs(loaded.specs, result);
  for (const experiment of experiments) {
    if (!experiment.id) {
      result.issues.push('تجربة ابتكار بلا id داخل specs.innovation.experiments');
      continue;
    }

    const validation = registry.byId.get(experiment.id);
    if (!validation) {
      result.issues.push(`ابتكار غير معروف في specs.innovation.experiments: ${experiment.id}`);
      continue;
    }

    const record = validation.record;
    result.active.push({
      id: record.id,
      type: record.type,
      status: record.status,
      allowExperimental: options.allowExperimental || experiment.config.allow_experimental,
    });

    if (record.status === 'rejected') {
      result.issues.push(`${record.id}: الابتكار مرفوض ولا يسمح بطلبه في ثيم`);
    } else if (record.status === 'experimental' && !(options.allowExperimental || experiment.config.allow_experimental)) {
      result.issues.push(`${record.id}: ما زال experimental. يسمح محلياً فقط مع --allow-experimental ولا يسمح في certify/deliver`);
    } else if (!PRODUCTION_STATUSES.has(record.status) && record.status !== 'experimental') {
      result.issues.push(`${record.id}: status=${record.status} لا يسمح بدخوله إلى ثيم قابل للتسليم`);
    } else if (record.status === 'experimental') {
      result.warnings.push(`${record.id}: يعمل كـ experimental في المختبر فقط`);
    }

    if (PRODUCTION_STATUSES.has(record.status) || (record.status === 'experimental' && (options.allowExperimental || experiment.config.allow_experimental))) {
      validateInnovationFulfillment(themeName, loaded.specs, record, experiment, result);
    }
  }

  return result;
}

function printList() {
  const registry = loadInnovations();

  console.log('\n💡 Innovation Registry');
  console.log('----------------------');
  if (!registry.items.length) console.log('- لا توجد ابتكارات مسجلة');
  for (const item of registry.items) {
    const record = item.record;
    if (!record) continue;
    console.log(`- ${record.id} [${record.status}] ${record.type} - ${record.title?.ar || record.title?.en || ''}`);
  }

  for (const issue of registry.issues) console.log(`❌ ${issue}`);
  for (const warning of registry.warnings) console.log(`⚠️ ${warning}`);
  if (registry.issues.length) process.exitCode = 1;
}

function printShow(id) {
  const registry = loadInnovations();
  const validation = registry.byId.get(normalizeInnovationId(id));
  if (!validation) {
    console.error(`❌ Innovation غير معروف: ${id || '-'}`);
    process.exitCode = 1;
    return;
  }

  const record = validation.record;
  console.log(`\n💡 ${record.id}`);
  console.log('----------------------');
  console.log(`Status: ${record.status}`);
  console.log(`Type: ${record.type}`);
  console.log(`Title: ${record.title?.ar || '-'} / ${record.title?.en || '-'}`);
  console.log(`Summary: ${record.summary || '-'}`);
  console.log(`Factory plan: ${record.factory_plan?.registry_file || '-'} -> ${record.factory_plan?.generator_file || '-'} -> ${record.factory_plan?.gate_file || '-'}`);
  console.log(`Docs sources: ${(record.salla_policy?.docs_sources || []).join(', ') || '-'}`);

  console.log('\nPromotion checklist:');
  for (const [key, value] of Object.entries(record.promotion_checklist || {})) {
    console.log(`- ${key}: ${value === true ? 'done' : 'open'}`);
  }

  for (const issue of validation.issues) console.log(`❌ ${issue}`);
  for (const warning of validation.warnings) console.log(`⚠️ ${warning}`);
  if (validation.issues.length) process.exitCode = 1;
}

function printGate(themeName, args = []) {
  const result = validateThemeInnovations(themeName, args);

  console.log(`\n💡 Innovation Gate${themeName ? ` | ${themeName}` : ''}`);
  console.log('----------------------');
  if (result.specsPath) console.log(`Specs: ${rel(result.specsPath)}`);
  console.log(`Active innovations: ${result.active.length}`);
  for (const item of result.active) {
    console.log(`- ${item.id}: type=${item.type}, status=${item.status}${item.allowExperimental ? ', lab=true' : ''}`);
  }
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  for (const issue of result.issues) console.log(`❌ ${issue}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning}`);

  if (result.issues.length) {
    console.log('\n❌ Innovation gate failed.');
    process.exitCode = 1;
    return result;
  }

  console.log('\n✅ Innovation gate passed.');
  return result;
}

function proposeInnovation(id, args = []) {
  const { options } = parseOptions(args);
  const normalized = normalizeInnovationId(id);
  if (!normalized) throw new Error('Usage: node factory.js innovation propose <innovation-id> [options]');

  const type = options.type || 'experience';
  if (!ALLOWED_TYPES.has(type)) throw new Error(`type غير معروف: ${type}`);

  const file = fileForInnovation(normalized);
  if (fs.existsSync(file) && !options.force) {
    throw new Error(`الابتكار موجود بالفعل: ${rel(file)}. استخدم --force للاستبدال.`);
  }

  const now = new Date().toISOString();
  const record = {
    schema: SCHEMA,
    id: normalized,
    type,
    status: 'proposed',
    title: {
      ar: options.titleAr || titleFromId(normalized),
      en: options.titleEn || titleFromId(normalized),
    },
    summary: options.summary || 'اقتراح ابتكار جديد يحتاج ربطه بسجل المصنع ومولده وبوابته قبل استخدامه في ثيم قابل للتسليم.',
    created_at: now,
    updated_at: now,
    owner: 'Salla Theme Factory',
    salla_policy: {
      docs_sources: options.docsSources,
      risk_notes: [],
      forbidden_if: [],
    },
    factory_plan: {
      registry_file: '',
      generator_file: '',
      gate_file: '',
      fixtures: [],
      preview_pages: [],
    },
    promotion_checklist: {
      registered_in_factory: false,
      has_generator: false,
      has_gate: false,
      has_fixture: false,
      docs_sources_mapped: options.docsSources.length > 0,
      passes_policy: false,
      passes_browser: false,
    },
    history: [
      {
        status: 'proposed',
        at: now,
        note: options.note || 'Created by innovation factory.',
      },
    ],
  };

  writeJson(file, record);
  console.log(`✅ تم تسجيل ابتكار جديد: ${record.id}`);
  console.log(`📄 ${rel(file)}`);
}

function promoteInnovation(id, args = []) {
  const { options, positional } = parseOptions(args);
  const normalized = normalizeInnovationId(id);
  const nextStatus = options.status || positional[0];
  if (!normalized || !nextStatus) {
    throw new Error('Usage: node factory.js innovation promote <innovation-id> --status=experimental|implemented|certified|rejected');
  }
  if (!ALLOWED_STATUSES.includes(nextStatus)) throw new Error(`status غير معروف: ${nextStatus}`);

  const file = fileForInnovation(normalized);
  if (!fs.existsSync(file)) throw new Error(`الابتكار غير موجود: ${normalized}`);

  const record = readJson(file);
  const currentIndex = ALLOWED_STATUSES.indexOf(record.status);
  const nextIndex = ALLOWED_STATUSES.indexOf(nextStatus);
  if (!options.force && record.status !== 'rejected' && nextStatus !== 'rejected') {
    if (nextIndex < currentIndex) {
      throw new Error('لا يسمح بخفض حالة الابتكار بدون --force');
    }
    if (nextIndex > currentIndex + 1) {
      throw new Error('لا يسمح بتجاوز مراحل الابتكار. استخدم proposed -> experimental -> implemented -> certified أو --force مع توثيق السبب.');
    }
  }

  const now = new Date().toISOString();
  record.status = nextStatus;
  record.updated_at = now;
  record.history = Array.isArray(record.history) ? record.history : [];
  record.history.push({
    status: nextStatus,
    at: now,
    note: options.note || 'Status updated by innovation factory.',
  });

  writeJson(file, record);
  const validation = validateInnovationRecord(record, file);

  console.log(`✅ تم تحديث حالة الابتكار: ${record.id} -> ${record.status}`);
  console.log(`📄 ${rel(file)}`);
  if (validation.issues.length) {
    console.log('\n⚠️ لن يجتاز الابتكار بوابة الإنتاج حتى تُغلق هذه البنود:');
    for (const issue of validation.issues) console.log(`❌ ${issue}`);
  }
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

  if (command === 'gate') {
    printGate(first, rest);
    return;
  }

  if (command === 'propose') {
    proposeInnovation(first, rest);
    return;
  }

  if (command === 'promote') {
    promoteInnovation(first, rest);
    return;
  }

  console.log(HELP.trim());
  process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`\n❌ Innovation factory failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  applyInnovationFulfillmentToSpecs,
  fulfillmentPlanForInnovation,
  loadInnovations,
  normalizeInnovationId,
  validateThemeInnovations,
};
