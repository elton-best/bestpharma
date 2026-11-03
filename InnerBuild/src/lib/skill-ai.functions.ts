import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { z } from "zod";
import { chatWithTools } from "@/lib/agent-tools";
import { d1Query } from "./cloudflare-d1";

import { PLATFORM_GUARDRAIL_PROMPT, cleanApiKey } from "@/lib/ai-guardrail";

// Agent live d'un skill : lit le SKILL.md (fourni depuis le code) et produit
// le livrable en direct, avec de VRAIS appels d'outils (voir agent-tools.ts).
const Input = z.object({
  skillId: z.string().min(1).max(100),
  skillName: z.string().min(1).max(200),
  skillMd: z.string().trim().min(10).max(30000),
  question: z.string().trim().min(2).max(20000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(15000) }))
    .max(12)
    .default([]),
  model: z
    .string()
    .default("openai/gpt-oss-120b"),
  userId: z.string().min(1).max(100).optional(),
});

export const askSkill = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    // Clé dédiée pour l'orchestrateur de compétences & Skill Lab
    const rawKey =
      process.env["AI_KEY_SKILLS"] ||
      process.env["GROQ_API_KEY"] ||
      process.env["AI_API_KEY"] ||
      process.env["OPENAI_API_KEY"];
    const key = cleanApiKey(rawKey);
    if (!key) return { error: "L'agent des skills n'est pas configuré (clé AI_KEY_SKILLS / GROQ_API_KEY manquante).", text: "", toolTrace: [] };

    const effectiveUserId = data.userId ?? null;
    if (effectiveUserId) {
      try {
        const chk = await d1Query("SELECT id FROM users WHERE id = ? LIMIT 1;", [effectiveUserId]);
        if (chk.success && Array.isArray(chk.results) && chk.results.length === 0) {
          return { error: "Session invalide. Veuillez vous reconnecter.", text: "", toolTrace: [] };
        }
      } catch {}
    }

    const system = `Tu es l'agent expert du skill « ${data.skillName} » (id: ${data.skillId}). Tu appliques STRICTEMENT la méthode décrite dans le SKILL.md ci-dessous : mêmes étapes, mêmes garde-fous, mêmes critères de validation. Tu ne dois jamais improviser une autre méthode.

Tu disposes d'outils que tu DOIS utiliser quand c'est pertinent :
- search_skills : dès que l'apprenant mentionne un autre skill ou un besoin que tu ne connais pas — cherche avant de répondre.
- get_skill_content : pour citer la méthode exacte d'un skill (y compris celui-ci si besoin) au lieu de paraphraser de mémoire.
- fetch_url : quand l'apprenant colle un lien, lis la page avant de répondre.

Règles de production :
- Toujours en français, tutoiement professionnel, clair et technique.
- INTERDICTION ABSOLUE D'EMOJIS.
- Produis directement le livrable demandé en Markdown structuré (titres, listes, tableaux, blocs de code quand pertinent).
- Si la demande de l'apprenant est trop vague pour appliquer la méthode, pose UNE question de clarification ciblée au lieu de deviner.
- Termine par une courte note "Vérification :" qui explique en 2-3 lignes comment l'apprenant peut contrôler que le livrable respecte la méthode du skill.

SKILL.md de référence :
${data.skillMd.slice(0, 12000)}

${PLATFORM_GUARDRAIL_PROMPT}`;

    const effectiveModel = data.model && !data.model.includes("llama-3") ? data.model : "openai/gpt-oss-120b";

    const r = await chatWithTools({
      key,
      model: effectiveModel,
      system,
      messages: [...data.history, { role: "user", content: data.question }],
      temperature: 0.4,
      maxTokens: 3500,
    });

    if (!r.ok) {
      if (r.reason === "rate_limited")
        return {
          error: "Trop de demandes en peu de temps. Réessaie dans une minute.",
          text: "",
          toolTrace: r.toolTrace,
        };
      return {
        error: "Connexion à l'agent impossible. Réessaie dans quelques instants.",
        text: "",
        toolTrace: r.toolTrace,
      };
    }
    if (!r.text)
      return { error: "Réponse vide, reformule ta demande.", text: "", toolTrace: r.toolTrace };
    if (effectiveUserId) {
      await d1Query("INSERT INTO coach_questions (id, user_id, source, lesson_id, lesson_title, question, answer) VALUES (?, ?, ?, ?, ?, ?, ?);", [
        crypto.randomUUID(),
        effectiveUserId,
        "skill",
        data.skillId,
        data.skillName,
        data.question,
        r.text,
      ]);
    }
    return { error: "", text: r.text, toolTrace: r.toolTrace };
  });
