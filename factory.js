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
  intake: path.join(coreDir, 'intake-factory.js'),
  create: path.join(coreDir, 'create-theme.js'),
  manufacture: path.join(coreDir, 'manufacture-theme.js'),
  deliver: path.join(coreDir, 'deliver-theme.js'),
  workflow: path.join(coreDir, 'workflow-gate.js'),
  fix: path.join(coreDir, 'factory-fixer.js'),
  policy: path.join(coreDir, 'policy-check.js'),
  audit: path.join(coreDir, 'factory-integrity.js'),
  preview: path.join(coreDir, 'factory-preview.js'),
  certify: path.join(coreDir, 'certify-theme.js'),
  docs: path.join(coreDir, 'intelligence-check.js'),
  specs: path.join(coreDir, 'specs-gate.js'),
  innovation: path.join(coreDir, 'innovation-factory.js'),
  display: path.join(coreDir, 'display-feature-gate.js'),
  component: path.join(coreDir, 'component-factory.js'),
  experience: path.join(coreDir, 'experience-factory.js'),
  'page-experience': path.join(coreDir, 'page-experience-factory.js'),
  'page-contract': path.join(coreDir, 'page-contract-gate.js'),
  integration: path.join(coreDir, 'integration-factory.js'),
  fixtures: path.join(coreDir, 'fixtures-check.js'),
  vertical: path.join(coreDir, 'vertical-factory.js'),
  browser: path.join(coreDir, 'browser-smoke.js'),
  rtl: path.join(coreDir, 'rtl-gate.js'),
  links: path.join(coreDir, 'link-smoke.js'),
  coverage: path.join(coreDir, 'page-coverage.js'),
  'apply-specs': path.join(coreDir, 'apply-specs.js'),
  'git-guard': path.join(coreDir, 'git-workflow-guard.js'),
  exceptions: path.join(coreDir, 'exception-registry.js'),
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
  console.log('  intake <theme>          - Create workorder and specs contract as the only allowed starting point');
  console.log('  manufacture <theme>     - Run the full factory line from specs to certified deliverable');
  console.log('  deliver <theme>         - Create deliverables/<theme>/theme after certification');
  console.log('  workflow gate <theme>   - Ensure the theme was created by the factory and not copied manually');
  console.log('  create <theme>          - Create a new policy-compliant theme from the approved template');
  console.log('  apply-specs <theme> [specs-file] - Apply specs.json (colors, fonts, features, settings) to theme');
  console.log('  specs gate <theme>      - Validate the required specs contract before certification');
  console.log('  innovation <list|show|gate|propose|promote> ... - Govern new factory capabilities before production use');
  console.log('  display gate <theme>    - Ensure display features are factory-registered and specs-driven');
  console.log('  component <theme> feature <feature-id> [--dry-run] - Add a documented Twilight feature');
  console.log('  component <theme> custom <slug> [--preset=basic|banner|links|product-flip|lookbook|fragrance-discovery] [--dry-run] - Create a policy-checked custom component');
  console.log('  experience <theme> <experience-id> [slug] [--dry-run] - Create a registered selling experience');
  console.log('  experience <list|show|gate> ... - Inspect or validate Experience Registry entries and specs requirements');
  console.log('  page-experience <theme> <id> [--dry-run] - Create a registered page-level experience');
  console.log('  page-experience <list|show|gate> ... - Inspect or validate Page Experience Registry entries');
  console.log('  page-contract <list|show|gate> ... - Validate theme pages against Salla docs page contracts');
  console.log('  exceptions <list|show|gate> ... - Inspect or validate accepted factory exceptions');
  console.log('  integration <list|show|gate> ... - Validate external addon/integration requirements from specs');
  console.log('  fixtures <list|show|gate> ... - Inspect or validate local runtime fixture datasets');
  console.log('  vertical <list|show|gate|theme-gate> ... - Inspect or validate benchmark store verticals from specs');
  console.log('  coverage <theme>         - Ensure every theme page has a generated local preview alternative');
  console.log('  links <theme>            - Validate generated preview internal links');
  console.log('  browser <theme>          - Run local browser smoke checks for generated previews');
  console.log('  rtl <theme>              - Validate generated previews render as RTL without horizontal overflow');
  console.log('  git-guard                - Validate staged theme changes before commit');
  console.log('  fix                     - Scan all themes for known unsafe patterns without destructive rewrites');
  console.log('  policy [theme]          - Validate theme structure, twilight.json, locales, and layout hooks');
  console.log('  audit <theme>           - Run integrity check and write reports/audit-<theme>.md');
  console.log('  preview <theme>         - Generate local runtime preview into build/<theme>/index.html');
  console.log('  build <theme>           - Run full local gates including verticals, preview coverage, links, and browser smoke');
  console.log('  certify <theme> [--require-salla|--relaxed-docs|--template-calibration] - Run the full local certification pipeline');
  console.log('  docs <sync|compile|check|status> - Maintain Salla docs intelligence memory');
}

console.log('🏭 Salla Theme Factory v10.0 | Unified CLI');
console.log('-----------------------------------------');

switch (command) {
  case 'intake':
    if (!themeArg) {
      console.error('❌ Usage: node factory.js intake <theme-name> [options]');
      process.exit(1);
    }
    process.exitCode = runNode(scripts.intake, [themeArg, ...extraArgs]) ? 0 : 1;
    break;

  case 'manufacture':
    if (!themeArg) {
      console.error('❌ Usage: node factory.js manufacture <theme-name> [--skip-deliver]');
      process.exit(1);
    }
    process.exitCode = runNode(scripts.manufacture, [themeArg, ...extraArgs]) ? 0 : 1;
    break;

  case 'deliver':
    if (!themeArg) {
      console.error('❌ Usage: node factory.js deliver <theme-name> [--skip-certify]');
      process.exit(1);
    }
    process.exitCode = runNode(scripts.deliver, [themeArg, ...extraArgs]) ? 0 : 1;
    break;

  case 'workflow':
    process.exitCode = runNode(scripts.workflow, [themeArg || 'gate', ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;

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

  case 'page-experience': {
    process.exitCode = runNode(scripts['page-experience'], [themeArg, ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'page-contract': {
    process.exitCode = runNode(scripts['page-contract'], [themeArg || 'list', ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'exceptions': {
    process.exitCode = runNode(scripts.exceptions, [themeArg || 'list', ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'integration': {
    process.exitCode = runNode(scripts.integration, [themeArg || 'list', ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'fixtures': {
    process.exitCode = runNode(scripts.fixtures, [themeArg || 'list', ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'innovation': {
    process.exitCode = runNode(scripts.innovation, [themeArg || 'list', ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'vertical': {
    process.exitCode = runNode(scripts.vertical, [themeArg || 'list', ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'browser': {
    process.exitCode = runNode(scripts.browser, [theme, ...extraArgs]) ? 0 : 1;
    break;
  }

  case 'rtl': {
    process.exitCode = runNode(scripts.rtl, [theme, ...extraArgs]) ? 0 : 1;
    break;
  }

  case 'links': {
    process.exitCode = runNode(scripts.links, [theme, ...extraArgs]) ? 0 : 1;
    break;
  }

  case 'coverage': {
    process.exitCode = runNode(scripts.coverage, [theme, ...extraArgs]) ? 0 : 1;
    break;
  }

  case 'git-guard': {
    process.exitCode = runNode(scripts['git-guard'], [themeArg, ...extraArgs].filter(Boolean)) ? 0 : 1;
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

  case 'specs': {
    process.exitCode = runNode(scripts.specs, [themeArg || 'gate', ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'display': {
    process.exitCode = runNode(scripts.display, [themeArg || 'gate', ...extraArgs].filter(Boolean)) ? 0 : 1;
    break;
  }

  case 'build': {
    console.log(`📦 Building Production-Ready Theme: [${theme.toUpperCase()}]`);
    const passed =
      runStage('Factory safety scan', () => runNode(scripts.fix)) &&
      runStage('Exception registry gate', () => runNode(scripts.exceptions, ['gate'])) &&
      runStage('Salla docs intelligence gate', () => runNode(scripts.docs, ['gate', theme, '--strict'])) &&
      runStage('Factory workflow gate', () => runNode(scripts.workflow, ['gate', theme, '--deliverable'])) &&
      runStage('Specs contract gate', () => runNode(scripts.specs, ['gate', theme])) &&
      runStage('Innovation gate', () => runNode(scripts.innovation, ['gate', theme])) &&
      runStage('Factory display feature gate', () => runNode(scripts.display, ['gate', theme])) &&
      runStage('Salla policy gate', () => runNode(scripts.policy, [theme])) &&
      runStage('Runtime fixtures gate', () => runNode(scripts.fixtures, ['gate'])) &&
      runStage('Store vertical gate', () => runNode(scripts.vertical, ['theme-gate', theme])) &&
      runStage('Experience registry gate', () => runNode(scripts.experience, ['gate', theme])) &&
      runStage('Page experience registry gate', () => runNode(scripts['page-experience'], ['gate', theme])) &&
      runStage('Salla page contract gate', () => runNode(scripts['page-contract'], ['gate', theme])) &&
      runStage('Integration gate', () => runNode(scripts.integration, ['gate', theme])) &&
      runStage('Production build', () => runThemeCommand(theme, 'pnpm', ['run', 'production'])) &&
      runStage('Integrity audit', () => runNode(scripts.audit, [theme])) &&
      runStage('Local runtime preview', () => runNode(scripts.preview, [theme, '--all-pages', '--all-fixtures'])) &&
      runStage('Page coverage gate', () => runNode(scripts.coverage, [theme])) &&
      runStage('Link smoke gate', () => runNode(scripts.links, [theme])) &&
      runStage('Browser smoke gate', () => runNode(scripts.browser, [theme])) &&
      runStage('RTL render gate', () => runNode(scripts.rtl, [theme]));

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
