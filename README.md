# QuickCast MCP (Screen-to-Action Protocol)

[![npm version](https://img.shields.io/npm/v/quickcast-mcp.svg?color=c084fc)](https://www.npmjs.com/package/quickcast-mcp)
[![Glama MCP](https://glama.ai/mcp/servers/Miladmet/quickcast-mcp/badges/score.svg)](https://glama.ai/mcp/servers/Miladmet/quickcast-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)

> **Autonomous AI Protocol for Screen Recordings**  
> Turn screen recordings directly into structured GitHub bug reports with clickable video timestamps, executable Playwright E2E tests, and Standard Operating Procedure (SOP) documentation.

Part of the **QuickCast Screen-Recorder** & **Watermark & Resize Studio** ecosystem.

---

## ⚡ Features

* **🎥 `get_latest_session`**: Instantly fetches recording metadata, duration, Cloudflare R2 watch URL, and user interaction markers from the latest session.
* **📋 `list_recent_sessions`**: Inspects recent screen recordings with durations, timestamps, and shareable preview links.
* **🐛 `format_github_bug_report`**: Formats an engineering-ready GitHub or Jira issue containing timestamped reproduction links (e.g. `[00:15](watchUrl#t=15)`), environment tables (URL, OS, resolution, browser), and failure descriptions.
* **🎭 `scaffold_playwright_test`**: Automatically outputs an executable Playwright reproduction test (in TypeScript or JavaScript) mirroring the exact interaction flow.
* **📖 `generate_sop_guide`**: Synthesizes a clean Markdown Standard Operating Procedure (SOP) for team training and workflow documentation.
* **📥 `ingest_session`**: Allows AI agents or scripts to register and store new recording telemetry into the local profile database (`~/.quickcast/sessions.json`).

---

## 📦 Instant Setup (Claude Desktop & Cursor)

Because `quickcast-mcp` is published on [npm](https://www.npmjs.com/package/quickcast-mcp), you can run it instantly with **zero local file cloning**:

### 1. Claude Desktop Configuration

Add the following to your `claude_desktop_config.json`:

* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "quickcast": {
      "command": "npx",
      "args": ["-y", "quickcast-mcp"]
    }
  }
}
```

### 2. Cursor Configuration

Add to your project's `.cursor/mcp.json` or Cursor MCP Settings:

```json
{
  "mcpServers": {
    "quickcast": {
      "command": "npx",
      "args": ["-y", "quickcast-mcp"]
    }
  }
}
```

### 3. Smithery 1-Click Install

```bash
npx -y @smithery/cli install quickcast-mcp --client claude
```

---

## 🛠️ MCP Tools Reference

| Tool | Description | Inputs |
| :--- | :--- | :--- |
| `get_latest_session` | Get latest recording details & R2 watch URL | `session_id`, `watch_url`, `session_file` |
| `list_recent_sessions` | List last 10 recordings with durations & links | `limit`, `session_file` |
| `format_github_bug_report` | Generate markdown bug report with video timestamps | `issue_title`, `expected_behavior`, `actual_behavior` |
| `scaffold_playwright_test` | Generate executable Playwright E2E script | `language` (`typescript` / `javascript`), `test_name` |
| `generate_sop_guide` | Generate SOP documentation | `workflow_name`, `title` |
| `ingest_session` | Store session telemetry to local DB | `watchUrl`, `durationSeconds`, `markers`, `environment` |

---

## 🔒 Safety & Privacy

* **100% Client-Side & Local**: Runs as a local `stdio` server on your machine.
* **Zero Cloud Costs**: Uses your existing Cloudflare R2 links or local recording files. No external AI API keys or third-party cloud brokers required.
* **Decoupled Architecture**: Strictly isolated from extension recording engines and web apps.

---

## 📄 License

MIT © [Watermark & Resize Studio](https://watermarkresizestudio.com)
