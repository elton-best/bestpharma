import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { d1Query } from "./cloudflare-d1";

// Couche D1 générique — source unique de données.
// Tables autorisées en écriture client via server fns (pas de RLS : contrôle applicatif).

const READ_TABLES = new Set([
  "profiles",
  "user_roles",
  "courses",
  "course_modules",
  "lessons",
  "lesson_progress",
  "skill_lesson_progress",
  "skill_progress",
  "skill_exercises",
  "submissions",
  "payments",
  "quiz_questions",
  "exercises",
  "course_exams",
  "course_exam_attempts",
  "announcements",
  "notifications",
  "forum_threads",
  "forum_posts",
  "coach_questions",
  "audit_log",
  "challenges",
  "challenge_registrations",
  "challenge_submissions",
  "challenge_evaluations",
  "challenge_jury",
  "challenge_results",
  "challenge_daily_progress",
  "file_metadata",
  "skills_templates",
  "learning_resources",
  "certificates",
]);

const WRITE_TABLES = new Set([
  "profiles",
  "courses",
  "course_modules",
  "lessons",
  "lesson_progress",
  "skill_lesson_progress",
  "skill_progress",
  "skill_exercises",
  "submissions",
  "payments",
  "quiz_questions",
  "exercises",
  "course_exams",
  "course_exam_attempts",
  "announcements",
  "notifications",
  "forum_threads",
  "forum_posts",
  "coach_questions",
  "audit_log",
  "auth_tokens",
  "challenges",
  "challenge_registrations",
  "challenge_submissions",
  "challenge_evaluations",
  "challenge_jury",
  "challenge_results",
  "challenge_daily_progress",
  "file_metadata",
  "skills_templates",
  "learning_resources",
  "certificates",
]);

function assertTable(table: string, write = false) {
  const set = write ? WRITE_TABLES : READ_TABLES;
  if (!set.has(table)) throw new Error(`Table non autorisée : ${table}`);
}

function boolToInt(v: unknown) {
  if (v === true) return 1;
  if (v === false) return 0;
  return v;
}

export const d1ListServerFn = createServerFn({ method: "GET" })
  .validator((d: { table: string; where?: Record<string, string | number>; orderBy?: string; orderDir?: "ASC" | "DESC"; limit?: number }) => d)
  .handler(async ({ data }) => {
    try {
      assertTable(data.table);
      let sql = `SELECT * FROM ${data.table}`;
      const params: unknown[] = [];
      if (data.where && Object.keys(data.where).length) {
        sql += " WHERE " + Object.keys(data.where).map((k) => `${k} = ?`).join(" AND ");
        for (const k of Object.keys(data.where)) params.push(boolToInt((data.where as any)[k]));
      }
      if (data.orderBy) sql += ` ORDER BY ${data.orderBy} ${data.orderDir === "ASC" ? "ASC" : "DESC"}`;
      if (data.limit) sql += ` LIMIT ${Math.min(data.limit, 500)}`;
      sql += ";";
      const res = await d1Query(sql, params as any[]);
      if (!res.success) return { success: false, rows: [], error: res.error || "Base D1 injoignable." };
      return { success: true, rows: res.results || [] };
    } catch (e: any) {
      return { success: false, rows: [], error: e.message };
    }
  });

export const d1GetServerFn = createServerFn({ method: "GET" })
  .validator((d: { table: string; id: string; idCol?: string }) => d)
  .handler(async ({ data }) => {
    try {
      assertTable(data.table);
      const col = data.idCol || "id";
      const res = await d1Query(`SELECT * FROM ${data.table} WHERE ${col} = ? LIMIT 1;`, [data.id]);
      if (!res.success) return { success: false, row: null, error: res.error || "Base D1 injoignable." };
      return { success: true, row: res.results?.[0] || null };
    } catch (e: any) {
      return { success: false, row: null, error: e.message };
    }
  });

export const d1InsertServerFn = createServerFn({ method: "POST" })
  .validator((d: { table: string; row: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      assertTable(data.table, true);
      const row = { ...data.row };
      if (!(row as any)["id"] && data.table !== "lesson_progress" && data.table !== "skill_lesson_progress") {
        (row as any).id = crypto.randomUUID();
      }
      const cols = Object.keys(row);
      const vals = cols.map((c) => boolToInt((row as any)[c]));
      const sql = `INSERT OR REPLACE INTO ${data.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")});`;
      const res = await d1Query(sql, vals as any[]);
      if (!res.success) return { success: false, error: res.error };
      return { success: true, id: (row as any).id || null };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const d1UpdateServerFn = createServerFn({ method: "POST" })
  .validator((d: { table: string; id: string; patch: Record<string, unknown>; idCol?: string }) => d)
  .handler(async ({ data }) => {
    try {
      assertTable(data.table, true);
      const col = data.idCol || "id";
      const keys = Object.keys(data.patch);
      if (!keys.length) return { success: true };
      const sql = `UPDATE ${data.table} SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE ${col} = ?;`;
      // updated_at n'existe pas partout : fallback sans updated_at
      let res = await d1Query(sql, [...keys.map((k) => boolToInt((data.patch as any)[k])), data.id] as any[]);
      if (!res.success && res.error?.includes("no such column: updated_at")) {
        const sql2 = `UPDATE ${data.table} SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE ${col} = ?;`;
        res = await d1Query(sql2, [...keys.map((k) => boolToInt((data.patch as any)[k])), data.id] as any[]);
      }
      return { success: res.success, error: res.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const d1DeleteServerFn = createServerFn({ method: "POST" })
  .validator((d: { table: string; id: string; idCol?: string }) => d)
  .handler(async ({ data }) => {
    try {
      assertTable(data.table, true);
      const col = data.idCol || "id";
      const res = await d1Query(`DELETE FROM ${data.table} WHERE ${col} = ?;`, [data.id]);
      return { success: res.success, error: res.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const d1QueryServerFn = createServerFn({ method: "POST" })
  .validator((d: { sql: string; params?: unknown[] }) => d)
  .handler(async ({ data }) => {
    try {
      const s = data.sql.trim().toUpperCase();
      if (!s.startsWith("SELECT")) return { success: false, rows: [], error: "Lecture seule (SELECT)." };
      const res = await d1Query(data.sql, (data.params || []) as any[]);
      return { success: res.success, rows: res.results || [], error: res.error };
    } catch (e: any) {
      return { success: false, rows: [], error: e.message };
    }
  });
