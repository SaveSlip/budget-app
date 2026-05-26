#!/usr/bin/env node
/**
 * Driver for Budgify (budget-app) — a Next.js + SST + DynamoDB budget tracker.
 *
 * Usage:
 *   node .claude/skills/run-budget-app/driver.mjs [command] [args...]
 *
 * Commands:
 *   screenshot [path]          Take a screenshot of the current page (default: /tmp/budgify-shot.png)
 *   nav <url>                  Navigate to a URL (relative or absolute)
 *   signin <email> <password>  Sign in with credentials
 *   wait <selector>            Wait for an element to appear
 *   eval <js>                  Evaluate JS in the page context
 *   html                       Print inner HTML of body
 *
 * Without arguments: launches a Playwright REPL-style interactive session
 * that takes an initial screenshot of the signin page.
 */

// Playwright is installed globally via npx; resolve from its cache location
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Try project-local playwright first, then fall back to npx cache
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const npxPw = '/Users/amanbrar/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
  ({ chromium } = await import(npxPw));
}
import { createInterface } from 'readline';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const BASE_URL = process.env.BUDGIFY_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/budgify-screenshots';

mkdirSync(SCREENSHOT_DIR, { recursive: true });

let shotIndex = 0;
function nextShotPath() {
  return `${SCREENSHOT_DIR}/shot-${String(++shotIndex).padStart(3, '0')}.png`;
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Collect console errors for debugging
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Default: navigate to root, screenshot signin page, then quit
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const shotPath = nextShotPath();
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`Screenshot: ${shotPath}`);
    console.log(`URL: ${page.url()}`);
    console.log(`Title: ${await page.title()}`);
    if (consoleErrors.length) console.log('Console errors:', consoleErrors);
    await browser.close();
    return;
  }

  const cmd = args[0];

  if (cmd === 'screenshot') {
    const outPath = args[1] || nextShotPath();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Screenshot: ${outPath}`);
    await browser.close();
    return;
  }

  if (cmd === 'signin') {
    const email = args[1];
    const password = args[2];
    if (!email || !password) {
      console.error('Usage: signin <email> <password>');
      process.exit(1);
    }
    await page.goto(`${BASE_URL}/signin`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    const shotBefore = nextShotPath();
    await page.screenshot({ path: shotBefore });
    console.log(`Before submit: ${shotBefore}`);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|signin/, { timeout: 15000 });
    const shotAfter = nextShotPath();
    await page.screenshot({ path: shotAfter, fullPage: true });
    console.log(`After submit: ${shotAfter}`);
    console.log(`Final URL: ${page.url()}`);
    if (consoleErrors.length) console.log('Console errors:', consoleErrors);
    await browser.close();
    return;
  }

  if (cmd === 'nav') {
    const url = args[1].startsWith('http') ? args[1] : `${BASE_URL}${args[1]}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    const shotPath = nextShotPath();
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`Screenshot: ${shotPath}`);
    console.log(`URL: ${page.url()}`);
    await browser.close();
    return;
  }

  if (cmd === 'html') {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const html = await page.content();
    console.log(html.substring(0, 5000));
    await browser.close();
    return;
  }

  if (cmd === 'flow') {
    // Full demo flow: visit signin, take screenshot, verify the form exists
    console.log('=== Budgify smoke flow ===');
    await page.goto(`${BASE_URL}/signin`, { waitUntil: 'networkidle' });
    const signinShot = nextShotPath();
    await page.screenshot({ path: signinShot, fullPage: true });
    console.log(`Signin page: ${signinShot}`);

    // Check elements are present
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"]');
    console.log(`Email input present: ${!!emailInput}`);
    console.log(`Password input present: ${!!passwordInput}`);
    console.log(`Submit button present: ${!!submitBtn}`);

    // Check signup page
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
    const signupShot = nextShotPath();
    await page.screenshot({ path: signupShot, fullPage: true });
    console.log(`Signup page: ${signupShot}`);

    if (consoleErrors.length) console.log('Console errors:', consoleErrors.slice(0, 5));
    else console.log('No console errors');

    await browser.close();
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  console.error('Commands: screenshot, signin, nav, html, flow');
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
