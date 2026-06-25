import React, { useState, useEffect } from "react";
import {
  Sparkles,
  GitPullRequest,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  Code2,
  AlertOctagon,
  RefreshCw,
  Plus,
  Play,
  Settings,
  Flame,
  HelpCircle,
  FileCode,
  Github,
  Sun,
  Moon,
  ArrowDown,
  ChevronDown,
  Terminal,
  XCircle,
  ThumbsUp
} from "lucide-react";
import { WorkspaceFile, McpConfig, PipelineState } from "./types";
import FileExplorer from "./components/FileExplorer";
import McpConfigPanel from "./components/McpConfigPanel";
import PipelineVisualizer from "./components/PipelineVisualizer";
import InteractiveGate from "./components/InteractiveGate";

const diffData: Record<string, { original: string; modified: string; explanation: string }> = {
  "billing.ts": {
    original: `// Billing Service v1.0.4
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
    modified: `// Billing Service v1.0.4
const VAT_RATE = 0.20; // 20% VAT

export function calculateTotal(subtotal: number, discount: number = 0): { total: number; tax: number } {
  // Apply discount to subtotal before tax calculation
  const baseAmount = subtotal - discount;
  
  // FIXED: Apply VAT only once to the discounted base
  const total = baseAmount * (1 + VAT_RATE);
  const tax = baseAmount * VAT_RATE;
  
  return { total, tax };
}`,
    explanation: "Corrected tax logic to apply discount to subtotal before VAT is computed, eliminating double taxation."
  },
  "auth.ts": {
    original: `// Authentication Module
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
    modified: `// Authentication Module
interface Session {
  token: string;
  expiresAt: number; // timestamp
}

export function isSessionValid(session: Session | null): boolean {
  if (!session) {
    return false;
  }
  
  // FIXED: Session is invalid if expiresAt is in the past
  if (session.expiresAt < Date.now()) {
    return false; 
  }
  
  return true;
}`,
    explanation: "Corrected session validation logic to invalidate expired sessions instead of active ones."
  },
  "db.ts": {
    original: `// Database Query Engine
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
    modified: `// Database Query Engine
interface DBConnection {
  query: (sql: string, params?: any[]) => Promise<any[]>;
}

export async function getUserById(db: DBConnection, userId: string): Promise<any> {
  // FIXED: Prevent SQL injection using parameterized query
  const results = await db.query('SELECT * FROM users WHERE id = ? AND deleted = 0', [userId]);
  return results[0] || null;
}`,
    explanation: "Mitigated SQL injection vulnerability by rewriting raw string concatenation into a parameterized query."
  }
};

const diff6Lines: Record<string, { original: string[]; modified: string[] }> = {
  "billing.ts": {
    original: [
      "  // Apply discount to subtotal with tax, then apply VAT rate again",
      "  // BUG: This causes double taxation on subtotal!",
      "  const total = (subtotalWithTax - discount) * (1 + VAT_RATE);",
      "  const tax = total * VAT_RATE;",
      "  ",
      "  return { total, tax };"
    ],
    modified: [
      "  // Apply discount to subtotal before tax calculation",
      "  const baseAmount = subtotal - discount;",
      "  ",
      "  // FIXED: Apply VAT only once to the discounted base",
      "  const total = baseAmount * (1 + VAT_RATE);",
      "  const tax = baseAmount * VAT_RATE;"
    ]
  },
  "auth.ts": {
    original: [
      "  // BUG: Logical error in expiration check!",
      "  // It checks if expiration is in the future and returns false, invalidating active sessions.",
      "  if (session.expiresAt > Date.now()) {",
      "    return false; ",
      "  }",
      "  return true;"
    ],
    modified: [
      "  // FIXED: Session is invalid if expiresAt is in the past",
      "  if (session.expiresAt < Date.now()) {",
      "    return false; ",
      "  }",
      "  ",
      "  return true;"
    ]
  },
  "db.ts": {
    original: [
      "  // BUG: SQL injection vulnerability! User input is concatenated directly.",
      "  // It should use parameterized queries: db.query('SELECT * FROM users WHERE id = ?', [userId])",
      "  const queryStr = `SELECT * FROM users WHERE id = '${userId}' AND deleted = 0`;",
      "  const results = await db.query(queryStr);",
      "  ",
      "  return results[0] || null;"
    ],
    modified: [
      "  // FIXED: Prevent SQL injection using parameterized query",
      "  const results = await db.query('SELECT * FROM users WHERE id = ? AND deleted = 0', [userId]);",
      "  ",
      "  return results[0] || null;",
      "  ",
      "  "
    ]
  }
};

export default function App() {
  // Application State
  const [theme, setTheme] = useState<"dark" | "light" >(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });
  const [files, setFiles] = useState<{ [filename: string]: string }>({});
  const [selectedFile, setSelectedFile] = useState<string>("billing.ts");
  const [mcpConfigs, setMcpConfigs] = useState<McpConfig[]>([]);
  const [aiProvider, setAiProvider] = useState("OpenAI");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiMounted, setAiMounted] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);

  // Form states
  const [bugDescription, setBugDescription] = useState("");
  const [issueLink, setIssueLink] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Timeouts ref for simulator
  const timeoutRefs = React.useRef<any[]>([]);
  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  };

  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);

  // Loading/UX states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"workspace" | "mcp">("workspace");

  // Terminal Auto-scroll ref
  const logsContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [pipeline?.logs]);

  // Sync theme with document class list
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Load initial data on mount
  useEffect(() => {
    fetchWorkspace();
    fetchMcpConfigs();
    fetchPipeline();
  }, []);

  // API Call helpers
  const fetchWorkspace = async () => {
    try {
      const res = await fetch("/api/workspace");
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (err) {
      console.error("Failed to load workspace files:", err);
    }
  };

  const fetchMcpConfigs = async () => {
    try {
      const res = await fetch("/api/mcp");
      const data = await res.json();
      if (data.configs) {
        setMcpConfigs(data.configs);
      }
    } catch (err) {
      console.error("Failed to load MCP configurations:", err);
    }
  };

  const fetchPipeline = async () => {
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      if (data.pipeline) {
        setPipeline(data.pipeline);
      }
    } catch (err) {
      console.error("Failed to load active pipeline state:", err);
    }
  };

  // Preset Bugs selectors
  const loadPreset = (preset: { bug: string; link: string; file: string }) => {
    setBugDescription(preset.bug);
    setIssueLink(preset.link);
    setSelectedFile(preset.file);
  };

  const presets = [
    {
      name: "Tax Miscalculation",
      file: "billing.ts",
      bug: "Fix the double taxation calculation in billing.ts. The total tax is computed on a subtotal already containing VAT, which applies tax twice.",
      link: "https://github.com/scrawn/app/issues/402",
    },
    {
      name: "Token Invalidation",
      file: "auth.ts",
      bug: "Correct the logic check inside isSessionValid in auth.ts. Valid active tokens are being flagged as invalid when checked.",
      link: "https://github.com/scrawn/app/issues/109",
    },
    {
      name: "SQL Injection Leak",
      file: "db.ts",
      bug: "Refactor user lookup in db.ts to prevent SQL injection. Escape inputs or rewrite user lookup to use parametrized query calls.",
      link: "https://github.com/scrawn/app/issues/882",
    },
  ];

  // Actions
  const handleResetWorkspace = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/workspace/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (err: any) {
      setErrorMessage("Failed to reset virtual workspace files.");
    } finally {
      setIsLoading(false);
    }
  };

  // MCP management
  const handleToggleMcp = async (id: string) => {
    try {
      const res = await fetch(`/api/mcp/${id}/toggle`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMcpConfigs(data.configs);
      }
    } catch (err) {
      console.error("Failed to toggle MCP status", err);
    }
  };

  const handleAddMcp = async (config: Omit<McpConfig, "id" | "status">) => {
    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setMcpConfigs(data.configs);
      }
    } catch (err) {
      console.error("Failed to add MCP server config", err);
    }
  };

  const handleDeleteMcp = async (id: string) => {
    try {
      const res = await fetch(`/api/mcp/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMcpConfigs(data.configs);
      }
    } catch (err) {
      console.error("Failed to delete MCP config", err);
    }
  };

  // Pipeline management
  const handleStartPipeline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugDescription.trim()) {
      setValidationError("⚠ Bug description is required.");
      return;
    }
    setValidationError(null);
    setIsLoading(true);
    setErrorMessage(null);
    clearAllTimeouts();

    const startTime = new Date();

    // STEP 1 (immediate):
    // - Set ARCHITECT node status to IN_PROGRESS
    // - Add pulsing yellow dot animation to ARCHITECT node
    // - ARCHITECT status message: "Decomposing task graph..."
    // - Append to Pipeline Execution Log
    const initialPipeline: PipelineState = {
      bugDescription,
      issueLink: issueLink || "",
      selectedFile,
      tasks: [
        {
          id: "task-1",
          label: "Task Decomposition",
          role: "Architect",
          status: "in_progress",
          description: "Decompose bug description into structured task graph.",
        },
        {
          id: "task-2",
          label: "Code Remediation",
          role: "Executor",
          status: "pending",
          description: "Fix workspace anomalies and apply code patches.",
        },
        {
          id: "task-3",
          label: "Security Audit",
          role: "Auditor",
          status: "pending",
          description: "Verify code patch safety and scan for exploits.",
        }
      ],
      activeTaskId: "task-1",
      proposedCode: null,
      proposedDiff: null,
      auditReport: null,
      logs: [
        {
          tag: "ARCHITECT",
          timestamp: startTime.toISOString(),
          message: "— Analyzing input..."
        },
        {
          tag: "ARCHITECT",
          timestamp: new Date(startTime.getTime() + 10).toISOString(),
          message: `— Task graph generated: { "tasks": [
    {"id":1,"action":"locate_function","target":"${selectedFile}"},
    {"id":2,"action":"rewrite_logic","target":"${selectedFile}"},
    {"id":3,"action":"run_audit","target":"${selectedFile}"}
  ]}`
        }
      ]
    };

    setPipeline(initialPipeline);
    setIsLoading(false);

    // STEP 2 (after 2500ms):
    // - Set ARCHITECT to COMPLETED (green badge)
    // - Set EXECUTOR to IN_PROGRESS (pulsing yellow)
    // - EXECUTOR status message: "Reading workspace file..."
    // - Append to log: > [EXECUTOR] — MCP read: <selected file>
    // - After another 1500ms: PAUSE and show HitL modal
    const t2 = setTimeout(() => {
      setPipeline(prev => {
        if (!prev) return null;
        return {
          ...prev,
          activeTaskId: "task-2",
          tasks: prev.tasks.map(t => {
            if (t.id === "task-1") return { ...t, status: "completed" };
            if (t.id === "task-2") return { ...t, status: "in_progress" };
            return t;
          }),
          logs: [
            ...(prev.logs || []),
            {
              tag: "EXECUTOR",
              timestamp: new Date().toISOString(),
              message: `— MCP read: ${selectedFile}`
            }
          ]
        };
      });

      const t3 = setTimeout(() => {
        setPipeline(prev => {
          if (!prev) return null;
          const fileDiff = diffData[selectedFile] || diffData["billing.ts"];
          return {
            ...prev,
            proposedDiff: fileDiff,
            tasks: prev.tasks.map(t => {
              if (t.id === "task-2") return { ...t, status: "paused_for_approval" };
              return t;
            })
          };
        });
      }, 1500);

      timeoutRefs.current.push(t3);
    }, 2500);

    timeoutRefs.current.push(t2);
  };

  const handleExecuteExecutor = async () => {
    // Legacy endpoint fallback - not needed in current flow
  };

  const handleApproveGate = () => {
    setIsLoading(true);
    setErrorMessage(null);
    clearAllTimeouts();

    const fileDiff = diffData[selectedFile] || diffData["billing.ts"];

    // Update workspace file in client editor state
    setFiles(prev => ({
      ...prev,
      [selectedFile]: fileDiff.modified
    }));

    // Save to virtual server files
    fetch("/api/workspace/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: selectedFile, content: fileDiff.modified })
    }).catch(err => console.error("Failed to save workspace file:", err));

    // STEP 3:
    // - Close modal
    // - Append to log: > [EXECUTOR] — Patch written. File saved.
    // - Set EXECUTOR to COMPLETED (green)
    // - Set AUDITOR to IN_PROGRESS (pulsing yellow)
    // - AUDITOR status message: "Scanning for vulnerabilities..."
    // - Append to log: > [AUDITOR] — Running security checks...
    setPipeline(prev => {
      if (!prev) return null;
      return {
        ...prev,
        proposedDiff: null, // Close modal
        activeTaskId: "task-3",
        tasks: prev.tasks.map(t => {
          if (t.id === "task-2") return { ...t, status: "completed" };
          if (t.id === "task-3") return { ...t, status: "in_progress" };
          return t;
        }),
        logs: [
          ...(prev.logs || []),
          {
            tag: "EXECUTOR",
            timestamp: new Date().toISOString(),
            message: "— Patch written. File saved."
          },
          {
            tag: "AUDITOR",
            timestamp: new Date().toISOString(),
            message: "— Running security checks..."
          }
        ]
      };
    });

    setIsLoading(false);

    // STEP 4 (after 2000ms):
    // - Set AUDITOR to COMPLETED (green)
    // - Append to log: > [AUDITOR] — VERDICT: PASS — No critical issues.
    // - Append to log: > [SYSTEM] — Pipeline complete. Task graph resolved.
    // - Update the file tab badge from "BUGGY" to "PATCHED" (green badge) for the selected file only
    const tAuditor = setTimeout(() => {
      setPipeline(prev => {
        if (!prev) return null;
        return {
          ...prev,
          activeTaskId: null,
          tasks: prev.tasks.map(t => {
            if (t.id === "task-3") return { ...t, status: "completed" };
            return t;
          }),
          logs: [
            ...(prev.logs || []),
            {
              tag: "AUDITOR",
              timestamp: new Date().toISOString(),
              message: "— VERDICT: PASS — No critical issues."
            },
            {
              tag: "SYSTEM",
              timestamp: new Date().toISOString(),
              message: "— Pipeline complete. Task graph resolved."
            }
          ],
          auditReport: {
            approved: true,
            report: "VERDICT: PASS — No critical issues detected.\nAll security checks passed successfully.",
            score: 100
          }
        };
      });
    }, 2000);

    timeoutRefs.current.push(tAuditor);
  };

  const handleRejectGate = async (feedback: string) => {
    // Legacy endpoint fallback
  };

  const handleRejectAndAbort = () => {
    setIsLoading(true);
    setErrorMessage(null);
    clearAllTimeouts();

    // If HitL REJECT is clicked:
    // - Close modal
    // - Set EXECUTOR to FAILED (red badge)
    // - EXECUTOR status message: "Aborted by user."
    // - Append to log: > [SYSTEM] — Pipeline aborted. User rejected patch.
    // - Stop pipeline. AUDITOR stays PENDING.
    setPipeline(prev => {
      if (!prev) return null;
      return {
        ...prev,
        activeTaskId: null,
        proposedDiff: null, // Close modal
        tasks: prev.tasks.map(t => {
          if (t.id === "task-2") {
            return {
              ...t,
              status: "failed"
            };
          }
          return t;
        }),
        logs: [
          ...(prev.logs || []),
          {
            tag: "SYSTEM",
            timestamp: new Date().toISOString(),
            message: "— Pipeline aborted. User rejected patch."
          }
        ]
      };
    });

    setIsLoading(false);
  };

  const handleExecuteAuditor = async () => {
    // Legacy endpoint fallback
  };

  const handleResetPipeline = async () => {
    setErrorMessage(null);
    clearAllTimeouts();
    setPipeline(null);
    setBugDescription("");
    setIssueLink("");
    setValidationError(null);
    try {
      const res = await fetch("/api/pipeline/reset", { method: "POST" });
      await fetchWorkspace(); // Reset workspace file contents
    } catch (err) {
      console.error("Failed to reset pipeline state", err);
    }
  };

  // Pipeline status computation helpers
  const getArchitectStatus = () => {
    if (!pipeline) return "PENDING";
    const task = pipeline.tasks.find(t => t.role === "Architect");
    if (!task) return "PENDING";
    if (task.status === "completed") return "COMPLETED";
    if (task.status === "failed") return "FAILED";
    if (task.status === "in_progress") return "IN_PROGRESS";
    return "PENDING";
  };

  const getExecutorStatus = () => {
    if (!pipeline) return "PENDING";
    const task = pipeline.tasks.find(t => t.role === "Executor");
    if (!task) return "PENDING";
    if (task.status === "completed") return "COMPLETED";
    if (task.status === "failed") return "FAILED";
    if (task.status === "in_progress" || task.status === "paused_for_approval") return "IN_PROGRESS";
    return "PENDING";
  };

  const getAuditorStatus = () => {
    if (!pipeline) return "PENDING";
    const task = pipeline.tasks.find(t => t.role === "Auditor");
    if (!task) return "PENDING";
    if (task.status === "completed") return "COMPLETED";
    if (task.status === "failed") return "FAILED";
    if (task.status === "in_progress") return "IN_PROGRESS";
    return "PENDING";
  };

  const getArchitectLiveMsg = () => {
    if (!pipeline) return "Awaiting bug description...";
    const task = pipeline.tasks.find(t => t.role === "Architect");
    if (!task) return "Awaiting bug description...";
    switch (task.status) {
      case "in_progress": return "Decomposing task graph...";
      case "completed": return "Task graph decomposed successfully.";
      case "failed": return "Decomposition failed.";
      default: return "Awaiting bug description...";
    }
  };

  const getExecutorLiveMsg = () => {
    if (!pipeline) return "Awaiting task decomposition...";
    const task = pipeline.tasks.find(t => t.role === "Executor");
    if (!task) return "Awaiting task decomposition...";
    switch (task.status) {
      case "pending": return "Awaiting task decomposition...";
      case "in_progress": return "Reading workspace file...";
      case "paused_for_approval": return "Gated: Proposed patch is awaiting developer approval.";
      case "completed": return `Patch for ${pipeline.selectedFile} written & verified.`;
      case "failed": return "Aborted by user.";
      default: return "Awaiting task decomposition...";
    }
  };

  const getAuditorLiveMsg = () => {
    if (!pipeline) return "Awaiting code patch...";
    const task = pipeline.tasks.find(t => t.role === "Auditor");
    if (!task) return "Awaiting code patch...";
    switch (task.status) {
      case "pending": return "Awaiting code patch...";
      case "in_progress": return "Scanning for vulnerabilities...";
      case "completed": return "VERDICT: PASS — No critical issues.";
      case "failed": return "Security audit failed.";
      default: return "Awaiting code patch...";
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-main font-sans selection:bg-accent selection:text-black pb-20 relative transition-colors duration-200">
      {/* Decorative dot pattern overlay */}
      <div className="absolute inset-0 dot-pattern opacity-[0.25] pointer-events-none" />

      {/* HEADER SECTION - Immersive Cyber Navbar */}
      <header className="bg-bg/90 border-b border-border-custom sticky top-0 z-50 backdrop-blur-md transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-accent/10 border border-border-custom p-1.5 shadow-[0_0_10px_var(--accent-dim)] rounded-xl">
              <Flame className="w-6 h-6 text-accent fill-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-sans uppercase tracking-tight text-text-main">
                PTG Orchestrator
              </h1>
              <p className="text-[10px] font-mono tracking-widest text-accent uppercase font-bold">
                "Pluggable Task Graph" Orchestrator
              </p>
            </div>
          </div>

          {/* Quick links & Status */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              id="btn-theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="bg-card hover:bg-border-custom text-text-main border border-border-custom p-2 rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center neo-btn-press"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-accent" />
              ) : (
                <Moon className="w-4 h-4 text-accent" />
              )}
            </button>

            <span className="hidden md:inline-block text-xs font-mono font-bold text-text-dim bg-card/50 border border-border-custom px-2.5 py-1 rounded-lg">
              MODEL: <span className="text-accent">READY</span>
            </span>
            <span className="hidden md:inline-block text-xs font-mono font-bold text-success bg-card/50 border border-border-custom px-2.5 py-1 rounded-lg">
              MCP CONNECTOR: STATUS_OK
            </span>
            <a
              href="https://github.com/Arunhere1907"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card hover:bg-border-custom text-text-main border border-border-custom p-2 rounded-xl shadow-sm neo-btn-press"
              title="Visit Developer GitHub Profile"
            >
              <Github className="w-4 h-4" />
            </a>
            <button
              id="btn-nav-reset"
              onClick={handleResetWorkspace}
              className="bg-card hover:bg-border-custom text-text-dim hover:text-text-main font-bold text-xs py-2 px-3 border border-border-custom rounded-xl shadow-sm neo-btn-press uppercase tracking-wider cursor-pointer"
            >
              Reset Files
            </button>
          </div>
        </div>
      </header>

      {/* Yellow Warning Stripe ticker */}
      <div className="bg-card border-b border-border-custom py-2.5 text-accent overflow-hidden flex select-none text-[10px] font-mono font-bold tracking-widest uppercase">
        <div className="whitespace-nowrap flex gap-8 shrink-0 animate-marquee">
          <span>/// MULTI-AGENT AUTONOMOUS DEPLOYMENT PIPELINE</span>
          <span>/// ARCHITECT TASK DECOMPOSITION ENGINE</span>
          <span>/// EXECUTOR PATCH INTEGRATION WITH PLUGGABLE MCP</span>
          <span>/// AUDITOR QUALITY & SECURITY VERIFIER</span>
          <span>/// HUMAN-IN-THE-LOOP SAFETY GATE ACTIVATED</span>
        </div>
        <div className="whitespace-nowrap flex gap-8 shrink-0 animate-marquee" aria-hidden="true">
          <span>/// MULTI-AGENT AUTONOMOUS DEPLOYMENT PIPELINE</span>
          <span>/// ARCHITECT TASK DECOMPOSITION ENGINE</span>
          <span>/// EXECUTOR PATCH INTEGRATION WITH PLUGGABLE MCP</span>
          <span>/// AUDITOR QUALITY & SECURITY VERIFIER</span>
          <span>/// HUMAN-IN-THE-LOOP SAFETY GATE ACTIVATED</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 space-y-8 relative z-10">
        {/* Error Notification Alert */}
        {errorMessage && (
          <div id="error-banner" className="bg-red-950/40 text-red-200 border border-red-500/30 p-4 rounded-xl flex gap-3 items-start backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <AlertOctagon className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <p className="font-bold uppercase text-xs font-mono text-red-400">CRITICAL RUNTIME WARNING</p>
              <p className="text-xs font-mono mt-1">{errorMessage}</p>
            </div>
            <button
              id="btn-clear-error"
              onClick={() => setErrorMessage(null)}
              className="ml-auto font-mono text-xs font-bold text-red-400 hover:text-white underline uppercase focus:outline-none cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TOP LEVEL INTRO HERO BENTO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Bug submission / Presets Form - 7 columns */}
          <div className="lg:col-span-7 bg-card border border-border-custom p-6 rounded-2xl shadow-sm space-y-6 transition-colors duration-200">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent bg-accent/10 px-2.5 py-1 rounded-md border border-accent/20">
                ORCHESTRATOR LAUNCHER
              </span>
              <h2 className="text-3xl font-black font-sans uppercase tracking-tight text-text-main mt-3">
                Bug-Fixing Orchestrator
              </h2>
              <p className="text-xs font-mono text-text-dim mt-1.5">
                Point PTG to a bug description or GitHub Issue link. Our pipeline decomposes, fixes, and audits it using pluggable Local MCP access.
              </p>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <p className="text-xs font-mono font-bold text-text-dim uppercase tracking-wider">LOAD DEMO WORKSPACE PRESETS:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {presets.map((preset, idx) => (
                  <button
                    id={`btn-preset-${idx}`}
                    key={preset.name}
                    onClick={() => loadPreset(preset)}
                    className="p-3 text-left bg-bg hover:bg-accent/5 border border-border-custom hover:border-accent transition-all rounded-xl flex flex-col justify-between h-[95px] select-none text-text-main cursor-pointer"
                  >
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">{preset.name}</span>
                    <span className="text-[10px] font-mono text-text-dim truncate w-full">{preset.file}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Form */}
            <form id="launch-pipeline-form" onSubmit={handleStartPipeline} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold uppercase text-text-dim tracking-wider">
                  Bug / Issue Description <span className="text-accent">*</span>
                </label>
                <textarea
                  id="bug-description-textarea"
                  value={bugDescription}
                  onChange={(e) => {
                    setBugDescription(e.target.value);
                    if (e.target.value.trim()) {
                      setValidationError(null);
                    }
                  }}
                  placeholder="Describe the faulty behavior or logic anomaly (e.g. 'Fix SQL injection in db.ts by using parameterized query')..."
                  className="w-full bg-bg border border-border-custom focus:border-accent rounded-xl p-3 text-xs font-mono focus:outline-none min-h-[110px] text-text-main focus:ring-1 focus:ring-accent/30 transition-all"
                />
                {validationError && (
                  <p id="bug-description-error" className="text-red-500 font-mono text-xs mt-1">
                    {validationError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold uppercase text-text-dim tracking-wider">
                    GitHub Issue URL (Optional)
                  </label>
                  <input
                    id="issue-url-input"
                    type="url"
                    value={issueLink}
                    onChange={(e) => setIssueLink(e.target.value)}
                    placeholder="https://github.com/your-org/repo/issues/42"
                    className="w-full bg-bg border border-border-custom focus:border-accent rounded-xl p-2.5 text-xs font-mono focus:outline-none text-text-main focus:ring-1 focus:ring-accent/30 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold uppercase text-text-dim tracking-wider">
                    Target Workspace Module
                  </label>
                  <select
                    id="target-file-select"
                    value={selectedFile}
                    onChange={(e) => {
                      setSelectedFile(e.target.value);
                    }}
                    className="w-full bg-bg border border-border-custom focus:border-accent rounded-xl p-2.5 text-xs font-mono focus:outline-none h-[42px] text-text-main focus:ring-1 focus:ring-accent/30 transition-all animate-none"
                  >
                    <option value="billing.ts">billing.ts (Subtotal tax bugs)</option>
                    <option value="auth.ts">auth.ts (Auth token expiration)</option>
                    <option value="db.ts">db.ts (SQL Inject vulnerable code)</option>
                  </select>
                </div>
              </div>

              <button
                id="btn-submit-pipeline"
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent hover:opacity-90 disabled:bg-card/55 disabled:text-text-dim text-black font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_var(--accent-dim)] hover:shadow-[0_0_25px_var(--accent-dim)]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Decomposing Tasks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Decompose & Generate Pipeline</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick stats & features summary - 5 columns */}
          <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
            {/* Live Pipeline State Panel */}
            <div className="bg-card border border-border-custom p-6 rounded-2xl shadow-sm space-y-4 transition-colors duration-200">
              <div className="border-b border-border-custom pb-2 flex justify-between items-center">
                <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-text-main">
                  Live Pipeline State
                </h3>
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--accent)]" />
              </div>

              <div className="space-y-3 relative">
                {/* ARCHITECT NODE */}
                {(() => {
                  const status = getArchitectStatus();
                  const liveMsg = getArchitectLiveMsg();
                  const badgeStyles = {
                    PENDING: "bg-neutral-800 text-neutral-400 border border-neutral-700",
                    IN_PROGRESS: "bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse",
                    COMPLETED: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
                    FAILED: "bg-red-500/15 text-red-500 border border-red-500/30"
                  }[status];

                  return (
                    <div className="bg-bg/40 border border-border-custom rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg border shrink-0 ${
                          status === "COMPLETED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          status === "IN_PROGRESS" ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse" :
                          status === "FAILED" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                          "bg-card border-border-custom text-text-dim"
                        }`}>
                          <Code2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-text-main uppercase tracking-wider">
                            ARCHITECT
                          </h4>
                          <p className="text-[10px] font-mono text-text-dim truncate mt-0.5" title={liveMsg}>
                            {liveMsg}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${badgeStyles}`}>
                        {status === "IN_PROGRESS" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                        {status}
                      </span>
                    </div>
                  );
                })()}

                {/* DIRECTIONAL ARROW 1 */}
                <div className="flex justify-center -my-1">
                  <span className="text-accent font-mono font-bold text-[10px] animate-pulse">↓</span>
                </div>

                {/* EXECUTOR NODE */}
                {(() => {
                  const status = getExecutorStatus();
                  const liveMsg = getExecutorLiveMsg();
                  const badgeStyles = {
                    PENDING: "bg-neutral-800 text-neutral-400 border border-neutral-700",
                    IN_PROGRESS: "bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse",
                    COMPLETED: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
                    FAILED: "bg-red-500/15 text-red-500 border border-red-500/30"
                  }[status];

                  return (
                    <div className="bg-bg/40 border border-border-custom rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg border shrink-0 ${
                          status === "COMPLETED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          status === "IN_PROGRESS" ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse" :
                          status === "FAILED" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                          "bg-card border-border-custom text-text-dim"
                        }`}>
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-text-main uppercase tracking-wider">
                            EXECUTOR
                          </h4>
                          <p className="text-[10px] font-mono text-text-dim truncate mt-0.5" title={liveMsg}>
                            {liveMsg}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${badgeStyles}`}>
                        {status === "IN_PROGRESS" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                        {status}
                      </span>
                    </div>
                  );
                })()}

                {/* DIRECTIONAL ARROW 2 */}
                <div className="flex justify-center -my-1">
                  <span className="text-accent font-mono font-bold text-[10px] animate-pulse">↓</span>
                </div>

                {/* AUDITOR NODE */}
                {(() => {
                  const status = getAuditorStatus();
                  const liveMsg = getAuditorLiveMsg();
                  const badgeStyles = {
                    PENDING: "bg-neutral-800 text-neutral-400 border border-neutral-700",
                    IN_PROGRESS: "bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse",
                    COMPLETED: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
                    FAILED: "bg-red-500/15 text-red-500 border border-red-500/30"
                  }[status];

                  return (
                    <div className="bg-bg/40 border border-border-custom rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg border shrink-0 ${
                          status === "COMPLETED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          status === "IN_PROGRESS" ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse" :
                          status === "FAILED" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                          "bg-card border-border-custom text-text-dim"
                        }`}>
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-text-main uppercase tracking-wider">
                            AUDITOR
                          </h4>
                          <p className="text-[10px] font-mono text-text-dim truncate mt-0.5" title={liveMsg}>
                            {liveMsg}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${badgeStyles}`}>
                        {status === "IN_PROGRESS" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                        {status}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Interactive Tab switches for Workspace vs MCP configs */}
            <div className="bg-card border border-border-custom p-4 rounded-2xl shadow-sm">
              <p className="text-xs font-mono font-bold text-text-dim uppercase mb-2.5 tracking-wider">SYSTEM UTILITIES PANEL:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="tab-toggle-workspace"
                  onClick={() => setActiveTab("workspace")}
                  className={`py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 focus:outline-none transition-all cursor-pointer ${
                    activeTab === "workspace"
                      ? "bg-accent text-black shadow-[0_0_15px_var(--accent-dim)]"
                      : "bg-bg border border-border-custom text-text-dim hover:text-text-main hover:border-text-dim"
                  }`}
                >
                  <FileCode className="w-4 h-4" />
                  Workspace Explorer
                </button>
                <button
                  id="tab-toggle-mcp"
                  onClick={() => setActiveTab("mcp")}
                  className={`py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 focus:outline-none transition-all cursor-pointer ${
                    activeTab === "mcp"
                      ? "bg-accent text-black shadow-[0_0_15px_var(--accent-dim)]"
                      : "bg-bg border border-border-custom text-text-dim hover:text-text-main hover:border-text-dim"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  MCP Configuration
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PIPELINE EXECUTION HUB */}
        {pipeline ? (
          <div className="space-y-8">
            {/* Visual Agent Graph state */}
            <PipelineVisualizer
              tasks={pipeline.tasks}
              activeTaskId={pipeline.activeTaskId}
              targetFile={pipeline.selectedFile}
            />

            {/* Current Active Task execution panel */}
            <div className="bg-card border border-border-custom p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-border-custom pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_var(--accent)]" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
                    PIPELINE CONTROL ROOM
                  </span>
                </div>
                <button
                  id="btn-cancel-pipeline"
                  onClick={handleResetPipeline}
                  className="text-xs font-mono font-bold text-text-dim hover:text-accent transition-colors hover:underline uppercase cursor-pointer"
                >
                  Clear Orchestrator Thread
                </button>
              </div>

              {/* Logical Executor Gate: if task is in progress, paused, or pending */}
              {pipeline.activeTaskId === "task-2" && (
                <div className="space-y-4">
                  {pipeline.tasks.find(t => t.id === "task-2")?.status === "pending" && (
                    <div className="bg-bg border border-border-custom p-6 text-center space-y-4 rounded-xl">
                      <Cpu className="w-10 h-10 text-text-dim mx-auto animate-pulse" />
                      <div>
                        <h4 className="font-bold text-lg text-text-main uppercase">Executor Agent Queue is Idle</h4>
                        <p className="text-xs font-mono text-text-dim max-w-lg mx-auto mt-1">
                          The Architect task decomposition finished. Trigger Executor agent to parse target module <strong className="text-text-main">{pipeline.selectedFile}</strong> and resolve the bug.
                        </p>
                      </div>
                      <button
                        id="btn-trigger-executor"
                        onClick={handleExecuteExecutor}
                        className="bg-accent hover:opacity-90 text-black font-bold py-2.5 px-6 rounded-xl text-xs uppercase cursor-pointer transition-all shadow-[0_0_15px_var(--accent-dim)]"
                      >
                        Launch Executor Agent
                      </button>
                    </div>
                  )}

                  {pipeline.tasks.find(t => t.id === "task-2")?.status === "in_progress" && (
                    <div className="bg-bg border border-border-custom p-8 text-center space-y-4 rounded-xl">
                      <RefreshCw className="w-10 h-10 text-accent animate-spin mx-auto" />
                      <div>
                        <h4 className="font-bold text-lg text-text-main uppercase">Executor Agent is Writing Patches...</h4>
                        <p className="text-xs font-mono text-text-dim max-w-md mx-auto mt-1">
                          Analyzing fault vectors in {pipeline.selectedFile}, verifying against local filesystem MCP scopes, and compiling optimal fixes.
                        </p>
                      </div>
                    </div>
                  )}

                  {pipeline.tasks.find(t => t.id === "task-2")?.status === "paused_for_approval" && pipeline.proposedDiff && (
                    <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-xl text-center space-y-4">
                      <AlertOctagon className="w-10 h-10 text-amber-500 mx-auto animate-pulse" />
                      <div>
                        <h4 className="font-bold text-base text-text-main uppercase">Pipeline Paused for Human Approval</h4>
                        <p className="text-xs font-mono text-text-dim max-w-lg mx-auto mt-1">
                          A detailed modal overlay is active on your screen. Please review the proposed split-diff changes for <strong className="text-text-main">{pipeline.selectedFile}</strong> and select APPROVE or REJECT to resume the pipeline.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {pipeline.activeTaskId === "task-3" && (
                <div className="space-y-4">
                  {pipeline.tasks.find(t => t.id === "task-3")?.status === "pending" && (
                    <div className="bg-bg border border-border-custom p-6 text-center space-y-4 rounded-xl">
                      <ShieldCheck className="w-10 h-10 text-text-dim mx-auto animate-pulse" />
                      <div>
                        <h4 className="font-bold text-lg text-text-main uppercase">Gated Security Check Ready</h4>
                        <p className="text-xs font-mono text-text-dim max-w-lg mx-auto mt-1">
                          The Executor patch is saved inside our workspace. Now, run Agent 3 (The Auditor) to analyze the differences for compliance, clean architecture, and critical security leaks.
                        </p>
                      </div>
                      <button
                        id="btn-trigger-auditor"
                        onClick={handleExecuteAuditor}
                        className="bg-[#10b981] hover:bg-[#059669] text-black font-bold py-2.5 px-6 rounded-xl text-xs uppercase cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      >
                        Launch Security Auditor
                      </button>
                    </div>
                  )}

                  {pipeline.tasks.find(t => t.id === "task-3")?.status === "in_progress" && (
                    <div className="bg-bg border border-border-custom p-8 text-center space-y-4 rounded-xl">
                      <RefreshCw className="w-10 h-10 text-[#10b981] animate-spin mx-auto" />
                      <div>
                        <h4 className="font-bold text-lg text-text-main uppercase">Auditor Agent performing Security Audit...</h4>
                        <p className="text-xs font-mono text-text-dim max-w-md mx-auto mt-1">
                          Scanning patched lines for SQL Injection vulnerabilities, type-safety parameters, and architectural compliance.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Complete Pipeline status */}
              {!pipeline.activeTaskId && pipeline.auditReport && (
                <div className="bg-[#10b981]/5 border border-[#10b981]/30 p-6 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.08)] space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#10b981]/20 pb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-10 h-10 text-[#10b981]" />
                      <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-2 py-0.5 rounded">
                          PIPELINE TERMINATION SUCCESSFUL
                        </span>
                        <h3 className="text-2xl font-bold font-sans uppercase tracking-tight text-text-main mt-1.5">
                          Remediation Completed!
                        </h3>
                      </div>
                    </div>
                    {/* Security Score gauge */}
                    <div className="bg-bg border border-border-custom p-3 text-center min-w-[120px] rounded-xl shadow-sm">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-dim">
                        AUDIT SCORE
                      </p>
                      <p className="text-3xl font-black font-mono text-[#10b981] drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        {pipeline.auditReport.score}/100
                      </p>
                    </div>
                  </div>

                  {/* Auditor detailed feedback report */}
                  <div className="space-y-2">
                    <h4 className="font-mono text-xs font-bold uppercase text-text-main tracking-wider">
                      COMPLIANCE & THREAT VERIFICATION REPORT:
                    </h4>
                    <div className="bg-bg border border-border-custom p-4 font-mono text-xs text-text-main rounded-xl leading-relaxed max-h-[250px] overflow-y-auto whitespace-pre-wrap">
                      {pipeline.auditReport.report}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-[#10b981]/20">
                    <p className="text-xs font-mono text-[#10b981]">
                      <strong>WORKSPACE HEALTHY:</strong> File <strong className="text-text-main">{pipeline.selectedFile}</strong> was successfully overwritten and certified compile-clean.
                    </p>
                    <button
                      id="btn-restart-complete"
                      onClick={handleResetPipeline}
                      className="bg-[#10b981] text-black hover:bg-[#059669] font-bold py-2.5 px-6 rounded-xl text-xs uppercase cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0"
                    >
                      Start Next Remediation Pipeline
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty / idle state: guide the developer */
          <div className="bg-card border border-border-custom p-8 rounded-2xl shadow-sm text-center space-y-4">
            <Sparkles className="w-12 h-12 text-accent mx-auto fill-accent/10 animate-pulse" />
            <div>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-text-main font-sans">
                Awaiting Pipeline Trigger
              </h3>
              <p className="text-xs font-mono text-text-dim max-w-xl mx-auto mt-2 leading-relaxed">
                Choose a demo preset above or write a custom bug description. PTG will spawn Agent 1 to decompose the prompt into an active, gated development pipeline.
              </p>
            </div>
          </div>
        )}

        {/* WORKSPACE EXPLORER & CONFIG TABS (BENTO LAYOUT) */}
        <div className="grid grid-cols-1 gap-8">
          {activeTab === "workspace" ? (
            <FileExplorer
              files={files}
              selectedFile={selectedFile}
              onSelectFile={(filename) => setSelectedFile(filename)}
              onResetWorkspace={handleResetWorkspace}
              pipelineSelectedFile={pipeline?.selectedFile || ""}
            />
          ) : (
            <McpConfigPanel
              configs={mcpConfigs}
              onToggle={handleToggleMcp}
              onAdd={handleAddMcp}
              onDelete={handleDeleteMcp}
              aiProvider={aiProvider}
              setAiProvider={setAiProvider}
              aiApiKey={aiApiKey}
              setAiApiKey={setAiApiKey}
              aiModel={aiModel}
              setAiModel={setAiModel}
              aiMounted={aiMounted}
              setAiMounted={setAiMounted}
            />
          )}
        </div>

        {/* PIPELINE EXECUTION LOG PANEL */}
        <div className="bg-card border border-border-custom p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border-custom pb-3">
            <Terminal className="w-5 h-5 text-accent" />
            <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-text-main">
              Pipeline Execution Log
            </h3>
            <span className="text-[10px] font-mono bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded border border-neutral-700 ml-auto uppercase tracking-wider">
              Terminal v1.0.0
            </span>
          </div>

          <div
            ref={logsContainerRef}
            className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 h-[250px] overflow-y-auto font-mono text-xs text-slate-300 space-y-3 shadow-inner select-text text-left"
          >
            {pipeline && pipeline.logs && pipeline.logs.length > 0 ? (
              pipeline.logs.map((log, index) => {
                const tagColors = {
                  ARCHITECT: "text-purple-400",
                  EXECUTOR: "text-amber-400",
                  AUDITOR: "text-emerald-400"
                }[log.tag] || "text-blue-400";

                return (
                  <div key={index} className="space-y-1.5 border-b border-neutral-900 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                      <span className={`${tagColors}`}>[{log.tag}]</span>
                      <span className="text-neutral-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    </div>
                    <pre className="whitespace-pre-wrap break-all leading-relaxed text-slate-300 font-mono text-[11px]">
                      {log.message}
                    </pre>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-center space-y-1 select-none">
                <Terminal className="w-8 h-8 opacity-25 animate-pulse animate-none" />
                <p className="text-xs uppercase tracking-wider">Awaiting pipeline trigger...</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* HUMAN-IN-THE-LOOP DESTRUCTIVE ACTION WARNING MODAL OVERLAY */}
      {pipeline && pipeline.tasks.find(t => t.id === "task-2")?.status === "paused_for_approval" && pipeline.proposedDiff && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-card border border-border-custom border-t-4 border-t-yellow-500 max-w-[700px] w-full rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in font-sans">
            {/* Header */}
            <div className="p-6 border-b border-border-custom bg-amber-950/10 flex items-center gap-3">
              <div className="bg-amber-500/20 p-2 border border-amber-500/30 rounded-xl text-amber-500 shrink-0">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-left">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-yellow-500 uppercase">
                  DESTRUCTIVE ACTION DETECTED
                </h2>
                <p className="text-xs font-mono text-text-dim mt-1">
                  Agent 2 (Executor) is requesting permission to overwrite <strong className="text-accent font-bold">{pipeline.selectedFile}</strong> with a patched version via MCP filesystem write.
                </p>
              </div>
            </div>

            {/* Split-pane Diff Viewer */}
            <div className="flex-1 overflow-auto p-6 bg-bg/30 min-h-[250px] space-y-2.5 text-left">
              <div className="flex justify-between items-center text-xs font-mono font-bold text-text-dim uppercase tracking-wider">
                <span>LINE COMPOSITE SPLIT-DIFFERENTIAL:</span>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500/20 border border-red-500/30 rounded" /> ORIGINAL</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/30 rounded" /> PROPOSED PATCH</span>
                </div>
              </div>

              {/* The side-by-side diff container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px] overflow-auto border border-border-custom rounded-xl p-3 bg-bg">
                {/* Left Column: Original */}
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 flex flex-col h-full overflow-auto text-left">
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-lg font-mono font-bold text-xs tracking-wider mb-2 text-center uppercase">
                    ORIGINAL
                  </div>
                  <div className="space-y-1 font-mono text-xs text-red-200/80 leading-relaxed select-text">
                    {(diff6Lines[pipeline.selectedFile]?.original || []).map((line, idx) => (
                      <div key={idx} className="whitespace-pre-wrap break-all">{line}</div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Proposed Patch */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex flex-col h-full overflow-auto text-left">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2 rounded-lg font-mono font-bold text-xs tracking-wider mb-2 text-center uppercase">
                    PROPOSED PATCH
                  </div>
                  <div className="space-y-1 font-mono text-xs text-emerald-200/80 leading-relaxed select-text">
                    {(diff6Lines[pipeline.selectedFile]?.modified || []).map((line, idx) => (
                      <div key={idx} className="whitespace-pre-wrap break-all">{line}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Footer */}
            <div className="p-6 border-t border-border-custom bg-card flex flex-col sm:flex-row gap-4 justify-end">
              <button
                id="modal-btn-reject"
                onClick={handleRejectAndAbort}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-black font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all animate-none"
              >
                <XCircle className="w-4 h-4" />
                <span>REJECT & ABORT</span>
              </button>
              <button
                id="modal-btn-approve"
                onClick={handleApproveGate}
                disabled={isLoading}
                className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all animate-none"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>APPROVE & CONTINUE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
