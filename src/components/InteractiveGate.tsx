import React, { useState } from "react";
import { Send, ThumbsUp, XCircle, FileDiff, ShieldAlert, AlertCircle, HelpCircle } from "lucide-react";

interface InteractiveGateProps {
  original: string;
  modified: string;
  explanation: string;
  onApprove: () => void;
  onReject: (feedback: string) => void;
  isLoading: boolean;
}

export default function InteractiveGate({
  original,
  modified,
  explanation,
  onApprove,
  onReject,
  isLoading,
}: InteractiveGateProps) {
  const [feedback, setFeedback] = useState("");
  const [showErrorAlert, setShowErrorAlert] = useState(false);

  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");

  // A simple line-by-line diff visualizer for the user
  const renderLineDiff = () => {
    // Find different lines
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    const diffRows: React.ReactNode[] = [];

    let lineIndex = 0;
    while (lineIndex < maxLines) {
      const origLine = originalLines[lineIndex] || "";
      const modLine = modifiedLines[lineIndex] || "";

      if (origLine !== modLine) {
        // Line was modified, display the removal then the addition
        if (origLine) {
          diffRows.push(
            <div key={`orig-${lineIndex}`} className="bg-red-500/10 text-red-200 px-3 py-1.5 border-l-2 border-red-500 font-mono text-xs flex gap-4">
              <span className="w-8 select-none text-red-400 text-right shrink-0">{lineIndex + 1} -</span>
              <span className="whitespace-pre-wrap break-all">{origLine}</span>
            </div>
          );
        }
        if (modLine) {
          diffRows.push(
            <div key={`mod-${lineIndex}`} className="bg-emerald-500/10 text-emerald-200 px-3 py-1.5 border-l-2 border-emerald-500 font-mono text-xs flex gap-4 animate-fade-in">
              <span className="w-8 select-none text-emerald-400 text-right shrink-0">{lineIndex + 1} +</span>
              <span className="whitespace-pre-wrap break-all">{modLine}</span>
            </div>
          );
        }
      } else {
        // Display matching line
        diffRows.push(
          <div key={`match-${lineIndex}`} className="text-text-dim/60 px-3 py-1 font-mono text-xs flex gap-4">
            <span className="w-8 select-none text-text-dim/40 text-right shrink-0">{lineIndex + 1}</span>
            <span className="whitespace-pre-wrap break-all">{origLine}</span>
          </div>
        );
      }
      lineIndex++;
    }

    return (
      <div className="bg-bg border border-border-custom max-h-[350px] overflow-auto rounded-xl p-3 select-text space-y-0.5 transition-colors duration-200">
        {diffRows}
      </div>
    );
  };

  const handleReject = () => {
    if (!feedback.trim()) {
      setShowErrorAlert(true);
      return;
    }
    setShowErrorAlert(false);
    onReject(feedback);
    setFeedback("");
  };

  return (
    <div id="interactive-gate" className="bg-card border border-border-custom p-6 rounded-2xl space-y-6 relative overflow-hidden shadow-sm transition-colors duration-200">
      {/* Human-in-the-loop warning tag */}
      <div className="absolute top-0 right-0 bg-pink-500/10 text-pink-500 border-l border-b border-border-custom font-mono text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
        HUMAN APPROVAL REQUIRED
      </div>

      <div className="flex items-center gap-2.5 border-b border-border-custom pb-3">
        <FileDiff className="w-6 h-6 text-accent" />
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">STATE GATEWAY</span>
          <h2 className="text-2xl font-bold font-sans uppercase tracking-tight text-text-main mt-1.5">
            Review Executor Proposal (HitL Pause)
          </h2>
        </div>
      </div>

      {/* Executor justification log */}
      <div className="bg-accent/5 border border-accent/20 p-4 flex gap-3.5 rounded-xl transition-colors duration-200">
        <ShieldAlert className="w-6 h-6 text-accent shrink-0" />
        <div className="space-y-1">
          <h4 className="font-mono text-xs font-bold uppercase text-text-main">Agent Explanation & Root Cause Path:</h4>
          <p className="text-xs font-mono text-text-dim leading-relaxed">
            {explanation}
          </p>
        </div>
      </div>

      {/* The Code Diff viewer */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-mono font-bold text-text-dim uppercase tracking-wider">
          <span>LINE DIFFERENTIAL COMPARISON:</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500/20 border border-red-500/30 rounded" /> REMOVED</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/30 rounded" /> PROPOSED FIX</span>
          </div>
        </div>
        {renderLineDiff()}
      </div>

      {showErrorAlert && (
        <div className="p-3 bg-red-950/40 text-red-300 border border-red-500/30 rounded-xl text-xs font-mono">
          Please enter feedback explaining why you are rejecting this proposed fix before resubmitting.
        </div>
      )}

      {/* Decision Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border-custom pt-5">
        {/* Approve Block */}
        <div className="bg-emerald-500/5 border border-emerald-500/25 p-4 rounded-xl flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-500 font-bold uppercase text-sm font-sans">
              <ThumbsUp className="w-4 h-4" />
              <span>GATED APPROVAL</span>
            </div>
            <p className="text-xs text-text-dim leading-relaxed font-mono">
              The proposed code has resolved type assertions, logical constraints, and verified vulnerabilities. Save changes and proceed to Auditor stage.
            </p>
          </div>
          <button
            id="btn-approve-gate"
            onClick={onApprove}
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-card/55 text-black font-bold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
          >
            {isLoading ? "Saving Patch..." : "Approve & Save to Workspace"}
          </button>
        </div>

        {/* Reject/Feedback Block */}
        <div className="bg-red-500/5 border border-red-500/25 p-4 rounded-xl flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-red-400 font-bold uppercase text-sm font-sans">
              <XCircle className="w-4 h-4" />
              <span>REJECT & FEEDBACK LOOP</span>
            </div>
            <p className="text-xs text-text-dim leading-relaxed font-mono">
              The code did not fully solve the bug, introduces side effects, or failed your local test suite. Input developer feedback below to recycle the Executor agent.
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              id="gate-feedback-textarea"
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (e.target.value.trim()) setShowErrorAlert(false);
              }}
              placeholder="e.g. Please avoid applying taxes twice or simplify parameter calculation..."
              className="w-full bg-bg border border-border-custom focus:border-red-500/40 rounded-xl p-3 font-mono text-xs text-text-main focus:outline-none min-h-[75px] focus:ring-1 focus:ring-red-500/20 transition-all"
              disabled={isLoading}
            />
            <button
              id="btn-reject-gate"
              onClick={handleReject}
              disabled={isLoading || !feedback.trim()}
              className="w-full bg-red-500/20 hover:bg-red-500/30 disabled:bg-card/55 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-xl font-bold py-2.5 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {isLoading ? "Recycling Executor..." : "Send Feedback & Regenerate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
