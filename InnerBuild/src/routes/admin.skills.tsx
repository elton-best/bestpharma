import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  Check,
  Code,
  Compass,
  Copy,
  Database,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  Filter,
  Layers,
  Library,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/heroui-toast";
import { Download as DownloadIcon, Flask } from "reicon-react";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { MarkdownToolbar } from "@/components/ui/markdown-toolbar";
import { Markdown } from "@/components/app/AiChat";
import {
  d1DeleteServerFn,
  d1InsertServerFn,
  d1ListServerFn,
  d1UpdateServerFn,
} from "@/lib/d1-data.functions";
import { logAudit } from "@/lib/admin";
import { AI_SKILLS, SKILL_CATEGORIES, type AiSkill } from "@/data/skills";
import { useAdminSkillExercises, useSkillExerciseMutations } from "@/lib/skill-exercises";
import { getLotCourse, lotCourseCount } from "@/data/lot-courses";
import { SkillLab } from "@/components/app/SkillLab";

export const Route = createFileRoute("/admin/skills")({
  head: appHead(
    "Gestion des Skills & Modèles",
    "Registre complet des 219 skills et modèles diffusés aux apprenants.",
  ),
  component: AdminSkillsPage,
});

export type CustomSkillItem = {
  id: string;
  title: string;
  category: "skill" | "modele" | "prompt" | "guide";
  description: string;
  content_markdown: string;
  tags: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
};

const DB_CATEGORIES = [
  { id: "all", label: "Tous" },
  { id: "skill", label: "Skills IA & Code" },
  { id: "modele", label: "Modèles & Specs" },
  { id: "prompt", label: "Prompts avancés" },
  { id: "guide", label: "Guides & Checklists" },
] as const;

function AdminSkillsPage() {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<"code_skills" | "db_templates">("code_skills");

  // Code skills state
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<AiSkill | null>(null);
  const [skillTab, setSkillTab] = useState<
    "pedagogy" | "agent" | "markdown" | "exercices" | "apercu"
  >("pedagogy");
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [codePage, setCodePage] = useState(1);
  const [coverage, setCoverage] = useState<"all" | "course" | "no_course" | "exos" | "no_exos">(
    "all",
  );
  const PAGE_SIZE = 18;

  // DB templates state
  const [dbFilter, setDbFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<CustomSkillItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: dbSkills = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["skills_templates"],
    queryFn: async () => {
      const res = await d1ListServerFn({
        data: { table: "skills_templates", orderBy: "created_at", orderDir: "DESC", limit: 500 },
      });
      if (!res.success) throw new Error(res.error || "D1");
      return ((res.rows || []) as any[]).map((r) => ({
        ...r,
        tags:
          typeof r.tags === "string"
            ? (() => {
                try {
                  const v = JSON.parse(r.tags);
                  return Array.isArray(v) ? v : [];
                } catch {
                  return [];
                }
              })()
            : (r.tags ?? []),
        published: r.published === 1 || r.published === true,
      })) as CustomSkillItem[];
    },
  });

  // Synchro exercices : une seule requête, comptage par skill, pour savoir
  // d'un coup d'œil quelles skills sont déjà outillées côté apprenant.
  const { data: exerciseCounts = {} } = useQuery({
    queryKey: ["skill-exercise-counts"],
    queryFn: async () => {
      const res = await d1ListServerFn({
        data: { table: "skill_exercises", orderBy: "skill_id", orderDir: "ASC", limit: 500 },
      });
      const map: Record<string, { total: number; published: number }> = {};
      for (const r of (res.rows || []) as any[]) {
        const key = String(r.skill_id);
        map[key] ??= { total: 0, published: 0 };
        map[key].total += 1;
        if (r.published === 1 || r.published === true) map[key].published += 1;
      }
      return map;
    },
  });

  const coverageStats = useMemo(() => {
    let withCourse = 0;
    let withExos = 0;
    for (const s of AI_SKILLS) {
      if (getLotCourse(s.id)) withCourse += 1;
      if (exerciseCounts[s.id]?.total) withExos += 1;
    }
    return { withCourse, withExos, total: AI_SKILLS.length };
  }, [exerciseCounts]);

  const filteredCodeSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return AI_SKILLS.filter((s) => {
      const matchCat = selectedCat === "all" || s.category === selectedCat;
      if (!matchCat) return false;
      if (coverage !== "all") {
        const hasCourse = !!getLotCourse(s.id);
        const nbExos = exerciseCounts[s.id]?.total ?? 0;
        if (coverage === "course" && !hasCourse) return false;
        if (coverage === "no_course" && hasCourse) return false;
        if (coverage === "exos" && nbExos === 0) return false;
        if (coverage === "no_exos" && nbExos > 0) return false;
      }
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.shortDescription.toLowerCase().includes(q) ||
        s.pedagogy.conceptExplanation.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [selectedCat, searchQuery, coverage, exerciseCounts]);

  const totalPages = Math.ceil(filteredCodeSkills.length / PAGE_SIZE) || 1;
  const paginatedCodeSkills = useMemo(() => {
    const start = (codePage - 1) * PAGE_SIZE;
    return filteredCodeSkills.slice(start, start + PAGE_SIZE);
  }, [filteredCodeSkills, codePage]);

  const filteredDbSkills =
    dbFilter === "all" ? dbSkills : dbSkills.filter((s) => s.category === dbFilter);

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    toast.success(`${label} copié dans le presse-papier !`);
    setTimeout(() => setCopiedLabel(null), 2500);
  }

  function deleteDbSkill(item: CustomSkillItem) {
    const toastId = toast(`Supprimer « ${item.title} » ?`, {
      description: "Cette action retirera ce modèle pour tous les apprenants.",
      variant: "danger",
      timeout: 10000,
      actionProps: {
        children: "Confirmer la suppression",
        variant: "danger",
        onClick: async () => {
          toast.close(toastId);
          const res = await d1DeleteServerFn({ data: { table: "skills_templates", id: item.id } });
          if (!res.success) {
            toast.danger("Erreur lors de la suppression : " + (res.error || "D1"));
          } else {
            toast.success("Skill supprimé avec succès");
            await logAudit("Skill supprimé", item.id, `Suppression de « ${item.title} »`);
            qc.invalidateQueries({ queryKey: ["skills_templates"] });
          }
        },
      },
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Gouvernance & Référentiel"
        title="Arsenal des Skills & Modèles"
        subtitle={`Registre stocké directement en code : ${AI_SKILLS.length} skills actives, ${lotCourseCount()} cours rédigés et synchronisés avec l'espace apprenant. Sélectionne une skill pour créer ses exercices.`}
        action={
          viewMode === "db_templates" && !isCreating && !editingItem ? (
            <button
              onClick={() => {
                setIsCreating(true);
                setEditingItem(null);
              }}
              className="btn-base btn-glow flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Nouveau Modèle Personnalisé
            </button>
          ) : undefined
        }
      />

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setViewMode("code_skills");
              setSelectedSkill(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              viewMode === "code_skills"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "border border-line bg-card text-muted-foreground hover:text-ink"
            }`}
          >
            <FileCode className="h-4 w-4" />
            Skills Natifs dans le Code ({AI_SKILLS.length})
            <span className="rounded-full bg-paper/20 px-2 py-0.5 text-[10px]">Zero DB</span>
          </button>

          <button
            onClick={() => {
              setViewMode("db_templates");
              setSelectedSkill(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              viewMode === "db_templates"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "border border-line bg-card text-muted-foreground hover:text-ink"
            }`}
          >
            <Database className="h-4 w-4" />
            Modèles Dynamiques en Base ({dbSkills.length})
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          Total combiné :{" "}
          <strong className="text-ink">{AI_SKILLS.length + dbSkills.length} compétences</strong>
        </span>
      </div>

      {/* VIEW 1: 219 CODE SKILLS */}
      {viewMode === "code_skills" && (
        <>
          {selectedSkill ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="btn-base btn-ghost text-xs inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Retour à la liste (
                  {filteredCodeSkills.length})
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      copyText(selectedSkill.agentAssignment.systemPrompt, "Prompt Agent (.md)")
                    }
                    className="btn-base btn-outline text-xs inline-flex items-center gap-1.5"
                  >
                    {copiedLabel === "Prompt Agent (.md)" ? (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                    {copiedLabel === "Prompt Agent (.md)" ? "Copié !" : "Copier Prompt Agent (.md)"}
                  </button>
                  <button
                    onClick={() => copyText(selectedSkill.fullMarkdownSource, "Fichier SKILL.md")}
                    className="btn-base btn-glow text-xs inline-flex items-center gap-1.5"
                  >
                    {copiedLabel === "Fichier SKILL.md" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedLabel === "Fichier SKILL.md" ? "Copié !" : "Copier le Skill (.md)"}
                  </button>
                </div>
              </div>

              <Panel>
                <div className="border-b border-line pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">
                      {selectedSkill.categoryLabel}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      slug: {selectedSkill.id}
                    </span>
                    <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5">
                      ✓ Actif en Code
                    </span>
                  </div>

                  <h1 className="mt-3 text-2xl font-black text-ink">{selectedSkill.name}</h1>
                  <p className="mt-1 text-xs text-accent font-semibold">
                    {selectedSkill.categoryTagline}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedSkill.shortDescription}
                  </p>
                </div>

                {/* Sub-tabs */}
                <div className="mt-4 flex border-b border-line">
                  <button
                    onClick={() => setSkillTab("pedagogy")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold ${
                      skillTab === "pedagogy"
                        ? "border-accent text-accent"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    <Compass className="h-4 w-4" /> Fiche Pratique Développeur
                  </button>
                  <button
                    onClick={() => setSkillTab("agent")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold ${
                      skillTab === "agent"
                        ? "border-accent text-accent"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    <Bot className="h-4 w-4" /> Affectation Agent IA
                  </button>
                  <button
                    onClick={() => setSkillTab("exercices")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold ${
                      skillTab === "exercices"
                        ? "border-accent text-accent"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    <BookOpen className="h-4 w-4" /> Exercices
                  </button>
                  {getLotCourse(selectedSkill.id) && (
                    <button
                      onClick={() => setSkillTab("apercu")}
                      className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold ${
                        skillTab === "apercu"
                          ? "border-accent text-accent"
                          : "border-transparent text-muted-foreground"
                      }`}
                    >
                      <Eye className="h-4 w-4" /> Aperçu Cours + Lab
                    </button>
                  )}
                </div>

                {skillTab === "pedagogy" && (
                  <div className="mt-6 space-y-5">
                    <div className="rounded-xl border border-line bg-card p-5">
                      <strong className="text-xs text-accent uppercase tracking-wider font-bold">
                        1. Ce que c'est & Fondements
                      </strong>
                      <p className="mt-2 text-sm text-ink leading-relaxed whitespace-pre-wrap">
                        {selectedSkill.pedagogy.conceptExplanation}
                      </p>
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                      <strong className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider font-bold">
                        2. Ce à quoi le développeur fait face (Le Problème & Les Pièges)
                      </strong>
                      <p className="mt-2 text-sm text-ink leading-relaxed whitespace-pre-wrap">
                        {selectedSkill.pedagogy.challengesFaced}
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                      <strong className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-bold">
                        3. Ce que ce Skill change (Vos Superpouvoirs)
                      </strong>
                      <p className="mt-2 text-sm text-ink leading-relaxed whitespace-pre-wrap">
                        {selectedSkill.pedagogy.superpowers}
                      </p>
                    </div>

                    <div className="rounded-xl border border-line bg-card p-5 space-y-3">
                      <strong className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold">
                        4. Protocole d'Exécution pas-à-pas
                      </strong>
                      <div className="grid gap-3 sm:grid-cols-2 mt-2">
                        {selectedSkill.pedagogy.protocolSteps.map((step) => (
                          <div
                            key={step.step}
                            className="rounded-lg border border-line bg-muted/20 p-3"
                          >
                            <span className="font-bold text-xs text-accent">
                              Étape {step.step} : {step.title}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {skillTab === "agent" && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-ink">
                          Prompt Système Prêt pour Agent IA
                        </span>
                        <button
                          onClick={() =>
                            copyText(selectedSkill.agentAssignment.systemPrompt, "Prompt Agent")
                          }
                          className="btn-base btn-ghost text-xs inline-flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" /> Copier en Markdown
                        </button>
                      </div>
                      <pre className="rounded-xl border border-line bg-muted/40 p-4 text-xs font-mono text-ink overflow-x-auto whitespace-pre-wrap max-h-72">
                        {selectedSkill.agentAssignment.systemPrompt}
                      </pre>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-ink">
                          Snippet de Configuration (.cursorrules / .agents)
                        </span>
                        <button
                          onClick={() =>
                            copyText(
                              selectedSkill.agentAssignment.agentConfigSnippet,
                              "Config Snippet",
                            )
                          }
                          className="btn-base btn-ghost text-xs inline-flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" /> Copier
                        </button>
                      </div>
                      <pre className="rounded-xl border border-line bg-muted/40 p-4 text-xs font-mono text-ink overflow-x-auto whitespace-pre-wrap">
                        {selectedSkill.agentAssignment.agentConfigSnippet}
                      </pre>
                    </div>
                  </div>
                )}

                {skillTab === "exercices" && (
                  <SkillExercisesAdmin skillId={selectedSkill.id} skillName={selectedSkill.name} />
                )}

                {skillTab === "apercu" && getLotCourse(selectedSkill.id) && (
                  <SkillCoursePreview skill={selectedSkill} courseId={selectedSkill.id} />
                )}
              </Panel>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCodePage(1);
                    }}
                    placeholder={`Filtrer parmi les ${AI_SKILLS.length} skills (nom, slug, description, tags)...`}
                    className="w-full rounded-xl border border-line bg-card pl-10 pr-4 py-2 text-xs text-ink placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-1.5 border-b border-line pb-3">
                {SKILL_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCat(c.id);
                      setCodePage(1);
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      selectedCat === c.id
                        ? "bg-ink text-paper"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {c.label} ({c.count})
                  </button>
                ))}
              </div>

              {/* Couverture : cours rédigés et exercices créés */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Couverture
                </span>
                {(
                  [
                    { id: "all", label: `Toutes (${coverageStats.total})` },
                    { id: "course", label: `Cours rédigé (${coverageStats.withCourse})` },
                    {
                      id: "no_course",
                      label: `Sans cours (${coverageStats.total - coverageStats.withCourse})`,
                    },
                    { id: "exos", label: `Avec exercices (${coverageStats.withExos})` },
                    {
                      id: "no_exos",
                      label: `Sans exercice (${coverageStats.total - coverageStats.withExos})`,
                    },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setCoverage(f.id);
                      setCodePage(1);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      coverage === f.id
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Grid of skills */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedCodeSkills.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSkill(s);
                      setSkillTab("pedagogy");
                    }}
                    className="group rounded-2xl border border-line bg-card p-4 hover:border-accent/50 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                          {s.categoryLabel}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">{s.id}</span>
                      </div>

                      <h3 className="mt-2.5 font-bold text-ink text-sm group-hover:text-accent transition-colors line-clamp-1">
                        {s.name}
                      </h3>

                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {s.shortDescription}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {(() => {
                        const course = getLotCourse(s.id);
                        return course ? (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                            <FileText className="h-3 w-3" /> Cours · lot {course.part}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded border border-line bg-muted/40 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            <FileText className="h-3 w-3" /> Sans cours
                          </span>
                        );
                      })()}
                      {(() => {
                        const n = exerciseCounts[s.id];
                        return n?.total ? (
                          <span className="inline-flex items-center gap-1 rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                            <BookOpen className="h-3 w-3" /> {n.published}/{n.total} exo
                            {n.total > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                            <Plus className="h-3 w-3" /> Exercice à créer
                          </span>
                        );
                      })()}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-xs">
                      <span className="font-semibold text-accent">Fiche Pratique & Prompt →</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Code</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-line pt-4">
                  <span className="text-xs text-muted-foreground">
                    Page {codePage} sur {totalPages} ({filteredCodeSkills.length} skills)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={codePage === 1}
                      onClick={() => setCodePage((p) => Math.max(1, p - 1))}
                      className="btn-base btn-outline text-xs px-3 py-1 disabled:opacity-40"
                    >
                      Précédent
                    </button>
                    <button
                      disabled={codePage === totalPages}
                      onClick={() => setCodePage((p) => Math.min(totalPages, p + 1))}
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
      )}

      {/* VIEW 2: DYNAMIC DATABASE TEMPLATES */}
      {viewMode === "db_templates" && (
        <>
          {isCreating || editingItem ? (
            <SkillEditor
              initial={editingItem}
              onCancel={() => {
                setIsCreating(false);
                setEditingItem(null);
              }}
              onSaved={() => {
                setIsCreating(false);
                setEditingItem(null);
                qc.invalidateQueries({ queryKey: ["skills_templates"] });
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {DB_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setDbFilter(c.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      dbFilter === c.id
                        ? "bg-ink text-paper"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {c.label} (
                    {c.id === "all"
                      ? dbSkills.length
                      : dbSkills.filter((s) => s.category === c.id).length}
                    )
                  </button>
                ))}
              </div>

              <Panel>
                {isLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Chargement des modèles…
                  </p>
                ) : error ? (
                  <p className="text-sm text-destructive p-4">
                    Impossible de charger les ressources.
                  </p>
                ) : !filteredDbSkills.length ? (
                  <Empty
                    title="Aucun modèle en base"
                    text="Clique sur « Nouveau Modèle Personnalisé » pour ajouter un template Markdown dynamique."
                  />
                ) : (
                  <ul className="divide-y divide-line">
                    {filteredDbSkills.map((s) => (
                      <li
                        key={s.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                              {DB_CATEGORIES.find((c) => c.id === s.category)?.label || s.category}
                            </span>
                            <h3 className="font-bold text-ink text-base">{s.title}</h3>
                            {!s.published && (
                              <span className="rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5">
                                Brouillon
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {s.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setEditingItem(s);
                              setIsCreating(false);
                            }}
                            className="btn-base btn-ghost text-xs"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => deleteDbSkill(s)}
                            className="btn-base btn-ghost text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          )}
        </>
      )}
    </>
  );
}

function SkillEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial: CustomSkillItem | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<CustomSkillItem["category"]>(
    initial?.category ?? "skill",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tagsStr, setTagsStr] = useState(initial?.tags?.join(", ") ?? "");
  const [contentMarkdown, setContentMarkdown] = useState(initial?.content_markdown ?? "");
  const [published, setPublished] = useState(initial?.published ?? true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      toast.danger("Veuillez saisir un titre pour la ressource.");
      return;
    }
    if (!contentMarkdown.trim()) {
      toast.danger("Veuillez saisir le contenu Markdown.");
      return;
    }

    setSaving(true);
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      if (initial?.id) {
        const res = await d1UpdateServerFn({
          data: {
            table: "skills_templates",
            id: initial.id,
            patch: {
              title: title.trim(),
              category,
              description: description.trim(),
              tags: JSON.stringify(tags),
              content_markdown: contentMarkdown,
              published: published ? 1 : 0,
              updated_at: new Date().toISOString(),
            },
          },
        });

        if (!res.success) throw new Error(res.error || "D1");
        toast.success("Modèle mis à jour avec succès !");
        await logAudit("Skill modifié", initial.id, `Mise à jour de « ${title} »`);
      } else {
        const res = await d1InsertServerFn({
          data: {
            table: "skills_templates",
            row: {
              title: title.trim(),
              category,
              description: description.trim(),
              tags: JSON.stringify(tags),
              content_markdown: contentMarkdown,
              published: published ? 1 : 0,
            },
          },
        });

        if (!res.success) throw new Error(res.error || "D1");
        toast.success("Nouveau modèle publié avec succès !");
        await logAudit("Skill créé", title, `Création de « ${title} » (${category})`);
      }
      onSaved();
    } catch (err: any) {
      toast.danger("Erreur lors de l'enregistrement : " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="space-y-6">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <h2 className="text-lg font-bold text-ink">
          {initial ? `Modifier « ${initial.title} »` : "Nouveau modèle / Skill"}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="btn-base btn-ghost text-xs">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-base btn-glow text-xs flex items-center gap-1.5"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {initial ? "Enregistrer les modifications" : "Publier le modèle"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-ink">Titre de la ressource</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Skill TDD & Clean Code"
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-ink">Catégorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          >
            <option value="skill">Skill IA & Code</option>
            <option value="modele">Modèle de CDC / Spec</option>
            <option value="prompt">Prompt expert</option>
            <option value="guide">Guide & Checklist</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-ink">Description courte</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Résumé en une phrase affiché dans les cartes apprenants…"
          className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-ink">Tags (séparés par des virgules)</label>
        <input
          type="text"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="Ex: react, tdd, architecture, cursor"
          className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-ink">Contenu Markdown</label>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
          >
            <Eye className="h-3.5 w-3.5" /> {preview ? "Revenir à l'édition" : "Aperçu en direct"}
          </button>
        </div>

        {!preview ? (
          <div className="space-y-2">
            <MarkdownToolbar textareaId="admin-skill-editor" />
            <textarea
              id="admin-skill-editor"
              rows={16}
              value={contentMarkdown}
              onChange={(e) => setContentMarkdown(e.target.value)}
              placeholder="Rédige ici les directives, les règles d'or, le template ou les prompts..."
              className="w-full rounded-lg border border-line bg-card p-4 font-mono text-xs text-ink placeholder:text-muted-foreground focus:border-accent focus:outline-none leading-relaxed"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-card p-6 min-h-[300px]">
            <Markdown>{contentMarkdown || "*Aucun contenu rédigé pour l'instant.*"}</Markdown>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="rounded border-line text-accent focus:ring-accent"
          />
          Visible par les apprenants (Publié)
        </label>
      </div>
    </Panel>
  );
}

function SkillExercisesAdmin({ skillId, skillName }: { skillId: string; skillName: string }) {
  const { data: list = [], isLoading } = useAdminSkillExercises(skillId);
  const muts = useSkillExerciseMutations(skillId);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!title.trim() || !instructions.trim()) {
      toast.danger("Titre et consigne sont obligatoires.");
      return;
    }
    setBusy(true);
    try {
      await muts.insert.mutateAsync({ title, instructions });
      setTitle("");
      setInstructions("");
      toast.success("Exercice publié pour les apprenants");
      await logAudit("Exercice skill créé", skillId, `« ${title} » (${skillName})`);
    } catch (e: any) {
      toast.danger("Enregistrement impossible : " + (e.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: { id: string; title: string; instructions: string }) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditInstructions(item.instructions);
  }

  async function saveEdit(id: string, published: boolean) {
    if (!editTitle.trim() || !editInstructions.trim()) {
      toast.danger("Titre et consigne sont obligatoires.");
      return;
    }
    try {
      await muts.update.mutateAsync({
        id,
        title: editTitle,
        instructions: editInstructions,
        published,
      });
      setEditingId(null);
      toast.success("Exercice mis à jour");
    } catch (e: any) {
      toast.danger("Enregistrement impossible : " + (e.message || String(e)));
    }
  }

  async function togglePublish(item: {
    id: string;
    title: string;
    instructions: string;
    published: boolean;
  }) {
    try {
      await muts.update.mutateAsync({
        id: item.id,
        title: item.title,
        instructions: item.instructions,
        published: !item.published,
      });
      toast.success(item.published ? "Exercice dépublié" : "Exercice publié");
    } catch (e: any) {
      toast.danger("Action impossible : " + (e.message || String(e)));
    }
  }

  async function remove(item: { id: string; title: string }) {
    const toastId = toast(`Supprimer l'exercice « ${item.title} » ?`, {
      description: "Les apprenants ne le verront plus dans le cours du skill.",
      variant: "danger",
      timeout: 10000,
      actionProps: {
        children: "Confirmer la suppression",
        variant: "danger",
        onClick: async () => {
          toast.close(toastId);
          try {
            await muts.remove.mutateAsync(item.id);
            toast.success("Exercice supprimé");
            await logAudit("Exercice skill supprimé", skillId, `« ${item.title} » (${skillName})`);
          } catch (e: any) {
            toast.danger("Suppression impossible : " + (e.message || String(e)));
          }
        },
      },
    });
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Les exercices créés ici apparaissent dans l'onglet{" "}
          <strong className="text-ink">Cours</strong> du skill côté apprenant. L'apprenant envoie
          son travail via <strong className="text-ink">Rendus</strong> et il est corrigé dans le
          circuit habituel.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-card p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ink">Nouvel exercice</p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de l'exercice *"
          className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
        <textarea
          rows={5}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Consigne détaillée : contexte, livrable attendu, critères de validation… *"
          className="w-full rounded-lg border border-line bg-card p-3 text-xs text-ink placeholder:text-muted-foreground focus:border-accent focus:outline-none leading-relaxed"
        />
        <button
          onClick={create}
          disabled={busy}
          className="btn-base btn-glow text-xs disabled:opacity-50"
        >
          {busy ? "Publication en cours…" : "Publier l'exercice"}
        </button>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-ink">
          Exercices du skill ({list.length})
        </p>
        {isLoading ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </p>
        ) : !list.length ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun exercice. Crée le premier ci-dessus.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {list.map((x) => (
              <li key={x.id} className="py-3">
                {editingId === x.id ? (
                  <div className="space-y-2">
                    <input
                      aria-label="Titre"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                    />
                    <textarea
                      aria-label="Consigne"
                      rows={4}
                      value={editInstructions}
                      onChange={(e) => setEditInstructions(e.target.value)}
                      className="w-full rounded-lg border border-line bg-card p-3 text-xs text-ink focus:border-accent focus:outline-none leading-relaxed"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(x.id, x.published)}
                        className="btn-base btn-glow text-xs"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-base btn-ghost text-xs"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink text-sm">{x.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {x.instructions}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!x.published && (
                        <span className="rounded bg-amber-500/15 text-amber-600 text-[10px] font-bold px-2 py-0.5">
                          Brouillon
                        </span>
                      )}
                      <button onClick={() => startEdit(x)} className="btn-base btn-ghost text-xs">
                        Modifier
                      </button>
                      <button
                        onClick={() => togglePublish(x)}
                        className="btn-base btn-ghost text-xs"
                      >
                        {x.published ? "Dépublier" : "Publier"}
                      </button>
                      <button
                        onClick={() => remove(x)}
                        className="btn-base btn-ghost text-xs text-destructive"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SkillCoursePreview({ skill, courseId }: { skill: AiSkill; courseId: string }) {
  const course = getLotCourse(courseId);
  if (!course) return null;

  function download() {
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

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Aperçu exact de ce que voit l'apprenant dans{" "}
          <strong className="text-ink">Skills & Modèles</strong> pour ce skill : la rédaction du
          cours, le téléchargement du <span className="font-mono">SKILL.md</span> et le lab
          d'entraînement. Teste l'agent ici même avant publication.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-line bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
            {skill.id}
          </span>
          <button
            onClick={download}
            className="btn-base btn-outline text-xs inline-flex items-center gap-1.5 ml-auto"
          >
            <DownloadIcon size={13} /> Télécharger le skill (.md)
          </button>
        </div>
        <h2 className="mt-3 text-xl font-black tracking-tight text-ink">{skill.name}</h2>
        <div className="mt-3">
          <Markdown>{course.body}</Markdown>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Flask size={15} className="text-accent" />
          <h3 className="font-bold text-ink text-sm">Lab d'entraînement — test admin</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Vérifie que l'agent applique bien la méthode de ce skill : décris un besoin réel, contrôle
          la production dans la preview, puis valide le lot.
        </p>
        <SkillLab skillId={skill.id} skillName={skill.name} skillMd={skill.fullMarkdownSource} />
      </div>
    </div>
  );
}
