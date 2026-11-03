import { createServerFn } from "@tanstack/react-start";
import { d1Query } from "./cloudflare-d1";
import crypto from "crypto";

const PARTNER_EMAILS = new Set([
  "zekiyathadjaho8@gmail.com",
  "sabalimathnaro1@gmail.com",
  "divineakoha27@gmail.com",
  "marlysedogble@gmail.com",
  "yebinibah99@gmail.com",
  "jennyferedjrokinto0@gmail.com",
  "esmeraldadesouza472@gmail.com",
  "shirley.anago@gmail.com",
  "aladecorina@gmail.com",
  "abdoulayemansouratou@gmail.com",
  "aminoumalickmich@gmail.com",
  "hermionekpenonhoun@gmail.com",
  "kouagoufernandez2@gmail.com",
  "rosetuk71@gmail.com",
  "elielokossou7@gmail.com",
  "theophilesedonou@gmail.com",
  "hodonoueudeshdn@gmail.com",
  "loiktgn@gmail.com",
  "urielkpegbe@gmail.com",
  "akwnolouf@gmail.com",
  "junioromyale994@gmail.com",
  "viderotk@gmail.com",
  "aniambossoustane@gmail.com",
  "agbodjimawoussisandrine@gmail.com",
  "koueloalladassilenoumibelmira@gmail.com",
  "immaculeeaholou@gmail.com",
  "geduldamadou@gmail.com",
  "eltonhounnou27@gmail.com",
]);

export const recordPaymentServerFn = createServerFn({ method: "POST" })
  .validator((data: {
    userId: string;
    email: string;
    reference: string;
    amount?: number;
    status?: "received" | "pending";
  }) => data)
  .handler(async ({ data }) => {
    try {
      const id = crypto.randomUUID();
      const amount = Number(data.amount) || 1000;
      const status = data.status || "received";
      const cleanEmail = (data.email || "").toLowerCase().trim();

      // 1. Enregistrer dans Cloudflare D1
      await d1Query(
        "INSERT INTO payments (id, user_id, reference, amount, status, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP);",
        [id, data.userId || cleanEmail, data.reference, amount, status]
      );

      // 2. Calculer le total réel déjà versé par cet apprenant (y compris ce paiement si confirmé)
      const isConfirmed = status === "received" || status === "pending";
      const existingRes = await d1Query(
        "SELECT amount, status FROM payments WHERE (user_id = ? OR user_id = ?) AND status IN ('received', 'verified', 'paid');",
        [data.userId, cleanEmail]
      );
      const totalPaid = (existingRes.results || []).reduce(
        (sum: number, p: any) => sum + (Number(p.amount) || 1000),
        0
      );

      const isPartner = PARTNER_EMAILS.has(cleanEmail);
      const targetTotal = isPartner ? 2000 : 4000;
      const requiredTranches = isPartner ? 2 : 4;
      const tranchesPaid = Math.min(requiredTranches, Math.floor(totalPaid / 1000));
      const isFullyPaid = totalPaid >= targetTotal;

      // Déterminer le statut d'accès D1 approprié :
      // - 'pro' UNIQUEMENT si toutes les tranches nécessaires sont réglées (2 000 F partenaire ou 4 000 F standard)
      // - 'active' dès qu'au moins 1 tranche (1 000 F) est versée (donne accès à la pratique & aux exercices)
      let targetStatus = "free";
      if (isFullyPaid) {
        targetStatus = "pro";
      } else if (totalPaid >= 1000) {
        targetStatus = "active";
      }

      await d1Query(
        "UPDATE profiles SET access_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR email = ?;",
        [targetStatus, data.userId, cleanEmail]
      );

      // 3. Envoyer les notifications à l'apprenant ET à l'admin
      const notifLearnerId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const notifAdminId = `notif_${Date.now() + 1}_${Math.random().toString(36).slice(2, 8)}`;

      const learnerMsg = isFullyPaid
        ? `Votre règlement de ${amount.toLocaleString("fr-FR")} F CFA (réf: ${data.reference}) a bien été confirmé. Votre formation est 100% soldée (${tranchesPaid}/${requiredTranches} tranches). Statut PRO débloqué !`
        : `Votre règlement de ${amount.toLocaleString("fr-FR")} F CFA (réf: ${data.reference}) a bien été confirmé. Tranche ${tranchesPaid}/${requiredTranches} validée ! Vos accès Pratique et Exercices sont actifs.`;

      await d1Query(
        "INSERT INTO notifications (id, user_id, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP);",
        [
          notifLearnerId,
          data.userId,
          isFullyPaid ? "Formation 100% Soldée 🎉" : `Tranche ${tranchesPaid}/${requiredTranches} Validée 🎉`,
          learnerMsg,
          "/app/paiement",
        ]
      );

      await d1Query(
        "INSERT INTO notifications (id, user_id, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP);",
        [
          notifAdminId,
          "admin",
          "Nouveau paiement reçu 💰",
          `L'apprenant ${cleanEmail} a versé ${amount.toLocaleString("fr-FR")} F CFA (réf: ${data.reference}). Avancement : ${totalPaid.toLocaleString("fr-FR")} F / ${targetTotal.toLocaleString("fr-FR")} F CFA (${tranchesPaid}/${requiredTranches} tranches).`,
          "/admin/paiements",
        ]
      );

      // 4. Envoi d'email administratif via Resend à l'adresse admin configurée
      const adminEmail =
        process.env["ADMIN_NOTIFICATION_EMAIL"] ||
        process.env["ADMIN_EMAIL"] ||
        "eltonhounnou27@gmail.com";
      const resendApiKey = process.env["RESEND_API_KEY"] || "";

      if (resendApiKey && adminEmail) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "AI Factory <leaner@ai-factory.eltonhounnou.me>",
              to: [adminEmail],
              subject: `[AI Factory] Paiement reçu : ${amount.toLocaleString("fr-FR")} F CFA de ${cleanEmail}`,
              html: `
                <div style="font-family:sans-serif;padding:24px;background:#0d1117;color:#e6edf3;border-radius:12px;">
                  <h2 style="color:#f97316;margin-top:0;">Nouveau Paiement Reçu 💰</h2>
                  <p>Un versement a été validé sur la plateforme AI Factory :</p>
                  <ul>
                    <li><strong>Apprenant :</strong> ${cleanEmail}</li>
                    <li><strong>Montant :</strong> ${amount.toLocaleString("fr-FR")} F CFA</li>
                    <li><strong>Référence :</strong> ${data.reference}</li>
                    <li><strong>Statut :</strong> ${status}</li>
                    <li><strong>Total réglé par cet apprenant :</strong> ${totalPaid.toLocaleString("fr-FR")} / ${targetTotal.toLocaleString("fr-FR")} F CFA (${tranchesPaid}/${requiredTranches} tranches)</li>
                  </ul>
                  <p><a href="https://ai-factory.eltonhounnou.me/admin/paiements" style="display:inline-block;padding:10px 18px;background:#f97316;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Accéder au tableau de bord Paiements</a></p>
                </div>
              `,
            }),
          });
        } catch (emailErr) {
          console.warn("[Admin Notification Email Warning]", emailErr);
        }
      }

      return {
        success: true,
        message: isFullyPaid
          ? "Formation 100% soldée ! Statut PRO activé."
          : `Tranche ${tranchesPaid}/${requiredTranches} validée avec succès. Accès Pratique actif !`,
        totalPaid,
        tranchesPaid,
        requiredTranches,
      };
    } catch (err: any) {
      console.error("recordPaymentServerFn error:", err);
      return { success: false, error: err.message || "Erreur lors de l'enregistrement du paiement." };
    }
  });

export const getD1PaymentsServerFn = createServerFn({ method: "GET" })
  .validator((data: { userId: string; email?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const res = await d1Query(
        "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC;",
        [data.userId]
      );
      return { success: true, payments: res.results || [] };
    } catch (err: any) {
      return { success: false, payments: [], error: err.message };
    }
  });
