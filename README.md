# BEGPHARMA — Socle Backend (Laravel 11 + PostgreSQL 16)

Application web mobile de gestion d'officines de pharmacie en République du Bénin, conforme au **Guide national de bonnes pratiques de dispensation (BPD)** de l'ABMed (Décision N° ABMED/2025D/1310/ABMed/CJ/DIRP/SA).

---

## 1. Stack technique du socle

- **Backend** : Laravel 11 (PHP 8.3)
- **Base de données** : PostgreSQL 16 natif avec :
  - **Row Level Security (RLS)** activée et forcée sur toutes les tables métier.
  - **Journal d'audit inaltérable (append-only)** protégé par trigger PostgreSQL inconditionnel (rejet d'`UPDATE` et `DELETE`).
  - Fonction PostgreSQL `user_officines()` pour le cloisonnement étanche multi-tenant.
  - Triggers automatiques traçant toute opération sensible (`officines`, `utilisateurs_officines`, `officine_parametres`, `appareils_autorises`).
- **Authentification & Sécurité** :
  - Laravel Sanctum (Tokens API d'accès et tokens restreints MFA).
  - Double authentification **MFA TOTP (RFC 6238)** obligatoire pour les rôles réglementaires : Promoteur, Pharmacien, RMQ, Comptable (AC-04, NF-05).
  - Gestion des appareils connectés et déconnexion à distance (DSH-13).
  - Verrouillage automatique de session après inactivité prolongée (15 minutes par défaut, NF-05).
- **Synchronisation hors-ligne** :
  - Endpoint de synchronisation idempotent (`POST /api/sync/push`) recevant les opérations différées avec conservation stricte de `heure_locale_saisie` distincte du `server_timestamp`.

---

## 2. Installation en moins de 10 minutes

### Prérequis
- PHP 8.3 avec extensions : `pdo_pgsql`, `pgsql`, `mbstring`, `bcmath`, `curl`
- Composer 2.x
- PostgreSQL 16 en cours d'exécution (par défaut port `55432` en local ou `5432`)

### Étapes d'installation

```bash
# 1. Cloner le projet et se positionner dans le dossier backend
cd backend

# 2. Installer les dépendances
composer install

# 3. Configurer l'environnement
cp .env.example .env
php artisan key:generate

# 4. Ajuster les identifiants de la base de données dans .env si nécessaire
# DB_HOST=127.0.0.1
# DB_PORT=55432
# DB_DATABASE=bestpharma_dev
# DB_USERNAME=postgres
# DB_PASSWORD=

# 5. Exécuter les migrations et injecter les données de démonstration
php artisan migrate --seed

# 6. Lancer le serveur de développement
php artisan serve
```

Le serveur démarre sur `http://localhost:8000`.

---

## 3. Comptes de démonstration pré-configurés

Tous les comptes utilisent le mot de passe : `Begpharma2026!`

| Profil | E-mail | Rôle | MFA TOTP | Particularité |
|---|---|---|---|---|
| **Promoteur** | `promoteur@begpharma.bj` | `promoteur` | Activé (`JBSWY3DPEHPK3PXP`) | Accès aux 2 officines de démo |
| **Pharmacien titulaire** | `pharmacien@begpharma.bj` | `pharmacien_titulaire` | Activé (`JBSWY3DPEHPK3PXP`) | Rattaché à l'Officine A |
| **Dispensateur** | `dispensateur@begpharma.bj` | `dispensateur` | Non requis | Rattaché à l'Officine A |
| **Agent B** | `agent.b@begpharma.bj` | `dispensateur` | Non requis | Rattaché à l'Officine B uniquement |

> **Secret TOTP de test** : `JBSWY3DPEHPK3PXP` (ou générer un code via Google Authenticator / Authy / script TOTP).

---

## 4. Exécution des tests automatisés

La suite de tests vérifie l'étanchéité multi-tenant, le MFA TOTP, l'inaltérabilité de l'audit et la synchronisation hors-ligne :

```bash
cd backend
php artisan test
```

Résultat attendu :
- `MultiTenantIsolationTest` : L'utilisateur de l'officine A ne peut ni voir ni manipuler l'officine B (0 fuite RLS).
- `AuditLogTamperTest` : Toute tentative de modification ou suppression de l'audit est rejetée par PostgreSQL (`Action interdite : le journal d'audit est strictement inaltérable`).
- `TwoFactorAuthTest` : Forçage du MFA pour le promoteur, vérification de validité de code, liste des appareils et révocation à distance.
- `SyncQueueTest` : Rejeu ordonné d'opérations hors-ligne, détection d'idempotence, conservation de l'heure locale et serveur.

---

## 5. Synthèse des Endpoints API (Sprint 0)

### Authentification & Appareils
- `POST /api/auth/login` : Connexion email/password. Renvoie `token` direct ou `mfa_required: true` avec `temp_token`.
- `POST /api/auth/verify-mfa` : Validation du code TOTP 6 chiffres, émission du token plein accès.
- `GET /api/auth/me` : Données de l'utilisateur connecté et liste des officines accessibles.
- `POST /api/auth/logout` : Déconnexion de la session courante.
- `GET /api/auth/devices` : Liste des appareils / sessions actives (DSH-13).
- `DELETE /api/auth/devices/{tokenId}` : Révocation à distance d'un appareil (DSH-13).

### Multi-officines (RLS)
- `GET /api/officines` : Liste des officines rattachées à l'utilisateur.
- `POST /api/officines` : Création d'une officine (initialise les paramètres réglementaires).
- `GET /api/officines/{id}` : Consultation détaillée d'une officine.
- `PUT /api/officines/{id}` : Mise à jour des informations de l'officine.

### Paramètres d'officine (E0-S5)
- `GET /api/officines/{officineId}/parametres` : Récupération des paramètres versionnés.
- `PUT /api/officines/{officineId}/parametres/{cle}` : Mise à jour versionnée d'un paramètre (réservé au promoteur).

### Journal d'audit inaltérable (E0-S4)
- `GET /api/officines/{officineId}/audit-logs` : Consultation filtrable de l'audit (tables, actions, utilisateurs, dates).

### Synchronisation hors-ligne (E0-S7)
- `POST /api/sync/push` : Réception ordonnée et idempotente des opérations issues d'IndexedDB avec horodatage de saisie local distinct.
