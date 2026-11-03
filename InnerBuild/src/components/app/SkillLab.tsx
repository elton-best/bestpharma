import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  Copy,
  Download,
  Eraser,
  Eye,
  MessageQuestion,
  Sparkles,
} from "reicon-react";
import { askSkill } from "@/lib/skill-ai.functions";
import { Markdown } from "./AiChat";
import ThinkingState, { type ThinkingRow } from "@/components/ui/thinking";
import ClaudeChatInput, {
  type AttachedFile,
  type Model,
} from "@/components/ui/claude-style-chat-input";
import { GROQ_MODELS, type GroqModelId } from "./LessonAsk";

interface LabMsg {
  role: "user" | "assistant";
  content: string;
  files?: { name: string; type: string }[] | undefined;
  thinking?: string | undefined;
  model?: string | undefined;
}

const CLAUDE_MODELS: Model[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    description: "Le plus puissant pour les méthodologies d'ingénierie (128k context)",
    badge: "Recommandé",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B Instant",
    description: "Ultra-rapide, exécute les skills sans latence ni limite",
    badge: "Ultra-Rapide",
  },
  {
    id: "qwen/qwen3.8-27b",
    name: "Qwen 3.8 27B",
    description: "Spécialisé pour le code, les spécifications & l'architecture",
  },
];

const SKILL_LAB_STEPS: ThinkingRow[] = [
  { primary: "Lecture du SKILL.md" },
  { primary: "Analyse de la demande", secondary: "contexte + méthode" },
  { primary: "Production du livrable" },
  { primary: "Mise en forme de la prévisualisation" },
];

// Lab d'entraînement d'un skill : chat agent (Groq) à gauche,
// production mise en forme à droite. L'agent lit le SKILL.md en code.
export function SkillLab({
  skillId,
  skillName,
  skillMd,
}: {
  skillId: string;
  skillName: string;
  skillMd: string;
}) {
  const ask = useServerFn(askSkill);
  const storageKey = `aifac_skill_lab_${skillId}`;
  const [msgs, setMsgs] = useState<LabMsg[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<GroqModelId>("openai/gpt-oss-120b");
  const [copied, setCopied] = useState(false);
  const [trace, setTrace] = useState<{
    key: number;
    working: boolean;
    startedAt: number;
    secs: number;
  } | null>(null);
  const [lastTools, setLastTools] = useState<
    { name: string; summary: string; ok: boolean; href?: string }[]
  >([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(msgs.slice(-20)));
    } catch {
      /* stockage local */
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, storageKey]);

  const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");

  async function handleSendMessage({
    message,
    files,
    pastedContent,
    model: chosenModel,
    isThinkingEnabled,
  }: {
    message: string;
    files: AttachedFile[];
    pastedContent: AttachedFile[];
    model: string;
    isThinkingEnabled: boolean;
  }) {
    const payload = message.trim();
    const allFiles = [...files, ...pastedContent];
    if (!payload && allFiles.length === 0) return;
    if (busy) return;

    const validModel: GroqModelId =
      chosenModel && (chosenModel.includes("gpt-oss") || chosenModel.includes("qwen"))
        ? (chosenModel as GroqModelId)
        : "openai/gpt-oss-120b";
    setModel(validModel);

    const fileSummaries = allFiles.map((f) => ({
      name: f.file.name,
      type: f.type,
      content: f.content,
    }));

    let promptForAi = payload;
    if (allFiles.length > 0) {
      const fileTexts = allFiles
        .filter((f) => f.content)
        .map((f) => `### Fichier joint : ${f.file.name}\n${f.content}`)
        .join("\n\n");
      if (fileTexts) {
        promptForAi = `${payload ? `${payload}\n\n` : ""}--- Contenu extrait des fichiers joints ---\n${fileTexts}`;
      }
    }

    if (isThinkingEnabled) {
      promptForAi = `[Mode Réflexion Approfondie Activé : Analyse méthodiquement et étape par étape chaque aspect avant de produire le livrable]\n\n${promptForAi}`;
    }

    const history = msgs.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [
      ...m,
      {
        role: "user",
        content: payload || `Analyse des fichiers joints (${allFiles.length})`,
        files: fileSummaries.map((f) => ({ name: f.name, type: f.type })),
      },
    ]);

    setBusy(true);
    setLastTools([]);
    const startedAt = Date.now();
    setTrace({ key: Date.now(), working: true, startedAt, secs: 0 });

    try {
      const r = await ask({
        data: {
          skillId,
          skillName,
          skillMd: skillMd.slice(0, 12000),
          question: promptForAi,
          history,
          model: validModel,
        },
      });

      const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      setTrace({ key: Date.now(), working: false, startedAt, secs });

      if (r.error) {
        toast.error(r.error);
        setMsgs((m) => m.slice(0, -1));
      } else {
        setMsgs((m) => [
          ...m,
          {
            role: "assistant",
            content: r.text,
            model: validModel,
            thinking: isThinkingEnabled ? `Réflexion méthodique approfondie (${secs}s)` : undefined,
          },
        ]);
        setLastTools(r.toolTrace ?? []);
      }
    } catch {
      toast.error("L'agent ne répond pas. Réessaie.");
      setMsgs((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  function sendSuggestion(text: string) {
    handleSendMessage({
      message: text,
      files: [],
      pastedContent: [],
      model,
      isThinkingEnabled: false,
    });
  }

  function clear() {
    setMsgs([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* stockage local indisponible */
    }
    toast.success("Session d'entraînement réinitialisée");
  }

  function copyProduction() {
    if (!lastAssistant) return;
    navigator.clipboard.writeText(lastAssistant.content);
    setCopied(true);
    toast.success("Production copiée");
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadProduction() {
    if (!lastAssistant) return;
    const blob = new Blob([lastAssistant.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${skillId}-production.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Production téléchargée en Markdown");
  }

  const suggestions = [
    `Applique la méthode de ce skill à mon besoin : décris d'abord ce qu'il te faut puis produis le livrable.`,
    `Montre-moi un exemple concret d'application de ce skill, de bout en bout.`,
    `Voici mon travail, vérifie s'il respecte la méthode du skill : `,
  ];

  const steps = [
    {
      icon: BookOpen,
      title: "1. Lis le cours",
      text: "La méthode complète est expliquée juste au-dessus.",
    },
    {
      icon: MessageQuestion,
      title: "2. Décris ton besoin",
      text: "Un cas réel et concret donne un meilleur livrable.",
    },
    {
      icon: Sparkles,
      title: "3. L'agent produit",
      text: "Il applique strictement la méthode du skill, en direct.",
    },
    {
      icon: Eye,
      title: "4. Vérifie et récupère",
      text: "Relis la production à droite, copie-la ou télécharge-la.",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Comment ça marche */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border border-line bg-card p-3 flex items-start gap-2.5"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent border border-accent/20">
              <s.icon size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">{s.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Gauche : chat agent */}
        <div className="rounded-2xl border border-line bg-card flex flex-col min-h-[480px] max-h-[640px] overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/10 text-accent border border-accent/20 shrink-0">
                <Sparkles size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink truncate">Agent {skillName}</p>
                <p className="text-[11px] text-muted-foreground">
                  Lit le skill et produit en direct — tes échanges restent enregistrés sur cet
                  appareil.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clear}
              title="Réinitialiser la session"
              className="icon-button shrink-0"
            >
              <Eraser size={15} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-line overflow-x-auto">
            {GROQ_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                title={m.desc}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-colors ${
                  model === m.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {!msgs.length && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Décris ton besoin concret (ex : « je dois écrire le cahier de charge d'une app de
                  suivi de stock »). L'agent applique la méthode du skill et produit le livrable,
                  visible à droite.
                </p>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendSuggestion(s)}
                    className="block w-full text-left rounded-lg border border-line bg-muted/40 px-3 py-2 text-xs text-ink hover:border-accent transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-accent/10 border border-accent/20 text-ink ml-6"
                    : "bg-muted/50 border border-line text-ink mr-6"
                }`}
              >
                {m.files && m.files.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {m.files.map((f, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded bg-accent/15 px-2 py-0.5 text-[10px] font-mono font-medium text-accent"
                      >
                        📄 {f.name}
                      </span>
                    ))}
                  </div>
                )}
                {m.thinking && (
                  <div className="mb-2 text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <Sparkles size={11} className="text-accent" /> {m.thinking}
                  </div>
                )}
                <p className="whitespace-pre-wrap">
                  {m.content.slice(0, 600)}
                  {m.content.length > 600 ? "…" : ""}
                </p>
              </div>
            ))}
            {trace && (
              <ThinkingState
                key={trace.key}
                variant="Steps"
                rows={SKILL_LAB_STEPS}
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
                active="Outils en cours d'exécution"
                done={`${lastTools.length} outil${lastTools.length > 1 ? "s" : ""} utilisé${lastTools.length > 1 ? "s" : ""}`}
                status="done"
              />
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line p-2.5 bg-paper/30">
            <ClaudeChatInput
              onSendMessage={handleSendMessage}
              disabled={busy}
              models={CLAUDE_MODELS}
              defaultModel={model}
              placeholder={`Pose une question ou donne une tâche concrète à ${skillName}…`}
            />
          </div>
        </div>

        {/* Droite : preview production */}
        <div className="rounded-2xl border border-line bg-card flex flex-col min-h-[480px] max-h-[640px] overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">Production en direct</p>
              <p className="text-[11px] text-muted-foreground">
                Mise en forme, prête à relire et récupérer.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={copyProduction}
                disabled={!lastAssistant}
                className="btn-base btn-ghost text-xs inline-flex items-center gap-1 disabled:opacity-40"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copié" : "Copier"}
              </button>
              <button
                type="button"
                onClick={downloadProduction}
                disabled={!lastAssistant}
                title="Télécharger la production en Markdown"
                className="btn-base btn-outline text-xs inline-flex items-center gap-1 disabled:opacity-40"
              >
                <Download size={13} /> .md
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {lastAssistant ? (
              <Markdown>{lastAssistant.content}</Markdown>
            ) : (
              <div className="h-full grid place-items-center text-center py-16">
                <div>
                  <Eye size={28} className="text-muted-foreground mx-auto" />
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-xs">
                    La production de l'agent apparaîtra ici, mise en forme et prête à être relue,
                    copiée ou téléchargée. Envoie ta première demande dans le chat.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
