import { createServerFn } from "@tanstack/react-start";
import { d1Query } from "./cloudflare-d1";

/**
 * Server Function: Get user profile from Cloudflare D1
 */
export const getProfileFromD1ServerFn = createServerFn({ method: "GET" })
  .validator((data: { email?: string; userId?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const sql = data.userId
        ? "SELECT * FROM profiles WHERE id = ? LIMIT 1;"
        : "SELECT * FROM profiles WHERE email = ? LIMIT 1;";
      const param = data.userId || data.email?.toLowerCase();
      const res = await d1Query(sql, [param]);
      return { success: true, profile: res.results?.[0] || null };
    } catch (err: any) {
      return { success: false, profile: null, error: err.message };
    }
  });

/**
 * Server Function: Save skill progress directly into Cloudflare D1
 */
export const saveSkillProgressToD1ServerFn = createServerFn({ method: "POST" })
  .validator((data: {
    userId: string;
    skillId: string;
    status: "in_progress" | "completed";
    score?: number;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const id = `${data.userId}_${data.skillId}`;
      const sql = `
        INSERT OR REPLACE INTO skill_progress (id, user_id, skill_id, status, score, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'));
      `;
      const res = await d1Query(sql, [
        id,
        data.userId,
        data.skillId,
        data.status,
        data.score ?? 0,
      ]);
      return { success: res.success, error: res.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

/**
 * Server Function: Record file metadata in Cloudflare D1
 */
export const recordFileMetadataInD1ServerFn = createServerFn({ method: "POST" })
  .validator((data: {
    userId?: string;
    r2Key: string;
    publicUrl: string;
    fileName: string;
    fileType: "pdf" | "image" | "code" | "other";
    sizeBytes: number;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const sql = `
        INSERT INTO file_metadata (id, user_id, r2_key, public_url, file_name, file_type, size_bytes)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `;
      const res = await d1Query(sql, [
        id,
        data.userId || null,
        data.r2Key,
        data.publicUrl,
        data.fileName,
        data.fileType,
        data.sizeBytes,
      ]);
      return { success: res.success, fileId: id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

/**
 * Server Function: Record challenge submission in Cloudflare D1
 */
export const recordChallengeSubmissionInD1ServerFn = createServerFn({ method: "POST" })
  .validator((data: {
    userId: string;
    challengeId: string;
    repoUrl?: string;
    demoUrl?: string;
    r2FileUrl?: string;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const sql = `
        INSERT INTO challenge_submissions (id, user_id, challenge_id, repo_url, demo_url, r2_file_url)
        VALUES (?, ?, ?, ?, ?, ?);
      `;
      const res = await d1Query(sql, [
        id,
        data.userId,
        data.challengeId,
        data.repoUrl || null,
        data.demoUrl || null,
        data.r2FileUrl || null,
      ]);
      return { success: res.success, submissionId: id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
