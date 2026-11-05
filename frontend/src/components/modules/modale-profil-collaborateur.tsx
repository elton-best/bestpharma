import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Phone,
  Mail,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  UserCheck,
  UserX,
} from "lucide-react";
import { imprimerFicheOfficielle } from "@/lib/export-utils";

interface ModaleProfilCollaborateurProps {
  employe: any | null;
  onFermer: () => void;
  estPresent?: boolean;
  dernierPointage?: any;
  onPointer?: (type: "arrivee" | "depart") => void;
}

export function ModaleProfilCollaborateur({
  employe,
  onFermer,
  estPresent = false,
  dernierPointage,
  onPointer,
}: ModaleProfilCollaborateurProps) {
  const [onglet, setOnglet] = useState<"general" | "badge" | "dossier">("general");

  if (!employe) return null;

  const estPharmacien = [
    "pharmacien_titulaire",
    "pharmacien_adjoint",
    "pharmacien_remplacant",
    "promoteur",
  ].includes(employe.poste);

  const imprimerBadge = () => {
    const html = `
      <div style="font-family: sans-serif; text-align: center; max-width: 350px; margin: 0 auto; border: 2px solid #0F3B27; border-radius: 12px; padding: 20px; background: #fff;">
        <div style="font-size: 16px; font-weight: 900; color: #0F3B27; margin-bottom: 4px;">BESTPHARMA</div>
        <div style="font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 16px;">Badge Professionnel Officiel</div>
        <div style="width: 80px; height: 80px; border-radius: 12px; overflow: hidden; margin: 0 auto 12px auto; background: #F7F9F7; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; color: #0F3B27;">
          ${
            employe.photo_url
              ? `<img src="${employe.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
              : employe.nom_complet.charAt(0)
          }
        </div>
        <div style="font-size: 16px; font-weight: bold; color: #0F3B27;">${employe.nom_complet}</div>
        <div style="font-size: 12px; color: #475C50; margin-top: 2px; text-transform: capitalize;">${employe.poste.replace("_", " ")}</div>
        <div style="font-family: monospace; font-size: 11px; font-weight: bold; margin-top: 6px; background: #EBF3EC; display: inline-block; padding: 2px 8px; border-radius: 4px; color: #0F3B27;">
          ${employe.matricule || `BP-${employe.id.slice(0, 6).toUpperCase()}`}
        </div>
        <div style="margin: 16px 0;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=BESTPHARMA_BADGE:${employe.matricule || employe.id}" style="width: 120px; height: 120px; margin: 0 auto;" />
        </div>
        <div style="font-size: 9px; color: #777;">Scannez ce QR Code sur la borne d'entrée pour enregistrer votre pointage.</div>
      </div>
    `;
    imprimerFicheOfficielle(`Badge - ${employe.nom_complet}`, html);
  };

  return (
    <Dialog open={!!employe} onOpenChange={(open) => !open && onFermer()}>
      <DialogContent className="max-w-2xl bg-white border border-[#CFF1D2] rounded-2xl shadow-2xl p-0 overflow-hidden">
        {/* EN-TÊTE DU PROFIL */}
        <div className="bg-gradient-to-r from-[#0F3B27] to-[#1A5C3D] text-white p-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* AVATAR UPLOADÉ / PHOTO */}
            <div className="size-20 rounded-2xl bg-white/10 border-2 border-[#92FF5F] overflow-hidden flex items-center justify-center font-black text-2xl shrink-0 shadow-lg">
              {employe.photo_url ? (
                <img
                  src={employe.photo_url}
                  alt={employe.nom_complet}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-white">{employe.nom_complet.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <DialogTitle className="text-xl font-bold font-display text-white">
                  {employe.nom_complet}
                </DialogTitle>
                {estPharmacien && (
                  <Badge className="bg-[#92FF5F] text-[#0F3B27] font-bold text-[10px]">
                    Pharmacien
                  </Badge>
                )}
                <Badge
                  className={
                    estPresent
                      ? "bg-emerald-500 text-white text-[10px]"
                      : "bg-white/20 text-white text-[10px]"
                  }
                >
                  {estPresent ? "Présent sur place" : "Absent / Non pointé"}
                </Badge>
              </div>

              <p className="text-xs text-[#CFF1D2] mt-1 capitalize">
                {employe.poste ? employe.poste.replace("_", " ") : "Collaborateur"} · Matricule :{" "}
                <span className="font-mono font-bold text-white">
                  {employe.matricule || "N/A"}
                </span>
              </p>

              {dernierPointage && (
                <div className="mt-2 text-[11px] text-[#CFF1D2]/80 flex items-center justify-center sm:justify-start gap-1.5">
                  <Clock className="size-3.5 text-[#92FF5F]" />
                  <span>
                    Dernier pointage :{" "}
                    <strong>
                      {dernierPointage.type === "arrivee" ? "Arrivée" : "Départ"} à{" "}
                      {new Date(dernierPointage.horodatage).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* BARRE DE SOUS-ONGLETS */}
          <div className="flex gap-2 mt-5 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setOnglet("general")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                onglet === "general"
                  ? "bg-white text-[#0F3B27]"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              Informations Générales
            </button>
            <button
              type="button"
              onClick={() => setOnglet("badge")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                onglet === "badge"
                  ? "bg-white text-[#0F3B27]"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <QrCode className="size-3" /> Badge QR Code
            </button>
            <button
              type="button"
              onClick={() => setOnglet("dossier")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                onglet === "dossier"
                  ? "bg-white text-[#0F3B27]"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <FileText className="size-3" /> Dossier & Pièces
            </button>
          </div>
        </div>

        {/* CONTENU PRINCIPAL SELON ONGLET */}
        <div className="p-6 max-h-[55vh] overflow-y-auto">
          {onglet === "general" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                  <span className="text-[11px] text-[#475C50] flex items-center gap-1.5 font-medium">
                    <Phone className="size-3.5 text-[#0F3B27]" /> Téléphone
                  </span>
                  <p className="font-bold text-[#0F3B27]">{employe.telephone || "Non renseigné"}</p>
                </div>

                <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                  <span className="text-[11px] text-[#475C50] flex items-center gap-1.5 font-medium">
                    <Mail className="size-3.5 text-[#0F3B27]" /> Email Professionnel
                  </span>
                  <p className="font-bold text-[#0F3B27]">{employe.email || "Non renseigné"}</p>
                </div>

                <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                  <span className="text-[11px] text-[#475C50] flex items-center gap-1.5 font-medium">
                    <Award className="size-3.5 text-[#0F3B27]" /> Inscription à l'Ordre
                  </span>
                  <p className="font-bold text-[#0F3B27]">
                    {estPharmacien ? "Section B (En cours de validité)" : "Non applicable"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                  <span className="text-[11px] text-[#475C50] flex items-center gap-1.5 font-medium">
                    <Calendar className="size-3.5 text-[#0F3B27]" /> Date d'intégration
                  </span>
                  <p className="font-bold text-[#0F3B27]">
                    {employe.date_embauche || "Active"}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#CFF1D2] bg-white space-y-2">
                <span className="font-bold text-[#0F3B27] block">
                  Responsabilités & Habilitations Actives
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 rounded-md bg-[#EFF7F1] text-[#0F3B27] font-semibold text-[11px] border border-[#CFF1D2]">
                    Accès Borne Pointage
                  </span>
                  {estPharmacien && (
                    <>
                      <span className="px-2 py-1 rounded-md bg-[#EFF7F1] text-[#0F3B27] font-semibold text-[11px] border border-[#CFF1D2]">
                        Visa Dispensation
                      </span>
                      <span className="px-2 py-1 rounded-md bg-[#EFF7F1] text-[#0F3B27] font-semibold text-[11px] border border-[#CFF1D2]">
                        Gestion Stupéfiants Tableau B
                      </span>
                    </>
                  )}
                  <span className="px-2 py-1 rounded-md bg-[#EFF7F1] text-[#0F3B27] font-semibold text-[11px] border border-[#CFF1D2]">
                    Émargement Hygiène & Températures
                  </span>
                </div>
              </div>
            </div>
          )}

          {onglet === "badge" && (
            <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
              <div className="p-4 bg-white rounded-2xl border-2 border-[#0F3B27] shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=BESTPHARMA_BADGE:${employe.matricule || employe.id}`}
                  alt="Badge QR Code"
                  className="size-40 mx-auto"
                />
                <div className="font-mono text-xs font-bold text-[#0F3B27] mt-2">
                  {employe.matricule || `BP-${employe.id.slice(0, 6).toUpperCase()}`}
                </div>
              </div>
              <p className="text-xs text-[#475C50] max-w-sm">
                Ce badge permet au collaborateur de pointer instantanément à la borne tablette ou de scanner ses interventions.
              </p>
              <Button
                onClick={imprimerBadge}
                size="sm"
                className="bg-[#0F3B27] hover:bg-[#164E35] text-[#92FF5F] text-xs font-bold gap-1.5 rounded-xl"
              >
                <Printer className="size-3.5" /> Imprimer le Badge PVC
              </Button>
            </div>
          )}

          {onglet === "dossier" && (
            <div className="space-y-2 text-xs">
              {[
                { titre: "Diplôme / Titre professionnel", requis: true, valide: true },
                { titre: "Attestation d'inscription à l'Ordre", requis: estPharmacien, valide: true },
                { titre: "Certificat médical d'aptitude", requis: true, valide: true },
                { titre: "Contrat de travail signé", requis: true, valide: true },
                { titre: "Fiche de poste signée", requis: true, valide: true },
              ].map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7]"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span className="font-semibold text-[#0F3B27]">{p.titre}</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                    Validé
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PIED DU MODAL AVEC ACTIONS RAPIDES */}
        <DialogFooter className="p-4 bg-[#F7F9F7] border-t border-[#CFF1D2] flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {onPointer && (
              estPresent ? (
                <Button
                  onClick={() => onPointer("depart")}
                  size="sm"
                  variant="destructive"
                  className="text-xs font-bold gap-1 rounded-xl"
                >
                  <UserX className="size-3.5" /> Pointer Départ
                </Button>
              ) : (
                <Button
                  onClick={() => onPointer("arrivee")}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 rounded-xl"
                >
                  <UserCheck className="size-3.5" /> Pointer Arrivée
                </Button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={imprimerBadge}
              variant="outline"
              size="sm"
              className="border-[#CFF1D2] text-[#0F3B27] text-xs font-semibold gap-1 rounded-xl hover:bg-[#CFF1D2]/30"
            >
              <QrCode className="size-3.5" /> Badge
            </Button>
            <Button
              onClick={onFermer}
              variant="ghost"
              size="sm"
              className="text-xs rounded-xl"
            >
              Fermer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
