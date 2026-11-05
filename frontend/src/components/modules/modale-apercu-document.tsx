import { useEffect, useRef, useState } from "react";
import { Printer, Check, Loader2, FileDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { telechargerHtmlEnPdf } from "@/lib/export-utils";
import { toast } from "sonner";

export interface DocumentApercuPayload {
  titre: string;
  htmlCorps: string;
  nomFichier?: string;
}

export function ModaleApercuDocument() {
  const [ouvert, setOuvert] = useState(false);
  const [doc, setDoc] = useState<DocumentApercuPayload | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [copie, setCopie] = useState(false);
  const [enCoursPdf, setEnCoursPdf] = useState(false);

  useEffect(() => {
    const handleApercu = (event: CustomEvent<DocumentApercuPayload>) => {
      if (event.detail) {
        setDoc(event.detail);
        setOuvert(true);
      }
    };

    window.addEventListener("bestpharma:apercu-document" as any, handleApercu as any);
    return () => {
      window.removeEventListener("bestpharma:apercu-document" as any, handleApercu as any);
    };
  }, []);

  const fullHtml = doc
    ? `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>${doc.titre} — BestPharma</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #111; line-height: 1.5; background: #fff; }
        .en-tete { border-bottom: 2px solid #0F3B27; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; }
        .brand { font-size: 20px; font-weight: 900; color: #0F3B27; letter-spacing: 0.5px; }
        .subtitle { font-size: 11px; color: #666; margin-top: 2px; }
        .titre-doc { font-size: 16px; font-weight: bold; margin: 12px 0; color: #0F3B27; }
        .date { font-size: 11px; color: #555; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
        th, td { border: 1px solid #ddd; padding: 7px 9px; text-align: left; }
        th { background: #F7F9F7; font-weight: bold; color: #0F3B27; }
        .tampon { margin-top: 30px; display: flex; justify-content: space-between; }
        .visa-box { border: 1px dashed #999; border-radius: 6px; width: 200px; height: 80px; padding: 8px; font-size: 10px; color: #555; }
        @media print {
          body { margin: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="en-tete">
        <div>
          <div class="brand">+ BESTPHARMA</div>
          <div class="subtitle">Système Intégré de Gestion Officinale & Qualité BPD Bénin</div>
        </div>
        <div class="date">
          Édité le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <div class="titre-doc">${doc.titre}</div>
      ${doc.htmlCorps}
      <div class="tampon">
        <div class="visa-box">Visa Pharmacien Titulaire / Responsable :</div>
        <div class="visa-box">Date & Émargement Officine :</div>
      </div>
    </body>
    </html>
  `
    : "";

  const telechargerPdf = async () => {
    if (!doc || enCoursPdf) return;
    setEnCoursPdf(true);
    const cleanTitle = (doc.nomFichier || doc.titre).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const nomPdf = `${cleanTitle}.pdf`;

    try {
      // Priorité 1 : capturer directement le contenu rendu de l'iframe si accessible
      const source = iframeRef.current?.contentDocument?.body || fullHtml;
      const succes = await telechargerHtmlEnPdf(source, nomPdf);
      if (succes) {
        toast.success(`Document PDF téléchargé : ${nomPdf}`);
        setCopie(true);
        setTimeout(() => setCopie(false), 2500);
      } else {
        toast.info("Impression système ouverte (choisir 'Enregistrer au format PDF')");
        imprimerDirectement();
      }
    } catch (e) {
      console.error("Erreur téléchargement PDF :", e);
      toast.error("Échec du téléchargement direct, impression lancée...");
      imprimerDirectement();
    } finally {
      setEnCoursPdf(false);
    }
  };

  const imprimerDirectement = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogContent className="max-w-4xl w-[94vw] h-[88vh] bg-[#F7F9F7] border border-[#CFF1D2] rounded-2xl shadow-2xl flex flex-col p-0 overflow-hidden">
        {/* BARRE D'ACTIONS DU HAUT */}
        <DialogHeader className="px-5 py-3.5 bg-white border-b border-[#CFF1D2] flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-[#0F3B27] text-white flex items-center justify-center font-black text-sm">
              +
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-bold text-[#0F3B27] truncate">
                {doc?.titre || "Aperçu du document"}
              </DialogTitle>
              <p className="text-[11px] text-[#475C50]">
                Prévisualisation conforme · Téléchargement PDF certifié ou impression
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={telechargerPdf}
              disabled={enCoursPdf}
              size="sm"
              className="bg-[#0F3B27] hover:bg-[#164E35] text-[#92FF5F] text-xs font-bold gap-1.5 h-8 rounded-lg shadow-sm"
            >
              {enCoursPdf ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : copie ? (
                <Check className="size-3.5" />
              ) : (
                <FileDown className="size-3.5" />
              )}
              <span>{enCoursPdf ? "Génération PDF…" : copie ? "PDF Téléchargé !" : "Télécharger PDF"}</span>
            </Button>
            <Button
              onClick={imprimerDirectement}
              variant="outline"
              size="sm"
              className="border-[#CFF1D2] text-[#0F3B27] text-xs font-semibold gap-1.5 h-8 rounded-lg hover:bg-[#CFF1D2]/30"
            >
              <Printer className="size-3.5" />
              <span>Imprimer / PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* CADRE DOCUMENT DE PRÉVISUALISATION */}
        <div className="flex-1 p-3 sm:p-6 overflow-auto flex justify-center bg-[#EBF3EC]">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg border border-[#CFF1D2]/60 overflow-hidden flex flex-col min-h-full">
            <iframe
              ref={iframeRef}
              srcDoc={fullHtml}
              title={doc?.titre || "Document"}
              className="w-full flex-1 border-0 min-h-[600px]"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
