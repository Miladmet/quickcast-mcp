import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Standard session directory in the user's home directory.
 */
export const DEFAULT_QUICKCAST_DIR = path.join(os.homedir(), '.quickcast');
export const DEFAULT_SESSIONS_FILE = path.join(DEFAULT_QUICKCAST_DIR, 'sessions.json');

/**
 * Helper to format seconds into mm:ss.
 */
export function formatTime(seconds = 0) {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Searches candidate locations to locate QuickCast sessions.
 */
export function resolveSessionFile(customPath) {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  if (process.env.QUICKCAST_SESSION_FILE && fs.existsSync(process.env.QUICKCAST_SESSION_FILE)) {
    return process.env.QUICKCAST_SESSION_FILE;
  }

  if (fs.existsSync(DEFAULT_SESSIONS_FILE)) {
    return DEFAULT_SESSIONS_FILE;
  }

  // Check current working directory
  const cwdFile = path.resolve(process.cwd(), 'quickcast-sessions.json');
  if (fs.existsSync(cwdFile)) {
    return cwdFile;
  }

  return DEFAULT_SESSIONS_FILE;
}

/**
 * Load all stored sessions.
 */
export function loadSessions(customPath) {
  const filePath = resolveSessionFile(customPath);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.sessions)) return parsed.sessions;
    if (parsed && Array.isArray(parsed.recentRecordings)) return parsed.recentRecordings;
    return [];
  } catch (err) {
    console.error(`[QuickCast MCP] Failed to read session file (${filePath}):`, err.message);
    return [];
  }
}

/**
 * Persists a new or updated session to the sessions store.
 */
export function saveSession(sessionData, customPath) {
  const targetFile = customPath || DEFAULT_SESSIONS_FILE;
  const dir = path.dirname(targetFile);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const existing = loadSessions(targetFile);
  const sessionId = sessionData.sessionId || sessionData.id || `qc_rec_${Date.now()}`;

  const entry = {
    ...sessionData,
    sessionId,
    id: sessionId,
    updatedAt: new Date().toISOString(),
    createdAt: sessionData.createdAt || new Date().toISOString(),
  };

  const filtered = existing.filter((s) => (s.sessionId || s.id) !== sessionId);
  filtered.unshift(entry);

  // Keep up to 50 recent sessions
  const trimmed = filtered.slice(0, 50);

  fs.writeFileSync(targetFile, JSON.stringify(trimmed, null, 2), 'utf-8');
  return entry;
}

/**
 * Retrieves the latest recorded session or matching session by ID/URL.
 */
export function getLatestSession(params = {}) {
  const sessions = loadSessions(params.session_file);

  if (params.session_data) {
    try {
      const parsed = typeof params.session_data === 'string'
        ? JSON.parse(params.session_data)
        : params.session_data;
      return parsed;
    } catch (_) {}
  }

  if (params.session_id) {
    const found = sessions.find((s) => (s.sessionId || s.id) === params.session_id);
    if (found) return found;
  }

  if (params.watch_url) {
    const found = sessions.find((s) => s.watchUrl === params.watch_url || s.videoUrl === params.watch_url);
    if (found) return found;
  }

  if (sessions.length > 0) {
    return sessions[0];
  }

  // Graceful fallback template when no recordings are registered yet
  return {
    isTemplate: true,
    sessionId: "qc_sample_session",
    watchUrl: "https://quickcast-r2-uploader.admettre.workers.dev/watch?v=sample-preview",
    videoUrl: "",
    durationSeconds: 45,
    createdAt: new Date().toISOString(),
    environment: {
      url: "https://example.com/checkout",
      browser: "Chrome 130",
      resolution: "1920x1080",
      os: process.platform
    },
    markers: [
      { timeSec: 5, label: "Navigated to target page", selector: "body" },
      { timeSec: 18, label: "Clicked 'Proceed to Checkout' button", selector: "#checkout-btn" },
      { timeSec: 32, label: "Entered discount code 'SAVE20'", selector: "input#promo-code" },
      { timeSec: 42, label: "Observed 500 API error in modal", error: "Internal Server Error: 500" }
    ],
    message: "No live recordings found in store yet. Displaying sample structure. Use ingest_session or record a video in QuickCast extension to populate."
  };
}

/**
 * Formats a GitHub / Jira reproduction issue from a session recording.
 */
export function formatGithubBugReport(session, options = {}) {
  const title = options.issue_title || `[Bug]: Issue observed during QuickCast recording (${session.sessionId || session.id || 'Session'})`;
  const watchLink = session.watchUrl || session.videoUrl || "Attached video";
  const duration = formatTime(session.durationSeconds || 0);
  const env = session.environment || {};
  const markers = Array.isArray(session.markers) ? session.markers : [];

  let md = `# ${title}\n\n`;

  md += `## 🎥 Video Recording\n`;
  if (session.watchUrl) {
    md += `* **Watch Recording (${duration})**: [${session.watchUrl}](${session.watchUrl})\n`;
  }
  if (session.filename) {
    md += `* **File**: \`${session.filename}\`\n`;
  }
  md += `* **Session ID**: \`${session.sessionId || session.id || 'N/A'}\`\n`;
  md += `* **Recorded At**: ${session.createdAt || new Date().toISOString()}\n\n`;

  md += `## 💻 Environment\n`;
  md += `| Property | Value |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Target URL** | \`${env.url || env.tabUrl || 'Not specified'}\` |\n`;
  md += `| **Browser / User Agent** | \`${env.browser || env.userAgent || 'Chrome'}\` |\n`;
  md += `| **Screen Resolution** | \`${env.resolution || '1920x1080'}\` |\n`;
  md += `| **OS** | \`${env.os || process.platform}\` |\n\n`;

  md += `## 📋 Steps to Reproduce\n`;
  if (markers.length > 0) {
    markers.forEach((m, idx) => {
      const timestamp = formatTime(m.timeSec || 0);
      const videoAnchor = session.watchUrl ? `[${timestamp}](${session.watchUrl}#t=${Math.floor(m.timeSec || 0)})` : `\`${timestamp}\``;
      const selectorText = m.selector ? ` (selector: \`${m.selector}\`)` : '';
      md += `${idx + 1}. **${videoAnchor}**: ${m.label || m.action || 'User interaction'}${selectorText}\n`;
      if (m.error) {
        md += `   > ⚠️ **Error Triggered**: \`${m.error}\`\n`;
      }
    });
  } else {
    md += `1. Navigate to \`${env.url || 'the application'}\`.\n`;
    md += `2. Follow interaction flow shown in recording at [${watchLink}](${watchLink}).\n`;
    md += `3. Observe unintended behavior at end of recording.\n`;
  }
  md += `\n`;

  md += `## ❌ Expected vs Actual Behavior\n`;
  md += `* **Expected**: ${options.expected_behavior || 'Flow should complete smoothly without errors.'}\n`;
  md += `* **Actual**: ${options.actual_behavior || 'System encountered unexpected state / error shown in recording.'}\n\n`;

  if (options.notes) {
    md += `## 📝 Additional Notes\n${options.notes}\n\n`;
  }

  md += `*Generated automatically via [QuickCast Screen-to-Action Protocol](https://watermarkresizestudio.com).*`;

  return md;
}

/**
 * Scaffolds an executable Playwright test based on recorded session steps.
 */
export function scaffoldPlaywrightTest(session, options = {}) {
  const language = (options.language || 'typescript').toLowerCase();
  const testName = options.test_name || `reproduce issue from ${session.sessionId || 'QuickCast recording'}`;
  const env = session.environment || {};
  const targetUrl = options.target_url || env.url || env.tabUrl || 'https://example.com';
  const markers = Array.isArray(session.markers) ? session.markers : [];
  const watchUrl = session.watchUrl || session.videoUrl || '';

  const isTs = language === 'typescript' || language === 'ts';

  let code = '';

  if (isTs) {
    code += `import { test, expect, type Page } from '@playwright/test';\n\n`;
    code += `/**\n`;
    code += ` * Automated Reproduction Test generated by QuickCast Screen-to-Action Protocol.\n`;
    if (watchUrl) code += ` * Video Recording: ${watchUrl}\n`;
    code += ` * Session ID: ${session.sessionId || session.id || 'N/A'}\n`;
    code += ` */\n`;
    code += `test.describe('QuickCast Automated Reproduction', () => {\n`;
    code += `  test('${testName}', async ({ page }: { page: Page }) => {\n`;
  } else {
    code += `const { test, expect } = require('@playwright/test');\n\n`;
    code += `/**\n`;
    code += ` * Automated Reproduction Test generated by QuickCast Screen-to-Action Protocol.\n`;
    if (watchUrl) code += ` * Video Recording: ${watchUrl}\n`;
    code += ` * Session ID: ${session.sessionId || session.id || 'N/A'}\n`;
    code += ` */\n`;
    code += `test.describe('QuickCast Automated Reproduction', () => {\n`;
    code += `  test('${testName}', async ({ page }) => {\n`;
  }

  code += `    // 1. Initial Navigation\n`;
  code += `    await page.goto('${targetUrl}');\n`;
  code += `    await page.waitForLoadState('networkidle');\n\n`;

  if (markers.length > 0) {
    markers.forEach((m, idx) => {
      const timeStr = formatTime(m.timeSec || 0);
      code += `    // Step ${idx + 1} [${timeStr}]: ${m.label || 'Action'}\n`;
      const sel = m.selector || (m.label && m.label.toLowerCase().includes('button') ? 'button' : null);

      if (m.action === 'click' || (m.label && m.label.toLowerCase().includes('click'))) {
        if (sel) {
          code += `    await page.locator('${sel}').click();\n`;
        } else {
          code += `    // Click target: ${m.label}\n`;
          code += `    await page.getByRole('button', { name: /${escapeRegex(m.label)}/i }).click();\n`;
        }
      } else if (m.action === 'fill' || (m.label && m.label.toLowerCase().includes('type'))) {
        code += `    await page.locator('${sel || 'input'}').fill('${m.value || 'test input'}');\n`;
      } else {
        code += `    // ${m.label}\n`;
        if (sel) {
          code += `    await expect(page.locator('${sel}')).toBeVisible();\n`;
        }
      }

      if (m.error) {
        code += `    // Assert or check error occurrence: ${m.error}\n`;
        code += `    // await expect(page.locator('.error-banner')).toContainText('${m.error}');\n`;
      }
      code += `\n`;
    });
  } else {
    code += `    // TODO: Add recorded selector steps\n`;
    code += `    await expect(page).toHaveURL(/${escapeRegex(targetUrl)}/);\n`;
  }

  code += `    // Final verification assertion\n`;
  code += `    // await expect(page.locator('body')).toBeVisible();\n`;
  code += `  });\n`;
  code += `});\n`;

  return code;
}

/**
 * Generates a clean SOP (Standard Operating Procedure) markdown document.
 */
export function generateSopGuide(session, options = {}) {
  const docTitle = options.title || `SOP: ${options.workflow_name || 'Standard Operating Procedure'}`;
  const duration = formatTime(session.durationSeconds || 0);
  const markers = Array.isArray(session.markers) ? session.markers : [];
  const watchLink = session.watchUrl || session.videoUrl;

  let md = `# ${docTitle}\n\n`;
  md += `> **Standard Operating Procedure generated from QuickCast session.**\n\n`;

  md += `## 📌 Overview\n`;
  md += `* **Author/System**: QuickCast SOP Automation Engine\n`;
  md += `* **Created**: ${new Date().toLocaleDateString()}\n`;
  md += `* **Duration of Procedure**: ~${duration}\n`;
  if (watchLink) {
    md += `* **Interactive Walkthrough Video**: [Watch Demo (${duration})](${watchLink})\n`;
  }
  md += `\n`;

  md += `## 🛠️ Prerequisites\n`;
  md += `* Access to: \`${session.environment?.url || 'Target Application'}\`\n`;
  md += `* Modern Web Browser (Chrome, Edge, Firefox, Safari)\n`;
  md += `* Valid user credentials / permissions\n\n`;

  md += `## 📝 Step-by-Step Instructions\n\n`;
  if (markers.length > 0) {
    markers.forEach((m, idx) => {
      const timeStr = formatTime(m.timeSec || 0);
      const timeLink = watchLink ? `[${timeStr}](${watchLink}#t=${Math.floor(m.timeSec || 0)})` : `\`${timeStr}\``;
      md += `### Step ${idx + 1}: ${m.label || 'Action step'}\n`;
      md += `* **Timestamp**: ${timeLink}\n`;
      if (m.selector) md += `* **Interface Element**: \`${m.selector}\`\n`;
      md += `* **Action Required**: Execute action as demonstrated in walkthrough.\n\n`;
    });
  } else {
    md += `1. Review video at [${watchLink || 'attached recording'}](${watchLink || '#'})\n`;
    md += `2. Replicate operational steps as demonstrated.\n\n`;
  }

  md += `## ✅ Verification & Quality Check\n`;
  md += `1. Confirm that output matches expected operational result.\n`;
  md += `2. Ensure no error dialogs or warnings are displayed.\n`;
  md += `3. Archive execution record for compliance.\n\n`;

  md += `---\n*Generated by QuickCast Screen-to-Action Protocol.*`;
  return md;
}

function escapeRegex(string = '') {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 30);
}
