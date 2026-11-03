# AI FACTORY

# AIFAC — Plateforme de formation aux skills ai-factory

---

## 🎯 Vision & Positionnement

**AIFAC** (AI Factory Accelerator) — Formation aux skills ai-factory + accompagnement jusqu'à ta première livraison validée.

- **Cible** : Développeurs qui veulent apprendre à *livrer* avec des agents IA (Claude Code, Codex, Cursor, OpenCode), pas collectionner des tutos
- **Différenciant** : Méthode qui boucle jusqu'à **Done** (Spec → Plan → Build → Review → QA → Deliver), 212 skills curés, 45 effets 3D, accompagnement humain jusqu'à la première livraison validée
- **Slogan** : *« On ne t'apprend pas des outils. On te forge à livrer. »*

---

## 💳 Modèle de Paiement (Échelonné en 4 Tranches)

Les cours de la section **Apprendre** sont **100% gratuits et ouverts à tous**. Le paiement débloque progressivement **Pratique, Rendus, Challenges et Certification**.

| Paramètre | Valeur |
|-----------|--------|
| **Total standard** | **4 000 F CFA** — payable en **4 tranches mensuelles de 1 000 F CFA** (Octobre, Novembre, Décembre, Janvier) |
| **Tarif partenaire** | **2 000 F CFA (-50%)** — 2 tranches de 1 000 F, les tranches 3 et 4 sont **offertes** |
| **Moyens de paiement** | FeexPay : Mobile Money (MTN, Moov, Celtiis, Orange, Wave…) + Carte Visa/Mastercard |
| **Flux** | Widget FeexPay → `recordPaymentServerFn` → insertion `payments` (D1) → activation accès |
| **Fallback manuel** | Déclaration de référence par tranche (`TRANCHE-N:ref`) → validation admin |

### 🤝 Partenariat 4Talents (-50% automatique)

L'éligibilité à la réduction est **déterminée via un endpoint partenaire** :

```
POST https://4talents.org/api/partners/v1/member-status
Authorization: Bearer <PARTNERS_4TALENTS_API_KEY>
Body: { "email": "apprenant@exemple.com" }
→ { "eligible": true, "community": { "name", "slug" } }
```

- Vérification côté serveur via `check4TalentsPartnerServerFn` (`src/lib/d1-partner.functions.ts`)
- Si l'email est inscrit dans la base Partenaire 4Talents → **réduction 50% appliquée automatiquement** au compte (`is4TalentsPartner`)
- L'apprenant ne règle alors que **2 tranches (2 000 F)** au lieu de 4 ; tranches 3 et 4 marquées « Offerte (-50%) »

---

## 🎨 Identité Visuelle

### Palette
| Couleur | Hex | Usage |
|---------|-----|-------|
| **Paper** | `#FAFAF9` | Fond principal (light) |
| **Ink** | `#101828` | Texte principal |
| **Muted** | `#667085` | Texte secondaire |
| **Accent** | `#EA580C` | Orange principal (CTA, liens, accents) |
| **Amber** | `#FBBF24` | Highlights, badges « À régler » |
| **Emerald** | `#10B981` | Succès, validé, progression |
| **Line** | `rgba(251, 191, 36, 0.14)` | Bordures, séparateurs |

### Typographie
| Rôle | Police | Poids |
|------|--------|-------|
| **Display (titres)** | `Sora` | 400-800 |
| **Body (texte)** | `Space Grotesk` | 400-700 |

### Principes UI
- **Light first** : fond `Paper`, texte `Ink`
- **Sidebar repliable** persistée (`localStorage`), badges dynamiques
- **Drawer mobile** overlay flouté
- **Navbar** : vitrine `/` seulement, masquée sur `/app/*`
- **Cartes** : `shadow-card`, `rounded-2xl`, `border border-line`
- **Boutons** : `btn-glow` (ombre animée au hover), `ghost` pour secondaires

---

## 🏗️ Architecture Technique

### Stack
| Couche | Technologie |
|--------|-------------|
| Framework | **TanStack Start** (React 19 + TypeScript) + Vite + Nitro |
| Routing | TanStack Router (file-based, `src/routes/*`) |
| Styling | Tailwind CSS v4 + Radix UI + tw-animate-css |
| State serveur | TanStack Query |
| Base de données | **Cloudflare D1** (SQLite serverless edge, via API REST) |
| Stockage fichiers | **Cloudflare R2** (uploads, pièces jointes) |
| Auth | **Custom D1** : sessions, tokens (`auth_tokens`), emails via Resend |
| Paiement | **FeexPay** (widget checkout, Mobile Money + carte) |
| Partenaires | API 4Talents (réduction 50%) |
| IA | Vercel AI SDK + OpenAI / Groq (assistant, tuteur de leçon, coach, agents) |
| OCR | Tesseract.js + PaddleOCR (vérification de justificatifs) |
| Charts | Recharts (lazy) |
| Icons | Lucide React |
| Fonts | Sora + Space Grotesk (Google Fonts) |

### Structure Dossiers
```
src/
├── routes/                  # 53 routes file-based (TanStack Router)
│   ├── index.tsx            # Vitrine publique /
│   ├── the-innerbuild.tsx   # Challenge The InnerBuild (landing)
│   ├── challenges.tsx       # Challenges publics
│   ├── auth.tsx             # Connexion / inscription
│   ├── app.*.tsx            # Espace apprenant /app/* (21 pages)
│   ├── admin.*.tsx          # Back-office /admin/* (16 pages)
│   ├── jury.tsx + jury-login.tsx  # Espace jury (évaluations InnerBuild)
│   └── __root.tsx
├── lib/                     # ~37 server functions + clients
│   ├── cloudflare-d1.ts     # Client D1 (API REST)
│   ├── cloudflare-r2.ts     # Client R2
│   ├── d1-session.ts        # Sessions — gestion côté client
│   ├── d1-auth.functions.ts # Auth custom (signup, login, tokens)
│   ├── d1-payment.functions.ts  # Paiements par tranches
│   ├── d1-partner.functions.ts  # Vérification 4Talents (-50%)
│   ├── d1-admin.functions.ts    # Opérations admin
│   ├── d1-progress.functions.ts # Progression apprenant
│   ├── lesson-ai.functions.ts   # Tuteur IA par leçon
│   ├── tutor.functions.ts / skill-ai.functions.ts
│   ├── challenges.ts / community.ts / notifications.ts / ...
│   └── ocr.ts / paddleocr.ts
├── components/
│   ├── app/                 # AppShell, AiChat, CoachPanel, Leaderboard, SkillLab…
│   ├── admin/               # AdminShell, MarkdownEditor, AttachmentUpload…
│   ├── course/              # Visuels de cours
│   └── ui/                  # Primitives (Radix + shadcn-like)
├── data/                    # Catalogue (4,7 Mo) : 212 skills, leçons par lots
│   ├── skills-data.json / skills-courses.json
│   ├── lot1-orchestration.ts / lot2-frontend-design.ts / lot3-backend-docs.ts
│   └── registry.ts / socle.ts / course.ts
└── styles.css

scripts/
├── d1-schema.sql            # Schéma complet D1 (32 tables)
├── d1-migrate-002.sql / d1-seed*.sql
├── setup-cloudflare-d1.cjs  # Provisioning D1
└── build-*.py               # Génération catalogue skills / cours

skills-courses/              # Contenus pédagogiques sources (Markdown)
public/                      # Vidéos promo, visuels jury & partenaires
```

---

## 🗄️ Base de Données (Cloudflare D1)

Schéma : `scripts/d1-schema.sql` + `scripts/d1-migrate-002.sql` (32 tables).

| Domaine | Tables |
|---------|--------|
| **Identité** | `users`, `profiles`, `user_roles`, `auth_tokens` |
| **Catalogue** | `courses`, `course_modules`, `lessons`, `exercises`, `quiz_questions`, `course_exams`, `skills_templates` |
| **Progression** | `lesson_progress`, `skill_progress`, `skill_lesson_progress`, `skill_exercises`, `course_exam_attempts` |
| **Paiements** | `payments` (tranches de 1 000 F, statuts pending/received/verified) |
| **Rendus** | `submissions`, `file_metadata` |
| **Challenges (InnerBuild)** | `challenges`, `challenge_registrations`, `challenge_submissions`, `challenge_evaluations`, `challenge_jury`, `challenge_results`, `challenge_daily_progress` |
| **Communauté** | `forum_threads`, `forum_posts`, `announcements`, `notifications`, `coach_questions` |
| **Traçabilité** | `audit_log` |

> Accès D1 exclusivement **côté serveur** (server functions TanStack Start) via l'API REST Cloudflare — aucun secret exposé au client.

---

## 👥 Utilisateurs & Rôles

| Rôle | Accès |
|------|-------|
| **Visiteur** | Vitrine `/`, `/the-innerbuild`, `/challenges`, fiches skills publiques |
| **Apprenant** | `/app/*` : cours gratuits (Apprendre) + fonctionnalités débloquées par tranche (Pratique, Rendus, Challenges, Certification) |
| **Partenaire 4Talents** | Apprenant avec réduction 50% automatique (2 tranches au lieu de 4) |
| **Jury** | `/jury` : évaluation des soumissions The InnerBuild (login dédié) |
| **Admin** | `/admin/*` : candidatures, paiements, apprenants, cours/leçons, quiz, rendus, challenges, certificats, annonces, communauté, traçabilité |

### Pipeline Apprenant
```
1. Inscription (email) → vérification email (Resend + auth_tokens)
2. Accès immédiat aux cours gratuits (Apprendre)
3. Paiement Tranche 1 (FeexPay 1 000 F) → débloque Pratique
4. Tranches 2-4 (ou 2 seulement si partenaire 4Talents) → Rendus, Challenges, Certification
5. Rendus relus < 48h → certificat vérifiable + portfolio
```

---

## 📚 Espace Apprenant (`/app/*`)

| Page | Contenu |
|------|---------|
| **Tableau de bord** | Stats, reprise de cours, timeline d'activation |
| **Apprendre** | Leçons texte / PDF / mixtes, tuteur IA par leçon (`LessonAsk`) |
| **Formations** | Catalogue, progression, favoris |
| **Pratique** | Exercices, quiz, SkillLab |
| **Rendus** | Soumissions GitHub + preview, corrections mentor |
| **Challenges** | Participation The InnerBuild, suivi quotidien |
| **Progression** | XP, niveaux, leaderboard, graphiques |
| **Assistant** | Chat IA général (AI SDK) |
| **Communauté** | Forum, annonces, notifications temps réel |
| **Ressources** | Bibliothèque 212 skills + modèles (briefs, cahiers des charges) |
| **Certificats** | Certificats vérifiables générés à 100% |
| **Paiement** | Timeline 4 tranches + vérification partenaire 4Talents |
| **Compte** | Profil, préférences |

---

## 🏆 The InnerBuild

Challenge/concours de build intégré à la plateforme :

- **Landing dédiée** `/the-innerbuild` (manifeste, règles, prix)
- **Inscriptions** et **soumissions** par challenge
- **Jury** : espace dédié `/jury` (13 jurés, photos dans `public/jury`), grilles d'évaluation, résultats
- **Partenaires** visibles sur la vitrine (`public/partners`)
- Suivi quotidien de progression (`challenge_daily_progress`)

---

## 🔐 Sécurité & Qualité

| Mesure | Implémentation |
|--------|----------------|
| **Secrets** | Variables d'environnement serveur uniquement (`.env` ignoré) ; D1/R2/IA jamais appelés depuis le client |
| **Auth** | Sessions + tokens signés en D1, emails transactionnels Resend |
| **Paiement** | Enregistrement serveur + rapprochement admin (références FeexPay) |
| **Traçabilité** | `audit_log` sur les actions sensibles (admin) |
| **OCR** | Vérification de justificatifs (Tesseract/PaddleOCR) |

### Variables d'Environnement
```env
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_URL=

# Paiement FeexPay
VITE_FEEXPAY_SHOP_ID=
VITE_FEEXPAY_TOKEN=
VITE_FEEXPAY_MODE=LIVE   # ou SANDBOX

# Partenaire 4Talents (réduction 50%)
PARTNERS_4TALENTS_API_KEY=

# IA & Services
OPENAI_API_KEY=
GROQ_API_KEY=
AI_API_KEY=
RESEND_API_KEY=
PADDLEOCR_ENDPOINT=
PADDLEOCR_ACCESS_TOKEN=
```

---

## 📦 Développement & Déploiement

| Action | Commande |
|--------|----------|
| **Dev** | `npm run dev` (Vite, port 8080) |
| **Build** | `npm run build` |
| **Preview** | `npm run preview` |
| **Lint** | `npm run lint` |
| **Format** | `npm run format` |
| **Provision D1** | `node scripts/setup-cloudflare-d1.cjs` puis appliquer `scripts/d1-schema.sql` + seeds via `wrangler d1 execute` |

### Checklist Go-Live
- [ ] D1 : schéma + migrations + seeds appliqués (`wrangler d1 execute`)
- [ ] R2 : bucket créé + URL publique configurée
- [ ] FeexPay : Shop ID + Token (SANDBOX → LIVE)
- [ ] 4Talents : `PARTNERS_4TALENTS_API_KEY` valide (test endpoint member-status)
- [ ] Resend : clé API + domaine d'envoi vérifié
- [ ] Test complet : inscription → email → tranche 1 sandbox → déblocage Pratique → rendu → certificat
- [ ] Test partenaire : email éligible → réduction 50% → 2 tranches

---

## 📞 Contact & Support

- **Email** : contact@aifac.dev
- **Repo** : github.com/thekiller-dev/ai-factory-build

---

**AIFAC** — *On ne t'apprend pas des outils. On te forge à livrer.* 🔨
