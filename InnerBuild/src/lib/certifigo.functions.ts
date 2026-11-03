import { createServerFn } from "@tanstack/react-start";
import { d1Query } from "./cloudflare-d1";
import {
  CERTIFIGO_DEFAULT_TEMPLATES,
  issueCertifigoCertificate,
  listCertifigoCertificates,
  getCertifigoCampaign,
  sendCertifigoCampaignEmails,
  listCertifigoTemplates,
} from "./certifigo";

export interface DbCertificate {
  id: string;
  user_id: string;
  recipient_name: string;
  recipient_email: string;
  type: string;
  template_id: string;
  certifigo_id?: string | null;
  certifigo_campaign_id?: string | null;
  certifigo_job_id?: string | null;
  status: "draft" | "processing" | "completed" | "failed";
  verification_url?: string | null;
  pdf_url?: string | null;
  thumbnail_url?: string | null;
  signature?: string | null;
  issued_at?: string | null;
  created_at?: string;
}

/**
 * Helper to sync certificate details from Certifigo into D1
 */
async function syncCertificateWithCertifigo(cert: DbCertificate): Promise<DbCertificate> {
  if (cert.status === "completed" && cert.pdf_url && cert.verification_url) {
    return cert;
  }

  const campaignId = cert.certifigo_campaign_id;
  if (!campaignId) return cert;

  try {
    const certListRes = await listCertifigoCertificates({ campaignId, limit: 1 });
    const remoteCert = certListRes.data?.[0];

    if (remoteCert) {
      const isCompleted = remoteCert.status === "completed";
      const status = isCompleted ? "completed" : remoteCert.status === "failed" ? "failed" : "processing";

      await d1Query(
        `UPDATE certificates 
         SET certifigo_id = ?, verification_url = ?, pdf_url = ?, thumbnail_url = ?, signature = ?, status = ?
         WHERE id = ?`,
        [
          remoteCert.id,
          remoteCert.verificationUrl || `https://certifigoapp.com/verify/${remoteCert.id}`,
          remoteCert.pdfUrl || null,
          remoteCert.thumbnailUrl || null,
          remoteCert.signature || null,
          status,
          cert.id,
        ]
      );

      return {
        ...cert,
        certifigo_id: remoteCert.id,
        verification_url: remoteCert.verificationUrl || `https://certifigoapp.com/verify/${remoteCert.id}`,
        pdf_url: remoteCert.pdfUrl || null,
        thumbnail_url: remoteCert.thumbnailUrl || null,
        signature: remoteCert.signature || null,
        status,
      };
    }
  } catch (err) {
    console.warn("Could not sync certificate with Certifigo:", err);
  }

  return cert;
}

/**
 * Server Function: Generate and distribute a certificate via Certifigo
 */
export const generateCertifigoCertificateServerFn = createServerFn({
  method: "POST",
}).handler(async ({ data }: {
  data: {
    userId: string;
    recipientName: string;
    recipientEmail: string;
    type: "formation" | "hackathon";
    templateId?: string;
    sendEmailImmediately?: boolean;
    notifyInApp?: boolean;
  };
}) => {
  const {
    userId,
    recipientName,
    recipientEmail,
    type,
    templateId = CERTIFIGO_DEFAULT_TEMPLATES[type],
    sendEmailImmediately = true,
    notifyInApp = true,
  } = data;

  if (!userId || !recipientName || !recipientEmail) {
    return { success: false, error: "Informations du destinataire incomplètes." };
  }

  const certTypeLabel =
    type === "formation"
      ? "Certificat de formation AI Factory Accelerator"
      : "Certificat de participation au The Factory Hackathon";

  // 1. Idempotency Key
  const idempotencyKey = `cert-${type}-${userId.slice(0, 8)}-${Date.now().toString(36)}`;

  // 2. Call Certifigo API
  const issueRes = await issueCertifigoCertificate({
    name: `${certTypeLabel} — ${recipientName}`,
    templateId,
    recipientName,
    recipientEmail,
    idempotencyKey,
  });

  if (!issueRes.success || !issueRes.data) {
    return {
      success: false,
      error: issueRes.error || "Échec de l'appel à l'API Certifigo.",
    };
  }

  const { campaignId, jobId, status: initialStatus } = issueRes.data;
  const dbCertId = `cert_${campaignId.slice(-8)}_${userId.slice(0, 6)}`;
  const now = new Date().toISOString();

  // 3. Insert or replace into D1
  await d1Query(
    `INSERT INTO certificates 
      (id, user_id, recipient_name, recipient_email, type, template_id, certifigo_campaign_id, certifigo_job_id, status, issued_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       certifigo_campaign_id = excluded.certifigo_campaign_id,
       certifigo_job_id = excluded.certifigo_job_id,
       status = excluded.status,
       issued_at = excluded.issued_at`,
    [
      dbCertId,
      userId,
      recipientName,
      recipientEmail,
      type,
      templateId,
      campaignId,
      jobId,
      initialStatus || "processing",
      now,
      now,
    ]
  );

  let currentCert: DbCertificate = {
    id: dbCertId,
    user_id: userId,
    recipient_name: recipientName,
    recipient_email: recipientEmail,
    type,
    template_id: templateId,
    certifigo_campaign_id: campaignId,
    certifigo_job_id: jobId,
    status: (initialStatus as any) || "processing",
    issued_at: now,
    created_at: now,
  };

  // 4. Wait 1.8 seconds and attempt an immediate sync
  await new Promise((resolve) => setTimeout(resolve, 1800));
  currentCert = await syncCertificateWithCertifigo(currentCert);

  // 5. Send campaign email if requested and ready
  let emailSent = false;
  if (sendEmailImmediately && campaignId) {
    try {
      const sendRes = await sendCertifigoCampaignEmails(campaignId, false);
      emailSent = sendRes.success;
    } catch (e) {
      console.warn("Could not trigger Certifigo campaign email:", e);
    }
  }

  // 6. In-App Notification in D1
  if (notifyInApp) {
    try {
      const notifTitle =
        type === "formation"
          ? "🎓 Certificat de formation AI Factory Accelerator délivré !"
          : "🏆 Certificat de participation au The Factory Hackathon délivré !";

      const notifBody =
        type === "formation"
          ? `Félicitations ${recipientName} ! Votre officiel « Certificat de formation AI Factory Accelerator » a été délivré via Certifigo.`
          : `Félicitations ${recipientName} ! Votre officiel « Certificat de participation au The Factory Hackathon » a été délivré via Certifigo.`;

      await d1Query(
        `INSERT INTO notifications (id, user_id, title, body, link, read, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [
          `notif_${Date.now()}_${userId.slice(0, 4)}`,
          userId,
          notifTitle,
          notifBody,
          "/app/certificats",
          now,
        ]
      );
    } catch (notifErr) {
      console.warn("Could not insert notification:", notifErr);
    }
  }

  return {
    success: true,
    certificate: currentCert,
    campaignId,
    emailSent,
  };
});

/**
 * Server Function: Sync a certificate status by ID
 */
export const syncCertifigoCertificateServerFn = createServerFn({
  method: "POST",
}).handler(async ({ data }: { data: { certificateId: string } }) => {
  const { certificateId } = data;
  const q = await d1Query<DbCertificate>(
    `SELECT * FROM certificates WHERE id = ? LIMIT 1`,
    [certificateId]
  );

  const cert = q.results[0];
  if (!cert) {
    return { success: false, error: "Certificat introuvable." };
  }

  const updated = await syncCertificateWithCertifigo(cert);
  return { success: true, certificate: updated };
});

/**
 * Server Function: Get all certificates with auto-sync for in-flight jobs
 */
export const getCertificatesServerFn = createServerFn({
  method: "GET",
}).handler(async ({ data }: { data?: { userId?: string; type?: string } } = {}) => {
  let sql = `SELECT * FROM certificates`;
  const params: any[] = [];
  const conditions: string[] = [];

  if (data?.userId) {
    conditions.push(`user_id = ?`);
    params.push(data.userId);
  }
  if (data?.type) {
    conditions.push(`type = ?`);
    params.push(data.type);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(" AND ");
  }

  sql += ` ORDER BY created_at DESC`;

  const q = await d1Query<DbCertificate>(sql, params);
  const rows = q.results || [];

  // Check if any need syncing (processing or missing pdf_url)
  const syncedRows = await Promise.all(
    rows.map(async (row) => {
      if (row.status === "processing" || (row.status === "completed" && !row.pdf_url)) {
        return syncCertificateWithCertifigo(row);
      }
      return row;
    })
  );

  return { success: true, certificates: syncedRows };
});

/**
 * Server Function: List Certifigo templates available on account
 */
export const getCertifigoTemplatesServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const res = await listCertifigoTemplates(1, 30);
  return {
    success: res.success,
    templates: res.data || [],
    error: res.error,
  };
});

/**
 * Server Function: Manually trigger email distribution for a campaign
 */
export const sendCertifigoEmailServerFn = createServerFn({
  method: "POST",
}).handler(async ({ data }: { data: { campaignId: string; resend?: boolean } }) => {
  const res = await sendCertifigoCampaignEmails(data.campaignId, !!data.resend);
  return res;
});
