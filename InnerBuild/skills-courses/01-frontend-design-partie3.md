# Cours — Catégorie 01-frontend-design (Partie 3/5)

**Domaine :** Frontend / design d'interface — sous-dossier `taste` (13 skills).
**Public visé :** quelqu'un qui ne connaît rien aux "agent skills" et veut comprendre, puis utiliser, chaque skill.

> Fil rouge de ce lot : toutes ces skills combattent le même problème — le rendu "générique IA" (le fameux "AI slop" : dégradés violets par défaut, cartes toutes identiques, ombres portées mécaniques, emoji comme icônes). Chacune propose soit une **direction esthétique précise** (brutaliste, minimaliste, doux...), soit un **moteur de qualité générale** (taste-skill), soit un outil complémentaire (génération d'images de référence, sortie complète sans troncature...).

---

## 1. `taste-skill` (le moteur de référence, v2)

### C'est quoi
La skill "anti-générique" la plus complète et la référence actuelle par défaut : elle lit le brief, déduit elle-même la bonne direction de design, et livre une interface qui n'a pas l'air "templatée."

### Quand l'utiliser
Pour des landing pages, portfolios, ou refontes — dès qu'on veut un résultat qui a du caractère.

### Comment ça marche
1. **Inférence du brief** : lire entre les lignes de la demande avant toute chose (secteur d'activité, ton visé, public).
2. **3 "molettes" de configuration** (les dials) qui pilotent le style final selon le brief.
3. **Carte brief → système de design** : associer automatiquement le type de projet à une direction visuelle cohérente.
4. **Architecture et conventions par défaut**, avec des **directives de correction de biais** — corriger les réflexes "par défaut" d'une IA qui produirait un résultat générique.
5. **Proactivité contextuelle** : proposer des idées adaptées au contexte plutôt que des choix génériques.
6. **Garde-fous performance et accessibilité.**
7. **Protocole "mode sombre"** dédié.
8. **Liste des "AI tells"** : les motifs reconnaissables d'un rendu généré par IA à bannir explicitement (dégradés violet/bleu par défaut, cartes toutes identiques avec icône + titre + texte, emoji comme icônes...).
9. **Vocabulaire de référence** de patterns que l'agent doit connaître, pour parler le même langage que les designers.
10. **Protocole de refonte** dédié pour les sites existants.
11. **Bibliothèque de blocs** qui s'enrichit progressivement.

### Exemple concret
Un brief "landing page pour une fintech B2B" est analysé : le ton attendu est "sérieux, digne de confiance" → la skill évite automatiquement les dégradés flashy et les emoji, privilégie une typographie institutionnelle et une palette sobre, sans que l'utilisateur ait eu à le préciser.

### Pièges fréquents
- Ignorer la phase d'inférence du brief et foncer directement dans le code.
- Reproduire un des "AI tells" explicitement bannis (carte avec icône + titre + description répétée 3 fois à l'identique).

### Pour dire que tu maîtrises cette skill
Tu sais citer au moins 3 "AI tells" à éviter (dégradé violet par défaut, cartes identiques, emoji en guise d'icônes) et expliquer pourquoi l'inférence du brief vient en premier.

---

## 2. `taste-skill-v1`

### C'est quoi
La version précédente de `taste-skill`, conservée uniquement pour les projets qui dépendent de son comportement exact — la v2 (`taste-skill`) est désormais la référence par défaut.

### Quand l'utiliser
Uniquement si un projet a besoin d'une compatibilité stricte avec le comportement de la v1 (sinon, préférer `taste-skill`).

### Comment ça marche
Structure similaire à la v2 mais antérieure : configuration de base, architecture par défaut, directives d'ingénierie du design, "créativité proactive" contre le rendu générique, garde-fous de performance, référence technique des "molettes", liste des "AI tells" interdits, arsenal créatif d'inspiration haut de gamme, paradigme de mise en page en "bento" animé, et checklist finale avant livraison.

### Exemple concret
Un projet ancien configuré spécifiquement pour la v1 doit continuer à utiliser `taste-skill-v1` pour ne pas casser sa cohérence visuelle existante, même si de nouveaux projets utiliseraient la v2.

### Pièges fréquents
- Utiliser la v1 par défaut sur un nouveau projet alors que la v2 (`taste-skill`) est recommandée.
- Mélanger des composants générés par la v1 et par la v2 dans le même projet (incohérence de conventions).

### Pour dire que tu maîtrises cette skill
Tu sais dans quel cas précis choisir la v1 plutôt que la v2 (compatibilité stricte avec un projet existant).

---

## 3. `gpt-tasteskill`

### C'est quoi
Un profil de design "niveau Awwwards" (récompenses de design web) très strict, centré sur l'ingénierie du mouvement avec GSAP (une librairie d'animation).

### Quand l'utiliser
Pour un site vitrine ou une landing page où l'animation et la mise en page doivent être du niveau d'une agence primée.

### Comment ça marche
- **Vraie randomisation pilotée par du code** (pas un hasard visuel superficiel) pour faire varier les mises en page.
- **Structure de page stricte AIDA** (Attention, Intérêt, Désir, Action) — un schéma classique de copywriting appliqué à la structure visuelle.
- **Typographie éditoriale large**, avec interdiction explicite des retours à la ligne sur 6 lignes (texte trop dense = mal aéré).
- **Grilles "bento" sans espace perdu** (gapless).
- **GSAP ScrollTrigger strict** : épinglage d'éléments au scroll, empilement de sections, animations liées au défilement.
- **Micro-images en ligne** dans le texte et **espacement de section massif** pour un rendu aéré et premium.

### Exemple concret
Une section "à propos" avec une grande citation encadrée d'une micro-image en ligne, et un titre qui reste épinglé à l'écran pendant que le contenu défile derrière lui (pattern de "pinning" GSAP).

### Pièges fréquents
- Laisser un bloc de texte s'étaler sur 6 lignes ou plus sans aération (explicitement banni).
- Utiliser une grille "bento" avec des espaces vides entre les blocs (elle doit être sans espace perdu).

### Pour dire que tu maîtrises cette skill
Tu sais citer la structure AIDA et expliquer ce qu'est le "pinning" au scroll avec un exemple.

---

## 4. `brutalist-skill`

### C'est quoi
Une direction esthétique précise : interfaces "brutalistes" qui fusionnent la typographie suisse imprimée avec l'esthétique militaire de terminal — grilles rigides, contrastes extrêmes, dégradation façon analogique.

### Quand l'utiliser
Pour des tableaux de bord riches en données, des portfolios, ou des sites éditoriaux qui doivent avoir l'air de "plans déclassifiés."

### Comment ça marche
- **Grilles rigides** (pas de mise en page fluide et arrondie).
- **Contraste extrême d'échelle typographique** (très grand vs très petit, sans étape intermédiaire).
- **Couleur utilitaire** (souvent noir/blanc + une couleur d'alerte type orange ou vert phosphorescent).
- **Effets de dégradation analogique** (grain, bruit, lignes de scan) pour évoquer un terminal ou un document imprimé usé.

### Exemple concret
Un dashboard de monitoring système avec une police monospace, des cadres nets, des libellés façon "CLASSIFIED — NIVEAU 3", et un léger effet de grain sur le fond, façon écran cathodique.

### Pièges fréquents
- Adoucir les angles ou ajouter des ombres douces "modernes" — ça contredit l'esthétique brutaliste voulue.
- Utiliser une palette de couleurs pastel — la direction impose une couleur utilitaire, pas décorative.

### Pour dire que tu maîtrises cette skill
Tu sais décrire à quoi ressemble une interface "brutaliste" avec au moins 3 caractéristiques visuelles précises.

---

## 5. `minimalist-skill`

### C'est quoi
Une direction esthétique opposée au brutalisme : interfaces éditoriales épurées, palette monochrome chaude, contraste typographique, grilles "bento" plates.

### Quand l'utiliser
Pour un site qui doit respirer la simplicité et le raffinement, sans dégradés ni ombres marquées.

### Comment ça marche
- **Palette monochrome chaude** avec des tons pastel discrets — jamais de dégradés.
- **Contraste typographique** comme seul outil de hiérarchie visuelle (taille et graisse, plutôt que couleur ou effets).
- **Grilles "bento" plates** : des blocs nets, sans profondeur ni ombre lourde.
- **Interdiction explicite** des dégradés et des ombres portées marquées.

### Exemple concret
Une page "à propos" avec un fond crème uni, un très grand titre en noir, un sous-titre en gris chaud discret, et des blocs d'information nets sans aucune ombre — la hiérarchie vient uniquement de la taille du texte.

### Pièges fréquents
- Ajouter une ombre portée "pour donner du relief" — c'est explicitement interdit par cette skill.
- Utiliser un dégradé de couleur, même léger.

### Pour dire que tu maîtrises cette skill
Tu sais citer les 2 interdits explicites de cette skill (dégradés, ombres lourdes) et par quoi ils sont remplacés (contraste typographique).

---

## 6. `soft-skill`

### C'est quoi
Enseigne à concevoir "comme une agence haut de gamme" : polices, espacements, ombres, structures de cartes et animations précises qui donnent une impression de produit "cher" plutôt que générique.

### Quand l'utiliser
Pour donner à un site une impression de qualité premium, avec une direction douce (par opposition au brutalisme).

### Comment ça marche
- **Polices, espacement et ombres définis précisément** — pas de valeurs par défaut du framework CSS utilisé.
- **Structures de cartes soignées** avec une hiérarchie claire.
- **Chorégraphie de mouvement** de niveau "Awwwards" : les animations sont pensées comme un tout cohérent, pas ajoutées au hasard.
- **Blocage des défauts génériques** : cette skill liste explicitement ce qui rend un design "IA" reconnaissable et bon marché, pour l'empêcher.

### Exemple concret
Une carte produit avec une ombre très légère et diffuse (jamais une ombre dure), un espacement interne généreux, et une micro-animation d'apparition douce au survol — plutôt qu'une carte avec bordure nette et ombre dure par défaut du framework CSS.

### Pièges fréquents
- Garder les ombres et espacements par défaut d'un framework CSS (Bootstrap, Tailwind non personnalisé) au lieu de les redéfinir précisément.
- Ajouter des animations décoratives non coordonnées entre elles.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi les valeurs par défaut d'un framework CSS ne suffisent pas pour un rendu "haut de gamme."

---

## 7. `stitch-skill`

### C'est quoi
Une skill de système de design sémantique spécifique à l'outil "Google Stitch" : elle génère un fichier `DESIGN.md` normalisé pour que d'autres agents respectent des standards anti-génériques de façon cohérente.

### Quand l'utiliser
Quand on travaille avec Google Stitch et qu'on veut un système de design documenté, exploitable par d'autres agents.

### Comment ça marche
Le fichier `DESIGN.md` généré impose : une typographie stricte, une palette de couleurs calibrée, des mises en page asymétriques (plutôt que tout centré/symétrique par défaut), un **micro-mouvement perpétuel** (de très légères animations continues qui donnent vie à l'interface), et des performances optimisées matériellement (accélération GPU).

### Exemple concret
Le `DESIGN.md` généré pour un projet précise : "titres en X, texte en Y, palette calibrée à ces 5 couleurs précises, disposition asymétrique par défaut, micro-mouvement discret sur les éléments interactifs" — n'importe quel autre agent qui lit ce fichier applique la même direction.

### Pièges fréquents
- Générer un `DESIGN.md` trop vague pour être réellement suivi par un autre agent.
- Utiliser une mise en page parfaitement symétrique par défaut, ce que cette skill cherche justement à éviter.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer à quoi sert un fichier `DESIGN.md` généré par cette skill et pourquoi il vise en particulier l'asymétrie et le micro-mouvement.

---

## 8. `brandkit`

### C'est quoi
Une skill de génération d'images premium pour des kits de marque complets : planches de guidelines, systèmes de logos, decks d'identité, présentations d'univers visuel — dans des registres variés (minimaliste, cinématique, éditorial, luxe, gaming, tech...).

### Quand l'utiliser
Pour produire des visuels de présentation de marque (logo, identité, univers visuel) à un niveau professionnel.

### Comment ça marche
- **"ADN de style" de référence** : point de départ visuel cohérent selon le registre choisi (dark-tech, luxe, gaming...).
- **Conception de logo intentionnelle** : le logo porte un sens symbolique fort, pas une forme arbitraire.
- **Composition raffinée** et **typographie sparse** (peu de texte, très soigné).
- **Maquettes premium** ("mockups") et **direction artistique de l'image** poussée.
- **Grilles flexibles** adaptées au registre choisi.

### Exemple concret
Pour une marque de sécurité informatique, le registre "dark-tech" est choisi : palette sombre, typographie technique sparse, logo au symbolisme fort (un bouclier stylisé abstrait plutôt qu'un bouclier littéral), présenté sur des maquettes premium (carte de visite, écran).

### Pièges fréquents
- Choisir un registre visuel qui ne correspond pas au secteur d'activité de la marque.
- Surcharger la planche de guidelines avec trop de texte (la sparsité typographique est un principe clé ici).

### Pour dire que tu maîtrises cette skill
Tu sais citer au moins 3 registres visuels proposés (minimaliste, luxe, dark-tech, gaming...) et à quel type de marque chacun conviendrait.

---

## 9. `redesign-skill`

### C'est quoi
Une skill pour **améliorer** un site ou une appli existant(e) vers une qualité premium, sans casser ses fonctionnalités : elle audite d'abord, identifie les patterns "génériques IA", puis applique des standards haut de gamme.

### Quand l'utiliser
Pour une refonte visuelle d'un produit déjà en place, quel que soit le framework CSS utilisé.

### Comment ça marche
1. **Auditer le design actuel** avant toute modification — comprendre ce qui existe et pourquoi.
2. **Identifier les patterns génériques IA** existants (dégradés par défaut, cartes identiques...).
3. **Appliquer des standards haut de gamme** progressivement, **sans casser la fonctionnalité existante** — c'est une contrainte explicite et prioritaire.
4. Compatible avec n'importe quel framework CSS ou du CSS pur (vanilla).

### Exemple concret
Un site existant avec des boutons génériques et des cartes identiques est audité : on repère les patterns à corriger, on les améliore un par un (typographie, espacement, hiérarchie), en vérifiant à chaque étape que les boutons et formulaires fonctionnent toujours exactement pareil.

### Pièges fréquents
- Refondre visuellement sans auditer d'abord ce qui existe (on risque de perdre des décisions déjà pertinentes).
- Casser une fonctionnalité existante en modifiant le CSS ou le markup sans vérifier les dépendances.

### Pour dire que tu maîtrises cette skill
Tu sais citer l'ordre des 3 étapes (auditer → identifier les patterns génériques → améliorer sans casser) et pourquoi l'audit vient en premier.

---

## 10. `image-to-code-skill`

### C'est quoi
Une skill "image-first" pour Codex : avant de coder un site visuellement important, elle génère elle-même les images de design, les analyse en profondeur, puis implémente le site pour correspondre au plus près à ces images.

### Quand l'utiliser
Pour des tâches web où l'aspect visuel compte fortement, en particulier avec Codex.

### Comment ça marche — règles clés
- **Règle "image d'abord" obligatoire** : générer l'image de design avant de coder, jamais l'inverse.
- **Générer suffisamment d'images** : préférer des images larges et lisibles, spécifiques à chaque section, plutôt que des planches minuscules et compressées qui mélangent tout.
- **Ne jamais recadrer une ancienne image** : générer une image fraîche pour chaque nouvelle section ou vue de détail.
- **Analyse d'image approfondie** avant de traduire en code.
- **Éviter les "cards dans des cards dans des cards"** (imbrication excessive de conteneurs visuels).
- **Garder le hero propre, spacieux et lisible**, y compris visible sur un petit écran d'ordinateur portable.

### Exemple concret
Pour une landing page de 6 sections, la skill génère 6 images distinctes et lisibles (une par section), les analyse une par une, puis code chaque section pour correspondre fidèlement à son image — plutôt qu'une seule planche compressée difficile à interpréter.

### Pièges fréquents
- Recadrer une ancienne image générée au lieu d'en produire une nouvelle et fraîche pour une section différente.
- Empiler des cartes dans des cartes dans des cartes, ce qui alourdit visuellement l'interface.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi cette skill interdit de recadrer une ancienne image plutôt que d'en générer une nouvelle.

---

## 11. `imagegen-frontend-web`

### C'est quoi
Une skill de **direction artistique par génération d'images** pour des sites web/landing pages, avec une règle stricte : une image horizontale séparée par section (jamais une planche compressée qui mélange plusieurs sections).

### Quand l'utiliser
Pour produire des références visuelles de haute qualité pour une landing page ou un site marketing, que des développeurs ou un modèle de code pourront ensuite recréer fidèlement.

### Comment ça marche — règles clés
- **Une image par section, jamais compressée** : une page de 8 sections produit 8 images.
- **Moteur de variation combinatoire** : éviter que toutes les sections suivent le même schéma (texte à gauche / image à droite, systématiquement).
- **Liberté sur les images de fond**, CTA variés, échelles de hero variées (géant / moyen / minimaliste).
- **Fil narratif conceptuel** cohérent d'une section à l'autre, avec des "moments de second regard" (des détails qu'on remarque en y regardant à deux fois).
- **Palette unique et cohérente** sur toutes les images générées.
- **Règles anti-"AI slop"** et **discipline typographie d'abord**.

### Exemple concret
Pour une landing page de 8 sections, on ne génère jamais une seule planche qui les contient toutes : chaque section a sa propre image nette, avec des compositions variées (le hero est minimaliste, la section témoignages a une image de fond, la section pricing utilise une mise en page asymétrique) tout en gardant la même palette de couleurs partout.

### Pièges fréquents
- Compresser plusieurs sections dans une seule image (règle de sortie strictement interdite ici).
- Répéter le même schéma de composition (texte-gauche/image-droite) pour toutes les sections, ce qui donne un rendu monotone.

### Pour dire que tu maîtrises cette skill
Tu sais citer la règle de sortie stricte (une image par section) et pourquoi la variation de composition est imposée.

---

## 12. `imagegen-frontend-mobile`

### C'est quoi
L'équivalent mobile de la skill précédente : génération d'images de concepts d'écrans d'application premium, pour iOS, Android, ou cross-platform — génère uniquement des images, pas de code.

### Quand l'utiliser
Pour visualiser un flux d'écrans d'une application mobile avant de la coder.

### Comment ça marche — règles clés
- **Mode plateforme** : adapter les conventions visuelles selon iOS/Android/cross-platform.
- **Règle "écran d'abord" obligatoire** et **générer suffisamment d'écrans** pour couvrir le flux complet.
- **Ne jamais recadrer une ancienne image** (comme pour la version web).
- **"Bible de design de l'app"** : cohérence stricte multi-écrans (mêmes couleurs, mêmes composants d'un écran à l'autre).
- **Flux logique** : les écrans doivent s'enchaîner de façon cohérente (ex : un flux d'inscription complet, étape par étape).
- **Maquette de téléphone par défaut** : les écrans sont montrés à l'intérieur d'une maquette iPhone (ou équivalente) discrète et premium, avec le contenu de l'app qui reste le point focal.
- **Règles pour l'onboarding**, la **propreté du premier écran**, le respect des **zones sûres/système**, et la **navigation**.

### Exemple concret
Pour un flux d'inscription à une app, on génère 4 écrans cohérents (bienvenue, saisie email, vérification, confirmation), chacun dans une maquette iPhone discrète, avec la même palette et les mêmes composants d'un écran à l'autre.

### Pièges fréquents
- Générer des écrans incohérents entre eux (couleurs ou composants qui changent d'un écran à l'autre sans raison).
- Ignorer les zones sûres du téléphone (encoche, barre de statut) dans la composition.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi la cohérence multi-écrans est une règle centrale de cette skill, et pourquoi les écrans sont montrés dans une maquette de téléphone par défaut.

---

## 13. `output-skill`

### C'est quoi
Une skill "technique" à part (pas une direction esthétique) : elle force la génération de code **complète et non tronquée**, bannit les placeholders, et gère proprement les cas où la sortie dépasse la limite de tokens.

### Quand l'utiliser
Pour toute tâche qui exige une sortie exhaustive et non abrégée (un fichier de code complet, par exemple).

### Comment ça marche
1. **Bannir les patterns de placeholder** (`// ... reste du code ici`, `// TODO: implémenter`) qui laissent le code incomplet.
2. **Gérer proprement les découpages liés à la limite de tokens** : si la sortie doit être coupée en plusieurs messages, le faire de façon propre (pas au milieu d'une ligne de code), en indiquant clairement où reprendre.
3. **Forcer une génération de code complète** systématiquement, plutôt que de laisser l'IA "résumer" une partie du travail par défaut.

### Exemple concret
Sur un composant de 400 lignes, au lieu de répondre "... (reste du composant similaire) ...", la sortie complète est fournie, et si la limite de tokens est atteinte, la coupure se fait proprement entre deux fonctions complètes, jamais au milieu d'une ligne.

### Pièges fréquents
- Utiliser un commentaire placeholder ("// reste inchangé") pour gagner du temps — explicitement banni par cette skill.
- Couper la sortie au milieu d'une structure de code (une fonction à moitié écrite).

### Pour dire que tu maîtrises cette skill
Tu sais citer un exemple de "pattern de placeholder" banni par cette skill et pourquoi il pose problème.

---

## Récapitulatif — Partie 3/5

| # | Skill | En une phrase |
|---|-------|----------------|
| 1 | taste-skill | Le moteur de référence anti-générique (v2), infère le brief et bannit les "AI tells" |
| 2 | taste-skill-v1 | Version précédente, pour compatibilité stricte uniquement |
| 3 | gpt-tasteskill | Direction "Awwwards" avec animations GSAP strictes et structure AIDA |
| 4 | brutalist-skill | Grilles rigides, typographie suisse + esthétique terminal militaire |
| 5 | minimalist-skill | Monochrome chaud, contraste typographique, zéro dégradé/ombre |
| 6 | soft-skill | Design "agence haut de gamme" : ombres, espacements, mouvement précis |
| 7 | stitch-skill | Génère un DESIGN.md sémantique pour Google Stitch |
| 8 | brandkit | Images premium de kits de marque (logos, guidelines, identité) |
| 9 | redesign-skill | Audite puis améliore un design existant sans casser les fonctionnalités |
| 10 | image-to-code-skill | Génère l'image de design d'abord, puis code pour y correspondre |
| 11 | imagegen-frontend-web | Une image par section, jamais de planche compressée |
| 12 | imagegen-frontend-mobile | Écrans d'app cohérents multi-écrans, montrés en maquette téléphone |
| 13 | output-skill | Sortie de code complète, sans placeholder ni troncature |

**Suite (partie 4/5) :** le sous-dossier `refactoring-ui` (11 skills) — patterns concrets d'amélioration d'interface (Refactoring UI).
