import { fetchWithRetry } from "@/lib/ipv4";
import dns from "node:dns/promises";
import net from "node:net";
import rawSkills from "@/data/skills-data.json";

// Outils partagés des agents IA (coach, leçons, lab des skills) :
// search_skills (registre local), get_skill_content (SKILL.md exact),
// fetch_url (lecture d'une doc collée, protégée anti-SSRF).
// Boucle agent générique : chatWithTools().

export type ToolTraceItem = { name: string; summary: string; ok: boolean; href?: string };

type SkillIndex = {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
};
const INDEX: SkillIndex[] = (rawSkills as any[]).map((s) => ({
  id: String(s.id),
  name: String(s.name ?? s.id),
  category: String(s.category ?? ""),
  description: String(s.shortDescription ?? "").slice(0, 180),
  tags: Array.isArray(s.tags) ? s.tags.map(String).slice(0, 8) : [],
}));

const FULL_MD: Record<string, string> = {};
for (const s of rawSkills as any[]) FULL_MD[String(s.id)] = String(s.fullMarkdownSource ?? "");

export function searchSkills(query: string, limit: number) {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9àâäéèêëîïôöùûüç_-]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
  const scored = INDEX.map((s) => {
    const hay = `${s.id} ${s.name}`.toLowerCase();
    const desc = s.description.toLowerCase();
    const tags = s.tags.join(" ").toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += 3;
      if (tags.includes(t)) score += 2;
      if (desc.includes(t)) score += 1;
    }
    return { s, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Math.max(limit || 5, 1), 8))
    .map((x) => ({
      id: x.s.id,
      name: x.s.name,
      category: x.s.category,
      description: x.s.description,
    }));
  return { results: scored };
}

function isBlockedIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 172 && p[1]! >= 16 && p[1]! <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 0) return true;
    return false;
  }
  const low = ip.toLowerCase();
  if (low === "::1" || low === "::") return true;
  if (low.startsWith("fc") || low.startsWith("fd")) return true;
  if (low.startsWith("fe80")) return true;
  if (low.startsWith("ff")) return true;
  return false;
}

async function hostAllowed(hostname: string): Promise<boolean> {
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    if (!addrs.length) return false;
    return addrs.every((a) => !isBlockedIp(a.address));
  } catch {
    return false;
  }
}

function htmlToText(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]{0,300})<\/title>/i)?.[1] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = noScripts
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, text };
}

export async function fetchUrlTool(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(String(rawUrl).trim());
  } catch {
    return { ok: false, error: "URL invalide." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    return { ok: false, error: "Protocole refusé (https/http uniquement)." };
  if (url.port && url.port !== "80" && url.port !== "443")
    return { ok: false, error: "Port refusé." };
  if (!(await hostAllowed(url.hostname))) return { ok: false, error: "Hôte refusé (sécurité)." };
  let current = url.toString();
  for (let hop = 0; hop < 3; hop++) {
    let res: Response;
    try {
      res = await fetchWithRetry(current, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
        redirect: "manual",
        headers: {
          "User-Agent": "AIFAC-skill-agent/1.0",
          Accept: "text/html,text/plain,text/markdown,application/json",
        },
      } as RequestInit);
    } catch {
      return { ok: false, error: "Page inaccessible (timeout ou réseau)." };
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { ok: false, error: "Redirection sans destination." };
      const next = new URL(loc, current);
      if (next.protocol !== "https:" && next.protocol !== "http:")
        return { ok: false, error: "Redirection refusée." };
      if (!(await hostAllowed(next.hostname)))
        return { ok: false, error: "Redirection refusée (sécurité)." };
      current = next.toString();
      continue;
    }
    if (!res.ok) return { ok: false, error: `Page HTTP ${res.status}.` };
    const ctype = (res.headers.get("content-type") ?? "").toLowerCase();
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 200_000) return { ok: false, error: "Page trop lourde (>200 Ko)." };
    const raw = Buffer.from(buf).toString("utf-8").slice(0, 30_000);
    if (ctype.includes("json")) {
      return {
        ok: true,
        url: current,
        title: "",
        text: raw.slice(0, 6000),
        truncated: raw.length >= 6000,
      };
    }
    if (ctype.includes("html") || !ctype || ctype.includes("text")) {
      const { title, text } = htmlToText(raw);
      const sliced = text.slice(0, 6000);
      if (!sliced) return { ok: false, error: "Aucun texte exploitable sur cette page." };
      return { ok: true, url: current, title, text: sliced, truncated: text.length > 6000 };
    }
    return { ok: false, error: "Type de contenu non lisible." };
  }
  return { ok: false, error: "Trop de redirections." };
}

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_skills",
      description:
        "Cherche dans le registre des 219 skills et cours (nom, description, tags). À utiliser dès que l'apprenant mentionne un autre skill ou un besoin vague.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Mots-clés en français ou anglais" },
          limit: { type: "number", description: "Nombre de résultats (1-8)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_skill_content",
      description:
        "Lit le contenu exact du SKILL.md d'un skill du registre. À utiliser pour citer la méthode exacte au lieu de paraphraser de mémoire.",
      parameters: {
        type: "object",
        properties: {
          skillId: {
            type: "string",
            description: "Identifiant exact du skill (ex: tdd, spec-driven-development)",
          },
        },
        required: ["skillId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description:
        "Lit une page web (documentation, article) collée par l'apprenant. URLs https/http publiques uniquement.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "URL complète https://..." } },
        required: ["url"],
      },
    },
  },
];

function summarizeTool(name: string, args: any): string {
  try {
    if (name === "search_skills") return String(args?.query ?? "").slice(0, 60);
    if (name === "get_skill_content") return String(args?.skillId ?? "").slice(0, 60);
    if (name === "fetch_url") return String(args?.url ?? "").slice(0, 60);
    return "";
  } catch {
    return "";
  }
}

export async function runAgentTool(name: string, args: any) {
  try {
    if (name === "search_skills")
      return { ok: true, ...searchSkills(String(args?.query ?? ""), Number(args?.limit ?? 5)) };
    if (name === "get_skill_content") {
      const id = String(args?.skillId ?? "").trim();
      const md = FULL_MD[id];
      if (!md)
        return {
          ok: false,
          error: `Skill '${id}' introuvable. Utilise search_skills pour trouver l'identifiant exact.`,
        };
      return { ok: true, skillId: id, content: md.slice(0, 6000), truncated: md.length > 6000 };
    }
    if (name === "fetch_url") return await fetchUrlTool(String(args?.url ?? ""));
    return { ok: false, error: `Outil inconnu : ${name}` };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

type WireMsg = { role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string };

/** Boucle agent générique : appels d'outils (max 4 tours) puis réponse finale.
 *  Si le modèle refuse les outils (400), on rejoue sans outils. */
export async function chatWithTools(opts: {
  key: string;
  model: string;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  temperature: number;
  maxTokens: number;
  timeoutMs?: number;
  maxRounds?: number;
}): Promise<
  | { ok: true; text: string; toolTrace: ToolTraceItem[] }
  | {
      ok: false;
      reason: "rate_limited" | "failed";
      status?: number;
      detail?: string;
      toolTrace: ToolTraceItem[];
    }
> {
  const toolTrace: ToolTraceItem[] = [];
  const convo: WireMsg[] = [{ role: "system", content: opts.system }, ...opts.messages];
  const maxRounds = opts.maxRounds ?? 2;
  // Modèle principal par défaut : openai/gpt-oss-120b (128k context, disponible sur Groq)
  let activeModel = opts.model || "openai/gpt-oss-120b";
  if (activeModel.includes("llama-3") || !activeModel) {
    activeModel = "openai/gpt-oss-120b";
  }

  async function call(withTools: boolean) {
    return fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
      headers: { Authorization: `Bearer ${opts.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: activeModel,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        ...(withTools ? { tools: AGENT_TOOLS, tool_choice: "auto" } : {}),
        messages: convo,
      }),
    });
  }

  try {
    let useTools = true;
    let text = "";
    for (let i = 0; i < maxRounds; i++) {
      let res = await call(useTools);
      // Fallback automatique sur openai/gpt-oss-20b si quota/rate-limit atteint
      if (res.status === 429 && activeModel !== "openai/gpt-oss-20b") {
        console.warn(`[Groq RateLimit 429] Bascule automatique de ${activeModel} vers openai/gpt-oss-20b`);
        activeModel = "openai/gpt-oss-20b";
        await new Promise((r) => setTimeout(r, 1200));
        res = await call(useTools);
      }
      if (res.status === 429) return { ok: false, reason: "rate_limited", toolTrace };
      if (!res.ok) {
        const body = await res.text();
        console.error("Groq agent-tools error", res.status, body);
        // Si le modèle n'existe pas (404/400 model_not_found), basculer vers gpt-oss-120b ou 20b
        if (body.includes("model_not_found") || res.status === 404) {
          if (activeModel !== "openai/gpt-oss-120b") {
            activeModel = "openai/gpt-oss-120b";
            res = await call(useTools);
          } else {
            activeModel = "openai/gpt-oss-20b";
            res = await call(useTools);
          }
          if (res.ok) {
            // Continuer normalement si le fallback a réussi
            const jsonFallback = (await res.json()) as any;
            const msgFallback = jsonFallback.choices?.[0]?.message;
            text = (msgFallback?.content ?? "").trim();
            break;
          }
        }
        if (useTools && (res.status === 400 || res.status === 404)) {
          useTools = false;
          continue;
        }
        return {
          ok: false,
          reason: "failed",
          status: res.status,
          detail: body.slice(0, 300),
          toolTrace,
        };
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string | null; tool_calls?: any[] } }[];
      };
      const msg = json.choices?.[0]?.message;
      const calls = useTools ? (msg?.tool_calls ?? []) : [];
      if (!calls.length) {
        text = (msg?.content ?? "").trim();
        break;
      }
      convo.push({ role: "assistant", content: msg?.content ?? null, tool_calls: calls });
      for (const c of calls.slice(0, 3)) {
        let args: any = {};
        try {
          args = JSON.parse(c.function?.arguments ?? "{}");
        } catch {
          args = {};
        }
        const name = String(c.function?.name ?? "");
        const result = await runAgentTool(name, args);
        const ok = !!(result as any).ok;
        const entry: ToolTraceItem = { name, summary: summarizeTool(name, args), ok };
        const href = name === "fetch_url" && ok ? String(args?.url ?? "") : "";
        if (href) entry.href = href;
        toolTrace.push(entry);
        convo.push({
          role: "tool",
          tool_call_id: String(c.id ?? ""),
          content: JSON.stringify(result).slice(0, 3000),
        });
      }
    }
    if (!text) {
      let res = await call(false);
      if (res.status === 429 && activeModel !== "openai/gpt-oss-20b") {
        activeModel = "openai/gpt-oss-20b";
        await new Promise((r) => setTimeout(r, 1000));
        res = await call(false);
      }
      if (!res.ok) return { ok: false, reason: "failed", status: res.status, toolTrace };
      const json = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
      text = (json.choices?.[0]?.message?.content ?? "").trim();
    }
    return { ok: true, text, toolTrace };
  } catch (e) {
    console.error("agent-tools error", e);
    return { ok: false, reason: "failed", toolTrace };
  }
}
