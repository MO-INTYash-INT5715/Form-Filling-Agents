/**
 * Quick test: Scrape + Fill httpbin form with enhanced matcher
 */

import { scrapeForm } from './src/scraper/form-scraper';
import { fillFormEnhanced } from './src/filler/form-filler-enhanced';
import type { UserProfile } from './src/types/index';

const TEST_URL = 'https://httpbin.org/forms/post';

const TEST_PROFILE: UserProfile = {
  personal: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phone: '+1-555-0142',
    dateOfBirth: '1995-04-12',
    address: {
      line1: '100 Test Lane',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94107',
      country: 'USA',
    },
  },
  professional: {
    currentTitle: 'Software Engineer',
    company: 'Acme Corp',
    yearsExperience: 5,
  },
  custom: {
    size: 'medium',
    toppings: 'cheese',
  },
};

async function main() {
  console.log('=== Form Filling Agent Test (Enhanced) ===\n');

  // Step 1: Scrape
  console.log(`[1/2] Scraping form from ${TEST_URL}...`);
  const form = await scrapeForm(TEST_URL);
  console.log(`✓ Found ${form.fields.length} fields\n`);

  // Step 2: Fill
  console.log('[2/2] Filling form with enhanced matcher...');
  const result = await fillFormEnhanced(TEST_URL, form, TEST_PROFILE, {
    headless: false, // Show browser for debugging
    submit: false,
  });

  // Report
  console.log('\n=== RESULTS ===');
  console.log(`Success: ${result.success}`);
  console.log(`Attempted: ${result.fieldsAttempted}`);
  console.log(`Filled: ${result.fieldsFilled}`);
  console.log(`Failed: ${result.fieldsFailed}`);
  console.log(`Duration: ${result.durationMs}ms`);

  if (result.fieldsFilled > 0) {
    console.log('\nFilled fields:');
    Object.entries(result.fills || {}).forEach(([key, value]) => {
      console.log(`  ${key} = "${value}"`);
    });
  }

  if (result.fieldsFailed > 0) {
    console.log('\nSkipped fields:');
    Object.entries(result.skipped || {}).forEach(([key, reason]) => {
      console.log(`  ${key}: ${reason}`);
    });
  }

  if (result.error) {
    console.error(`\nError: ${result.error}`);
  }

  const accuracy = result.fieldsAttempted > 0
    ? ((result.fieldsFilled / result.fieldsAttempted) * 100).toFixed(1)
    : 0;

  console.log(`\nAccuracy: ${accuracy}%`);
}

main().catch(console.error);
