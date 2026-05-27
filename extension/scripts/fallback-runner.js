/**
 * Quick start: Run FormFactory benchmarks
 * This is a fallback script if ts-node has issues
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 FormFactory Benchmark Runner (CommonJS)\n');

// Fallback message
console.log('Note: If TypeScript imports fail, this provides a simple test runner.');
console.log('Ensure you have run: npm install\n');

// Basic statistics
const STATS = {
  forms: 25,
  instances: 1250,
  pairs: 13800,
  domains: 8,
};

console.log('📊 FormFactory Dataset:');
console.log(`  - Forms: ${STATS.forms}`);
console.log(`  - Instances: ${STATS.instances}`);
console.log(`  - Field-Value Pairs: ${STATS.pairs}`);
console.log(`  - Domains: ${STATS.domains}\n`);

// Create mock result
const mockResults = {
  summary: {
    totalTests: 25,
    passedTests: 8,
    failedTests: 17,
    averageFormCompletion: 35.2,
    averageClickAccuracy: 18.75,
    averageValueAccuracy: 62.45,
    executionTime: 45000,
  },
  timestamp: new Date().toISOString(),
};

console.log('📈 Sample Results (Mock):');
console.log(`  - Total Tests: ${mockResults.summary.totalTests}`);
console.log(`  - Passed: ${mockResults.summary.passedTests}`);
console.log(`  - Failed: ${mockResults.summary.failedTests}`);
console.log(`  - Avg Form Completion: ${mockResults.summary.averageFormCompletion.toFixed(2)}%`);
console.log(`  - Avg Click Accuracy: ${mockResults.summary.averageClickAccuracy.toFixed(2)}%`);
console.log(`  - Avg Value Accuracy: ${mockResults.summary.averageValueAccuracy.toFixed(2)}%\n`);

// Save mock result
const resultsDir = './benchmark-results';
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const resultFile = path.join(resultsDir, `sample-results-${timestamp}.json`);

fs.writeFileSync(resultFile, JSON.stringify(mockResults, null, 2));

console.log(`✅ Sample result saved to: ${resultFile}\n`);
console.log('To run actual benchmarks:');
console.log('  1. npm install');
console.log('  2. npm run test:quick');
console.log('  3. Check: ./benchmark-results/\n');
