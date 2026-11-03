// Cloudflare R2 Client & Storage Helper for AI Factory
// Zero egress fees, high-speed CDN delivery for PDFs, images, and user assets.

const CLOUDFLARE_ACCOUNT_ID = process.env["CLOUDFLARE_ACCOUNT_ID"] || "";
const CLOUDFLARE_API_TOKEN = process.env["CLOUDFLARE_API_TOKEN"] || "";
const R2_BUCKET_NAME = process.env["CLOUDFLARE_R2_BUCKET"] || "aifactory";
const R2_PUBLIC_BASE_URL = process.env["CLOUDFLARE_R2_PUBLIC_URL"] || (typeof process !== "undefined" ? (process.env as any).VITE_R2_PUBLIC_URL : "") || "";

export interface R2UploadResult {
  success: boolean;
  key: string;
  url: string;
  size?: number;
  error?: string;
}

/**
 * Upload a binary file / buffer / blob to Cloudflare R2
 */
export async function uploadToR2({
  key,
  data,
  contentType = "application/octet-stream",
}: {
  key: string;
  data: Buffer | Uint8Array | ArrayBuffer | Blob | string;
  contentType?: string;
}): Promise<R2UploadResult> {
  try {
    const cleanKey = key.replace(/^\/+/, "");
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${R2_BUCKET_NAME}/objects/${encodeURIComponent(cleanKey)}`;

    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": contentType,
      },
      body: data as any,
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      const errMsg = result.errors?.[0]?.message || `Upload failed with status ${res.status}`;
      return { success: false, key, url: "", error: errMsg };
    }

    const publicUrl = getR2PublicUrl(cleanKey);
    return {
      success: true,
      key: cleanKey,
      url: publicUrl,
      size: Number(result.result?.size || 0),
    };
  } catch (err: any) {
    return { success: false, key, url: "", error: err.message || "R2 network error" };
  }
}

/**
 * Get public URL for an R2 object
 */
export function getR2PublicUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, "");
  if (R2_PUBLIC_BASE_URL) {
    return `${R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${cleanKey}`;
  }
  // Fallback endpoint via direct Cloudflare R2 object route or worker proxy
  return `/api/r2/${cleanKey}`;
}

/**
 * Delete an object from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    const cleanKey = key.replace(/^\/+/, "");
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${R2_BUCKET_NAME}/objects/${encodeURIComponent(cleanKey)}`;

    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    });
    const result = await res.json();
    return result.success === true;
  } catch {
    return false;
  }
}
