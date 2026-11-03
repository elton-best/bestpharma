# Cours — Catégorie 02-backend-docs (Partie 2/4)

**Domaine :** Backend / production de documents — sous-dossier `anthropics` (5 skills : `doc-coauthoring`, `docx`, `pdf`, `pptx`, `xlsx`).
**Public visé :** quelqu'un qui ne connaît rien aux "agent skills" et veut comprendre, puis utiliser, chaque skill — même sans bagage technique préalable.

> Ces 5 skills couvrent la production de contenu bureautique : une méthode de co-écriture structurée (`doc-coauthoring`), puis les trois formats de fichiers Microsoft Office les plus courants (Word, PowerPoint, Excel) et le format PDF — chacun avec ses propres pièges techniques très spécifiques, qu'on va détailler un par un.

---

## 1. `doc-coauthoring`

### C'est quoi, en profondeur
Ce n'est pas une skill technique au sens "manipulation de fichiers" — c'est une **méthode de collaboration structurée** pour co-écrire un document important (une spec technique, une proposition, un "decision doc", un RFC) avec un agent IA, en 3 étapes bien définies. L'idée centrale : la plupart des mauvais documents ne sont pas mal écrits par manque de talent, mais parce que l'auteur **connaît des choses que le lecteur ne connaît pas**, et cet écart n'a jamais été comblé consciemment avant l'écriture.

### Quand l'utiliser
Dès qu'on mentionne vouloir écrire de la documentation, un "PRD", un "design doc", une proposition, un "RFC", ou toute tâche d'écriture substantielle et structurée.

### L'offre initiale
Avant de commencer, la skill propose explicitement ce flux de travail en expliquant les 3 étapes (Rassemblement du contexte, Raffinement & Structure, Test auprès du lecteur), et demande si la personne veut l'essayer ou préfère travailler de façon libre. **Si elle refuse, on travaille en mode libre. Si elle accepte, on passe à l'Étape 1.**

### Étape 1 — Rassemblement du contexte
**Objectif :** combler l'écart entre ce que la personne sait et ce que l'agent sait, pour permettre un bon accompagnement ensuite.

**Questions initiales à poser** (des questions "méta" sur le document lui-même) :
1. Quel type de document est-ce ? (ex : spec technique, decision doc, proposition)
2. Qui est le public principal ?
3. Quel est l'impact souhaité une fois que quelqu'un l'aura lu ?
4. Y a-t-il un template ou un format précis à suivre ?
5. D'autres contraintes ou contexte à connaître ?

La personne peut répondre en style télégraphique ou tout déverser en vrac, selon ce qui lui convient le mieux.

**Si un template ou un type de document est mentionné :** demander si un document-modèle peut être partagé ; si un lien vers un document partagé est donné, utiliser l'intégration appropriée pour le récupérer ; si un fichier est fourni, le lire.

**Si la personne mentionne modifier un document déjà partagé existant :** lire son état actuel via l'intégration disponible, et **vérifier les images sans texte alternatif (alt-text)**. Si des images en sont dépourvues, expliquer que lorsque d'autres utiliseront un agent IA pour comprendre le document, celui-ci ne pourra pas "voir" ces images — proposer de générer le texte alternatif si la personne colle chaque image dans la conversation.

**Le "déversement d'information" (info dumping) :** une fois les questions initiales répondues, encourager la personne à tout déverser sans se soucier de l'organisation — contexte du projet, discussions d'équipe pertinentes, pourquoi les solutions alternatives ne sont pas retenues, contexte organisationnel (dynamiques d'équipe, incidents passés, politique interne), contraintes de calendrier, architecture technique, préoccupations des parties prenantes. Plusieurs canaux sont proposés : flux de conscience en vrac, pointer vers des canaux d'équipe ou fils de discussion, lien vers des documents partagés.

**Si des outils connectés sont disponibles** (Slack, Teams, Google Drive, SharePoint...), mentionner qu'ils peuvent être utilisés pour importer directement le contexte. **Si aucune intégration n'est détectée** (dans Claude.ai ou l'application Claude), suggérer d'activer des connecteurs dans les paramètres.

**Pendant le rassemblement du contexte :**
- Si la personne mentionne des canaux ou documents inconnus → demander si les outils connectés doivent être utilisés pour en apprendre plus, et **attendre sa confirmation avant de chercher**.
- Suivre en continu ce qui est appris et ce qui reste flou.

**Les questions de clarification :** une fois le déversement initial fait, générer **5 à 10 questions numérotées** basées sur les lacunes identifiées. La personne peut répondre en style télégraphique (ex : "1: oui, 2: voir #canal, 3: non à cause de la rétrocompatibilité").

**Condition de sortie de cette étape :** le contexte est suffisant quand les questions posées montrent une vraie compréhension — c'est-à-dire quand on peut interroger sur des cas limites et des compromis sans avoir besoin qu'on ré-explique les bases.

### Étape 2 — Raffinement & Structure
**Objectif :** construire le document section par section, par brainstorming, curation, et raffinement itératif.

**Ordre des sections :** commencer par celle qui comporte le plus d'inconnues — généralement la décision/proposition centrale pour un "decision doc", ou l'approche technique pour une spec. Les sections de résumé sont laissées pour la fin.

**Une fois la structure convenue :** créer la structure initiale du document avec du texte de remplacement pour toutes les sections. **Si l'accès aux artefacts est disponible**, utiliser `create_file` pour créer un artefact — cela donne à la personne et à l'agent un squelette commun à partir duquel travailler. **Sinon**, créer un fichier markdown dans le répertoire de travail avec un nom approprié (ex : `decision-doc.md`).

**Pour chaque section, le cycle en 6 étapes :**
1. **Questions de clarification** — 5 à 10 questions spécifiques sur ce que la section doit couvrir.
2. **Brainstorming** — générer 5 à 20 options numérotées (selon la complexité de la section), en cherchant du contexte partagé qui aurait pu être oublié, ou des angles pas encore mentionnés. Proposer d'en générer davantage si souhaité.
3. **Curation** — demander quels points garder, retirer, ou combiner, avec de brèves justifications (ex : "Garder 1,4,7,9", "Retirer 3 (doublon de 1)", "Combiner 11 et 12"). Si la personne donne un retour libre plutôt que numéroté ("ça a l'air bien" ou "j'aime la plupart mais..."), extraire ses préférences et procéder quand même.
4. **Vérification des trous** — demander s'il manque quelque chose d'important.
5. **Rédaction** — utiliser `str_replace` pour remplacer le texte de remplacement par le contenu réellement rédigé. **Conseil clé à donner à la personne dès la première section** : plutôt que d'éditer le document directement, indiquer ce qu'il faut changer (ex : "Retire la puce X — déjà couverte par Y", "Rends le troisième paragraphe plus concis") — cela aide l'agent à apprendre le style de la personne pour les sections suivantes.
6. **Raffinement itératif** — utiliser `str_replace` pour chaque modification (**ne jamais réimprimer le document entier**). Continuer jusqu'à satisfaction. Après 3 itérations consécutives sans changement substantiel, demander s'il y a quelque chose à retirer sans perdre d'information importante — un signal que la section est "à l'os".

**À l'approche de la fin** (80%+ des sections terminées) : annoncer une relecture complète du document entier, en cherchant la cohérence entre sections, la redondance ou les contradictions, tout ce qui ressemble à du remplissage générique ("slop"), et si chaque phrase porte vraiment son poids.

### Étape 3 — Test auprès du lecteur (Reader Testing)
**Objectif :** tester le document avec un Claude "frais" (sans le contexte de la conversation) pour vérifier qu'il fonctionne réellement pour un lecteur — cela révèle les angles morts (ce qui est clair pour les auteurs mais confus pour les autres).

**Si l'accès à des sous-agents est disponible** (par exemple dans Claude Code), le test se fait directement sans impliquer la personne :
1. **Prédire les questions du lecteur** — générer 5 à 10 questions réalistes que des lecteurs poseraient.
2. **Tester avec un sous-agent** — pour chaque question, invoquer un sous-agent avec uniquement le contenu du document et la question (sans aucun contexte de la conversation d'origine), puis résumer ce que ce "Claude lecteur" a bien/mal compris.
3. **Vérifications additionnelles** — invoquer un sous-agent pour chercher de l'ambiguïté, de fausses suppositions, des contradictions.
4. **Rapporter et corriger** — si des problèmes sont trouvés, les lister, puis revenir à l'étape de raffinement pour les sections concernées.

**Si aucun accès à des sous-agents** (par exemple sur l'interface web claude.ai), la personne doit faire le test manuellement : ouvrir une conversation Claude neuve, y coller le document, poser les questions générées, et vérifier les réponses, l'ambiguïté perçue, et les suppositions de contexte implicites.

**Condition de sortie :** quand le "Claude lecteur" répond systématiquement correctement et ne fait plus émerger de nouveaux trous ou ambiguïtés, le document est prêt.

### Revue finale
Une fois le test du lecteur réussi : recommander à la personne de faire elle-même une dernière relecture (elle est responsable de la qualité de son document), de revérifier les faits/liens/détails techniques, et de vérifier que le document atteint bien l'impact souhaité. Conseils finaux : envisager de lier la conversation en annexe pour montrer comment le document a été élaboré, utiliser des annexes pour donner de la profondeur sans alourdir le corps principal, et mettre à jour le document au fil des retours de vrais lecteurs.

### Conseils de posture pour l'agent (utile à connaître même côté utilisateur)
- **Ton direct et procédural**, sans "vendre" la méthode — juste l'exécuter.
- Si la personne veut sauter une étape : demander si elle préfère écrire librement, plutôt que d'insister.
- Si la personne semble frustrée : reconnaître que ça prend plus de temps que prévu, et proposer des façons d'accélérer.
- **Ne jamais laisser les lacunes de contexte s'accumuler** — les traiter au fur et à mesure qu'elles apparaissent.
- **Gestion des artefacts** : `create_file` pour rédiger des sections complètes, `str_replace` pour toutes les modifications, un lien d'artefact fourni après chaque changement — jamais d'artefact pour de simples listes de brainstorming (cela reste de la conversation).

### Exemple concret de bout en bout
Une personne dit : "j'ai besoin d'écrire un decision doc sur le choix de notre base de données." L'agent propose le flux en 3 étapes ; la personne accepte. Étape 1 : questions sur le public (l'équipe technique ? la direction ?), l'impact souhaité (obtenir une validation ? juste documenter ?), puis déversement du contexte (pourquoi PostgreSQL est envisagé, pourquoi MongoDB a été écarté, contraintes de budget). Étape 2 : structure proposée (Contexte, Options considérées, Recommandation, Risques, Plan de migration), section "Recommandation" traitée en premier car c'est la plus incertaine. Étape 3 : un Claude "frais" lit le document et demande "pourquoi MongoDB a-t-il été écarté ?" — si cette information n'est pas dans le document, c'est un trou à combler avant de le partager.

### Pièges fréquents
- Réimprimer le document entier à chaque petite modification au lieu d'utiliser `str_replace` — ce qui rend le suivi des changements confus et gaspille de l'espace.
- Sauter le test avec un lecteur "frais" en pensant que le document est déjà clair — c'est justement le moment où les angles morts (invisibles pour l'auteur) se révèlent.
- Oublier de vérifier le texte alternatif des images dans un document existant à modifier.

### Checklist de sortie
Contexte rassemblé avant la première phrase écrite ; structure présentée et validée avant rédaction complète ; test lecteur effectué (quelqu'un a compris sans explication orale) ; revue finale passée (faits exacts, ton adapté, longueur tenue) ; rien d'inventé (tout fait est sourcé ou marqué comme hypothèse) ; document rangé là où on le retrouvera.

### À toi de pratiquer
Prends un brouillon existant (email long, doc, message) et fais-le passer par les 3 étapes : liste ce qui manque comme contexte, restructure avec des titres, fais-le lire à quelqu'un et note précisément ce qu'il n'a pas compris du premier coup.

### Pour dire que tu maîtrises cette skill
Tu sais réciter les 3 étapes (Contexte, Raffinement & Structure, Test lecteur) et le cycle en 6 étapes pour chaque section (questions → brainstorming → curation → vérification des trous → rédaction → raffinement itératif), et tu sais pourquoi tester avec un "Claude frais, sans contexte" est essentiel pour révéler les angles morts d'un document.

---

## 2. `docx`

### C'est quoi, en profondeur
Cette skill gère la création, l'édition et la lecture de fichiers Word (`.docx`). Le point de départ technique essentiel à comprendre : **un `.docx` est en réalité une archive ZIP contenant des fichiers XML.** Comprendre cela explique pourquoi certaines opérations (éditer un document existant) nécessitent de littéralement dézipper le fichier, modifier le XML à l'intérieur, puis re-zipper.

### Quand l'utiliser
Dès qu'un fichier Word (`.docx`/`.dotx`) est en jeu — création, lecture, édition, extraction ou réorganisation de contenu, insertion d'images, recherche-remplacement, gestion des modifications suivies ou des commentaires.

### Choisir la bonne approche selon la tâche
| Tâche | Approche |
|---|---|
| **Créer** un nouveau document | Écrire un script avec la librairie `docx` (npm) |
| **Éditer** un document existant | `unzip` → modifier `word/document.xml` → `zip` (la librairie `docx-js` ne peut pas ouvrir un fichier existant) |
| **Lire** le contenu | `pandoc -t markdown fichier.docx` |

### Créer avec docx-js : les pièges techniques précis
- **La taille de page par défaut est A4.** Pour un format lettre US, il faut définir `page: { size: { width: 12240, height: 15840 } }` — ces valeurs sont en DXA, une unité où **1440 = 1 pouce**.
- **Paysage :** on passe les dimensions en mode portrait ET `orientation: PageOrientation.LANDSCAPE` — la librairie inverse elle-même largeur/hauteur en interne. Passer déjà des dimensions inversées manuellement casserait le calcul.
- **Les tableaux ont besoin d'une double définition de largeur** : `columnWidths` sur le tableau ET `width` sur chaque cellule, toutes deux en `WidthType.DXA` (utiliser `PERCENTAGE` casse l'affichage dans Google Docs). Les largeurs de colonnes doivent totaliser exactement la largeur du tableau.
- **Ombrage de tableau :** utiliser `ShadingType.CLEAR`, jamais `SOLID` (qui s'affiche entièrement en noir).
- **Listes :** ne jamais insérer un caractère `•` littéralement dans le texte — utiliser une configuration `numbering` avec `LevelFormat.BULLET`.
- **`ImageRun` exige un paramètre `type:`** précis (`"png"`, `"jpg"`, etc.) — l'omettre fait échouer l'insertion.
- **`PageBreak` doit être à l'intérieur d'un `Paragraph`** — le placer ailleurs génère une structure invalide.
- **Ne jamais utiliser `\n`** dans le texte — chaque ligne doit être un élément `Paragraph` séparé.
- **Table des matières (TOC) :** les titres doivent utiliser les styles intégrés `HeadingLevel.*` — des styles de titre personnalisés doivent avoir leur `outlineLevel` défini explicitement, sinon ils n'apparaîtront pas dans la table des matières générée.
- **Ne pas utiliser un tableau comme ligne horizontale de séparation** — utiliser plutôt une bordure inférieure de paragraphe.
- **Pour aligner du texte à droite sur la même ligne avec des points de suite** (comme dans une table des matières manuelle "Titre......Page 3"), utiliser `PositionalTab` avec `alignment: PositionalTabAlignment.RIGHT` et `leader: PositionalTabLeader.DOT` à l'intérieur d'un `TextRun` — jamais un point littéral ou des espaces de remplissage, qui ne s'alignent jamais correctement selon la police.

### Vérifier le résultat (obligatoire)
Après avoir écrit un `.docx`, il faut le **rendre visuellement et le regarder** :
```bash
python scripts/office/soffice.py --headless --convert-to pdf output.docx
pdftoppm -jpeg -r 100 output.pdf page
ls page-*.jpg   # puis lire ces images
```
Un détail technique à noter : `pdftoppm` complète les numéros de page avec des zéros selon le nombre total de pages du document (par exemple `page-01.jpg` à `page-12.jpg`).

### Éditer un document existant — la procédure complète
Les fichiers `.doc` (ancien format) doivent d'abord être convertis en `.docx`.

```bash
unzip -q doc.docx -d unpacked/
find unpacked -type l -delete   # supprimer les liens symboliques — un docx d'une source externe est une donnée non fiable
python scripts/merge_runs.py unpacked/   # fusionner les fragments de texte pour qu'ils soient repérables
# éditer unpacked/word/document.xml en place — ne JAMAIS reformater ou "pretty-print" le XML
(cd unpacked && rm -f ../out.docx && zip -Xr ../out.docx .)
python scripts/office/validate.py out.docx --original doc.docx   # vérifications XSD ; --auto-repair corrige les problèmes courants
```

**Pourquoi `merge_runs.py` est nécessaire :** Word fragmente le texte en de nombreux blocs (`<w:r>`, appelés "runs") pour des raisons internes (identifiants de révision, marqueurs de correction orthographique). Résultat : une phrase visible à l'écran n'existe souvent **pas** comme chaîne de caractères continue dans le XML — elle est éclatée en plusieurs morceaux. Le script fusionne les blocs adjacents ayant un formatage identique, sans changer le contenu ni le rendu visuel, ce qui rend le texte de nouveau "trouvable" pour une recherche-remplacement.

### Modifications suivies (Tracked Changes) — la partie la plus délicate techniquement
Lors d'un "redlining" (marquage de modifications suivies), il faut valider avec `--author "<le nom sous lequel les modifications ont été faites>"` (nécessite aussi `--original`) — cela rapporte tout texte modifié **sans** être entouré d'un `<w:ins>`/`<w:del>`, une erreur facile à faire accidentellement et **invisible dans la vue "modifications acceptées."**

**Mécanique précise :**
- Envelopper les blocs modifiés dans `<w:ins>`/`<w:del>` avec les attributs `w:id`, `w:author`, `w:date`.
- À l'intérieur d'un `<w:del>`, l'élément de texte est `<w:delText>`, **pas** `<w:t>`.
- Un marqueur de paragraphe supprimé (`<w:pPr><w:rPr><w:del .../></w:rPr></w:pPr>`) signifie "fusionner ce paragraphe avec le suivant" — donc supprimer un paragraphe entier, c'est cela **plus** un `<w:del>` autour de chaque bloc de texte du paragraphe.
- L'élément `<w:del/>` doit apparaître **avant** les autres enfants du `rPr` — leur ordre est imposé par le schéma XML, pas arbitraire.

**Pour produire une copie propre avec toutes les modifications acceptées :** `python scripts/accept_changes.py in.docx out.docx`.

**Un piège subtil à connaître absolument :** accepter un marqueur de paragraphe supprimé devrait fusionner ce paragraphe avec celui du dessous, faisant disparaître un paragraphe dont **tous** les blocs de texte sont supprimés. Or ni `pandoc --track-changes=accept` ni, dans un cas particulier, `accept_changes.py` (basé sur LibreOffice) ne le font systématiquement correctement :
- `pandoc --track-changes=accept` **ne fusionne jamais** les paragraphes — il laisse un paragraphe vide qui apparaît comme une puce fantôme dans une liste numérotée.
- `accept_changes.py` fusionne correctement, **sauf** quand le paragraphe supprimé est suivi d'un paragraphe d'espacement vide.
**Conclusion pratique :** une puce vide visible dans l'un de ces outils est un artefact de cet outil, pas un vrai défaut du document — il faut vérifier les suppressions de paragraphes directement dans le XML pour en être certain.

### Commentaires
Les commentaires nécessitent **six fichiers XML interconnectés**. On utilise un script d'assistance qui gère toute cette complexité :
```bash
# Contre un répertoire déjà décompressé (préférable si on édite aussi document.xml)
python scripts/comment.py unpacked/ "Le plafond de frais est trop bas"
python scripts/comment.py unpacked/ "D'accord" --parent 0

# Directement contre un .docx
python scripts/comment.py contract.docx "Ce plafond est trop bas" -o annotated.docx
```
Le script écrit `comments.xml`, `commentsExtended.xml`, `commentsIds.xml`, `commentsExtensible.xml`, les relations, et les surcharges de type de contenu. Les identifiants de commentaire sont attribués automatiquement. Il imprime ensuite le fragment `<w:commentRangeStart>`/`<w:commentRangeEnd>`/`<w:commentReference>` à ajouter dans `word/document.xml` pour que le commentaire s'ancre au texte précis visé — **tant que ces marqueurs ne sont pas placés, le commentaire existe mais n'est pas visible** dans le document.

### Pièges fréquents
- Oublier `type:` sur un `ImageRun`, ce qui fait échouer l'insertion d'image.
- Reformater/"pretty-print" le XML lors d'une édition manuelle, ce qui peut casser subtilement la structure.
- Confondre `<w:t>` et `<w:delText>` dans une modification suivie.
- Interpréter une puce vide dans une vue d'outil comme un vrai bug du document, sans vérifier le XML source.

### Exemple guidé, pas à pas
Besoin : générer `rapport-mensuel.docx` (titre, tableau 3×4, pied de page avec date).
- **Approche** : création from scratch → bibliothèque de génération (pas d'édition de template, il n'y en a pas).
- **Génération minimale** : titre, tableau avec en-têtes, pied de page — rien de plus pour commencer.
- **Vérification obligatoire** : on OUVRE le fichier dans Word/LibreOffice. Constat : tableau sans bordures visibles. Correction, régénération, réouverture : bordures OK. On n'a jamais cru la génération sur parole.
- **Relecture** : activation du suivi des modifications avant envoi au collègue, pour recevoir des corrections propres au lieu d'un "j'ai tout réécrit".
- Sans l'ouverture de contrôle, le rapport serait parti avec un tableau invisible — détecté en 30 secondes grâce à la règle "toujours ouvrir".

### Checklist de sortie
Approche choisie selon la tâche (créer / éditer / suivi / commentaires) ; fichier généré OUVERT dans un vrai logiciel et relu visuellement ; suivi des modifications activé si relecture attendue ; commentaires placés aux bons endroits ; aucun rendu supposé sans ouverture de contrôle.

### À toi de pratiquer
Génère un document d'une page contenant un tableau, ouvre-le dans 2 logiciels différents et note les différences de rendu. Puis active le suivi des modifications et simule une relecture : vérifie que les marques apparaissent comme attendu.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi un `.docx` est en réalité une archive ZIP de fichiers XML, tu sais pourquoi `merge_runs.py` est nécessaire avant une recherche-remplacement, et tu sais distinguer `<w:t>` de `<w:delText>` dans le contexte des modifications suivies.

---

## 3. `pdf`

### C'est quoi, en profondeur
Cette skill couvre toutes les opérations possibles sur des fichiers PDF : lecture/extraction de texte et de tableaux, fusion, division, rotation, filigrane, création, remplissage de formulaires, chiffrement/déchiffrement, extraction d'images, et OCR sur des PDF scannés.

### Quand l'utiliser
Dès qu'un fichier `.pdf` est mentionné, en entrée ou en sortie.

### Les bibliothèques Python à connaître, et pour quoi chacune sert

**`pypdf` — opérations de base :**
```python
from pypdf import PdfWriter, PdfReader

# Fusionner plusieurs PDF
writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
    reader = PdfReader(pdf_file)
    for page in reader.pages:
        writer.add_page(page)
with open("merged.pdf", "wb") as output:
    writer.write(output)
```
`pypdf` sert aussi à diviser un PDF (une page par fichier de sortie), extraire les métadonnées (titre, auteur, sujet, créateur), faire pivoter des pages (`page.rotate(90)`), ajouter un filigrane (fusionner une page de filigrane sur chaque page du document), ou chiffrer un PDF avec un mot de passe (`writer.encrypt("userpassword", "ownerpassword")`).

**`pdfplumber` — extraction de texte et de tableaux :**
```python
import pdfplumber
with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
```
Pour les tableaux, `page.extract_tables()` renvoie une liste de tableaux, chacun une liste de lignes. On peut ensuite construire un DataFrame pandas avec la première ligne comme en-têtes (`pd.DataFrame(table[1:], columns=table[0])`) et exporter le tout vers Excel.

**`reportlab` — création de PDF depuis zéro :**
Deux approches : le "canvas" bas niveau (`canvas.Canvas("hello.pdf")` avec `drawString`, `line`...) pour un contrôle précis position par position, ou l'approche "Platypus" haut niveau (`SimpleDocTemplate` + une liste d'objets `Paragraph`/`Spacer`/`PageBreak`) pour des documents multi-pages avec une mise en page fluide.

** Un piège très spécifique et important sur les exposants/indices :** ne **jamais** utiliser les caractères Unicode d'indice/exposant (₀₁₂₃₄₅₆₇₈₉, ⁰¹²³⁴⁵⁶⁷⁸⁹) dans un PDF généré avec ReportLab. Les polices intégrées par défaut ne contiennent pas ces glyphes, ce qui les fait s'afficher comme des **carrés noirs pleins** — un bug visuel très déroutant si on ne connaît pas cette limitation. La solution : utiliser les balises de balisage XML de ReportLab à l'intérieur d'un objet `Paragraph` :
```python
# Indices : balise <sub>
chemical = Paragraph("H<sub>2</sub>O", styles['Normal'])
# Exposants : balise <super>
squared = Paragraph("x<super>2</super> + y<super>2</super>", styles['Normal'])
```
Pour du texte dessiné directement sur un canvas (pas un objet `Paragraph`), il faut ajuster manuellement la taille et la position de la police plutôt que d'utiliser des caractères Unicode d'indice/exposant.

### Les outils en ligne de commande à connaître
| Outil | Usage |
|---|---|
| `pdftotext` (poppler-utils) | Extraction de texte, avec `-layout` pour préserver la mise en page, ou `-f`/`-l` pour des pages spécifiques |
| `qpdf` | Fusion (`--empty --pages ...`), division par plage de pages, rotation (`--rotate=+90:1`), suppression de mot de passe (`--decrypt`) |
| `pdftk` (si disponible) | Fusion (`cat output`), division (`burst`), rotation |

### Tâches courantes supplémentaires
- **OCR sur un PDF scanné** : convertir chaque page en image (`pdf2image`), puis appliquer `pytesseract.image_to_string()` sur chaque image pour extraire le texte.
- **Extraction d'images** : `pdfimages -j input.pdf output_prefix` (poppler-utils) extrait toutes les images embarquées.

### Tableau de référence rapide
| Tâche | Meilleur outil | Approche |
|---|---|---|
| Fusionner des PDF | pypdf | `writer.add_page(page)` |
| Diviser des PDF | pypdf | Une page par fichier |
| Extraire du texte | pdfplumber | `page.extract_text()` |
| Extraire des tableaux | pdfplumber | `page.extract_tables()` |
| Créer des PDF | reportlab | Canvas ou Platypus |
| Fusion en ligne de commande | qpdf | `qpdf --empty --pages ...` |
| OCR de PDF scannés | pytesseract | Convertir en image d'abord |
| Remplir des formulaires PDF | pdf-lib ou pypdf | Voir un guide dédié spécifique aux formulaires |

### Pièges fréquents
- Utiliser des caractères Unicode d'indice/exposant dans un texte ReportLab, ce qui produit des carrés noirs illisibles au rendu.
- Choisir `pypdf` pour extraire du texte avec mise en page complexe ou des tableaux, alors que `pdfplumber` est bien plus adapté à cet usage précis.
- Oublier qu'un PDF scanné n'a pas de "texte" à extraire directement — il faut d'abord passer par l'OCR.

### Exemple guidé, pas à pas
Besoin : extraire le texte d'un rapport PDF de 10 pages pour l'indexer.
- **D'abord, de quel PDF s'agit-il ?** Test en 10 secondes : le texte se sélectionne-t-il à la souris ? Oui → PDF texte natif, pas besoin d'OCR (l'OCR serait plus lent et moins fidèle).
- **Outil** : bibliothèque d'extraction texte (pas de moteur OCR, pas de convertisseur lourd) — l'outil adapté à CETTE tâche précise.
- **Extraction + vérification sur échantillon** : pages 1, 5 et 10 comparées visuellement au texte extrait. Page 7 : un graphique sans texte extractible → noté comme limite connue, pas ignoré en silence.
- **Cas limites** : le PDF n'est pas protégé par mot de passe ici, mais on a vérifié avant de supposer (une extraction qui échoue silencieusement sur un PDF protégé produit un résultat vide trompeur).
- Résultat : texte indexable en 5 minutes, limites documentées — au lieu d'une extraction aveugle dont personne n'aurait vérifié la fidélité.

### Checklist de sortie
Tâche identifiée précisément (extraire / créer / fusionner / formulaire) ; nature du PDF vérifiée avant l'outil (texte natif vs scanné vs protégé) ; outil choisi pour CETTE tâche ; résultat vérifié sur échantillon, jamais en aveugle ; cas limites traités ou documentés comme limites connues.

### À toi de pratiquer
Prends n'importe quel PDF sur ton disque : détermine en 2 minutes s'il contient du vrai texte, des images, ou les deux (test de sélection + extraction d'essai). Choisis l'outil adapté et justifie ton choix en 2 phrases.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi les caractères Unicode d'indice/exposant posent problème avec ReportLab et connais la solution (balises `<sub>`/`<super>`), et tu sais quelle bibliothèque choisir selon la tâche (pypdf pour la manipulation de pages, pdfplumber pour l'extraction de texte/tableaux, reportlab pour la création).

---

## 4. `xlsx`

### C'est quoi, en profondeur
Cette skill couvre la création, l'édition et l'analyse de feuilles de calcul Excel (`.xlsx`, `.xlsm`, `.xltx`, `.csv`, `.tsv`). C'est probablement la skill la plus **techniquement piégeuse** de toute cette catégorie, car Excel a un comportement de calcul (les formules) qui doit être vérifié activement — un fichier généré par erreur peut sembler correct visuellement tout en contenant des formules cassées.

### Quand l'utiliser
Dès qu'un fichier tableur est l'entrée ou la sortie principale d'une tâche — ouvrir, éditer, corriger, créer, ou convertir entre formats tabulaires.

### Choisir la bonne approche selon la tâche
| Tâche | Approche |
|---|---|
| Créer/éditer avec formules et mise en forme | `openpyxl` |
| Données en masse (import/export) | `pandas` (`read_excel`, `to_excel`) |
| Coup d'œil rapide sur une feuille | `markitdown fichier.xlsx` (pas de coordonnées de cellule — ne pas planifier d'éditions à partir de ça) |
| Lire un modèle (formules ET valeurs) | Deux passes de `load_workbook` (voir plus bas) |

### Les exigences pour TOUTE sortie produite
- **Police professionnelle** (Arial, Times New Roman) partout, sauf indication contraire de l'utilisateur.
- **Zéro erreur de formule.** Ne jamais livrer tant que le script de recalcul rapporte des erreurs trouvées. Si une erreur semble préexistante, il faut le **prouver** en chargeant l'original avec `data_only=True` — sinon une erreur qu'on a soi-même introduite ressemble exactement à une erreur héritée.
- **Utiliser des formules, jamais des résultats codés en dur.** Écrire `sheet['B10'] = '=SUM(B2:B9)'`, pas le total déjà calculé en Python. La feuille doit pouvoir se recalculer si les données d'entrée changent.
- **Suivre la spécification de l'utilisateur littéralement** — noms d'onglets exacts, en-têtes de colonnes exacts, la formule qu'il a précisément demandée. Une "amélioration" qui calcule autre chose est un échec, même si elle est élégante.
- **Documenter chaque supposition et chaque nombre codé en dur** là où le lecteur le verra — un commentaire de cellule, ou une cellule adjacente en fin de tableau. Citer une vraie source quand elle existe.
- **Un classeur créé pour que quelqu'un le remplisse** a besoin d'une légende courte nommant les cellules à éditer, et d'une ligne d'exemple avec des valeurs réalistes montrant le format attendu. **Ne jamais ajouter une telle ligne à un fichier qu'on nous a demandé d'éditer** (ce serait ajouter une fausse donnée dans un fichier réel).
- **En éditant un fichier existant : respecter exactement ses conventions déjà en place** — elles priment sur toutes les autres règles. Trouver d'abord ses cellules de saisie désignées (souvent marquées par une couleur de police, un remplissage ou un ombrage distinct), n'écrire que là, et ne jamais toucher une formule existante.

### Le recalcul — obligatoire dès qu'il y a des formules
**Le piège fondamental à comprendre** : `openpyxl` écrit les formules comme de simples chaînes de texte, **sans valeur mise en cache**. Tant qu'un recalcul n'a pas eu lieu, chaque cellule de formule se lit comme `None` pour tout ce qui lit des valeurs mises en cache — `pandas`, `load_workbook(data_only=True)`, et la plupart des prévisualiseurs.

```bash
python scripts/recalc.py output.xlsx [timeout_secondes]   # défaut 30
```
LibreOffice calcule chaque formule, **le fichier est réécrit sur place**, et on récupère un rapport JSON avec un statut (`success` ou `errors_found`), le nombre total de formules, le nombre total d'erreurs, et un résumé nommant jusqu'à 100 cellules par type d'erreur. **Un détail crucial** : un JSON avec une clé `error` (et non `status`) signifie que rien n'a été recalculé — c'est le **seul** cas qui donne un code de sortie différent de zéro. `errors_found` donne un code de sortie **zéro** malgré la présence d'erreurs — il ne faut donc **jamais** traiter une sortie "propre" (code zéro) comme la preuve d'un classeur sans erreur.

**Un recalcul vert prouve seulement que les formules s'évaluent, pas qu'elles sont justes.** Une plage décalée d'une ligne ou une référence à la mauvaise cellule donne un fichier propre, sans erreur, mais avec des chiffres faux. La bonne pratique : écrire 2 à 3 formules d'abord et vérifier qu'elles récupèrent bien les valeurs attendues, avant de construire toute une grille sur le même modèle.

**Un piège spécifique aux fichiers qui pointent vers un autre classeur externe :** ces liens sont **perdus** si on ré-enregistre le fichier avec `openpyxl` puis qu'on le recalcule. Une telle formule ressemble à `='[1]Returns Analysis'!$B$2` — le `[1]` est un index vers la liste des références externes du classeur, pointant vers un **fichier séparé sur le disque**. Ce fichier est rarement présent dans l'environnement de travail, donc la valeur mise en cache dans la cellule est la seule chose qui retient sa donnée. `openpyxl` supprime cette valeur à l'enregistrement, LibreOffice doit alors résoudre la référence pour de vrai, échoue, écrit `#NAME?`, et **supprime tous les liens**. `recalc.py` refuse même de tourner dans cet état — il faut copier les valeurs de ces cellules depuis l'original **avant** de sauvegarder par-dessus (l'option `--force` outrepasse cette protection et accepte la perte).

### Choisir des formules qui survivent à la vérification
LibreOffice implémente moins de fonctions qu'Excel, et une fonction qu'il ne peut pas évaluer devient un `#NAME?` littéral gravé dans le fichier livré.

- **Préférer les fonctions de l'ère Excel 2007** — `SUMIFS`, `INDEX`, `MATCH`, `IFERROR`, `SUMPRODUCT` — qui n'ont besoin d'aucun préfixe.
- **Six fonctions post-2007 fonctionnent, mais uniquement avec un préfixe `_xlfn.`**, car `openpyxl` écrit la formule telle quelle dans le XML, et Excel stocke ces noms post-2007 avec un préfixe en interne (son interface le masque à l'affichage) : `_xlfn.TEXTJOIN`, `_xlfn.CONCAT`, `_xlfn.IFS`, `_xlfn.SWITCH`, `_xlfn.MAXIFS`, `_xlfn.MINIFS`. Écrites sans le préfixe, chacune donne `#NAME?`.
- **Ne jamais utiliser `XLOOKUP`, `XMATCH`, `SORT`, `FILTER`, `UNIQUE`, ou `SEQUENCE`.** Le LibreOffice de cet environnement ne peut les évaluer sous **aucun** préfixe. Des versions plus récentes de LibreOffice les évaluent, mais ce sont des fonctions matricielles "à débordement" (spilling), et un fichier écrit par `openpyxl` n'a pas les métadonnées de débordement nécessaires — seule la cellule en haut à gauche de la plage reçoit une valeur, et **`recalc.py` rapporte alors `total_errors: 0` sur ce résultat tronqué**, ce qui masque silencieusement le problème. La solution : utiliser `INDEX`/`MATCH` pour les recherches, et trier/filtrer/dédupliquer en Python **avant** d'écrire les cellules.
- Une formule que LibreOffice n'a pas pu analyser est réécrite **en minuscules** — un indice rapide à repérer à côté d'un `#NAME?`.

### Les pièges spécifiques à `openpyxl`
- **Lire un modèle complet nécessite deux chargements.** `data_only=True` donne les valeurs en cache (mais plus les formules) ; le mode par défaut donne les chaînes de formule (mais pas les valeurs). Une seule passe ne peut jamais donner les deux à la fois.
- **`data_only=True` est destructif si on sauvegarde ensuite** — ce classeur n'a alors plus de formules, donc sauvegarder remplace chacune par une valeur littérale, **de façon permanente**.
- **`data_only=True` sur un fichier qu'`openpyxl` vient d'écrire renvoie `None` partout** — il faut d'abord lancer `recalc.py`. (Une formule dont le résultat est une chaîne vide `""` se relit aussi comme `None`, donc attention à ne pas confondre les deux cas.)
- **Cellules fusionnées : n'écrire que dans l'ancre en haut à gauche.** Chaque autre cellule de la plage fusionnée est une `MergedCell` dont `.value` est en lecture seule.
- **Un fichier `.xlsm` perd ses macros** à moins de passer `keep_vba=True` à `load_workbook`.
- **Un nom de feuille contenant un espace doit être mis entre guillemets** dans une référence croisée entre feuilles : `='Assumptions Inputs'!$B$5`. Sans les guillemets, cela évalue en `#VALUE!`.

### Les conventions des modèles financiers (à respecter sauf indication contraire)
**Couleurs :** texte bleu (`0,0,255`) pour les entrées codées en dur et les leviers de scénario · noir pour les formules · vert (`0,128,0`) pour les liens vers une autre feuille · rouge (`255,0,0`) pour les liens vers un autre fichier · remplissage jaune (`255,255,0`) pour les hypothèses clés et les cellules que l'utilisateur doit remplir.

**Formats numériques :** devise `$#,##0`, avec l'unité nommée dans l'en-tête (ex : "Revenu (M$)") · les zéros s'affichent comme un tiret `-`, y compris dans les pourcentages · les négatifs entre parenthèses · pourcentages au format `0.0%`, **stockés comme des fractions** (`0.15` s'affiche `15.0%` ; stocker `15` afficherait `1500.0%` — une erreur d'un facteur 100 très facile à faire) · multiples de valorisation `0.0x` · les années en texte (`"2024"`, jamais `2,024` avec une virgule de séparateur de milliers).

**Structure :** chaque hypothèse dans sa propre cellule étiquetée, référencée par les formules qui l'utilisent (`=B5*(1+$B$6)`, jamais `=B5*1.05` codé en dur dans la formule elle-même) · des formules cohérentes sur toute une période de projection, car une cellule isolée modifiée au milieu d'une ligne est l'erreur silencieuse la plus fréquente · protéger les dénominateurs qui peuvent être nuls (division par zéro).

### Exemple d'audit d'une erreur classique
**Situation :** un modèle financier affiche un taux de croissance de "1500.0%" au lieu de "15.0%" attendu.

**Diagnostic :** la cellule a été remplie avec la valeur `15` au lieu de `0.15` — le format d'affichage en pourcentage multiplie automatiquement par 100 la valeur stockée, donc une valeur stockée déjà "en pourcentage" (15 au lieu de 0.15) s'affiche 100 fois trop grande.

**Correction :** stocker `0.15` dans la cellule et laisser le format `0.0%` s'occuper de l'affichage.

### Pièges fréquents (résumé)
- Traiter un code de sortie zéro de `recalc.py` comme la preuve d'un classeur sans erreur, alors que `errors_found` donne aussi un code zéro.
- Utiliser `XLOOKUP`/`FILTER`/`UNIQUE` dans un fichier généré par `openpyxl`, qui semblera fonctionner (0 erreur rapportée) tout en ne renvoyant qu'une seule valeur au lieu de la plage attendue.
- Stocker un pourcentage comme `15` au lieu de `0.15`.
- Ré-enregistrer un fichier contenant des liens vers un classeur externe sans avoir copié leurs valeurs au préalable.

### Checklist de sortie
Exigences de sortie relues avant de commencer ; recalcul forcé et valeurs vérifiées (pas seulement affichées) ; formules robustes (références stables, pas de fragilités) ; pièges du moteur évités (styles, fusions, dates) ; conventions financières respectées (unités, décimales, signes cohérents) ; au moins une valeur auditee jusqu'à sa source comme dans l'exemple.

### À toi de pratiquer
Ouvre un tableur que tu as produit et audite UNE formule au hasard jusqu'à ses sources : note chaque étape de la trace (cellule → référence → source) et une fragilité trouvée (référence relative risquée, hypothèse implicite, format ambigu). C'est exactement le réflexe de l'exemple d'audit.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer pourquoi un recalcul "vert" (code de sortie zéro) ne garantit pas l'absence d'erreur, tu sais citer au moins 3 fonctions Excel modernes à ne jamais utiliser dans ce contexte (`XLOOKUP`, `FILTER`, `UNIQUE`...), et tu sais pourquoi un pourcentage doit être stocké comme fraction (`0.15`) et non comme la valeur affichée (`15`).

---

## 5. `pptx`

### C'est quoi, en profondeur
Cette skill couvre la création, l'édition et l'analyse de présentations PowerPoint (`.pptx`/`.potx`). Comme `.docx`, un `.pptx` est une archive ZIP de fichiers XML. C'est la skill la plus longue et la plus riche de cette catégorie — elle couvre à la fois la mécanique technique très précise **et** des principes de design pour éviter des diapositives qui "ont l'air générées par IA."

### Quand l'utiliser
Dès qu'un fichier `.pptx`/`.potx` est en jeu — création de deck, lecture/extraction de contenu, édition, combinaison/division de fichiers, templates, mises en page, notes de présentateur, commentaires.

### Choisir la bonne approche selon la tâche
| Tâche | Approche |
|---|---|
| Créer un nouveau deck | Écrire un script `pptxgenjs` |
| Éditer un deck existant, ou construire depuis un template | unzip → éditer `ppt/slides/slideN.xml` → zip |
| Lire le contenu | `markitdown deck.pptx` (un bloc par diapositive) ; grille visuelle avec `scripts/thumbnail.py` |

### Les scripts utilitaires fournis
| Script | Ce qu'il fait |
|---|---|
| `scripts/thumbnail.py` | Grille étiquetée de chaque diapositive, pour choisir les mises en page du template |
| `scripts/add_slide.py` | Duplique une diapositive (ou une mise en page) avec toute la comptabilité de paquetage nécessaire |
| `scripts/clean.py` | Supprime les diapositives, médias et relations orphelines. À lancer **après** que la liste finale des diapositives soit figée |
| `scripts/office/validate.py` | Vérifications de schéma, relations, types de contenu, graphiques et diapositives ; chaque échec nomme sa correction |
| `scripts/office/soffice.py` | Wrapper LibreOffice (le `soffice` nu se bloque dans ce bac à sable) |

### Créer avec pptxgenjs — les pièges les plus critiques
- **Définir `pres.layout` avant d'ajouter des diapositives.** Le canevas par défaut est `LAYOUT_16x9` = **10" × 5.625"**, pas 13.3" de large. Les coordonnées au-delà du bord sont bien écrites, mais **la forme n'apparaît simplement pas sur la diapositive** — un bug silencieux et déroutant.
- **Couleurs hexadécimales : jamais de `#`, jamais 8 chiffres.** Écrire `color: "FF0000"`, pas `"#FF0000"`, et surtout pas une valeur avec l'alpha intégré (`"00000020"`) — les deux **corrompent le fichier**. Pour la transparence, il faut utiliser `transparency: 0-100` sur les remplissages/images, ou `opacity: 0.0-1.0` sur les ombres — chacune est silencieusement ignorée sur l'autre type d'élément.
- **`pptxgenjs` modifie les objets d'options en place** (il convertit les valeurs en EMU dès leur première utilisation). Il ne faut **jamais partager un même objet** `shadow`/options entre deux appels `add*` — reconstruire un objet neuf à chaque fois.
- **`offset` d'une ombre doit être ≥ 0** — une valeur négative corrompt le fichier. Pour projeter une ombre "vers le haut", utiliser `angle: 270` avec un offset positif, plutôt qu'un offset négatif.
- **`letterSpacing` est silencieusement ignoré** — la vraie option qui fonctionne est `charSpacing`.
- **Listes :** `bullet: true` sur chaque élément, jamais un caractère `•` littéral (qui produirait une double puce à l'affichage). Mettre `breakLine: true` sur chaque élément du tableau sauf le dernier. Espacer les paragraphes à puces avec `paraSpaceAfter`, pas `lineSpacing` (qui crée des écarts énormes).
- **Un seul `new pptxgen()` par fichier de sortie** — ne jamais réutiliser une instance pour plusieurs decks.
- **`rectRadius` ne fonctionne que sur `ROUNDED_RECTANGLE`**, pas sur `RECTANGLE`.
- **Les remplissages en dégradé ne sont pas supportés** — utiliser une image de dégradé comme arrière-plan à la place.
- **Les zones de texte ont un padding interne intégré** — mettre `margin: 0` chaque fois qu'un texte doit s'aligner avec une forme, une ligne ou une icône au même x.
- **Les notes de présentateur passent par `slide.addNotes("...")`** (texte brut, une fois par diapositive), jamais dans une zone de texte sur la diapositive elle-même.
- **Garder les graphiques natifs.** Utiliser `addChart()` pour tout ce que PowerPoint sait tracer nativement. Pour les fonctionnalités natives que la librairie n'expose pas (courbes de tendance, barres d'erreur), calculer la série supplémentaire soi-même ou post-traiter le XML généré — **ne jamais se rabattre sur une image statique** pour ces cas. Seuls les types de graphiques que PowerPoint n'a aucune forme native pour représenter (Sankey, réseau, corde) passent en image.
- **Les graphiques par défaut sont "nus"** — pas de titre, pas d'étiquettes de données, palette datée. Il faut définir explicitement `showTitle`/`title`, `showValue: true` + `dataLabelPosition`, `chartColors` depuis sa propre palette, et discipliner le cadre du graphique (couleurs d'axe, grille, légende).
- ** Piège critique sur les graphiques en barres/colonnes empilées :** `dataLabelPosition` doit valoir `ctr`, `inEnd`, ou `inBase`. **`outEnd` corrompt le fichier.**
- ** Piège critique sur les graphiques combinés avec axe secondaire :** une série utilisant `secondaryValAxis`/`secondaryCatAxis` a besoin de `valAxes` **et** `catAxes` définis sur les options du graphique, **avec deux entrées chacun**. Sans cela, `pptxgenjs` écrit des identifiants d'axes qu'il ne déclare jamais nulle part, et **PowerPoint rejette ce graphique et signale le fichier comme corrompu.** Fournir seulement `valAxes` ne suffit pas — il faut impérativement les deux.
- **Après `writeFile()`, toujours lancer `scripts/office/validate.py`** — il rapporte les deux défauts de graphique ci-dessus ainsi que les défauts XML de diapositive que PowerPoint refuse, et nomme la correction pour chacun. **Corriger dans le générateur, jamais en éditant le XML empaqueté à la main.**
- **Ne jamais réordonner les enfants de `<p:presentation>`.** `pptxgenjs` écrit `<p:notesMasterIdLst>` juste après `<p:sldIdLst>` et fait pointer les deux masters vers une même partie de thème. PowerPoint accepte cet ordre précis sans broncher — déplacer cet élément rend le même deck **inouvrable.**
- **Icônes :** rendre `react-icons` en SVG, rastériser avec `sharp` à au moins 256px, et insérer via `addImage` avec le préfixe `"image/png;base64,"` obligatoire.

### Éditer des decks et templates existants
**Choisir les mises en page d'abord** avec `scripts/thumbnail.py template.pptx template-thumbs` — **toujours passer ce deuxième argument nommé d'après le deck**, car il vaut `thumbnails` par défaut, ce qui fait que deux decks miniaturisés dans le même répertoire **s'écrasent silencieusement l'un l'autre** (les miniatures du premier disparaissent simplement).

**Règle d'ordre critique : faire tout le travail structurel (ajouter, supprimer, réordonner) AVANT d'éditer le contenu d'une diapositive.** `add_slide.py` copie un fichier de diapositive tel quel — dupliquer après avoir édité clone donc le contenu déjà édité ; et `clean.py` supprime toute diapositive absente de `<p:sldIdLst>`, y compris une qu'on vient tout juste d'écrire.

**Ne jamais copier un fichier de diapositive à la main** — `add_slide.py` effectue tout l'enregistrement nécessaire pour une nouvelle diapositive. Détail important : une diapositive dupliquée **référence toujours** les parties graphique/SmartArt/objet-embarqué de sa source plutôt que de les cloner — donc éditer le graphique d'une diapositive change aussi celui de l'autre, sans qu'on s'y attende.

**Si `python-pptx` est utilisé**, trois choses qu'il ne sait **pas** faire : dupliquer une diapositive (son seul point d'entrée est `add_slide(layout)`), préserver la mise en forme via `text_frame.text = "..."` (cela réduit le paragraphe à un seul run non stylé — il faut assigner `run.text` à la place), ou lire les images SVG/EMF que la plupart des templates utilisent (`add_picture` lève une `UnidentifiedImageError`).

**Quand on remplit un template :**
- Parser avec `defusedxml.minidom` si on script une transformation XML — faire un aller-retour de l'OOXML via `xml.etree.ElementTree` réécrit les préfixes de namespace et corrompt le deck.
- **Les emplacements du template ne correspondent pas forcément au nombre d'éléments réels.** Si le template montre 4 membres d'équipe et qu'on n'en a que 3, il faut supprimer le groupe entier du 4ème (image + zones de texte), pas juste son texte — puis vérifier les visuels orphelins en contrôle qualité.
- Un `<a:p>` par élément de liste — jamais concaténer plusieurs éléments dans un seul paragraphe.

### Idées de design — ne pas créer des diapositives ennuyeuses
**Avant de commencer :**
- **Choisir une palette de couleurs audacieuse et informée par le contenu** — si on pouvait échanger ses couleurs dans une présentation totalement différente et que "ça marcherait encore", les choix n'étaient pas assez spécifiques.
- **Dominance plutôt qu'égalité** : une couleur doit dominer (60-70% du poids visuel), avec 1-2 tons de soutien et un accent tranchant. Ne jamais donner un poids égal à toutes les couleurs.
- **Contraste clair/sombre** : fonds sombres pour titre + conclusion, clairs pour le contenu (structure "sandwich"), ou s'engager dans du sombre partout pour un rendu premium.
- **S'engager sur un motif visuel unique** et le répéter partout (cadres d'image arrondis, icônes dans des cercles colorés) — **ne jamais utiliser une barre ou bande de couleur d'accent comme motif** (voir la liste "à éviter").

**Palettes de couleurs suggérées (à titre d'inspiration) :** parmi les 10 proposées, retenir par exemple "Midnight Executive" (marine `1E2761` / bleu glacé `CADCFC` / blanc), "Forest & Moss" (forêt `2C5F2D` / mousse `97BC62` / crème), ou "Coral Energy" (corail `F96167` / or `F9E795` / marine `2F3C7E`) — l'idée est de choisir selon le sujet, jamais un bleu générique par défaut.

**Pour chaque diapositive :** toujours un élément visuel (image, graphique, icône, forme) — une diapositive uniquement textuelle est oubliable. Options de mise en page : deux colonnes, lignes icône+texte, grille 2x2/2x3, image "half-bleed" avec contenu en superposition. Pour les données : grands chiffres-clés (60-72pt), colonnes de comparaison, chronologie/flux de processus.

### Typographie — un piège de fiabilité de contrôle qualité souvent ignoré
**Point crucial :** les noms de police qu'on écrit dans le `.pptx` sont rendus par le PowerPoint de l'utilisateur final, **pas par cet environnement**. La vérification visuelle (QA) se fait via LibreOffice, qui **substitue** les polices qu'il n'a pas — et pour certaines polices, la police de substitution a une largeur différente, donc l'aperçu de QA peut montrer un débordement de texte (ou au contraire un ajustement parfait) que le vrai deck n'aura pas.

- **Polices sûres** (rendu fidèle en QA ET livrées avec Office) : Arial, Calibri, Cambria, Times New Roman, Courier New, Bookman Old Style, Century Schoolbook. À utiliser pour le corps de texte et tout ce où l'ajustement compte.
- **Polices "peu fiables en QA"** (la substitution a des largeurs différentes) : Georgia, Trebuchet MS, Impact, Arial Black, Garamond, Consolas, Palatino Linotype. Convient pour les titres/accents avec une marge de sécurité, mais ne pas faire confiance à l'ajustement de texte de la QA sur ces éléments.
- **Ne jamais utiliser Aptos par défaut** — la police par défaut d'Office post-2023 n'a pas de substitut compatible ici, et est aussi absente des anciennes installations Office : elle est peu fiable des deux côtés.

### À éviter absolument (erreurs qui trahissent un rendu "généré par IA")
- Répéter la même mise en page sur toutes les diapositives.
- Centrer le texte du corps (aligner à gauche les paragraphes et listes ; centrer seulement les titres).
- Manquer de contraste de taille entre titre et corps.
- Défaut systématique au bleu.
- **NE JAMAIS utiliser de lignes d'accent sous les titres** — signature caractéristique des diapositives générées par IA ; utiliser l'espace blanc ou une couleur de fond à la place.
- **NE JAMAIS ajouter de barres ou bandes de couleur décoratives** (bandeaux en haut/bas, bandes latérales verticales, liseré sur un bord de carte) — ces éléments se lisent comme du remplissage généré par IA.
- Défaut aux fonds crème/beige — préférer le blanc ou la palette de marque de l'utilisateur.
- Livrer un texte qui déborde de sa forme.

### Contrôle qualité (QA) — obligatoire
**QA de contenu :** `markitdown output.pptx`, vérifier le contenu manquant, les fautes, l'ordre. **Vérifier spécifiquement le texte de placeholder oublié** avec une recherche de motifs comme "lorem", "TODO", "[insert"...

**QA de fichier :** `scripts/office/validate.py`, avec `--original` si le deck vient d'un template (pour ne pas confondre les erreurs du template lui-même avec de vraies régressions).

**QA visuelle — la plus importante :** convertir en images et inspecter chaque diapositive **avec un regard neuf** (après avoir fixé le code générateur, on a tendance à voir ce qu'on attend plutôt que ce qui est réellement rendu — un sous-agent est utile ici si disponible). Défauts à chercher en priorité : **le débordement/la troncature de texte au bord d'une forme ou de la diapositive — à vérifier en premier**, c'est le défaut le plus fréquent et toujours visible par l'utilisateur final ; éléments qui se chevauchent ; citations/pieds de page qui entrent en collision avec le contenu au-dessus ; espacements incohérents.

### Exemple guidé, pas à pas
Besoin : deck de 5 slides "résultats du trimestre" généré par script.
- **Génération minimale** : titre + 3 puces par slide, police standard, mise en page simple — volontairement sobre pour commencer.
- **Ouverture de contrôle** : dans PowerPoint ET Google Slides. Constat : puces trop longues (murs de texte), police de remplacement sur une machine, un graphique illisible en petit.
- **Corrections** : puces raccourcies (1 idée par puce), police sûre et commune, graphique agrandi avec titre explicite. Régénération, réouverture : propre des deux côtés.
- **Grille "à éviter"** : passage en revue — fonds chargés ? non. Texte minuscule ? corrigé. Slides murs de texte ? découpés. Typo fantaisiste ? remplacée.
- **QA finale** : checklist qualité passée, deck envoyé. Sans l'ouverture dans 2 logiciels, la moitié des défauts seraient partis chez le client.

### À toi de pratiquer
Prends ta dernière présentation et passe-la à la grille "erreurs qui trahissent un rendu généré par IA" : trouve 3 défauts (densité, typographie, design) et corrige-les. Puis ouvre le fichier dans un deuxième logiciel et note ce qui change.

### Pour dire que tu maîtrises cette skill
Tu sais citer au moins 3 pièges qui **corrompent littéralement le fichier** (couleur hex avec `#` ou 8 chiffres, offset d'ombre négatif, `dataLabelPosition: outEnd` sur un graphique empilé, axes secondaires mal déclarés), tu sais pourquoi la vérification visuelle via LibreOffice peut être trompeuse pour certaines polices, et tu sais citer au moins 3 signatures visuelles d'un rendu "généré par IA" à éviter (lignes d'accent sous les titres, bandes de couleur décoratives, fond crème par défaut).

---

## Récapitulatif — Partie 2/4

| # | Skill | En une phrase |
|---|-------|----------------|
| 1 | doc-coauthoring | Co-écrit un document en 3 étapes : contexte, raffinement section par section, test avec un lecteur "frais" |
| 2 | docx | Word = ZIP de XML ; créer avec docx-js, éditer en dézippant, attention aux runs fragmentés et au XML des modifications suivies |
| 3 | pdf | pypdf pour manipuler les pages, pdfplumber pour extraire texte/tableaux, reportlab pour créer, jamais d'indices/exposants Unicode |
| 4 | xlsx | Toujours recalculer et vérifier réellement les erreurs ; bannir XLOOKUP/FILTER/UNIQUE ; stocker les pourcentages en fraction |
| 5 | pptx | pptxgenjs a de nombreux pièges qui corrompent le fichier ; QA visuelle obligatoire ; éviter les signatures visuelles "IA" |

**Suite (partie 3/4) :** le sous-dossier `anthropic-custom` (3 skills : `analyzing-financial-statements`, `applying-brand-guidelines`, `creating-financial-models`) — analyse financière et image de marque.
