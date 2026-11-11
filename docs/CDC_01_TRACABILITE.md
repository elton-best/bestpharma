> **Bilan courant :** voir [la clôture technique locale et les conditions de production](CDC_01_RECETTE_FINALE.md). Les avancements et réserves des tranches historiques ci-dessous sont à lire à la lumière de ce bilan.

# CDC 01 v1.1 — matrice de traçabilité et réserves

Référence : `cdc/CDC_DIGIT_ABMEB_Module_01_Officines_Acces.md`. Cette matrice est un état de développement, pas une certification. « Partiel » signifie que la section n’est pas clôturée ; les tests cités ne constituent pas une preuve exhaustive de tous ses critères.

| Section CDC | Réalisation et contrôles | Preuves locales principales | État / réserves |
|---|---|---|---|
| 1–3 Objectif, limites, acteurs | Module 01 séparé du module 02 démo ; plateforme, coordination, membres et accompagnateurs distincts | `OfficineAccessTest`, `modules-api.test.ts` | En place ; délégations fines et permissions futures à confirmer |
| 4 Navigation | Shell ERPSAAS extensible/réductible, séparation officine/personnel/plateforme, choix multi-officine | Tests UI existants, Chromium de navigation | En place ; contrôle mobile exhaustif à compléter sur nouveaux écrans |
| 5.1 Compte demandeur | Email normalisé/unique, mot de passe, brouillon, aucun accès avant activation, vérification email | `ApplicationLifecycleTest`, `IdentityCompletionTest` | SMTP réel non testé |
| 5.2 Dossier | Sauvegarde partielle versionnée, localisation, pièces privées facultatives, attestation de soumission | `IdentityCompletionTest` | Référentiels géographiques, types obligatoires de pièces et antivirus à arbitrer |
| 5.3 Instruction | Version, prise en charge, corrections, refus, activation, notes internes/partagées ; auto-instruction interdite | `ApplicationLifecycleTest`, `IdentityCompletionTest` | Recette UI complète et couverture exhaustive des notifications de commentaires à compléter |
| 5.4 États | Brouillon → soumis → instruction → correction/refus/activation, accès conditionné à l’état | `ApplicationLifecycleTest` | Ne représente pas une autorisation réglementaire |
| 6 Fiche officine | Profil versionné, contacts, historique, logo privé PNG réencodé ; suspension/réactivation/archive plateforme | `OfficineAccessTest`, `OfficeLogoTest`, `SocleManagementTest` | Référentiels et certains champs métier/préférences à compléter selon validation |
| 7 Équipe | Invitation à usage unique, renvoi invalidant l’ancien lien, appartenance et rôles multiples, suspension, protection du dernier administrateur | `TeamAccessTest`, `SocleManagementTest`, `team-modals.test.ts` | Politiques de durée configurables, à faire approuver ; administration déléguée non généralisée |
| 8 Rôles | Noms uniques par officine, description, union de permissions, version, duplication sans membres, désactivation conditionnée | `TeamAccessTest`, `SocleManagementTest` | Catalogue limité aux modules implémentés ; journal avant/après et vue d’impact complète à enrichir |
| 9 Accompagnateurs | Proposition sans accès, approbation explicite versionnée, demande de modification, fin par officine/coordination, expiration, désactivation interne | `OfficineAccessTest`, `SocleManagementTest` | Recette approfondie reproposition après modification et concurrence à compléter |
| 10 Identité | Sessions expirantes/révocables, renouvellement, changement email vérifié, TOTP antirejeu, codes de secours hachés à usage unique | `IdentityCompletionTest`, `RecoveryAndAccountStateTest`, `security-ui.test.ts` | Obligation MFA pour profils sensibles et procédure humaine en cas de perte totale à décider |
| 10 Google | État lié au cookie, PKCE, callback serveur, antirejeu, association explicite | `IdentityCompletionTest` (HTTP fournisseur simulé) | Désactivé sans configuration ; recette fournisseur réelle non réalisée |
| 11 Permissions | Isolation tenant à chaque requête ; administration plateforme sans accès métier implicite ; accompagnateurs en lecture | `OfficineAccessTest`, `TeamAccessTest`, `QualityActionsTest` | Permissions déléguées futures à définir |
| 12 Données | Clés étrangères, versions, stockage privé, empreintes, secrets chiffrés/hachés ; état global de compte distinct de l’état interne | Deux moteurs SQL, `RecoveryAndAccountStateTest`, `OfficeLogoTest` | UUID/représentation de dossiers différente des tables indicatives CDC ; politique de conservation métier ouverte |
| 13 API | Contrats sous `/api/v1`, contrôles serveur, pagination de recherche des comptes, versions obligatoires | Suites backend + scripts HTTP | API indicative adaptée à Laravel ; pagination/filtres exhaustifs du journal à compléter |
| 14 Notifications/journal | Outbox transactionnelle, reprises bornées, état simulé distinct, notifications personnelles, rappels idempotents, événements d’accès et état | `SocleMaintenanceTest`, `IdentityCompletionTest`, 81 contrôles HTTP (tranche précédente) | Pas de garantie de réception SMTP ; couverture exhaustive avant/après, filtres, export, rétention et suivi de tous les destinataires à compléter |
| 15 Recette | Tests SQLite/PostgreSQL, UI, build et navigation Chromium | Bilan dans `CDC_01_ETAT_2026_11_10.md` | Scénarios complets navigateur, concurrence, SMTP/Google réels à terminer |
| 16 Décisions ouvertes | Pas d’invention de pièce obligatoire ni d’autorisation pharmaceutique ; MFA volontaire, durées explicites et configurables | Config `socle.php`, note de recette | Validation métier requise sur les règles encore ouvertes |
| 17 Livrables | Code, migrations, configuration d’exemple, tests, scripts, docs et Docker | Dépôt courant | Docker et GitHub CI non exécutés dans ce sandbox ; aucun déploiement production affirmé |

## Codes de secours MFA

Après activation TOTP et reconnexion, ouvrir **Sécurité & MFA → Renouveler les codes de secours**. Vérification du mot de passe et d’un facteur existant, puis dix codes aléatoires de 128 bits affichés une seule fois, sans stockage navigateur. Seules les empreintes SHA256 sont conservées. Un code remplace le facteur TOTP (pas le mot de passe), une fois, et son usage produit une notification sans secret. La rotation invalide les anciens codes ; la désactivation MFA les supprime. Une perte simultanée du mot de passe, de l’application et des codes ne crée aucun contournement automatique.

## État global des comptes

**Administration plateforme → État des comptes** : recherche paginée, confirmation motivée et contrôle de version. Désactiver révoque sessions et liens d’identité ; réactiver ne restaure pas ces secrets. Auto-désactivation interdite ; réaffecter l’administration d’officine avant de désactiver son dernier administrateur actif. Le statut interne d’accompagnement reste indépendant.

## Logos

PNG/JPEG ≤ 2 Mo, ≤ 2 000 × 2 000 pixels, réencodage serveur PNG pour retirer les métadonnées. Aucun SVG. Stockage privé, accès tenant obligatoire, remplacement et retrait versionnés et journalisés. GD avec support JPEG requis ; Docker configuré, mais image Docker non construite ici. Réencodage ne vaut pas analyse antivirus. Échec de nettoyage du vieux fichier après remplacement : intervention de stockage possible ; aucune purge globale automatique de fichiers n’est promise.
