import { createServerFn } from "@tanstack/react-start";
import { executeD1Query } from "./cloudflare-d1";

/**
 * Server Function: Suppression sécurisée et en cascade d'un challenge
 * Nettoie toutes les dépendances (évaluations, soumissions, inscriptions, jurys, résultats)
 * pour éviter les erreurs de clés étrangères et les blocages dans Cloudflare D1.
 */
export const deleteChallengeServerFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      if (!data.id) {
        return { success: false, error: "Identifiant du challenge requis." };
      }

      // Nettoyage en cascade de toutes les tables dépendantes
      const cleanupQueries = [
        "DELETE FROM challenge_daily_progress WHERE challenge_id = ?;",
        "DELETE FROM challenge_evaluations WHERE challenge_id = ?;",
        "DELETE FROM challenge_results WHERE challenge_id = ?;",
        "DELETE FROM challenge_submissions WHERE challenge_id = ?;",
        "DELETE FROM challenge_registrations WHERE challenge_id = ?;",
        "DELETE FROM challenge_jury WHERE challenge_id = ?;",
      ];

      for (const query of cleanupQueries) {
        try {
          await executeD1Query(query, [data.id]);
        } catch (subErr) {
          console.warn("[Challenge Cleanup Warning]", query, subErr);
        }
      }

      // Suppression du challenge
      const res = await executeD1Query("DELETE FROM challenges WHERE id = ?;", [data.id]);

      if (res.error) {
        return { success: false, error: res.error };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Erreur de suppression." };
    }
  });

/**
 * Server Function: Envoi d'email d'accréditation officiel à un membre du Jury
 */
export const sendJuryInvitationEmailServerFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      email: string;
      name: string;
      code: string;
      role: string;
      challengeTitle: string;
    }) => d
  )
  .handler(async ({ data }) => {
    try {
      const apiKey = process.env["RESEND_API_KEY"] || "";
      if (!apiKey) {
        return { success: false, error: "Clé Resend non configurée sur le serveur." };
      }

      const portalUrl = "https://ai-factory.eltonhounnou.me/jury-login";
      const subject = `[THE InnerBuild] Accréditation Jury Officiel — ${data.challengeTitle}`;

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#EFF7F1;color:#1F2420;margin:0;padding:40px 15px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:24px;border:1px solid #CFE3D5;padding:40px;box-shadow:0 20px 40px rgba(2,48,16,0.06);">
    <div style="text-align:center;margin-bottom:30px;">
      <span style="font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#023010;background:#E2F7E7;border:1px solid #CFE3D5;padding:6px 14px;border-radius:99px;">
        THE InnerBuild · Hackathons d'élite
      </span>
      <h1 style="font-size:24px;font-weight:900;color:#023010;margin:20px 0 6px;">Collège des Jurys Officiels</h1>
      <p style="font-size:13px;color:#5C6660;margin:0;">Évaluation rigoureuse des projets sur les 7 dimensions d'ingénierie</p>
    </div>

    <p style="font-size:15px;line-height:1.6;color:#1F2420;">
      Bonjour <strong>${data.name}</strong>,
    </p>

    <p style="font-size:14px;line-height:1.6;color:#5C6660;">
      Vous avez été officiellement accrédité(e) en tant que <strong>${data.role}</strong> pour participer à l'évaluation des livrables du challenge :
    </p>

    <div style="background:#EFF7F1;border-radius:16px;border:1px solid #CFE3D5;padding:20px;margin:25px 0;">
      <div style="font-size:11px;font-weight:700;color:#18AA38;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
        Hackathon Challenge
      </div>
      <div style="font-size:17px;font-weight:800;color:#023010;">
        ${data.challengeTitle}
      </div>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #CFE3D5;">
        <span style="font-size:12px;color:#5C6660;">Votre code d'accès personnel confidentiel :</span>
        <div style="margin-top:8px;">
          <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:24px;font-weight:900;letter-spacing:3px;color:#023010;background:#E2F7E7;border:1.5px dashed #18AA38;padding:8px 18px;border-radius:10px;display:inline-block;">
            ${data.code}
          </span>
        </div>
      </div>
    </div>

    <div style="text-align:center;margin:35px 0;">
      <a href="${portalUrl}" style="display:inline-block;background:#023010;color:#ffffff!important;padding:15px 36px;border-radius:12px;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 8px 20px rgba(2,48,16,0.25);">
        Accéder au Portail Jury & Grille 7D →
      </a>
    </div>

    <div style="background:#E8F5EB;border-radius:12px;padding:16px;border-left:4px solid #18AA38;margin:25px 0;">
      <p style="font-size:12px;color:#5C6660;margin:0;line-height:1.5;">
        <strong style="color:#023010;">Protocole d'évaluation :</strong> Connectez-vous avec votre code ci-dessus sur le portail <strong style="color:#023010;">${portalUrl}</strong> pour accéder aux dépôts GitHub, démos déployées et formulaires de notation selon les 7 dimensions officielles de la Definition of Done.
      </p>
    </div>

    <hr style="border:none;border-top:1px solid #CFE3D5;margin:30px 0;">

    <p style="font-size:12px;color:#5C6660;margin:0;text-align:center;line-height:1.5;">
      THE InnerBuild — Plateforme d'ingénierie et d'évaluation<br>
      Portail sécurisé : <a href="${portalUrl}" style="color:#18AA38;text-decoration:none;font-weight:700;">${portalUrl}</a>
    </p>
  </div>
</body>
</html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "AI Factory <leaner@ai-factory.eltonhounnou.me>",
          to: [data.email],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Resend HTTP ${res.status}: ${errText}` };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Échec d'envoi de l'email." };
    }
  });

function cleanMarkdownForEmail(text?: string): string {
  if (!text) return "";
  // Filtrer les lignes redondantes générées automatiquement
  const lines = text
    .split("\n")
    .filter((line) => {
      const lower = line.toLowerCase().trim();
      if (lower.startsWith(">") && lower.includes("code d'accès")) return false;
      if (lower.startsWith(">") && lower.includes("lien direct")) return false;
      return true;
    });

  let cleaned = lines.join("\n").trim();
  if (!cleaned) return "";

  // Convertir le markdown en html propre sans balises brutes
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ffffff;">$1</strong>');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '<em style="color:#e5e7eb;">$1</em>');
  cleaned = cleaned.replace(/`([^`]+)`/g, '<code style="font-family:\'JetBrains Mono\',monospace;background:#261814;color:#ea580c;padding:2px 6px;border-radius:4px;font-size:12px;">$1</code>');
  cleaned = cleaned.replace(/^>\s*/gm, "");
  cleaned = cleaned.replace(/^-\s+(.*)$/gm, '• $1');
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#ea580c;text-decoration:none;font-weight:700;">$1</a>');

  return cleaned.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
}

function resolvePublicImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const publicR2 = "https://pub-e1b7047c4291458ba7b14cd1ab400698.r2.dev";
  const cleanKey = url.replace(/^r2:\/?/, "").replace(/^\/+/, "");
  return `${publicR2}/${cleanKey}`;
}

function extractCleanRoomName(url: string): string {
  if (url.includes("/")) {
    const parts = url.split("/");
    const last = parts[parts.length - 1] || "";
    return last.split(/[?#]/)[0] || "AIFAC-Live-Room";
  }
  return url || "AIFAC-Live-Room";
}

/**
 * Server Function: Envoi d'invitation officielle aux intervenants d'une Keynote / Live
 */
export const sendSpeakerInvitationEmailServerFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      email: string;
      name: string;
      speakerRole?: string;
      keynoteTitle: string;
      eventAt?: string | null;
      meetingUrl: string;
      accessCode?: string;
      imageUrl?: string;
      description?: string;
    }) => d
  )
  .handler(async ({ data }) => {
    try {
      const apiKey = process.env["RESEND_API_KEY"] || "";
      if (!apiKey) {
        return { success: false, error: "Clé Resend non configurée sur le serveur." };
      }

      const subject = `Invitation d'Honneur : Keynote officielle AI Factory — ${data.keynoteTitle}`;
      const eventDateStr = data.eventAt
        ? new Date(data.eventAt).toLocaleString("fr-FR", {
            dateStyle: "full",
            timeStyle: "short",
          })
        : "À définir";

      const roomName = extractCleanRoomName(data.meetingUrl);
      const directPlatformUrl = `https://ai-factory.eltonhounnou.me/live?room=${encodeURIComponent(roomName)}&title=${encodeURIComponent(data.keynoteTitle)}${data.accessCode ? `&code=${encodeURIComponent(data.accessCode)}` : ""}&name=${encodeURIComponent(data.name)}&email=${encodeURIComponent(data.email)}&role=${encodeURIComponent(data.speakerRole || "Intervenant d'Honneur")}`;
      const resolvedPosterUrl = resolvePublicImageUrl(data.imageUrl);
      const cleanProgramHtml = cleanMarkdownForEmail(data.description);

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08090d; color: #f3f4f6; margin: 0; padding: 30px 12px; }
    h1, h2, h3, .font-heading { font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif; }
    code, .font-mono { font-family: 'JetBrains Mono', ui-monospace, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#08090d;color:#f3f4f6;margin:0;padding:30px 12px;">
  <div style="max-width:620px;margin:0 auto;background:#11131a;border-radius:24px;border:1px solid #232736;padding:36px 28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);">
    
    <!-- Header Badge -->
    <div style="text-align:center;margin-bottom:28px;">
      <span style="font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#ea580c;background:rgba(234,88,12,0.12);border:1px solid rgba(234,88,12,0.32);padding:7px 16px;border-radius:99px;display:inline-block;">
        AI FACTORY · DIRECT & KEYNOTE
      </span>
      <h1 style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:800;color:#ffffff;margin:22px 0 6px;letter-spacing:-0.5px;">Invitation d'Intervenant d'Honneur</h1>
      <p style="font-size:13px;color:#9ca3af;margin:0;">Session Live & Masterclass interactive</p>
    </div>

    <!-- Salutation -->
    <p style="font-size:15px;line-height:1.6;color:#e5e7eb;margin:0 0 14px;">
      Bonjour <strong style="color:#ffffff;">${data.name}</strong>${data.speakerRole ? ` <span style="color:#ea580c;">(${data.speakerRole})</span>` : ""},
    </p>

    <p style="font-size:14px;line-height:1.65;color:#d1d5db;margin:0 0 24px;">
      Nous avons le plaisir de vous convier en tant qu'intervenant d'honneur pour animer la keynote suivante sur la plateforme AI Factory :
    </p>

    <!-- Theme Box Card -->
    <div style="background:#171a24;border-radius:18px;border:1px solid #2a2f42;padding:24px;margin:20px 0;">
      <div style="font-size:11px;font-weight:700;color:#ea580c;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
        Thème de la Keynote
      </div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:800;color:#ffffff;line-height:1.35;">
        ${data.keynoteTitle}
      </div>

      <div style="margin-top:18px;padding-top:16px;border-top:1px solid #242838;display:grid;gap:12px;">
        <div style="font-size:13px;color:#cbd5e1;">
          <strong style="color:#ffffff;">Date & Heure :</strong> <span style="color:#f8fafc;font-weight:600;">${eventDateStr}</span>
        </div>
        <div style="font-size:13px;color:#cbd5e1;">
          <strong style="color:#ffffff;">Salon Live de conférence :</strong> <a href="${directPlatformUrl}" style="color:#ea580c;text-decoration:none;font-weight:700;">ai-factory.eltonhounnou.me/live</a>
        </div>
        ${data.accessCode ? `
        <div style="font-size:13px;color:#cbd5e1;">
          <strong style="color:#ffffff;">Code d'accès sécurisé :</strong> <span style="font-family:'JetBrains Mono',monospace;background:#281812;color:#ea580c;border:1px solid #ea580c55;padding:3px 9px;border-radius:6px;font-weight:700;">${data.accessCode}</span>
        </div>` : ""}
      </div>
    </div>

    <!-- Official Poster Image if provided -->
    ${resolvedPosterUrl ? `
    <div style="text-align:center;margin:26px 0;">
      <p style="font-size:11px;color:#9ca3af;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Affiche officielle de l'événement</p>
      <img src="${resolvedPosterUrl}" alt="Affiche officielle de la Keynote" style="max-width:100%;height:auto;border-radius:16px;border:1px solid #2e344a;box-shadow:0 12px 28px rgba(0,0,0,0.5);display:block;margin:0 auto;">
    </div>
    ` : ""}

    <!-- Program and Context if provided -->
    ${cleanProgramHtml ? `
    <div style="margin:24px 0;background:#0d0e14;border-radius:14px;padding:20px;border:1px solid #1f2332;">
      <div style="font-size:12px;font-weight:700;color:#ea580c;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">
        Programme & Déroulé de la session
      </div>
      <div style="font-size:13px;color:#cbd5e1;line-height:1.65;">
        ${cleanProgramHtml}
      </div>
    </div>
    ` : ""}

    <!-- Guidelines box -->
    <div style="background:#0d0e14;border-radius:16px;padding:20px;border-left:4px solid #ea580c;margin:26px 0;">
      <h3 style="font-size:14px;color:#ffffff;margin:0 0 10px;font-weight:800;font-family:'Space Grotesk',sans-serif;">
        Recommandations pour votre intervention :
      </h3>
      <ul style="font-size:13px;color:#cbd5e1;margin:0;padding-left:18px;line-height:1.7;">
        <li>Nous vous invitons à préparer vos slides, démo de code en direct ou retours d'expérience terrain.</li>
        <li>Merci de vous connecter <strong style="color:#ffffff;">5 à 10 minutes avant le direct</strong> pour calibrer le micro, la caméra et le partage d'écran avec l'équipe technique.</li>
        <li>Votre accès est directement intégré et reconnu sur notre plateforme via le lien ci-dessous, sans aucune friction d'inscription pour vos auditeurs.</li>
      </ul>
    </div>

    <!-- Main Call to Action Button to our platform -->
    <div style="text-align:center;margin:34px 0 24px;">
      <a href="${directPlatformUrl}" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#c2410c);color:#ffffff!important;padding:16px 38px;border-radius:14px;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 10px 24px rgba(234,88,12,0.35);letter-spacing:0.2px;">
        Ouvrir mon Salon Live sur AI Factory →
      </a>
      <p style="font-size:11px;color:#6b7280;margin:10px 0 0;">
        Accès direct et automatique · Salle privative plein écran
      </p>
    </div>

    <hr style="border:none;border-top:1px solid #232736;margin:30px 0 20px;">

    <p style="font-size:13px;color:#9ca3af;margin:0 0 4px;line-height:1.5;">
      Bien cordialement,<br>
      <strong style="color:#ffffff;">Elton Hounnou</strong><br>
      <span style="font-size:12px;color:#6b7280;">Lead Architect & Fondateur · AI Factory</span>
    </p>
  </div>
</body>
</html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "AI Factory <leaner@ai-factory.eltonhounnou.me>",
          to: [data.email],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Resend HTTP ${res.status}: ${errText}` };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Échec d'envoi de l'invitation intervenant." };
    }
  });
