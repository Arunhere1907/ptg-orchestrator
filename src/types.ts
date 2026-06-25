export interface WorkspaceFile {
  filename: string;
  content: string;
  status: "buggy" | "healthy" | "fixed" | "analyzing";
}

export interface McpConfig {
  id: string;
  name: string;
  type: string; // "filesystem" | "sqlite" | "github" | "custom"
  url: string;
  status: "connected" | "disconnected";
  allowedPaths?: string[];
  dbPath?: string;
  apiKey?: string;
}

export interface PipelineTask {
  id: string;
  label: string;
  role: "Architect" | "Executor" | "Auditor";
  status: "pending" | "in_progress" | "completed" | "failed" | "paused_for_approval";
  description: string;
  output?: string;
}

export interface LogEntry {
  tag: "ARCHITECT" | "EXECUTOR" | "AUDITOR" | "SYSTEM";
  timestamp: string;
  message: string;
}

export interface PipelineState {
  bugDescription: string;
  issueLink: string;
  selectedFile: string;
  tasks: PipelineTask[];
  activeTaskId: string | null;
  proposedCode: string | null;
  proposedDiff: {
    original: string;
    modified: string;
    explanation: string;
  } | null;
  auditReport: {
    approved: boolean;
    report: string;
    score: number;
  } | null;
  logs?: LogEntry[];
}
