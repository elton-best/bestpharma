export interface ExtractedFile {
  name: string;
  type: "image" | "pdf" | "text";
  size: number;
  content: string;
  previewUrl?: string;
  wordCount?: number;
  engine?: "paddleocr" | "tesseract" | "native";
}

async function resizeImageForOcr(file: File, maxDim = 1800): Promise<Blob | File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(file);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.9);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

/** Extracts text from Images via client-side OCR (Tesseract.js) */
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedFile> {
  const previewUrl = URL.createObjectURL(file);
  let worker: any = null;

  try {
    const { createWorker } = await import("tesseract.js");
    const processedBlob = await resizeImageForOcr(file, 1800);

    if (onProgress) onProgress(15, "Initialisation de l'OCR…");
    try {
      worker = await createWorker("fra+eng", 1, {
        logger: (m) => {
          if (onProgress) {
            if (m.status === "loading tesseract core" || m.status === "loading language traineddata") {
              onProgress(Math.round((m.progress || 0) * 35) + 15, "Chargement du modèle linguistique…");
            } else if (m.status === "recognizing text") {
              onProgress(Math.round((m.progress || 0) * 50) + 50, "Extraction du texte en cours…");
            }
          }
        },
      });
    } catch {
      // Fallback rapide sur modèle anglais standard si fra échoue
      worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && onProgress) {
            onProgress(Math.round((m.progress || 0) * 100), "Extraction du texte…");
          }
        },
      });
    }

    const ret = await worker.recognize(processedBlob);
    await worker.terminate();
    const text = (ret?.data?.text || "").trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;

    return {
      name: file.name,
      type: "image",
      size: file.size,
      content: text || "(Image reçue — aucun texte typographique détecté)",
      previewUrl,
      wordCount: words,
      engine: "tesseract",
    };
  } catch (err: any) {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
    console.warn("Client OCR notice:", err?.message || err);
    return {
      name: file.name,
      type: "image",
      size: file.size,
      content: `[Image jointe : ${file.name} (${Math.round(file.size / 1024)} Ko)]`,
      previewUrl,
      wordCount: 0,
      engine: "native",
    };
  }
}

/** Extracts text from PDF files using pdfjs-dist */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedFile> {
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).href;
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100), `Lecture page ${i}/${numPages}…`);
    }
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let lastY: number | null = null;
    let pageStr = "";

    for (const item of textContent.items as any[]) {
      if (!item.str) continue;
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageStr += "\n";
      } else if (pageStr && !pageStr.endsWith(" ") && !pageStr.endsWith("\n")) {
        pageStr += " ";
      }
      pageStr += item.str;
      lastY = item.transform ? item.transform[5] : null;
    }

    if (pageStr.trim()) {
      pageTexts.push(`--- Page ${i} ---\n${pageStr.trim()}`);
    }
  }

  const fullText = pageTexts.join("\n\n").trim();
  const words = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;

  return {
    name: file.name,
    type: "pdf",
    size: file.size,
    content: fullText || "(Document PDF sans couche texte exploitable)",
    wordCount: words,
  };
}

/** Reads plain text / markdown / code files */
export function extractTextFromDocument(file: File): Promise<ExtractedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").trim();
      const words = text ? text.split(/\s+/).length : 0;
      resolve({
        name: file.name,
        type: "text",
        size: file.size,
        content: text,
        wordCount: words,
      });
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Auto dispatcher according to MIME type and extension */
export async function processUploadFile(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const isImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "bmp"].includes(ext);
  const isPdf = file.type === "application/pdf" || ext === "pdf";

  if (isImage) {
    // Try PaddleOCR server function if configured
    try {
      if (onProgress) onProgress(20, "Analyse PaddleOCR…");
      const b64 = await fileToBase64(file);
      const { processImageWithPaddleOCR } = await import("@/lib/paddleocr.functions");
      const paddleRes = await processImageWithPaddleOCR({ data: { imageBase64: b64 } });
      if (paddleRes?.success && paddleRes.text) {
        return {
          name: file.name,
          type: "image",
          size: file.size,
          content: paddleRes.text,
          previewUrl: URL.createObjectURL(file),
          wordCount: paddleRes.wordCount,
          engine: "paddleocr",
        };
      }
    } catch {
      // Graceful fallback to client-side OCR
    }

    const tesseractRes = await extractTextFromImage(file, onProgress);
    return { ...tesseractRes, engine: "tesseract" };
  }

  if (isPdf) {
    const pdfRes = await extractTextFromPdf(file, onProgress);
    return { ...pdfRes, engine: "native" };
  }

  // Generic text, doc, markdown, code
  const docRes = await extractTextFromDocument(file);
  return { ...docRes, engine: "native" };
}
