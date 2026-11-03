import "@/lib/ipv4";
import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { z } from "zod";
import { modules as staticModules, type Module } from "@/data/course";
import { chatWithTools } from "@/lib/agent-tools";
import { d1Query } from "./cloudflare-d1";

import { PLATFORM_GUARDRAIL_PROMPT, cleanApiKey } from "@/lib/ai-guardrail";

const Input = z.object({
  lessonId: z.string().min(1).max(100),
  question: z.string().trim().min(2).max(100000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(30000) }))
    .max(16)
    .default([]),
  model: z
    .string()
    .default("openai/gpt-oss-120b"),
  userId: z.string().min(1).max(100).optional(),
});

/** Charge le cours publié depuis D1 (sans Supabase), fallback sur le contenu statique. */
async function loadCourseD1(): Promise<Module[]> {
  try {
    const [c, m, l] = await Promise.all([
      d1Query<any>("SELECT id, position FROM courses WHERE published = 1 ORDER BY position;"),
      d1Query<any>(
        "SELECT id, course_id, step, title, free, position FROM course_modules WHERE published = 1 ORDER BY position;"
      ),
      d1Query<any>(
        "SELECT id, module_id, title, body, task, minutes FROM lessons WHERE published = 1 ORDER BY position;"
      ),
    ]);
    const courses = c.results || [];
    if (!courses.length) return staticModules;
    const order = new Map<string, number>(courses.map((x: any, i: number) => [x.id, i]));
    const mods = ((m.results || []) as any[])
      .filter((x) => order.has(x.course_id))
      .sort(
        (a, b) =>
          (order.get(a.course_id) ?? 0) - (order.get(b.course_id) ?? 0) ||
          (a.position ?? 0) - (b.position ?? 0)
      )
      .map((x) => ({
        id: x.id,
        step: x.step,
        title: x.title,
        free: x.free === 1 || x.free === true,
        lessons: ((l.results || []) as any[])
          .filter((y) => y.module_id === x.id)
          .map((y) => ({
            id: y.id,
            title: y.title,
            minutes: y.minutes ?? 10,
            body: typeof y.body === "string" ? y.body.split(/\n{2,}/).filter(Boolean) : [],
            task: y.task || "",
          })),
      }));
    return mods.length ? (mods as Module[]) : staticModules;
  } catch {
    return staticModules;
  }
}

export const askLesson = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    // Clé dédiée pour l'assistant de leçons / cours
    const rawKey = process.env["AI_KEY_LESSON"] || process.env["GROQ_API_KEY"] || process.env["AI_API_KEY"];
    const key = cleanApiKey(rawKey);
    if (!key) {
      console.error("askLesson: clé IA manquante (AI_KEY_LESSON / GROQ_API_KEY)");
      return {
        error: "L’assistant de cours est momentanément indisponible (clé API non configurée).",
        text: "",
        toolTrace: [],
      };
    }
    const effectiveUserId = data.userId ?? null;
    if (effectiveUserId) {
      try {
        const chk = await d1Query("SELECT id FROM users WHERE id = ? LIMIT 1;", [effectiveUserId]);
        if (chk.success && Array.isArray(chk.results) && chk.results.length === 0) {
          return { error: "Session invalide. Veuillez vous reconnecter.", text: "", toolTrace: [] };
        }
      } catch {}
    }
    // Code lessons are the source of truth. Resolving them first avoids three
    // D1 requests and still works when the database catalogue is only partially seeded.
    let mods = staticModules;
    let mod = staticModules.find((item) =>
      item.lessons.some((itemLesson) => itemLesson.id === data.lessonId),
    );
    let lesson = mod?.lessons.find((itemLesson) => itemLesson.id === data.lessonId);

    // Lessons created from the admin are not in the static catalogue.
    if (!mod || !lesson) {
      mods = await loadCourseD1();
      mod = mods.find((item) => item.lessons.some((itemLesson) => itemLesson.id === data.lessonId));
      lesson = mod?.lessons.find((itemLesson) => itemLesson.id === data.lessonId);
    }
    if (!mod || !lesson) {
      return {
        error: "Cette leçon n’est pas encore disponible pour le coach. Actualise la page puis réessaie.",
        text: "",
        toolTrace: [],
      };
    }

    const outline = mods
      .map((m) => `- ${m.step} — ${m.title} : ${m.lessons.map((l) => l.title).join(", ")}`)
      .join("\n");
    const hasDoc =
      data.question.includes("[DOCUMENT JOINT") || data.question.includes("Contenu extrait");

    const system = `Tu es Coach AIFAC, mentor expert d'une formation qui apprend aux développeurs à livrer avec des agents IA (boucle Spec → Plan → Build → Review → QA → Deliver).
${
  hasDoc
    ? `L'apprenant te fournit un DOCUMENT JOINT (capture OCR, extrait de code source, document ou PDF). TON OBJECTIF PRIORITAIRE EST D'ANALYSER CE DOCUMENT EN PROFONDEUR :
- Examine le code, la spec ou le texte fourni ligne par ligne ou bloc par bloc.
- Identifie avec précision les forces, les faiblesses, les incohérences ou les bugs.
- Applique les principes de la leçon actuelle au document fourni et donne des blocs de code corrigés ou des plans d'action prêts à l'emploi.
- Fais référence directe aux éléments du document soumis.`
    : `Réponds à la question de l'apprenant en t'appuyant d'abord sur le contenu de la leçon ci-dessous. Cite la leçon ou le module quand c'est utile. Si la réponse ne figure pas dans la formation, dis-le brièvement puis donne une piste utile.`
}

Règles de style strictes :
- Toujours en français, tutoiement professionnel, clair, technique et percutant.
- INTERDICTION ABSOLUE D'UTILISER DES EMOJIS OU DES STICKERS (aucun emoji comme 👉, 🚀, 💡, 🔥, etc.).
- Structure la réponse avec des points clés en gras.
- Fournis des exemples de code clairs si pertinent.
- Termine par une section "Action concrète à réaliser :" avec une tâche pratique immédiate.

LEÇON EN COURS — module ${mod.step} « ${mod.title} », leçon « ${lesson.title} » (${lesson.minutes} min)
Contenu :
${lesson.body.join("\n\n").slice(0, 12000)}
Exercice « À faire » : ${lesson.task || "aucun"}

PLAN DE LA FORMATION :
${outline}

Outils disponibles (à utiliser quand c'est pertinent) : search_skills (registre des skills — cherche avant de citer un skill de mémoire), get_skill_content (cite la méthode exacte), fetch_url (lis toute URL collée par l'apprenant avant de répondre).

${PLATFORM_GUARDRAIL_PROMPT}`;

    const effectiveModel = data.model && !data.model.includes("llama-3") ? data.model : "openai/gpt-oss-120b";

    const r = await chatWithTools({
      key,
      model: effectiveModel,
      system,
      messages: [...data.history, { role: "user", content: data.question }],
      temperature: 0.5,
      maxTokens: 2500,
      timeoutMs: 35000,
    });
    if (!r.ok) {
      if (r.reason === "rate_limited")
        return {
          error: "Trop de questions en peu de temps. Réessaie dans une minute.",
          text: "",
          toolTrace: r.toolTrace,
        };
      return {
        error: "L'assistant est indisponible pour le moment.",
        text: "",
        toolTrace: r.toolTrace,
      };
    }
    const text = r.text;
    const toolTrace = r.toolTrace;

    if (!text) return { error: "Réponse vide, reformule ta question.", text: "", toolTrace };
    if (effectiveUserId) {
      await d1Query("INSERT INTO coach_questions (id, user_id, source, lesson_id, lesson_title, question, answer) VALUES (?, ?, ?, ?, ?, ?, ?);", [
        crypto.randomUUID(),
        effectiveUserId,
        "lesson",
        lesson.id,
        lesson.title,
        data.question,
        text,
      ]);
    }
    return { error: "", text, toolTrace };
  });
