import { createServerFn } from "@tanstack/react-start";
import { uploadToR2, deleteFromR2, getR2PublicUrl } from "./cloudflare-r2";

/**
 * Server Function: Upload binary / base64 payload to Cloudflare R2
 */
export const uploadToR2ServerFn = createServerFn({ method: "POST" })
  .validator((data: { key: string; base64: string; contentType?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const buffer = Buffer.from(data.base64, "base64");
      const res = await uploadToR2({
        key: data.key,
        data: buffer,
        contentType: data.contentType || "application/octet-stream",
      });
      return res;
    } catch (err: any) {
      return {
        success: false,
        key: data.key,
        url: "",
        error: err.message || "Failed to upload to Cloudflare R2",
      };
    }
  });

/**
 * Server Function: Delete an asset from Cloudflare R2
 */
export const deleteFromR2ServerFn = createServerFn({ method: "POST" })
  .validator((data: { key: string }) => data)
  .handler(async ({ data }) => {
    const success = await deleteFromR2(data.key);
    return { success };
  });

/**
 * Server Function: Resolve public URL for an R2 key
 */
export const getR2UrlServerFn = createServerFn({ method: "GET" })
  .validator((data: { key: string }) => data)
  .handler(async ({ data }) => {
    const url = getR2PublicUrl(data.key);
    return { url };
  });
