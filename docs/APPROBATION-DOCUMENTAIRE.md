# Approbation documentaire vérifiée côté serveur

## Périmètre livré

Le flux des documents ne s'appuie plus sur le faux PIN ni sur les identités, horloges et empreintes générées par le navigateur. Le mot de passe existant du compte est vérifié côté serveur, avec limitation des tentatives. Aucun secret de signature supplémentaire n'est créé.

C'est une approbation applicative avec copie textuelle conservée : **pas une signature électronique qualifiée, pas un certificat ABMed, pas un accusé de diffusion**. Les autres usages de l'ancien composant PIN dans les autres modules restent à traiter séparément.

## Contrat API

- La lecture/liste des documents retourne `empreinte_contenu`, calculée côté serveur sur l'identifiant, l'officine, le code, le titre, le type, le processus, la version, l'indice et le texte.
- `PUT /officines/{officineId}/documents/{id}` avec `statut=valide` exige `password`, `empreinte_attendue` et `intention=approbation_documentaire`.
- Le serveur vérifie le compte actif, le rattachement actif non archivé et le rôle titulaire/promoteur. Toute appartenance à une autre officine est refusée. Les modifications de titre/texte ne sont pas acceptées simultanément à l'approbation.
- Confirmation erronée : refus ; tentatives répétées : réponse 429. Le compteur est par compte, indépendamment du document ou de l'officine, afin d'éviter un contournement par changement de cible. Configurer un cache partagé pour une exploitation multi-instances.
- Le contenu a changé depuis la lecture : réponse 409 ; recharge du document requise.
- En transaction avec verrou de ligne : création de la copie approuvée puis passage du document au statut validé, ou annulation totale en cas d'échec.
- `GET /officines/{officineId}/documents/{id}/approbations` retourne les approbations et vérifie l'empreinte de chaque copie textuelle conservée. Cette vérification n'atteste pas une signature à clé publique.
- Une nouvelle révision est ouverte avec le seul champ `statut=brouillon`, par titulaire/promoteur/RMQ. Elle incrémente la version et retire les marqueurs de validation de la fiche courante ; les anciennes copies restent consultables.

Les mots de passe ne figurent ni dans les documents, ni dans les copies approuvées, ni dans les événements d'audit. Le frontend les efface à la fermeture, après réussite et après refus. TLS et une politique de journalisation excluant les corps sensibles restent indispensables en production.

## Protection PostgreSQL

Les copies approuvées interdisent UPDATE/DELETE/TRUNCATE ; leurs clés étrangères empêchent leur suppression par cascade. Leur insertion produit une entrée dans l'audit chaîné de l'officine.

Un trigger sur les documents interdit la modification directe/suppression d'une fiche validée, impose l'ouverture d'une révision et vérifie qu'une approbation correspond exactement au contenu lors du passage en validation. Les versions historiques antérieures au déploiement ne reçoivent pas de fausse preuve rétroactive.

Les droits d'administration de base restent une frontière de confiance : ces triggers ne protègent pas contre un superutilisateur qui les désactive. Les fichiers joints ne sont pas couverts par cette copie textuelle ; la GED de fichiers versionnés est un chantier distinct.

## Frontend

Modale horizontale à deux colonnes, mot de passe du compte et intention explicite. Une réponse en erreur ne ferme pas la modale et n'annonce pas de succès. Les noms et heures de l'approbation viennent du serveur. Historique visible sur la fiche documentaire.

Les tâches de lecture, taux d'émargement, registres de diffusion et échéances autrefois simulés ont été retirés ou remplacés par des états d'indisponibilité explicites. Leur fonctionnement n'est pas revendiqué. Le seeder crée désormais des brouillons d'exemple sans inventer un pharmacien approbateur ni écraser les documents déjà travaillés.

Le serveur de démonstration refuse l'approbation sécurisée et ne conserve aucun mot de passe de confirmation. Sans empreinte Laravel, les boutons d'approbation/révision sont désactivés.

## Validation

Exécuté localement : tests de la modale (confirmation explicite et refus serveur), types et compilation frontend ; syntaxe PHP ; recette native PostgreSQL sur les vrais blocs SQL des migrations : approbation absente refusée, copie différente refusée, modification et suppression bloquées, nouvelle révision conservant l'ancienne copie, audit rattaché à l'officine.

Les tests PHPUnit du parcours API ont été étendus : rôle non habilité, confirmation absente/erronée, empreinte périmée, approbation réussie, lecture d'historique, protection du texte validé, révision et limitation des tentatives. Ils restent à exécuter sous Laravel avec les migrations complètes ; la recette SQL seule ne remplace pas cette validation.
