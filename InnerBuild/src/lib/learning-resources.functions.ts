import { createServerFn } from "@tanstack/react-start";
import { d1Query } from "./cloudflare-d1";

// Création idempotente de la table des ressources pédagogiques.
// Appelée au chargement de /admin/ressources : l'admin n'a aucune migration
// manuelle à lancer, et le script de référence reste versionné dans
// db/learning_resources.sql.

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS learning_resources (
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
  );`,
  `CREATE INDEX IF NOT EXISTS idx_learning_resources_published
    ON learning_resources (published, position);`,
  `CREATE INDEX IF NOT EXISTS idx_learning_resources_category
    ON learning_resources (category);`,
  `CREATE INDEX IF NOT EXISTS idx_learning_resources_skill
    ON learning_resources (skill_id);`,
];

export const ensureLearningResourcesTableServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    for (const sql of DDL) {
      const res = await d1Query(sql);
      if (!res.success) {
        return { success: false, error: res.error || "Création de la table impossible." };
      }
    }
    return { success: true };
  },
);
