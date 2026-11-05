/**
 * Utilitaires universels d'export et de téléchargement de documents pour BestPharma
 */

export function telechargerTexte(contenu: string, nomFichier: string, mime: string = "text/plain;charset=utf-8") {
  const blob = new Blob([contenu], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ColonneExportCsv {
  cle: string;
  label?: string;
  entete?: string;
}

export function telechargerCsv(
  lignes: Record<string, any>[],
  nomFichier: string,
  colonnes?: ColonneExportCsv[]
) {
  if (lignes.length === 0) return;

  const cols: ColonneExportCsv[] = colonnes || Object.keys(lignes[0]).map((k) => ({ cle: k, label: k }));
  const entete = cols.map((c) => `"${(c.label || c.entete || c.cle).replace(/"/g, '""')}"`).join(";");

  const corps = lignes
    .map((ligne) =>
      cols
        .map((c) => {
          const val = ligne[c.cle] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(";")
    )
    .join("\r\n");

  const contenu = `\uFEFF${entete}\r\n${corps}`;
  telechargerTexte(contenu, nomFichier.endsWith(".csv") ? nomFichier : `${nomFichier}.csv`, "text/csv;charset=utf-8;");
}

export function imprimerFicheOfficielle(titre: string, htmlCorps: string, nomFichier?: string) {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("bestpharma:apercu-document", {
      detail: { titre, htmlCorps, nomFichier },
    });
    window.dispatchEvent(event);
  }
}

/**
 * Génère et télécharge un document directement au format PDF réel (.pdf).
 * Fonctionne avec un élément HTML ou une chaîne HTML brute.
 */
export async function telechargerHtmlEnPdf(
  htmlOuElement: string | HTMLElement,
  nomFichier: string,
  options: {
    orientation?: "portrait" | "landscape";
    qualite?: number;
  } = {}
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  let container: HTMLDivElement | null = null;
  try {
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");

    let targetElement: HTMLElement;

    if (typeof htmlOuElement === "string") {
      container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = options.orientation === "landscape" ? "1120px" : "800px";
      container.style.background = "#ffffff";
      container.style.color = "#111111";
      container.style.padding = "24px";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
      container.innerHTML = htmlOuElement;
      document.body.appendChild(container);
      targetElement = container;
    } else {
      targetElement = htmlOuElement;
    }

    // Capture haute résolution
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: options.orientation === "landscape" ? 1120 : 800,
    });

    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }

    const orientation = options.orientation || "portrait";
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = orientation === "landscape" ? 297 : 210;
    const pdfHeight = orientation === "landscape" ? 210 : 297;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Hauteur proportionnelle d'une page A4 en pixels canvas
    const pageCanvasHeight = Math.floor(canvasWidth * (pdfHeight / pdfWidth));
    const totalPages = Math.ceil(canvasHeight / pageCanvasHeight) || 1;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      const sourceY = page * pageCanvasHeight;
      const sliceHeight = Math.min(pageCanvasHeight, canvasHeight - sourceY);

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvasWidth;
      sliceCanvas.height = pageCanvasHeight;

      const sliceCtx = sliceCanvas.getContext("2d");
      if (sliceCtx) {
        sliceCtx.fillStyle = "#ffffff";
        sliceCtx.fillRect(0, 0, canvasWidth, pageCanvasHeight);
        sliceCtx.drawImage(
          canvas,
          0,
          sourceY,
          canvasWidth,
          sliceHeight,
          0,
          0,
          canvasWidth,
          sliceHeight
        );
      }

      const sliceImgData = sliceCanvas.toDataURL("image/jpeg", options.qualite || 0.95);
      pdf.addImage(sliceImgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    }

    const cleanName = nomFichier.endsWith(".pdf") ? nomFichier : `${nomFichier}.pdf`;
    pdf.save(cleanName);
    return true;
  } catch (error) {
    console.error("Erreur génération PDF:", error);
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    return false;
  }
}

