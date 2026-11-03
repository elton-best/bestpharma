

# Plan d'implémentation : Intégration Certifigo (Formation & Hackathon)

L'étude approfondie de la documentation Certifigo et l'audit en direct de votre environnement confirment que vos clés API et URL de base sont opérationnelles. L'interrogation en direct a révélé vos templates déjà créés :
- **Format Formation** : `cmvc40wyy000701pnw1ehp6g8` (*Certificat de formation AI Factory Accelerator*)
- **Format Hackathon** : `cmvc422kv000801pn1ykpi47o` (*Certificat de participation au The Factory Hackathon*)
- Templates podium existants : *1st place*, *2nde place*, *3rd place*, *THE INNERBUILD*.

---

## 1. Synthèse des contraintes techniques Certifigo

| Domaine | Spécification technique Certifigo | Impact d'implémentation |
| :--- | :--- | :--- |
| **Authentification** | `Authorization: Bearer cfgo_...` | Appels sécurisés côté serveur (Server Functions TanStack Start). |
| **Idempotence** | Header `Idempotency-Key` (8 à 200 caractères) requis sur toute création | Génération d'une clé déterministe (ex: `cert-{type}-{userId}-{timestamp}`) pour éviter les doublons. |
| **Cycle asynchrone** | Réponse **`202 Accepted`** avec `jobId` & `campaignId` | Génération PDF + hash Ed25519 asynchrone par worker Certifigo. Polling ou synchronisation d'état jusqu'à `completed`. |
| **Quotas emails** | 50 emails max par lancement / 50 par heure / 250 par jour | Contrôle de lot lors de la distribution massive pour ne pas dépasser la limite de 50. |
| **Vérification publique** | `https://certifigoapp.com/verify/:id` (accessible sans auth) | Lien d'authentification directe intégré au dashboard de l'apprenant et sur le QR code. |
| **Téléchargement PDF** | URL R2 signée et persistée dans le certificat Certifigo | Téléchargement direct du PDF signé et affichage de la miniature (`thumbnailUrl`). |

---

## 2. Architecture technique & Modèle de données

### A. Table D1 `certificates` (Persistance centralisée)
Remplacement du stockage `localStorage` actuel par une table pérenne dans Cloudflare D1 :

```sql
CREATE TABLE IF NOT EXISTS certificates (
  id                      TEXT PRIMARY KEY,          -- ex: cert_cmvc... ou UUID
  user_id                 TEXT NOT NULL,             -- Référence apprenant
  recipient_name          TEXT NOT NULL,
  recipient_email         TEXT NOT NULL,
  type                    TEXT NOT NULL,             -- 'formation' | 'hackathon'
  template_id             TEXT NOT NULL,             -- ID template Certifigo
  certifigo_id            TEXT,                      -- ID unique certificat Certifigo
  certifigo_campaign_id   TEXT,                      -- ID campagne Certifigo
  certifigo_job_id        TEXT,                      -- ID job pg-boss
  status                  TEXT NOT NULL DEFAULT 'processing', -- 'draft' | 'processing' | 'completed' | 'failed'
  verification_url        TEXT,                      -- https://certifigoapp.com/verify/...
  pdf_url                 TEXT,                      -- Lien CDN / R2 du PDF final
  thumbnail_url           TEXT,                      -- Miniature haute résolution
  signature               TEXT,                      -- Empreinte Ed25519
  issued_at               TEXT,
  created_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(type);
```

### B. Client API Certifigo : [`src/lib/certifigo.ts`](file:///home/elton/ai-factory-99102579/src/lib/certifigo.ts)
Module dédié à la communication avec Certifigo :
- `issueSingleCertificate(opts: { templateId, name, email, metadata })`
- `issueBatchCertificates(opts: { templateId, recipients, mapping })`
- `getCertificateStatus(certifigoId: string)`
- `sendCampaignEmails(campaignId: string)`
- `listTemplates()`

### C. Server Functions : [`src/lib/certifigo.functions.ts`](file:///home/elton/ai-factory-99102579/src/lib/certifigo.functions.ts)
- `generateCertificateServerFn`: Vérifie les prérequis (éligibilité, tranches payées), appelle Certifigo avec `Idempotency-Key`, insère la ligne dans D1 et déclenche la notification in-app.
- `syncCertificateStatusServerFn`: Met à jour le certificat avec l'URL finale du PDF et de vérification une fois le worker terminé.
- `sendCertificateEmailServerFn`: Déclenche l'envoi de l'email officiel via Certifigo (`POST /api/v1/campaigns/:id/send`).

---

## 3. Workflow & Interface Administrateur (`/admin/certificats`)

### A. Sélecteur de format
Un sélecteur à 2 onglets en tête de page :
1. **Format Formation AI Factory**
   - Source : Apprenants ayant complété le parcours (`pct >= 100%`) et dont les paiements sont en règle.
   - Template cible : `cmvc40wyy000701pnw1ehp6g8` (*Certificat de formation AI Factory Accelerator*).
2. **Format Hackathon (Février)**
   - Source : Participants inscrits ou ayant soumis leur projet au Hackathon The InnerBuild / AI Factory.
   - Template cible : `cmvc422kv000801pn1ykpi47o` (*Certificat de participation au The Factory Hackathon*) + option podium (1ère, 2ème, 3ème place).

### B. Le Bouton d'Action Admin
1. **Lancement individuel** :
   - Sur chaque fiche apprenant éligible ou dans la modale d'inspection :
     - Bouton : **`🚀 Générer & Distribuer via Certifigo`**
     - Ouvre une confirmation avec 2 options cochables :
       - [x] *Générer le certificat vérifiable (Certifigo + QR Code + Signature)*
       - [x] *Envoyer immédiatement l'email officiel avec le PDF en pièce jointe*
   - Au clic : passage en statut `En cours de traitement... (202)` avec badge animé, puis `Délivré & Vérifié` dès confirmation du worker.

2. **Lancement groupé (Batch)** :
   - Bouton d'en-tête : **`⚡ Générer & Distribuer la promotion (Batch)`**
   - Sélectionne tous les apprenants éligibles non encore certifiés (lot borné à 50 pour respecter le rate-limit email de Certifigo).
   - Barre de progression avec retour visuel en temps réel.

---

## 4. Expérience Apprenant (`/app/certificats`)

Dans l'espace apprenant :
- Affichage du certificat officiel avec la vraie miniature générée par Certifigo.
- **Badge d'authentification cryptographique** :
  - Lien public direct vers `https://certifigoapp.com/verify/:id` (permettant à l'apprenant de partager son certificat sur LinkedIn ou à un recruteur).
- **Bouton de téléchargement du PDF officiel** signé Ed25519.
- Notification instantanée reçue dans l'application dès la distribution par l'admin.

---

## 5. Plan de réalisation par étapes

1. **Étape 1 : Base de données D1**
   - Créer la table `certificates` dans D1 et l'enregistrer dans `READ_TABLES` / `WRITE_TABLES`.
2. **Étape 2 : Connecteur API Certifigo**
   - Créer `src/lib/certifigo.ts` et `src/lib/certifigo.functions.ts` avec gestion de l'idempotence et du statut 202.
3. **Étape 3 : Écran Admin (`/admin/certificats`)**
   - Ajouter le sélecteur Formation / Hackathon.
   - Implémenter le bouton d'action *"Générer & Distribuer via Certifigo"* (individuel et par lot) avec modale de confirmation.
4. **Étape 4 : Écran Apprenant (`/app/certificats`)**
   - Brancher l'affichage sur la table `certificates` de D1.
   - Afficher le lien de vérification publique `certifigoapp.com/verify/...` et le téléchargement PDF.
5. **Étape 5 : Test de bout en bout & Validation**
   - Test d'un appel réel de génération sur un compte test.
   - Vérification de la signature et du QR code sur la page publique de vérification.

Souhaitez-vous que je démarre directement l'implémentation selon ces étapes ?