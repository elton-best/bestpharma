import { createServerFn } from "@tanstack/react-start";
import { d1Query } from "./cloudflare-d1";

export const toggleLessonProgressServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string; lessonId: string; done: boolean }) => d)
  .handler(async ({ data }) => {
    try {
      if (data.done) {
        await d1Query("DELETE FROM lesson_progress WHERE user_id = ? AND lesson_id = ?;", [data.userId, data.lessonId]);
      } else {
        await d1Query("INSERT OR REPLACE INTO lesson_progress (user_id, lesson_id, completed_at) VALUES (?, ?, datetime('now'));", [
          data.userId,
          data.lessonId,
        ]);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const toggleSkillProgressServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string; lessonId: string; done: boolean }) => d)
  .handler(async ({ data }) => {
    try {
      if (data.done) {
        await d1Query("DELETE FROM skill_lesson_progress WHERE user_id = ? AND lesson_id = ?;", [data.userId, data.lessonId]);
      } else {
        await d1Query("INSERT OR REPLACE INTO skill_lesson_progress (user_id, lesson_id, completed_at) VALUES (?, ?, datetime('now'));", [
          data.userId,
          data.lessonId,
        ]);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
