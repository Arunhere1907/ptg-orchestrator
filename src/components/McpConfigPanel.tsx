import React, { useState } from "react";
import { McpConfig } from "../types";
import { Plus, ToggleLeft, ToggleRight, Trash2, Globe, Database, FolderCode, KeyRound, AlertTriangle } from "lucide-react";

interface McpConfigPanelProps {
  configs: McpConfig[];
  onToggle: (id: string) => void;
  onAdd: (config: Omit<McpConfig, "id" | "status">) => void;
  onDelete: (id: string) => void;
  aiProvider: string;
  setAiProvider: (val: string) => void;
  aiApiKey: string;
  setAiApiKey: (val: string) => void;
  aiModel: string;
  setAiModel: (val: string) => void;
  aiMounted: boolean;
  setAiMounted: (val: boolean) => void;
}

export default function McpConfigPanel({
  configs,
  onToggle,
  onAdd,
  onDelete,
  aiProvider,
  setAiProvider,
  aiApiKey,
  setAiApiKey,
  aiModel,
  setAiModel,
  aiMounted,
  setAiMounted,
}: McpConfigPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("filesystem");
  const [url, setUrl] = useState("http://localhost:5004");
  const [apiKey, setApiKey] = useState("");
  const [extraParam, setExtraParam] = useState(""); // dbPath or allowedPaths

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    onAdd({
      name,
      type,
      url,
      apiKey,
      ...(type === "filesystem" ? { allowedPaths: extraParam.split(",").map(p => p.trim()) } : {}),
      ...(type === "sqlite" ? { dbPath: extraParam } : {}),
    });

    // Reset Form
    setName("");
    setType("filesystem");
    setUrl("http://localhost:5004");
    setApiKey("");
    setExtraParam("");
    setShowAddForm(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "filesystem":
        return <FolderCode className="w-5 h-5 text-accent" />;
      case "sqlite":
        return <Database className="w-5 h-5 text-[#f59e0b]" />;
      case "github":
        return <Globe className="w-5 h-5 text-pink-400" />;
      default:
        return <Globe className="w-5 h-5 text-accent" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "filesystem":
        return "FILESYSTEM";
      case "sqlite":
        return "SQLITE DB";
      case "github":
        return "GITHUB API";
      default:
        return "CUSTOM";
    }
  };

  return (
    <div id="mcp-config-panel" className="bg-card border border-border-custom p-6 rounded-2xl shadow-sm transition-colors duration-200">
      <div className="flex justify-between items-center mb-5 pb-4 border-b border-border-custom">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/15">SYSTEM EXTENSION</span>
          <h2 className="text-2xl font-bold tracking-tight text-text-main font-sans uppercase mt-1">Pluggable MCP Config</h2>
        </div>
        <button
          id="btn-toggle-add-mcp"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-accent hover:opacity-90 text-black font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 text-xs uppercase cursor-pointer transition-all shadow-[0_0_15px_var(--accent-dim)]"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? "Cancel" : "Add MCP"}
        </button>
      </div>

      {showAddForm && (
        <form id="add-mcp-form" onSubmit={handleSubmit} className="bg-bg border border-border-custom p-4 mb-6 rounded-xl space-y-4 shadow-inner">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-main border-b border-border-custom pb-2">Register Local MCP Server</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1 text-text-dim">Server Name</label>
              <input
                id="mcp-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SQLite Analyzer"
                className="w-full bg-card border border-border-custom focus:border-accent rounded-xl p-2.5 text-xs font-mono focus:outline-none text-text-main focus:ring-1 focus:ring-accent/30 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1 text-text-dim">Server Type</label>
              <select
                id="mcp-type-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-card border border-border-custom focus:border-accent rounded-xl p-2.5 text-xs font-mono focus:outline-none text-text-main focus:ring-1 focus:ring-accent/30 transition-all h-[42px]"
              >
                <option value="filesystem">Local FileSystem</option>
                <option value="sqlite">Relational SQLite</option>
                <option value="github">GitHub Workspace</option>
                <option value="custom">Custom JSON-RPC</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1 text-text-dim">Server HTTP Endpoint</label>
              <input
                id="mcp-url-input"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:5004"
                className="w-full bg-card border border-border-custom focus:border-accent rounded-xl p-2.5 text-xs font-mono focus:outline-none text-text-main focus:ring-1 focus:ring-accent/30 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1 text-text-dim">API Secret Key (Optional)</label>
              <input
                id="mcp-key-input"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste LLM or platform key"
                className="w-full bg-card border border-border-custom focus:border-accent rounded-xl p-2.5 text-xs font-mono focus:outline-none text-text-main focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase mb-1 text-text-dim">
              {type === "filesystem" ? "Allowed Directories (comma-separated)" : type === "sqlite" ? "SQLite Database File Path" : "Additional Configurations"}
            </label>
            <input
              id="mcp-extra-input"
              type="text"
              value={extraParam}
              onChange={(e) => setExtraParam(e.target.value)}
              placeholder={type === "filesystem" ? "/workspace, /src/utils" : type === "sqlite" ? "./app-data.db" : "e.g. repo: arun/scrawn-pipeline"}
              className="w-full bg-card border border-border-custom focus:border-accent rounded-xl p-2.5 text-xs font-mono focus:outline-none text-text-main focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          <button
            id="btn-save-mcp"
            type="submit"
            className="w-full bg-accent hover:opacity-90 text-black font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all"
          >
            Connect and Mount MCP Host
          </button>
        </form>
      )}

      <div className="space-y-4">
        {/* AI MODEL CONFIG CARD */}
        <div className="bg-bg border border-border-custom p-4 rounded-xl flex flex-col lg:flex-row justify-between lg:items-center gap-4 relative overflow-hidden shadow-inner">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500" />
          
          <div className="pl-3 flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Globe className="w-5 h-5 text-yellow-500" />
              <h4 className="font-bold text-text-main font-sans uppercase">AI MODEL CONFIG</h4>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/15">
                LLM
              </span>
            </div>
            
            {/* Grid of Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] font-bold uppercase text-text-dim mb-1">PROVIDER</label>
                <select
                  id="ai-provider-select"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full bg-card border border-border-custom focus:border-accent rounded-xl p-2 text-xs font-mono focus:outline-none text-text-main focus:ring-1 focus:ring-accent/30 transition-all h-[38px]"
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="Anthropic">Anthropic</option>
                  <option value="Gemini">Gemini</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-text-dim mb-1">API_KEY</label>
                <input
                  id="ai-api-key-input"
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-card border border-border-custom focus:border-accent rounded-xl p-2 text-xs font-mono focus:outline-none text-text-main focus:ring-1 focus:ring-accent/30 transition-all h-[38px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-text-dim mb-1">MODEL</label>
                <input
                  id="ai-model-input"
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="gpt-4o / claude-sonnet-4-6 / gemini-flash"
                  className="w-full bg-card border border-border-custom focus:border-accent rounded-xl p-2 text-xs font-mono focus:outline-none text-text-main focus:ring-1 focus:ring-accent/30 transition-all h-[38px]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end lg:self-center pl-3 lg:pl-0 shrink-0">
            <button
              id="btn-toggle-ai-model"
              type="button"
              onClick={() => setAiMounted(!aiMounted)}
              className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase focus:outline-none cursor-pointer text-text-main"
            >
              {aiMounted ? (
                <>
                  <span className="text-emerald-500">MOUNTED</span>
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                </>
              ) : (
                <>
                  <span className="text-red-400">UNMOUNTED</span>
                  <ToggleLeft className="w-8 h-8 text-text-dim" />
                </>
              )}
            </button>
          </div>
        </div>

        {configs.map((config) => {
          const isConnected = config.status === "connected";
          return (
            <div
              key={config.id}
              className="bg-bg border border-border-custom p-4 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4 relative overflow-hidden shadow-inner"
            >
              <div
                className={`absolute top-0 left-0 w-1.5 h-full ${
                  isConnected ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <div className="pl-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getIcon(config.type)}
                  <h4 className="font-bold text-text-main font-sans uppercase">{config.name}</h4>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                    config.type === "filesystem" ? "bg-accent/10 text-accent border border-accent/15" : config.type === "sqlite" ? "bg-amber-500/10 text-amber-400 border border-amber-500/15" : "bg-pink-500/10 text-pink-400 border border-pink-500/15"
                  }`}>
                    {getTypeLabel(config.type)}
                  </span>
                </div>
                <div className="space-y-0.5 text-xs font-mono text-text-dim">
                  <p><span className="font-bold text-text-main">ENDPOINT:</span> {config.url}</p>
                  {config.allowedPaths && config.allowedPaths.length > 0 && (
                    <p><span className="font-bold text-text-main">ALLOWED_PATHS:</span> {config.allowedPaths.join(", ")}</p>
                  )}
                  {config.dbPath && (
                    <p><span className="font-bold text-text-main">DB_PATH:</span> {config.dbPath}</p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-text-dim" />
                    <span className="font-bold text-text-main">AUTH SECRET:</span>{" "}
                    {config.apiKey ? "••••••••••••••••" : <span className="text-red-400 font-bold">MISSING (PROMPT INHERITED)</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center pl-3 md:pl-0">
                <button
                  id={`btn-toggle-mcp-${config.id}`}
                  onClick={() => onToggle(config.id)}
                  className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase focus:outline-none cursor-pointer text-text-main"
                >
                  {isConnected ? (
                    <>
                      <span className="text-emerald-500">MOUNTED</span>
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    </>
                  ) : (
                    <>
                      <span className="text-red-400">UNMOUNTED</span>
                      <ToggleLeft className="w-8 h-8 text-text-dim" />
                    </>
                  )}
                </button>

                <button
                  id={`btn-delete-mcp-${config.id}`}
                  onClick={() => onDelete(config.id)}
                  className="bg-card hover:bg-red-500/15 hover:text-red-400 border border-border-custom p-2 rounded-xl text-text-dim cursor-pointer transition-all"
                  title="Remove MCP Configuration"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 p-3.5 bg-accent/5 border border-accent/15 flex gap-3 rounded-xl transition-colors duration-200">
        <AlertTriangle className="w-5 h-5 text-accent shrink-0" />
        <p className="text-xs font-mono text-text-main leading-relaxed">
          <strong className="text-text-main">PRO-TIP:</strong> Pluggable MCPs are active server wrappers. When local workspace fixes are analyzed, the Executor queries active MCP paths to locate fault vectors.
        </p>
      </div>
    </div>
  );
}
