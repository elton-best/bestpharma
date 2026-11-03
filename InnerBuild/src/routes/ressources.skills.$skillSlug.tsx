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
import { toast } from "sonner";
import { AI_SKILLS, getCourseForSkill, type AiSkill } from "@/data/skills";
import { getLotCourse } from "@/data/lot-courses";
import { Markdown } from "@/components/app/AiChat";
import { SkillLab } from "@/components/app/SkillLab";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/ressources/skills/$skillSlug")({
  head: ({ params }) => {
    const skill = AI_SKILLS.find(
      (s) => s.id.toLowerCase() === params.skillSlug.toLowerCase()
    );
    const title = skill ? `${skill.name} (${skill.id}) — AI Factory` : "Skill introuvable";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: skill?.shortDescription || "Fiche pratique et directives d'agent IA AI Factory.",
        },
      ],
    };
  },
  component: PublicSkillDetailPage,
});

function PublicSkillDetailPage() {
  const { skillSlug } = Route.useParams();
  const navigate = useNavigate();

  const skill = AI_SKILLS.find(
    (s) => s.id.toLowerCase() === skillSlug.toLowerCase()
  );

  const [activeTab, setActiveTab] = useState<"pedagogy" | "course" | "agent">("pedagogy");
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!skill) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center p-6 selection:bg-accent/20">
        <div className="max-w-md w-full text-center space-y-4 rounded-3xl border border-line bg-card p-8 shadow-xl">
          <div className="h-12 w-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-ink">Skill introuvable</h1>
          <p className="text-xs text-muted-foreground">
            Le skill <code>{skillSlug}</code> n'existe pas dans le catalogue des 219 skills AIFAC.
          </p>
          <div className="pt-2">
            <Link to="/challenges" className="btn-base btn-primary text-xs px-4 py-2">
              Explorer les challenges
            </Link>
          </div>
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
    <div className="min-h-screen bg-paper text-ink flex flex-col selection:bg-accent/20">
      {/* Public Top Header */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/85 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <span className="hidden sm:inline-block text-xs font-bold text-muted-foreground/60">/</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-line bg-card text-[11px] font-mono text-muted-foreground">
            <Tag className="w-3 h-3 text-accent" /> {skill.category}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/app/ressources/skills/$skillSlug"
            params={{ skillSlug: skill.id }}
            className="btn-base btn-ghost text-xs px-3 py-1.5"
          >
            Espace apprenant
          </Link>
          <Link
            to="/auth"
            className="btn-base btn-glow text-xs font-bold px-3.5 py-1.5"
          >
            Rejoindre la formation
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-mono font-bold">
                {skill.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full border border-line bg-card text-xs text-muted-foreground">
                {skill.categoryLabel}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-ink tracking-tight">
              {skill.name}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {skill.shortDescription}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => copyToClipboard(skill.agentAssignment.systemPrompt, "Prompt Agent")}
              className="btn-base btn-ghost text-xs px-3 py-2 flex items-center gap-1.5"
            >
              {copiedSection === "Prompt Agent" ? <Check className="w-4 h-4 text-accent" /> : <Bot className="w-4 h-4" />}
              Copier prompt agent
            </button>
            <button
              type="button"
              onClick={() => downloadSkillMd(skill)}
              className="btn-base btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Télécharger .md
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-line gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("pedagogy")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "pedagogy"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            Fiche Pratique & Directive
          </button>
          {currentCourse && (
            <button
              type="button"
              onClick={() => setActiveTab("course")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "course"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              Cours Complet (~{currentCourse.estimatedHours}h)
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("agent")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "agent"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            Tester l'Agent en direct
          </button>
        </div>

        {/* Active Tab Content */}
        {activeTab === "pedagogy" && (
          <div className="rounded-2xl border border-line bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <Compass className="w-4 h-4 text-accent" /> Méthodologie & Directives Système (SKILL.md)
            </h2>
            <div className="prose prose-sm max-w-none text-xs sm:text-sm dark:prose-invert">
              <Markdown>{skill.fullMarkdownSource}</Markdown>
            </div>
          </div>
        )}

        {activeTab === "course" && currentCourse && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-line bg-card p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-ink">{currentCourse.courseTitle}</h2>
              <p className="text-xs text-muted-foreground">{currentCourse.overview}</p>
              <div className="mt-4">
                <Link
                  to="/app/ressources/skills/$skillSlug"
                  params={{ skillSlug: skill.id }}
                  className="btn-base btn-glow text-xs px-4 py-2 inline-flex items-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" /> Suivre les quiz et valider la certification
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === "agent" && (
          <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
            <SkillLab skillId={skill.id} skillName={skill.name} skillMd={skill.fullMarkdownSource} />
          </div>
        )}
      </main>
    </div>
  );
}
