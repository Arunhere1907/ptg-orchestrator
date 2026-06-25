import React from "react";
import { RefreshCw, Code, Terminal, AlertCircle, FileCode } from "lucide-react";

interface FileExplorerProps {
  files: { [filename: string]: string };
  selectedFile: string;
  onSelectFile: (filename: string) => void;
  onResetWorkspace: () => void;
  pipelineSelectedFile: string;
}

export default function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
  onResetWorkspace,
  pipelineSelectedFile,
}: FileExplorerProps) {
  const getFileStatus = (filename: string) => {
    // Determine status based on whether the bug remains in the file string
    const code = files[filename] || "";
    if (filename === "billing.ts") {
      const isBuggy = code.includes("const total = (subtotalWithTax - discount) * (1 + VAT_RATE);");
      return isBuggy ? { label: "BUGGY", color: "bg-red-500/15 text-red-400 border border-red-500/25" } : { label: "PATCHED", color: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/25" };
    }
    if (filename === "auth.ts") {
      const isBuggy = code.includes("session.expiresAt > Date.now()");
      return isBuggy ? { label: "BUGGY", color: "bg-red-500/15 text-red-400 border border-red-500/25" } : { label: "PATCHED", color: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/25" };
    }
    if (filename === "db.ts") {
      const isBuggy = code.includes("const queryStr = `SELECT * FROM users WHERE id = '${userId}' AND deleted = 0`;");
      return isBuggy ? { label: "BUGGY", color: "bg-red-500/15 text-red-400 border border-red-500/25" } : { label: "PATCHED", color: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/25" };
    }
    return { label: "HEALTHY", color: "bg-card text-text-dim border border-border-custom" };
  };

  const getFileBugExplanation = (filename: string) => {
    if (filename === "billing.ts") {
      return "Subtotal taxes are miscalculated. VAT rate is applied to subtotal, then discount is deducted, then VAT is applied again on the result, causing double taxation.";
    }
    if (filename === "auth.ts") {
      return "Active session verification checks if session expiration date is in the future. If so, it invalidates the session rather than certifying it.";
    }
    if (filename === "db.ts") {
      return "Vulnerable to classical SQL injection. The ID parameter is directly interpolated into the query string without sanitization or parametrized binding.";
    }
    return "No anomalies reported.";
  };

  return (
    <div id="file-explorer" className="bg-card border border-border-custom rounded-2xl shadow-sm flex flex-col h-full overflow-hidden transition-colors duration-200">
      <div className="p-4 border-b border-border-custom flex justify-between items-center bg-card">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/15">LOCAL WORKSPACE</span>
          <h2 className="text-xl font-bold font-sans uppercase tracking-tight text-text-main mt-1">Workspace Explorer</h2>
        </div>
        <button
          id="btn-reset-workspace"
          onClick={onResetWorkspace}
          className="bg-red-950/30 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 font-bold py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 text-xs uppercase cursor-pointer transition-all"
          title="Reset files to buggy state to re-run pipeline"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
          Reset Workspace
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 border-b border-border-custom">
        {Object.keys(files).map((filename) => {
          const isSelected = selectedFile === filename;
          const status = getFileStatus(filename);
          const isPipelineFile = pipelineSelectedFile === filename;

          return (
            <button
              id={`tab-file-${filename}`}
              key={filename}
              onClick={() => onSelectFile(filename)}
              className={`p-4 text-left flex items-center justify-between border-r border-border-custom last:border-r-0 transition-all focus:outline-none cursor-pointer ${
                isSelected ? "bg-accent/5 border-b-2 border-b-accent text-text-main" : "bg-card text-text-dim hover:bg-bg"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? "text-accent" : "text-text-dim"}`} />
                <span className={`font-mono text-xs font-bold truncate ${isSelected ? "text-text-main" : "text-text-dim"}`}>{filename}</span>
                {isPipelineFile && (
                  <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 font-mono font-bold text-[8px] px-1.5 py-0.5 animate-pulse rounded">
                    ACTIVE
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase rounded ${status.color}`}>
                {status.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Code Editor Panel */}
      <div className="flex-1 flex flex-col min-h-[300px] md:min-h-0 bg-bg border border-border-custom rounded-xl m-4 overflow-hidden">
        {/* Editor Titlebar */}
        <div className="bg-card px-4 py-2.5 border-b border-border-custom flex justify-between items-center text-[10px] text-text-dim select-none">
          <div className="flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-accent" />
            <span className="font-mono text-xs text-text-main">EDITOR — {selectedFile}</span>
          </div>
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
          </div>
        </div>

        {/* Selected file's code view */}
        <div className="flex-1 p-4 overflow-auto max-h-[400px]">
          <pre id="workspace-code-pre" className="whitespace-pre-wrap break-all leading-relaxed font-mono text-xs text-text-main">
            <code>{files[selectedFile] || "// File is empty."}</code>
          </pre>
        </div>

        {/* Selected file's diagnostics summary */}
        <div className="bg-card p-4 border-t border-border-custom font-sans">
          <div className="flex items-start gap-2.5">
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${getFileStatus(selectedFile).label === "BUGGY" ? "text-red-400 animate-pulse" : "text-emerald-500"}`} />
            <div>
              <p className="text-xs font-mono font-bold uppercase text-text-main">DIAGNOSTICS & THREAT LOG</p>
              <p className="text-xs text-text-dim mt-1 leading-relaxed">
                {getFileBugExplanation(selectedFile)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
