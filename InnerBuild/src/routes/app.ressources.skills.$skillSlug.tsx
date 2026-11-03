import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  Compass,
  Copy,
  Download,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/heroui-toast";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { AI_SKILLS, getCourseForSkill, type AiSkill } from "@/data/skills";
import { getLotCourse } from "@/data/lot-courses";
import { Markdown } from "@/components/app/AiChat";
import { SkillLab } from "@/components/app/SkillLab";

export const Route = createFileRoute("/app/ressources/skills/$skillSlug")({
  head: ({ params }) => {
    const skill = AI_SKILLS.find(
      (s) => s.id.toLowerCase() === params.skillSlug.toLowerCase()
    );
    const title = skill ? `${skill.name} (${skill.id})` : "Skill introuvable";
    return appHead(
      title,
      skill?.shortDescription || "Fiche pratique et directives d'agent IA."
    )();
  },
  component: SkillDetailPage,
});

function SkillDetailPage() {
  const { skillSlug } = Route.useParams();
  const navigate = useNavigate();

  const skill = AI_SKILLS.find(
    (s) => s.id.toLowerCase() === skillSlug.toLowerCase()
  );

  const [activeTab, setActiveTab] = useState<"pedagogy" | "course" | "agent">("pedagogy");
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!skill) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate({ to: "/app/ressources" })}
          className="btn-base btn-ghost text-xs inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour aux ressources
        </button>
        <Empty
          title="Skill introuvable"
          text={`Le skill "${skillSlug}" n'existe pas dans le catalogue des 219 skills AIFAC.`}
        />
        <div className="text-center">
          <Link to="/app/ressources" className="btn-base btn-glow text-xs inline-flex items-center gap-1.5">
            Consulter les 219 skills
          </Link>
        </div>
      </div>
    );
  }

  const currentCourse = getCourseForSkill(skill.id);
  const lot1Course = getLotCourse(skill.id);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    toast.success(`${label} copié dans le presse-papier !`);
    setTimeout(() => setCopiedSection(null), 2500);
  }

  function downloadSkillMd(s: AiSkill) {
    const blob = new Blob([s.fullMarkdownSource], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.id}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Skill téléchargé en Markdown");
  }

  return (
    <div className="space-y-6">
      {/* Return Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          to="/app/ressources"
          className="btn-base btn-ghost text-xs inline-flex items-center gap-1.5 self-start"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au catalogue des 219 skills
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {currentCourse && (
            <button
              onClick={() => setActiveTab("course")}
              className={`btn-base text-xs inline-flex items-center gap-1.5 ${
                activeTab === "course" ? "btn-glow" : "btn-outline border-accent/40 text-accent"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" /> Cours Complet (~{currentCourse.estimatedHours}h)
            </button>
          )}

          <button
            onClick={() => copyToClipboard(skill.agentAssignment.systemPrompt, "Prompt Agent (.md)")}
            className="btn-base btn-outline text-xs inline-flex items-center gap-1.5"
          >
            {copiedSection === "Prompt Agent (.md)" ? (
              <Check className="h-3.5 w-3.5 text-accent" />
            ) : (
              <Bot className="h-3.5 w-3.5" />
            )}
            <span>{copiedSection === "Prompt Agent (.md)" ? "Copié !" : "Copier Prompt Agent"}</span>
          </button>

          <button
            onClick={() => copyToClipboard(skill.fullMarkdownSource, "Fichier SKILL.md")}
            className="btn-base btn-glow text-xs inline-flex items-center gap-1.5"
          >
            {copiedSection === "Fichier SKILL.md" ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedSection === "Fichier SKILL.md" ? "Copié !" : "Copier SKILL.md"}</span>
          </button>

          <button
            onClick={() => downloadSkillMd(skill)}
            className="btn-base btn-ghost text-xs inline-flex items-center gap-1.5"
            title="Télécharger le fichier Markdown"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Panel className="space-y-6">
        {/* Header info */}
        <div className="border-b border-line pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
              {skill.categoryLabel}
            </span>
            <span className="rounded-md border border-line bg-muted/60 px-2.5 py-1 font-mono text-xs text-muted-foreground">
              ID : {skill.id}
            </span>
            <span className="rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1 font-mono text-xs text-accent">
              slug: /app/ressources/skills/{skill.id}
            </span>
            {currentCourse && (
              <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" /> Cours Complet Disponible
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-ink">
            {skill.name}
          </h1>

          <p className="mt-2 text-sm text-accent font-semibold">{skill.categoryTagline}</p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{skill.shortDescription}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {skill.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                <Tag className="h-2.5 w-2.5" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-line">
          <button
            onClick={() => setActiveTab("pedagogy")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-bold transition-colors ${
              activeTab === "pedagogy"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            <Compass className="h-4 w-4" />
            Fiche Pratique & Maîtrise Technique
          </button>

          <button
            onClick={() => setActiveTab("course")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-bold transition-colors relative ${
              activeTab === "course"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Cours Complet & Formation Approfondie
            {currentCourse && (
              <span className="ml-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent font-extrabold">
                {currentCourse.chapters.length} chapitres
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("agent")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-bold transition-colors ${
              activeTab === "agent"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            <Bot className="h-4 w-4" />
            Affectation Agent IA (Prompt & Règles)
          </button>
        </div>

        {/* TAB 1: FICHE PRATIQUE */}
        {activeTab === "pedagogy" && (
          <div className="space-y-6 pt-2">
            <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2.5 text-accent font-bold text-base">
                <Lightbulb className="h-5 w-5" />
                <span>1. Ce que c'est & Les Fondements</span>
              </div>
              <div className="mt-3 text-sm text-ink leading-relaxed space-y-3">
                {skill.pedagogy.conceptExplanation.split("\n\n").map((par, i) => (
                  <p key={i}>{par}</p>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 dark:bg-amber-950/10">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-bold text-base">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>2. Ce à quoi vous faites face : Le Problème & Les Pièges</span>
              </div>
              <div className="mt-3 text-sm text-ink leading-relaxed space-y-2.5">
                {skill.pedagogy.challengesFaced.split("\n").map((line, i) => {
                  if (!line.trim()) return null;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{line.replace(/^-\s*/, "")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2.5 text-accent font-bold text-base">
                <Zap className="h-5 w-5" />
                <span>3. Vos Super-pouvoirs avec ce Skill</span>
              </div>
              <div className="mt-3 text-sm text-ink leading-relaxed space-y-2.5">
                {skill.pedagogy.superpowers.split("\n").map((line, i) => {
                  if (!line.trim()) return null;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{line.replace(/^-\s*/, "")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Protocole d'exécution pas-à-pas */}
            {skill.pedagogy.protocolSteps.length > 0 && (
              <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
                <h3 className="font-bold text-base text-ink mb-4">
                  4. Protocole d'Exécution Pas-à-Pas
                </h3>
                <div className="space-y-4">
                  {skill.pedagogy.protocolSteps.map((step) => (
                    <div
                      key={step.step}
                      className="flex items-start gap-3.5 p-3.5 rounded-xl border border-line/60 bg-muted/30"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground font-black text-xs">
                        {step.step}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-ink">{step.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COURS COMPLET */}
        {activeTab === "course" && (
          <div className="space-y-6 pt-2">
            {currentCourse ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                  <h3 className="font-bold text-ink text-base">{currentCourse.courseTitle}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{currentCourse.overview}</p>
                </div>

                <div className="space-y-4">
                  {currentCourse.chapters.map((chap, i) => (
                    <div
                      key={chap.chapterNumber}
                      className={`rounded-xl border p-4 transition-all ${
                        activeChapterIndex === i
                          ? "border-accent bg-accent/5"
                          : "border-line bg-card hover:border-line/80 cursor-pointer"
                      }`}
                      onClick={() => setActiveChapterIndex(i)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-ink">
                          Chapitre {chap.chapterNumber} : {chap.title}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ~{chap.readingMinutes} min
                        </span>
                      </div>
                      {activeChapterIndex === i && chap.theoryContent && (
                        <div className="mt-3 text-sm text-ink prose prose-invert max-w-none pt-2 border-t border-line/40">
                          <Markdown>{chap.theoryContent}</Markdown>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Empty
                title="Cours approfondi en cours de finalisation"
                text="La fiche pratique et les directives d'agent pour ce skill sont d'ores et déjà 100% disponibles."
              />
            )}
          </div>
        )}

        {/* TAB 3: AGENT IA */}
        {activeTab === "agent" && (
          <div className="space-y-6 pt-2">
            <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-ink">Prompt Système pour l'Agent IA</h3>
                <button
                  onClick={() =>
                    copyToClipboard(skill.agentAssignment.systemPrompt, "Prompt Système")
                  }
                  className="btn-base btn-glow text-xs inline-flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" /> Copier le Prompt
                </button>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-muted/60 p-4 text-xs font-mono text-ink whitespace-pre-wrap leading-relaxed border border-line">
                {skill.agentAssignment.systemPrompt}
              </pre>
            </div>

            <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-ink">Snippet de Configuration (.cursorrules)</h3>
                <button
                  onClick={() =>
                    copyToClipboard(skill.agentAssignment.agentConfigSnippet, "Snippet Cursor")
                  }
                  className="btn-base btn-outline text-xs inline-flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" /> Copier le Snippet
                </button>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-muted/60 p-4 text-xs font-mono text-ink whitespace-pre-wrap leading-relaxed border border-line">
                {skill.agentAssignment.agentConfigSnippet}
              </pre>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
