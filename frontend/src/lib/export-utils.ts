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

export function imprimerFicheOfficielle(titre: string, htmlCorps: string) {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("bestpharma:apercu-document", {
      detail: { titre, htmlCorps },
    });
    window.dispatchEvent(event);
  }
}

