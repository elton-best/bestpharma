import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Code, Rocket, ShieldCheck, Sparkles, User, Users } from "reicon-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { appHead } from "@/components/app/AppShell";
import { Logo } from "@/components/Logo";
import { d1UpdateServerFn } from "@/lib/d1-data.functions";
import { useProfile } from "@/lib/learner";
import { modules, allLessons } from "@/data/course";

export const Route = createFileRoute("/app/bienvenue")({
  head: appHead("Bienvenue & Onboarding", "Crée ton profil, découvre la méthode Spec → Deliver et démarre ton premier module AIFAC."),
  component: OnboardingPage,
});

const GOALS = [
  {
    title: "Livrer mon premier projet complet",
    desc: "Passer de l'idée au déploiement réel sans bloquer à 80%.",
    badge: "Débutant & Reconversion",
  },
  {
    title: "Livrer plus vite en freelance",
    desc: "Multiplier ma vitesse de dev x3 avec les agents et skills AIFAC.",
    badge: "Indépendant & Agence",
  },
  {
    title: "Mieux travailler en équipe avec l’IA",
    desc: "Standardiser nos specs, nos tests et la qualité de code avec l'IA.",
    badge: "Salarié & Tech Lead",
  },
  {
    title: "Créer et monétiser mes propres SaaS",
    desc: "Concevoir des architectures solides avec base de données et auth.",
    badge: "Solopreneur & Maker",
  },
];

const LEVELS = [
  {
    v: "Débutant",
    d: "Je débute le code ou j'ai moins d'un an d'expérience.",
    detail: "Focus sur les bases solides et la rigueur du Spec.",
  },
  {
    v: "Intermédiaire",
    d: "J’ai déjà développé des projets mais je veux passer au niveau pro.",
    detail: "Focus sur la vitesse, l'automatisation IA et les tests.",
  },
  {
    v: "Avancé",
    d: "Je livre déjà régulièrement en production.",
    detail: "Focus sur l'orchestration avancée d'agents et 3D Three.js.",
  },
];

const COMMITMENTS = [
  { v: "2 à 5h / semaine", d: "Rythme progressif à côté de mon travail" },
  { v: "5 à 10h / semaine", d: "Rythme soutenu pour livrer en 3 semaines" },
  { v: "Plus de 10h / semaine", d: "Immersion totale & accélération maximale" },
];

type MethodStep = {
  step: string;
  num: string;
  title: string;
  tagline: string;
  problem: string;
  solution: string;
  deliverable: string;
  rule: string;
};

const METHOD_STEPS: MethodStep[] = [
  {
    step: "Spec",
    num: "01",
    title: "Écrire ce qu’on livre avant de coder",
    tagline: "Sortir du flou qui fait échouer 80% des projets.",
    problem: "Un agent IA produit du code très vite, mais sans direction claire. Si « fini » n'est pas formalisé, l'IA génère du code incohérent.",
    solution: "Tu apprends à formuler 5 à 8 critères observables et vérifiables sous forme de cas d'usage concrets et un contrat Done inviolable.",
    deliverable: "Un fichier SPEC.md avec critères d'acceptation binaires (Vrai / Faux).",
    rule: "Règle d'or : Pas une seule ligne de code avant la validation de la Spec.",
  },
  {
    step: "Plan",
    num: "02",
    title: "Découper en tranches de 4 heures",
    tagline: "Une tâche trop longue est une tâche qui va dériver.",
    problem: "Les prompts massifs font halluciner les agents IA. Les sessions de code géantes produisent des régressions incontrôlables.",
    solution: "Découper l'implémentation en tâches de 2 à 4 heures maximum, indépendantes, ordonnées et conclues par une preuve testable.",
    deliverable: "Un fichier PLAN.md ordonné de Tâche 01 à Tâche 08 avec dépendances.",
    rule: "Règle d'or : Si tu ne peux pas tester la fin d'une tâche, découpe-la encore.",
  },
  {
    step: "Build",
    num: "03",
    title: "Construire avec les agents & les skills",
    tagline: "Appliquer la rigueur TDD accélérée par l'intelligence artificielle.",
    problem: "Copier des snippets générés sans tests mène à une dette technique ingérable après quelques jours.",
    solution: "Brancher l'agent sur les skills pré-entraînés du registre AIFAC. Écrire le test en premier (Red), puis faire générer le code exact (Green).",
    deliverable: "Commits atomiques avec couverture de tests verts et composants modulaires.",
    rule: "Règle d'or : Un skill par tâche, un test avant chaque implémentation.",
  },
  {
    step: "Review",
    num: "04",
    title: "Revue de code ligne par ligne & itération",
    tagline: "Recevoir la critique experte pour atteindre l'excellence.",
    problem: "Le code généré par l'IA contient souvent des failles de sécurité masquées, des fuites de mémoire ou du CSS non optimisé.",
    solution: "Soumettre ton rendu dans la plateforme pour une correction ligne par ligne par un mentor tech. Traiter chaque commentaire sans ego.",
    deliverable: "Revue de code détaillée avec corrections appliquées et validation du mentor.",
    rule: "Règle d'or : On itère autant de fois que nécessaire jusqu'au tampon Validé.",
  },
  {
    step: "QA",
    num: "05",
    title: "Vérifier sur mobile, tablette & cas limites",
    tagline: "Un projet qui marche uniquement en local n'est pas fini.",
    problem: "Tester uniquement sur son navigateur desktop masque 90% des bugs utilisateurs : viewport cassé, lenteur réseau, boutons inaccessibles.",
    solution: "Appliquer la checklist QA AIFAC : test 375px mobile, audit accessibilité, gestion des erreurs réseau et validation multi-navigateurs.",
    deliverable: "Matrice de test multi-device validée avec zéro régression visuelle.",
    rule: "Règle d'or : Si ce n'est pas fluide sur smartphone 4G, le travail continue.",
  },
  {
    step: "Deliver",
    num: "06",
    title: "Déployer en production & certificat vérifiable",
    tagline: "Livrer pour de vrai avec une URL publique sécurisée.",
    problem: "Laisser un projet dormir sur son disque dur ne rapporte ni clients, ni recruteurs, ni crédibilité professionnelle.",
    solution: "Automatiser le déploiement continu HTTPS (Cloudflare / Supabase), configurer le SEO OpenGraph et présenter une démo enregistrée de 3 minutes.",
    deliverable: "Application en ligne accessible au monde entier + Certificat d'achèvement AIFAC.",
    rule: "Règle d'or : Un projet livré et public vaut 100 prototypes inachevés.",
  },
];

function StepIllustration({ stepIndex }: { stepIndex: number }) {
  switch (stepIndex) {
    case 0: // Spec
      return (
        <svg viewBox="0 0 360 260" className="w-full h-full text-accent" fill="none">
          <rect x="20" y="20" width="320" height="220" rx="16" fill="rgba(255,255,255,0.03)" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
          <rect x="40" y="45" width="140" height="24" rx="6" fill="rgba(255,255,255,0.08)" />
          <rect x="40" y="85" width="280" height="12" rx="4" fill="rgba(255,255,255,0.05)" />
          <rect x="40" y="105" width="220" height="12" rx="4" fill="rgba(255,255,255,0.05)" />
          <g transform="translate(40, 135)">
            <rect width="24" height="24" rx="6" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1.5" />
            <path d="M7 12L10 15L17 8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <text x="36" y="16" fill="white" fontSize="12" fontFamily="monospace">Spec item 01 : Authentification JWT validée</text>
          </g>
          <g transform="translate(40, 170)">
            <rect width="24" height="24" rx="6" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1.5" />
            <path d="M7 12L10 15L17 8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <text x="36" y="16" fill="white" fontSize="12" fontFamily="monospace">Spec item 02 : RLS Database étanche</text>
          </g>
          <g transform="translate(40, 205)">
            <rect width="24" height="24" rx="6" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M12 7V13M12 17H12.01" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <text x="36" y="16" fill="white" fontSize="12" fontFamily="monospace">Spec item 03 : Définition Done approuvée</text>
          </g>
          <rect x="220" y="45" width="100" height="24" rx="12" fill="#3b82f6" fillOpacity="0.2" stroke="#3b82f6" />
          <text x="238" y="61" fill="#60a5fa" fontSize="10" fontWeight="bold" fontFamily="monospace">SPEC.MD</text>
        </svg>
      );

    case 1: // Plan
      return (
        <svg viewBox="0 0 360 260" className="w-full h-full text-accent" fill="none">
          <rect x="20" y="20" width="320" height="220" rx="16" fill="rgba(255,255,255,0.03)" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="60" cy="70" r="18" fill="#3b82f6" fillOpacity="0.2" stroke="#3b82f6" strokeWidth="2" />
          <text x="56" y="75" fill="white" fontSize="12" fontWeight="bold">01</text>
          <line x1="78" y1="70" x2="160" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="180" cy="70" r="18" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="2" />
          <text x="176" y="75" fill="white" fontSize="12" fontWeight="bold">02</text>
          <line x1="198" y1="70" x2="280" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="300" cy="70" r="18" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="2" />
          <text x="296" y="75" fill="white" fontSize="12" fontWeight="bold">03</text>
          
          <rect x="42" y="115" width="276" height="50" rx="10" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" />
          <text x="58" y="136" fill="white" fontSize="12" fontWeight="bold">Tâche 01 · Sprint 3h : Architecture & Schéma</text>
          <text x="58" y="152" fill="#94a3b8" fontSize="10" fontFamily="monospace">Preuve : Migrations SQL exécutées sans erreur</text>

          <rect x="42" y="175" width="276" height="50" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
          <text x="58" y="196" fill="#cbd5e1" fontSize="12" fontWeight="bold">Tâche 02 · Sprint 4h : Composants & Tests</text>
          <text x="58" y="212" fill="#64748b" fontSize="10" fontFamily="monospace">Preuve : Suite de tests vitest 100% verte</text>
        </svg>
      );

    case 2: // Build
      return (
        <svg viewBox="0 0 360 260" className="w-full h-full text-accent" fill="none">
          <rect x="20" y="20" width="320" height="220" rx="16" fill="rgba(255,255,255,0.03)" stroke="currentColor" strokeWidth="1.5" />
          <rect x="35" y="35" width="290" height="30" rx="8" fill="#0f172a" stroke="rgba(255,255,255,0.15)" />
          <circle cx="50" cy="50" r="4" fill="#ef4444" />
          <circle cx="62" cy="50" r="4" fill="#f59e0b" />
          <circle cx="74" cy="50" r="4" fill="#10b981" />
          <text x="90" y="54" fill="#94a3b8" fontSize="10" fontFamily="monospace">ai-agent @ aifac-workspace : ~ run build</text>

          <rect x="35" y="75" width="135" height="150" rx="10" fill="rgba(59,130,246,0.08)" stroke="#3b82f6" strokeWidth="1.5" />
          <text x="48" y="98" fill="#60a5fa" fontSize="11" fontWeight="bold" fontFamily="monospace">SKILL LOADED</text>
          <text x="48" y="118" fill="white" fontSize="10">supabase-rls-auth</text>
          <text x="48" y="134" fill="white" fontSize="10">motion-spring-ui</text>
          <text x="48" y="150" fill="white" fontSize="10">tdd-test-runner</text>
          <rect x="48" y="180" width="109" height="26" rx="6" fill="#3b82f6" />
          <text x="64" y="197" fill="white" fontSize="10" fontWeight="bold">Agent actif</text>

          <rect x="180" y="75" width="145" height="150" rx="10" fill="#020617" stroke="rgba(255,255,255,0.15)" />
          <text x="192" y="98" fill="#10b981" fontSize="11" fontWeight="bold" fontFamily="monospace">✓ TEST SUITE</text>
          <text x="192" y="120" fill="#cbd5e1" fontSize="9" fontFamily="monospace">PASS auth.test.ts</text>
          <text x="192" y="136" fill="#cbd5e1" fontSize="9" fontFamily="monospace">PASS database.test.ts</text>
          <text x="192" y="152" fill="#cbd5e1" fontSize="9" fontFamily="monospace">PASS render.test.ts</text>
          <text x="192" y="185" fill="#10b981" fontSize="10" fontWeight="bold">0 failure · 12 passed</text>
        </svg>
      );

    case 3: // Review
      return (
        <svg viewBox="0 0 360 260" className="w-full h-full text-accent" fill="none">
          <rect x="20" y="20" width="320" height="220" rx="16" fill="rgba(255,255,255,0.03)" stroke="currentColor" strokeWidth="1.5" />
          <rect x="40" y="45" width="280" height="28" rx="6" fill="#1e293b" />
          <text x="55" y="63" fill="#f8fafc" fontSize="11" fontWeight="bold">PR #12 : Implémentation du système de leçons</text>
          <rect x="250" y="50" width="60" height="18" rx="9" fill="#10b981" fillOpacity="0.2" />
          <text x="258" y="62" fill="#10b981" fontSize="9" fontWeight="bold">APPROVED</text>

          <rect x="40" y="85" width="280" height="30" rx="4" fill="#ef4444" fillOpacity="0.1" stroke="#ef4444" strokeWidth="0.5" />
          <text x="50" y="104" fill="#f87171" fontSize="10" fontFamily="monospace">- const data = await fetchAllUncached()</text>

          <rect x="40" y="120" width="280" height="30" rx="4" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="0.5" />
          <text x="50" y="139" fill="#4ade80" fontSize="10" fontFamily="monospace">{'+ const { data } = useQuery(["lessons"])'}</text>

          <rect x="50" y="160" width="270" height="65" rx="8" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
          <text x="65" y="180" fill="#60a5fa" fontSize="10" fontWeight="bold">Mentor AIFAC · il y a 20 min</text>
          <text x="65" y="198" fill="#e2e8f0" fontSize="10">Excellente optimisation du cache ! Les 212 tests passent.</text>
          <text x="65" y="214" fill="#10b981" fontSize="10" fontWeight="bold">✓ Prêt pour la livraison finale</text>
        </svg>
      );

    case 4: // QA
      return (
        <svg viewBox="0 0 360 260" className="w-full h-full text-accent" fill="none">
          <rect x="20" y="20" width="320" height="220" rx="16" fill="rgba(255,255,255,0.03)" stroke="currentColor" strokeWidth="1.5" />
          
          {/* Desktop Frame */}
          <rect x="40" y="45" width="170" height="110" rx="8" fill="#0f172a" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <rect x="45" y="52" width="160" height="12" rx="4" fill="rgba(255,255,255,0.1)" />
          <rect x="45" y="70" width="75" height="75" rx="4" fill="rgba(59,130,246,0.2)" />
          <rect x="125" y="70" width="80" height="75" rx="4" fill="rgba(245,158,11,0.2)" />
          <rect x="95" y="155" width="60" height="8" rx="2" fill="rgba(255,255,255,0.2)" />

          {/* Mobile Frame */}
          <rect x="230" y="55" width="80" height="145" rx="14" fill="#020617" stroke="#3b82f6" strokeWidth="2" />
          <rect x="255" y="60" width="30" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
          <rect x="238" y="72" width="64" height="40" rx="6" fill="#3b82f6" fillOpacity="0.3" />
          <rect x="238" y="120" width="64" height="25" rx="4" fill="rgba(255,255,255,0.1)" />
          <rect x="238" y="152" width="64" height="35" rx="4" fill="rgba(16,185,129,0.2)" />

          {/* Audit Pill */}
          <g transform="translate(40, 185)">
            <rect width="170" height="35" rx="8" fill="#10b981" fillOpacity="0.15" stroke="#10b981" />
            <text x="14" y="22" fill="#10b981" fontSize="11" fontWeight="bold">✓ 100% Responsive & Zero Scroll</text>
          </g>
        </svg>
      );

    case 5: // Deliver
      return (
        <svg viewBox="0 0 360 260" className="w-full h-full text-accent" fill="none">
          <rect x="20" y="20" width="320" height="220" rx="16" fill="rgba(255,255,255,0.03)" stroke="currentColor" strokeWidth="1.5" />
          
          <circle cx="180" cy="85" r="38" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="2" />
          <path d="M180 60L190 75H170L180 60Z" fill="#f59e0b" />
          <rect x="175" y="75" width="10" height="25" fill="#f59e0b" rx="2" />
          <path d="M165 95C165 95 175 105 180 115C185 105 195 95 195 95" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />

          <rect x="40" y="135" width="280" height="38" rx="10" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="58" cy="154" r="5" fill="#10b981" />
          <text x="72" y="158" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="monospace">https://mon-app.aifac.dev</text>
          <rect x="255" y="143" width="55" height="22" rx="6" fill="#10b981" />
          <text x="264" y="157" fill="white" fontSize="9" fontWeight="bold">EN LIGNE</text>

          <rect x="40" y="185" width="280" height="35" rx="8" fill="rgba(255,255,255,0.05)" />
          <text x="55" y="206" fill="#cbd5e1" fontSize="10">Certificat n° AIFAC-2026-883C vérifiable sur la blockchain</text>
        </svg>
      );

    default:
      return null;
  }
}

function OnboardingPage() {
  const { data: p, isLoading } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Form State
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("");
  const [commitment, setCommitment] = useState("");
  const [seenMethod, setSeenMethod] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (p) {
      if (p.full_name) setName(p.full_name);
      if (p.goal) setGoal(p.goal);
      if (p.level) setLevel(p.level);
    }
  }, [p]);

  async function saveProfile() {
    if (!p || name.trim().length < 2 || !goal || !level) {
      toast.error("Renseigne ton nom, ton objectif et ton niveau pour continuer.");
      return;
    }
    setBusy(true);
    const res = await d1UpdateServerFn({
      data: {
        table: "profiles",
        id: p.id,
        patch: {
          full_name: name.trim().slice(0, 80),
          goal,
          level,
        },
      },
    });
    setBusy(false);

    if (!res.success) {
      toast.error("Enregistrement impossible, réessaie.");
      return;
    }

    qc.invalidateQueries({ queryKey: ["profile"] });
    setStep(1);
  }

  async function finishOnboarding() {
    if (!p) return;
    setBusy(true);
    const res = await d1UpdateServerFn({
      data: { table: "profiles", id: p.id, patch: { onboarded: 1 } },
    });
    setBusy(false);

    if (!res.success) {
      toast.error("Impossible de finaliser l'onboarding.");
      return;
    }

    await qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Bienvenue dans la formation ! Première leçon débloquée.");
    navigate({ to: "/app/apprendre", search: { lecon: allLessons[0]?.id ?? "m1-l1" } });
  }

  const currentMethod = (METHOD_STEPS[seenMethod] ?? METHOD_STEPS[0])!;

  return (
    <div className="min-h-screen w-full bg-paper text-ink font-sans flex flex-col justify-between selection:bg-accent/20">
      {/* Top Navbar */}
      <header className="w-full border-b border-line bg-paper/80 backdrop-blur-md px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0 gap-2">
        <div className="shrink-0">
          <Logo size={26} />
        </div>
        
        {/* Step Indicator Badges (Desktop/Tablet) */}
        <div className="hidden md:flex items-center gap-2">
          {["1. Profil & Diagnostic", "2. La Méthode Spec → Deliver", "3. Lancement Module 1"].map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (idx < step) setStep(idx);
              }}
              disabled={idx > step}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                step === idx
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : idx < step
                  ? "bg-muted text-ink hover:bg-line"
                  : "text-muted-foreground opacity-60 cursor-not-allowed"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Step Indicator (Mobile compact) */}
        <div className="flex md:hidden items-center gap-1.5 bg-muted/70 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0">
          <span className="text-accent">Étape {step + 1}/3</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-ink truncate max-w-[120px]">
            {step === 0 ? "Profil" : step === 1 ? "Méthode" : "Lancement"}
          </span>
        </div>

        {p?.onboarded && (
          <button
            type="button"
            onClick={() => navigate({ to: "/app" })}
            className="text-xs font-bold text-muted-foreground hover:text-ink transition-colors shrink-0"
          >
            <span className="hidden sm:inline">Aller au tableau de bord →</span>
            <span className="sm:hidden">Dashboard →</span>
          </button>
        )}
      </header>

      {/* Main 2-Column Full-Page Layout (No Card Enclosure) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ============================================================== */}
          {/* LEFT COLUMN: INTERACTIVE FLOW & FORMS */}
          {/* ============================================================== */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div>
                    <span className="eyebrow">Étape 1 sur 3 · Diagnostic Initial</span>
                    <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                      Faisons connaissance, personnalisons ton parcours.
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      L'accélérateur AIFAC et le coach IA entraîné adaptent leurs recommandations et les revues de code selon ton niveau de départ et tes ambitions.
                    </p>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink">
                      Comment souhaites-tu qu'on t'appelle ?
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Awa Koffi"
                      maxLength={80}
                      className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all shadow-sm"
                    />
                  </div>

                  {/* Goal Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                      Quel est ton objectif prioritaire ?
                    </label>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      {GOALS.map((g) => {
                        const selected = goal === g.title;
                        return (
                          <button
                            key={g.title}
                            type="button"
                            onClick={() => setGoal(g.title)}
                            className={`rounded-2xl border p-4 text-left transition-all flex flex-col justify-between min-w-0 break-words ${
                              selected
                                ? "border-accent bg-accent/5 ring-2 ring-accent/20 shadow-md"
                                : "border-line bg-white hover:border-accent/40 hover:bg-slate-50 shadow-sm"
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="block text-sm font-bold text-ink break-words">{g.title}</span>
                              <span className="mt-1 block text-xs text-muted-foreground leading-relaxed break-words">{g.desc}</span>
                            </div>
                            <span className="mt-3 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-accent border border-line/60 w-fit shrink-0">
                              {g.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Level Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                      Ton niveau actuel en programmation
                    </label>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                      {LEVELS.map((l) => {
                        const selected = level === l.v;
                        return (
                          <button
                            key={l.v}
                            type="button"
                            onClick={() => setLevel(l.v)}
                            className={`rounded-2xl border p-4 text-left transition-all min-w-0 break-words ${
                              selected
                                ? "border-accent bg-accent/5 ring-2 ring-accent/20 shadow-md"
                                : "border-line bg-white hover:border-accent/40 hover:bg-slate-50 shadow-sm"
                            }`}
                          >
                            <span className="block text-sm font-bold text-ink">{l.v}</span>
                            <span className="mt-1 block text-xs text-muted-foreground leading-tight break-words">{l.d}</span>
                            <span className="mt-2 block text-[11px] font-medium text-accent break-words">{l.detail}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Commitment */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                      Disponibilité hebdomadaire estimée
                    </label>
                    <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3">
                      {COMMITMENTS.map((c) => {
                        const selected = commitment === c.v;
                        return (
                          <button
                            key={c.v}
                            type="button"
                            onClick={() => setCommitment(c.v)}
                            className={`rounded-xl border p-3 text-left transition-all min-w-0 break-words ${
                              selected
                                ? "border-accent bg-accent/5 ring-2 ring-accent/20 shadow-sm"
                                : "border-line bg-white hover:border-accent/30 shadow-sm"
                            }`}
                          >
                            <span className="block text-xs font-bold text-ink">{c.v}</span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground break-words">{c.d}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-4 flex flex-col sm:flex-row justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={saveProfile}
                      className="btn-base btn-glow gap-2 px-6 py-3 font-display text-xs font-bold shadow-card w-full sm:w-auto justify-center"
                    >
                      {busy ? "Enregistrement…" : "Découvrir la méthode AIFAC"} <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div>
                    <span className="eyebrow">Étape 2 sur 3 · Méthode & Standards</span>
                    <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                      La boucle qui mène à « Done »
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Chaque projet développé à l'AIFAC suit rigoureusement ces 6 étapes, toujours dans le même ordre. Clique sur chaque étape pour en explorer les exigences.
                    </p>
                  </div>

                  {/* 6 Step Selector Buttons */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    {METHOD_STEPS.map((s, idx) => {
                      const active = seenMethod === idx;
                      return (
                        <button
                          key={s.step}
                          type="button"
                          onClick={() => setSeenMethod(idx)}
                          className={`rounded-xl sm:rounded-2xl border p-2 sm:p-3 text-center transition-all min-w-0 ${
                            active
                              ? "border-accent bg-accent text-accent-foreground font-extrabold shadow-md scale-[1.02]"
                              : "border-line bg-white text-ink hover:border-accent/40 shadow-sm"
                          }`}
                        >
                          <span className={`block font-mono text-[10px] ${active ? "opacity-90 font-bold" : "text-muted-foreground"}`}>
                            {s.num}
                          </span>
                          <span className="block text-[11px] sm:text-xs font-extrabold mt-0.5 truncate">{s.step}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Step Deep-Dive Card */}
                  <div className="rounded-2xl sm:rounded-3xl border border-line bg-white p-4 sm:p-8 space-y-4 shadow-sm min-w-0 break-words">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line pb-3 gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-accent uppercase">
                          Étape {currentMethod.num} / 06 · {currentMethod.step}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-ink mt-0.5 break-words">
                          {currentMethod.title}
                        </h2>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 sm:px-3 py-1 font-mono text-[11px] sm:text-xs font-bold text-accent shrink-0 max-w-full whitespace-normal text-left break-words">
                        {currentMethod.tagline}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pt-2">
                      <div className="rounded-xl bg-slate-50 p-3.5 sm:p-4 border border-line/60 min-w-0 break-words">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-500">
                          <ShieldCheck size={14} className="text-rose-500 shrink-0" />
                          Le Piège classique à éviter
                        </span>
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed break-words">
                          {currentMethod.problem}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3.5 sm:p-4 border border-line/60 min-w-0 break-words">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald">
                          <Check size={14} className="text-emerald shrink-0" />
                          La Solution AIFAC appliquée
                        </span>
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed break-words">
                          {currentMethod.solution}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-accent/20 bg-accent/5 p-3.5 sm:p-4 flex items-start gap-3 min-w-0">
                      <ShieldCheck size={20} className="shrink-0 text-accent mt-0.5" />
                      <div className="min-w-0 break-words">
                        <span className="block text-xs font-bold text-ink">{currentMethod.rule}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          Livrable concret : <strong className="text-ink">{currentMethod.deliverable}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="btn-base btn-ghost gap-2 text-xs font-semibold w-full sm:w-auto justify-center"
                    >
                      <ArrowLeft size={16} /> Retour
                    </button>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {seenMethod < METHOD_STEPS.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setSeenMethod((m) => m + 1)}
                          className="btn-base btn-ghost gap-2 text-xs font-semibold w-full sm:w-auto justify-center"
                        >
                          Étape suivante ({METHOD_STEPS[seenMethod + 1]?.step}) <ArrowRight size={16} />
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="btn-base btn-glow gap-2 px-6 py-2.5 font-display text-xs font-bold shadow-card w-full sm:w-auto justify-center"
                      >
                        J’ai compris la méthode <Check size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div>
                    <span className="eyebrow">Étape 3 sur 3 · Démarrage Immédiat</span>
                    <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                      Ton premier module : {modules[0]?.title}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Ce premier module est 100% accessible. Tu vas y apprendre à définir « Done » et à formuler ta première spec testable avant d’écrire la moindre ligne de code.
                    </p>
                  </div>

                  {/* Lesson Cards */}
                  <div className="space-y-3">
                    {modules[0]?.lessons.map((l, i) => (
                      <div
                        key={l.id}
                        className="rounded-2xl border border-line bg-white p-4 sm:p-5 flex items-start gap-4 transition-all hover:border-accent/40 shadow-sm min-w-0"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 font-mono text-sm font-extrabold text-accent">
                          0{i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-ink break-words">{l.title}</h3>
                            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                              {l.minutes} min
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed break-words">
                            {l.task}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-emerald/30 bg-emerald/5 p-4 flex items-center gap-3">
                    <Check size={20} className="text-emerald shrink-0" />
                    <p className="text-xs text-ink font-medium leading-relaxed">
                      Chaque leçon comporte un atelier pratique et un quiz interactif pour valider tes compétences et débloquer ton certificat.
                    </p>
                  </div>

                  {/* Final Actions */}
                  <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn-base btn-ghost gap-2 text-xs font-semibold w-full sm:w-auto justify-center"
                    >
                      <ArrowLeft size={16} /> Revoir la méthode
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={finishOnboarding}
                      className="btn-base btn-glow gap-2 px-8 py-3.5 font-display text-xs font-bold shadow-card w-full sm:w-auto justify-center"
                    >
                      <BookOpen size={16} />
                      {busy ? "Chargement…" : "Commencer la première leçon"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: RICH CONTEXTUAL SVG GRAPHICS & TELEMETRY */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 h-full">
            <div className="sticky top-8 rounded-2xl sm:rounded-3xl border border-white/10 bg-ink p-4 sm:p-8 text-paper shadow-2xl flex flex-col justify-between min-h-[420px] lg:min-h-[540px]">
              
              {/* Background ambient lighting */}
              <div aria-hidden className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
              <div aria-hidden className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber/15 blur-3xl pointer-events-none" />

              {/* Header inside Panel */}
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-mono text-[10px] font-bold tracking-widest text-amber uppercase">
                  AIFAC ACCELERATOR · VISUAL MONITOR
                </span>
                <span className="font-mono text-[10px] text-paper/60">
                  {step === 0 ? "DIAGNOSTIC MODE" : step === 1 ? `METHOD STEP 0${seenMethod + 1}/06` : "CURRICULUM ACTIVE"}
                </span>
              </div>

              {/* Dynamic Center Illustration */}
              <div className="relative z-10 my-auto py-6 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div
                      key="illu-0"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="w-full"
                    >
                      <svg viewBox="0 0 360 260" className="w-full h-auto text-accent" fill="none">
                        <rect x="20" y="20" width="320" height="220" rx="16" fill="rgba(255,255,255,0.03)" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="180" cy="110" r="50" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
                        <circle cx="180" cy="110" r="26" fill="#3b82f6" fillOpacity="0.3" />
                        <path d="M180 94V126M164 110H196" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        <rect x="50" y="180" width="260" height="38" rx="8" fill="rgba(255,255,255,0.06)" />
                        <text x="70" y="203" fill="white" fontSize="11" fontWeight="bold">Parcours individualisé configuré</text>
                      </svg>
                      <div className="mt-4 rounded-xl bg-white/5 p-4 border border-white/10 text-center">
                        <p className="text-xs font-semibold text-paper/90">
                          {name ? `Bienvenue ${name} !` : "Bienvenue futur créateur !"}
                        </p>
                        <p className="text-[11px] text-paper/60 mt-1">
                          Objectif sélectionné : {goal || "Définition de ton cap..."}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div
                      key={`illu-method-${seenMethod}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22 }}
                      className="w-full"
                    >
                      <StepIllustration stepIndex={seenMethod} />
                      <div className="mt-3 rounded-xl bg-white/5 p-3.5 border border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-amber uppercase font-bold">
                            PHASE {currentMethod.num} · {currentMethod.step}
                          </span>
                          <span className="text-[10px] text-paper/60 font-mono">100% REPRODUCTIBLE</span>
                        </div>
                        <p className="text-xs text-paper/90 font-medium mt-1 leading-snug">
                          {currentMethod.tagline}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="illu-2"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="w-full text-center"
                    >
                      <svg viewBox="0 0 360 220" className="w-full h-auto text-accent mx-auto" fill="none">
                        <rect x="30" y="20" width="300" height="180" rx="16" fill="rgba(255,255,255,0.03)" stroke="#10b981" strokeWidth="1.5" />
                        <circle cx="180" cy="85" r="42" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="2" />
                        <path d="M165 85L176 96L198 72" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <text x="180" y="150" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Module 01 : Spec ouvert</text>
                        <text x="180" y="170" textAnchor="middle" fill="#94a3b8" fontSize="11">Accès gratuit immédiat · 3 leçons interactives</text>
                      </svg>
                      <div className="mt-4 rounded-xl bg-emerald/10 p-3.5 border border-emerald/20">
                        <p className="text-xs font-bold text-emerald">
                          Prêt à démarrer l’aventure AIFAC
                        </p>
                        <p className="text-[11px] text-paper/70 mt-1">
                          Ton espace apprenant est configuré et tes clés d'accès sont prêtes.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Note inside Panel */}
              <div className="relative z-10 border-t border-white/10 pt-3 flex items-center justify-between text-[11px] text-paper/60 font-mono">
                <span>PLATEFORME AIFAC v2.4</span>
                <span>MÉTHODE SPEC → DELIVER</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
