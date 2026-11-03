import { createFileRoute, Link, redirect, isRedirect } from "@tanstack/react-router";
import { useState } from "react";
import { getD1SessionUser } from "@/lib/d1-session";
import { d1ListServerFn } from "@/lib/d1-data.functions";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Final";
import { useLanguage } from "@/lib/i18n";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import CodeBlock from "@/components/ui/CodeBlock";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Code2,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Megaphone,
  Palette,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Terminal,
  Cpu,
  BarChart3,
  Check,
  GraduationCap,
  FileCode,
  Send,
  HelpCircle,
  XCircle,
  Building2,
  ChevronDown,
  Lock,
  Zap,
  Calculator,
} from "lucide-react";
import { HISTORICAL_CHALLENGES, HISTORICAL_RESULTS, DIMENSIONS_META } from "@/data/innerbuild-history";

const TITLE = "The InnerBuild — On ne forme pas des développeurs. On forge des Frontend Killers.";
const DESC =
  "Arène d'ingénierie et hackathons intensifs avec de vrais clients, jurys indépendants à 7 dimensions et déploiement en conditions réelles. Propulseur de la formation AI Factory.";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const user = getD1SessionUser();
      if (user) {
        const email = user.email?.toLowerCase();
        if (email === "eltonhounnou27@gmail.com" || user.role === "admin") {
          throw redirect({ to: "/admin" });
        }
        try {
          const roles = await d1ListServerFn({ data: { table: "user_roles", where: { user_id: user.id } } });
          const isAdmin = (roles.rows || []).some((r: any) => r.role === "admin");
          if (isAdmin) {
            throw redirect({ to: "/admin" });
          }
        } catch (e: any) {
          if (isRedirect(e) || e?.to || e instanceof Response) throw e;
        }
        throw redirect({ to: "/app" });
      }
    } catch (e: any) {
      if (isRedirect(e) || e?.to || e instanceof Response) throw e;
    }
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InnerBuildLandingPage,
});

// Le Protocole de l'Arène (5 Phases orientées bâtisseur, SANS bureaucratie admin !)
const ARENA_PHASES = [
  {
    num: "01",
    tagFr: "Phase 01 · Le Déclencheur",
    tagEn: "Phase 01 · The Trigger",
    titleFr: "Le Drop de Brief Client Réel",
    titleEn: "Real Client Brand Brief Drop",
    descFr:
      "Une vraie entreprise partenaire (ex: BenDjo infusions) dévoile son cahier de charge : audience cible, catalogue, contraintes techniques et objectifs de conversion stricts. Fini les exercices scolaires sur des faux formulaires.",
    descEn:
      "A real brand partner (e.g. BenDjo Infusions) unlocks its operational brief: target audience, catalog assets, strict tech constraints, and commercial conversion goals. No toy projects or contrived homework.",
    metricFr: "100% Brief Réel",
    metricEn: "100% Real Brief",
  },
  {
    num: "02",
    tagFr: "Phase 02 · L'Exécution",
    tagEn: "Phase 02 · The Crucible",
    titleFr: "Le Sprint 7 Jours sous Pression",
    titleEn: "7-Day High-Pressure Build Sprint",
    descFr:
      "7 jours chronométrés. Tu construis au grand jour : journal de bord quotidien, commits Git publics, gestion d'état et composants soignés. Tu apprends à architecturer vite, proprement et sans dette technique.",
    descEn:
      "7 timed days. You build in the arena: daily progress log, public Git commits, solid state management, and resilient architecture. You master cadence and clean modular delivery.",
    metricFr: "7 Jours Chrono",
    metricEn: "7-Day Pressure",
  },
  {
    num: "03",
    tagFr: "Phase 03 · L'Expédition",
    tagEn: "Phase 03 · The Shipment",
    titleFr: "La Livraison en Production Live",
    titleEn: "Live Production Deployment",
    descFr:
      "Aucune maquette Figma ne gagne ici. Tu déploies une application rapide, responsive, avec un parcours utilisateur sans friction, panier fonctionnel et commande WhatsApp ou paiement intégré.",
    descEn:
      "Static design mockups don't win trophies. You ship a live production app: zero loading lag, full mobile responsiveness, and an active cart/WhatsApp checkout flow.",
    metricFr: "Prod & Domaine Live",
    metricEn: "Live Production URL",
  },
  {
    num: "04",
    tagFr: "Phase 04 · L'Audit",
    tagEn: "Phase 04 · The Audit",
    titleFr: "L'Audit Double-Aveugle à 7 Dimensions",
    titleEn: "Double-Blind 7-Dimension Expert Audit",
    descFr:
      "13 jurys indépendants auscultent ton travail. 7 jurés développeurs calculent la note technique moyenne, et 6 spécialistes notent le Branding, le SEO, la Communication, le Marketing, le Business et l'Acquisition sur 20.",
    descEn:
      "13 independent expert jurors audit your submission double-blind. 7 dev jurors average technical architecture, and 6 domain specialists score Branding, SEO, Copy, Marketing, Business, and Growth.",
    metricFr: "13 Jurys Indépendants",
    metricEn: "13 Independent Jurors",
  },
  {
    num: "05",
    tagFr: "Phase 05 · Le Verdict",
    tagEn: "Phase 05 · The Verdict",
    titleFr: "Le Hall of Fame & Certification Vérifiable",
    titleEn: "Hall of Fame & Verifiable Credential",
    descFr:
      "Publication du classement officiel et des délibérations. Les lauréats rejoignent le Hall of Fame, reçoivent un certificat numérique infalsifiable et sont propulsés vers les opportunités de nos partenaires.",
    descEn:
      "Public leaderboard release with certified grading breakdowns. Finalists enter the Hall of Fame, receive tamper-proof cryptographic badges, and gain access to partner pipelines.",
    metricFr: "Score Certifié /100",
    metricEn: "Certified /100 Score",
  },
];

// Les 7 dimensions détaillées
const DIMENSIONS_LIST = [
  {
    key: "development",
    num: "01",
    labelFr: "Développement & Architecture",
    labelEn: "Development & Architecture",
    tagFr: "Code · Tests · Performance",
    tagEn: "Code · Testing · Performance",
    descFr:
      "Qualité du code TypeScript, architecture modulaire, gestion des erreurs, temps de chargement éclair et fluidité globale.",
    descEn:
      "TypeScript code quality, clean modular patterns, error resilience, load speed, and flawless interaction feel.",
    criteriaFr: ["Architecture modulaire & typage strict", "Gestion des états & tolérance aux pannes", "Clean code sans dette technique"],
    criteriaEn: ["Modular architecture & strict typing", "State resilience & fault tolerance", "Clean code with zero debt"],
    badge: "Moyenne 7 Jurés Dev (/20)",
  },
  {
    key: "branding",
    num: "02",
    labelFr: "Branding & Direction Artistique",
    labelEn: "Branding & Visual Identity",
    tagFr: "Identité · UI/UX · Typographie",
    tagEn: "Identity · UI/UX · Typography",
    descFr:
      "Respect rigoureux de la charte de la marque cliente, harmonie visuelle, hiérarchie typographique et design system sur-mesure.",
    descEn:
      "Strict compliance with client brand identity, visual harmony, typographic hierarchy, and custom design tokens.",
    criteriaFr: ["Adhérence stricte à la charte de la marque", "Typographies soignées & espacements cohérents", "Expérience utilisateur immersive"],
    criteriaEn: ["Strict alignment with brand book", "Polished typography & consistent spacing", "Immersive user experience"],
    badge: "Juré Spécialiste (/20)",
  },
  {
    key: "seo_performance",
    num: "03",
    labelFr: "SEO & Core Web Vitals",
    labelEn: "SEO & Performance Optimization",
    tagFr: "Indexation · Métadonnées · Vitesse",
    tagEn: "Crawling · Metadata · Speed",
    descFr:
      "Balisage sémantique HTML5, balises OpenGraph, Twitter Cards, score Lighthouse 90+ et optimisation mobile-first.",
    descEn:
      "Semantic HTML5 tags, OpenGraph rich snippets, Twitter Cards, Lighthouse 90+ scores, and responsive speed.",
    criteriaFr: ["Balisage sémantique & métadonnées riches", "Core Web Vitals au vert", "Accessibilité mobile responsive"],
    criteriaEn: ["Semantic tagging & rich social snippets", "Green Core Web Vitals", "Flawless mobile behavior"],
    badge: "Juré Spécialiste (/20)",
  },
  {
    key: "communication",
    num: "04",
    labelFr: "Communication & Copywriting",
    labelEn: "Communication & Copywriting",
    tagFr: "Clarté · Storytelling · Ton",
    tagEn: "Clarity · Storytelling · Tone",
    descFr:
      "Clarté du message, proposition de valeur directe, storytelling aligné sur la marque cliente et suppression du jargon inutile.",
    descEn:
      "Clear value proposition, engaging brand storytelling, authentic tone of voice, and zero useless fluff.",
    criteriaFr: ["Proposition de valeur directe", "Orthographe et clarté irréprochables", "Argumentaire persuasif"],
    criteriaEn: ["Direct hook and value proposition", "Flawless spelling and copywriting", "Persuasive sales argument"],
    badge: "Juré Spécialiste (/20)",
  },
  {
    key: "marketing",
    num: "05",
    labelFr: "Marketing & Conversion",
    labelEn: "Marketing & Conversion Funnel",
    tagFr: "Entonnoir · CTA · Preuve Sociale",
    tagEn: "Funnel · CTAs · Social Proof",
    descFr:
      "Disposition stratégique des boutons d'action, réassurance, intégration des avis clients et fluidité du tunnel d'achat.",
    descEn:
      "Strategic CTA placement, trust indicators, customer reviews integration, and frictionless purchase funnel.",
    criteriaFr: ["Call-to-Actions omniprésents et contrastés", "Éléments de réassurance et garanties", "Parcours d'achat sans friction"],
    criteriaEn: ["High-contrast, prominent CTAs", "Trust triggers and guarantees", "Frictionless purchase flow"],
    badge: "Juré Spécialiste (/20)",
  },
  {
    key: "business",
    num: "06",
    labelFr: "Business & Viabilité Économique",
    labelEn: "Business Viability & Real Cash Flow",
    tagFr: "Monétisation · Panier · Commande",
    tagEn: "Monetization · Cart · Ordering",
    descFr:
      "Fonctionnalité du panier d'achat, intégration transparente du paiement Mobile Money ou de la commande WhatsApp.",
    descEn:
      "Functional checkout cart, seamless Mobile Money gateway or direct WhatsApp ordering for real revenue generation.",
    criteriaFr: ["Tunnel de commande fonctionnel et direct", "Intégration WhatsApp ou passerelle de paiement", "Réalisme commercial"],
    criteriaEn: ["Live functional ordering flow", "WhatsApp API or payment hookup", "Commercial realism"],
    badge: "Juré Spécialiste (/20)",
  },
  {
    key: "acquisition",
    num: "07",
    labelFr: "Acquisition & Boucles de Croissance",
    labelEn: "Acquisition & Viral Growth Loops",
    tagFr: "Trafic · Partage · Rétention",
    tagEn: "Traffic · Referral · Retention",
    descFr:
      "Stratégies d'acquisition intégrées, mécanismes de partage social, capture de contacts qualifiés et fidélisation.",
    descEn:
      "Built-in acquisition mechanisms, social sharing hooks, lead contact capture, and customer retention triggers.",
    criteriaFr: ["Captation de contacts ou leads qualifiés", "Mécanismes de partage et viralité", "Stratégie de réengagement"],
    criteriaEn: ["Lead contact capture mechanisms", "Viral referral and sharing hooks", "Re-engagement strategy"],
    badge: "Juré Spécialiste (/20)",
  },
];

// Profils cibles
const PROFILES = [
  {
    icon: Code2,
    titleFr: "Développeur·se Frontend & Fullstack",
    titleEn: "Frontend & Fullstack Developer",
    descFr: "Tu maîtrises React, TypeScript ou Vue. Tu veux sortir des exercices fictifs pour affronter des défis sous pression et prouver ton niveau.",
    descEn: "You write React, TypeScript or Vue. You want to ditch toy tutorials, face production constraints under real deadlines, and prove your craft.",
  },
  {
    icon: Palette,
    titleFr: "Product Designer & UI Engineer",
    titleEn: "Product Designer & UI Engineer",
    descFr: "Tu penses que l'interface et l'ergonomie sont des leviers économiques vitaux. Prouve ta vision sur un produit réel qui convertit.",
    descEn: "You believe UI/UX and polish are critical business drivers. Prove your design systems on a real brand that converts real customers.",
  },
  {
    icon: Rocket,
    titleFr: "Indie Maker & Bâtisseur Tech",
    titleEn: "Indie Maker & Tech Builder",
    descFr: "Tu construis des SaaS et des applications. Tu veux aiguiser ta vitesse de livraison et apprendre à orchestrer des agents IA autonomes.",
    descEn: "You build SaaS and web apps. You want to sharpen your delivery cadence and master autonomous AI agent execution.",
  },
  {
    icon: Megaphone,
    titleFr: "Growth Engineer & Marketeur Tech",
    titleEn: "Growth Engineer & Tech Marketer",
    descFr: "Tu sais convertir l'attention en commandes réelles. Tu maîtrises le storytelling, le copywriting et les tunnels de conversion sans friction.",
    descEn: "You know how to turn attention into active checkouts. You master product storytelling, clean copy, and frictionless conversion funnels.",
  },
];

// Partenaires et objectifs partagés (ZÉRO PRIX)
const PARTNERS = [
  {
    id: "certifigo",
    name: "Certifigo",
    logo: "/partners/certifigo.png",
    goalFr: "Certification numérique infalsifiable et vérification instantanée des compétences des bâtisseurs.",
    goalEn: "Tamper-proof digital credentialing and instant verification of builder competencies for finalists.",
    url: "https://certifigoapp.com/",
  },
  {
    id: "proforma",
    name: "Proforma",
    logo: "/partners/proforma.png",
    goalFr: "Standardisation de la facturation professionnelle et conformité financière des ingénieurs et agences tech.",
    goalEn: "Professional invoicing standard and financial compliance empowerment for tech freelancers and digital agencies.",
    url: "https://proforma-africa.vercel.app/",
  },
  {
    id: "kappelas",
    name: "Kappelas",
    logo: "/partners/kappelas.webp",
    goalFr: "Infrastructure de messagerie moderne, collaboration en temps réel et synergies d'équipes en direct.",
    goalEn: "Modern real-time communication infrastructure, team collaboration channels, and builder live streaming.",
    url: "https://web.kappelas.com/",
  },
  {
    id: "bwt-4talents",
    name: "BWT & 4Talents",
    logo: null,
    goalFr: "Détection, mentorat et passerelle professionnelle privilégiée pour propulser les meilleurs bâtisseurs vers des équipes d'ingénierie.",
    goalEn: "Elite talent scouting, mentorship, and accelerated pipeline connecting top builders with high-impact software teams.",
    url: "https://ai-factory.eltonhounnou.me",
  },
];

// FAQs sans prix
const FAQS = [
  {
    qFr: "Comment se déroule la sélection pour une saison ?",
    qEn: "How does the selection process work?",
    aFr: "Chaque candidat s'inscrit en présentant son profil, ses liens GitHub et sa motivation. Le comité vérifie les compétences de base pour garantir une compétition saine et un niveau d'émulation élevé.",
    aEn: "Candidates apply with their developer profile, GitHub repositories, and motivation. The committee verifies foundational engineering skills to maintain high standards in the arena.",
  },
  {
    qFr: "Comment fonctionne l'évaluation par les 13 jurys ?",
    qEn: "How does the 13-jury audit function?",
    aFr: "6 jurys experts notent chacun leur domaine spécifique (Branding, SEO, Communication, Marketing, Business, Acquisition) sur 20. Les 7 jurés développeurs notent tous l'architecture technique sur 20 et leur moyenne est calculée. Le score final sur /100 est certifié publiquement.",
    aEn: "6 specialist jurors score their specific field out of 20. 7 developer jurors evaluate technical architecture and their scores are averaged. The final score is the mean of all 7 dimensions normalized out of 100.",
  },
  {
    qFr: "Quel est le lien entre The InnerBuild et la formation AI Factory ?",
    qEn: "What is the relationship between The InnerBuild and AI Factory?",
    aFr: "The InnerBuild est la forge et l'arène de compétition. AI Factory est la formation d'élite propulsée par The InnerBuild, enseignant les 212 skills IA, l'orchestration multi-agents et la méthode Spec → Done pour livrer vite et sans dette.",
    aEn: "The InnerBuild is the competitive builder arena and forge. AI Factory is the official elite training curriculum powered by The InnerBuild, teaching 212 curated AI skills and autonomous agent architectures.",
  },
  {
    qFr: "Les projets soumis sont-ils réellement utilisés par des entreprises ?",
    qEn: "Are projects actually put into production by real companies?",
    aFr: "Oui ! Les challenges reposent sur des besoins réels d'entreprises partenaires (ex: BenDjo Infusions pour la Saison 02). Les solutions les plus performantes sont mises en avant et peuvent être adoptées pour leur exploitation commerciale.",
    aEn: "Yes! Challenges are based on authentic business constraints from real brands (like BenDjo Infusions for Season 02). Winning projects are presented to client executives for live commercial usage.",
  },
];

function InnerBuildLandingPage() {
  const { lang, t } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Top 3 vainqueurs BenDjo Saison 02
  const topBendjoWinners = HISTORICAL_RESULTS.filter(
    (r) => r.challenge_id === "40421b6a-1b5e-4203-8f0d-aa54a8a5e801" && r.rank <= 3
  );

  const ARENA_CODE = `// ${lang === "fr" ? "Avant : Le dev solo en chambre" : "Before: Solitary tutorial coding"}
tutoriel.copier()
projet_fictif.abandonner()
syndrome_imposteur.subir()

// ${lang === "fr" ? "Dans l'Arène The InnerBuild" : "In The InnerBuild Arena"}
const saison = await innerbuild.rejoindre("BenDjo-S02")
const code = await saison.sprint7Jours({ clientReel: true })
const liveUrl = await code.deployProduction()
const score = await saison.auditJury13Dimensions()
// => ${lang === "fr" ? "Score certifié : 83.2 / 100 · Vainqueur officiel" : "Certified score: 83.2 / 100 · Official Winner"}`;

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-[#18AA38]/20 selection:text-[#023010]">
      <Navbar />

      {/* =========================================================================
          HERO SECTION (Style AI Factory : épuré, percutant, immersif)
         ========================================================================= */}
      <section id="top" className="relative overflow-hidden pt-28 md:pt-36">
        <div aria-hidden="true" className="hero-grid absolute inset-0 opacity-60" />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper via-paper/80 to-transparent pointer-events-none"
        />

        {/* Ambient emerald blur */}
        <div
          aria-hidden="true"
          className="absolute top-16 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-[#18AA38]/12 via-[#EFF7F1]/80 to-transparent rounded-full blur-3xl pointer-events-none -z-10"
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-14 text-center md:px-6 md:pb-20">
          <div className="mx-auto max-w-3xl">
            {/* Pill Eyebrow */}
            <Reveal variant="fade">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-xs font-semibold tracking-[0.12em] text-[#023010] uppercase shadow-card">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#18AA38] animate-pulse" />
                <span>{t("ib_tag")}</span>
              </p>
            </Reveal>

            {/* Main Headline */}
            <Reveal delay={100}>
              <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-ink md:text-[3.5rem] md:leading-[1.12]">
                {lang === "fr" ? (
                  <>
                    On ne forme pas des développeurs. <br />
                    On forge des <span className="text-gradient">Frontend Killers</span>.
                  </>
                ) : (
                  <>
                    We don't train developers. <br />
                    We forge <span className="text-gradient">Frontend Killers</span>.
                  </>
                )}
              </h1>
            </Reveal>

            {/* Subtitle */}
            <Reveal delay={160} variant="fade">
              <p className="mx-auto mt-5 max-w-2xl font-display text-lg font-semibold text-ink md:text-xl leading-relaxed">
                {lang === "fr"
                  ? "Des challenges intenses sur de vrais clients. Un collège d'experts indépendants à 7 dimensions. Du code en production et des preuves vérifiables."
                  : "Intensive challenges with real business clients. An independent 7-dimension expert jury. Shipped production software with tamper-proof proof."}
              </p>
            </Reveal>

            {/* Secondary note */}
            <Reveal delay={200} variant="fade">
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {lang === "fr"
                  ? "Sors des tutoriels sans enjeu : rejoins une arène compétitive qui valorise la rigueur, le design qui convertit et la capacité à livrer sous pression."
                  : "Step out of frictionless tutorials: enter a competitive arena that rewards rigorous craft, high-converting UX, and shipping under deadlines."}
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal delay={300}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="btn-base btn-glow inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#023010] hover:bg-[#18AA38] text-white px-7 py-3.5 text-sm font-bold font-display shadow-md transition-all hover:-translate-y-0.5"
                >
                  <span>{lang === "fr" ? "Entrer dans l'Arène" : "Enter the Arena"}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/ai-factory"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-line bg-white hover:bg-paper text-ink px-6 py-3.5 text-sm font-bold font-display shadow-xs transition hover:border-[#023010]/30"
                >
                  <Sparkles className="h-4 w-4 text-[#18AA38]" />
                  <span>{lang === "fr" ? "Formation AI Factory (212 Skills)" : "AI Factory Masterclass (212 Skills)"}</span>
                </Link>
              </div>
            </Reveal>

            {/* Markers */}
            <Reveal delay={400} variant="fade">
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs sm:text-sm text-muted-foreground">
                {[
                  lang === "fr" ? "Vrais clients & vrais briefs" : "Real brand clients & true briefs",
                  lang === "fr" ? "Sprint 7 jours sous pression" : "7-day intensive delivery sprint",
                  lang === "fr" ? "Audit jury à 7 dimensions" : "Independent 7D expert audit",
                  lang === "fr" ? "Certificats numériques vérifiables" : "Tamper-proof verifiable credentials",
                ].map((m) => (
                  <li key={m} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span className="font-medium text-ink">{m}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Interactive Code Window */}
          <Reveal delay={220} variant="zoom" className="mx-auto mt-12 max-w-3xl">
            <CodeBlock
              code={ARENA_CODE}
              language="ts"
              filename="the-innerbuild.ts"
              accent="#18AA38"
              highlightLines={[7, 8, 9, 10]}
            />

            {/* Social Proof Card */}
            <div className="mx-auto mt-5 flex max-w-xl items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 text-left shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2" aria-hidden="true">
                  {["EH", "AK", "MD", "JT"].map((init, i) => (
                    <span
                      key={init}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-xs ${
                        i === 0 ? "bg-[#023010]" : i === 1 ? "bg-[#18AA38]" : i === 2 ? "bg-slate-800" : "bg-emerald-700"
                      }`}
                    >
                      {init}
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold text-ink">
                    {lang === "fr" ? "Saison 02 BenDjo clôturée avec succès" : "Season 02 BenDjo successfully audited"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "fr" ? "13 jurys · 3 vainqueurs sur le podium · scores publics" : "13 jurors · 3 podium champions · certified scores"}
                  </p>
                </div>
              </div>
              <Link
                to="/resultats"
                className="shrink-0 text-xs font-bold font-mono text-[#023010] hover:text-[#18AA38] inline-flex items-center gap-1"
              >
                <span>{lang === "fr" ? "Voir le palmarès" : "View rankings"}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Reveal>
        </div>

        {/* --- STATS KPI ROW --- */}
        <div className="border-y border-line bg-white/70 py-10 backdrop-blur-xs">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {[
                { value: 2, label: t("ib_stat_saisons"), sub: lang === "fr" ? "S01 & S02 BenDjo" : "S01 & S02 BenDjo" },
                { value: 45, suffix: "+", label: t("ib_stat_inbuilders"), sub: lang === "fr" ? "Bâtisseurs engagés" : "Active competitors" },
                { value: 13, label: t("ib_stat_jurys"), sub: lang === "fr" ? "Collège 7 dimensions" : "7-dimension board" },
                { value: 100, suffix: "%", label: t("ib_stat_live"), sub: lang === "fr" ? "En ligne & audités" : "Shipped & audited" },
              ].map((s, idx) => (
                <div key={idx} className="text-center">
                  <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#023010]">
                    <AnimatedCounter value={s.value} suffix={s.suffix || ""} />
                  </div>
                  <div className="mt-1 text-xs sm:text-sm font-bold text-ink">{s.label}</div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CITATION OFFICIELLE / MANIFESTE THE INNERBUILD
         ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <Reveal variant="zoom">
          <div className="rounded-3xl border border-line bg-gradient-to-br from-[#EFF7F1] to-white p-7 sm:p-10 shadow-card text-center relative overflow-hidden">
            <div className="mx-auto w-10 h-10 rounded-2xl bg-[#023010] text-[#18AA38] flex items-center justify-center mb-4 shadow-sm">
              <Flame className="h-5 w-5" />
            </div>
            <p className="text-lg sm:text-2xl font-serif italic text-[#023010] leading-relaxed max-w-2xl mx-auto">
              {lang === "fr"
                ? "« Je ne veux pas construire dans l'ombre. Je veux créer un impact qui restera gravé. »"
                : "“I do not want to build in obscurity. I want to build an impact that endures.”"}
            </p>
            <div className="mt-4 font-mono text-xs font-bold text-[#18AA38] tracking-widest uppercase">
              — Elton Hounnou · The KOF, Fondateur The InnerBuild
            </div>
          </div>
        </Reveal>
      </section>

      {/* =========================================================================
          SECTION : LE PROTOCOLE DE L'ARÈNE (5 PHASES SANS BUREAUCRATIE ADMIN !)
         ========================================================================= */}
      <section id="protocole" className="py-20 md:py-28 px-4 md:px-6 max-w-6xl mx-auto scroll-mt-20">
        <SectionHeading
          eyebrow={lang === "fr" ? "Le Protocole" : "The Arena Protocol"}
          title={lang === "fr" ? "De l'épreuve à la gloire." : "From the crucible"}
          highlight={lang === "fr" ? "5 phases d'acier." : "to the Hall of Fame."}
          sub={
            lang === "fr"
              ? "Un protocole strict sans concession : pas de présentations PowerPoint, que du code en production sous le regard de jurys indépendants."
              : "A disciplined, battle-tested progression: no PowerPoint demos, just production code tested under live conditions."
          }
        />

        <div className="mt-12 space-y-6">
          {ARENA_PHASES.map((p, idx) => {
            const isEven = idx % 2 === 1;
            return (
              <Reveal key={p.num} variant={isEven ? "right" : "left"}>
                <div className="panel p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition hover:border-[#18AA38] hover:shadow-card">
                  <div className="flex items-start gap-4 sm:gap-6">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#023010] text-[#18AA38] font-mono text-lg font-black shadow-xs">
                      {p.num}
                    </span>
                    <div className="space-y-1.5">
                      <span className="font-mono text-xs font-bold uppercase text-[#18AA38] tracking-wider block">
                        {lang === "fr" ? p.tagFr : p.tagEn}
                      </span>
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-ink">
                        {lang === "fr" ? p.titleFr : p.titleEn}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                        {lang === "fr" ? p.descFr : p.descEn}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-start md:self-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-1.5 font-mono text-xs font-bold text-[#023010] shadow-2xs">
                      <Zap className="h-3.5 w-3.5 text-[#18AA38]" />
                      <span>{lang === "fr" ? p.metricFr : p.metricEn}</span>
                    </span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION : L'AUDIT TRANSPARENT (LES 7 DIMENSIONS DU JURY)
         ========================================================================= */}
      <section id="audit" className="py-20 md:py-28 border-t border-line bg-white/60 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow={lang === "fr" ? "L'Audit Transparent" : "The Transparent Audit"}
            title={lang === "fr" ? "7 dimensions d'expertise." : "7 distinct dimensions."}
            highlight={lang === "fr" ? "Zéro complaisance." : "Zero subjectivity."}
            sub={
              lang === "fr"
                ? "Un projet n'est jamais jugé sur son look seul. Il est audité par spécialité pour mesurer sa capacité réelle à faire exister et prospérer une entreprise."
                : "No project is evaluated on superficial looks alone. It is audited across 7 distinct operational disciplines that drive real business longevity."
            }
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DIMENSIONS_LIST.map((dim, idx) => (
              <Reveal key={dim.key} delay={idx * 60} variant="fade">
                <article className="panel flex h-full flex-col justify-between p-6 transition hover:border-[#18AA38] hover:shadow-card">
                  <div>
                    <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#023010] text-[#18AA38] font-mono text-xs font-bold">
                          {dim.num}
                        </span>
                        <span className="font-mono text-xs font-bold text-ink uppercase">
                          {dim.key}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold bg-[#EFF7F1] border border-line text-[#023010] px-2.5 py-0.5 rounded-full">
                        {dim.badge}
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-bold text-ink mb-2">
                      {lang === "fr" ? dim.labelFr : dim.labelEn}
                    </h3>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                      {lang === "fr" ? dim.descFr : dim.descEn}
                    </p>

                    <div className="space-y-1.5 pt-2 border-t border-line/60">
                      <span className="text-[10px] font-mono font-bold uppercase text-[#18AA38] block tracking-wider">
                        {lang === "fr" ? "Critères audités :" : "Audit checkpoints:"}
                      </span>
                      {(lang === "fr" ? dim.criteriaFr : dim.criteriaEn).map((crit, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2 text-xs text-ink">
                          <Check className="h-3.5 w-3.5 text-[#18AA38] shrink-0" />
                          <span className="truncate">{crit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-line/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span className="text-[#18AA38] font-bold">{lang === "fr" ? dim.tagFr : dim.tagEn}</span>
                    <Link
                      to="/resultats"
                      className="hover:text-ink font-semibold flex items-center gap-1"
                    >
                      <span>{lang === "fr" ? "Notes" : "Grades"}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}

            {/* Carte Algorithme / Formule de calcul */}
            <Reveal delay={DIMENSIONS_LIST.length * 60} variant="fade">
              <article className="panel flex h-full flex-col justify-between p-6 bg-gradient-to-br from-[#023010] to-[#044517] text-white border-[#023010]">
                <div>
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
                    <Calculator className="h-4 w-4 text-[#18AA38]" />
                    <span className="font-mono text-xs font-bold uppercase text-emerald-300">
                      {lang === "fr" ? "Formule Certifiée" : "Certified Formula"}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-white mb-2">
                    {lang === "fr" ? "Algorithme 100% Transparent" : "100% Transparent Algorithm"}
                  </h3>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    {lang === "fr"
                      ? "Aucun juré ne peut influencer le résultat final à lui seul. Les 7 notes de dimension sont moyennées et ramenées rigoureusement sur /100."
                      : "No single juror can sway the final leaderboard. The 7 dimension scores are averaged and normalized strictly over 100."}
                  </p>

                  <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 font-mono text-[11px] text-emerald-200">
                    <span className="text-white font-bold block mb-1">Score Final (/100) =</span>
                    <span>(Σ 6 Spécialistes + Moyenne 7 Devs) ÷ 7 × 5</span>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-300">
                  <span>Double-aveugle</span>
                  <span className="text-emerald-300 font-bold">Zéro biais</span>
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION : LA FORMATION VEDETTE (AI FACTORY)
         ========================================================================= */}
      <section className="py-20 md:py-28 px-4 md:px-6 max-w-6xl mx-auto">
        <Reveal variant="zoom">
          <div className="rounded-3xl border border-[#023010] bg-gradient-to-br from-[#023010] via-[#023010] to-[#044517] p-8 sm:p-12 text-white relative overflow-hidden shadow-card">
            {/* Ambient pattern */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 bg-[radial-gradient(#18AA38_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#18AA38]/40 bg-[#18AA38]/20 px-3.5 py-1 text-xs font-mono font-bold text-emerald-300">
                  <GraduationCap className="h-4 w-4 text-[#18AA38]" />
                  <span>{lang === "fr" ? "Programme de Formation Officiel" : "Official Training Curriculum"}</span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-display text-white">
                  AI Factory
                </h2>

                <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-normal">
                  {lang === "fr"
                    ? "La formation officielle portée par The InnerBuild. On ne t'apprend pas à prompter dans le vide : on te forge à concevoir des architectures complètes d'agents IA autonomes, exécuter 212 skills curés et livrer des applications de bout en bout."
                    : "The official masterclass powered by The InnerBuild. We don't teach toy prompting: we forge you to build autonomous agent architectures, execute 212 curated skills, and ship full-stack applications end-to-end."}
                </p>

                {/* Bullets */}
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#18AA38]" />
                    <span>{lang === "fr" ? "212 Skills IA curés" : "212 Curated AI Skills"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#18AA38]" />
                    <span>{lang === "fr" ? "Studio & Sandbox Pratique" : "Hands-on Practice Sandbox"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#18AA38]" />
                    <span>{lang === "fr" ? "Certification Vérifiable" : "Verifiable Certification"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#18AA38]" />
                    <span>{lang === "fr" ? "Accompagnement de bout en bout" : "End-to-End Mentorship"}</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="pt-4 flex flex-wrap gap-3">
                  <Link
                    to="/ai-factory"
                    className="inline-flex items-center gap-2 rounded-full bg-[#18AA38] hover:bg-emerald-500 text-white font-bold px-6 py-3 text-sm shadow-md transition-all font-display hover:-translate-y-0.5"
                  >
                    <Layers className="h-4 w-4" />
                    <span>{lang === "fr" ? "Découvrir la Formation AI Factory" : "Explore AI Factory Training"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3 text-sm transition-all"
                  >
                    <span>{lang === "fr" ? "Rejoindre la Formation" : "Enroll in Curriculum"}</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
                <div className="text-xs font-mono text-emerald-300 font-bold uppercase tracking-wider">
                  {lang === "fr" ? "Inclus dans la Formation" : "Curriculum Highlights"}
                </div>
                <div className="space-y-3 text-xs text-gray-200">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                    <Terminal className="h-5 w-5 text-[#18AA38] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white">
                        {lang === "fr" ? "Méthode Spec → Done" : "Spec → Done Methodology"}
                      </div>
                      <div className="text-[11px] text-gray-300">
                        {lang === "fr"
                          ? "Du prompt flou à la spécification technique rigoureuse avec boucle de validation."
                          : "From ambiguous prompt to rigorous technical specifications with execution loop."}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                    <Cpu className="h-5 w-5 text-[#18AA38] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white">
                        {lang === "fr" ? "Orchestration Multi-Agents" : "Multi-Agent Orchestration"}
                      </div>
                      <div className="text-[11px] text-gray-300">
                        {lang === "fr"
                          ? "Coordination d'agents LLM avec mémoire persistance, MCP et exécution autonome."
                          : "Coordination of LLM agents with persistent memory, MCP tools, and autonomous execution."}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#18AA38] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white">
                        {lang === "fr" ? "Certification Vérifiable" : "Verifiable Certification"}
                      </div>
                      <div className="text-[11px] text-gray-300">
                        {lang === "fr"
                          ? "Délivrance de certificat sécurisé après validation de vos projets par le jury."
                          : "Tamper-proof verifiable digital certificate upon jury project audit approval."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* =========================================================================
          SECTION : POUR QUI EST FORGÉE L'ARÈNE
         ========================================================================= */}
      <section className="py-20 md:py-28 border-t border-line bg-paper">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow={lang === "fr" ? "Profils de Bâtisseurs" : "Target Profiles"}
            title={lang === "fr" ? "The InnerBuild est forgé pour toi si..." : "The InnerBuild is forged for you if..."}
            sub={
              lang === "fr"
                ? "Tu n'as pas besoin d'être un vétéran de dix ans. Tu as besoin d'un vrai projet à construire, la discipline de le finir, et l'envie que ça se sache."
                : "You don't need a ten-year title. You need discipline, a real commitment to deliver under pressure, and pride in shipped software."
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {PROFILES.map((p, idx) => (
              <Reveal key={idx} delay={idx * 80} variant="zoom">
                <div className="panel p-6 flex flex-col justify-between h-full transition hover:-translate-y-1 hover:border-[#18AA38]">
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF7F1] text-[#18AA38] mb-4">
                      <p.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-ink font-display mb-2">
                      {lang === "fr" ? p.titleFr : p.titleEn}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {lang === "fr" ? p.descFr : p.descEn}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Ce n'est pas pour toi si... */}
          <Reveal delay={200} variant="fade">
            <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/50 p-6 max-w-3xl mx-auto">
              <span className="font-mono text-xs font-bold text-red-700 uppercase tracking-wider block mb-3">
                {lang === "fr" ? "Ce n'est pas pour toi si..." : "This is NOT for you if..."}
              </span>
              <div className="space-y-2 text-xs text-red-900/80">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>
                    {lang === "fr"
                      ? "Tu cherches juste un certificat décoratif pour LinkedIn sans coder."
                      : "You just want a vanity badge without building real software."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>
                    {lang === "fr"
                      ? "Tu refuses de respecter un brief client imposé avec des contraintes réelles."
                      : "You refuse to abide by real client constraints and rigorous briefs."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>
                    {lang === "fr"
                      ? "Tu abandonnes au premier bug sans chercher à boucler la livraison."
                      : "You quit on the first obstacle rather than seeing the deployment through."}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =========================================================================
          SECTION : NOS PARTENAIRES & OBJECTIFS PARTAGÉS (ZÉRO PRIX)
         ========================================================================= */}
      <section id="partenaires" className="py-20 md:py-28 border-t border-line bg-white/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow={lang === "fr" ? "Écosystème Partenaire" : "Ecosystem Partners"}
            title={lang === "fr" ? "Nos partenaires d'impact." : "Our Mission Partners."}
            sub={
              lang === "fr"
                ? "Des organisations engagées à nos côtés pour élever le standard d'ingénierie et offrir des débouchés réels aux meilleurs bâtisseurs."
                : "Leading companies and ecosystems united around technical excellence and tangible builder impact."
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {PARTNERS.map((partner) => (
              <a
                key={partner.id}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="panel p-6 flex flex-col justify-between transition hover:-translate-y-1 hover:border-[#18AA38] group"
              >
                <div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-line p-2 mb-4 overflow-hidden shadow-2xs">
                    {partner.logo ? (
                      <img src={partner.logo} alt={partner.name} className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-8 w-8 text-[#18AA38]" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-ink font-display mb-2">
                    {partner.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {lang === "fr" ? partner.goalFr : partner.goalEn}
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-line/60 flex items-center justify-between text-xs font-mono text-[#18AA38] group-hover:underline">
                  <span>{lang === "fr" ? "Objectif partagé" : "Shared goal"}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION : LE PODIUM PHYSIQUE 3D & HALL OF FAME (BENDJO S02)
         ========================================================================= */}
      <section className="py-20 md:py-28 px-4 md:px-6 max-w-6xl mx-auto border-t border-line">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#18AA38]">
              {lang === "fr" ? "Palmarès Officiel" : "Official Registry"}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-ink font-display mt-1">
              {lang === "fr" ? "Le Hall of Fame The InnerBuild" : "The InnerBuild Hall of Fame"}
            </h2>
          </div>
          <Link
            to="/resultats"
            className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-[#023010] hover:text-[#18AA38]"
          >
            <span>{lang === "fr" ? "Consulter tous les classements complets" : "View all full rankings"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Podium Saison 02 BenDjo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topBendjoWinners.map((winner) => {
            const isFirst = winner.rank === 1;
            return (
              <div
                key={winner.id}
                className={`panel p-6 flex flex-col justify-between transition ${
                  isFirst
                    ? "border-2 border-[#023010] bg-[#EFF7F1] shadow-card ring-2 ring-[#023010]/20"
                    : "border-line bg-white shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold ${
                        isFirst
                          ? "bg-[#023010] text-[#18AA38]"
                          : winner.rank === 2
                            ? "bg-slate-200 text-slate-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      <Trophy className="h-3 w-3" />
                      <span>
                        {winner.rank === 1
                          ? t("res_podium_gold")
                          : winner.rank === 2
                            ? t("res_podium_silver")
                            : t("res_podium_bronze")}
                      </span>
                    </span>
                    <span className="font-mono text-xl font-black text-[#023010]">
                      {winner.final_score} / 100
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-ink font-display">
                    {winner.participant_name || "Inbuilder"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === "fr" ? "Projet :" : "Project:"} <strong>{winner.submission_title || "BenDjo Production"}</strong>
                  </p>
                  <p className="text-[11px] font-mono text-[#18AA38] mt-0.5">
                    {lang === "fr" ? "Saison 02 · BenDjo Infusions" : "Season 02 · BenDjo Infusions"}
                  </p>
                </div>

                {winner.submission_live_url && (
                  <div className="mt-6 pt-4 border-t border-line/60">
                    <a
                      href={winner.submission_live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#023010] hover:text-[#18AA38]"
                    >
                      <span>{lang === "fr" ? "Visiter le projet déployé" : "Visit live project"}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION : FAQ
         ========================================================================= */}
      <section id="faq" className="py-20 border-t border-line bg-paper">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow="FAQ"
            title={lang === "fr" ? "Questions fréquentes." : "Frequently Asked"}
            highlight={lang === "fr" ? "Réponses directes." : "Questions."}
          />

          <div className="space-y-4 mt-12">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-line bg-white overflow-hidden shadow-2xs transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-display font-bold text-ink text-sm sm:text-base hover:text-[#18AA38] transition"
                  >
                    <span>{lang === "fr" ? faq.qFr : faq.qEn}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#18AA38] transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-line/40 pt-4">
                      {lang === "fr" ? faq.aFr : faq.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION : CALL TO ACTION FINAL
         ========================================================================= */}
      <section className="py-20 md:py-28 border-t border-line bg-gradient-to-b from-[#EFF7F1]/50 to-paper">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1 text-xs font-mono font-bold text-[#023010] shadow-2xs">
            <Rocket className="h-3.5 w-3.5 text-[#18AA38]" />
            <span>{lang === "fr" ? "Prenez part à la Forge" : "Join the Forge"}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-ink font-display leading-tight">
            {lang === "fr"
              ? "Prêt à prouver ce que vaut votre code ?"
              : "Ready to prove your code in the arena?"}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {lang === "fr"
              ? "Inscrivez-vous dès maintenant pour accéder à la forge The InnerBuild, affûter vos compétences et préparer les prochaines saisons compétitives."
              : "Register now to access The InnerBuild forge, sharpen your competencies, and prepare for upcoming competitive seasons."}
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="btn-base btn-glow inline-flex items-center gap-2 rounded-full bg-[#023010] hover:bg-[#18AA38] text-white px-8 py-3.5 text-sm font-bold font-display shadow-md transition-all hover:-translate-y-0.5"
            >
              <span>{lang === "fr" ? "Rejoindre The InnerBuild" : "Join The InnerBuild"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/challenges"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white hover:bg-paper text-ink px-6 py-3.5 text-sm font-bold font-display shadow-2xs transition"
            >
              <span>{t("nav_challenges")}</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default InnerBuildLandingPage;
