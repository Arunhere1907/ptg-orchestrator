import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent set for AI Studio
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// 1. Virtual Workspace State (stored in memory)
let workspaceFiles: { [filename: string]: string } = {
  "billing.ts": `// Billing Service v1.0.4
const VAT_RATE = 0.20; // 20% VAT

export function calculateTotal(subtotal: number, discount: number = 0): { total: number; tax: number } {
  // Apply VAT rate
  const subtotalWithTax = subtotal * (1 + VAT_RATE);
  
  // Apply discount to subtotal with tax, then apply VAT rate again
  // BUG: This causes double taxation on subtotal!
  const total = (subtotalWithTax - discount) * (1 + VAT_RATE);
  const tax = total * VAT_RATE;
  
  return { total, tax };
}`,
  "auth.ts": `// Authentication Module
interface Session {
  token: string;
  expiresAt: number; // timestamp
}

export function isSessionValid(session: Session | null): boolean {
  if (!session) {
    return false;
  }
  
  // BUG: Logical error in expiration check!
  // It checks if expiration is in the future and returns false, invalidating active sessions.
  if (session.expiresAt > Date.now()) {
    return false; 
  }
  
  return true;
}`,
  "db.ts": `// Database Query Engine
interface DBConnection {
  query: (sql: string) => Promise<any[]>;
}

export async function getUserById(db: DBConnection, userId: string): Promise<any> {
  // BUG: SQL injection vulnerability! User input is concatenated directly.
  // It should use parameterized queries: db.query('SELECT * FROM users WHERE id = ?', [userId])
  const queryStr = \`SELECT * FROM users WHERE id = '\${userId}' AND deleted = 0\`;
  const results = await db.query(queryStr);
  return results[0] || null;
}`,
};

const defaultWorkspaceFiles = { ...workspaceFiles };

// Pluggable MCP Server Configurations
let mcpConfigs = [
  {
    id: "fs-mcp",
    name: "Local FileSystem MCP",
    type: "filesystem",
    url: "http://localhost:5001",
    status: "connected",
    allowedPaths: ["/src/components", "/src/utils", "/workspace"],
    apiKey: "sk-proj-fs-key-placeholder",
  },
  {
    id: "sqlite-mcp",
    name: "SQLite Database MCP",
    type: "sqlite",
    url: "http://localhost:5002",
    status: "connected",
    dbPath: "./app-data.db",
    apiKey: "sk-proj-sqlite-key-placeholder",
  },
  {
    id: "github-mcp",
    name: "GitHub Repositories MCP",
    type: "github",
    url: "http://localhost:5003",
    status: "disconnected",
    apiKey: "",
  },
];

interface LogEntry {
  tag: "ARCHITECT" | "EXECUTOR" | "AUDITOR";
  timestamp: string;
  message: string;
}

// Active Pipeline State
interface PipelineState {
  bugDescription: string;
  issueLink: string;
  selectedFile: string;
  tasks: {
    id: string;
    label: string;
    role: "Architect" | "Executor" | "Auditor";
    status: "pending" | "in_progress" | "completed" | "failed" | "paused_for_approval";
    description: string;
    output?: string;
  }[];
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

let activePipeline: PipelineState | null = null;

// ================= API ENDPOINTS =================

// Workspace routes
app.get("/api/workspace", (req, res) => {
  res.json({ files: workspaceFiles });
});

app.post("/api/workspace/reset", (req, res) => {
  workspaceFiles = { ...defaultWorkspaceFiles };
  res.json({ success: true, files: workspaceFiles });
});

app.post("/api/workspace/save", (req, res) => {
  const { filename, content } = req.body;
  if (filename && content !== undefined) {
    workspaceFiles[filename] = content;
    res.json({ success: true, files: workspaceFiles });
  } else {
    res.status(400).json({ error: "Filename and content required" });
  }
});

// MCP Config routes
app.get("/api/mcp", (req, res) => {
  res.json({ configs: mcpConfigs });
});

app.post("/api/mcp", (req, res) => {
  const { name, type, url, apiKey, allowedPaths, dbPath } = req.body;
  const newConfig = {
    id: `mcp-${Date.now()}`,
    name: name || "Custom MCP Server",
    type: type || "custom",
    url: url || "http://localhost:8080",
    status: "connected",
    allowedPaths,
    dbPath,
    apiKey: apiKey || "",
  };
  mcpConfigs.push(newConfig);
  res.json({ success: true, configs: mcpConfigs });
});

app.delete("/api/mcp/:id", (req, res) => {
  const { id } = req.params;
  mcpConfigs = mcpConfigs.filter((c) => c.id !== id);
  res.json({ success: true, configs: mcpConfigs });
});

app.post("/api/mcp/:id/toggle", (req, res) => {
  const { id } = req.params;
  mcpConfigs = mcpConfigs.map((c) => {
    if (c.id === id) {
      return {
        ...c,
        status: c.status === "connected" ? "disconnected" : "connected",
      };
    }
    return c;
  });
  res.json({ success: true, configs: mcpConfigs });
});

// GET active pipeline state
app.get("/api/pipeline", (req, res) => {
  res.json({ pipeline: activePipeline });
});

// RESET active pipeline
app.post("/api/pipeline/reset", (req, res) => {
  activePipeline = null;
  res.json({ success: true });
});

// POST /api/pipeline/start - Agent 1: The Architect (Decomposition)
app.post("/api/pipeline/start", async (req, res) => {
  const { bugDescription, issueLink } = req.body;
  if (!bugDescription) {
    return res.status(400).json({ error: "Bug description is required." });
  }

  try {
    // Automatically match suitable workspace file if not specified
    let selectedFile = "billing.ts";
    const descLower = bugDescription.toLowerCase();
    if (descLower.includes("auth") || descLower.includes("session") || descLower.includes("expire")) {
      selectedFile = "auth.ts";
    } else if (descLower.includes("db") || descLower.includes("sql") || descLower.includes("query") || descLower.includes("user")) {
      selectedFile = "db.ts";
    }

    const currentFileContent = workspaceFiles[selectedFile] || "";

    // Instruct Agent 1 (The Architect) to build the JSON task graph
    const prompt = `You are Agent 1: The Architect. 
Analyze the user's issue/bug description and locate the relevant module. 
Issue: "${bugDescription}"
Target File: ${selectedFile}
Current File Code:
\`\`\`typescript
${currentFileContent}
\`\`\`

Based on this, decompose this bug-fixing workflow into exactly 3 atomic sequential tasks.
Task 1 MUST be assigned to "Architect" (role) - e.g. "Trace data flow and pinpoint calculation/logic error in ${selectedFile}".
Task 2 MUST be assigned to "Executor" (role) - e.g. "Rewrite faulty block with strict test parameters in ${selectedFile}".
Task 3 MUST be assigned to "Auditor" (role) - e.g. "Audit proposed diff in ${selectedFile} for vulnerabilities, type compliance, and syntax".

You MUST respond strictly with a valid JSON array corresponding to this schema:
[{
  "id": "string (e.g. task-1, task-2, task-3)",
  "label": "string (short user-friendly description)",
  "role": "Architect" | "Executor" | "Auditor",
  "description": "string (detailed execution instructions for the next agent)"
}]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              role: {
                type: Type.STRING,
                description: "Must be Architect, Executor, or Auditor",
              },
              description: { type: Type.STRING },
            },
            required: ["id", "label", "role", "description"],
          },
        },
      },
    });

    const tasksJson = JSON.parse(response.text || "[]");
    
    // Build initial pipeline state
    activePipeline = {
      bugDescription,
      issueLink: issueLink || "",
      selectedFile,
      tasks: tasksJson.map((t: any, index: number) => ({
        id: t.id || `task-${index + 1}`,
        label: t.label || `Step ${index + 1}`,
        role: t.role || (index === 0 ? "Architect" : index === 1 ? "Executor" : "Auditor"),
        status: index === 0 ? "completed" : "pending", // Architect task starts as completed because the decomposition IS the architect's output!
        description: t.description || "",
        output: index === 0 ? `Analyzed workspace module: ${selectedFile}. Identified 2-3 logical nodes for code remediation. Task graph built successfully.` : undefined,
      })),
      activeTaskId: "task-2", // Start at Executor step next
      proposedCode: null,
      proposedDiff: null,
      auditReport: null,
      logs: [{
        tag: "ARCHITECT",
        timestamp: new Date().toISOString(),
        message: `Decomposed tasks successfully. Task graph:\n${JSON.stringify(tasksJson, null, 2)}`
      }],
    };

    res.json({ success: true, pipeline: activePipeline });
  } catch (error: any) {
    console.error("Architect Decomposition Error:", error);
    res.status(500).json({ error: error.message || "Failed to decompose bug into task graph." });
  }
});

// POST /api/pipeline/execute-step - Agent 2: The Executor (locates bug & suggests fix -> HIiTL pause)
app.post("/api/pipeline/execute-step", async (req, res) => {
  if (!activePipeline) {
    return res.status(400).json({ error: "No active pipeline. Start one first." });
  }

  const activeTaskIndex = activePipeline.tasks.findIndex(t => t.id === activePipeline?.activeTaskId);
  if (activeTaskIndex === -1) {
    return res.status(400).json({ error: "No active task found in the pipeline state." });
  }

  const activeTask = activePipeline.tasks[activeTaskIndex];
  activeTask.status = "in_progress";

  try {
    const fileToFix = activePipeline.selectedFile;
    const originalCode = workspaceFiles[fileToFix] || "";

    if (activeTask.role === "Executor") {
      // Execute the task via Gemini. Gemini acts as Executor, analyzing the workspace and outputting a fix.
      const prompt = `You are Agent 2: The Executor (Code & MCP Integration).
Your task is to fix the bug in the file: ${fileToFix}.
Bug report: "${activePipeline.bugDescription}"
Specific execution instructions: "${activeTask.description}"

Original code of the file:
\`\`\`typescript
${originalCode}
\`\`\`

You must analyze this code, locate the bug, and provide:
1. The exact modified code of the entire file.
2. A short explanation of what you changed and why.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "modifiedCode": "string (the complete full file content with the bug fixed)",
  "explanation": "string (short description of the correction made)"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              modifiedCode: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["modifiedCode", "explanation"],
          },
        },
      });

      const executorResult = JSON.parse(response.text || "{}");

      // Pause for human-in-the-loop validation
      activePipeline.proposedCode = executorResult.modifiedCode;
      activePipeline.proposedDiff = {
        original: originalCode,
        modified: executorResult.modifiedCode,
        explanation: executorResult.explanation || "Fixed logical anomaly in function block.",
      };

      if (!activePipeline.logs) activePipeline.logs = [];
      activePipeline.logs.push({
        tag: "EXECUTOR",
        timestamp: new Date().toISOString(),
        message: `Analysis completed. Proposed patch for ${fileToFix} generated. Paused for Human-In-The-Loop review.`
      });

      activeTask.status = "paused_for_approval";
      res.json({ success: true, pipeline: activePipeline, requiresApproval: true });
    } else {
      res.status(400).json({ error: "Invalid task trigger. This endpoint handles Executor triggers." });
    }
  } catch (error: any) {
    console.error("Executor Execution Error:", error);
    activeTask.status = "failed";
    res.status(500).json({ error: error.message || "Failed to execute core developer workflow node." });
  }
});

// POST /api/pipeline/approve-step - Human-in-the-Loop approval
app.post("/api/pipeline/approve-step", async (req, res) => {
  if (!activePipeline || !activePipeline.proposedDiff || !activePipeline.proposedCode) {
    return res.status(400).json({ error: "No proposed code fix available for approval." });
  }

  try {
    const fileToFix = activePipeline.selectedFile;
    const originalCode = activePipeline.proposedDiff.original;
    const modifiedCode = activePipeline.proposedCode;

    // Apply the fix directly to our virtual workspace!
    workspaceFiles[fileToFix] = modifiedCode;

    if (!activePipeline.logs) activePipeline.logs = [];
    activePipeline.logs.push({
      tag: "EXECUTOR",
      timestamp: new Date().toISOString(),
      message: `File write confirmation: Successfully patched and wrote ${fileToFix} to virtual workspace. Changes: ${activePipeline.proposedDiff.explanation}`
    });

    // Mark current task (Executor) as completed
    const executorTask = activePipeline.tasks.find(t => t.role === "Executor");
    if (executorTask) {
      executorTask.status = "completed";
      executorTask.output = `Code saved to virtual workspace. Changes:\n${activePipeline.proposedDiff.explanation}`;
    }

    // Set Auditor task to In Progress next
    const auditorTask = activePipeline.tasks.find(t => t.role === "Auditor");
    if (auditorTask) {
      activePipeline.activeTaskId = auditorTask.id;
    }

    res.json({ success: true, pipeline: activePipeline });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to approve and save work step." });
  }
});

// POST /api/pipeline/fail-step - Human-in-the-Loop abort/rejection (fail Executor & stop pipeline)
app.post("/api/pipeline/fail-step", async (req, res) => {
  if (!activePipeline) {
    return res.status(400).json({ error: "No active pipeline to fail." });
  }

  const executorTask = activePipeline.tasks.find(t => t.role === "Executor");
  if (executorTask) {
    executorTask.status = "failed";
    executorTask.output = "Aborted by user during human-in-the-loop review.";
  }

  activePipeline.activeTaskId = null; // Stopped

  if (!activePipeline.logs) activePipeline.logs = [];
  activePipeline.logs.push({
    tag: "EXECUTOR",
    timestamp: new Date().toISOString(),
    message: "File write REJECTED & ABORTED. Pipeline stopped with failure state."
  });

  res.json({ success: true, pipeline: activePipeline });
});

// POST /api/pipeline/reject-step - Human-in-the-Loop feedback/rejection
app.post("/api/pipeline/reject-step", async (req, res) => {
  const { feedback } = req.body;
  if (!activePipeline) {
    return res.status(400).json({ error: "No active pipeline to provide feedback to." });
  }

  const executorTask = activePipeline.tasks.find(t => t.role === "Executor");
  if (!executorTask) {
    return res.status(400).json({ error: "Executor task context not found." });
  }

  executorTask.status = "in_progress";

  try {
    const fileToFix = activePipeline.selectedFile;
    const originalCode = workspaceFiles[fileToFix] || "";

    const prompt = `You are Agent 2: The Executor. 
Your previous code fix was REJECTED by the developer.
User Feedback: "${feedback || "Please correct the logic and verify type compliance."}"

Original Code:
\`\`\`typescript
${originalCode}
\`\`\`

Your previously proposed code was:
\`\`\`typescript
${activePipeline.proposedCode}
\`\`\`

Re-evaluate the bug fixing task considering the developer's feedback. Write a refined version of the file content.
You MUST respond strictly with a valid JSON object matching this schema:
{
  "modifiedCode": "string (the complete full file content with the bug fixed and feedback incorporated)",
  "explanation": "string (short description of what was refined based on user input)"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            modifiedCode: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["modifiedCode", "explanation"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");

    activePipeline.proposedCode = result.modifiedCode;
    activePipeline.proposedDiff = {
      original: originalCode,
      modified: result.modifiedCode,
      explanation: `[Refined based on feedback] ${result.explanation}`,
    };

    executorTask.status = "paused_for_approval";
    res.json({ success: true, pipeline: activePipeline });
  } catch (error: any) {
    executorTask.status = "failed";
    res.status(500).json({ error: error.message || "Failed to regenerate fix based on developer instructions." });
  }
});

// POST /api/pipeline/audit-step - Agent 3: The Auditor (Security & Quality Check)
app.post("/api/pipeline/audit-step", async (req, res) => {
  if (!activePipeline || !activePipeline.proposedDiff) {
    return res.status(400).json({ error: "No code changes found to audit." });
  }

  const auditorTask = activePipeline.tasks.find(t => t.role === "Auditor");
  if (!auditorTask) {
    return res.status(400).json({ error: "Auditor task not found." });
  }

  auditorTask.status = "in_progress";

  try {
    const fileAudited = activePipeline.selectedFile;
    const original = activePipeline.proposedDiff.original;
    const modified = activePipeline.proposedDiff.modified;

    const prompt = `You are Agent 3: The Auditor (Security/Quality Check).
Your role is to perform a strict code review and secure audit of the diff proposed by the Executor.
File: ${fileAudited}

Review:
1. Original Code:
\`\`\`typescript
${original}
\`\`\`

2. Corrected Code:
\`\`\`typescript
${modified}
\`\`\`

Perform basic security checking (XSS, SQL Injection, Logic Exploits), syntax checks, and edge-case handling.
Evaluate if the bug is completely resolved and give a quality score from 0 to 100.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "approved": boolean,
  "report": "string (detailed audit analysis of vulnerabilities, logic fixes, suggestions, and clean metrics)",
  "score": number (0 to 100 rating)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            approved: { type: Type.BOOLEAN },
            report: { type: Type.STRING },
            score: { type: Type.INTEGER },
          },
          required: ["approved", "report", "score"],
        },
      },
    });

    const auditResult = JSON.parse(response.text || "{}");

    activePipeline.auditReport = {
      approved: auditResult.approved,
      report: auditResult.report,
      score: auditResult.score,
    };

    if (!activePipeline.logs) activePipeline.logs = [];
    const verdict = auditResult.approved ? "PASS" : "FAIL";
    activePipeline.logs.push({
      tag: "AUDITOR",
      timestamp: new Date().toISOString(),
      message: `Security audit review completed. Score: ${auditResult.score}/100. Verdict: ${verdict}. Reason:\n${auditResult.report}`
    });

    auditorTask.status = "completed";
    auditorTask.output = `Audit score: ${auditResult.score}/100. Review completed.\n${auditResult.report}`;
    activePipeline.activeTaskId = null; // Completed

    res.json({ success: true, pipeline: activePipeline });
  } catch (error: any) {
    console.error("Auditor Execution Error:", error);
    auditorTask.status = "failed";
    res.status(500).json({ error: error.message || "Failed to complete security audit step." });
  }
});

// ================= VITE OR STATIC FILE SERVING =================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
