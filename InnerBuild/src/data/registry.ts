export type Skill = { name: string; unlock: string };

export type Shelf = {
  code: string;
  title: string;
  count: number;
  concret: string;
  skills: Skill[];
};

export type RegistrySkill = {
  name: string;
  rayon: 'Méthode' | 'Frontend' | 'Backend' | 'IA' | 'Qualité';
  desc: string;
  icon: string;
  tint: string;
};

export const REGISTRY_SKILLS: RegistrySkill[] = [
  { name: 'planning-and-task-breakdown', rayon: 'Méthode', desc: 'Découper un brief en tâches petites, ordonnées et vérifiables.', icon: 'linear.svg', tint: '#E8EEFF' },
  { name: 'spec-driven-development', rayon: 'Méthode', desc: 'Écrire la spec avant le code : scope IN/OUT et critères mesurables.', icon: 'markdown-light.svg', tint: '#E8EEFF' },
  { name: 'interview-me', rayon: 'Méthode', desc: 'Faire clarifier le besoin par l’agent avant qu’il ne code.', icon: 'openai.svg', tint: '#E8EEFF' },
  { name: 'documentation-and-adrs', rayon: 'Méthode', desc: 'Tracer chaque décision : contexte, choix, conséquences.', icon: 'obsidian.svg', tint: '#E8EEFF' },
  { name: 'frontend-design', rayon: 'Frontend', desc: 'Composer une page claire : hiérarchie, rythme, contraste, responsive.', icon: 'figma.svg', tint: '#FFF1E6' },
  { name: 'react-best-practices', rayon: 'Frontend', desc: 'Structurer des composants React lisibles et réutilisables.', icon: 'react_light.svg', tint: '#FFF1E6' },
  { name: 'threejs-3d-arsenal', rayon: 'Frontend', desc: 'Intégrer 45 effets Three.js : hero, particules, certificats 3D.', icon: 'threejs-light.svg', tint: '#FFF1E6' },
  { name: 'api-and-interface-design', rayon: 'Backend', desc: 'Dessiner des routes REST cohérentes et documentées.', icon: 'postman.svg', tint: '#E9F3EC' },
  { name: 'app-auth', rayon: 'Backend', desc: 'Brancher login, sessions et rôles sans bricoler la sécurité.', icon: 'auth0.svg', tint: '#E9F3EC' },
  { name: 'pdf / docx / xlsx', rayon: 'Backend', desc: 'Générer factures, rapports et exports vraiment utilisables.', icon: 'microsoft-office.svg', tint: '#E9F3EC' },
  { name: 'mcp-builder', rayon: 'IA', desc: 'Exposer tes outils via MCP pour agir dans ton projet.', icon: 'anthropic_black.svg', tint: '#EFEBFF' },
  { name: 'skill-creator', rayon: 'IA', desc: 'Créer tes skills réutilisables au format SKILL.md.', icon: 'cursor_light.svg', tint: '#EFEBFF' },
  { name: 'claude-api', rayon: 'IA', desc: 'Appeler les modèles : prompts, streaming, coûts maîtrisés.', icon: 'claude-ai-icon.svg', tint: '#EFEBFF' },
  { name: 'test-driven-development', rayon: 'Qualité', desc: 'Écrire le test d’abord, coder ensuite, prouver que ça passe.', icon: 'vitest.svg', tint: '#E6F6EC' },
  { name: 'code-review', rayon: 'Qualité', desc: 'Relire avec checklist, sans ego.', icon: 'github_light.svg', tint: '#E6F6EC' },
  { name: 'ci-cd-and-automation', rayon: 'Qualité', desc: 'Automatiser lint, tests et build pour un main toujours vert.', icon: 'docker.svg', tint: '#E6F6EC' },
];

export const SPEC_TEMPLATE = `# Cahier de charge — MON PROJET
## 1. Contexte
Qui, quoi, pourquoi, pour quand.
## 2. Scope IN
- Fonctionnalité 1 (critère mesurable)
## 3. Scope OUT
- Explicitement exclu
## 4. Parcours critiques
1. L’utilisateur fait X, le système répond Y
## 5. Critères Done
- [ ] Tests verts
- [ ] Lint 0 erreur
- [ ] README explique comment tester
`;

export const BRIEF_TEMPLATE = `# Brief agent — MON PROJET
## Mission
Livrer X en une phrase.
## Contraintes
- Stack, délais, interdits
## Skills à utiliser
- planning-and-task-breakdown
- test-driven-development
## Définition de Done
- Preuves exigées avant de conclure
`;

export const shelves: Shelf[] = [
  {
    code: "00",
    title: "Orchestration",
    count: 44,
    concret:
      "Tu pilotes plusieurs agents sur un même chantier sans perdre le fil ni réécrire trois fois la même chose.",
    skills: [
      { name: "spec-writer", unlock: "Transformer une idée floue en cahier de charge exécutable." },
      { name: "plan-splitter", unlock: "Découper un chantier en lots livrables et vérifiables." },
      { name: "agent-router", unlock: "Envoyer chaque tâche à l'agent qui sait vraiment la faire." },
      { name: "done-loop", unlock: "Boucler jusqu'à Done au lieu de s'arrêter à « ça compile »." },
    ],
  },
  {
    code: "01",
    title: "Frontend & 3D",
    count: 83,
    concret: "Tu sors des interfaces qui tiennent la route, avec 45 effets 3D prêts à poser.",
    skills: [
      { name: "design-tokens", unlock: "Une identité cohérente au lieu de couleurs au hasard." },
      { name: "motion-kit", unlock: "Des animations lisibles qui servent la lecture." },
      { name: "three-scene", unlock: "Une scène 3D performante sans casser le mobile." },
      { name: "responsive-audit", unlock: "Repérer les casses d'affichage avant tes utilisateurs." },
    ],
  },
  {
    code: "02",
    title: "Backend & Docs",
    count: 12,
    concret: "Tes données sont protégées par défaut et ta doc se met à jour avec le code.",
    skills: [
      { name: "schema-first", unlock: "Un modèle de données pensé avant la première ligne." },
      { name: "rls-guard", unlock: "Refus par défaut, accès explicite, zéro fuite." },
      { name: "api-contract", unlock: "Des endpoints stables que l'on peut tester." },
      { name: "doc-sync", unlock: "Une documentation qui reflète l'état réel du projet." },
    ],
  },
  {
    code: "03",
    title: "Agents IA",
    count: 54,
    concret: "Tu écris des briefs d'agents qui produisent un résultat utilisable du premier coup.",
    skills: [
      { name: "agent-brief", unlock: "Cadrer rôle, limites et critères de réussite." },
      { name: "tool-design", unlock: "Donner à l'agent les bons outils, pas tous les outils." },
      { name: "context-budget", unlock: "Garder l'agent précis sur les longs chantiers." },
      { name: "eval-harness", unlock: "Mesurer si l'agent s'améliore ou régresse." },
    ],
  },
  {
    code: "04",
    title: "QA & Debug",
    count: 16,
    concret: "Tu reproduis un bug, tu l'isoles, tu le corriges — sans tourner en rond.",
    skills: [
      { name: "repro-first", unlock: "Reproduire avant de corriger, toujours." },
      { name: "trace-reader", unlock: "Lire une trace d'erreur et viser la bonne cause." },
      { name: "browser-probe", unlock: "Inspecter l'appli en vrai, pas en supposition." },
      { name: "regression-net", unlock: "Empêcher un bug corrigé de revenir." },
    ],
  },
  {
    code: "05",
    title: "Architecture",
    count: 3,
    concret: "Tu choisis une structure que tu pourras encore tenir dans six mois.",
    skills: [
      { name: "boundary-map", unlock: "Séparer clairement client, serveur et données." },
      { name: "adr-writer", unlock: "Tracer les décisions et leurs raisons." },
      { name: "cost-check", unlock: "Anticiper la facture avant la mise en ligne." },
    ],
  },
];

export const proofs = [
  {
    key: "registre",
    title: "Registre",
    metric: "212 skills",
    detail:
      "Un registre curé et classé en 6 rayons, chaque skill documenté avec ce qu'il débloque concrètement.",
    points: ["6 rayons thématiques", "Fiches d'usage par skill", "Mise à jour continue"],
  },
  {
    key: "linguaflow",
    title: "LinguaFlow",
    metric: "22 tests",
    detail: "Produit livré : application de traduction guidée, couverte par 22 tests fonctionnels.",
    points: ["Livré en production", "22 tests verts", "Boucle QA complète"],
  },
  {
    key: "afria",
    title: "AFRIA",
    metric: "11 tests",
    detail: "Produit livré : assistant métier régional, validé sur 11 scénarios critiques.",
    points: ["Scénarios métier réels", "11 tests verts", "Revue avant livraison"],
  },
  {
    key: "coding-pro-3d",
    title: "Coding Pro 3D",
    metric: "10 sections",
    detail: "Parcours 3D complet : 10 sections, 45 effets réutilisables dans tes propres projets.",
    points: ["45 effets prêts", "10 sections guidées", "Perf mobile vérifiée"],
  },
  {
    key: "methode",
    title: "Méthode",
    metric: "100% checklists",
    detail: "Chaque étape de la boucle a sa checklist : rien ne part sans être vérifié.",
    points: ["Definition of Done", "Revue systématique", "Zéro livraison à l'aveugle"],
  },
];

export const steps = [
  { n: "01", title: "Spec", text: "On écrit ce qui doit exister, en clair, avant d'ouvrir l'éditeur." },
  { n: "02", title: "Plan", text: "On découpe en lots livrables, chacun vérifiable seul." },
  { n: "03", title: "Build", text: "On construit avec les agents, skill par skill." },
  { n: "04", title: "Review & QA", text: "On relit, on teste, on reproduit les bugs avant les utilisateurs." },
  { n: "05", title: "Deliver", text: "On livre, on mesure, on boucle jusqu'à Done." },
];

export const faqs = [
  {
    q: "Il faut déjà savoir coder ?",
    a: "Oui, un niveau développeur junior suffit. On ne t'apprend pas la syntaxe, on t'apprend à livrer avec des agents.",
  },
  {
    q: "C'est un abonnement ?",
    a: "Non. 4 000 F CFA une seule fois, accès à la formation et à l'accompagnement jusqu'à ta première livraison validée.",
  },
  {
    q: "Comment se passe l'accompagnement ?",
    a: "100% à distance. Tu soumets tes rendus, un mentor les relit ligne par ligne et te renvoie des corrections jusqu'à validation.",
  },
  {
    q: "Combien de temps ça prend ?",
    a: "La plupart des apprenants valident leur première livraison en 3 à 5 semaines, à leur rythme.",
  },
  {
    q: "Quels moyens de paiement ?",
    a: "Mobile Money (MTN, Moov, Celtiis, Orange, Wave, Free) et carte bancaire Visa/Mastercard.",
  },
];
