import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import {
  saveSession,
  loadSessions,
  getLatestSession,
  formatGithubBugReport,
  scaffoldPlaywrightTest,
  generateSopGuide,
  formatTime
} from '../src/sessionManager.js';

console.log('🧪 Testing QuickCast Screen-to-Action Protocol MCP Module...');

// 1. Test formatTime helper
assert.strictEqual(formatTime(0), '00:00');
assert.strictEqual(formatTime(65), '01:05');
assert.strictEqual(formatTime(3600), '60:00');
console.log('✅ 1. Time formatting tests passed.');

// 2. Test getLatestSession fallback template
const fallback = getLatestSession({});
assert.ok(fallback.sessionId);
assert.ok(fallback.markers.length > 0);
console.log('✅ 2. Fallback session template verified.');

// 3. Test Ingest / Save session
const tempFile = path.resolve('./test/temp-sessions.json');
if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

const sampleSession = {
  sessionId: 'qc_test_101',
  watchUrl: 'https://quickcast-r2-uploader.admettre.workers.dev/watch?v=sample-video-123',
  videoUrl: 'https://r2.watermarkresizestudio.com/sample-video-123.webm',
  durationSeconds: 74,
  filename: 'QuickCast-CheckoutBug.webm',
  createdAt: '2026-10-01T12:00:00.000Z',
  environment: {
    url: 'https://watermarkresizestudio.com/pricing/',
    browser: 'Chrome 130.0.0.0',
    resolution: '1920x1080',
    os: 'win32'
  },
  markers: [
    { timeSec: 10, label: 'Navigated to pricing page', selector: 'header nav' },
    { timeSec: 25, label: 'Clicked Pro Plan checkout button', selector: '#buy-pro-btn', action: 'click' },
    { timeSec: 50, label: 'Entered license validation test key', selector: '#license-key-input', action: 'fill', value: 'DEMO-KEY' },
    { timeSec: 68, label: 'Modal closed unexpectedly', error: 'Uncaught TypeError in modal handler' }
  ]
};

const saved = saveSession(sampleSession, tempFile);
assert.strictEqual(saved.sessionId, 'qc_test_101');

const loaded = loadSessions(tempFile);
assert.strictEqual(loaded.length, 1);
assert.strictEqual(loaded[0].sessionId, 'qc_test_101');
console.log('✅ 3. Session persistence & retrieval verified.');

// 4. Test formatGithubBugReport
const report = formatGithubBugReport(sampleSession, {
  expected_behavior: 'License key should activate Pro tier with success toast.',
  actual_behavior: 'Modal abruptly unmounted and console error appeared.'
});
assert.ok(report.includes('🎥 Video Recording'));
assert.ok(report.includes('[00:25](https://quickcast-r2-uploader.admettre.workers.dev/watch?v=sample-video-123#t=25)'));
assert.ok(report.includes('Uncaught TypeError in modal handler'));
console.log('✅ 4. GitHub Bug Report generator verified.');

// 5. Test scaffoldPlaywrightTest (TypeScript)
const tsTest = scaffoldPlaywrightTest(sampleSession, {
  language: 'typescript',
  test_name: 'reproduce pricing modal crash'
});
assert.ok(tsTest.includes("import { test, expect"));
assert.ok(tsTest.includes("page.goto('https://watermarkresizestudio.com/pricing/')"));
assert.ok(tsTest.includes("await page.locator('#buy-pro-btn').click()"));
console.log('✅ 5. Playwright test generator (TypeScript) verified.');

// 6. Test scaffoldPlaywrightTest (JavaScript)
const jsTest = scaffoldPlaywrightTest(sampleSession, {
  language: 'javascript'
});
assert.ok(jsTest.includes("const { test, expect } = require('@playwright/test')"));
console.log('✅ 6. Playwright test generator (JavaScript) verified.');

// 7. Test generateSopGuide
const sop = generateSopGuide(sampleSession, {
  workflow_name: 'Pro License Activation Procedure'
});
assert.ok(sop.includes('SOP: Pro License Activation Procedure'));
assert.ok(sop.includes('Step 2: Clicked Pro Plan checkout button'));
assert.ok(sop.includes('Interactive Walkthrough Video'));
console.log('✅ 7. SOP generator verified.');

// Clean up temp test file
if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

console.log('\n🎉 ALL QUICKCAST MCP UNIT TESTS PASSED!');
