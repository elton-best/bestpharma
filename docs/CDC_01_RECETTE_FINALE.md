> **Règles métier actualisées :** [MFA obligatoire, contrôle humain et export du journal](CDC_01_DECISIONS_APPLIQUEES.md). Ces décisions remplacent les réserves correspondantes ci-dessous.

# Module 01 — clôture technique locale et conditions de production

**Projet : bestpharma / BEGPHARMA — CDC v1.1 du 10 novembre 2026.**

Cette note est le bilan courant ; elle remplace les listes d’avancement des tranches précédentes. Le périmètre développé est disponible dans l’aperçu API et la recette locale décrite ci-dessous est réussie. **Ce bilan ne constitue ni une homologation réglementaire, ni une recette SMTP/Google réelle, ni une autorisation de mise en production.** Les décisions explicitement ouvertes au §16 du CDC ne sont pas inventées.

## 1. Périmètre livré

- Compte demandeur, email normalisé/unique, brouillon privé, sauvegarde partielle versionnée, localisation et pièces privées facultatives ; consentement et email vérifié requis à la soumission.
- Instruction avec prise en charge, versions, corrections, messages partagés/notes internes, refus et activation unique ; pas d’auto-instruction ni d’accès métier avant activation.
- Fiche d’officine, contacts distincts des comptes, logo privé réencodé PNG, localisation détaillée ; choix multi-officine sans fuite de contexte.
- Équipe, invitations à usage unique, renvoi invalidant l’ancien lien, acceptation authentifiée pour un compte existant, rôles multiples combinés, rôles versionnés/dupliqués/désactivés et protection du dernier administrateur actif. L’administration système est protégée, non délégable via un rôle personnalisé ordinaire.
- Équipe interne distincte des appartenances officine ; accompagnateur éligible, proposition sans accès, décision explicite, demande de modification, nouvelle proposition, fin par officine/coordinateur, expiration et désactivation interne immédiatement prises en compte.
- Mot de passe oublié, vérification et changement d’email, changement de mot de passe, sessions expirantes/révocables, TOTP antirejeu et codes de secours hachés à usage unique. Préférence de langue enregistrée ; l’interface livrée reste en français.
- Google conditionné à sa configuration : état lié au cookie, PKCE, callback serveur, rejeu refusé, pas de fusion automatique par email et association explicite. Tests fournisseur simulés, pas de connexion Google réelle déclarée.
- État global du compte distinct du statut interne et des appartenances ; suspension/réactivation/archivage des officines, versions et motifs. Conservation des données et révocation des sessions/liens lors d’un changement global de compte.
- Notifications applicatives, outbox transactionnelle chiffrée, retries bornés, statuts honnêtes, rappels sans doublons. Échecs et reprises visibles au propriétaire habilité du message ; pas d’exposition des destinataires/secrets d’un autre utilisateur.
- Journal paginé et filtrable par action, acteur et dates UTC, détail en modale, portée tenant/plateforme contrôlée, métadonnées et modifications de rôles/statuts. Les changements de profil journalisent les champs modifiés plutôt que dupliquer leurs valeurs personnelles. Secrets exclus ; notes internes non divulguées dans les notifications partagées.
- Tableaux réels officine/plateforme : états, dossiers anciens, membres actifs, invitations valides, propositions recevables et accès actifs/échéances. Date d’instantané et période explicites ; les compteurs de stock ne sont pas confondus avec les créations/soumissions sur 7/30/90 jours.
- Actions sensibles et consultations détaillées en modales, gestion du clavier/focus, navigation extensible/réductible et mobile. Module 02 toujours séparé et démonstratif.

## 2. Résultats exécutés

| Vérification | Résultat |
|---|---|
| Laravel + SQLite | **83 tests, 453 assertions**, tous réussis |
| Laravel + PostgreSQL 16, base de test séparée | **83 tests, 453 assertions**, tous réussis |
| Frontend Vitest | **75 tests, 16 fichiers**, tous réussis |
| Frontend TypeScript/Vite | Build réussi |
| Application admin TypeScript/Vite | Build réussi (le module 01 opérationnel est dans le frontend principal) |
| API HTTP sur PostgreSQL local | **49 + 33 = 82 contrôles**, tous réussis ; doubles décisions d’activation et protection du dernier administrateur en concurrence incluses |
| Chromium, cinq scripts enchaînés | Réussis : inscription complète, sécurité/MFA, logo, accompagnement et navigation ; aucune erreur JavaScript observée |
| Chromium mobile 390 × 844 | Menu, piège de focus, Échap, restitution du focus et absence de débordement horizontal de la synthèse : réussis |
| Syntaxe PHP app/routes/database | Réussie |
| Composer | Manifeste valide |
| Migrations locales | Appliquées jusqu’à `000009_add_account_recovery` |

Les parcours Chromium comprennent : inscription API avec confirmation, brouillon enregistré, vérification par **boîte de test locale**, soumission, instruction et approbation, accès à l’officine ; renouvellement de mot de passe, activation TOTP révoquant les sessions, connexion TOTP, génération de dix codes de secours, connexion par un code puis refus de son rejeu ; ajout de logo, rechargement et retrait ; proposition/approbation/retrait d’un accompagnateur avec la même session ouverte, isolation multi-officine et persistance des contacts.

Les scripts de recette sont conservés dans `scripts/browser/` avec manifeste npm verrouillé et consignes locales. Les scripts HTTP sont `scripts/validate-api.py` et `scripts/validate-module1.py`. Aucun ne doit être exécuté sur une base métier. La boîte locale a été remise à **false** après les essais.

**Non exécutés :** SMTP réel, Google réel, image Docker et GitHub CI. Les tests de transport/fournisseur simulés ne remplacent pas ces validations externes. Une modification documentaire/configurationnelle ultérieure n’est pas une nouvelle exécution de tous les parcours.

## 3. Correspondance avec les 14 critères de recette (§15)

| Critère | Preuve et limite |
|---|---|
| 1 Inscription/vérification/soumission sans accès prématuré | `ApplicationLifecycleTest`, `IdentityCompletionTest`, Chromium registration |
| 2 Correction et historique des échanges | Tests de cycle de dossier, commentaires internes/partagés et script HTTP aller-retour correction ; UI de brouillon réutilisée |
| 3 Activation unique sous concurrence / refus | Versions/verrous, tests de cycle et **deux décisions HTTP concurrentes : un succès, un conflit** |
| 4 Google, erreurs, non-fusion et suspension | `GoogleFlowTest`, `IdentityCompletionTest` avec fournisseur simulé ; **recette Google réelle conditionnée à configuration** |
| 5 Union des rôles et refus d’escalade | `TeamAccessTest`, contrôles de catalogue et d’administration, isolation tenant |
| 6 Modification de rôle et isolation | Tests équipe/gestion, effets contrôlés à la requête suivante |
| 7 Dernier administrateur y compris concurrence | Tests équipe + contrôle HTTP concurrent ; protection globale du compte également testée |
| 8 Accompagnateurs et nouvelle approbation | `OfficineAccessTest` : modification → nouvelle proposition, expiration TTL, fin coordinateur et désactivation interne ; Chromium session ouverte |
| 9 Isolation lecture/écriture/recherche/fichiers | Tests tenant, journaux/recherche/comptes, pièces privées et logo ; pas d’export non autorisé exposé |
| 10 Invitation expirée/révoquée/utilisée/renvoyée et erreurs email | Tests invitation + outbox, simulation et backoff ; SMTP réel à recetter |
| 11 Suspension locale vs autres appartenances | Tests tenant, script HTTP et choix multi-officine dans Chromium |
| 12 Journal contrôlé sans secrets | `AccessOperationsTest`, tests historiques, filtrage/pagination et suppression de champs sensibles, détails en modale |
| 13 Atomicité et idempotence | Transactions/verrous, outbox, demandes à clé stable, contrôle des doubles décisions et invitations à usage unique |
| 14 UI chargement/vide/erreur/confirmation/clavier/mobile | Tests composants, Chromium desktop et recette mobile réelle décrite ci-dessus |

Cette table rend explicites les niveaux de preuve : elle ne transforme pas une preuve automatisée partielle ou simulée en recette externe réelle.

## 4. Exploitation

```sh
cd backend
php artisan migrate --force
php artisan socle:deliver --limit=50
php artisan socle:remind
php artisan socle:prune           # simulation uniquement
# Après validation opérateur, suppression des seuls jetons techniques expirés :
php artisan socle:prune --apply
```

Le scheduler lance `socle:deliver` chaque minute et `socle:remind` à 08:00 dans le fuseau de l’application. Installer un scheduler Laravel permanent dans le déploiement cible, sans multiplier les instances sans verrou distribué. Un service `scheduler` est ajouté au Compose de développement ; **Compose n’a pas été exécuté ici**. Un `schedule:work` natif a été démarré dans l’aperçu local. Il ne constitue pas un service de production supervisé.

- `FRONTEND_URL` doit être l’origine publique correcte du frontend pour les liens email et retours Google. `APP_URL` et `GOOGLE_REDIRECT_URI` doivent correspondre au backend public, avec HTTPS en production.
- Google exige `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` et une URL de retour autorisée chez le fournisseur. Cache partagé requis pour l’antirejeu entre workers ; Redis est le choix du projet. Fournisseur désactivé sans ces trois valeurs.
- Pour les emails réels : configurer SMTP et une adresse d’expédition autorisée hors Git, puis valider livraison, échec et reprise sur une boîte de recette. `log`, `array`, `failover`, `roundrobin` sont volontairement traités en simulation et ne prouvent aucun envoi.
- `SOCLE_LOCAL_INBOX=false` en exploitation. La lecture locale des liens secrets est en outre interdite hors environnement local/testing. TOTP et codes de secours ne sont jamais envoyés par email ni persistés dans le navigateur.
- `APP_ENV=production`, `APP_DEBUG=false`, HTTPS, clé d’application protégée, stockage privé persistant et sauvegardes/restauration vérifiées avant exploitation. Ne jamais utiliser le seed et les mots de passe fictifs en production.
- Les diagnostics Telescope restent sans enregistrement et sans accès, afin de ne pas capturer liens d’identité, emails privés, réponses de fournisseur ou secrets MFA. Leur réouverture exige une politique de masquage revue.
- GD avec JPEG requis pour le réencodage des logos ; ajouté à la configuration Docker, testé nativement ici. PDF/JPEG/PNG privés : contrôle MIME/taille/empreinte ; **aucun antivirus intégré**.

Les valeurs par défaut (invitation 7 jours, proposition 14 jours, rappel après 3 jours, purge des jetons expirés depuis plus de 7 jours) sont configurables et restent à faire approuver avant production. La purge technique ne supprime aucun utilisateur, dossier, pièce, notification ou audit. Aucun export de journal ou purge métier n’est activé sans politique validée.

## 5. Conditions de mise en production — hors validation locale

1. Recetter SMTP et Google réels avec les URLs et identifiants du déploiement cible ; vérifier le scheduler, Redis partagé et les reprises après redémarrage.
2. Faire approuver les règles ouvertes du CDC : preuve du mandat du demandeur, pièces obligatoires éventuelles/contrôles, obligation MFA pour profils sensibles, procédure humaine de perte totale, durées de conservation, assistance exceptionnelle, délégations et approbateurs autorisés.
3. Valider les textes métier/juridiques et la politique d’export/conservation des journaux. La validation SaaS ne vaut pas autorisation pharmaceutique ou certification.
4. Recetter l’infrastructure cible : sauvegardes/restauration, stockage privé, TLS/proxy, SMTP, sauvegarde des clés et supervision. Docker et CI doivent être exécutés dans l’environnement qui les fournit.

**Conclusion : développement local livré et recette technique ci-dessus réussie. Mise en production non déclarée validée tant que ces conditions externes ne sont pas satisfaites.**
