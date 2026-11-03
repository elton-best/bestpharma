import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Code } from "reicon-react";
import { Filter } from "lucide-react";
import { appHead, PageHeader, Panel } from "@/components/app/AppShell";
import { modules } from "@/data/course";

const PracticeStudio = lazy(() => import("@/components/app/PracticeStudio"));

export const Route = createFileRoute("/app/pratique")({
  validateSearch: z.object({
    exercise: z.string().optional(),
    module: z.string().optional(),
  }),
  head: appHead(
    "Pratique & Studio d'ingénierie",
    "Ateliers guidés et studio interactif pour spécifier, architecturer et tester.",
  ),
  component: Page,
});

export type Workshop = {
  id: string;
  title: string;
  lvl: string;
  time: string;
  task: string;
  initialFiles: Record<string, string>;
  /** Rattachement au cours : renseigné pour les exercices issus des modules */
  moduleId?: string;
  moduleTitle?: string;
  exerciseId?: string;
  kind?: "theorie" | "pratique";
};

const WORKSHOPS: Workshop[] = [
  {
    id: "spec-reservation",
    title: "Rédiger la SPEC d'une page de réservation",
    lvl: "Spec",
    time: "30 min",
    task: "Rédigez une spécification exhaustive, testable et non-ambiguë pour un flux de réservation de session de mentorat.",
    initialFiles: {
      "SPEC.md": `# Spécification : Réservation de session mentorat\n\n## 1. Contexte & Objectif\nL'apprenant doit pouvoir sélectionner un créneau disponible, renseigner son besoin et confirmer sa réservation.\n\n## 2. Comportements observables (Testables)\n- [ ] L'utilisateur voit le calendrier des 7 prochains jours ouvrés.\n- [ ] Le clic sur un créneau disponible affiche le formulaire de confirmation.\n- [ ] La validation sans email affiche un message d'erreur : « Email requis ».\n- [ ] La validation réussie affiche un reçu avec numéro de confirmation unique.\n\n## 3. Checklist "Done"\n- [ ] Tests unitaires de validation du formulaire verts\n- [ ] État de chargement géré\n- [ ] Déployé sur l'environnement de staging\n`,
      "PLAN.md": `# Découpage technique (Plan)\n\n- [ ] Tâche 1 : Composant Sélecteur de créneaux (mock data)\n- [ ] Tâche 2 : Formulaire de confirmation et validation Zod\n- [ ] Tâche 3 : Intégration API de réservation et gestion d'erreurs\n`,
      "README.md": `# Projet Réservation AIFAC\nArchitecture minimale pour tester la spécification.\n`,
    },
  },
  {
    id: "plan-dashboard",
    title: "Découper un dashboard en 8 tâches ordonnées",
    lvl: "Plan",
    time: "20 min",
    task: "Transformez une spécification de dashboard apprenant en 8 tâches atomiques et ordonnées vers la livraison.",
    initialFiles: {
      "PLAN.md": `# Plan d'exécution Dashboard\n\n- [ ] Tâche 1 : Initialisation de la route et du layout AppShell\n- [ ] Tâche 2 : Carte statistiques de progression (leçons terminées)\n- [ ] Tâche 3 : Graphique d'activité hebdomadaire\n- [ ] Tâche 4 : File des rendus récents et badges de statut\n`,
      "SPEC.md": `# Spec de référence Dashboard\nL'apprenant accède à son tableau de bord affichant ses statistiques clés et ses prochains modules.\n`,
    },
  },
  {
    id: "architecture-data",
    title: "Architecture de composants & Contrats de données",
    lvl: "Build",
    time: "35 min",
    task: "Définissez la structure des dossiers, les types TypeScript et les contrats d'API pour un système d'exercices interactifs.",
    initialFiles: {
      "ARCHITECTURE.md": `# Architecture Système\n\n## Structure des dossiers\nsrc/\n├── components/exercises/\n│   ├── ExerciseRunner.tsx\n│   ├── QcmViewer.tsx\n│   └── ProjectUploader.tsx\n└── types/\n    └── exercise.ts\n`,
      "TYPES.ts": `export type ExerciseKind = "qcm" | "projet" | "open";\n\nexport interface ExerciseContract {\n  id: string;\n  title: string;\n  points: number;\n}\n`,
    },
  },
];

function getDynamicWorkshops(): Workshop[] {
  const list: Workshop[] = [...WORKSHOPS];

  modules.forEach((m) => {
    if (m.exercises) {
      m.exercises.forEach((ex) => {
        if (!list.some((w) => w.id === ex.id)) {
          list.push({
            id: ex.id,
            title: ex.title,
            lvl: m.step,
            time: ex.kind === "theorie" ? "15 min" : "30 min",
            task: ex.instructions,
            moduleId: m.id,
            moduleTitle: `${m.step} — ${m.title}`,
            exerciseId: ex.id,
            kind: ex.kind === "theorie" ? "theorie" : "pratique",
            initialFiles: {
              "EXERCICE.md": `# Exercice : ${ex.title}\n\n**Module** : ${m.step} — ${m.title}\n\n## Instructions\n${ex.instructions}\n`,
              "REPONSE.md": `# Votre Solution / Réponse\n\nRédigez votre réponse détaillée ou collez vos snippets / liens ici...\n`,
              "SPEC.md": `# SPEC : ${ex.title}\n\n## 1. Périmètre & Exigences\n- [ ] Critère d'acceptation 1\n- [ ] Critère d'acceptation 2\n`,
            },
          });
        }
      });
    }
  });

  return list;
}

const CATEGORIES = ["Tous", "Socle", "Spec", "Plan", "Build", "Review", "Deliver"];

function Page() {
  const search = Route.useSearch();
  const allWorkshops = useMemo(() => getDynamicWorkshops(), []);

  const [selectedCategory, setSelectedCategory] = useState<string>(search.module || "Tous");
  const [activeWorkshop, setActiveWorkshop] = useState<Workshop | null>(() => {
    if (search.exercise) {
      return allWorkshops.find((w) => w.id === search.exercise) || null;
    }
    return null;
  });

  useEffect(() => {
    if (search.exercise) {
      const found = allWorkshops.find((w) => w.id === search.exercise);
      if (found) setActiveWorkshop(found);
    }
  }, [search.exercise]);

  // Exercices déjà soumis à la correction (marqueur local, posé après envoi D1)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const ids = new Set<string>();
      allWorkshops.forEach((w) => {
        if (localStorage.getItem(`aifac_studio_submitted_${w.id}`)) ids.add(w.id);
      });
      setSubmittedIds(ids);
    } catch {
      /* localStorage indisponible */
    }
  }, [activeWorkshop]);

  const filteredWorkshops = allWorkshops.filter((w) => {
    if (selectedCategory === "Tous") return true;
    return w.lvl.toLowerCase() === selectedCategory.toLowerCase();
  });

  if (!activeWorkshop) {
    return (
      <>
        <PageHeader
          eyebrow="Pratique interactive"
          title="Studio d'exercices & ateliers de tous les modules"
          subtitle="Tous les exercices de chaque module sont réunis ici dans le Studio Pratique. Rédigez vos réponses et specs markdown, faites-les auditer par l'IA et soumettez-les au correcteur."
        />

        {/* Filtres par Module / Catégorie */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 mr-2">
            <Filter size={14} className="text-accent" /> Module :
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-accent text-white border-accent shadow-xs"
                  : "bg-card text-ink border-line hover:border-accent/40"
              }`}
            >
              {cat === "Tous" ? "Tous les modules" : cat}
            </button>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkshops.map((w) => (
            <Panel key={w.id} className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-accent px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                    {w.lvl} · {w.time}
                  </span>
                  {submittedIds.has(w.id) ? (
                    <span className="text-[11px] font-bold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      ✓ Soumis
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      {w.kind === "theorie"
                        ? "Théorie"
                        : w.kind === "pratique"
                          ? "Pratique"
                          : "Studio interactif"}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-bold text-ink text-base">{w.title}</h3>
                {w.moduleTitle && (
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground truncate">
                    Rattaché au cours : {w.moduleTitle}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-4">
                  {w.task}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveWorkshop(w)}
                className="btn-base btn-glow mt-5 w-full flex items-center justify-center gap-2 text-xs"
              >
                <Code className="h-4 w-4" /> Ouvrir l'exercice dans le Studio
              </button>
            </Panel>
          ))}
        </div>
      </>
    );
  }

  return (
    <Suspense fallback={<StudioSkeleton />}>
      <PracticeStudio workshop={activeWorkshop} onBack={() => setActiveWorkshop(null)} />
    </Suspense>
  );
}


function StudioSkeleton() {
  return (
    <div className="space-y-4" aria-label="Chargement du studio">
      <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
      <div className="h-[70dvh] animate-pulse rounded-2xl border border-line bg-card" />
    </div>
  );
}
