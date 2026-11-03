import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { z } from "zod";
import { d1Query } from "./cloudflare-d1";

const ConfirmAccountInput = z.object({
  token: z.string().min(1),
  email: z.string().optional(),
});

export const confirmAccountServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => ConfirmAccountInput.parse(d))
  .handler(async ({ data }) => {
    const { token, email: providedEmail } = data;
    try {
      const cleanToken = token.trim();
      let targetEmail: string | null = providedEmail ? providedEmail.trim().toLowerCase() : null;

      // 1. Cherche le token dans auth_tokens (type confirm_email) — D1 pur
      const tokRes = await d1Query<any>(
        "SELECT * FROM auth_tokens WHERE token = ? AND type = 'confirm_email' LIMIT 1;",
        [cleanToken]
      );
      const tokenRow = tokRes.results?.[0] as any;
      let tokenRowId: string | null = null;

      if (tokenRow) {
        if (tokenRow.used_at) {
          return { success: false, error: "Ce lien de confirmation a déjà été utilisé." };
        }
        if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() < Date.now()) {
          return { success: false, error: "Ce lien de confirmation a expiré. Veuillez en demander un nouveau." };
        }
        targetEmail = (tokenRow.email as string).toLowerCase();
        tokenRowId = tokenRow.id as string;
        await d1Query("UPDATE auth_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?;", [tokenRowId]);
      }

      // 2. Fallback : cherche dans audit_log (D1 pur)
      if (!targetEmail) {
        const auditRes = await d1Query<any>(
          "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 30;"
        );
        const auditRows = auditRes.results || [];
        for (const row of auditRows) {
          try {
            const details = JSON.parse(row.details || "{}");
            if (details.token === cleanToken) {
              targetEmail = row.target ? (row.target as string).toLowerCase() : null;
              break;
            }
          } catch {
            // ignore
          }
        }
      }

      if (!targetEmail) {
        return { success: false, error: "Jeton de confirmation introuvable ou expiré." };
      }

      // 3. S'assure que le profil existe (D1 pur)
      const userRes = await d1Query<any>("SELECT id, email FROM users WHERE email = ? LIMIT 1;", [
        targetEmail,
      ]);
      const existingUser = userRes.results?.[0] as any;

      if (existingUser?.id) {
        const profRes = await d1Query<any>("SELECT id FROM profiles WHERE id = ? LIMIT 1;", [
          existingUser.id,
        ]);
        if (!profRes.results?.[0]) {
          const fullName = targetEmail.split("@")[0] || targetEmail;
          await d1Query(
            "INSERT OR IGNORE INTO profiles (id, email, full_name, access_status) VALUES (?, ?, ?, 'free');",
            [existingUser.id, targetEmail, fullName]
          );
        }
      }

      // 4. Log de confirmation autonome dans audit_log (D1 pur)
      await d1Query("INSERT INTO audit_log (id, action, target, details) VALUES (?, ?, ?, ?);", [
        crypto.randomUUID(),
        "AUTONOMOUS_ACCOUNT_CONFIRMED",
        targetEmail,
        JSON.stringify({
          token: cleanToken,
          confirmedAt: new Date().toISOString(),
          userId: existingUser?.id ?? null,
        }),
      ]);

      return {
        success: true,
        email: targetEmail,
        message: "Compte confirmé avec succès ! Vous pouvez maintenant accéder à votre dashboard.",
      };
    } catch (e: any) {
      console.error("confirmAccountServerFn error:", e);
      return { success: false, error: e.message || "Erreur serveur lors de la validation." };
    }
  });
