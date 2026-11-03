# Cours — Catégorie 01-frontend-design (Partie 4/5)

**Domaine :** Frontend / design d'interface — sous-dossier `refactoring-ui` (11 skills).
**Public visé :** quelqu'un qui ne connaît rien aux "agent skills" et veut comprendre, puis utiliser, chaque skill.

> **Note sur cette partie :** à partir de maintenant, les cours sont plus détaillés — plus d'explications, plus de valeurs concrètes, plus d'exemples chiffrés — pour que tu puisses vraiment appliquer chaque règle sans avoir besoin d'aller relire le fichier source.
>
> Fil rouge de ce lot : ces 11 skills forment un **système cohérent et interdépendant**, inspiré du livre de référence *Refactoring UI* (Adam Wathan & Steve Schoger). Elles ne sont pas indépendantes : par exemple, `design-button-hierarchy` a besoin que `build-color-palette` ait déjà défini une palette de couleurs, et `apply-typography-scale` suppose que `establish-visual-hierarchy` a déjà déterminé ce qui doit ressortir. La 11ème skill, `meta-refactor-ui`, orchestre les 10 autres pour produire un audit complet d'une interface. Chaque skill fonctionne en mode **"évaluatif"** (elle peut dire PASS/FAIL sur un design existant) et souvent aussi **"génératif"** (elle peut produire une recommandation concrète).

---

## 1. `establish-visual-hierarchy`

### C'est quoi, en profondeur
Cette skill répond à une question simple mais souvent mal traitée : **dans quel ordre l'œil doit-il lire l'écran ?** La hiérarchie visuelle, c'est l'art de faire en sorte que l'élément le plus important attire l'attention en premier, le second en second, etc. — sans que l'utilisateur ait à réfléchir pour comprendre l'ordre de lecture.

Le piège le plus commun (et que cette skill corrige explicitement) est de croire que **la taille de police suffit** à créer une hiérarchie. En réalité, la hiérarchie se construit avec **quatre leviers combinés** : la taille, la graisse (bold/normal), la couleur (contraste), et — un levier souvent oublié — le **"de-emphasis"**, c'est-à-dire réduire l'importance visuelle de tout ce qui entoure l'élément principal plutôt que d'agrandir cet élément lui-même.

### Quand l'utiliser
Dès qu'un écran contient plusieurs informations et qu'il faut décider laquelle doit "gagner" visuellement — une page marketing, une carte de tableau de bord, un formulaire avec plusieurs boutons.

### La méthode pas à pas
**Étape 1 — Identifier l'élément principal.** Poser explicitement la question : quelle est la seule chose la plus importante sur cet écran ? Quelle action l'utilisateur doit-il faire ? Quelle information est critique ?

**Étape 2 — Évaluer la hiérarchie actuelle.** Vérifier le "poids visuel" de chaque élément selon 4 critères : la taille (plus grand = plus d'attention), la graisse (plus gras = plus important), la couleur (plus de contraste = plus visible), et l'espace blanc autour (plus il y a d'air autour d'un élément, plus il ressort).

**Étape 3 — Appliquer une hiérarchie multi-facteurs.** Ne jamais se reposer sur la taille seule. La méthode recommandée : utiliser la graisse (idéalement entre 600 et 700 en valeurs CSS `font-weight`) pour l'emphase, utiliser une échelle de gris pour désaturer ce qui est secondaire, et garder des tailles raisonnables plutôt que des écarts extrêmes.

**Étape 4 — Désaturer les concurrents.** Si l'élément principal ne ressort toujours pas assez, la solution n'est presque jamais "l'agrandir encore" — c'est de réduire le contraste de tout ce qui l'entoure : adoucir les couleurs du contenu secondaire, retirer des arrière-plans inutiles.

### Critères PASS /  Critères FAIL
**PASS :** l'élément le plus important a le poids visuel le plus fort ; la hiérarchie combine graisse et couleur, pas seulement la taille ; les éléments environnants sont volontairement atténués ; il existe un chemin de lecture clair primaire → secondaire → tertiaire.

**FAIL :** on se repose uniquement sur la taille de police ; tout est mis en avant de façon égale ; les éléments critiques sont "noyés" dans le reste ; des éléments décoratifs entrent en compétition visuelle avec le contenu important.

### Deux patterns concrets à retenir
**Hero de page marketing :**
- Titre H1 : 48px, graisse 700, couleur foncée → élément **primaire**
- Bouton CTA : 16px, couleur pleine de la marque → élément **secondaire**
- Texte de description : 16px, graisse 400, gris → élément **tertiaire**

**Carte de tableau de bord :**
- Métrique chiffrée : 32px, graisse 700 → **primaire**
- Libellé de la métrique : 14px, graisse 400, gris → **secondaire**
- Lien d'action : simple lien texte en couleur de marque → **tertiaire**

### Les 4 anti-patterns les plus fréquents
| Anti-pattern | Pourquoi ça échoue | Comment corriger |
|---|---|---|
| Le logo est plus grand que le titre | La marque prend le pas sur le message | Réduire le logo, augmenter le titre |
| Titre à 60px, texte à 12px | Écart de taille extrême et disgracieux | Préférer 40px + un poids fort, et 16px pour le texte |
| Tout est en gras | Plus rien ne ressort si tout est mis en avant | Utiliser une vraie hiérarchie de graisses (400 vs 700) |
| Les titres de section sont énormes | Le contenu réel se retrouve écrasé | Les titres de section doivent souvent être plus petits que le contenu qu'ils annoncent |

### Pour dire que tu maîtrises cette skill
Tu sais citer les 4 leviers de hiérarchie (taille, graisse, couleur, désaturation de l'entourage) et tu sais pourquoi "agrandir l'élément principal" n'est pas toujours la bonne réponse — parfois, il faut plutôt atténuer ce qui l'entoure.

---

## 2. `apply-typography-scale`

### C'est quoi, en profondeur
Cette skill s'appuie sur la précédente : une fois qu'on sait *quoi* mettre en avant, il faut choisir *avec quelles tailles précises*. Le piège classique est de construire une échelle "mathématique" (par exemple multiplier par 1.125 à chaque niveau), ce qui produit des tailles bizarres avec des décimales (18.5px, 20.8px...) qui ne créent pas de vraie distinction visuelle. La bonne approche est de **fabriquer une échelle "à la main"**, avec des sauts d'au moins 25% entre chaque taille, pour que chaque niveau soit clairement différent du précédent.

### Quand l'utiliser
Après avoir établi la hiérarchie visuelle (skill précédente), pour transformer cette hiérarchie en valeurs concrètes de taille, graisse et couleur.

### Les 5 règles centrales
1. **Fabriquer l'échelle à la main, pas mathématiquement** — éviter les échelles modulaires qui produisent des tailles en pixels fractionnaires.
2. **Utiliser `px` ou `rem`, jamais `em`** — car les valeurs en `em` se combinent en cascade dans les éléments imbriqués, ce qui rend la taille finale imprévisible (exemple concret plus bas).
3. **Sauts minimum de 25%** entre deux tailles consécutives — 16px → 20px est un saut de 25%, correct ; 16px → 18px n'est qu'un saut de 12,5%, insuffisant pour créer une vraie distinction.
4. **Seulement deux graisses** dans toute l'interface : une "normale" (400 ou 500) et une "grasse" (600 ou 700) — pas cinq graisses différentes qui n'apportent aucune clarté supplémentaire.
5. **Jamais moins de 400 pour du texte d'interface** — un texte trop fin (300 ou moins) devient difficile à lire, surtout en petite taille.

### Les échelles recommandées (à connaître par cœur)
**Pour une page marketing :**
```
Hero:     48-60px,  graisse 700,  interligne 1.1
H1:       36-40px,  graisse 700,  interligne 1.2
H2:       28-32px,  graisse 600,  interligne 1.3
Corps:    16-18px,  graisse 400,  interligne 1.6
Petit:    14px,     graisse 400,  interligne 1.6
Légende:  12px,     graisse 400,  interligne 1.5
```

**Pour une application/interface dense :**
```
H1:     30-36px,  graisse 700
H2:     24px,     graisse 600
H3:     20px,     graisse 600
H4:     16px,     graisse 600
Corps:  14-16px,  graisse 400
Petit:  12-13px,  graisse 400
```

### La règle de l'interligne (souvent mal comprise)
La règle est **contre-intuitive au premier abord** : plus le texte est petit, plus il a besoin d'un **grand** interligne (car l'œil a plus de mal à retrouver la ligne suivante sur du petit texte serré) ; plus le texte est grand (un gros titre), moins il a besoin d'interligne (car les lignes sont naturellement plus faciles à distinguer).
- Petit texte (12-14px) : interligne 1.6 à 1.7
- Texte de corps (16px) : interligne 1.5 à 1.6
- Gros titres (30px et plus) : interligne 1 à 1.2

### La longueur de ligne
- Longueur optimale : **45 à 75 caractères par ligne** (au-delà, l'œil se perd en revenant à la ligne).
- Largeur maximale conseillée pour un paragraphe : 20 à 35em.
- Si un paragraphe est exceptionnellement large, compenser en augmentant l'interligne à 1.8-2.0.

### Les erreurs les plus fréquentes, avec explication du "pourquoi"
| Erreur | Exemple concret | Pourquoi c'est un problème | Correction |
|---|---|---|---|
| Unités `em` | Un parent à `1.25em`, un enfant à `0.875em` | Le résultat final est `17.5px`, un calcul en cascade impossible à prédire au premier coup d'œil | Utiliser `px` ou `rem`, qui restent des valeurs absolues |
| Micro-paliers | 16px, 18px, 20px | Les écarts sont trop faibles (12,5% puis 11%) pour que l'œil perçoive une vraie différence de hiérarchie | Préférer 16px, 20px, 28px (25% puis 40%) |
| Graisse 300 | Texte de corps en fine | Illisible à petite taille, fatigue visuelle | Minimum 400 |
| Lignes trop longues | Un paragraphe de 100+ caractères par ligne | L'œil perd le fil en revenant à la ligne suivante | Contraindre à environ 35em de large |
| Interligne uniforme | 1.5 partout, y compris sur les gros titres | Un gros titre avec un grand interligne paraît "aéré n'importe comment", pas intentionnel | Faire varier l'interligne selon la taille (voir règle ci-dessus) |

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi `em` est risqué en cascade (avec l'exemple du calcul 1.25 × 0.875 × 16px), tu sais réciter au moins une des deux échelles recommandées, et tu sais pourquoi le petit texte a besoin de *plus* d'interligne que le gros texte, pas l'inverse de ce qu'on pourrait intuitivement penser.

---

## 3. `build-color-palette`

### C'est quoi, en profondeur
L'erreur numéro un que cette skill corrige : croire qu'une palette de couleurs, c'est "5 codes hexadécimaux" (un bleu de marque, un gris, du blanc, du noir, et peut-être un rouge). En réalité, une interface réaliste a besoin d'une palette **beaucoup plus riche** : **8 à 10 nuances de gris**, **5 à 10 nuances** pour chaque couleur principale (dite "primary"), et **5 à 10 nuances** pour chaque couleur d'accent sémantique (rouge, jaune, vert...).

Pourquoi tant de nuances ? Parce qu'une seule teinte de bleu ne suffit jamais : il en faut une très claire pour un fond d'alerte discret, une claire pour un état de survol, une "de base" pour le bouton lui-même, une foncée pour le texte sur fond clair, etc. Sans cette richesse, on se retrouve à bricoler avec de l'opacité (`rgba`) — ce que cette skill interdit explicitement, car cela crée des incohérences (deux éléments à la même opacité peuvent donner des couleurs différentes selon ce qu'il y a derrière).

### Quand l'utiliser
Au démarrage d'un projet, ou pour auditer une palette existante trop pauvre.

### La structure complète de la palette

**Les gris (8 à 10 nuances) — la majorité de ton interface est grise :**
```
Blanc / quasi-blanc :  #FFFFFF, #F9FAFB
Gris 100 : #F3F4F6 — fonds discrets
Gris 200 : #E5E7EB — bordures, séparateurs
Gris 300 : #D1D5DB — états désactivés
Gris 400 : #9CA3AF — texte de type "placeholder"
Gris 500 : #6B7280 — texte secondaire
Gris 600 : #4B5563 — texte de corps
Gris 700 : #374151 — texte fort
Gris 800 : #1F2937 — titres
Gris 900 : #111827 — texte quasi-noir
```
Un détail important souvent ignoré : on commence par un **gris foncé** (pas un noir pur `#000000`, jugé trop dur visuellement) et on remonte progressivement vers le blanc par incréments réguliers.

**La couleur primaire (5 à 10 nuances)** — une ou deux couleurs qui définissent l'identité visuelle globale :
```
Primary 50  : ultra-clair (fonds d'alerte)
Primary 100 : très clair (fonds discrets)
Primary 200-300 : clair (états de survol)
Primary 400-500 : base (boutons, liens)
Primary 600-700 : foncé (texte au survol, emphase)
Primary 800-900 : très foncé (texte sur fond clair)
```

**Les couleurs d'accent (5 à 10 nuances chacune)**, utilisées avec parcimonie :
| Couleur | Usage |
|---|---|
| Rouge | Actions destructrices, erreurs, avertissements |
| Jaune/Ambre | Nouvelles fonctionnalités, prudence, mise en avant |
| Vert | Succès, tendances positives, confirmation |
| Sarcelle/Rose/Violet | Mise en avant de fonctionnalités, catégorisation, calendriers |

### Comment fabriquer les nuances soi-même
La méthode recommandée : partir du modèle **HSL** (teinte, saturation, luminosité) et ne faire varier que la **luminosité** :
- Ultra-clair : 95-98% de luminosité (pour les fonds)
- Clair : 80-90% (pour les fonds au survol)
- Base : 45-55% (pour les boutons, les liens)
- Foncé : 20-35% (pour le texte, l'emphase)
- Très foncé : 10-15% (pour les titres)

### Critères PASS /  Critères FAIL
**PASS :** 8-10 gris, 5-10 nuances de primaire, 5-10 nuances par accent ; progression systématique du clair au foncé définie à l'avance ; hiérarchie claire (le primaire définit le look général, les accents sont utilisés avec parcimonie) ; contraste suffisant (WCAG AA) ; valeurs hexadécimales explicites plutôt que de l'opacité.

**FAIL :** trop peu de gris (3-4, ce qui oblige à des compromis) ; nuances manquantes du primaire (impossible de faire un état de survol propre) ; utilisation d'opacité (`rgba`) au lieu de nuances définies ; absence de couleurs sémantiques (rouge/jaune/vert) ; contraste insuffisant.

### Exemple d'audit complet (pour bien comprendre le raisonnement)
**Palette de départ (insuffisante) :** Bleu de marque `#0066FF`, Bleu clair `#E6F2FF`, Blanc, Gris `#999999`, Noir.

**Évaluation : FAIL.** Seulement 2 nuances de bleu (il en faut 5 à 10), un seul gris (il en faut 8 à 10), aucune couleur sémantique, aucune nuance d'accent.

**Palette recommandée en remplacement :**
- 10 gris : `#F9FAFB, #F3F4F6, #E5E7EB, #D1D5DB, #9CA3AF, #6B7280, #4B5563, #374151, #1F2937, #111827`
- 8 nuances de bleu primaire : `#EFF6FF, #DBEAFE, #BFDBFE, #93C5FD, #60A5FA, #3B82F6, #2563EB, #1D4ED8`
- Rouge, jaune, vert : 7-8 nuances chacun (du très clair pour les fonds d'alerte au très foncé pour le texte d'erreur)

**Total : 39 nuances organisées** — largement plus que les "5 couleurs" de départ, mais c'est justement cette richesse qui permet de construire une interface réaliste sans jamais "bricoler."

### Pièges fréquents
- **Le "générateur à 5 couleurs"** : utiliser seulement 5 codes hex pour toute l'interface, ce qui oblige à des compromis partout.
- **Utiliser l'opacité pour éclaircir une couleur** au lieu de définir une vraie nuance à l'avance — cela crée des incohérences selon le fond derrière l'élément semi-transparent.
- **Texte en noir pur `#000000`** — trop dur visuellement, préférer `#111827` ou `#1F2937`.

### Pour dire que tu maîtrises cette skill
Tu sais citer le nombre de nuances recommandé pour chaque catégorie (8-10 gris, 5-10 primaire, 5-10 par accent), et tu sais expliquer pourquoi utiliser `rgba()` pour éclaircir une couleur pose un problème de cohérence.

---

## 4. `apply-consistent-spacing`

### C'est quoi, en profondeur
L'espacement est probablement le levier le plus sous-estimé du design d'interface. Cette skill repose sur un principe simple mais puissant : **l'espace n'est pas du vide à combler, c'est un outil de communication.** Deux éléments proches sont perçus comme liés ; deux éléments éloignés sont perçus comme non liés. Mal utilisé, l'espacement crée de l'ambiguïté (on ne sait plus quel libellé appartient à quel champ) ; bien utilisé, il remplace même le besoin de bordures.

### Quand l'utiliser
Pour organiser n'importe quelle mise en page ou structure de composant, dès qu'il y a plus d'un élément à l'écran.

### L'échelle systématique (à connaître)
Base recommandée : 16px (la valeur par défaut des navigateurs).
```
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px
```
Le détail important : ces valeurs ne sont **pas arbitraires**, chaque saut respecte un minimum de 25% :
- 4px → 8px = +100% (les petites valeurs ont besoin de sauts proportionnellement plus grands)
- 8px → 12px = +50%
- 12px → 16px = +33%
- 16px → 24px = +50%
- 24px → 32px = +33%
- 32px → 48px = +50%
- 48px → 64px = +33%
- 64px → 96px = +50%

**Table d'usage courant :**
| Valeur | Usage typique |
|---|---|
| 4px | Espacement entre une icône et son texte, padding interne très serré |
| 8px | Petits espacements entre composants, padding serré d'un bouton |
| 12px | Padding d'un champ de saisie, espacement interne d'un composant |
| 16px | Espacement standard, padding d'une carte |
| 24px | Padding interne d'une section, espacements plus larges |
| 32px | Séparation entre grandes sections |
| 48-64px | Coupures entre sections de page |
| 96px | Sections hero, grandes divisions de page |

### Le principe de proximité (la règle d'or)
> Les éléments proches sont perçus comme liés ; les éléments éloignés sont perçus comme non liés.

La règle absolue à respecter : **il doit toujours y avoir plus d'espace autour d'un groupe qu'à l'intérieur de ce groupe.** Sinon, l'espacement devient "ambigu."

**Exemple concret d'espacement ambigu (à éviter) :**
```
Label A
[Champ A]
Label B    <- Ambigu : appartient-il à A ou à B ?
[Champ B]
```
Si le libellé "Label A" a 12px de marge en dessous, et que le champ A a lui aussi 12px de marge en dessous avant "Label B", l'utilisateur ne peut pas dire avec certitude à quel champ appartient chaque libellé — les espaces sont égaux, donc ambigus.

**Version corrigée :**
```
Label A
[Champ A]

Label B    <- Appartient clairement à B
[Champ B]
```
Ici, le libellé est à 4px de son champ (couplage serré), et il y a 24px entre un groupe champ+libellé et le suivant (séparation claire). Le rapport "espace intérieur << espace extérieur" élimine toute ambiguïté.

### 4 principes complémentaires à connaître
1. **Commencer avec trop d'espace blanc, puis en retirer.** Si on ajoute de l'espace jusqu'à ce que "ça ait l'air correct", le résultat est presque toujours un peu trop serré — parce que "pas activement moche" n'est pas la même chose que "vraiment bien aéré". Partir d'un excès volontaire et réduire donne un bien meilleur résultat final.
2. **Éviter l'espacement ambigu** (voir exemple ci-dessus).
3. **Ne pas remplir tout l'écran.** Avoir 1200-1400px de large disponible ne veut pas dire que le contenu doit s'étirer jusqu'à occuper tout cet espace. Un paragraphe peut très bien rester à 600px de large même dans une page de 1200px — le reste devient simplement de l'espace blanc, ce qui est très bien.
4. **Préférer l'espace aux bordures.** Plutôt que de tracer une ligne de séparation entre deux blocs, il est souvent plus élégant d'ajouter de l'espace entre eux, ou d'utiliser une couleur de fond différente, ou une ombre subtile.

### Erreurs fréquentes et leur correction
| Erreur | Description | Correction |
|---|---|---|
| Valeurs arbitraires | 15px ici, 27px là, 41px ailleurs | Utiliser exclusivement les valeurs de l'échelle systématique |
| Groupement faible | Même espacement à l'intérieur et entre les groupes | Rendre l'espacement entre groupes significativement plus grand |
| Espacement ambigu | Un libellé et son champ ont la même marge que le champ et le libellé suivant | Réduire l'espace intra-groupe, augmenter l'espace inter-groupes |
| Dépendance aux bordures | Utiliser des bordures là où l'espace suffirait | Augmenter l'espacement, retirer la bordure |
| Remplissage du canevas | Étirer le contenu à 1200px "parce qu'il y a de la place" | N'utiliser que l'espace nécessaire, laisser le reste en blanc |

### Pour dire que tu maîtrises cette skill
Tu sais réciter l'échelle systématique (4, 8, 12, 16, 24, 32, 48, 64, 96), tu sais expliquer la règle "plus d'espace autour qu'à l'intérieur d'un groupe", et tu peux corriger un exemple d'espacement ambigu comme celui du formulaire ci-dessus.

---

## 5. `design-button-hierarchy`

### C'est quoi, en profondeur
Cette skill dépend directement de `build-color-palette` (il faut déjà avoir une palette riche pour pouvoir distinguer visuellement des niveaux de boutons). Le problème qu'elle résout : sur un écran avec plusieurs boutons (Enregistrer, Annuler, Supprimer...), l'utilisateur doit **immédiatement** savoir lequel est l'action principale — sans avoir à lire le texte de chaque bouton.

### Quand l'utiliser
Dès qu'un écran, formulaire, ou fenêtre modale contient plus d'une action possible.

### La règle centrale : une hiérarchie à 4 niveaux
| Niveau | Fond | Bordure | Texte | Cas d'usage |
|---|---|---|---|---|
| **Primaire** | Couleur de marque (pleine) | Aucune | Blanc/clair | CTA principal, enregistrer, valider |
| **Secondaire** | Gris (plein) ou transparent | Couleur de marque (si contour) | Couleur de marque ou gris | Action alternative, annuler |
| **Tertiaire** | Transparent | Aucune | Couleur de marque ou gris | Actions optionnelles, "en savoir plus" |
| **Destructif** | Rouge | Aucune | Blanc | Supprimer, retirer (sans concurrencer le primaire) |
| **Désactivé** | Gris 200 | Aucune | Gris 400 | Action impossible pour l'instant |

**Un détail contre-intuitif important** : un bouton secondaire en gris **plein** (solid) est acceptable — ce n'est pas obligatoirement un bouton "outline" (juste un contour). L'essentiel est que son contraste soit **inférieur** à celui du bouton primaire.

### Les 4 signaux visuels utilisés
1. **Plein vs contour** : un bouton plein = plus important qu'un bouton en simple contour.
2. **Saturation de la couleur** : plus une couleur est saturée, plus elle capte l'attention.
3. **Taille** : le bouton primaire peut être légèrement plus grand.
4. **Position** : le bouton primaire est souvent placé à droite ou en bas (dans le sens naturel de lecture occidental).

### Critères PASS /  Critères FAIL
**PASS :** une seule action primaire claire par écran/section (pleine, fort contraste, couleur de marque) ; les actions secondaires sont visuellement subordonnées ; les actions tertiaires sont minimales ; une distinction visuelle nette entre niveaux (pas une différence subtile de 10%) ; les actions destructrices utilisent le rouge sans concurrencer le primaire.

**FAIL :** plusieurs boutons ont un poids visuel identique ; l'action primaire n'est pas évidente ; un gris trop clair (niveau 200) pour le secondaire donne l'impression qu'il est désactivé ; une action destructrice attire plus l'attention que le primaire ; tous les boutons sont pleins de la même couleur.

### Exemple d'audit détaillé
**Cas : modale avec "Enregistrer" (bleu plein), "Annuler" (gris plein), "Supprimer" (rouge plein).**

**Évaluation : PARTIELLE.** "Annuler" en gris plein est un traitement secondaire acceptable (contraste plus faible qu'un plein coloré). Mais "Supprimer" en rouge plein est un problème : il concurrence visuellement "Enregistrer" car deux boutons pleins et saturés se disputent l'attention.

**Recommandation :** garder "Enregistrer" en bleu plein (primaire) ; garder "Annuler" en gris plein, ou passer en contour pour une distinction encore plus nette ; transformer "Supprimer" en simple lien texte rouge (une action destructrice ne doit pas concurrencer visuellement l'action primaire, même si elle est "grave").

### Erreurs fréquentes
| Erreur | Description | Correction |
|---|---|---|
| Bataille de boutons | "Enregistrer" et "Annuler" tous deux pleins en couleur de marque | Passer "Annuler" en contour ou gris plein |
| Confusion du gris clair | Un gris très clair (niveau 200) pour le secondaire ressemble à un bouton désactivé | Utiliser un gris 400-500, ou un contour |
| Alerte rouge envahissante | Le bouton "Supprimer" est plus visible que le primaire | Le passer en texte seul ou le réduire |
| Surcharge de primaires | Trois boutons ou plus prétendent être "primaires" | N'en choisir qu'un, rétrograder les autres |
| Tertiaire invisible | Un lien texte de la même couleur que le texte normal | Utiliser la couleur de marque ou un soulignement |

### Pour dire que tu maîtrises cette skill
Tu sais citer les 4 niveaux (primaire, secondaire, tertiaire, destructif) avec leur traitement visuel, et tu sais expliquer pourquoi un bouton "Supprimer" ne doit jamais être aussi visible qu'un bouton primaire, même si l'action est importante.

---

## 6. `eliminate-visual-clutter`

### C'est quoi, en profondeur
Cette skill est de type "correctif" : elle ne génère pas quelque chose de nouveau, elle **retire** ce qui encombre visuellement une interface sans réel apport fonctionnel — bordures partout, ombres décoratives, fonds gris sur chaque carte, multiples lignes de séparation. Le principe sous-jacent : chaque élément visuel doit se justifier ; sinon, il doit disparaître.

### Quand l'utiliser
Pour nettoyer une interface qui paraît "encombrée" ou "boîteuse" (l'anglais dit "boxy" — tout est encadré).

### La question à se poser pour chaque élément
| Élément | Question à se poser | Faut-il souvent le retirer ? |
|---|---|---|
| Bordures | Cet élément a-t-il vraiment besoin d'une bordure, ou juste d'espace ? | Oui, remplacer par de la marge |
| Fond de carte | A-t-il besoin d'un encadré, ou juste de blanc ? | Souvent, laisser l'espace définir les groupes |
| Séparateurs | A-t-il besoin d'une ligne, ou juste de plus d'espace ? | Généralement, augmenter l'espacement à la place |
| Ombres | A-t-il besoin de profondeur, ou est-ce juste décoratif ? | Souvent, aplatir |
| Fonds colorés | Cette couleur communique-t-elle quelque chose ? | Si c'est purement décoratif, la retirer |
| Icônes | Cette icône ajoute-t-elle du sens ? | Si c'est purement décoratif, la retirer |

### La progression de simplification recommandée
1. **Partir de tout** (bordures, ombres, fonds) comme point de départ.
2. **Retirer les bordures** → les remplacer par de l'espacement.
3. **Retirer les fonds** → utiliser le blanc et le groupement par espace.
4. **Retirer les séparateurs** → augmenter l'espace entre sections.
5. **Retirer les ombres** → les garder uniquement pour l'élévation réelle (modales, menus déroulants).
6. **Ré-ajouter seulement ce qui est nécessaire** à la hiérarchie ou à la clarté — jamais par défaut.

### Critères PASS /  Critères FAIL
**PASS :** chaque élément visuel a une fonction précise ; l'espace blanc remplace les bordures pour séparer ; pas d'ombres ou de dégradés décoratifs sans raison ; les fonds sont utilisés avec parcimonie ; peu de lignes de séparation.

**FAIL :** des bordures partout ("effet boîteux") ; des ombres purement décoratives ; plusieurs lignes de séparation entre sections ; une couleur de fond sur chaque composant ; des éléments décoratifs qui ne communiquent rien.

### Exemple d'audit
**Carte de départ :** bordure grise 1px, fond `#f5f5f5`, ombre légère, titre avec icône, ligne de séparation, contenu, ligne de séparation, pied de page avec icône et texte.

**Évaluation : FAIL (encombré).** Bordure + fond + ombre en même temps, c'est redondant : ces trois éléments servent tous à "délimiter la carte", un seul suffit. Deux lignes de séparation sont inutiles à l'intérieur d'une seule carte.

**Recommandation :** retirer le fond gris (utiliser du blanc) ; retirer l'ombre (une carte statique n'a pas besoin d'élévation) ; garder soit la bordure, soit un padding généreux, mais pas les deux en plus d'une ombre ; retirer les lignes de séparation et augmenter le padding entre les sections internes ; évaluer si les icônes ajoutent un vrai sens, sinon les retirer.

### Erreurs fréquentes
| Erreur | Description | Correction |
|---|---|---|
| "Bordurite" | Chaque élément a un cadre autour de lui | Retirer plus de la moitié des bordures, utiliser l'espace |
| Ombres à outrance | Des ombres sur des éléments statiques | Réserver aux états de survol et aux modales |
| Séparateurs en surnombre | Une ligne entre chaque section | En retirer la moitié, doubler l'espace à la place |
| "Soupe de fonds" | Chaque carte a un fond gris | Utiliser du blanc avec de l'espace, ou une bordure subtile |
| Explosion d'icônes | Une icône sur chaque libellé et bouton | Ne garder que celles qui ajoutent du sens |

### Pour dire que tu maîtrises cette skill
Tu sais réciter la progression de simplification en 6 étapes, et tu sais identifier, dans une carte donnée, les éléments redondants (bordure + fond + ombre qui font tous la même chose).

---

## 7. `design-empty-states`

### C'est quoi, en profondeur
Un "état vide" (empty state), c'est ce que voit l'utilisateur quand il n'y a encore aucun contenu — une boîte de réception vide, un tableau de bord sans donnée, une recherche sans résultat. C'est un moment souvent négligé (traité comme un simple "cas d'erreur" à afficher rapidement), alors que c'est en réalité une **opportunité d'onboarding** : c'est le moment idéal pour expliquer à l'utilisateur quoi faire ensuite.

### Quand l'utiliser
Chaque fois qu'un écran peut légitimement n'avoir aucun contenu à afficher — première utilisation, contenu supprimé, recherche sans résultat, accès restreint, échec de chargement.

### Les 5 composants d'un bon état vide
1. **Illustration/icône** (optionnelle mais utile) — pertinente pour le type de contenu, pas une image générique de type "404".
2. **Titre** — amical et explicatif, jamais "Vide" ou "Aucun élément". Exemple : "Aucun projet pour l'instant" plutôt que "Liste vide."
3. **Description** — une explication brève de ce à quoi sert cette zone et comment y ajouter du contenu.
4. **Action principale** — un bouton d'appel à l'action clair, qui mène directement au flux de création. C'est l'étape la plus souvent oubliée, et la plus importante.
5. **Information secondaire** (optionnelle) — un lien "en savoir plus", un exemple, ou une option d'import.

### Les 5 types d'états vides à distinguer
| Type | Contexte | Approche recommandée |
|---|---|---|
| Première utilisation | Nouvel utilisateur, aucun contenu | Onboarding, pédagogie, CTA clair |
| Contenu supprimé par l'utilisateur | L'utilisateur a tout supprimé lui-même | Confirmation, option d'annulation, CTA pour recréer |
| Aucun résultat | Une recherche/un filtre ne renvoie rien | Proposer d'ajuster les filtres, d'effacer la recherche |
| Accès refusé | Restriction de permission | Expliquer pourquoi, comment demander l'accès |
| Erreur de chargement | Le chargement a échoué | Bouton de réessai, contact du support |

### Critères PASS /  Critères FAIL
**PASS :** explique ce qui devrait normalement se trouver ici ; explique comment ajouter du contenu ; fournit un bouton d'action principal clair ; utilise une illustration pertinente (pas générique) ; ton amical et utile (jamais "Aucun résultat trouvé" tout sec) ; cache les éléments d'interface devenus inutiles sans contenu (onglets, filtres qui ne servent à rien).

**FAIL :** écran blanc ou simple "Pas de données" ; message d'erreur technique affiché comme état vide ; aucune indication sur la prochaine étape ; illustration générique sans rapport avec le contexte ; impasse sans aucune action possible.

### Exemple d'audit détaillé
**Situation de départ :** un tableau de bord affiche "Aucune donnée disponible" en petit texte gris, sans rien d'autre.

**Évaluation : FAIL.** Formulation négative ("aucune") ; aucun contexte sur ce qui devrait apparaître ici ; aucune action proposée ; traitement visuel bien trop discret pour un moment aussi important.

**Recommandation concrète :**
- Titre : "Aucun rapport pour l'instant" (déjà plus doux) — ou mieux encore, formulé positivement : "Créez votre premier rapport"
- Description : "Créez votre premier rapport pour commencer à suivre vos métriques."
- Bouton primaire : "Créer un rapport"
- Optionnel : une petite illustration ou icône représentant un graphique
- Bonus : proposer un aperçu d'exemple/modèle pour montrer à quoi ressemblera l'écran une fois rempli

### Erreurs fréquentes
| Erreur | Description | Correction |
|---|---|---|
| "Le vide" | Un espace blanc sans rien | Ajouter contexte, illustration, CTA |
| Erreur déguisée en vide | Un message "404" ou "Null" affiché comme un état vide normal | Distinguer clairement un état vide d'une erreur réelle |
| Aucune voie à suivre | Un message est présent mais aucune action | Toujours fournir un CTA principal |
| Illustration générique | Un personnage mignon sans rapport avec le contexte | Utiliser une icône ou illustration pertinente |
| Formulation négative | "Vous n'avez pas d'amis" | Reformuler positivement : "Connectez-vous avec des gens" |
| Trop de texte | Des paragraphes entiers | Se limiter à 1-2 phrases + un CTA |

### Pour dire que tu maîtrises cette skill
Tu sais citer les 5 composants d'un bon état vide (illustration, titre, description, action principale, info secondaire) et tu sais transformer un message négatif ("Vous n'avez pas d'amis") en formulation positive et actionnable.

---

## 8. `use-shadows-appropriately`

### C'est quoi, en profondeur
Cette skill corrige un excès très courant : mettre des ombres décoratives sur tout, alors qu'une ombre devrait avant tout **communiquer une élévation** — dire à l'utilisateur "cet élément flotte au-dessus du reste." Une nuance importante (explicitement ajoutée après une phase de recherche citée dans la skill elle-même) : une **ombre subtile sur une carte reste acceptable**, car elle est souvent moins intrusive visuellement qu'une bordure nette. Le vrai problème, ce sont les **grandes ombres décoratives sur des éléments statiques**.

### Quand l'utiliser
Pour auditer ou définir l'usage des ombres portées dans une interface.

### L'échelle d'élévation recommandée
| Niveau | Cas d'usage | Exemple CSS approximatif |
|---|---|---|
| Aucune | Contenu statique, texte, icônes | `none` |
| Subtile | Cartes (alternative à une bordure) | `0 2px 4px rgba(0,0,0,0.1)` |
| Faible | Cartes surélevées, boutons | `0 4px 6px rgba(0,0,0,0.1)` |
| Moyenne | Menus déroulants, popovers, infobulles | `0 10px 15px rgba(0,0,0,0.1)` |
| Haute | Modales, boîtes de dialogue, tiroirs | `0 20px 25px rgba(0,0,0,0.15)` |

### Les 5 principes des ombres
1. **L'ombre indique l'élévation** — plus l'élément est "haut", plus proche il paraît de l'utilisateur.
2. **L'ombre indique l'interactivité** — un élément cliquable peut légitimement avoir une ombre.
3. **L'ombre sépare les couches** — une modale projette une ombre sur la page en dessous d'elle.
4. **L'ombre doit être subtile** — une bonne ombre est presque imperceptible au premier regard.
5. **La cohérence compte** — deux éléments au même niveau d'élévation doivent avoir exactement la même ombre.

### Critères PASS /  Critères FAIL
**PASS :** petites ombres subtiles sur les cartes (acceptable, moins intrusif qu'une bordure) ; grandes ombres réservées aux modales/dialogues (élevées au-dessus de tout le contenu) ; ombres moyennes pour les menus déroulants (au-dessus de la page, en dessous des modales) ; cartes plates ou avec ombre discrète seulement ; états de survol avec une légère augmentation d'ombre (pour signaler la cliquabilité) ; système cohérent limité à 2-3 niveaux maximum.

**FAIL :** grandes ombres décoratives sur des cartes statiques ; ombres lourdes sur du contenu statique ; valeurs d'ombre incohérentes d'un composant à l'autre ; ombres qui ne correspondent à aucune vraie élévation ; ombres sur du texte ou des icônes.

### Exemple d'audit détaillé
**Situation de départ :** une page avec des ombres de carte (`0 4px 6px rgba(0,0,0,0.1)`), des ombres de bouton (`0 2px 4px`), une ombre de modale (`0 4px 6px` — identique aux cartes !), et un texte avec `text-shadow`.

**Évaluation : FAIL (encombré).** Les cartes n'ont pas vraiment besoin d'ombre (elles sont statiques). La modale a exactement la même ombre que les cartes, ce qui casse le sens même de l'élévation : elle devrait paraître nettement "au-dessus" de tout, or visuellement elle est au même niveau qu'une simple carte. Le `text-shadow` est purement décoratif.

**Recommandation :** retirer les ombres de carte ou les réduire à une valeur subtile (`0 2px 4px`) ; retirer le `text-shadow` ; passer la modale à `0 20px 25px rgba(0,0,0,0.15)` pour bien marquer sa position "au-dessus" de tout ; garder une ombre subtile pour les boutons uniquement au survol.

### Erreurs fréquentes
| Erreur | Description | Correction |
|---|---|---|
| "Tapis d'ombres" | Chaque carte a une ombre | Aplatir les cartes statiques, ombre subtile acceptable |
| Abus d'ombre portée | Ombres lourdes sur des éléments statiques | Réserver aux éléments élevés/interactifs |
| Profondeur incohérente | Des éléments similaires ont des ombres différentes | Créer 2-3 niveaux d'élévation, les appliquer strictement |
| Ombres noires pures | Utiliser du noir pur pour l'ombre | Préférer un `rgba` à faible opacité, teinté selon la marque |
| Modale mal séparée | La modale ne semble pas "au-dessus" de la page | Augmenter la propagation et le flou de l'ombre |

### Pour dire que tu maîtrises cette skill
Tu sais citer les 5 niveaux d'élévation (aucune, subtile, faible, moyenne, haute) avec un exemple d'usage pour chacun, et tu sais pourquoi une ombre identique entre une carte et une modale pose problème (perte du sens de l'élévation).

---

## 9. `manage-color-contrast`

### C'est quoi, en profondeur
Cette skill est purement liée à la **lisibilité et à l'accessibilité** : elle calcule et vérifie que le contraste entre un texte (ou un élément d'interface) et son arrière-plan respecte les seuils **WCAG AA**, la norme d'accessibilité web la plus couramment exigée.

### Quand l'utiliser
Systématiquement, dès qu'une couleur de texte est choisie sur un fond donné — et en particulier lors d'un audit d'accessibilité.

### Les seuils WCAG AA à connaître par cœur
- **Texte normal (moins de 18px)** : ratio minimum de **4.5:1**
- **Texte large (18px+ en gras, ou 24px+)** : ratio minimum de **3:1**
- **Composants d'interface** (boutons, champs de saisie) : ratio minimum de **3:1** pour leurs contours
- **Indicateurs de focus** : ratio minimum de **3:1** contre les couleurs adjacentes

### Table de référence rapide (texte sur fond blanc)
| Couleur du texte | Ratio de contraste | Conforme AA ? |
|---|---|---|
| `#000000` (noir) | 21:1 |  |
| `#333333` | 12.6:1 |  |
| `#666666` | 5.9:1 |  |
| `#757575` | 4.6:1 |  (tout juste au minimum) |
| `#999999` | 2.8:1 |  |
| `#CCCCCC` | 1.6:1 |  |

Cette table permet de retenir une règle pratique simple : **`#999999` et plus clair, c'est presque toujours insuffisant sur fond blanc.** `#666666` est un bon seuil de sécurité pour du texte de corps.

### Erreurs fréquentes et leur correction
| Erreur | Description | Correction |
|---|---|---|
| Texte gris clair | `#999` ou plus clair pour du texte de corps | Utiliser `#666` au minimum, `#333` de préférence |
| "Texte fantôme" | Le texte du champ de saisie a la même couleur que son placeholder | Rendre le placeholder plus clair (`#999` par exemple, réservé à cet usage précis) |
| Primaire à faible contraste | La couleur de marque est trop claire pour porter du texte blanc lisible | Assombrir la couleur de marque, ou utiliser du texte foncé dessus |
| Liens trop discrets | Les liens sont à peine différents du texte normal | Ajouter un soulignement ou augmenter le contraste |
| Confusion des états désactivés | Un bouton désactivé reste trop visible | Le réduire à 30% d'opacité ou utiliser du gris |
| Icônes trop pâles | Des icônes presque invisibles | Les aligner sur la couleur du texte ou augmenter leur contraste |

### Exemple d'audit détaillé
**Situation de départ :** texte de corps en `#888888` sur fond blanc.

**Calcul :** ratio d'environ 3.5:1 — **en dessous** du seuil de 4.5:1 requis pour du texte normal.

**Évaluation : FAIL.**

**Recommandation :** passer à `#666666` (5.9:1, largement suffisant), ou préférer `#333333`/`#1A1A1A` pour du texte de corps si l'on veut une marge de sécurité confortable.

### Pour dire que tu maîtrises cette skill
Tu sais réciter les deux seuils WCAG AA principaux (4.5:1 pour le texte normal, 3:1 pour le texte large et les composants d'interface), et tu sais qu'un texte `#999999` ou plus clair sur fond blanc est presque toujours non conforme.

---

## 10. `group-related-elements`

### C'est quoi, en profondeur
Cette skill applique un principe issu de la psychologie de la perception (la **loi de proximité**, un des principes fondamentaux de la Gestalt) : des éléments proches sont perçus comme un groupe cohérent, des éléments éloignés sont perçus comme des groupes distincts. C'est une skill étroitement liée à `apply-consistent-spacing`, mais centrée spécifiquement sur la question du **regroupement logique** plutôt que sur l'échelle numérique elle-même.

### Quand l'utiliser
Dès qu'il faut organiser des éléments qui ont des relations logiques entre eux — un formulaire, une carte avec plusieurs zones, une liste, un groupe de boutons.

### La hiérarchie d'espacement à respecter
```
À l'intérieur d'un composant (libellé + champ) : 4-8px
Entre composants liés : 16-24px
Entre sections : 32-64px
Entre grandes zones de page : 64-96px
```

### Patterns de regroupement courants
| Pattern | Structure | Espacement recommandé |
|---|---|---|
| Champ de formulaire | Libellé → Champ | 4-8px entre les deux, 16-24px après le groupe complet |
| Carte | En-tête → Contenu → Pied de page | 16-24px de padding interne |
| Éléments de liste | Élément 1 / Élément 2 / Élément 3 | 8-12px entre chaque élément |
| Groupe de boutons | Primaire + Secondaire | 8-12px entre eux |
| Sections | Section A (espace) Section B | 48-64px entre elles |

### Critères PASS /  Critères FAIL
**PASS :** les éléments liés ont un petit espace (8-16px) ; les groupes non liés ont un grand espace (24-48px) ; les libellés de formulaire sont proches de leur champ (4-8px) ; les sections sont clairement séparées ; il existe une hiérarchie d'espace claire : le plus serré à l'intérieur d'un composant, un peu plus large entre composants, le plus large entre sections.

**FAIL :** un espacement uniforme partout ; des libellés éloignés de leurs champs ; des éléments liés visuellement déconnectés ; des éléments non liés trop proches ; l'usage de bordures à la place de l'espace pour indiquer un regroupement.

### Exemple d'audit détaillé
**Situation de départ :** un formulaire avec Titre (marge 24px), Libellé (marge 8px), Champ, Libellé (marge 8px), Champ, En-tête de section (marge 16px), Libellé (marge 8px), Champ.

**Évaluation : PARTIELLE.** L'espacement libellé-à-champ n'est pas précisé séparément de l'espacement champ-à-libellé-suivant — les deux semblent utiliser le même 8px, ce qui recrée le problème d'ambiguïté vu dans la skill `apply-consistent-spacing`. L'en-tête de section n'a que 16px avant lui, ce qui est trop proche de la section précédente pour marquer une vraie coupure.

**Recommandation :**
- Libellé → champ : 4px (couplage serré)
- Après un groupe complet (champ) : 24px
- Marge au-dessus d'un en-tête de section : 48px (coupure nette)
- Entre les champs d'une même section : 16px

### Erreurs fréquentes
| Erreur | Description | Correction |
|---|---|---|
| "Le grand écart" | Un espacement égal partout | Resserrer à l'intérieur des groupes, élargir entre eux |
| Libellé à la dérive | Un libellé à 20px ou plus de son champ | Réduire à 4-8px |
| Sections écrasées | Des sections à peine séparées | Ajouter 48px ou plus entre les grandes sections |
| Dépendance aux bordures | Des cadres autour de tout | Utiliser l'espace à la place |
| Cartes collées | Des cartes qui se touchent | Ajouter 16-24px entre elles |

### Pour dire que tu maîtrises cette skill
Tu sais réciter la hiérarchie d'espacement à 4 niveaux (intra-composant, entre composants, entre sections, entre grandes zones) et tu sais appliquer le principe de proximité pour corriger un exemple de formulaire mal groupé.

---

## 11. `meta-refactor-ui` (l'orchestrateur des 10 précédentes)

### C'est quoi, en profondeur
C'est une **méta-skill** : elle ne fabrique pas de règle nouvelle, elle **exécute les 10 skills précédentes dans un ordre précis** sur un design donné, puis consolide leurs résultats en un rapport d'audit unique, priorisé, et actionnable. C'est l'équivalent d'une commande `/refactor-ui` qui déclenche tout le processus d'un coup.

### Quand l'utiliser
Pour un audit complet d'une interface existante — que ce soit une simple vérification rapide, une analyse approfondie, ou une génération de correctifs concrets.

### Le déroulé en 4 phases
**Phase 1 — Charger le registre de skills.** Vérifier que les 10 skills sont bien disponibles avant de commencer.

**Phase 2 — Application séquentielle des skills, dans cet ordre précis** (l'ordre a son importance : chaque skill s'appuie sur les résultats logiques de la précédente) :
```
1. establish-visual-hierarchy
2. apply-typography-scale
3. build-color-palette
4. apply-consistent-spacing
5. design-button-hierarchy
6. eliminate-visual-clutter
7. design-empty-states
8. use-shadows-appropriately
9. manage-color-contrast
10. group-related-elements
```

**Phase 3 — Consolider les résultats.** Rassembler tous les FAIL détectés, les regrouper par sévérité (Critique / Haute / Moyenne / Faible), retirer les doublons (un même problème peut être détecté par plusieurs skills à la fois — par exemple, un manque de contraste peut apparaître à la fois dans `manage-color-contrast` et dans `establish-visual-hierarchy`), et prioriser par impact.

**Phase 4 — Générer le rapport**, avec une structure standardisée incluant : un score global (PASS / À AMÉLIORER / FAIL), un résumé chiffré ("3 corrections critiques, 5 hautes, 2 moyennes"), la liste détaillée des violations avec leur skill d'origine, leur sévérité, leur localisation et leur correction proposée, une liste de correctifs priorisés, et un tableau récapitulatif par skill.

### Les 3 modes d'exécution
| Mode | Ce qu'il fait | Temps indicatif |
|---|---|---|
| **Scan rapide** | Exécute les 10 skills, ne rapporte que les échecs | ~30 secondes |
| **Analyse approfondie** | Exécute les 10 skills, explique aussi les réussites, croise les skills entre elles, suggère des améliorations de composition | ~2 minutes |
| **Mode correction** | Exécute les 10 skills, génère des instructions de correction précises avec des exemples de code avant/après | ~5 minutes |

### Deux exemples de sortie
**Exemple — page marketing :**
```
Global : À AMÉLIORER
Critique : hiérarchie visuelle (le CTA est noyé dans le reste)
Haute : typographie (8 tailles utilisées, il en faudrait 5)
Moyenne : espacement (regroupement ambigu)
Correctifs prioritaires : [3 éléments]
```

**Exemple — tableau de bord :**
```
Global : PASS avec suggestions
Hiérarchie visuelle : PASS (action primaire claire)
Palette de couleurs : FAIL (seulement 4 nuances de gris)
Ombres : FAIL (décoratives sur les cartes)
Suggestions : [5 éléments]
```

### Pièges fréquents
- Exécuter les skills dans le désordre — l'ordre proposé n'est pas arbitraire : par exemple, `design-button-hierarchy` a besoin que `build-color-palette` ait déjà tourné, sinon il n'y a pas encore de nuances de gris/couleurs pour distinguer les niveaux de boutons.
- Ne pas dédupliquer les problèmes détectés plusieurs fois par des skills différentes, ce qui gonfle artificiellement le nombre de "violations" dans le rapport final.

### Pour dire que tu maîtrises cette skill
Tu sais réciter l'ordre d'exécution des 10 skills et expliquer pourquoi cet ordre précis est important (chaque skill s'appuie sur les décisions prises par les précédentes), et tu sais distinguer les 3 modes d'exécution (scan rapide, analyse approfondie, mode correction).

---

## Récapitulatif — Partie 4/5

| # | Skill | En une phrase |
|---|-------|----------------|
| 1 | establish-visual-hierarchy | Combine taille, graisse, couleur et désaturation de l'entourage pour créer un ordre de lecture clair |
| 2 | apply-typography-scale | Échelle de tailles fabriquée à la main, sauts de 25% minimum, jamais d'unité `em` |
| 3 | build-color-palette | 8-10 gris, 5-10 nuances par couleur primaire et par accent sémantique |
| 4 | apply-consistent-spacing | Échelle systématique (4 à 96px), plus d'espace autour d'un groupe qu'à l'intérieur |
| 5 | design-button-hierarchy | 4 niveaux (primaire, secondaire, tertiaire, destructif), un seul primaire par écran |
| 6 | eliminate-visual-clutter | Retire bordures/ombres/fonds qui ne servent à rien, au profit de l'espace |
| 7 | design-empty-states | Transforme un écran vide en moment d'onboarding avec CTA clair |
| 8 | use-shadows-appropriately | Ombre = élévation réelle, jamais décoration ; subtile sur les cartes, forte sur les modales |
| 9 | manage-color-contrast | Respecte les seuils WCAG AA (4.5:1 texte normal, 3:1 texte large) |
| 10 | group-related-elements | Principe de proximité : plus serré à l'intérieur d'un groupe, plus large entre les groupes |
| 11 | meta-refactor-ui | Orchestre les 10 skills précédentes dans l'ordre pour produire un audit complet priorisé |

**Suite (partie 5/5) :** le sous-dossier `threejs-3d-arsenal` (45 skills — effets visuels 3D/WebGL prêts à intégrer). Comme ce sont des recettes très techniques et répétitives dans leur structure (chacune décrit comment porter un effet précis depuis son code source vérifié), je te propose un format un peu différent pour cette dernière partie : une explication commune du fonctionnement partagé par les 45 effets, suivie d'un catalogue détaillé de chacun des 45 effets avec ce qui le rend spécifique. Dis-moi si tu préfères ce format ou si tu veux que je garde le format "un cours complet par skill" même pour ces 45-là (ce sera alors nettement plus long à produire).
