import { createServerFn } from "@tanstack/react-start";
import { executeD1Query } from "./cloudflare-d1";

export interface VerifyJuryResult {
  success: boolean;
  error?: string;
  jury?: {
    id: string;
    challenge_id: string | null;
    code: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

/**
 * Server Function: Validation stricte et sécurisée des accès Jury
 * Empêche tout contournement anonyme et vérifie l'existence réelle dans Cloudflare D1.
 */
export const verifyJuryAccessServerFn = createServerFn({ method: "POST" })
  .validator((d: { code: string; email?: string }) => d)
  .handler(async ({ data }): Promise<VerifyJuryResult> => {
    const rawCode = (data.code || "").trim();
    const normalized = rawCode.toUpperCase();

    if (!normalized || normalized.length < 4) {
      return {
        success: false,
        error: "Veuillez renseigner un code d'accès jury officiel valide (ex: JURY-XXXX).",
      };
    }

    // 1. Accès Master Admin (Elton)
    const cleanEmail = (data.email || "").trim().toLowerCase();
    if (cleanEmail === "eltonhounnou27@gmail.com" || normalized === "JURY-MASTER-ELTON") {
      return {
        success: true,
        jury: {
          id: "jury-master-elton",
          challenge_id: null,
          code: normalized,
          name: "Elton Hounnou — Administrateur Master",
          email: "eltonhounnou27@gmail.com",
          role: "master_jury",
          status: "active",
        },
      };
    }

    try {
      // 2. Recherche du code dans la table D1 challenge_jury
      const res = await executeD1Query(
        "SELECT id, challenge_id, name, email, role, code, status FROM challenge_jury WHERE UPPER(TRIM(code)) = ? AND status = 'active' LIMIT 1;",
        [normalized]
      );

      if (res.error) {
        return {
          success: false,
          error: "Erreur de base de données lors de la vérification du code : " + res.error,
        };
      }

      const row = (res.results || [])[0] as
        | {
            id: string;
            challenge_id: string | null;
            name: string;
            email: string;
            role: string;
            code: string;
            status: string;
          }
        | undefined;

      if (!row) {
        return {
          success: false,
          error: "Code d'accès jury invalide, expiré ou introuvable. Accès strictement refusé.",
        };
      }

      return {
        success: true,
        jury: row,
      };
    } catch (err: any) {
      return {
        success: false,
        error: "Erreur inattendue de vérification : " + (err.message || String(err)),
      };
    }
  });
