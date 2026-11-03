# Cours — Catégorie 00-orchestration (Partie 1/3)

**Domaine :** Orchestration — comment un agent IA planifie, découpe, cadre et livre son travail.
**Cette partie couvre 13 skills sur les 45 de la catégorie orchestration** (1 skill "loi" + 11 skills "arsenal" du sous-dossier `ai-factory-skills` + `find-skills` + `i-have-adhd`).
**Public visé :** quelqu'un qui ne connaît rien aux "agent skills" et veut comprendre, puis utiliser, chaque skill.

> Rappel pédagogique : un "skill" n'est pas un logiciel qu'on exécute — c'est un fichier `SKILL.md` qui décrit à un agent IA (Claude, Codex, Cursor...) **une méthode de travail** : quand l'appliquer, quelles étapes suivre, quels pièges éviter. Le "maîtriser", pour toi, c'est savoir reconnaître la situation où il s'applique, et savoir vérifier que l'agent l'a bien suivi.

> Comment utiliser ce cours : pour chaque skill, lis d'abord **C'est quoi** et **Quand l'utiliser** pour reconnaître la situation, puis étudie le **Comment ça marche** étape par étape, suis l'**Exemple guidé** comme si tu le faisais toi-même, mémorise les **Pièges fréquents**, et termine par la **Checklist de sortie** et le mini-exercice **À toi de pratiquer**. C'est cet exercice qui transforme la lecture en compétence.

---

## 1. `orchestrator` (skill loi — toujours actif)

### C'est quoi
Le chef d'orchestre de tout le système. C'est la seule skill qui reste active en permanence, même pendant qu'une autre skill (frontend, backend...) est utilisée. Son rôle : découper le travail, l'ordonner, vérifier qu'il est bien fait, et livrer.

Concrètement, l'orchestrateur ne produit presque jamais de code lui-même : il produit de l'organisation. Sans lui, un agent IA très capable se comporte comme un excellent cuisinier à qui on n'a donné ni recette, ni ordre des plats, ni heure de service — il cuisine vite, mais pas ce qu'il fallait, pas dans le bon ordre. Avec lui, chaque intervention suit le même rituel, ce qui rend le travail vérifiable par n'importe qui, y compris toi, même si tu n'as pas écrit une ligne du code livré.

Ce que l'orchestrateur n'est pas : ce n'est pas un planificateur qu'on consulte une fois au début puis qu'on oublie. C'est un fond permanent : il s'active avant chaque tâche (cadrage), pendant (suivi d'avancement) et après (vérification avant livraison).

### Quand l'utiliser
Toujours — en premier (avant de commencer une tâche) et en dernier (avant de livrer). Elle ne se "déclenche" pas sur un mot-clé : elle est le fond permanent du travail.

Signes concrets que tu dois revenir en mode orchestrateur : tu ne sais plus où tu en es dans un chantier, l'agent a modifié des fichiers que tu ne lui avais pas demandés de toucher, tu t'apprêtes à dire "c'est fini" sans avoir relu quoi que ce soit, ou quelqu'un te demande "où en est le projet ?" et tu ne sais pas répondre en deux phrases.

### Comment ça marche — le cycle en 3 étapes
1. **PLAN** — Lire le besoin, découper en tâches courtes (≤ 2h chacune), assigner chaque tâche à la bonne skill spécialisée. Exemple de ligne de tâche :
   `- [ ] T03 — Auth API login — skill: backend-node — files: apps/api/src/routes/auth.ts — done-when: checklist backend-node §5 OK`
   Chaque ligne de tâche contient donc 5 informations : un identifiant (T03), un intitulé concret, la skill responsable, les fichiers concernés, et la condition de fin (`done-when`). Une tâche sans `done-when` n'est pas une tâche, c'est un vœu. Le découpage se fait par tranche de 2 heures maximum : si tu ne peux pas estimer une tâche à moins de 2h, c'est qu'elle cache en réalité 2 ou 3 tâches — découpe encore.
2. **BUILD** — Avant chaque tâche, annoncer quelle skill est utilisée (`[SKILL USED] skills/<nom>/SKILL.md`), lire cette skill en entier, appliquer ses règles, et noter l'avancement dans un fichier `PROGRESS.md`. L'annonce `[SKILL USED]` n'est pas de la bureaucratie : c'est ce qui force l'agent (et toi) à charger les bonnes règles au lieu d'improviser. La lecture intégrale du `SKILL.md` prend 2 minutes et évite des heures de correction. Le `PROGRESS.md` se tient au fil de l'eau, une ligne par tâche, avec le statut (à faire / en cours / fait / bloqué).
3. **SELF-REVIEW** — Étape bloquante : recopier la checklist de la skill utilisée et cocher chaque point avec une preuve concrète (un fichier, une ligne, une commande exécutée). Interdiction de passer à la tâche suivante si la checklist n'est pas 100% cochée. Une preuve, c'est par exemple : "le test `auth.test.ts` passe (commande `npm test` exécutée à 14h32)", ou "la route `/login` renvoie 401 avec un mauvais mot de passe (testé avec curl)". "Ça devrait marcher" n'est jamais une preuve.

### Exemple concret
Tu demandes "ajoute la connexion par email". L'orchestrateur ne code rien lui-même : il écrit d'abord 3-4 tâches ordonnées (schéma base de données → API → interface → tests), assigne chacune à la skill compétente, puis vérifie que chaque tâche a bien coché sa checklist avant de dire "terminé".

### Exemple guidé, pas à pas
Demande de départ : "je veux que les utilisateurs puissent réinitialiser leur mot de passe par email".
- **PLAN** : l'orchestrateur écrit T01 (table `password_resets` + migration — skill backend), T02 (route `POST /forgot-password` qui envoie l'email — skill backend), T03 (page "mot de passe oublié" — skill frontend), T04 (tests du flux complet — skill tests). Chaque tâche tient en moins de 2h et possède son `done-when`.
- **BUILD** : pour T02, annonce `[SKILL USED] skills/backend-node/SKILL.md`, lecture de la skill, implémentation, puis ligne dans `PROGRESS.md` : "T02 fait — route testée avec un vrai email de test".
- **SELF-REVIEW** : checklist backend recopiée et cochée point par point (validation des entrées ? gestion des erreurs ? aucun secret exposé ?). Un point coince (l'email de test n'arrive pas) : la tâche reste "en cours", on corrige, on re-teste, et seulement ensuite on passe à T03.
- Résultat : 4 tâches, 4 checklists cochées avec preuves, zéro surprise à la livraison.

### Pièges fréquents
- Sauter l'étape de découpage et coder directement une grosse fonctionnalité d'un bloc.
- Déclarer une tâche "faite" sans preuve vérifiable (juste "ça devrait marcher").
- Écrire le `PROGRESS.md` à la fin, de mémoire, au lieu de le tenir pendant le travail — les preuves inventées après coup ne valent rien.
- Laisser l'agent choisir seul ses fichiers : le périmètre (`files:`) se décide au moment du PLAN, pas pendant le BUILD.

### Checklist de sortie
Avant de dire "terminé" : chaque tâche du plan a un statut explicite ; chaque tâche "faite" a sa checklist à 100% avec preuves datées ; aucune tâche "bloquée" n'est restée sans explication ni contournement ; le `PROGRESS.md` raconte l'histoire complète du chantier.

### À toi de pratiquer
Prends un petit besoin réel ("ajouter un champ téléphone au profil") et écris un mini-plan de 3 tâches au format complet (identifiant, intitulé, skill, fichiers, `done-when`). Puis relis-le en te demandant pour chaque tâche : "comment prouverai-je qu'elle est finie ?" Si tu ne sais pas répondre, reformule la tâche.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer la différence entre PLAN / BUILD / SELF-REVIEW, et tu peux repérer, dans un travail livré, si chaque étape a été respectée.

---

## 2. `interview-me`

### C'est quoi
Une technique pour découvrir ce que la personne **veut vraiment**, pas ce qu'elle a écrit dans sa première phrase. Beaucoup de demandes ("fais-moi un tableau de bord") cachent un vrai besoin différent ("je perds le fil de mes expériences en cours").

Pourquoi c'est indispensable avec un agent IA : un agent exécute littéralement ce qu'on lui demande. Si la demande initiale est floue, il construira avec zèle... la mauvaise chose. L'interview est le filtre qui transforme une phrase lancée vite en besoin solide avant que le moindre code soit écrit. C'est l'équivalent, en médecine, de poser des questions avant de prescrire : on ne soigne pas le premier symptôme énoncé.

### Quand l'utiliser
- La demande est vague : on ne sait pas **qui** va s'en servir, **pourquoi maintenant**, à quoi ressemble le **succès**.
- La personne dit explicitement "interview-moi", "es-tu sûr de comprendre ?".
- Tu sens que tu es en train de deviner des détails importants sans les avoir vérifiés.

**Ne pas l'utiliser** si la demande est déjà limpide ("renomme cette variable", "corrige cette faute").

Autres signaux d'alerte : la demande contient des mots prestigieux mais vides ("scalable", "moderne", "complet") sans exemple concret ; la personne répond "comme tu veux" quand on lui demande de choisir ; tu dois faire plus de 3 suppositions pour commencer à travailler.

### Comment ça marche
1. **Formuler une hypothèse avec un niveau de confiance** avant de poser une question : *"Je pense que tu veux X. Confiance : 30% — il me manque qui c'est pour, et ce que 'réussir' veut dire."* Le pourcentage affiché force l'honnêteté : il interdit de faire semblant de comprendre.
2. **Poser une question à la fois**, jamais une liste de 5 questions d'un coup — sinon la personne répond en diagonale. Une seule question = une vraie réponse.
3. **Attacher une supposition à chaque question** ("Je devine que c'est pour l'équipe en stand-up, car...") : la personne réagit plus vite à une supposition (même fausse) qu'à une question ouverte. Corriger est plus facile que créer ex nihilo.
4. **Repérer les réponses "ce que je devrais vouloir"** plutôt que "ce que je veux" (buzzwords comme "scalable", "moderne" sans contenu concret) — creuser avec : *"Si tu n'avais à te justifier à personne, tu voudrais quoi ?"*
5. **Reformuler l'intention** en 5-6 lignes claires (résultat, pour qui, pourquoi maintenant, succès, contrainte, **ce qu'on ne fait pas**) et attendre un "oui" explicite — pas un "ok" vague. Tant que le "oui" n'est pas là, on continue à questionner, pas à construire.

### Exemple concret
- Demande initiale : "fais-moi un dashboard de métriques."
- Question posée : "Ce 'comment ça va', c'est toi tout seul qui te le demandes, ton équipe en stand-up, ou ta direction ?"
- Réponse : "En fait c'est juste moi, je perds le fil de mes expériences en cours."
- Résultat : ce n'est plus un dashboard qu'il faut construire, mais une simple liste. Deux questions ont évité de construire la mauvaise chose.

### Exemple guidé, pas à pas
Demande : "fais-moi un système de notifications".
- Hypothèse initiale : "Je pense que tu veux des emails automatiques à chaque événement. Confiance : 25% — je ne sais pas qui reçoit quoi, ni ce qui mérite vraiment d'interrompre quelqu'un."
- Question 1 (avec supposition) : "Je devine que c'est pour prévenir les clients quand leur commande change de statut — c'est ça, ou c'est pour ton équipe en interne ?" Réponse : "Non, c'est pour moi, je rate des messages importants de mes clients."
- Question 2 : "Quand tu dis 'je rate des messages' — tu veux être interrompu tout de suite, ou voir un résumé le matin ? Je devine que c'est le résumé du matin, car tu parles de 'perdre le fil'." Réponse : "Exactement, un résumé à 8h."
- Reformulation : "Résultat : un email récapitulatif quotidien à 8h avec les messages clients non lus. Pour : toi seul. Succès : zéro message raté pendant 2 semaines. Contrainte : pas d'appli mobile. On ne fait pas : pas de notifications instantanées, pas de SMS." → "Oui, c'est exactement ça."
- Trois questions ont transformé un "système de notifications" (semaines de travail) en "un email quotidien" (une journée).

### Pièges fréquents
- Poser 3 questions d'un coup (c'est un sondage, pas un entretien).
- Accepter "comme tu veux" comme une validation — c'est une esquive, pas un "oui".
- Oublier la ligne "ce qu'on ne fait pas" dans la reformulation.
- Interviewer après avoir commencé à construire : l'interview se fait avant la première ligne de code, sinon c'est du théâtre.
- Confondre politesse et accord : "oui oui, vas-y" dit vite n'est pas un "oui, c'est exactement ça".

### Checklist de sortie
Hypothèse de départ écrite avec son niveau de confiance ; questions posées une par une, chacune avec sa supposition ; reformulation complète (résultat, public, timing, succès, contrainte, hors-scope) ; "oui" explicite obtenu avant de construire.

### À toi de pratiquer
Prends la dernière demande floue qu'on t'a faite (ou invente : "fais-moi une app de gestion"). Écris ton hypothèse avec un pourcentage de confiance, puis 3 questions une-par-une avec supposition, puis la reformulation en 6 lignes. Vérifie que ta reformulation contient une ligne "on ne fait pas".

### Pour dire que tu maîtrises cette skill
Tu es capable, face à une demande floue, de formuler une hypothèse chiffrée, puis de poser UNE question avec une supposition, puis de reformuler en listant explicitement le hors-scope.

---

## 3. `idea-refine`

### C'est quoi
Une méthode en 3 phases pour transformer une idée floue en concept solide et actionnable : diverger (ouvrir les possibles), converger (choisir), livrer (formaliser).

Le problème qu'elle résout : face à une idée, notre premier réflexe est soit de l'exécuter telle quelle (et de découvrir trop tard ses failles), soit de la juger d'emblée ("bonne" ou "mauvaise"). Les deux réflexes sont mauvais. La méthode impose un détour productif : d'abord élargir le champ (et si on faisait l'inverse ? pour quelqu'un d'autre ? en 10 fois plus simple ?), puis choisir en connaissance de cause, puis écrire noir sur blanc ce qui a été décidé — y compris ce qu'on a décidé de ne pas faire, qui est souvent la décision la plus précieuse.

### Quand l'utiliser
Quand une idée est encore vague, ou avant de s'engager dans un plan, pour stress-tester les hypothèses de départ.

Cas typiques : "j'ai une idée d'app, par où commencer ?", un brainstorming d'équipe qui tourne en rond, une fonctionnalité demandée dont personne n'a vérifié l'intérêt, ou juste avant d'écrire une spec (cette skill produit exactement la matière première dont la spec a besoin).

**Ne pas l'utiliser** quand la décision est déjà prise et qu'il faut exécuter, ni pour des micro-décisions du quotidien (quel nom de variable, quelle couleur de bouton).

### Comment ça marche
1. **Comprendre & ouvrir** — reformuler l'idée en "Comment pourrait-on...", poser 3-5 questions ciblées (pour qui ? à quoi ressemble le succès ? quelles contraintes ? qu'est-ce qui a déjà été tenté ? pourquoi maintenant ?), puis générer 5-8 variantes en utilisant des "lentilles" : inversion ("et si on faisait l'inverse ?"), suppression de contrainte, changement de public, combinaison, simplification extrême, version "10x", regard d'expert. Les lentilles ne sont pas des gadgets : chacune force le cerveau à sortir du premier sillon. L'inversion révèle les hypothèses cachées, la simplification extrême révèle le cœur de valeur, le changement de public révèle qui paie vraiment.
2. **Évaluer & converger** — regrouper les idées qui ont plu en 2-3 directions vraiment différentes, les tester sur 3 critères (valeur utilisateur, faisabilité, différenciation), et surtout **nommer les hypothèses cachées** : qu'est-ce qu'on parie être vrai sans l'avoir vérifié ? Une hypothèse nommée peut être testée (par un prototype, un appel, une landing page) ; une hypothèse invisible devient un pari aveugle qui fait échouer le projet 3 mois plus tard.
3. **Affiner & livrer** — produire un document d'une page : problème, direction recommandée, hypothèses à valider, périmètre du MVP, et surtout une liste "**ce qu'on ne fait pas**" (souvent la partie la plus utile). Ce document d'une page est le contrat moral du projet : quand, dans 2 mois, quelqu'un proposera d'ajouter telle fonctionnalité, on relira la liste "on ne fait pas" au lieu de re-débattre.

### Exemple concret
Idée de départ : "une appli de prise de notes." Après le processus : direction retenue = "un carnet vocal pour les artisans qui n'ont pas les mains libres", avec la liste "on ne fait pas" incluant "pas de synchronisation cloud au lancement", "pas de version web".

### Exemple guidé, pas à pas
Idée : "une plateforme pour apprendre la cuisine".
- **Ouvrir** — questions : pour qui (débutants pressés ? passionnés ?), succès (cuisiner 3 plats sans aide ?), contraintes (budget, temps), tentatives passées (livres abandonnés, vidéos trop longues). Variantes par lentilles : inversion ("et si on apprenait en cuisinant pour d'autres ?" → cours collectifs), simplification extrême ("une seule recette par semaine, parfaitement guidée"), changement de public ("les parents qui cuisinent pour enfants difficiles"), 10x ("1000 recettes en 1 minute" → moteur de recherche par ingrédients du frigo).
- **Converger** — 2 directions : "recette unique hebdo guidée" vs "moteur par ingrédients". Critères : valeur (le guidage hebdo crée une habitude, plus fort), faisabilité (le moteur exige une énorme base de données), différenciation (les moteurs existent déjà). Hypothèse cachée nommée : "les débutants abandonnent par manque de guidage, pas par manque de recettes" — à valider en interviewant 5 débutants avant de coder quoi que ce soit.
- **Livrer** — page de concept : problème (les débutants abandonnent), direction (la recette hebdo guidée), hypothèse à valider (5 interviews), MVP (3 recettes + minuteur intégré), "on ne fait pas" (pas de catalogue, pas de comptes utilisateurs, pas de vidéos).

### Pièges fréquents
- Générer 20 idées superficielles au lieu de 5-8 idées travaillées.
- Être toujours d'accord avec la personne au lieu de challenger une idée faible.
- Sauter la case "hypothèses cachées" et foncer dans un plan.
- Confondre diverger et décider : pendant la phase d'ouverture, on n'élimine rien — le tri vient après, sinon on tue les bonnes idées trop tôt.
- Livrer un document de 10 pages que personne ne lira : une page, pas plus.

### Checklist de sortie
Idée reformulée en "Comment pourrait-on..." ; 5-8 variantes issues d'au moins 3 lentilles différentes ; 2-3 directions évaluées sur valeur/faisabilité/différenciation ; au moins une hypothèse cachée nommée avec son moyen de validation ; document d'une page avec "on ne fait pas" explicite.

### À toi de pratiquer
Prends une idée qui te trotte en tête depuis longtemps. Applique une seule lentille (l'inversion) et génère 3 variantes. Puis nomme une hypothèse cachée de ton idée de départ et écris comment tu pourrais la valider en moins d'une semaine, sans coder.

### Pour dire que tu maîtrises cette skill
Tu peux produire, à partir d'une idée vague, un document d'une page avec un "ce qu'on ne fait pas" explicite et au moins une hypothèse non validée clairement nommée.

---

## 4. `spec-driven-development`

### C'est quoi
Écrire les spécifications **avant** de coder. Empêche de partir dans une direction floue et de découvrir les vrais besoins seulement à mi-chemin.

Une spec, c'est un contrat écrit entre "ce qui est demandé" et "ce qui sera livré" : elle décrit ce que le système doit faire, dans quelles limites, et comment on reconnaîtra que c'est réussi. Elle ne décrit pas comment coder (c'est le travail de l'implémentation), elle décrit quoi livrer et pourquoi. La différence avec une simple "description de ticket" : une spec contient des critères de succès vérifiables et des limites explicites, ce qui permet à quelqu'un d'autre (ou à un agent IA) de construire la bonne chose sans te déranger toutes les heures.

### Quand l'utiliser
Démarrage d'un nouveau projet ou d'une fonctionnalité importante, quand aucune spec n'existe encore, ou quand un besoin recouvre en fait plusieurs capacités indépendantes à découper d'abord.

Règle pratique : si la fonctionnalité prend plus d'une journée de travail, ou si deux personnes pourraient la comprendre différemment, elle mérite une spec écrite. En dessous de ce seuil, une spec serait de la paperasse — un ticket bien écrit suffit.

### Comment ça marche — un flux à 4 phases avec portes de validation
1. **Phase 0 — Vérification du périmètre** : si la demande est en fait plusieurs fonctionnalités, produire d'abord une "carte des capacités" (liste des modules indépendants) avant de spécifier quoi que ce soit. Exemple : "un système de paiement" contient en réalité "encaisser", "rembourser", "facturer" — trois specs séparées, pas une seule.
2. **Phase 1 — Spécifier** : rédiger un document avec objectif, stack technique, structure du projet, style de code, stratégie de tests, limites (ce qu'on ne touche pas), critères de succès, questions ouvertes. Chaque section a une raison : l'objectif évite les malentendus, les limites évitent l'expansion infinie du périmètre, les critères de succès permettront de dire "c'est fini" sans débat, les questions ouvertes listent honnêtement ce qu'on ne sait pas encore au lieu de le cacher.
3. **Phase 2 — Planifier** : transformer la spec en plan d'architecture (voir la skill `planning-and-task-breakdown`). La spec dit "quoi", le plan dit "dans quel ordre et découpé comment".
4. **Phase 3 — Découper en tâches**, puis **Phase 4 — Implémenter**.
Chaque phase doit être validée avant de passer à la suivante — c'est ce qui fait que c'est "à portes" (gated). Une porte, c'est une relecture explicite : "la spec est-elle complète et comprise ? oui → on planifie". Sans portes, on découvre les oublis de la spec pendant le codage, quand ils coûtent 10 fois plus cher à corriger.

### Exemple concret
Avant d'écrire une ligne de code pour "un système de paiement", on écrit d'abord : quels moyens de paiement, quelle devise, que se passe-t-il en cas d'échec, quelles sont les limites (pas de gestion des remboursements dans cette version). Cette spec sert ensuite de référence pendant tout le développement — on la garde "vivante" en la mettant à jour si les besoins changent.

### Exemple guidé, pas à pas
Besoin : "les utilisateurs veulent exporter leurs données".
- **Phase 0** : est-ce une ou plusieurs fonctionnalités ? Export CSV simple + export PDF mis en forme + export automatique planifié = 3 capacités. Carte des capacités écrite, on décide de spécifier uniquement l'export CSV pour cette version.
- **Phase 1** : spec d'une page — objectif ("l'utilisateur télécharge ses données en CSV en moins de 30 secondes"), limites ("pas de PDF, pas de planification, 10 000 lignes max"), critères de succès ("bouton visible sur la page profil, fichier correct ouvert dans Excel, erreur propre au-delà de 10 000 lignes"), questions ouvertes ("faut-il inclure les données archivées ?").
- **Portes** : la spec est relue et validée avant tout plan. La question ouverte trouve sa réponse ("non, pas les archives") et la spec est mise à jour.
- **Phases 2-4** : plan, découpage, implémentation — chaque étape se réfère à la spec, et tout écart (ajouter le PDF "tant qu'on y est") est refusé ou fait l'objet d'une mise à jour explicite de la spec.

### Pièges fréquents
- Écrire une spec puis ne jamais la relire pendant le développement (elle doit rester une référence vivante).
- Sauter la phase 0 et spécifier un besoin qui est en fait 3 besoins mélangés.
- Écrire une spec de 20 pages que personne ne lit : une spec utile tient en 1-3 pages et se lit en 10 minutes.
- Figer la spec au lieu de la mettre à jour : une spec qui ne bouge plus alors que le besoin a changé devient un mensonge officiel.
- Confondre spec et ticket : la spec décrit le "quoi/pourquoi/limites", les tickets décrivent le "qui fait quoi et quand".

### Checklist de sortie
Objectif en une phrase ; critères de succès vérifiables (on sait tester chacun) ; limites explicites ("on ne fait pas") ; questions ouvertes listées ou résolues ; spec relue et validée avant le plan ; spec datée et modifiable (document vivant).

### À toi de pratiquer
Écris la spec d'une fonctionnalité minuscule mais réelle ("recevoir un email quand quelqu'un commente mon article") en une page maximum : objectif, 3 critères de succès testables, 3 limites explicites. Puis demande-toi : "un inconnu pourrait-il construire la bonne chose avec seulement ce document ?"

### Pour dire que tu maîtrises cette skill
Tu sais écrire une spec courte avec au minimum : objectif, critères de succès, et limites explicites — et tu sais dire pourquoi une spec doit être mise à jour, pas figée.

---

## 5. `planning-and-task-breakdown`

### C'est quoi
Transformer un besoin clair (ou une spec) en une liste ordonnée de tâches réalisables, avec des points de contrôle.

Le plan est le pont entre "on sait quoi construire" (la spec) et "on construit" (l'implémentation). Sans lui, on code dans l'ordre où les idées viennent — c'est-à-dire dans le désordre. Avec lui, chaque session de travail commence par "je prends la prochaine tâche de la liste" au lieu de "par où je commence déjà ?". Pour un agent IA, c'est vital : une tâche isolée, bien cadrée, est exactement le format qu'il exécute le mieux.

### Quand l'utiliser
Dès qu'une tâche semble trop grosse pour être commencée telle quelle, ou quand plusieurs tâches pourraient être faites en parallèle.

Test simple : si tu ne peux pas expliquer à voix haute, en 30 secondes, par quoi tu vas commencer et comment tu sauras que c'est fini, alors il faut découper avant d'agir. Autre signal : quand deux personnes (ou deux sessions d'agent) doivent travailler en même temps sur le même chantier — sans plan, elles se marcheront dessus.

### Comment ça marche
1. **Entrer en "mode plan"** (réfléchir avant d'agir). Concrètement : interdiction de toucher au code pendant cette phase. On lit, on note, on ordonne. Le mode plan se termine par un document écrit, pas par une vague idée en tête.
2. **Identifier le graphe de dépendances** : qu'est-ce qui doit être fait avant quoi ? Dessine-le même grossièrement (A avant B, C indépendant). Les tâches sans dépendances sont celles qu'on pourra paralléliser.
3. **Découper verticalement** : chaque tâche doit livrer une tranche fonctionnelle complète (de la base de données jusqu'à l'interface), pas une couche technique isolée. Une tranche verticale se teste de bout en bout ("je crée un commentaire et je le vois s'afficher") ; une couche horizontale ("toute la base de données") ne prouve rien tant que le reste n'existe pas.
4. **Écrire chaque tâche** avec un titre court et descriptif. Idéalement au format actionnable : verbe d'action + objet + périmètre ("Ajouter la route POST /comments avec validation"). Chaque tâche doit tenir en une session de travail (quelques heures maximum).
5. **Ordonner et poser des points de contrôle** (checkpoints) : "après les tâches 1 à 3, on vérifie que tout fonctionne avant de continuer." Un checkpoint, c'est un moment où on s'arrête, on teste le flux complet, et on décide si on continue ou si on corrige d'abord.

### Exemple concret
Pour "ajouter les commentaires sur les articles" : Tâche 1 (modèle de données + API), Tâche 2 (interface d'ajout de commentaire), Tâche 3 (modération), avec un checkpoint après la tâche 2 pour tester le flux complet avant d'ajouter la modération.

### Exemple guidé, pas à pas
Besoin : "un formulaire de contact qui envoie un email".
- **Dépendances** : il faut une route d'envoi avant de brancher le formulaire ; la protection anti-spam peut venir après, elle ne bloque rien.
- **Découpage vertical** : T1 "route POST /contact qui envoie un vrai email (testée avec curl)", T2 "formulaire connecté à la route avec messages d'erreur visibles", T3 "protection anti-spam + limite d'envoi".
- **Checkpoints** : après T1, on vérifie qu'un email arrive vraiment ; après T2, on teste le parcours complet en tant qu'utilisateur.
- Remarque : T3 est indépendante du design du formulaire — elle pourrait être faite en parallèle par quelqu'un d'autre. C'est le graphe de dépendances qui le révèle.

### Pièges fréquents
- Découper "horizontalement" (toute la base de données d'un coup, puis toute l'API, puis toute l'interface) au lieu de "verticalement" (une fonctionnalité complète à la fois) — cela retarde le moment où l'on voit vraiment si ça marche.
- Des tâches trop grosses, sans estimation de taille.
- Des tâches formulées comme des souhaits ("améliorer les commentaires") au lieu d'actions vérifiables ("afficher les 10 derniers commentaires sous chaque article").
- Oublier les checkpoints : sans pause de vérification, on découvre les problèmes d'intégration à la toute fin, quand tout est emmêlé.
- Planifier à l'heure près : un plan n'est pas un planning. L'ordre et les dépendances comptent, les dates précises sont une illusion.

### Checklist de sortie
Chaque tâche commence par un verbe d'action ; chacune tient en une session ; les dépendances sont explicites ; au moins un checkpoint est posé avant la fin ; on sait, pour chaque tâche, comment vérifier qu'elle est terminée.

### À toi de pratiquer
Prends une fonctionnalité que tu as déjà construite (ou que tu veux construire) et découpe-la en 4 tâches verticales avec un checkpoint après la 2e. Pour chaque tâche, écris la phrase de vérification : "cette tâche est finie quand je peux montrer que..."

### Pour dire que tu maîtrises cette skill
Tu sais transformer un besoin en 3-6 tâches ordonnées avec au moins un checkpoint intermédiaire, et tu privilégies systématiquement le découpage vertical.

---

## 6. `incremental-implementation`

### C'est quoi
La discipline de livrer le code par petites tranches vérifiables, plutôt que d'écrire un gros bloc de code d'un coup.

L'idée centrale : à tout moment, le projet doit être dans un état qui fonctionne. Chaque étape ajoute un petit incrément testable par-dessus un socle stable. C'est l'opposé du "big bang" où l'on écrit pendant 3 jours puis on découvre 47 erreurs d'un coup — sans savoir laquelle vient d'où. Avec les incréments, quand quelque chose casse, on sait exactement quelle petite tranche est responsable : c'est la dernière.

### Quand l'utiliser
Dès qu'une fonctionnalité touche plusieurs fichiers, ou quand une tâche du plan est sur le point de générer beaucoup de code d'un coup.

En pratique : dès que tu anticipes plus de ~100 lignes de code, ou dès qu'une tâche implique à la fois du backend et du frontend, découpe en tranches. Même pour une petite tâche, l'habitude des petites tranches coûte moins cher que le débogage d'un gros bloc.

### Comment ça marche — règles clés
- **Simplicité d'abord** : la version la plus simple qui marche, avant d'optimiser. Le tri basique avant le tri "intelligent", le formulaire sans fioritures avant les animations. L'optimisation prématurée est la façon la plus sûre de compliquer un code qui n'avait pas besoin de l'être.
- **Une chose à la fois** : ne pas mélanger plusieurs changements dans une même étape. Si pendant une tranche tu découvres autre chose à corriger, note-le pour plus tard au lieu de l'embarquer — sinon, en cas de bug, tu ne sauras plus quel changement est fautif.
- **Toujours compilable** : le code doit fonctionner à chaque étape intermédiaire, jamais rester "cassé" entre deux étapes. Règle d'or : à la fin de chaque tranche, les tests passent et l'application démarre. Si ce n'est pas le cas, la tranche était trop grosse.
- **Feature flags** pour les fonctionnalités incomplètes (on peut merger du code inactif tant qu'il n'est pas fini). Un flag, c'est un interrupteur (`if (FEATURE_EXPORT_PDF)`) qui cache le chantier en cours aux utilisateurs pendant que le code, lui, avance tranquillement dans le projet.
- **Valeurs par défaut sûres** et **retour arrière facile** (rollback) en cas de problème. Chaque tranche doit pouvoir être annulée proprement : commits petits et messages clairs, migrations réversibles côté base de données.

### Exemple concret
Ajouter "export PDF" : étape 1 = générer un PDF vide fonctionnel (code compilable, testable), étape 2 = ajouter le contenu texte, étape 3 = ajouter la mise en forme. Jamais un unique commit "export PDF complet" difficile à relire et à corriger si un bug survient.

### Exemple guidé, pas à pas
Besoin : "recherche dans la liste des articles".
- **Tranche 1** : champ de recherche qui filtre côté interface sur les articles déjà chargés. Test : je tape "pomme", seuls les articles contenant "pomme" s'affichent. L'application fonctionne, les tests passent.
- **Tranche 2** : la recherche passe côté serveur (route API avec paramètre). Test : mêmes vérifications, plus un test de la route. Si ça casse, on sait que c'est la tranche 2.
- **Tranche 3** : surlignage des occurrences + message "aucun résultat" soigné, cachés derrière un flag le temps du développement.
- À chaque tranche, commit séparé avec message explicite. Si la tranche 3 introduit un bug, on l'annule sans toucher aux tranches 1 et 2 qui marchent.

### Pièges fréquents
- Écrire 500 lignes avant de tester quoi que ce soit.
- Laisser le code dans un état cassé "en attendant la suite".
- Mélanger refactoring et fonctionnalité dans la même tranche : le refactoring se fait dans sa propre tranche, avant ou après, jamais pendant.
- Des tranches "techniques" invérifiables ("refactorer la couche d'accès") au lieu de tranches "visibles" ("la recherche marche avec 100 articles").
- Oublier de retirer les feature flags : un flag qui traîne 6 mois devient du code mort que personne n'ose toucher.

### Checklist de sortie
Chaque tranche se teste indépendamment ; l'application démarre et les tests passent après chaque tranche ; chaque commit correspond à une tranche avec un message clair ; tout chantier inachevé est caché derrière un flag ; on peut annuler la dernière tranche sans perdre le reste.

### À toi de pratiquer
Reprends ta dernière fonctionnalité livrée d'un bloc et réécris son histoire en 3 tranches : qu'aurait contenu la tranche 1 minimale mais fonctionnelle ? Quel test aurait validé chaque tranche ? Note aussi où un feature flag aurait été utile.

### Pour dire que tu maîtrises cette skill
Tu sais découper une fonctionnalité en étapes qui restent chacune fonctionnelles et testables, et tu sais utiliser un feature flag pour cacher une fonctionnalité incomplète sans casser le reste.

---

## 7. `source-driven-development`

### C'est quoi
Vérifier une approche technique dans la **documentation officielle** avant de l'implémenter, plutôt que de se fier à une habitude ou un souvenir potentiellement dépassé.

Les frameworks évoluent vite : une API qu'on connaît par cœur a peut-être changé de nom, de comportement, ou de bonnes pratiques recommandées depuis 2 ans. Le coût d'une vérification dans la doc officielle : 5 minutes. Le coût d'implémenter sur un souvenir périmé : des heures de débogage d'un code "qui devrait marcher". Cette skill transforme un réflexe paresseux ("je sais comment on fait") en réflexe professionnel ("je vérifie comment on fait dans cette version").

### Quand l'utiliser
Dès qu'on travaille avec un framework ou une librairie où l'exactitude compte, en particulier si la technologie évolue vite.

Déclencheurs typiques : première utilisation d'une librairie, montée de version, API d'authentification ou de paiement (où une erreur coûte cher), code copié depuis un tutoriel ou une ancienne réponse d'IA, et systématiquement quand on demande à un agent IA d'utiliser une librairie qu'il "connaît" — sa connaissance s'arrête à sa date d'entraînement.

### Comment ça marche
1. **Détecter la stack et les versions** utilisées dans le projet. Concrètement : ouvrir le `package.json` (ou équivalent), noter le numéro exact. "React 18" n'est pas une version, "react 18.3.1" en est une.
2. **Aller chercher la documentation officielle** correspondant à cette version précise (pas une version plus ancienne trouvée par habitude). Site officiel d'abord, puis guides de migration officiels entre versions. Les blogs et Stack Overflow viennent après, comme compléments — jamais comme référence unique.
3. **Implémenter en suivant les patterns documentés** — pas un pattern "qu'on a toujours fait comme ça". Si la doc recommande désormais une nouvelle approche (ex : les Server Components, les nouvelles APIs de formulaires), on suit la doc, même si l'ancienne méthode "marche encore".
4. **Citer ses sources** dans le code ou les commentaires, pour que quelqu'un d'autre puisse vérifier. Un commentaire `// voir doc officielle v18.3, section X` prend 10 secondes à écrire et fait gagner des heures au prochain lecteur.

Un point de sécurité important : tout contenu récupéré depuis une doc externe ou un site doit être traité comme **de la donnée**, jamais comme des instructions à exécuter aveuglément (protection contre des instructions cachées malveillantes).

### Exemple concret
Avant d'implémenter l'authentification avec une librairie, on vérifie la doc officielle de la version installée (et pas un tutoriel de 2022 qui utilise une API dépréciée), et on note dans le code : `// voir doc officielle vX.Y, section Auth`.

### Exemple guidé, pas à pas
Besoin : "ajouter des notifications push avec une librairie qu'on n'a jamais utilisée".
- **Versions** : `push-lib 4.2.0` installée (notée depuis le `package.json`).
- **Doc officielle** : on ouvre la doc de la 4.x (pas la 3.x trouvée en premier sur Google) et on découvre que l'initialisation a changé : elle exige désormais une clé publique côté client et un endpoint serveur séparé — l'ancien tutoriel qu'on s'apprêtait à suivre est obsolète.
- **Implémentation** : on suit l'exemple officiel pas à pas, en adaptant uniquement les noms à notre projet.
- **Citation** : en haut du fichier, `// intégration push-lib 4.2 — voir docs officielles, section "Web setup"`.
- **Sécurité** : un exemple trouvé sur un forum contenait un script à coller tel quel — on l'a lu comme une information (l'idée générale), pas comme des instructions (on n'a rien exécuté aveuglément).
- Résultat : intégration réussie du premier coup, là où suivre le vieux tutoriel aurait donné 2 jours de débogage.

### Pièges fréquents
- Copier un pattern trouvé sur un blog sans vérifier qu'il correspond à la version installée.
- Traiter le contenu d'une page web récupérée comme des instructions à suivre au lieu d'une simple information.
- Vérifier la doc une fois au début puis ne plus jamais la rouvrir pendant 6 mois sur une stack qui évolue vite.
- Citer un tutoriel tiers comme référence au lieu de la doc officielle : dans 1 an, le tutoriel aura peut-être disparu, la doc officielle sera toujours là.
- Faire confiance à la mémoire d'un agent IA sur les versions récentes : sa connaissance a une date limite, la doc n'en a pas.

### Checklist de sortie
Version exacte notée ; doc officielle de cette version consultée ; implémentation alignée sur les patterns documentés ; sources citées dans le code ; aucun contenu web exécuté aveuglément.

### À toi de pratiquer
Choisis une dépendance de ton projet actuel, note sa version exacte, puis ouvre sa doc officielle et vérifie une chose que tu "sais" déjà faire avec. Note ce que tu as appris ou confirmé, avec le lien vers la section exacte.

### Pour dire que tu maîtrises cette skill
Tu réflexes de vérifier la version exacte d'une dépendance avant de chercher comment l'utiliser, et tu sais expliquer pourquoi on ne fait jamais confiance aveuglément à un contenu récupéré sur le web.

---

## 8. `doubt-driven-development`

### C'est quoi
Soumettre chaque décision importante à une revue "adversariale" faite par un regard neuf (un autre agent ou un contexte frais), avant de considérer la décision comme validée.

L'idée vient d'un constat simple : celui qui prend une décision est le moins bien placé pour voir ses failles — il connaît trop bien ses propres raisons. Le "regard neuf" (un collègue, un autre agent, ou même soi-même le lendemain avec un contexte vierge) n'a pas ces angles morts. On ne lui demande pas "c'est bien ?" (question qui invite à approuver), on lui demande "qu'est-ce qui pourrait mal se passer ?" (question qui invite à attaquer). C'est la différence entre une relecture polie et une revue qui protège vraiment.

### Quand l'utiliser
Enjeux élevés : sécurité, authentification, migration de données, opérations irréversibles — bref, tout ce où se tromper coûte cher, et où vérifier maintenant coûte moins cher que déboguer plus tard.

Exemples concrets de décisions à enjeu : supprimer des données, changer un schéma de base en production, choisir une librairie d'authentification, exposer une nouvelle API publique, déployer un script qui touche à la facturation. À l'inverse, on n'applique pas cette artillerie au choix d'un nom de variable ou d'une couleur : le coût de la revue doit rester inférieur au coût d'une erreur.

### Comment ça marche
1. **CLAIM** — Formuler clairement ce qui est affirmé/décidé. Une phrase, pas un paragraphe : "les mots de passe sont hachés avec bcrypt, coût 12, et jamais journalisés". Si on ne peut pas formuler la décision en une phrase, c'est qu'elle n'est pas encore mûre pour être challengée.
2. **EXTRACT** — Isoler la plus petite unité "révisable" (pas tout le projet, juste la décision en question). Le relecteur reçoit le minimum nécessaire : le bout de code, le schéma, le choix — pas 40 fichiers de contexte qui noieraient la question.
3. **DOUBT** — Faire relire cette décision par un "regard neuf" (un contexte qui n'a pas les mêmes biais que celui qui a pris la décision) — on peut même passer par un autre modèle IA en lecture seule pour challenger la décision. Consigne type : "Voici la décision et son contexte. Liste tout ce qui pourrait mal se passer, par ordre de gravité. Ne propose pas de solutions pour l'instant."
4. **RECONCILE** — Intégrer les remarques pertinentes dans la décision finale. Toutes les objections ne se valent pas : on corrige les failles réelles, on note les risques acceptés (avec leur justification), on écarte explicitement les faux problèmes — sans les ignorer en silence.
5. **STOP** — La boucle est bornée : on ne recommence pas indéfiniment, on s'arrête après un nombre raisonnable d'itérations. En pratique : un seul cycle suffit dans 90% des cas ; deux cycles maximum pour les décisions critiques. Au-delà, ce n'est plus de la prudence, c'est de la paralysie.

### Exemple concret
Avant de déployer un script de migration de base de données en production, on fait relire le script par un "regard neuf" qui n'a pas participé à son écriture, en lui demandant explicitement : "qu'est-ce qui pourrait mal se passer ici ?"

### Exemple guidé, pas à pas
Décision : "on supprime les comptes inactifs depuis plus de 2 ans pour alléger la base".
- **CLAIM** : "Supprimer définitivement les comptes sans connexion depuis 24 mois, après un email d'avertissement 30 jours avant."
- **EXTRACT** : on isole le script de suppression + la requête de sélection (15 lignes), pas tout le module utilisateurs.
- **DOUBT** : le regard neuf attaque : "et les comptes dont l'email d'avertissement rebondit ? et les comptes avec des factures légales à conserver 10 ans ? et si 'dernière connexion' n'est jamais renseigné pour les vieux comptes ?" Trois vraies failles en une relecture.
- **RECONCILE** : on corrige — exclusion des comptes avec documents légaux, traitement des emails en échec (pas de suppression sans avertissement reçu), valeur par défaut prudente pour les dates manquantes (on ne supprime pas ce qu'on ne peut pas dater).
- **STOP** : un cycle, décision validée et durcie. Sans cette revue, la migration aurait supprimé des comptes à conserver légalement.

### Pièges fréquents
- Appliquer cette skill à des décisions triviales (surcoût inutile).
- Laisser la boucle de doute tourner indéfiniment sans jamais trancher.
- Demander "tu en penses quoi ?" au lieu de "qu'est-ce qui pourrait mal se passer ?" — la première question produit des compliments, la seconde des failles.
- Choisir un relecteur qui partage les mêmes biais (le même agent, dans la même conversation) : un regard neuf doit être vraiment neuf.
- Rejeter toutes les objections par orgueil : si la revue ne change jamais rien, c'est qu'on ne l'écoute pas — ou qu'on la fait pour la forme.

### Checklist de sortie
Décision formulée en une phrase ; unité révisable isolée ; relecture adversariale effectuée avec la consigne "qu'est-ce qui pourrait mal se passer" ; chaque objection traitée (corrigée, acceptée avec justification, ou écartée explicitement) ; nombre de cycles borné et respecté.

### À toi de pratiquer
Reprends une décision technique que tu as prise récemment (même petite). Formule-la en une phrase (CLAIM), isole l'unité révisable (EXTRACT), puis joue toi-même le regard neuf en listant 3 choses qui pourraient mal se passer. Intègre au moins une remarque (RECONCILE).

### Pour dire que tu maîtrises cette skill
Tu sais identifier les décisions "à enjeu élevé" qui méritent une relecture adversariale, et tu sais qu'il faut borner cette relecture (pas une boucle infinie de doute).

---

## 9. `discernment-nudge`

### C'est quoi
Un rappel automatique, ajouté après une réponse importante, qui invite la personne à vérifier des faits, questionner un raisonnement, ou repérer du contexte manquant — pour éviter qu'on prenne une réponse IA pour argent comptant sans réflexion.

Le problème de fond : plus une réponse d'IA est bien écrite, plus on a envie de la croire — alors que l'éloquence n'est pas une preuve d'exactitude. Le "nudge" (coup de pouce) est un petit mécanisme d'hygiène intellectuelle : au moment précis où le lecteur s'apprête à faire confiance, on lui glisse 2-3 vérifications ciblées. C'est discret, c'est rapide, et ça change radicalement la qualité des décisions prises à partir de réponses d'IA.

### Quand l'offrir
Après avoir donné : une estimation ou une projection chiffrée, un conseil dans un domaine à enjeu (santé, droit, finance, carrière), une affirmation factuelle sur laquelle la personne pourrait s'appuyer, un raisonnement en plusieurs étapes, ou un document important rédigé pour elle (plan, email, proposition).

### Quand ne pas l'offrir
Écriture créative, discussion informelle, code que l'utilisateur va exécuter lui-même (l'exécution est déjà la vérification), simples recherches factuelles ("en quelle année..."), explications purement pédagogiques, ou si la personne a déjà demandé une vérification. **Une seule fois par conversation** — pas à chaque message.

La règle d'or : le rappel doit coûter moins cher que l'erreur qu'il prévient. Après un conseil financier à 6 chiffres, 2 questions valent de l'or. Après une blague, elles sont une insulte à l'intelligence du lecteur.

### Comment ça marche
Ajouter 2-3 questions courtes, liées précisément à ce qui vient d'être produit — pas des questions génériques. Exemple : après un conseil financier, demander "as-tu vérifié ce taux auprès de ta banque ?" plutôt qu'un vague "es-tu sûr de ce que je dis ?"

Recette d'une bonne question de rappel : elle désigne un fait précis ("ce taux", "cette date", "cette hypothèse"), elle indique où vérifier ("auprès de ta banque", "dans le contrat", "en relançant le test"), et elle tient en une ligne. Une mauvaise question est vague ("es-tu sûr ?"), moralisatrice ("tu devrais toujours vérifier"), ou impossible à actionner.

### Exemple concret
Après une estimation "ce projet prendra 3 semaines", ajouter : "Ce chiffrage suppose que l'API externe est déjà stable — l'as-tu vérifié ? Et qui a déjà fait un projet comparable pour comparer ?" Deux questions qui ciblent les deux hypothèses les plus fragiles du chiffrage.

### Exemple guidé, pas à pas
Situation : l'agent vient de produire un plan de migration "sans risque" en 5 étapes.
- On identifie ce qui mérite vérification : l'affirmation "sans risque" (affirmation forte), l'étape 3 qui touche aux données clients (enjeu élevé), et le délai "une journée" (estimation chiffrée).
- On formule 2 questions précises : "L'étape 3 modifie des données clients : as-tu une sauvegarde testée avant de la lancer ?" et "Le délai d'une journée suppose zéro imprévu : quelle étape crains-tu le plus, et que fait-on si elle dérape ?"
- On n'ajoute rien d'autre : pas de troisième question vague, pas de rappel sur les autres étapes qui sont réversibles et sans enjeu.
- Résultat : le lecteur vérifie les 2 points critiques en 5 minutes au lieu de faire aveuglément confiance à un plan "sans risque".

### Pièges fréquents
- Ajouter ce rappel après chaque réponse (ça devient du bruit et de l'agacement).
- Poser des questions génériques au lieu de questions précisément liées au contenu produit.
- Poser des questions dont on connaît déjà la réponse juste pour "faire sérieux" : le rappel doit servir le lecteur, pas la réputation de l'auteur.
- Oublier la limite d'une fois par conversation : le deuxième rappel est toujours de trop.
- Utiliser un ton alarmiste ("ATTENTION, tout peut être faux !") qui discrédite le contenu au lieu d'inviter à vérifier intelligemment.

### Checklist de sortie
La réponse contenait bien un des cas déclencheurs (estimation, conseil à enjeu, fait structurant, raisonnement multi-étapes, document important) ; aucun cas d'exclusion ne s'appliquait ; 2-3 questions précises, actionnables, liées au contenu ; aucun autre rappel déjà donné dans cette conversation ; ton neutre et utile.

### À toi de pratiquer
Relis la dernière réponse "importante" que tu as reçue d'une IA (ou que tu as produite). Écris les 2 questions de rappel que tu aurais dû voir : précises, actionnables, liées au contenu. Puis vérifie qu'elles tiennent chacune en une ligne.

### Pour dire que tu maîtrises cette skill
Tu sais reconnaître les 5-6 types de réponses qui méritent ce rappel, et tu sais qu'il ne doit apparaître qu'une seule fois par conversation.

---

## 10. `context-engineering`

### C'est quoi
La discipline de bien préparer ce qu'un agent IA "voit" avant de travailler : quelles règles, quels fichiers, quel historique de conversation lui donner pour qu'il produise un travail pertinent.

Un agent IA ne voit que ce qu'on lui montre : pas ton projet, pas tes intentions, pas tes contraintes — seulement la fenêtre de contexte que tu lui as construite. 80% de la qualité d'une réponse d'agent se joue avant la question, dans la préparation de ce contexte. Un bon contexte, c'est la différence entre "l'agent a tout compris du premier coup" et "20 allers-retours pour lui expliquer ce qu'un humain aurait vu en 10 secondes".

### Quand l'utiliser
Au démarrage d'une nouvelle session de travail, quand la qualité des réponses de l'agent se dégrade, en changeant de tâche, ou pour configurer les fichiers de règles d'un projet.

Signes que le contexte est pourri : l'agent invente des fichiers qui n'existent pas, il contredit ce qu'il a dit 10 messages plus tôt, il propose des solutions pour une autre stack, il tourne en rond sur un problème déjà résolu. Dans tous ces cas, le réflexe n'est pas "l'agent est nul", c'est "mon contexte est nul" — et on le reconstruit.

### Comment ça marche — une hiérarchie de contexte à 5 niveaux
1. **Fichiers de règles** (nom du projet, stack technique, commandes, conventions de code, limites, patterns). C'est le socle permanent : ce que l'agent doit savoir sur tous les chantiers. On l'écrit une fois (dans les fichiers de règles du projet), on le relit quand la stack change.
2. **Specs et architecture** du projet. Le "quoi" et le "pourquoi" : sans la spec, l'agent optimise dans le vide.
3. **Fichiers sources pertinents** (juste ceux dont on a besoin, pas tout le repo). La sélection est un vrai travail : ouvrir les fichiers, lire les signatures, ne garder que ce qui sert la tâche du jour. "Au cas où" n'est pas un critère de sélection.
4. **Sorties d'erreurs** (logs, messages d'erreurs précis). Quand ça casse, le log exact vaut mieux que 3 paragraphes d'explication approximative. On colle l'erreur telle quelle, avec la commande qui l'a produite.
5. **Gestion de la conversation** — savoir quand redémarrer une session propre plutôt que de laisser le contexte s'accumuler et se diluer. Règle pratique : quand tu dois réexpliquer deux fois la même chose, c'est le signal — on résume l'essentiel et on ouvre une session neuve.

Trois stratégies pour "empaqueter" le contexte : le "brain dump" (tout donner d'un coup, rapide mais bruyant), l'inclusion sélective (choisir précisément), le résumé hiérarchique (une carte du projet avec juste les points d'entrée). Il faut aussi gérer un "budget" de contexte : qu'est-ce qu'on coupe en premier, qu'est-ce qu'on protège jusqu'au bout, qu'est-ce qu'on résume plutôt que de supprimer.

Concrètement, le budget se gère comme un budget d'argent : les règles et la spec sont les dépenses incompressibles (on ne les coupe jamais), les fichiers sources sont les dépenses variables (on ajuste selon la tâche), l'historique de conversation est le premier poste à couper (on le résume en 5 lignes au lieu de le garder en entier).

### Exemple concret
Plutôt que de coller tout le code source d'un projet dans une conversation, on donne une "carte du projet" en une page (quels dossiers font quoi) et on ajoute seulement les 2-3 fichiers directement concernés par la tâche du jour.

### Exemple guidé, pas à pas
Tâche : "corriger le bug où la déconnexion ne marche plus".
- **Mauvais contexte** : coller les 40 fichiers du projet + 60 messages d'historique + "ça marche plus, regarde". Résultat : l'agent se noie, propose de réécrire le module d'authentification en entier.
- **Bon contexte** : règles du projet (stack, commandes de test) + les 3 fichiers d'auth concernés + le log d'erreur exact (`POST /logout → 500, TypeError...`) + une phrase : "ça marchait avant la mise à jour de la librairie X". Rien d'autre.
- **Pendant la session** : après 15 échanges, l'agent commence à confondre deux approches testées. On s'arrête, on résume ("approche A écartée car..., on teste l'approche B sur le fichier Y"), on ouvre une session neuve avec ce résumé + les mêmes 3 fichiers.
- Résultat : bug trouvé en 20 minutes (un intercepteur qui avalait l'erreur) au lieu d'une après-midi de confusion.

### Pièges fréquents
- Tout donner d'un coup "au cas où", ce qui noie l'information utile.
- Laisser une conversation s'éterniser sans jamais faire le ménage, jusqu'à ce que l'agent perde le fil.
- Donner du contexte périmé (une spec d'il y a 3 mois, des règles d'une ancienne stack) : le contexte faux est pire que pas de contexte, car l'agent s'y fie aveuglément.
- Oublier les règles permanentes : répéter les mêmes consignes à chaque session au lieu de les écrire une fois dans les fichiers de règles.
- Inclure des secrets dans le contexte (clés API, mots de passe) : ce qui entre dans une conversation peut en ressortir — jamais de secrets, même "juste pour tester".

### Checklist de sortie
Règles du projet présentes et à jour ; spec de la tâche jointe ; 2-4 fichiers sources pertinents, pas plus ; erreur exacte collée si débogage ; aucun secret dans le contexte ; session fraîche si l'historique dépasse ~15 échanges confus.

### À toi de pratiquer
Pour ta prochaine demande à un agent, prépare ton contexte avant d'écrire ta question : 3 lignes de cadrage (projet, stack, objectif) + les fichiers concernés (2 maximum) + rien d'autre. Compare la qualité de la réponse avec tes demandes habituelles.

### Pour dire que tu maîtrises cette skill
Tu sais choisir, pour une tâche donnée, les 3-4 informations de contexte qui comptent vraiment, plutôt que de tout donner.

---

## 11. `using-agent-skills` (méta-skill)

### C'est quoi
La skill "au-dessus des autres skills" : elle explique comment un agent doit découvrir, choisir et enchaîner les skills disponibles.

Si chaque skill est un outil dans une boîte, cette méta-skill est le manuel qui dit quel outil prendre, dans quel ordre, et comment vérifier qu'on a pris le bon. Sans elle, un agent face à 200 skills fait l'équivalent de choisir un tournevis au hasard dans une caisse de 200 outils : parfois ça marche par chance, le plus souvent ça coince. Avec elle, l'agent raisonne explicitement : "voici la situation, voici les skills candidates, voici pourquoi je choisis celle-ci, voici comment je vérifierai".

### Quand l'utiliser
Au démarrage d'une session, ou dès qu'il faut décider quelle skill s'applique à la tâche en cours.

En pratique : chaque fois que tu t'apprêtes à dire à un agent "utilise la skill X", c'est cette méta-skill qui devrait d'abord valider que X est vraiment la bonne. Et chaque fois qu'une tâche touche à deux domaines (ex : une API + son interface), c'est elle qui orchestre l'enchaînement des deux skills concernées.

### Comment ça marche — comportements clés
1. **Surfacer les hypothèses** — dire explicitement ce qu'on suppose plutôt que de le garder implicite. "Je suppose que la base est déjà migrée" écrit noir sur blanc permet à quelqu'un de corriger ; gardé en tête, ça devient un bug silencieux quand la supposition est fausse.
2. **Gérer activement la confusion** — si quelque chose n'est pas clair, le signaler tout de suite plutôt que de deviner en silence. Un agent qui dit "je ne sais pas si tu veux X ou Y" est utile ; un agent qui choisit au hasard est dangereux.
3. **Pousser un retour quand c'est justifié** — ne pas être uniquement d'accord, challenger si nécessaire. Si la demande contredit les bonnes pratiques ("mets le mot de passe en clair pour aller vite"), l'agent doit le dire, pas obéir.
4. **Imposer la simplicité** — préférer toujours la solution la plus simple qui marche. Face à deux approches, on choisit la plus courte à expliquer. La complexité doit justifier son existence, jamais l'inverse.
5. **Garder la discipline de périmètre** — ne pas dériver vers des tâches non demandées. "Tant qu'on y est, je refactore aussi ce module" est la phrase qui précède 90% des régressions.
6. **Vérifier plutôt que supposer** — tester une affirmation avant de la considérer vraie. "La route existe" se vérifie en l'appelant, pas en le croyant.

### Exemple concret
Un agent qui reçoit "améliore les performances" doit d'abord se demander quelle skill s'applique (probablement `performance-optimization`, catégorie qa-debug), signaler s'il manque un critère de succès chiffré, plutôt que de deviner et de partir dans une direction arbitraire.

### Exemple guidé, pas à pas
Demande : "ajoute la pagination à la liste des produits".
- **Situation** : le besoin touche l'API (backend) et l'affichage (frontend). Deux skills candidates : une skill backend et une skill frontend.
- **Choix explicite** : "Je commence par le backend (route avec paramètres page/limite), car le frontend ne peut pas afficher ce que l'API ne fournit pas. Ordre : backend puis frontend."
- **Hypothèses surfacées** : "Je suppose 20 éléments par page par défaut et une numérotation commençant à 1 — dis-moi si tu veux d'autres valeurs."
- **Confusion gérée** : "La liste actuelle charge-t-elle déjà tout d'un coup, ou y a-t-il un chargement existant ? Je n'ai pas trouvé : je pars sur 'tout d'un coup'."
- **Périmètre tenu** : pendant le travail, l'agent remarque que le tri est aussi cassé — il le note pour plus tard au lieu de l'embarquer.
- **Vérification** : chaque étape est testée (la route renvoie bien la page 2, l'interface affiche bien les bons boutons) au lieu de supposer que "ça devrait marcher".
- Résultat : un travail où chaque décision est visible et contestable, au lieu d'une boîte noire.

### Pièges fréquents
- Appliquer une skill "par habitude" sans vérifier qu'elle correspond vraiment à la situation.
- Enchaîner des skills sans jamais faire le lien explicite entre elles pour l'utilisateur.
- Choisir la skill la plus impressionnante au lieu de la plus adaptée : la simplicité gagne presque toujours.
- Ne jamais dire "je ne sais pas quelle skill s'applique" : avouer l'incertitude et demander est un comportement de la méta-skill, pas un échec.
- Appliquer 5 skills à un problème qui n'en demandait qu'une : l'empilement de méthodes est aussi nocif que l'absence de méthode.

### Checklist de sortie
Situation résumée en 2 lignes ; skills candidates nommées avec le choix justifié en une phrase ; hypothèses écrites ; points de confusion signalés avant d'agir ; périmètre respecté (rien hors demande) ; chaque affirmation importante vérifiée, pas supposée.

### À toi de pratiquer
Prends une tâche de ta semaine et écris le raisonnement de choix de méthode : situation (2 lignes), 2 approches candidates, choix + justification (1 phrase), 2 hypothèses que tu fais, 1 point que tu devrais vérifier au lieu de supposer. C'est exactement le muscle que cette skill entraîne.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer les 6 comportements clés ci-dessus et donner un exemple pour chacun.

---

## 12. `find-skills`

### C'est quoi
Une skill "méta" qui aide à **découvrir** si une skill existe déjà pour un besoin donné, avant de réinventer la roue.

Il existe des centaines de skills publiques (conventions React, règles de design, helpers de tests...). Les réécrire soi-même, c'est des heures perdues pour un résultat moins bon que la version utilisée par des milliers de développeurs. Cette skill est donc un réflexe d'économie : avant de construire une méthode maison, on vérifie si la communauté a déjà résolu le problème — et comment.

### Quand l'utiliser
Quand quelqu'un demande "comment faire X", "existe-t-il une skill pour X", ou exprime l'envie d'étendre les capacités de l'agent.

Le bon moment, c'est quand tu t'apprêtes à écrire des instructions détaillées à un agent ("voici comment tu dois structurer tes composants React...") : c'est exactement le signe qu'une skill publique existe probablement déjà pour ça. Mauvais moment : quand le besoin est ultra-spécifique à ton projet interne (aucune skill publique ne connaîtra tes tables et tes règles métier).

### Comment ça marche
1. **Comprendre le besoin** : domaine (React, tests, design...), tâche précise. "Améliorer les performances" est trop vague : de quoi (une liste ? un build ? une requête ?) et avec quelle stack ? Sans ce cadrage, la recherche renvoie du bruit.
2. **Vérifier d'abord le classement** des skills les plus utilisées (skills.sh) — les plus installées sont souvent les plus fiables. Un classement, c'est la sagesse de milliers d'utilisateurs : une skill en tête de liste a survécu à des milliers d'usages réels.
3. **Chercher** via la commande `npx skills find [mot-clé]`. Mots-clés en anglais, précis, 2-3 termes ("react performance", pas "comment rendre mon application plus rapide s'il vous plaît").
4. **Vérifier la qualité avant de recommander** : nombre d'installations (privilégier 1000+, se méfier de moins de 100), réputation de la source, nombre d'étoiles GitHub du dépôt d'origine. Ces 3 critères prennent 2 minutes et évitent d'installer une skill abandonnée ou malveillante.
5. **Présenter les options** avec nom, ce que ça fait, popularité, commande d'installation. Jamais une seule option imposée : on présente 2-3 choix avec leurs différences, la personne tranche.
6. **Installer si demandé** avec `npx skills add <owner/repo@skill>`. L'installation reste un acte explicite de l'utilisateur : on ne l'installe jamais "au passage" sans accord.

### Exemple concret
Quelqu'un demande "comment améliorer les performances de mon appli React ?" → recherche `npx skills find react performance` → trouve `react-best-practices` de Vercel avec 185K installations → propose la commande d'installation exacte.

### Exemple guidé, pas à pas
Besoin : "je veux de beaux écrans de chargement pour mon app" — reformulé en besoin cherchable : domaine (interface, React), tâche (squelettes de chargement / skeletons).
- **Recherche** : `npx skills find react loading skeleton` → 3 candidates : une à 40K installs (source : dépôt d'une équipe design connue), une à 800 installs (dépôt personnel, dernière mise à jour il y a 2 ans), une à 12K installs (spécialisée accessibilité).
- **Vérification** : la 2e est écartée (abandonnée), on présente la 1re (populaire, maintenue) et la 3e (moins populaire mais avec un angle accessibilité pertinent).
- **Présentation** : "Option A : [nom], 40K installs, [ce qu'elle fait], install : `npx skills add ...`. Option B : [nom], 12K installs, point fort accessibilité, install : `npx skills add ...`."
- **Installation** : seulement après le choix explicite de la personne.
- Résultat : une skill fiable installée en 10 minutes au lieu d'une méthode maison écrite en 3 heures.

### Pièges fréquents
- Recommander une skill juste parce qu'elle apparaît dans les résultats de recherche, sans vérifier sa popularité ni sa source.
- Ne jamais proposer d'alternative quand aucune skill n'existe (il faut alors proposer d'aider directement, ou de créer sa propre skill).
- Installer sans demander : même une excellente skill ne s'installe qu'avec l'accord explicite de la personne.
- Chercher avec des mots-clés vagues ou en français : les registres de skills sont en anglais, la recherche doit l'être aussi.
- Oublier de vérifier la date de dernière mise à jour : une skill populaire mais abandonnée depuis 3 ans peut enseigner des pratiques dépassées.

### Checklist de sortie
Besoin reformulé en domaine + tâche précise ; recherche avec 2-3 mots-clés anglais ; 3 critères vérifiés (installations, réputation, étoiles) ; 2-3 options présentées avec différences ; installation uniquement sur accord explicite ; alternative proposée si rien n'existe.

### À toi de pratiquer
Prends un besoin réel ("mieux tester mon API", "documenter mon projet") et fais la recherche complète sans rien installer : mots-clés utilisés, 3 résultats trouvés, vérification des 3 critères pour chacun, et ta recommandation finale en 3 lignes.

### Pour dire que tu maîtrises cette skill
Tu sais citer les 3 critères de vérification de qualité (installations, réputation, étoiles GitHub) avant de recommander une skill à quelqu'un.

---

## 13. `i-have-adhd`

### C'est quoi
Un style de sortie spécial qui reformate les réponses pour qu'elles soient exploitables par un cerveau avec TDAH : action immédiate en premier, étapes numérotées, pas de bavardage inutile.

Le TDAH rend difficile le tri entre "important maintenant" et "intéressant en général" : une réponse classique (contexte, explications, nuances, puis action à la fin) demande un effort de filtrage que le lecteur n'a pas toujours. Ce style inverse la pyramide : l'action d'abord (ce qu'il faut faire dans les 2 prochaines minutes), puis le minimum vital pour l'exécuter. Ce n'est pas du "contenu simplifié", c'est du contenu réordonné pour être actionnable immédiatement.

### Quand l'utiliser
Activé explicitement par la commande `/i-have-adhd`, reste actif jusqu'à ce qu'on dise "stop adhd mode". Ce n'est pas une skill qui se déclenche automatiquement.

C'est important : ce mode change le format de TOUTES les réponses suivantes, pas seulement la prochaine. On l'active en début de session de travail ("je dois avancer vite aujourd'hui"), pas au milieu d'une explication qu'on voudrait juste plus courte. Et on le désactive quand on veut à nouveau réfléchir posément ("stop adhd mode") — les deux commandes font partie de la skill.

### Comment ça marche — les règles clés
1. **L'action arrive en premier**, pas le contexte : "Lance `npm install X`" avant toute explication. Le lecteur qui n'a que 30 secondes repart avec l'essentiel ; celui qui a plus de temps lit la suite.
2. **Étapes numérotées** pour tout travail à plusieurs étapes, le moins de pas possible. Chaque étape = une action unique et vérifiable ("2. Ouvre `src/auth.ts` et ajoute la ligne 42"). Si une étape contient "et" deux fois, on la recoupe.
3. **Toujours finir par UNE action concrète** faisable en moins de 2 minutes. Pas deux, pas zéro : une. C'est elle qui crée l'élan pour la suite.
4. **Pas de digressions** : un deuxième sujet est proposé séparément, jamais mélangé. "Au fait, tant qu'on y est..." est interdit — on note le sujet annexe en une ligne à part, on n'en parle pas.
5. **Répéter l'état d'avancement à chaque message** ("étape 3 sur 5 faite"). La personne ne doit jamais se demander "où j'en suis ?" — la réponse est écrite à chaque fois.
6. **Estimations de temps précises** ("15 minutes", pas "un peu de travail"). Le flou temporel est anxiogène ; un chiffre, même approximatif, permet de décider ("j'ai 15 minutes, je fais cette étape").
7. **Rendre visibles les victoires** ("la connexion marche maintenant, teste avec..."). Chaque progrès est nommé explicitement : le cerveau a besoin de voir qu'il avance pour continuer.
8. **Ton neutre face aux erreurs** — jamais "oh non", juste la cause et la solution. Une erreur n'est pas un drame, c'est l'étape suivante déguisée : "ça n'a pas marché parce que X. Fais Y."
9. **Pas plus de 5 éléments** dans une liste affichée. Au-delà, on regroupe ou on coupe : une liste de 12 points ne sera jamais lue en entier.
10. **Pas de formule de politesse** ni en ouverture ni en fermeture. Pas de "j'espère que ça t'aide", pas de "n'hésite pas si tu as des questions" — chaque ligne doit servir l'action.

### Exemple concret
Au lieu de "Réfléchissons à ton flux d'authentification, qui a plusieurs composants...", la réponse commence directement par "Lance `npm install jsonwebtoken`, puis édite `src/auth.ts:42`."

### Exemple guidé, pas à pas
Demande : "mets en place la sauvegarde automatique de mon projet".
- **Mauvaise réponse (style classique)** : "La sauvegarde automatique est importante car les pertes de données coûtent cher. Il existe plusieurs approches : locales, cloud, incrémentales... Pour ton cas, je recommanderais... D'abord, il faut comprendre ta structure..." — 3 paragraphes avant la première action. Un lecteur pressé décroche au deuxième.
- **Bonne réponse (style skill)** : "1. Lance `npm install backup-cli` (2 minutes). 2. Ajoute cette ligne dans ton script de démarrage : `backup --daily ./data`. 3. Vérifie : relance et regarde le dossier `backups/`. État : étape 0 sur 3, on commence ?" — action en première ligne, 3 étapes numérotées, estimation, état d'avancement, et ça se termine par une micro-décision, pas par un exposé.
- La différence n'est pas le contenu (les deux mènent au même résultat), c'est l'ordre et le format : action d'abord, explications seulement si nécessaires, jamais de paragraphes d'introduction.

### Pièges fréquents
- Continuer à utiliser des formules de politesse ("j'espère que ça aide") qui sont explicitement interdites par cette skill.
- Vouloir tout faire en une fois plutôt que de couper en étapes numérotées courtes.
- Expliquer avant d'agir : dès qu'un paragraphe de contexte précède l'action, la règle n°1 est violée — on réécrit dans l'autre sens.
- Des étapes floues ("configure le truc") au lieu d'actions vérifiables ("ajoute la ligne X dans le fichier Y, puis lance Z pour vérifier").
- Oublier l'état d'avancement : sans "étape 2 sur 4", le lecteur doit reconstruire lui-même où il en est — c'est exactement l'effort qu'on voulait lui éviter.
- Garder le mode actif indéfiniment : c'est un mode de travail, pas une personnalité. On le coupe ("stop adhd mode") quand la phase d'exécution est finie.

### Checklist de sortie
Action en première ligne ; étapes numérotées, chacune vérifiable ; une seule action finale de moins de 2 minutes ; état d'avancement rappelé ; temps estimés en chiffres ; zéro formule de politesse ; listes de 5 éléments maximum ; ton neutre même en cas d'erreur.

### À toi de pratiquer
Prends la dernière réponse longue que tu as reçue (d'une IA ou d'un collègue) et reformate-la selon les 10 règles : action en premier, étapes numérotées, une action finale de 2 minutes, état d'avancement. Compte ce que tu as supprimé : c'est la mesure du bruit que tu viens d'éliminer.

### Pour dire que tu maîtrises cette skill
Tu sais reformuler n'importe quelle réponse standard en respectant les 10 règles ci-dessus, en particulier "l'action d'abord, l'explication après (si besoin)".

---

## Récapitulatif — Partie 1/3

| # | Skill | En une phrase |
|---|-------|----------------|
| 1 | orchestrator (loi) | Découpe, ordonne, vérifie, livre — le chef d'orchestre permanent |
| 2 | interview-me | Découvre ce que la personne veut vraiment, une question à la fois |
| 3 | idea-refine | Transforme une idée floue en concept net (diverger → converger → livrer) |
| 4 | spec-driven-development | Écrit la spec avant de coder, à portes de validation |
| 5 | planning-and-task-breakdown | Découpe un besoin en tâches ordonnées, verticalement |
| 6 | incremental-implementation | Livre le code par petites tranches toujours fonctionnelles |
| 7 | source-driven-development | Vérifie dans la doc officielle avant d'implémenter |
| 8 | doubt-driven-development | Fait challenger chaque décision à enjeu par un regard neuf |
| 9 | discernment-nudge | Invite à vérifier les faits après une réponse importante |
| 10 | context-engineering | Choisit soigneusement ce que l'agent doit "voir" |
| 11 | using-agent-skills | La méta-skill qui régit comment choisir les autres skills |
| 12 | find-skills | Aide à découvrir une skill existante avant de réinventer |
| 13 | i-have-adhd | Style de sortie orienté action immédiate et clarté |

**Suite (partie 2/3) :** les 14 skills du sous-dossier `obra-superpowers` (brainstorming, TDD, debugging systématique, revue de code, plans écrits, worktrees git...).
**Puis (partie 3/3) :** les 17 skills du sous-dossier `mattpocock-engineering` (triage, prototypage, migration, architecture, tickets...).
