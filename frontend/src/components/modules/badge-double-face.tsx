import { useState } from "react";
import { QrCode, Printer, ShieldCheck, Sparkles, Building2, Phone, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { imprimerFicheOfficielle } from "@/lib/export-utils";

export interface EmployeBadgeData {
  id: string;
  nom_complet: string;
  poste: string;
  matricule?: string | null;
  photo_url?: string | null;
  telephone?: string | null;
  email?: string | null;
  date_embauche?: string | null;
}

interface BadgeDoubleFaceProps {
  employe: EmployeBadgeData;
  officineNom?: string;
  officineTelephone?: string;
  className?: string;
}

/**
 * Fonction universelle d'impression du badge 2 faces (Recto + Verso)
 * Format standard CR80 (54mm x 86mm) avec ligne de pliage centrale
 */
export function imprimerBadgeDoubleFace(
  employe: EmployeBadgeData,
  officineNom: string = "PHARMACIE DE L'ÉTOILE",
  officineTelephone: string = "+229 21 31 10 20"
) {
  const matricule = employe.matricule || `BP-${employe.id.slice(0, 6).toUpperCase()}`;
  const posteLisible = employe.poste ? employe.poste.replace(/_/g, " ").toUpperCase() : "COLLABORATEUR";
  const estPharmacien = ["promoteur", "pharmacien_titulaire", "pharmacien_adjoint", "rmq"].includes(employe.poste);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`BESTPHARMA_BADGE:${matricule}`)}`;

  const html = `
    <style>
      @media print {
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      .badge-planche {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .notice-impression {
        text-align: center;
        font-size: 11px;
        color: #475C50;
        background: #F7F9F7;
        border: 1px dashed #0F3B27;
        padding: 8px 16px;
        border-radius: 8px;
        max-width: 500px;
      }
      .badge-duo-container {
        display: flex;
        justify-content: center;
        gap: 20px;
        position: relative;
        padding: 10px;
      }
      .badge-card {
        width: 60mm;
        height: 94mm;
        border-radius: 14px;
        background: linear-gradient(165deg, #0A2417 0%, #0F3B27 50%, #061A10 100%);
        color: #FFFFFF;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 14px 12px;
        box-sizing: border-box;
        border: 1px solid #1E5C3D;
      }
      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-35deg);
        font-size: 34px;
        font-weight: 900;
        color: rgba(255,255,255,0.035);
        pointer-events: none;
        white-space: nowrap;
        letter-spacing: 2px;
      }
      .lanyard-slot {
        width: 32px;
        height: 6px;
        border-radius: 6px;
        background: #04100A;
        border: 1px solid rgba(255,255,255,0.25);
        margin: 0 auto 6px auto;
      }
      .badge-header {
        text-align: center;
        border-bottom: 1px solid rgba(146, 255, 95, 0.25);
        padding-bottom: 5px;
      }
      .badge-brand {
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 1.5px;
        color: #92FF5F;
      }
      .badge-subbrand {
        font-size: 7.5px;
        letter-spacing: 0.5px;
        color: #CFF1D2;
        text-transform: uppercase;
        margin-top: 1px;
      }
      .photo-frame {
        width: 65px;
        height: 65px;
        border-radius: 12px;
        border: 2px solid #92FF5F;
        background: #04100A;
        margin: 6px auto;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      }
      .photo-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .photo-placeholder {
        font-size: 26px;
        font-weight: 900;
        color: #92FF5F;
      }
      .nom-collaborateur {
        font-size: 11px;
        font-weight: 800;
        text-align: center;
        color: #FFFFFF;
        line-height: 1.2;
        margin-top: 4px;
        text-transform: uppercase;
      }
      .poste-pill {
        display: inline-block;
        background: #92FF5F;
        color: #0F3B27;
        font-size: 8px;
        font-weight: 900;
        padding: 2px 8px;
        border-radius: 20px;
        margin: 3px auto 0 auto;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .matricule-box {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(146, 255, 95, 0.3);
        border-radius: 6px;
        padding: 3px 6px;
        font-family: monospace;
        font-size: 8.5px;
        font-weight: 700;
        text-align: center;
        color: #CFF1D2;
        margin-top: 4px;
      }
      .badge-footer {
        font-size: 7px;
        text-align: center;
        color: #A3E7B2;
        border-top: 1px solid rgba(255,255,255,0.1);
        padding-top: 4px;
      }
      .qr-box {
        background: #FFFFFF;
        border-radius: 10px;
        padding: 8px;
        margin: 6px auto;
        width: 115px;
        height: 115px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }
      .qr-box img {
        width: 100px;
        height: 100px;
        display: block;
      }
      .scan-instruction {
        font-size: 8px;
        font-weight: 800;
        color: #92FF5F;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .security-text {
        font-size: 6.8px;
        color: #CFF1D2;
        text-align: center;
        line-height: 1.3;
        margin: 4px 0;
      }
      .barcode-fake {
        letter-spacing: 3px;
        font-family: monospace;
        font-size: 11px;
        color: #92FF5F;
        text-align: center;
      }
      .fold-divider {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #475C50;
        font-size: 9px;
        font-weight: bold;
      }
      .fold-line {
        height: 100%;
        border-left: 1px dashed #0F3B27;
        margin: 4px 0;
      }
    </style>

    <div class="badge-planche">
      <div class="notice-impression">
        <strong>Carte Professionnelle Double Face — Format CR80</strong><br>
        Découpez le contour puis pliez sur l'axe central pour insérer dans votre porte-badge ou plastifier en recto-verso.
      </div>

      <div class="badge-duo-container">
        <!-- ==================== FACE RECTO ==================== -->
        <div class="badge-card">
          <div class="watermark">BESTPHARMA</div>
          <div>
            <div class="lanyard-slot"></div>
            <div class="badge-header">
              <div class="badge-brand">BESTPHARMA</div>
              <div class="badge-subbrand">${officineNom}</div>
            </div>
          </div>

          <div style="text-align: center; margin: 4px 0;">
            <div class="photo-frame">
              ${
                employe.photo_url
                  ? `<img src="${employe.photo_url}" alt="${employe.nom_complet}" />`
                  : `<div class="photo-placeholder">${employe.nom_complet.charAt(0)}</div>`
              }
            </div>
            <div class="nom-collaborateur">${employe.nom_complet}</div>
            <div class="poste-pill">${posteLisible}</div>
            ${
              estPharmacien
                ? '<div style="font-size: 7.5px; color: #92FF5F; font-weight: bold; margin-top: 2px;">INSCRIT À L\'ORDRE · SECTION B</div>'
                : ""
            }
          </div>

          <div>
            <div class="matricule-box">
              ID : ${matricule}
            </div>
            <div class="badge-footer">
              République du Bénin · Guide BPD ABMed<br>
              Valide Année 2026
            </div>
          </div>
        </div>

        <!-- SÉPARATEUR DE PLIAGE -->
        <div class="fold-divider">
          <span>▲ PLIER</span>
          <div class="fold-line"></div>
          <span>▼ ICI</span>
        </div>

        <!-- ==================== FACE VERSO ==================== -->
        <div class="badge-card">
          <div class="watermark">POINTAGE</div>
          <div>
            <div class="lanyard-slot"></div>
            <div class="badge-header">
              <div class="scan-instruction">ÉMARGEMENT & POINTAGE H24</div>
              <div class="badge-subbrand">Borne Tactile Officine</div>
            </div>
          </div>

          <div style="text-align: center;">
            <div class="qr-box">
              <img src="${qrUrl}" alt="QR Pointage" />
            </div>
            <div style="font-size: 7.5px; font-weight: 700; color: #92FF5F; margin-top: 2px;">
              SCAN INSTANTANÉ SANS CONTACT
            </div>
          </div>

          <div>
            <div class="security-text">
              Ce badge est strictement personnel et incessible.<br>
              En cas de perte, rapporter à :<br>
              <strong>${officineNom}</strong> · Tél. ${officineTelephone}
            </div>
            <div class="barcode-fake">||| | |||| | ||| |||| |</div>
            <div class="badge-footer">
              Art. 1.11 Guide BPD · Horodatage Certifié
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  imprimerFicheOfficielle(`Badge Double Face - ${employe.nom_complet}`, html);
}

/**
 * Composant Carte Badge Recto (Face Avant)
 */
export function BadgeFaceRecto({
  employe,
  officineNom = "PHARMACIE DE L'ÉTOILE",
}: {
  employe: EmployeBadgeData;
  officineNom?: string;
}) {
  const matricule = employe.matricule || `BP-${employe.id.slice(0, 6).toUpperCase()}`;
  const posteLisible = employe.poste ? employe.poste.replace(/_/g, " ").toUpperCase() : "COLLABORATEUR";
  const estPharmacien = ["promoteur", "pharmacien_titulaire", "pharmacien_adjoint", "rmq"].includes(employe.poste);

  return (
    <div className="relative w-[240px] sm:w-[260px] h-[390px] sm:h-[410px] rounded-2xl bg-gradient-to-b from-[#0A2417] via-[#0F3B27] to-[#061A10] text-white p-4 flex flex-col justify-between border-2 border-[#1E5C3D] shadow-2xl overflow-hidden select-none">
      {/* Simulation de cordon lanyard & attache métallique au-dessus */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <div className="w-10 h-3 bg-[#05130C] border border-white/20 rounded-full shadow-inner mt-2" />
      </div>

      {/* Watermark en arrière-plan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-white/[0.04] text-5xl font-black tracking-widest pointer-events-none whitespace-nowrap">
        BESTPHARMA
      </div>

      {/* En-tête du badge */}
      <div className="pt-4 text-center border-b border-[#92FF5F]/20 pb-2 relative z-10">
        <div className="flex items-center justify-center gap-1.5 text-[#92FF5F] font-black text-sm tracking-widest">
          <Sparkles className="size-3.5" />
          <span>BESTPHARMA</span>
        </div>
        <p className="text-[10px] text-[#CFF1D2] font-semibold tracking-wider uppercase mt-0.5">
          {officineNom}
        </p>
      </div>

      {/* Photo & Identité */}
      <div className="flex flex-col items-center text-center my-auto relative z-10">
        <div className="relative size-24 rounded-2xl border-2 border-[#92FF5F] bg-[#04100A] p-0.5 shadow-lg overflow-hidden flex items-center justify-center">
          {employe.photo_url ? (
            <img
              src={employe.photo_url}
              alt={employe.nom_complet}
              className="size-full object-cover rounded-xl"
            />
          ) : (
            <span className="text-[#92FF5F] font-black text-3xl">
              {employe.nom_complet.charAt(0)}
            </span>
          )}
        </div>

        <h3 className="font-display font-extrabold text-sm sm:text-base text-white mt-3 uppercase tracking-wide leading-tight px-2">
          {employe.nom_complet}
        </h3>

        <div className="mt-1.5">
          <span className="inline-block bg-[#92FF5F] text-[#0F3B27] font-black text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {posteLisible}
          </span>
        </div>

        {estPharmacien && (
          <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-[#92FF5F]">
            <Award className="size-3" />
            <span>ORDRE DES PHARMACIENS · SEC. B</span>
          </div>
        )}
      </div>

      {/* Pied de carte avec Matricule */}
      <div className="border-t border-white/10 pt-2 text-center relative z-10 space-y-1">
        <div className="bg-white/10 border border-[#92FF5F]/30 rounded-lg py-1 px-2 font-mono text-[11px] font-bold text-[#CFF1D2]">
          MATRICULE : <span className="text-white">{matricule}</span>
        </div>
        <p className="text-[8.5px] text-[#A3E7B2] font-medium tracking-wide">
          République du Bénin · Carte Officine 2026
        </p>
      </div>
    </div>
  );
}

/**
 * Composant Carte Badge Verso (Face Arrière)
 */
export function BadgeFaceVerso({
  employe,
  officineNom = "PHARMACIE DE L'ÉTOILE",
  officineTelephone = "+229 21 31 10 20",
}: {
  employe: EmployeBadgeData;
  officineNom?: string;
  officineTelephone?: string;
}) {
  const matricule = employe.matricule || `BP-${employe.id.slice(0, 6).toUpperCase()}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`BESTPHARMA_BADGE:${matricule}`)}`;

  return (
    <div className="relative w-[240px] sm:w-[260px] h-[390px] sm:h-[410px] rounded-2xl bg-gradient-to-b from-[#0A2417] via-[#0F3B27] to-[#061A10] text-white p-4 flex flex-col justify-between border-2 border-[#1E5C3D] shadow-2xl overflow-hidden select-none">
      {/* Simulation de cordon lanyard */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <div className="w-10 h-3 bg-[#05130C] border border-white/20 rounded-full shadow-inner mt-2" />
      </div>

      {/* Watermark en arrière-plan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-white/[0.04] text-5xl font-black tracking-widest pointer-events-none whitespace-nowrap">
        POINTAGE
      </div>

      {/* En-tête verso */}
      <div className="pt-4 text-center border-b border-[#92FF5F]/20 pb-2 relative z-10">
        <p className="text-[11px] font-black text-[#92FF5F] tracking-widest uppercase">
          POINTAGE & ÉMARGEMENT H24
        </p>
        <p className="text-[9px] text-[#CFF1D2] font-semibold tracking-wider uppercase mt-0.5">
          Borne d'Entrée & Tablette
        </p>
      </div>

      {/* QR Code de pointage haute lisibilité */}
      <div className="flex flex-col items-center text-center my-auto relative z-10">
        <div className="bg-white p-2.5 rounded-xl border-2 border-[#92FF5F] shadow-xl">
          <img
            src={qrUrl}
            alt="QR Pointage"
            className="size-28 sm:size-32 object-contain"
          />
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-[#92FF5F] uppercase tracking-wider">
          <ShieldCheck className="size-3.5" />
          <span>Scanner pour Pointer</span>
        </div>
      </div>

      {/* Consignes & Mentions légales */}
      <div className="border-t border-white/10 pt-2 text-center relative z-10 space-y-1">
        <p className="text-[8px] text-[#CFF1D2] leading-tight">
          Ce badge est personnel et incessible.<br />
          En cas de perte, contacter : <strong>{officineTelephone}</strong>
        </p>
        <div className="text-[10px] font-mono tracking-widest text-[#92FF5F]">
          ||| | |||| | ||| |||| |
        </div>
        <p className="text-[8px] text-[#A3E7B2] font-semibold">
          Art. 1.11 Guide BPD · BestPharma Bénin
        </p>
      </div>
    </div>
  );
}

/**
 * Aperçu Interactif Double Face avec Lanyard et Switch Recto/Verso
 */
export function BadgeDoubleFace({
  employe,
  officineNom,
  officineTelephone,
  className = "",
}: BadgeDoubleFaceProps) {
  const [vue, setVue] = useState<"les-deux" | "recto" | "verso">("les-deux");

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Contrôle de bascule de vue */}
      <div className="inline-flex rounded-xl bg-[#F7F9F7] p-1 border border-[#CFF1D2] text-xs font-semibold gap-1">
        <button
          type="button"
          onClick={() => setVue("les-deux")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            vue === "les-deux"
              ? "bg-[#0F3B27] text-[#92FF5F] shadow-sm font-bold"
              : "text-[#475C50] hover:text-[#0F3B27]"
          }`}
        >
          Les 2 faces (Recto & Verso)
        </button>
        <button
          type="button"
          onClick={() => setVue("recto")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            vue === "recto"
              ? "bg-[#0F3B27] text-[#92FF5F] shadow-sm font-bold"
              : "text-[#475C50] hover:text-[#0F3B27]"
          }`}
        >
          Face Avant (Recto)
        </button>
        <button
          type="button"
          onClick={() => setVue("verso")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            vue === "verso"
              ? "bg-[#0F3B27] text-[#92FF5F] shadow-sm font-bold"
              : "text-[#475C50] hover:text-[#0F3B27]"
          }`}
        >
          Face Arrière (Verso)
        </button>
      </div>

      {/* Zone d'affichage des badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 p-4 bg-gradient-to-b from-[#F7FBF8] to-[#E8F8EC] rounded-2xl border border-[#CFF1D2] shadow-inner">
        {(vue === "les-deux" || vue === "recto") && (
          <div className="flex flex-col items-center space-y-2">
            <span className="text-[11px] font-bold text-[#0F3B27] uppercase tracking-wider">
              Face Avant (Recto)
            </span>
            <BadgeFaceRecto employe={employe} officineNom={officineNom} />
          </div>
        )}

        {(vue === "les-deux" || vue === "verso") && (
          <div className="flex flex-col items-center space-y-2">
            <span className="text-[11px] font-bold text-[#0F3B27] uppercase tracking-wider">
              Face Arrière (Verso)
            </span>
            <BadgeFaceVerso
              employe={employe}
              officineNom={officineNom}
              officineTelephone={officineTelephone}
            />
          </div>
        )}
      </div>

      {/* Bouton d'impression haute définition */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <Button
          onClick={() => imprimerBadgeDoubleFace(employe, officineNom, officineTelephone)}
          className="bg-[#0F3B27] hover:bg-[#164E35] text-[#92FF5F] font-black text-xs gap-2 rounded-xl h-10 px-5 shadow-md"
        >
          <Printer className="size-4" />
          Imprimer le Badge 2 Faces (PVC / A4)
        </Button>
      </div>
    </div>
  );
}

/**
 * Modale dédiée pour visualiser et imprimer le Badge Double Face
 */
export function ModaleBadgeDoubleFace({
  employe,
  ouvert,
  onFermer,
  officineNom,
  officineTelephone,
}: {
  employe: EmployeBadgeData | null;
  ouvert: boolean;
  onFermer: () => void;
  officineNom?: string;
  officineTelephone?: string;
}) {
  if (!employe) return null;

  return (
    <Dialog open={ouvert} onOpenChange={(open) => !open && onFermer()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-white border border-[#CFF1D2] rounded-2xl shadow-2xl p-6">
        <DialogHeader className="border-b border-[#CFF1D2] pb-3">
          <DialogTitle className="text-lg font-bold font-display text-[#0F3B27] flex items-center gap-2">
            <QrCode className="size-5 text-[#0F3B27]" />
            Badge Professionnel Double Face — {employe.nom_complet}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <BadgeDoubleFace
            employe={employe}
            officineNom={officineNom}
            officineTelephone={officineTelephone}
          />
        </div>

        <DialogFooter className="border-t border-[#CFF1D2] pt-3">
          <Button
            variant="outline"
            onClick={onFermer}
            className="border-[#CFF1D2] text-[#475C50] text-xs rounded-xl"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
