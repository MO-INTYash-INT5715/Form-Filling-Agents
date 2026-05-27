#!/usr/bin/env tsx
/**
 * Quick smoke test for web-portal scraper + filler
 *
 * Usage: npx tsx test-scraper-filler.ts [--url <url>] [--headless false]
 */

import { scrapeForm } from './src/scraper/form-scraper';
import { fillForm } from './src/filler/form-filler';
import type { UserProfile } from './src/types';

// Sample UserProfile (matches web-portal types)
const testProfile: UserProfile = {
  personal: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe+ffa-test@example.com',
    phone: '+1-555-0142',
    dateOfBirth: '1995-04-12',
    address: {
      street: '100 Test Lane',
      city: 'San Francisco',
      state: 'CA',
      zip: '94107',
      country: 'USA',
    },
  },
  professional: {
    currentTitle: 'Software Engineer',
    company: 'Acme Corp',
    yearsExperience: 5,
    linkedinUrl: 'https://linkedin.com/in/janedoe-ffa-test',
  },
  education: [
    {
      institution: 'Test University',
      degree: 'B.S.',
      field: 'Computer Science',
      graduationYear: 2018,
    },
  ],
  extra: {
    size: 'medium',
    toppings: 'cheese',
  },
};

async function main() {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf('--url');
  const testUrl =
    urlIndex > -1 && args[urlIndex + 1]
      ? args[urlIndex + 1]
      : 'https://httpbin.org/forms/post';

  const headlessIndex = args.indexOf('--headless');
  const headless =
    headlessIndex > -1 && args[headlessIndex + 1] === 'false' ? false : true;

  console.log(`\n=== Web Portal Scraper + Filler Test ===\n`);
  console.log(`Target URL: ${testUrl}`);
  console.log(`Headless:   ${headless}`);
  console.log(`\n--- Step 1: Scraping form ---\n`);

  try {
    const scrapedForm = await scrapeForm(testUrl);
    console.log(`✓ Scraped ${scrapedForm.fields.length} fields:`);
    scrapedForm.fields.forEach((f, i) => {
      const desc = [f.label, f.name, f.placeholder].filter(Boolean).join(' / ');
      console.log(
        `  [${i + 1}] ${f.type.padEnd(10)} ${f.id.padEnd(20)} ${desc}`
      );
    });

    console.log(`\n--- Step 2: Filling form ---\n`);
    const result = await fillForm(testUrl, scrapedForm, testProfile, {
      submit: false,
      headless,
    });

    console.log(`\nResult:`);
    console.log(`  Fields attempted: ${result.fieldsAttempted}`);
    console.log(`  Fields filled:    ${result.fieldsFilled}`);
    console.log(`  Fields failed:    ${result.fieldsFailed}`);

    if (Object.keys(result.fills).length > 0) {
      console.log(`\n  Fills:`);
      for (const [fieldId, value] of Object.entries(result.fills)) {
        console.log(
          `    ${fieldId.padEnd(20)} → ${value?.slice(0, 40) ?? '(empty)'}`
        );
      }
    }

    if (Object.keys(result.skipped).length > 0) {
      console.log(`\n  Skipped:`);
      for (const [fieldId, reason] of Object.entries(result.skipped)) {
        console.log(`    ${fieldId.padEnd(20)} → ${reason}`);
      }
    }

    console.log(`\n✓ Test complete.\n`);
    process.exit(result.fieldsFilled > 0 ? 0 : 1);
  } catch (err: any) {
    console.error(`\n✗ Test failed:`, err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
