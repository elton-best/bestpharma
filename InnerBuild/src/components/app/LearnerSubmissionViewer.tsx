import { useState, useMemo } from "react";
import {
  FileText,
  Code,
  Eye,
  Github,
  ExternalLink,
  CheckCircle2,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { Markdown } from "@/components/app/AiChat";

interface FileDoc {
  name: string;
  content: string;
  lang: string;
}

interface LearnerSubmissionViewerProps {
  notes?: string | null | undefined;
  repoUrl?: string | null | undefined;
  demoUrl?: string | null | undefined;
  title?: string | undefined;
  readOnly?: boolean | undefined;
}

export function LearnerSubmissionViewer({
  notes = "",
  repoUrl,
  demoUrl,
  title,
}: LearnerSubmissionViewerProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);

  // Parse notes to extract virtual files if marked like ### FILENAME or ```lang
  const parsedFiles = useMemo<FileDoc[]>(() => {
    if (!notes) return [];

    const raw = notes.trim();
    const files: FileDoc[] = [];

    // Regex to detect files separated by "### FILENAME.ext" or similar
    const fileRegex = /###\s+([a-zA-Z0-9_\-./]+)\s*(?:```(?:[a-zA-Z0-9]+)?\s*)?([\s\S]*?)(?=(?:###\s+[a-zA-Z0-9_\-./]+|$))/g;
    let match;
    let hasMatches = false;

    while ((match = fileRegex.exec(raw)) !== null) {
      hasMatches = true;
      const fileName = match[1]?.trim() || "document.md";
      let content = match[2]?.trim() || "";

      // Clean trailing code block delimiters if any
      content = content.replace(/^```[a-zA-Z0-9]*\n?/, "").replace(/```$/, "").trim();

      const ext = fileName.split(".").pop()?.toLowerCase() || "md";
      files.push({
        name: fileName,
        content,
        lang: ext,
      });
    }

    if (!hasMatches) {
      // Check if raw is a JSON string
      if (raw.startsWith("{") && raw.endsWith("}")) {
        try {
          const formatted = JSON.stringify(JSON.parse(raw), null, 2);
          files.push({
            name: "payload.json",
            content: formatted,
            lang: "json",
          });
          return files;
        } catch {
          // not valid json, fallback
        }
      }

      files.push({
        name: "Livrable.md",
        content: raw,
        lang: "md",
      });
    }

    return files;
  }, [notes]);

  const currentFile = useMemo(() => {
    if (activeTab === "all") return null;
    return parsedFiles.find((f) => f.name === activeTab) || parsedFiles[0];
  }, [activeTab, parsedFiles]);

  function copyCurrent() {
    const textToCopy = currentFile ? currentFile.content : notes || "";
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!notes && !repoUrl && !demoUrl) {
    return (
      <div className="rounded-xl border border-line bg-paper/50 p-4 text-xs text-muted-foreground italic">
        Aucun document ou note technique attaché.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-card overflow-hidden shadow-xs space-y-0">
      {/* Top File bar & links */}
      <div className="bg-paper/80 border-b border-line px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="font-mono text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-accent" /> Fichiers :
          </span>

          {parsedFiles.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition ${
                activeTab === "all"
                  ? "bg-accent text-white shadow-xs"
                  : "bg-card text-muted-foreground hover:text-ink hover:bg-muted"
              }`}
            >
              Vue Complète
            </button>
          )}

          {parsedFiles.map((file) => (
            <button
              key={file.name}
              type="button"
              onClick={() => setActiveTab(file.name)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1 transition ${
                (activeTab === file.name || (activeTab === "all" && parsedFiles.length === 1))
                  ? "bg-ink text-white shadow-xs"
                  : "bg-card text-muted-foreground hover:text-ink hover:bg-muted"
              }`}
            >
              <FileText className="h-3 w-3 text-accent" />
              <span>{file.name}</span>
            </button>
          ))}
        </div>

        {/* View toggles & Links */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-line bg-card p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 transition ${
                viewMode === "preview"
                  ? "bg-accent/15 text-accent font-bold"
                  : "text-muted-foreground hover:text-ink"
              }`}
            >
              <Eye className="h-3 w-3" /> Rendu
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 transition ${
                viewMode === "raw"
                  ? "bg-accent/15 text-accent font-bold"
                  : "text-muted-foreground hover:text-ink"
              }`}
            >
              <Code className="h-3 w-3" /> Code
            </button>
          </div>

          <button
            type="button"
            onClick={copyCurrent}
            className="p-1 rounded-lg text-muted-foreground hover:text-ink hover:bg-card transition"
            title="Copier le contenu"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {demoUrl && (
            <a
              href={demoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Démo
            </a>
          )}
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 px-2 py-1 rounded-lg hover:underline"
            >
              <Github className="h-3 w-3" /> Dépôt
            </a>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 text-ink">
        {viewMode === "preview" ? (
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            {activeTab === "all" ? (
              parsedFiles.map((file) => (
                <div key={file.name} className="mb-6 last:mb-0">
                  {parsedFiles.length > 1 && (
                    <div className="flex items-center gap-2 border-b border-line pb-1.5 mb-3">
                      <span className="font-mono text-xs font-bold text-accent">
                        📄 {file.name}
                      </span>
                    </div>
                  )}
                  <Markdown>{file.content}</Markdown>
                </div>
              ))
            ) : (
              <Markdown>{currentFile?.content || ""}</Markdown>
            )}
          </div>
        ) : (
          <pre className="p-3 rounded-lg bg-paper font-mono text-xs text-ink/90 overflow-x-auto leading-relaxed border border-line/60">
            <code>
              {activeTab === "all"
                ? parsedFiles.map((f) => `// --- ${f.name} ---\n${f.content}\n\n`).join("")
                : currentFile?.content || ""}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
