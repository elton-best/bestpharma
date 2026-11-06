# Canevas intégrés et grille complète

## Canevas Word

Le catalogue est extrait des trente-neuf fichiers DOCX du dossier fourni et complété par les cinq anciens fichiers DOC convertis en XML contrôlé. Il conserve le texte, l’ordre des paragraphes, les tableaux, les cellules fusionnées, les proportions de colonnes, les en-têtes/pieds de page textuels et les images usuelles. Chaque zone peut être adaptée dans la fiche du modèle. Les tableaux imbriqués sont conservés.

Les canevas sont proposés dans les documents, la bibliothèque des modèles et, pour les sources concernées, la rubrique des non-conformités. La nature et le processus doivent être confirmés à la création. La saisie devient un brouillon documentaire dans Laravel/PostgreSQL, avec une copie structurée du modèle et son empreinte ; une mise à jour du catalogue ne change donc pas une ancienne saisie. Le brouillon peut être complété depuis sa fiche ; un contrôle d’empreinte refuse d’écraser une modification concurrente.

Le catalogue ne confère aucune approbation aux noms ou signatures imprimés dans les fichiers sources. Les informations de l’officine modèle doivent être adaptées avant approbation. Le code temporaire CAN ne constitue pas une attribution officielle à une ligne de l’inventaire documentaire.

**Limites de fidélité :** il s’agit d’une transposition web structurée, pas du moteur de mise en page de Word. La pagination et la typographie s’adaptent à l’écran. Les objets graphiques propriétaires, champs automatiques et règles d’impression Word ne sont pas garantis. Le document source reste nécessaire pour une comparaison finale.

**Anciens fichiers Word :** les conversions DocBook proviennent d’antiword, dont la version et les empreintes sont conservées. Les tableaux et les zones de la fiche de non-conformités sont intégrés ; les images, objets et détails de mise en page des DOC ne sont pas garantis.

**Classeurs Excel :** les seize classeurs sont intégrés, en complément des quarante-quatre canevas Word. Les feuilles modèles sont choisies explicitement, sans importer les historiques annuels lorsque le modèle existe. Les cellules, fusions, couleurs et zones de saisie sont conservées ; le formatage vide très éloigné de la zone utilisée est écarté. Les valeurs déjà calculées sont reprises lorsqu’elles existent, mais les formules ne sont pas recalculées : les totaux doivent être vérifiés manuellement.

**Liste de couverture et version annotée :** l’ODT est intégré avec son tableau des procédures et des activités, adaptable en brouillon. Le PDF est une référence en lecture seule : ses deux pages de texte et ses neuf annotations sont conservées séparément, avec page et coordonnées d’origine. Les commentaires ne constituent ni des exigences réglementaires validées ni des actions déjà réalisées. La création d’un formulaire depuis cette référence est refusée côté interface et API. Le catalogue contient ainsi soixante et un modèles adaptables et une référence annotée ; `non_integres` est vide. La mise en page graphique du PDF et les surlignages ne sont pas reproduits à l’identique. Les registres formation et maintenance déjà livrés restent distincts. La saisie d’une fiche qualité crée un document brouillon ; elle ne synchronise pas automatiquement chaque cellule avec les actions du registre des non-conformités.

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

## Péremptions et courriels

La vente et la dispensation utilisent le même filtre de lots vendables. La date de péremption doit être strictement postérieure à la date courante au Bénin. Un lot périmant aujourd’hui est donc exclu sans attendre le planificateur ; les lots bloqués, rappelés et en quarantaine sont également exclus.

La commande `php artisan stocks:surveiller-peremptions` prépare les courriels aux responsables actifs à quatre paliers : quatre-vingt-dix, quarante-cinq, dix jours et la veille. Un avis est aussi préparé le jour de péremption et les lots encore commercialisables sont placés en quarantaine. Les notifications sont distinctes des rappels sanitaires, conservées par officine et dédoublonnées par lot, date, palier et destinataire. Les échecs sont réessayés jusqu’à cinq fois ; les avertissements devenus obsolètes ne sont pas envoyés tardivement avec une durée erronée.

**Mise en service obligatoire :** appliquer les migrations, configurer un transport de courriel réel et l’expéditeur dans les variables d’environnement Laravel, puis exécuter `php artisan schedule:run` chaque minute sur le serveur. La surveillance est appelée chaque heure, en fuseau Africa/Porto-Novo, avec verrou contre les chevauchements. En mode `log` ou `array`, aucun envoi n’est déclaré : les notifications restent en attente. L’aperçu mémoire ne fait aucun envoi. Une acceptation par le transport n’est pas une garantie de réception dans la boîte du destinataire. Une interruption complète du planificateur peut manquer un palier : supervision nécessaire. Un arrêt brutal entre acceptation SMTP et mise à jour de la notification peut provoquer un renvoi ; SMTP ne garantit pas l’envoi exactement une fois.

## Navigation et officine active

L’espace métier est sous `/dashboard` et la vente sous `/dashboard/vente`. Les anciennes adresses redirigent vers leurs équivalents. Les requêtes globales transmettent l’officine active lorsqu’elle appartient au compte connecté ; le serveur vérifie le rattachement actif. Le changement d’officine retire les anciennes données en cache et réinitialise la vue. Les canevas et la grille disposent d’une nouvelle tentative de chargement. L’inscription de démonstration crée un jeton reconnu et la création d’une officine donne réellement le rattachement au compte temporaire, jusqu’au redémarrage du simulateur.
