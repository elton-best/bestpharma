# Cours — Catégorie 00-orchestration (Partie 2/3)

**Domaine :** Orchestration — sous-dossier `obra-superpowers` (14 skills).
**Public visé :** quelqu'un qui ne connaît rien aux "agent skills" et veut comprendre, puis utiliser, chaque skill.

> Fil rouge de ce lot : ces 14 skills forment ensemble un **cycle de développement complet et discipliné** — de l'idée (brainstorming) jusqu'à la fusion de la branche (finishing-a-development-branch) — en passant par les tests (TDD), le débogage (systematic-debugging), la revue de code (donner et recevoir), et le travail en parallèle via des sous-agents.

> Comment utiliser ce cours : pour chaque skill, lis d'abord **C'est quoi** et **Quand l'utiliser** pour reconnaître la situation, puis étudie le **Comment ça marche** étape par étape, suis l'**Exemple guidé** comme si tu le faisais toi-même, mémorise les **Pièges fréquents**, et termine par la **Checklist de sortie** et le mini-exercice **À toi de pratiquer**. C'est cet exercice qui transforme la lecture en compétence.

---

## 1. `brainstorming`

### C'est quoi
La toute première étape obligatoire avant tout travail créatif : transformer une idée en design validé, **avant** d'écrire la moindre ligne de code.

L'erreur la plus coûteuse en développement, ce n'est pas d'écrire du mauvais code — c'est d'écrire du bon code pour la mauvaise chose. Un bouton parfaitement codé mais inutile vaut zéro. Cette skill impose donc un sas obligatoire entre l'idée et le code : on réfléchit, on propose, on fait valider — et seulement ensuite on construit. Le design produit ici n'est pas un document de 20 pages : c'est une description assez précise pour que l'implémentation devienne ensuite une simple exécution, sans décision importante restante.

### Quand l'utiliser
Avant de créer une fonctionnalité, un composant, ou de modifier un comportement existant — littéralement toujours, en amont de tout travail créatif.

Y compris pour les "petites" demandes : c'est justement sur les changements qui semblent simples ("ajoute juste un bouton") que les suppositions implicites font le plus de dégâts — quel bouton, où, qui clique dessus, que se passe-t-il ensuite ? Si tu ne peux pas répondre à ces 4 questions, il faut un design, même en 3 phrases.

### Comment ça marche — 3 chemins selon l'ampleur
1. **Spike** (question de faisabilité, "est-ce possible ?") → présenter la question en 2-3 phrases, obtenir un accord, tester au moindre coût, rapporter une recommandation (le code produit reste "jetable"). Le spike répond à une question, il ne construit rien de durable : son livrable, c'est une réponse ("oui, c'est possible, voici comment"), pas du code à garder.
2. **Bounded** (changement bien délimité sur du code déjà existant) → poser les questions qui comptent, présenter un design court **dans la conversation**, puis **s'arrêter et attendre un "oui" explicite** avant de coder. Le design tient en quelques phrases ou paragraphes : quoi, où, et ce qui change pour l'utilisateur.
3. **Architectural** (nouveau projet, nouveau sous-système, changement qui touche plusieurs composants) → processus complet : questions une à une, 2-3 approches proposées avec compromis, design présenté section par section avec validation à chaque étape, document de spec écrit et validé, puis passage à la skill `writing-plans`. Ici la cérémonie est lourde parce que l'enjeu est lourd : une erreur d'architecture coûte des semaines.

**Règle absolue :** dans les trois cas, une porte de validation humaine existe avant toute implémentation. La taille de la cérémonie change ; la porte de validation, jamais.

Choisir le bon chemin : en cas de doute, on commence par le chemin le plus léger et on monte en gamme si la complexité l'exige (voir pièges). Un spike qui révèle un vrai problème d'architecture devient un architectural — c'est normal et prévu.

### Exemple concret
Demande : "ajoute un bouton like." C'est "bounded" si le flux d'interactions existe déjà dans l'app. On propose en 3 phrases "j'ajoute un bouton, un compteur, une route API" → on attend le "oui" → seulement là on code.

### Exemple guidé, pas à pas
Demande : "les utilisateurs veulent partager leurs articles".
- **Classification** : nouveau sous-système (liens publics, métadonnées sociales, permissions) → chemin **architectural**.
- **Questions une à une** : partage vers où (copier-coller de lien ? réseaux sociaux ?) → "copier le lien + aperçu sur les réseaux". Faut-il des liens privés avec expiration ? → "non, version 1 : liens publics simples".
- **2-3 approches avec compromis** : A) route publique + balises meta statiques (simple, rapide, pas de suivi) ; B) service de liens courts interne (suivi des clics, plus de travail) ; C) intégration d'un service tiers (rapide mais dépendance externe + coût). Recommandation : A pour la v1.
- **Design section par section** : route, permissions, balises meta, tests — chaque section validée avant de passer à la suivante.
- **Document de spec écrit et validé** → passage à `writing-plans`.
- Sans ce processus, on aurait codé directement l'option B (la plus "complète") et perdu une semaine sur du suivi de clics dont personne n'avait besoin en v1.

### Pièges fréquents
- Se dire "c'est trop simple pour avoir besoin d'un design" — c'est justement là que les mauvaises suppositions coûtent le plus cher.
- Présenter le design et commencer à coder dans la même réponse, sans attendre la validation.
- Ne jamais revoir la classification à la hausse si la complexité explose en cours de route (le sens ne va que "vers le haut" : bounded peut devenir architectural, jamais l'inverse).
- Confondre spike et implémentation : garder le code "jetable" d'un spike en production parce que "ça marche" — le spike n'a ni tests, ni gestion d'erreurs, ni revue.
- Valider un design qu'on n'a pas lu : un "oui" donné en diagonale n'est pas une validation, c'est un futur conflit.

### Checklist de sortie
Chemin choisi et justifié (spike / bounded / architectural) ; design présenté AVANT tout code ; "oui" explicite obtenu et noté ; si architectural : document de spec écrit et validé ; passage de relais clair vers la skill suivante (plans, implémentation).

### À toi de pratiquer
Prends ta prochaine "petite" tâche (moins d'une heure estimée) et classe-la : spike, bounded ou architectural ? Écris le design correspondant (2 phrases pour bounded, questions + approches pour architectural) et fais-le valider par quelqu'un avant de coder — même si "c'est évident".

### Pour dire que tu maîtrises cette skill
Tu sais distinguer spike / bounded / architectural sur un exemple donné, et tu sais que la porte de validation humaine est non négociable dans les trois cas.

---

## 2. `dispatching-parallel-agents`

### C'est quoi
La technique pour déléguer plusieurs tâches indépendantes à des agents spécialisés qui travaillent en parallèle, chacun avec un contexte isolé (ils n'héritent jamais de l'historique de la session principale).

L'idée de fond : un agent unique qui traite 5 problèmes à la suite mélange progressivement les contextes — la solution du problème 2 contamine le raisonnement sur le problème 4. En isolant chaque tâche dans son propre agent avec son propre contexte, chaque problème est traité avec un regard frais, et les 5 avancent en même temps au lieu de se succéder. C'est l'équivalent de confier 5 dossiers à 5 collègues plutôt que de les traiter seul l'un après l'autre en gardant tout en tête.

### Quand l'utiliser
Quand il y a 2 échecs ou plus qui sont **indépendants** (fichiers de tests différents, sous-systèmes différents) et qui peuvent être résolus sans état partagé.

**Ne pas l'utiliser** si les échecs sont liés entre eux (corriger l'un pourrait corriger l'autre), ou s'il faut comprendre l'état complet du système avant d'agir.

Test d'indépendance : "si je corrige A, est-ce que ça change quelque chose à B ?" Si la réponse est non dans les deux sens, les tâches sont indépendantes et parallélisables. Dans le doute, on traite d'abord le problème suspecté d'être la cause commune, puis on re-teste : ce qui reste cassé devient parallélisable.

### Comment ça marche
1. **Identifier les domaines indépendants** (regrouper les échecs par ce qui est cassé). Concrètement : lister les échecs, les regrouper par fichier ou sous-système, et vérifier l'indépendance de chaque groupe avec le test ci-dessus.
2. **Créer des instructions précises pour chaque agent** : périmètre exact, objectif clair, contraintes ("ne touche pas à autre chose"), format de sortie attendu. Chaque instruction doit être autonome : l'agent ne voit rien d'autre, donc tout ce dont il a besoin (fichiers concernés, commande de test, définition de "terminé") doit figurer dans sa consigne. Une bonne consigne fait 5-10 lignes ; une consigne d'une phrase est une loterie.
3. **Dispatcher en une seule fois** — plusieurs envois dans la même réponse s'exécutent en parallèle ; un envoi par réponse serait séquentiel. C'est un détail technique qui change tout : le parallélisme vient du fait d'envoyer ensemble, pas juste de "demander à plusieurs agents".
4. **Relire et intégrer** : vérifier que les corrections ne se contredisent pas, relancer la suite de tests complète. L'intégration est une étape à part entière, pas une formalité : deux corrections individuellement correctes peuvent se contredire (l'une renomme ce que l'autre utilise).

### Exemple concret
6 tests échouent dans 3 fichiers différents pour 3 raisons différentes → on dispatche 3 agents, chacun corrige un fichier, avec une consigne explicite "ne pas juste augmenter les timeouts, trouver la vraie cause."

### Exemple guidé, pas à pas
Situation : après une mise à jour, 4 échecs — 2 dans les tests d'authentification, 1 dans l'export CSV, 1 dans l'envoi d'emails.
- **Indépendance** : l'authentification partage peut-être une cause (les 2 échecs du même fichier), mais l'export et les emails sont des sous-systèmes séparés. Décision : 3 groupes (auth, export, emails).
- **Consignes** : agent 1 — "fichiers `auth.test.ts` + `auth.ts` uniquement, objectif : les 2 tests verts, contrainte : ne touche à aucun autre fichier, sortie : résumé des causes + diff" ; agent 2 — même format pour l'export ; agent 3 — même format pour les emails. Chacun reçoit aussi la commande exacte pour lancer ses tests.
- **Envoi unique** : les 3 partent ensemble.
- **Intégration** : à leur retour, on vérifie que personne n'a modifié de fichier partagé (ex : un utilitaire commun), puis on relance TOUTE la suite — pas seulement les 4 tests — pour détecter les régressions croisées.
- Résultat : 3 corrections en parallèle en 20 minutes au lieu d'1h30 en séquence, avec une vérification globale à la fin.

### Pièges fréquents
- Donner une instruction trop vague ("corrige tous les tests") → l'agent se disperse.
- Oublier de préciser les contraintes ("ne modifie pas le code de production") → l'agent refactore tout.
- Paralléliser des tâches dépendantes : les agents se contredisent et on perd plus de temps à démêler qu'on en a gagné.
- Sauter l'étape d'intégration ("chaque agent dit que c'est vert, donc c'est fini") — la suite complète reste obligatoire.
- Envoyer les agents un par un dans des réponses séparées en croyant paralléliser : c'est séquentiel, le gain est nul.

### Checklist de sortie
Groupes formés et indépendance vérifiée dans les deux sens ; chaque consigne contient périmètre + objectif + contraintes + format de sortie + commande de test ; envoi groupé en une fois ; aucune contradiction entre les retours ; suite de tests complète relancée et verte.

### À toi de pratiquer
La prochaine fois que tu auras 2 problèmes indépendants (même sans agent : 2 onglets, 2 bugs), écris pour chacun une consigne complète de 5-10 lignes (périmètre, objectif, contraintes, sortie attendue) avant de commencer. Observe combien de dispersions cette consigne t'évite.

### Pour dire que tu maîtrises cette skill
Tu sais écrire une instruction d'agent focalisée, autonome (avec tout le contexte nécessaire) et avec un format de sortie précis.

---

## 3. `executing-plans`

### C'est quoi
La méthode pour exécuter, dans une session dédiée, un plan d'implémentation déjà écrit, avec des points de contrôle de revue.

Le plan et l'exécution sont deux métiers séparés : planifier demande de la vision d'ensemble, exécuter demande de la discipline d'application. Mélanger les deux (réfléchir au plan tout en codant la tâche 2) produit des plans flous et du code approximatif. Cette skill sépare strictement les rôles : le plan existe, il est écrit, il a été validé — maintenant on l'exécute fidèlement, tâche par tâche, sans le réinventer en route. Si le plan s'avère mauvais, on s'arrête et on le corrige explicitement — on ne le contourne pas en silence.

### Quand l'utiliser
Quand un plan écrit existe déjà et doit être réalisé.

Prérequis non négociable : le plan doit exister sous forme écrite et avoir été relu (voir `writing-plans`). Exécuter un "plan" qui n'existe que dans la tête de quelqu'un, c'est exécuter du vent. Si le plan n'existe pas, on commence par l'écrire — on ne code pas "en s'inspirant" d'une vague idée.

### Comment ça marche
1. **Charger et relire le plan de façon critique** (dans un espace de travail isolé — voir `using-git-worktrees`), signaler tout de suite les points flous au partenaire humain. Cette relecture n'est pas une formalité : c'est la dernière chance de détecter un plan bancal avant d'y investir des heures. Tout point flou = question immédiate, pasMP d'interprétation personnelle.
2. **Exécuter les tâches une par une** : marquer "en cours", suivre chaque étape exactement, lancer les vérifications prévues, marquer "terminé". Le marquage explicite ("en cours" / "terminé") n'est pas décoratif : c'est ce qui permet, à tout moment, de savoir où en est l'exécution — y compris après une interruption.
3. **Terminer proprement** en enchaînant sur la skill `finishing-a-development-branch`. L'exécution ne se termine pas à la dernière tâche, elle se termine quand le travail est intégré proprement (tests, choix d'intégration, nettoyage).

### Exemple concret
Un plan de 6 tâches est chargé ; à la tâche 4, une instruction est ambiguë → on s'arrête et on demande une clarification, plutôt que de deviner.

### Exemple guidé, pas à pas
Plan de 4 tâches : ajouter une colonne "téléphone" au profil utilisateur (migration, API, interface, tests).
- **Chargement critique** : à la relecture, la tâche 3 dit "mettre à jour le formulaire" sans préciser lequel (il y a un formulaire profil ET un formulaire d'inscription). Point flou signalé immédiatement : "lequel des deux ?" Réponse : "les deux". Le plan est corrigé avant de commencer — 30 secondes qui évitent une tâche refaite.
- **Exécution** : T1 marquée "en cours", migration écrite, tests lancés, T1 "terminée". T2 pareil. T3 : en cours d'exécution, un doute sur le format du numéro (international ou local ?) → on s'arrête, on demande, on reprend avec la réponse. On ne devine pas.
- **Clôture** : T4 terminée, on enchaîne sur `finishing-a-development-branch` (tests complets, proposition d'intégration).
- Ce qui n'est PAS arrivé : deviner le formulaire, deviner le format, coder 2 heures sur de mauvaises suppositions.

### Pièges fréquents
- Continuer à forcer malgré un blocage au lieu de s'arrêter et demander de l'aide.
- Sauter une étape de vérification prévue dans le plan pour aller plus vite.
- "Améliorer" le plan en cours d'exécution sans le dire : si une étape du plan est mauvaise, on s'arrête et on la corrige explicitement — on ne la contourne pas silencieusement, sinon le plan et la réalité divergent et plus personne ne sait ce qui a été fait.
- Exécuter sans espace isolé et polluer la branche principale en cours de route.
- Marquer "terminé" sans avoir lancé la vérification prévue : la case ne se coche qu'avec la preuve.

### Checklist de sortie
Plan relu critiquement avant démarrage, points flous clarifiés ; chaque tâche marquée en cours puis terminée avec sa vérification ; aucun blocage contourné par une supposition ; enchaînement sur la clôture de branche effectué.

### À toi de pratiquer
Prends un plan existant (même une simple liste de courses) et exécute-le avec la discipline complète : marquage en cours/terminé, arrêt au premier point flou avec question explicite, vérification à chaque étape. Note à quel moment tu as été tenté de deviner — c'est là que la skill travaille.

### Pour dire que tu maîtrises cette skill
Tu sais qu'un blocage doit **toujours** interrompre l'exécution pour demander une clarification, jamais être contourné par une supposition.

---

## 4. `finishing-a-development-branch`

### C'est quoi
La procédure de clôture d'un travail terminé : vérifier les tests, puis proposer un choix clair pour intégrer le travail (fusion, pull request, ou attente).

La fin d'un chantier est un moment dangereux : on est pressé de "finir", on relâche l'attention, et c'est là qu'on fusionne du code non testé ou qu'on supprime la mauvaise chose. Cette skill transforme la clôture en procédure : d'abord la preuve que tout marche, ensuite un choix explicite d'intégration, jamais l'inverse. Elle protège aussi contre l'excès inverse — garder une branche terminée qui pourrit pendant 3 semaines parce que personne n'a décidé quoi en faire.

### Quand l'utiliser
Dès que l'implémentation est complète et que tous les tests passent.

C'est-à-dire : pas "quand on pense avoir fini", mais "quand la dernière tâche du plan est cochée avec sa vérification". Si les tests ne passent pas, on n'est pas à l'étape de clôture — on est encore en exécution ou en débogage.

### Comment ça marche
1. **Vérifier les tests** sur l'ensemble du projet — si ça échoue, on s'arrête là, pas de menu de choix. La vérification porte sur tout le projet, pas seulement sur les fichiers touchés : une modification locale peut casser un test lointain.
2. **Détecter l'environnement** (dépôt normal, ou espace de travail isolé/"worktree"). L'environnement détermine les options possibles : dans un worktree, il faudra aussi décider du sort de l'espace isolé.
3. **Déterminer la branche de base** (d'où le travail est parti) et la confirmer avant de fusionner. Fusionner vers la mauvaise branche (une vieille `develop` au lieu de `main`, ou l'inverse) est une erreur classique et pénible à réparer.
4. **Présenter exactement les options prévues** : fusionner localement, pousser et créer une pull request, ou garder la branche telle quelle pour plus tard. Attendre la réponse — la décision d'intégration appartient à l'humain, jamais à l'agent seul. L'agent propose, l'humain dispose : c'est une règle de sécurité, pas de politesse.
5. **Exécuter le choix**, puis **nettoyer l'espace de travail** si nécessaire (sans jamais forcer une suppression sur des fichiers non commités sans consentement explicite). Le nettoyage a ses propres règles : ce qui est commité peut être supprimé après accord, ce qui ne l'est pas demande une confirmation textuelle explicite.

### Exemple concret
Après une implémentation réussie, l'agent propose : "1. Fusionner vers main. 2. Pousser + créer une PR. 3. Garder la branche telle quelle." et attend la réponse plutôt que de fusionner tout seul.

### Exemple guidé, pas à pas
Fin de chantier : fonctionnalité "export CSV" terminée sur la branche `feat/export-csv`.
- **Tests** : suite complète lancée → 47/47 verts. Si un seul test échouait, on s'arrêterait ici, pas de menu.
- **Environnement** : travail dans un worktree isolé → il faudra le nettoyer après intégration.
- **Branche de base** : `main` (confirmée : c'est bien depuis `main` que la branche est partie).
- **Options présentées** : "1. Fusionner vers main localement. 2. Pousser + créer une PR pour relecture. 3. Garder la branche." L'humain choisit 2 (relecture par un collègue).
- **Exécution** : push + PR créée avec description. Le worktree est conservé jusqu'à la fusion de la PR, puis nettoyé — avec confirmation, car il contient aussi 2 fichiers d'essai non commités que l'humain veut garder.
- Sans cette procédure, l'agent aurait fusionné directement vers `main` sans relecture, et supprimé le worktree avec les fichiers d'essai dedans.

### Pièges fréquents
- Fusionner directement sans demander, en supposant que "c'est évident qu'ils veulent ça".
- Confondre une réponse vague ("ouais, débarrasse-toi-en") avec une confirmation explicite de suppression — seul le mot exact "discard" tapé par l'humain vaut confirmation.
- Proposer des options inventées au lieu des 3 prévues : le menu est fixe justement pour éviter les idées créatives dangereuses.
- Nettoyer avant l'intégration effective : on ne supprime l'espace de travail qu'une fois le travail intégré (ou explicitement abandonné), jamais "pour faire de la place" entre-temps.
- Oublier de vérifier la branche de base : fusionner vers la mauvaise branche transforme une clôture en incident.

### Checklist de sortie
Tests complets verts (chiffre exact noté) ; environnement détecté ; branche de base confirmée ; l'une des 3 options choisie explicitement par l'humain ; choix exécuté ; nettoyage fait sans perte de fichier non commité.

### À toi de pratiquer
La prochaine fois que tu termines quelque chose (même un document), applique la procédure : vérification complète d'abord, puis 3 options écrites noir sur blanc ("publier / envoyer en relecture / garder en brouillon"), puis exécution du choix explicite. Observe comme ce rituel élimine les fins de chantier floues.

### Pour dire que tu maîtrises cette skill
Tu sais citer les 3 options standards proposées et tu sais que la suppression du travail ne se fait jamais sans une confirmation textuelle explicite.

---

## 5. `receiving-code-review`

### C'est quoi
La bonne façon de recevoir un retour de revue de code : évaluation technique rigoureuse, jamais accord de façade ou implémentation aveugle.

Recevoir une revue est un exercice difficile : notre ego veut soit se défendre ("mon code est bien"), soit se soumettre ("tu as raison, je change tout"). Les deux sont mauvais. La bonne posture est celle d'un ingénieur qui audite des suggestions : chaque point est lu, compris, vérifié contre le code réel, puis accepté (avec implémentation testée) ou contesté (avec un contre-argument technique). Le relecteur a passé du temps à relire : on lui doit mieux qu'un "super, merci !" suivi d'un copier-coller aveugle.

### Quand l'utiliser
Chaque fois qu'un retour de revue est reçu, avant d'implémenter la moindre suggestion.

Sans exception : même si le relecteur est plus senior, même si on est pressé, même si "ça a l'air évident". C'est précisément quand on est pressé qu'on implémente aveuglément des suggestions fausses.

### Comment ça marche — le cycle en 6 étapes
1. **LIRE** le retour en entier sans réagir. Résister à l'envie de corriger le premier point avant d'avoir lu le dernier : les points sont parfois liés, et corriger dans l'ordre sans vue d'ensemble crée des incohérences.
2. **COMPRENDRE** — reformuler l'exigence avec ses propres mots (ou demander). "Tu veux dire que cette fonction devrait gérer le cas où la liste est vide, c'est ça ?" Cette reformulation prend 30 secondes et évite des heures de mauvaise implémentation.
3. **VÉRIFIER** contre la réalité du code existant. Le relecteur peut se tromper (il n'a pas tout le contexte) : on ouvre le code, on vérifie l'affirmation. Exemple : "cette fonction est appelée à chaque requête" — vraiment ? On cherche les appels avant d'optimiser.
4. **ÉVALUER** — est-ce techniquement pertinent pour CE projet précis ? Une suggestion excellente en général peut être mauvaise ici (sur-optimisation, complexité inutile, conflit avec les contraintes du projet).
5. **RÉPONDRE** — accord technique ou contre-argument raisonné (jamais "tu as totalement raison !" de façon automatique). Une bonne réponse contient soit "fait + test qui le prouve", soit "pas fait parce que + preuve technique".
6. **IMPLÉMENTER** un point à la fois, en testant chaque changement. Pas de lot global : chaque point implémenté est vérifié avant de passer au suivant.

Si un point du retour est flou : **s'arrêter et demander**, plutôt que d'implémenter les points clairs et deviner les points flous (car ils sont parfois liés).

### Exemple concret
Un relecteur dit "implémente un vrai suivi des métriques avec base de données et export CSV." Réponse correcte : chercher dans le code si cet endpoint est réellement utilisé quelque part → s'il n'est jamais appelé, proposer de le supprimer plutôt que de développer une fonctionnalité inutile (principe YAGNI).

### Exemple guidé, pas à pas
Retour reçu sur une pull request (3 points) : 1) "extrais cette condition en fonction nommée", 2) "ceci devrait utiliser un cache Redis", 3) "pourquoi ce `+1` ici ? je ne comprends pas".
- **LIRE** : les 3 points lus d'un coup, sans toucher au code.
- **Point 1** : COMPRENDRE ("rendre la condition lisible"), VÉRIFIER (oui, la condition fait 4 lignes imbriquées), ÉVALUER (pertinent, coût nul) → RÉPONDRE "fait" → IMPLÉMENTER + test relancé.
- **Point 2** : VÉRIFIER — la fonction est appelée une fois par jour par un cron. ÉVALUER : Redis pour un appel quotidien = sur-ingénierie. RÉPONDRE : contre-argument raisonné ("appel quotidien unique, le cache ajouterait une dépendance pour zéro gain mesurable — je propose de ne pas faire, dis-moi si tu vois un usage que j'ai raté").
- **Point 3** : flou pour le relecteur, clair pour nous (décalage d'index documenté ailleurs). RÉPONDRE : explication + ajout d'un commentaire dans le code pour le prochain lecteur.
- Résultat : 1 point implémenté, 1 contesté avec arguments, 1 clarifié — au lieu de "3 points appliqués aveuglément dont un Redis inutile".

### Pièges fréquents
- Répondre "excellent point !" par réflexe social plutôt que d'évaluer techniquement.
- Implémenter tout le lot de retours sans avoir clarifié les points ambigus en premier.
- Ne jamais oser contester un retour même quand il est techniquement faux pour ce projet précis.
- Prendre la revue comme une attaque personnelle et répondre sur la défensive au lieu de répondre techniquement.
- À l'inverse, tout accepter pour "ne pas faire de vagues" : la politesse n'est pas une stratégie d'ingénierie.

### Checklist de sortie
Retour lu en entier avant toute action ; chaque point reformulé et vérifié dans le code ; chaque point classé (fait / contesté avec arguments / clarifié) ; points flous clarifiés AVANT implémentation ; chaque implémentation testée individuellement.

### À toi de pratiquer
Prends le dernier retour qu'on t'a fait (sur du code, un texte, n'importe quoi) et rejoue le cycle : reformule chaque point en une phrase technique, vérifie-le, puis classe-le (d'accord / pas d'accord + pourquoi). Note combien de fois ton premier réflexe ("ok je change") aurait été une erreur.

### Pour dire que tu maîtrises cette skill
Tu sais reformuler une exigence de retour de revue en une phrase technique, et tu sais qu'un accord de façade est explicitement à bannir au profit d'une action ou d'un contre-argument factuel.

---

## 6. `requesting-code-review`

### C'est quoi
La bonne façon de **demander** une revue de code : envoyer une tâche à un "agent relecteur" avec un contexte précisément construit, jamais tout l'historique de la session.

Un relecteur noyé sous 200 messages d'historique fait une mauvaise revue : il ne sait plus ce qui est important, il commente au hasard, il rate l'essentiel. Un relecteur qui reçoit un dossier ciblé (ce qui a été fait, ce qui était attendu, les bornes exactes du changement) fait une revue chirurgicale. Préparer une demande de revue, c'est donc un investissement : 5 minutes de préparation = une revue 10 fois plus utile.

### Quand l'utiliser
Obligatoire après chaque tâche dans un développement piloté par sous-agents, après une fonctionnalité majeure, avant une fusion vers la branche principale.

En bref : dès que du code va vivre plus d'une journée ou être vu par d'autres, il mérite une relecture. Le seul code exempté : les brouillons explicitement jetables (spikes, prototypes) — et encore, mieux vaut le préciser ("pas besoin de revue, c'est jetable") que de le supposer.

### Comment ça marche
1. Récupérer les identifiants git (commit de départ, commit d'arrivée) qui délimitent le changement à relire. Ces deux bornes définissent exactement le périmètre : tout ce qui est entre les deux est à relire, tout ce qui est hors bornes est hors sujet.
2. Envoyer une tâche de relecture avec : description de ce qui a été construit, exigences attendues, et les deux commits. La description dit "quoi" ("fonction de recherche avec surlignage"), les exigences disent "quoi vérifier" ("performances sur 10 000 articles, gestion du cas vide, pas de régression sur la page d'accueil").
3. Agir sur le retour : corriger immédiatement les problèmes "critiques", corriger les "importants" avant de continuer, noter les "mineurs" pour plus tard, et contester si le relecteur a tort (avec des arguments techniques). Cette classification n'est pas décorative : elle décide de l'ordre du travail restant. Un "critique" bloque la suite ; un "mineur" ne doit jamais bloquer une livraison.

### Exemple concret
Après avoir terminé une tâche d'un plan, on envoie au relecteur : "voici ce que j'ai construit (fonction X), voici ce qu'elle devait faire (tâche 2 du plan), voici les deux commits à comparer." Le relecteur répond avec des points forts et des problèmes classés par gravité.

### Exemple guidé, pas à pas
Tâche terminée : "validation du formulaire d'inscription côté serveur".
- **Bornes** : commits `a1b2c3d` (avant) → `e4f5g6h` (après). On vérifie que le diff ne contient que le sujet (pas de fichier refactoré "au passage").
- **Dossier de relecture** : "Construit : validation Zod sur POST /signup (email, mot de passe 8+ caractères, confirmation). Attendu : rejeter les emails invalides, ne jamais logger le mot de passe, messages d'erreur en français. Commits à comparer : a1b2c3d..e4f5g6h."
- **Retour reçu** : 1 critique ("le mot de passe apparaît dans les logs d'erreur"), 1 important ("le message 'invalid input' n'est pas traduit"), 1 mineur ("nom de variable peu explicite").
- **Action** : critique corrigée immédiatement + test qui vérifie l'absence du mot de passe dans les logs ; important corrigé avant de continuer ; mineur noté pour la prochaine passe ; rien n'est ignoré en silence.
- Sans ce dossier ciblé, le relecteur aurait reçu 3 heures d'historique et aurait probablement raté le mot de passe dans les logs — le point le plus grave.

### Pièges fréquents
- Sauter la revue parce que "c'est simple."
- Ignorer un problème classé "critique" pour aller plus vite.
- Donner tout l'historique de la conversation au relecteur au lieu d'un contexte ciblé — cela gaspille de la place utile et brouille l'évaluation.
- Envoyer à relire sans exigences ("dis-moi ce que tu en penses") : sans critères, la revue part dans tous les sens.
- Inclure dans le diff des changements hors sujet : le relecteur perd du temps et rate l'essentiel — un diff propre fait partie de la demande.

### Checklist de sortie
Diff limité au sujet ; bornes git identifiées ; dossier complet (construit + attendu + bornes) ; retours classés critique/important/mineur ; critiques corrigées immédiatement ; aucun point ignoré sans justification.

### À toi de pratiquer
La prochaine fois que tu demanderas un avis (code ou non), prépare le dossier en 3 lignes : ce qui a été fait, ce qui était attendu, les bornes exactes à regarder. Observe la différence de qualité des retours par rapport à un vague "tu peux jeter un œil ?".

### Pour dire que tu maîtrises cette skill
Tu sais construire une demande de revue avec uniquement les informations nécessaires (pas tout l'historique), et tu sais classer les retours reçus en critique / important / mineur pour prioriser les corrections.

---

## 7. `subagent-driven-development`

### C'est quoi
Une méthode d'exécution de plan où chaque tâche est confiée à un **sous-agent frais** (nouveau contexte), avec une revue à deux étapes après chaque tâche, plutôt que de tout exécuter dans une seule session continue.

Le problème des longues sessions : le contexte s'accumule (décisions, essais, erreurs, corrections), et au bout d'un moment l'agent "oublie" le plan initial sous la masse des détails — il optimise localement au lieu de suivre la direction. Pire : une erreur commise à la tâche 1, jamais remise en cause, contamine silencieusement les tâches 2, 3, 4 qui construisent dessus. Le découpage en sous-agents frais casse ces deux mécanismes : chaque tâche repart d'un contexte propre, et chaque tâche est vérifiée avant que la suivante ne s'appuie dessus.

### Quand l'utiliser
Pour exécuter un plan d'implémentation composé de tâches indépendantes, dans la session courante.

Conditions : un plan écrit existe (voir `writing-plans`), les tâches sont réellement indépendantes ou ordonnées explicitement, et chaque tâche est assez substantielle pour mériter son propre cycle (implémentation + revue). Pour 2 micro-tâches de 5 minutes, le surcoût d'orchestration ne se justifie pas — on reste en session unique.

### Comment ça marche — la boucle par tâche
1. **Dispatcher l'implémenteur** : un sous-agent reçoit uniquement la tâche à faire, avec son contexte propre. Sa consigne contient tout le nécessaire (la tâche exacte, les fichiers concernés, les critères de succès, les contraintes) et rien de superflu (pas l'historique des 3 heures précédentes).
2. **Traiter son rapport** de fin de tâche. Le rapport dit ce qui a été fait, ce qui a été testé, et ce qui reste douteux. On le lit vraiment : un rapport qui dit "tout est bon" sans preuve est un rapport à vérifier, pas à croire.
3. **Réviser la tâche** (souvent via un autre sous-agent relecteur, pour garder un regard neuf). Le relecteur reçoit le diff + les critères, pas l'historique de l'implémenteur — sinon il hérite de ses angles morts.
4. **Boucle de correction** si des problèmes sont trouvés — jusqu'à ce que la tâche soit propre. Chaque boucle reste bornée : si 3 corrections échouent, on remet en cause la tâche elle-même (ou le plan), pas la persévérance.
5. **Clore la tâche** puis passer à la suivante. La clôture est explicite (marquage + résumé en une ligne) : c'est elle qui permet de reprendre le chantier après une interruption sans tout relire.
Une revue finale globale a lieu une fois toutes les tâches terminées, avant la clôture complète du travail (`finishing-a-development-branch`).

### Exemple concret
Un plan de 5 tâches : chaque tâche est confiée à un nouveau sous-agent qui ne connaît que cette tâche précise, avec relecture après chacune — cela évite qu'une erreur de la tâche 1 "contamine" silencieusement le raisonnement des tâches suivantes.

### Exemple guidé, pas à pas
Plan : page de profil utilisateur (T1 migration, T2 API, T3 interface, T4 tests).
- **T1** : sous-agent frais avec consigne complète → rapport "migration créée, testée en local" → relecteur (autre agent) vérifie le diff → propre → T1 clôturée ("migration téléphone, vérifiée").
- **T2** : nouveau sous-agent frais (il ne sait rien de T1 sauf ce qui est écrit dans le plan + le résumé de clôture) → implémente l'API → rapport → relecture → le relecteur trouve un cas non géré (numéro vide) → boucle de correction → propre → clôturée.
- **T3, T4** : même rituel. À la fin, revue globale : le flux complet est testé de bout en bout (créer → afficher → modifier le téléphone).
- **Contamination évitée** : si T2 avait mal géré les numéros vides et qu'on avait enchaîné sans revue, T3 aurait construit son interface sur une API buggée — et le bug n'aurait été découvert qu'à la fin, quand 3 couches sont emmêlées.

### Pièges fréquents
- Laisser un sous-agent hériter de tout l'historique de la session (cela va à l'encontre du principe d'isolation qui garantit un regard neuf).
- Passer à la tâche suivante sans revue de la précédente.
- Faire relire par le même agent qui a implémenté : il relit avec ses propres angles morts — le relecteur doit être frais lui aussi.
- Des consignes incomplètes ("fais la tâche 3") qui forcent l'agent à deviner le contexte : l'isolation n'excuse pas le flou, elle l'interdit.
- Oublier la revue globale finale : 5 tâches individuellement propres peuvent mal s'emboîter — le test de bout en bout reste obligatoire.

### Checklist de sortie
Chaque tâche a eu son agent frais + sa relecture par un regard neuf ; chaque boucle de correction est bornée ; chaque clôture est écrite en une ligne ; revue globale + test bout en bout effectués ; enchaînement sur la clôture de branche.

### À toi de pratiquer
Sur ton prochain travail en 3 étapes (même non-technique : rédiger, relire, envoyer), applique le rituel : exécute l'étape 1 "à frais" (sans relire tes notes précédentes), fais-la relire par quelqu'un d'autre (ou par toi demain matin), corrige, puis passe à l'étape 2. Note ce que la relecture a attrapé.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi un contexte isolé par tâche donne un résultat plus fiable qu'une seule longue session continue.

---

## 8. `systematic-debugging`

### C'est quoi
Une méthode stricte en 4 phases pour corriger un bug **en trouvant sa cause racine**, jamais en corrigeant seulement le symptôme visible.

La différence entre un débutant et un senior face à un bug ne se voit pas à la vitesse de frappe, elle se voit à la méthode : le débutant change des choses au hasard jusqu'à ce que "ça remarche" (et le bug revient dans 2 semaines, ou un autre apparaît à cause du changement aveugle) ; le senior refuse de toucher au code tant qu'il n'a pas compris. Cette skill est la formalisation de cette discipline : investigation d'abord, hypothèse unique ensuite, correction minimale enfin — avec un test qui prouve.

### Quand l'utiliser
Pour tout bug, échec de test, comportement inattendu — **surtout** sous pression temporelle, car c'est justement là que deviner devient tentant (et coûteux).

C'est contre-intuitif mais essentiel : quand le client attend et que la pression monte, "investiguer méthodiquement" semble lent — alors que c'est deviner qui fait perdre des heures. La skill s'applique donc avec d'autant plus de rigueur que l'urgence est grande. Seule exception : un contournement temporaire explicite pour rétablir un service en panne (rollback, feature flag) — mais il s'accompagne toujours d'un ticket "trouver la cause racine" traité juste après.

### Comment ça marche — la loi de fer : "aucune correction sans investigation de la cause racine d'abord"
1. **Phase 1 — Investigation** : lire les messages d'erreur en entier, reproduire le bug de façon fiable, vérifier les changements récents (git diff), et — sur les systèmes à plusieurs composants — ajouter des logs à chaque frontière de composant pour voir exactement où ça casse. "Reproduire de façon fiable" est la clé : un bug qu'on ne peut pas déclencher à volonté ne peut pas être vérifié comme corrigé. Le `git diff` et l'historique récent répondent à la question "qu'est-ce qui a changé depuis que ça marchait ?" — la réponse est la piste n°1 dans 80% des cas.
2. **Phase 2 — Analyse de motif** : trouver un exemple qui fonctionne et le comparer à ce qui est cassé, lister toutes les différences (même celles qui semblent insignifiantes). Si la page A marche et la page B — quasi identique — casse, la cause est dans leurs différences, pas dans leurs ressemblances. On liste tout, même "la page B a un champ en plus qui ne sert à rien" : les causes adorent se cacher dans les détails méprisés.
3. **Phase 3 — Hypothèse et test** : formuler une hypothèse unique et précise ("je pense que X cause le bug parce que Y"), tester avec le plus petit changement possible, ne jamais empiler plusieurs corrections à la fois. Une hypothèse à la fois, un changement à la fois : si on change 3 choses et que ça remarche, on ne sait toujours pas pourquoi — et on ne saura pas quoi refaire quand ça recassera.
4. **Phase 4 — Implémentation** : écrire un test qui échoue reproduisant le bug, corriger une seule chose, vérifier. **Règle des 3 essais** : si 3 corrections successives échouent, il faut arrêter et remettre en question l'architecture elle-même plutôt que de tenter une 4ème correction. Trois échecs signifient presque toujours qu'on soigne le symptôme au lieu de la cause — ou que le modèle mental du système est faux.

### Exemple concret
Un signe de code qui échoue en CI mais pas en local → au lieu de deviner ("c'est sûrement une histoire de timing"), on ajoute des logs à chaque étape (secrets disponibles ? variables d'environnement transmises ? clé présente dans le trousseau ?) pour voir précisément où la chaîne casse.

### Exemple guidé, pas à pas
Bug : "les utilisateurs ne reçoivent plus l'email de bienvenue depuis mardi".
- **Investigation** : message d'erreur du worker : `SMTP timeout after 30s`. Reproduction : envoi de test → même timeout, fiable à 100%. `git diff` depuis mardi : changement du fournisseur SMTP (lundi soir) + rien d'autre. Déjà, la piste n°1 est claire.
- **Motif** : les emails de réinitialisation (autre fournisseur, inchangé) partent normalement. Différence entre ce qui marche et ce qui casse : uniquement le fournisseur SMTP. Même les détails "insignifiants" sont notés (le timeout est de 30s pile = valeur par défaut, pas un hasard).
- **Hypothèse unique** : "le nouveau fournisseur bloque notre IP car le domaine n'est pas vérifié". Plus petit test possible : envoyer depuis la console du fournisseur (sans toucher au code). Résultat : échec aussi → ce n'est pas notre code, c'est le compte fournisseur.
- **Implémentation** : test automatisé "l'envoi de bienvenue aboutit en moins de 10s" (qui échoue aujourd'hui), vérification du domaine côté fournisseur, correction, test vert. Pas de changement de code applicatif, pas de "au cas où" ajouté.
- Sans la méthode, on aurait passé la journée à "optimiser" le code d'envoi qui n'était pour rien dans l'affaire.

### Pièges fréquents
- Se dire "petite correction rapide, j'investiguerai après" (c'est l'erreur numéro un que cette skill combat).
- Continuer à tenter des corrections après le 3ème échec au lieu de remettre en cause l'architecture.
- Changer plusieurs choses à la fois, rendant impossible de savoir laquelle a résolu le problème.
- Corriger le symptôme ("le bouton ne s'affiche plus, je le force en CSS") au lieu de la cause ("la donnée n'arrive plus à cause d'une route cassée") — le symptôme reviendra sous une autre forme.
- Ne pas écrire le test de reproduction : sans lui, impossible de prouver que le bug est corrigé — ni d'empêcher son retour dans 3 mois.
- Déboguer par téléphone-arabe ("on m'a dit que l'erreur venait de la base") au lieu de lire soi-même le message d'erreur en entier.

### Checklist de sortie
Bug reproduit de façon fiable ; changements récents examinés ; hypothèse unique formulée par écrit ; un seul changement testé à la fois ; test de reproduction écrit (échec avant, succès après) ; règle des 3 essais respectée ; cause racine nommée dans le résumé.

### À toi de pratiquer
Reprends le dernier bug que tu as corrigé "au feeling" : peux-tu nommer sa cause racine en une phrase ? Existe-t-il un test qui le reproduit ? Sinon, écris ce test maintenant (même après coup) — c'est l'exercice qui installe le réflexe pour le prochain bug.

### Pour dire que tu maîtrises cette skill
Tu sais citer les 4 phases dans l'ordre, et tu sais reconnaître le signal "3 corrections ont échoué" comme un signal d'architecture, pas de persévérance.

---

## 9. `test-driven-development` (TDD)

### C'est quoi
Écrire le test **avant** le code : le voir échouer, puis écrire le code minimal pour le faire réussir.

Le TDD inverse l'ordre habituel (code puis tests "quand on a le temps" — c'est-à-dire jamais, ou des tests qui ne prouvent rien car écrits pour passer). Ici le test vient d'abord et joue 3 rôles : il précise le besoin ("que doit faire ce code, exactement ?"), il prouve la correction ("le test passe, et il a déjà prouvé qu'il pouvait échouer"), et il protège l'avenir ("toute régression future fera échouer ce test"). Un code développé en TDD arrive avec son filet de sécurité intégré, pas ajouté après coup.

### Quand l'utiliser
Pour toute nouvelle fonctionnalité, correction de bug, refactorisation ou changement de comportement — quasiment toujours, sauf prototypes jetables ou fichiers de configuration.

La règle de décision : si le code va vivre plus d'une semaine ou être relu par quelqu'un, il mérite le cycle TDD. Les prototypes jetables et la configuration en sont exemptés — mais "jetable" doit être vrai (supprimé après usage), pas une excuse pour coder sans filet un code qui restera 2 ans.

### Comment ça marche — le cycle Rouge-Vert-Refactor
1. **ROUGE** — écrire un test minimal qui échoue, montrant ce qui devrait se passer. Le test décrit le comportement attendu dans le langage du métier ("un email vide est rejeté"), pas l'implémentation ("la fonction retourne false").
2. **Vérifier le ROUGE** — obligatoire : lancer le test et confirmer qu'il échoue **pour la bonne raison** (fonctionnalité manquante, pas une faute de frappe). Cette vérification prend 10 secondes et élimine toute une catégorie de faux tests (faute de frappe dans le nom, mauvais import, test qui ne teste rien).
3. **VERT** — écrire le code le plus simple possible pour faire passer le test, sans ajouter de fonctionnalités non demandées (pas de "au cas où"). Le code "vert" a le droit d'être laid ou naïf : sa seule mission est de faire passer le test. La beauté vient à l'étape suivante.
4. **Vérifier le VERT** — obligatoire : le test passe, et aucun autre test n'est cassé. Cette deuxième vérification protège contre les corrections qui en cassent d'autres — le filet complet doit rester vert, pas seulement le nouveau test.
5. **REFACTOR** — nettoyer le code (supprimer la duplication, améliorer les noms) en gardant tous les tests au vert. Le refactor est sans risque précisément parce que les tests surveillent : si un renommage casse quelque chose, on le sait en quelques secondes.

**La loi de fer :** aucun code de production sans un test qui a d'abord échoué. Si du code a été écrit avant le test, il faut le supprimer et recommencer — pas le "garder comme référence".

### Exemple concret
Bug : un email vide est accepté. Rouge : écrire un test `rejects empty email` qui échoue. Vert : ajouter la vérification `if (!data.email?.trim())`. Le test passe désormais, et ce test empêchera toute régression future.

### Exemple guidé, pas à pas
Fonctionnalité : "remise de 10% pour les commandes de plus de 100€".
- **ROUGE** : test `applique 10% au-delà de 100€` (panier à 120€ → total 108€) + test `pas de remise à 100€ pile` (cas limite, toujours tester les bornes). On lance : les 2 échouent (la fonction n'existe pas) — et on vérifie que c'est bien pour cette raison, pas à cause d'une coquille.
- **VERT** : `if (total > 100) total *= 0.9` — volontairement naïf, aucune fioriture. Les 2 tests passent, et toute la suite existante reste verte.
- **REFACTOR** : on extrait les constantes (`SEUIL_REMISE = 100`, `TAUX = 0.10`), on nomme la fonction explicitement. Tests relancés : toujours verts.
- Ce qu'on n'a PAS fait : gérer les devises, les coupons cumulables, les arrondis exotiques — rien de tout ça n'était demandé par un test. Si un besoin arrive, il arrivera avec son propre test rouge.

### Pièges fréquents
- Écrire le test après le code ("ça revient au même") — un test écrit après le code passe immédiatement, ce qui ne prouve rien : il n'a jamais démontré sa capacité à détecter le bug.
- Sur-ingénierie du code "vert" (ajouter des options non demandées par le test).
- Regrouper plusieurs comportements dans un seul test (un nom de test avec "et" dedans doit être scindé).
- Tester l'implémentation au lieu du comportement ("la fonction appelle `validate()`" au lieu de "l'email invalide est rejeté") : le premier casse à chaque refactor légitime, le second protège vraiment.
- Sauter la vérification du rouge ("je sais qu'il échoue") : 10 secondes économisées contre des faux tests qui dorment pendant des mois.
- Refactorer sans relancer les tests juste après : le refactor n'est sûr que sous surveillance continue.

### Checklist de sortie
Test écrit avant tout code ; échec constaté pour la bonne raison ; code minimal sans extras ; tout vert (nouveau + anciens tests) ; refactor effectué sous tests verts ; aucun code de production sans son test rouge préalable.

### À toi de pratiquer
Prends une micro-fonctionnalité (valider un code postal, formater un prix) et déroule UN cycle complet : rouge (avec vérification de la raison de l'échec), vert minimal, refactor. Chronomètre-toi : un cycle doit tenir en moins de 15 minutes.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi "voir le test échouer" est une étape obligatoire et non un détail optionnel, et tu peux dérouler un exemple Rouge→Vert→Refactor de bout en bout.

---

## 10. `using-git-worktrees`

### C'est quoi
S'assurer que le travail se déroule dans un espace isolé (un "worktree" git), pour ne jamais risquer de perturber la branche principale en cours de travail.

Un worktree, c'est une deuxième copie de travail du même dépôt, branchée sur une autre branche, dans un autre dossier. Concrètement : ton dossier principal reste sur `main`, propre et stable, pendant que le chantier (et ses essais, ses erreurs, ses fichiers temporaires) vit dans un dossier séparé. Quand le chantier est fini et vérifié, on l'intègre proprement — et le dossier principal n'a jamais été sali entre-temps. Pour un agent IA qui modifie des fichiers à grande vitesse, cette isolation n'est pas du luxe : c'est l'assurance contre "l'agent a cassé ma branche en explorant".

### Quand l'utiliser
Au démarrage d'un travail de fonctionnalité qui a besoin d'isolation, ou avant d'exécuter un plan d'implémentation.

En pratique : dès qu'un chantier dure plus d'une heure, touche à plus de 3 fichiers, ou est confié à un agent autonome. Pour une coquille d'une ligne sur `main`, le worktree serait disproportionné — pour tout le reste, c'est la règle.

### Comment ça marche
1. **Détecter si on est déjà dans un espace isolé** (via des commandes git spécifiques) — si oui, ne pas en recréer un. Empiler les isolations (un worktree dans un worktree) crée une confusion pire que l'absence d'isolation.
2. **Utiliser l'outil natif de la plateforme** en priorité s'il existe (il gère automatiquement le placement et le nettoyage). Les plateformes modernes (et les outils d'agents) proposent souvent leur propre isolation : elle est intégrée, nettoyée automatiquement, et comprise par le reste de la chaîne.
3. **Sinon, créer un worktree manuellement avec git**, en vérifiant d'abord que le dossier des worktrees est bien ignoré par git (pour ne jamais committer son contenu par erreur). Un worktree commité par accident, c'est un dépôt dans le dépôt — cauchemar garanti.
4. **Installer les dépendances du projet** automatiquement selon le langage détecté (Node, Python, Rust, Go...). Un worktree sans dépendances installées donne des faux échecs de tests qui font perdre un temps fou avant qu'on comprenne qu'il manque juste `npm install`.
5. **Vérifier une base de référence propre** en lançant les tests avant de commencer à coder. Cette base propre est le point de comparaison de tout le chantier : si un test échoue à la fin, on saura dire s'il échouait déjà au début (problème préexistant, pas de notre faute) ou si c'est nous qui l'avons cassé.

### Exemple concret
Avant de commencer une nouvelle fonctionnalité, l'agent vérifie qu'il n'est pas déjà isolé, crée `.worktrees/ma-fonctionnalite`, installe les dépendances, lance les tests, et confirme "espace de travail prêt, tests OK" avant de commencer.

### Exemple guidé, pas à pas
Chantier : "refonte du module de facturation" (gros, risqué).
- **Détection** : on est sur `main`, aucun isolement → il en faut un. Pas d'outil natif disponible → worktree manuel.
- **Préparation** : vérification que `.worktrees/` est ignoré par git (ajout au `.gitignore` + commit de cette seule ligne), création de `.worktrees/facturation` sur une nouvelle branche, installation des dépendances, lancement des tests → 2 tests déjà rouges AVANT de commencer (notés comme préexistants : importants pour ne pas se les attribuer à la fin).
- **Travail** : 3 jours de chantier, `main` reste intact et déployable pendant tout ce temps — un correctif urgent peut partir sans attendre la fin du chantier.
- **Fin** : tests du worktree verts (hors les 2 préexistants), relecture, intégration via `finishing-a-development-branch`, puis nettoyage du worktree avec confirmation.
- Sans isolation, le même chantier aurait laissé `main` dans un état intermédiaire instable pendant 3 jours, bloquant tout correctif urgent.

### Pièges fréquents
- Créer un worktree git manuel alors qu'un outil natif de la plateforme existe déjà pour ça (ça crée un état fantôme non géré).
- Oublier de vérifier que le dossier des worktrees est bien ignoré par git avant de le créer.
- Sauter l'installation des dépendances et déboguer pendant une heure des échecs qui viennent juste d'un `node_modules` vide.
- Ne pas noter l'état initial des tests : à la fin, impossible de distinguer "cassé par moi" de "déjà cassé avant".
- Multiplier les worktrees oubliés qui s'accumulent (5 chantiers en parallèle = 5 contextes à garder en tête = zéro chantier qui avance). Règle : un chantier actif à la fois, les autres sont clôturés ou abandonnés explicitement.
- Travailler "quand même un peu" sur `main` en parallèle "parce que c'est rapide" : c'est exactement ce que l'isolation devait empêcher.

### Checklist de sortie
Isolement vérifié avant de commencer (pas de double isolation) ; dossier ignoré par git ; dépendances installées ; tests de référence lancés et état initial noté ; `main` intacte pendant tout le chantier ; nettoyage confirmé après intégration.

### À toi de pratiquer
Sur ton prochain chantier (même petit), crée explicitement un espace isolé (branche ou worktree), note l'état des tests avant de commencer, et travaille uniquement dedans pendant 1 heure. À la fin, vérifie que ta branche principale est intacte. C'est le rituel complet en miniature.

### Pour dire que tu maîtrises cette skill
Tu sais pourquoi on vérifie une base de tests propre **avant** de commencer à coder, et pas seulement à la fin.

---

## 11. `using-superpowers` (méta-règle)

### C'est quoi
La règle fondamentale qui impose d'invoquer une skill pertinente **avant toute action**, y compris avant de poser une question de clarification.

C'est la skill la plus simple à énoncer et la plus difficile à respecter : avant de faire quoi que ce soit — répondre, coder, chercher, questionner — on se demande "existe-t-il une skill pour ça ?" et si oui, on l'invoque. Y compris quand la demande semble triviale. Surtout quand elle semble triviale : c'est précisément sur les "petites questions simples" qu'on improvise au lieu d'appliquer la méthode — et qu'on produit les pires réponses. Cette règle transforme les skills d'options en réflexes.

### Quand l'utiliser
Au début de chaque conversation ou tâche — c'est une règle de fond, pas une skill ponctuelle.

Concrètement : les 30 premières secondes de toute session consistent à scanner la situation ("de quoi s'agit-il ? quelle skill correspond ?") avant la première action. Ce scan devient vite automatique, comme regarder des deux côtés avant de traverser : au début on y pense, ensuite c'est un réflexe.

### Comment ça marche
- S'il y a ne serait-ce que 1% de chance qu'une skill s'applique, elle doit être invoquée — ce n'est pas négociable. Le seuil de 1% est volontairement absurde : il signifie "en cas de doute, on vérifie au lieu de supposer qu'il n'y a rien".
- **Priorité** : les skills de "processus" passent avant les skills d'implémentation. Exemple : "corrige ce bug" → `systematic-debugging` d'abord, puis les skills spécifiques au domaine concerné. La méthode avant la technique : d'abord comment travailler, ensuite quoi construire.
- "Construisons X" → `brainstorming` d'abord, puis les skills d'implémentation. Même logique : cadrer avant de construire.
- Les instructions explicites de l'utilisateur (fichiers de configuration du projet, demandes directes) priment toujours sur les skills, qui elles-mêmes priment sur le comportement par défaut. Ordre de préséance complet : demande explicite > skill applicable > comportement par défaut. Une demande explicite contraire à une skill s'exécute (c'est l'utilisateur qui décide), mais l'écart est signalé.

### Exemple concret
Une simple question "peux-tu vérifier ce fichier ?" est aussi une tâche : il faut d'abord vérifier si une skill s'applique, plutôt que de foncer directement dans le fichier.

### Exemple guidé, pas à pas
Demande : "pourquoi ma page est lente ?"
- **Sans la règle** : on ouvre le fichier, on devine ("c'est sûrement les images"), on optimise les images, et la page reste lente — parce que le vrai problème était une requête en boucle. 2 heures perdues sur une supposition.
- **Avec la règle** : scan initial — "lenteur" → skills candidates : débogage méthodique (`systematic-debugging`) avant toute hypothèse, puis skill de performance. On invoque le débogage : reproduction, mesures (onglet réseau : 47 requêtes identiques !), cause racine (boucle de re-rendu), correction ciblée, test.
- Le même réflexe sur une "simple question" ("c'est quoi cette erreur ?") : scan → skill de débogage applicable → investigation au lieu d'une réponse devinée.
- La règle a transformé 2 heures de devinettes en 20 minutes de méthode — et c'était pourtant "juste une petite question".

### Pièges fréquents
- Se dire "c'est juste une question simple, pas besoin de skill" — piège explicitement nommé dans cette skill.
- Vérifier les fichiers/le code avant de vérifier les skills disponibles.
- Invoquer la skill après avoir déjà agi ("j'ai codé, maintenant je vérifie la skill") : l'ordre compte — la skill cadre l'action, elle ne la décore pas après coup.
- Confondre "connaître les skills" et "les invoquer" : savoir qu'une skill existe sans l'ouvrir ne sert à rien — l'invocation signifie lire et appliquer, pas juste citer le nom.
- Appliquer la règle aux autres mais pas à soi : le réflexe vaut aussi quand on travaille sans agent — vérifier sa propre méthode avant d'agir.

### Checklist de sortie
Scan effectué avant la première action ; skill applicable invoquée (lue et appliquée, pas juste nommée) ; priorité processus-avant-implémentation respectée ; demande explicite traitée comme prioritaire avec écart signalé si besoin.

### À toi de pratiquer
Pendant une journée, avant chaque tâche (même "envoyer un email"), pose-toi la question à voix haute : "existe-t-il une méthode pour ça que je devrais appliquer ?" Note les 3 fois où la réponse était oui alors que tu t'apprêtais à improviser. C'est l'installation du réflexe.

### Pour dire que tu maîtrises cette skill
Tu sais citer au moins 3 des "pensées pièges" listées (ex : "c'est juste une question simple") et pourquoi elles sont fausses.

---

## 12. `verification-before-completion`

### C'est quoi
La règle qui interdit d'affirmer qu'un travail est "terminé", "corrigé" ou "qui passe" sans avoir exécuté fraîchement la commande de vérification correspondante et lu son résultat complet.

Le fossé entre "ça devrait marcher" et "ça marche" a englouti plus de projets que tous les bugs réunis. Cette skill bouche ce fossé avec une loi simple : toute affirmation de succès doit s'appuyer sur une preuve fraîche — une commande exécutée maintenant, dont on a lu la sortie en entier. Pas "je l'ai lancé hier", pas "l'agent dit que ça passe", pas "ça ressemble à du vert". Maintenant, en entier, lu.

### Quand l'utiliser
Avant tout commit, toute création de pull request, et à chaque fois qu'on s'apprête à affirmer un succès.

En pratique : chaque fois que tu écris ou t'apprêtes à dire "c'est fini", "c'est corrigé", "ça passe", "c'est déployé" — arrête-toi et demande-toi "quelle commande le prouve, et quand l'ai-je lancée pour la dernière fois ?" Si la réponse est "aucune" ou "il y a longtemps", la phrase est interdite jusqu'à vérification.

### Comment ça marche — la loi de fer
Aucune affirmation de succès sans preuve de vérification fraîche dans le même message. La procédure :
1. Identifier quelle commande prouve l'affirmation. "Les tests passent" → `npm test`. "Ça compile" → la commande de build. "C'est déployé" → l'URL de production qui répond. Chaque affirmation a sa commande ; si on ne sait pas laquelle, c'est qu'on ne sait pas ce qu'on affirme.
2. Exécuter la commande complète (pas partielle, pas une exécution précédente). Lancer tous les tests, pas seulement celui qu'on vient de corriger. Builder tout le projet, pas seulement le fichier modifié. Une vérification partielle prouve une partie, pas le tout.
3. Lire la sortie complète, vérifier le code de sortie, compter les échecs. "34/34 pass" se lit en entier, y compris les avertissements. Un test ignoré ("skipped") n'est pas un test passé : on le note.
4. Seulement alors, formuler l'affirmation — avec la preuve. "Tous les tests passent (34/34, exécutés à l'instant)" au lieu de "ça devrait être bon maintenant".

### Exemple concret
 "Les tests devraient passer maintenant."  [exécute `npm test`, voit "34/34 pass"] "Tous les tests passent (34/34)."

### Exemple guidé, pas à pas
Situation : un agent annonce "correction terminée, tout fonctionne".
- **Sans la skill** : on le croit, on commit, on déploie — et la production casse, parce que l'agent avait lancé les tests avant sa dernière modification.
- **Avec la skill** : on exige la preuve fraîche — "relance `npm test` maintenant et montre-moi la sortie". Résultat : 33/34, un test cassé par la "correction". On corrige vraiment, on relance, 34/34 lus en entier.
- Deuxième cas : un développeur dit "c'est déployé". Preuve exigée : ouvrir l'URL de production et montrer la nouvelle fonctionnalité qui fonctionne — pas le log de déploiement ("déployé" sans "qui répond", ça ne prouve rien).
- Troisième cas : un agent délégué rapporte "succès". On ne croit pas le rapport : on regarde le diff réel et on relance la vérification soi-même. La confiance se vérifie, surtout quand elle vient d'une délégation.

### Pièges fréquents
- Utiliser des mots comme "devrait", "probablement", "semble" — signaux d'alarme explicites de cette skill.
- Faire confiance au rapport de succès d'un agent délégué sans vérifier indépendamment (ex : regarder le diff réel).
- Confondre "le linter passe" avec "la compilation réussit" — ce ne sont pas la même vérification.
- Vérifier avant la dernière modification ("j'ai testé, puis j'ai juste renommé une variable") : la moindre retouche invalide la preuve — on re-vérifie après, toujours.
- Lire la sortie en diagonale : les échecs se cachent souvent au milieu d'une sortie majoritairement verte — on lit jusqu'au bout, on compte.

### Checklist de sortie
Affirmation formulée avec sa preuve (commande + résultat chiffré + fraîcheur) ; aucun mot flou ("devrait", "probablement", "semble", "confiant") ; sortie lue en entier jusqu'au bout ; vérification indépendante après toute délégation ; re-vérification après la moindre retouche.

### À toi de pratiquer
Relis tes 5 derniers messages (ou commits) contenant "fini", "corrigé", "ça marche" ou "c'est bon". Pour chacun, identifie la preuve qui l'accompagnait : commande, résultat, fraîcheur. Ceux sans preuve sont des affirmations interdites par cette skill — reformule-les honnêtement ("je pense que c'est fini, reste à lancer les tests").

### Pour dire que tu maîtrises cette skill
Tu sais repérer, dans une phrase donnée, les mots qui trahissent une absence de vérification réelle ("devrait", "je suis confiant").

---

## 13. `writing-plans`

### C'est quoi
Écrire des plans d'implémentation détaillés, en supposant que la personne qui va exécuter le plan n'a **aucun contexte** sur le projet — tout doit être explicite.

Un plan n'est pas une note pour soi ("tu sais, le truc habituel") : c'est un document qu'un inconnu — ou un agent frais sans aucun historique — doit pouvoir exécuter sans poser une seule question. Cette exigence de "zéro contexte supposé" est ce qui rend les plans robustes : si tout est explicite, il n'y a rien à deviner, donc rien à deviner de travers. Le corollaire : écrire un bon plan prend du temps (presque autant que l'exécution elle-même pour les tâches complexes), et ce temps est rentabilisé par une exécution sans friction ni aller-retour.

### Quand l'utiliser
Dès qu'une spec ou des exigences existent pour une tâche à plusieurs étapes, avant de toucher au code.

Le plan vient après la spec (qui dit quoi construire) et avant l'exécution (qui construit). Si la spec n'existe pas, on la écrit d'abord — planifier sur du flou produit un plan flou. Si la tâche tient en une seule étape, un plan formel est superflu — mais même là, écrire les 3 lignes "fichiers, commande, résultat attendu" prend 1 minute et évite les oublis.

### Comment ça marche
1. **Vérifier le périmètre** : si la spec couvre plusieurs sous-systèmes indépendants, il faut la découper en plans séparés. Un plan par chantier indépendant : mélanger deux chantiers dans un plan, c'est garantir que l'exécutant fera des allers-retours confus entre les deux.
2. **Cartographier la structure des fichiers** avant de définir les tâches : quels fichiers seront créés/modifiés, et la responsabilité de chacun. Cette carte se fait en lisant le code existant, pas en devinant : on ouvre les dossiers, on note les chemins exacts, on repère où vit chaque responsabilité.
3. **Dimensionner les tâches correctement** : une tâche est la plus petite unité qui porte son propre cycle de test et mérite une relecture par un regard neuf. Trop grosse ("implémenter l'authentification") : invérifiable. Trop petite ("écrire la ligne 12") : bureaucratique. La bonne taille : quelques minutes à 2 heures, avec un test qui la valide.
4. **Découper en étapes de 2-5 minutes** : "écrire le test qui échoue", "le lancer pour vérifier qu'il échoue", "implémenter le minimum", "relancer", "committer". Ce grain fin semble excessif sur le papier, mais c'est lui qui rend l'exécution mécanique — et donc délégable à un agent sans contexte.
5. **Bannir tout placeholder** : jamais de "TBD", "ajouter la gestion d'erreur appropriée" sans détail concret — chaque étape doit contenir le contenu réel, pas une description vague de ce qu'il faudrait faire. Un placeholder dans un plan, c'est une devinette léguée à l'exécutant : il devinera, et devinera parfois mal.
6. **Auto-relecture du plan** : vérifier que chaque section de la spec a bien une tâche correspondante, chasser les placeholders, vérifier la cohérence des noms de fonctions entre les tâches. Cette relecture se fait avec des yeux neufs si possible (une pause, ou une autre personne) : on relit son propre plan comme si on ne l'avait pas écrit.

### Exemple concret
Une tâche mal écrite : "Ajouter la validation appropriée" (placeholder interdit). Une tâche bien écrite montre le code exact du test, la commande exacte pour le lancer, le résultat attendu exact, et le code d'implémentation exact.

### Exemple guidé, pas à pas
Spec : "export CSV des utilisateurs (email, nom, date d'inscription)".
- **Périmètre** : un seul sous-système (export) → un seul plan.
- **Carte des fichiers** : `routes/export.ts` (nouveau, la route), `services/csv.ts` (nouveau, la génération), `tests/export.test.ts` (nouveau, les tests). Vérifié dans le repo : aucun fichier d'export n'existe, la structure `routes/` + `services/` est confirmée.
- **Tâches** (chacune avec son test) : T1 "test : GET /export renvoie un CSV avec les bonnes colonnes (rouge)" → T2 "implémentation minimale (vert)" → T3 "cas limite : 0 utilisateur → CSV avec en-têtes seuls" → T4 "cas limite : caractères spéciaux et accents".
- **Anti-placeholders** : au lieu de "gérer les erreurs proprement", T5 dit exactement : "si la requête échoue, renvoyer 500 avec `{error: 'EXPORT_FAILED'}` + test qui simule l'échec".
- **Auto-relecture** : chaque exigence de la spec a sa tâche ? Les noms `exportUsersCsv` sont identiques dans T1-T4 ? Aucun "TBD" ? Le plan passe ses propres contrôles avant d'être transmis.
- Résultat : un exécutant sans aucun contexte exécute en 2 heures, zéro question posée.

### Pièges fréquents
- Écrire "similaire à la tâche N" au lieu de répéter le code exact (l'exécutant peut lire les tâches dans le désordre).
- Utiliser des noms de fonction incohérents entre deux tâches différentes du même plan.
- Supposer du contexte ("comme d'habitude", "dans le fichier habituel") : chaque supposition est une question que l'exécutant devra poser — ou deviner.
- Des tâches sans test associé : une tâche sans vérification n'est pas terminée quand elle est codée, mais quand elle est prouvée — le test fait partie de la tâche.
- Oublier l'ordre d'exécution : les tâches sont numérotées et ordonnées par dépendances, pas simplement listées.
- Un plan qui décrit des intentions ("il faudra bien tester") au lieu des contenus ("le test X avec le résultat Y").

### Checklist de sortie
Zéro contexte supposé (test de l'inconnu : pourrait-il exécuter sans question ?) ; fichiers cartographiés avec chemins exacts ; tâches dimensionnées avec leur test ; zéro placeholder (recherche "TBD", "approprié", "etc." dans le plan) ; noms cohérents entre tâches ; auto-relecture effectuée (spec couverte, placeholders chassés).

### À toi de pratiquer
Prends une tâche de 30 minutes que tu dois faire demain et écris son mini-plan comme si c'était un inconnu qui allait l'exécuter : fichiers exacts, commandes exactes, résultat attendu exact. Demain, exécute-le à la lettre et note chaque endroit où tu as dû improviser — chacun est un trou dans ton plan.

### Pour dire que tu maîtrises cette skill
Tu sais repérer un placeholder interdit dans un plan donné, et tu sais pourquoi un plan doit supposer zéro connaissance préalable du projet chez l'exécutant.

---

## 14. `writing-skills`

### C'est quoi
La méta-skill qui explique comment créer ou modifier une skill elle-même — en appliquant les mêmes principes que le TDD, mais appliqués à l'écriture de règles pour agent IA.

Écrire une skill, c'est écrire des règles qu'un agent suivra sans supervision : la moindre ambiguïté sera exploitée (pas par malice, mais parce que l'agent choisit l'interprétation la plus facile). Cette skill enseigne donc l'écriture défensive de règles : description qui déclenche sans résumer, contenu économe en tokens, tests de la skill elle-même, et blindage explicite contre les contournements. C'est du TDD transposé : d'abord prouver que le problème existe (RED), puis écrire le minimum qui le résout (GREEN), puis durcir (REFACTOR).

### Quand l'utiliser
Pour créer une nouvelle skill, éditer une skill existante, ou vérifier qu'une skill fonctionne avant de la déployer.

Y compris pour modifier une skill existante : on ne "retouche" jamais une skill directement en production sans l'avoir testée, exactement comme on ne modifie jamais du code sans tests. Et pour auditer une skill tierce avant de l'adopter : la grille de cette skill (description, tokens, tests, blindage) sert de checklist d'évaluation.

### Comment ça marche — points clés
- **Trois types de skills** : technique (comment faire quelque chose), pattern (un modèle mental), référence (documentation/API). Le type détermine le contenu : une technique contient des étapes exécutables, un pattern contient des principes et des exemples, une référence contient des faits vérifiables — jamais l'inverse. Une référence qui donne des ordres ou une technique qui philosophe sont des skills ratées.
- **La description compte énormément** : elle doit décrire uniquement les **conditions de déclenchement** ("Use when..."), jamais un résumé du processus — sinon l'agent risque de suivre le résumé au lieu de lire la skill complète. C'est le champ le plus lu (à chaque décision de routage) et le plus mal écrit en général.
- **Efficacité en tokens** : préférer référencer une autre skill ou un `--help` plutôt que de répéter du contenu. Chaque token d'une skill est payé à chaque invocation : une skill de 5000 tokens invoquée 100 fois coûte 500 000 tokens. Référencer (`voir skill X`, `voir --help`) divise ce coût sans perdre d'information.
- **La loi de fer du TDD s'applique aussi ici** : on écrit d'abord un scénario de test qui échoue avec la skill absente ("RED"), puis on écrit la version minimale de la skill ("GREEN"), puis on referme les failles de raisonnement possibles ("REFACTOR"). Le test d'une skill, c'est une situation concrète + le comportement attendu de l'agent : "face à X, l'agent doit faire Y".
- **Blinder contre le contournement** : lister explicitement les excuses possibles ("rationalizations") et pourquoi elles ne tiennent pas, avec un tableau de "red flags" à surveiller. Les agents (comme les humains) rationalisent : "c'était urgent", "c'était évident", "juste cette fois". Chaque excuse anticipée et réfutée par écrit est une porte fermée.

### Exemple concret
Une mauvaise description de skill : "Utiliser pour exécuter des plans - dispatche un sous-agent par tâche avec revue de code entre les tâches" (résume tout le workflow, l'agent risque de ne jamais lire le fichier complet). Une bonne description : "Use when executing implementation plans with independent tasks in the current session" (dit uniquement quand l'utiliser).

### Exemple guidé, pas à pas
Besoin : créer la skill "vérifier les liens morts d'un site avant chaque livraison".
- **Type** : technique (des étapes exécutables : crawler, lister, vérifier, rapporter).
- **RED** : scénario de test — "sans la skill, l'agent déploie sans vérifier les liens ; avec la skill, il doit produire un rapport de liens avant de proposer le déploiement". On constate l'échec actuel (l'agent ne vérifie rien).
- **Description** : "Use when deploying or delivering a website, to verify no link is broken" — déclencheur seul, aucun résumé du processus.
- **GREEN** : version minimale — 5 étapes (lister les pages, extraire les liens, requêter chacun, rapporter les 404, bloquer la livraison si > 0), avec renvoi vers `curl --help` au lieu de documenter curl en entier (tokens économisés).
- **REFACTOR/blindage** : rationalisations anticipées — "le site est petit, pas besoin de vérifier" → réfuté ("les petits sites ont aussi des liens morts, et la vérification prend 2 minutes") ; "je l'ai fait la semaine dernière" → réfuté ("les liens meurent entre deux livraisons, la vérification est à chaque livraison"). Red flags : l'agent qui propose de déployer sans mentionner le rapport.
- **Test final** : on rejoue le scénario — l'agent produit le rapport et bloque une livraison avec 2 liens morts. La skill est déployée.
- Sans cette méthode, on aurait écrit une skill "vérifiez bien les liens svp" que l'agent aurait poliment ignorée.

### Pièges fréquents
- Écrire une description de skill qui résume le processus au lieu de ne décrire que le déclencheur.
- Documenter tous les détails d'une commande dans le SKILL.md au lieu de renvoyer vers `--help`.
- Ne prévoir aucune table de "rationalisations" anticipant les excuses qu'un agent pourrait se donner pour ne pas suivre la skill.
- Tester la skill uniquement dans le cas nominal : c'est dans les cas limites (demande vague, urgence, conflit avec une autre skill) que les contournements apparaissent — on teste là.
- Écrire une skill géante qui fait tout ("la skill qualité qui couvre tests, revue, déploiement et documentation") : une skill = un sujet. Au-delà, on découpe en plusieurs skills qui se référencent.
- Modifier une skill en production sans version : toute modification passe par test (RED/GREEN/REFACTOR), même "une petite clarification" — surtout les petites clarifications, qui changent souvent le comportement plus que prévu.

### Checklist de sortie
Type identifié et contenu adapté au type ; description = déclencheur seul (test : la description seule ne permet pas d'exécuter la skill) ; zéro duplication (références au lieu de copies) ; scénario RED écrit et constaté ; version GREEN minimale ; blindage (rationalisations + red flags) ; testé dans au moins un cas limite.

### À toi de pratiquer
Prends une habitude que tu voudrais imposer à ton agent ("toujours lancer les tests avant de dire fini", "jamais de secret dans le code") et écris-en une mini-skill complète : type, description (déclencheur seul !), 5 étapes, 2 rationalisations réfutées, 1 scénario de test. Puis teste-la : demande à un agent d'agir dans une situation couverte et observe.

### Pour dire que tu maîtrises cette skill
Tu sais distinguer une bonne description de skill (déclencheur seul) d'une mauvaise (résumé du processus), avec un exemple de chaque.

---

## Récapitulatif — Partie 2/3

| # | Skill | En une phrase |
|---|-------|----------------|
| 1 | brainstorming | Classe la demande (spike/bounded/architectural) et valide un design avant tout code |
| 2 | dispatching-parallel-agents | Délègue des tâches indépendantes à des agents en parallèle, contexte isolé |
| 3 | executing-plans | Exécute un plan déjà écrit, tâche par tâche, s'arrête si bloqué |
| 4 | finishing-a-development-branch | Clôture le travail : tests, puis menu de choix d'intégration |
| 5 | receiving-code-review | Évalue techniquement un retour de revue, jamais d'accord de façade |
| 6 | requesting-code-review | Envoie une demande de revue avec un contexte ciblé, jamais tout l'historique |
| 7 | subagent-driven-development | Une tâche = un sous-agent frais + revue à deux étapes |
| 8 | systematic-debugging | 4 phases pour trouver la cause racine avant toute correction |
| 9 | test-driven-development | Rouge → Vert → Refactor, jamais de code sans test qui a échoué avant |
| 10 | using-git-worktrees | Toujours travailler dans un espace isolé, jamais sur la branche principale |
| 11 | using-superpowers | Vérifier les skills disponibles avant toute action, même une question |
| 12 | verification-before-completion | Aucune affirmation de succès sans preuve d'exécution fraîche |
| 13 | writing-plans | Écrit des plans détaillés supposant zéro contexte préalable |
| 14 | writing-skills | La méta-skill pour créer/tester une skill selon la logique du TDD |

**Suite (partie 3/3) :** les 17 skills du sous-dossier `mattpocock-engineering` (triage, prototypage, migration, architecture, tickets, résolution de conflits Git...).
