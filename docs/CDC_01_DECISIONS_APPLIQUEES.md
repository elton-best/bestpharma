# Module 01 — règles métier confirmées et appliquées

Ces décisions utilisateur remplacent les réserves correspondantes des notes de recette précédentes. Elles ne déclarent pas SMTP/Google ni une infrastructure de production validés.

## 1. MFA obligatoire pour les fonctions privilégiées

Règle confirmée : administrateurs plateforme, administrateurs actifs d’une officine active, coordinateurs internes actifs. Les membres ordinaires et accompagnateurs sans ces fonctions gardent un MFA facultatif.

- Vérification serveur à chaque requête, indépendamment des menus et du sélecteur d’officine. Une promotion en administrateur active la règle sans attendre la prochaine connexion.
- Un compte non enrôlé peut se connecter mais n’obtient qu’un accès restreint à sa sécurité, son profil, ses notifications et sa déconnexion. Les fonctions protégées renvoient HTTP 403 avec `mfa_enrollment_required`.
- La connexion et les erreurs d’API conduisent vers Sécurité & MFA. La configuration TOTP révoque les anciennes sessions ; la reconnexion exige ensuite un facteur.
- La désactivation est interdite tant que le compte exerce une fonction imposant le MFA. Les codes de secours restent disponibles ; ils ne suppriment pas le MFA ni le mot de passe.
- Activation par défaut via `SOCLE_REQUIRE_PRIVILEGED_MFA=true`. Ne pas désactiver cette règle en production pour faire fonctionner d’anciennes recettes ou éviter l’enrôlement.

**Impact sur l’aperçu existant :** les comptes administrateurs/coordinateurs de démonstration non enrôlés sont désormais redirigés vers la configuration. Aucun secret TOTP n’a été imposé à leur place. Chaque utilisateur doit configurer son application et sauvegarder ses codes de secours.

## 2. Pièces facultatives et contrôle humain de l’habilitation

Aucun document réglementaire obligatoire n’est inventé. Avant d’approuver un dossier, l’instructeur doit confirmer explicitement avoir contrôlé l’habilitation du demandeur. L’API exige `habilitation_confirmed=true` pour une décision `active`, même si aucune pièce n’a été déposée.

La confirmation figure dans la modale d’approbation et dans l’audit avec la décision/version/acteur/date. Elle constitue l’attestation de l’instructeur, pas une certification automatique ou une autorisation d’exercice. Les pièces restent privées, facultatives et sans antivirus intégré.

## 3. Conservation et export

Aucune purge automatique de dossiers, pièces ou journaux métier. La purge existante reste limitée aux jetons techniques expirés et nécessite une application explicite.

Export CSV autorisé aux administrateurs habilités, avec les mêmes filtres et le même périmètre que le journal affiché :
- officine : uniquement son journal, administration active et MFA exigés ;
- plateforme : uniquement les métadonnées administratives autorisées, sans journaux métier des autres officines ni brouillons privés ;
- confirmation obligatoire en modale et côté API ; filtres appliqués à toutes les pages ;
- plafond de 5 000 événements : au-delà, rejet explicite sans fichier partiel ni audit de succès ;
- reprise de la même suppression des champs sensibles que le journal, et neutralisation des formules de tableur en début de cellule ;
- réponse privée, `no-store`, aucune copie du CSV conservée par l’application ;
- événement d’audit de la **génération** avec acteur, périmètre, filtres et nombre de lignes. Cet événement ne prétend pas prouver que le fichier a ensuite été sauvegardé par le navigateur.

Routes : `POST /api/v1/officine/journal/export` et `POST /api/v1/platform/journal/export`, corps JSON avec `confirmation=true` et filtres facultatifs `action`, `actor`, `from`, `to`. Les secrets, mots de passe et contenus de pièces ne sont pas exportés.

## 4. Recette de cette tranche

- Backend SQLite : **89 tests, 498 assertions**, tous réussis.
- Backend PostgreSQL : **89 tests, 498 assertions**, tous réussis sur base de test séparée.
- Frontend : **77 tests / 16 fichiers**, tous réussis ; build TypeScript/Vite réussi.
- Nouveau Chromium réel : enrôlement obligatoire, refus API direct avant configuration, activation TOTP/reconnexion, absence de désactivation, confirmation d’export, téléchargement CSV et audit : réussis, aucune erreur JavaScript observée. Le compte privilégié jetable a été désactivé ensuite.
- `MandatoryMfaAndExportTest` teste aussi la promotion à chaud, les profils facultatifs, l’isolation des exports, les formules tableur, le plafond et la confirmation humaine sans document.

Les anciennes suites de règles métier isolent le MFA via l’environnement PHPUnit pour garder leurs fixtures inchangées ; la suite dédiée **réactive explicitement l’obligation**. Il n’existe pas de contournement automatique fondé sur `APP_ENV=testing` dans le middleware de production.

Les anciens résultats HTTP et navigateur des notes antérieures ne sont pas revendiqués comme une nouvelle recette après ces changements : leurs comptes privilégiés et payloads d’approbation doivent être adaptés avant relance. La recette navigateur courante et son helper CLI local sont documentés dans `scripts/browser/README.md`.

La conservation réglementaire, la procédure humaine de perte totale MFA, les textes juridiques et les essais réels SMTP/Google restent des conditions de mise en production distinctes. Le ZIP déjà publié précédemment est un snapshot antérieur : il ne contient pas automatiquement cette tranche.
