import React from "react";
import { PipelineTask } from "../types";
import { CheckCircle2, PlayCircle, Clock, AlertCircle, HelpCircle, ArrowRight, ShieldCheck, Cpu, Code2 } from "lucide-react";

interface PipelineVisualizerProps {
  tasks: PipelineTask[];
  activeTaskId: string | null;
  targetFile: string;
}

export default function PipelineVisualizer({ tasks, activeTaskId, targetFile }: PipelineVisualizerProps) {
  const getStatusStyle = (status: PipelineTask["status"]) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-emerald-500/5 border border-emerald-500/30",
          text: "text-text-main",
          badge: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          label: "SUCCESSFUL",
        };
      case "in_progress":
        return {
          bg: "bg-accent/5 border border-accent/50 shadow-[0_0_20px_var(--accent-dim)]",
          text: "text-text-main",
          badge: "bg-accent/10 text-accent border border-accent/25",
          icon: <PlayCircle className="w-5 h-5 text-accent animate-pulse" />,
          label: "EXECUTING",
        };
      case "paused_for_approval":
        return {
          bg: "bg-amber-500/5 border border-amber-500/40",
          text: "text-text-main",
          badge: "bg-amber-500/10 text-amber-500 border border-amber-500/25",
          icon: <Clock className="w-5 h-5 text-amber-500 animate-bounce" />,
          label: "GATED (PAUSED)",
        };
      case "failed":
        return {
          bg: "bg-red-500/5 border border-red-500/40",
          text: "text-text-main",
          badge: "bg-red-500/10 text-red-500 border border-red-500/25",
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
          label: "FAILED",
        };
      default:
        return {
          bg: "bg-bg border border-border-custom",
          text: "text-text-dim",
          badge: "bg-card/50 text-text-dim border border-border-custom",
          icon: <Clock className="w-5 h-5 text-text-dim" />,
          label: "QUEUED",
        };
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Architect":
        return <Code2 className="w-4 h-4 text-accent" />;
      case "Executor":
        return <Cpu className="w-4 h-4 text-amber-500" />;
      case "Auditor":
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-text-dim" />;
    }
  };

  return (
    <div id="pipeline-visualizer" className="bg-card border border-border-custom p-6 rounded-2xl shadow-sm relative overflow-hidden transition-colors duration-200">
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />

      <div className="mb-6 relative z-10">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent bg-accent/10 px-2.5 py-1 rounded border border-accent/15">
          REAL-TIME TASK STATE
        </span>
        <h2 className="text-2xl font-bold font-sans uppercase tracking-tight text-text-main mt-3">
          Agent State Graph ({targetFile})
        </h2>
        <p className="text-xs font-mono text-text-dim mt-1.5">
          Each node is authoritative, executing isolated instructions via the MCP connector.
        </p>
      </div>

      {/* Connection Graph layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative z-10">
        {tasks.map((task, index) => {
          const style = getStatusStyle(task.status);
          const isCurrent = activeTaskId === task.id;

          return (
            <React.Fragment key={task.id}>
              {/* Task Node Card */}
              <div
                id={`task-card-${task.id}`}
                className={`transition-all rounded-xl p-5 flex flex-col justify-between min-h-[220px] ${style.bg} ${
                  isCurrent ? "scale-[1.02] ring-2 ring-accent shadow-[0_0_20px_var(--accent-dim)]" : "shadow-sm"
                }`}
              >
                <div>
                  {/* Task Header info */}
                  <div className="flex justify-between items-start mb-3.5">
                    <span className="text-[10px] font-mono font-bold uppercase border border-border-custom px-2 py-0.5 bg-bg text-text-main rounded">
                      NODE 0{index + 1}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 uppercase rounded ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>

                  {/* Task Role Title */}
                  <div className="flex items-center gap-1.5 mb-2.5 border-b border-border-custom pb-2">
                    {getRoleIcon(task.role)}
                    <h3 className="font-bold text-xs tracking-wider text-text-main uppercase font-mono">
                      AGENT {index + 1}: {task.role}
                    </h3>
                  </div>

                  {/* Task details */}
                  <p className="text-xs font-bold font-sans text-text-main mb-1.5">{task.label}</p>
                  <p className="text-[11px] font-mono text-text-dim leading-relaxed line-clamp-3" title={task.description}>
                    {task.description}
                  </p>
                </div>

                {/* Footer State & outputs */}
                <div className="mt-4 pt-3 border-t border-border-custom flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    {style.icon}
                    <span className={`text-[11px] font-mono font-bold uppercase ${isCurrent ? "text-accent" : "text-text-dim"}`}>
                      {task.status === "completed" ? "COMPLETED" : task.status === "paused_for_approval" ? "PAUSED FOR APPROVAL" : task.status === "in_progress" ? "RUNNING INTEGRATION" : "WAITING"}
                    </span>
                  </div>

                  {task.output && (
                    <div className="bg-bg p-2 border border-border-custom text-[10px] font-mono text-text-main whitespace-pre-wrap break-all max-h-[100px] overflow-y-auto rounded">
                      <strong className="text-accent">OUTPUT LOG:</strong>
                      <p className="mt-1 leading-normal">{task.output}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dotted Arrow Connector (hidden on mobile, visible on lg grid) */}
              {index < tasks.length - 1 && (
                <div className="hidden lg:flex items-center justify-center self-center text-text-dim">
                  <ArrowRight className="w-6 h-6 stroke-[2px] animate-pulse text-accent/40" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Simulated Flow Pipeline Banner */}
      <div className="mt-6 bg-bg border border-border-custom p-3 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
          <p className="text-xs font-mono font-bold tracking-wider text-text-dim">
            ORCHESTRATOR THREAD: IDLE_MONITORING // ACTIVE_FILE: <span className="text-text-main">{targetFile}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <span className="bg-accent/10 text-accent border border-accent/15 font-mono font-bold text-[9px] px-2.5 py-1 rounded">
            3-AGENT GRAPH OK
          </span>
          <span className="bg-pink-500/10 text-pink-400 border border-pink-500/15 font-mono font-bold text-[9px] px-2.5 py-1 rounded">
            MCP HOST: ALIVE
          </span>
        </div>
      </div>
    </div>
  );
}
