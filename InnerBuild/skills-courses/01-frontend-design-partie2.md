# Cours — Catégorie 01-frontend-design (Partie 2/5)

**Domaine :** Frontend / design d'interface — sous-dossiers `anthropics` (5 skills) + `diagram-design` (1 skill).
**Public visé :** quelqu'un qui ne connaît rien aux "agent skills" et veut comprendre, puis utiliser, chaque skill.

> Fil rouge de ce lot : produire du contenu visuel avec une vraie intention esthétique — art génératif, design de posters, thèmes de présentation, image de marque, direction artistique d'interface, et diagrammes techniques professionnels — plutôt qu'un rendu générique.

> Comment utiliser ce cours : pour chaque skill, lis d'abord **C'est quoi** et **Quand l'utiliser** pour reconnaître la situation, puis étudie le **Comment ça marche** étape par étape, suis l'**Exemple guidé** comme si tu le faisais toi-même, mémorise les **Pièges fréquents**, et termine par la **Checklist de sortie** et le mini-exercice **À toi de pratiquer**. C'est cet exercice qui transforme la lecture en compétence.

---

## 1. `frontend-design`

### C'est quoi
Un guide de direction artistique pour éviter le rendu "template par défaut" quand on construit ou retouche une interface : comment prendre des décisions esthétiques **intentionnelles**.

"Intentionnel" est le mot-clé : chaque choix visuel (typographie, couleur, espace, élément fort) doit pouvoir se justifier par le sujet du produit — pas par "c'est joli" ni par "c'est la tendance". Un design intentionnel se défend phrase par phrase ("cette typographie parce que la lisibilité des chiffres est critique pour des comptables") ; un design décoratif s'effondre à la première question ("pourquoi ce dégradé ?" — "euh, c'est moderne"). Cette skill apprend à concevoir comme un directeur artistique : partir du sujet, pas du catalogue de tendances.

### Quand l'utiliser
Dès qu'on construit une nouvelle interface ou qu'on retravaille une interface existante, et qu'on veut un résultat qui a du caractère plutôt qu'un rendu générique.

En pratique : au démarrage de tout chantier visuel (avant le premier composant), et en revue d'un design existant qui "ne va pas" sans qu'on sache pourquoi — l'audit par l'intention révèle vite les choix décoratifs sans raison.

### Comment ça marche
1. **Ancrer le design dans le sujet** : la personnalité visuelle doit venir de ce que le produit *est* (une appli pour comptables n'a pas la même identité qu'une appli pour un festival de musique), pas d'un style à la mode plaqué dessus. Concrètement : lister 3 adjectifs qui décrivent le sujet ("rigoureux, sobre, fiable" vs "festif, énergique, jeune") et exiger que chaque choix visuel serve au moins l'un d'eux.
2. **Principes de design** : typographie choisie avec intention, hiérarchie claire, un seul élément fort par écran plutôt que de la décoration partout. La règle "un seul élément fort" est la plus rentable : un écran avec un héros + du supporting discret paraît dessiné ; un écran avec 5 éléments qui crient paraît décoré au hasard.
3. **Processus en 4 temps** : planifier → comparer au brief → construire → **s'auto-critiquer** avant de livrer. L'auto-critique est une étape formelle, pas une relecture distraite : on reprend chaque choix et on lui demande sa justification ("ce dégradé sert quel adjectif du sujet ?"). Sans justification : on retire.
4. **Restreindre et se relire** : la retenue (retirer plutôt qu'ajouter) est presque toujours le bon réflexe final. Le test : enlève un élément décoratif — si l'écran va mieux, il fallait l'enlever ; si l'écran perd son caractère, il était justifié.

### Exemple concret
Pour un outil de comptabilité, plutôt que d'ajouter des dégradés et des animations "modernes" par défaut, on choisit une typographie très lisible, une hiérarchie stricte des chiffres importants, et une palette sobre qui inspire la confiance — la personnalité vient du sérieux du sujet, pas d'un template tendance.

### Exemple guidé, pas à pas
Besoin : page d'accueil d'une application de réservation de terrains de sport entre amis.
- **Ancrage** : adjectifs du sujet — "énergique, simple, entre potes". Tout choix devra servir au moins l'un des trois.
- **Élément fort unique** : une grande photo d'équipe en action + un seul bouton "Créer un match". Le reste (horaires, terrains, prix) en supporting discret en dessous.
- **Typographie** : une sans-serif large et dynamique pour les titres (énergique), une lisible pour le reste. Pas de serif classique "sérieuse" — elle contredirait le sujet.
- **Auto-critique** : le dégradé violet proposé initialement — quel adjectif sert-il ? Aucun → retiré. L'animation au scroll sur chaque carte — "simple" ? Non → gardée uniquement sur le bouton principal.
- **Résultat** : une page qui respire le sport entre amis, défendable phrase par phrase — au lieu d'une landing générique interchangeable avec n'importe quel SaaS.

### Pièges fréquents
- Copier une tendance visuelle sans se demander si elle correspond au sujet du produit.
- Sauter l'étape d'auto-critique et livrer la première version construite.
- Multiplier les éléments forts ("tout est important" = rien ne l'est) : un écran a UN héros, le reste accompagne.
- Confondre "sobre" et "vide" : la retenue retire le superflu, pas le caractère — un design intentionnel minimaliste a quand même une personnalité.
- Justifier après coup ("c'est moderne, donc ça va") au lieu de justifier par le sujet.

### Checklist de sortie
3 adjectifs du sujet écrits ; chaque choix visuel rattaché à au moins un adjectif ; un seul élément fort par écran ; auto-critique effectuée avec retraits réels ; aucun élément conservé "parce que c'est joli".

### À toi de pratiquer
Ouvre 3 sites que tu aimes et, pour chacun, écris les 3 adjectifs de son sujet puis vérifie si ses choix visuels les servent. Puis fais l'inverse sur une de tes pages : liste chaque élément décoratif et supprime ceux qui ne servent aucun adjectif.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi la personnalité visuelle doit venir du sujet du produit et non d'une tendance générale, avec un exemple.

---

## 2. `algorithmic-art`

### C'est quoi
Créer de l'art génératif original avec p5.js (une librairie de dessin par code), en partant d'une **philosophie algorithmique** propre au projet plutôt que de copier un style d'artiste existant.

La "philosophie algorithmique", c'est l'idée qui fait qu'un champ de flux ressemble à du vent et pas à des spaghettis : un concept (une métaphore naturelle, un phénomène physique, un système vivant) traduit en règles mathématiques. Sans elle, le code génère du bruit décoratif interchangeable ; avec elle, chaque paramètre a un sens ("la turbulence = la force du vent") et l'œuvre a une cohérence que l'œil perçoit immédiatement — même sans comprendre le code.

### Quand l'utiliser
Sur une demande d'art créé par code, d'art génératif, de champs de flux ("flow fields"), ou de systèmes de particules.

À chaque fois que le besoin est "un visuel vivant/organique/unique" plutôt qu'"une image précise" : si on sait exactement ce qu'on veut voir (un logo, une photo), l'art génératif est le mauvais outil ; si on veut une ambiance, une texture, un fond qui ne ressemble à aucun autre, c'est le bon.

### Comment ça marche
1. **Créer une "philosophie algorithmique"** avant de coder : un concept ou une métaphore qui va guider les règles de génération (ex : "la croissance organique en spirale"). La philosophie se formule en une phrase et se teste : "est-ce que quelqu'un qui voit le résultat devine le concept ?" Si non, la philosophie est trop vague.
2. **Déduire une "graine conceptuelle"** (paramètres de départ) qui traduit cette philosophie en nombres et en règles. Chaque paramètre doit correspondre à un aspect du concept (direction du vent, turbulence, densité) — jamais de paramètre "parce qu'il faut bien mettre quelque chose".
3. **Implémentation p5.js** avec une graine de hasard "seedée" (reproductible) pour pouvoir explorer des variations contrôlées. Le seed est crucial : sans lui, chaque exécution donne un résultat différent et on ne peut ni comparer, ni retrouver une belle variation, ni déboguer.
4. **Créer un artefact interactif** avec des paramètres explorables par l'utilisateur (curseurs, boutons) — en distinguant clairement ce qui est fixe (le concept) de ce qui est variable (les paramètres). L'utilisateur explore DANS la philosophie, il ne la casse pas : les curseurs bornent les variations au domaine où le concept reste lisible.
5. **Toujours créer une œuvre originale**, jamais une imitation du style d'un artiste précis, pour éviter tout problème de droit d'auteur. Au-delà du juridique : copier un style, c'est renoncer à la seule chose que l'art génératif fait mieux que tout — produire de l'inédit.

### Exemple concret
Demande : "un fond d'écran génératif en champ de flux" → on définit d'abord une philosophie ("le vent qui façonne le sable"), on en déduit des paramètres (direction, turbulence, densité), puis on code un artefact p5.js interactif où l'utilisateur peut faire varier la turbulence avec un curseur.

### Exemple guidé, pas à pas
Demande : "un visuel d'accueil pour un site de méditation".
- **Philosophie** : "la respiration visible" — des particules qui naissent, s'étendent et s'effacent au rythme d'une respiration lente (4s inspiration, 6s expiration). Test de la phrase : quelqu'un qui voit le résultat devine-t-il "respiration" ? C'est l'objectif.
- **Graine** : 200 particules, cycle 10s, amplitude liée à la phase, palette bleu nuit → aube. Chaque nombre vient de la philosophie (le cycle = un cycle respiratoire réel).
- **Implémentation seedée** : seed fixe 42 pendant l'exploration — on compare les variations à paramètres égaux, on note les beaux seeds dans un carnet.
- **Interactif** : curseurs "rythme" (8-14s) et "densité", bornés pour que le concept reste lisible (trop dense = bouillie, trop rapide = stressant — l'inverse de la méditation).
- **Originalité** : aucune référence à un artiste — le concept vient du sujet (méditation), pas d'un style existant.
- Résultat : un fond vivant, apaisant, unique — et reproductible exactement grâce au seed.

### Pièges fréquents
- Sauter l'étape de la "philosophie" et coder directement des formes au hasard, sans cohérence conceptuelle.
- Imiter le style reconnaissable d'un artiste précis au lieu de créer une œuvre originale.
- Travailler sans seed : chaque exécution différente rend l'exploration et le débogage impossibles.
- Des paramètres sans sens ("slider1", "valeur A") : si un paramètre ne correspond à rien dans la philosophie, c'est du bruit de contrôle — on le supprime ou on lui donne un sens.
- Confondre complexité et beauté : 2000 particules chaotiques impressionnent 10 secondes puis lassent ; 200 particules avec un concept fort retiennent l'attention.

### Checklist de sortie
Philosophie en une phrase, testée ("devine-t-on le concept en voyant le résultat ?") ; paramètres tous issus de la philosophie ; seed fixe pendant l'exploration ; curseurs bornés au domaine lisible ; originalité vérifiée (aucune imitation identifiable).

### À toi de pratiquer
Choisis un phénomène naturel (pluie, nuages, marée, feu) et écris sa philosophie en une phrase + 3 paramètres avec leur sens. C'est l'exercice fondateur : si tu sais faire ça, le code n'est plus que de la traduction.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer ce qu'est une "philosophie algorithmique" et pourquoi elle doit précéder l'écriture du code.

---

## 3. `canvas-design`

### C'est quoi
La version "image statique" de `algorithmic-art` : créer des posters, affiches ou œuvres visuelles en PNG/PDF à partir d'une philosophie de design, plutôt qu'un visuel généré au hasard.

La différence avec l'art génératif interactif : ici le livrable est figé (une affiche à imprimer, une couverture, une série cohérente). Pas de curseurs, pas d'exploration par l'utilisateur final — toute l'exploration a lieu pendant la création, et le résultat doit être définitif et autonome. Ça change la méthode : on itère en interne sur des dizaines de variantes, on n'en livre qu'une (ou une série), et chaque choix doit se défendre sans l'aide de l'interactivité.

### Quand l'utiliser
Sur une demande de poster, d'œuvre d'art, ou de design statique.

Dès que le livrable est une image fixe (affiche, couverture, bannière, série d'affiches) plutôt qu'une expérience interactive. Si le besoin inclut de l'exploration par l'utilisateur final, c'est `algorithmic-art` ; si c'est un rendu 3D animé, c'est l'arsenal `threejs-3d-arsenal`.

### Comment ça marche
1. **Créer une philosophie visuelle** (le concept directeur de l'image), en s'appuyant sur une "référence subtile" déduite du sujet (pas une copie explicite d'un style). La référence subtile, c'est par exemple "l'énergie des affiches de jazz des années 60" (rythme, contraste, spontanéité) sans en copier ni la typographie ni les couleurs ni la composition.
2. **Construire le visuel** sur un canvas selon cette philosophie. On travaille par passes : composition d'abord (masses, équilibre, point focal), puis détails — jamais l'inverse. Une belle texture sur une mauvaise composition reste une mauvaise affiche.
3. **Option multi-pages** si plusieurs visuels cohérents sont nécessaires (ex : une série d'affiches). La cohérence de série se définit AVANT (palette commune, grille commune, élément récurrent) : 5 affiches individuellement belles mais incohérentes entre elles ratent l'objectif "série".
4. **Toujours original**, jamais une copie du travail d'un artiste identifiable. Le test : montre le résultat à quelqu'un en demandant "ça te rappelle quelque chose ?" — si la réponse est un nom d'artiste précis, on recommence.

### Exemple concret
Une affiche pour un festival de jazz : la philosophie retenue pourrait être "l'improvisation visuelle" (des formes organiques qui rappellent des notes de musique), traduite en composition originale — pas une imitation d'une affiche de festival existante.

### Exemple guidé, pas à pas
Demande : série de 3 affiches pour des conférences tech ("IA", "Climat", "Espace").
- **Philosophie commune** : "la science comme paysage" — chaque sujet devient un horizon abstrait (courbes de données pour l'IA, strates pour le climat, profondeurs pour l'espace). Référence subtile : les gravures scientifiques anciennes (précision, annotations) sans les copier.
- **Système de série** : même grille, même typographie de titre, même bandeau bas avec date/lieu — seule la "matière" du paysage change. C'est ce système qui fera "série" au mur.
- **Construction** : passe 1 (compositions en noir et blanc, on valide masses et focale), passe 2 (couleur : une dominante par affiche + noir commun), passe 3 (typographie et détails).
- **Test d'originalité** : présentées sans contexte, personne ne cite un artiste précis — mais tout le monde perçoit la parenté entre les 3.
- **Livraison** : PNG haute résolution + PDF print, avec marges et fonds perdus corrects (une affiche magnifique à l'écran et ratée à l'impression est ratée tout court).

### Pièges fréquents
- Reproduire un style d'artiste reconnaissable au lieu d'une "référence subtile" transformée en quelque chose d'original.
- Ignorer l'option multi-pages quand plusieurs affiches cohérentes entre elles sont demandées.
- Travailler directement en couleur sans passe noir et blanc : si la composition ne tient pas sans couleur, la couleur ne la sauvera pas.
- Oublier les contraintes d'impression (résolution, fonds perdus, marges de sécurité) quand l'affiche est destinée au print.
- Livrer 5 variantes "pour choisir" au lieu d'une proposition assumée : trop de choix tue la décision — on propose UNE direction (avec ses raisons), pas un catalogue.

### Checklist de sortie
Philosophie en une phrase + référence subtile nommée (sans copie) ; composition validée avant couleur ; système de série défini si plusieurs visuels ; test d'originalité passé ; contraintes de sortie respectées (résolution, print le cas échéant).

### À toi de pratiquer
Choisis un événement imaginaire et écris sa philosophie d'affiche en 3 lignes (concept + référence subtile + ce qu'on ne copiera pas). Puis décris la composition en noir et blanc en 5 phrases, sans parler de couleur. Si tu n'y arrives pas sans couleur, ta composition est trop faible.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer la différence entre "s'inspirer subtilement" d'une référence et la copier directement.

---

## 4. `brand-guidelines`

### C'est quoi
Applique l'identité de marque officielle d'Anthropic (couleurs, typographies) à n'importe quel type de contenu produit (présentation, document, page web...).

Une identité de marque, c'est un contrat visuel : mêmes couleurs avec les mêmes codes, mêmes polices avec les mêmes rôles, partout. Cette skill automatise ce contrat pour la marque Anthropic : au lieu de chercher les codes hexadécimaux et les noms de polices à chaque production, l'agent les connaît et les applique — y compris les règles subtiles (quelle couleur pour quel type d'élément, quel repli de police si la principale manque). Le principe se généralise à n'importe quelle charte : l'important n'est pas Anthropic, c'est l'application exacte et automatique d'une identité définie.

### Quand l'utiliser
Quand des couleurs de marque, des directives de style visuel, ou des standards de design d'entreprise doivent s'appliquer à un contenu.

Typiquement : produire une présentation, un document ou une page "aux couleurs de" une organisation — ou vérifier qu'une production existante respecte bien la charte (audit de conformité). Dès qu'une charte existe, l'à-peu-près est interdit : c'est toute la raison d'être d'une charte.

### Comment ça marche
- **Palette de couleurs fixe** : couleurs principales (foncé, clair, gris moyen, gris clair) et couleurs d'accent (orange, bleu, vert), chacune avec son code hexadécimal précis. On utilise les codes exacts, jamais des valeurs "proches" : `#D97757` n'est pas `#E07B5F`, et la différence se voit — surtout pour une marque.
- **Typographies définies** : Poppins pour les titres (avec repli sur Arial si la police n'est pas installée), Lora pour le texte courant (repli sur Georgia). Le repli n'est pas un détail : sur les systèmes sans les polices (beaucoup de machines Windows/Linux), sans repli défini, le navigateur choisit au hasard — et la charte est brisée silencieusement.
- **Application intelligente** : la police et la couleur sont choisies automatiquement selon qu'il s'agit d'un titre, d'un texte, ou d'une forme non textuelle (qui cycle entre les 3 couleurs d'accent). Cette automatisation par rôle (pas par élément individuel) garantit la cohérence sur des documents de 50 pages sans y penser.

### Exemple concret
Une présentation générée pour Anthropic aura automatiquement ses titres en Poppins, son texte en Lora, et ses formes décoratives qui alternent entre orange, bleu et vert — sans que l'utilisateur ait à spécifier chaque couleur manuellement.

### Exemple guidé, pas à pas
Besoin : page web "nos valeurs" aux couleurs Anthropic.
- **Couleurs** : fond clair officiel, texte foncé officiel, accents en rotation (section 1 : orange, section 2 : bleu, section 3 : vert) — codes exacts copiés, pas approximés.
- **Typographies** : titres Poppins (avec `font-family: Poppins, Arial, sans-serif`), texte Lora (avec `Georgia, serif` en repli). Test : on désactive Poppins localement et on vérifie que le repli Arial s'applique proprement sans casser la mise en page.
- **Application par rôle** : tous les titres passent par la même classe, tous les textes par la même — aucun style inline individuel. Si la charte change demain, 2 lignes à modifier au lieu de 200.
- **Vérification** : capture comparée à la charte de référence, contraste des textes vérifié (les accents sur fond clair doivent rester lisibles — l'orange décoratif n'est jamais utilisé pour du petit texte).
- Résultat : une page qu'un responsable marque validerait sans correction — parce que chaque valeur vient de la charte, pas d'une approximation.

### Pièges fréquents
- Utiliser des couleurs "approximatives" au lieu des codes hexadécimaux exacts fournis par la skill.
- Oublier le repli de police (Arial/Georgia) sur un système où Poppins/Lora ne sont pas installées.
- Appliquer les couleurs d'accent au texte courant : les accents sont pour la décoration et les éléments forts, pas pour des paragraphes — la lisibilité prime sur la marque.
- Mélanger deux chartes ("les couleurs d'Anthropic avec la typo d'une autre marque") : une identité est un tout cohérent, pas un menu à la carte.
- Styliser élément par élément au lieu de par rôle : la cohérence manuelle ne tient pas au-delà de 3 pages.

### Checklist de sortie
Codes hexadécimaux exacts partout (zéro approximation) ; replis de police définis et testés ; application par rôle (classes partagées, pas de styles inline) ; accents réservés aux éléments forts, jamais au texte courant ; conformité vérifiée visuellement contre la charte de référence.

### À toi de pratiquer
Prends n'importe quelle page que tu as produite et vérifie-la contre une charte (celle-ci ou une autre) : liste chaque couleur et chaque police utilisées, et marque celles qui s'écartent de la charte — même "un peu". L'œil s'éduque en mesurant les écarts, pas en les devinant.

### Pour dire que tu maîtrises cette skill
Tu sais citer au moins 2 couleurs principales et 2 couleurs d'accent avec leur usage prévu.

---

## 5. `theme-factory`

### C'est quoi
Une boîte à outils de **10 thèmes visuels prêts à l'emploi** (palette de couleurs + polices assorties) applicables à n'importe quel artefact (slides, documents, pages HTML...), ou la génération d'un thème sur mesure.

Le dilemme classique : partir de zéro (liberté totale, risque d'incohérence, des heures de réglages) ou appliquer un thème existant (cohérence immédiate, risque de banalité). Cette skill offre les deux, avec une règle d'or : on ne crée un thème sur mesure que si aucun des 10 ne convient — et cette inadéquation doit s'exprimer concrètement ("aucun ne propose de palette sombre à fort contraste pour du code projeté en salle") plutôt qu'en vague insatisfaction.

### Quand l'utiliser
Pour styliser une présentation ou un document de façon cohérente et professionnelle.

Dès qu'un artefact multi-pages doit "avoir l'air pro" sans y passer la journée : présentations, rapports, documentations, pages simples. Pas pour une identité de marque sur mesure (voir `brand-guidelines`) ni pour une direction artistique originale (voir `frontend-design`) — le thème, c'est de la cohérence rapide, pas de la création.

### Comment ça marche
1. **Montrer la vitrine des thèmes** (`theme-showcase.pdf`) pour que la personne voie visuellement les 10 options (Ocean Depths, Sunset Boulevard, Forest Canopy, Modern Minimalist, Golden Hour, Arctic Frost, Desert Rose, Tech Innovation, Botanical Garden, Midnight Galaxy). On montre, on ne décrit pas : choisir un thème sur sa description textuelle ("bleu profond avec accents dorés") donne des surprises — le voir donne un choix éclairé.
2. **Demander le choix** et **attendre une confirmation explicite** — jamais de thème appliqué par défaut sans validation. Le choix esthétique appartient à la personne : l'appliquer sans validation, c'est décider à sa place sur quelque chose de subjectif — la pire façon de créer un conflit futile.
3. **Appliquer le thème choisi** de façon cohérente sur tout l'artefact (couleurs + polices). Cohérent = partout pareil : en-têtes, corps, accents, arrière-plans — un thème appliqué à moitié (3 slides sur 10) est pire que pas de thème, car il signale l'inachevé.
4. **Créer un thème sur mesure** si aucun des 10 ne convient, en s'inspirant d'une description donnée, puis le présenter pour validation avant de l'appliquer. Le sur-mesure suit le même rituel (présenter → valider → appliquer partout) : la méthode ne change pas parce que le thème est nouveau.

### Exemple concret
Pour une présentation d'entreprise tech, on propose la vitrine, la personne choisit "Tech Innovation" → on applique ses couleurs et polices définies à l'ensemble des slides, en gardant un contraste et une lisibilité corrects partout.

### Exemple guidé, pas à pas
Besoin : rapport PDF de 20 pages pour une association environnementale.
- **Vitrine** : on présente les 10 thèmes. La personne hésite entre "Forest Canopy" et "Botanical Garden" — les deux sont verts, ce qui est bon signe (le sujet oriente déjà correctement).
- **Choix validé** : "Forest Canopy", confirmation explicite ("oui, celui-là pour tout le document").
- **Application** : titres, intertitres, encadrés, tableaux, pieds de page — tout passe au thème. Vérification page par page : contraste des tableaux (texte vert foncé sur fond clair OK, mais les notes en petit vert clair sur blanc sont illisibles → on ajuste en restant dans la palette).
- **Cohérence** : dernière passe "aveugle" — on feuillette rapidement : tout changement de style visible d'une page à l'autre est un défaut à corriger.
- Résultat : 20 pages cohérentes en 30 minutes, lisibles partout — contre une journée de réglages manuels approximatifs.

### Pièges fréquents
- Choisir un thème à la place de l'utilisateur sans lui montrer la vitrine ni attendre sa confirmation.
- Appliquer un thème de façon incohérente (certaines slides stylées, d'autres non).
- Choisir sur la description textuelle au lieu de la vitrine visuelle : les mots trompent, l'œil tranche.
- Créer du sur-mesure par snobisme ("les thèmes prédéfinis, c'est pour les débutants") alors qu'un des 10 convenait : le sur-mesure coûte cher et se justifie par un besoin réel, pas par principe.
- Négliger le contraste après application : un thème magnifique avec du texte illisible est un échec — chaque application se termine par une vérification de lisibilité.

### Checklist de sortie
Vitrine montrée (choix visuel, pas textuel) ; confirmation explicite obtenue avant application ; thème appliqué partout sans exception ; contraste et lisibilité vérifiés après application ; sur-mesure justifié par un besoin concret s'il a lieu.

### À toi de pratiquer
Pour ton prochain document multi-pages, impose-toi le rituel : choisir parmi des options VISUELLES (même 3 suffisent), valider explicitement, appliquer partout, vérifier la lisibilité à la fin. Note le temps gagné par rapport à tes réglages manuels habituels.

### Pour dire que tu maîtrises cette skill
Tu sais citer le nom d'au moins 3 des 10 thèmes disponibles et l'étape obligatoire avant d'appliquer un thème (montrer la vitrine + attendre confirmation).

---

## 6. `diagram-design`

### C'est quoi
Une skill très complète pour produire des **diagrammes techniques professionnels** (architecture, flowchart, diagramme de séquence, machine à états, modèle de données, Gantt, Sankey, diagramme d'Ishikawa, carte de Wardley, kanban, parcours utilisateur, schéma de base de données...) en HTML/SVG/PNG — plus de 40 types de visuels différents.

Un bon diagramme fait comprendre en 10 secondes ce qu'un texte explique en 10 minutes — mais seulement s'il montre la bonne chose de la bonne façon. Un mauvais diagramme (mauvais type, surchargé, illisible) est pire que pas de diagramme : il donne l'illusion de la clarté tout en induisant en erreur. Cette skill est donc autant une méthode de CHOIX (quoi montrer, sous quelle forme) qu'une méthode de DESSIN (comment le rendre propre et accessible).

### Quand l'utiliser
Pour représenter visuellement une architecture, un process, une hiérarchie, des données chiffrées ou une chronologie — dès qu'un diagramme communiquerait mieux qu'un texte ou un tableau.

Test : "est-ce que je peux expliquer ça en 2 phrases ?" Si oui, le texte suffit — un diagramme pour 2 phrases, c'est du décor. Si l'explication demande de suivre des relations, des flux, des évolutions ou des proportions, le diagramme est justifié.

### Comment ça marche — étapes clés
1. **Porte d'entrée : le guide de style** — vérifié/établi en premier lors du premier usage, pour garder une cohérence visuelle sur tous les diagrammes produits. Tous les diagrammes d'un projet partagent la même langue visuelle (mêmes couleurs de rôles, mêmes conventions de flèches) : sans guide, chaque diagramme réinvente ses codes et l'ensemble devient illisible.
2. **Sélection en 2 temps** : d'abord le **pattern sémantique** (qu'est-ce qu'on essaie de montrer : une hiérarchie ? un flux ? une comparaison ?), puis seulement ensuite le type visuel précis (parmi plus de 40) qui correspond à ce pattern. L'ordre est crucial : partir du type visuel ("je vais faire un beau Sankey") avant de savoir ce qu'on montre, c'est décorer avant de penser.
3. **Confirmer le choix avant de dessiner** — éviter de partir sur le mauvais type de diagramme. Cette confirmation prend 30 secondes ("je vais montrer le flux avec un diagramme de séquence, ça te va ?") et évite des heures de dessin inutile.
4. **Système de design cohérent** : rôles sémantiques des couleurs, traitement des types de nœuds, typographie standardisée. Une couleur = un sens, partout : si le rouge signifie "erreur" dans un diagramme, il ne signifie pas "important" dans le suivant.
5. **Primitives SVG rigoureuses** : règles obligatoires sur les connecteurs, les flèches (toujours définir les 3 types de marqueurs), le masquage des labels sur les flèches pour rester lisibles, une légende systématique en bas. Ces règles semblent tatillonnes, mais ce sont elles qui séparent un schéma "propre" d'un schéma "brouillon" : flèches sans tête, labels illisibles sur les lignes, légende absente.
6. **Grille de 4px** et un **"budget de complexité"** par diagramme — ne pas surcharger un seul visuel. Budget type : 7 éléments maximum, 2 niveaux de profondeur — au-delà, on découpe en 2 diagrammes (vue d'ensemble + zoom). Un diagramme qu'il faut expliquer 5 minutes a raté son objectif.
7. **Checklist de vérification finale ("Taste Gate")** avant de livrer le diagramme. Relire avec des yeux neufs : le message se comprend-il en 10 secondes ? Chaque élément est-il nécessaire ? La légende suffit-elle ?
8. **Importer un diagramme existant** (draw.io, Mermaid, Excalidraw) et le redessiner à une taille/un niveau de détail choisi. On ne jette pas l'existant : on le convertit en appliquant le système de design, en ajustant le niveau de détail au besoin (une vue d'ensemble n'a pas besoin du détail d'un schéma technique).
9. **Contrat d'accessibilité SVG** : le rendu final doit rester accessible (contraste, structure). Un diagramme qui n'est qu'une image sans texte alternatif exclut les lecteurs d'écran : titres, descriptions et contrastes suffisants font partie de la livraison.

### Exemple concret
Pour montrer "comment une requête traverse le système" : le pattern sémantique est un "flux" → le type visuel choisi est un diagramme de séquence (pas un organigramme hiérarchique, qui serait le mauvais choix) — confirmé avant de commencer à dessiner, avec les flèches, légendes, et la grille de 4px appliquées de façon cohérente.

### Exemple guidé, pas à pas
Besoin : expliquer à un nouveau développeur "comment fonctionne une commande, de la validation au paiement".
- **Guide de style** : vérifié (couleurs de rôles existantes : bleu = acteur, vert = succès, rouge = erreur — on les réutilise).
- **Pattern sémantique** : c'est un flux temporel avec des acteurs et des décisions → pas une hiérarchie, pas une comparaison. Type visuel : diagramme de séquence. Confirmé en une phrase avant de dessiner.
- **Budget** : 5 acteurs, 8 messages — dans le budget. La gestion d'erreurs détaillée (4 cas) sort dans un 2e diagramme "zoom erreurs" au lieu de surcharger le principal.
- **Dessin** : grille 4px, flèches avec marqueurs définis, labels masqués sur fond aux croisements, légende en bas, typographie du système.
- **Taste Gate** : montré à un collègue 10 secondes — il raconte correctement le flux sans aide. Test passé.
- **Accessibilité** : titre, description textuelle du flux, contrastes vérifiés.
- Résultat : un nouveau développeur opérationnel sur ce flux en 15 minutes au lieu d'une demi-journée de lecture de code.

### Pièges fréquents
- Choisir le type visuel avant d'avoir identifié le pattern sémantique (ex : faire un organigramme alors qu'on voulait montrer une chronologie).
- Surcharger un seul diagramme avec trop d'éléments au lieu de respecter le "budget de complexité" et d'en faire plusieurs si nécessaire.
- Oublier la checklist finale ("Taste Gate") avant de livrer.
- Dessiner sans guide de style quand le projet en a déjà un : chaque nouveau code visuel affaiblit la cohérence d'ensemble.
- Négliger la légende ("c'est évident") : ce qui est évident pour l'auteur ne l'est jamais pour le lecteur — la légende est obligatoire, pas optionnelle.
- Confondre beau et clair : un diagramme spectaculaire qu'il faut expliquer n'est pas un bon diagramme — la clarté prime sur l'esthétique.

### Checklist de sortie
Guide de style vérifié/réutilisé ; pattern sémantique identifié AVANT le type visuel ; choix confirmé avant dessin ; budget respecté (découpé si besoin) ; primitives SVG propres + légende ; Taste Gate passé (compréhension en 10 secondes par un tiers) ; accessibilité (titre, description, contrastes).

### À toi de pratiquer
Prends le dernier schéma ou diagramme que tu as croisé (doc, slide, whiteboard photo) et audite-le : pattern sémantique identifiable ? budget respecté ? légende présente ? Réécris en 3 lignes comment tu le referais — cet œil critique est le muscle de la skill.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer la différence entre "pattern sémantique" et "type visuel", et donner un exemple où choisir le mauvais type visuel rendrait le diagramme trompeur.

---

## Récapitulatif — Partie 2/5

| # | Skill | En une phrase |
|---|-------|----------------|
| 1 | frontend-design | Ancre la personnalité visuelle dans le sujet, jamais dans une tendance |
| 2 | algorithmic-art | Art génératif p5.js à partir d'une philosophie algorithmique |
| 3 | canvas-design | Posters/affiches statiques originaux à partir d'une philosophie visuelle |
| 4 | brand-guidelines | Applique les couleurs et polices officielles Anthropic |
| 5 | theme-factory | 10 thèmes prêts à l'emploi (ou sur mesure) pour un artefact |
| 6 | diagram-design | 40+ types de diagrammes techniques, sélection sémantique puis visuelle |

**Suite (partie 3/5) :** le sous-dossier `taste` (13 skills) — goût visuel, critique de design, curation esthétique.
