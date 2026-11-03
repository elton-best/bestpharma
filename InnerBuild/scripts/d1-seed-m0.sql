-- AI Factory — Module Socle D1 (idempotent).
-- wrangler d1 execute <DB> --remote --file=scripts/d1-seed-m0.sql
-- Module 1 · Socle — Les 7 Skills Socles AI Factory : 7 leçons détaillées + 10 QCM + 14 exercices.

INSERT OR REPLACE INTO course_modules (id, course_id, step, title, free, position, published) VALUES
('m0', 'c1', 'Socle', 'Les 7 Skills Socles AI Factory', 1, 0, 1);

INSERT OR REPLACE INTO lessons (id, module_id, title, minutes, body, task, kind, position, published) VALUES
('m0-l1', 'm0', 'Skill 1 — Orchestrator : la boucle de travail autonome', 25, 'Un skill n’est pas un simple prompt : c’est une instruction réutilisable et versionnée qui dit à un agent IA COMMENT travailler, pas seulement QUOI faire. Le skill Orchestrator est le chef d’orchestre : il découpe un objectif en étapes, appelle les bons skills dans le bon ordre, vérifie chaque résultat et boucle jusqu’à Done.

## Le schéma de la boucle autonome

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  LIRE   │──▶│CHOISIR  │──▶│CHARGER  │──▶│PRODUIRE │──▶│VÉRIFIER │──▶│ COCHER  │
│ la spec │   │1 tâche  │   │le skill │   │         │   │preuve ? │   │ ou fix  │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └────┬────┘   └─────────┘
                                                           │ non
                                                           ▼
                                                    ┌─────────────┐
                                                    │  CORRIGER   │──▶ (revérifier)
                                                    │  redécouper │
                                                    └─────────────┘
```

## Pourquoi c’est le premier skill à maîtriser

Sans orchestration, un agent produit vite mais dans toutes les directions. Tu as déjà vu ce symptôme : 80 % d’un projet bouclé en une heure, puis trois jours de chaos pour les 20 % restants. L’orchestrateur impose la discipline Spec → Plan → Build → Review → Deliver à chaque tâche, même petite.

Concrètement : une session qui commence par « fais-moi une app de todolist » sans spec produit 300 lignes à jeter. La même session qui commence par « voici la spec en 6 phrases, voici la checklist Done, tâche 1 : le formulaire d’ajout avec sa preuve » produit du code qui reste.

## Une seule tâche à la fois

La règle d’or : l’agent ne travaille que sur UNE tâche vérifiable à la fois, jamais deux en parallèle. Chaque tâche tient en une demi-journée maximum et se termine par une preuve observable : un test vert, une capture, une URL, un comportement cliquable.

Exemple de découpage : « page de connexion » devient 1) spec en 6 phrases, 2) maquette du formulaire, 3) validation Zod partagée, 4) server function login, 5) états d’erreur, 6) test du chemin critique. Six tâches, six preuves, zéro zone grise.

## La consigne d’orchestration type

Commence chaque session par ces 5 lignes : la spec, la tâche du jour, le skill chargé, la preuve attendue, le critère Done. Termine chaque session par « qu’est-ce qui est prouvé ? ». Si rien n’est prouvable, la tâche était mal découpée — redécoupe avant de continuer, ne demande jamais à l’agent de « continuer quand même ».

## Pièges fréquents

Donner dix tâches d’un coup ; accepter un résultat « à peu près bon » ; sauter la vérification quand on est pressé ; laisser l’agent choisir lui-même la prochaine étape sans validation. C’est exactement dans ces moments que la boucle doit être la plus stricte.

Checklist de sortie : tu sais expliquer la boucle en six étapes, formuler une consigne d’orchestration en début de session, et refuser un résultat non vérifié.', 'Écris ta consigne d’orchestration type (5 lignes max) : spec, tâche du jour, skill chargé, preuve attendue, critère Done. Teste-la sur ta prochaine session agent.', 'text', 1, 1),
('m0-l2', 'm0', 'Skill 2 — Frontend : React 19, Vite, TypeScript, TanStack', 25, 'Le skill Frontend te donne les fondations pour construire des interfaces rapides, typées et maintenables avec React 19, Vite, TypeScript et TanStack (Router, Query, Start). L’objectif n’est pas de connaître chaque API par cœur, mais de respecter les invariants qui évitent 90 % des bugs.

## Carte du frontend sain

```
┌──────────────┐  routes typées   ┌──────────────┐  useQuery/useMutation  ┌──────────────┐
│   ROUTEUR    │ ───────────────▶ │  COMPOSANTS  │ ─────────────────────▶ │  SERVER FNS  │
│  (URL=état)  │                  │  (props      │                        │  (D1 via API)│
└──────────────┘                  │   typées)    │                        └──────────────┘
                                  └──────┬───────┘
                                         │ état LOCAL seul
                                         ▼ (onglet, modal, champ)
                                  ┌──────────────┐
                                  │   useState   │
                                  └──────────────┘
```

## Invariant 1 — le typage strict

Chaque composant a des props typées, chaque appel réseau a un type de réponse, `any` est interdit sauf justification écrite. TypeScript n’est pas de la paperasse : c’est ton premier filet de tests, gratuit et instantané. `tsc --noEmit` à zéro erreur avant chaque commit, sans exception.

## Invariant 2 — l’état serveur appartient à TanStack Query

Données distantes = useQuery/useMutation avec clés de cache stables et invalidations ciblées. useState ne sert que pour l’état local d’interface (champ ouvert, onglet actif, modal). Mélanger les deux produit des écrans désynchronisés impossibles à déboguer : le serveur dit A, l’écran affiche B, personne ne sait pourquoi.

Exemple : la liste des leçons vient de `useProgress()` (Query, clé ["progress"]). Cocher une leçon = mutation + `invalidateQueries(["progress"])`. Jamais de tableau local synchronisé à la main.

## Invariant 3 — le routeur est la source de vérité

Routes déclarées et typées (TanStack Router), paramètres validés (zod), pas de navigation impérative dispersée. Chaque écran correspond à une URL partageable et rechargeable : `/app/apprendre?lecon=m0-l1` doit fonctionner en copier-coller, pas seulement en cliquant depuis la liste.

## Invariant 4 — Vite pour un feedback instantané

Le serveur de dev démarre en secondes, le HMR préserve l’état. Si ton feedback dépasse quelques secondes, ton outillage est cassé — répare-le avant d’écrire la moindre ligne métier. En production, le build découpe le code par route : la page d’accueil ne charge jamais le poids de l’éditeur.

## Session type

Spec du composant en 3 phrases vérifiables, types d’abord, composant ensuite, test de rendu, vérification visuelle mobile (360px) + tablette (768px) + desktop. Chaque étape prouvée avant la suivante.

Checklist de sortie : zéro `any` non justifié, zéro useState pour du serveur, routes typées, feedback dev sous 3 secondes.', 'Prends un composant existant (ou crée-en un : carte de leçon avec titre, durée, statut) en React + TypeScript : props typées, zéro any, responsive mobile/desktop. Vérifie qu’il s’affiche sans erreur console.', 'text', 2, 1),
('m0-l3', 'm0', 'Skill 3 — Backend : API propre, validation Zod, base D1', 25, 'Le skill Backend t’apprend à construire une API que d’autres (humains ou agents) peuvent utiliser sans te poser de questions. Les trois piliers : contrats validés, erreurs explicites, persistance fiable sur D1.

## Le chemin d’une requête saine

```
 Client                     Serveur (server function)                    D1
   │  input brut                     │                                    │
   │ ───────────────────────────────▶│ 1. VALIDATEUR Zod                  │
   │                                 │    invalide → { success:false }     │
   │                                 │ 2. VÉRIFIE les droits              │
   │                                 │ 3. ÉCRIT / LIT ───────────────────▶│
   │  { success, data }              │ 4. RETOURNE format uniforme         │
   │ ◀───────────────────────────────│                                    │
```

## Pilier 1 — tout input est validé avec Zod

Côté client ET côté serveur, avec un schéma partagé quand c’est possible. Ce que le formulaire accepte, le serveur l’accepte ; ce que le serveur refuse, le formulaire l’interdit. Jamais de confiance aveugle envers le client : chaque donnée venue du navigateur est suspecte jusqu’à validation.

Exemple : `recordPayment` exige userId (uuid), reference (4-80 caractères), amount (4000 par défaut). Tout le reste est rejeté avec un message métier clair, pas une stack trace.

## Pilier 2 — des server functions étroites et typées

Une fonction = une action métier, un validateur d’entrée, un type de retour, des erreurs métier. Le client n’a jamais à deviner ce qui s’est passé : `{ success: true, data }` ou `{ success: false, error }`. Les erreurs techniques (timeout D1, quota) sont traduites en messages humains côté serveur.

## Pilier 3 — D1 comme source unique

Un seul endroit où la vérité vit : la base. Pas de double écriture vers deux systèmes sauf migration explicite et temporaire — chaque copie est une divergence future. Les lectures passent par des requêtes ciblées (index sur user_id et clés étrangères), jamais de SELECT aveugle sur des tables entières, et des allowlists de tables côté server functions.

## Exemple complet : activer un accès PRO

1) FeexPay confirme le paiement (référence FP-...), 2) INSERT payments (id, user_id, reference, amount=4000, status), 3) UPDATE profiles SET access_status=pro, 4) retour { success }. Si l’étape 2 échoue, rien n’est activé ; si l’étape 3 échoue, le paiement reste traçable et réparable. Chaque étape vérifiable, chaque échec avec un message métier.

## Pièges

Valider seulement côté client ; renvoyer des erreurs techniques brutes ; écrire la même donnée à deux endroits « pour être sûr » ; oublier les index puis découvrir les lenteurs à 10 000 lignes ; exposer des clés API au client.

Checklist de sortie : schéma Zod partagé, format de réponse uniforme, source unique D1, requêtes indexées, zéro secret côté client.', 'Conçois le contrat d’une server function « toggleLesson » : schéma Zod d’entrée, type de retour, 3 cas d’erreur métier avec messages. Écris-le en 20 lignes max.', 'text', 3, 1),
('m0-l4', 'm0', 'Skill 4 — Agents IA : LLM, RAG et outils', 25, 'Le skill Agents t’apprend à brancher un modèle de langage sur TON contexte : tes cours, tes données, tes outils. Un LLM seul récite ; un LLM outillé et documenté travaille.

## Anatomie d’un agent utile

```
┌─────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   PROMPT    │   │   CONTEXTE   │   │    OUTILS    │   │  GARDE-FOUS  │
│  système :  │ + │ ciblé (RAG)  │ + │ (functions,  │ + │ (limites,    │
│ identité,   │   │ cours, DB,   │   │  tracés)     │   │  modèle,     │
│ mission,    │   │ progression  │   │              │   │  timeouts)   │
│ style       │   │ réelle       │   │              │   │              │
└─────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
                              ▼
                    ┌─────────────────────┐
                    │ BOUCLE raisonner →  │
                    │ agir (outil) →      │
                    │ observer → répondre │
                    └─────────────────────┘
```

## Brique 1 — le prompting système

Le modèle reçoit une identité (« tu es Coach AIFAC »), une mission, des contraintes de style (français, tutoiement, points avec mot-clé en gras) et TOUT le contexte nécessaire. Règle d’or : si l’agent invente, c’est que le contexte manquait. Un coach qui connaît le cours par cœur cite précisément (module + leçon) au lieu de généralités.

## Brique 2 — le RAG léger

Plutôt que de tout mettre dans le prompt, on récupère les passages pertinents (texte du cours en mémoire, progression D1 de l’apprenant) et on ne donne que ça. Moins de bruit = moins d’hallucinations = réponses plus rapides et moins chères. Exemple : le coach reçoit « leçon en cours + tâche + niveau » et propose les 3 prochaines étapes RÉELLES, pas génériques.

## Brique 3 — les outils

L’agent ne se contente pas de parler : il appelle des fonctions (lecture DB, calcul, génération) puis intègre les résultats. Boucle : raisonner → agir → observer → répondre. Chaque appel est tracé (toolTrace) pour rester auditable : on voit quel outil a servi quelle réponse.

## Brique 4 — les garde-fous

Limites de taille (40 messages max, contexte plafonné), modèle adapté à la tâche (gros pour raisonner, petit pour classer), timeouts et retries, jamais de secret côté client, jamais de clé API dans le navigateur. Un agent sans garde-fou est une facture surprise qui attend son heure — et une fuite de données potentielle.

## Exemple concret : le Coach AIFAC

Contexte = cours complet + ta progression ; outils = lecture des leçons et historique ; style = accroche directe, points structurés, recommandation concrète ; garde-fous = français obligatoire, jamais de code non demandé, redirection vers la leçon exacte quand tu bloques.

Checklist de sortie : prompt système avec identité + mission + style, contexte ciblé, outils tracés, limites et modèle adaptés.', 'Rédige le prompt système d’un mini-coach (10 lignes) : identité, mission, 3 règles de style, 2 garde-fous. Teste-le mentalement sur « explique-moi la spec ».', 'text', 4, 1),
('m0-l5', 'm0', 'Skill 5 — QA : qualité, tests et livraison continue', 25, 'Le skill QA transforme « ça marche sur ma machine » en « c’est prouvé, c’est déployé ». La qualité n’est pas une phase à la fin : c’est une boucle à chaque tâche, du moins cher au plus cher.

## La pyramide des contrôles (du moins cher au plus cher)

```
        ▲ coût
        │
   5.   │   ● Déploiement + vérification en ligne
   4.   │   ● Tests ciblés (chemins critiques)
   3.   │   ● Build de production
   2.   │   ● Revue (humaine ou agent)
   1.   │   ● Typecheck tsc --noEmit
        └──▶ à chaque tâche, on monte tant que ça passe
```

## Niveau 1 — le typecheck

`tsc --noEmit` doit passer à zéro erreur avant chaque commit. C’est le test le moins cher qui existe : il attrape les fautes de frappe, les contrats cassés, les imports morts. Tolérance zéro, pas « juste un warning ». Un warning d’aujourd’hui est le bug de demain.

## Niveau 2 — la revue

Relis ton diff (ou fais-le relire par l’agent) ligne par ligne : chaque changement doit avoir une raison. Question magique : « si je supprime cette ligne, quel test échoue ? » Si aucun, la ligne est suspecte.

## Niveau 3 — le build

`npm run build` doit réussir. Un projet qui ne build pas n’existe pas. Le build de production révèle ce que le dev server pardonne : imports insensibles à la casse, variables d’environnement manquantes, chunks trop gros, assets absents.

## Niveau 4 — les tests ciblés

Pas 100 % de couverture pour la galerie : des tests sur les chemins critiques (auth, paiement, progression, verrouillage des leçons). Chaque bug corrigé laisse un test derrière lui, sinon il reviendra — c’est la taxe d’apprentissage la plus rentable.

## Niveau 5 — la livraison continue

Chaque push déclenche typecheck + build automatiquement. Le déploiement suit quand c’est vert. Variables d’environnement par cible (production/preview/development sur Vercel), secrets jamais dans le code, migrations DB appliquées avant le code qui les utilise.

## La définition de Done

Tests verts, revue passée, déployé, montré à quelqu’un. Écris-la AVANT de coder, pas après — c’est elle qui dit quand tu as le droit de t’arrêter, pas ta fatigue.

Checklist de sortie : tsc zéro erreur, build vert, tests sur chemins critiques, Done écrit d’avance, secrets en variables d’environnement.', 'Écris ta checklist Done personnelle (5 à 8 points) et applique-la à ton prochain commit : tsc, build, test manuel du chemin critique.', 'text', 5, 1),
('m0-l6', 'm0', 'Skill 6 — Design System : cohérence, accessibilité, responsive', 25, 'Le skill Design System garantit que chaque écran ressemble à la même application — et qu’elle reste utilisable par tout le monde, sur tout écran. Cohérence + accessibilité + responsive : les trois ensemble, jamais deux sur trois.

## Les 3 piliers d’un écran sain

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    COHÉRENCE     │  │  ACCESSIBILITÉ   │  │    RESPONSIVE    │
│ tokens +         │  │ WCAG : contraste │  │ mobile-first,    │
│ composants       │  │ clavier, 44px,   │  │ wrap, min-w-0,   │
│ partagés         │  │ pas couleur seule│  │ overflow-x: clip │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Pilier 1 — cohérence par tokens

Couleurs (paper/ink/accent/amber/emerald), polices (Sora titres, Space Grotesk texte), rayons, ombres : tout est centralisé dans le système. Aucune couleur ou taille en dur dans les écrans : tout passe par tokens et composants partagés (btn-glow, cartes, badges, pills). Une exception = une dette qui se voit.

## Pilier 2 — accessibilité WCAG

Contrastes suffisants (texte/muted sur fond), labels sur chaque champ, focus visible au clavier, zones tactiles 44px minimum, jamais d’information portée par la seule couleur (toujours icône + texte). Test décisif : navigue au clavier uniquement. Si tu ne peux pas tout faire sans souris — cocher une leçon, payer, soumettre un rendu — c’est cassé.

## Pilier 3 — responsive mobile-first

On dessine pour 360px d’abord, puis sm (640), md (768, tablette), lg+. Règles anti-débordement : pas de largeur fixe en pixels sur du contenu, pas de `w-screen` (100vw + scrollbar = overflow), `min-w-0` dans chaque conteneur flex, textes longs en `truncate`, groupes de pills en `flex-wrap`, et `overflow-x: clip` en garde-fou global (il préserve le sticky, contrairement à hidden sur certains navigateurs).

Cas réel : sur tablette 768px, une grille 2 colonnes ne fait que ~340px par carte. Deux pills côte à côte (« Relu avec toi » + « 15 min chrono ») débordaient et faisaient « bouger » toute la page. Correctif : wrap + largeurs minimales à zéro. Retiens la méthode : reproduire à la largeur exacte, identifier l’élément qui dépasse, contraindre, re-tester aux 3 largeurs (360 / 768 / 1280).

## Exemple : un badge d’état

Conteneur min-w-0, icône shrink-0, texte truncate, pill shrink-0. Résultat : lisible à 360px comme à 1280px, jamais de scroll horizontal, jamais de chevauchement.

Checklist de sortie : zéro valeur en dur, navigation clavier complète, aucun scroll horizontal à 360px et 768px, composants réutilisés du système.', 'Audite un de tes écrans : liste 5 valeurs en dur (couleurs/tailles), remplace-les par des tokens, puis teste à 360px et 768px sans scroll horizontal.', 'text', 6, 1),
('m0-l7', 'm0', 'Skill 7 — Sécurité : OWASP, secrets et accès', 25, 'Le skill Sécurité t’évite les failles qui coûtent cher : fuite de données, comptes piratés, factures explosées. L’OWASP Top 10 tient en cinq réflexes simples appliqués systématiquement.

## Les 5 réflexes en carte

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 1.SECRETS│ │ 2.AUTH   │ │ 3.DROITS │ │ 4.INPUTS │ │ 5.PRIVI- │
│ jamais   │ │ hash +   │ │ vérifiés │ │ validés  │ │ LÈGES    │
│ en clair │ │ token    │ │ serveur  │ │ paramétr │ │ minimaux │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Réflexe 1 — secrets jamais en clair ni au client

Clés API, tokens, mots de passe : variables d’environnement côté serveur uniquement, jamais dans le repo, jamais dans le bundle client, jamais dans le localStorage. Un secret commité est un secret compromis : on le révoque d’abord, on le supprime ensuite. Vérifie chaque diff avant de push (scan `fp_`, `sk-`, `BEGIN PRIVATE`, IDs de compte).

## Réflexe 2 — authentification solide

Mots de passe hashés (PBKDF2 100k itérations / bcrypt, jamais en clair), réinitialisation par token à usage unique avec expiration (24h) stocké en base, sessions explicites avec déconnexion réelle. Rate-limiting sur login et reset pour bloquer le force brute. Messages d’erreur qui ne révèlent rien : « identifiants incorrects » plutôt que « cet email n’existe pas » — sauf panne service, qui doit être annoncée clairement.

## Réflexe 3 — autorisation à chaque accès

Posséder un lien ne donne aucun droit : chaque lecture/écriture vérifie que l’utilisateur a le droit (propriétaire de la ligne ou admin). Les guards existent côté route ET côté server function, jamais seulement côté client — le client est contournable par définition. Exemple : la route /admin vérifie le rôle admin avant même d’afficher ; les server functions filtrent par user_id.

## Réflexe 4 — inputs validés, requêtes paramétrées

Tout input est validé (Zod : type, longueur, format) puis passé en paramètres, jamais concaténé dans du SQL. Les contenus affichés sont échappés par le framework — jamais de HTML brut avec des données utilisateur. Les uploads sont typés et limités en taille (5 Mo image, 25 Mo PDF) avec vérification du content-type réel.

## Réflexe 5 — moindre privilège côté infra

Tokens d’API limités au périmètre nécessaire (un token Vercel limité au projet, un token Cloudflare limité au compte), buckets R2 privés sauf besoin public réel, CORS restreint, allowlists de tables côté server functions (une table non listée = inaccessible), logs sans données sensibles ni secrets.

Checklist de sortie : zéro secret dans le repo, hash + reset par token, vérification des droits côté serveur, inputs validés et paramétrés, tokens au périmètre minimal.', 'Passe ton projet au crible : 1) scan de secrets dans le diff, 2) un endpoint sans vérification de droits, 3) un input non validé. Corrige les trois et note ce que tu as trouvé.', 'text', 7, 1);

INSERT OR REPLACE INTO quiz_questions (id, module_id, question, choices, correct, explanation, points, position, published) VALUES
('m0-q1', 'm0', 'Qu’est-ce qu’un skill pour un agent IA ?', '["Un simple prompt de politesse", "Une instruction réutilisable qui dit COMMENT travailler", "Un fichier image", "Un mot de passe"]', 1, 'Un skill apporte méthode et contraintes réutilisables, pas juste un texte ponctuel.', 10, 1, 1),
('m0-q2', 'm0', 'Que faire en premier à chaque session agent ?', '["Lui donner dix tâches d’un coup", "Rappeler spec, tâche du jour et preuve attendue", "Lui demander d’aller vite", "Sauter la vérification"]', 1, 'L’orchestration commence par cadrer : une tâche, une preuve, une checklist Done.', 10, 2, 1),
('m0-q3', 'm0', 'Où doit vivre l’état serveur dans une app React ?', '["Dans useState", "Dans TanStack Query", "Dans le localStorage", "Dans une variable globale"]', 1, 'Données distantes = cache Query avec invalidations ; useState = état local d’interface.', 10, 3, 1),
('m0-q4', 'm0', 'Pourquoi valider les inputs avec Zod côté serveur ?', '["Le client ne doit jamais être cru sur parole", "Pour faire joli", "Pour ralentir l’API", "Ce n’est pas nécessaire"]', 1, 'Toute donnée client est suspecte : validation serveur obligatoire, idéalement schéma partagé.', 10, 4, 1),
('m0-q5', 'm0', 'Qu’est-ce qui réduit le plus les hallucinations d’un agent ?', '["Un modèle plus gros", "Un contexte ciblé (RAG) et des outils tracés", "Plus d’emojis", "Des réponses plus longues"]', 1, 'Moins de bruit + outils vérifiables = réponses fondées et auditables.', 10, 5, 1),
('m0-q6', 'm0', 'Quel est le test qualité le moins cher ?', '["Les tests E2E", "Le typecheck tsc --noEmit à zéro erreur", "La revue par 5 personnes", "Aucun test"]', 1, 'Le typage strict attrape gratuitement fautes et contrats cassés avant chaque commit.', 10, 6, 1),
('m0-q7', 'm0', 'Que faut-il vérifier à 360px et 768px ?', '["Rien, le desktop suffit", "Aucun scroll horizontal, contenus qui wrappent", "Seulement les couleurs", "Seulement la vitesse"]', 1, 'Mobile-first + garde-fou overflow-x : chaque breakpoint se teste réellement.', 10, 7, 1),
('m0-q8', 'm0', 'Où doivent vivre les clés API ?', '["En variables d’environnement côté serveur uniquement", "Dans le code, c’est pratique", "Dans le localStorage", "Dans l’URL"]', 1, 'Un secret commité ou exposé au client est compromis : env serveur + périmètre minimal.', 10, 8, 1),
('m0-q9', 'm0', 'Quand une leçon se débloque-t-elle ?', '["Tout de suite, tout est ouvert", "Quand la leçon précédente est marquée terminée", "Après paiement uniquement", "Au hasard"]', 1, 'Progression séquentielle : chaque étape prouvée débloque la suivante.', 10, 9, 1),
('m0-q10', 'm0', 'Que contient une bonne définition de Done ?', '["Juste : ça marche chez moi", "Tests verts, revue passée, déployé, montré à quelqu’un", "Beaucoup de lignes de code", "Aucune erreur console"]', 1, 'Done = prouvé de bout en bout, pas ressenti.', 10, 10, 1);

INSERT OR REPLACE INTO exercises (id, module_id, title, instructions, type, points, position, published) VALUES
('m0-e1', 'm0', 'Théorie — Expliquer la boucle autonome', 'En 10 lignes maximum, explique la boucle de travail autonome en 6 étapes (lire la spec, choisir une tâche, charger le skill, produire, vérifier, cocher). Donne un exemple concret de preuve attendue pour une tâche de ton choix.', 'question_reponse', 10, 1, 1),
('m0-e2', 'm0', 'Pratique — Consigne d’orchestration', 'Rédige ta consigne d’orchestration type (5 lignes max : spec, tâche du jour, skill chargé, preuve attendue, critère Done). Applique-la à une vraie session avec un agent et joins le résultat obtenu : qu’est-ce qui a été prouvé ?', 'projet', 20, 2, 1),
('m0-e3', 'm0', 'Théorie — Typage et état', 'Explique en 8 lignes : 1) pourquoi bannir any non justifié, 2) quand utiliser useState vs useQuery, 3) ce que veut dire « routes typées ». Illustre chaque point par un exemple (bon vs mauvais).', 'question_reponse', 10, 3, 1),
('m0-e4', 'm0', 'Pratique — Composant typé responsive', 'Crée un composant carte de leçon (titre, durée, statut) en React + TypeScript : props typées, zéro any, responsive mobile/desktop, sans erreur console. Dépose le code et une capture à 360px et 1024px.', 'projet', 20, 4, 1),
('m0-e5', 'm0', 'Théorie — Contrat d’API', 'Décris le contrat idéal d’une server function : validateur Zod partagé, format de réponse uniforme, 3 exemples d’erreurs métier avec messages. Explique pourquoi la validation client seule ne suffit pas.', 'question_reponse', 10, 5, 1),
('m0-e6', 'm0', 'Pratique — Spec de server function', 'Écris la spec complète d’une server function « recordPayment » (entrée, sortie, erreurs, effets DB) en 20 lignes max, avec le schéma Zod. Le montant par défaut doit être 4000.', 'projet', 20, 6, 1),
('m0-e7', 'm0', 'Théorie — RAG et outils', 'Explique la différence entre prompt système, RAG et outils (tools) en donnant un exemple pour chacun. Pourquoi un agent sans garde-fou est-il dangereux (coûts, hallucinations) ?', 'question_reponse', 10, 7, 1),
('m0-e8', 'm0', 'Pratique — Mini-coach', 'Rédige le prompt système d’un mini-coach (identité, mission, 3 règles de style, 2 garde-fous) et teste-le sur 3 questions : note ce qui est bon et ce qui hallucine. Propose une correction (contexte ou outil manquant).', 'projet', 20, 8, 1),
('m0-e9', 'm0', 'Théorie — Pyramide QA', 'Ordonne ces contrôles du moins cher au plus cher : tests E2E, typecheck, revue humaine, build, tests unitaires ciblés. Justifie l’ordre et explique où placer ta checklist Done dans le flux.', 'question_reponse', 10, 9, 1),
('m0-e10', 'm0', 'Pratique — Checklist Done appliquée', 'Écris ta checklist Done (5 à 8 points) puis applique-la à un vrai commit : capture le résultat tsc, le build, et le test manuel du chemin critique. Tout doit être vert.', 'projet', 20, 10, 1),
('m0-e11', 'm0', 'Théorie — Tokens et accessibilité', 'Explique : 1) ce qu’est un design token et pourquoi bannir les valeurs en dur, 2) trois règles WCAG essentielles (contraste, clavier, cible tactile), 3) la stratégie mobile-first avec l’exemple 360px/768px.', 'question_reponse', 10, 11, 1),
('m0-e12', 'm0', 'Pratique — Audit responsive', 'Audite un écran : liste 5 valeurs en dur, remplace-les par des tokens, teste à 360px et 768px sans scroll horizontal (captures). Vérifie la navigation complète au clavier.', 'projet', 20, 12, 1),
('m0-e13', 'm0', 'Théorie — Les 5 réflexes sécurité', 'Liste et explique les 5 réflexes (secrets, auth, autorisation, validation/injection, moindre privilège). Pour chacun, donne un exemple d’attaque évitée.', 'question_reponse', 10, 13, 1),
('m0-e14', 'm0', 'Pratique — Audit sécurité', 'Passe un projet au crible : recherche de secrets exposés, endpoint sans vérification de droits, input non validé. Corrige les trois findings et documente chacun (risque + correctif).', 'projet', 20, 14, 1);
