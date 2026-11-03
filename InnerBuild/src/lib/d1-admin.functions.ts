import { createServerFn } from "@tanstack/react-start";
import { d1Query } from "./cloudflare-d1";
import crypto from "crypto";

// Admin D1 — couche admin (vérifiée côté route admin.tsx).
export const d1AdminOverviewServerFn = createServerFn({ method: "GET" })
  .validator((d: { kind: "profiles" | "payments" | "submissions" | "progress" | "audit" }) => d)
  .handler(async ({ data }) => {
    try {
      // Auto-guérison : corriger tout profil ayant été faussement basculé en 'pro' alors qu'il n'a réglé qu'une seule tranche
      if (data.kind === "payments" || data.kind === "profiles") {
        await d1Query(`
          UPDATE profiles
          SET access_status = 'active', updated_at = CURRENT_TIMESTAMP
          WHERE access_status = 'pro'
            AND LOWER(COALESCE(email, '')) NOT LIKE '%eltonhounnou%'
            AND id NOT IN (SELECT DISTINCT user_id FROM user_roles WHERE role = 'admin')
            AND id NOT IN (
              SELECT DISTINCT user_id FROM payments
              WHERE status IN ('received', 'verified', 'paid')
              GROUP BY user_id
              HAVING SUM(COALESCE(amount, 1000)) >= 2000
            )
            AND email NOT IN (
              SELECT DISTINCT user_id FROM payments
              WHERE status IN ('received', 'verified', 'paid')
              GROUP BY user_id
              HAVING SUM(COALESCE(amount, 1000)) >= 2000
            );
        `).catch(() => {});
      }

      const sql =
        data.kind === "profiles"
          ? "SELECT p.id, p.full_name, p.email, p.access_status, p.created_at, p.onboarded, p.goal, p.level, COALESCE(u.role, 'learner') AS role FROM profiles p LEFT JOIN users u ON u.id = p.id OR u.email = p.email ORDER BY p.created_at DESC LIMIT 500;"
          : data.kind === "payments"
            ? "SELECT * FROM payments ORDER BY created_at DESC LIMIT 500;"
            : data.kind === "submissions"
              ? "SELECT * FROM submissions ORDER BY created_at DESC LIMIT 500;"
              : data.kind === "progress"
                ? "SELECT user_id, lesson_id, completed_at FROM lesson_progress LIMIT 2000;"
                : "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200;";
      const res = await d1Query(sql);
      if (!res.success) return { success: false, rows: [], error: res.error || "Base D1 injoignable." };
      return { success: true, rows: res.results || [] };
    } catch (e: any) {
      return { success: false, rows: [], error: e.message };
    }
  });

export const d1VerifyPaymentServerFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; userId: string; ok: boolean }) => d)
  .handler(async ({ data }) => {
    try {
      const pay = await d1Query("UPDATE payments SET status = ? WHERE id = ?;", [data.ok ? "verified" : "rejected", data.id]);
      if (!pay.success) return { success: false, error: pay.error || "Base D1 injoignable." };
      if (data.ok) {
        // Calcul du total versé pour ne pas passer en pro prématurément
        const existingRes = await d1Query(
          "SELECT amount, status FROM payments WHERE (user_id = ? OR user_id = (SELECT email FROM profiles WHERE id = ?)) AND status IN ('received', 'verified', 'paid');",
          [data.userId, data.userId]
        );
        const totalPaid = (existingRes.results || []).reduce(
          (sum: number, p: any) => sum + (Number(p.amount) || 1000),
          0
        );
        const newStatus = totalPaid >= 4000 ? "pro" : totalPaid >= 1000 ? "active" : "active";
        await d1Query("UPDATE profiles SET access_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;", [newStatus, data.userId]);
      }
      await d1Query("INSERT INTO audit_log (id, actor_id, action, target, details) VALUES (?, ?, ?, ?, ?);", [
        `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        "admin",
        data.ok ? "Paiement verified" : "Paiement rejected",
        data.userId,
        `Paiement ${data.id}`,
      ]);

      // Notifications apprenant & admin
      if (data.userId) {
        await d1Query("INSERT INTO notifications (id, user_id, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP);", [
          `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          data.userId,
          data.ok ? "Paiement validé par l'admin ✅" : "Paiement rejeté ⚠️",
          data.ok ? "Votre règlement a été vérifié et votre accès est actif !" : "Le paiement a été rejeté par l'administration.",
          "/app/paiement",
        ]);
      }

      await d1Query("INSERT INTO notifications (id, user_id, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP);", [
        `notif_${Date.now() + 1}_${Math.random().toString(36).slice(2, 8)}`,
        "admin",
        `Paiement ${data.ok ? "validé" : "rejeté"} (Admin)`,
        `Le paiement ${data.id} pour l'utilisateur ${data.userId} a été ${data.ok ? "validé" : "rejeté"}.`,
        "/admin/paiements",
      ]);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const d1SetAccessServerFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; status: string }) => d)
  .handler(async ({ data }) => {
    try {
      const upd = await d1Query("UPDATE profiles SET access_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;", [data.status, data.id]);
      if (!upd.success) return { success: false, error: upd.error || "Base D1 injoignable." };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const d1ReviewSubmissionServerFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; status: string; feedback: string; grade?: number | null; userId?: string; title?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const upd = await d1Query("UPDATE submissions SET status = ?, feedback = ?, grade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;", [
        data.status,
        (data.feedback || "").slice(0, 5000),
        data.grade ?? null,
        data.id,
      ]);
      if (!upd.success) return { success: false, error: upd.error || "Base D1 injoignable." };
      if (data.userId) {
        const statusText = data.status === "validated" ? "Validé ✅" : data.status === "changes" ? "À reprendre ⚠️" : "En relecture 📝";
        await d1Query("INSERT INTO notifications (id, user_id, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP);", [
          `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          data.userId,
          `Correction : ${data.title || "Projet"} (${statusText})`,
          `${statusText}${data.grade != null ? ` · Note : ${data.grade}/20` : ""}. Consultez le retour du correcteur.`,
          "/app/rendus",
        ]);

        await d1Query("INSERT INTO notifications (id, user_id, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP);", [
          `notif_${Date.now() + 1}_${Math.random().toString(36).slice(2, 8)}`,
          "admin",
          `Rendu évalué (${statusText})`,
          `Le projet "${data.title || "Projet"}" de l'apprenant ${data.userId} a été corrigé (${data.status}).`,
          "/admin/rendus",
        ]);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const d1LogAuditServerFn = createServerFn({ method: "POST" })
  .validator((d: { actorId?: string | null; action: string; target?: string; details?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await d1Query("INSERT INTO audit_log (id, actor_id, action, target, details) VALUES (?, ?, ?, ?, ?);", [
        `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        data.actorId || null,
        data.action,
        data.target || "",
        data.details || "",
      ]);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const d1AddManualPaymentServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string; email?: string; amount?: number; reference?: string; status?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const payId = crypto.randomUUID();
      const amount = Number(data.amount) || 1000;
      const status = data.status || "received";
      const reference = data.reference || `MANUAL-${Date.now().toString().slice(-6)}`;
      const cleanEmail = (data.email || "").toLowerCase().trim();

      const pay = await d1Query(
        "INSERT INTO payments (id, user_id, reference, amount, status, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP);",
        [payId, data.userId || cleanEmail, reference, amount, status]
      );
      if (!pay.success) return { success: false, error: pay.error || "Base D1 injoignable." };

      if (status === "received" || status === "verified" || status === "paid") {
        const existingRes = await d1Query(
          "SELECT amount, status FROM payments WHERE (user_id = ? OR user_id = ?) AND status IN ('received', 'verified', 'paid');",
          [data.userId, cleanEmail]
        );
        const totalPaid = (existingRes.results || []).reduce(
          (sum: number, p: any) => sum + (Number(p.amount) || 1000),
          0
        );
        const newStatus = totalPaid >= 4000 ? "pro" : totalPaid >= 1000 ? "active" : "active";
        await d1Query("UPDATE profiles SET access_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR email = ?;", [newStatus, data.userId, cleanEmail]);
      }

      await d1Query("INSERT INTO audit_log (id, actor_id, action, target, details) VALUES (?, ?, ?, ?, ?);", [
        `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        "admin",
        "Paiement manuel enregistré",
        data.userId,
        `Paiement de ${amount} F CFA (réf: ${reference})`,
      ]);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
