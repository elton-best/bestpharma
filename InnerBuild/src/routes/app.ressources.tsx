import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Code,
  Compass,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Layers,
  Lightbulb,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Terminal,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/heroui-toast";
import { Download as DownloadIcon, Flask } from "reicon-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import {
  AI_SKILLS,
  SKILL_CATEGORIES,
  getCourseForSkill,
  type AiSkill,
  type CourseChapter,
} from "@/data/skills";
import { getLotCourse, type LotCourse } from "@/data/lot-courses";
import { LearnerResourcesTab } from "@/components/app/LearnerResourcesTab";
import { Markdown } from "@/components/app/AiChat";
import { SkillLab } from "@/components/app/SkillLab";
import { SitePreloader } from "@/components/ui/SitePreloader";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  skill: z.string().optional(),
});

export const Route = createFileRoute("/app/ressources")({
  validateSearch: searchSchema,
  head: appHead(
    "Skills & Modèles AI Factory",
    "Encyclopédie pratique et formations approfondies de 219 skills d'élite.",
  ),
  pendingComponent: () => (
    <SitePreloader
      message="Chargement de l'Arsenal des Skills"
      subMessage="Orchestration des 212 skills, prompts et patterns d'ingénierie..."
      fullScreen={false}
    />
  ),
  component: RessourcesPage,
});

function RessourcesPage() {
  const searchParams = Route.useSearch();
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => searchParams.category || "all",
  );
  const [searchQuery, setSearchQuery] = useState(() => searchParams.q || "");
  const [selectedSkill, setSelectedSkill] = useState<AiSkill | null>(() => {
    if (searchParams.skill) {
      return (
        AI_SKILLS.find((s) => s.id.toLowerCase() === searchParams.skill?.toLowerCase()) || null
      );
    }
    return null;
  });
  const [section, setSection] = useState<"skills" | "resources">("skills");
  const [activeTab, setActiveTab] = useState<"pedagogy" | "course" | "agent">("pedagogy");
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 18;

  // React to search params changes
  useEffect(() => {
    if (searchParams.category) setSelectedCategory(searchParams.category);
    if (searchParams.q !== undefined) setSearchQuery(searchParams.q);
    if (searchParams.skill) {
      const found = AI_SKILLS.find((s) => s.id.toLowerCase() === searchParams.skill?.toLowerCase());
      if (found) setSelectedSkill(found);
    }
  }, [searchParams.category, searchParams.q, searchParams.skill]);

  // Filter skills
  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return AI_SKILLS.filter((s) => {
      // Robust category matching (handles core-skills and orchestration bridge)
      const matchCat =
        selectedCategory === "all" ||
        s.category === selectedCategory ||
        (selectedCategory === "orchestration" &&
          (s.id === "orchestrator" || s.category === "core-skills")) ||
        (selectedCategory === "core-skills" && s.id === "orchestrator");

      if (!matchCat) return false;
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.shortDescription.toLowerCase().includes(q) ||
        s.pedagogy.conceptExplanation.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredSkills.length / PAGE_SIZE) || 1;
  const paginatedSkills = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSkills.slice(start, start + PAGE_SIZE);
  }, [filteredSkills, currentPage]);

  const currentCourse = selectedSkill ? getCourseForSkill(selectedSkill.id) : undefined;
  const currentChapter: CourseChapter | undefined = currentCourse?.chapters?.[activeChapterIndex];
  // Lot 1 (00-orchestration) : rédaction du formateur + lab agent live (nouveau format 2 sections)
  const lot1Course = selectedSkill ? getLotCourse(selectedSkill.id) : undefined;

  function downloadSkillMd(skill: AiSkill) {
    const blob = new Blob([skill.fullMarkdownSource], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${skill.id}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Skill téléchargé en Markdown");
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    toast.success(`${label} copié dans le presse-papier !`);
    setTimeout(() => setCopiedSection(null), 2500);
  }

  function handleCategoryChange(catId: string) {
    setSelectedCategory(catId);
    setCurrentPage(1);
  }

  function handleSelectSkill(
    skill: AiSkill,
    defaultTab: "pedagogy" | "course" | "agent" = "pedagogy",
  ) {
    setSelectedSkill(skill);
    setActiveTab(defaultTab);
    setActiveChapterIndex(0);
    setQuizAnswers({});
  }

  return (
    <>
      <PageHeader
        eyebrow="Arsenal de Compétences & Formations"
        title="Skills & Formations AI Factory"
        subtitle={`Encyclopédie pratique de ${AI_SKILLS.length} skills et cours complets générés par IA pour les 7 Skills Socles indispensables.`}
      />

      {!selectedSkill && (
        <div className="mb-5 flex items-center gap-1 border-b border-line">
          {(
            [
              { id: "skills", label: "Skills & Formations" },
              { id: "resources", label: "Ressources" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              className={`border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
                section === t.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {selectedSkill ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Return and Quick Copy Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              onClick={() => setSelectedSkill(null)}
              className="btn-base btn-ghost text-xs inline-flex items-center gap-1.5 self-start"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Retour à la liste ({filteredSkills.length}{" "}
              skills)
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/app/ressources/skills/$skillSlug"
                params={{ skillSlug: selectedSkill.id }}
                className="btn-base btn-ghost text-xs inline-flex items-center gap-1.5"
                title="Consulter l'URL permanente du skill"
              >
                <ExternalLink className="h-3.5 w-3.5" /> URL permanente
              </Link>
              <Link
                to="/ressources/skills/$skillSlug"
                params={{ skillSlug: selectedSkill.id }}
                className="btn-base btn-ghost text-xs inline-flex items-center gap-1.5"
                title="Lien public partageable"
                target="_blank"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Lien public
              </Link>
              {lot1Course ? (
                <button
                  onClick={() => downloadSkillMd(selectedSkill)}
                  className="btn-base btn-glow text-xs inline-flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger le skill (.md)
                </button>
              ) : (
                <>
                  {currentCourse && (
                    <button
                      onClick={() => setActiveTab("course")}
                      className={`btn-base text-xs inline-flex items-center gap-1.5 ${
                        activeTab === "course"
                          ? "btn-glow"
                          : "btn-outline border-accent/40 text-accent"
                      }`}
                    >
                      <GraduationCap className="h-3.5 w-3.5" /> Suivre le Cours Complet (~
                      {currentCourse.estimatedHours}h)
                    </button>
                  )}

                  <button
                    onClick={() =>
                      copyToClipboard(
                        selectedSkill.agentAssignment.systemPrompt,
                        "Prompt Agent (.md)",
                      )
                    }
                    className="btn-base btn-outline text-xs inline-flex items-center gap-1.5"
                  >
                    {copiedSection === "Prompt Agent (.md)" ? (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                    {copiedSection === "Prompt Agent (.md)"
                      ? "Prompt Copié !"
                      : "Copier Prompt Agent (.md)"}
                  </button>

                  <button
                    onClick={() =>
                      copyToClipboard(selectedSkill.fullMarkdownSource, "Fichier SKILL.md")
                    }
                    className="btn-base btn-glow text-xs inline-flex items-center gap-1.5"
                  >
                    {copiedSection === "Fichier SKILL.md" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedSection === "Fichier SKILL.md"
                      ? "Fichier Copié !"
                      : "Copier le Skill (.md)"}
                  </button>
                </>
              )}
            </div>
          </div>

          <Panel className="space-y-6">
            {/* Header info */}
            <div className="border-b border-line pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
                  {selectedSkill.categoryLabel}
                </span>
                <span className="rounded-md border border-line bg-muted/60 px-2.5 py-1 font-mono text-xs text-muted-foreground">
                  ID : {selectedSkill.id}
                </span>
                {currentCourse && (
                  <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" /> Cours Complet Disponible
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-ink">
                {selectedSkill.name}
              </h1>

              <p className="mt-2 text-sm text-accent font-semibold">
                {selectedSkill.categoryTagline}
              </p>

              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {selectedSkill.shortDescription}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedSkill.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    <Tag className="h-2.5 w-2.5" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {lot1Course ? (
              <Lot1Sections
                skill={selectedSkill}
                course={lot1Course}
                onDownload={() => downloadSkillMd(selectedSkill)}
              />
            ) : (
              <>
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

                {/* TAB 1: FICHE PRATIQUE COMPLÈTE */}
                {activeTab === "pedagogy" && (
                  <div className="space-y-6 pt-2">
                    {/* 1. Ce que c'est & Fondements */}
                    <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
                      <div className="flex items-center gap-2.5 text-accent font-bold text-base">
                        <Lightbulb className="h-5 w-5" />
                        <span>1. Ce que c'est & Les Fondements</span>
                      </div>
                      <div className="mt-3 text-sm text-ink leading-relaxed space-y-3">
                        {selectedSkill.pedagogy.conceptExplanation.split("\n\n").map((par, i) => (
                          <p key={i}>{par}</p>
                        ))}
                      </div>
                    </div>

                    {/* 2. Ce à quoi vous faites face (Les Dangers & Pièges) */}
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 dark:bg-amber-950/10">
                      <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-bold text-base">
                        <ShieldAlert className="h-5 w-5 shrink-0" />
                        <span>
                          2. Ce à quoi vous faites face : Le Problème & Les Pièges du Développeur
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-ink leading-relaxed space-y-2.5">
                        {selectedSkill.pedagogy.challengesFaced.split("\n").map((line, i) => {
                          if (!line.trim()) return null;
                          const isBullet = line.trim().startsWith("•");
                          return (
                            <p
                              key={i}
                              className={
                                isBullet
                                  ? "pl-2 font-medium text-amber-950 dark:text-amber-200"
                                  : ""
                              }
                            >
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Ce que ce Skill change (Vos Superpouvoirs) */}
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 dark:bg-emerald-950/10">
                      <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                        <Zap className="h-5 w-5 shrink-0" />
                        <span>3. Ce que ce Skill change : Vos Superpouvoirs d'Ingénieur</span>
                      </div>
                      <div className="mt-3 text-sm text-ink leading-relaxed space-y-2">
                        {selectedSkill.pedagogy.superpowers.split("\n").map((line, i) => {
                          if (!line.trim()) return null;
                          return <p key={i}>{line}</p>;
                        })}
                      </div>
                    </div>

                    {/* 4. Protocole d'Exécution pas-à-pas */}
                    <div className="rounded-2xl border border-line bg-card p-6 shadow-xs space-y-4">
                      <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-bold text-base">
                        <Layers className="h-5 w-5" />
                        <span>4. Protocole d'Exécution & Méthode pas-à-pas</span>
                      </div>

                      <div className="grid gap-3.5 sm:grid-cols-2">
                        {selectedSkill.pedagogy.protocolSteps.map((step) => (
                          <div
                            key={step.step}
                            className="rounded-xl border border-line bg-muted/20 p-4 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                                  {step.step}
                                </span>
                                <h4 className="font-bold text-ink text-sm">{step.title}</h4>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 5. Bonnes Pratiques vs Pièges à éviter */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-500/20 bg-card p-5">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Les 4 Réflexes d'Excellence (À faire)</span>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {selectedSkill.pedagogy.dosAndDonts.dos.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-ink leading-relaxed"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-rose-500/20 bg-card p-5">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                          <XCircle className="h-4 w-4" />
                          <span>Les 4 Erreurs Toxiques (À proscrire)</span>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {selectedSkill.pedagogy.dosAndDonts.donts.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-ink leading-relaxed"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 6. Quand l'utiliser */}
                    <div className="rounded-2xl border border-line bg-muted/20 p-5">
                      <div className="flex items-center gap-2 text-ink font-bold text-sm">
                        <Filter className="h-4 w-4 text-accent" />
                        <span>Quand et dans quelles situations activer ce skill</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedSkill.pedagogy.whenToUse}
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 2: COURS COMPLET & FORMATION APPROFONDIE (7 SKILLS SOCLES) */}
                {activeTab === "course" && (
                  <div className="space-y-6 pt-2">
                    {currentCourse ? (
                      <>
                        {/* Course Hero Banner */}
                        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-6 shadow-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-accent text-accent-foreground px-2.5 py-0.5 text-xs font-black">
                              FORMATION COMPLÈTE
                            </span>
                            <span className="rounded-md border border-line bg-card px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                              Durée : ~{currentCourse.estimatedHours} heures
                            </span>
                            <span className="rounded-md border border-line bg-card px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                              Niveau : {currentCourse.level || "Intermédiaire à Avancé"}
                            </span>
                          </div>

                          <h2 className="mt-3 text-2xl font-black text-ink">
                            {currentCourse.courseTitle}
                          </h2>

                          {currentCourse.subtitle && (
                            <p className="mt-1 text-sm font-semibold text-accent">
                              {currentCourse.subtitle}
                            </p>
                          )}

                          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                            {currentCourse.overview}
                          </p>

                          {/* Learning outcomes */}
                          {(currentCourse.learningOutcomes || currentCourse.learningGoals) && (
                            <div className="mt-5 pt-4 border-t border-line/60">
                              <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <Trophy className="h-4 w-4 text-accent" /> Ce que vous maîtriserez à
                                l'issue de cette formation :
                              </h4>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {(
                                  currentCourse.learningOutcomes ||
                                  currentCourse.learningGoals ||
                                  []
                                ).map((goal, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-2 text-xs text-ink font-medium"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{goal}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Chapters Navigation Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-accent" />
                              Chapitres du Cours ({currentCourse.chapters.length} modules)
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              Chapitre {activeChapterIndex + 1} sur {currentCourse.chapters.length}
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {currentCourse.chapters.map((ch, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setActiveChapterIndex(idx);
                                  setQuizAnswers({});
                                }}
                                className={`rounded-xl border p-3.5 text-left transition-all ${
                                  activeChapterIndex === idx
                                    ? "border-accent bg-accent/10 shadow-xs"
                                    : "border-line bg-card hover:border-line/80 hover:bg-muted/30"
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="font-bold text-accent">
                                    Chapitre {ch.chapterNumber || idx + 1}
                                  </span>
                                  <span className="text-muted-foreground font-mono">
                                    {ch.readingMinutes || 25} min
                                  </span>
                                </div>
                                <h4 className="font-bold text-ink text-xs line-clamp-2">
                                  {ch.title}
                                </h4>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Selected Chapter Full Content */}
                        {currentChapter && (
                          <div className="rounded-2xl border border-line bg-card p-6 shadow-xs space-y-6">
                            <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                                  Module {currentChapter.chapterNumber || activeChapterIndex + 1}
                                </span>
                                <h3 className="text-xl font-black text-ink mt-1">
                                  {currentChapter.title}
                                </h3>
                              </div>
                              <span className="text-xs text-muted-foreground self-start sm:self-auto bg-muted px-2.5 py-1 rounded-full font-mono">
                                Temps de lecture estimé : {currentChapter.readingMinutes || 25} min
                              </span>
                            </div>

                            {/* 1. Théorie Fondamentale & Modèle Mental */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-bold text-accent flex items-center gap-2">
                                <Lightbulb className="h-4 w-4" />
                                1. Théorie Fondamentale & Modèle Mental
                              </h4>
                              <div className="text-sm text-ink leading-relaxed space-y-3 whitespace-pre-wrap rounded-xl border border-line bg-muted/20 p-5">
                                {currentChapter.theoreticalFoundation ||
                                  currentChapter.theoryContent}
                              </div>
                            </div>

                            {/* 2. Architecture Technique & Patterns Éprouvés */}
                            {currentChapter.architecturalPatterns && (
                              <div className="space-y-3">
                                <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                  <Layers className="h-4 w-4" />
                                  2. Architecture Technique & Structure de Projet
                                </h4>
                                <div className="text-sm text-ink leading-relaxed space-y-2 whitespace-pre-wrap rounded-xl border border-line bg-card p-5">
                                  {currentChapter.architecturalPatterns}
                                </div>
                              </div>
                            )}

                            {/* 3. Implémentation & Code Complet Commenté */}
                            {(currentChapter.codeImplementation ||
                              currentChapter.concreteExamples) && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    3. Implémentation Réelle & Code Complet Commenté
                                  </h4>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        currentChapter.codeImplementation ||
                                          currentChapter.concreteExamples ||
                                          "",
                                        "Code du Chapitre",
                                      )
                                    }
                                    className="btn-base btn-ghost text-xs inline-flex items-center gap-1"
                                  >
                                    <Copy className="h-3 w-3" /> Copier le code
                                  </button>
                                </div>
                                <pre className="rounded-xl border border-line bg-muted/50 p-5 text-xs font-mono text-ink leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-96">
                                  {currentChapter.codeImplementation ||
                                    currentChapter.concreteExamples}
                                </pre>
                              </div>
                            )}

                            {/* 4. Guide de Collaboration avec l'Agent IA */}
                            {(currentChapter.agentCollaborationGuide ||
                              currentChapter.agentWorkflow) && (
                              <div className="space-y-3">
                                <h4 className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                  <Bot className="h-4 w-4" />
                                  4. Guide de Pilotage de l'Agent IA sur ce Chapitre
                                </h4>
                                <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                                  {currentChapter.agentCollaborationGuide ||
                                    currentChapter.agentWorkflow}
                                </div>
                              </div>
                            )}

                            {/* 5. Atelier Pratique (Lab) */}
                            {(() => {
                              const lab = currentChapter.practicalLab || currentChapter.lab;
                              if (
                                !lab ||
                                (!lab.title && !lab.steps?.length && !lab.instructions?.length)
                              )
                                return null;
                              const stepsList = lab.steps || lab.instructions || [];
                              return (
                                <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 space-y-3">
                                  <div className="flex items-center gap-2 text-accent font-bold text-sm">
                                    <Play className="h-4 w-4" />
                                    <span>
                                      5. Atelier Pratique : {lab.title || "Mise en application"}
                                    </span>
                                  </div>

                                  {lab.objective && (
                                    <p className="text-xs text-ink font-semibold">
                                      <strong>Objectif :</strong> {lab.objective}
                                    </p>
                                  )}

                                  {stepsList.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Étapes de l'atelier :
                                      </span>
                                      <ol className="list-decimal pl-5 space-y-1.5 text-xs text-ink leading-relaxed">
                                        {stepsList.map((step, sIdx) => (
                                          <li key={sIdx}>{step}</li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}

                                  {(lab.validationCriteria || lab.expectedOutcome) && (
                                    <div className="pt-2 text-xs text-muted-foreground">
                                      <strong className="text-ink">Critère de validation :</strong>{" "}
                                      {lab.validationCriteria || lab.expectedOutcome}
                                    </div>
                                  )}

                                  {(lab.solutionWalkthrough || lab.solutionNotes) && (
                                    <details className="pt-2 text-xs">
                                      <summary className="cursor-pointer font-bold text-accent hover:underline">
                                        Consulter les conseils & solution guidée →
                                      </summary>
                                      <div className="mt-2 rounded-lg bg-card p-4 border border-line whitespace-pre-wrap leading-relaxed">
                                        {lab.solutionWalkthrough || lab.solutionNotes}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 6. Quiz Interactif d'Auto-Évaluation */}
                            {currentChapter.quiz && currentChapter.quiz.length > 0 && (
                              <div className="rounded-xl border border-line bg-muted/20 p-5 space-y-4">
                                <div className="flex items-center justify-between border-b border-line pb-3">
                                  <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                                    <HelpCircle className="h-4 w-4 text-accent" />
                                    6. Quiz d'Auto-Évaluation ({currentChapter.quiz.length}{" "}
                                    questions)
                                  </h4>
                                  <span className="text-xs text-muted-foreground">
                                    Testez votre compréhension
                                  </span>
                                </div>

                                <div className="space-y-5">
                                  {currentChapter.quiz.map((q, qIdx) => {
                                    const answeredIdx =
                                      quizAnswers[`${activeChapterIndex}-${qIdx}`];
                                    const isAnswered = answeredIdx !== undefined;
                                    const isCorrect = isAnswered && answeredIdx === q.correctIndex;

                                    return (
                                      <div
                                        key={qIdx}
                                        className="rounded-xl border border-line bg-card p-4 space-y-3"
                                      >
                                        <p className="text-xs sm:text-sm font-bold text-ink">
                                          {qIdx + 1}. {q.question}
                                        </p>

                                        <div className="grid gap-2">
                                          {q.options.map((opt, optIdx) => {
                                            let btnStyle =
                                              "border-line bg-card hover:bg-muted/40 text-ink";
                                            if (isAnswered) {
                                              if (optIdx === q.correctIndex) {
                                                btnStyle =
                                                  "border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-emerald-200 font-bold";
                                              } else if (optIdx === answeredIdx) {
                                                btnStyle =
                                                  "border-rose-500 bg-rose-500/15 text-rose-950 dark:text-rose-200";
                                              } else {
                                                btnStyle =
                                                  "opacity-40 border-line bg-card text-muted-foreground";
                                              }
                                            }

                                            return (
                                              <button
                                                key={optIdx}
                                                disabled={isAnswered}
                                                onClick={() =>
                                                  setQuizAnswers((prev) => ({
                                                    ...prev,
                                                    [`${activeChapterIndex}-${qIdx}`]: optIdx,
                                                  }))
                                                }
                                                className={`rounded-lg border p-3 text-left text-xs transition-all flex items-start gap-2.5 ${btnStyle}`}
                                              >
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[10px] font-bold">
                                                  {String.fromCharCode(65 + optIdx)}
                                                </span>
                                                <span className="leading-relaxed">{opt}</span>
                                              </button>
                                            );
                                          })}
                                        </div>

                                        {/* Feedback & Explanation */}
                                        {isAnswered && (
                                          <div
                                            className={`rounded-lg p-3 text-xs leading-relaxed animate-in fade-in duration-200 ${
                                              isCorrect
                                                ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30"
                                                : "bg-rose-500/10 text-rose-900 dark:text-rose-200 border border-rose-500/30"
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5 font-bold mb-1">
                                              {isCorrect ? (
                                                <>
                                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                  <span>Excellente réponse !</span>
                                                </>
                                              ) : (
                                                <>
                                                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                                                  <span>Réponse inexacte.</span>
                                                </>
                                              )}
                                            </div>
                                            <p>{q.explanation}</p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Chapter pagination */}
                            <div className="flex items-center justify-between pt-4 border-t border-line">
                              <button
                                disabled={activeChapterIndex === 0}
                                onClick={() => {
                                  setActiveChapterIndex((p) => Math.max(0, p - 1));
                                  setQuizAnswers({});
                                }}
                                className="btn-base btn-outline text-xs px-3 py-1.5 disabled:opacity-40"
                              >
                                ← Chapitre Précédent
                              </button>

                              <span className="text-xs text-muted-foreground font-medium">
                                {activeChapterIndex + 1} / {currentCourse.chapters.length}
                              </span>

                              <button
                                disabled={activeChapterIndex === currentCourse.chapters.length - 1}
                                onClick={() => {
                                  setActiveChapterIndex((p) =>
                                    Math.min(currentCourse.chapters.length - 1, p + 1),
                                  );
                                  setQuizAnswers({});
                                }}
                                className="btn-base btn-outline text-xs px-3 py-1.5 disabled:opacity-40"
                              >
                                Chapitre Suivant →
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-2xl border border-line bg-card p-8 text-center space-y-4">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                          <GraduationCap className="h-7 w-7" />
                        </div>
                        <div className="max-w-md mx-auto">
                          <h3 className="text-lg font-bold text-ink">
                            Formation Approfondie en Déploiement
                          </h3>
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                            Le cours complet pour ce skill spécialisé est actuellement en phase de
                            rédaction par notre équipe d'ingénieurs. Les{" "}
                            <strong>7 Skills Socles AI Factory</strong> disposent déjà de leur
                            formation complète multi-chapitres.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <button
                            onClick={() => setActiveTab("pedagogy")}
                            className="btn-base btn-outline text-xs"
                          >
                            Consulter la Fiche Pratique Développeur
                          </button>
                          <button
                            onClick={() => {
                              const orch = AI_SKILLS.find((s) => s.id === "orchestrator");
                              if (orch) handleSelectSkill(orch, "course");
                            }}
                            className="btn-base btn-glow text-xs"
                          >
                            Découvrir le cours Orchestrator →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: AFFECTATION À UN AGENT IA */}
                {activeTab === "agent" && (
                  <div className="space-y-6 pt-2">
                    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 flex items-start gap-3.5">
                      <Bot className="h-6 w-6 text-accent shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-bold text-ink">
                          Comment armer votre assistant IA avec ce skill
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Les modèles de langage (Claude, GPT, Gemini) sont capables de produire du
                          code exceptionnel, à condition d'avoir un cadre strict. Ce prompt système
                          verrouille les hallucinations, interdit les contournements de types et
                          force l'agent à opérer avec la rigueur d'un développeur senior.
                        </p>
                      </div>
                    </div>

                    {/* Detailed System Prompt */}
                    <div className="rounded-2xl border border-line bg-card p-6 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
                        <div>
                          <h4 className="font-bold text-ink text-sm flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-accent" />
                            Prompt Système Complet d'Affectation pour l'Agent
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            À coller dans Cursor (System Prompt / Custom Instructions), Claude Code
                            ou Antigravity.
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            copyToClipboard(
                              selectedSkill.agentAssignment.systemPrompt,
                              "Prompt Système",
                            )
                          }
                          className="btn-base btn-glow text-xs shrink-0 inline-flex items-center gap-1.5"
                        >
                          {copiedSection === "Prompt Système" ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedSection === "Prompt Système"
                            ? "Prompt Copié !"
                            : "Copier en Markdown"}
                        </button>
                      </div>

                      <div className="rounded-xl border border-line bg-muted/40 p-4 text-xs font-mono text-ink leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {selectedSkill.agentAssignment.systemPrompt}
                      </div>
                    </div>

                    {/* Configuration File Snippet (.cursorrules / .agents) */}
                    <div className="rounded-2xl border border-line bg-card p-6 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
                        <div>
                          <h4 className="font-bold text-ink text-sm flex items-center gap-2">
                            <FileCode className="h-4 w-4 text-emerald-500" />
                            Fichier de Règle Cursor (.cursor/rules/{selectedSkill.id}.mdc)
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Règle persistante dans votre dépôt pour que l'agent applique ce skill
                            automatiquement.
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            copyToClipboard(
                              selectedSkill.agentAssignment.agentConfigSnippet,
                              "Règle Cursor (.mdc)",
                            )
                          }
                          className="btn-base btn-outline text-xs shrink-0 inline-flex items-center gap-1.5"
                        >
                          {copiedSection === "Règle Cursor (.mdc)" ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedSection === "Règle Cursor (.mdc)"
                            ? "Règle Copiée !"
                            : "Copier la Règle (.md)"}
                        </button>
                      </div>

                      <div className="rounded-xl border border-line bg-muted/40 p-4 text-xs font-mono text-ink leading-relaxed whitespace-pre-wrap">
                        {selectedSkill.agentAssignment.agentConfigSnippet}
                      </div>
                    </div>

                    {/* Claude Code Command */}
                    <div className="rounded-2xl border border-line bg-card p-5 space-y-2">
                      <h4 className="font-bold text-ink text-xs flex items-center gap-1.5">
                        <Code className="h-3.5 w-3.5 text-accent" />
                        Lancement express en ligne de commande (Claude Code CLI)
                      </h4>
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs text-ink">
                        <span className="truncate">
                          {selectedSkill.agentAssignment.claudeCodeCommand}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              selectedSkill.agentAssignment.claudeCodeCommand,
                              "Commande CLI",
                            )
                          }
                          className="text-accent hover:underline shrink-0 text-xs font-semibold"
                        >
                          {copiedSection === "Commande CLI" ? "Copié !" : "Copier"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>
        </div>
      ) : section === "resources" ? (
        <LearnerResourcesTab />
      ) : (
        <div className="space-y-6">
          {/* Top Bar: Search & Count */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Rechercher parmi les 219 skills (ex: debugging, tdd, react, fastify, agent-browser)..."
                className="w-full rounded-xl border border-line bg-card pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-muted-foreground focus:border-accent focus:outline-none shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-ink"
                >
                  Effacer
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground px-2">
              <span className="rounded-full bg-accent/15 px-3 py-1 text-accent font-bold">
                {filteredSkills.length} skills disponibles
              </span>
            </div>
          </div>

          {/* Categories Pill Bar */}
          <div className="flex flex-wrap gap-1.5 border-b border-line pb-3">
            {SKILL_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCategoryChange(c.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === c.id
                    ? "bg-ink text-paper shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-ink"
                }`}
                title={c.description}
              >
                {c.label} ({c.count})
              </button>
            ))}
          </div>

          {/* Grid of skills */}
          {!filteredSkills.length ? (
            <Empty
              title="Aucun skill correspondant"
              text={`Aucun résultat pour « ${searchQuery} » dans cette catégorie. Essayez un autre mot-clé.`}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedSkills.map((skill) => {
                const hasCourse = !!getCourseForSkill(skill.id);
                const lot1 = !!getLotCourse(skill.id);
                return (
                  <div
                    key={skill.id}
                    onClick={() => handleSelectSkill(skill, hasCourse ? "course" : "pedagogy")}
                    className={`group rounded-2xl border bg-card p-5 hover:border-accent/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                      hasCourse ? "border-accent/30 shadow-xs ring-1 ring-accent/10" : "border-line"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                          {skill.categoryLabel}
                        </span>
                        {lot1 ? (
                          <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" /> Cours
                          </span>
                        ) : hasCourse ? (
                          <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" /> Cours Complet
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-muted-foreground group-hover:text-accent transition-colors">
                            {skill.id}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 font-bold text-ink text-sm sm:text-base line-clamp-1 group-hover:text-accent transition-colors">
                        {skill.name}
                      </h3>

                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {skill.shortDescription}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs">
                      <span className="font-semibold text-accent group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                        {hasCourse ? "Suivre le Cours Complet →" : "Fiche Pratique & Prompt →"}
                      </span>
                      <Link
                        to="/app/ressources/skills/$skillSlug"
                        params={{ skillSlug: skill.id }}
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-accent p-0.5 rounded"
                        title={`Lien permanent : /ressources/skills/${skill.id}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="text-xs text-muted-foreground">
                Page {currentPage} sur {totalPages} ({filteredSkills.length} skills au total)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="btn-base btn-outline text-xs px-3 py-1 disabled:opacity-40"
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1 text-xs">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-7 w-7 rounded-lg text-xs font-semibold ${
                          currentPage === pageNum
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-muted-foreground">…</span>}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="btn-base btn-outline text-xs px-3 py-1 disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Lot1Sections({
  skill,
  course,
  onDownload,
}: {
  skill: AiSkill;
  course: LotCourse;
  onDownload: () => void;
}) {
  const [labOpen, setLabOpen] = useState(false);
  return (
    <div className="space-y-6 pt-2">
      {/* SECTION 1 : COURS — titre du skill + rédaction complète */}
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-7 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-line bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
            {skill.id}
          </span>
        </div>
        <h2 className="mt-3 text-xl sm:text-2xl font-black tracking-tight text-ink">
          {skill.name}
        </h2>
        {course.note && (
          <p className="mt-1 text-sm text-accent font-semibold">
            {course.note.replace(/^\(|\)$/g, "")}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Lis d'abord ce cours en entier : il explique la méthode, quand l'appliquer, un exemple
          concret et les pièges à éviter. Ensuite, entraîne-toi avec l'agent ci-dessous.
        </p>
        <div className="mt-4">
          <Markdown>{course.body}</Markdown>
        </div>
      </div>

      {/* SECTION 2 : TÉLÉCHARGEMENT + AGENT LIVE */}
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="font-bold text-ink text-sm sm:text-base">Récupérer et pratiquer</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-3xl">
            Deux façons d'utiliser ce skill dès maintenant. Le fichier{" "}
            <span className="font-mono">.md</span> s'installe dans tes outils (Cursor, Claude Code,
            Copilot…) ; le bouton de test ouvre l'agent qui applique la méthode en direct.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-card p-4 flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent border border-accent/20">
              <DownloadIcon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink">1. Télécharge le skill</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Le fichier <span className="font-mono">{skill.id}.md</span> contient toute la
                méthode, prête à copier dans ton agent.
              </p>
              <button
                onClick={onDownload}
                className="btn-base btn-outline text-xs mt-2 inline-flex items-center gap-1.5"
              >
                <DownloadIcon size={13} /> Télécharger (.md)
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-card p-4 flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent border border-accent/20">
              <Flask size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink">2. Teste le skill en live</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                L'agent s'ouvre dans un panneau latéral : décris ton besoin, il produit le livrable
                sous tes yeux.
              </p>
              <button
                onClick={() => setLabOpen(true)}
                className="btn-base btn-glow text-xs mt-2 inline-flex items-center gap-1.5"
              >
                <Flask size={13} /> Tester ce skill
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Panel latéral droit : agent live (comme le coach) */}
      <Sheet open={labOpen} onOpenChange={setLabOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl"
        >
          <SheetHeader className="border-b border-line px-5 py-4 text-left shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Flask size={17} className="text-accent" /> Tester : {skill.name}
            </SheetTitle>
            <SheetDescription>
              L'agent lit le skill <span className="font-mono">{skill.id}.md</span> et produit en
              direct. Décris un besoin réel, vérifie la production, copie-la ou télécharge-la.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {labOpen && (
              <SkillLab
                skillId={skill.id}
                skillName={skill.name}
                skillMd={skill.fullMarkdownSource}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
