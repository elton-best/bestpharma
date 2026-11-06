# Digitalisation des suivis de formation et de maintenance

## Périmètre livré

Les rubriques Personnel → Formations et Locaux et équipements → Maintenance utilisent des formulaires structurés, servis et enregistrés par Laravel dans PostgreSQL. Les listes fixes de ces deux rubriques sont retirées. Les autres rubriques ne sont pas déclarées digitalisées par ce lot.

Sources utilisées, conservées sans modification dans le corpus :

- `FOR & ENR  Plan de Formation.xlsx`, feuille `FORMULAIRE`, référence `OKPE/FOR/GRH/007`.
- `Registre de Maintenance & Tests 2026.xlsx`, feuille `Formulaire 1`, référence `OKPE/FOR/GEE/002`.

Le catalogue conserve le fichier, la feuille, la référence et l’empreinte SHA de chaque modèle. Le test unitaire compare les empreintes aux fichiers réels et vérifie l’alignement du catalogue de démonstration avec celui de Laravel.

Les champs de suivi numérique — responsable, prévision, état, bilan ou résultat, prochaine intervention — complètent les colonnes du modèle. Il ne s’agit pas d’une reproduction complète du classeur. Aucune ligne historique Excel n’est importée automatiquement.

## Fonctionnement

- Création d’une fiche planifiée, réalisée ou annulée ; champs obligatoires contrôlés côté serveur.
- Réalisation : date non future, formateur et bilan pour une formation ; prestataire et résultat pour une maintenance.
- Maintenance : matériel appartenant à l’officine et nom enregistré par le serveur.
- Lecture réservée aux membres actifs de l’officine ; écriture aux promoteur, titulaire, adjoint et responsable qualité.
- Correction motivée, contrôle de version et verrouillage transactionnel ; une fiche réalisée ou annulée conserve son état final.
- Audit des créations et corrections ; suppression et vidage de la table interdits par PostgreSQL.
- Recherche par thème ou nature, année prévue, état et pagination ; export CSV de la page consultée seulement.
- Modales à deux colonnes et listes de choix recherchables, sans onglets.

Les routes authentifiées sont sous `/api/officines/{officineId}/suivis-documentaires/{formations|maintenance}` : lecture et création à la racine, définition à `/definition`, correction par `PUT /{id}`. La correction exige `revision` et `motif_modification`. Les seules clés acceptées dans `donnees` sont celles du catalogue et le motif d’annulation ; le nom du matériel est calculé par le serveur et ne doit pas être renvoyé comme champ modifiable.

## Limites explicites

Une formation réalisée n’atteste ni émargement individuel ni compétence acquise. Une maintenance réalisée n’est pas un certificat d’étalonnage et ne modifie pas automatiquement l’état du matériel. Aucun visa pharmaceutique ni document justificatif n’est inventé.

L’aperçu utilise des saisies temporaires en mémoire, signalées comme démonstration et perdues au redémarrage. Il ne constitue pas un déploiement Laravel persistant ni un registre officiel. La migration et le serveur Laravel doivent être déployés pour l’usage durable ; les données historiques doivent être reprises et vérifiées séparément.

## Recette

- Tests de l’interface : saisie effectivement envoyée au serveur, panne non assimilée à un registre vide, conservation des valeurs après refus.
- Tests Laravel : création/recherche, règles de réalisation, droits, isolation, dates, annulation, matériel, audit et conflits de version.
- Recette PostgreSQL native : filtres JSON, corrections auditées, interdiction de suppression et de vidage, continuité de la chaîne d’audit.

Commandes : `cd frontend && npm test && npm run typecheck && npm run build` ; `cd backend && php artisan test` ; `AUDIT_TEST_ADMIN_URL=postgres://… npm run test:audit-postgres`. Le catalogue démo se régénère avec `php scripts/exporter-catalogue-suivis.php > mock-data/catalogue-suivis.json` et se vérifie avec `php scripts/exporter-catalogue-suivis.php --check`.
