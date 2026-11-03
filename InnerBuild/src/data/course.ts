import { SOCLE_LESSONS, SOCLE_QUIZ, SOCLE_EXERCISES } from "./socle";

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
  kind?: "theorie" | "pratique";
};
export type Module = {
  id: string;
  step: string;
  title: string;
  free?: boolean;
  lessons: Lesson[];
  quiz?: QuizQ[];
  exercises?: Exercise[];
};

// Cours en code (source de vérité) — la DB ne suit que la progression (lesson_progress,
// skill_lesson_progress), les rendus et les contenus créés par l'admin.
export const coreSkillsModule: Module = {
  id: "m0",
  step: "Socle",
  title: "Les 7 Skills Socles AI Factory",
  free: true,
  lessons: SOCLE_LESSONS as Lesson[],
  quiz: SOCLE_QUIZ,
  exercises: SOCLE_EXERCISES,
};

export let modules: Module[] = [
  coreSkillsModule,
  {
    id: "m1",
    step: "Spec",
    title: "Écrire ce qu’on livre",
    free: true,
    lessons: [
      {
        id: "m1-l1",
        title: "Pourquoi 80% des projets IA échouent sans Spécification (L’Ingénierie Spec-First)",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Expliquer le piège cognitif de la « vitesse de génération » et le mécanisme exact du **Mur des 80%**.\n- Énoncer le principe **Spec-First** et le défendre face à un client ou un coéquipier pressé.\n- Citer les **5 piliers** d'une spécification invariable et reconnaître leur absence dans un projet.\n- Diagnostiquer, sur un projet mort, laquelle des 4 dégradations techniques l'a tué.\n- Démarrer ton prochain projet par un `SPEC.md` plutôt que par un prompt.",

          "## 1. L'analogie fondatrice : le bâtiment sans plan d'architecte",
          "Personne ne coule une dalle de béton en se disant « on verra bien où mettre les murs ». Pourtant, c'est exactement ce que font 80% des développeurs avec les agents IA : ils « coulent du code » à grande vitesse sans plan, puis s'étonnent que l'immeuble penche au 3ème étage et s'effondre au 4ème.",
          "Le plan d'architecte du logiciel s'appelle la **spécification** (`SPEC.md`). Elle coûte quelques heures au début — et elle économise des semaines de démolition à la fin. La différence entre un amateur et un ingénieur AI Factory tient en une phrase : **l'amateur commence par le code, l'ingénieur commence par le contrat.**",

          "## 2. La grande illusion de la vitesse de génération",
          "Aujourd'hui, n'importe quel développeur armé d'un agent LLM puissant (Claude Code, Cursor, Copilot, Antigravity) peut générer 500 lignes de React ou de Python en 15 secondes. Cette vitesse grisante crée un piège cognitif mortel : la confusion entre **vitesse de génération de texte** et **productivité d'ingénierie**.",
          "Générer du code est devenu instantané et gratuit. Mais un LLM est un **processeur statistique probabiliste sans mémoire globale ni intuition produit**. Si tu lui fournis des instructions floues (« *Fais-moi un beau dashboard de réservation avec des cartes et des filtres* »), il résout le besoin **localement** en introduisant de l'entropie technique **globalement** dans ta codebase. Chaque prompt flou est un petit prêt à taux usuraire : tu gagnes 10 minutes aujourd'hui, tu rembourses 10 heures dans trois semaines.",

          "## 3. Anatomie de la défaillance : les 4 dégradations du Mur des 80%",
          "Lorsqu'un projet grossit sans spécification, 4 phénomènes de dégradation se produisent **inévitablement** — apprends à les reconnaître, tu les verras partout :",
          "1. **L'enchevêtrement des composants** : les composants React s'entremêlent sans découpage modulaire — vues, appels API et état local dans les mêmes fichiers. Modifier l'un casse l'autre.\n2. **La dégradation du typage** : sous la pression, `any` se multiplie, les assertions forcées contournent le compilateur. Le filet de sécurité TypeScript est troué précisément là où on en aurait besoin.\n3. **La régression en chaîne** : une modification du composant de la ligne 400 casse silencieusement la logique de paiement de la ligne 50. Personne ne le voit avant la production.\n4. **L'explosion de la fenêtre de contexte** : l'agent perd le fil du projet, réinvente des fonctions existantes, hallucine des APIs. Plus le projet grossit, plus il dérive.",
          "| Symptôme observable | Dégradation en cause | Signal d'alarme typique |\n| :--- | :--- | :--- |\n| « Je n'ose plus toucher ce fichier » | Enchevêtrement | Composant > 300 lignes qui fetch, calcule et affiche |\n| « Ça compile mais ça plante en prod » | Typage dégradé | `as any`, `@ts-ignore` dans le diff |\n| « Ce bug était corrigé la semaine dernière » | Régression en chaîne | Aucun test, aucune spec de comportement |\n| « L'agent vient de recréer une fonction qui existe » | Contexte explosé | Fichiers dupliqués, helpers redondants |",

          "## 4. Le principe fondamental : Spec-First Engineering",
          "Dans la méthode **AI Factory**, le principe est absolu et non négociable : **aucun développeur et aucun agent IA ne tape la moindre ligne de code avant que la spécification (`SPEC.md`) ne soit rédigée, relue et déclarée 100% testable.**",
          "La spécification n'est pas de la paperasse administrative : c'est le **Contrat d'Exécution Invariable** entre l'intelligence humaine et les assistants IA. Elle transforme la relation avec l'agent : tu ne « discutes » plus avec lui en espérant qu'il devine — tu lui transmets un contrat (`@SPEC.md`) qu'il doit honorer clause par clause. Et quand il dévie, tu n'argumentes pas : tu pointes la clause.",

          "## 5. Les 5 piliers d'une spécification invariable",
          "Un `SPEC.md` digne de ce nom fixe 5 piliers que l'agent doit scrupuleusement respecter :",
          "1. **Le périmètre explicite (In-Scope vs Out-of-Scope)** : ce qu'on construit exactement dans cette version — et ce qu'on refuse catégoriquement d'inclure. Le Out-of-Scope est ton arme anti-dérive : « le mode sombre est hors périmètre » clôt le débat avant qu'il n'existe.\n2. **Les parcours utilisateur observables (User Stories)** : chaque comportement décrit en critères d'acceptation **binaires** (VRAI ou FAUX). Pas « l'inscription est simple », mais « l'envoi du formulaire avec un email invalide affiche “Adresse invalide” sous le champ, sans appel réseau ».\n3. **Les contrats d'interface & modèles de données** : types TypeScript, schémas Zod, signatures d'API. C'est le squelette que l'agent ne peut pas déformer.\n4. **La matrice de gestion des erreurs** : le comportement exact face aux pannes réseau, timeouts, 401/403/500 et saisies invalides. Un cas d'erreur non spécifié est un crash en production programmé.\n5. **La Definition of Done scientifique** : les contrôles factuels à cocher pour déclarer la tâche terminée (détaillés dans la leçon m1-l3).",

          "## 6. Comparatif : approche amateure vs approche AI Factory",
          "| Dimension | Approche amateure (prompt flou) | Approche AI Factory (Spec-First) |\n| :--- | :--- | :--- |\n| **Prompt initial** | « Crée un formulaire de paiement pour l'application » | `@SPEC.md` complet transmis comme source de vérité |\n| **Cas d'erreur API** | Géré au hasard, crash silencieux | Spécifié : toast rouge contextuel + bouton réessayer |\n| **Typage & robustesse** | `any`, variables non typées, failles réseau | Interfaces TS strictes + validation Zod à la frontière |\n| **Évolution du périmètre** | Dérive permanente au fil des idées | Out-of-Scope verrouillé, ajouts = nouvelle version de spec |\n| **Taux de finalisation** | < 15% dépassent le stade du prototype | > 95% déployés en production sans régression |",

          "## 7. Étude de cas d'échec : anatomie d'un SaaS mort-né",
          "Équipe réelle, portail SaaS de réservation, zéro document de spécification :\n- **Semaine 1** : génération rapide de 12 pages d'UI impressionnantes… non raccordées au backend. Euphorie générale, démo au client.\n- **Semaine 2** : intégration de l'authentification et de la base. L'agent modifie 40 fichiers d'un coup et casse les routes principales. Premiers « on va vite recoller ».\n- **Semaine 3** : 150 erreurs TypeScript accumulées. L'équipe « corrige » à coups d'assertions forcées, ce qui détruit la logique de session. Plus personne ne sait quel comportement est voulu.\n- **Bilan** : projet abandonné après 1 mois. Cause de décès : aucun contrat — chaque conversation avec l'agent repartait de zéro, chaque correction contredisait la précédente.",
          "Contre-exemple : la même application, spécifiée en 2 jours (périmètre, 12 user stories, contrats Zod, matrice d'erreurs), a été reconstruite en 3 semaines par un seul développeur et son agent — parce que chaque session de travail s'appuyait sur le même contrat invariable.",

          "## 8. La matrice des risques prévenus par la spec",
          "| Risque projet | Sans `SPEC.md` | Avec la méthode AI Factory |\n| :--- | :--- | :--- |\n| **Hallucination de l'agent** | Très élevé : il invente tables et endpoints | Quasi nul : contraint par les interfaces et schémas du contrat |\n| **Dérive de périmètre (feature creep)** | Inévitable : ajouts permanents non priorisés | Contrôlé : le Out-of-Scope bloque tout hors-sujet |\n| **Régression au déploiement** | Élevé : l'app plante une fois hébergée | Exclu : la grille DoD valide build et URL HTTPS avant livraison |\n| **Conflit client / développeur** | « Ce n'est pas ce que j'avais demandé » | La spec signée fait foi : toute demande nouvelle = avenant |",
          "Note le dernier point : la spec ne protège pas que ton code, elle protège **ta relation commerciale**. Un client qui a validé des user stories binaires ne peut pas « découvrir » en livraison que son idée était autre chose.",

          "## 9. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| « Je specifierai quand le projet sera plus clair » | La spec EST l'acte de clarification | Le flou ne se dissipe jamais tout seul |\n| Spec de 40 pages que personne ne lit | 5 piliers tenant en 3-6 pages testables | Une spec est un contrat, pas un roman |\n| Spec écrite puis jamais rouverte | `@SPEC.md` invoqué à chaque session agent | Un contrat non invoqué n'existe pas |\n| Modifier la spec en douce pendant le build | Spec immuable pendant l'itération, avenants versionnés | Sinon plus personne ne sait ce qui fait foi |\n| « L'agent comprendra le contexte » | Tout comportement attendu est écrit noir sur blanc | Un LLM ne devine pas, il extrapole |",

          "## 10. Atelier guidé — L'autopsie de tes projets morts (30 min)",
          "Le meilleur professeur de spec, c'est ton propre cimetière de projets :\n1. **(5 min)** Liste tes 3 derniers projets abandonnés ou enlisés.\n2. **(10 min)** Pour chacun, identifie : la phrase floue ou le prompt approximatif qui a lancé la dérive ; le cas d'erreur non spécifié qui a causé le premier crash ; le composant monolithe qui a saturé l'agent.\n3. **(5 min)** Classe chaque mort dans une des 4 dégradations de la section 3.\n4. **(10 min)** Pour le projet qui te tient le plus à cœur, rédige l'en-tête du `SPEC.md` qui l'aurait sauvé : objectif métier en 2 phrases, 3 éléments In-Scope, 3 éléments Out-of-Scope.",

          "## 11. 📌 À retenir",
          "- La vitesse de génération sans plan = de l'entropie à grande vitesse : c'est le **Mur des 80%**.\n- **Spec-First** : aucune ligne de code avant un `SPEC.md` rédigé, relu, 100% testable.\n- Les 5 piliers : **périmètre, user stories binaires, contrats d'interface, matrice d'erreurs, DoD**.\n- Le Out-of-Scope est aussi important que le In-Scope : c'est lui qui tue la dérive.\n- La spec est un **contrat invariable pendant l'itération** — les changements sont des avenants versionnés.\n- Elle protège ton code ET ta relation client.",

          "## 12. Glossaire de la leçon",
          "- **Spec-First** : discipline consistant à rédiger et valider la spécification avant toute ligne de code.\n- **Mur des 80%** : effondrement d'un projet non spécifié lorsque les 20% finaux deviennent impossibles à assembler.\n- **In-Scope / Out-of-Scope** : ce qui est inclus / explicitement exclu du périmètre de la version.\n- **User Story** : comportement attendu décrit du point de vue utilisateur, vérifiable en VRAI/FAUX.\n- **Critère d'acceptation binaire** : condition observable sans interprétation possible.\n- **Feature creep** : dérive d'un projet par ajouts successifs non priorisés.\n- **Entropie technique** : désordre accumulé dans une codebase, rendant chaque modification plus risquée.",

          "## 13. ✅ Checklist de validation (Definition of Done)",
          "- [ ] Mon projet actuel possède un `SPEC.md` rédigé AVANT le code.\n- [ ] Le périmètre liste explicitement In-Scope ET Out-of-Scope.\n- [ ] Chaque user story est vérifiable en VRAI/FAUX sans interprétation.\n- [ ] Les contrats de données (types TS / schémas Zod) sont définis dans la spec.\n- [ ] La matrice d'erreurs couvre réseau, timeout, 401/403/500 et saisies invalides.\n- [ ] L'autopsie de mes 3 projets morts est rédigée avec leur cause de décès identifiée.",
        ],
        task: "Analyse tes 3 derniers projets abandonnés (autopsie : prompt flou initial, cas d'erreur non spécifié, composant monolithe), classe chaque échec dans une des 4 dégradations, puis rédige l'en-tête du SPEC.md qui aurait sauvé chacun d'eux.",
      },
      {
        id: "m1-l2",
        title: "Écrire une Spécification Technique & Fonctionnelle Testable (Le Framework SPEC-AI)",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Distinguer en une lecture une exigence **testable** d'un vœu pieux.\n- Remplir les **5 sections du Canvas SPEC-AI** pour n'importe quelle fonctionnalité.\n- Appliquer la règle d'or « **remplacer l'adjectif par la mesure** » sur n'importe quelle phrase floue.\n- Passer les 3 contrôles d'auto-validation avant de transmettre une spec à un agent.\n- Rédiger des user stories avec critères d'acceptation binaires exploitables par un jury.",

          "## 1. L'analogie fondatrice : l'ordonnance du médecin",
          "Un médecin n'écrit pas « prenez un peu de médicament quand ça ne va pas » : il écrit « amoxicilline 500 mg, 3 fois par jour, 7 jours, pendant les repas ». Molécule, dose, fréquence, durée, condition — **cinq précisions qui rendent l'ordonnance exécutable par n'importe quel pharmacien**, sans interprétation.",
          "Une spécification testable est une ordonnance : n'importe quel agent IA (ou développeur) doit pouvoir l'exécuter **sans jamais avoir à deviner**. Si deux lecteurs peuvent comprendre deux choses différentes, ce n'est pas une spec — c'est un malentendu en attente.",

          "## 2. Qu'est-ce qu'une exigence testable ?",
          "Une spécification est **testable** quand elle ne laisse aucune place à l'interprétation subjective. Compare :",
          "❌ **Vœu pieux** : « *L'interface doit être fluide, moderne et réactive.* » — Fluide pour qui ? Moderne selon quoi ? Invérifiable, donc inutile.",
          "✅ **Exigence testable** : « *Le premier octet (TTFB) répond en moins de 150 ms. Le clic sur “Payer” désactive immédiatement le bouton, affiche un spinner et déclenche la mutation serveur. En cas de réponse 200, l'utilisateur est redirigé vers /app/paiement en moins de 200 ms.* »",
          "Le test décisif : chaque critère de ton `SPEC.md` doit pouvoir être vérifié soit par un **test automatisé** (Vitest, Playwright), soit par une **case à cocher binaire** `[ ]` — VRAI ou FAUX, rien entre les deux.",

          "## 3. Le Canvas SPEC-AI : les 5 sections du modèle AI Factory",
          "Toute spec AI Factory s'organise en 5 sections indissociables. Voici le canvas appliqué à un exemple réel — le paiement par tranches d'AIFAC :",
          "### Section 1 : Vision & Périmètre métier\n- **Objectif métier** : permettre aux apprenants de régler leur formation en 4 échéances mensuelles de 1 000 F (Octobre → Janvier).\n- **In-Scope** : calcul automatique des tranches réglées, bouton FeexPay (1 000 F), formulaire de déclaration par référence, mise à jour temps réel des accès.\n- **Out-of-Scope** : prélèvement récurrent automatique sans action de l'utilisateur ; remboursements ; devise autre que XOF.",
          "### Section 2 : User Stories & critères binaires\n- [ ] **US-01 (Timeline)** : l'apprenant voit sur /app/paiement l'état des 4 tranches : Payée, À régler, À venir.\n- [ ] **US-02 (Paiement)** : le clic sur « Payer la tranche X » ouvre le widget FeexPay préconfiguré à exactement 1 000 F.\n- [ ] **US-03 (Référence)** : une référence manuelle de moins de 4 caractères est rejetée avec « Référence invalide ».\n- [ ] **US-04 (Déblocage)** : la validation de la tranche 1 débloque immédiatement /app/pratique et /app/rendus.",
          '### Section 3 : Architecture & contrats de données\n```ts\ninterface PaymentTranche {\n  id: 1 | 2 | 3 | 4;\n  name: string;\n  month: string;      // "Octobre" … "Janvier"\n  dueDate: string;    // ISO 8601\n  amount: 1000;       // littéral : le client ne décide pas du prix\n}\n\nconst paymentInputSchema = z.object({\n  userId: z.string().uuid(),\n  reference: z.string().trim().min(4).max(80),\n  amount: z.literal(1000),\n});\n```',
          "### Section 4 : Matrice de gestion des erreurs\n| Cas | Déclencheur | Comportement spécifié |\n| :--- | :--- | :--- |\n| ER-01 | Base D1 injoignable | Toast « Connexion impossible, réessayez dans quelques instants » |\n| ER-02 | Transaction réseau interrompue | La référence saisie est conservée dans le state local, rien n'est perdu |\n| ER-03 | Session expirée à la soumission | Redirection vers /auth + toast informatif |\n| ER-04 | Référence déjà déclarée | Message « Cette référence a déjà été soumise » sans doublon en base |",
          "### Section 5 : Exigences design & responsive\n- Palette via tokens CSS (--accent, --ink, --paper), aucune couleur en dur.\n- Layout 100% fluide : 375 px, 768 px, 1440 px sans débordement horizontal.\n- Accessibilité WCAG 2.1 AA : contraste ≥ 4.5:1, zones tactiles ≥ 44 px, focus visible.",

          "## 4. La règle d'or : remplacer l'adjectif par la mesure",
          "C'est LE réflexe d'écriture à automatiser. Chaque adjectif subjectif se traduit en mesure vérifiable :",
          "| ❌ Adjectif (invérifiable) | ✅ Mesure (testable) |\n| :--- | :--- |\n| « Le formulaire doit être sécurisé » | « Champs validés par Zod côté client ET serveur ; token JWT en header Authorization ; HTTPS obligatoire » |\n| « L'app doit être rapide » | « TTFB < 150 ms ; interaction « Payer » → feedback visuel < 100 ms ; Lighthouse performance ≥ 90 » |\n| « L'expérience doit être fluide » | « Skeletons animés pendant les chargements ; transitions 150 ms ; zéro layout shift (CLS < 0.1) » |\n| « Le design doit être pro » | « 100% des couleurs issues des tokens ; contraste AA vérifié ; grille d'espacement base 4 respectée » |\n| « La recherche doit bien marcher » | « Résultats < 300 ms pour 10 000 entrées ; recherche vide → état vide avec suggestion ; fautes de frappe tolérées à distance 1 » |",
          "Entraîne-toi : à chaque fois que tu écris ou lis un adjectif dans une spec, demande « **comment un robot vérifierait-il ça ?** ». Pas de réponse = pas de spec.",

          "## 5. Le protocole de validation en 3 contrôles",
          "Avant de transmettre la spec à un agent, passe ces 3 contrôles d'auto-validation :",
          "1. **Contrôle d'ambiguïté** : relis et traque tout mot flou — *souple, élégant, moderne, rapide, intuitif, robuste*. Chacun est remplacé par sa mesure ou supprimé.\n2. **Contrôle de complétude des erreurs** : chaque bouton, chaque champ, chaque appel réseau a un comportement défini en cas de panne ou de saisie invalide. Parcours l'écran élément par élément.\n3. **Contrôle d'isolation** : le Out-of-Scope bloque explicitement les sujets adjacents tentants (mode sombre, i18n, notifications…) pour que l'agent ne s'y aventure pas.",
          "💡 Astuce de pro : fais relire ta spec par ton agent lui-même avec ce prompt : « *Liste tout ce qui est ambigu, non testable ou manquant dans cette spec. Ne corrige rien, liste seulement.* » L'agent est un excellent détecteur de flou — avant d'en être la victime.",

          "## 6. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| User story = « en tant qu'utilisateur je veux payer » | US + critères binaires vérifiables | Sans critère, impossible de dire si c'est fini |\n| Spécifier seulement le chemin heureux | Matrice d'erreurs systématique | Les crashs viennent des cas non prévus |\n| Types « à définir plus tard » | Contrats TS/Zod DANS la spec | C'est le squelette anti-hallucination |\n| Adjectifs partout | Mesures partout | Un robot doit pouvoir vérifier |\n| Spec validée sans relecture | 3 contrôles + relecture par l'agent | Le flou se cache dans les détails |",

          "## 7. Atelier guidé — Ta première spec SPEC-AI complète (45 min)",
          "Rédige la spec d'un module de **réservation de mentorat** (un apprenant réserve un créneau de 30 min avec un mentor) :\n1. **(5 min)** Section 1 : objectif métier en 2 phrases, 4 In-Scope, 3 Out-of-Scope (ex: visio intégrée → hors périmètre).\n2. **(15 min)** Section 2 : 4 user stories avec critères binaires (liste des créneaux, réservation, annulation > 24h, conflit de créneau).\n3. **(10 min)** Section 3 : interface `MentorSlot` + schéma Zod `bookingInputSchema`.\n4. **(10 min)** Section 4 : matrice de 4 cas d'erreur (créneau déjà pris, réseau, session expirée, annulation tardive).\n5. **(5 min)** Passe les 3 contrôles d'auto-validation et corrige ce qu'ils révèlent.",

          "## 8. 📌 À retenir",
          "- Testable = vérifiable par un test automatisé ou une case binaire. Tout le reste est un vœu.\n- Le Canvas SPEC-AI : **Vision/Périmètre → User Stories binaires → Contrats de données → Matrice d'erreurs → Design/Responsive**.\n- La règle d'or : **chaque adjectif se remplace par une mesure** (« comment un robot vérifierait-il ça ? »).\n- Les 3 contrôles avant transmission : ambiguïté, complétude des erreurs, isolation du périmètre.\n- Fais relire ta spec par l'agent AVANT de le faire coder : c'est ton détecteur de flou gratuit.",

          "## 9. Glossaire de la leçon",
          "- **Canvas SPEC-AI** : modèle AI Factory de spécification en 5 sections.\n- **TTFB (Time To First Byte)** : délai entre la requête et le premier octet de réponse — mesure de réactivité serveur.\n- **CLS (Cumulative Layout Shift)** : mesure des sauts de mise en page ; < 0.1 = stable.\n- **Matrice d'erreurs** : tableau associant chaque cas de panne à un comportement spécifié.\n- **Contrat de données** : types TS + schémas Zod définissant la forme exacte des données échangées.\n- **Chemin heureux (happy path)** : scénario où tout se passe bien — le seul que spécifient les débutants.",

          "## 10. ✅ Checklist de validation (Definition of Done)",
          "- [ ] Ma spec contient les 5 sections du Canvas SPEC-AI, aucune vide.\n- [ ] Chaque user story a des critères d'acceptation binaires (cases à cocher).\n- [ ] Zéro adjectif subjectif non traduit en mesure.\n- [ ] La matrice d'erreurs couvre au moins : réseau, session, saisie invalide, conflit métier.\n- [ ] Les contrats TS/Zod sont écrits et compilent.\n- [ ] Les 3 contrôles (ambiguïté, complétude, isolation) sont passés et documentés.",
        ],
        task: "Rédige le fichier SPEC.md complet d'un module de réservation de mentorat en remplissant scrupuleusement les 5 sections du Canvas SPEC-AI, puis passe les 3 contrôles d'auto-validation et joins la liste des corrections qu'ils t'ont fait faire.",
      },
      {
        id: "m1-l3",
        title: "Définir « Done » (Definition of Done) & Les 8 Contrôles Qualité Incompressibles",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Expliquer pourquoi « ça marche sur ma machine » est le mensonge le plus coûteux du développement.\n- Réciter et appliquer les **8 contrôles incompressibles** de la Definition of Done AI Factory.\n- Savoir exactement **ce que le jury vérifie** pour chaque contrôle — et t'auto-auditer avant soumission.\n- Tenir un fichier `DONE.md` avec preuves pour chaque projet.\n- Faire passer ton taux de validation du premier coup au-dessus de 95%.",

          "## 1. L'analogie fondatrice : la checklist du pilote de ligne",
          "Avant chaque décollage, même après 10 000 heures de vol, un commandant de bord déroule la même checklist à voix haute : volets, trim, pression, carburant… Ce n'est pas qu'il doute de sa mémoire — c'est que l'aviation a compris une chose : **la mémoire et l'intuition échouent précisément les jours où on est fatigué, pressé ou trop confiant.** La checklist, elle, n'a jamais un mauvais jour.",
          "La **Definition of Done** est ta checklist de décollage. Elle transforme « je pense que c'est fini » (une émotion) en « les 8 contrôles sont verts » (un fait). Et comme en aviation : **on ne décolle pas avec un voyant rouge, même petit, même pressé.**",

          "## 2. Le mythe du « ça marche sur ma machine »",
          "Dans la plupart des équipes, un développeur considère son travail terminé quand le code s'exécute sans planter **sur son propre ordinateur**. C'est la source directe des désastres en chaîne :\n- le code ne compile pas sur le serveur CI (dépendance locale non déclarée) ;\n- les styles cassent sur mobile (jamais testé sous 1440 px) ;\n- la base distante rejette les requêtes (variable d'environnement manquante) ;\n- les types contiennent des failles masquées par des `as any`.",
          "« Ça marche chez moi » décrit UN environnement, UN écran, UN jeu de données, UN utilisateur indulgent (toi). La production, c'est l'inverse : des centaines d'environnements, d'écrans et d'utilisateurs qui cliquent là où tu n'avais pas prévu. Dans la méthode AI Factory, un module n'est **JAMAIS** fini tant qu'il n'a pas validé l'intégralité des 8 contrôles.",

          "## 3. La grille des 8 contrôles incompressibles",
          "Avant de transmettre un projet dans **Rendus et projets**, passe-le au crible de cette grille :",
          "| # | Contrôle | Critère binaire |\n| :--- | :--- | :--- |\n| 1 | **Conformité spec 100%** | Chaque US du `SPEC.md` implémentée et vérifiée |\n| 2 | **Typage strict absolu** | Zéro `any`, zéro `@ts-ignore`, zéro assertion forcée |\n| 3 | **Validation Zod des entrées** | Tous formulaires et paramètres assainis et typés |\n| 4 | **Gestion d'erreurs & résilience UI** | Réseau, 404, 500, timeout → feedback visuel contextuel |\n| 5 | **Responsive mobile-first** | Parfait de 375 px à 1440 px, zéro scrollbar horizontale |\n| 6 | **Design system & 60 FPS** | Tokens CSS respectés, contrastes WCAG, animations fluides |\n| 7 | **Déploiement effectif** | URL publique HTTPS fonctionnelle (Vercel / Cloudflare) |\n| 8 | **Documentation & démo 3 min** | `README.md` explicatif + vidéo de démonstration |",
          "Remarque le mot **incompressible** : il n'existe aucune circonstance (deadline, fatigue, « petit projet ») qui autorise à sauter un contrôle. C'est précisément quand on est pressé qu'on en saute un — et c'est précisément celui-là qui explose.",

          "## 4. Ce que le jury vérifie factuellement, contrôle par contrôle",
          "Mets-toi à la place du correcteur — voici son protocole exact :\n- **Contrôle 1 (Spec)** : il ouvre ton `SPEC.md` et teste chaque user story une par une. Une fonction annoncée manquante = soumission rejetée.\n- **Contrôle 2 (Typage)** : il exécute `npx tsc --noEmit`. Une seule erreur, ou un `any` détecté dans le diff = recalé.\n- **Contrôle 3 (Zod)** : il soumet des données corrompues (champs vides, scripts, emails invalides). Le serveur doit rejeter proprement, sans crash.\n- **Contrôle 4 (Erreurs)** : il simule une coupure réseau et une 500. L'UI doit afficher une alerte claire et proposer de réessayer.\n- **Contrôle 5 (Responsive)** : inspecteur à 375 px. Un défilement horizontal ou un chevauchement = recalé.\n- **Contrôle 6 (Design)** : audit des tokens CSS, des contrastes et de la fluidité (survol, focus, transitions).\n- **Contrôle 7 (Déploiement)** : test de l'URL publique HTTPS. Le site doit charger en moins de 2 secondes.\n- **Contrôle 8 (Docs & démo)** : lecture du `README.md` et visionnage de la vidéo de 3 minutes montrant le parcours complet.",
          "💡 Le secret des apprenants qui valident du premier coup : ils exécutent **exactement ce protocole sur leur propre projet** la veille de la soumission. L'auto-audit n'est pas une option, c'est la dernière étape du build.",

          "## 5. Le fichier DONE.md : la preuve, pas la promesse",
          "Chaque projet intègre un `DONE.md` qui consigne les 8 validations **avec leurs preuves** :",
          "```markdown\n# DONE.md — Module Paiement par Tranches\n\n- [x] 1. Spec & US    : US-01 à US-04 testées une à une (voir captures /docs)\n- [x] 2. TypeScript   : npx tsc --noEmit → 0 erreur (sortie collée ci-dessous)\n- [x] 3. Zod          : 5 payloads corrompus rejetés proprement (log joint)\n- [x] 4. Erreurs      : coupure réseau simulée → toast + retry OK\n- [x] 5. Responsive   : captures 375 / 768 / 1440 jointes\n- [x] 6. Design       : zéro couleur en dur (grep vérifié), contrastes AA\n- [x] 7. URL live     : https://paiement.exemple.app (TTFB 180 ms)\n- [x] 8. Démo         : video-demo.mp4 (2 min 40) + README complet\n```",
          "La règle : **une case cochée sans preuve est une case vide.** « Responsive OK » ne vaut rien ; trois captures d'écran datées valent contrat. C'est la même discipline que `PROGRESS.md` en leçon m0-l1 — la preuve est la monnaie de la méthode.",

          "## 6. L'impact mesurable de la discipline DoD",
          "Les chiffres constatés sur les promotions AIFAC :\n- Apprenants appliquant scrupuleusement `DONE.md` : **> 95% de validation du premier coup**.\n- Soumissions sans auto-audit préalable : **3 à 4 allers-retours de correction** en moyenne — soit une à deux semaines perdues, et un correcteur qui commence à douter de tout ce que tu livres.\n- Effet cumulatif : chaque validation du premier coup renforce ta réputation de livreur fiable — l'actif professionnel le plus précieux de ce métier.",

          "## 7. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| « Ça tourne chez moi, j'envoie » | Protocole du jury exécuté sur son propre projet | Le correcteur ne teste pas « chez toi » |\n| Cocher DONE.md de mémoire | Preuve datée pour chaque case | La mémoire coche trop vite |\n| Sauter le contrôle 5 « je verrai le mobile après » | 375 px testé À CHAQUE écran | Le mobile est la majorité du trafic |\n| Vidéo démo bâclée à 23h58 | Démo scénarisée : problème → solution → parcours | C'est elle qui vend ta livraison |\n| Négocier un contrôle « pour cette fois » | 8/8, incompressible | Le contrôle sauté est toujours celui qui explose |",

          "## 8. Atelier guidé — L'auto-audit complet (45 min)",
          "Prends ton projet en cours (ou celui de l'atelier m1-l2) :\n1. **(5 min)** Crée `DONE.md` avec la grille des 8 contrôles, toutes cases décochées.\n2. **(25 min)** Déroule le protocole du jury (section 4) contrôle par contrôle. Pour chaque vert : consigne la preuve (sortie de commande, capture, URL). Pour chaque rouge : note précisément ce qui manque.\n3. **(10 min)** Corrige le contrôle rouge le plus rapide à réparer, re-teste, mets à jour la preuve.\n4. **(5 min)** Bilan écrit : combien de contrôles étaient verts AVANT l'audit ? Lesquels rates-tu systématiquement ? (C'est ta signature d'erreur personnelle — connais-la.)",

          "## 9. 📌 À retenir",
          "- « Ça marche sur ma machine » décrit ton bureau, pas la production.\n- Les **8 contrôles sont incompressibles** : spec, typage, Zod, erreurs, responsive, design, déploiement, docs/démo.\n- Le jury déroule un protocole factuel — déroule-le toi-même AVANT lui.\n- `DONE.md` consigne des **preuves**, pas des promesses : case sans preuve = case vide.\n- La discipline DoD fait passer de 3-4 allers-retours à une validation du premier coup.\n- Ta réputation professionnelle = ton taux de « fini du premier coup ».",

          "## 10. Glossaire de la leçon",
          "- **Definition of Done (DoD)** : liste de contrôles binaires définissant objectivement « terminé ».\n- **Auto-audit** : exécution du protocole de vérification du jury sur son propre travail avant soumission.\n- **DONE.md** : fichier consignant les 8 contrôles et leurs preuves pour un projet donné.\n- **Preuve factuelle** : sortie de commande, capture datée ou URL vérifiable — par opposition à l'affirmation.\n- **Incompressible** : qui ne peut être réduit ou sauté sous aucun prétexte.\n- **Aller-retour de correction** : cycle soumission → rejet → correction, coûteux pour les deux parties.",

          "## 11. ✅ Checklist de validation (Definition of Done)",
          "- [ ] Mon projet possède un `DONE.md` avec les 8 contrôles et une preuve par case cochée.\n- [ ] `npx tsc --noEmit` → 0 erreur, zéro `any` dans le diff.\n- [ ] Des payloads corrompus ont été réellement soumis et proprement rejetés.\n- [ ] Captures 375/768/1440 jointes, zéro scrollbar horizontale.\n- [ ] L'URL publique HTTPS charge en < 2 s.\n- [ ] La vidéo démo de 3 min montre le parcours complet, README à jour.",
        ],
        task: "Crée le fichier DONE.md de ton projet actuel, déroule le protocole exact du jury sur les 8 contrôles avec preuve consignée pour chacun, corrige au moins un contrôle rouge et documente ta « signature d'erreur » personnelle.",
      },
    ],
    exercises: [
      {
        id: "m1-e1",
        title: "Rédiger la SPEC.md complète d'une fonctionnalité critique",
        instructions:
          "Rédigez le fichier SPEC.md complet pour un système de paiement par tranches (Vision, 4 User Stories testables, interfaces TypeScript, schéma Zod et matrice de 3 cas d'erreurs).",
        kind: "pratique",
      },
      {
        id: "m1-e2",
        title: "Théorie — Remplacer l'adjectif par la mesure",
        instructions:
          "Transformez 4 exigences vagues (« l'app est rapide », « la sécurité est forte », « le design est joli », « la réponse est fluide ») en critères d'acceptation 100% mesurables et automatisables.",
        kind: "theorie",
      },
      {
        id: "m1-e3",
        title: "Audit Definition of Done (DoD) sur un projet réel",
        instructions:
          "Créez le fichier DONE.md de votre projet, passez en revue les 8 contrôles (tsc --noEmit, validation Zod, responsive 375px, build prod), et documentez les preuves de validation pour chacun.",
        kind: "pratique",
      },
      {
        id: "m1-e4",
        title: "Pratique — La matrice d'erreurs complète",
        instructions:
          "Pour un formulaire d'inscription (email + mot de passe + téléphone), rédigez la matrice de gestion des erreurs complète : au moins 6 cas (réseau coupé, timeout, 401, 409 email déjà pris, saisie invalide champ par champ, session expirée), chacun avec son déclencheur exact et son comportement UI spécifié (message, état des champs, action proposée).",
        kind: "pratique",
      },
      {
        id: "m1-e5",
        title: "Théorie — Détecter la spec non testable",
        instructions:
          "Voici 5 exigences : « l'app doit être intuitive », « le paiement doit être fiable », « la liste charge vite », « le profil est personnalisable », « les erreurs sont bien gérées ». Pour chacune : expliquez pourquoi elle n'est pas testable, puis réécrivez-la en exigence 100% vérifiable par un test automatisé ou une case binaire.",
        kind: "theorie",
      },
    ],
    quiz: [
      {
        id: "m1-q1",
        question: "Quel est le principe fondamental du Spec-First Engineering ?",
        choices: [
          "Coder vite puis documenter à la fin",
          "Aucune ligne de code avant une SPEC.md rédigée, relue et 100% testable",
          "Laisser l'agent IA rédiger la spec après le code",
          "Écrire les tests avant la spec",
        ],
        correct: 1,
        points: 10,
        explanation:
          "La spec est le contrat d'exécution invariable : elle précède toujours le code, humain ou généré.",
      },
      {
        id: "m1-q2",
        question: "Qu'est-ce que le « Mur des 80% » ?",
        choices: [
          "Une limite de couverture de tests",
          "L'effondrement d'un projet non spécifié quand les 20% finaux deviennent inassemblables",
          "Le taux maximal d'utilisation d'un agent IA",
          "Une règle de facturation client",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Sans spec, 80% du projet s'écrit vite… puis l'entropie accumulée rend les 20% restants impossibles.",
      },
      {
        id: "m1-q3",
        question:
          "Quels éléments font partie des 5 piliers d'une spécification invariable ? (plusieurs réponses)",
        choices: [
          "Le périmètre In-Scope / Out-of-Scope",
          "La matrice de gestion des erreurs",
          "Le choix de l'hébergeur",
          "Les contrats d'interface (TS / Zod)",
        ],
        correct: 0,
        answers: [0, 1, 3],
        allow_multiple: true,
        points: 10,
        explanation:
          "Les 5 piliers : périmètre, user stories binaires, contrats d'interface, matrice d'erreurs, Definition of Done. L'hébergeur est un détail d'implémentation.",
      },
      {
        id: "m1-q4",
        question:
          "« L'interface doit être fluide et moderne » — quel est le problème de cette exigence ?",
        choices: [
          "Elle est trop courte",
          "Elle est invérifiable : aucun test ni case binaire ne peut la valider",
          "Elle manque de politesse",
          "Elle devrait être en anglais",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Règle d'or : remplacer l'adjectif par la mesure (ex: transitions 150 ms, TTFB < 150 ms, CLS < 0.1).",
      },
      {
        id: "m1-q5",
        question: "Que vérifie le jury au contrôle 2 (typage strict) de la Definition of Done ?",
        choices: [
          "Que le code est joli",
          "npx tsc --noEmit à 0 erreur et aucun any dans le diff",
          "Que les commentaires sont en français",
          "Que le projet utilise React",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Une seule erreur de compilation ou un any détecté = rendu recalé : le typage strict est non négociable.",
      },
      {
        id: "m1-q6",
        question: "À quoi sert le périmètre Out-of-Scope ?",
        choices: [
          "À lister les bugs connus",
          "À bloquer explicitement la dérive de fonctionnalités (feature creep)",
          "À planifier les vacances de l'équipe",
          "À cacher les fonctionnalités ratées",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Ce qu'on refuse d'inclure est écrit noir sur blanc : l'agent (et le client) ne peut plus dériver hors-sujet.",
      },
    ],
  },
  {
    id: "m2",
    step: "Plan",
    title: "Découper pour avancer",
    lessons: [
      {
        id: "m2-l1",
        title: "Découper une Spécification en Tâches Atomiques & Ordonnées (PLAN.md)",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Expliquer pourquoi une spec envoyée « d'un bloc » à un agent sature sa fenêtre de contexte et provoque des hallucinations.\n- Appliquer la règle des **3P** (Petite, Probante, Parallélisable) pour juger toute tâche.\n- Transformer n'importe quelle spec en `PLAN.md` : EPICs ordonnés, tâches identifiées (T-001…), dépendances explicites.\n- Ordonner les tâches selon la **chaîne de dépendances techniques** (données → serveur → interface).\n- Détecter immédiatement une tâche mal découpée et la refendre.",

          "## 1. L'analogie fondatrice : le déménagement en cartons",
          "Personne ne déménage en portant « l'appartement » : on porte des cartons. Et pas n'importe lesquels — des cartons **assez petits pour être portés par une personne**, **étiquetés** (cuisine, chambre), et **chargés dans le bon ordre** (le canapé avant les bibelots qui vont dessus). Un carton trop lourd casse le dos ; un carton sans étiquette crée le chaos à l'arrivée ; un mauvais ordre bloque le couloir.",
          "Une spécification est l'appartement ; `PLAN.md` est le plan de cartons. L'agent IA est un déménageur ultra-rapide mais **qui ne porte qu'un carton à la fois** — et qui oublie le contenu des cartons précédents. Ton métier de planificateur : découper juste, étiqueter clair, ordonner intelligemment.",

          "## 2. Pourquoi le découpage est la clé de voûte",
          "Une `SPEC.md` parfaite peut quand même tuer un projet si elle est envoyée d'un seul bloc. Demande à un agent de « coder l'application » et trois pathologies se déclenchent mécaniquement :\n- **Saturation de contexte** : la spec entière + le code existant dépassent la mémoire de travail du modèle, qui se met à « perdre » des contraintes en route.\n- **Explosion combinatoire des erreurs** : 40 fichiers modifiés d'un coup = impossible d'isoler laquelle des 200 modifications a cassé le build.\n- **Vérification impossible** : si la « tâche » dure 4 heures, à quel moment vérifies-tu ? À la fin — c'est-à-dire trop tard.",
          "Le découpage atomique inverse la logique : des incréments si petits que **chaque étape est vérifiable en quelques minutes**, et qu'un échec ne coûte jamais plus de 30 minutes de travail.",

          "## 3. La règle des 3P : le test de toute tâche",
          "Une tâche de `PLAN.md` bien formée est :\n1. **Petite** : exécutable en **moins de 30 minutes** par l'agent. Au-delà, la probabilité d'hallucination et le coût d'un échec explosent. « Créer le dashboard » = non. « Créer la carte de statistique `StatCard` avec props typées » = oui.\n2. **Probante** : elle produit une **preuve observable** — un test qui passe, un composant qui s'affiche, une commande à 0 erreur. Si tu ne peux pas dire comment la vérifier, elle n'est pas prête.\n3. **Parallélisable** (autant que possible) : elle ne bloque pas inutilement les autres. Les dépendances réelles sont explicites ; tout le reste peut avancer indépendamment.",
          "| Tâche candidate | Petite ? | Probante ? | Verdict |\n| :--- | :--- | :--- | :--- |\n| « Faire l'authentification » | ❌ (plusieurs jours) | ❌ (vérifier quoi ?) | À refendre en 5-6 tâches |\n| « Schéma Zod loginInput + 3 tests de rejet » | ✅ 20 min | ✅ tests verts | Bonne tâche |\n| « Améliorer le design » | ❌ sans fin | ❌ subjectif | À spécifier puis refendre |\n| « StatCard : props typées + 3 états + responsive » | ✅ 30 min | ✅ rendu 375/1440 | Bonne tâche |",

          "## 4. La structure du PLAN.md : EPICs et tâches identifiées",
          "Le plan s'organise en **EPICs** (gros blocs fonctionnels issus de la spec) contenant des **tâches atomiques** à identifiant unique :",
          "```markdown\n# PLAN.md — Module Paiement par Tranches\n\n## EPIC-1 : Fondations de données\n- [ ] T-001 Table payments (migration SQL + contraintes CHECK)   — dep: aucune\n- [ ] T-002 Schéma Zod paymentInput + types partagés             — dep: aucune\n\n## EPIC-2 : Logique serveur\n- [ ] T-003 Server function declareTranche (5 étages)            — dep: T-001, T-002\n- [ ] T-004 Server function getPayments (lecture triée)          — dep: T-001\n\n## EPIC-3 : Interface\n- [ ] T-005 Hook useDeclareTranche (mutation + invalidation)     — dep: T-003\n- [ ] T-006 Composant TrancheTimeline (4 états visuels)          — dep: T-004\n- [ ] T-007 Formulaire référence + validation + toasts           — dep: T-005\n\n## EPIC-4 : Qualité\n- [ ] T-008 Tests computeTranchesPaid (nominal/limite/vide)      — dep: T-002\n```",
          "Trois détails qui changent tout :\n- **L'identifiant unique** (T-003) : c'est lui que tu invoques dans la consigne d'orchestration, lui qu'on retrouve dans `PROGRESS.md`. Fini les « la tâche du formulaire, tu vois laquelle ».\n- **La dépendance explicite** (`dep:`) : elle rend l'ordre indiscutable et révèle ce qui est parallélisable (T-001 et T-002 peuvent se faire le même jour ; T-008 n'attend que T-002).\n- **La case à cocher** : le plan EST l'outil de suivi — pas un document séparé qui divergera.",

          "## 5. L'ordre des couches : données → serveur → interface",
          "L'ordre de découpage suit presque toujours la chaîne de dépendances techniques :\n1. **Données d'abord** (schémas SQL, types, schémas Zod) : tout le reste s'appuie dessus. Une erreur ici se propage partout — on la fige en premier.\n2. **Serveur ensuite** (server functions, validations) : la logique métier s'appuie sur les données, et l'interface s'appuiera sur elle.\n3. **Interface enfin** (hooks, composants, écrans) : elle consomme des contrats désormais stables.\n4. **Qualité en continu** : les tests des fonctions pures se greffent dès que leur dépendance de données existe — pas « à la fin ».",
          "⚠️ L'anti-pattern classique du débutant : commencer par l'écran « parce que c'est motivant », avec des données mockées — puis tout réécrire quand le vrai contrat arrive. L'écran d'abord, c'est construire la façade avant les fondations : spectaculaire et condamné.",

          "## 6. Le dimensionnement : combien de tâches pour une spec ?",
          "Ordres de grandeur constatés sur les projets AIFAC :\n- Une **fonctionnalité** moyenne (paiement par tranches, réservation de mentorat) : **6 à 10 tâches** en 3-4 EPICs.\n- Un **module complet** (authentification entière) : **12 à 20 tâches**.\n- Au-delà de 25 tâches dans un lot : le lot lui-même est trop gros — découpe en deux livraisons (cf. leçon m2-l2 sur le MVP).\n- Une tâche qui, à l'exécution, dépasse 2× son estimation : STOP — elle cachait deux tâches. Refends-la et mets à jour le plan.",

          "## 7. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| Envoyer la spec entière à l'agent | 1 tâche de PLAN.md par session | Contexte préservé, erreurs isolées |\n| Tâches « verbes flous » (améliorer, gérer, finir) | Tâches « livrables nommés » (composant X, schéma Y) | Un livrable se vérifie, un verbe flou non |\n| Commencer par l'écran | Données → serveur → interface | Les contrats se stabilisent de bas en haut |\n| Dépendances « dans la tête » | `dep:` explicite sur chaque tâche | L'ordre devient indiscutable et parallélisable |\n| Plan figé qu'on n'ouvre plus | Plan = outil de suivi vivant, cases cochées | Un plan mort ment dès le jour 2 |\n| Tâche de 3 heures « presque finie » | Refendre dès 2× l'estimation | Une tâche qui traîne cache deux tâches |",

          "## 8. Atelier guidé — De la spec au plan en 45 minutes",
          "Prends la spec du module de réservation de mentorat (atelier m1-l2) :\n1. **(10 min)** Identifie les EPICs : fondations de données, logique serveur, interface, qualité.\n2. **(20 min)** Découpe en 8 tâches maximum, chacune validée par les 3P : note l'estimation en minutes et la preuve attendue pour chaque tâche.\n3. **(5 min)** Ajoute les `dep:` et vérifie l'ordre données → serveur → interface.\n4. **(5 min)** Souligne les tâches parallélisables (zéro dépendance mutuelle).\n5. **(5 min)** Test final : pour chaque tâche, demande-toi « si l'agent échoue sur celle-ci, qu'est-ce que je perds ? ». Si la réponse dépasse 30 minutes de travail, refends.",

          "## 9. 📌 À retenir",
          "- Une spec envoyée d'un bloc sature le contexte : le découpage est la **clé de voûte** de la méthode.\n- Les 3P : **Petite** (< 30 min), **Probante** (preuve observable), **Parallélisable** (dépendances explicites).\n- `PLAN.md` = EPICs + tâches à **identifiant unique** + **dépendances** + cases à cocher.\n- L'ordre suit les couches : **données → serveur → interface**, qualité en continu.\n- Une tâche qui dépasse 2× son estimation cache deux tâches : refends immédiatement.\n- Le plan est un document **vivant** : il se coche, se refend, se met à jour — ou il ment.",

          "## 10. Glossaire de la leçon",
          "- **Tâche atomique** : unité de travail < 30 min, à livrable unique et preuve observable.\n- **EPIC** : regroupement fonctionnel de tâches issu d'une section de la spec.\n- **3P** : Petite, Probante, Parallélisable — le test de qualité d'une tâche.\n- **Dépendance (dep:)** : tâche devant être terminée avant qu'une autre ne démarre.\n- **Chaîne de dépendances techniques** : ordre naturel données → serveur → interface.\n- **Refendre** : redécouper une tâche qui s'avère trop grosse à l'exécution.\n- **Fenêtre de contexte** : mémoire de travail limitée de l'agent — la ressource que le découpage protège.",

          "## 11. ✅ Checklist de validation (Definition of Done)",
          "- [ ] Mon `PLAN.md` découpe la spec en EPICs et tâches à identifiants uniques (T-001…).\n- [ ] Chaque tâche passe le test des 3P, avec estimation en minutes et preuve attendue notées.\n- [ ] Les dépendances sont explicites (`dep:`) et l'ordre respecte données → serveur → interface.\n- [ ] Aucune tâche n'excède 30 minutes estimées ; aucun lot n'excède ~20 tâches.\n- [ ] Les tâches parallélisables sont identifiées.\n- [ ] Le plan est l'outil de suivi réel : les cases se cochent au fil des preuves.",
        ],
        task: "Transforme la spec du module de réservation de mentorat en PLAN.md complet : 4 EPICs, 8 tâches atomiques maximum validées par les 3P (estimation + preuve attendue), dépendances explicites, ordre données → serveur → interface, tâches parallélisables identifiées.",
      },
      {
        id: "m2-l2",
        title: "Prioriser pour Livrer le Noyau Fonctionnel (MVP & chemin le plus court)",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Définir le **chemin critique** d'un produit : la séquence minimale qui livre la valeur promise.\n- Trancher entre **MVP** et **Nice-to-Have** avec la grille des 2 questions.\n- Construire un plan de livraison en **tranches verticales** (de bout en bout) plutôt qu'en couches horizontales.\n- Résister aux 3 sirènes qui coulent les MVP : le perfectionnisme, la fonctionnalité séduisante, le « tant qu'on y est ».\n- Annoncer et tenir une date de première livraison.",

          "## 1. L'analogie fondatrice : le pont de corde avant l'autoroute",
          "Deux villages séparés par une rivière. L'ingénieur amateur commence l'autoroute à 6 voies : piliers, béton, péage… Dans deux ans, peut-être, on traversera. L'ingénieur AI Factory tend d'abord **un pont de corde en une semaine** : dès le jour 8, les villageois traversent, portent des marchandises, et surtout — **on apprend où les gens veulent vraiment traverser**, à quelle heure et avec quoi. L'autoroute viendra, informée par la réalité.",
          "Le MVP (Minimum Viable Product) est ce pont de corde : pas une version bâclée du produit final, mais **le chemin le plus court vers la valeur réelle** — qui rapporte immédiatement de l'usage, du feedback et de la crédibilité.",

          "## 2. Le chemin critique : la question fondatrice",
          "Tout produit a UNE promesse centrale. Le chemin critique est la séquence **minimale** d'écrans et d'actions qui tient cette promesse, de bout en bout :\n- **AIFAC** : s'inscrire → payer une tranche → apprendre une leçon → soumettre un rendu. Tout le reste (leaderboard, badges, forum) est périphérique.\n- **Une app de livraison de repas** : voir les restaurants → commander → payer → être livré. Les avis, les favoris et le chat viennent après.\n- **Un portfolio** : voir les projets → contacter. Le blog et le mode sombre attendront.",
          "La question fondatrice à poser à chaque fonctionnalité : « **Si on la retire, la promesse centrale tient-elle encore ?** » Oui → elle n'est pas dans le chemin critique. C'est brutal, et c'est le but : le chemin critique d'un produit tient presque toujours en **3 à 5 user stories**.",

          "## 3. La grille MVP vs Nice-to-Have : 2 questions, 4 quadrants",
          "Pour chaque fonctionnalité candidate, deux questions :\n1. **Bloquante ?** Sans elle, le parcours central est-il impossible (ou le produit illégal/dangereux) ?\n2. **Différenciante ?** Est-elle la raison pour laquelle on choisira CE produit ?",
          "| | **Bloquante** | **Non bloquante** |\n| :--- | :--- | :--- |\n| **Différenciante** | 🔴 MVP — cœur absolu (paiement par tranches d'AIFAC) | 🟡 V2 rapide — l'arme de croissance (certificats vérifiables) |\n| **Non différenciante** | 🟠 MVP — standard obligatoire (reset de mot de passe) | ⚪ Backlog — un jour, peut-être (mode sombre, badges animés) |",
          "Le piège mortel est le quadrant 🟡 : des fonctionnalités brillantes, excitantes à construire… qui ne bloquent personne aujourd'hui. Elles se construisent en V2, **quand le pont de corde a prouvé où passe le trafic.**",

          "## 4. Trancher vertical, pas horizontal",
          "Deuxième erreur structurelle des débutants : livrer en **couches horizontales** — « d'abord toute la base de données, puis tout le backend, puis toute l'interface ». Résultat : pendant 6 semaines, **rien n'est montrable**, et l'intégration finale révèle que les couches ne s'emboîtent pas.",
          "La méthode AI Factory livre en **tranches verticales** : chaque tranche traverse toutes les couches (donnée + serveur + interface) pour UNE user story, de bout en bout, démontrable :",
          "```text\n❌ Horizontal (rien de montrable avant la fin)\nSemaine 1-2 : toutes les tables\nSemaine 3-4 : toutes les API\nSemaine 5-6 : tous les écrans  ← l'intégration explose ici\n\n✅ Vertical (démontrable chaque semaine)\nTranche 1 : inscription complète (table users + endpoint + formulaire)\nTranche 2 : paiement tranche 1 (table payments + FeexPay + timeline)\nTranche 3 : première leçon consultable (contenu + progression + écran)\n```",
          "Chaque tranche verticale est un mini-produit : elle se démontre au client, se teste par de vrais utilisateurs, et **se livre**. Si le projet s'arrête demain, tout ce qui est livré fonctionne.",

          "## 5. Les 3 sirènes qui coulent les MVP",
          "- **🧜 Sirène 1 — Le perfectionnisme** : « je peaufine l'animation du bouton avant de faire le paiement ». Antidote : le chemin critique d'abord, le polish ensuite. Un produit moche qui encaisse bat un produit sublime qui ne fait rien.\n- **🧜 Sirène 2 — La fonctionnalité séduisante** : « et si on ajoutait un chat en temps réel ?! ». Antidote : la grille des 2 questions, posée à voix haute. Non bloquante → backlog, sans débat.\n- **🧜 Sirène 3 — Le « tant qu'on y est »** : « tant qu'on touche à l'auth, faisons aussi les rôles, les équipes, les invitations… ». Antidote : le Out-of-Scope de la spec (leçon m1-l2) + une règle d'or : **tout « tant qu'on y est » est un ticket backlog, jamais un détour.**",
          "Ces trois sirènes ont un point commun : elles donnent la sensation d'avancer tout en retardant la seule chose qui compte — **la première livraison réelle à de vrais utilisateurs.**",

          "## 6. Planifier la livraison : la date avant le contenu",
          "Méthode contre-intuitive mais redoutable : **fixe d'abord la date, découpe ensuite.** « Première livraison dans 2 semaines » force un tri honnête — alors que « on livre quand ce sera prêt » autorise toutes les dérives.\n1. Fixe la date de la Tranche 1 (7 à 14 jours maximum pour un MVP de module).\n2. Remplis la tranche avec le chemin critique UNIQUEMENT, en tâches 3P (leçon m2-l1).\n3. Si ça ne rentre pas : on **réduit le périmètre**, jamais la qualité (les 8 contrôles DoD restent incompressibles).\n4. Chaque tranche livrée = démo + feedback réel + replanification éclairée de la suivante.",

          "## 7. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| « On livrera quand tout sera fini » | Date fixée, périmètre ajusté | Sans date, le périmètre enfle sans fin |\n| Construire en couches horizontales | Tranches verticales démontrables | Rien de montrable = projet invendable |\n| MVP = version bâclée | MVP = périmètre réduit, qualité DoD complète | Bâclé détruit la confiance au premier essai |\n| Garder la fonctionnalité séduisante « vite fait » | Grille 2 questions → backlog | Chaque détour repousse la vraie livraison |\n| 12 fonctionnalités « toutes essentielles » | Chemin critique en 3-5 user stories | Tout prioriser = ne rien prioriser |\n| Polish avant parcours complet | Bout en bout d'abord, polish ensuite | La valeur est dans le parcours qui marche |",

          "## 8. Atelier guidé — Le tri impitoyable (45 min)",
          "Prends une idée d'application (la tienne, ou une app de covoiturage campus) :\n1. **(5 min)** Écris la promesse centrale en UNE phrase.\n2. **(10 min)** Liste 12 fonctionnalités candidates, sans te censurer.\n3. **(10 min)** Passe chacune à la grille des 2 questions ; place-les dans les 4 quadrants.\n4. **(5 min)** Écris le chemin critique en 3-5 user stories — vérifie que chaque story est indispensable à la promesse.\n5. **(10 min)** Découpe la Tranche 1 verticale (donnée + serveur + interface pour la première story) en tâches 3P, avec une date de livraison à J+10 maximum.\n6. **(5 min)** Rédige 2 lignes de justification pour chaque report en V2 — tu les ressortiras telles quelles au client ou au jury.",

          "## 9. 📌 À retenir",
          "- Le **chemin critique** = la séquence minimale qui tient la promesse centrale — presque toujours 3 à 5 user stories.\n- La grille des 2 questions (**bloquante ? différenciante ?**) trie sans états d'âme ; le quadrant « séduisant non bloquant » est le piège.\n- On livre en **tranches verticales** démontrables, jamais en couches horizontales muettes.\n- **MVP ≠ bâclé** : périmètre réduit, qualité DoD incompressible.\n- La date se fixe avant le contenu : si ça ne rentre pas, on réduit le périmètre, jamais la qualité.\n- Tout « tant qu'on y est » est un ticket backlog, jamais un détour.",

          "## 10. Glossaire de la leçon",
          "- **MVP (Minimum Viable Product)** : plus petit produit livrable qui tient la promesse centrale avec une qualité complète.\n- **Chemin critique** : séquence minimale d'actions utilisateur réalisant la valeur promise de bout en bout.\n- **Tranche verticale** : incrément traversant toutes les couches (donnée, serveur, interface) pour une user story.\n- **Couche horizontale** : découpage par technologie (toute la DB, puis toute l'API…) — anti-pattern de livraison.\n- **Nice-to-Have** : fonctionnalité utile mais non bloquante, reportée en V2/backlog.\n- **Backlog** : liste ordonnée des fonctionnalités reportées, revue après chaque livraison.\n- **Feature séduisante** : fonctionnalité excitante à construire mais non bloquante — la sirène n°2.",

          "## 11. ✅ Checklist de validation (Definition of Done)",
          "- [ ] La promesse centrale du produit tient en une phrase écrite.\n- [ ] Les 12 fonctionnalités candidates sont classées dans les 4 quadrants avec justification.\n- [ ] Le chemin critique tient en 3-5 user stories, chacune indispensable à la promesse.\n- [ ] La Tranche 1 est verticale (donnée + serveur + interface), découpée en tâches 3P, datée à J+14 max.\n- [ ] Chaque report en V2 a sa justification de 2 lignes, présentable au client.\n- [ ] La qualité (8 contrôles DoD) n'a PAS été réduite pour tenir la date — seul le périmètre l'a été.",
        ],
        task: "À partir d'une liste de 12 fonctionnalités d'application, isole le chemin critique (3-5 user stories) via la grille des 2 questions, construis la Tranche 1 verticale en tâches 3P datée à J+10, et justifie en 2 lignes chaque report en V2.",
      },
    ],
    exercises: [
      {
        id: "m2-e1",
        title: "Découper une SPEC en 8 Tâches Atomiques PLAN.md",
        instructions:
          "Transformez une spécification de dashboard apprenant en 8 tâches atomiques et ordonnées respectant les 3P (Petite, Probante, Parallélisable).",
        kind: "pratique",
      },
      {
        id: "m2-e2",
        title: "Théorie — Définir le chemin critique (MVP vs Nice-to-Have)",
        instructions:
          "À partir d'une liste de 12 fonctionnalités d'application, isolez les 3 fonctionnalités indispensables du chemin critique (MVP) et justifiez le report des 9 autres en V2.",
        kind: "theorie",
      },
      {
        id: "m2-e3",
        title: "Pratique — PLAN.md avec dépendances explicites",
        instructions:
          "Rédigez le PLAN.md complet d'un module de réservation de mentorat : 4 EPICs (données, serveur, interface, qualité), 8 tâches maximum avec identifiants uniques (T-001…), estimation en minutes, preuve attendue et dépendances explicites (dep:). Soulignez les tâches parallélisables et vérifiez l'ordre données → serveur → interface.",
        kind: "pratique",
      },
      {
        id: "m2-e4",
        title: "Pratique — Construire la Tranche 1 verticale",
        instructions:
          "Pour votre projet, définissez la Tranche 1 verticale (donnée + serveur + interface pour UNE user story du chemin critique), datée à J+10 maximum. Livrez : la user story choisie et sa justification, le découpage en tâches 3P, et la démonstration que la tranche est démontrable de bout en bout une fois terminée.",
        kind: "pratique",
      },
    ],
    quiz: [
      {
        id: "m2-q1",
        question: "Que signifie la règle des 3P pour une tâche de PLAN.md ?",
        choices: [
          "Prompt, Preuve, Publication",
          "Petite (< 30 min), Probante (preuve observable), Parallélisable",
          "Planifiée, Payée, Partagée",
          "Propre, Performante, Portable",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Toute tâche doit être exécutable en moins de 30 minutes, produire une preuve vérifiable, et expliciter ses dépendances.",
      },
      {
        id: "m2-q2",
        question: "Pourquoi ne jamais envoyer la spec entière d'un coup à un agent ?",
        choices: [
          "C'est trop long à copier-coller",
          "Saturation de contexte, erreurs impossibles à isoler, vérification trop tardive",
          "L'agent facture au token",
          "La spec doit rester secrète",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Le découpage atomique garde le contexte ciblé et rend chaque incrément vérifiable en quelques minutes.",
      },
      {
        id: "m2-q3",
        question: "Quel est l'ordre correct de construction des couches ?",
        choices: [
          "Interface → serveur → données (on voit le résultat plus vite)",
          "Données → serveur → interface (les contrats se stabilisent de bas en haut)",
          "Peu importe, l'agent s'adapte",
          "Serveur → interface → données",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Commencer par l'écran avec des données mockées oblige à tout réécrire quand le vrai contrat arrive.",
      },
      {
        id: "m2-q4",
        question: "Une tâche dépasse 2× son estimation. Que fait-on ?",
        choices: [
          "On continue, elle est « presque finie »",
          "STOP : elle cachait deux tâches, on la refend et on met à jour le plan",
          "On double toutes les estimations du plan",
          "On la confie à un autre agent",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Une tâche qui traîne est un signal de découpage raté : refendre coûte moins cher que s'obstiner.",
      },
      {
        id: "m2-q5",
        question: "Qu'est-ce qu'une tranche verticale ?",
        choices: [
          "Toute la base de données d'un coup",
          "Un incrément traversant données + serveur + interface pour UNE user story, démontrable de bout en bout",
          "Une demi-journée de travail",
          "Un sprint de deux semaines",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Chaque tranche verticale est un mini-produit livrable ; les couches horizontales ne produisent rien de montrable avant la fin.",
      },
      {
        id: "m2-q6",
        question: "Quelles questions forment la grille MVP vs Nice-to-Have ? (plusieurs réponses)",
        choices: [
          "Est-elle bloquante pour le parcours central ?",
          "Est-elle différenciante pour le produit ?",
          "Est-elle amusante à coder ?",
          "Le concurrent l'a-t-il ?",
        ],
        correct: 0,
        answers: [0, 1],
        allow_multiple: true,
        points: 10,
        explanation:
          "Bloquante ? Différenciante ? — le piège mortel est la fonctionnalité séduisante mais non bloquante, qui part en V2.",
      },
    ],
  },
  {
    id: "m3",
    step: "Build",
    title: "Construire avec les agents",
    lessons: [
      {
        id: "m3-l1",
        title: "Armer et Guider tes Agents avec le Registre des Skills AI Factory",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Expliquer pourquoi un agent « nu » produit du code générique — et comment un skill le transforme en spécialiste.\n- Naviguer dans le **Registre des 212 skills** AI Factory et choisir le bon skill pour chaque tâche.\n- Construire un `ROUTER.md` qui associe chaque type de besoin à son skill obligatoire.\n- Écrire le **prompt de build** complet : spec + tâche + skill + preuve + interdits.\n- Auditer un diff généré pour vérifier que le skill a réellement été appliqué.",

          "## 1. L'analogie fondatrice : la caisse à outils du compagnon",
          "Un compagnon charpentier n'arrive pas sur un chantier avec « un outil » : il arrive avec une caisse organisée — et surtout, il sait **quel outil pour quel geste**. Ciseau à bois pour la mortaise, pas le tournevis « qui pourrait marcher ». Le débutant, lui, fait tout au marteau : ça avance, jusqu'au jour où ça fend.",
          "Un agent IA sans skill travaille « au marteau » : il produit du code générique, moyennement adapté, truffé des habitudes moyennes d'Internet. Le **Registre des Skills** AI Factory est ta caisse à outils : 212 protocoles spécialisés (frontend React, backend D1, animations 3D, sécurité, OCR…) qui transforment l'agent généraliste en **spécialiste discipliné** du geste précis à exécuter.",

          "## 2. Ce qu'un skill change concrètement dans la génération",
          "Reprends la définition de m0-l1 : un skill est un protocole versionné qui impose COMMENT travailler. Vois la différence sur une même demande :",
          "```text\n❌ Sans skill : « Crée un formulaire de connexion »\n→ L'agent pioche dans sa moyenne statistique : useState pour tout,\n  fetch dans useEffect, CSS inline, zéro gestion d'erreur réseau,\n  parfois une lib au hasard non installée dans le projet.\n\n✅ Avec skill : « Applique skills/frontend-react/SKILL.md.\n   Tâche T-003 : formulaire de connexion »\n→ Le skill impose : composant pur + hook de mutation TanStack Query,\n  schéma Zod partagé, primitives UI existantes du projet, états\n  loading/error, zéro any — et la preuve tsc à coller.\n```",
          "Le skill agit comme un **gabarit de qualité** : il remplace la moyenne d'Internet par TES conventions. C'est la différence entre « du code qui ressemble à du React » et « du code qui ressemble à TON projet ».",

          "## 3. Le Registre : 6 rayons, 212 skills",
          "Le Registre AI Factory est organisé en 6 rayons — les mêmes que la section Ressources de la plateforme :",
          "| Rayon | Domaine | Exemples de skills |\n| :--- | :--- | :--- |\n| **00 Orchestration** | Boucle de livraison, planification, contrôle | `orchestrator-core`, `plan-decomposer`, `progress-auditor` |\n| **01 Frontend & 3D** | React, design system, animations, effets 3D | `frontend-react`, `design-tokens`, `three-hero-scene` |\n| **02 Backend & Docs** | API, bases de données, documentation | `backend-d1`, `zod-contracts`, `readme-engineer` |\n| **03 Agents IA** | LLM, RAG, outils, évaluation | `rag-pipeline`, `tool-calling-safe`, `agent-evals` |\n| **04 QA & Debug** | Tests, CI, diagnostic | `vitest-harness`, `ci-github-actions`, `bug-isolator` |\n| **05 Architecture** | Structure projet, conventions, scaling | `project-layout`, `feature-slices` |",
          "La règle d'usage : **une tâche = un skill principal**. Si une tâche semble exiger 3 skills à la fois, c'est presque toujours qu'elle est mal découpée (retour leçon m2-l1 : refendre).",

          "## 4. Le ROUTER.md : la matrice de routage de ton projet",
          "Le `ROUTER.md` (introduit en m0-l1) matérialise le routage pour TON projet. Il se construit une fois, au démarrage, et se consulte à chaque tâche :",
          "```markdown\n# ROUTER.md — Projet Mentorat\n\n| Type de besoin                  | Skill obligatoire            |\n| :------------------------------ | :--------------------------- |\n| Composant / écran React         | skills/frontend-react        |\n| Token, thème, variantes UI      | skills/design-tokens         |\n| Server function, validation     | skills/backend-d1            |\n| Schéma SQL, migration           | skills/d1-migrations         |\n| Test unitaire / intégration     | skills/vitest-harness        |\n| Revue sécurité d'un diff        | skills/security-audit        |\n\nRègle : toute tâche sans skill identifié est BLOQUÉE\njusqu'à décision de routage consignée ici.\n```",
          "Pourquoi cette rigidité ? Parce que la décision « quel skill » prise **à froid, une fois** vaut mieux que 40 décisions improvisées à chaud. C'est aussi ce qui rend ton processus transmissible : un autre orchestrateur reprend ton projet et route exactement pareil.",

          "## 5. Le prompt de build complet : les 5 blocs",
          "Au moment de construire, la consigne d'orchestration (m0-l1) se spécialise en **prompt de build**. Les 5 blocs, toujours dans cet ordre :",
          "```text\n1. CONTEXTE   : @SPEC.md#Reservation + @PLAN.md (tâche T-006)\n2. SKILL      : lis et applique skills/frontend-react/SKILL.md.\n               Déclare les règles du skill que tu appliques.\n3. TÂCHE      : T-006 — Composant TrancheTimeline : 4 états visuels\n               (payée / à régler / à venir / offerte), props typées.\n4. PREUVE     : npx tsc --noEmit (sortie collée) + captures 375/1440.\n5. INTERDITS  : aucun fichier hors TrancheTimeline.tsx et son test ;\n               aucune nouvelle dépendance ; zéro any ; aucun ajout\n               de fonctionnalité non listée.\n```",
          "Le bloc 2 contient une astuce décisive : « **déclare les règles du skill que tu appliques** ». Un agent qui doit réciter les règles avant de coder les suit beaucoup plus fidèlement — et sa récitation te permet de vérifier qu'il a réellement lu le skill, pas survolé.",

          "## 6. Auditer le diff : le skill a-t-il été appliqué ?",
          "Générer n'est pas livrer. Après chaque build, l'audit en 4 questions :\n1. **Périmètre** : le diff touche-t-il UNIQUEMENT les fichiers autorisés ? Un fichier surprise = rejet immédiat (`git checkout .`).\n2. **Conventions du skill** : les règles déclarées sont-elles visibles dans le code ? (primitives réutilisées, hook de mutation, zéro any…)\n3. **Preuve** : la sortie de commande collée est-elle **réelle et complète** ? (un agent peut tronquer une sortie qui l'arrange)\n4. **Simplicité** : l'agent a-t-il sur-ingénieré ? (abstraction prématurée, dépendance inutile, config « au cas où ») — la sur-ingénierie est une dérive aussi grave que le code bâclé.",
          "Verdict binaire : conforme → on coche dans `PROGRESS.md` ; non conforme → on rejette et on recadre. **Jamais de « je corrige moi-même vite fait »** : corriger à la main ce que l'agent a raté t'apprend rien et ne corrige pas ta consigne — la prochaine génération refera la même erreur.",

          "## 7. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| Prompter « nu », sans skill | Skill chargé et déclaré à chaque tâche | La moyenne d'Internet n'est pas ton standard |\n| Choisir le skill « au feeling » à chaque fois | ROUTER.md décidé à froid, consulté à chaud | Cohérence et transmissibilité |\n| Une tâche, trois skills | Refendre la tâche | Un geste = un outil |\n| Accepter un diff « qui a l'air bien » | Audit 4 questions systématique | L'air ne compile pas |\n| Corriger soi-même les ratés de l'agent | Rejeter + recadrer la consigne | Sinon l'erreur se reproduit à l'infini |\n| Laisser l'agent ajouter des dépendances | Bloc INTERDITS explicite | Chaque dépendance est une dette |",

          "## 8. Atelier guidé — Ton premier build routé (45 min)",
          "Sur ton projet de l'atelier m2-l1 :\n1. **(10 min)** Construis le `ROUTER.md` : liste les 5-6 types de besoins de ton projet et associe un skill à chacun.\n2. **(10 min)** Prends la première tâche interface de ton plan (ex: T-006) et rédige le prompt de build en 5 blocs.\n3. **(15 min)** Lance l'agent, exige la récitation des règles du skill, laisse-le produire.\n4. **(7 min)** Audite le diff avec les 4 questions. Consigne le verdict et la preuve dans `PROGRESS.md`.\n5. **(3 min)** Si rejet : identifie LE bloc du prompt qui était flou et renforce-le. C'est ainsi que tes prompts s'améliorent — par itération outillée, pas par intuition.",

          "## 9. 📌 À retenir",
          "- Un agent sans skill code « la moyenne d'Internet » ; un skill le transforme en spécialiste de TES conventions.\n- Le Registre (6 rayons, 212 skills) se navigue par type de besoin ; **une tâche = un skill principal**.\n- `ROUTER.md` fige le routage à froid : cohérent, consultable, transmissible.\n- Le prompt de build a 5 blocs : **contexte, skill (avec récitation), tâche, preuve, interdits**.\n- L'audit du diff est binaire : conforme → coché ; sinon → rejet + recadrage. Jamais de rafistolage manuel silencieux.\n- La sur-ingénierie est une dérive au même titre que le code bâclé.",

          "## 10. Glossaire de la leçon",
          "- **Registre des Skills** : catalogue organisé des 212 protocoles spécialisés AI Factory, en 6 rayons.\n- **ROUTER.md** : matrice associant chaque type de besoin du projet à son skill obligatoire.\n- **Prompt de build** : consigne en 5 blocs (contexte, skill, tâche, preuve, interdits) pour une tâche de construction.\n- **Récitation du skill** : exigence que l'agent déclare les règles qu'il applique avant de coder.\n- **Audit de diff** : vérification en 4 questions (périmètre, conventions, preuve, simplicité) de tout code généré.\n- **Sur-ingénierie** : complexité ajoutée sans besoin réel (abstractions prématurées, dépendances superflues).",

          "## 11. ✅ Checklist de validation (Definition of Done)",
          "- [ ] Mon projet a son `ROUTER.md` couvrant tous les types de besoins identifiés.\n- [ ] Chaque tâche de build part avec un prompt en 5 blocs, skill déclaré et récité.\n- [ ] Chaque diff est passé à l'audit 4 questions avant d'être accepté.\n- [ ] Aucun fichier hors périmètre, aucune dépendance non autorisée dans les diffs acceptés.\n- [ ] Les verdicts et preuves sont consignés dans `PROGRESS.md`.\n- [ ] Les rejets ont donné lieu à un renforcement documenté du prompt, pas à une correction manuelle silencieuse.",
        ],
        task: "Construis le ROUTER.md de ton projet (6 types de besoins → skills), rédige le prompt de build en 5 blocs pour une tâche d'interface, exécute le build avec récitation du skill, puis audite le diff avec les 4 questions et consigne le verdict dans PROGRESS.md.",
      },
      {
        id: "m3-l2",
        title: "Design System, Glassmorphism & Animations 60 FPS Sans Surcharge",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Faire produire à un agent une interface **cohérente avec ton design system** au lieu d'un patchwork.\n- Implémenter un effet **glassmorphism** propre (lisible, performant) et savoir quand NE PAS l'utiliser.\n- Construire des micro-animations 60 FPS avec `transform`/`opacity` et les patterns d'orchestration (stagger, enter/exit).\n- Budgéter les effets visuels : la règle du « wow ciblé » sur les 2-3 moments qui comptent.\n- Donner à l'agent les contraintes design qui évitent le kitsch généré.",

          "## 1. L'analogie fondatrice : l'assaisonnement du chef",
          "Un grand chef n'ajoute pas de la truffe sur tous les plats : il choisit UN moment du menu où elle transforme l'assiette. Le cuisinier débutant, lui, découvre un ingrédient spectaculaire et le met partout — résultat : un menu écœurant où plus rien ne ressort.",
          "Les effets visuels (verre dépoli, 3D, parallaxe, glow) sont la truffe de l'interface : **spectaculaires par contraste, écœurants par accumulation**. La règle AI Factory : un design system sobre et rigoureux partout (leçon m0-l6), et le « wow » concentré sur 2-3 moments stratégiques — le hero de la landing, la validation d'un paiement, l'obtention d'un certificat.",

          "## 2. Rappel express : le socle avant les effets",
          "Tout ce qui suit **présuppose** le socle de m0-l6 : tokens sémantiques, échelle d'espacement fermée, primitives cva, contrastes WCAG, mobile-first. Un glassmorphism sur des couleurs en dur et des marges aléatoires, c'est du vernis sur du bois pourri.",
          "Ordre de construction immuable d'un écran : **1)** structure et hiérarchie (titres, grilles, espacements) → **2)** états et interactions (hover, focus, loading, empty, error) → **3)** micro-animations fonctionnelles → **4)** effets signatures, en dernier, s'il reste du budget performance.",

          "## 3. Glassmorphism : la recette propre",
          "L'effet « verre dépoli » superpose un panneau translucide flouté sur un fond riche. La recette qui reste lisible et performante :",
          "```css\n.glass-card {\n  /* 1. Translucidité : le fond doit rester devinable */\n  background: rgba(255, 255, 255, 0.08);\n  /* 2. Le flou : le cœur de l'effet — coûteux, à doser */\n  backdrop-filter: blur(14px);\n  -webkit-backdrop-filter: blur(14px); /* Safari */\n  /* 3. La bordure lumineuse : simule l'épaisseur du verre */\n  border: 1px solid rgba(255, 255, 255, 0.14);\n  border-radius: 16px;\n  /* 4. L'ombre douce : décolle le panneau du fond */\n  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);\n}\n```",
          "Les 4 règles d'usage :\n1. **Un fond riche obligatoire** (dégradé, image, halo de couleur) : du verre sur fond uni est juste… du gris.\n2. **Le texte reste AA** : vérifie le contraste sur la zone la plus claire du fond traversant. Sinon, ajoute un voile (`rgba` plus opaque) derrière le texte.\n3. **Budget flou** : `backdrop-filter` est coûteux. 2-3 panneaux par écran maximum ; jamais dans une liste de 50 cartes ; jamais sur un élément animé en continu.\n4. **Fallback** : si `backdrop-filter` n'est pas supporté, le fond `rgba` plus opaque doit suffire à la lisibilité (`@supports`).",

          "## 4. Micro-animations 60 FPS : les patterns qui servent",
          "Rappel de m0-l6 : on n'anime que `transform` et `opacity` (compositor GPU), 150-350 ms, `prefers-reduced-motion` respecté. Sur ce socle, 4 patterns couvrent 95% des besoins :",
          "| Pattern | Usage | Recette |\n| :--- | :--- | :--- |\n| **Fade + rise à l'entrée** | Cartes, sections au scroll | `opacity 0→1` + `translateY(12px)→0`, 250 ms, ease-out |\n| **Stagger (cascade)** | Listes, grilles | Même animation, délai +40 ms par item (plafonné à ~8 items) |\n| **Scale au feedback** | Boutons, toggles, coche | `scale(0.97)` au press, retour spring 150 ms |\n| **Skeleton pulse** | Chargements | `opacity 0.5↔1` en boucle 1.2 s — jamais de spinner géant |\n",
          '```tsx\n// Avec motion (Framer Motion) — stagger d\'une grille de cartes\n<motion.ul\n  initial="hidden" animate="show"\n  variants={{ show: { transition: { staggerChildren: 0.04 } } }}>\n  {items.map(item => (\n    <motion.li key={item.id}\n      variants={{\n        hidden: { opacity: 0, y: 12 },\n        show:   { opacity: 1, y: 0, transition: { duration: 0.25 } },\n      }}>\n      <Card {...item} />\n    </motion.li>\n  ))}\n</motion.ul>\n```',
          "La question à poser à chaque animation : « **qu'explique-t-elle à l'utilisateur ?** » (d'où vient l'élément, ce qui a réagi, ce qui charge). Une animation qui n'explique rien est une décoration — candidate à la suppression.",

          "## 5. Le budget performance : mesurer, pas espérer",
          "Les effets se paient en millisecondes de frame. Le protocole de vérification :\n1. **DevTools → Performance** : enregistre 5 secondes de scroll + interactions. Toute frame > 16 ms est une saccade.\n2. **CPU throttling ×4** : simule un téléphone modeste — ton vrai public. L'écran doit rester fluide.\n3. **Les suspects habituels** : `backdrop-filter` en liste, `box-shadow` animée, images non dimensionnées, listes de 100+ éléments sans virtualisation.\n4. **L'arbitrage** : si un effet coûte la fluidité, il saute — la fluidité EST l'effet premium ultime. Un scroll à 60 FPS paraît plus « cher » que n'importe quel glassmorphism qui rame.",

          "## 6. Piloter l'agent sur le design : les contraintes anti-kitsch",
          "Laissé libre, un agent « décore » : dégradés arc-en-ciel, ombres massives, 15 animations simultanées. Les contraintes à mettre dans chaque prompt design :",
          "```text\nCONTRAINTES DESIGN (non négociables) :\n- Tokens uniquement : var(--accent), var(--ink)… zéro couleur en dur.\n- Primitives existantes (Button, Card, Badge) — n'en crée pas de nouvelles.\n- Animations : transform/opacity only, 150-350 ms, stagger ≤ 40 ms.\n- Glassmorphism : UNIQUEMENT sur le panneau hero, recette .glass-card.\n- Interdits : dégradés multicolores, text-shadow, plus de 2 polices,\n  animation en boucle infinie hors skeleton.\nPREUVE : capture 375px + enregistrement Performance sans frame > 16 ms.\n```",
          "Le principe : **l'agent exécute un style déjà décidé** (par tes tokens et tes primitives) — il ne « crée » pas de direction artistique. La cohérence vient du système, le goût vient de toi.",

          "## 7. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| Du glassmorphism sur toutes les cartes | 2-3 panneaux max, aux moments clés | Coût GPU + effet banalisé |\n| Verre dépoli sur fond uni | Fond riche obligatoire (dégradé, halo) | Sans profondeur, c'est du gris |\n| Animer box-shadow, width, top | transform + opacity uniquement | 60 FPS sur tout matériel |\n| Stagger de 100 items | Cascade plafonnée à ~8 items | Au-delà, c'est de l'attente |\n| « C'est fluide sur mon PC gamer » | Test CPU ×4 + Performance panel | Ton public n'a pas ton PC |\n| Laisser l'agent choisir le style | Contraintes anti-kitsch dans le prompt | Le goût moyen d'Internet est kitsch |",

          "## 8. Atelier guidé — Le hero signature (45 min)",
          "Construis la section hero d'une landing (ton projet ou AIFAC) :\n1. **(10 min)** Fond riche : dégradé sombre + 2 halos de couleur (`radial-gradient` positionnés), structure titre/sous-titre/CTA.\n2. **(10 min)** Panneau glassmorphism avec la recette complète (translucidité, blur 14px, bordure, ombre) contenant une statistique clé. Vérifie le contraste AA du texte.\n3. **(10 min)** Entrée orchestrée : fade+rise du titre, puis stagger (40 ms) des 3 marqueurs, scale-feedback sur le CTA.\n4. **(10 min)** Audit performance : Performance panel + CPU ×4, zéro frame > 16 ms ; `prefers-reduced-motion` testé.\n5. **(5 min)** Preuves : captures 375/1440 + enregistrement du panel + grep « zéro couleur en dur » dans le diff.",

          "## 9. 📌 À retenir",
          "- Le « wow » est un **assaisonnement ciblé** (2-3 moments), jamais une sauce générale.\n- Ordre immuable : structure → états → micro-animations → effets signatures.\n- Glassmorphism : fond riche, texte AA, 2-3 panneaux max, fallback `@supports`.\n- 4 patterns d'animation couvrent 95% des besoins : fade+rise, stagger, scale-feedback, skeleton pulse.\n- La performance se **mesure** (Performance panel, CPU ×4) — la fluidité est l'effet premium ultime.\n- L'agent exécute un style décidé par ton système ; il n'improvise pas de direction artistique.",

          "## 10. Glossaire de la leçon",
          "- **Glassmorphism** : effet de panneau translucide flouté (verre dépoli) sur fond riche.\n- **backdrop-filter** : propriété CSS appliquant un filtre (flou) à ce qui est DERRIÈRE l'élément.\n- **Stagger** : décalage en cascade des animations d'une liste d'éléments.\n- **Compositor** : étage GPU du navigateur animant transform/opacity sans recalcul de layout.\n- **CPU throttling** : ralentissement simulé du processeur pour tester sur matériel modeste.\n- **Frame budget** : 16 ms par image pour tenir 60 FPS.\n- **Effet signature** : effet visuel distinctif réservé aux moments clés du parcours.",

          "## 11. ✅ Checklist de validation (Definition of Done)",
          "- [ ] Zéro couleur/espacement en dur : tout passe par les tokens du design system.\n- [ ] Le glassmorphism respecte la recette complète (fond riche, AA, ≤ 3 panneaux, fallback).\n- [ ] Toutes les animations n'utilisent que transform/opacity, 150-350 ms, reduced-motion respecté.\n- [ ] Performance panel enregistré : zéro frame > 16 ms, y compris en CPU ×4.\n- [ ] Le prompt de build contenait les contraintes anti-kitsch et la preuve exigée.\n- [ ] L'écran reste irréprochable à 375 px.",
        ],
        task: "Construis le hero signature complet : fond riche à halos, panneau glassmorphism conforme à la recette (contraste AA vérifié), entrée orchestrée fade+rise + stagger + scale-feedback, audit Performance sans frame > 16 ms en CPU ×4, preuves jointes.",
      },
      {
        id: "m3-l3",
        title: "Tester en Continu & Automatiser les Assertions",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Intégrer les tests **dans la boucle de build** (pendant, pas après) : le réflexe « code + test dans la même tâche ».\n- Pratiquer le **TDD allégé** AI Factory : assertion d'abord quand la logique est à risque.\n- Faire écrire des tests utiles par l'agent — et détecter ses tests cosmétiques qui ne vérifient rien.\n- Utiliser le harnais pour **refactorer sans peur** et intégrer le code généré en confiance.\n- Transformer chaque bug en assertion permanente (la règle « un bug = un test »).",

          "## 1. L'analogie fondatrice : le filet du trapéziste",
          "Un trapéziste n'installe pas son filet après la chute — ni même après le spectacle. Le filet est tendu AVANT la première figure, et c'est précisément **parce qu'il est là** que le trapéziste ose les figures ambitieuses. Sans filet, on ne tombe pas moins : on ose moins, et on tombe plus grave.",
          "Les tests sont ton filet : écrits PENDANT le build (pas « quand on aura le temps »), ils ne servent pas qu'à attraper les chutes — ils t'autorisent l'ambition : refactorer un module entier, déléguer 400 lignes à un agent, upgrader une dépendance majeure. **La confiance ne vient pas du talent, elle vient du filet.**",

          "## 2. Rappel du socle et nouveau principe : tester EN CONTINU",
          "La leçon m0-l5 a posé la pyramide (typage → lint → unitaires → intégration → E2E) et la CI. Cette leçon ajoute la dimension **temporelle** : QUAND écrit-on les tests ?",
          "La réponse AI Factory : **dans la même tâche que le code**. Chaque tâche de `PLAN.md` qui crée de la logique embarque ses assertions dans sa Definition of Done :\n- ❌ `T-004 : fonction computeTranchesPaid` puis, des jours plus tard, `T-019 : tests de computeTranchesPaid` → T-019 ne sera jamais faite, ou faite de mémoire sur un comportement oublié.\n- ✅ `T-004 : computeTranchesPaid + 3 assertions (nominal/limite/vide) — preuve : vitest PASS` → la tâche n'est cochable QUE si les tests existent et passent.",
          "C'est le sens de « tester en continu » : le test n'est pas une phase, c'est **un composant du livrable** de chaque tâche.",

          "## 3. Le TDD allégé : l'assertion d'abord quand la logique est à risque",
          "Le TDD intégral (toujours test d'abord) est exigeant. AI Factory applique une version pragmatique — **l'assertion d'abord quand le comportement est critique ou piégeux** :",
          '```ts\n// ÉTAPE 1 — On écrit l\'assertion AVANT l\'implémentation.\n// Elle est ROUGE : la fonction n\'existe pas encore.\nit("le partenaire 4Talents ne doit que 2 tranches", () => {\n  expect(requiredTranches({ is4TalentsPartner: true })).toBe(2);\n});\nit("le non-partenaire doit 4 tranches", () => {\n  expect(requiredTranches({ is4TalentsPartner: false })).toBe(4);\n});\n\n// ÉTAPE 2 — On implémente LE MINIMUM qui rend les tests verts.\nexport function requiredTranches(p: { is4TalentsPartner: boolean }) {\n  return p.is4TalentsPartner ? 2 : 4;\n}\n\n// ÉTAPE 3 — Rouge → vert : la preuve que le test teste VRAIMENT.\n```',
          "Le passage **rouge → vert est l'information clé** : un test né vert n'a jamais prouvé qu'il pouvait échouer — il ne protège peut-être rien. Quand utiliser ce mode : logique d'argent, règles d'accès, calculs de progression, parsing. Quand s'en passer : composants purement visuels, glue code trivial.",

          "## 4. Déléguer les tests à l'agent — sans se faire berner",
          "L'agent écrit volontiers des tests… et c'est là qu'il faut être le plus vigilant. Les 3 tests cosmétiques classiques générés :",
          "- **Le test tautologique** : `expect(add(2, 2)).toBe(add(2, 2))` — vrai par construction, ne protège rien.\n- **Le test du mock** : tout est mocké, y compris la fonction testée — on teste le mock, pas le code.\n- **Le test miroir** : l'agent recopie l'implémentation dans l'assertion — si la logique est fausse, le test est faux pareil.",
          "La parade tient en une consigne et un contrôle :\n```text\nCONSIGNE : écris les assertions à partir de la SPEC (@SPEC.md#US-04),\nPAS à partir du code. Chaque cas de la matrice d'erreurs = 1 test.\nCONTRÔLE : mutation manuelle — casse volontairement la logique\n(inverse une condition) : si aucun test ne devient rouge,\nles tests sont cosmétiques → rejet.\n```",
          "Le **test de mutation manuel** (30 secondes : inverse un `>=`, relance la suite) est l'outil le plus simple pour mesurer si un harnais protège réellement.",

          "## 5. Le harnais comme permis de refactorer",
          "Le gain le plus sous-estimé du test continu : il rend le refactoring **sûr et banal**. Protocole de refactoring AI Factory :\n1. Vérifier que la suite est **verte** avant de toucher quoi que ce soit.\n2. Refactorer (ou faire refactorer par l'agent) **sans changer un seul test** — les tests sont le contrat de comportement.\n3. La suite reste verte → le comportement est préservé, par preuve. Un test devient rouge → le refactoring a changé le comportement : on corrige le code, jamais le test.\n4. Même protocole pour les upgrades de dépendances et l'intégration de gros diffs générés.",
          "C'est ici que l'interdit de m0-l5 prend tout son sens : **un agent qui modifie un test pour le faire passer détruit le contrat** — c'est la seule faute qui mérite un rejet sans discussion du diff entier.",

          "## 6. L'assertion permanente : un bug = un test, pour toujours",
          "Chaque bug qui atteint la prod révèle un trou du filet. Le protocole en 4 temps :\n1. **Reproduire** le bug par un test — il est rouge (c'est la preuve qu'on tient le bon bug).\n2. **Corriger** le code — le test passe au vert.\n3. **Garder** le test pour toujours, nommé d'après le bug : `it(\"n'active pas l'accès si le paiement est pending (bug #42)\")`.\n4. **Généraliser** : ce bug a-t-il des cousins ? (même erreur sur les autres statuts ? sur le cas partenaire ?) — on les teste dans la foulée.",
          "Au fil des mois, ta suite devient **l'immunité acquise** du projet : chaque incident passé est définitivement impossible. C'est la différence entre un projet qui vieillit bien et un projet où les vieux bugs reviennent hanter chaque release.",

          "## 7. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| « Les tests, à la fin du projet » | Test dans la DoD de chaque tâche | « À la fin » = jamais |\n| Test écrit après coup, né vert | Rouge → vert sur la logique à risque | Un test né vert n'a rien prouvé |\n| Accepter les tests de l'agent sans les lire | Mutation manuelle : casser la logique | Les tests cosmétiques rassurent à tort |\n| Adapter le test au nouveau code en refactorant | Le test est le contrat : on corrige le code | Sinon le refactoring change le comportement |\n| Corriger un bug sans test | Reproduire (rouge) → corriger (vert) → garder | Le bug sans test revient toujours |\n| Mocker jusqu'à la fonction testée | Mocker uniquement les frontières (réseau, DB) | On doit tester TON code, pas les mocks |",

          "## 8. Atelier guidé — La boucle rouge-vert complète (45 min)",
          "Sur la logique de paiement de ton projet :\n1. **(10 min)** Choisis une règle à risque non testée (ex: le plafonnement des tranches partenaire). Écris 3 assertions À PARTIR de la spec — constate le rouge.\n2. **(10 min)** Implémente (ou fais implémenter) le minimum qui rend vert. Consigne la transition rouge → vert dans PROGRESS.md.\n3. **(10 min)** Test de mutation : inverse 2 conditions dans la logique, vérifie que la suite devient rouge à chaque fois, restaure.\n4. **(10 min)** Délègue à l'agent les tests de la matrice d'erreurs (consigne : « depuis la spec, pas depuis le code ») puis fais passer SES tests au test de mutation.\n5. **(5 min)** Refactore un détail d'implémentation (renomme, extrais une fonction) : la suite doit rester verte sans qu'aucun test ne change.",

          "## 9. 📌 À retenir",
          "- Le test n'est pas une phase : c'est **un composant du livrable de chaque tâche** (dans sa DoD).\n- TDD allégé : **assertion d'abord** sur la logique à risque — le passage rouge → vert est la preuve qui compte.\n- Les tests de l'agent se vérifient par **mutation manuelle** : casse la logique, exige du rouge.\n- Le harnais est un **permis de refactorer** : suite verte avant, tests intouchés pendant, verte après.\n- **Un bug = un test permanent** nommé d'après le bug, plus ses cousins.\n- On mocke les frontières (réseau, DB), jamais la fonction qu'on teste.",

          "## 10. Glossaire de la leçon",
          "- **TDD (Test-Driven Development)** : écrire le test avant l'implémentation ; version allégée AI Factory = sur la logique à risque.\n- **Rouge → vert** : cycle où le test échoue d'abord (prouvant qu'il teste) puis passe après implémentation.\n- **Test cosmétique** : test qui passe quoi qu'il arrive et ne protège rien (tautologie, test de mock, miroir).\n- **Test de mutation** : casser volontairement la logique pour vérifier que la suite détecte le changement.\n- **Harnais** : ensemble des tests qui sécurisent modifications, refactorings et code généré.\n- **Mock** : simulacre d'une dépendance externe (réseau, DB) — réservé aux frontières.\n- **Immunité acquise** : accumulation des tests de non-régression issus des bugs passés.",

          "## 11. ✅ Checklist de validation (Definition of Done)",
          "- [ ] Chaque tâche créant de la logique embarque ses assertions dans sa DoD — aucune tâche « tests plus tard ».\n- [ ] La logique à risque (argent, accès, calculs) est née d'un cycle rouge → vert documenté.\n- [ ] Les tests générés par l'agent ont survécu à un test de mutation manuel.\n- [ ] Aucun test n'a été modifié pour « faire passer » un refactoring ou un diff généré.\n- [ ] Chaque bug corrigé a son test permanent nommé, plus ses cousins identifiés.\n- [ ] Les mocks sont cantonnés aux frontières (réseau, DB) — la logique testée est la vraie.",
        ],
        task: "Exécute la boucle complète sur ta logique de paiement : 3 assertions écrites depuis la spec (rouge), implémentation minimale (vert), test de mutation sur 2 conditions, délégation des tests de la matrice d'erreurs à l'agent avec contre-vérification par mutation, et un refactoring prouvé sans toucher aux tests.",
      },
    ],
    exercises: [
      {
        id: "m3-e1",
        title: "Pratique — Architecture de composants & Contrats Zod",
        instructions:
          "Définissez l'arborescence des dossiers, les schémas Zod et un hook TanStack Query typé pour la gestion d'exercices interactifs.",
        kind: "pratique",
      },
      {
        id: "m3-e2",
        title: "Pratique — Design System Glassmorphism & Tokens CSS",
        instructions:
          "Créez une carte UI responsive utilisant des variables CSS thématiques, backdrop-blur et des transitions 60 FPS sans surcharge de rendu.",
        kind: "pratique",
      },
      {
        id: "m3-e3",
        title: "Pratique — ROUTER.md et prompt de build 5 blocs",
        instructions:
          "Construisez le ROUTER.md de votre projet (6 types de besoins → skills obligatoires), puis rédigez le prompt de build complet en 5 blocs (contexte, skill avec récitation exigée, tâche, preuve, interdits) pour une tâche d'interface de votre PLAN.md. Exécutez le build et joignez le diff obtenu.",
        kind: "pratique",
      },
      {
        id: "m3-e4",
        title: "Théorie — L'audit de diff en 4 questions",
        instructions:
          "Sur un diff généré par un agent (le vôtre ou un exemple), déroulez l'audit en 4 questions : périmètre respecté ? conventions du skill visibles ? preuve réelle et complète ? sur-ingénierie ? Documentez chaque réponse avec la ligne de code qui la justifie et rendez un verdict binaire motivé (conforme / rejeté).",
        kind: "theorie",
      },
      {
        id: "m3-e5",
        title: "Pratique — La boucle rouge → vert sur une logique à risque",
        instructions:
          "Choisissez une règle métier à risque de votre projet (ex: le partenaire ne doit que 2 tranches). Écrivez 3 assertions Vitest À PARTIR de la spec (constatez le rouge), implémentez le minimum qui rend vert, puis réalisez un test de mutation (inversez 2 conditions, vérifiez que la suite devient rouge). Joignez les sorties des 3 étapes.",
        kind: "pratique",
      },
    ],
    quiz: [
      {
        id: "m3-q1",
        question: "Que produit un agent IA à qui on ne charge aucun skill ?",
        choices: [
          "Du code parfait",
          "La « moyenne statistique d'Internet » : code générique, conventions aléatoires",
          "Rien du tout",
          "Du code en Python uniquement",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Sans skill, l'agent pioche dans ses habitudes moyennes d'entraînement au lieu de TES conventions.",
      },
      {
        id: "m3-q2",
        question: "Pourquoi exiger que l'agent « récite » les règles du skill avant de coder ?",
        choices: [
          "Pour le ralentir",
          "Un agent qui déclare les règles les suit plus fidèlement, et la récitation prouve qu'il a lu le skill",
          "Pour remplir le contexte",
          "C'est une politesse",
        ],
        correct: 1,
        points: 10,
        explanation:
          "La récitation engage le modèle et te permet de vérifier la lecture réelle du SKILL.md avant le build.",
      },
      {
        id: "m3-q3",
        question: "Quels blocs composent le prompt de build AI Factory ? (plusieurs réponses)",
        choices: [
          "Contexte (@SPEC + tâche du plan)",
          "Skill à appliquer",
          "Preuve attendue",
          "Compliments à l'agent",
        ],
        correct: 0,
        answers: [0, 1, 2],
        allow_multiple: true,
        points: 10,
        explanation:
          "Les 5 blocs : contexte, skill (avec récitation), tâche, preuve, interdits. La flatterie n'a aucun effet mesurable.",
      },
      {
        id: "m3-q4",
        question: "Un diff généré touche un fichier non prévu par la tâche. Réaction correcte ?",
        choices: [
          "On garde, c'est sûrement utile",
          "Rejet immédiat (git checkout .) et recadrage de la consigne",
          "On corrige à la main sans rien dire",
          "On demande à l'agent de s'excuser",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Un fichier surprise = périmètre violé. Corriger à la main n'apprend rien et l'erreur se reproduira.",
      },
      {
        id: "m3-q5",
        question: "Quelle est la recette d'un glassmorphism lisible et performant ?",
        choices: [
          "backdrop-filter sur toutes les cartes de la page",
          "Fond riche + texte contraste AA + 2-3 panneaux max + fallback @supports",
          "Un flou de 80px minimum",
          "Du verre sur fond blanc uni",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Le flou est coûteux et l'effet se banalise : fond riche obligatoire, panneaux rares, lisibilité d'abord.",
      },
      {
        id: "m3-q6",
        question: "Un test écrit APRÈS le code et né vert pose quel problème ?",
        choices: [
          "Aucun, un test vert est un bon test",
          "Il n'a jamais prouvé qu'il pouvait échouer : il ne protège peut-être rien",
          "Il est plus lent",
          "Il coûte plus cher en CI",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Le passage rouge → vert est l'information clé ; d'où le test de mutation pour vérifier les tests existants.",
      },
    ],
  },
  {
    id: "m4",
    step: "Review",
    title: "Faire corriger, itérer",
    lessons: [
      {
        id: "m4-l1",
        title: "Méthodologie de Revue de Code : Analyser les Retours Ligne par Ligne",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Aborder une revue de code comme un **transfert de compétence**, pas comme un jugement.\n- Dérouler la **grille de lecture en 5 passes** sur n'importe quel diff (le tien, celui d'un pair, celui d'un agent).\n- Classer chaque retour par **gravité** (bloquant, majeur, mineur, suggestion) et réagir proportionnellement.\n- Traiter un retour ligne par ligne : comprendre la cause racine avant de corriger le symptôme.\n- Tenir un **journal d'analyse** qui transforme chaque correction en compétence permanente.",

          "## 1. L'analogie fondatrice : le regard du maître d'atelier",
          "Dans un atelier de lutherie, l'apprenti présente son violon au maître. Le maître ne dit pas « c'est raté » : il pointe précisément — « ce sillet est 0,3 mm trop haut, voilà pourquoi la corde frise ; voici le geste pour l'ajuster ». L'apprenti qui écoute bien n'apprend pas à corriger UN sillet : il apprend à ne plus jamais le tailler trop haut.",
          "La revue de code est ce regard du maître : **chaque retour est une leçon particulière gratuite**, ciblée exactement sur TES points faibles. L'apprenant qui la vit comme une attaque perd deux fois : il souffre, et il n'apprend pas. Celui qui la vit comme un transfert progresse plus vite que n'importe quel tutoriel ne le permettra jamais.",

          "## 2. L'état d'esprit : le code n'est pas toi",
          "Règle n°1, non négociable : **on critique le code, jamais la personne** — et symétriquement, tu dois apprendre à lire « cette fonction a une faille » sans entendre « tu es mauvais ».",
          "Trois réflexes de professionnel face à un retour :\n1. **Lire deux fois avant de répondre** : la première lecture déclenche l'émotion, la seconde comprend le contenu.\n2. **Demander la précision, pas la clémence** : « peux-tu me montrer un exemple du pattern que tu recommandes ? » vaut mieux que « oui mais ça marchait ».\n3. **Remercier pour les retours durs et justes** : ce sont les plus coûteux à écrire pour le correcteur, et les plus rentables pour toi.",
          "Et quand TU relis (un pair, ou un agent) : chaque remarque pointe le code précis (fichier, ligne), explique le POURQUOI, et propose une piste. « C'est pas bon » n'est pas un retour — c'est une humeur.",

          "## 3. La grille de lecture en 5 passes",
          "Relire « en vrac » fatigue et laisse tout passer. Les correcteurs AIFAC — et les orchestrateurs sur les diffs d'agents — lisent en **5 passes ciblées**, chacune avec une seule question en tête :",
          "| Passe | Question unique | Exemples de ce qu'on attrape |\n| :--- | :--- | :--- |\n| **1. Intention** | Le diff fait-il ce que la tâche demandait — et rien d'autre ? | Fonctionnalité manquante, ajout hors périmètre, fichier surprise |\n| **2. Contrats** | Types, schémas Zod et signatures sont-ils stricts et honnêtes ? | `any` camouflé, assertion forcée, schéma plus laxiste que la spec |\n| **3. Robustesse** | Que se passe-t-il quand ça se passe mal ? | Erreur réseau avalée, cas vide non géré, promesse sans catch |\n| **4. Sécurité** | La grille 6 points de m0-l7 tient-elle ? | SQL interpolé, autorisation manquante, secret dans le code |\n| **5. Lisibilité** | Un inconnu comprend-il ce code dans 6 mois ? | Nommage flou, fonction de 80 lignes, magie non commentée |",
          "L'ordre a un sens : inutile de discuter du nommage (passe 5) si l'intention est fausse (passe 1). Et chaque passe est **rapide** — 5 × 4 minutes de lecture ciblée battent 20 minutes de lecture floue.",

          "## 4. Classer par gravité : tout ne se vaut pas",
          "Chaque retour reçoit une étiquette de gravité — c'est elle qui dicte la réaction :",
          "- **🔴 BLOQUANT** : faille de sécurité, données corrompues possibles, spec violée. *Le rendu ne peut pas être validé.* → correction immédiate + test de non-régression.\n- **🟠 MAJEUR** : bug probable dans un cas réel, dette qui coûtera cher (duplication massive, contrat flou). → corrigé dans cette itération.\n- **🟡 MINEUR** : amélioration nette mais sans risque (nommage, simplification locale). → corrigé si rapide, sinon ticket.\n- **🔵 SUGGESTION** : préférence ou piste d'apprentissage (« regarde ce pattern »). → libre, mais à lire : c'est souvent là que se cachent les leçons de fond.",
          "Cette échelle sert dans les deux sens : correcteur, elle t'oblige à hiérarchiser au lieu de noyer l'apprenant sous 40 remarques équivalentes ; corrigé, elle te dit où investir ton énergie en premier.",

          "## 5. Traiter un retour : la méthode cause-racine",
          "Le réflexe faible : corriger mécaniquement la ligne pointée, pousser, passer au suivant. Le symptôme disparaît — la cause reste, et resurgira ailleurs. La méthode complète, pour chaque retour 🔴 ou 🟠 :",
          "1. **Reformuler** le problème avec tes mots (si tu ne peux pas, tu n'as pas compris — demande).\n2. **Chercher la cause racine** : pourquoi ai-je (ou l'agent a-t-il) produit ça ? Spec floue ? Skill non chargé ? Copier-coller trop confiant ? Concept non maîtrisé ?\n3. **Corriger le cas pointé** ET chercher ses jumeaux : la même erreur existe-t-elle ailleurs dans la codebase ? (un `grep` suffit souvent).\n4. **Verrouiller** : un test de non-régression si c'est de la logique, une règle de lint si c'est un pattern, une mise à jour du prompt/skill si l'auteur était un agent.\n5. **Consigner** au journal d'analyse (section 6).",
          "C'est la différence entre « j'ai corrigé 12 remarques » et « j'ai éliminé 3 catégories d'erreurs de mon travail ».",

          "## 6. Le journal d'analyse : capitaliser chaque correction",
          "Un fichier `REVIEW-LOG.md` par projet (ou par apprenant), au format discipline AI Factory :",
          "```markdown\n# REVIEW-LOG — Rendu Module Paiement\n\n## Retour #3 (🔴 bloquant) — SQL interpolé dans getPayments\n- Cause racine : diff d'agent accepté sans passer la passe 4 (sécurité).\n- Jumeaux : 2 autres interpolations trouvées (grep), corrigées.\n- Verrou : règle ajoutée au prompt de build (interdits) +\n  test d'injection ajouté à la suite.\n- Leçon : l'audit 4 questions de m3-l1 n'est pas optionnel.\n\n## Retour #7 (🟠 majeur) — cas « référence déjà soumise » non géré\n- Cause racine : matrice d'erreurs de la spec incomplète (ER-04 manquant).\n- Verrou : spec amendée + test ajouté.\n- Leçon : relire la matrice d'erreurs AVANT de coder, pas après.\n```",
          "Relis ce journal avant chaque nouveau rendu : tes erreurs ont une **signature personnelle** (tout le monde a la sienne). La connaître, c'est corriger avant le correcteur — et c'est exactement ce que les jurys remarquent entre un premier et un deuxième rendu.",

          "## 7. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| Répondre au retour dans la minute, à chaud | Deux lectures, puis réponse | La première lecture est émotionnelle |\n| Corriger la ligne, ignorer la cause | Cause racine + jumeaux + verrou | Sinon l'erreur revient ailleurs |\n| Tout corriger dans l'ordre du fichier | Trier par gravité : 🔴 d'abord | L'énergie va où le risque est |\n| Débattre chaque remarque mineure | Accepter vite les mineures, creuser les majeures | Le débat se mérite pour l'essentiel |\n| Relire les diffs d'agent « à l'œil » | Les 5 passes, comme pour un humain | L'agent fait des erreurs de junior appliqué |\n| Oublier le retour une fois corrigé | REVIEW-LOG.md relu avant chaque rendu | La signature d'erreur se corrige en la traquant |",

          "## 8. Atelier guidé — La revue en 5 passes pour de vrai (45 min)",
          "Prends un diff réel : ton dernier rendu, ou un diff généré par ton agent sur la tâche de l'atelier m3-l1 :\n1. **(20 min)** Déroule les 5 passes, 4 minutes chacune, une question à la fois. Note chaque trouvaille : fichier, ligne, problème, POURQUOI.\n2. **(5 min)** Étiquette chaque trouvaille : 🔴 / 🟠 / 🟡 / 🔵.\n3. **(10 min)** Pour le retour le plus grave : méthode cause-racine complète (reformulation, cause, jumeaux au grep, verrou).\n4. **(5 min)** Crée ton `REVIEW-LOG.md` et consigne les 2-3 entrées du jour avec leur leçon.\n5. **(5 min)** Écris en une phrase ta signature d'erreur dominante actuelle — tu la vérifieras au prochain rendu.",

          "## 9. 📌 À retenir",
          "- La revue est un **transfert de compétence** : chaque retour dur et juste est un cours particulier gratuit.\n- On lit en **5 passes ciblées** : intention, contrats, robustesse, sécurité, lisibilité — une question à la fois.\n- Tout retour reçoit une **gravité** (🔴🟠🟡🔵) qui dicte la réaction — tout ne se vaut pas.\n- Corriger un symptôme ne suffit pas : **cause racine + jumeaux + verrou**, sinon l'erreur revient.\n- Le `REVIEW-LOG.md` transforme les corrections en compétence : connais ta signature d'erreur.\n- Les diffs d'agents se relisent avec la même grille que ceux des humains — sans indulgence.",

          "## 10. Glossaire de la leçon",
          "- **Revue de code (code review)** : lecture critique et structurée d'un diff avant intégration.\n- **Les 5 passes** : grille de lecture AI Factory — intention, contrats, robustesse, sécurité, lisibilité.\n- **Gravité** : échelle 🔴 bloquant / 🟠 majeur / 🟡 mineur / 🔵 suggestion.\n- **Cause racine** : raison profonde qui a produit l'erreur, par opposition au symptôme pointé.\n- **Jumeaux** : occurrences de la même erreur ailleurs dans la codebase.\n- **Verrou** : mécanisme (test, règle de lint, amendement de prompt) qui empêche l'erreur de revenir.\n- **Signature d'erreur** : famille d'erreurs qu'une personne (ou un agent) reproduit préférentiellement.",

          "## 11. ✅ Checklist de validation (Definition of Done)",
          "- [ ] Le diff a été lu en 5 passes, avec des trouvailles notées (fichier, ligne, pourquoi).\n- [ ] Chaque retour est étiqueté par gravité, et les 🔴 traités avant tout le reste.\n- [ ] Le retour le plus grave a sa cause racine, ses jumeaux (grep) et son verrou.\n- [ ] `REVIEW-LOG.md` existe et contient les leçons du jour.\n- [ ] Aucun retour n'a reçu de réponse « à chaud » ; les précisions ont été demandées proprement.\n- [ ] Ma signature d'erreur dominante est identifiée par écrit.",
        ],
        task: "Déroule la revue en 5 passes sur un diff réel (le tien ou celui de ton agent), étiquette chaque trouvaille par gravité, applique la méthode cause-racine complète (jumeaux + verrou) au retour le plus grave, et initialise ton REVIEW-LOG.md avec ta signature d'erreur.",
      },
      {
        id: "m4-l2",
        title: "Itération Rapide & Soumission Finale pour Validation",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Transformer une salve de retours en **plan d'itération** ordonné et chiffré (pas en panique désordonnée).\n- Appliquer la boucle **24-48h** : accuser réception, trier, corriger par gravité, re-soumettre proprement.\n- Rédiger une **note de re-soumission** qui fait gagner 20 minutes au correcteur — et te fait gagner sa confiance.\n- Savoir quand défendre un choix technique (et comment) plutôt que de corriger en silence.\n- Clôturer une itération : preuves à jour, DONE.md re-coché, journal consolidé.",

          "## 1. L'analogie fondatrice : le sparring du boxeur",
          "Un boxeur qui reçoit les corrections de son coach entre deux rounds n'a pas une semaine pour méditer : il a 60 secondes pour intégrer « garde plus haute, jab plus sec » et repartir. C'est la répétition rapide corrigée — pas le talent brut — qui forge un champion. Le boxeur qui « réfléchira à tout ça la semaine prochaine » perd le combat ET l'apprentissage.",
          "L'itération post-review fonctionne pareil : **la valeur d'un retour décroît avec le temps**. Corrigé en 24h, il s'imprime (le contexte est chaud, la leçon rentre). Corrigé en 3 semaines, c'est une corvée sur du code qu'on a oublié — et un correcteur qui a perdu le fil et la motivation.",

          "## 2. La boucle d'itération 24-48h",
          "Protocole AIFAC dès réception des retours :",
          "1. **H+0 — Accuser réception** (2 min) : « Bien reçu, X retours, je reviens vers toi d'ici [date] ». Simple, professionnel — le correcteur sait que son travail n'est pas parti dans le vide.\n2. **H+1 — Trier à froid** (20 min) : après la double lecture (m4-l1), classe tout par gravité, estime chaque correction en minutes, et repère les retours liés entre eux (souvent une même cause racine).\n3. **Jour 1 — Corriger les 🔴 puis 🟠** : une correction = un commit ciblé qui référence le retour (`fix: autorisation par ressource sur getSubmission (retour #3)`). Jamais un commit fourre-tout « fixes review ».\n4. **Jour 1-2 — Traiter les 🟡 rapides, ticketer le reste** : la perfection n'est pas l'objectif de l'itération ; la levée des blocages l'est.\n5. **Jour 2 — Vérifier, puis re-soumettre** : la DoD complète repasse (les 8 contrôles, pas seulement les lignes touchées — une correction peut casser ailleurs), et la note de re-soumission part.",
          "Pourquoi des commits ciblés ? Parce que le correcteur, à la re-soumission, relit **commit par commit** : il voit chaque retour traité isolément, en 30 secondes chacun. Un commit fourre-tout l'oblige à tout re-relire — et il te le fera payer en vigilance accrue.",

          "## 3. La note de re-soumission : ton arme de confiance",
          "La re-soumission n'est pas « voilà, j'ai corrigé ». C'est un document court qui mappe chaque retour à son traitement :",
          "```markdown\n# Re-soumission — Rendu Paiement (itération 2)\n\n| # | Retour | Gravité | Traitement | Commit |\n|---|--------|---------|-----------|--------|\n| 1 | SQL interpolé | 🔴 | Corrigé + 2 jumeaux (grep) + test injection | a1f3c |\n| 2 | ER-04 non géré | 🟠 | Spec amendée + cas implémenté + test | b7e21 |\n| 3 | Nommage confus | 🟡 | Renommé (computePaid → tranchesPaidCount) | c90d4 |\n| 4 | Suggestion pattern | 🔵 | Lu — adopté partiellement, cf. note § ci-dessous |\n\n## Choix défendu (retour #4)\nJ'ai gardé la mutation locale plutôt que le pattern suggéré car la\nspec exige la conservation de saisie hors-ligne (ER-02). Détail : …\n\n## Vérifications re-passées\n- tsc --noEmit : 0 erreur · vitest : 23/23 PASS · DoD 8/8 (DONE.md à jour)\n```",
          "Effet immédiat : le correcteur valide en 10 minutes au lieu de re-auditer une heure. Effet durable : tu deviens « l'apprenant dont les re-soumissions sont carrées » — et tes rendus suivants partent avec un préjugé favorable. **La confiance du correcteur est un actif qui se construit itération par itération.**",

          "## 4. Défendre un choix : le désaccord professionnel",
          "Tous les retours ne sont pas des ordres. Si tu as une vraie raison technique, tu as le **droit — et le devoir — de défendre ton choix**. La forme fait tout :",
          "- ❌ **Défense faible** : « ça marchait pourtant », « j'ai toujours fait comme ça », silence suivi d'une non-correction.\n- ✅ **Défense professionnelle** : reformuler le retour (preuve qu'il est compris) → exposer la contrainte qui motive ton choix (spec, mesure, cas limite) → proposer une vérification tranchante (« si le test X passe avec mon approche, on la garde ? »).",
          "Deux règles de sagesse : un désaccord se défend **une fois, avec des faits** — si le correcteur maintient après t'avoir lu, tu appliques (c'est lui qui valide, et c'est souvent lui qui a raison). Et on ne défend jamais un 🔴 sécurité : on corrige d'abord, on discute la théorie après.",

          "## 5. Clôturer l'itération : rien ne traîne",
          "Une itération se termine proprement ou elle n'est pas terminée :\n- **Preuves à jour** : les sorties de commandes et captures de la re-soumission sont fraîches (pas celles d'avant les corrections).\n- **`DONE.md` re-coché** intégralement — avec dates.\n- **`REVIEW-LOG.md` consolidé** : les leçons de l'itération y sont, ta signature d'erreur est mise à jour.\n- **Backlog propre** : les 🟡/🔵 reportés existent en tickets datés, pas en souvenirs.\n- **État mental remis à zéro** : l'itération est close, la suivante démarre sans dette psychologique.",
          "C'est aussi le moment du mini-bilan (3 questions, 3 minutes) : qu'est-ce qui m'a pris le plus de temps ? Quel retour aurais-je pu éviter en auto-audit ? Que je change à mon processus pour le prochain rendu ?",

          "## 6. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| Corriger « quand j'aurai le temps » | Boucle 24-48h, date annoncée | La valeur du retour fond avec le temps |\n| Un commit géant « fixes review » | Un commit ciblé par retour, référencé | Le correcteur relit en minutes, pas en heures |\n| Re-soumettre sans note | Tableau retour → traitement → commit | 10 min de validation au lieu d'une heure |\n| Re-tester seulement les lignes touchées | DoD complète re-passée (8/8) | Une correction peut casser ailleurs |\n| Céder sur tout ou s'obstiner sur tout | Défendre une fois, avec des faits, puis appliquer | Le désaccord pro est un signal de maturité |\n| Itération « finie » avec des trucs qui traînent | Clôture : preuves, DONE.md, log, tickets | La dette psychologique pollue la suite |",

          "## 7. Atelier guidé — L'itération complète chronométrée (45 min)",
          "Simule (ou vis) une itération sur ton rendu de l'atelier m4-l1 :\n1. **(5 min)** Accuse réception et annonce ta date. Trie les retours par gravité avec estimation en minutes.\n2. **(20 min)** Corrige les 🔴 et 🟠 : un commit ciblé par retour, message référençant le retour, test de verrouillage quand c'est de la logique.\n3. **(5 min)** Re-passe la DoD complète — pas seulement les fichiers touchés. Mets à jour DONE.md.\n4. **(10 min)** Rédige la note de re-soumission : tableau complet, un choix défendu avec faits (si pertinent), vérifications re-passées.\n5. **(5 min)** Clôture : REVIEW-LOG consolidé, tickets pour le reporté, mini-bilan 3 questions.",

          "## 8. 📌 À retenir",
          "- La valeur d'un retour **décroît avec le temps** : boucle 24-48h, date annoncée dès réception.\n- **Un retour = un commit ciblé** qui le référence — jamais de fourre-tout.\n- La **note de re-soumission** (tableau retour → traitement → commit) achète la validation rapide ET la confiance durable.\n- La DoD complète se re-passe à chaque itération : une correction peut casser ailleurs.\n- Un choix se défend **une fois, avec des faits** ; un 🔴 sécurité se corrige avant toute discussion.\n- Une itération se **clôture** : preuves fraîches, DONE.md, journal, tickets — rien ne traîne.",

          "## 9. Glossaire de la leçon",
          "- **Itération** : cycle complet retours → corrections → re-soumission → validation.\n- **Boucle 24-48h** : fenêtre optimale de traitement des retours, contexte encore chaud.\n- **Commit ciblé** : commit traitant UN retour, message le référençant explicitement.\n- **Note de re-soumission** : document mappant chaque retour à son traitement et son commit.\n- **Désaccord professionnel** : défense factuelle et unique d'un choix technique contesté.\n- **Clôture d'itération** : vérification que preuves, DoD, journal et tickets sont à jour avant de passer à autre chose.\n- **Dette psychologique** : charge mentale des sujets « pas vraiment finis » qui pollue le travail suivant.",

          "## 10. ✅ Checklist de validation (Definition of Done)",
          "- [ ] Réception accusée et date de re-soumission annoncée dans les 2h.\n- [ ] Retours triés par gravité, estimés, les 🔴 corrigés en premier.\n- [ ] Un commit ciblé par retour, message référencé, verrous (tests) posés sur la logique.\n- [ ] DoD 8/8 re-passée intégralement, DONE.md et preuves à jour.\n- [ ] Note de re-soumission complète jointe (tableau + éventuel choix défendu + vérifications).\n- [ ] Itération clôturée : REVIEW-LOG consolidé, tickets créés, mini-bilan écrit.",
        ],
        task: "Traite une salve de retours en itération complète : tri par gravité estimé, corrections en commits ciblés référencés, DoD 8/8 re-passée, note de re-soumission avec tableau retour→traitement→commit et un choix défendu avec faits, clôture documentée (REVIEW-LOG + tickets + mini-bilan).",
      },
    ],
    exercises: [
      {
        id: "m4-e1",
        title: "Pratique — Auto-audit & Traitement des retours de code review",
        instructions:
          "Effectuez une revue de code complète sur un projet : détectez 3 failles de typage ou de sécurité, appliquez les correctifs stricts et rédigez le journal d'analyse.",
        kind: "pratique",
      },
      {
        id: "m4-e2",
        title: "Pratique — La revue en 5 passes sur un diff réel",
        instructions:
          "Prenez un diff réel (le vôtre ou généré par votre agent). Déroulez les 5 passes (intention, contrats, robustesse, sécurité, lisibilité) en notant chaque trouvaille : fichier, ligne, problème, POURQUOI. Étiquetez par gravité (🔴🟠🟡🔵), appliquez la méthode cause-racine complète (reformulation, cause, jumeaux au grep, verrou) au retour le plus grave, et initialisez votre REVIEW-LOG.md.",
        kind: "pratique",
      },
      {
        id: "m4-e3",
        title: "Théorie — La note de re-soumission",
        instructions:
          "À partir d'une liste de 5 retours de correction (2 bloquants, 2 majeurs, 1 suggestion), rédigez la note de re-soumission complète : tableau retour → gravité → traitement → commit, un choix technique défendu avec des faits (reformulation + contrainte + vérification tranchante proposée), et la section « vérifications re-passées ».",
        kind: "theorie",
      },
    ],
    quiz: [
      {
        id: "m4-q1",
        question: "Quelles sont les 5 passes de la revue de code AI Factory ?",
        choices: [
          "Vitesse, beauté, taille, langue, framework",
          "Intention, contrats, robustesse, sécurité, lisibilité",
          "Lint, build, test, deploy, monitor",
          "Haut, bas, gauche, droite, centre",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Une question par passe, dans cet ordre : inutile de discuter du nommage si l'intention est fausse.",
      },
      {
        id: "m4-q2",
        question: "Un retour signale une faille de sécurité (🔴). Que fait-on en premier ?",
        choices: [
          "On la défend si on n'est pas d'accord",
          "On corrige immédiatement + test de non-régression ; la discussion théorique vient après",
          "On la met au backlog",
          "On répond dans la minute pour montrer sa réactivité",
        ],
        correct: 1,
        points: 10,
        explanation: "Un 🔴 sécurité ne se négocie jamais : correction d'abord, débat ensuite.",
      },
      {
        id: "m4-q3",
        question: "Pourquoi chercher les « jumeaux » d'une erreur corrigée ?",
        choices: [
          "Pour gonfler le nombre de commits",
          "La même cause racine a souvent produit la même erreur ailleurs dans la codebase",
          "Pour accuser un collègue",
          "C'est inutile si le test passe",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Un grep suffit souvent : corriger le cas pointé sans ses jumeaux laisse la faille vivante ailleurs.",
      },
      {
        id: "m4-q4",
        question: "Quelle est la bonne granularité de commits pour une itération post-review ?",
        choices: [
          "Un commit géant « fixes review »",
          "Un commit ciblé par retour, message référençant le retour",
          "Un commit par fichier modifié",
          "Pas de commit, on pousse en force",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Le correcteur relit commit par commit : chaque retour traité se vérifie en 30 secondes.",
      },
      {
        id: "m4-q5",
        question: "Que contient une note de re-soumission efficace ? (plusieurs réponses)",
        choices: [
          "Le tableau retour → traitement → commit",
          "Les vérifications re-passées (tsc, tests, DoD)",
          "Un choix défendu avec des faits, le cas échéant",
          "Des excuses détaillées sur trois paragraphes",
        ],
        correct: 0,
        answers: [0, 1, 2],
        allow_multiple: true,
        points: 10,
        explanation:
          "La note fait gagner 20 minutes au correcteur et construit ta réputation — les excuses n'apportent rien, les faits si.",
      },
      {
        id: "m4-q6",
        question:
          "Pourquoi re-passer la DoD complète (8/8) et pas seulement les lignes corrigées ?",
        choices: [
          "Par superstition",
          "Une correction peut casser ailleurs : seule la DoD complète le détecte",
          "Pour facturer plus d'heures",
          "Ce n'est pas nécessaire si on est soigneux",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Le correctif local qui casse un autre écran est un classique : la DoD complète est le filet de l'itération.",
      },
    ],
  },
  {
    id: "m5",
    step: "Deliver",
    title: "Livrer pour de vrai",
    lessons: [
      {
        id: "m5-l1",
        title: "Déploiement Continu en Production (Vercel / Cloudflare)",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Expliquer pourquoi « déployé » est le seul état qui compte — et pourquoi on déploie **dès le premier jour**.\n- Dérouler la chaîne de déploiement continu : push → CI → build → preview → production.\n- Configurer proprement un projet sur Vercel ou Cloudflare : variables d'environnement, domaines, rewrites SPA.\n- Utiliser les **preview deployments** comme outil de review et de démo client.\n- Diagnostiquer les 5 pannes de déploiement les plus fréquentes sans paniquer.",

          "## 1. L'analogie fondatrice : le restaurant qui n'ouvre jamais",
          "Un chef peut perfectionner sa carte pendant des mois dans sa cuisine fermée : tant que la salle n'ouvre pas, il n'a **aucun client, aucun avis, aucun chiffre d'affaires — et aucune certitude** que ses plats plaisent. Le restaurant d'à côté, ouvert dès le premier mois avec trois plats corrects, apprend chaque soir, fidélise, ajuste, prospère.",
          "Un projet « fini à 95% mais pas déployé » vaut exactement **zéro** : personne ne peut l'utiliser, le payer, ni te faire un retour. La règle AI Factory est radicale : **on déploie le squelette dès le jour 1** (une page, un titre, une URL HTTPS), et ensuite chaque tranche verticale (m2-l2) part en production dès qu'elle passe la DoD. Déployer n'est pas la dernière étape — c'est l'environnement de travail permanent.",

          "## 2. La chaîne de déploiement continu",
          "Le déploiement moderne est un pipeline automatique déclenché par Git — plus personne ne « copie des fichiers sur un serveur » :",
          "```text\ngit push\n   │\n   ├─► CI (GitHub Actions) : tsc --noEmit → lint → vitest → build\n   │        └─ rouge ? → STOP, rien ne part (m0-l5)\n   │\n   ├─► push sur une branche  → PREVIEW DEPLOYMENT\n   │        URL unique et éphémère : https://feat-paiement-xyz.vercel.app\n   │\n   └─► merge sur main        → PRODUCTION\n            URL stable : https://tonapp.com (rollback en 1 clic)\n```",
          "Les deux plateformes de référence pour nos stacks :\n- **Vercel** : connexion GitHub en 3 clics, détection automatique de Vite, previews sur chaque PR, domaines et HTTPS gérés.\n- **Cloudflare (Pages/Workers)** : même philosophie, intégration naturelle avec D1/R2, réseau edge mondial — le choix cohérent quand ta base est D1 (comme AIFAC).",

          "## 3. La configuration qui évite 80% des pannes",
          "Trois chantiers à soigner AVANT le premier déploiement sérieux :",
          "**1. Les variables d'environnement.** La prod n'a pas ton `.env` local : chaque variable se déclare dans le dashboard (Vercel → Settings → Environment Variables). Rappels de m0-l7 : les secrets serveur SANS préfixe `VITE_`, et des valeurs **différentes** entre preview et production (base de test vs base réelle, FeexPay SANDBOX vs LIVE).",
          "**2. Les rewrites SPA.** Une application à routing client (TanStack Router) doit renvoyer `index.html` pour toute route inconnue du serveur, sinon `/app/paiement` rechargé = 404 :",
          '```json\n// vercel.json\n{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }\n```',
          "**3. Le domaine et le HTTPS.** Un rendu se livre sur une URL propre : domaine ajouté dans le dashboard, enregistrements DNS (A/CNAME) chez ton registrar, certificat automatique. Vérifie ensuite que http:// redirige vers https:// et que www et racine pointent au même endroit.",

          "## 4. Les preview deployments : ton arme secrète de review",
          "Chaque branche poussée obtient son URL éphémère complète. Usages professionnels :\n- **Review réelle** : le correcteur clique l'URL de preview et teste le parcours — au lieu d'imaginer le rendu depuis le diff. Joins TOUJOURS l'URL de preview à tes re-soumissions (m4-l2).\n- **Démo client sans risque** : « voici la tranche 2 en préversion » — le client teste sans que la production bouge.\n- **Test des vraies conditions** : la preview utilise le vrai build de prod, le vrai HTTPS, les vraies variables preview — les bugs « que en prod » s'y révèlent AVANT la prod.",
          "Discipline associée : une preview cassée ne se merge pas, même si « ça marche en local ». La preview EST le verdict.",

          "## 5. Les 5 pannes classiques et leur diagnostic",
          "| Panne | Symptôme | Diagnostic & correctif |\n| :--- | :--- | :--- |\n| **Build qui passe en local, échoue en CI** | `Module not found`, erreur TS | Import avec mauvaise casse (Linux est sensible), dépendance dans devDependencies manquante, `npm ci` strict — reproduis avec un `npm ci && npm run build` propre |\n| **Variable d'environnement manquante** | Écran blanc, erreur « undefined » serveur | La variable existe-t-elle dans le dashboard POUR cet environnement (preview ≠ prod) ? Redéploie après ajout |\n| **404 au refresh des routes** | `/app/x` directe = 404 | Rewrites SPA manquants (section 3) |\n| **CORS / host bloqué** | Requêtes refusées, erreurs console | Autorise le domaine de prod dans les configs d'API et services tiers |\n| **Ça marche en preview, pas en prod** | Bug uniquement sur le domaine final | Diff les variables preview/prod ; vérifie les URLs en dur (il ne doit pas y en avoir) et les webhooks pointant encore sur la preview |",
          "Méthode générale : **lis le log de build en entier** (la vraie erreur est souvent 40 lignes au-dessus du « Build failed »), reproduis en local avec `npm ci && npm run build`, et change UNE chose à la fois.",

          "## 6. Rollback et sérénité : déployer sans peur",
          "La peur de déployer vient de l'idée qu'un déploiement raté est une catastrophe. Les plateformes modernes l'ont rendue obsolète :\n- **Chaque déploiement est immuable et conservé** : la liste complète est dans le dashboard.\n- **Rollback en un clic** : promouvoir le déploiement précédent prend 30 secondes — prépare-toi en le faisant UNE fois à blanc pour savoir où est le bouton.\n- **La règle du vendredi** : on peut déployer un vendredi ce qui est DoD-complet et testé en preview ; on ne déploie jamais « pour voir » à 18h58.\n- **Monitoring minimal** : active les analytics/logs de la plateforme et vérifie ton URL de prod après chaque déploiement (le parcours critique, 2 minutes) — pas d'alerte extérieure qui te préviendra à ta place au début.",

          "## 7. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| Déployer « à la fin du projet » | Squelette en ligne au jour 1, tranches ensuite | La prod est l'environnement de vérité |\n| Secrets copiés dans le code « pour tester » | Variables du dashboard, par environnement | Un secret dans le bundle est public (m0-l7) |\n| Merger malgré une preview cassée | La preview est le verdict | « En local ça marche » ne compte pas |\n| Paniquer sur un build rouge | Lire le log entier, reproduire avec npm ci | La vraie erreur est dans le log, pas dans la panique |\n| URL de prod jamais re-testée après déploiement | Parcours critique vérifié à chaque mise en prod | 2 minutes qui évitent les hontes publiques |\n| Ignorer le rollback « ça n'arrivera pas » | Un rollback à blanc fait en avance | Le jour J, tu as 30 secondes, pas 30 minutes |",

          "## 8. Atelier guidé — De zéro à l'URL HTTPS (45 min)",
          "Mets ton projet d'atelier en production réelle :\n1. **(10 min)** Pousse le repo sur GitHub, connecte-le à Vercel (ou Cloudflare Pages). Premier déploiement automatique — regarde le log de build en entier, même s'il est vert.\n2. **(10 min)** Configure : variables d'environnement (preview ET production, valeurs distinctes), rewrites SPA, vérifie le refresh d'une route profonde.\n3. **(10 min)** Crée une branche, change un titre, pousse : récupère l'URL de preview, vérifie le changement, merge, vérifie la prod.\n4. **(10 min)** Simule la panne : retire une variable d'environnement, redéploie, lis l'erreur, diagnostique, répare. (La panique se vaccine en environnement contrôlé.)\n5. **(5 min)** Fais un rollback à blanc vers le déploiement précédent, puis re-promeus le dernier. Preuves : URL HTTPS + capture du dashboard + log du rollback.",

          "## 9. 📌 À retenir",
          "- Un projet non déployé vaut **zéro** : on met le squelette en ligne au jour 1 et chaque tranche DoD-complète ensuite.\n- La chaîne : **push → CI → preview (par branche) → production (main)** — rien ne contourne la CI rouge.\n- 80% des pannes se jouent dans 3 configs : **variables d'environnement par environnement, rewrites SPA, domaine/HTTPS**.\n- La **preview** est le verdict : elle se joint aux re-soumissions et se montre aux clients.\n- Un build rouge se lit (log entier) et se reproduit (`npm ci && npm run build`) — jamais ne se « re-tente au hasard ».\n- Le **rollback en 1 clic** rend la peur de déployer obsolète — à condition de l'avoir fait une fois à blanc.",

          "## 10. Glossaire de la leçon",
          "- **Déploiement continu (CD)** : mise en production automatique de tout ce qui passe la CI.\n- **Preview deployment** : déploiement éphémère complet généré pour chaque branche/PR.\n- **Rewrite SPA** : règle renvoyant index.html pour toute route gérée côté client.\n- **Variable d'environnement** : configuration externe au code, définie par environnement (preview/prod).\n- **Rollback** : retour instantané au déploiement précédent.\n- **Edge** : réseau de serveurs distribués au plus près des utilisateurs (Cloudflare).\n- **Parcours critique post-déploiement** : vérification manuelle des 3-4 actions vitales juste après une mise en prod.",

          "## 11. ✅ Checklist de validation (Definition of Done)",
          "- [ ] Le projet est en ligne sur une URL HTTPS stable avec domaine propre.\n- [ ] Les variables d'environnement sont déclarées par environnement, zéro secret dans le code ou le bundle.\n- [ ] Les rewrites SPA fonctionnent : toute route profonde survit au refresh.\n- [ ] Chaque branche génère une preview ; aucune preview cassée n'a été mergée.\n- [ ] Une panne a été simulée et diagnostiquée par lecture de log ; un rollback à blanc a été exécuté.\n- [ ] Le parcours critique est re-testé après chaque mise en production.",
        ],
        task: "Déploie ton projet en production réelle : URL HTTPS avec domaine, variables d'environnement par environnement, rewrites SPA vérifiés au refresh, cycle preview → merge → prod démontré, une panne simulée et diagnostiquée, un rollback à blanc exécuté — preuves jointes.",
      },
      {
        id: "m5-l2",
        title: "Présenter sa Livraison : Vidéo Démo de 3 Minutes & README d'Ingénieur",
        minutes: 75,
        body: [
          "## 🎯 Objectifs de cette leçon",
          "À la fin de cette leçon, tu seras capable de :\n- Expliquer pourquoi une livraison non présentée est une livraison **invisible** — et ce que ça coûte.\n- Écrire le **script en 4 actes** d'une vidéo démo de 3 minutes qui vend ton travail.\n- Enregistrer proprement : préparation de l'écran, données réalistes, rythme, son.\n- Rédiger le **README d'ingénieur** en 7 sections — celui qui se lit en 3 minutes et donne confiance en 30 secondes.\n- Assembler le **paquet de livraison** complet : URL, vidéo, README, DONE.md, accès de test.",

          "## 1. L'analogie fondatrice : le chef qui reste en cuisine",
          "Deux chefs cuisinent le même plat exceptionnel. Le premier le fait porter en salle sans un mot : assiette posée, le client devine. Le second sort deux minutes : « Voici un magret fumé au bois d'acacia, la purée est à l'huile de cajou torréfiée — commencez par la sauce. » **Même assiette, expérience transformée** : le second a donné au client les clés pour percevoir la valeur.",
          "Ton code est l'assiette ; la présentation (vidéo + README) est la sortie en salle. Un correcteur, un jury ou un client **ne voit pas** les 40 heures de travail dans un lien GitHub muet : il voit ce que tu lui montres. Savoir présenter n'est pas du marketing plaqué sur la technique — c'est la dernière étape de l'ingénierie : **rendre la valeur perceptible**.",

          "## 2. La vidéo de 3 minutes : le script en 4 actes",
          "Trois minutes, c'est court — c'est le but : ça force à choisir l'essentiel, et ça garantit d'être regardé en entier. Le script AI Factory :",
          "| Acte | Durée | Contenu | Erreur à éviter |\n| :--- | :--- | :--- | :--- |\n| **1. Le problème** | 0:00-0:20 | Qui souffre de quoi ? Une phrase de contexte, une phrase d'enjeu. « Les apprenants abandonnent les formations à paiement unique trop lourd. » | Raconter ta vie ou l'historique du projet |\n| **2. La solution en action** | 0:20-2:10 | LE parcours critique, en conditions réelles : inscription → paiement d'une tranche → déblocage → première leçon. On suit UN utilisateur, pas un catalogue d'écrans. | Zapper entre 15 features sans fil conducteur |\n| **3. La preuve d'ingénierie** | 2:10-2:40 | 30 secondes crédibilité : le rejet d'un paiement falsifié (Zod), la CI verte, le responsive 375px côte à côte. Une ou deux preuves FORTES, pas dix. | Montrer du code qui défile sans rien prouver |\n| **4. L'état et la suite** | 2:40-3:00 | « En production sur [URL], DoD 8/8, tranche 2 planifiée : X. » Fin nette. | Le « voilà voilà… » qui s'éteint en marmonnant |",
          "Règle d'or : **montre le produit qui marche, pas l'écran de code**. Le code, le correcteur l'a — ce qu'il ne peut pas deviner, c'est la fluidité du parcours réel.",

          "## 3. Enregistrer proprement : la checklist technique",
          "Une démo brouillonne sabote un travail propre. Préparation en 6 points, 15 minutes :\n1. **Scène propre** : fenêtre navigateur seule, favoris masqués, notifications coupées, onglets fermés, zoom 100%.\n2. **Données réalistes** : des « Awa Konaté » et des montants vrais — jamais « test test 123 » qui crie l'amateurisme.\n3. **Parcours répété à blanc 2 fois** : tu dois connaître chaque clic — les hésitations à l'écran se voient plus que tu ne crois.\n4. **Son** : micro à 20 cm, pièce calme, débit posé. Pas de musique de fond sur une démo technique.\n5. **Outils simples** : Loom, OBS ou l'enregistreur d'écran système — 1080p suffit. Les sous-titres automatiques de Loom sont un plus pour les relectures silencieuses.\n6. **Une seule prise retenue** : si tu te rates, on recommence l'acte, pas le montage-fleuve. 3 minutes se réenregistrent en 10 minutes.",

          "## 4. Le README d'ingénieur : 7 sections, 3 minutes de lecture",
          "Le README est la page d'atterrissage de ton repo : il doit donner confiance en 30 secondes et tout l'essentiel en 3 minutes :",
          "```markdown\n# Nom du Projet — une phrase de promesse\n\n[🔗 Démo live](https://…)  ·  [🎬 Vidéo 3 min](https://…)  ·  CI : ✅\n\n## 1. Le problème\nDeux phrases : qui souffre, de quoi, et pourquoi c'est important.\n\n## 2. La solution\nTrois phrases + UNE capture d'écran du parcours principal.\n\n## 3. Stack & architecture\nTableau couche → techno (+ 5 lignes sur le choix le moins évident).\n\n## 4. Lancer en local\n```bash\nnpm ci && cp .env.example .env && npm run dev\n```\nToute friction ici = un évaluateur perdu. Teste ces 3 lignes dans\nun dossier vierge avant de livrer.\n\n## 5. Décisions & compromis\n3-4 décisions assumées : « paiement par tranches validé manuellement\nen V1 (volume faible) — webhook prévu en V2 ». C'est LA section\nqui distingue un ingénieur d'un exécutant.\n\n## 6. Qualité\ntsc 0 erreur · 23 tests · DoD 8/8 (DONE.md) · captures 375/1440.\n\n## 7. Limites connues & suite\nCe qui n'est PAS fait, dit honnêtement, avec le plan V2.\n```",
          "La section 5 est ton arme secrète : expliquer un compromis assumé (« j'ai choisi X malgré Y parce que Z ») prouve une maturité que 1 000 lignes de code ne montrent pas. Et la section 7 désamorce les reproches : une limite annoncée est un choix ; une limite découverte est un défaut.",

          "## 5. Le paquet de livraison complet",
          "Une livraison AIFAC (ou client) se soumet en **un seul message autoportant** :",
          "- 🔗 **URL de production** (HTTPS, domaine propre) + URL de preview si itération en cours.\n- 🎬 **Vidéo 3 minutes** (lien direct, pas de téléchargement requis).\n- 📄 **README** à jour (le lien du repo suffit s'il est bien fait).\n- ✅ **DONE.md** avec les 8 preuves fraîches.\n- 🔑 **Accès de test** : identifiants d'un compte de démo pré-rempli (et carte/sandbox de paiement si pertinent) — l'évaluateur ne doit JAMAIS avoir à se créer des données.\n- 📝 **3 lignes de contexte** : ce qui est livré, ce qui est hors périmètre, où tu attends le feedback.",
          "Test final avant envoi : ouvre ton propre message **comme si tu étais le correcteur pressé** — peux-tu comprendre, tester et juger en 10 minutes sans rien demander ? Si non, le paquet n'est pas prêt.",

          "## 6. Présenter en direct : le pitch de 5 minutes",
          "Pour les démos live (jury The InnerBuild, client en visio), trois ajustements au script vidéo :\n- **Commence par la fin** : « Aujourd'hui, un apprenant peut payer en 4 tranches et débloquer sa formation — je vous montre. » L'auditoire sait où on va.\n- **Prépare le plan B** : la démo live plante toujours devant le public (loi universelle). Ta vidéo de 3 minutes EST le plan B — prête à être lancée sans excuse ni panique.\n- **Termine par une question** : « La partie que je voudrais challenger avec vous, c'est le flux de validation manuel — des avis ? » Tu transformes l'évaluation en conversation d'ingénieurs.",

          "## 7. Erreurs fréquentes des débutants",
          "| ❌ Réflexe débutant | ✅ Réflexe AI Factory | Pourquoi |\n| :--- | :--- | :--- |\n| Livrer un lien GitHub muet | Paquet complet autoportant | La valeur non montrée n'existe pas |\n| Vidéo de 12 minutes exhaustive | 3 minutes, 4 actes, parcours critique | Au-delà de 3 min, personne ne finit |\n| Filmer l'éditeur de code | Filmer le produit qui marche | Le code se lit, l'expérience se montre |\n| Données « test test 123 » | Données réalistes préparées | Le réalisme vend, le placeholder dévalue |\n| README = instructions d'installation sèches | 7 sections, décisions et limites incluses | Les compromis assumés = maturité d'ingénieur |\n| Cacher les limites en espérant qu'on ne voie pas | Section « Limites connues & suite » | Annoncée = choix ; découverte = défaut |",

          "## 8. Atelier guidé — Le paquet de livraison complet (45 min)",
          "Sur ton projet déployé (atelier m5-l1) :\n1. **(10 min)** Écris le script 4 actes : une ligne par scène, les phrases d'ouverture et de clôture rédigées mot à mot.\n2. **(5 min)** Prépare la scène : navigateur propre, compte de démo aux données réalistes, parcours répété 2 fois à blanc.\n3. **(10 min)** Enregistre la vidéo (2 prises max). Vérifie le son et que la durée est ≤ 3:00.\n4. **(15 min)** Rédige le README 7 sections — teste réellement les 3 lignes d'installation dans un dossier vierge.\n5. **(5 min)** Assemble le paquet : URL, vidéo, README, DONE.md, accès de test, 3 lignes de contexte. Relis-le en te chronométrant : l'évaluateur doit tout comprendre en 10 minutes.",

          "## 9. 📌 À retenir",
          "- Une livraison non présentée est **invisible** : rendre la valeur perceptible fait partie de l'ingénierie.\n- La vidéo : **3 minutes, 4 actes** — problème, parcours critique en action, preuve d'ingénierie, état & suite.\n- On filme **le produit qui marche** avec des données réalistes, jamais l'éditeur de code.\n- Le README d'ingénieur a 7 sections ; **« Décisions & compromis »** et **« Limites connues »** sont celles qui te distinguent.\n- Le paquet de livraison est **autoportant** : l'évaluateur comprend, teste et juge en 10 minutes sans rien demander.\n- En live : commencer par la fin, avoir la vidéo en plan B, finir par une question d'ingénieur.",

          "## 10. Glossaire de la leçon",
          "- **Paquet de livraison** : ensemble autoportant URL + vidéo + README + DONE.md + accès de test + contexte.\n- **Script en 4 actes** : structure de démo — problème, solution en action, preuve d'ingénierie, état & suite.\n- **Parcours critique (en démo)** : le chemin utilisateur central, suivi de bout en bout avec UN utilisateur.\n- **README d'ingénieur** : README en 7 sections incluant décisions, compromis et limites assumées.\n- **Compte de démo** : compte pré-rempli de données réalistes fourni à l'évaluateur.\n- **Plan B** : vidéo prête à remplacer la démo live qui plante.\n- **Livraison autoportante** : livraison évaluable sans aucune question préalable au livreur.",

          "## 11. ✅ Checklist de validation (Definition of Done)",
          "- [ ] La vidéo dure ≤ 3 minutes, suit les 4 actes, montre le parcours critique avec des données réalistes.\n- [ ] Le son est propre, la scène est propre, aucune hésitation visible dans le parcours.\n- [ ] Le README contient les 7 sections ; l'installation en 3 lignes a été testée dans un dossier vierge.\n- [ ] Les sections « Décisions & compromis » et « Limites connues & suite » sont rédigées honnêtement.\n- [ ] Le paquet de livraison est complet (URL, vidéo, README, DONE.md, accès de test, contexte en 3 lignes).\n- [ ] Le test du correcteur pressé est passé : tout se comprend et se teste en 10 minutes sans question.",
        ],
        task: "Assemble le paquet de livraison complet de ton projet : vidéo de 3 minutes en 4 actes (données réalistes, parcours critique), README d'ingénieur en 7 sections avec installation testée dans un dossier vierge, DONE.md frais, compte de démo, et vérifie le test du correcteur pressé (10 minutes, zéro question).",
      },
    ],
    exercises: [
      {
        id: "m5-e1",
        title: "Pratique — Déploiement Cloudflare / Vercel & README Pro",
        instructions:
          "Déployez l'application sur une URL HTTPS publique, configurez les variables d'environnement, et rédigez un README.md avec démo vidéo de 3 minutes.",
        kind: "pratique",
      },
      {
        id: "m5-e2",
        title: "Pratique — Le script vidéo en 4 actes",
        instructions:
          "Rédigez le script complet de votre vidéo démo de 3 minutes en 4 actes : problème (0:00-0:20), parcours critique en action avec données réalistes (0:20-2:10), preuve d'ingénierie (2:10-2:40 — ex: rejet d'un paiement falsifié, CI verte, responsive côte à côte), état & suite (2:40-3:00). Les phrases d'ouverture et de clôture doivent être écrites mot à mot. Enregistrez ensuite la vidéo et joignez le lien.",
        kind: "pratique",
      },
      {
        id: "m5-e3",
        title: "Pratique — Le paquet de livraison autoportant",
        instructions:
          "Assemblez le paquet de livraison complet de votre projet : URL de production HTTPS, vidéo 3 min, README 7 sections (avec « Décisions & compromis » et « Limites connues »), DONE.md aux preuves fraîches, compte de démo pré-rempli, et 3 lignes de contexte. Validez le test du correcteur pressé : tout doit se comprendre et se tester en 10 minutes sans aucune question.",
        kind: "pratique",
      },
    ],
    quiz: [
      {
        id: "m5-q1",
        question: "Quand déploie-t-on pour la première fois dans la méthode AI Factory ?",
        choices: [
          "Quand le projet est 100% terminé",
          "Dès le jour 1 (le squelette), puis chaque tranche DoD-complète",
          "Le dernier vendredi du mois",
          "Après la première facture payée",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Un projet non déployé vaut zéro : la production est l'environnement de vérité permanent, pas la dernière étape.",
      },
      {
        id: "m5-q2",
        question: "À quoi servent les preview deployments ? (plusieurs réponses)",
        choices: [
          "Faire tester la branche au correcteur sur une URL réelle",
          "Démontrer une tranche au client sans toucher la production",
          "Révéler les bugs « que en prod » avant la prod",
          "Remplacer les tests unitaires",
        ],
        correct: 0,
        answers: [0, 1, 2],
        allow_multiple: true,
        points: 10,
        explanation:
          "Chaque branche a son URL éphémère en conditions réelles — mais rien ne remplace le harnais de tests.",
      },
      {
        id: "m5-q3",
        question:
          "Une route profonde (/app/paiement) renvoie 404 au refresh en production. Cause probable ?",
        choices: [
          "Le serveur est éteint",
          "Les rewrites SPA manquent : toute route inconnue doit renvoyer index.html",
          "L'utilisateur n'a pas payé",
          "Le DNS est mal configuré",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Une app à routing client exige la règle rewrite /(.*) → /index.html (vercel.json ou équivalent).",
      },
      {
        id: "m5-q4",
        question: "Le build passe en local mais échoue en CI. Premier réflexe ?",
        choices: [
          "Relancer la CI en boucle jusqu'à ce que ça passe",
          "Lire le log entier et reproduire avec npm ci && npm run build dans un état propre",
          "Désactiver la CI",
          "Déployer quand même depuis sa machine",
        ],
        correct: 1,
        points: 10,
        explanation:
          "La vraie erreur est dans le log (souvent 40 lignes au-dessus du « Build failed ») ; npm ci reproduit l'état strict de la CI.",
      },
      {
        id: "m5-q5",
        question: "Que montre-t-on en priorité dans la vidéo démo de 3 minutes ?",
        choices: [
          "L'éditeur de code qui défile",
          "Le parcours critique du produit qui marche, avec des données réalistes",
          "L'historique Git complet",
          "Le fichier package.json",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Le code, le correcteur l'a déjà — ce qu'il ne peut pas deviner, c'est l'expérience réelle du parcours.",
      },
      {
        id: "m5-q6",
        question: "Quelle section du README distingue un ingénieur d'un exécutant ?",
        choices: [
          "La liste des badges",
          "« Décisions & compromis » : les choix assumés avec leurs raisons",
          "Le nombre d'étoiles",
          "Les remerciements",
        ],
        correct: 1,
        points: 10,
        explanation:
          "Expliquer « j'ai choisi X malgré Y parce que Z » prouve une maturité que le code seul ne montre pas — et une limite annoncée est un choix, pas un défaut.",
      },
    ],
  },
];

export let allLessons = modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m })));
export let totalLessons = allLessons.length;

type Client = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Loads published course content from database, prioritizing code lessons as the source of truth. */
export async function loadCourse(client: Client): Promise<Module[]> {
  try {
    const [c, m, l, q, ex] = await Promise.all([
      client.from("courses").select("id, position").eq("published", true).order("position"),
      client
        .from("course_modules")
        .select("id, course_id, step, title, free, position")
        .eq("published", true)
        .order("position"),
      client
        .from("lessons")
        .select("id, module_id, title, kind, body, task, file_path, image_path, minutes, position")
        .eq("published", true)
        .order("position"),
      client
        .from("quiz_questions")
        .select(
          "id, module_id, question, choices, correct, answers, allow_multiple, explanation, points, position",
        )
        .eq("published", true)
        .order("position"),
      client
        .from("exercises")
        .select("id, module_id, title, instructions, position")
        .eq("published", true)
        .order("position"),
    ]);
    if (c.error || m.error || l.error || q.error || !c.data?.length) return modules;

    // Map existing code modules and lessons for fast lookup
    const codeModuleMap = new Map(modules.map((m) => [m.id, m]));
    const codeLessonIds = new Set(modules.flatMap((m) => m.lessons.map((l) => l.id)));

    const order = new Map<string, number>(
      c.data.map((x: { id: string; position: number }, i: number) => [x.id, i]),
    );
    const dbMods = (
      m.data as {
        id: string;
        course_id: string;
        step: string;
        title: string;
        free: boolean;
        position: number;
      }[]
    )
      .filter((x) => order.has(x.course_id))
      .sort((a, b) => order.get(a.course_id)! - order.get(b.course_id)! || a.position - b.position);

    const mergedModules: Module[] = modules.map((codeMod) => {
      const dbQuiz = (q.data as (QuizQ & { module_id: string })[]).filter(
        (y) => y.module_id === codeMod.id,
      );
      const dbEx = ((ex.data ?? []) as (Exercise & { module_id: string })[]).filter(
        (y) => y.module_id === codeMod.id,
      );
      const mod: Module = { ...codeMod };
      if (dbQuiz.length) mod.quiz = dbQuiz;
      if (dbEx.length) mod.exercises = dbEx;
      return mod;
    });

    // Add extra modules created in DB that are not in code
    for (const dbM of dbMods) {
      if (!codeModuleMap.has(dbM.id)) {
        const dbLessons = (
          l.data as {
            id: string;
            module_id: string;
            title: string;
            kind: string;
            body: string;
            task: string;
            file_path: string;
            image_path: string;
            minutes: number;
          }[]
        )
          .filter((y) => y.module_id === dbM.id && !codeLessonIds.has(y.id))
          .map((y) => ({
            id: y.id,
            title: y.title,
            minutes: y.minutes,
            body: y.body.split(/\n{2,}/).filter(Boolean),
            task: y.task,
            kind: y.kind,
            file_path: y.file_path,
            image_path: y.image_path,
          }));
        const dbQuiz = (q.data as (QuizQ & { module_id: string })[]).filter(
          (y) => y.module_id === dbM.id,
        );
        const dbEx = ((ex.data ?? []) as (Exercise & { module_id: string })[]).filter(
          (y) => y.module_id === dbM.id,
        );

        const newMod: Module = {
          id: dbM.id,
          step: dbM.step,
          title: dbM.title,
          free: dbM.free,
          lessons: dbLessons,
        };
        if (dbQuiz.length) newMod.quiz = dbQuiz;
        if (dbEx.length) newMod.exercises = dbEx;

        mergedModules.push(newMod);
      }
    }

    modules = mergedModules;
    allLessons = modules.flatMap((mm) => mm.lessons.map((ll) => ({ ...ll, module: mm })));
    totalLessons = allLessons.length || 1;
    return modules;
  } catch {
    return modules;
  }
}
