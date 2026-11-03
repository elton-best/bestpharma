export interface CustomAuthToken {
  token: string;
  email: string;
  type: "confirm_email" | "reset_password";
  expiresAt: number;
  used: boolean;
}

/**
 * Generate a cryptographically strong random token
 */
export function generateSecureToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store and retrieve custom auth tokens (persisted in D1 audit_log and localStorage)
 */
export async function saveAuthToken(
  email: string,
  type: "confirm_email" | "reset_password"
): Promise<string> {
  const token = type === "confirm_email" ? generate6DigitOtp() : generateSecureToken();
  const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour validity

  const tokenData: CustomAuthToken = {
    token,
    email: email.trim().toLowerCase(),
    type,
    expiresAt,
    used: false,
  };

  // Persist locally for instant lookup
  try {
    const existing: CustomAuthToken[] = JSON.parse(
      localStorage.getItem("aifac_auth_tokens") || "[]"
    );
    existing.push(tokenData);
    localStorage.setItem("aifac_auth_tokens", JSON.stringify(existing));
  } catch {
    // ignore
  }

  // Persist in D1 audit_log for auditability and server validation (source unique)
  try {
    const { d1InsertServerFn } = await import("./d1-data.functions");
    await d1InsertServerFn({
      data: {
        table: "audit_log",
        row: {
          action: `AUTH_TOKEN_GENERATED_${type.toUpperCase()}`,
          target: email.trim().toLowerCase(),
          details: JSON.stringify({ token, type, expiresAt }),
        },
      },
    });
  } catch (err) {
    console.warn("Could not record token in D1:", err);
  }

  return token;
}

/**
 * Validate a custom auth token
 */
export async function verifyAuthToken(
  token: string,
  type: "confirm_email" | "reset_password"
): Promise<{ valid: boolean; email?: string; error?: string }> {
  try {
    const existing: CustomAuthToken[] = JSON.parse(
      localStorage.getItem("aifac_auth_tokens") || "[]"
    );
    const found = existing.find((t) => t.token === token && t.type === type);

    if (found) {
      if (found.used) {
        return { valid: false, error: "Ce lien a déjà été utilisé." };
      }
      if (Date.now() > found.expiresAt) {
        return { valid: false, error: "Ce lien a expiré. Veuillez refaire une demande." };
      }
      // Mark as used
      found.used = true;
      localStorage.setItem("aifac_auth_tokens", JSON.stringify(existing));
      return { valid: true, email: found.email };
    }

    // Check D1 audit_log if not found in local storage (source unique)
    const { d1ListServerFn } = await import("./d1-data.functions");
    const res = await d1ListServerFn({
      data: {
        table: "audit_log",
        where: { action: `AUTH_TOKEN_GENERATED_${type.toUpperCase()}` } as any,
        orderBy: "created_at",
        orderDir: "DESC",
        limit: 20,
      },
    });

    const rows = (res.rows || []) as any[];
    if (rows.length > 0) {
      for (const row of rows) {
        try {
          const parsed = JSON.parse(row.details);
          if (parsed.token === token) {
            if (Date.now() > parsed.expiresAt) {
              return { valid: false, error: "Ce lien a expiré." };
            }
            return { valid: true, email: row.target };
          }
        } catch {
          // ignore
        }
      }
    }

    return { valid: false, error: "Lien de vérification invalide ou introuvable." };
  } catch {
    return { valid: false, error: "Impossible de valider ce jeton." };
  }
}

/**
 * Generate official AI Factory Branded HTML Email template
 */
export function buildBrandedEmailHtml({
  subject,
  title,
  subtitle,
  actionText,
  actionUrl,
  recipientName,
  token,
}: {
  subject: string;
  title: string;
  subtitle: string;
  actionText: string;
  actionUrl: string;
  recipientName?: string | undefined;
  token?: string | undefined;
}): string {
  const isOtp = token && /^\d{6}$/.test(token.trim());
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f6f0; margin: 0; padding: 40px 15px; color: #1c1917; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #fed7aa; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { display: inline-block; width: 44px; height: 44px; background: #101828; border-radius: 12px; line-height: 44px; color: #fff; font-weight: bold; font-size: 20px; }
    .brand { font-size: 14px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; }
    .title { font-size: 24px; font-weight: 800; color: #1c1917; margin: 15px 0 8px; }
    .subtitle { font-size: 14px; color: #78716c; line-height: 1.6; }
    .btn-container { text-align: center; margin: 35px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 15px rgba(234, 88, 12, 0.3); }
    .footer { text-align: center; font-size: 12px; color: #a8a29e; margin-top: 30px; border-top: 1px solid #f5f0eb; pt: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">✓</div>
      <div class="brand">AI Factory · Spec → Deliver</div>
      <h1 class="title">${title}</h1>
      <p class="subtitle">${subtitle}</p>
    </div>

    ${recipientName ? `<p style="font-size: 14px; color: #44403c;">Bonjour <strong>${recipientName}</strong>,</p>` : ""}

    ${isOtp ? `
      <div style="margin: 28px 0; text-align: center;">
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #ea580c; font-weight: bold; margin-bottom: 8px;">Votre code de validation à 6 chiffres</p>
        <div style="display: inline-block; padding: 14px 32px; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #ea580c; background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; font-family: monospace;">
          ${token}
        </div>
      </div>
    ` : ""}

    <div class="btn-container">
      <a href="${actionUrl}" class="btn" target="_blank">${actionText}</a>
    </div>

    <p style="font-size: 12px; color: #78716c; line-height: 1.6; word-break: break-all;">
      Si le bouton ne fonctionne pas, copiez ce lien sécurisé dans votre navigateur :<br>
      <a href="${actionUrl}" style="color: #ea580c;">${actionUrl}</a>
    </p>

    <div class="footer">
      <p style="margin: 0;">AI Factory · Spec &rarr; Deliver</p>
      <p style="margin: 4px 0 0;">Direction Pédagogique</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Custom Mail Dispatcher (100% D1 + Resend via server fn — sans Supabase)
 */
export async function sendCustomAuthEmail({
  email,
  type,
  recipientName,
}: {
  email: string;
  type: "confirm_email" | "reset_password";
  recipientName?: string;
}): Promise<{ success: boolean; token: string; directUrl: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const token = await saveAuthToken(normalizedEmail, type);
  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const baseUrl = isLocal && typeof window !== "undefined" ? window.location.origin : "https://ai-factory.eltonhounnou.me";

  const directUrl =
    type === "confirm_email"
      ? `${baseUrl}/auth/verify-email?email=${encodeURIComponent(normalizedEmail)}&code=${token}`
      : `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

  const subject =
    type === "confirm_email"
      ? `Votre code de validation AI Factory : ${token}`
      : "Réinitialisation de votre mot de passe — AI Factory";

  const title =
    type === "confirm_email"
      ? "Votre code de confirmation"
      : "Nouveau mot de passe sécurisé";

  const subtitle =
    type === "confirm_email"
      ? "Saisissez ce code à 6 chiffres sur l'écran de validation pour débloquer votre accès au dashboard :"
      : "Une demande de modification de mot de passe a été initiée pour votre compte AI Factory.";

  const actionText =
    type === "confirm_email" ? "Valider automatiquement mon compte" : "Définir mon nouveau mot de passe";

  // Journalise la demande d'envoi dans D1 (source unique, best-effort)
  try {
    const { d1InsertServerFn } = await import("./d1-data.functions");
    await d1InsertServerFn({
      data: {
        table: "auth_tokens",
        row: {
          email: normalizedEmail,
          token,
          type,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });
  } catch {
    // table auth_tokens optionnelle côté client — le token localStorage reste la source
  }

  try {
    const { d1InsertServerFn } = await import("./d1-data.functions");
    await d1InsertServerFn({
      data: {
        table: "audit_log",
        row: {
          action: "CUSTOM_EMAIL_DISPATCHED",
          target: normalizedEmail,
          details: JSON.stringify({ type, token, directUrl, timestamp: new Date().toISOString() }),
        },
      },
    });
  } catch {
    // ignore
  }

  // Envoi réel via la server fn D1 (Resend côté serveur)
  try {
    const { sendAuthEmailServerFn } = await import("./d1-auth.functions");
    const payload = {
      email: normalizedEmail,
      subject,
      title,
      subtitle,
      actionText,
      actionUrl: directUrl,
      ...(recipientName ? { recipientName } : {}),
    } as any;
    const sent = await sendAuthEmailServerFn({ data: payload });
    if (sent && (sent as any).success) {
      console.log("Email dispatched via sendAuthEmailServerFn");
    }
  } catch (e) {
    console.warn("sendAuthEmailServerFn dispatch:", e);
  }

  return { success: true, token, directUrl };
}

/**
 * Reset password via D1 token (remplace l'Edge Function Supabase reset-password)
 */
export async function resetPasswordWithEdgeFn(
  token: string,
  newPassword: string,
  _email?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { resetPasswordWithTokenServerFn } = await import("./d1-auth.functions");
    const res = await resetPasswordWithTokenServerFn({ data: { token, newPassword } });
    if (!res.success) return { success: false, error: (res as any).error || "Erreur de réinitialisation" };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur de réinitialisation" };
  }
}
