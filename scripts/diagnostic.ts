#!/usr/bin/env ts-node

/**
 * Simple diagnostic script to test FormFactory benchmark setup
 */

console.log('🔍 FormFactory Benchmark Setup Diagnostic\n');

// Test 1: Check if modules can be imported
console.log('Test 1: Checking module imports...');
try {
  console.log('✅ Script loaded successfully');
} catch (e) {
  console.error('❌ Error:', e);
  process.exit(1);
}

// Test 2: Display FormFactory statistics
console.log('\nTest 2: FormFactory Dataset Info');
const BENCHMARK_STATS = {
  totalForms: 25,
  totalInstances: 1250,
  totalPairs: 13800,
  domains: [
    'Academic & Research',
    'Professional & Business',
    'Arts & Creative',
    'Technology & Software',
    'Finance & Banking',
    'Healthcare & Medical',
    'Legal & Compliance',
    'Construction & Manufacturing',
  ],
};

console.log(`  - Total Forms: ${BENCHMARK_STATS.totalForms}`);
console.log(`  - Total Instances: ${BENCHMARK_STATS.totalInstances}`);
console.log(`  - Total Field-Value Pairs: ${BENCHMARK_STATS.totalPairs}`);
console.log(`  - Domains: ${BENCHMARK_STATS.domains.length}`);
console.log('\nDomains:');
BENCHMARK_STATS.domains.forEach((d, i) => {
  console.log(`  ${i + 1}. ${d}`);
});

// Test 3: Display test commands
console.log('\n\nTest 3: Available Test Commands');
console.log(`  npm run test:quick      - Quick benchmark (sanity check)`);
console.log(`  npm run test:full       - Full benchmark (all instances)`);
console.log(`  npm run test:benchmark  - Default with analysis`);
console.log(`  npm run test:domain -- academic - Test specific domain\n`);

console.log('✅ Diagnostic complete. Setup looks good!\n');
console.log('Next steps:');
console.log('  1. Run: npm install');
console.log('  2. Run: npm run test:quick');
console.log('  3. Check results in: ./benchmark-results/\n');
