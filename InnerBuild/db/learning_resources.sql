-- Ressources pédagogiques rédigées par l'admin et diffusées aux apprenants
-- dans l'onglet « Ressources » de /app/ressources.
--
-- Cette table est créée automatiquement et de façon idempotente au premier
-- accès à /admin/ressources (voir src/lib/learning-resources.functions.ts).
-- Ce fichier sert de référence et permet de l'appliquer manuellement :
--   wrangler d1 execute <DB> --file=db/learning_resources.sql --remote

CREATE TABLE IF NOT EXISTS learning_resources (
  id          TEXT PRIMARY KEY,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  category    TEXT    NOT NULL DEFAULT 'guide',
  image_url   TEXT    NOT NULL DEFAULT '',
  image_key   TEXT    NOT NULL DEFAULT '',
  links       TEXT    NOT NULL DEFAULT '[]',
  tags        TEXT    NOT NULL DEFAULT '[]',
  skill_id    TEXT    NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  published   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_resources_published
  ON learning_resources (published, position);

CREATE INDEX IF NOT EXISTS idx_learning_resources_category
  ON learning_resources (category);

CREATE INDEX IF NOT EXISTS idx_learning_resources_skill
  ON learning_resources (skill_id);

-- Colonnes :
--   category  : 'guide' | 'outil' | 'lecture' | 'video' | 'modele'
--   links     : JSON — [{ "label": "Documentation", "url": "https://..." }]
--   tags      : JSON — ["react", "accessibilité"]
--   skill_id  : rattachement optionnel à une skill du catalogue ('' si aucun)
--   image_url : URL publique R2 ('' si pas d'image)
--   image_key : clé R2 correspondante, pour pouvoir supprimer le fichier
