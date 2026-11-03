import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useId } from "react";
import { toast } from "sonner";
import {
  Send,
  Sparkles,
  Trash,
  Paperclip,
  Bulb,
  ChevronDown,
  Check,
  X,
  FileText,
} from "reicon-react";
import { askLesson } from "@/lib/lesson-ai.functions";
import { MarkdownView } from "@/components/MarkdownView";
import ThinkingState, { type ThinkingRow } from "@/components/ui/thinking";
import { LogoMark } from "@/components/Logo";
import type { ExtractedFile } from "@/lib/ocr";
import { getD1SessionUser } from "@/lib/d1-session";

export type ChatAttachment = {
  name: string;
  type: "image" | "pdf" | "text";
  wordCount: number;
  preview?: string;
};

export type Msg = { role: "user" | "assistant"; content: string; attachment?: ChatAttachment };

export type GroqModelId =
  | "llama-3.3-70b-versatile"
  | "llama-3.1-8b-instant"
  | "openai/gpt-oss-120b"
  | "qwen/qwen3.8-27b"
  | "openai/gpt-oss-20b";

export const GROQ_MODELS: { id: GroqModelId; label: string; badge: string; desc: string }[] = [
  {
    id: "openai/gpt-oss-120b",
    label: "GPT OSS 120B",
    badge: "Recommandé",
    desc: "Puissance d'ingénierie & contexte 128k",
  },
  {
    id: "openai/gpt-oss-20b",
    label: "GPT OSS 20B Instant",
    badge: "Ultra-Rapide",
    desc: "Vitesse maximale & quota élevé",
  },
  {
    id: "qwen/qwen3.8-27b",
    label: "Qwen 3.8 27B",
    badge: "Code",
    desc: "Spécialisé Code, Types & Architecture",
  },
];

const LESSON_STEPS: ThinkingRow[] = [
  { primary: "Lecture de la leçon" },
  { primary: "Analyse de la question" },
  { primary: "Rédaction de la réponse" },
  { primary: "Mise en forme" },
];

export function LessonAsk({
  lessonId,
  lessonTitle,
  compact = false,
}: {
  lessonId: string;
  lessonTitle: string;
  compact?: boolean;
}) {
  const ask = useServerFn(askLesson);
  const fileInputId = useId();
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      const saved = localStorage.getItem(`aifac_lesson_chat_${lessonId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<{
    key: number;
    working: boolean;
    startedAt: number;
    secs: number;
  } | null>(null);
  const [lastTools, setLastTools] = useState<
    { name: string; summary: string; ok: boolean; href?: string }[]
  >([]);
  const [selectedModel, setSelectedModel] = useState<GroqModelId>("openai/gpt-oss-120b");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState<ExtractedFile | null>(null);
  const [ocrProgress, setOcrProgress] = useState<{ active: boolean; pct: number; status: string }>({
    active: false,
    pct: 0,
    status: "",
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(`aifac_lesson_chat_${lessonId}`, JSON.stringify(msgs.slice(-40)));
    } catch {}
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollIntoView({ block: "end" }));
    return () => cancelAnimationFrame(frame);
  }, [msgs, lessonId]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Le fichier dépasse la taille maximale autorisée (20 Mo).");
      return;
    }

    setOcrProgress({ active: true, pct: 10, status: "Lecture du document…" });
    try {
      const { processUploadFile } = await import("@/lib/ocr");
      const extracted = await processUploadFile(file, (pct, status) => {
        setOcrProgress({ active: true, pct, status });
      });

      setAttachedFile(extracted);
      toast.success(
        extracted.type === "image"
          ? `Texte extrait par OCR avec succès (${extracted.wordCount} mots détectés)`
          : `Fichier joint : ${extracted.name} (${extracted.wordCount} mots)`,
      );
    } catch (err: any) {
      console.error("OCR/Upload error", err);
      toast.error("Échec de la lecture du fichier : " + (err?.message || "format non supporté"));
    } finally {
      setOcrProgress({ active: false, pct: 0, status: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function send(text = q) {
    const questionText = text.trim();
    if ((!questionText && !attachedFile) || busy) return;

    let fullPayload = questionText;
    if (attachedFile) {
      const docHeader =
        `[DOCUMENT JOINT ANALYSÉ : ${attachedFile.name} | TYPE: ${attachedFile.type.toUpperCase()} | VOLUME: ${attachedFile.wordCount || 0} MOTS]\n` +
        `Contenu extrait du document/image :\n"""\n${attachedFile.content}\n"""\n\n` +
        `Demande de l'apprenant : ${questionText || "Analyse attentivement ce document joint, relève les points clés, identifie les anomalies et donne tes retours d'expert avec des blocs de code corrigés."}`;
      fullPayload = docHeader;
    }

    const currentAttachment: ChatAttachment | undefined = attachedFile
      ? {
          name: attachedFile.name,
          type: attachedFile.type,
          wordCount: attachedFile.wordCount || 0,
          preview: attachedFile.content.slice(0, 350),
        }
      : undefined;

    const userMsg: Msg = {
      role: "user",
      content: questionText || `Analyse du document : ${attachedFile?.name}`,
      ...(currentAttachment ? { attachment: currentAttachment } : {}),
    };

    const historyForServer = msgs.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, userMsg]);
    setQ("");
    setAttachedFile(null);
    setBusy(true);
    const startedAt = Date.now();
    setTrace((t) => ({ key: (t?.key ?? 0) + 1, working: true, startedAt, secs: 0 }));
    setLastTools([]);
    const finishTrace = () => {
      const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      setTrace((t) => (t ? { ...t, working: false, secs } : t));
    };

    try {
      const userId = getD1SessionUser()?.id;
      const r = await ask({
        data: {
          lessonId,
          question: fullPayload,
          history: historyForServer,
          model: selectedModel,
          ...(userId ? { userId } : {}),
        },
      });

      if (r.error) {
        toast.error(r.error);
        setMsgs((m) => m.slice(0, -1));
        setQ(questionText);
      } else {
        setMsgs((m) => [...m, { role: "assistant", content: r.text }]);
        setLastTools(r.toolTrace ?? []);
      }
    } catch {
      toast.error("L'assistant ne répond pas. Réessaie.");
      setMsgs((m) => m.slice(0, -1));
      setQ(questionText);
    }
    finishTrace();
    setBusy(false);
  }

  function handleClear() {
    setMsgs([]);
    try {
      localStorage.removeItem(`aifac_lesson_chat_${lessonId}`);
    } catch {}
    toast.success("Conversation réinitialisée");
  }

  const currentModelMeta = GROQ_MODELS.find((m) => m.id === selectedModel) ?? GROQ_MODELS[0]!;

  return (
    <section
      className={`flex h-full min-h-0 flex-col overflow-hidden bg-card shadow-sm ${
        compact
          ? "border-0"
          : "min-h-[560px] max-h-[calc(100dvh-120px)] rounded-2xl border border-line"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-line bg-muted/20 p-3.5 pr-12 sm:p-4 sm:pr-12">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20">
            <Sparkles size={16} />
          </span>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
              Assistant de cours
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
              En direct sur : {lessonTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {msgs.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              title="Effacer l'historique de cette leçon"
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-ink transition-colors"
            >
              <Trash size={14} />
            </button>
          )}
          <Link
            to="/app/historique"
            className="text-xs font-semibold text-accent hover:underline hidden sm:inline-block"
          >
            Historique →
          </Link>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {msgs.length === 0 && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <LogoMark className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink">Une question sur ce cours ?</p>
              <p className="mt-1 text-[11px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Le mentor analyse la leçon, lit tes documents (PDF, captures, code) et te guide pas
                à pas.
              </p>
            </div>

            {/* Quick Topic Ideas */}
            <div className="pt-2 flex flex-col gap-1.5">
              {[
                "Explique-moi cette leçon simplement",
                "Donne-moi un exemple concret d'application",
                "Comment valider l'exercice demandé ?",
                "Découpe ce sujet en tâches vérifiables",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-xl border border-line bg-card/80 px-3 py-2 text-left text-xs font-medium text-ink hover:border-accent hover:text-accent hover:bg-accent/5 transition-all flex items-center justify-between group"
                >
                  <span>→ {s}</span>
                  <span className="text-[10px] text-muted-foreground group-hover:text-accent font-mono">
                    Entrée ↵
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.slice(-40).map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[90%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-xs sm:text-sm text-paper shadow-xs leading-relaxed font-sans">
                {m.attachment && (
                  <div className="mb-2.5 rounded-xl border border-paper/20 bg-paper/10 p-2.5 backdrop-blur-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-paper/20 text-paper shrink-0">
                        {m.attachment.type === "image" ? (
                          <Sparkles size={14} />
                        ) : (
                          <FileText size={14} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-paper truncate">
                          {m.attachment.name}
                        </p>
                        <p className="text-[10px] text-paper/70 font-mono">
                          {m.attachment.type === "image"
                            ? "Capture OCR"
                            : m.attachment.type.toUpperCase()}{" "}
                          • {m.attachment.wordCount} mots extraits
                        </p>
                      </div>
                    </div>
                    {m.attachment.preview && (
                      <details className="mt-2 text-[11px] text-paper/85 font-mono bg-paper/5 rounded-lg p-2 border border-paper/10">
                        <summary className="cursor-pointer text-[10px] text-amber-300 hover:underline select-none">
                          Voir l'extrait analysé
                        </summary>
                        <p className="mt-1.5 whitespace-pre-wrap max-h-36 overflow-y-auto leading-normal opacity-90 text-[10.5px]">
                          {m.attachment.preview}
                          {m.attachment.preview.length >= 350 ? "…" : ""}
                        </p>
                      </details>
                    )}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5 items-start">
              <LogoMark className="mt-1 h-6 w-6 shrink-0" />
              <div className="min-w-0 flex-1 bg-muted/25 rounded-2xl rounded-tl-md p-3.5 border border-line/60 overflow-hidden">
                <MarkdownView className="text-sm">{m.content}</MarkdownView>
              </div>
            </div>
          ),
        )}

        {trace && (
          <ThinkingState
            key={trace.key}
            variant="Steps"
            rows={LESSON_STEPS}
            active="Réflexion en cours"
            done={`Réfléchi pendant ${trace.secs} s`}
            status={trace.working ? "working" : "done"}
          />
        )}
        {!busy && lastTools.length > 0 && (
          <ThinkingState
            key={`tools-${trace?.key ?? 0}`}
            variant={lastTools.some((t) => t.name === "fetch_url") ? "Search" : "Coding"}
            rows={lastTools.map((t) => ({
              primary: t.ok ? t.name : `${t.name} (échec)`,
              ...(t.summary ? { secondary: t.summary } : {}),
              mono: true,
              ...(t.href ? { href: t.href } : {}),
            }))}
            done={`${lastTools.length} outil${lastTools.length > 1 ? "s" : ""} utilisé${lastTools.length > 1 ? "s" : ""}`}
            status="done"
          />
        )}
        <div ref={scrollRef} />
      </div>

      {/* Framer AI-inspired Prompt Box Container (Matching reference design) */}
      <div className="shrink-0 space-y-2 border-t border-line bg-muted/10 p-2.5 sm:p-3">
        {/* Hidden File Input for OCR / Document Upload */}
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept="image/*,.pdf,.txt,.md,.doc,.docx,.ts,.tsx,.json,.py,.js"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* OCR Progress Indicator */}
        {ocrProgress.active && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-2.5 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-accent flex items-center gap-1.5">
                <Sparkles size={13} className="animate-spin text-accent" /> {ocrProgress.status}
              </span>
              <span className="font-mono text-[11px] font-bold text-accent">
                {ocrProgress.pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-accent/20 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${Math.max(10, ocrProgress.pct)}%` }}
              />
            </div>
          </div>
        )}

        {/* Attached Document / OCR File Chip */}
        {attachedFile && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-accent/10 border border-accent/25 text-xs text-ink animate-in fade-in">
            <div className="flex items-center gap-2 truncate">
              {attachedFile.type === "image" && attachedFile.previewUrl ? (
                <img
                  src={attachedFile.previewUrl}
                  alt="Aperçu"
                  className="h-7 w-7 rounded object-cover border border-line"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent shrink-0">
                  <FileText size={14} />
                </span>
              )}
              <div className="truncate">
                <p className="font-semibold truncate max-w-[220px]">{attachedFile.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {attachedFile.type === "image" ? "Scan OCR" : attachedFile.type.toUpperCase()} ·{" "}
                  {attachedFile.wordCount} mots extraits
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="p-1 rounded-md text-muted-foreground hover:text-ink hover:bg-accent/20 transition-colors"
              title="Supprimer la pièce jointe"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Framer AI Style Input Card */}
        <div className="rounded-2xl border border-line bg-card shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-all p-2.5">
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            rows={2}
            maxLength={6000}
            aria-label="Ta question sur la leçon"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Que souhaites-tu concevoir ou comprendre sur ce cours ? (ou colle ton code/texte)"
            className="w-full resize-none bg-transparent px-1.5 py-1 text-base leading-relaxed text-ink outline-none placeholder:text-muted-foreground sm:text-sm"
          />

          {/* Action Toolbar Below Input */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/60">
            {/* Left Controls: OCR/Attachment + Model Selector */}
            <div className="flex items-center gap-1.5 relative">
              {/* Paperclip Button for OCR / Document */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrProgress.active}
                title="Joindre une image (OCR), un PDF ou un document de code"
                className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-ink hover:bg-muted transition-colors border border-line/70"
              >
                <Paperclip size={14} />
                <span className="hidden sm:inline-block text-[11px]">OCR & Doc</span>
              </button>

              {/* Model Selector Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink bg-muted/50 hover:bg-muted border border-line/70 transition-colors"
                  title="Sélectionner le modèle Groq"
                >
                  <Sparkles size={13} className="text-accent" />
                  <span className="font-mono text-[11px] font-bold">{currentModelMeta.label}</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${modelDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {modelDropdownOpen && (
                  <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(16rem,calc(100vw-2rem))] space-y-1 rounded-xl border border-line bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Modèles Groq disponibles
                    </p>
                    {GROQ_MODELS.map((m) => {
                      const isSelected = m.id === selectedModel;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel(m.id);
                            setModelDropdownOpen(false);
                            toast.success(`Modèle sélectionné : ${m.label}`);
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                            isSelected
                              ? "bg-accent/15 text-accent font-bold"
                              : "hover:bg-muted text-ink"
                          }`}
                        >
                          <div>
                            <p className="font-semibold flex items-center gap-1.5">
                              {m.label}
                              <span className="font-mono text-[9px] px-1 rounded bg-muted text-muted-foreground font-normal">
                                {m.badge}
                              </span>
                            </p>
                            <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                              {m.desc}
                            </p>
                          </div>
                          {isSelected && (
                            <Check size={14} className="text-accent shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Send Button */}
            <button
              type="button"
              onClick={() => send()}
              disabled={busy || (!q.trim() && !attachedFile) || ocrProgress.active}
              aria-label="Envoyer"
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground disabled:opacity-40 hover:opacity-90 transition-all shadow-xs active:scale-95"
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Category Pills (like Image 2) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-muted-foreground scrollbar-none">
          <span className="shrink-0 flex items-center gap-1 font-semibold text-accent">
            <Bulb size={12} /> Idées :
          </span>
          {[
            {
              label: "Spec testable",
              prompt:
                "Aide-moi à rédiger une spec testable pour cette leçon avec critères d'acceptation",
            },
            {
              label: "Plan 5 tâches",
              prompt:
                "Découpe l'exercice de cette leçon en 5 tâches techniques atomiques ordonnées",
            },
            {
              label: "Code exemple",
              prompt: "Donne-moi un exemple de code commenté prêt à l'emploi pour cette leçon",
            },
            {
              label: "Audit & QA",
              prompt:
                "Quels sont les pièges et cas d'erreurs fréquents à surveiller sur ce sujet ?",
            },
          ].map((pill) => (
            <button
              key={pill.label}
              type="button"
              onClick={() => send(pill.prompt)}
              className="shrink-0 rounded-lg border border-line bg-card/70 px-2 py-1 hover:border-accent hover:text-ink hover:bg-accent/5 transition-all text-ink font-medium"
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
