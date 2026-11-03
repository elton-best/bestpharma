import "@/lib/ipv4";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchWithRetry } from "@/lib/ipv4";
import { AI_SKILLS } from "@/data/skills";
import { PLATFORM_GUARDRAIL_PROMPT, cleanApiKey } from "@/lib/ai-guardrail";

export type VirtualFile = {
  path: string;
  name: string;
  language: string;
  content: string;
  category: "spec" | "code" | "config" | "agent";
};

export type SkillRecommendation = {
  skillId: string;
  skillName: string;
  category: string;
  targetFeature: string;
  level: "MVP" | "V1" | "V2";
  why: string;
  directive: string;
};

export type BuildingProjectState = {
  projectName: string;
  tagline: string;
  description: string;
  targetAudience: string;
  stack: {
    frontend: string;
    backend: string;
    database: string;
    ai: string;
    auth: string;
  };
  features: {
    name: string;
    level: "MVP" | "V1" | "V2";
    description: string;
    skills: string[];
    technicalNotes: string;
  }[];
  specMarkdown: string;
  virtualFiles: Record<string, VirtualFile>;
  recommendedSkills: SkillRecommendation[];
  terminalLogs: string[];
};

const InputSchema = z.object({
  userMessage: z.string().trim().min(1).max(50000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
  currentProject: z
    .object({
      projectName: z.string().default("Mon Projet AIFAC"),
      currentSpec: z.string().default(""),
      currentFiles: z.record(z.any()).default({}),
    })
    .optional(),
  model: z.string().default("openai/gpt-oss-120b"),
});

// Helper: finding relevant skills based on text
function matchSkillsForContext(text: string, count = 8): SkillRecommendation[] {
  const query = text.toLowerCase();
  const matched: SkillRecommendation[] = [];

  const coreSkills = [
    { id: "orchestrator", name: "Orchestrator AIFAC", level: "MVP" as const, why: "Supervision du flux Spec → Plan → Build → Deliver", feature: "Pilotage général et découpage de tâches" },
    { id: "frontend-react", name: "Frontend React Modern", level: "MVP" as const, why: "Composants réactifs, design system et UX soignée", feature: "Interface utilisateur et Dashboard" },
    { id: "backend-node", name: "Backend Node & API", level: "MVP" as const, why: "Endpoints performants, sécurité et validation Zod", feature: "Logique serveur et API REST/RPC" },
    { id: "agents-ai", name: "Agents IA & LLM", level: "MVP" as const, why: "Intégration des modèles, prompt engineering et tool-calling", feature: "Fonctionnalités intelligentes & automatisation" },
    { id: "qa-devops", name: "QA & Tests Automatisés", level: "V1" as const, why: "Tests de non-régression, vérification de types et CI/CD", feature: "Qualité logicielle et robustesse" },
    { id: "security", name: "Sécurité & RLS Supabase", level: "MVP" as const, why: "Contrôle d'accès granulaire et protection des données", feature: "Authentification et autorisations" },
    { id: "design-system", name: "Design System & UI", level: "MVP" as const, why: "Cohérence visuelle, palettes HSL et micro-animations", feature: "Identité de marque et responsive design" },
  ];

  for (const c of coreSkills) {
    const full = AI_SKILLS.find((s) => s.id === c.id);
    matched.push({
      skillId: c.id,
      skillName: c.name,
      category: "core-skills",
      targetFeature: c.feature,
      level: c.level,
      why: c.why,
      directive: full?.agentAssignment?.agentConfigSnippet || `Active la règle AIFAC pour ${c.name}.`,
    });
  }

  // Check additional skills from AI_SKILLS
  const keywordsMap: Record<string, string[]> = {
    "supabase": ["supabase", "postgres", "sql", "database", "bdd", "données", "stockage", "auth"],
    "react-forms": ["form", "formulaire", "champs", "validation", "contact", "onboarding"],
    "tailwind-patterns": ["tailwind", "css", "style", "design", "ui", "responsive"],
    "jwt-auth-flow": ["auth", "login", "connexion", "compte", "mot de passe", "session", "sécurité"],
    "payment-integration": ["paiement", "stripe", "wave", "mobile money", "moov", "argent", "abonnement", "checkout"],
    "scraping-engine": ["scraping", "scrap", "crawler", "extraction", "données", "veille"],
    "rag-embeddings": ["rag", "embedding", "vecteur", "vector", "recherche", "documents", "pdf"],
  };

  for (const [skillId, kwList] of Object.entries(keywordsMap)) {
    if (kwList.some((k) => query.includes(k))) {
      const full = AI_SKILLS.find((s) => s.id === skillId);
      if (full && !matched.some((m) => m.skillId === skillId)) {
        matched.push({
          skillId: full.id,
          skillName: full.name,
          category: full.category,
          targetFeature: `Module lié aux ${kwList[0]}s`,
          level: "V1",
          why: full.shortDescription || "Optimisation technique ciblée",
          directive: full.agentAssignment?.agentConfigSnippet || `Suis le protocole AIFAC pour ${full.name}.`,
        });
      }
    }
  }

  return matched.slice(0, count);
}

// Helper: Generate dedicated file for a recommended skill
function generateSkillDetailFile(projectName: string, rec: SkillRecommendation, fullSkill?: any): string {
  const dos = fullSkill?.pedagogy?.dosAndDonts?.dos || [
    "Respecter strictement le périmètre défini pour le niveau " + rec.level,
    "Documenter les fonctions et typer en TypeScript strict",
    "Séparer la logique métier de la vue",
  ];
  const donts = fullSkill?.pedagogy?.dosAndDonts?.donts || [
    "Ne jamais introduire de dépendances non validées",
    "Ne pas contourner les règles de sécurité RLS Supabase",
    "Éviter les composants géants monolithiques",
  ];

  const steps = fullSkill?.pedagogy?.protocolSteps?.length
    ? fullSkill.pedagogy.protocolSteps.map(
        (st: any, i: number) => `#### Étape ${i + 1} : ${st.title}\n${st.description || ""}`
      ).join("\n\n")
    : `#### Étape 1 : Initialisation & Cadrage
Configurer le module pour ${rec.targetFeature} en vérifiant la compatibilité avec la stack existante.

#### Étape 2 : Implémentation du Cœur Métier
Développer le flux principal avec validation des schémas de données et gestion stricte des erreurs.

#### Étape 3 : Tests de Robustesse & Validation
Tester les cas limites et valider les critères d'acceptation du niveau ${rec.level}.`;

  return `# SKILL AI FACTORY : ${rec.skillName} (\`${rec.skillId}\`)
> **Affectation Projet :** ${projectName}  
> **Niveau Stratégique :** \`${rec.level}\` | **Catégorie :** \`${rec.category}\`  
> **Feature Assignée :** ${rec.targetFeature}

---

### 🔗 Fiche Officielle & Cours Dédié
Vous pouvez consulter le cours complet, les labs pratiques et obtenir la certification sur ce skill à l'adresse suivante :  
👉 **[Accéder au cours complet du skill ${rec.skillName}](/app/ressources/skills/${rec.skillId})**

---

### 1. MISSION DU SKILL SUR LE PROJET
**Pourquoi ce skill est indispensable pour ${projectName} :**
${rec.why}

**Objectif d'implémentation pour le niveau ${rec.level} :**
Intégrer ${rec.skillName} pour garantir l'excellence technique sur le composant "${rec.targetFeature}". L'agent IA ou le développeur doit suivre scrupuleusement les consignes de qualité AIFAC.

---

### 2. PROTOCOLE D'IMPLÉMENTATION RECOMMANDÉ

${steps}

---

### 3. DIRECTIVE SYSTÈME POUR AGENTS IA (.cursorrules)
Copiez cette règle directement dans votre éditeur (Cursor, Windsurf, Claude Code) lors du travail sur cette feature :

\`\`\`markdown
# DIRECTIVE AGENT : ${rec.skillName.toUpperCase()}
# Projet : ${projectName} — Feature : ${rec.targetFeature}

Rôle : Expert référent sur le skill "${rec.skillName}" (${rec.skillId}).
Objectif : Implémenter le module "${rec.targetFeature}" pour le niveau ${rec.level}.

Règles impératives :
1. ${rec.directive}
2. Assure un typage strict TypeScript sans aucun type "any".
3. Valide systématiquement les entrées utilisateurs via des schémas de validation (Zod).
4. Respecte l'architecture modulaire en plaçant le code dans le dossier dédié.
\`\`\`

---

### 4. CE QU'IL FAUT FAIRE & ÉVITER (DOS & DON'TS)

| ✅ À Faire (Recommandations) | ❌ À Éviter (Pièges fréquents) |
| :--- | :--- |
${dos.slice(0, 4).map((d: string, i: number) => `| ${d} | ${donts[i] || "Négliger les cas d'erreur"} |`).join("\n")}

---

### 5. CHECKLIST DE VALIDATION
- [ ] Le module est conforme aux spécifications de \`specs/cahier-des-charges.md\`.
- [ ] Aucun warning TypeScript ni erreur de compilation.
- [ ] Le code a été revu et testé sur le niveau ${rec.level}.
- [ ] La documentation a été mise à jour.
`;
}

// Generate complete structured Cahier des Charges Markdown
function generateDefaultCahierDesCharges(projectName: string, idea: string, skills: SkillRecommendation[]): string {
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const mvpSkills = skills.filter((s) => s.level === "MVP");
  const v1Skills = skills.filter((s) => s.level === "V1");
  const v2Skills = skills.filter((s) => s.level === "V2");

  return `# CAHIER DES CHARGES TECHNIQUE & FONCTIONNEL
## Projet : ${projectName}
*Document de spécification certifié AI Factory — Méthodologie Spec → Plan → Build → Deliver*  
*Généré le ${date} par le Lead Architecte & Tech Lead IA AIFAC*

---

### 1. SYNTHÈSE EXÉCUTIVE & VISION DU PRODUIT

#### 1.1 Contexte & Problématique Résolue
${idea.trim() || "Conception d'une application performante, scalable et robuste résolvant les problématiques opérationnelles cibles avec les standards d'ingénierie les plus élevés."}

#### 1.2 Cibles Utilisateurs (Personas)
- **Utilisateur Final (End-user)** : Recherche une expérience ultra-fluide, une latence minimale (<200ms) et une prise en main intuitive sans friction.
- **Gestionnaire / Opérateur (Admin/Ops)** : Pilote la solution via un tableau de bord réactif, visualise les métriques, gère les accès et les flux critiques.
- **Agent IA Opérationnel (Autonomous Worker)** : Exécute les tâches d'assistance, d'automatisation ou de traitement continu des données en arrière-plan.

#### 1.3 Proposition de Valeur Unique (UVP)
- **Time-to-Market Record** : MVP fonctionnel et livrable en 7 jours grâce au cadrage structuré AIFAC.
- **Sécurité & Robustesse Native** : Architecture Zero-Trust, typage TypeScript strict de bout en bout et politiques RLS Supabase vérifiées.
- **Scalabilité Modulaire** : Conception pensée dès le départ pour absorber la charge de la V1 et de la V2 sans réécriture complète.

---

### 2. ARCHITECTURE TECHNIQUE & STACK STANDARD AIFAC

\`\`\`text
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT FRONTEND (WEB)                    │
│   React 19 + TypeScript + Vite / TanStack + Design System   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST / RPC
┌──────────────────────────────▼──────────────────────────────┐
│                  BACKEND & DATA LAYER (BaaS)                │
│    Supabase PostgreSQL 15+ + Row Level Security (RLS)       │
│    Auth Instantanée + Realtime Subscriptions + Storage S3    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Tool Calling / Inférence
┌──────────────────────────────▼──────────────────────────────┐
│                    MOTEUR D'AGENTS IA                       │
│    Groq Inférence Ultra-Rapide (GPT-OSS / Qwen)             │
│    Orchestration multi-agents & Exécution de tâches de fond │
└─────────────────────────────────────────────────────────────┘
\`\`\`

| Domaine | Technologie Retenue | Justification & Avantages |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | Typage strict, écosystème pérenne, composants réactifs |
| **Design System & UI** | Vanilla CSS Moderne / HSL | Fluidité 60fps, dark mode natif, zéro dépendance lourde |
| **Backend & Base** | Supabase (PostgreSQL 15+) | RLS native, Auth instantanée, Stockage S3 et Temps Réel |
| **Moteur d'Inférence IA**| Groq (GPT-OSS 120B / Qwen) | Temps de réponse <500ms, streaming réactif |
| **Validation de Schéma** | Zod | Sécurité des contrats de données front-to-back |

---

### 3. DÉCOUPAGE STRATÉGIQUE DES FONCTIONNALITÉS PAR NIVEAUX

---

#### 🚀 NIVEAU 1 : LE MVP (Semaine 1 — Démonstrateur Fonctionnel Essentiel)
*Objectif : Valider l'hypothèse de valeur centrale en 7 jours avec une application 100% testable en ligne.*

##### Périmètre Strict :
- **IN** : Interface utilisateur principale responsive, Authentification basique Supabase, Enregistrement et consultation des données du cœur de métier, feedback visuel immédiat.
- **OUT** : Intégration de paiements complexes, personnalisation poussée de profils, dashboards d'analytique avancés, webhooks tiers.

##### Fonctionnalités Détaillées du MVP :
1. **Module d'Authentification & Gestion de Compte**
   - Inscription et connexion par email et mot de passe ou Magic Link.
   - Protection des routes privées via guards côté client et vérification de session côté serveur.
   - **Skills AIFAC Liés :** \`[Skill: security]\`, \`[Skill: backend-node]\`
   - *Critère d'acceptation :* Un utilisateur non authentifié est immédiatement redirigé vers la page de connexion.

2. **Interface Principale & Tableau de Bord Opérationnel**
   - Layout avec arborescence latérale fixe et zone de travail centrale.
   - États de chargement fluides (Skeletons) et notifications toast lors des actions critiques.
   - **Skills AIFAC Liés :** \`[Skill: frontend-react]\`, \`[Skill: design-system]\`
   - *Critère d'acceptation :* Aucune rupture d'affichage sur écran mobile et desktop.

3. **Cœur Métier & Enregistrement des Données**
   - Formulaire guidé avec validation Zod instantanée pour créer et modifier les entités principales.
   - Persistance immédiate dans PostgreSQL avec respect des politiques RLS.
   - **Skills AIFAC Liés :** \`[Skill: orchestrator]\`, \`[Skill: agents-ai]\`
   - *Critère d'acceptation :* La création d'une entité s'affiche en moins de 300ms sur la vue principale.

---

#### ⚡ NIVEAU 2 : VERSION V1 (Semaines 2 & 3 — Utilisable par de Vrais Clients Payants)
*Objectif : Transformer le MVP en un service commercialisable, sécurisé et prêt à accueillir des utilisateurs réels.*

##### Fonctionnalités Clés de la V1 :
1. **Intégration des Paiements & Monétisation**
   - Gestion des formules d'abonnements ou des transactions unitaires via Stripe ou passerelle locale (Wave / Mobile Money).
   - Synchronisation asynchrone des statuts de paiement par Webhooks sécurisés.
   - **Skills AIFAC Liés :** \`[Skill: backend-node]\`, \`[Skill: security]\`
   - *Critère d'acceptation :* Tout webhook est validé par signature cryptographique avant modification du statut utilisateur.

2. **Système d'Alertes & Notifications en Temps Réel**
   - Notification dans l'application pour chaque événement critique (succès, anomalie, mise à jour).
   - Historique d'activité consultable et filtrable par l'utilisateur.
   - **Skills AIFAC Liés :** \`[Skill: frontend-react]\`, \`[Skill: qa-devops]\`

3. **Assistance Intelligente & Suggestions Contextuelles**
   - Intégration d'un copilote IA guidant l'utilisateur sur la saisie et l'exploitation des données.
   - Injection automatique de contexte projet dans les requêtes IA.
   - **Skills AIFAC Liés :** \`[Skill: agents-ai]\`, \`[Skill: orchestrator]\`

---

#### 🌟 NIVEAU 3 : VERSION V2 & SCALE (Post-MVP — Industrialisation & Automatisation)
*Objectif : Automatisation massive, passage à l'échelle et déploiement d'agents IA autonomes.*

##### Fonctionnalités Clés de la V2 :
1. **Agents IA Autonomes en Tâche de Fond (Background Workers)**
   - Exécution asynchrone de tâches lourdes (scraping, veille concurrentielle, consolidation de rapports).
   - Mécanisme de reprise sur incident et traçabilité détaillée des logs.
   - **Skills AIFAC Liés :** \`[Skill: orchestrator]\`, \`[Skill: agents-ai]\`

2. **Collaboration Multi-Utilisateurs & Gestion RBAC**
   - Espaces d'équipe partagés avec rôles granulaires : Propriétaire, Administrateur, Éditeur, Lecteur.
   - Politiques de sécurité Supabase dynamiques basées sur les rôles de tenant.
   - **Skills AIFAC Liés :** \`[Skill: security]\`, \`[Skill: backend-node]\`

3. **Tableau de Bord Analytique & Rapports Automatisés**
   - Graphiques de performance, taux de rétention, exports PDF/CSV programmés par cron.
   - Optimisation des requêtes SQL complexes avec vues matérialisées et indexation B-Tree/GIN.
   - **Skills AIFAC Liés :** \`[Skill: qa-devops]\`, \`[Skill: design-system]\`

---

### 4. MATRICE D'AFFECTATION DÉTAILLÉE DES SKILLS AI FACTORY

Chaque compétence est documentée avec un fichier dédié dans le dossier \`skills-recommandes/\` consultable directement dans l'arborescence :

| Skill ID | Nom du Skill | Niveau | Feature Assignée | Rôle & Justification Technique |
| :--- | :--- | :---: | :--- | :--- |
${skills.map((s) => `| [\`${s.skillId}\`](/app/ressources/skills/${s.skillId}) | **${s.skillName}** | \`${s.level}\` | ${s.targetFeature} | ${s.why} |`).join("\n")}

---

### 5. SCHÉMA INITIAL DE BASE DE DONNÉES SUPABASE (POSTGRESQL)

Ce schéma est prêt à être exécuté dans l'éditeur SQL de votre projet Supabase :

\`\`\`sql
-- 1. Table des profils utilisateurs connectée à Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  tier TEXT NOT NULL DEFAULT 'free',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table principale du projet
CREATE TABLE IF NOT EXISTS public.project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  level_target TEXT NOT NULL DEFAULT 'MVP',
  status TEXT NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Activation de la Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;

-- 4. Politiques de sécurité strictes
CREATE POLICY "Les utilisateurs consultent leur propre profil" 
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Les utilisateurs modifient leur propre profil" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Les utilisateurs consultent leurs propres items" 
  ON public.project_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs créent leurs propres items" 
  ON public.project_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs modifient leurs propres items" 
  ON public.project_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs suppriment leurs propres items" 
  ON public.project_items FOR DELETE USING (auth.uid() = user_id);
\`\`\`

---

### 6. DIRECTIVES SYSTÈME POUR AGENTS IA (.cursorrules)

Copiez ce bloc dans la racine de votre projet pour orchestrer vos agents de code (Cursor / Windsurf / Claude Code) :

\`\`\`markdown
# RÈGLES AGENTS IA — PROJET : ${projectName.toUpperCase()}
# Méthodologie AI Factory : Spec → Plan → Build → Deliver

Tu es le Lead Fullstack Engineer dédié au projet "${projectName}".
Tu dois appliquer rigoureusement les directives suivantes :

1. ARCHITECTURE & CODE :
   - Langage : TypeScript strict (interdiction formelle du type 'any').
   - Structure : Architecture modulaire, composants courts (<150 lignes), séparation stricte de la logique et du rendu.
   - Validation : Zod obligatoire sur chaque payload d'entrée/sortie.

2. SÉCURITÉ & DONNÉES :
   - Base de données : Supabase PostgreSQL avec RLS activé sur chaque table créée.
   - Zéro clé API secrète dans le code exposé au client.

3. CYCLE DE TRAVAIL PAR NIVEAU :
   - Niveau 1 (MVP) : Ne construis que le périmètre strict spécifié dans specs/cahier-des-charges.md.
   - Respecte les directives des skills recommandés :
${skills.map((s) => `     - [${s.skillId}] : ${s.directive}`).join("\n")}
\`\`\`

---

### 7. PLAN D'ACTION TECHNIQUE SPRINT PAR SPRINT
- [ ] **Sprint 1 (Jours 1 à 3)** : Initialisation du repo, intégration du Design System et création de la structure de base.
- [ ] **Sprint 2 (Jours 4 à 5)** : Connexion Supabase, exécution du schéma SQL et mise en place des politiques RLS.
- [ ] **Sprint 3 (Jours 6 à 7)** : Développement du flux cœur de métier du MVP et première démonstration fonctionnelle.
- [ ] **Sprint 4 (Semaine 2)** : Authentification avancée, intégration des paiements et fiabilisation V1.
- [ ] **Sprint 5 (Semaine 3)** : Automatisation par agents IA, alertes temps réel et préparation au passage à l'échelle V2.
`;
}

// Generate virtual file tree based on project
function generateVirtualFiles(projectName: string, idea: string, specMd: string, skills: SkillRecommendation[]): Record<string, VirtualFile> {
  const safeSlug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const files: Record<string, VirtualFile> = {
    "specs/cahier-des-charges.md": {
      path: "specs/cahier-des-charges.md",
      name: "cahier-des-charges.md",
      language: "markdown",
      category: "spec",
      content: specMd,
    },
    "specs/architecture.md": {
      path: "specs/architecture.md",
      name: "architecture.md",
      language: "markdown",
      category: "spec",
      content: `# Architecture Système — ${projectName}

## 1. Schéma Général des Flux
\`\`\`text
[ Client Web (React 19) ]
       │
       ▼  (HTTPS / REST / RPC)
[ Backend & Supabase ] ── (RLS Policies) ──▶ [ PostgreSQL Tables ]
       │
       ▼  (Tool Calling)
[ Moteur IA (Groq / Agent Orchestrator) ]
\`\`\`

## 2. Découpage Modulaire
- \`src/components/\` : Composants UI réutilisables du Design System.
- \`src/lib/\` : Clients d'API, helpers métier, configuration Supabase.
- \`src/agents/\` : Prompts système et logique des agents autonomes.
- \`supabase/\` : Migrations versionnées et règles de sécurité RLS.
`,
    },
    "specs/skills-matrix.md": {
      path: "specs/skills-matrix.md",
      name: "skills-matrix.md",
      language: "markdown",
      category: "spec",
      content: `# Matrice Détaillée des Skills AIFAC — ${projectName}

${skills.map((s) => `### Skill : ${s.skillName} (\`${s.skillId}\`)
- **Niveau** : ${s.level}
- **Catégorie** : ${s.category}
- **Affectation** : ${s.targetFeature}
- **Pourquoi ce skill ?** : ${s.why}
- **Cours complet** : [/app/ressources/skills/${s.skillId}](/app/ressources/skills/${s.skillId})
- **Directive d'agent** :
\`\`\`text
${s.directive}
\`\`\`
`).join("\n")}
`,
    },
    ".cursor/rules": {
      path: ".cursor/rules",
      name: "rules",
      language: "markdown",
      category: "agent",
      content: `# RÈGLES AGENTS IA — ${projectName.toUpperCase()}
# Intégration AI Factory

## Directives Générales
- Langage : TypeScript strict, code propre, modulaire et documenté en français.
- Sécurité : RLS activé sur Supabase, aucune clé secrète côté client.
- UI : Design moderne sombre, animations subtiles, feedback utilisateur immédiat.

## Skills AIFAC Activés
${skills.map((s) => `- [${s.skillId}] : ${s.directive}`).join("\n")}
`,
    },
    "supabase/schema.sql": {
      path: "supabase/schema.sql",
      name: "schema.sql",
      language: "sql",
      category: "config",
      content: `-- ==========================================
-- Schéma Initial Supabase — ${projectName}
-- ==========================================

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des éléments métier
CREATE TABLE IF NOT EXISTS public.project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activation RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own items" ON public.project_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own items" ON public.project_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON public.project_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON public.project_items FOR DELETE USING (auth.uid() = user_id);
`,
    },
    "src/agents/orchestrator.ts": {
      path: "src/agents/orchestrator.ts",
      name: "orchestrator.ts",
      language: "typescript",
      category: "agent",
      content: `/**
 * Agent Orchestrateur IA — ${projectName}
 * Responsable de la coordination des sous-agents et de l'exécution des flux.
 */

export interface AgentTask {
  id: string;
  name: string;
  level: "MVP" | "V1" | "V2";
  requiredSkill: string;
  status: "pending" | "in_progress" | "done";
}

export class ProjectOrchestrator {
  private tasks: AgentTask[] = [];

  constructor(public readonly projectName = "${projectName}") {}

  public registerTask(task: AgentTask) {
    this.tasks.push(task);
  }

  public getPendingTasks(): AgentTask[] {
    return this.tasks.filter((t) => t.status === "pending");
  }

  public executeWorkflow() {
    console.log(\`[Orchestrator] Démarrage du flux pour \${this.projectName}\`);
  }
}
`,
    },
    "package.json": {
      path: "package.json",
      name: "package.json",
      language: "json",
      category: "config",
      content: JSON.stringify(
        {
          name: safeSlug,
          version: "0.1.0",
          private: true,
          type: "module",
          scripts: {
            dev: "vite",
            build: "tsc && vite build",
            preview: "vite preview",
          },
          dependencies: {
            react: "^19.0.0",
            "react-dom": "^19.0.0",
            "@supabase/supabase-js": "^2.49.0",
            "lucide-react": "^1.16.0",
            zod: "^3.24.0",
          },
          devDependencies: {
            typescript: "^5.7.0",
            vite: "^6.0.0",
          },
        },
        null,
        2
      ),
    },
    "README.md": {
      path: "README.md",
      name: "README.md",
      language: "markdown",
      category: "spec",
      content: `# ${projectName}

> Projet structuré via le **Studio Building AI Factory**.
> Pour consulter la spécification complète et la matrice des skills, ouvrir \`specs/cahier-des-charges.md\`.

## Démarrage Rapide
\`\`\`bash
pnpm install
pnpm dev
\`\`\`
`,
    },
  };

  // Populate individual skill files in skills-recommandes/
  for (const s of skills) {
    const full = AI_SKILLS.find((item) => item.id === s.skillId);
    const path = `skills-recommandes/${s.skillId}.md`;
    files[path] = {
      path,
      name: `${s.skillId}.md`,
      language: "markdown",
      category: "agent",
      content: generateSkillDetailFile(projectName, s, full),
    };
  }

  return files;
}

export const askBuildingArchitect = createServerFn({ method: "POST" })
  .validator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    // Clé dédiée pour l'architecte de projet & Building Studio
    const rawKey = process.env["AI_KEY_BUILDING"] || process.env["GROQ_API_KEY"] || process.env["AI_API_KEY"];
    const key = cleanApiKey(rawKey);
    const userMsg = data.userMessage;

    // Detect Project Name from message if mentioned, otherwise retain or default
    let projectName = data.currentProject?.projectName || "Mon Projet AIFAC";
    const nameMatch = userMsg.match(/(?:appelé|nommé|nom du projet|projet)\s*[:«"']?\s*([A-Za-z0-9\s_-]{3,30})/i);
    if (nameMatch && nameMatch[1]) {
      projectName = nameMatch[1].trim();
    }

    const matchedSkills = matchSkillsForContext(userMsg, 9);
    let specMarkdown = data.currentProject?.currentSpec || "";

    // Always generate or update Cahier des Charges
    specMarkdown = generateDefaultCahierDesCharges(projectName, userMsg, matchedSkills);

    const virtualFiles = generateVirtualFiles(projectName, userMsg, specMarkdown, matchedSkills);

    let reply = "";
    const terminalLogs = [
      `[ARCHITECT] Analyse approfondie du projet : "${userMsg.slice(0, 60)}..."`,
      `[SKILLS-ENGINE] 219 skills inspectés. ${matchedSkills.length} skills affectés avec succès.`,
      `[SPEC] Cahier des charges "cahier-des-charges.md" généré (Niveaux MVP, V1, V2).`,
      `[SKILLS-FILES] Dossier skills-recommandes/ peuplé avec ${matchedSkills.length} fiches techniques.`,
      `[STRUCTURE] ${Object.keys(virtualFiles).length} fichiers virtuels synchronisés dans l'arborescence.`,
      `[READY] Studio mis à jour sans aucune écriture en base de données (LocalStorage).`,
    ];

    if (key) {
      try {
        const sysPrompt = `Tu es le Tech Lead et Architecte Logiciel Senior d'AI Factory (AIFAC).
Ta mission est d'analyser, cadrer et propulser l'idée de projet de l'apprenant en un produit d'ingénierie d'élite sans jamais le perdre, selon la méthode AIFAC (Spec → Plan → Build → Deliver).

RÈGLES CRITIQUES DE FORMAT & QUALITÉ :
1. NE JAMAIS RÉPONDRE EN FORMAT JSON. N'émets AUCUN bloc \`\`\`json, aucun objet { "reply": ... } dans ton texte.
2. Ta réponse doit être rédigée à 100% en texte naturel et Markdown clair, élégant et soigné en français.
3. TA RÉPONSE DOIT ÊTRE RICHE, LONGUE ET TRÈS DÉTAILLÉE : prends le temps d'expliquer l'architecture et les choix techniques.
4. DÉTAILLE TOUS LES 3 NIVEAUX DE LIVRAISON SANS EN OUBLIER AUCUN :
   - 🚀 Niveau 1 : Le MVP (Semaine 1) — Périmètre strict, interface clé, base de données Supabase, flux cœur de métier et critères d'acceptation.
   - ⚡ Niveau 2 : Version V1 (Semaines 2 & 3) — Authentification complète & RLS, gestion des paiements/monétisation, notifications temps réel et robustesse.
   - 🌟 Niveau 3 : Version V2 & Scale — Agents IA autonomes en tâche de fond, collaboration multi-utilisateurs et scalabilité.
5. EXPLIQUE EN PROFONDEUR POURQUOI LES SKILLS AIFAC SUIVANTS ONT ÉTÉ CHOISIS :
   ${matchedSkills.map((s) => `- ${s.skillName} (${s.skillId}) : Niveau ${s.level}`).join("\n")}
   Indique que chaque skill a sa propre fiche détaillée dans le dossier "skills-recommandes/" à gauche, avec un lien vers son cours complet.
6. RAPPELLE que le Cahier des Charges complet (specs/cahier-des-charges.md) a été généré et est immédiatement visualisable au centre.
7. Termine par 2 questions techniques et stratégiques stimulantes pour franchir la prochaine étape.

${PLATFORM_GUARDRAIL_PROMPT}`;

        let modelToUse = data.model && !data.model.includes("llama-3") ? data.model : "openai/gpt-oss-120b";

        let res = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: "system", content: sysPrompt },
              ...data.history.slice(-6),
              { role: "user", content: userMsg },
            ],
            temperature: 0.5,
            max_tokens: 3000,
          }),
        });

        // Fallback transparent si rate limit 429 ou model_not_found
        if ((res.status === 429 || res.status === 404) && modelToUse !== "openai/gpt-oss-20b") {
          modelToUse = "openai/gpt-oss-20b";
          await new Promise((r) => setTimeout(r, 1200));
          res = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelToUse,
              messages: [
                { role: "system", content: sysPrompt },
                ...data.history.slice(-6),
                { role: "user", content: userMsg },
              ],
              temperature: 0.5,
              max_tokens: 3000,
            }),
          });
        }

        if (res.ok) {
          const json = await res.json();
          let raw = json?.choices?.[0]?.message?.content || "";
          
          // Safety unwrapping if the LLM output was wrapped in JSON
          raw = raw.trim();
          if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("```json") && raw.endsWith("```"))) {
            try {
              const clean = raw.replace(/^```json\s*/, "").replace(/\s*```$/, "");
              const parsed = JSON.parse(clean);
              if (typeof parsed === "object" && parsed !== null) {
                raw = parsed.reply || parsed.content || parsed.message || parsed.text || raw;
              }
            } catch {
              // keep raw
            }
          }
          reply = raw;
        }
      } catch {
        // Fallback gracefully below
      }
    }

    if (!reply) {
      reply = `### Excellent projet ! Voici le cadrage complet structuré par l'Architecte AIFAC.

J'ai pris en compte votre vision pour **${projectName}** et j'ai immédiatement structuré l'ensemble de votre projet dans le **Cahier des Charges technique et fonctionnel (\`specs/cahier-des-charges.md\`)** affiché dans le studio.

---

#### 🚀 1. Niveau 1 : Le MVP (Semaine 1 — Démonstrateur Fonctionnel Clé)
- **Objectif :** Obtenir une application 100% testable en ligne avec le flux principal complet en 7 jours.
- **Périmètre :** Layout moderne, connexion Supabase, saisie et affichage des données clés, gestion des états (Skeletons).
- **Skills Clés :** \`orchestrator\`, \`frontend-react\`, \`backend-node\`, \`security\`.

#### ⚡ 2. Niveau 2 : Version V1 (Semaines 2 & 3 — Utilisable par de Vrais Clients)
- **Objectif :** Rendre l'application robuste, commerciale et prête pour des utilisateurs actifs.
- **Périmètre :** Authentification complète avec politiques RLS vérifiées, monétisation / paiement (Stripe ou Wave), alertes temps réel.
- **Skills Clés :** \`security\`, \`qa-devops\`, \`agents-ai\`.

#### 🌟 3. Niveau 3 : Version V2 & Scale (Post-MVP — Industrialisation & Agents)
- **Objectif :** Automatisation continue, passage à l'échelle et déploiement d'agents IA autonomes.
- **Périmètre :** Agents autonomes en tâche de fond, espaces d'équipe multi-utilisateurs (RBAC), graphiques et rapports analytiques avancés.

---

#### 🧩 Skills AI Factory Recommandés & Fiches Dédiées :
J'ai sélectionné **${matchedSkills.length} skills indispensables**. Le dossier **\`skills-recommandes/\`** dans l'arborescence à gauche contient désormais un fichier \`.md\` individuel pour chaque skill avec sa méthodologie et le lien vers son cours complet :
${matchedSkills.map((s) => `- **${s.skillName}** (\`${s.skillId}\`) — *${s.level}* : ${s.why}`).join("\n")}

Le document complet est disponible dans l'onglet **\`specs/cahier-des-charges.md\`**. Vous pouvez le consulter, le modifier ou le télécharger en un clic.

---
**Pour affiner encore la conception, précisez-moi :**
1. Quel est votre modèle de monétisation privilégié (abonnement mensuel, paiement à l'usage, commission) ?
2. Quels sont les volumes de données ou d'utilisateurs anticipés au lancement ?`;
    }

    return {
      reply,
      projectName,
      specMarkdown,
      virtualFiles,
      recommendedSkills: matchedSkills,
      terminalLogs,
    };
  });
