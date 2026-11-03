# Cours — Catégorie 01-frontend-design (Partie 5/5)
## Format : Règles techniques 3D (3D Technical Rules)

**Domaine :** Frontend / effets visuels 3D — sous-dossier `threejs-3d-arsenal` (45 skills : `arsenal-index` + 44 effets).
**Public visé :** quelqu'un qui ne connaît rien aux "agent skills" et veut comprendre, puis utiliser, chaque skill.

> **Pourquoi un format différent ici :** contrairement aux skills précédentes (des principes de design à comprendre), les 44 skills de cet arsenal sont des **recettes techniques de portage** — chacune dit "voici comment reconstruire tel effet visuel précis à partir de son code source vérifié, sans l'approximer." Elles partagent toutes la même structure et les mêmes règles universelles. Ce cours se divise donc en deux parties : **les règles techniques communes** (à maîtriser une fois pour toutes, elles s'appliquent aux 44 effets), puis **le catalogue technique** des 44 effets, organisés par catégorie, avec pour chacun sa stack technique et ce qui le rend spécifique.

---

## PARTIE A — Les règles techniques universelles (`arsenal-index`)

### C'est quoi
`arsenal-index` est le point d'entrée de tout l'arsenal : il ne construit rien lui-même, il liste les 44 effets disponibles, explique les 2 façons de les utiliser, et surtout définit les **règles universelles** que chaque effet individuel doit respecter.

### Quand l'utiliser
En premier, avant de charger la skill d'un effet précis — c'est la table des matières de tout l'arsenal.

### Les 2 façons d'utiliser un effet de l'arsenal
1. **Le paquet npm (le plus rapide)** : `npm install @designcodeio/threeui`, puis `import { NomDuComposant } from "@designcodeio/threeui"` + sa feuille de style associée. Pour les composants "full-HTML" (pages complètes), il faut aussi copier les fichiers d'assets du paquet vers le dossier public du projet.
2. **Le portage depuis la source (sans dépendance)** : chaque skill individuelle liste ses fichiers source vérifiés dans le dépôt d'origine (`MengTo/ThreeUI`) — on les copie **à l'identique** et on adapte uniquement la "frontière d'accueil" (comment le composant s'intègre dans le projet cible), jamais le cœur du rendu.

**Alternative** citée : passer par un MCP dédié (21st.dev) ou la CLI shadcn pour prévisualiser un composant en direct avant de l'intégrer.

### Les 5 règles universelles — À CONNAÎTRE PAR CŒUR (elles s'appliquent aux 44 effets sans exception)

**Règle 1 — Performance.**
- Plafonner le "pixel ratio" à une valeur entre 1.5 et 2 maximum (au-delà, le rendu 3D consomme des ressources inutilement sur les écrans très haute définition sans gain visuel perceptible).
- Réduire le nombre de particules/la complexité géométrique sur mobile.
- Mettre en pause le rendu quand l'élément sort de l'écran ou que l'onglet est masqué (ne jamais faire tourner un moteur 3D pour rien).
- Ne monter (charger) qu'**un seul renderer à la fois**, en différé ("lazy-mount"), plutôt que de tout initialiser d'un coup.

**Règle 2 — Mouvement et accessibilité.**
- Toujours respecter `prefers-reduced-motion` : proposer un état statique de repli pour les personnes sensibles aux animations.
- Principe de sobriété : **un seul moment orchestré et marquant vaut mieux que des effets dispersés partout sur la page.**

**Règle 3 — Cycle de vie (lifecycle) — la règle la plus souvent oubliée.**
- Tout libérer proprement à la destruction du composant : les boucles d'animation (frames), les écouteurs d'événements, les observateurs (resize observers...), les géométries, les buffers, les textures, et les contextes WebGL eux-mêmes.
- Le conteneur parent doit avoir une taille définie et contrôler son débordement (`overflow`).
- Toujours vérifier : le redimensionnement de fenêtre, les écrans haute densité (Retina), le rendu mobile, la perte de contexte WebGL (ex : trop d'onglets 3D ouverts en même temps), et l'absence d'erreurs dans la console.

**Règle 4 — Adéquation à la marque.**
- Adapter systématiquement la palette de couleurs, la typographie, l'éclairage et la caméra aux tokens de design du projet cible (jamais garder le style de démonstration par défaut de l'effet tel qu'il existait dans son projet d'origine).

**Règle 5 — Le garde-fou le plus important : ne jamais approximer.**
- **Ne jamais reconstruire un shader GLSL, une passe de rendu, ou une géométrie de mémoire.** Il faut soit copier le code source vérifié à l'identique, soit installer le paquet officiel. C'est la règle qui justifie l'existence même de ces 44 skills : un effet visuel 3D complexe (un shader, en particulier) est extrêmement difficile à reproduire fidèlement "de tête" — la moindre approximation change complètement le rendu final.

### Exemple concret d'application des règles universelles
Pour intégrer l'effet `portal-field` sur une landing page : on vérifie d'abord que le pixel ratio est plafonné à 2, que l'animation se met en pause si l'utilisateur change d'onglet, qu'un état statique existe pour `prefers-reduced-motion`, que le composant libère bien son contexte WebGL au démontage (par exemple en changeant de page dans une single-page app), et que la palette de couleurs du shader est ajustée aux couleurs de la marque plutôt que de garder les couleurs de démo d'origine.

### Pièges fréquents
- Reconstruire un shader "à peu près" à partir d'un souvenir ou d'une capture d'écran au lieu de copier le fichier source vérifié — c'est la règle numéro 5, explicitement la plus critique.
- Oublier de libérer le contexte WebGL au démontage du composant, ce qui peut planter le navigateur après plusieurs navigations dans une application qui charge/décharge plusieurs effets 3D.
- Charger plusieurs renderers 3D simultanément au lieu d'un seul à la fois ("lazy-mount").

### Pour dire que tu maîtrises cette partie
Tu sais réciter les 5 règles universelles (performance, mouvement/accessibilité, cycle de vie, adéquation à la marque, ne jamais approximer), et tu sais expliquer pourquoi la règle "ne jamais approximer un shader" est la plus importante de toutes.

---

## PARTIE B — Catalogue technique des 44 effets

> Pour chaque effet : **stack technique exacte**, **ce que c'est visuellement**, et **la note technique clé** à retenir (souvent la contrainte la plus spécifique de cet effet précis, en plus des 5 règles universelles ci-dessus qui s'appliquent toujours).

### Catégorie 1 — Heros & landing pages complets (sources "Community")

| Effet | Stack | Ce que c'est | Note technique clé |
|---|---|---|---|
| **sylva-hero** | Source Community complète | Un hero de landing page immersif à thématique organique | Livré avec renderer, interactions et contrôles complets déjà assemblés — le portage se fait bloc par bloc, pas pièce par pièce |
| **kage-landing-page** | Full HTML + DOM/CSS + Three.js | Une page d'atterrissage complète avec une scène 3D intégrée | Nécessite de porter à la fois le HTML/CSS de mise en page ET le renderer Three.js comme un tout cohérent |
| **complete-shelf-landing-page** | Full HTML + DOM/CSS + Three.js r165 | Une landing page organisée autour d'une "étagère" 3D de produits/contenus | Version champ figé sur r165 : vérifier la compatibilité de version avant d'upgrader Three.js |
| **meng-to-sketchbook-landing-page** | Full HTML + DOM/CSS + JavaScript | Une landing page façon "carnet de croquis" interactif | Pas de Three.js ici — tout le rendu passe par du DOM/CSS/JS pur, plus léger |
| **bestsellers-book-showcase** | Full HTML + DOM/CSS + médias intégrés | Une vitrine de mise en avant de livres/produits avec médias | Contient des médias embarqués (images/vidéos) à copier avec le code, pas seulement le renderer |

### Catégorie 2 — Fonds animés et champs de particules ("Backgrounds & fields")

| Effet | Stack | Ce que c'est | Note technique clé |
|---|---|---|---|
| **portal-field** | Three.js r134 + Raw WebGL + Canvas 2D | Fonds ambiants type "champ de portail" — 5 variantes (portail, flux, nuage, cloche, convergence) regroupées dans un même collecteur | Un seul point d'entrée public (`PortalFieldCollection`) sélectionne la variante via une prop ; ne monter que le renderer choisi (lazy-load) pour ne pas allouer 5 contextes WebGL inutiles |
| **constellation-field** | Canvas 2D + Raw WebGL | Un champ d'étoiles/points connectés façon constellation | Combine 2 technologies de rendu différentes dans le même effet — bien identifier laquelle gère quoi avant de porter |
| **matrix-field** (nom interne : "Laser") | Raw WebGL | Un effet de champ façon "pluie de code" ou lignes laser | Nom du dossier différent du nom réel de l'effet ("Laser") — vérifier le nom exact dans le fichier source avant de chercher |
| **warp-field** | Three.js r128 | Un effet de distorsion/vitesse façon "warp" spatial | Figé sur Three.js r128 — une version ancienne, vérifier la compatibilité avant d'associer à un projet Three.js plus récent |
| **liquid-form** | Raw WebGL | Une forme fluide et organique animée | Pas de Three.js — WebGL brut, donc plus de contrôle mais plus de code de bas niveau à porter fidèlement |
| **uplink-loader** | Source Community complète | Un indicateur de chargement façon "connexion en cours" | Livré comme bloc Community complet (renderer + contrôles) |
| **star-portal** (aussi listé comme "shader buttons") | Raw WebGL + Canvas 2D + CSS | Un portail étoilé, utilisé aussi comme base pour des boutons à shader | Effet à double usage : fond OU bouton stylé, selon le contexte d'intégration |
| **predictive-arc** | Canvas 2D + Raw WebGL + Three.js r128 | Une trajectoire/arc animé de type prédictif (visualisation de données ou de mouvement) | Combine 3 technologies de rendu à la fois — le plus technique à porter de cette catégorie |
| **structure-flow** | Three.js r128 à r160 | Un flux structurel animé (représentation de connexions/dépendances en mouvement) | Plage de compatibilité de version large (r128-r160) — plus tolérant aux différentes versions de Three.js déjà installées |
| **landscape** | Source Community complète | Un paysage 3D animé en fond | Bloc Community complet |
| **crt** | Raw WebGL + Canvas 2D | Un effet d'écran cathodique rétro (scanlines, distorsion) | Effet de post-traitement pur — s'applique généralement par-dessus un autre rendu |
| **woven-cloth** | Three.js r160 | Une simulation de tissu tissé animé | Figé sur r160, une version plus récente de Three.js |
| **temple-night** | Source Community complète | Une scène nocturne de temple en 3D | Bloc Community complet |
| **japanese-tower** (nom interne : "Country Towers") | Three.js r149 + Canvas 2D | Une tour stylisée japonaise, partie d'une série "tours de pays" | Le nom réel de l'effet dans le code diffère du nom de dossier — vérifier avant de chercher les références |

### Catégorie 3 — Boutons & contrôles interactifs

| Effet | Stack | Ce que c'est | Note technique clé |
|---|---|---|---|
| **liquid-metal-button** | Raw WebGL 2 + DOM/CSS | Un bouton à effet de métal liquide au survol/clic | Nécessite WebGL 2 spécifiquement (pas WebGL 1) — vérifier la compatibilité navigateur cible |
| **rectangle-buttons** | DOM + CSS | Une famille de boutons rectangulaires stylés | Pas de WebGL du tout — CSS pur, le plus simple à porter de toute la catégorie boutons |
| **circle-buttons** | DOM + CSS | Une famille de boutons circulaires stylés | Comme ci-dessus, CSS pur |
| **skeuomorphic-toggle** | DOM/CSS + Three.js + Raw WebGL | Un interrupteur (toggle) à rendu réaliste façon "objet physique" | Combine CSS ET deux moteurs de rendu 3D à la fois pour un seul petit composant — disproportionné en complexité par rapport à sa taille visuelle, à anticiper dans l'estimation de temps de portage |
| **spark-badge** | Source Community complète | Un badge avec effet d'étincelle | Bloc Community complet |
| **animated-top-dock** | DOM + CSS + WebGL + Three.js r128 | Un dock (barre d'icônes) animé en haut d'écran | Combine DOM/CSS pour la structure et WebGL/Three.js pour les effets visuels des icônes |

### Catégorie 4 — Typographie & texte animé

| Effet | Stack | Ce que c'est | Note technique clé |
|---|---|---|---|
| **typography-vortex** | Canvas 2D | Un effet de texte pris dans un tourbillon animé | Canvas 2D pur — pas de WebGL, plus léger en performance |
| **article-headings** | DOM/CSS + Canvas 2D | Des titres d'articles avec un habillage animé | Combine mise en page DOM classique et rendu Canvas pour l'effet visuel |
| **gallery-heading** | Canvas 2D | Un titre animé pour une galerie | Canvas 2D pur |
| **globe-study** (nom interne : "Text Path Studies") | Canvas 2D | Études de texte suivant un tracé/chemin courbe | Le nom de dossier "globe" ne correspond pas au nom réel de l'effet — bien vérifier avant de chercher la doc |
| **semantic-bloom** | Canvas 2D + DOM/CSS | Un effet de "floraison" visuelle liée au sens du texte | Combine Canvas et DOM — la partie sémantique suggère une logique liée au contenu texte, pas seulement décorative |

### Catégorie 5 — Scènes et objets 3D

| Effet | Stack | Ce que c'est | Note technique clé |
|---|---|---|---|
| **energy-orb** (nom interne : "Globe") | Source Community complète | Un globe/orbe énergétique animé | Bloc Community complet, malgré le nom de dossier "energy-orb" |
| **brand-orbs** | Canvas 2D | Des orbes stylisés pour représenter une marque | Canvas 2D pur, pas de WebGL |
| **character-carousel** | DOM + CSS | Un carrousel de personnages/avatars | Pas de rendu 3D réel — un carrousel CSS avec effet de profondeur |
| **performance-gauges** | DOM + CSS | Des jauges de performance animées (type compteurs) | CSS pur — utile pour des dashboards sans coût de rendu 3D |
| **diagnostics-panel** | Canvas 2D | Un panneau de diagnostic avec visualisations animées | Canvas 2D pur |
| **wireframe-forms** | Canvas 2D | Des formes en fil de fer (wireframe) animées | Canvas 2D pur, effet visuel "plan technique" |
| **koi-studies** | Source Community complète | Des études animées de poissons koï | Bloc Community complet |
| **bookshelf** | Three.js r165 | Une étagère de livres en 3D | Figé sur r165 |
| **gallery** | Three.js r149 | Une galerie d'images/objets en 3D | Figé sur r149 — version plus ancienne que `bookshelf`, vérifier la compatibilité si les deux sont utilisés dans le même projet |
| **sylva-living-world** | Source Community complète | Un monde vivant organique animé, extension de l'univers "Sylva" | Bloc Community complet, à associer conceptuellement à `sylva-hero` |
| **engraved-certificate** | Canvas 2D + DOM/CSS | Un certificat avec effet de gravure | Combine Canvas pour l'effet de texture et DOM/CSS pour la mise en page du document |
| **elements** | Raw WebGL2 + Canvas 2D | Une scène représentant des éléments (visuellement abstraits ou physiques) | Nécessite WebGL 2 spécifiquement |

### Catégorie 6 — Effet "Pro" nécessitant un prompt complet séparé

| Effet | Stack | Ce que c'est | Note technique clé |
|---|---|---|---|
| **3d-paper** | Three.js r149 (bundlé) + GLSL custom + CanvasTexture | Un effet de papier plié/animé en 3D avec shader personnalisé | Catégorisé "Pro (site-only)" dans l'index : nécessite le prompt complet dédié (au-delà du simple SKILL.md) référencé dans le fichier `DECISIONS.md` du dépôt — c'est le seul effet de tout l'arsenal qui a ce statut particulier |

---

## Synthèse — comment utiliser ce catalogue en pratique

1. **Toujours commencer par `arsenal-index`** pour retrouver rapidement quel effet correspond au besoin (fond animé ? bouton ? typographie ?).
2. **Vérifier la stack technique** de l'effet choisi dans la table ci-dessus avant de s'engager : un effet en "DOM + CSS" pur (ex : `rectangle-buttons`) est un portage rapide ; un effet combinant 3 technologies de rendu (ex : `predictive-arc`) est un chantier bien plus lourd.
3. **Appliquer systématiquement les 5 règles universelles** de la Partie A, quel que soit l'effet choisi — elles ne sont jamais optionnelles.
4. **Vérifier la version de Three.js** exacte requise par l'effet (r128, r134, r149, r160, r165...) si le projet cible utilise déjà une version différente de Three.js pour un autre effet — plusieurs effets de ce catalogue sont figés sur des versions différentes, ce qui peut créer des conflits si on les combine dans un même projet sans précaution.
5. **Ne jamais improviser un shader** : si l'effet choisi utilise du GLSL personnalisé (comme `3d-paper` ou `liquid-form`), le code doit être copié depuis la source vérifiée, jamais reconstruit de mémoire.

---

##  Bilan de la catégorie 01-frontend-design (83 skills, parties 1 à 5)

Cette catégorie complète couvre tout le spectre du design d'interface : les fondations React et de performance web/mobile (partie 1), la direction artistique et l'identité visuelle — logos, thèmes, diagrammes, art génératif (partie 2), les "personas" anti-génériques et la génération d'images de référence (partie 3), les règles concrètes et chiffrées de mise en page héritées de *Refactoring UI* — hiérarchie, typographie, couleur, espacement (partie 4), et enfin l'arsenal technique d'effets 3D prêts à porter (partie 5).

**Catégorie suivante disponible dès que tu veux continuer :** `02-backend-docs` (backend, bases de données, documentation d'API...).
