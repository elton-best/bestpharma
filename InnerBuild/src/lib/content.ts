import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/heroui-toast";
import { uploadToR2ServerFn, deleteFromR2ServerFn } from "./storage.functions";
import { d1DeleteServerFn, d1InsertServerFn, d1ListServerFn, d1QueryServerFn, d1UpdateServerFn } from "./d1-data.functions";

export const R2_PUBLIC_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.["VITE_R2_PUBLIC_URL"]) ||
  (typeof process !== "undefined" ? (process.env as any)?.["CLOUDFLARE_R2_PUBLIC_URL"] : "") ||
  "";

export type CCourse = { id: string; title: string; description: string; image_url: string; pdf_url: string; position: number; published: boolean };
export type CModule = { id: string; course_id: string; step: string; title: string; free: boolean; position: number; published: boolean };
export type CLesson = { id: string; module_id: string; title: string; kind: string; body: string; task: string; file_path: string; image_path: string; minutes: number; position: number; published: boolean };
export type CQuiz = { id: string; module_id: string; question: string; choices: string[]; correct: number; answers: number[]; allow_multiple: boolean; explanation: string; points: number; position: number; published: boolean };
export type CExercise = {
  id: string;
  course_id?: string | null;
  module_id?: string | null;
  lesson_id?: string | null;
  title: string;
  instructions: string;
  type: "projet" | "qcm" | "question_reponse";
  points: number;
  options?: { choice: string; correct?: boolean }[] | null;
  solution_criteria?: string;
  position: number;
  published: boolean;
};
export type CCourseExam = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  passing_score: number;
  questions: {
    id: string;
    question: string;
    type: "single" | "multiple" | "open";
    choices?: string[];
    correct?: number | number[] | string;
    explanation?: string;
    points: number;
  }[];
  created_at: string;
  updated_at: string;
};
export type Table = "courses" | "course_modules" | "lessons" | "quiz_questions" | "exercises" | "course_exams";

function toBool(v: unknown) {
  return v === 1 || v === true;
}

function norm<T>(rows: any[]): T[] {
  return rows.map((r) => {
    const o: any = { ...r };
    for (const k of ["published", "free", "allow_multiple"]) if (k in o) o[k] = toBool(o[k]);
    if (typeof o.choices === "string") { try { o.choices = JSON.parse(o.choices); } catch { o.choices = []; } }
    if (typeof o.answers === "string") { try { o.answers = JSON.parse(o.answers); } catch { o.answers = []; } }
    if (typeof o.questions === "string") { try { o.questions = JSON.parse(o.questions); } catch { o.questions = []; } }
    if (typeof o.options === "string") { try { o.options = JSON.parse(o.options); } catch { o.options = null; } }
    return o;
  }) as T[];
}

function denorm(row: Record<string, unknown>) {
  const o: Record<string, unknown> = { ...row };
  for (const k of ["published", "free", "allow_multiple"]) if (k in o && typeof o[k] === "boolean") o[k] = o[k] ? 1 : 0;
  for (const k of ["choices", "answers", "questions", "options"]) if (k in o && typeof o[k] !== "string" && o[k] != null) o[k] = JSON.stringify(o[k]);
  return o;
}

async function list<T>(table: Table, filter?: [string, string | string[]]) {
  try {
    if (filter && Array.isArray(filter[1])) {
      const ids = filter[1] as string[];
      if (!ids.length) return [] as T[];
      const placeholders = ids.map(() => "?").join(",");
      const res = await d1QueryServerFn({
        data: {
          sql: `SELECT * FROM ${table} WHERE ${filter[0]} IN (${placeholders}) ORDER BY position;`,
          params: ids,
        },
      });
      if (!res.success) {
        console.warn(`[Content Notice] D1 query returned error for ${table}:`, res.error);
        return [] as T[];
      }
      return norm<T>((res.rows || []) as any[]);
    }
    const res = await d1ListServerFn({
      data: {
        table,
        where: filter ? ({ [filter[0]]: filter[1] } as any) : undefined,
        orderBy: table === "course_exams" ? "created_at" : "position",
        orderDir: "ASC",
        limit: 500,
      },
    });
    if (!res.success) {
      console.warn(`[Content Notice] D1 list returned error for ${table}:`, res.error);
      return [] as T[];
    }
    return norm<T>((res.rows || []) as any[]);
  } catch (err) {
    console.warn(`[Content Error] list() exception for ${table}:`, err);
    return [] as T[];
  }
}

export function useCourses() {
  return useQuery({ queryKey: ["content", "courses"], queryFn: () => list<CCourse>("courses") });
}

export function useCourseContent(courseId: string) {
  return useQuery({
    queryKey: ["content", "course", courseId],
    queryFn: async () => {
      const course = (await list<CCourse>("courses", ["id", courseId]))[0];
      const modules = await list<CModule>("course_modules", ["course_id", courseId]);
      const ids = modules.map((m) => m.id);
      const lessons = ids.length ? await list<CLesson>("lessons", ["module_id", ids]) : [];
      const quiz = ids.length ? await list<CQuiz>("quiz_questions", ["module_id", ids]) : [];

      // Exercices liés au cours ou aux modules (D1)
      let exercises: CExercise[] = [];
      if (ids.length) {
        const placeholders = ids.map(() => "?").join(",");
        const res = await d1QueryServerFn({
          data: { sql: `SELECT * FROM exercises WHERE course_id = ? OR module_id IN (${placeholders}) ORDER BY position;`, params: [courseId, ...ids] },
        });
        exercises = norm<CExercise>((res.rows || []) as any[]);
      } else {
        exercises = await list<CExercise>("exercises", ["course_id", courseId]);
      }

      const exams = await list<CCourseExam>("course_exams", ["course_id", courseId]);
      const exam = exams[0] || null;

      return { course, modules, lessons, quiz, exercises, exam };
    },
  });
}

export async function optimizeImageToDataUrl(file: File, maxDim = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      };
      img.src = url;
    } catch {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    }
  });
}

export function useContentActions() {
  const qc = useQueryClient();
  const done = async () => { await qc.invalidateQueries({ queryKey: ["content"] }); try { await loadCourseFromD1(); } catch {} };
  const fail = (e: { message: string }) => { toast.error("Échec : " + e.message); return false; };

  async function insert(table: Table, row: Record<string, unknown>) {
    const res = await d1InsertServerFn({ data: { table, row: denorm(row) } });
    if (!res.success) return fail({ message: res.error || "D1" });
    toast.success("Créé avec succès");
    await done();
    return true;
  }

  async function update(table: Table, id: string, patch: Record<string, unknown>, msg = "Enregistré") {
    const res = await d1UpdateServerFn({ data: { table, id, patch: denorm(patch) } });
    if (!res.success) return fail({ message: res.error || "D1" });

    if (msg) toast.success(msg);
    await done();
    return true;
  }
  /** Deletes a row; `files` are R2 keys removed with it. */
  async function remove(table: Table, id: string, title: string, files: string[] = []) {
    let all = files;
    if (table === "courses" || table === "course_modules") {
      const modIds = table === "courses"
        ? ((await d1ListServerFn({ data: { table: "course_modules", where: { course_id: id }, limit: 200 } })).rows || []).map((m: any) => m.id)
        : [id];
      if (modIds.length) {
        const placeholders = modIds.map(() => "?").join(",");
        const res = await d1QueryServerFn({ data: { sql: `SELECT file_path, image_path FROM lessons WHERE module_id IN (${placeholders});`, params: modIds } });
        all = [...files, ...((res.rows || []) as any[]).flatMap((l) => [l.file_path, l.image_path])];
      }
    }
    const stored = all.filter((f) => f && !/^https?:/.test(f));
    const desc = `Cette action est définitive${table === "courses" || table === "course_modules" ? " et supprime tout son contenu" : ""}${stored.length ? ` ainsi que ${stored.length > 1 ? "ses fichiers" : "son fichier"}` : ""}.`;

    const toastId = toast(`Supprimer « ${title} » ?`, {
      description: desc,
      variant: "danger",
      timeout: 10000,
      actionProps: {
        children: "Confirmer la suppression",
        variant: "danger",
        onClick: async () => {
          toast.close(toastId);
          const res = await d1DeleteServerFn({ data: { table, id } });
          if (!res.success) { fail({ message: res.error || "D1" }); return; }
          for (const key of stored) {
            try { await deleteFromR2ServerFn({ data: { key: key.replace(/^r2:\/?/, "") } }); } catch {}
          }
          toast.success(stored.length ? "Supprimé avec ses fichiers" : "Supprimé");
          await done();
        },
      },
    });
    return true;
  }
  /** Swap position with neighbour in an ordered list. */
  async function move<T extends { id: string }>(table: Table, items: T[], index: number, dir: -1 | 1) {
    const j = index + dir; if (j < 0 || j >= items.length) return;
    const next = [...items]; [next[index], next[j]] = [next[j]!, next[index]!];
    for (let i = 0; i < next.length; i++) {
      await d1UpdateServerFn({ data: { table, id: next[i]!.id, patch: { position: i } } });
    }
    await done();
  }

  async function upload(file: File, type: "pdf" | "image" = "pdf") {
    if (type === "pdf" && file.type !== "application/pdf") { toast.error("Seuls les fichiers PDF sont acceptés."); return null; }
    if (type === "image" && !file.type.startsWith("image/")) { toast.error("Choisis une image (JPG, PNG, WebP)."); return null; }
    if (file.size > 25 * 1024 * 1024) { toast.error("Fichier trop lourd (25 Mo maximum)."); return null; }
    const path = `${type}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;

    // Cloudflare R2 avec fallback résilient automatique si R2 non activé
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i] ?? 0);
      }
      const base64 = btoa(binary);

      const r2Res = await uploadToR2ServerFn({
        data: {
          key: path,
          base64,
          contentType: file.type || (type === "pdf" ? "application/pdf" : "image/jpeg"),
        },
      });

      if (r2Res && r2Res.success) {
        toast.success(type === "pdf" ? "PDF hébergé sur Cloudflare R2 !" : "Image hébergée sur Cloudflare R2 !");
        return r2Res.url || (R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${path}` : `r2:${path}`);
      }

      // Fallback résilient si Cloudflare R2 n'est pas encore activé sur le Dashboard
      if (type === "image") {
        const dataUrl = await optimizeImageToDataUrl(file);
        if (dataUrl) {
          toast.success("Image optimisée et enregistrée avec succès (mode résilient)");
          return dataUrl;
        }
      }

      toast.error("Envoi R2 impossible : " + (r2Res?.error || "erreur"));
      return null;
    } catch (e: any) {
      if (type === "image") {
        const dataUrl = await optimizeImageToDataUrl(file);
        if (dataUrl) {
          toast.success("Image optimisée et enregistrée avec succès (mode résilient)");
          return dataUrl;
        }
      }
      toast.error("Envoi R2 impossible : " + (e?.message || "erreur"));
      return null;
    }
  }
  return { insert, update, remove, move, upload };
}

export async function loadCourseFromD1() {
  // Les cours vivent dans le CODE (source de vérité, cf. src/data/course.ts + socle.ts).
  // La DB ne suit que la progression ; seuls les modules créés par l'admin en DB
  // (ids absents du code) sont ajoutés en complément. Le code gagne toujours.
  try {
    const mod = await import("@/data/course");
    const codeModules = (mod as any).modules as any[];
    const codeIds = new Set(codeModules.map((x) => x.id));
    const [c, m, l, q, ex] = await Promise.all([
      list<CCourse>("courses"),
      list<CModule>("course_modules"),
      list<CLesson>("lessons"),
      list<CQuiz>("quiz_questions"),
      list<CExercise>("exercises"),
    ]);
    const pubCourses = c.filter((x) => x.published);
    const order = new Map(pubCourses.map((x, i) => [x.id, i]));
    const extra = m
      .filter((x) => x.published && order.has(x.course_id) && !codeIds.has(x.id))
      .sort((a, b) => (order.get(a.course_id)! - order.get(b.course_id)!) || a.position - b.position)
      .map((x) => ({
        id: x.id,
        step: x.step,
        title: x.title,
        free: x.free,
        lessons: l
          .filter((y) => y.module_id === x.id && y.published)
          .map((y) => ({ id: y.id, title: y.title, minutes: y.minutes, body: y.body.split(/\n{2,}/).filter(Boolean), task: y.task, kind: y.kind, file_path: y.file_path, image_path: y.image_path })),
        quiz: q.filter((y) => y.module_id === x.id && y.published).map((y) => ({ id: y.id, question: y.question, choices: y.choices, correct: y.correct, points: y.points, answers: y.answers, allow_multiple: y.allow_multiple, explanation: y.explanation })),
        exercises: ex.filter((y) => y.module_id === x.id && y.published).map((y) => ({ id: y.id, title: y.title, instructions: y.instructions })),
      }));
    if (extra.length) {
      (mod as any).modules = [...codeModules, ...extra];
      (mod as any).allLessons = (mod as any).modules.flatMap((mm: any) => mm.lessons.map((ll: any) => ({ ...ll, module: mm })));
      (mod as any).totalLessons = (mod as any).allLessons.length || 1;
    }
    return (mod as any).modules;
  } catch {
    // Keep navigation responsive if remote course synchronization is unavailable.
    return [];
  }
}

export function useAllContent() {
  return useQuery({
    queryKey: ["content", "all"],
    queryFn: async () => {
      const [courses, modules, lessons, quiz, exercises] = await Promise.all([
        list<CCourse>("courses"), list<CModule>("course_modules"), list<CLesson>("lessons"), list<CQuiz>("quiz_questions"), list<CExercise>("exercises"),
      ]);
      return { courses, modules, lessons, quiz, exercises };
    },
  });
}

export async function openPdf(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    window.open(path, "_blank", "noopener");
    return;
  }
  if (R2_PUBLIC_BASE_URL) {
    const cleanKey = path.replace(/^r2:\/?/, "");
    window.open(`${R2_PUBLIC_BASE_URL}/${cleanKey}`, "_blank", "noopener");
    return;
  }
  toast.error("Document indisponible (R2 non configuré)");
}

/** Signed URL for a stored file (R2 CDN direct). */
export function useFileUrl(path?: string) {
  return useQuery({
    queryKey: ["file-url", path], enabled: !!path, staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (!path) return "";
      if (/^https?:/.test(path) || path.startsWith("data:") || path.startsWith("blob:")) return path;
      const cleanKey = path.replace(/^r2:\/?/, "");
      if (R2_PUBLIC_BASE_URL) return `${R2_PUBLIC_BASE_URL}/${cleanKey}`;
      return "";
    },
  });
}
