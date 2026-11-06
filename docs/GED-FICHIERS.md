# GED : fichiers privés et versions documentaires

## Fonctionnement livré

Les pièces GED utilisent le disque dédié `ged`, dans `backend/storage/app/ged-privee`, hors répertoire public et sans URL publique signée ou non. Le navigateur ne connaît que les identifiants des pièces, jamais les chemins de stockage.

- Dépôt sur un brouillon ou une version à valider uniquement, après contrôle d'appartenance à l'officine.
- Version et indice attendus envoyés par le client, comparés sous verrou à la version courante. Un dépôt sur une ancienne fiche est refusé.
- Nom de stockage aléatoire, nom original nettoyé, contrôle de type/extension et limite de taille côté serveur.
- Empreinte SHA-256 calculée sur le fichier reçu, taille et type détectés côté serveur, auteur et date serveur.
- Métadonnées append-only, aucun endpoint de remplacement ou de suppression. Un dépôt ultérieur est une autre pièce conservée, pas une modification de la précédente.
- Le même contenu redéposé sur la même version retourne la pièce existante ; il n'est pas ajouté deux fois.
- Chaque pièce est liée à une version et un indice documentaires. Les nouvelles révisions doivent joindre les pièces qu'elles souhaitent faire approuver ; les anciennes restent accessibles dans l'historique.
- Date minimale de conservation prévue au dépôt : dix ans. Aucun mécanisme de purge n'est livré. La sauvegarde et la restauration du stockage restent à mettre en service : cette date seule ne garantit pas sa disponibilité.
- Les fichiers sont stockés avec un chemin généré par le serveur. Échec transactionnel : tentative de suppression du nouveau fichier orphelin ; un arrêt brutal nécessite une réconciliation ultérieure du stockage.

## Liaison avec l'approbation

L'empreinte présentée à l'approbation inclut maintenant le manifeste ordonné de la version : identifiant de pièce, numéro, nom, type, taille et SHA-256. L'ajout d'une pièce change donc l'empreinte à confirmer.

L'approbation et le dépôt prennent le même verrou documentaire. Le trigger PostgreSQL vérifie la correspondance entre copie approuvée et manifeste courant. Une fois le document validé, les dépôts sont bloqués jusqu'à l'ouverture d'une révision. Les anciennes approbations ne sont ni réécrites ni enrichies rétroactivement.

## API

Sous `/api/officines/{officineId}/documents/{id}` :

- `GET /fichiers` : métadonnées et historique de toutes les versions de cette fiche, sans chemin de disque.
- `POST /fichiers` : formulaire multipart avec `file`, `version_document` et `indice_revision`. Limitation de fréquence ; format ou taille invalides refusés. Succès : 201, ou 200 pour un contenu déjà présent sur la version.
- `GET /fichiers/{fichierId}/telecharger` : contrôle d'appartenance, existence et empreinte réelle du fichier, puis téléchargement en pièce jointe avec `nosniff` et `private, no-store`. Un fichier altéré est bloqué par réponse 409.

Le frontend transmet le jeton d'authentification dans les en-têtes, jamais dans l'URL de téléchargement. Le dépôt réussi recharge la fiche et son empreinte ; les erreurs ne sont pas transformées en listes vides ou succès.

## Validation effectuée

- Types frontend : aucune erreur ; tests frontend : 29 réussis ; compilation réussie.
- Analyse syntaxique PHP des nouveaux contrôleurs, services et migrations.
- Recette native PostgreSQL 16 : le vrai SQL des migrations protège les pièces, lie le manifeste à l'approbation et refuse les ajouts sur une version approuvée.
- Tests PHPUnit ajoutés pour dépôt privé, redépôt sans doublon, empreinte périmée, refus après approbation, téléchargement, altération binaire et accès à une autre officine. Non exécutés localement : Laravel et ses dépendances ne sont pas démarrés. Les fixtures SQL ne remplacent pas ces tests HTTP/migration complète.

## Limites explicites

Ce lot ne comporte pas d'antivirus, de conversion PDF/A, d'import automatique du corpus, de diffusion nominative ou d'accusé de lecture. Les formats bureautiques peuvent contenir des macros ou contenus actifs : conserver une source de confiance et prévoir une analyse de sécurité avant diffusion en production. Le téléchargement force la pièce jointe ; aucun rendu HTML/SVG n'est accepté.

Le disque privé n'est pas chiffré ni WORM par ce code. Un administrateur de stockage ou de base reste une frontière de confiance. Une empreinte détecte une altération mais ne remplace pas une sauvegarde.

**L'ancien endpoint générique `/upload` reste public pour d'autres modules.** Il n'est pas utilisé par cette GED et ne doit pas servir au dépôt de documents confidentiels. Il reste à migrer, ainsi que les anciens fichiers publics : aucune confidentialité rétroactive n'est revendiquée.

La prochaine étape est la réconciliation de l'inventaire documentaire avec les fichiers du corpus, puis un import explicite et traçable des documents pilotes sans fabriquer de validation ni de signature.
