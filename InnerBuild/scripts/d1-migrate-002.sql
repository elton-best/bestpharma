-- AI Factory — D1 migration 002 : aligne les tables créées par l'ancien script
-- avec les colonnes attendues par le code (one-shot, ne pas rejouer).
-- wrangler d1 execute <DB> --remote --file=scripts/d1-migrate-002.sql

ALTER TABLE profiles ADD COLUMN created_at TEXT NOT NULL DEFAULT '2026-09-30T00:00:00+00:00';
ALTER TABLE profiles ADD COLUMN goal TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN level TEXT NOT NULL DEFAULT 'debutant';

ALTER TABLE challenge_submissions ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE challenge_submissions ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE challenge_submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'submitted';
ALTER TABLE challenge_submissions ADD COLUMN submitted_at TEXT NOT NULL DEFAULT '2026-09-30T00:00:00+00:00';
-- created_at existait déjà sur challenge_submissions (conservée)
ALTER TABLE challenge_submissions ADD COLUMN updated_at TEXT NOT NULL DEFAULT '2026-09-30T00:00:00+00:00';
