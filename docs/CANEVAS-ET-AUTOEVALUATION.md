# Canevas intégrés et grille complète

## Canevas Word

Le catalogue est extrait des trente-neuf fichiers DOCX du dossier fourni. Il conserve le texte, l’ordre des paragraphes, les tableaux, les cellules fusionnées, les proportions de colonnes, les en-têtes/pieds de page textuels et les images usuelles. Chaque zone peut être adaptée dans la fiche du modèle. Les tableaux imbriqués sont conservés.

Les canevas sont proposés dans les documents, la bibliothèque des modèles et, pour les sources concernées, la rubrique des non-conformités. La nature et le processus doivent être confirmés à la création. La saisie devient un brouillon documentaire dans Laravel/PostgreSQL, avec une copie structurée du modèle et son empreinte ; une mise à jour du catalogue ne change donc pas une ancienne saisie. Le brouillon peut être complété depuis sa fiche ; un contrôle d’empreinte refuse d’écraser une modification concurrente.

Le catalogue ne confère aucune approbation aux noms ou signatures imprimés dans les fichiers sources. Les informations de l’officine modèle doivent être adaptées avant approbation. Le code temporaire CAN ne constitue pas une attribution officielle à une ligne de l’inventaire documentaire.

**Limites de fidélité :** il s’agit d’une transposition web structurée, pas du moteur de mise en page de Word. La pagination et la typographie s’adaptent à l’écran. Les objets graphiques propriétaires, champs automatiques et règles d’impression Word ne sont pas garantis. Le document source reste nécessaire pour une comparaison finale.

**Couverture non achevée :** les anciens fichiers DOC binaires, les classeurs XLSX, l’ODT et le PDF ne sont pas transformés par cet extracteur. Ils sont énumérés dans `non_integres` du catalogue. Les registres formation et maintenance déjà livrés restent distincts. Les anciennes fiches de non-conformité au format DOC ne sont donc pas déclarées intégrées à l’identique.

Les pièces et validations sont désormais dans une section secondaire repliée. Leurs indisponibilités sont indiquées simplement, sans être transformées en succès ou historique vide. Les preuves de conservation et d’approbation ne sont pas supprimées du serveur.

## Auto-évaluation

La grille complète utilise tous les articles extraits du PDF fourni, avec le texte source et les chapitres réels ; aucune cotation, preuve ni action n’est préremplie. Les effectifs par chapitre sont vérifiés et l’ordre des articles est numérique. L’extraction conserve son état de relecture : elle ne devient pas une interprétation réglementaire approuvée.

Pour une officine sans campagne, une grille complète est initialisée par un responsable habilité. Si une campagne ancienne existe, elle n’est jamais réécrite par correspondance de numéro : un bouton permet d’ouvrir explicitement une grille complète. L’ancienne campagne, ses notes et ses liens d’actions sont conservés séparément. L’appel répété n’ouvre pas de doublon de campagne complète. Les cotations et la génération d’actions correctives utilisent les routes Laravel existantes, avec contrôle des droits et de l’officine.

La démonstration dispose d’une grille complète indépendante par officine, sans résultats inventés. Ses changements restent en mémoire uniquement ; le déploiement Laravel reste nécessaire pour une exploitation durable.

## Continuité d’affichage

L’écran « reprise de session » était une page de secours SSR et ne prouvait pas une expiration de session. Les pages sont maintenant chargées côté navigateur avec la configuration SPA officielle de TanStack Start. La compilation produit la coque de démarrage de production. Un échec d’import du serveur ne reste plus mémorisé pour toutes les requêtes suivantes. Le secours ultime est conservé pour les vraies pannes : il retente uniquement la navigation, de façon bornée, sans supprimer les identifiants ni rejouer une écriture. Un échec de rendu React n’efface plus la session. Une limite d’erreur locale permet de réessayer la rubrique ou de poursuivre la navigation ; les lectures sont réactualisées au retour de la connexion.

Cette mesure réduit les causes identifiées ; elle ne constitue pas une garantie d’absence de coupure réseau, de panne serveur ou de tout autre défaut applicatif. Aucun formulaire en mémoire n’est déclaré restauré après un rechargement complet.

## Reproduction

`python scripts/extraire-canevas.py --check` vérifie la reproductibilité et les empreintes des modèles. Les tests PHP couvrent les sources, les zones uniques, la création d’un brouillon, les droits, les conflits et la grille complète. Les vérifications frontend et la compilation SPA complètent la recette ; elles ne remplacent pas une comparaison visuelle de chaque source sur téléphone et à l’impression.
