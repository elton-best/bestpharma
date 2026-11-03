import { createServerFn } from "@tanstack/react-start";

const BWT_API_ENDPOINT = "https://bwt-connect.lovable.app/api/partners/v1/member-status";
const FOUR_TALENTS_API_ENDPOINT = "https://4talents.org/api/partners/v1/member-status";

export type PartnerCheckResult = {
  success: boolean;
  eligible: boolean;
  partner?: "BWT" | "4Talents" | string;
  community?: {
    name: string;
    slug: string;
  };
  error?: string;
};

/**
 * Appel interne serveur pour vérifier l'appartenance à BWT (BWT Connect).
 */
async function verifyBwtMembership(cleanEmail: string): Promise<PartnerCheckResult | null> {
  const apiKey =
    process.env["PARTNERS_BWT_API_KEY"] ||
    process.env["BWT_API_KEY"] ||
    "";

  if (!apiKey) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const resp = await fetch(BWT_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email: cleanEmail }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`[BWT API Warning] HTTP ${resp.status} received from ${BWT_API_ENDPOINT}`);
      return { success: true, eligible: false };
    }

    const resData = (await resp.json()) as any;
    const isEligible = Boolean(resData?.eligible);

    return {
      success: true,
      eligible: isEligible,
      partner: isEligible ? (resData?.community?.name || "BWT") : undefined,
      community: isEligible
        ? resData?.community || { name: "BWT", slug: "bwt-connect" }
        : undefined,
    };
  } catch (err: any) {
    console.warn("[BWT API Error]", err?.message || err);
    return null;
  }
}

/**
 * Appel interne serveur pour vérifier l'appartenance à 4Talents.
 */
async function verify4TalentsMembership(cleanEmail: string): Promise<PartnerCheckResult | null> {
  const apiKey = process.env["PARTNERS_4TALENTS_API_KEY"] || "";

  if (!apiKey) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const resp = await fetch(FOUR_TALENTS_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email: cleanEmail }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`[4Talents API Warning] HTTP ${resp.status} received from ${FOUR_TALENTS_API_ENDPOINT}`);
      return { success: true, eligible: false };
    }

    const resData = (await resp.json()) as any;
    const isEligible = Boolean(resData?.eligible);

    return {
      success: true,
      eligible: isEligible,
      partner: isEligible ? (resData?.community?.name || "4Talents") : undefined,
      community: isEligible
        ? resData?.community || { name: "4Talents", slug: "4talents" }
        : undefined,
    };
  } catch (err: any) {
    console.warn("[4Talents API Error]", err?.message || err);
    return null;
  }
}

/**
 * Server Function: Vérification unifiée de partenaire (BWT et 4Talents).
 * Détection automatique côté serveur sans friction ni intervention manuelle de l'apprenant.
 */
export const checkPartnerServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<PartnerCheckResult> => {
    try {
      const cleanEmail = (data.email || "").trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { success: false, eligible: false, error: "Adresse email invalide." };
      }

      // Exécution parallèle des vérifications des partenaires
      const [bwtResult, fourTalentsResult] = await Promise.allSettled([
        verifyBwtMembership(cleanEmail),
        verify4TalentsMembership(cleanEmail),
      ]);

      // 1. Vérification BWT en priorité
      if (bwtResult.status === "fulfilled" && bwtResult.value?.eligible) {
        return bwtResult.value;
      }

      // 2. Vérification 4Talents
      if (fourTalentsResult.status === "fulfilled" && fourTalentsResult.value?.eligible) {
        return fourTalentsResult.value;
      }

      return {
        success: true,
        eligible: false,
      };
    } catch (err: any) {
      console.error("[Partner API Error]", err);
      return { success: false, eligible: false, error: err.message || "Erreur de connexion API Partenaire." };
    }
  });

/**
 * Alias rétrocompatible pointant vers la vérification unifiée (BWT + 4Talents).
 */
export const check4TalentsPartnerServerFn = checkPartnerServerFn;

/**
 * Vérification dédiée BWT si nécessaire.
 */
export const checkBwtPartnerServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<PartnerCheckResult> => {
    const cleanEmail = (data.email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, eligible: false, error: "Adresse email invalide." };
    }
    const res = await verifyBwtMembership(cleanEmail);
    return res || { success: true, eligible: false };
  });
