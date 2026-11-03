# Roadmap — BEGPHARMA

## Sprint 0 — close-out
- [x] Fichier d'intégration continue (GitHub Actions) — à livrer, exécution après synchro GitHub
- [x] Documentation d'installation
- [x] Compte rendu de sprint complet

## Sprint 0 — done
- Socle de données (officines, rattachements, paramètres, journal d'audit, appareils, file hors ligne)
- Écrans : connexion/inscription, MFA (enrôlement + challenge à chaque session), accueil, paramètres, journal, appareils, sécurité
- Navigation : menu compte, indicateur en ligne, choix d'officine
- Tests vitest : formats, file hors ligne, routage — 7 passants
- Tests backend PHPUnit : 11 passants (RLS, Audit append-only, 2FA, Sync queue)

## Écarts reportés (décisions validées)
- Hors ligne complet + PWA installable : Sprint 3 (écart E0-S6 assumé)
- Passerelle SMS : emplacement prévu, fournisseur au Sprint 6
- Modèles (59) et articles (267) : fichier tableur BEG au plus tard Sprint 5
- Officine pilote : nom à communiquer (démo créée en attendant)
