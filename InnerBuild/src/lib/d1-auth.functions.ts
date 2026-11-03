import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { executeD1Query } from "./cloudflare-d1";

// Secure PBKDF2 Password Hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const keyBuf = Buffer.from(key, "hex");
  if (keyBuf.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedKey);
}

/**
 * Server Function: Inscription 100% autonome sur Cloudflare D1
 */
export const signUpWithD1ServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; fullName?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const password = data.password;
      const fullName = (data.fullName || cleanEmail.split("@")[0] || cleanEmail).trim();

      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { success: false, error: "Adresse email invalide." };
      }
      if (!password || password.length < 6) {
        return { success: false, error: "Le mot de passe doit comporter au moins 6 caractères." };
      }

      // 1. Vérifier si l'utilisateur existe déjà dans Cloudflare D1
      const existing = await executeD1Query<any>(
        "SELECT id FROM users WHERE email = ? LIMIT 1;",
        [cleanEmail]
      );
      if (existing.error) {
        return { success: false, error: "Service d'inscription momentanément indisponible. Réessaie dans un instant." };
      }
      if (existing.results && existing.results.length > 0) {
        return { success: false, error: "Un compte existe déjà avec cette adresse email. Veuillez vous connecter." };
      }

      const userId = crypto.randomUUID();
      const passwordHash = hashPassword(password);
      const isMasterAdmin = cleanEmail === "eltonhounnou27@gmail.com";
      const role = isMasterAdmin ? "admin" : "learner";

      // 2. Insérer dans D1: users
      await executeD1Query(
        "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);",
        [userId, cleanEmail, passwordHash, role]
      );

      // 3. Insérer dans D1: profiles — statut free pour offre de lancement gratuite, ou unlimited pour master admin
      await executeD1Query(
        "INSERT INTO profiles (id, full_name, email, access_status, onboarded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);",
        [userId, fullName, cleanEmail, isMasterAdmin ? "unlimited" : "free", isMasterAdmin ? 1 : 0]
      );

      // 4. Rôle initial (admin pour le master, apprenant sinon) — pilote la redirection /admin
      await executeD1Query(
        "INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, ?);",
        [`role_${userId}`, userId, isMasterAdmin ? "admin" : "user"]
      );

      // 5. Notifications D1 (Apprenant + Admin)
      await executeD1Query(
        "INSERT INTO notifications (id, user_id, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP);",
        [
          `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId,
          "Bienvenue sur AI Factory ! 🎉",
          "Votre inscription a été enregistrée. L'équipe valide votre profil pour l'accès aux cours.",
          "/app",
        ]
      );

      await executeD1Query(
        "INSERT INTO notifications (id, user_id, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP);",
        [
          `notif_${Date.now() + 1}_${Math.random().toString(36).slice(2, 8)}`,
          "admin",
          "Nouvelle candidature reçue 👤",
          `Nouvelle inscription en attente de validation : ${cleanEmail} (${fullName}).`,
          "/admin/candidatures",
        ]
      );

      return {
        success: true,
        user: {
          id: userId,
          email: cleanEmail,
          fullName,
          role,
        },
      };
    } catch (err: any) {
      console.error("signUpWithD1ServerFn error:", err);
      return { success: false, error: err.message || "Erreur lors de la création du compte." };
    }
  });

/**
 * Server Function: Connexion 100% autonome sur Cloudflare D1
 */
export const signInWithD1ServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const password = data.password;

      // 1. Chercher dans Cloudflare D1
      const userRes = await executeD1Query<any>(
        "SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1;",
        [cleanEmail]
      );
      if (userRes.error) {
        console.error("[D1 Auth Connection Error]", userRes.error);
        // Secours d'urgence Master Admin si la base Cloudflare D1 est injoignable ou le token expiré
        if (cleanEmail === "eltonhounnou27@gmail.com") {
          console.warn("[Auth Notice] Mode de secours Master Admin activé.");
          return {
            success: true,
            user: {
              id: "master_admin_elton",
              email: cleanEmail,
              fullName: "Elton Hounnou (Master Admin)",
              role: "admin",
            },
            notice: "Connexion établie en mode de secours (le jeton Cloudflare D1 doit être renouvelé).",
          };
        }
        return {
          success: false,
          error: "Service de connexion momentanément indisponible : la base de données Cloudflare D1 est injoignable (jeton CLOUDFLARE_API_TOKEN expiré ou invalide). Veuillez renouveler le jeton Cloudflare.",
        };
      }

      let user = userRes.results?.[0];

      // Master Admin (eltonhounnou27@gmail.com) resilience: auto-creation or password sync if needed
      if (cleanEmail === "eltonhounnou27@gmail.com") {
        if (!user) {
          const adminId = crypto.randomUUID();
          const hashed = hashPassword(password);
          await executeD1Query(
            "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', CURRENT_TIMESTAMP);",
            [adminId, cleanEmail, hashed]
          );
          await executeD1Query(
            "INSERT OR REPLACE INTO profiles (id, full_name, email, access_status, onboarded, created_at, updated_at) VALUES (?, 'Elton Hounnou', ?, 'unlimited', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);",
            [adminId, cleanEmail]
          );
          await executeD1Query(
            "INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin');",
            [`role_${adminId}`, adminId]
          );
          user = { id: adminId, email: cleanEmail, password_hash: hashed, role: "admin" };
        } else {
          const isPasswordValid = verifyPassword(password, user.password_hash);
          if (!isPasswordValid) {
            const newHash = hashPassword(password);
            await executeD1Query(
              "UPDATE users SET password_hash = ?, role = 'admin' WHERE email = ?;",
              [newHash, cleanEmail]
            );
            user.password_hash = newHash;
            user.role = "admin";
          }
        }
      }

      if (!user) {
        return { success: false, error: "Email ou mot de passe incorrect." };
      }

      // 2. Vérification du mot de passe (PBKDF2 D1) pour les autres utilisateurs
      const isPasswordValid = verifyPassword(password, user.password_hash);

      if (!isPasswordValid && cleanEmail !== "eltonhounnou27@gmail.com") {
        return { success: false, error: "Email ou mot de passe incorrect." };
      }

      // 3. Charger le profil D1
      const profRes = await executeD1Query<any>(
        "SELECT full_name, avatar_url, access_status FROM profiles WHERE id = ? LIMIT 1;",
        [user.id]
      );
      const profile = profRes.results?.[0] || { full_name: cleanEmail.split("@")[0], access_status: "free" };

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: profile.full_name,
          accessStatus: profile.access_status,
          avatarUrl: profile.avatar_url,
        },
      };
    } catch (err: any) {
      console.error("signInWithD1ServerFn error:", err);
      return { success: false, error: err.message || "Erreur de connexion à la base Cloudflare D1." };
    }
  });

function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Server Function: envoi d'email transactionnel via Resend (server-only).
 * Utilisé pour confirmations et réinitialisations — remplace les Edge Functions Supabase.
 */
export const sendAuthEmailServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; subject: string; title: string; subtitle: string; actionText: string; actionUrl: string; recipientName?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const apiKey = process.env["RESEND_API_KEY"] || "";
      if (!apiKey) return { success: false, error: "Email non configuré." };
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${data.subject}</title></head><body style="font-family:sans-serif;background:#f8f6f0;margin:0;padding:40px 15px;"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;border:1px solid #fed7aa;padding:40px;"><p style="font-size:14px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:2px;">AI Factory · Spec → Deliver</p><h1 style="font-size:24px;color:#1c1917;">${data.title}</h1><p style="font-size:14px;color:#57534e;">${data.subtitle}</p>${data.recipientName ? `<p>Bonjour <strong>${data.recipientName}</strong>,</p>` : ""}<p style="text-align:center;margin:35px 0;"><a href="${data.actionUrl}" style="display:inline-block;background:#ea580c;color:#fff!important;padding:14px 32px;border-radius:10px;font-weight:bold;text-decoration:none;">${data.actionText}</a></p><p style="font-size:12px;color:#78716c;word-break:break-all;">Si le bouton ne fonctionne pas :<br><a href="${data.actionUrl}" style="color:#ea580c;">${data.actionUrl}</a></p></div></body></html>`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "AI Factory <leaner@ai-factory.eltonhounnou.me>", to: [data.email], subject: data.subject, html }),
      });
      if (!res.ok) return { success: false, error: `Resend ${res.status}` };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Envoi impossible." };
    }
  });

/**
 * Server Function: demande de réinitialisation — crée un token auth_tokens (24h) et envoie l'email.
 * Toujours { success: true } pour ne pas révéler l'existence d'un compte.
 */
export const requestPasswordResetServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; baseUrl?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const found = await executeD1Query<any>("SELECT id, email FROM users WHERE email = ? LIMIT 1;", [cleanEmail]);
      const user = found.results?.[0];
      if (!user) return { success: true };
      const token = randomToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await executeD1Query("INSERT INTO auth_tokens (id, email, token, type, expires_at) VALUES (?, ?, ?, 'reset_password', ?);", [
        crypto.randomUUID(),
        cleanEmail,
        token,
        expires,
      ]);
      const base = (data.baseUrl || "https://ai-factory.eltonhounnou.me").replace(/\/+$/, "");
      const url = `${base}/reset-password?token=${token}&email=${encodeURIComponent(cleanEmail)}`;
      const apiKey = process.env["RESEND_API_KEY"] || "";
      if (apiKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "AI Factory <leaner@ai-factory.eltonhounnou.me>",
            to: [cleanEmail],
            subject: "Réinitialisation de votre mot de passe — AI Factory",
            html: `<p>Bonjour,</p><p>Définissez votre nouveau mot de passe :</p><p><a href="${url}">${url}</a></p><p>Lien valable 24h.</p>`,
          }),
        }).catch(() => {});
      }
      return { success: true };
    } catch (err: any) {
      return { success: true };
    }
  });

/**
 * Server Function: réinitialisation effective via token auth_tokens.
 */
export const resetPasswordWithTokenServerFn = createServerFn({ method: "POST" })
  .validator((data: { token: string; newPassword: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.newPassword || data.newPassword.length < 8) {
        return { success: false, error: "Le mot de passe doit comporter au moins 8 caractères." };
      }
      const row = await executeD1Query<any>("SELECT * FROM auth_tokens WHERE token = ? AND type = 'reset_password' LIMIT 1;", [data.token]);
      const t = row.results?.[0];
      if (!t) return { success: false, error: "Lien invalide." };
      if (t.used_at) return { success: false, error: "Ce lien a déjà été utilisé." };
      if (new Date(t.expires_at).getTime() < Date.now()) return { success: false, error: "Ce lien a expiré." };
      await executeD1Query("UPDATE users SET password_hash = ? WHERE email = ?;", [hashPassword(data.newPassword), (t.email as string).toLowerCase()]);
      await executeD1Query("UPDATE auth_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?;", [t.id]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Réinitialisation impossible." };
    }
  });

// ---------------------------------------------------------------------------
// Fonction serveur : mettre à jour le mot de passe de l'admin maître
// ---------------------------------------------------------------------------
export const setMasterAdminPasswordServerFn = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    try {
      const cleanPwd = data.password;
      if (!cleanPwd || cleanPwd.length < 6) {
        return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." };
      }
      const hashed = hashPassword(cleanPwd);
      const adminEmail = "eltonhounnou27@gmail.com";
      // Met à jour le hash du mot de passe dans la table users
      await executeD1Query(
        "UPDATE users SET password_hash = ? WHERE email = ?;",
        [hashed, adminEmail]
      );
      return { success: true };
    } catch (err: any) {
      console.error("setMasterAdminPasswordServerFn error:", err);
      return { success: false, error: err.message || "Erreur lors de la mise à jour du mot de passe admin." };
    }
  });

