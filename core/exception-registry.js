const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const registryPath = path.join(__dirname, 'policies', 'exception-registry.json');

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

function normalizeValue(value) {
  return String(value || '').replace(/\\/g, '/');
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function loadExceptionRegistry() {
  const registry = readJson(registryPath, { schema: '', exceptions: [] });
  return {
    ...registry,
    exceptions: Array.isArray(registry?.exceptions) ? registry.exceptions : [],
  };
}

function fieldMatches(expected, actual) {
  if (Array.isArray(expected)) return expected.map(normalizeValue).includes(normalizeValue(actual));
  if (typeof expected === 'number') return Number(actual) === expected;
  if (typeof expected === 'boolean') return Boolean(actual) === expected;
  return normalizeValue(expected) === normalizeValue(actual);
}

function matchesException(exception, finding) {
  if (!exception || exception.status === 'rejected') return false;
  if (exception.category && exception.category !== finding.category) return false;
  if (exception.gate && finding.gate && exception.gate !== finding.gate) return false;

  for (const [field, expected] of Object.entries(exception.match || {})) {
    if (!fieldMatches(expected, finding[field])) return false;
  }

  return true;
}

function isExpired(exception, now = todayStart()) {
  const expiresAt = normalizeDate(exception.expires_at);
  return expiresAt ? expiresAt < now : false;
}

function isDueForReview(exception, now = todayStart()) {
  const reviewAfter = normalizeDate(exception.review_after);
  return reviewAfter ? reviewAfter < now : false;
}

function findException(finding, options = {}) {
  const registry = options.registry || loadExceptionRegistry();
  const match = registry.exceptions.find((exception) => matchesException(exception, finding));
  if (!match || isExpired(match)) return null;
  return {
    id: match.id,
    status: match.status,
    category: match.category,
    gate: match.gate,
    decision: match.decision,
    reason_ar: match.reason_ar,
    review_due: isDueForReview(match),
    source_count: Array.isArray(match.sources) ? match.sources.length : 0,
    exception: match,
  };
}

function validateExceptionRegistry() {
  const registry = loadExceptionRegistry();
  const result = {
    schema: registry.schema || '',
    path: rel(registryPath),
    exceptions: registry.exceptions,
    issues: [],
    warnings: [],
  };

  if (registry.schema !== 'salla-theme-factory/exception-registry@1') {
    result.issues.push(`${result.path}: schema غير معروف`);
  }

  const ids = new Set();
  for (const exception of registry.exceptions) {
    const id = exception?.id || '-';
    if (!exception?.id) {
      result.issues.push('استثناء بدون id');
      continue;
    }
    if (ids.has(exception.id)) result.issues.push(`${id}: id مكرر`);
    ids.add(exception.id);

    if (!['accepted', 'temporary', 'rejected'].includes(exception.status)) {
      result.issues.push(`${id}: status غير صالح: ${exception.status || '-'}`);
    }
    if (!exception.category) result.issues.push(`${id}: category مطلوب`);
    if (!exception.gate) result.issues.push(`${id}: gate مطلوب`);
    if (!exception.decision) result.issues.push(`${id}: decision مطلوب`);
    if (!exception.reason_ar) result.issues.push(`${id}: reason_ar مطلوب`);
    if (!exception.match || typeof exception.match !== 'object' || Array.isArray(exception.match)) {
      result.issues.push(`${id}: match يجب أن يكون object`);
    }
    if (!Array.isArray(exception.sources) || !exception.sources.length) {
      result.issues.push(`${id}: sources مطلوبة`);
    } else {
      for (const source of exception.sources) {
        if (!source.url || !/^https?:\/\//.test(source.url)) {
          result.issues.push(`${id}: كل source يحتاج URL صالح`);
        }
      }
    }

    if (exception.expires_at && !normalizeDate(exception.expires_at)) {
      result.issues.push(`${id}: expires_at تاريخ غير صالح`);
    }
    if (exception.review_after && !normalizeDate(exception.review_after)) {
      result.issues.push(`${id}: review_after تاريخ غير صالح`);
    }
    if (isExpired(exception)) {
      result.issues.push(`${id}: الاستثناء منتهي الصلاحية منذ ${exception.expires_at}`);
    } else if (isDueForReview(exception)) {
      result.warnings.push(`${id}: حان وقت مراجعة الاستثناء منذ ${exception.review_after}`);
    }
  }

  return result;
}

function printGate() {
  const result = validateExceptionRegistry();

  console.log('\n🧾 Exception Registry Gate');
  console.log('----------------------------------------');
  console.log(`Registry: ${result.path}`);
  console.log(`Exceptions: ${result.exceptions.length}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  for (const issue of result.issues) console.log(`❌ ${issue}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning}`);

  console.log(result.issues.length ? '\n❌ Exception registry gate failed.' : '\n✅ Exception registry gate passed.');
  return result;
}

function printList() {
  const registry = loadExceptionRegistry();
  console.log('\n🧾 Exception Registry');
  console.log('----------------------------------------');
  for (const exception of registry.exceptions) {
    console.log(`- ${exception.id} [${exception.status}] ${exception.category} -> ${exception.decision}`);
  }
}

function printShow(id) {
  const registry = loadExceptionRegistry();
  const exception = registry.exceptions.find((item) => item.id === id);
  if (!exception) {
    console.error(`❌ الاستثناء غير موجود: ${id || '-'}`);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(exception, null, 2));
}

function main() {
  const [command = 'list', first] = process.argv.slice(2);
  switch (command) {
    case 'list':
      printList();
      break;
    case 'show':
      printShow(first);
      break;
    case 'gate': {
      const result = printGate();
      if (result.issues.length) process.exitCode = 1;
      break;
    }
    default:
      console.log('Available exception commands:');
      console.log('  node factory.js exceptions list');
      console.log('  node factory.js exceptions show <id>');
      console.log('  node factory.js exceptions gate');
      process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  findException,
  loadExceptionRegistry,
  registryPath,
  validateExceptionRegistry,
};
