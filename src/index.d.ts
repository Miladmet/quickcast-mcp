/**
 * QuickCast MCP Server TypeScript Definitions
 * Screen-to-Action Protocol: Automated bug reporting, Playwright E2E scaffolding, and SOP generation.
 */

export interface Marker {
  id?: string;
  timestampSeconds: number;
  label?: string;
  type?: 'click' | 'navigation' | 'input' | 'assertion' | 'error';
  targetSelector?: string;
  notes?: string;
}

export interface EnvironmentInfo {
  url?: string;
  browser?: string;
  os?: string;
  resolution?: string;
  userAgent?: string;
}

export interface QuickCastSession {
  sessionId: string;
  recordedAt: string;
  durationSeconds: number;
  watchUrl: string;
  environment?: EnvironmentInfo;
  markers?: Marker[];
  summary?: string;
}

export interface GetLatestSessionParams {
  session_id?: string;
  watch_url?: string;
  session_data?: string;
  session_file?: string;
}

export interface ListRecentSessionsParams {
  limit?: number;
  session_file?: string;
}

export interface FormatGithubBugReportParams {
  session_id?: string;
  session_file?: string;
  issue_title?: string;
  expected_behavior?: string;
  actual_behavior?: string;
}

export interface ScaffoldPlaywrightTestParams {
  session_id?: string;
  session_file?: string;
  language?: 'typescript' | 'javascript';
  test_name?: string;
}

export interface GenerateSopGuideParams {
  session_id?: string;
  session_file?: string;
  workflow_name?: string;
  title?: string;
}

export interface IngestSessionParams {
  watchUrl: string;
  durationSeconds: number;
  markers?: Marker[];
  environment?: EnvironmentInfo;
  session_file?: string;
}

export declare function loadSessions(customFilePath?: string): QuickCastSession[];
export declare function saveSession(sessionData: Partial<QuickCastSession>, customFilePath?: string): QuickCastSession;
export declare function getLatestSession(sessionId?: string, watchUrl?: string, customFilePath?: string): QuickCastSession | null;
export declare function formatGithubBugReport(session: QuickCastSession, options?: { issue_title?: string; expected_behavior?: string; actual_behavior?: string }): string;
export declare function scaffoldPlaywrightTest(session: QuickCastSession, options?: { language?: 'typescript' | 'javascript'; test_name?: string }): string;
export declare function generateSopGuide(session: QuickCastSession, options?: { workflow_name?: string; title?: string }): string;
export declare function formatTime(seconds: number): string;
