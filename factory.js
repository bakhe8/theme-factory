const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const command = process.argv[2];
const themeArg = process.argv[3];
const theme = themeArg || 'zen-theme';
const extraArgs = process.argv.slice(4);

const rootDir = __dirname;
const coreDir = path.join(rootDir, 'core');

const scripts = {
  create: path.join(coreDir, 'create-theme.js'),
  fix: path.join(coreDir, 'factory-fixer.js'),
  policy: path.join(coreDir, 'policy-check.js'),
  audit: path.join(coreDir, 'factory-integrity.js'),
  preview: path.join(coreDir, 'factory-preview.js'),
  certify: path.join(coreDir, 'certify-theme.js'),
  docs: path.join(coreDir, 'intelligence-check.js'),
  component: path.join(coreDir, 'component-factory.js'),
  experience: path.join(coreDir, 'experience-factory.js'),
  fixtures: path.join(coreDir, 'fixtures-check.js'),
  'apply-specs': path.join(coreDir, 'apply-specs.js'),
};

function themePath(themeName) {
  return path.join(rootDir, 'themes', themeName);
}

function ensureTheme(themeName) {
  if (!fs.existsSync(themePath(themeName))) {
    console.error(`\n❌ Theme not found: ${themeName}`);
    return false;
  }

  return true;
}

function runNode(script, args = []) {
  try {
    console.log(`\n🚀 Running: ${path.basename(script)} ${args.join(' ')}`.trim());
    execFileSync(process.execPath, [script, ...args], { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

function runThemeCommand(themeName, executable, args) {
  if (!ensureTheme(themeName)) return false;

  try {
    console.log(`\n📦 Running in ${themeName}: ${executable} ${args.join(' ')}`);
    execFileSync(executable, args, {
      cwd: themePath(themeName),
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    return true;
  } catch (error) {
    return false;
  }
}

function runStage(label, callback) {
  console.log(`\n== ${label} ==`);
  const passed = callback();
  if (!passed) {
    console.error(`\n❌ Failed: ${label}`);
  }
  return passed;
}

function printHelp() {
  console.log('Available Commands:');
  console.log('  create <theme>          - Create a new policy-compliant theme from the approved template');
  console.log('  apply-specs <theme> [specs-file] - Apply specs.json (colors, fonts, features, settings) to theme');
  console.log('  component <theme> feature <feature-id> [--dry-run] - Add a documented Twilight feature');
  console.log('  component <theme> custom <slug> [--preset=basic|banner|links|product-flip|lookbook] [--dry-run] - Create a policy-checked custom component');
  console.log('  experience <theme> <experience-id> [slug] [--dry-run] - Create a registered selling experience');
  console.log('  experience <list|show|gate> ... - Inspect or validate Experience Registry entries');
  console.log('  fixtures <list|show|gate> ... - Inspect or validate local runtime fixture datasets');
  console.log('  fix                     - Scan all themes for known unsafe patterns without destructive rewrites');
  console.log('  policy [theme]          - Validate theme structure, twilight.json, locales, and layout hooks');
  console.log('  audit <theme>           - Run integrity check and write reports/audit-<theme>.md');
  console.log('  preview <theme>         - Generate local runtime preview into build/<theme>/index.html');
  console.log('  build <theme>           - Run Fix -> Policy -> Production -> Audit -> Preview');
  console.log('  certify <theme> [--salla] [--strict-docs] - Run the full local certification pipeline');
  console.log('  docs <sync|compile|check|status> - Maintain Salla docs intelligence memory');
}

console.log('🏭 Salla Theme Factory v9.2 | Unified CLI');
console.log('-----------------------------------------');

switch (command) {
  case 'create':
    if (!themeArg) {
      console.error('❌ Usage: node factory.js create <theme-name>');
      process.exit(1);
    }
    process.exitCode = runNode(scripts.create, [themeArg]) ? 0 : 1;
    break;

  case 'apply-specs': {
    if (!themeArg) {
      console.error('❌ Usage: node factory.js apply-specs <theme-name> [specs-file.json]');
      process.exit(1);
    }
    const specsFileArg = extraArgs[0] || null;
    const applyArgs = specsFileArg ? [themeArg, specsFileArg] : [themeArg];
    process.exitCode = runNode(scripts['apply-specs'], applyArgs) ? 0 : 1;
    break;
  }

  case 'component': {
    if (!themeArg) {
      console.error('❌ Usage: node factory.js component <theme-name> <feature|custom> <name> [options]');
      process.exit(1);
    }
    process.exitCode = runNode(scripts.component, [themeArg, ...extraArgs]) ? 0 : 1;
    break;
  }

  case 'experience': {
    process.exitCode = runNode(scripts.experience, [themeArg, ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'fixtures': {
    process.exitCode = runNode(scripts.fixtures, [themeArg || 'list', ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'fix':
    process.exitCode = runNode(scripts.fix) ? 0 : 1;
    break;

  case 'policy':
    process.exitCode = runNode(scripts.policy, themeArg ? [themeArg] : []) ? 0 : 1;
    break;

  case 'audit':
    process.exitCode = runNode(scripts.audit, [theme]) ? 0 : 1;
    break;

  case 'preview':
    process.exitCode = runNode(scripts.preview, [theme, ...extraArgs]) ? 0 : 1;
    break;

  case 'certify':
    process.exitCode = runNode(scripts.certify, [theme, ...extraArgs]) ? 0 : 1;
    break;

  case 'docs':
    process.exitCode = runNode(scripts.docs, [themeArg || 'status', ...extraArgs]) ? 0 : 1;
    break;

  case 'build': {
    console.log(`📦 Building Production-Ready Theme: [${theme.toUpperCase()}]`);
    const passed =
      runStage('Factory safety scan', () => runNode(scripts.fix)) &&
      runStage('Salla docs intelligence gate', () => runNode(scripts.docs, ['gate', theme])) &&
      runStage('Salla policy gate', () => runNode(scripts.policy, [theme])) &&
      runStage('Runtime fixtures gate', () => runNode(scripts.fixtures, ['gate'])) &&
      runStage('Experience registry gate', () => runNode(scripts.experience, ['gate', theme])) &&
      runStage('Production build', () => runThemeCommand(theme, 'pnpm', ['run', 'production'])) &&
      runStage('Integrity audit', () => runNode(scripts.audit, [theme])) &&
      runStage('Local runtime preview', () => runNode(scripts.preview, [theme]));

    if (passed) {
      console.log('\n✨ Build Completed Successfully!');
      process.exitCode = 0;
    } else {
      console.error('\n❌ Build failed. See the stage output above.');
      process.exitCode = 1;
    }
    break;
  }

  default:
    printHelp();
    process.exitCode = command ? 1 : 0;
}
