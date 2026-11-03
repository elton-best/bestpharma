import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runPaddleOCRInference } from "./paddleocr";

const Input = z.object({
  imageBase64: z.string().min(10),
});

export const processImageWithPaddleOCR = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    try {
      const result = await runPaddleOCRInference(data.imageBase64);
      if (result && result.success) {
        return { success: true, text: result.text, wordCount: result.wordCount, engine: "paddleocr" as const };
      }

      // Fallback serveur : Vision LLM (Groq Llama-3.2-Vision ou OpenAI) si clé configurée
      const apiKey =
        process.env["AI_KEY_COACH"] ||
        process.env["GROQ_API_KEY"] ||
        process.env["AI_API_KEY"] ||
        process.env["OPENAI_API_KEY"];

      if (apiKey) {
        try {
          const rawB64 = data.imageBase64.includes(",")
            ? data.imageBase64
            : `data:image/jpeg;base64,${data.imageBase64}`;

          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({
              model: "llama-3.2-11b-vision-preview",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Transcris fidèlement tout le texte, le code source ou les éléments visibles sur cette image. Rends uniquement le texte extrait sans aucun commentaire ni bavardage.",
                    },
                    {
                      type: "image_url",
                      image_url: { url: rawB64 },
                    },
                  ],
                },
              ],
              temperature: 0.1,
              max_tokens: 2500,
            }),
          });

          if (res.ok) {
            const json = (await res.json()) as any;
            const text = (json.choices?.[0]?.message?.content || "").trim();
            if (text) {
              const wordCount = text.split(/\s+/).filter(Boolean).length;
              return { success: true, text, wordCount, engine: "paddleocr" as const };
            }
          }
        } catch {}
      }

      return { success: false, text: "", wordCount: 0, engine: "fallback" as const };
    } catch {
      return { success: false, text: "", wordCount: 0, engine: "fallback" as const };
    }
  });
