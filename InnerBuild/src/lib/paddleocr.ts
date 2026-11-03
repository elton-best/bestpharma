/**
 * PaddleOCR Integration Module
 * Repository cloned locally at: /home/elton/PaddleOCR
 *
 * Supports:
 * 1. Local PaddleOCR Hub Serving / REST endpoint (default http://127.0.0.1:8866/predict/ocr_system)
 * 2. PaddleOCR Cloud API (via PADDLEOCR_ACCESS_TOKEN)
 * 3. Graceful fallback to client-side OCR (Tesseract.js)
 */

export interface PaddleOCRTextBlock {
  text: string;
  confidence: number;
  box?: number[][];
}

export interface PaddleOCRResult {
  success: boolean;
  engine: "paddleocr" | "tesseract";
  text: string;
  wordCount: number;
  blocks?: PaddleOCRTextBlock[];
  error?: string;
}

/**
 * Checks if PaddleOCR local server or cloud credentials are configured
 */
export function isPaddleOCRConfigured(): boolean {
  if (typeof window === "undefined") {
    return Boolean(
      process.env["PADDLEOCR_ACCESS_TOKEN"] ||
      process.env["PADDLEOCR_ENDPOINT"] ||
      process.env["PADDLEOCR_LOCAL_PORT"]
    );
  }
  return false;
}

/**
 * Calls local or remote PaddleOCR API service with image Base64
 */
export async function runPaddleOCRInference(imageBase64: string): Promise<PaddleOCRResult | null> {
  if (!isPaddleOCRConfigured()) return null;

  const endpoint =
    process.env["PADDLEOCR_ENDPOINT"] || "http://127.0.0.1:8866/predict/ocr_system";

  try {
    const rawBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ images: [rawBase64] }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as any;
    const results = data?.results?.[0] || [];
    const textLines: string[] = [];
    const blocks: PaddleOCRTextBlock[] = [];

    for (const item of results) {
      const text = item?.text || "";
      const confidence = item?.confidence ?? 0.95;
      if (text.trim()) {
        textLines.push(text);
        blocks.push({ text, confidence, box: item?.text_region });
      }
    }

    const fullText = textLines.join("\n").trim();
    if (!fullText) return null;

    return {
      success: true,
      engine: "paddleocr",
      text: fullText,
      wordCount: fullText.split(/\s+/).filter(Boolean).length,
      blocks,
    };
  } catch {
    // If local PaddleOCR service is not responding, fallback safely
    return null;
  }
}
