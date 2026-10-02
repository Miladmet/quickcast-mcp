#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import {
  loadSessions,
  saveSession,
  getLatestSession,
  formatGithubBugReport,
  scaffoldPlaywrightTest,
  generateSopGuide,
  formatTime
} from './sessionManager.js';

const server = new Server(
  {
    name: 'quickcast-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tool schemas and capabilities
const TOOLS = [
  {
    name: 'get_latest_session',
    description: 'Retrieve metadata, duration, markers, and Cloudflare R2 watch URL of the latest or specified QuickCast recording session.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Optional specific QuickCast session ID (e.g., "qc_rec_1740001234"). If omitted, retrieves latest recording.',
        },
        watch_url: {
          type: 'string',
          description: 'Optional Cloudflare R2 watch URL to search for.',
        },
        session_data: {
          type: 'string',
          description: 'Optional raw JSON string of a QuickCast session payload to parse directly.',
        },
        session_file: {
          type: 'string',
          description: 'Optional path to custom quickcast-sessions.json file.',
        }
      },
    },
  },
  {
    name: 'list_recent_sessions',
    description: 'List recent QuickCast screen recording sessions with IDs, timestamps, durations, and shareable watch URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of sessions to return (default: 10).',
          default: 10,
        },
        session_file: {
          type: 'string',
          description: 'Optional path to custom quickcast-sessions.json file.',
        }
      },
    },
  },
  {
    name: 'format_github_bug_report',
    description: 'Format an automated, high-fidelity GitHub/Jira bug reproduction issue markdown document with timestamped video links, environment tables, and failure points from a QuickCast session.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Optional session ID. If omitted, uses latest recording.',
        },
        watch_url: {
          type: 'string',
          description: 'Optional QuickCast video watch URL.',
        },
        issue_title: {
          type: 'string',
          description: 'Custom issue title (e.g. "[Bug]: Checkout button unresponsive on Safari").',
        },
        expected_behavior: {
          type: 'string',
          description: 'What the user expected to happen.',
        },
        actual_behavior: {
          type: 'string',
          description: 'What actually occurred in the recording.',
        },
        notes: {
          type: 'string',
          description: 'Additional developer notes or context.',
        },
        session_data: {
          type: 'string',
          description: 'Optional raw session JSON string.',
        }
      },
    },
  },
  {
    name: 'scaffold_playwright_test',
    description: 'Generate an executable Playwright (TypeScript or JavaScript) E2E reproduction test based on the interactions, clicks, and URLs captured during the QuickCast recording.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Optional session ID. If omitted, uses latest recording.',
        },
        language: {
          type: 'string',
          enum: ['typescript', 'javascript'],
          description: 'Language to output ("typescript" or "javascript"). Default is "typescript".',
          default: 'typescript',
        },
        test_name: {
          type: 'string',
          description: 'Name for the Playwright test block.',
        },
        target_url: {
          type: 'string',
          description: 'Target starting URL (overrides recorded page URL if provided).',
        },
        session_data: {
          type: 'string',
          description: 'Optional raw session JSON string.',
        }
      },
    },
  },
  {
    name: 'generate_sop_guide',
    description: 'Generate a clean, structured Standard Operating Procedure (SOP) or training walkthrough document with timestamped video checkpoints from a QuickCast session.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Optional session ID. If omitted, uses latest recording.',
        },
        workflow_name: {
          type: 'string',
          description: 'Name of the workflow (e.g. "Customer Refund Process in Admin Panel").',
        },
        title: {
          type: 'string',
          description: 'Optional custom document title.',
        },
        session_data: {
          type: 'string',
          description: 'Optional raw session JSON string.',
        }
      },
    },
  },
  {
    name: 'ingest_session',
    description: 'Ingest and store a QuickCast recording session into the local session storage (~/.quickcast/sessions.json) so AI assistants can reference it.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Unique session identifier (e.g. "qc_rec_1740001234").',
        },
        watchUrl: {
          type: 'string',
          description: 'Cloudflare R2 watch URL for the recording.',
        },
        durationSeconds: {
          type: 'number',
          description: 'Total length in seconds.',
        },
        filename: {
          type: 'string',
          description: 'Original recording filename.',
        },
        markers: {
          type: 'array',
          description: 'Array of interaction markers with timeSec, label, selector, etc.',
          items: {
            type: 'object',
          },
        },
        environment: {
          type: 'object',
          description: 'Environment metadata (url, browser, resolution, os).',
        },
      },
      required: ['watchUrl'],
    },
  },
];

// Handle listing tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle calling tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'get_latest_session': {
        const session = getLatestSession(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(session, null, 2),
            },
          ],
        };
      }

      case 'list_recent_sessions': {
        const limit = args.limit || 10;
        const all = loadSessions(args.session_file);
        const sliced = all.slice(0, limit).map((s) => ({
          sessionId: s.sessionId || s.id,
          createdAt: s.createdAt,
          duration: `${formatTime(s.durationSeconds || 0)} (${s.durationSeconds || 0}s)`,
          watchUrl: s.watchUrl || s.videoUrl,
          filename: s.filename,
          markerCount: Array.isArray(s.markers) ? s.markers.length : 0,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sliced, null, 2),
            },
          ],
        };
      }

      case 'format_github_bug_report': {
        const session = getLatestSession(args);
        const report = formatGithubBugReport(session, args);
        return {
          content: [
            {
              type: 'text',
              text: report,
            },
          ],
        };
      }

      case 'scaffold_playwright_test': {
        const session = getLatestSession(args);
        const code = scaffoldPlaywrightTest(session, args);
        return {
          content: [
            {
              type: 'text',
              text: code,
            },
          ],
        };
      }

      case 'generate_sop_guide': {
        const session = getLatestSession(args);
        const guide = generateSopGuide(session, args);
        return {
          content: [
            {
              type: 'text',
              text: guide,
            },
          ],
        };
      }

      case 'ingest_session': {
        const saved = saveSession(args);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully ingested session ${saved.sessionId}. Stored in local QuickCast session database.`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server over stdio
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[quickcast-mcp] QuickCast Screen-to-Action Protocol MCP server running on stdio');
}

run().catch((error) => {
  console.error('[quickcast-mcp] Fatal error:', error);
  process.exit(1);
});
