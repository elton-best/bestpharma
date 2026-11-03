// Certifigo API Client for AI Factory
// Official Integration with https://certifigoapp.com/docs

export const CERTIFIGO_OFFICIAL_TEMPLATES = {
  formation: {
    id: "cmvc40wyy000701pnw1ehp6g8",
    title: "Certificat de formation AI Factory Accelerator",
    format: "a4-landscape" as const,
    url: "https://certifigoapp.com/espace-de-n-e-ronald-bill/templates/cmvc40wyy000701pnw1ehp6g8",
    thumbnailUrl:
      "https://pub-44a05a62f5504f14baa96c0e4042e7c5.r2.dev/template-assets/cmt49p5b0000s0btpxrvwfh6m/import_922c8640_thumbnail.jpeg",
  },
  hackathon: {
    id: "cmvc422kv000801pn1ykpi47o",
    title: "Certificat de participation au The Factory Hackathon",
    format: "a4-landscape" as const,
    url: "https://certifigoapp.com/espace-de-n-e-ronald-bill/templates/cmvc422kv000801pn1ykpi47o",
    thumbnailUrl:
      "https://pub-44a05a62f5504f14baa96c0e4042e7c5.r2.dev/template-assets/cmt49p5b0000s0btpxrvwfh6m/import_89f06a68_thumbnail.jpeg",
  },
} as const;

export const CERTIFIGO_DEFAULT_TEMPLATES = {
  formation: CERTIFIGO_OFFICIAL_TEMPLATES.formation.id,
  hackathon: CERTIFIGO_OFFICIAL_TEMPLATES.hackathon.id,
} as const;

export type CertifigoTemplateType = keyof typeof CERTIFIGO_DEFAULT_TEMPLATES;

export interface CertifigoTemplate {
  id: string;
  title: string;
  description: string | null;
  format: "a4-portrait" | "a4-landscape";
  placeholders: string[];
  thumbnailUrl?: string;
  createdAt?: string;
}

export interface CertifigoCertificate {
  id: string;
  workspaceId?: string;
  templateId: string;
  campaignId: string;
  recipientId?: string;
  data: Record<string, any>;
  pdfUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  verificationUrl?: string;
  status: "draft" | "processing" | "completed" | "failed" | "archived";
  contentHash?: string;
  signature?: string;
  signedAt?: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  generatedAt?: string;
  template?: {
    id: string;
    title: string;
  };
  recipient?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CertifigoGenerateResponse {
  success: boolean;
  data: {
    campaignId: string;
    jobId: string;
    status: "processing" | "completed" | "failed";
    certificateCount: number;
  };
  error?: string;
}

function getApiKey(): string {
  return process.env.CERTIFIGO_API_KEY || "";
}

function getBaseUrl(): string {
  const url = process.env.CERTIFIGO_BASE_URL || "https://certifigoapp.com/api/v1";
  return url.replace(/\/+$/, "");
}

/**
 * Make an authenticated request to the Certifigo API
 */
async function certifigoFetch<T = any>(
  path: string,
  options: RequestInit & { idempotencyKey?: string } = {}
): Promise<{ success: boolean; data?: T; error?: string; status: number }> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  if (!apiKey) {
    return {
      success: false,
      error: "CERTIFIGO_API_KEY is not configured in environment.",
      status: 401,
    };
  }

  const url = `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const status = res.status;

    if (status === 204) {
      return { success: true, status };
    }

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        json?.error?.message ||
        json?.message ||
        json?.error ||
        `Certifigo request failed with status ${status}`;
      return {
        success: false,
        error: errorMsg,
        status,
        data: json,
      };
    }

    return {
      success: true,
      data: json?.data !== undefined ? json.data : json,
      status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error while calling Certifigo",
      status: 500,
    };
  }
}

/**
 * List templates available on the account
 */
export async function listCertifigoTemplates(page = 1, limit = 20) {
  return certifigoFetch<CertifigoTemplate[]>(`/templates?page=${page}&limit=${limit}`);
}

/**
 * Get details for a single template
 */
export async function getCertifigoTemplate(templateId: string) {
  return certifigoFetch<CertifigoTemplate>(`/templates/${templateId}`);
}

/**
 * Issue a single certificate via Certifigo
 * Returns 202 Accepted with campaignId and jobId.
 */
export async function issueCertifigoCertificate(params: {
  name: string;
  templateId: string;
  recipientName: string;
  recipientEmail: string;
  customFields?: Record<string, string>;
  idempotencyKey?: string;
}) {
  const idempotencyKey =
    params.idempotencyKey ||
    `cert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const body = {
    name: params.name,
    templateId: params.templateId,
    data: {
      "recipient.name": params.recipientName,
      "recipient.email": params.recipientEmail,
      ...(params.customFields || {}),
    },
  };

  return certifigoFetch<CertifigoGenerateResponse["data"]>("/certificates", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey,
  });
}

/**
 * Issue batch certificates via CSV data / array
 */
export async function issueCertifigoBatch(params: {
  name: string;
  templateId: string;
  recipients: Array<{ name: string; email: string; [key: string]: any }>;
  idempotencyKey?: string;
}) {
  const idempotencyKey =
    params.idempotencyKey ||
    `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const csvData = params.recipients.map((r) => ({
    Nom: r.name,
    Email: r.email,
  }));

  const body = {
    name: params.name,
    templateId: params.templateId,
    csvData,
    mapping: {
      Nom: "[recipient.name]",
      Email: "[recipient.email]",
    },
  };

  return certifigoFetch<CertifigoGenerateResponse["data"]>("/certificates/batch", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey,
  });
}

/**
 * Get details of a certificate by ID
 */
export async function getCertifigoCertificate(certificateId: string) {
  return certifigoFetch<CertifigoCertificate>(`/certificates/${certificateId}`);
}

/**
 * List certificates with optional campaignId or templateId filters
 */
export async function listCertifigoCertificates(params?: {
  campaignId?: string;
  templateId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.campaignId) query.set("campaignId", params.campaignId);
  if (params?.templateId) query.set("templateId", params.templateId);
  if (params?.status) query.set("status", params.status);
  query.set("page", String(params?.page || 1));
  query.set("limit", String(params?.limit || 20));

  return certifigoFetch<CertifigoCertificate[]>(`/certificates?${query.toString()}`);
}

/**
 * Get campaign state and progress
 */
export async function getCertifigoCampaign(campaignId: string) {
  return certifigoFetch<{
    id: string;
    name: string;
    status: "draft" | "processing" | "completed" | "failed" | "archived";
    generationProgress?: number;
    certificateCount?: number;
    generationError?: string | null;
  }>(`/campaigns/${campaignId}`);
}

/**
 * Trigger email delivery for all certificates in a campaign (max 50 per batch)
 */
export async function sendCertifigoCampaignEmails(
  campaignId: string,
  resend = false,
  idempotencyKey?: string
) {
  const key =
    idempotencyKey ||
    `send-${campaignId}-${Date.now()}`;

  return certifigoFetch<{
    campaignId: string;
    jobId: string;
    emailCount: number;
    status: string;
  }>(`/campaigns/${campaignId}/send`, {
    method: "POST",
    body: JSON.stringify({ resend }),
    idempotencyKey: key,
  });
}

/**
 * Download signed PDF URL
 */
export async function getCertifigoDownloadUrl(certificateId: string) {
  return certifigoFetch<{ downloadUrl: string }>(`/certificates/${certificateId}/download`);
}
