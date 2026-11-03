# Cours — Catégorie 01-frontend-design (Partie 1/5)

**Domaine :** Frontend / design d'interface — sous-dossier `ai-factory-skills` (8 skills).
**Public visé :** quelqu'un qui ne connaît rien aux "agent skills" et veut comprendre, puis utiliser, chaque skill.

> Fil rouge de ce lot : ces 8 skills couvrent la fabrication d'interfaces de bout en bout — composants React bien architecturés, guides de performance (web + mobile), génération de landing pages par prompt, transitions animées, vérification d'accessibilité, et même la création de GIFs animés pour Slack.

> Comment utiliser ce cours : pour chaque skill, lis d'abord **C'est quoi** et **Quand l'utiliser** pour reconnaître la situation, puis étudie le **Comment ça marche** étape par étape, suis l'**Exemple guidé** comme si tu le faisais toi-même, mémorise les **Pièges fréquents**, et termine par la **Checklist de sortie** et le mini-exercice **À toi de pratiquer**. C'est cet exercice qui transforme la lecture en compétence.

---

## 1. `frontend-ui-engineering`

### C'est quoi
Le guide central pour construire des interfaces **de qualité professionnelle** : accessibles, responsives, et qui ne "sentent pas l'IA" (design générique, sans personnalité).

La "qualité professionnelle" n'est pas une question de goût subjectif : c'est un ensemble de critères objectifs et vérifiables. Une interface pro fonctionne au clavier, s'adapte à toutes les tailles d'écran, explique ses erreurs au lieu d'afficher des codes, et porte une identité visuelle cohérente au lieu d'un assemblage de choix par défaut. Cette skill est le socle : toutes les autres skills frontend de ce lot s'appuient sur ces fondations — inutile de parler d'esthétique raffinée si le formulaire est inutilisable au clavier.

### Quand l'utiliser
Dès qu'on construit ou modifie une interface, un composant, une mise en page, ou qu'on doit respecter les normes d'accessibilité WCAG.

En pratique : chaque nouvelle page, chaque nouveau formulaire, chaque refonte partielle — et systématiquement avant de livrer ("est-ce que ça passe les critères ?"). C'est aussi la skill à invoquer quand un rendu "fait IA" sans qu'on sache dire pourquoi : les critères objectifs révèlent ce que l'œil sent confusément.

### Comment ça marche — les piliers
- **Architecture des composants** : structure de fichiers claire, patterns de composants réutilisables. Un composant = une responsabilité, un nom qui dit ce qu'il affiche, des props explicites. Quand un composant dépasse ~150 lignes ou mélange affichage + logique métier + appels réseau, on le découpe.
- **Gestion de l'état** : où et comment stocker l'état d'une interface. Règle : l'état vit au plus près de là où il est utilisé ; l'état partagé remonte au plus petit ancêtre commun, pas systématiquement dans un store global. Un état global pour un formulaire local, c'est de la complexité gratuite.
- **Respect du système de design** : éviter "l'esthétique IA" reconnaissable (espacements par défaut, dégradés violets génériques, icônes toutes identiques) — espacement, typographie et couleurs doivent venir d'un système cohérent, pas de choix arbitraires. Signes qui trahissent un rendu IA : coins arrondis partout identiques, ombres portées mécaniques, palette "violet-bleu par défaut", emojis utilisés comme icônes.
- **Accessibilité WCAG 2.1 AA** : navigation au clavier, labels ARIA, gestion du focus, états vides et d'erreur qui ont du sens (pas juste "Erreur" tout sec). Le test de référence : débrancher la souris et accomplir le parcours complet au clavier seul (Tab, Entrée, Échap). Si c'est impossible, l'interface est cassée pour une partie des utilisateurs — et souvent pour les utilisateurs d'assistance technologique.
- **Design responsive** et **transitions de chargement** soignées. Responsive = mobile d'abord (375px), puis élargissement progressif — jamais l'inverse. Chargement = états squelettes ou indicateurs avec message, jamais de page blanche ni de contenu qui "saute" à l'arrivée des données.

### Exemple concret
Un formulaire construit avec cette skill aura : un focus visible au clavier sur chaque champ, un message d'erreur qui explique quoi corriger (pas juste "champ invalide"), une mise en page qui s'adapte du mobile au desktop, et une palette de couleurs cohérente avec le reste du site plutôt que des couleurs "par défaut".

### Exemple guidé, pas à pas
Besoin : page de connexion d'un SaaS.
- **Architecture** : composants `LoginForm`, `TextField` (réutilisable, avec label + erreur intégrés), `SubmitButton` avec état de chargement. Pas de logique réseau dans les composants : un hook `useLogin` s'en charge.
- **État** : email/mot de passe en état local du formulaire ; le jeton d'authentification remonte au contexte d'authentification (partagé) — rien dans un store global superflu.
- **Système de design** : espacements depuis l'échelle du projet (pas de `margin: 13px` inventée), couleurs de la charte (pas de bleu par défaut), typographie du projet.
- **Accessibilité** : chaque champ a son `<label>`, les erreurs sont liées aux champs (`aria-describedby`), le focus va automatiquement au premier champ en erreur après soumission, tout le parcours se fait au clavier.
- **Responsive + chargement** : une colonne centrée sur mobile, carte élargie sur desktop ; bouton en état "connexion…" désactivé pendant l'appel, message d'erreur précis en cas d'échec ("email ou mot de passe incorrect" — sans dire lequel, pour la sécurité).
- **Vérification finale** : parcours complet au clavier seul, test à 375px et 1280px, vérification que chaque erreur s'explique en langage clair.

### Pièges fréquents
- Se contenter de "ça marche" sans vérifier la navigation au clavier.
- Copier des espacements/couleurs génériques au lieu de respecter le système de design du projet — c'est justement ce qui donne l'impression d'un rendu "généré par IA".
- Des messages d'erreur techniques affichés tels quels à l'utilisateur ("ERR_422_FIELD") au lieu d'une phrase d'aide.
- Tester uniquement sur grand écran desktop et découvrir le désastre mobile le jour de la démo.
- Mettre l'état partout en global "au cas où" : la complexité d'état est la première source de bugs d'interface.

### Checklist de sortie
Parcours complet réalisable au clavier seul ; labels sur chaque champ + erreurs explicites liées aux champs ; mise en page vérifiée à 375px et 1280px ; couleurs/typo/espacements issus du système (zéro valeur arbitraire) ; états de chargement et d'erreur soignés ; aucun texte technique brut visible.

### À toi de pratiquer
Ouvre une page que tu as construite (ou ton site préféré) et fais le test clavier seul : débranche ta souris et accomplis l'action principale. Note chaque endroit où tu bloques — chacun est un défaut d'accessibilité à corriger selon les piliers ci-dessus.

### Pour dire que tu maîtrises cette skill
Tu sais citer au moins 3 critères concrets de "qualité professionnelle" (focus clavier, ARIA, états vides significatifs) et reconnaître un rendu "esthétique IA" générique.

---

## 2. `composition-patterns`

### C'est quoi
Des patterns d'architecture React pour éviter la "prolifération de props booléennes" (un composant avec 15 props `isX`, `hasY`, `showZ`...) au profit de composants composables.

Le problème : chaque prop booléenne double (en théorie) les états possibles du composant. Avec 4 booléens, ce sont 16 combinaisons — dont la plupart n'ont aucun sens (`isLoading` + `isEmpty` + `hasError` en même temps ?) et dont certaines ne sont même jamais testées. Le composant devient une usine à cas particuliers que personne n'ose toucher. La composition inverse la logique : au lieu d'un composant qui sait tout faire via des interrupteurs, on assemble des petits composants explicites — chaque assemblage est lisible, chaque variante est un nom dans le code plutôt qu'une combinaison d'interrupteurs.

### Quand l'utiliser
En refactorisant un composant avec trop de props booléennes, en construisant une bibliothèque de composants réutilisables, ou en concevant une API de composant flexible.

Signal d'alerte chiffré : 3 props booléennes ou plus sur le même composant =/logique de "refactorer en composition" à envisager sérieusement. Autre signal : des conditions imbriquées dans le rendu (`{isA && !isB ? ... : isC ? ...}`) que personne ne peut expliquer sans relire 3 fois.

### Comment ça marche — règles clés par priorité
1. **Éviter les props booléennes** pour personnaliser un comportement → préférer la composition. Quand on est tenté d'ajouter `isX`, on se demande : "est-ce une variante nommable ?" Si oui, c'est un composant, pas un booléen.
2. **Composants composés** (compound components) : structurer un composant complexe avec un contexte partagé entre ses sous-parties. Exemple : `<Tabs>` + `<Tabs.List>` + `<Tabs.Panel>` qui partagent l'onglet actif via contexte — l'utilisateur assemble, le composant coordonne.
3. **Découpler l'implémentation de l'état** : le "Provider" est le seul endroit qui sait comment l'état est géré. Les composants d'affichage consomment l'état sans savoir d'où il vient : on peut changer le stockage (local, serveur, URL) sans toucher l'affichage.
4. **Variantes explicites** plutôt que des "modes" booléens (un composant `<BoutonPrimaire>` et `<BoutonSecondaire>` plutôt qu'un `<Bouton primary={true}>`). Chaque variante a son nom, son style, ses tests — et l'autocomplétion de l'éditeur les propose au lieu d'exiger de connaître les booléens par cœur.
5. **`children` plutôt que des props `renderX`** pour la composition. `renderHeader={() => ...}` réinvente `children` en moins bien : plus verbeux, moins composable, moins lisible.
6. (React 19+) Éviter `forwardRef`, utiliser `use()` plutôt que `useContext()`. Les nouvelles APIs simplifient ce qui demandait du code cérémoniel avant — les patterns suivent les versions du framework.

### Exemple concret
Au lieu de `<Card isHighlighted showBorder hasShadow compact />` (4 props booléennes qui se combinent de façon confuse), on écrit `<Card.Highlighted><Card.Compact>...</Card.Compact></Card.Highlighted>` — chaque variante est un composant explicite.

### Exemple guidé, pas à pas
Composant existant : `<Alert type="info" showIcon dismissable bold rounded />` (5 props, combinaisons confuses).
- **Diagnostic** : `type` est une vraie variante (info/succès/erreur = 3 comportements visuels distincts) ; `showIcon`, `dismissable`, `bold`, `rounded` sont des interrupteurs empilés — certaines combinaisons n'ont aucun sens (`dismissable` sans bouton visible ?).
- **Refactor** : `<Alert.Info>`, `<Alert.Success>`, `<Alert.Error>` comme variantes nommées ; l'icône fait partie de chaque variante (plus de `showIcon`) ; `dismissable` devient la composition `<Alert.Dismissable>` qui enveloppe ; `bold`/`rounded` supprimés au profit du système de design (une seule typographie, un seul rayon — voir `frontend-ui-engineering`).
- **Vérification** : chaque usage existant est réécrit avec les variantes ; le code d'appel passe de `<Alert type="info" showIcon dismissable />` à `<Alert.Dismissable><Alert.Info>...</Alert.Info></Alert.Dismissable>` — plus long à écrire, infiniment plus clair à relire.
- **Règle retenue** : plus aucune prop booléenne ajoutée sans passer le test "est-ce une variante nommable ?".

### Pièges fréquents
- Ajouter une nouvelle prop booléenne à chaque nouveau cas d'usage au lieu de repenser la composition.
- Utiliser des props `renderHeader`, `renderFooter` alors que `children` ferait l'affaire plus simplement.
- Créer des variantes pour chaque micro-différence (12 composants quasi identiques) : la composition a aussi son excès — quand 2 variantes ne diffèrent que par une couleur du système, c'est une prop de système, pas 2 composants.
- Oublier que `children` peut être structuré (plusieurs zones nommées via composants composés) : on retombe alors sur des props `header`/`footer` qui sont des booléens déguisés.

### Checklist de sortie
Zéro prop booléenne ajoutée sans test "variante nommable ?" ; composants complexes découpés en composés avec contexte partagé ; état isolé dans le provider ; `children` préféré aux props de rendu ; usages existants migrés et relus.

### À toi de pratiquer
Trouve dans ton code un composant avec 3+ props booléennes et réécris UN de ses usages en version composée (variantes nommées + children). Compare les deux versions côte à côte : laquelle comprendrais-tu dans 6 mois sans contexte ?

### Pour dire que tu maîtrises cette skill
Tu sais transformer un exemple de composant à props booléennes multiples en une version utilisant des composants composés.

---

## 3. `react-best-practices`

### C'est quoi
Un guide de 70 règles de performance React/Next.js, maintenu par l'équipe Vercel, organisées en 8 catégories par priorité d'impact.

L'intérêt n'est pas seulement la liste (70 règles, impossible à mémoriser) mais l'ordre : les catégories sont triées par impact réel mesuré. La performance se travaille comme un triage médical — d'abord ce qui tue (les attentes séquentielles), ensuite ce qui handicape (le bundle), enfin le confort (les micro-optimisations). Cette skill apprend surtout à NE PAS optimiser : 90% des "optimisations" spontanées (mémoïsation partout, cache de tout) ciblent des catégories faibles pendant que des waterfalls critiques restent en place.

### Quand l'utiliser
En écrivant, relisant, ou refactorisant du code React/Next.js — surtout pour de la récupération de données, de l'optimisation de bundle, ou des problèmes de performance.

En pratique : avant chaque mise en production (relecture ciblée sur les catégories critiques), dès qu'une page "rame" (diagnostic dans l'ordre des catégories), et pendant les revues de code (les waterfalls et les imports barrel se repèrent en 30 secondes).

### Comment ça marche — les 8 catégories, de la plus critique à la moins critique
1. **Éliminer les "waterfalls"** (CRITIQUE) — enchaînements d'attentes séquentielles inutiles : utiliser `Promise.all()` pour les opérations indépendantes, démarrer les promesses tôt et les attendre tard. Un waterfall, c'est attendre la réponse A avant même de demander B alors que B ne dépend pas de A : le temps total est la somme au lieu du maximum.
2. **Optimisation de la taille du bundle** (CRITIQUE) — éviter les imports "barrel" (qui importent tout un module alors qu'on a besoin d'une seule fonction), charger les composants lourds dynamiquement. Chaque kiloctet de JavaScript est payé deux fois : au téléchargement ET à l'exécution sur des téléphones modestes.
3. **Performance côté serveur** (HAUTE) — mise en cache par requête, éviter l'état mutable partagé au niveau module. Un état global mutable côté serveur fuit entre les requêtes des utilisateurs : c'est à la fois un bug et un goulot.
4. **Récupération de données côté client** (MOYENNE-HAUTE) — déduplication automatique des requêtes. Sans déduplication, 3 composants qui ont besoin de la même donnée lancent 3 requêtes identiques.
5. **Optimisation des re-rendus** (MOYENNE) — mémoïsation ciblée, dépendances primitives dans les effets, ne pas définir de composants à l'intérieur d'autres composants. Un composant défini dans un autre est recréé à chaque rendu : React le voit comme un nouveau type et démonte/remonte tout son sous-arbre.
6. **Performance de rendu** (MOYENNE) — animer un wrapper plutôt qu'un élément SVG directement, `content-visibility` pour les longues listes. Le navigateur saute le rendu des zones hors écran avec `content-visibility` : gratuit et massif sur les longues pages.
7. **Performance JavaScript** (FAIBLE-MOYENNE) — mise en cache des accès répétés, sortie anticipée de fonction. Utile, mais seulement après les catégories ci-dessus.
8. **Patterns avancés** (FAIBLE) — cas de niche avec les hooks. À ne regarder que si tout le reste est déjà propre.

### Exemple concret
Deux appels réseau indépendants faits l'un après l'autre (`await fetchA(); await fetchB();`) doublent le temps d'attente pour rien → les lancer avec `Promise.all([fetchA(), fetchB()])` les exécute en parallèle.

### Exemple guidé, pas à pas
Page "tableau de bord" lente (4 secondes d'affichage) :
- **Catégorie 1 (waterfalls)** : le code charge l'utilisateur, PUIS ses projets, PUIS les stats de chaque projet en séquence. Diagnostic : les projets ne dépendent que de l'utilisateur, les stats dépendent des projets — mais les stats des différents projets sont indépendantes entre elles. Correction : `Promise.all` pour les projets, puis `Promise.all` pour leurs stats. Gain : 4s → 1,8s. C'est 80% du problème, trouvé en 10 minutes.
- **Catégorie 2 (bundle)** : la page importe toute une librairie de graphiques pour un seul mini-graphique (import barrel). Correction : import ciblé + chargement dynamique du graphique lourd. Gain : -400 Ko de JavaScript initial.
- **Catégorie 5 (re-rendus)** : un composant `Row` défini DANS le composant de liste → remonté à chaque rendu. Correction : extraction au niveau module + mémoïsation. Gain : scroll fluide.
- **Ce qu'on n'a PAS fait** : mémoïser des calculs triviaux, cacher des RegExp, micro-optimiser des boucles — catégories faibles, gain nul, complexité ajoutée pour rien.
- Moralité : l'ordre des catégories n'est pas décoratif, c'est la méthode — toujours commencer par le haut de la liste.

### Pièges fréquents
- Optimiser en priorité des détails de catégorie "FAIBLE" (ex: cache de RegExp) alors que des "waterfalls" critiques traînent encore dans le code.
- Mémoïser (`useMemo`) une expression simple qui coûte moins cher à recalculer qu'à comparer.
- Ajouter de la complexité "performante" (caches manuels, workers) avant d'avoir mesuré : sans mesure avant/après, une optimisation est une supposition — parfois fausse, parfois qui ralentit.
- Définir des composants dans des composants "juste pour cette fois" : c'est le bug de performance le plus fréquent et le plus invisible en relecture rapide.

### Checklist de sortie
Aucun waterfall sur les chemins critiques (vérifié en lisant les `await` séquentiels) ; pas d'import barrel sur les chemins chauds ; aucun état mutable partagé côté serveur ; requêtes clients dédupliquées ; aucun composant défini dans un autre ; optimisations de catégories faibles justifiées par une mesure.

### À toi de pratiquer
Ouvre un fichier avec des appels réseau et surligne chaque `await` : pour chacun, demande-toi "cet appel dépend-il vraiment du précédent ?" Transforme le premier waterfall trouvé en `Promise.all` et mesure le gain (même approximatif). C'est l'exercice le plus rentable de toute cette skill.

### Pour dire que tu maîtrises cette skill
Tu sais identifier un "waterfall" dans un exemple de code donné et le corriger avec `Promise.all`.

---

## 4. `react-native-skills`

### C'est quoi
L'équivalent mobile de `react-best-practices` : bonnes pratiques React Native et Expo pour la performance, les animations, et les patterns d'interface mobile.

Le mobile pardonne moins que le web : processeur plus faible, batterie limitée, 60 images par seconde exigées pour paraître fluide, et des utilisateurs qui désinstallent après 2 saccades. Les règles web transposées telles quelles échouent sur mobile (ce qui passe sur un MacBook Pro rame sur un Android d'entrée de gamme). Cette skill est donc l'adaptation mobile des mêmes principes : listes virtuelles agressives, animations restreintes aux propriétés "gratuites", composants natifs plutôt que réimplémentés en JavaScript.

### Quand l'utiliser
En construisant une app React Native/Expo, en optimisant des listes ou du scroll, en implémentant des animations.

Dès le premier écran avec une liste ou une animation — pas "quand ça ramera" : corriger une animation saccadée après coup coûte 10 fois plus cher que de n'animer que `transform`/`opacity` dès le départ. Et avant chaque release (les perfs se dégradent insensiblement à chaque fonctionnalité ajoutée).

### Comment ça marche — priorités clés
1. **Performance des listes** (CRITIQUE) : utiliser `FlashList` plutôt qu'une liste native pour les grandes listes, mémoïser les éléments, stabiliser les callbacks. Une liste, c'est le composant le plus exigeant d'une app mobile : des centaines de lignes qui défilent à 60fps. `FlashList` recycle les lignes (comme le recyclage des cellules natives) au lieu de tout rendre ; des callbacks instables (`onPress={() => ...}` inline) cassent ce recyclage en recréant tout à chaque rendu.
2. **Animations** (HAUTE) : n'animer que `transform` et `opacity` (les seules propriétés vraiment fluides sur mobile). Ces deux propriétés sont traitées par le GPU sans recalcul de mise en page ; tout le reste (`width`, `height`, `margin`, couleurs...) force le CPU à recalculer la page à chaque frame — d'où les saccades.
3. **Navigation** (HAUTE) : préférer les navigateurs natifs aux navigateurs JavaScript. La navigation native utilise les transitions du système (fluides, avec gestes) ; la navigation JS les réimplémente approximativement — et chaque approximation se paie en fluidité et en bugs de gestes.
4. **Patterns d'interface** (HAUTE) : `expo-image` pour toutes les images, `Pressable` plutôt que `TouchableOpacity`. `expo-image` gère cache, placeholders et formats modernes ; `Pressable` donne un contrôle fin des états de pression là où `TouchableOpacity` ne fait qu'assombrir.
5. Catégories additionnelles : gestion d'état, rendu, structure monorepo, configuration. Mêmes principes que le web, adaptés aux contraintes mobiles.

### Exemple concret
Une longue liste de contacts qui rame → remplacer la `FlatList` classique par `FlashList`, mémoïser chaque élément de liste, et s'assurer qu'aucune fonction n'est recréée à chaque rendu.

### Exemple guidé, pas à pas
Écran "fil d'actualités" avec 200 cartes (image + texte + bouton like) qui saccade au scroll :
- **Listes** : `FlatList` → `FlashList` avec hauteur estimée renseignée ; chaque carte mémoïsée ; callbacks (`onLike`) stabilisés via `useCallback` au lieu de flèches inline. Premier test : le scroll passe de saccadé à fluide — 70% du problème réglé.
- **Images** : `Image` de base → `expo-image` avec placeholder flou + cache. Fini les images qui "clignotent" au scroll.
- **Animation du like** : au lieu d'animer la taille du cœur (`width`/`height` → saccades), on anime `scale` (`transform`) + `opacity` — même effet visuel, zéro recalcul de mise en page.
- **Navigation** : le passage au détail utilise le navigateur natif (transition système + geste retour) au lieu d'une modale JS maison.
- **Ce qu'on n'a PAS fait** : optimiser la gestion d'état globale ou le monorepo — le problème était les listes et les animations, pas l'architecture. Mesurer d'abord, optimiser ensuite.

### Pièges fréquents
- Animer une propriété autre que `transform`/`opacity` (ex: `width`, `height`) — cela force un recalcul de mise en page à chaque frame, ce qui saccade l'animation.
- Utiliser `TouchableOpacity` par habitude au lieu du `Pressable` recommandé.
- Des callbacks inline dans les listes (`onPress={() => like(id)}`) qui cassent la mémoïsation et font re-rendre toute la liste à chaque interaction.
- Oublier la hauteur estimée des éléments (`estimatedItemSize`) : sans elle, la liste ne peut pas recycler efficacement et le scroll devient imprévisible.
- Tester uniquement sur flagship récent : l'app doit tourner sur un Android d'entrée de gamme de 3 ans — c'est là que les problèmes apparaissent.

### Checklist de sortie
Listes longues en `FlashList` (ou équivalent recyclé) avec éléments mémoïsés et callbacks stables ; animations limitées à `transform`/`opacity` ; navigation native ; `expo-image` + `Pressable` systématiques ; testé sur appareil modeste, pas seulement sur simulateur haut de gamme.

### À toi de pratiquer
Ouvre ton écran avec le plus de contenu défilant et cherche les 3 fautes : callbacks inline dans la liste, animation d'une propriété autre que transform/opacity, images sans cache. Corrige la première et mesure la différence au scroll — c'est généralement spectaculaire.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi seules `transform` et `opacity` doivent être animées sur mobile.

---

## 5. `landing-prompt-playbook`

### C'est quoi
Un guide pour bien **formuler des prompts** afin de générer des landing pages de qualité professionnelle avec un outil IA — pas une skill de code, une skill de formulation de demande.

Paradoxe : pour obtenir un bon design d'une IA, il ne faut pas décrire le design ("fais quelque chose de beau"), il faut décrire le contexte qui permet à l'IA de prendre les bonnes décisions (secteur, contenu réel, contraintes techniques, structure attendue). Cette skill transforme le "prompt jeté" ("fais-moi une landing page") en "brief professionnel" : mêmes informations qu'on donnerait à un vrai designer, avec en plus les précisions techniques dont l'IA a besoin (framework, responsive, animations).

### Quand l'utiliser
Dès qu'on demande à une IA de générer une landing page, un hero, une section pricing, une nav, des témoignages...

À chaque génération, pas seulement à la première : chaque itération ("change le hero", "ajoute une section") est un nouveau prompt qui doit contenir son contexte (ce qui existe, ce qui ne doit pas changer) — sinon l'IA régénère à sa façon et casse ce qui marchait.

### Comment ça marche — 5 axes à préciser dans chaque prompt de génération
1. **Framework** (Tailwind par défaut, HTML/CSS classique, Bootstrap) — le nommer explicitement. Sans framework nommé, l'IA mélange les approches (classes Tailwind + styles inline + Bootstrap) dans un résultat incohérent et difficile à maintenir.
2. **Structure des composants** (nav, hero, features, pricing, témoignages, footer). Lister explicitement chaque section attendue, dans l'ordre : sinon l'IA en oublie (jamais de footer ?) ou en invente d'inutiles.
3. **Palette de couleurs et style** précis (pas juste "moderne"). Nommer les couleurs (ou la charte), l'ambiance ("sobre et financier", "énergique et jeune"), et — crucial — ce qu'on ne veut PAS ("pas de dégradé violet", "pas d'emojis comme icônes").
4. **Comportement responsive** (mobile-first, points de rupture précis). Exiger explicitement le comportement mobile : sinon l'IA produit un desktop correct et un mobile cassé, parce que ses exemples d'entraînement sont majoritairement desktop.
5. **Éléments interactifs et animations** (quoi bouge, sur quel déclencheur, avec quel timing). "Des animations subtiles" ne veut rien dire : préciser (apparition au scroll, survol des cartes, 300ms) donne des animations cohérentes au lieu d'un patchwork.

Autres techniques : **référencer du contexte existant** ("@hero-section-template") plutôt que tout redécrire depuis zéro ; **éditer une section à la fois** en précisant explicitement ce qui doit rester inchangé plutôt que de tout régénérer ; **approche par étapes** pour les pages complexes (structure → style → animation → responsive/accessibilité, dans cet ordre).

### Exemple concret
Mauvais prompt : "fais-moi une belle landing page moderne." Bon prompt : "Génère une section hero moderne pour un SaaS avec Tailwind CSS : titre, sous-titre, bouton CTA, image flottante à droite, entièrement responsive." — les 5 axes sont couverts.

### Exemple guidé, pas à pas
Besoin : landing page complète pour un outil de facturation pour indépendants.
- **Étape 1 — structure** : "Page Tailwind, mobile-first : nav (logo + 2 liens + CTA), hero (titre + sous-titre + CTA + capture d'écran à droite), 3 features en cartes, pricing 2 offres, 2 témoignages, footer. Contenu réel fourni ci-dessous, pas de lorem ipsum." → on obtient la structure complète avec le vrai contenu.
- **Étape 2 — style** : "Applique : palette bleu nuit + blanc + accent orange (#FF6B35), sobriété financière, AUCUN dégradé violet, icônes Lucide uniquement." → le style s'applique sur la structure existante, sans la casser.
- **Étape 3 — animation** : "Apparition douce des sections au scroll (300ms), survol des cartes pricing avec légère élévation. Respecte prefers-reduced-motion." → animations ciblées, pas de patchwork.
- **Étape 4 — responsive + accessibilité** : "Vérifie 375px : nav en menu hamburger, hero empilé, pricing en colonne. Labels sur tous les boutons, contraste AA."
- **Itération suivante** : "Dans la section pricing uniquement, change l'offre mise en avant pour la 2e. Ne touche à rien d'autre." → edit ciblé, le reste intact.
- Sans cette méthode (un seul mega-prompt "fais-moi une landing page de facturation"), on obtient une page générique au contenu inventé, qu'on passe ensuite 2 heures à corriger morceau par morceau.

### Pièges fréquents
- Régénérer toute une page pour corriger un seul détail dans une section (au lieu d'un edit ciblé).
- Utiliser du texte "lorem ipsum" au lieu de vrai contenu — le texte fait partie du design, pas juste de la décoration.
- Écrire un mega-prompt de 40 lignes d'un coup : l'IA noie les contraintes importantes au milieu des détails — mieux vaut 4 prompts ciblés en séquence.
- Oublier de dire ce qu'on ne veut PAS : sans interdits explicites, l'IA retombe sur ses défauts (dégradés violets, emojis-icônes, cartes identiques).
- Ne jamais fournir le vrai contenu ("on mettra les textes après") : le design construit sur du faux texte casse quand le vrai arrive (titres trop longs, prix qui débordent).

### Checklist de sortie
Les 5 axes couverts explicitement (framework, structure, style + interdits, responsive, animations) ; vrai contenu fourni (zéro lorem ipsum) ; construction par étapes dans l'ordre (structure → style → animation → responsive) ; itérations par edits ciblés avec périmètre de non-modification ; interdits esthétiques nommés.

### À toi de pratiquer
Reprends ton dernier prompt de génération ("fais-moi X") et réécris-le en couvrant les 5 axes + 2 interdits explicites. Compare les deux résultats : la différence mesure ce que le cadrage apporte.

### Pour dire que tu maîtrises cette skill
Tu sais transformer un prompt vague ("fais-moi une landing page") en un prompt qui couvre les 5 axes explicitement.

---

## 6. `react-view-transitions`

### C'est quoi
Un guide pour implémenter des animations fluides et natives entre états d'interface avec l'API React `<ViewTransition>` — sans librairie tierce d'animation.

Les transitions d'état (changer de page, ouvrir un détail, réordonner une liste) sont les moments où une interface paraît "cassée" : disparition brutale, apparition sèche, contenu qui saute. Les librairies d'animation résolvent ça au prix d'une dépendance lourde et d'une API à apprendre. L'API native `<ViewTransition>` offre l'essentiel (transitions de route, éléments partagés, types personnalisés) sans dépendance — à condition de respecter ses règles de placement et d'accessibilité, qui sont précisément l'objet de cette skill.

### Quand l'utiliser
Pour des transitions de page, des animations de changement de route, des animations d'éléments partagés (un élément qui "vole" d'un écran à l'autre), des animations d'apparition/disparition, de réordonnancement de liste, ou de navigation avant/arrière.

Ne pas l'utiliser pour : des animations continues (chargeurs, fonds animés), des micro-interactions complexes chorégraphiées, ou des animations pilotées par le scroll — là, une librairie dédiée reste justifiée. Cette API brille sur les transitions d'état, pas sur tout le reste.

### Comment ça marche — concepts clés
- Le composant `<ViewTransition>` encapsule ce qui doit être animé lors d'un changement d'état. Mentalement : "tout ce qui est DANS le composant peut être animé pendant la transition ; tout ce qui est DEHORS reste fixe".
- **Règle de placement critique** : où on place ce composant dans l'arbre détermine ce qui est animé — un mauvais placement casse l'animation silencieusement. Trop haut : tout s'anime (y compris ce qui devrait rester fixe). Trop bas : rien ne s'anime visiblement. Le placement se choisit en se demandant "qu'est-ce qui doit bouger, et qu'est-ce qui doit rester ?".
- **Types de transition** personnalisés (`addTransitionType`) pour différencier par exemple une navigation "avant" d'une navigation "arrière" et leur donner des animations différentes. Sans types, toutes les transitions se ressemblent — et une navigation "retour" qui anime comme un "aller" désoriente.
- **Éléments partagés** : un même élément visuel qui persiste visuellement entre deux écrans (ex : une vignette de produit qui s'agrandit en page détail). C'est l'effet le plus spectaculaire et le plus délicat : les deux écrans doivent désigner le même élément, sinon chacun anime le sien et l'illusion est brisée.
- **Accessibilité** : toujours prévoir le cas `prefers-reduced-motion`. Les animations de transition peuvent provoquer des nausées ou des vertiges : quand l'utilisateur a demandé la réduction des mouvements, les transitions deviennent instantanées — sans exception, sans "juste celle-là".

### Exemple concret
Cliquer sur une vignette de produit dans une liste fait apparaître la page détail avec l'image qui semble "s'agrandir en place" plutôt que de disparaître et réapparaître brutalement — c'est un élément partagé animé via `<ViewTransition>`.

### Exemple guidé, pas à pas
Besoin : navigation liste → détail avec élément partagé + retour différencié.
- **Placement** : `<ViewTransition>` enveloppe la zone de contenu (pas toute la page : la barre de navigation reste fixe). On vérifie visuellement : pendant la transition, seule la zone de contenu bouge.
- **Élément partagé** : la vignette (liste) et l'image hero (détail) sont désignées comme le même élément partagé. Test : au clic, l'image "vole" au lieu de clignoter. Si elle clignote, les deux écrans ne désignent pas le même élément — on corrige l'identifiant partagé.
- **Types** : `addTransitionType` pour "aller" (zoom avant doux) vs "retour" (fondu arrière rapide). Test : aller puis retour — les deux directions se distinguent clairement.
- **Accessibilité** : avec `prefers-reduced-motion` activé, aller et retour deviennent instantanés, sans animation. Testé, pas supposé.
- **Débogage** : si rien ne s'anime, on vérifie dans l'ordre — placement (trop haut/bas ?), identifiant partagé (identique des deux côtés ?), types (enregistrés ?). 90% des pannes viennent de ces 3 points.

### Pièges fréquents
- Placer le composant `<ViewTransition>` au mauvais endroit de l'arbre de composants, ce qui casse l'animation sans erreur visible.
- Oublier de gérer `prefers-reduced-motion` pour les personnes sensibles au mouvement.
- Animer toute la page au lieu de la zone de contenu : la navigation qui bouge avec le contenu donne le mal de mer et casse les repères.
- Des identifiants partagés approximatifs ("à peu près le même élément") : l'illusion exige l'exactitude — sinon, clignotement.
- Empiler transitions natives ET librairie d'animation sur le même changement d'état : les deux systèmes se battent et produisent des saccades pires que l'absence d'animation.

### Checklist de sortie
Zone animée délimitée (contenu bouge, navigation fixe) ; élément partagé identique des deux côtés (test visuel : il vole, il ne clignote pas) ; aller/retour différenciés via types ; `prefers-reduced-motion` → transitions instantanées (testé) ; en cas de panne, vérification dans l'ordre placement → identifiant → types.

### À toi de pratiquer
Sur une navigation existante de ton projet (liste → détail, onglets, pages), ajoute une transition : enveloppe la zone de contenu, teste, puis active `prefers-reduced-motion` dans ton OS et vérifie que tout devient instantané. Note ce qui a cassé silencieusement en route — c'est là que la skill travaille.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer ce qu'est un "élément partagé" animé et donner un exemple d'usage (ex : vignette → page détail).

---

## 7. `web-design-guidelines`

### C'est quoi
Une skill qui **audite** du code d'interface existant par rapport aux "Web Interface Guidelines" de Vercel (accessibilité, bonnes pratiques UX), en récupérant les règles **à jour** à chaque revue plutôt qu'une liste figée.

Les bonnes pratiques évoluent (nouveaux patterns, nouvelles exigences d'accessibilité, navigateurs qui changent) : un audit basé sur une liste mémorisée il y a un an rate les nouvelles règles et applique des anciennes périmées. Cette skill inverse la logique : à chaque audit, on va chercher les directives fraîches, puis on les applique au code ciblé. L'audit est donc toujours à jour par construction — au prix d'une étape de récupération systématique qu'il ne faut jamais sauter "parce qu'on connaît déjà les règles".

### Quand l'utiliser
Sur demande explicite : "relis mon interface", "vérifie l'accessibilité", "audite le design", "vérifie mon site par rapport aux bonnes pratiques."

Uniquement sur demande explicite : cette skill ne se déclenche pas toute seule "au cas où". Auditer sans demande, c'est imposer un standard que personne n'a choisi — et produire des rapports que personne ne lira. La demande explicite garantit aussi le périmètre (quel fichier ? toute l'app ?).

### Comment ça marche
1. Récupérer les directives **fraîches** depuis une source en ligne à chaque revue (elles évoluent, donc jamais une copie figée). Concrètement : la première action de l'audit est le téléchargement, pas la lecture du code. Si le téléchargement échoue, on s'arrête et on le dit — on n'audite jamais sur des règles périmées "en attendant".
2. Lire les fichiers ciblés (ou demander lesquels si non précisé). Un audit sans périmètre ("toute l'app") est inexploitable : on audite des fichiers nommés, dans un ordre annoncé.
3. Vérifier chaque règle des directives contre le code. Méthodiquement, règle par règle, fichier par fichier — pas en survolant "à l'œil". Chaque règle donne soit PASS, soit FAIL avec localisation.
4. Rendre les résultats dans un format concis `fichier:ligne`. Le format n'est pas une coquetterie : `Header.tsx:42 — bouton sans label accessible` se corrige en 30 secondes ; un paragraphe qui "suggère de revoir l'accessibilité des boutons d'en-tête" demande 10 minutes de localisation avant même de corriger.

### Exemple concret
Demande : "audite `Header.tsx`" → la skill récupère les dernières directives en ligne, les applique au fichier, et rend une liste du type `Header.tsx:42 — bouton sans label accessible`.

### Exemple guidé, pas à pas
Demande : "vérifie l'accessibilité de ma page de connexion".
- **Directives fraîches** : téléchargement du jour — on note la version/date pour traçabilité ("audit basé sur les directives du 12/09/2026").
- **Périmètre** : `LoginForm.tsx`, `TextField.tsx` (demandés explicitement, pas toute l'app).
- **Vérification règle par règle** : labels (OK), contraste du bouton (FAIL — ratio 3,1:1 < 4,5:1 → `LoginForm.tsx:87`), focus visible (FAIL — `TextField.tsx:23`, pas d'anneau de focus), messages d'erreur liés aux champs (OK), navigation clavier (FAIL — le lien "mot de passe oublié" n'est pas atteignable au clavier → `LoginForm.tsx:112`).
- **Rapport** : 3 lignes `fichier:ligne`, classées par gravité, sans verbiage. Chaque ligne se corrige et se re-vérifie indépendamment.
- **Re-audit** : après corrections, on relance (avec directives re-téléchargées si un jour a passé) : 3/3 PASS. L'audit est clos avec sa preuve, pas avec un sentiment.

### Pièges fréquents
- Utiliser une version mémorisée/ancienne des directives au lieu de les re-télécharger à chaque audit (elles changent).
- Rendre un rapport verbeux au lieu du format concis `fichier:ligne` attendu.
- Auditer sans périmètre explicite ("toute l'app") : le rapport fait 200 lignes, personne ne le traite — un petit périmètre traité vaut mieux qu'un grand ignoré.
- Mélanger les gravités : un bouton sans label (bloquant pour certains utilisateurs) et une ombre imparfaite (cosmétique) dans la même liste sans distinction noient l'urgent dans l'anecdotique.
- Auditer une seule fois "pour toujours" : le code évolue, les directives évoluent — l'audit a une date de péremption, on le note et on le refait.

### Checklist de sortie
Directives téléchargées le jour même (date notée) ; périmètre nommé explicitement ; chaque règle vérifiée (PASS/FAIL localisé) ; rapport en `fichier:ligne` classé par gravité ; re-audit après corrections avec preuve de clôture.

### À toi de pratiquer
Demande (à un collègue, un agent, ou toi-même demain) l'audit d'UN fichier précis avec le format `fichier:ligne` exigé d'avance. Compare avec un audit "libre" du même fichier : compte les findings actionnables dans chaque cas — le format fait la différence.

### Pour dire que tu maîtrises cette skill
Tu sais pourquoi cette skill re-télécharge systématiquement les directives au lieu de s'appuyer sur une copie mémorisée.

---

## 8. `slack-gif-creator`

### C'est quoi
Une boîte à outils pour créer des GIFs animés optimisés pour Slack (contraintes de taille, de poids, de boucle), avec des concepts d'animation prêts à l'emploi.

Un GIF Slack n'est pas "une petite vidéo" : c'est un format contraint (poids limité, dimensions limitées, boucle parfaite exigée — un saut visible à la jointure de boucle ruine l'effet) avec des usages aux contraintes différentes (emoji minuscule vs message normal). Cette skill encapsule tout ce savoir technique — contraintes exactes, concepts d'animation testés, fonctions d'easing, stratégies d'optimisation — pour produire du premier coup un GIF qui passe les limites et qui a l'air professionnel au lieu d'amateur.

### Quand l'utiliser
Quand quelqu'un demande un GIF animé pour Slack ("fais-moi un GIF de X qui fait Y pour Slack").

Et seulement pour Slack (ou contraintes équivalentes) : pour une animation web classique, les formats vidéo modernes (WebM, MP4) sont supérieurs au GIF en poids et qualité — le GIF est un choix contraint, pas un choix par défaut. Le premier réflexe est donc de confirmer l'usage ("c'est bien pour Slack ? en emoji ou en message ?") car les contraintes en dépendent entièrement.

### Comment ça marche
1. **Connaître les contraintes Slack** (taille de fichier, dimensions, notamment plus strictes pour un usage en emoji). Les contraintes se vérifient avant de dessiner le moindre pixel : dimension max, poids max, nombre de couleurs — tout le travail en découle (nombre de frames, palette, dimensions).
2. **Flux de travail** : créer un "builder" de GIF → générer les frames → sauvegarder avec optimisation. Le builder centralise les paramètres (dimensions, fps, boucle) : on les règle une fois au début au lieu de les bricoler à la fin quand le fichier est trop lourd.
3. **Dessiner les graphiques** : soit à partir d'une image fournie par l'utilisateur, soit dessinés de zéro (formes simples, texte). Règle d'or : simplicité graphique — chaque détail coûte du poids ; un GIF Slack efficace, ce sont 2-3 formes qui bougent bien, pas une scène complexe qui saccade.
4. **Concepts d'animation prêts à l'emploi** : secousse/vibration, pulsation façon "battement de cœur", rebond, rotation, fondu, glissement, zoom, explosion en particules — chacun avec sa propre fonction d'accélération/décélération ("easing") : linéaire, rebond, élastique... L'easing, c'est ce qui sépare le mouvement "robotique" du mouvement "vivant" : un rebond qui décélère en fin de course paraît physique ; un mouvement linéaire paraît mécanique.
5. **Stratégies d'optimisation** pour rester sous la limite de poids (surtout critique pour un usage en emoji, plus petit). Leviers dans l'ordre : réduire les dimensions, réduire le nombre de frames, réduire la palette de couleurs, simplifier le fond (un fond uni compresse 10 fois mieux qu'un fond détaillé). On applique dans cet ordre jusqu'à passer sous la limite — jamais l'inverse (dégrader d'abord la qualité du mouvement).

### Exemple concret
"Fais-moi un GIF d'un cœur qui bat pour Slack" → utiliser le concept "pulse/heartbeat", avec une fonction d'easing du type "ease_in_out" pour un mouvement naturel, puis valider que le fichier final respecte la limite de poids Slack.

### Exemple guidé, pas à pas
Demande : "un GIF de fusée qui décolle pour fêter les releases, en emoji Slack".
- **Usage confirmé** : emoji → contraintes les plus strictes (petites dimensions, poids minimal). Ça change tout : 8 frames max, palette réduite, fond uni.
- **Concept** : "décollage" = glissement vertical + secousse d'allumage + traînée de particules. Easing : accélération progressive (ease-in) pour le décollage — une fusée ne part pas à vitesse constante.
- **Boucle** : la fusée sort par le haut → pause d'une frame → réapparition en bas. La jointure est testée en boucle 5 fois de suite : aucun saut visible.
- **Optimisation** : premier export 180 Ko (trop lourd pour emoji) → dimensions réduites → 90 Ko → palette réduite → 45 Ko. Sous la limite, mouvement intact.
- **Livraison** : fichier + rappel des limites ("ne pas ajouter de texte, illisible en 32px").
- Sans la méthode (frames au hasard + easing linéaire + vérification du poids "à la fin"), on obtient un GIF saccadé de 400 Ko qui ne passe pas en emoji — puis 3 allers-retours pour le réparer.

### Pièges fréquents
- Ignorer la limite de poids/taille spécifique à un usage en emoji (bien plus stricte qu'un GIF de message normal).
- Utiliser une interpolation linéaire brute pour toutes les animations, ce qui donne un rendu mécanique — les fonctions d'easing (rebond, élastique...) rendent le mouvement plus naturel.
- Dessiner trop détaillé pour un usage minuscule : en 32 pixels, les détails deviennent de la bouillie — 2 formes lisibles valent mieux que 10 illisibles.
- Oublier de tester la boucle en continu : un GIF testé une seule fois peut sembler parfait et sauter visiblement à la 3e boucle.
- Optimiser en dégradant le mouvement d'abord (moins de frames) au lieu des dimensions/palette : la fluidité est ce que l'œil remarque en premier — on sacrifie dimensions et couleurs AVANT de toucher à la fluidité.

### Checklist de sortie
Usage confirmé (emoji vs message) avec ses limites exactes ; concept choisi parmi le catalogue + easing adapté (pas de linéaire par défaut) ; boucle testée 5 fois sans saut ; poids sous la limite (leviers appliqués dans l'ordre : dimensions → frames → palette → fond) ; lisible à la taille réelle d'affichage.

### À toi de pratiquer
Prends n'importe quel GIF animé que tu as sous la main et audite-le avec la grille : boucle parfaite ? easing naturel ou linéaire ? lisible en petit ? poids justifié ? Note 2 défauts et comment tu les corrigerais — cet œil critique est exactement ce que la skill entraîne.

### Pour dire que tu maîtrises cette skill
Tu sais citer au moins 4 concepts d'animation prêts à l'emploi (secousse, pulsation, rebond, fondu...) et à quoi sert une fonction d'easing.

---

## Récapitulatif — Partie 1/5

| # | Skill | En une phrase |
|---|-------|----------------|
| 1 | frontend-ui-engineering | Le guide central : accessible, responsive, non-générique |
| 2 | composition-patterns | Composants composés plutôt que props booléennes multiples |
| 3 | react-best-practices | 70 règles de performance React/Next.js, par priorité |
| 4 | react-native-skills | L'équivalent mobile : listes, animations, patterns natifs |
| 5 | landing-prompt-playbook | Bien formuler un prompt de génération de landing page |
| 6 | react-view-transitions | Animations natives fluides entre états d'interface |
| 7 | web-design-guidelines | Audite une interface contre des directives toujours à jour |
| 8 | slack-gif-creator | Crée des GIFs animés optimisés pour Slack |

**Suite (partie 2/5) :** le sous-dossier `anthropics` + `diagram-design` (6 skills) — design frontend, diagrammes, traitement de documents visuels.
