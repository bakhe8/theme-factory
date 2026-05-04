const { getFixture, hasFixture, listFixtures, validateFixture } = require('./runtime/fixtures');

const command = process.argv[2] || 'list';
const fixtureId = process.argv[3];

function printList() {
  console.log('\n🧪 Runtime Fixtures');
  console.log('-------------------');
  for (const fixture of listFixtures()) {
    console.log(`- ${fixture.id}: ${fixture.title}`);
    console.log(`  products=${fixture.products}, reviews=${fixture.reviews}, users=${fixture.users}`);
    console.log(`  ${fixture.purpose}`);
  }
}

function ensureFixture(id) {
  if (!id || hasFixture(id)) return true;
  console.error(`❌ Fixture غير معروف: ${id}`);
  console.error('استخدم: node factory.js fixtures list');
  process.exitCode = 1;
  return false;
}

function printShow(id) {
  if (!ensureFixture(id)) return;
  const fixture = getFixture(id);
  const validation = validateFixture(fixture);

  console.log(`\n🧪 Fixture | ${fixture.id}`);
  console.log('-------------------');
  console.log(`Title: ${fixture.title}`);
  console.log(`Purpose: ${fixture.purpose}`);
  console.log(`Products: ${(fixture.products || []).length}`);
  console.log(`Reviews: ${(fixture.reviews || []).length}`);
  console.log(`Users: ${(fixture.users || []).length}`);
  console.log(`Categories: ${(fixture.categories || []).length}`);
  console.log(`Brands: ${(fixture.brands || []).length}`);
  console.log(`Orders: ${(fixture.orders || []).length}`);
  console.log(`Cart items: ${fixture.cart?.items_count || fixture.cart?.count || 0}`);
  console.log(`Issues: ${validation.issues.length}`);
  console.log(`Warnings: ${validation.warnings.length}`);

  for (const issue of validation.issues) console.log(`❌ ${issue}`);
  for (const warning of validation.warnings) console.log(`⚠️ ${warning}`);
}

function printGate(id) {
  if (!ensureFixture(id)) return;
  const selected = id ? [getFixture(id)] : listFixtures().map((item) => getFixture(item.id));
  let failed = false;

  console.log(`\n🧪 Fixtures Gate${id ? ` | ${id}` : ''}`);
  console.log('-------------------');

  for (const fixture of selected) {
    const validation = validateFixture(fixture);
    console.log(`\n${fixture.id}`);
    console.log(`  Issues: ${validation.issues.length}`);
    console.log(`  Warnings: ${validation.warnings.length}`);

    for (const issue of validation.issues) console.log(`  ❌ ${issue}`);
    for (const warning of validation.warnings) console.log(`  ⚠️ ${warning}`);

    if (validation.issues.length) failed = true;
  }

  if (failed) {
    console.log('\n❌ Fixtures gate failed.');
    process.exitCode = 1;
  } else {
    console.log('\n✅ Fixtures gate passed.');
  }
}

switch (command) {
  case 'list':
    printList();
    break;

  case 'show':
    printShow(fixtureId || 'fashion-rich');
    break;

  case 'gate':
    printGate(fixtureId);
    break;

  default:
    console.log('Available fixtures commands:');
    console.log('  node factory.js fixtures list');
    console.log('  node factory.js fixtures show <fixture-id>');
    console.log('  node factory.js fixtures gate [fixture-id]');
    process.exitCode = 1;
}
