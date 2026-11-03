import "@/lib/ipv4";
import { fetchWithRetry } from "@/lib/ipv4";
import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { z } from "zod";
import { modules as staticModules, type Module } from "@/data/course";
import { chatWithTools } from "@/lib/agent-tools";
import { d1Query } from "./cloudflare-d1";

import { PLATFORM_GUARDRAIL_PROMPT, cleanApiKey } from "@/lib/ai-guardrail";

const Input = z.object({
  mode: z.enum(["explain", "next", "feedback", "coach", "analyze", "train", "practice"]),
  messages: z
    .array(
      z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(100000) }),
    )
    .min(1)
    .max(40),
  context: z.string().max(30000).default(""),
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

const courseText = (modules: Module[]) =>
  modules
    .map(
      (m) =>
        `## Étape ${m.step} — ${m.title}\n` +
        m.lessons
          .map(
            (l) =>
              `- Leçon « ${l.title} » (${l.minutes} min) : ${l.body.join(" ")} Exercice : ${l.task}`,
          )
          .join("\n"),
    )
    .join("\n\n");

const system = (
  COURSE: string,
) => `Tu es Coach AIFAC, le mentor d'une formation qui apprend aux développeurs à livrer avec des agents IA grâce à la boucle Spec → Plan → Build → Review → QA → Deliver et au registre de 212 skills ai-factory (45 effets 3D). Prix : 4 000 F CFA, une fois.

Voici l'intégralité du cours, que tu connais par cœur et que tu cites précisément (module + leçon) quand c'est pertinent :
${COURSE}

Style de réponse (obligatoire) :
- Toujours en français, tutoiement, langue naturelle et professionnelle — jamais de stickers, jamais d'emojis d'illustrations puériles.
- N'inclus jamais d'en-têtes répétitifs comme "**Module Spec**" ou de rappels génériques de titres de modules au début de tes réponses. Réponds directement au sujet demandé avec pertinence et clarté.
- Si l'apprenant transmet un DOCUMENT JOINT (capture OCR, extrait de code, fichier ou PDF), analyse en priorité absolue le contenu de ce document, cite les passages pertinents, identifie les forces et anomalies, et propose les solutions techniques concrètes.
- Ouvre par une phrase d'accroche directe, puis structure le reste en **points** : listes à puces ou numérotées, avec le mot clé en **gras** au début de chaque point.
- Sépare les idées en courts blocs (2-3 points par bloc). Blocs de code si utile.
- Termine par une recommandation concrète.`;

const MODES = {
  explain: "Mission : explique le concept simplement avec un exemple concret tiré du cours.",
  next: "Mission : propose 3 prochaines étapes concrètes et ordonnées selon la progression de l'apprenant, en nommant les leçons exactes.",
  feedback:
    "Mission : fais une revue comme un correcteur : ce qui est solide, ce qui bloque, puis les actions précises pour atteindre « Done ».",
  coach:
    "Mission : tu es disponible pendant la formation. Réponds à la question en tenant compte de la page où se trouve l'apprenant.",
  analyze:
    "Mission : analyse la progression fournie (leçons, rythme, rendus). Donne un diagnostic honnête en 2 phrases, 2 points forts, 2 risques, puis un plan pour les 7 prochains jours.",
  train:
    "Mission : simulateur d'entraînement AIFAC. Analyse la réponse de l'apprenant sur le cours demandé, attribue une note sur 10 avec des critères précis, explique la solution idéale, et propose la prochaine question si demandé.",
  practice: `Mission : Auditeur d'ingénierie senior en pratique logicielle.
Tu dois analyser minutieusement les fichiers rédigés par l'apprenant dans son arborescence de projet.
Règles strictes :
- ZÉRO sticker, ZÉRO emoji (ne jamais mettre de ✅, ❌, ⚠️, 🚀).
- Ne génère JAMAIS de puces comme "**✅ Mot-clé** –" ou d'astérisques combinés à des symboles.
- Rédige un audit structuré, élégant et constructif avec 4 sections markdown '###' :
  ### 1. Synthèse du travail fourni
  Analyse objective du contenu réel des fichiers soumis.
  ### 2. Points forts & respect des conventions
  Ce qui est déjà précis, atomique ou conforme aux bonnes pratiques AIFAC.
  ### 3. Lacunes & zones de flou à corriger
  Critères non testables, oublis de cas d'erreurs, granularité inadéquate ou dépendances manquantes.
  ### 4. Propositions de correctifs (Exemples prêts à l'emploi)
  Exemples précis de réécriture pour SPEC.md ou PLAN.md directement exploitables.`,
};

export const askTutor = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const isPractice = data.mode === "practice";
    const effectiveUserId = data.userId ?? null;
    if (effectiveUserId) {
      try {
        const chk = await d1Query("SELECT id FROM users WHERE id = ? LIMIT 1;", [effectiveUserId]);
        if (chk.success && Array.isArray(chk.results) && chk.results.length === 0) {
          return { error: "Session invalide. Veuillez vous reconnecter.", text: "", toolTrace: [] };
        }
      } catch {}
    }
    const baseSystem = system(courseText(await loadCourseD1()));
    const systemPrompt = isPractice
      ? `Tu es l'Ingénieur en Chef et Mentor AIFAC. Tu procèdes à la revue de code et d'architecture des ateliers d'apprenants. Ton style est technique, précis, franc, sans aucune décoration superflue ni emojis. Analyse le contenu réel fourni sans inventer de faux prérequis.\n\n${MODES.practice}\n\n${PLATFORM_GUARDRAIL_PROMPT}`
      : `${baseSystem}\n\n${MODES[data.mode]}\n\nContexte apprenant : ${data.context || "non fourni"}\n\n${PLATFORM_GUARDRAIL_PROMPT}`;

    // Clés indépendantes par instance : AI_KEY_PRACTICE pour les ateliers/revues, AI_KEY_COACH pour le coach principal
    const rawKey = isPractice
      ? (process.env["AI_KEY_PRACTICE"] || process.env["GROQ_API_KEY"] || process.env["AI_API_KEY"])
      : (process.env["AI_KEY_COACH"] || process.env["GROQ_API_KEY"] || process.env["AI_API_KEY"]);
    const key = cleanApiKey(rawKey);

    if (!key) {
      console.error(`askTutor: clé IA manquante (${isPractice ? "AI_KEY_PRACTICE" : "AI_KEY_COACH"} / GROQ_API_KEY)`);
      return {
        error: "L’assistant IA est momentanément indisponible (clé API non configurée).",
        text: "",
        toolTrace: [],
      };
    }
    // Les modes train/practice exigent un format strict : pas d'outils.
    // Les autres modes bénéficient des vrais appels d'outils (registre skills, SKILL.md, lecture d'URL).
    const withTools = data.mode !== "train" && data.mode !== "practice";
    const toolGuidance = withTools
      ? `\n\nOutils disponibles (à utiliser quand c'est pertinent) : search_skills (registre des 219 skills — cherche avant de citer un skill de mémoire), get_skill_content (cite la méthode exacte d'un skill), fetch_url (lis toute URL collée par l'apprenant avant de répondre).`
      : "";
    try {
      let text: string;
      let toolTrace: { name: string; summary: string; ok: boolean; href?: string }[] = [];
      const effectiveModel = data.model && !data.model.includes("llama-3") ? data.model : "openai/gpt-oss-120b";

      if (withTools) {
        const r = await chatWithTools({
          key,
          model: effectiveModel,
          system: `${systemPrompt}\n\nContexte atelier : ${data.context || "non fourni"}${toolGuidance}`,
          messages: data.messages,
          temperature: 0.5,
          maxTokens: 2500,
        });
        if (!r.ok) {
          if (r.reason === "rate_limited")
            return {
              error: "Trop de questions en peu de temps. Réessaie dans une minute.",
              text: "",
              toolTrace: r.toolTrace,
            };
          return {
            error: "Le coach est indisponible pour le moment.",
            text: "",
            toolTrace: r.toolTrace,
          };
        }
        text = r.text;
        toolTrace = r.toolTrace;
      } else {
        let currentModel = effectiveModel;
        let res = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal: AbortSignal.timeout(35000),
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: currentModel,
            temperature: isPractice ? 0.3 : 0.5,
            max_tokens: isPractice ? 3200 : 2500,
            messages: [
              {
                role: "system",
                content: `${systemPrompt}\n\nContexte atelier : ${data.context || "non fourni"}`,
              },
              ...data.messages,
            ],
          }),
        });

        // Fallback transparent si rate limit sur le modèle 120B
        if (res.status === 429 && currentModel !== "openai/gpt-oss-20b") {
          currentModel = "openai/gpt-oss-20b";
          await new Promise((r) => setTimeout(r, 1200));
          res = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            signal: AbortSignal.timeout(35000),
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: currentModel,
              temperature: isPractice ? 0.3 : 0.5,
              max_tokens: isPractice ? 3200 : 2500,
              messages: [
                {
                  role: "system",
                  content: `${systemPrompt}\n\nContexte atelier : ${data.context || "non fourni"}`,
                },
                ...data.messages,
              ],
            }),
          });
        }

        if (res.status === 429)
          return {
            error: "Trop de questions en peu de temps. Réessaie dans une minute.",
            text: "",
            toolTrace,
          };
        if (!res.ok) {
          console.error("Groq", res.status, await res.text());
          return { error: "Le coach est indisponible pour le moment.", text: "", toolTrace };
        }
        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        text = (json.choices?.[0]?.message?.content ?? "").trim();
      }
      text = text.replace(
        /^\s*(\*\*)?(ce qu[’']on retient|en résumé|résumé)\s*:?(\*\*)?\s*:?\s*\n?/i,
        "",
      );
      if (text && data.mode !== "train" && data.mode !== "practice" && effectiveUserId) {
        const q = data.messages[data.messages.length - 1]!;
        if (
          q.role === "user" &&
          !q.content.startsWith("Génère 1 question") &&
          !q.content.includes("Format JSON strict")
        ) {
          let cleanQ = q.content;
          let docTitle = "";
          if (cleanQ.includes("[DOCUMENT JOINT ANALYSÉ :")) {
            const m = cleanQ.match(/\[DOCUMENT JOINT ANALYSÉ : ([^|]+) \|/);
            if (m) docTitle = m[1]?.trim() || "";
            const req = cleanQ.match(/Demande de l'apprenant : ([\s\S]+)$/);
            cleanQ = req && req[1] ? req[1].trim() : `Analyse du document : ${docTitle}`;
          }
          try {
            await d1Query("INSERT INTO coach_questions (id, user_id, source, question, lesson_title, answer) VALUES (?, ?, ?, ?, ?, ?);", [
              crypto.randomUUID(),
              effectiveUserId,
              data.mode,
              cleanQ.slice(0, 4000),
              docTitle || "",
              text,
            ]);
          } catch {}
        }
      }
      return { error: text ? "" : "Réponse vide, reformule ta question.", text, toolTrace };
    } catch (e: any) {
      console.error("askTutor error", e);
      return {
        error:
          "Connexion au coach impossible (délai réseau dépassé). Réessaie dans quelques instants.",
        text: "",
        toolTrace: [],
      };
    }
  });

export const deleteCoachHistory = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ ids: z.array(z.string()) }).parse(d))
  .handler(async ({ data }) => {
    if (!data.ids || data.ids.length === 0) return { success: true };
    try {
      for (const id of data.ids.slice(0, 200)) {
        await d1Query("DELETE FROM coach_questions WHERE id = ?;", [id]);
      }
      return { success: true };
    } catch (e: any) {
      console.error("deleteCoachHistory exception", e);
      return { success: false, error: e.message };
    }
  });

export const clearCoachModeHistory = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ mode: z.string().optional(), all: z.boolean().optional(), userId: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    try {
      if (data.userId && !data.all && data.mode) {
        await d1Query("DELETE FROM coach_questions WHERE user_id = ? AND source = ?;", [data.userId, data.mode]);
      } else if (data.userId) {
        await d1Query("DELETE FROM coach_questions WHERE user_id = ?;", [data.userId]);
      } else if (!data.all && data.mode) {
        await d1Query("DELETE FROM coach_questions WHERE source = ?;", [data.mode]);
      } else {
        await d1Query("DELETE FROM coach_questions WHERE 1=1;", []);
      }
      return { success: true };
    } catch (e: any) {
      console.error("clearCoachModeHistory exception", e);
      return { success: false, error: e.message };
    }
  });
