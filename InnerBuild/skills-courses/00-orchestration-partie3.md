# Cours — Catégorie 00-orchestration (Partie 3/3)

**Domaine :** Orchestration — sous-dossier `mattpocock-engineering` (17 skills).
**Public visé :** quelqu'un qui ne connaît rien aux "agent skills" et veut comprendre, puis utiliser, chaque skill.

> Fil rouge de ce lot : contrairement à `obra-superpowers` (partie 2), cet ensemble est pensé comme un **système de flux nommés** (`/to-spec`, `/to-tickets`, `/wayfinder`...) qui se branchent les uns aux autres, avec `ask-matt` comme "GPS" qui indique quelle skill utiliser selon la situation. On commence justement par elle.

> Comment utiliser ce cours : pour chaque skill, lis d'abord **C'est quoi** et **Quand l'utiliser** pour reconnaître la situation, puis étudie le **Comment ça marche** étape par étape, suis l'**Exemple guidé** comme si tu le faisais toi-même, mémorise les **Pièges fréquents**, et termine par la **Checklist de sortie** et le mini-exercice **À toi de pratiquer**. C'est cet exercice qui transforme la lecture en compétence.

---

## 1. `ask-matt` (le routeur)

### C'est quoi
Un "plan de métro" des 17 skills : il explique quel chemin emprunter selon ta situation, pour ne pas avoir à mémoriser laquelle des 17 skills utiliser.

Face à 17 skills, même motivé, on est perdu : "j'ai un bug bizarre, je prends laquelle ? Une idée floue ? Un gros projet ?" Ce routeur répond à cette unique question. Il ne fait rien lui-même — il oriente. C'est la première skill à consulter quand on ne sait pas par où commencer, et celle qui évite l'erreur la plus fréquente : appliquer une excellente skill à la mauvaise situation.

### Quand l'utiliser
Dès que tu ne sais pas quelle skill correspond à ta situation.

Plus précisément : à chaque fois que tu hésites entre 2 skills, que tu t'apprêtes à en appliquer une "par défaut", ou qu'un travail change de nature en cours de route (une "petite fonctionnalité" qui se révèle être un énorme chantier flou doit changer de flux — et c'est le routeur qui le dit).

### Comment ça marche — le flux principal "idée → livraison"
1. **`grill-with-docs`** — un entretien serré qui affine l'idée, en laissant une trace écrite (glossaire, décisions) dans le dossier de travail. C'est toujours le point d'entrée d'une idée floue : on ne construit jamais sur du flou.
2. Si une question a besoin d'une réponse concrète (un état, une logique, une interface visuelle) → détour par **`prototype`**. Le prototype ne fait pas avancer la construction, il répond à une question qui bloque la suite ("est-ce que ce modèle d'état tient la route ?").
3. Si c'est un travail sur plusieurs sessions → **`to-spec`** (transformer la discussion en spec) puis **`to-tickets`** (découper en tickets), chaque ticket étant ensuite construit avec **`implement`** (qui utilise `tdd` en interne, puis termine par `code-review`). C'est la voie royale des chantiers sérieux : discussion → spec → tickets → implémentation testée et relue.
4. Si ce n'est pas un gros travail → **`implement`** directement, dans la même session. Pas de cérémonie inutile : un petit changement cadré va droit à l'implémentation disciplinée (TDD + revue + commit).

**Les "bretelles d'entrée" (on-ramps)** : `triage` (pour des bugs/demandes qui arrivent en vrac), `diagnosing-bugs` (pour un bug difficile), `wayfinder` (pour un effort flou et énorme, plus grand qu'une session). Ces trois-là ne font pas partie du flux principal : ce sont des portes d'entrée pour des situations particulières (vrac entrant, bug résistant, chantier immense) qui, une fois traitées, rejoignent le flux normal.

**Le "vocabulaire de fond"** : `domain-modeling` (le langage métier du projet) et `codebase-design` (le vocabulaire de conception des modules), utilisés par les autres skills en arrière-plan. On ne "lance" pas ces deux-là comme une étape : elles irriguent en permanence le travail des autres (les tickets utilisent les bons termes métier, l'implémentation respecte les bons seams).

### Exemple concret
Une idée floue arrive → `grill-with-docs` l'affine → elle est assez grosse pour plusieurs sessions → `to-spec` puis `to-tickets` → chaque ticket est construit avec `implement`.

### Exemple guidé, pas à pas
Situation : "les clients veulent suivre leurs commandes en temps réel".
- **Routage initial** : idée floue + gros chantier probable → entrée par `grill-with-docs` (pas directement `implement`, pas `wayfinder` car ce n'est pas "énorme et flou au point de dépasser toute session").
- **Après le grill** : le besoin se précise (page de suivi + notifications). Question ouverte : "le temps réel, c'est du polling toutes les 30s ou du WebSocket ?" → détour `prototype` pour tester les deux approches sur un cas réel avant de trancher.
- **Construction** : chantier multi-sessions → `to-spec` (la spec fige : polling 30s pour la v1) → `to-tickets` (tickets verticaux) → chaque ticket via `implement`.
- **En parallèle** : un bug remonté pendant le chantier ("le suivi affiche une commande d'un autre client !") → bretelle `diagnosing-bugs` (bug grave et difficile), pas le flux principal.
- Le routeur a été consulté 3 fois dans le même chantier — c'est normal : on re-route à chaque changement de nature du travail.

### Pièges fréquents
- Utiliser `wayfinder` pour une fonctionnalité bien cadrée (c'est réservé aux efforts vraiment énormes et flous).
- Passer par `triage` pour des tickets déjà produits par `to-tickets` (ils sont déjà "prêts pour agent", inutile de les re-trier).
- Sauter `grill-with-docs` parce que "l'idée est claire dans ma tête" : si elle n'est pas écrite et validée, elle n'est pas claire — elle est juste familière.
- Rester sur le premier routage quand la situation change : le routage se refait à chaque étape, pas une fois au début.
- Utiliser `implement` pour un chantier multi-sessions "pour aller vite" : on gagne une heure de cérémonie et on perd une semaine de direction.

### Checklist de sortie
Situation qualifiée (floue/cadrée, petite/énorme, bug/vrac) ; entrée choisie et justifiée en une phrase ; flux principal ou bretelle identifié ; re-routage prévu si la nature du travail change.

### À toi de pratiquer
Prends 3 situations réelles de ta semaine passée (une idée, un bug, une fonctionnalité) et route chacune : par quelle skill aurais-tu dû entrer ? Écris le chemin complet pour chacune. Compare avec ce que tu as réellement fait.

### Pour dire que tu maîtrises cette skill
Tu sais dessiner de mémoire le flux principal en 4 étapes (grill → prototype si besoin → spec/tickets → implement) et nommer les 3 bretelles d'entrée.

---

## 2. `grill-with-docs`

### C'est quoi
Un entretien impitoyable pour affiner un plan ou un design, qui produit en même temps de la documentation (décisions d'architecture, glossaire) au fur et à mesure.

La plupart des entretiens produisent de la clarté qui s'évapore : à la fin de la conversation, tout le monde a compris — et deux semaines plus tard, personne ne se souvient de ce qui a été décidé ni pourquoi. Cette skill résout les deux problèmes d'un coup : l'entretien est exigeant (questions serrées, pas de complaisance) ET chaque décision qui se cristallise est écrite immédiatement dans le dépôt (glossaire, ADR). La conversation produit du savoir durable, pas juste un moment de lucidité.

### Quand l'utiliser
Dès qu'on travaille dans un dossier de projet (contrairement à sa version "sans état" `grill-me`, utilisée hors d'un dossier de travail).

Concrètement : affiner une idée qui va être construite, challenger un plan existant, trancher entre des approches — dès lors qu'il y a un dépôt où écrire. Si la discussion est exploratoire et sans enjeu de construction ("je réfléchis à voix haute"), la version sans état suffit.

### Comment ça marche
Cette skill appelle en réalité deux autres skills combinées : l'entretien ("grilling") et la modélisation du domaine (`domain-modeling`) — les décisions se cristallisent au fil de la conversation et sont notées immédiatement, pas après coup.

Le rythme type d'une session : une question serrée → une réponse → une clarification ("donc 'compte' = Client, je le note") → écriture immédiate dans `CONTEXT.md` → question suivante qui s'appuie sur ce qui vient d'être noté. La documentation n'est pas une phase finale, elle est tissée dans l'entretien : à la fin, le dossier contient déjà le glossaire et les décisions, sans travail supplémentaire.

### Exemple concret
Pendant l'entretien, dès qu'un terme métier se précise ("un 'compte' c'est le Client ou l'Utilisateur ?"), la réponse est immédiatement écrite dans `CONTEXT.md`, plutôt que d'attendre la fin de la conversation.

### Exemple guidé, pas à pas
Sujet : "on va ajouter des rôles et permissions".
- **Question 1** : "Qui peut faire quoi, concrètement ? Donne-moi 3 actions et qui a le droit." Réponse floue → on insiste : "le support peut-il rembourser ? oui/non". Réponse : oui, jusqu'à 50€.
- **Écriture immédiate** : dans `CONTEXT.md`, entrée "Remboursement : le support peut rembourser jusqu'à 50€ sans validation".
- **Question 2** : "et au-delà de 50€ ?" Réponse : "le manager valide". → entrée notée + décision : "seuil de 50€, au-delà validation manager — ADR-12 : compromis entre autonomie du support et contrôle financier".
- **Question 3** (domain-modeling en arrière-plan) : "'utilisateur' et 'client', c'est la même chose ici ?" Réponse : non → glossaire mis à jour avec les deux définitions.
- Fin de session : le dossier contient le glossaire à jour + 1 ADR, sans qu'on ait eu à "rédiger la doc après". Si on avait attendu la fin, la moitié de ces décisions se seraient évaporées.

### Pièges fréquents
- Utiliser cette version dans un contexte sans dossier de travail (utiliser `grill-me` à la place dans ce cas).
- Reporter l'écriture "à la fin de l'entretien" : la fin n'arrive jamais proprement, et les décisions intermédiaires se perdent.
- Poser des questions complaisantes qui valident au lieu de challenger : un entretien qui ne fait que confirmer ne produit aucune décision nouvelle.
- Tout noter, y compris l'anecdotique : le glossaire reste pur (termes + décisions), pas un compte-rendu verbeux — sinon personne ne le relira.
- Mélanger les sujets : une session = un sujet. Quand un deuxième sujet émerge, on le note pour plus tard et on reste sur le premier.

### Checklist de sortie
Session tenue dans le dossier de travail ; chaque terme clarifié écrit immédiatement ; décisions avec compromis enregistrées en ADR ; glossaire resté pur (pas de spec déguisée) ; aucun report d'écriture "à plus tard".

### À toi de pratiquer
Lors de ta prochaine discussion technique (même informelle), note en direct chaque décision et chaque définition dans un fichier, au moment où elles se cristallisent. À la fin, compare avec ce dont tu te souviens sans notes : la différence mesure ce que cette skill préserve.

### Pour dire que tu maîtrises cette skill
Tu sais pourquoi cette skill est "avec état" (elle écrit dans le dépôt) alors que `grill-me` ne l'est pas.

---

## 3. `implement`

### C'est quoi
La skill qui réalise concrètement un travail décrit dans une spec ou des tickets.

C'est le "moteur d'exécution" du système : tout le reste (grill, spec, tickets, plans) existe pour que cette étape soit mécanique et sûre. Bien cadrée en amont, l'implémentation suit un rituel fixe — TDD, vérifications régulières, revue, commit — qui élimine les deux fléaux du codage : le code non testé ("ça devrait marcher") et le code non relu ("personne n'a regardé"). Mal cadrée en amont, aucun rituel ne sauve le travail : d'où l'exigence d'une spec ou de tickets existants avant de commencer.

### Quand l'utiliser
Une fois qu'une spec ou des tickets existent.

C'est une condition d'entrée, pas une suggestion : sans spec ni ticket, on retourne en arrière (`grill-with-docs`, `to-spec`, `to-tickets`) au lieu d'improviser. L'exception — les micro-changements triviaux — confirme la règle : si tu peux décrire le travail en une phrase sans ambiguïté, cette phrase EST le ticket.

### Comment ça marche
1. Utiliser `tdd` partout où c'est possible, sur les points d'ancrage ("seams") convenus à l'avance. Le TDD n'est pas optionnel ici : c'est le mécanisme qui garantit que chaque bout de logique est prouvé au moment où il naît.
2. Lancer la vérification de types régulièrement, les fichiers de test un par un régulièrement, et la suite complète de tests une fois à la fin. Trois niveaux de vérification, trois rythmes : types + tests du fichier en cours (toutes les quelques minutes), suite complète (une fois, à la fin). Lancer toute la suite à chaque modification, c'est perdre 10 minutes par heure pour une information partielle.
3. Une fois terminé, passer par `code-review` pour relire le travail. Même un travail testé mérite une relecture : les tests prouvent le comportement, la revue attrape ce que les tests ne voient pas (lisibilité, nommage, complexité inutile, écart avec la spec).
4. Committer le travail sur la branche courante. Un commit par unité logique, message explicite, sur la branche du chantier — jamais directement sur la branche principale.

### Exemple concret
Un ticket "ajouter la connexion par email" est implémenté : chaque petit bout de logique est écrit en TDD, la vérification de types tourne après chaque fichier modifié, puis `code-review` relit l'ensemble avant de committer.

### Exemple guidé, pas à pas
Ticket : "la page de profil affiche le nom et l'email de l'utilisateur connecté".
- **TDD** : test rouge "affiche le nom et l'email" (avec un utilisateur simulé) → vérification du rouge (échec car le composant n'existe pas, pas à cause d'une coquille) → implémentation minimale → vert → refactor des noms.
- **Vérifications régulières** : après chaque fichier modifié, vérification de types + tests du fichier. 30 secondes à chaque fois, zéro surprise à la fin.
- **Suite complète finale** : une fois, à la fin — 48/48 verts, y compris les tests des autres pages (non-régression).
- **Revue** : `code-review` relit sur les 2 axes — Standards (conventions OK) et Spec (le ticket demandait nom + email : les deux sont là, rien de plus).
- **Commit** : un commit, message explicite, sur la branche du chantier.
- Durée totale : 45 minutes, zéro aller-retour, zéro bug découvert après coup.

### Pièges fréquents
- Lancer la suite complète de tests à chaque petite modification (inutile et lent) au lieu de la garder pour la fin.
- Sauter l'étape `code-review` avant de committer.
- Coder sans ticket "parce que c'est petit" puis découvrir 2 heures plus tard que le "petit" cachait 3 exigences contradictoires.
- Écrire les tests après le code "pour aller plus vite" : on perd la preuve du rouge et on teste ce qu'on a codé au lieu de coder ce qui est demandé.
- Committer sur la mauvaise branche (principale au lieu du chantier) : 30 secondes d'inattention, 30 minutes de réparation.

### Checklist de sortie
Travail issu d'une spec ou d'un ticket existant ; TDD appliqué (rouge vérifié avant vert) ; types + tests courants vérifiés en continu ; suite complète verte à la fin ; revue effectuée ; commit propre sur la bonne branche.

### À toi de pratiquer
Prends ton prochain micro-changement et exécute le rituel complet à petite échelle : 1 test rouge vérifié, implémentation minimale, types + tests du fichier, revue personnelle (relis ton diff comme si c'était quelqu'un d'autre), commit. Chronomètre le surcoût réel du rituel — il est presque toujours inférieur au coût d'un seul bug évité.

### Pour dire que tu maîtrises cette skill
Tu sais citer l'ordre exact : TDD → vérifications régulières → suite complète finale → code-review → commit.

---

## 4. `research`

### C'est quoi
Déléguer une recherche à un "agent en arrière-plan" qui investigue une question en se basant sur des **sources primaires** (documentation officielle, code source, spécifications) et écrit ses trouvailles dans un fichier Markdown du dépôt.

Le problème résolu : la recherche documentaire est indispensable mais chronophage, et elle interrompt le flux de travail en cours ("je code, mais d'abord 2 heures de doc"). En la déléguant à un agent qui travaille en arrière-plan pendant qu'on avance sur autre chose, on récupère les deux : l'avancement ET l'information. Le fichier Markdown de sortie fait office de mémoire du projet : la recherche, une fois faite, profite à toute l'équipe, pas seulement à celui qui a posé la question.

### Quand l'utiliser
Quand une recherche documentaire ou une collecte de faits techniques doit être déléguée sans bloquer le travail en cours.

Cas typiques : comprendre une librairie avant de l'utiliser, comparer des approches, vérifier la faisabilité d'une intégration, constituer un état de l'art avant une décision d'architecture. Contre-indication : si la réponse tient en 2 minutes de lecture, faire la recherche soi-même coûte moins cher que de briefer un agent.

### Comment ça marche
1. Un agent en arrière-plan investigue en remontant **jusqu'à la source qui possède réellement l'information** (pas un article qui la résume). Hiérarchie des sources : spécification officielle > documentation officielle > code source > articles techniques réputés > blogs et forums. On s'arrête au niveau le plus élevé accessible.
2. Il écrit ses trouvailles dans un unique fichier Markdown, en citant la source de chaque affirmation. Chaque fait important porte sa référence : pas de "il paraît que", que du vérifiable. Le fichier suit un plan stable (question, réponse courte, détails, sources) pour être relu en 2 minutes.
3. Il sauvegarde ce fichier là où le dépôt range déjà ce type de notes (ou, à défaut, dans un endroit sensible en le signalant). Le rangement compte autant que le contenu : une recherche parfaite dans un fichier perdu n'existe pas.

### Exemple concret
Question : "comment fonctionne l'authentification OAuth de cette librairie ?" → l'agent lit la doc officielle de la librairie (pas un tutoriel tiers), et écrit un résumé cité dans `docs/research/oauth.md`.

### Exemple guidé, pas à pas
Question : "peut-on utiliser les WebSockets sur notre hébergeur actuel, et à quelles conditions ?"
- **Brief** : "Question : WebSockets sur [hébergeur] — limites, configuration requise, coûts éventuels. Sources primaires exigées (doc officielle de l'hébergeur). Sortie : `docs/research/websockets.md` avec réponse courte + détails + sources citées."
- **En arrière-plan** : l'agent lit la doc officielle (découvre : WebSockets supportés uniquement sur l'offre payante + timeout de 60s sans activité), vérifie dans les notes de version, ignore 3 blogs obsolètes qui affirmaient le contraire.
- **Fichier produit** : réponse en 3 lignes ("oui sur offre payante, timeout 60s, option de ping applicatif requise"), détails avec citations, liens vers les sections exactes de la doc.
- **Pendant ce temps** : toi, tu as avancé sur l'implémentation du prototype — à ton retour, la décision est documentée et sourcée, prête à être utilisée (et réutilisable par toute l'équipe dans 6 mois).
- Sans délégation, la même recherche aurait coûté 2 heures d'interruption — ou aurait été bâclée ("un blog dit que oui").

### Pièges fréquents
- Se contenter d'une source secondaire (un blog qui résume la doc) au lieu de remonter à la source primaire elle-même.
- Briefer vaguement ("renseigne-toi sur les WebSockets") : un brief flou produit un rapport flou — la question, les sources exigées et le format de sortie font partie du brief.
- Ne pas préciser où ranger le fichier : il atterrit à un endroit aléatoire et ne sera jamais retrouvé.
- Utiliser le rapport sans vérifier les citations sur les points critiques : le rapport est une base de travail sourcée, pas une vérité révélée — les chiffres qui engagent (coûts, limites) se re-vérifient.
- Déléguer des micro-recherches de 2 minutes : le brief coûte plus cher que la recherche elle-même.

### Checklist de sortie
Question précise briefée avec sources exigées et format de sortie ; sources primaires atteintes (niveau noté) ; chaque fait important cité ; fichier unique rangé au bon endroit ; points critiques re-vérifiés avant usage engageant.

### À toi de pratiquer
Prends une question technique qui te trotte en tête et rédige le brief complet comme si tu allais la déléguer : question en une phrase, niveau de source exigé, plan du fichier de sortie, emplacement. Même si tu fais la recherche toi-même, ce brief la rendra 2 fois plus rapide.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer la différence entre une source primaire et une source secondaire, et pourquoi cette skill exige la première.

---

## 5. `resolving-merge-conflicts`

### C'est quoi
Résoudre un conflit de fusion (merge) ou de rebase Git en cours, en comprenant **l'intention** derrière chaque changement plutôt qu'en choisissant des lignes au hasard.

Un conflit Git, ce n'est pas un problème technique, c'est une question à laquelle deux personnes (ou deux moments) ont apporté deux réponses différentes. "Choisir au hasard" ou "prendre la version la plus récente", c'est répondre à la question sans l'avoir comprise. Cette skill impose de remonter aux intentions (pourquoi chaque côté a changé ces lignes) avant de trancher — et de noter le compromis quand les deux intentions doivent coexister.

### Quand l'utiliser
Face à un conflit de fusion/rebase git en cours.

C'est-à-dire : uniquement quand le conflit existe déjà et bloque. Ce n'est pas une skill de prévention (pour éviter les conflits : petites branches, fusions fréquentes, communication) — c'est une skill de résolution, à froid et avec méthode, quand la prévention a échoué.

### Comment ça marche
1. Observer l'état actuel (historique git, fichiers en conflit). Avant tout : comprendre la situation (quelles branches, depuis quand elles divergent, combien de fichiers en conflit). Un conflit sur 1 fichier et un conflit sur 40 fichiers ne se traitent pas pareil.
2. Retrouver les sources primaires de chaque changement en conflit : messages de commit, PR, tickets d'origine, pour comprendre pourquoi chaque modification a été faite. Le message de commit est la première source : "corrige l'arrondi pour la devise X (ticket #123)" explique l'intention mieux que 50 lignes de diff.
3. Résoudre chaque portion de conflit en préservant les deux intentions quand c'est possible ; sinon, choisir celle qui correspond à l'objectif de la fusion, et **noter le compromis fait**. Ne jamais inventer un comportement nouveau. Toujours résoudre, **jamais abandonner** (`--abort`). Abandonner, c'est reporter le problème en le rendant pire (les branches continueront à diverger) ; inventer un troisième comportement "pour mettre tout le monde d'accord", c'est créer un bug que personne n'a demandé.
4. Lancer les vérifications automatisées du projet (vérification de types, tests, formatage) et corriger ce que la fusion a cassé. Une fusion qui compile n'est pas une fusion qui marche : les tests sont la vraie preuve que les deux intentions coexistent correctement.
5. Terminer la fusion/rebase et committer. Le message de commit de fusion décrit le compromis s'il y en a un ("fusion : conserve la remise de la branche A et l'arrondi corrigé de la branche B").

### Exemple concret
Deux branches modifient la même fonction de calcul de prix pour des raisons différentes (l'une ajoute une remise, l'autre corrige un arrondi) → on lit les deux commits d'origine, et on préserve les deux comportements dans la résolution plutôt que de n'en garder qu'un au hasard.

### Exemple guidé, pas à pas
Conflit sur `calculateTotal()` entre `feat/discount` ("ajoute 10% au-delà de 100€") et `fix/rounding` ("corrige l'arrondi à 2 décimales pour la devise X").
- **État** : 1 seul fichier en conflit, 2 portions. Branches divergentes depuis 3 jours.
- **Intentions** : commit A — "ajoute remise fidélité (ticket #45)" ; commit B — "corrige arrondi devise X qui facturait 1 centime de trop (ticket #51, bug client réel)".
- **Résolution** : les deux intentions sont compatibles — on garde la remise ET l'arrondi corrigé, en vérifiant l'ordre (remise d'abord, arrondi ensuite, comme le ticket #51 l'exige pour la devise X). Compromis noté dans le message de fusion.
- **Vérifications** : types OK, tests OK — y compris un test qui vérifie remise + arrondi combinés (écrit pour l'occasion : c'est exactement le genre de combinaison que personne n'avait testée).
- **Commit** de fusion avec description du compromis.
- Ce qu'on n'a PAS fait : choisir "la version la plus récente" (aurait perdu la remise), ni `--abort` (aurait reporté le problème), ni inventer un nouveau mode de calcul "moyen".

### Pièges fréquents
- Résoudre un conflit en choisissant une version "au pif" sans comprendre pourquoi chaque changement existait.
- Abandonner la fusion (`--abort`) au lieu de la résoudre.
- Résoudre sans lancer les tests après : "ça compile" n'est pas "ça marche".
- Oublier de noter le compromis : dans 3 mois, personne ne comprendra pourquoi le code contient ces deux comportements mélangés.
- Régler un conflit à 40 fichiers d'un coup sans pause : on découpe (par fichier ou par thème), on vérifie entre les groupes, sinon la fatigue fait choisir au hasard à partir du 10e fichier.

### Checklist de sortie
État des lieux fait (branches, ampleur) ; intentions des deux côtés comprises via les sources (commits, tickets) ; chaque portion résolue en préservant les intentions ; compromis notés ; tests + types verts après fusion ; commit de fusion descriptif ; aucun `--abort`.

### À toi de pratiquer
Repère dans ton historique git récent une fusion (même automatique et sans conflit) et retrouve, pour un fichier fusionné, les intentions des deux côtés via les messages de commit. Cet exercice de lecture des intentions est exactement le muscle utilisé en cas de vrai conflit.

### Pour dire que tu maîtrises cette skill
Tu sais pourquoi il faut toujours consulter les messages de commit d'origine avant de choisir une résolution, et pourquoi `--abort` n'est jamais la réponse ici.

---

## 6. `domain-modeling`

### C'est quoi
La discipline active de construire et affiner le vocabulaire métier d'un projet : contester des termes flous, imaginer des cas limites, écrire le glossaire (`CONTEXT.md`) et les décisions d'architecture (ADR) au moment même où elles se précisent.

La plupart des bugs "métier" ne viennent pas du code, ils viennent des mots : deux personnes utilisent le même mot pour deux réalités différentes ("client" = celui qui paie ? celui qui utilise ?), et le code, fidèle à cette confusion, fait n'importe quoi aux cas limites. Cette skill fait du vocabulaire un objet de travail explicite : on le conteste, on le teste sur des cas concrets, on l'écrit — et le code qui suit est mécaniquement plus juste, parce qu'il parle une langue claire.

### Quand l'utiliser
En discutant du vocabulaire du code, en rédigeant/éditant `CONTEXT.md`, ou en enregistrant une décision d'architecture (ADR).

Déclencheurs typiques : quelqu'un dit "ça dépend ce que tu entends par X", deux modules utilisent le même mot pour des choses différentes, un cas limite fait débat ("et si l'utilisateur a deux comptes ?"), ou une décision d'architecture vient d'être prise oralement et risque de s'évaporer.

### Comment ça marche
- **Contester face au glossaire existant** : si un terme utilisé contredit `CONTEXT.md`, le signaler immédiatement. Le glossaire est la loi : soit on s'y conforme, soit on le met à jour explicitement — jamais on ne le contredit en silence.
- **Affiner un langage flou** : proposer un terme précis quand un mot est ambigu ("compte" désigne-t-il le Client ou l'Utilisateur ?). La question magique : "donne-moi un exemple où ces deux sens donneraient deux comportements différents" — s'il existe, les deux sens doivent avoir deux noms.
- **Discuter de scénarios concrets** pour stress-tester une relation entre concepts métier. Les définitions abstraites résistent à tout ; les exemples concrets révèlent les failles ("OK pour 'annulation totale', mais que se passe-t-il pour 'annulation partielle d'une commande déjà partiellement livrée' ?").
- **Recouper avec le code** : si le code contredit ce qui vient d'être dit, le signaler. Le code est souvent en retard sur le vocabulaire (ou l'inverse) : cet écart est une information, pas un détail.
- **Mettre à jour `CONTEXT.md` immédiatement**, sans attendre — ce fichier reste un glossaire pur, jamais une spec ni des détails d'implémentation. Glossaire = termes + définitions + exemples limites. Dès qu'on y met des instructions ("il faut..."), il devient illisible comme référence.
- **Proposer une ADR avec parcimonie** : seulement quand la décision est difficile à revenir en arrière, surprenante sans contexte, ET issue d'un vrai compromis entre alternatives réelles. Les trois conditions sont cumulatives : une décision facile à changer ne mérite pas d'ADR, même si elle est surprenante.

### Exemple concret
Quelqu'un dit "l'utilisateur peut annuler sa commande partiellement", mais `CONTEXT.md` définit "annulation" comme totale → on signale immédiatement la contradiction avant de continuer.

### Exemple guidé, pas à pas
Discussion : "on ajoute un système de parrainage".
- **Flou détecté** : "le parrain gagne des points" — points de quoi ? Convertibles en quoi ? Expirent-ils ? Le mot "points" cache 4 décisions.
- **Scénarios concrets** : "le filleul s'inscrit mais ne commande jamais — le parrain gagne quand même ?" (réponse : non, points attribués à la première commande) ; "le filleul annule sa commande — on retire les points ?" (réponse : oui, d'où la règle "points en attente pendant 14 jours").
- **Glossaire mis à jour** : entrées "Parrain", "Filleul", "Point de parrainage" (avec statut "en attente" vs "acquis"), écrites immédiatement.
- **ADR proposée ?** Test des 3 conditions : difficile à revenir en arrière (oui, une fois des points distribués), surprenante sans contexte (oui, "en attente 14 jours" surprendra), vrai compromis (oui : simplicité immédiate vs justice en cas d'annulation) → ADR rédigée.
- **Recoupement code** : le code existant a déjà un champ `referral_code` inutilisé — signalé (soit on l'utilise, soit on le supprime, mais on ne l'ignore pas).
- Sans ce travail, on aurait codé "des points" et découvert les 4 décisions cachées en production, une par une, sous forme de bugs.

### Pièges fréquents
- Utiliser `CONTEXT.md` comme un bloc-notes ou une spec au lieu d'un glossaire pur.
- Créer une ADR pour chaque petite décision plutôt que de réserver ça aux décisions difficiles à revenir en arrière.
- Définir les termes en abstrait sans exemples limites : une définition sans exemple est une opinion déguisée.
- Laisser le glossaire se périmer : un glossaire qui contredit le code est pire que pas de glossaire — on le met à jour à chaque changement de vocabulaire, ou on le supprime.
- Trancher seul le vocabulaire ("j'ai décidé que 'client' veut dire X") : le langage métier se construit à plusieurs, sinon personne d'autre ne le parlera.

### Checklist de sortie
Termes ambigus détectés et tranchés avec exemples limites ; contradictions avec le glossaire signalées (conformation ou mise à jour explicite) ; `CONTEXT.md` mis à jour immédiatement et resté pur ; ADR proposée uniquement si les 3 conditions sont réunies ; écarts avec le code signalés.

### À toi de pratiquer
Ouvre le glossaire (ou la documentation) de ton projet et choisis le terme le plus utilisé. Écris sa définition en une phrase + un exemple limite qui la met à l'épreuve. Si tu n'arrives pas à formuler l'exemple limite, le terme est flou — et tu viens de trouver du travail de modélisation à faire.

### Pour dire que tu maîtrises cette skill
Tu sais citer les 3 conditions qui doivent être **toutes réunies** avant de proposer une ADR.

---

## 7. `prototype`

### C'est quoi
Construire un prototype jetable pour répondre à une question de design précise — jamais pour livrer du code final.

Le prototype est un instrument de mesure, pas une première version du produit : on le construit pour obtenir une réponse ("est-ce que ce modèle tient la route ? à quoi ça ressemblerait ?"), et une fois la réponse obtenue, sa mission est terminée. Cette distinction change tout : pas de tests, pas de persistance, pas de gestion d'erreur complète — tout ce qui ne sert pas la question est du gaspillage. Et surtout : le prototype ne devient jamais le produit, même s'il "marche bien".

### Quand l'utiliser
Pour vérifier si un modèle d'état/une logique "sonne juste", ou explorer à quoi devrait ressembler une interface.

Deux questions types, deux branches (voir ci-dessous). Si ta question n'est ni "est-ce que cette logique tient ?" ni "à quoi ça ressemblerait ?", ce n'est probablement pas un prototype qu'il te faut — c'est un spike (faisabilité), une spec, ou directement de l'implémentation.

### Comment ça marche — deux branches selon la question
- **"Cette logique/ce modèle d'état sonne-t-il juste ?"** → un fichier HTML unique et partageable, avec des boutons de test libre et des parcours guidés, utilisable par une personne non technique. L'objectif : faire manipuler la logique par quelqu'un d'autre (client, collègue non-dev) et observer où il se perd — ses hésitations sont des bugs de design détectés avant tout code.
- **"À quoi cela devrait-il ressembler ?"** → générer plusieurs variantes d'interface radicalement différentes sur une seule route, avec un sélecteur. Pas 3 nuances du même design : 3 directions vraiment différentes (dense vs aérée, guidée vs libre, classique vs audacieuse). Le contraste force un vrai choix au lieu d'un chipotage sur les détails.

**Règles communes** : jetable dès le départ et clairement identifié comme tel ; trivial à lancer (une seule commande) ; pas de persistance de données par défaut ; pas de tests ni de gestion d'erreur au-delà du strict nécessaire ; afficher l'état complet après chaque action ; une fois la décision validée, l'intégrer dans le vrai code, puis garder le prototype comme **source primaire** sur une branche à part (jamais fusionnée dans la branche principale).

### Exemple concret
Question "est-ce que cette machine à états de panier d'achat tient la route ?" → un fichier HTML avec des boutons "ajouter", "retirer", "valider" et l'état affiché en direct, qu'une personne non-développeuse peut manipuler pour donner son avis.

### Exemple guidé, pas à pas
Question : "faut-il un assistant en 3 étapes ou un formulaire unique pour l'inscription ?"
- **Branche** : question d'interface → 3 variantes radicales sur une route `/proto-signup` avec sélecteur : A) formulaire unique long, B) assistant 3 étapes avec barre de progression, C) inscription progressive (email d'abord, le reste après).
- **Test** : 3 personnes non techniques manipulent chaque variante ; on observe (pas seulement on écoute) : où hésitent-elles ? où abandonnent-elles ? La variante B gagne nettement (zéro abandon contre 2 sur A).
- **Décision validée** : on construit B dans le vrai code, en TDD, proprement — on ne "récupère" pas le code du prototype.
- **Source primaire** : le prototype reste sur sa branche à part comme référence de ce qui a été validé ("voici exactement ce que les utilisateurs ont manipulé et approuvé").
- Coût total : une demi-journée. Sans prototype, on aurait débattu une semaine en réunion avant de coder la mauvaise variante.

### Pièges fréquents
- Ajouter de la persistance de données "pour faire plus réaliste" alors que la persistance est justement ce qu'on ne veut pas encore tester.
- Fusionner le code du prototype directement dans la branche principale au lieu de le garder à part comme référence.
- Soigner le prototype (design system, tests, accessibilité) : chaque heure passée à polir du jetable est une heure volée — le prototype doit avoir l'air jetable pour qu'on accepte de le jeter.
- Ne tester qu'auprès de développeurs : un dev devine la logique même quand elle est mauvaise — c'est le non-technicien qui révèle les vrais problèmes.
- Oublier d'afficher l'état complet après chaque action : sans état visible, les testeurs ne peuvent pas dire "là, ce n'est pas ce que j'attendais".

### Checklist de sortie
Question précise formulée avant de construire ; bonne branche choisie (logique vs interface) ; lançable en une commande par un non-technicien ; état complet visible après chaque action ; décision prise à partir d'observations ; vrai code reconstruit proprement (rien récupéré) ; prototype conservé à part comme référence.

### À toi de pratiquer
Prends une question de design que tu te poses en ce moment (même petite : "faut-il confirmer avant de supprimer ?") et formule-la comme question de prototype en une phrase, avec la variante A et la variante B à tester. Le simple fait de formuler les 2 variantes clarifie déjà la décision.

### Pour dire que tu maîtrises cette skill
Tu sais choisir la bonne branche (logique vs interface) selon la question posée, et tu sais où le prototype validé doit finir (branche à part, jamais `main`).

---

## 8. `tdd` (version mattpocock)

### C'est quoi
Une référence complète sur le développement piloté par les tests : ce qu'est un bon test, où les tests doivent se situer, les anti-patterns à éviter.

Là où la version `obra-superpowers` (partie 2) enseigne le cycle Rouge-Vert-Refactor comme discipline, cette version enseigne la qualité des tests eux-mêmes : un mauvais test (couplé à l'implémentation, tautologique, mal placé) donne une fausse sécurité pire que pas de test — parce qu'on croit être protégé. Cette skill est donc le complément indispensable : le cycle dit "quand écrire les tests", celle-ci dit "comment écrire des tests qui prouvent vraiment quelque chose".

### Quand l'utiliser
Pour construire une fonctionnalité ou corriger un bug "test d'abord".

Plus précisément : dès qu'on écrit un test (en TDD ou non), on applique cette grille de qualité. Et avant une session de tests, on convient des seams avec l'utilisateur — cette conversation préalable fait partie du travail, pas une formalité.

### Comment ça marche — concepts clés
- **Un bon test vérifie un comportement via une interface publique**, jamais un détail d'implémentation — le code peut changer entièrement, les tests non. Si un refactor légitime (renommer une fonction privée, réorganiser le code) casse tes tests, tes tests testaient l'implémentation, pas le comportement — et ils devront être réécrits à chaque refactor, jusqu'à ce qu'on arrête de refactorer (puis d'écrire des tests).
- **Les "seams" (points d'ancrage)** : la frontière publique où l'on teste. **Les seams doivent être convenus avec l'utilisateur avant d'écrire le moindre test** — on ne peut pas tout tester, donc autant que l'effort de test porte sur les chemins critiques. Cette conversation ("qu'est-ce qui doit absolument continuer à marcher ?") est souvent plus précieuse que les tests eux-mêmes : elle révèle ce que le projet considère comme critique.
- **Trois anti-patterns** : tests couplés à l'implémentation (cassent au moindre refactoring alors que le comportement n'a pas changé), tests tautologiques (l'assertion recalcule la même chose que le code, donc ne peut jamais échouer), découpage "horizontal" (écrire tous les tests puis toute l'implémentation — préférer des tranches verticales, un test puis une implémentation, en boucle).
- **Règles de la boucle** : rouge avant vert, une tranche à la fois, le refactoring n'appartient pas à la boucle rouge-vert (il vient après, en revue). Le refactoring pendant le vert ("je rends le code propre en même temps") mélange deux activités : faire passer le test, puis rendre le code propre — chacune avec ses propres vérifications.

### Exemple concret
Un test tautologique à éviter : `expect(add(a, b)).toBe(a + b)` — il recalcule la même formule que le code testé, donc il ne peut jamais détecter une erreur. Un bon test compare contre une valeur connue indépendamment : `expect(add(2, 3)).toBe(5)`.

### Exemple guidé, pas à pas
Fonctionnalité : calcul de frais de port ("gratuit au-delà de 50€, sinon 4,90€").
- **Seams convenus** : `calculateShipping(cartTotal)` — l'utilisateur confirme que c'est bien ce comportement critique (pas les détails d'affichage).
- **Test 1 (comportement)** : `expect(calculateShipping(60)).toBe(0)` — valeur indépendante, pas de recalcul. Rouge vérifié (fonction inexistante), vert minimal, refactor des noms.
- **Test 2 (borne)** : `expect(calculateShipping(50)).toBe(4.90)` — le cas limite "au-delà de" vs "à partir de", toujours testé.
- **Ce qu'on n'a PAS écrit** : un test qui vérifie que la fonction appelle un helper interne (couplage implémentation — casserait au premier refactor), ni un test qui recalcule `total > 50 ? 0 : 4.9` dans l'assertion (tautologie).
- **Tranche verticale** : ces 2 tests + leur implémentation forment une tranche complète avant de passer au sujet suivant (ex : remises cumulées).
- 6 mois plus tard, quelqu'un refactorise le module : les tests restent verts parce qu'ils testent le comportement — c'est exactement le contrat promis.

### Pièges fréquents
- Écrire un test qui vérifie un mock plutôt que le vrai comportement.
- Se lancer dans l'écriture de tests sans avoir convenu au préalable des "seams" à tester avec l'utilisateur.
- Tester les détails privés "parce que c'est plus facile" : la facilité d'écriture n'est pas un critère — un test facile et inutile reste inutile.
- Multiplier les tests sur les cas faciles et négliger les bornes et les cas d'erreur : la couverture en pourcentage ment, la couverture des cas critiques compte.
- Garder des tests qui échouent "parfois" (flaky) sans les réparer : un test non fiable apprend à l'équipe à ignorer les échecs — y compris les vrais.

### Checklist de sortie
Seams convenus avant tout test ; chaque test vérifie un comportement public avec valeur indépendante ; bornes et erreurs couvertes ; tranches verticales (un test + son implémentation à la fois) ; refactor hors boucle et sous tests verts ; zéro test couplé à l'implémentation.

### À toi de pratiquer
Ouvre ta suite de tests actuelle et choisis-en 3 au hasard : pour chacun, demande-toi "si je refactorise l'implémentation sans changer le comportement, ce test casse-t-il ?" et "ce test peut-il échouer pour une vraie régression ?" Tout "oui" à la première ou "non" à la seconde = un test à réécrire.

### Pour dire que tu maîtrises cette skill
Tu sais repérer un test tautologique dans un exemple donné, et expliquer pourquoi il ne prouve rien.

---

## 9. `to-spec`

### C'est quoi
Transformer la conversation en cours en une spec, publiée directement sur le gestionnaire de tickets du projet — **sans nouvel entretien**, juste une synthèse de ce qui a déjà été discuté.

Après un grill ou une longue discussion, tout le savoir est dispersé dans l'historique : décisions, contraintes, exemples, rejets. Sans synthèse, ce savoir s'évapore dès que la conversation se ferme — et le travail suivant repart de zéro ("on avait dit quoi déjà sur les remboursements ?"). Cette skill est la machine à condenser : elle transforme une conversation mûre en document structuré et publié, sans reposer les questions déjà tranchées. C'est le pont entre "on a discuté" et "on peut construire".

### Quand l'utiliser
Quand une discussion a suffisamment mûri pour être formalisée en spec.

Signes de maturité : les mêmes questions ne reviennent plus, les décisions tiennent sans être re-débattues, on peut résumer le besoin en quelques phrases sans hésiter. À l'inverse, si chaque résumé soulève de nouvelles questions fondamentales, la discussion n'est pas mûre — on retourne griller, pas synthétiser.

### Comment ça marche
1. Explorer le dépôt pour comprendre l'état actuel du code (si pas déjà fait), en utilisant le vocabulaire du glossaire du projet. La spec doit s'inscrire dans le réel (ce qui existe) et parler la langue du projet (les termes du glossaire) — sinon elle décrit un fantasme dans un dialecte étranger.
2. Esquisser les "seams" (points d'ancrage) où la fonctionnalité sera testée, en préférant les seams existants, et en visant le moins de seams possible (idéalement un seul) — puis vérifier avec l'utilisateur que ça correspond à ses attentes. Moins de seams = moins de surface à tester = livraison plus sûre. Et on vérifie avec l'utilisateur parce que le choix des seams engage la stratégie de tests de tout le chantier.
3. Rédiger la spec avec un modèle précis : énoncé du problème, solution, une liste **très étendue** d'histoires utilisateur ("En tant que X, je veux Y, afin de Z"), décisions d'implémentation (sans chemins de fichiers précis, qui deviennent vite obsolètes), décisions de test, hors-périmètre, notes complémentaires. Puis publier avec le label "prêt-pour-agent". La liste d'histoires utilisateur est volontairement extensive : c'est elle qui servira de matière première à `to-tickets` — mieux vaut trop de matière que pas assez.
4. Le label "prêt-pour-agent" n'est pas décoratif : il signifie que la spec a passé sa propre checklist (problème clair, histoires complètes, hors-périmètre explicite, seams validés) et qu'un agent peut la prendre telle quelle.

### Exemple concret
Une conversation sur "ajouter un système de favoris" est synthétisée en spec avec 8 histoires utilisateur détaillées, une liste de ce qui est explicitement hors-périmètre (pas de partage de favoris entre utilisateurs dans cette version), publiée sur le tracker de tickets.

### Exemple guidé, pas à pas
Conversation de 45 minutes sur "notifications de rappel de rendez-vous" (grill déjà fait, décisions prises).
- **Exploration** : le dépôt a déjà un module d'emails transactionnels + un glossaire avec "Rendez-vous", "Rappel", "Patient". La spec parlera cette langue et réutilisera ce module.
- **Seams** : existant — la fonction d'envoi d'emails (un seul seam, déjà testé). Vérifié avec l'utilisateur : "on teste via l'envoi réel en environnement de test, ça te va ?" → oui.
- **Rédaction** : problème ("20% des rendez-vous sont manqués"), solution (rappel J-1 par email), 10 histoires utilisateur ("En tant que patient, je veux recevoir un rappel la veille afin de ne pas oublier", "En tant que secrétaire, je veux voir qui a été notifié afin de relancer les autres"...), décisions (J-1 uniquement, pas de SMS en v1), tests (un rappel envoyé = un email reçu en test), hors-périmètre (SMS, rappels J-7, annulation depuis l'email), notes (le module existant gère déjà les modèles).
- **Publication** : label "prêt-pour-agent" — `to-tickets` peut prendre le relais immédiatement, sans question.
- Sans cette synthèse, les 45 minutes de discussion auraient produit... 45 minutes de souvenirs flous, et le chantier aurait redémarré par "on avait dit quoi déjà ?"

### Pièges fréquents
- Ré-interviewer l'utilisateur au lieu de simplement synthétiser ce qui a déjà été dit.
- Inclure des chemins de fichiers précis dans la spec (ils deviennent obsolètes très vite).
- Synthétiser une discussion pas mûre : si la synthèse révèle des trous béants, c'est le signal de retourner griller — pas de boucher les trous en devinant.
- Écrire des histoires utilisateur vagues ("En tant qu'utilisateur, je veux que ça marche") : chaque histoire doit décrire un besoin précis avec sa raison ("afin de..."), sinon elle ne servira à rien au découpage.
- Oublier le hors-périmètre : sans lui, chaque lecteur de la spec imaginera un périmètre différent — et rallongera le chantier en silence.
- Publier sans le label (ou avec alors que la checklist n'est pas passée) : le label est un contrat de qualité, pas une décoration.

### Checklist de sortie
Discussion mûre (plus de questions fondamentales ouvertes) ; vocabulaire du glossaire utilisé ; seams esquissés et validés (idéalement un seul) ; modèle complet (problème, solution, histoires extensives, décisions, tests, hors-périmètre, notes) ; label "prêt-pour-agent" mérité par checklist ; aucun chemin de fichier périssable ; aucune re-interview déguisée.

### À toi de pratiquer
Reprends ta dernière longue discussion technique (messages, réunion, notes en vrac) et synthétise-la en mini-spec : problème (2 lignes), 5 histoires utilisateur au format complet, 3 points hors-périmètre. Mesure le temps — et imagine ce que cette synthèse aurait changé si elle avait existé dès le lendemain de la discussion.

### Pour dire que tu maîtrises cette skill
Tu sais pourquoi cette skill interdit explicitement les chemins de fichiers et le code dans la spec (sauf extrait issu d'un prototype qui encode une vraie décision).

---

## 10. `wizard`

### C'est quoi
Générer un script bash interactif qui guide un humain, étape par étape, à travers une procédure manuelle fastidieuse (que seul un humain peut faire) — comme configurer des identifiants ou naviguer un tableau de bord tiers.

Certaines procédures exigent un humain : cliquer dans un tableau de bord tiers, copier une clé secrète affichée une seule fois, valider un code reçu par SMS. Sans script, ces procédures se transmettent par des pavés de texte que personne ne suit correctement ("va sur la page... euh, laquelle déjà ? clique où ?"). Avec un script wizard, l'humain est pris par la main : le script ouvre les bonnes pages, demande les valeurs une par une (en masquant les secrets), vérifie chaque étape avant de passer à la suivante — et la procédure réussit du premier coup, même par quelqu'un qui ne l'a jamais faite.

### Quand l'utiliser
Pour du provisionnement d'infrastructure, la configuration de secrets CI, la navigation d'un tableau de bord tiers inconnu, ou une migration ponctuelle. **Pas** pour des étapes que l'agent peut réaliser lui-même.

Le test est simple : "est-ce qu'un humain DOIT intervenir (clic, secret, validation externe) ?" Si oui → wizard. Si l'agent peut tout faire seul → pas de wizard, l'agent fait le travail directement. Un wizard pour automatiser ce qui est déjà automatisable, c'est de la complexité gratuite.

### Comment ça marche
1. **Cadrer la procédure** : identifier chaque étape manuelle et chaque valeur à capturer, en lisant d'abord le dépôt (fichiers `.env`, workflows CI...) plutôt que de deviner. Confirmer la liste d'étapes avec l'utilisateur. Le cadrage se fait en lisant la configuration existante : quels secrets manquent ? quels workflows les attendent ? On ne devine jamais une procédure, on la reconstitue depuis les traces (workflows, docs, `.env.example`).
2. **Cartographier le parcours exact de chaque étape** : quelle URL ouvrir, quoi faire dessus, où trouver la valeur — sans jamais inventer une étape dont on n'est pas sûr. Chaque étape du script correspond à une action vérifiée : si on n'est pas sûr de l'URL exacte ou de l'intitulé exact d'un bouton, on vérifie avant d'écrire — un script qui envoie l'utilisateur au mauvais endroit est pire que pas de script.
3. **Rédiger le script** à partir d'un template déjà éprouvé (progression par étapes, portes de confirmation, ouverture d'URL multi-plateforme, saisie cachée pour les secrets). Le template apporte la robustesse (reprise après interruption, confirmations, gestion d'erreurs basiques) ; le contenu apporte la procédure. On ne réinvente jamais la mécanique, seulement le parcours.
4. **Vérifier statiquement** (syntaxe, `shellcheck`) sans l'exécuter soi-même (il ouvre des navigateurs et attend une saisie humaine), puis remettre la main à l'utilisateur. La vérification statique attrape les fautes de frappe et les erreurs de syntaxe ; l'exécution réelle appartient à l'humain, avec le script comme guide.

### Exemple concret
Configurer les clés API d'un service de paiement tiers : le script ouvre automatiquement la bonne page du tableau de bord, dit exactement où cliquer, capture la clé saisie et l'écrit directement dans `.env`.

### Exemple guidé, pas à pas
Besoin : connecter le déploiement continu à un nouveau fournisseur (clés à créer dans son tableau de bord, à mettre dans les secrets CI).
- **Cadrage** : lecture du workflow CI → il attend `DEPLOY_KEY` et `DEPLOY_SECRET`. Lecture du `.env.example` → les deux manquent. Liste d'étapes confirmée : 1) créer les clés dans le tableau de bord, 2) les saisir, 3) vérifier que le workflow les voit.
- **Cartographie** : URL exacte de la page des clés (vérifiée, pas devinée), intitulé exact du bouton ("Generate new key"), format attendu (clé publique `pk_...` + secret `sk_...`).
- **Script** : étape 1 (ouvre l'URL, attend confirmation "c'est fait"), étape 2 (saisie masquée des 2 clés, vérification du format `pk_/sk_`), étape 3 (écriture dans `.env` + rappel d'ajouter les mêmes dans les secrets CI, avec l'URL de la page des secrets).
- **Vérification statique** : `bash -n` + `shellcheck` verts, sans exécution.
- **Remise** : l'utilisateur lance le script, suit les étapes, et en 10 minutes la CI est connectée — contre 45 minutes d'allers-retours ("c'est quelle page déjà ? c'est quel format ?") sans guide.

### Pièges fréquents
- Utiliser cette skill pour une étape que l'agent pourrait faire lui-même (elle est réservée à ce que **seul un humain** peut faire).
- Inventer une étape ou une URL dont on n'est pas sûr, au lieu de vérifier d'abord.
- Demander les secrets en clair à l'écran (affichage, logs, historique) au lieu d'une saisie masquée.
- Écrire le script d'un bloc sans portes de confirmation : si l'utilisateur se trompe à l'étape 2, il doit pouvoir recommencer sans tout relancer depuis zéro.
- Oublier la vérification statique : un script non testé syntaxiquement qui plante au milieu d'une procédure manuelle fait perdre plus de temps que la procédure sans script.
- Automatiser une procédure qui n'arrive qu'une fois et prend 2 minutes à la main : le script coûterait plus cher que le problème.

### Checklist de sortie
Chaque étape exige vraiment un humain (sinon, pas de wizard) ; parcours exact vérifié (URL, intitulés, formats) ; template éprouvé utilisé (progression, confirmations, saisie masquée) ; `bash -n` + `shellcheck` verts sans exécution ; remise à l'utilisateur avec explication du déroulement.

### À toi de pratiquer
Identifie une procédure manuelle que tu fais régulièrement (déploiement, configuration, onboarding d'un outil) et écris-en le cadrage : liste des étapes + valeurs à capturer + où les trouver. Même sans écrire le script, ce cadrage révèle les étapes floues que tu fais "au feeling".

### Pour dire que tu maîtrises cette skill
Tu sais pourquoi cette skill ne s'exécute jamais elle-même de bout en bout, et se contente d'une vérification statique.

---

## 11. `code-review` (version mattpocock)

### C'est quoi
Une revue de code à **deux axes séparés et indépendants** : Standards (le code suit-il les conventions du dépôt ?) et Spec (le code correspond-il à ce que le ticket d'origine demandait ?), chacun exécuté par un sous-agent en parallèle.

L'intuition géniale de cette séparation : la plupart des revues mélangent les deux questions ("ce code est-il bon ?"), ce qui produit des revues floues où un code élégant mais hors-sujet passe, et où un code juste mais mal nommé est rejeté pour de mauvaises raisons. En séparant les axes — et en les confiant à deux relecteurs indépendants qui ne se contaminent pas — on obtient deux verdicts nets : conforme aux standards ? oui/non ; fidèle à la spec ? oui/non. Les 4 combinaisons sont possibles, et chacune appelle une action différente.

### Quand l'utiliser
Pour relire une branche, une pull request, ou un travail en cours.

Systématiquement en fin d'`implement`, et à chaque fois qu'un travail est candidat à l'intégration. La revue n'est pas optionnelle "quand on a le temps" : c'est une étape du flux, au même titre que les tests.

### Comment ça marche
1. **Fixer le point de comparaison** (un commit, une branche, un tag) — le diff se calcule entre ce point et l'état actuel. Sans point fixe, on relit "à peu près les changements récents" et on rate des fichiers.
2. **Identifier la source de la spec** (référence dans les messages de commit, fichier de spec...). Pas de spec trouvée ? C'est déjà un premier résultat de revue : du code sans spec de référence ne peut pas être validé sur l'axe Spec — on le signale au lieu de deviner.
3. **Identifier les sources de standards** (fichiers de convention du dépôt), complétées par une **liste fixe de "code smells" de Fowler** (nom mystérieux, code dupliqué, envie de fonctionnalité, primitive utilisée à la place d'un type métier, etc.) qui s'applique même si le dépôt ne documente rien. Cette liste de secours garantit un minimum de revue même sur un projet sans conventions écrites.
4. **Lancer les deux sous-agents en parallèle**, chacun dans son propre contexte, avec une consigne précise et une limite de mots. La limite de mots n'est pas anecdotique : elle force des rapports denses et exploitables au lieu de dissertations. L'isolation des contextes garantit l'indépendance des verdicts.
5. **Agréger les deux rapports séparément**, sans jamais les fusionner ou les reclasser ensemble — car un changement peut réussir un axe et échouer l'autre (respecter les standards mais implémenter la mauvaise chose, ou l'inverse).

### Exemple concret
Un code parfaitement conforme aux conventions du dépôt, mais qui implémente une fonctionnalité différente de ce que le ticket demandait → axe Standards : conforme, axe Spec : non conforme. Les deux rapports le montrent séparément : on garde la qualité du code, on corrige la direction.

### Exemple guidé, pas à pas
Pull request : "ajoute la recherche avec surlignage" (ticket #78).
- **Point de comparaison** : `main` → branche `feat/search`. **Spec source** : ticket #78 ("recherche insensible à la casse + surlignage + message si vide"). **Standards** : conventions du dépôt + liste Fowler en filet de sécurité.
- **Agent Standards** : trouve un nom mystérieux (`doStuff2`), une duplication (le surlignage copié à 2 endroits) → verdict : non conforme, 2 points précis.
- **Agent Spec** : la recherche est sensible à la casse (contraire au ticket) mais le surlignage et le message vide sont bons → verdict : non conforme, 1 point précis.
- **Agrégation séparée** : rapport Standards (2 points) + rapport Spec (1 point), présentés côte à côte, jamais mélangés.
- **Action** : on corrige les 3 points en sachant exactement de quel ordre ils relèvent — au lieu d'un vague "il y a des problèmes, revois ta PR".

### Pièges fréquents
- Fusionner les deux rapports en un seul classement — c'est justement ce que la séparation en deux axes veut éviter.
- Oublier la liste de "code smells" de base quand le dépôt ne documente aucun standard.
- Relire sans point de comparaison fixe : on commente du code au hasard au lieu de relire un diff précis.
- Chercher la spec "à peu près" au lieu de l'identifier : une revue Spec sans spec source, c'est une opinion déguisée en revue.
- Laisser un axe sans relecteur "parce que l'autre a déjà tout vu" : les deux axes voient des choses différentes par construction — en sauter un, c'est perdre la moitié de la revue.

### Checklist de sortie
Point de comparaison fixé ; spec source identifiée (ou absence signalée) ; standards identifiés + liste Fowler en secours ; 2 revues parallèles isolées avec consignes et limites ; rapports agrégés séparément ; actions classées par axe.

### À toi de pratiquer
Prends ta dernière pull request (ou un gros diff récent) et relis-la deux fois : une fois uniquement sur les standards (nommage, duplication, conventions), une fois uniquement sur la fidélité à la demande d'origine. Note ce que chaque passe a trouvé que l'autre aurait raté.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer, avec un exemple, comment un changement peut réussir un axe et échouer l'autre.

---

## 12. `codebase-design`

### C'est quoi
Un vocabulaire partagé pour concevoir des **"modules profonds"** : beaucoup de comportement caché derrière une petite interface, placée à un point d'ancrage ("seam") propre.

La qualité d'une architecture se joue aux interfaces : c'est là que les développeurs (et les agents) passent leur temps — lire des signatures, deviner des comportements, contourner des complexités qui fuient. Un module profond (`payer(commande)` qui gère prestataire, erreurs et retries en interne) fait gagner du temps à chaque utilisation ; un module superficiel (15 méthodes qui exposent chaque micro-étape) en fait perdre à chaque appel. Ce vocabulaire donne des noms précis à ces phénomènes, pour qu'on puisse en parler — et donc les corriger — au lieu de subir vaguement "du code compliqué".

### Quand l'utiliser
Pour concevoir ou améliorer l'interface d'un module, trouver où placer un seam, ou rendre du code plus testable.

Déclencheurs : on hésite sur où mettre une nouvelle fonctionnalité, une interface grossit à chaque sprint, les tests deviennent compliqués à écrire (signe que les seams sont mal placés), ou on relit du code en se disant "c'est le bazar" sans pouvoir dire pourquoi — le vocabulaire transforme cette impression en diagnostic précis.

### Comment ça marche — le glossaire clé
- **Module** : tout ce qui a une interface et une implémentation (une fonction, une classe, un package...). Penser "module" plutôt que "fichier" ou "classe" libère du langage : ce qui compte, c'est la frontière entre l'interface et l'implémentation, pas la syntaxe.
- **Interface** : tout ce qu'un appelant doit savoir pour utiliser le module correctement (pas seulement la signature — aussi les invariants, les modes d'erreur, la config requise). Une interface dont la documentation fait 3 pages pour 2 méthodes est une interface superficielle déguisée.
- **Profondeur** : le levier obtenu à l'interface. Un module **profond** = beaucoup de comportement derrière une petite interface. Un module **superficiel** = une interface presque aussi complexe que ce qu'il fait vraiment.
- **Seam** : l'endroit où l'on peut modifier un comportement sans éditer à cet endroit précis — c'est là que vivent les tests.
- **Test de la suppression** : si on supprime le module et que la complexité disparaît, c'était un simple relais inutile ; si elle réapparaît chez tous les appelants, le module méritait d'exister. Ce test mental prend 30 secondes et tranche la plupart des débats "faut-il ce module ?".
- **Un adaptateur = un seam hypothétique ; deux adaptateurs = un seam réel** — ne pas créer de seam tant que rien ne varie réellement à cet endroit. Créer une abstraction "pour plus tard", c'est payer le coût de la complexité sans toucher les bénéfices.

### Exemple concret
Un module "paiement" avec une seule méthode `payer(commande)` qui gère en interne toute la complexité (choix du prestataire, gestion des erreurs, retries) est un module **profond** — bien plus utile qu'une classe avec 15 méthodes publiques qui ne font chacune qu'un mini-pas.

### Exemple guidé, pas à pas
Module existant : `ExportManager` avec 12 méthodes publiques (`setFormat`, `setDelimiter`, `setEncoding`, `setHeader`, `addColumn`, `removeColumn`, ...).
- **Diagnostic** : interface presque aussi complexe que le travail réel (configurer 12 options pour exporter un CSV) → module superficiel. Test de la suppression : si on supprime la classe, chaque appelant doit refaire la configuration à la main → la complexité réapparaît partout → le module mérite d'exister, mais pas sous cette forme.
- **Redesign** : une seule méthode `exporter(donnees, options)` avec des valeurs par défaut sensées (CSV, UTF-8, en-têtes auto) — les 12 réglages deviennent des options facultatives, pas des étapes obligatoires. Comportement identique, interface divisée par 10.
- **Seam** : les tests vivent sur `exporter()` (comportement), pas sur chaque setter (implémentation).
- **Adaptateurs** : un seul format réel aujourd'hui (CSV) → pas de seam "multi-format" prématuré. Quand le PDF arrivera (deuxième adaptateur), le seam naîtra — pas avant.
- Résultat : les appelants passent de 12 lignes de configuration à 1 ligne, les tests sont stables, et le jour où le PDF arrive, l'extension est naturelle au lieu d'être un refactoring douloureux.

### Pièges fréquents
- Confondre profondeur avec "ratio lignes d'implémentation / lignes d'interface" (ce qui récompenserait un code juste plus verbeux).
- Créer un seam "au cas où" avant même qu'un deuxième adaptateur en ait réellement besoin.
- Confondre "beaucoup de méthodes" avec "module riche" : 15 méthodes triviales font un module superficiel, pas un module puissant.
- Rendre l'interface "simple" en cachant la complexité sans la traiter (les erreurs silencieuses, les comportements magiques) : la profondeur exige que la complexité soit gérée en interne, pas escamotée.
- Appliquer le vocabulaire comme des insultes ("ton module est superficiel") au lieu d'un diagnostic partagé : les mots servent à concevoir ensemble, pas à noter.

### Checklist de sortie
Interface mesurée (que doit savoir l'appelant ?) ; profondeur évaluée honnêtement ; test de la suppression appliqué ; seams placés là où ça varie vraiment (règle des 2 adaptateurs) ; tests sur le comportement public, pas les détails.

### À toi de pratiquer
Choisis un module de ton projet et applique le test de la suppression : supprime-le mentalement — la complexité disparaît-elle (relais inutile) ou réapparaît-elle chez les appelants (module légitime) ? Puis compte ses méthodes publiques : au-delà de 5-7, demande-toi lesquelles pourraient devenir des options par défaut.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer le "test de la suppression" et l'appliquer à un exemple de module donné.

---

## 13. `diagnosing-bugs`

### C'est quoi
Une discipline en 6 phases pour diagnostiquer des bugs difficiles ou des régressions de performance, centrée sur la construction d'une **boucle de rétroaction fiable** avant toute hypothèse.

Là où `systematic-debugging` (partie 2) donne la méthode générale (investiguer → hypothèse unique → corriger → tester), cette skill s'attaque au cas le plus dur : les bugs qui résistent — intermittents, de performance, multi-composants. Son insight central : sans boucle de rétroaction (un signal qui passe au rouge exactement quand le bug se produit), toute analyse de code est de la devinette habillée. On ne commence donc pas par lire du code, on commence par construire l'instrument de mesure — et tout le reste en découle.

### Quand l'utiliser
Face à un bug qui résiste à un premier coup d'œil, un problème intermittent, ou une régression de performance.

Plus précisément : quand le débogage normal a échoué (hypothèses testées sans succès), quand le bug est intermittent (il faut le rendre reproductible avant tout), ou quand c'est une régression de performance (il faut d'abord un benchmark qui montre la dégradation). Si le bug est évident à la lecture du code, cette artillerie est superflue — on corrige directement avec un test.

### Comment ça marche — les 6 phases
1. **Construire une boucle de rétroaction** (LA compétence centrale) : un signal fiable qui devient "rouge" sur ce bug précis — un test qui échoue, un script curl, une invocation CLI, un script de navigateur automatisé, une trace rejouée, etc. Sans cette boucle, aucune analyse de code ne suffira. La boucle doit être rapide (quelques secondes, pas 20 minutes) sinon on ne l'utilisera pas assez souvent — et spécifique (elle réagit à CE bug, pas "aux bugs en général").
2. **Reproduire puis minimiser** : réduire le scénario au strict minimum qui déclenche encore le bug. Un repro de 50 étapes est inutilisable pour tester des hypothèses ; un repro de 3 étapes est un instrument de précision. On enlève des éléments un par un tant que le bug se déclenche — ce qui reste est le cœur du problème.
3. **Formuler 3 à 5 hypothèses classées**, chacune falsifiable ("si X est la cause, alors changer Y fera disparaître le bug") — jamais une seule hypothèse isolée (biais d'ancrage). Le classement se fait par probabilité × facilité de test : on teste d'abord ce qui est probable ET rapide à vérifier. Et chaque hypothèse doit pouvoir être réfutée : "c'est peut-être le cache" n'est pas une hypothèse — "si c'est le cache, vider le cache fait disparaître le bug" en est une.
4. **Instrumenter** : chaque sonde doit correspondre à une prédiction précise, changer une seule variable à la fois, préférer un débogueur à des logs, taguer chaque log de debug avec un préfixe unique pour un nettoyage facile. L'instrumentation n'est pas "ajouter des logs partout" : chaque sonde teste une hypothèse précise, sinon c'est du bruit qui ralentit la boucle.
5. **Corriger + test de régression** : écrire le test de régression **avant** la correction, uniquement s'il existe un "seam" correct pour le faire — sinon, cette absence de seam est elle-même la vraie découverte à signaler. Un code intestable qui abrite un bug, c'est deux problèmes : le bug, et l'impossibilité de prouver sa correction. Signaler le second est parfois plus important que corriger le premier.
6. **Nettoyage** : reproduction originale disparue, test de régression qui passe, tous les logs de debug supprimés, prototypes jetables supprimés. Le nettoyage fait partie du travail, pas une option : des logs de debug oubliés polluent les futures investigations, et un script de repro abandonné devient un faux test qui affole l'équipe dans 3 mois.

### Exemple concret
Un bug intermittent (1 fois sur 20) → au lieu de chercher un repro parfait, on fait tourner le déclencheur 100 fois en parallèle pour faire monter le taux de reproduction à un niveau où le bug devient réellement déboguable.

### Exemple guidé, pas à pas
Symptôme : "l'application ralentit progressivement au fil de la journée, il faut la redémarrer le soir".
- **Boucle** : script qui mesure le temps de réponse toutes les minutes et l'écrit avec horodatage — en 2 heures, la courbe montre une dégradation linéaire. La boucle est construite : tout changement futur se lira sur cette courbe.
- **Minimiser** : le ralentissement survient-il sans utilisateurs ? Test de nuit : oui, même à vide → ce n'est pas la charge, c'est le temps qui passe (piste mémoire/ressources, pas concurrence).
- **Hypothèses classées** : H1 "fuite mémoire applicative" (probable, testable via courbe mémoire) ; H2 "logs qui grossissent et ralentissent les écritures" (probable, testable en 5 minutes) ; H3 "connexions base non fermées" (possible, testable via compteur). On teste H2 d'abord (5 minutes) : faux. H1 : courbe mémoire qui monte en parallèle → probable vrai.
- **Instrumenter** : sonde mémoire avec préfixe `[DBG-MEM]`, une variable à la fois — on identifie un cache sans limite qui grossit indéfiniment.
- **Corriger + régression** : test "la mémoire reste stable sur 1000 cycles", borne sur le cache, test vert, courbe redevenue plate sur la boucle.
- **Nettoyage** : logs `[DBG-MEM]` supprimés, scripts temporaires effacés, boucle de mesure conservée (elle devient la surveillance permanente — un instrument construit peut servir deux fois).
- Sans la boucle initiale, on aurait "optimisé" au hasard pendant des jours (base de données ? réseau ? code ?) sans jamais savoir si ça s'améliorait.

### Pièges fréquents
- Sauter directement à une hypothèse de cause sans avoir construit de boucle de rétroaction fiable au préalable — signal d'alarme explicite de cette skill.
- Tester plusieurs hypothèses en même temps en changeant plusieurs variables à la fois.
- Formuler une seule hypothèse ("je suis sûr que c'est X") : l'ancrage sur une hypothèse unique rend aveugle aux autres — toujours 3 à 5, classées.
- Instrumenter en vrac (logs partout sans prédiction) : le bruit ralentit la boucle et noie le signal.
- Oublier le nettoyage : les sondes temporaires deviennent des faux signaux permanents.
- Corriger sans test de régression "parce que c'était compliqué à tester" : si c'est compliqué à tester, l'absence de seam est la vraie découverte — on la signale au lieu de la contourner.

### Checklist de sortie
Boucle rapide et spécifique construite avant toute hypothèse ; scénario minimisé ; 3-5 hypothèses falsifiables classées ; une variable changée à la fois ; test de régression écrit avant correction (ou absence de seam signalée) ; nettoyage complet (logs, scripts, prototypes).

### À toi de pratiquer
Prends un comportement "bizarre mais pas bloquant" de ton projet actuel (un affichage parfois lent, un message parfois en double) et construis juste la boucle de rétroaction : un moyen rapide et fiable de voir le phénomène à volonté. Rien que cet instrument changera ta relation au problème.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi "construire la boucle de rétroaction" est LA phase qui compte le plus, et citer au moins 3 façons différentes d'en construire une.

---

## 14. `improve-codebase-architecture`

### C'est quoi
Scanner un code existant pour trouver des "opportunités d'approfondissement" (transformer des modules superficiels en modules profonds), présentées sous forme de rapport visuel HTML.

Le refactoring continu au fil de l'eau a ses limites : on ne voit jamais la forêt quand on taille les arbres un par un. Cette skill propose l'inverse — un temps d'arrêt périodique où l'on scanne le code avec le vocabulaire de `codebase-design`, et où l'on présente les trouvailles non pas comme des tickets secs, mais comme un rapport visuel (diagrammes avant/après) qui permet de décider en connaissance de cause. Le rapport ne code rien : il montre, il note, il recommande — la décision et l'exécution viennent après, via la boucle d'entretien.

### Quand l'utiliser
Ponctuellement, pour garder le code sain et navigable par des agents IA — ce n'est pas du travail de fonctionnalité, c'est de l'entretien.

Rythme type : tous les 2-3 mois, ou après une phase de construction intense, ou quand les nouveaux arrivants (humains ou agents) se perdent dans le code. Jamais en plein milieu d'un chantier urgent : l'entretien se planifie dans les accalmies, pas sous pression — sous pression, on ne voit que ce qui arrange.

### Comment ça marche
1. **Explorer** : privilégier les zones du code récemment modifiées (là où l'investissement paiera le plus), en s'appuyant sur le vocabulaire de `codebase-design` et le glossaire du projet. Les zones récemment modifiées sont celles où la dette fraîche s'accumule et où l'équipe travaille encore : les améliorer paie immédiatement. Le reste du code, stable et peu touché, peut attendre — même s'il n'est pas parfait.
2. **Présenter les candidats sous forme de rapport HTML** autonome (avec des diagrammes avant/après), chaque candidat noté "Fort", "À explorer", ou "Spéculatif" — jamais de proposition d'interface concrète à ce stade. Le rapport montre le problème (pas la solution) : un diagramme "avant" qui fait mal aux yeux vaut mieux que 3 paragraphes. Les notes calibrent l'effort : "Fort" = on sait que ça paiera, "À explorer" = prometteur mais incertain, "Spéculatif" = intuition à valider — on n'investit pas pareil dans les trois.
3. **Boucle d'entretien** une fois qu'un candidat est choisi, en s'appuyant sur `domain-modeling` pour garder le glossaire à jour au fil des décisions. L'entretien suit le cycle normal (spec, tickets, TDD, revue) : ce n'est pas un régime d'exception, c'est le processus habituel appliqué à la santé du code. Et chaque décision de renommage ou de regroupement met à jour le glossaire — sinon le vocabulaire et le code divergent à nouveau.

### Exemple concret
Le rapport signale qu'une logique de calcul de prix est éparpillée dans 6 petits fichiers différents, ce qui oblige à sauter partout pour comprendre une seule règle — recommandation "Fort" : regrouper cette logique derrière une interface unique.

### Exemple guidé, pas à pas
Contexte : après 4 mois de construction, l'équipe se plaint que "tout est devenu compliqué".
- **Exploration ciblée** : on scanne en priorité les 5 dossiers les plus modifiés (historique git), avec le vocabulaire `codebase-design` en main et le glossaire du projet.
- **Rapport** (3 candidats) : Candidat 1 "Fort" — la validation des formulaires dupliquée dans 8 composants, diagramme avant (8 copies) / après (1 module `validateForm` profond) ; Candidat 2 "À explorer" — le module de notifications à 14 méthodes publiques, peut-être superficiel, à confirmer par le test de la suppression ; Candidat 3 "Spéculatif" — l'arborescence des dossiers ne reflète plus les domaines métier, intuition à valider avec l'équipe.
- **Décision** : l'équipe choisit le candidat 1 (gain immédiat, risque faible) et reporte le 3 (trop flou pour l'instant).
- **Boucle d'entretien** : spec courte, 2 tickets verticaux, TDD, revue — et mise à jour du glossaire ("Validation" devient un terme défini avec ses règles).
- **Surtout** : aucune interface concrète n'avait été proposée dans le rapport — l'équipe a décidé du QUOI (regrouper la validation) avant que quiconque dessine le COMMENT. C'est cette discipline qui évite les refontes imposées que personne ne veut.
- 3 semaines plus tard, ajouter une règle de validation prend 10 minutes au lieu d'une heure — le rapport a payé son coût.

### Pièges fréquents
- Proposer une interface concrète dès l'étape de présentation des candidats (trop tôt — cette étape ne fait que présenter le problème, pas la solution détaillée).
- Ignorer une ADR existante sans vérifier si la friction actuelle justifie de la rouvrir.
- Scanner uniformément tout le code au lieu de privilégier les zones actives : on passe 80% du temps sur du code stable qui n'embête personne.
- Présenter 15 candidats d'un coup : au-delà de 3-5, plus rien n'est choisi — le rapport doit prioriser, pas inventorier.
- Confondre entretien et fonctionnalité : "tant qu'on refactore, on ajoute la feature X" — non. L'entretien ne change aucun comportement visible, sinon ce n'est plus de l'entretien et ses risques ne sont plus maîtrisés.
- Rouvrir une ADR sans raison valable : si la friction actuelle ne justifie pas de revenir sur une décision passée, on la respecte — même si on aurait décidé autrement aujourd'hui.

### Checklist de sortie
Scan ciblé sur zones actives avec vocabulaire et glossaire ; rapport visuel avec diagrammes avant/après ; candidats notés (Fort/À explorer/Spéculatif), 3-5 maximum ; aucune interface concrète proposée au stade rapport ; décision explicite de l'équipe ; entretien via processus normal + glossaire mis à jour ; ADR respectées sauf justification de réouverture.

### À toi de pratiquer
Ouvre l'historique de ton dépôt, identifie les 3 dossiers les plus modifiés ces 2 derniers mois, et pour chacun note en 2 lignes : qu'est-ce qui s'y est accumulé ? quel module mériterait d'être approfondi ? Tu viens de faire une mini-exploration — la première étape de la skill.

### Pour dire que tu maîtrises cette skill
Tu sais pourquoi cette skill privilégie les zones du code récemment modifiées plutôt que de tout scanner uniformément.

---

## 15. `to-tickets`

### C'est quoi
Découper un plan, une spec, ou la conversation en cours en un ensemble de **tickets "tracer-bullet" (tranches verticales complètes)**, chacun déclarant ses dépendances bloquantes.

Entre la spec ("quoi construire") et l'exécution ("construire"), il manque une couche : des unités de travail attribuables, ordonnables et vérifiables séparément. Le ticket "tracer-bullet" est cette unité : comme une balle traçante qui traverse toutes les couches et montre le chemin, chaque ticket traverse toutes les couches techniques (schéma, API, interface, tests) et produit quelque chose de démontrable seul. Les dépendances explicites ("bloqué par le ticket 2") transforment la pile de tickets en plan d'exécution : on sait toujours par où commencer et ce qui débloque quoi.

### Quand l'utiliser
Une fois qu'une spec ou un plan existe, pour le rendre exécutable ticket par ticket.

C'est la dernière étape avant l'exécution : après elle, on ne réfléchit plus à l'organisation, on exécute (`implement`, sous-agents, etc.). Si la spec n'existe pas encore, on ne "découpe" pas du vide — on retourne la produire (`to-spec`, `grill-with-docs`).

### Comment ça marche
1. Rassembler le contexte déjà disponible dans la conversation. Tout ce qui a été décidé (glossaire, contraintes, exemples) est la matière première : on ne redemande rien, on consolide. Si la conversation est pauvre, c'est le signe qu'il manque une étape en amont — pas qu'il faut deviner.
2. Explorer le code pour repérer des occasions de "préfactoriser" (rendre le changement facile avant de faire le changement facile). La préfactorsation, c'est préparer le terrain : extraire une fonction, nommer un concept, isoler un module — sans changer de comportement — pour que les tickets suivants soient simples. Un ticket de préfactorsation bien placé divise par deux la complexité des tickets qui suivent.
3. **Découper en tranches verticales** : chaque tranche traverse toutes les couches (schéma, API, interface, tests) de façon complète et démontrable seule — jamais une tranche "horizontale" (toute la base de données, puis toute l'API...). **Exception : les "refontes larges"** (renommer une colonne partout, par exemple) qui cassent des milliers d'appels d'un coup — celles-là suivent un schéma "étendre → migrer par lots → contracter" plutôt qu'une tranche verticale classique.
4. Chaque ticket déclare ce qui le **bloque** (quels autres tickets doivent être terminés avant). Les dépendances sont la colonne vertébrale du plan : elles disent l'ordre d'exécution et révèlent le parallélisable (deux tickets sans dépendance commune peuvent avancer ensemble).
5. Présenter la liste à l'utilisateur pour validation, puis publier — un fichier par ticket en local, ou un ticket natif sur un vrai gestionnaire de tickets. La validation humaine n'est pas une politesse : c'est le moment où les oublis et les mauvais découpages se voient encore à peu de frais.

### Exemple concret
Une fonctionnalité "commentaires sur articles" découpée en : Ticket 1 (schéma + API, aucun blocage), Ticket 2 (interface d'ajout, bloqué par Ticket 1), Ticket 3 (modération, bloqué par Ticket 2).

### Exemple guidé, pas à pas
Spec : "système de favoris" (problème, 8 histoires utilisateur, hors-périmètre : pas de partage entre utilisateurs).
- **Contexte** : tout est dans la conversation (glossaire "Favori", contrainte "un favori = un utilisateur + un article", exemple du ticket #12).
- **Préfactorisation** : en explorant le code, on voit que la table `articles` n'a pas d'index adapté aux jointures à venir → Ticket 0 "ajouter l'index + test de performance" (sans changement visible, mais qui rend les tickets suivants triviaux).
- **Tranches verticales** : T1 "ajouter un favori (API + bouton + test, bloqué par T0)", T2 "retirer un favori (bloqué par T1)", T3 "page 'mes favoris' (bloquée par T1)", T4 "compteur de favoris (bloqué par T1)". T3 et T4 sont parallélisables entre eux — les dépendances le montrent.
- **Refonte large ?** Non ici — mais si la spec avait exigé de renommer `user_id` en `account_id` partout, on aurait prévu le schéma étendre-migrer-contracter au lieu de forcer une tranche verticale.
- **Validation + publication** : liste présentée, l'utilisateur ajoute "et le cas 'article supprimé' ?" → T5 "favoris orphelins : masquage + test (bloqué par T1)". Puis publication, un fichier par ticket.
- Sans les dépendances explicites, T3 aurait été commencée avant T1 — et aurait attendu 2 jours. Sans la préfactorsation, chaque ticket aurait bricolé ses propres jointures lentes.

### Pièges fréquents
- Découper horizontalement (toute la base de données, puis toute l'API) au lieu de verticalement.
- Forcer une refonte à large impact dans une tranche verticale classique alors qu'elle a besoin du schéma "étendre-migrer-contracter".
- Oublier les dépendances ("on verra bien l'ordre en avançant") : sans dépendances, tout semble parallélisable — jusqu'à ce que tout se bloque mutuellement.
- Des tickets sans critère de fin ("implémenter les favoris") : chaque ticket porte son test ou sa démonstration, sinon "terminé" ne veut rien dire.
- Publier sans validation humaine : le découpage reflète une compréhension qui peut être fausse — la validation est le dernier filet avant l'exécution.
- Confondre ticket et tâche microscopique ("écrire la ligne 12") : un ticket est une tranche démontrable, pas une micro-instruction — le grain trop fin noie le plan.

### Checklist de sortie
Contexte consolidé sans re-demande ; préfactorsation repérée et prévue ; tranches verticales démontrables seules ; refontes larges traitées en étendre-migrer-contracter ; dépendances déclarées par ticket ; critères de fin par ticket ; liste validée puis publiée.

### À toi de pratiquer
Prends une fonctionnalité de complexité moyenne que tu connais bien et découpe-la en 4 tickets verticaux sur papier : couches traversées par chacun, dépendances ("bloqué par..."), critère de fin. Puis vérifie : chaque ticket est-il démontrable seul ? Deux tickets peuvent-ils avancer en parallèle ?

### Pour dire que tu maîtrises cette skill
Tu sais expliquer la différence entre une tranche verticale classique et une "refonte large", et pourquoi cette dernière suit un schéma différent.

---

## 16. `triage`

### C'est quoi
Faire avancer les tickets et pull requests externes à travers une petite machine à états de rôles de triage : catégoriser, vérifier, entretien si besoin, puis rédiger des briefs prêts pour un agent.

Quand les demandes arrivent en vrac (issues GitHub, emails clients, messages d'équipe), deux échecs guettent : les traiter dans l'ordre d'arrivée (l'urgent réel attend derrière le bruit) ou les traiter à l'instinct (sans vérification, sans brief, avec des allers-retours interminables). Le triage impose une machine : chaque ticket entre dans un état, subit les mêmes vérifications, et n'en sort que vers un état explicite — jamais vers "on verra plus tard". C'est du contrôle aérien pour demandes entrantes.

### Quand l'utiliser
Pour des bugs et demandes qui **arrivent en vrac** (pas pour des tickets déjà produits par `to-tickets`, qui sont déjà prêts).

Le critère, c'est la provenance : si ça vient de l'extérieur sans format (bug reporté par un utilisateur, PR d'un contributeur, demande par message), ça passe par le triage. Si ça sort de ton propre processus (`to-tickets`, plan interne), c'est déjà trié — le re-trier, c'est de la bureaucratie pure.

### Comment ça marche — les rôles
- **2 rôles de catégorie** : `bug` ou `enhancement`. Pas de troisième : toute demande est soit "quelque chose de cassé", soit "quelque chose à ajouter". Forcer ce choix binaire clarifie la moitié des demandes floues.
- **5 rôles d'état** : `needs-triage` (à évaluer), `needs-info` (en attente d'infos du rapporteur), `ready-for-agent` (prêt pour un agent), `ready-for-human` (besoin d'implémentation humaine), `wontfix` (ne sera pas traité). Chaque état a une sortie définie : `needs-info` attend une réponse (avec relance), `ready-for-agent` exige un brief complet, `wontfix` exige une explication écrite (jamais de fermeture silencieuse).

**Processus pour un ticket donné :**
1. Rassembler le contexte complet (corps, commentaires, historique de triage précédent), vérifier si la fonctionnalité existe déjà (recherche par concept métier, pas juste par mot-clé) et si une demande similaire a déjà été rejetée. La recherche par concept ("y a-t-il déjà quelque chose qui fait X ?") évite les doublons que la recherche par mot-clé rate ("le ticket parle de 'tableau', la fonctionnalité s'appelle 'grille'").
2. Recommander une catégorie et un état avec un raisonnement, puis attendre la direction du mainteneur. La recommandation est argumentée et la décision appartient au mainteneur : le triage propose, le mainteneur dispose — surtout pour `wontfix`, qui engage la relation aux utilisateurs.
3. **Vérifier la revendication** avant tout entretien : reproduire le bug, ou confirmer que le diff d'une PR fait bien ce qu'il prétend faire. C'est l'étape qui évite 50% du travail inutile : beaucoup de bugs signalés sont déjà corrigés, irreproductibles, ou des malentendus — et beaucoup de PR "qui ajoutent X" ne font pas ce qu'elles prétendent.
4. Faire un entretien si la demande a besoin d'être précisée. L'entretien n'arrive qu'après vérification : interviewer sur un bug déjà corrigé, c'est faire perdre du temps au rapporteur pour rien.
5. Appliquer le résultat final (brief pour agent, notes de triage, fermeture avec explication...). Chaque sortie laisse une trace : un brief (pour `ready-for-agent`), une note (pour `needs-info` : qu'attend-on, de qui, avec quel délai), une explication (pour `wontfix` : pourquoi, avec alternative si possible).

### Exemple concret
Un bug signalé arrive → on vérifie d'abord s'il n'est pas déjà corrigé dans le code actuel → on tente de le reproduire → seulement après cette vérification, on décide s'il passe en `ready-for-agent` avec un brief détaillé.

### Exemple guidé, pas à pas
Arrivage du matin : 4 tickets — "l'app plante au démarrage" (bug), "ajoutez un mode sombre" (demande), PR externe "corrige la faute dans le README", "l'export ne marche plus" (bug).
- **Ticket 1** : contexte (3 commentaires, déjà signalé le mois dernier puis fermé). Catégorie `bug`. Vérification : reproduction sur la version actuelle → toujours planté → `ready-for-agent` avec brief (logs, version, étapes de repro).
- **Ticket 2** : `enhancement`. Vérification : le mode sombre existe-t-il déjà partiellement ? Recherche par concept → non. Pas d'urgence → pas d'entretien immédiat : état `needs-triage` conservé en attendant la revue hebdo, avec note.
- **PR README** : vérification du diff — il fait bien ce qu'il prétend (une faute corrigée, rien d'autre) → acceptation rapide, pas de cérémonie pour un changement trivial.
- **Ticket 4** : vérification d'abord — l'export remarche depuis la mise à jour d'hier ? Test : oui, corrigé. Commentaire de clôture avec explication ("corrigé par la mise à jour X, rouvrez si ça revient") au lieu d'un brief inutile.
- Bilan : 1 brief d'agent, 1 acceptation, 1 mise en attente documentée, 1 clôture expliquée — en 30 minutes, sans entretien inutile, sans travail fantôme.

### Pièges fréquents
- Passer directement à l'entretien sans avoir d'abord vérifié que le bug/la PR fait réellement ce qu'il prétend.
- Re-trier des tickets qui sortent déjà de `to-tickets` (ils sont déjà prêts pour un agent).
- Trier dans l'ordre d'arrivée au lieu de vérifier d'abord : l'ordre d'arrivée n'est jamais l'ordre de priorité.
- Fermer en `wontfix` sans explication : chaque fermeture silencieuse décourage les prochains signalements — et les vrais bugs avec eux.
- Laisser des tickets en `needs-info` sans relance ni délai : c'est une poubelle déguisée — tout `needs-info` porte une date de relance et une issue de sortie.
- Confondre vitesse et précipitation : trier vite, c'est décider vite avec la procédure complète — pas sauter des étapes.

### Checklist de sortie
Provenance externe confirmée (sinon, pas de triage) ; contexte complet rassemblé (doublons cherchés par concept) ; catégorie + état recommandés avec raisonnement ; revendication vérifiée AVANT tout entretien ; sorties tracées (brief, note avec délai, ou explication de fermeture).

### À toi de pratiquer
Prends ta boîte mail ou tes notifications en retard (5 éléments en vrac) et trie-les avec la machine : catégorie + état pour chacun, en suivant l'ordre (contexte → vérification → décision). Note ceux que tu aurais traités dans le mauvais ordre sans la méthode.

### Pour dire que tu maîtrises cette skill
Tu sais citer les 5 états possibles et expliquer pourquoi la "vérification de la revendication" doit venir avant l'entretien.

---

## 17. `wayfinder`

### C'est quoi
Planifier un effort énorme et flou (plus grand qu'une seule session d'agent) comme une **carte partagée de tickets de décision** sur le gestionnaire de tickets, résolus un par un jusqu'à ce que le chemin soit clair.

Face à un projet immense et flou, deux réflexes sont tentants et mauvais : foncer tête baissée (on construit sur du sable), ou tout planifier d'un coup (on planifie sur du brouillard — 90% du plan sera faux). La troisième voie : cartographier les DÉCISIONS à prendre (pas le travail à faire), les résoudre une par une, et laisser le chemin se révéler au fur et à mesure. La carte n'est pas un plan d'exécution, c'est un plan de clarification : quand il n'y a plus rien à décider, le travail peut commencer — avec les specs et tickets normaux.

### Quand l'utiliser
Pour un projet neuf ou une fonctionnalité énorme, trop grande et trop floue pour une seule session — jamais pour une fonctionnalité déjà bien cadrée (dans ce cas, `grill-with-docs` suffit).

Le test : "puis-je décrire ce qu'il faut construire en quelques phrases sans inventer la moitié ?" Si non, c'est un cas wayfinder. Si oui, c'est un cas grill — le wayfinder serait du gaspillage (cartographier des décisions déjà prises).

### Comment ça marche — concepts clés
- **La carte est un ticket unique** listant les décisions déjà prises (avec liens vers le détail), jamais un stockage complet — chaque décision vit dans **un seul endroit**, son propre ticket. La carte est un index vivant, pas un document : elle pointe, elle ne contient pas (sinon elle se périme dès qu'un détail change).
- **Les tickets de décision**, pas des tranches de travail à exécuter : chaque ticket répond à une question précise, pas "construire telle chose". "Faut-il du temps réel ou du polling ?" est un ticket de décision ; "implémenter le polling" n'en est pas un (c'est du travail, qui viendra après).
- **4 types de tickets** : `research` (délègue à `research`), `prototype` (délègue à `prototype`), `grilling` (le cas par défaut, une conversation), `task` (du travail manuel nécessaire avant qu'une décision puisse être prise). Le type détermine comment la décision sera tranchée : par des faits (research), par l'expérience (prototype), par la discussion (grilling), ou par un prérequis manuel (task).
- **Le "brouillard de guerre"** : la carte reste délibérément incomplète — ce qu'on ne peut pas encore préciser reste dans une section "Pas encore spécifié" plutôt que d'être découpé prématurément en tickets. Le brouillard n'est pas un échec de planification, c'est de l'honnêteté : forcer des tickets sur du flou produit des tickets faux qui pourrissent le chantier.
- **Ne jamais résoudre plus d'un ticket par session** (sauf les tickets de recherche). Cette limite protège la coordination : plusieurs sessions en parallèle avancent chacune sur leur ticket sans se marcher dessus, et chaque résolution est validée avant de passer à la suivante.
- **Planifier, ne pas faire** : chaque ticket résout une décision, pas une livraison — la carte est terminée quand il n'y a plus rien à décider avant que quelqu'un aille faire le travail. La tentation de "commencer à construire pendant qu'on planifie" mélange deux activités aux rythmes incompatibles.

### Exemple concret
Une idée de "plateforme complète avec chat, stockage de fichiers, facturation" est bien trop grosse pour une session → `wayfinder` crée une carte avec la destination nommée, des tickets de décision par sous-système, et une zone "brouillard" pour tout ce qui n'est pas encore assez clair pour être découpé.

### Exemple guidé, pas à pas
Idée : "refondre tout le système de notifications (email, SMS, push, préférences, historique)".
- **Carte créée** : destination ("un système de notifications unifié et fiable"), décisions déjà prises (liens vers les discussions : "on garde le fournisseur d'emails actuel"), section "Pas encore spécifié" (canaux exacts, volumétrie, budget).
- **Tickets de décision** : D1 `research` ("limites et coûts des SMS chez 3 fournisseurs"), D2 `grilling` ("faut-il un centre de préférences utilisateur, ou des réglages par défaut intelligents ?"), D3 `prototype` ("maquette du centre de préférences si D2 répond oui"), D4 `task` ("extraire les statistiques d'envoi actuelles pour dimensionner").
- **Sessions** : D1 résolu seul (rapport de recherche) → D2 en conversation (décision : réglages par défaut, pas de centre en v1 — le brouillard se dissipe) → D3 devient inutile (annulé proprement, pas exécuté "quand même") → D4 exécuté.
- **Fin de carte** : plus rien à décider — il ne reste qu'à faire. La carte est close, le travail normal commence (`to-spec` sur le système tranché).
- Sans la carte, on aurait soit foncé (construire un centre de préférences inutile), soit planifié 40 tickets sur du brouillard (dont la moitié faux).

### Pièges fréquents
- Utiliser cette skill pour un travail déjà bien cadré — c'est un gaspillage d'effort pour quelque chose que `grill-with-docs` aurait suffi à traiter.
- Résoudre plusieurs tickets de décision dans la même session, cassant la coordination avec d'autres sessions en parallèle.
- Découper prématurément le "brouillard" en tickets avant que la question soit vraiment assez nette.
- Écrire les décisions dans la carte au lieu de leurs tickets : la carte pointe, elle ne contient pas — sinon deux versions divergent.
- Transformer les tickets de décision en tickets de travail ("implémenter X") : tant qu'on décide, on ne construit pas — mélanger les deux fait les deux mal.
- Garder la carte ouverte indéfiniment : quand il n'y a plus rien à décider, on la clôt explicitement et on passe au travail — une carte qui traîne devient un cimetière d'intentions.

### Checklist de sortie
Effort qualifié (énorme + flou, sinon grill simple) ; carte-ticket créée avec destination ; décisions en tickets typés (research/prototype/grilling/task), un seul lieu par décision ; brouillard assumé en section dédiée ; un ticket par session max ; carte clôturée quand plus rien à décider.

### À toi de pratiquer
Pense au plus gros chantier flou autour de toi (même non-technique : déménagement, événement, reconversion). Écris la carte : destination en une phrase, 3 tickets de décision typés, 1 zone "pas encore spécifié". Observe comme cet exercice seul clarifie déjà ce qui te faisait peur.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer la différence entre un ticket de décision et une section "pas encore spécifié", et pourquoi on ne résout jamais plus d'un ticket de décision par session.

---

## Récapitulatif — Partie 3/3

| # | Skill | En une phrase |
|---|-------|----------------|
| 1 | ask-matt | Le routeur qui indique quelle skill utiliser selon la situation |
| 2 | grill-with-docs | Entretien serré qui laisse une trace écrite (glossaire, ADR) |
| 3 | implement | Réalise le travail décrit dans une spec/des tickets, via TDD |
| 4 | research | Délègue une recherche documentaire à un agent en arrière-plan |
| 5 | resolving-merge-conflicts | Résout un conflit git par intention, jamais par `--abort` |
| 6 | domain-modeling | Construit et affine le vocabulaire métier en continu |
| 7 | prototype | Code jetable pour répondre à une question de design précise |
| 8 | tdd (mattpocock) | Vocabulaire des "seams" et anti-patterns de tests |
| 9 | to-spec | Synthétise la conversation en spec publiée, sans ré-interviewer |
| 10 | wizard | Génère un script bash guidant un humain à travers une procédure manuelle |
| 11 | code-review (mattpocock) | Revue à deux axes séparés : Standards et Spec |
| 12 | codebase-design | Vocabulaire des modules "profonds" vs "superficiels" |
| 13 | diagnosing-bugs | 6 phases centrées sur la construction d'une boucle de rétroaction fiable |
| 14 | improve-codebase-architecture | Scanne le code pour proposer des refontes ciblées, en rapport visuel |
| 15 | to-tickets | Découpe une spec en tickets verticaux avec dépendances explicites |
| 16 | triage | Fait avancer bugs/PR externes à travers une machine à états de triage |
| 17 | wayfinder | Planifie un effort énorme et flou comme une carte de décisions |

---

## Bilan de la catégorie 00-orchestration (45 skills, parties 1 à 3)

Cette catégorie complète couvre tout le cycle de vie d'un travail piloté par agent IA : découvrir l'intention réelle (`interview-me`, `grill-with-docs`), affiner une idée (`idea-refine`), spécifier (`spec-driven-development`, `to-spec`), découper (`planning-and-task-breakdown`, `to-tickets`), construire par petites tranches vérifiées (`incremental-implementation`, `tdd`), déboguer méthodiquement (`systematic-debugging`, `diagnosing-bugs`), relire (`code-review`, `receiving/requesting-code-review`), clôturer proprement (`finishing-a-development-branch`), et garder le code sain sur la durée (`improve-codebase-architecture`, `codebase-design`, `domain-modeling`). Deux "méta-couches" chapeautent le tout : `using-agent-skills`/`using-superpowers`/`ask-matt` (savoir quelle skill utiliser) et `context-engineering` (savoir quoi montrer à l'agent).

**Prochaine catégorie disponible dès que tu veux continuer :** `01-frontend-design` (design d'interface, composants React, 3D, taste/goût visuel...).
