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

export function telechargerCsv(
  lignes: Record<string, any>[],
  nomFichier: string,
  colonnes?: { cle: string; label: string }[]
) {
  if (lignes.length === 0) return;

  const cols = colonnes || Object.keys(lignes[0]).map((k) => ({ cle: k, label: k }));
  const entete = cols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(";");

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
  const fenetre = window.open("", "_blank");
  if (!fenetre) {
    window.print();
    return;
  }

  fenetre.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>${titre} — BestPharma</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 30px; color: #111; }
        .en-tete { border-bottom: 2px solid #0F3B27; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
        .brand { font-size: 20px; font-weight: 900; color: #0F3B27; letter-spacing: 0.5px; }
        .subtitle { font-size: 11px; color: #666; margin-top: 3px; }
        .titre-doc { font-size: 16px; font-weight: bold; margin: 15px 0; color: #0F3B27; }
        .date { font-size: 12px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
        th { background: #F7F9F7; font-weight: bold; color: #0F3B27; }
        .tampon { margin-top: 40px; display: flex; justify-content: space-between; }
        .visa-box { border: 1px dashed #999; border-radius: 8px; width: 220px; height: 90px; padding: 10px; font-size: 11px; color: #555; }
        @media print {
          body { margin: 15px; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="en-tete">
        <div>
          <div class="brand">BESTPHARMA OFFICINE</div>
          <div class="subtitle">Conformité BPD ABMed · République du Bénin</div>
        </div>
        <div style="text-align: right;">
          <div class="date">Édité le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style="font-size: 10px; color: #888;">Fuseau : Africa/Porto-Novo</div>
        </div>
      </div>
      <div class="titre-doc">${titre}</div>
      <div>${htmlCorps}</div>
      <div class="tampon">
        <div class="visa-box">Visa de l'Opérateur / Agent :<br><br>Date & Signature :</div>
        <div class="visa-box">Visa Pharmacien Titulaire / RMQ :<br><br>Date & Signature BPD-C10 :</div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  fenetre.document.close();
}
