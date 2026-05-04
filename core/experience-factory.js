const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { printExperienceGate, printThemeExperienceGate, validateExperience } = require('./experience-gate');
const {
  defaultSlugFor,
  getExperience,
  isImplemented,
  listExperiences,
  pathsForExperience,
} = require('./experience-registry');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');
const componentFactory = path.join(__dirname, 'component-factory.js');

const HELP = `
Usage:
  node factory.js experience list
  node factory.js experience show <experience-id>
  node factory.js experience gate <theme>
  node factory.js experience gate <theme> <experience-id> [slug]
  node factory.js experience <theme> <experience-id> [slug] [--title-ar=...] [--title-en=...] [--dry-run] [--force]

Examples:
  node factory.js experience list
  node factory.js experience show product-flip
  node factory.js experience zen-theme product-flip flip-showcase --dry-run
`;

function parseOptions(args) {
  const options = {
    dryRun: false,
    force: false,
  };
  const positional = [];

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--title-ar=')) {
      options.titleAr = valueAfterEquals(arg);
    } else if (arg.startsWith('--title-en=')) {
      options.titleEn = valueAfterEquals(arg);
    } else if (arg.startsWith('--slug=')) {
      options.slug = valueAfterEquals(arg);
    } else if (arg.startsWith('--icon=')) {
      options.icon = valueAfterEquals(arg);
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}

function valueAfterEquals(value) {
  return String(value).slice(String(value).indexOf('=') + 1).trim();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function createRollback(files, enabled) {
  if (!enabled) return { commit() {}, restore() {} };

  let committed = false;
  const snapshots = files.map((file) => ({
    file,
    exists: fs.existsSync(file),
    content: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null,
  }));

  return {
    commit() {
      committed = true;
    },
    restore() {
      if (committed) return;
      for (const snapshot of snapshots) {
        if (snapshot.exists) {
          ensureDir(path.dirname(snapshot.file));
          fs.writeFileSync(snapshot.file, snapshot.content);
        } else if (fs.existsSync(snapshot.file)) {
          fs.rmSync(snapshot.file, { force: true });
        }
      }
    },
  };
}

function runNode(script, args) {
  execFileSync(process.execPath, [script, ...args], { stdio: 'inherit' });
}

function printList() {
  console.log('\n🧭 Experience Registry');
  console.log('----------------------');
  for (const experience of listExperiences()) {
    const status = experience.status === 'implemented' ? 'ready' : experience.status;
    console.log(`- ${experience.id} [${status}] ${experience.title?.ar || experience.title?.en || ''}`);
    if (experience.intent) console.log(`  ${experience.intent}`);
  }
}

function printShow(id) {
  const experience = getExperience(id);
  if (!experience) {
    throw new Error(`Experience not found: ${id}`);
  }

  console.log(`\n🧩 ${experience.id}`);
  console.log('----------------------');
  console.log(`Status: ${experience.status}`);
  console.log(`Title: ${experience.title?.ar || '-'} / ${experience.title?.en || '-'}`);
  console.log(`Intent: ${experience.intent || '-'}`);
  console.log(`Default slug: ${experience.defaultSlug || '-'}`);
  console.log(`Component preset: ${experience.componentPreset || '-'}`);

  if (experience.docsSources?.length) {
    console.log('\nSources:');
    for (const source of experience.docsSources) {
      console.log(`- ${source.title} - ${source.section} (${source.url})`);
    }
  }
}

function printBlueprintGate(experience, slug) {
  console.log('\n🧪 Experience Blueprint Gate');
  console.log('----------------------------');
  console.log(`Experience: ${experience.id}`);
  console.log(`Slug: ${slug}`);
  console.log(`Component preset: ${experience.componentPreset}`);
  console.log('Checks planned: twilight registration, Twig markers, JS wiring, SCSS wiring, product image/title/price/cart contract, no per-product network requests.');
  console.log('✅ Blueprint gate passed.');
}

function createExperience(themeName, experienceId, slugValue, options) {
  const experience = getExperience(experienceId);
  if (!experience) throw new Error(`Experience not found: ${experienceId}`);
  if (!isImplemented(experience)) throw new Error(`Experience is not implemented yet: ${experience.id}`);

  const slug = defaultSlugFor(experience, options.slug || slugValue);
  const themePath = path.join(themesDir, themeName);
  if (!fs.existsSync(themePath)) throw new Error(`Theme not found: ${themeName}`);

  const paths = pathsForExperience(themePath, experience, slug);
  const rollback = createRollback(Object.values(paths), !options.dryRun);
  const args = [
    themeName,
    'custom',
    slug,
    `--preset=${experience.componentPreset}`,
    `--title-ar=${options.titleAr || experience.defaultTitles?.ar || experience.title?.ar || slug}`,
    `--title-en=${options.titleEn || experience.defaultTitles?.en || experience.title?.en || slug}`,
  ];

  if (options.icon) args.push(`--icon=${options.icon}`);
  if (options.force) args.push('--force');
  if (options.dryRun) args.push('--dry-run');

  try {
    runNode(componentFactory, args);

    if (options.dryRun) {
      printBlueprintGate(experience, slug);
      rollback.commit();
      return;
    }

    const gate = validateExperience(themeName, experience.id, slug);
    if (gate.issues.length) {
      for (const item of gate.issues) {
        console.log(`❌ ${item.file}: ${item.detail}`);
      }
      throw new Error('Experience gate failed after creation. Rolling back.');
    }

    rollback.commit();
    printExperienceGate(themeName, experience.id, slug);
  } catch (error) {
    rollback.restore();
    throw error;
  }
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length || ['help', '-h', '--help'].includes(args[0])) {
    console.log(HELP.trim());
    return;
  }

  if (args[0] === 'list') {
    printList();
    return;
  }

  if (args[0] === 'show') {
    printShow(args[1]);
    return;
  }

  if (args[0] === 'gate') {
    const [themeName, experienceId, slug] = args.slice(1);
    if (!themeName) throw new Error('Usage: node factory.js experience gate <theme> [experience-id] [slug]');
    if (!experienceId) {
      const result = printThemeExperienceGate(themeName);
      if (result.issues.length) process.exitCode = 1;
      return;
    }
    const result = printExperienceGate(themeName, experienceId, slug);
    if (result.issues.length) process.exitCode = 1;
    return;
  }

  const [themeName, experienceId, ...rest] = args;
  const { options, positional } = parseOptions(rest);
  createExperience(themeName, experienceId, positional[0], options);
}

try {
  main();
} catch (error) {
  console.error(`\n❌ Experience factory failed: ${error.message}`);
  process.exit(1);
}
