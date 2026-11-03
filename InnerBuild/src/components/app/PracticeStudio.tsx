import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/components/ui/heroui-toast";
import { HeroAlertDialog } from "@/components/ui/heroui-alert-dialog";
import { MarkdownToolbar } from "@/components/ui/markdown-toolbar";
import {
  Sparkles,
  Send,
  ArrowLeft,
  Code,
  FileText,
  Trash,
  Plus,
  Eye,
  Refresh,
  Copy,
  Check,
  Folder,
} from "reicon-react";
import { Columns2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Panel } from "@/components/app/AppShell";
import { MarkdownView } from "@/components/MarkdownView";
import { getD1SessionUser } from "@/lib/d1-session";
import { askTutor } from "@/lib/tutor.functions";
import type { Workshop } from "@/routes/app.pratique";

export default function Studio({ workshop, onBack }: { workshop: Workshop; onBack: () => void }) {
  const ask = useServerFn(askTutor);

  // Files in virtual workspace
  const [files, setFiles] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`aifac_studio_files_${workshop.id}`);
      return saved ? JSON.parse(saved) : workshop.initialFiles;
    } catch {
      return workshop.initialFiles;
    }
  });

  const fileNames = Object.keys(files);
  const [activeFileName, setActiveFileName] = useState<string>(fileNames[0] || "SPEC.md");
  const [newFileName, setNewFileName] = useState("");
  const [isCreatingFile, setIsCreatingFile] = useState(false);

  // Studio tabs / view mode
  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">(() =>
    typeof window !== "undefined" && window.innerWidth < 1024 ? "editor" : "split",
  );

  // AI analysis state & drawer (persisted in localStorage)
  const [analyzing, setAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`aifac_studio_ai_report_${workshop.id}`) || null;
    } catch {
      return null;
    }
  });
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Deletion modal & toast confirmation state
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(`aifac_studio_files_${workshop.id}`, JSON.stringify(files));
    } catch {}
  }, [files, workshop.id]);

  useEffect(() => {
    try {
      if (aiReport) {
        localStorage.setItem(`aifac_studio_ai_report_${workshop.id}`, aiReport);
      }
    } catch {}
  }, [aiReport, workshop.id]);

  function handleFileChange(content: string) {
    setFiles((prev) => ({ ...prev, [activeFileName]: content }));
  }

  function handleAddFile() {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      setIsCreatingFile(false);
      return;
    }
    const name = trimmed.includes(".") ? trimmed : `${trimmed}.md`;
    if (files[name] !== undefined) {
      toast.warning("Fichier existant", {
        description: "Ce fichier existe déjà dans l'atelier.",
      });
      return;
    }
    const updated = { ...files, [name]: `# ${name}\n\n` };
    setFiles(updated);
    setActiveFileName(name);
    setNewFileName("");
    setIsCreatingFile(false);
    toast.success(`Fichier ${name} créé`);
  }

  function requestDeleteFile(name: string) {
    if (fileNames.length <= 1) {
      toast.warning("Conservation requise", {
        description: "Vous devez conserver au moins un fichier dans l'atelier.",
      });
      return;
    }

    // Affiche uniquement la modale centrée demandée par l'utilisateur
    setFileToDelete(name);
  }

  function confirmDeleteFile(name: string) {
    const { [name]: _, ...rest } = files;
    setFiles(rest);
    if (activeFileName === name) {
      setActiveFileName(Object.keys(rest)[0]!);
    }
    setFileToDelete(null);
    toast.success(`Fichier "${name}" supprimé`, {
      description: "L'arborescence a été mise à jour avec succès.",
    });
  }

  function insertMarkdown(prefix: string, suffix: string = "") {
    const textarea = document.getElementById(
      "studio-markdown-editor",
    ) as HTMLTextAreaElement | null;
    if (!textarea) {
      setFiles((prev) => ({
        ...prev,
        [activeFileName]: (prev[activeFileName] || "") + `${prefix}${suffix}`,
      }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.substring(start, end);
    const replacement = `${prefix}${selected || "texte"}${suffix}`;
    const next = current.substring(0, start) + replacement + current.substring(end);
    setFiles((prev) => ({ ...prev, [activeFileName]: next }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected.length || 5),
      );
    }, 10);
  }

  function handleSaveReportToFile() {
    if (!aiReport) return;
    const fileName = "AUDIT_IA.md";
    const header = `# Rapport d'audit IA — ${workshop.title}\nDate : ${new Date().toLocaleDateString("fr-FR")}\n\n`;
    const updated = {
      ...files,
      [fileName]: `${header}${aiReport}`,
    };
    setFiles(updated);
    setActiveFileName(fileName);
    toast.success(`Rapport d'audit enregistré dans votre arborescence sous ${fileName} !`);
  }

  async function handleAnalyzeWithAi() {
    setAnalyzing(true);
    setAiReport(null);
    setIsReportOpen(true);

    const fullWorkspaceContext = Object.entries(files)
      .map(([name, content]) => `=== FICHIER : ${name} ===\n${content}`)
      .join("\n\n");

    try {
      const res = await ask({
        data: {
          mode: "practice",
          context: `Atelier : "${workshop.title}". Tâche : "${workshop.task}".`,
          messages: [
            {
              role: "user",
              content: `Analyse l'ensemble des fichiers rédigés dans mon arborescence et donne-moi un audit d'ingénierie senior complet et rigoureux :\n\n${fullWorkspaceContext}`,
            },
          ],
        },
      });

      if (res.text) {
        setAiReport(res.text);
        toast.success("Audit de l'IA complété");
      } else {
        toast.error("L'IA n'a pas pu analyser le fichier.");
      }
    } catch {
      toast.error("Erreur de communication avec le coach IA.");
    }
    setAnalyzing(false);
  }

  async function handleSubmitToAdmin() {
    setSubmitting(true);
    const session = getD1SessionUser();
    if (!session) {
      toast.error("Vous devez être connecté.");
      setSubmitting(false);
      return;
    }

    const payloadNotes = Object.entries(files)
      .map(([name, content]) => `### ${name}\n\`\`\`markdown\n${content}\n\`\`\``)
      .join("\n\n");

    const { d1InsertServerFn } = await import("@/lib/d1-data.functions");
    const res = await d1InsertServerFn({
      data: {
        table: "submissions",
        row: {
          user_id: session.id,
          title: `[Atelier Pratique] ${workshop.title}`,
          repo_url: `https://aifac.local/studio/${workshop.id}`,
          notes: payloadNotes.slice(0, 4500),
          status: "submitted",
          // Rattachement au cours : module et exercice d'origine
          module_id: workshop.moduleId ?? null,
          exercise_id: workshop.exerciseId ?? null,
        },
      },
    });

    setSubmitting(false);
    if (!res.success) {
      toast.error("Erreur d'envoi : " + (res.error || "D1"));
      try {
        localStorage.setItem(`aifac_studio_submitted_${workshop.id}`, new Date().toISOString());
      } catch {
        /* localStorage indisponible */
      }

      // Notifications apprenant & admin
      try {
        await d1InsertServerFn({
          data: {
            table: "notifications",
            row: {
              user_id: session.id,
              title: "Atelier transmis 🚀",
              body: `Votre atelier "${workshop.title}" a bien été transmis aux correcteurs.`,
              link: "/app/pratique",
            },
          },
        });

        await d1InsertServerFn({
          data: {
            table: "notifications",
            row: {
              user_id: "admin",
              title: "Nouveau rendu à corriger 📝",
              body: `L'apprenant (${session.email}) a soumis son atelier "${workshop.title}".`,
              link: "/admin/rendus",
            },
          },
        });
      } catch {
        /* notification fallback */
      }

      toast.success("Atelier transmis à l'admin pour correction !");
    }
  }

  const currentContent = files[activeFileName] ?? "";

  return (
    <div className="space-y-4">
      {/* Studio Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="btn-base btn-ghost text-xs gap-1.5 py-1.5 px-3 rounded-xl border border-line"
          >
            <ArrowLeft size={14} /> Ateliers
          </button>
          <div>
            <h1 className="font-bold text-ink text-base flex items-center gap-2">
              <Code size={16} className="text-accent" /> {workshop.title}
            </h1>
            {workshop.moduleTitle && (
              <p className="text-[11px] font-semibold text-accent">
                Rattaché au cours : {workshop.moduleTitle}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{workshop.task}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {aiReport && (
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className="btn-base btn-ghost text-xs h-9 px-3 gap-1.5 border border-line text-muted-foreground hover:text-ink font-semibold rounded-xl flex-1 sm:flex-initial justify-center"
            >
              <FileText size={14} className="text-accent" />
              Voir l'audit
            </button>
          )}

          <button
            type="button"
            disabled={analyzing}
            onClick={handleAnalyzeWithAi}
            className="btn-base text-xs h-9 px-3.5 gap-2 border border-accent/40 bg-accent/10 hover:bg-accent/15 text-accent font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 flex-1 sm:flex-initial justify-center"
          >
            <Sparkles size={15} className={analyzing ? "animate-spin" : "text-accent"} />
            {analyzing ? "Audit en cours…" : "Analyser avec l'IA"}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmitToAdmin}
            className="btn-base btn-glow text-xs h-9 px-4 gap-2 font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            <Send size={14} />
            {submitting ? "Envoi…" : "Soumettre à l'Admin"}
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid gap-5 lg:grid-cols-[260px_1fr] items-start relative">
        {/* Left: Virtual File Tree Explorer - Fixed on scroll */}
        <div className="rounded-2xl border border-line bg-card p-3.5 space-y-3.5 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto shadow-xs z-10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Folder size={14} className="text-accent" />
              Arborescence
            </p>
            <button
              onClick={() => setIsCreatingFile(true)}
              className="text-xs text-accent hover:text-ink font-semibold flex items-center gap-1 p-1 rounded-md hover:bg-muted"
              title="Ajouter un fichier"
            >
              <Plus size={13} /> Nouveau
            </button>
          </div>

          {/* New file input prompt */}
          {isCreatingFile && (
            <div className="flex items-center gap-1.5 pt-1">
              <input
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFile();
                  if (e.key === "Escape") setIsCreatingFile(false);
                }}
                placeholder="Ex. TASKS.md"
                className="field text-xs py-1 px-2 flex-1"
              />
              <button
                onClick={handleAddFile}
                className="btn-base btn-glow text-[11px] py-1 px-2 rounded-md"
              >
                OK
              </button>
            </div>
          )}

          {/* File list */}
          <ul className="space-y-1">
            {fileNames.map((name) => {
              const isActive = activeFileName === name;
              return (
                <li
                  key={name}
                  className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                    isActive ? "bg-accent/15 text-accent font-bold" : "text-ink hover:bg-muted"
                  }`}
                  onClick={() => setActiveFileName(name)}
                >
                  <span className="flex items-center gap-2 truncate">
                    <FileText
                      size={14}
                      className={isActive ? "text-accent" : "text-muted-foreground"}
                    />
                    <span className="truncate">{name}</span>
                  </span>
                  {fileNames.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDeleteFile(name);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 p-1 rounded-md transition-all"
                      title={`Supprimer ${name}`}
                    >
                      <Trash size={13} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="border-t border-line pt-2">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Arborescence de travail persistante et figée au scroll pour faciliter l'édition.
            </p>
          </div>
        </div>

        {/* Center/Right: Editor & Live Preview Panel */}
        <div className="space-y-3">
          {/* Editor Header Bar with Tabs and View Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-ink px-2.5 py-1 rounded-lg bg-muted/60 border border-line flex items-center gap-1.5">
                <FileText size={14} className="text-accent" /> {activeFileName}
              </span>

              {/* Barre d'outils Markdown complète */}
              <div className="hidden sm:block">
                <MarkdownToolbar textareaId="studio-markdown-editor" />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-line">
              <button
                type="button"
                onClick={() => setViewMode("editor")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === "editor"
                    ? "bg-card text-ink shadow-sm"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                Code seul
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`hidden items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors sm:flex ${
                  viewMode === "split"
                    ? "bg-card text-ink shadow-sm"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" /> Côte à côte
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === "preview"
                    ? "bg-card text-ink shadow-sm"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                <Eye size={13} /> Aperçu
              </button>
            </div>
          </div>

          {/* Editor and Preview Split Area */}
          <div
            className={`grid min-h-[60dvh] gap-3 lg:min-h-[460px] ${
              viewMode === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
            }`}
          >
            {/* Editor Area */}
            {(viewMode === "editor" || viewMode === "split") && (
              <div className="flex flex-col h-full rounded-xl border border-line bg-paper overflow-hidden focus-within:border-accent">
                <textarea
                  id="studio-markdown-editor"
                  value={currentContent}
                  onChange={(e) => handleFileChange(e.target.value)}
                  placeholder="Rédigez votre spécification ou plan au format Markdown..."
                  className="h-full min-h-[60dvh] w-full resize-none bg-transparent p-4 font-mono text-base leading-relaxed text-ink outline-none sm:text-xs lg:min-h-[460px]"
                />
              </div>
            )}

            {/* Live Preview Area */}
            {(viewMode === "preview" || viewMode === "split") && (
              <div className="h-full min-h-[60dvh] overflow-y-auto rounded-xl border border-line bg-card p-4 lg:min-h-[460px]">
                <div className="border-b border-line pb-2 mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Aperçu Markdown en direct
                  </span>
                  <span className="text-[10px] text-emerald font-semibold">Temps réel</span>
                </div>
                {currentContent.trim() ? (
                  <MarkdownView>{currentContent}</MarkdownView>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Aucun contenu à prévisualiser.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Slide-over Sheet for AI Audit */}
      <Sheet open={isReportOpen} onOpenChange={setIsReportOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-card border-l border-line text-ink"
        >
          <SheetHeader className="p-5 border-b border-line flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20">
                <Sparkles size={18} />
              </span>
              <div>
                <SheetTitle className="text-base font-bold text-ink">
                  Audit d'ingénierie IA
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Revue critique de l'arborescence et des spécifications
                </SheetDescription>
              </div>
            </div>
            {aiReport && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveReportToFile}
                  className="btn-base btn-glow text-xs h-8 px-2.5 gap-1.5 font-bold"
                  title="Enregistrer l'analyse dans l'arborescence du projet sous AUDIT_IA.md"
                >
                  <FileText size={13} /> Enregistrer (AUDIT_IA.md)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(aiReport);
                    toast.success("Rapport d'audit copié");
                  }}
                  className="btn-base btn-ghost text-xs h-8 px-2.5 gap-1.5 border border-line"
                  title="Copier le rapport"
                >
                  <Copy size={13} /> Copier
                </button>
                <button
                  type="button"
                  onClick={handleAnalyzeWithAi}
                  disabled={analyzing}
                  className="btn-base btn-ghost text-xs h-8 px-2.5 gap-1.5 border border-line"
                  title="Relancer l'analyse"
                >
                  <Refresh size={13} /> Relancer
                </button>
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {analyzing && (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent animate-pulse">
                  <Sparkles size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-ink">Audit d'ingénierie en cours…</h4>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Vérification de la testabilité, de la complétude du découpage et de la checklist
                    "Done".
                  </p>
                </div>
              </div>
            )}

            {!analyzing && aiReport && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs">
                  <span className="font-semibold text-accent flex items-center gap-1.5">
                    <Check size={14} className="stroke-[2.5]" /> Rapport d'ingénierie disponible
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Atelier : {workshop.title}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none text-ink">
                  <MarkdownView>{aiReport}</MarkdownView>
                </div>
              </div>
            )}

            {!analyzing && !aiReport && (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <p className="text-xs">Aucun audit pour l'instant.</p>
                <p className="text-[11px]">
                  Cliquez sur « Analyser avec l'IA » pour démarrer la revue senior.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* HeroUI Confirmation Dialog for file deletion */}
      <HeroAlertDialog
        open={Boolean(fileToDelete)}
        onOpenChange={(open) => {
          if (!open) setFileToDelete(null);
        }}
      >
        <HeroAlertDialog.Backdrop>
          <HeroAlertDialog.Container>
            <HeroAlertDialog.Dialog className="sm:max-w-[420px]">
              <HeroAlertDialog.CloseTrigger />

              <HeroAlertDialog.Header>
                <HeroAlertDialog.Icon status="danger" />
                <div>
                  <HeroAlertDialog.Heading>
                    Supprimer définitivement le fichier ?
                  </HeroAlertDialog.Heading>
                </div>
              </HeroAlertDialog.Header>

              <HeroAlertDialog.Body>
                Voulez-vous vraiment supprimer le fichier{" "}
                <strong className="text-ink font-semibold">{fileToDelete}</strong> ? Cette action
                retirera son contenu de l'atelier de pratique et ne peut pas être annulée.
              </HeroAlertDialog.Body>

              <HeroAlertDialog.Footer>
                <HeroAlertDialog.Cancel asChild>
                  <button
                    type="button"
                    onClick={() => setFileToDelete(null)}
                    className="btn-base btn-ghost text-xs py-2 px-3.5 rounded-xl border border-line text-muted-foreground hover:text-ink font-medium"
                  >
                    Annuler
                  </button>
                </HeroAlertDialog.Cancel>

                <HeroAlertDialog.Action asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (fileToDelete) confirmDeleteFile(fileToDelete);
                    }}
                    className="btn-base text-xs py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs transition-all"
                  >
                    Supprimer le fichier
                  </button>
                </HeroAlertDialog.Action>
              </HeroAlertDialog.Footer>
            </HeroAlertDialog.Dialog>
          </HeroAlertDialog.Container>
        </HeroAlertDialog.Backdrop>
      </HeroAlertDialog>
    </div>
  );
}
