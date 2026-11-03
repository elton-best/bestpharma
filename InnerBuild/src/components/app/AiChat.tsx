import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, RefreshCw, Trash, Check, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { askTutor, clearCoachModeHistory } from "@/lib/tutor.functions";
import { d1ListServerFn } from "@/lib/d1-data.functions";
import { LogoMark } from "@/components/Logo";
import { initials, useProfile } from "@/lib/learner";
import { type GroqModelId, type ChatAttachment } from "./LessonAsk";
import {
  ClaudeChatInput,
  type AttachedFile,
  type Model,
} from "@/components/ui/claude-style-chat-input";
import {
  ThoughtChain,
  ThoughtChainContent,
  ThoughtChainItem,
  ThoughtChainStep,
  ThoughtChainTrigger,
} from "@/components/ui/components-ai-thought-chain";
import ThinkingState, { type ThinkingRow } from "@/components/ui/thinking";
import { getD1SessionUser } from "@/lib/d1-session";

export type Mode = "explain" | "next" | "feedback" | "coach" | "analyze" | "train" | "practice";
type Msg = {
  role: "user" | "assistant";
  content: string;
  attachment?: ChatAttachment;
  thinkingSteps?: string[];
};

const CHAT_MODELS: Model[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    description: "Le plus puissant, 128k context, raisonnement et code expert",
    badge: "Recommandé",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B Instant",
    description: "Ultra-rapide, quota élevé sans attente",
    badge: "Ultra-Rapide",
  },
  {
    id: "qwen/qwen3.8-27b",
    name: "Qwen 3.8 27B",
    description: "Spécialisé en synthèse et architecture",
  },
];

const COACH_STEPS: ThinkingRow[] = [
  { primary: "Lecture du contexte" },
  { primary: "Analyse de la demande" },
  { primary: "Rédaction de la réponse" },
  { primary: "Mise en forme" },
];

const COACH_REASONING: ThinkingRow[] = [
  { primary: "Analyse du document et du contexte" },
  { primary: "Revue d'ingénierie et recherche de solutions" },
  { primary: "Validation et rédaction de la réponse" },
];

function CodeBlockWithCopy({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, "");

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Code copié !");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative my-3 rounded-xl border border-line bg-ink text-paper overflow-hidden group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-paper/5 border-b border-paper/10 text-[11px] font-mono text-paper/60">
        <span>code</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-paper transition-colors py-0.5 px-1.5 rounded hover:bg-paper/10"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? "Copié" : "Copier"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-xs font-mono leading-relaxed [&_code]:bg-transparent [&_code]:p-0">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (p) => <p {...p} />,
          ul: (p) => <ul className="ml-4 list-disc space-y-1.5 marker:text-accent" {...p} />,
          ol: (p) => (
            <ol
              className="ml-4 list-decimal space-y-1.5 marker:font-bold marker:text-accent"
              {...p}
            />
          ),
          li: ({ className: c, children, ...p }) => {
            const isTask = c?.includes("task-list-item");
            if (isTask) {
              return (
                <li
                  className="-ml-4 list-none flex items-start gap-2 my-1 text-xs text-ink leading-relaxed"
                  {...p}
                >
                  {children}
                </li>
              );
            }
            return (
              <li className="my-0.5" {...p}>
                {children}
              </li>
            );
          },
          input: ({ type, checked, ...p }) => {
            if (type === "checkbox") {
              return (
                <span
                  aria-hidden="true"
                  className={`inline-flex shrink-0 items-center justify-center mt-0.5 h-3.5 w-3.5 rounded border select-none transition-colors ${
                    checked
                      ? "bg-accent border-accent text-paper"
                      : "border-line bg-card text-transparent"
                  }`}
                >
                  <Check size={9} className={checked ? "opacity-100" : "opacity-0"} />
                </span>
              );
            }
            return <input type={type} checked={checked} {...p} />;
          },
          strong: (p) => <strong className="font-bold text-ink" {...p} />,
          a: (p) => (
            <a
              className="font-semibold text-accent underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
              {...p}
            />
          ),
          code: ({ className, children, ...p }) => {
            const isInline = !className && !String(children).includes("\n");
            if (isInline) {
              return (
                <code
                  className="rounded-md bg-accent/10 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-accent border border-accent/20"
                  {...p}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlockWithCopy className={className}>{children}</CodeBlockWithCopy>;
          },
          table: ({ children, ...p }) => (
            <div className="my-3 w-full overflow-x-auto rounded-xl border border-line bg-card/60 shadow-2xs">
              <table className="w-full text-left text-xs text-ink divide-y divide-line" {...p}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...p }) => (
            <th className="bg-muted/70 px-3 py-2 font-bold text-ink whitespace-nowrap" {...p}>
              {children}
            </th>
          ),
          td: ({ children, ...p }) => (
            <td className="px-3 py-2 text-xs border-t border-line/40 align-top" {...p}>
              {children}
            </td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});

export function AiChat({
  mode = "coach",
  context = "",
  placeholder,
  suggestions = [],
  storageKey,
  storageKeyPrefix = "aifac_chat",
  compact = false,
  allowFree = false,
}: {
  mode?: Mode;
  context?: string;
  placeholder?: string;
  suggestions?: string[];
  storageKey?: string;
  storageKeyPrefix?: string;
  compact?: boolean;
  allowFree?: boolean;
}) {
  const ask = useServerFn(askTutor);
  const qc = useQueryClient();
  const { data: p } = useProfile();
  const isPaid = allowFree || p?.active || p?.access_status === "pro" || p?.access_status === "active" || p?.access_status === "unlimited" || p?.isAdmin;
  const effectiveStorageKey = storageKey || `${storageKeyPrefix}_${mode}`;
  const sessionUserId = getD1SessionUser()?.id;

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [trace, setTrace] = useState<{
    key: number;
    working: boolean;
    startedAt: number;
    secs: number;
  } | null>(null);
  const [lastTools, setLastTools] = useState<
    { name: string; summary: string; ok: boolean; href?: string }[]
  >([]);
  const [currentThoughtStep, setCurrentThoughtStep] = useState<
    "analyzing" | "reasoning" | "answering"
  >("analyzing");
  const [selectedModel, setSelectedModel] = useState<GroqModelId>("openai/gpt-oss-120b");

  const clearHistoryFn = useServerFn(clearCoachModeHistory);
  const justClearedRef = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  // 1. Initial Local Cache Load
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(effectiveStorageKey) ?? "[]");
      if (Array.isArray(cached) && cached.length > 0) {
        setMsgs(cached);
      }
    } catch {}
  }, [effectiveStorageKey]);

  // 2. Persistent Database Sync with D1 (coach_questions)
  const { data: dbHistory } = useQuery({
    queryKey: ["coach-chat-history", sessionUserId, mode],
    queryFn: async () => {
      const uid = sessionUserId || getD1SessionUser()?.id;
      if (!uid) return [];
      const res = await d1ListServerFn({
        data: {
          table: "coach_questions",
          where: { user_id: uid, source: mode },
          orderBy: "created_at",
          orderDir: "ASC",
          limit: 50,
        },
      });
      return (res.rows || []) as any[];
    },
    enabled: !!(sessionUserId || getD1SessionUser()?.id),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // When dbHistory arrives, if local messages are empty, hydrate from Supabase!
  useEffect(() => {
    if (justClearedRef.current) return;
    if (dbHistory && dbHistory.length > 0) {
      setMsgs((prev) => {
        if (prev.length > 0) return prev;
        const converted: Msg[] = [];
        dbHistory.forEach((r) => {
          let cleanQ = r.question;
          let docName = r.lesson_title || undefined;
          if (cleanQ.includes("[DOCUMENT JOINT ANALYSÉ :")) {
            const docMatch = cleanQ.match(/\[DOCUMENT JOINT ANALYSÉ : ([^|]+) \|/);
            if (docMatch) docName = docMatch[1]?.trim();
            const reqMatch = cleanQ.match(/Demande de l'apprenant : ([\s\S]+)$/);
            cleanQ =
              reqMatch && reqMatch[1]
                ? reqMatch[1].trim()
                : `Analyse du document : ${docName || "joint"}`;
          }
          const att: ChatAttachment | undefined = docName
            ? { name: docName, type: "text", wordCount: 0 }
            : undefined;
          converted.push({
            role: "user",
            content: cleanQ,
            ...(att ? { attachment: att } : {}),
          });
          converted.push({
            role: "assistant",
            content: r.answer,
          });
        });
        return converted;
      });
    }
  }, [dbHistory]);

  // Persist only when messages change; avoid serializing the full chat on each loading state.
  useEffect(() => {
    if (msgs.length > 0) {
      localStorage.setItem(effectiveStorageKey, JSON.stringify(msgs.slice(-40)));
    }
  }, [msgs, effectiveStorageKey]);

  // Instant scrolling is more stable when the Android keyboard resizes the WebView.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      end.current?.scrollIntoView({ block: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [msgs.length, busy]);

  async function handleSend({
    message,
    files,
    pastedContent,
    model,
    isThinkingEnabled,
  }: {
    message: string;
    files: AttachedFile[];
    pastedContent: AttachedFile[];
    model: string;
    isThinkingEnabled: boolean;
  }) {
    if (!isPaid) {
      toast.error("L'utilisation des IA à tous les niveaux est réservée aux utilisateurs payants (4 000 F CFA).");
      return;
    }
    if ((!message && files.length === 0 && pastedContent.length === 0) || busy) return;

    setSelectedModel(model as GroqModelId);
    setIsThinking(isThinkingEnabled);
    setCurrentThoughtStep("analyzing");

    // Gather file attachments
    const allAttachments = [...files, ...pastedContent];
    const firstAttachment = allAttachments[0];

    // Build clean display attachment
    const currentAttachment: ChatAttachment | undefined = firstAttachment
      ? {
          name: firstAttachment.file.name || "Snippet texte",
          type:
            firstAttachment.type === "image"
              ? "image"
              : firstAttachment.type === "pdf"
                ? "pdf"
                : "text",
          wordCount: firstAttachment.wordCount || 0,
          preview: firstAttachment.content?.slice(0, 350) || "",
        }
      : undefined;

    // Build the AI server payload
    let fullPayload = message;
    if (allAttachments.length > 0) {
      const docsSummary = allAttachments
        .map(
          (a) =>
            `[DOCUMENT JOINT ANALYSÉ : ${a.file.name} | TYPE: ${a.type.toUpperCase()} | VOLUME: ${a.wordCount || 0} MOTS]\n` +
            `Contenu extrait du document/image :\n"""\n${a.content || ""}\n"""\n`,
        )
        .join("\n\n");

      fullPayload = `${docsSummary}\n\nDemande de l'apprenant : ${
        message ||
        "Analyse minutieusement ce document joint, identifie les points clés et formule tes retours d'expert."
      }`;
    }

    const cleanDisplayContent =
      message || (firstAttachment ? `Analyse de document : ${firstAttachment.file.name}` : "");

    const userMsg: Msg = {
      role: "user",
      content: cleanDisplayContent,
      ...(currentAttachment ? { attachment: currentAttachment } : {}),
    };

    const next = [...msgs, userMsg];
    setMsgs(next);
    setBusy(true);
    setLastTools([]);
    const startedAt = Date.now();
    setTrace((t) => ({ key: (t?.key ?? 0) + 1, working: true, startedAt, secs: 0 }));
    const finishTrace = () => {
      const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      setTrace((t) => (t ? { ...t, working: false, secs } : t));
    };

    const serverMessages = [
      ...msgs.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: fullPayload },
    ];

    try {
      if (isThinkingEnabled) {
        setTimeout(() => setCurrentThoughtStep("reasoning"), 800);
      }

      const session = getD1SessionUser();
      const r = await ask({
        data: {
          mode,
          context,
          // A shorter context noticeably reduces mobile response latency.
          messages: serverMessages.slice(-12),
          model: model as GroqModelId,
          userId: sessionUserId || session?.id,
        },
      });

      if (r.error) {
        toast.error(r.error);
        setMsgs(msgs);
      } else {
        if (isThinkingEnabled) {
          setCurrentThoughtStep("answering");
        }
        setMsgs([...next, { role: "assistant", content: r.text }]);
        setLastTools(r.toolTrace ?? []);
        // Invalidate coach history so /app/historique updates instantly
        qc.invalidateQueries({ queryKey: ["coach-history"] });
        qc.invalidateQueries({ queryKey: ["coach-chat-history", sessionUserId, mode] });
      }
    } catch {
      toast.error("Le coach ne répond pas. Réessaie dans quelques instants.");
      setMsgs(msgs);
    }

    finishTrace();
    setBusy(false);
    setIsThinking(false);
  }

  async function clearChat() {
    justClearedRef.current = true;
    setMsgs([]);
    setTrace(null);
    try {
      localStorage.removeItem(effectiveStorageKey);
      if (storageKey) localStorage.removeItem(storageKey);
      qc.setQueryData(["coach-chat-history", sessionUserId, mode], []);
      await clearHistoryFn({
        data: { mode, ...(sessionUserId ? { userId: sessionUserId } : {}) },
      });
      await qc.invalidateQueries({ queryKey: ["coach-history"] });
    } catch (e) {
      console.warn("clearChat err", e);
    }
    toast.info("Nouvelle conversation démarrée.");
  }

  function retry() {
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    handleSend({
      message: lastUser.content,
      files: [],
      pastedContent: [],
      model: selectedModel,
      isThinkingEnabled: false,
    });
  }

  return (
    <div className={`flex min-h-0 flex-col w-full max-w-full overflow-hidden min-w-0 ${compact ? "h-full" : "h-[calc(100dvh-9rem)] sm:h-[78vh] sm:min-h-[550px]"}`}>
      {/* Top Bar for Reset and Conversation Info */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-line/60 bg-paper/40 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {msgs.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Effacer et démarrer un nouveau fil"
          >
            <Trash size={12} />
            <span>Nouveau fil</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3 sm:space-y-5 sm:px-4 sm:py-4">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center space-y-4">
            <LogoMark className="h-12 w-12 text-accent" />
            <div>
              <p className="font-display text-lg sm:text-xl font-extrabold text-ink">Coach AIFAC</p>
              <p className="mt-1 max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Mentor IA complet : il connaît tout le cursus, analyse vos fichiers et vos captures
                (OCR), et vous aide à livrer.
              </p>
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 max-w-lg pt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      handleSend({
                        message: s,
                        files: [],
                        pastedContent: [],
                        model: selectedModel,
                        isThinkingEnabled: false,
                      })
                    }
                    className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-semibold text-ink transition-all hover:border-accent hover:text-accent hover:bg-accent/5 shadow-xs"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {msgs.slice(-40).map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end gap-2.5">
              <div className="max-w-[92%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-sm text-paper shadow-xs leading-relaxed font-sans sm:max-w-[85%] sm:px-4 sm:py-3">
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
                            ? "Scan OCR"
                            : m.attachment.type.toUpperCase()}{" "}
                          {m.attachment.wordCount ? `• ${m.attachment.wordCount} mots` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
              <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-ink sm:flex">
                {initials(p?.full_name ?? "", p?.email ?? "")}
              </span>
            </div>
          ) : (
            <div key={i} className="group flex gap-2 sm:gap-3">
              <LogoMark className="mt-1 hidden h-7 w-7 shrink-0 sm:block" />
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-line bg-card p-3 shadow-xs sm:p-5">
                <Markdown>{m.content}</Markdown>
                <div className="mt-3 flex gap-2 border-t border-line/60 pt-2 opacity-60 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label="Copier"
                    title="Copier la réponse"
                    onClick={() => {
                      navigator.clipboard.writeText(m.content);
                      toast.success("Réponse copiée !");
                    }}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-ink transition-colors"
                  >
                    <Copy size={13} /> Copier
                  </button>
                  {i === Math.min(msgs.length, 40) - 1 && (
                    <button
                      type="button"
                      aria-label="Régénérer"
                      title="Régénérer"
                      onClick={retry}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-ink transition-colors"
                    >
                      <RefreshCw size={13} /> Régénérer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ),
        )}

        {/* ThoughtChain & Wave Loader during thinking/busy */}
        {busy && (
          <div className="space-y-3 p-2">
            {isThinking && (
              <div className="p-3.5 rounded-2xl border border-line bg-card/80 shadow-xs max-w-xl">
                <p className="text-[11px] font-mono font-bold text-accent uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles size={12} /> Chaîne de réflexion (ThoughtChain)
                </p>
                <ThoughtChain>
                  <ThoughtChainStep status={currentThoughtStep === "analyzing" ? "active" : "done"}>
                    <ThoughtChainTrigger>Analyse du document et du contexte</ThoughtChainTrigger>
                    <ThoughtChainContent>
                      <ThoughtChainItem>
                        Extraction des termes clés et structure du prompt
                      </ThoughtChainItem>
                      <ThoughtChainItem>
                        Vérification des critères Done et des dépendances
                      </ThoughtChainItem>
                    </ThoughtChainContent>
                  </ThoughtChainStep>

                  <ThoughtChainStep
                    status={
                      currentThoughtStep === "reasoning"
                        ? "active"
                        : currentThoughtStep === "answering"
                          ? "done"
                          : "pending"
                    }
                  >
                    <ThoughtChainTrigger>
                      Revue d'ingénierie et recherche de solutions
                    </ThoughtChainTrigger>
                    <ThoughtChainContent>
                      <ThoughtChainItem>
                        Confrontation aux bonnes pratiques AIFAC Spec → Deliver
                      </ThoughtChainItem>
                      <ThoughtChainItem>
                        Préparation des blocs de code et recommandations
                      </ThoughtChainItem>
                    </ThoughtChainContent>
                  </ThoughtChainStep>

                  <ThoughtChainStep
                    status={currentThoughtStep === "answering" ? "active" : "pending"}
                  >
                    <ThoughtChainTrigger>Validation et rédaction de la réponse</ThoughtChainTrigger>
                    <ThoughtChainContent>
                      <ThoughtChainItem>Finalisation des points d'action concrets</ThoughtChainItem>
                    </ThoughtChainContent>
                  </ThoughtChainStep>
                </ThoughtChain>
              </div>
            )}

            {/* Trace thinking pendant la génération */}
            <div className="py-1">
              <ThinkingState
                key={`working-${trace?.key ?? 0}`}
                variant={isThinking ? "Reasoning" : "Steps"}
                rows={isThinking ? COACH_REASONING : COACH_STEPS}
                active={isThinking ? "Raisonnement en cours" : "Réflexion en cours"}
                status="working"
              />
            </div>
          </div>
        )}

        {/* Trace thinking stabilisée du dernier échange */}
        {!busy && trace && !trace.working && (
          <div className="py-1">
            <ThinkingState
              key={`done-${trace.key}`}
              variant="Steps"
              rows={COACH_STEPS}
              done={`Réfléchi pendant ${trace.secs} s`}
              status="done"
            />
          </div>
        )}
        {/* Vrais appels d'outils du dernier échange */}
        {!busy && lastTools.length > 0 && (
          <div className="py-1">
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
          </div>
        )}

        <div ref={end} />
      </div>

      {/* Modern Claude-Style Chat Input or Locked Gate */}
      <div className="shrink-0 bg-paper px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] w-full max-w-full min-w-0">
        {isPaid ? (
          <ClaudeChatInput
            onSendMessage={handleSend}
            models={CHAT_MODELS}
            defaultModel={selectedModel}
            disabled={busy}
            placeholder={placeholder || "Pose ta question, colle du code ou glisse un fichier…"}
          />
        ) : (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 text-center shadow-xs">
            <p className="text-sm font-bold text-ink">L'utilisation des IA à tous les niveaux est réservée aux membres payants.</p>
            <p className="mt-1 text-xs text-muted-foreground">Active ton accès intégral à 4 000 F CFA pour débloquer le coach IA, les analyses de code et les simulateurs d'ateliers.</p>
            <Link to="/app/paiement" className="btn-base btn-glow mt-3 inline-block text-xs font-bold">
              Débloquer l'accès IA — 4 000 F CFA
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
export default AiChat;
