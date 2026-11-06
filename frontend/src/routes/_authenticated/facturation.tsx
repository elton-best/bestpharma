import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  QrCode,
  Search,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Calendar,
  Building,
  Printer,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { formatDateHeure, nombre } from "@/lib/format";
import { telechargerCsv, imprimerFicheOfficielle } from "@/lib/export-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";

export const Route = createFileRoute("/_authenticated/facturation")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Facturation DGI e-MECeF — BestPharma" },
      {
        name: "description",
        content: "Registre officiel des factures normalisées certifiées par la Direction Générale des Impôts du Bénin.",
      },
    ],
  }),
  component: PageFacturation,
});

interface FactureItem {
  id: string;
  numero_facture_dgi: string;
  ifu_officine: string;
  nim_machine: string;
  type_facture: string;
  compteur_type: number;
  compteur_total: number;
  code_mecef: string;
  signature_dgi: string;
  qr_code_data: string;
  statut: string;
  date_certification: string;
  vente?: {
    numero_ticket: string;
    client_nom: string;
    client_ifu?: string;
    montant_net_ttc: number;
    montant_brut_ht?: number;
    mode_reglement: string;
    caissier?: { name: string };
    lignes?: any[];
  };
}

function PageFacturation() {
  const [recherche, setRecherche] = useState("");
  const [factureSelectionnee, setFactureSelectionnee] = useState<FactureItem | null>(null);

  const { data: facturesData, isLoading } = useQuery<{
    data: {
      data: FactureItem[];
      total: number;
    };
  }>({
    queryKey: ["factures-emecef"],
    queryFn: () => api.get("/facturation/emecef"),
  });

  const factures = facturesData?.data?.data || [];

  const facturesFiltrees = factures.filter(
    (f) =>
      f.numero_facture_dgi.toLowerCase().includes(recherche.toLowerCase()) ||
      f.code_mecef.toLowerCase().includes(recherche.toLowerCase()) ||
      f.vente?.client_nom.toLowerCase().includes(recherche.toLowerCase()) ||
      (f.vente?.numero_ticket && f.vente.numero_ticket.toLowerCase().includes(recherche.toLowerCase()))
  );

  const imprimerFactureDgi = (f: FactureItem) => {
    const html = `
      <div style="max-width: 420px; margin: 20px auto; border: 2px dashed #0F3B27; border-radius: 8px; padding: 18px; font-family: monospace; font-size: 13px; background: #fff;">
        <div style="text-align: center; border-bottom: 2px dashed #0F3B27; padding-bottom: 12px; margin-bottom: 12px;">
          <div style="font-weight: 900; font-size: 16px; color: #0F3B27;">BESTPHARMA OFFICINE</div>
          <div style="font-size: 11px; color: #555;">RÉPUBLIQUE DU BÉNIN · DGI e-MECeF</div>
          <div style="font-size: 12px; font-weight: bold; margin-top: 4px;">IFU : ${f.ifu_officine}</div>
          <div style="font-size: 11px; color: #555;">Machine NIM : ${f.nim_machine}</div>
        </div>
        <div style="margin-bottom: 10px; font-size: 12px;">
          <div>Date : <strong>${f.date_certification}</strong></div>
          <div>Facture N° : <strong>${f.numero_facture_dgi}</strong></div>
          <div>Ticket Vente : ${f.vente?.numero_ticket || "N/A"}</div>
          <div>Client : <strong>${f.vente?.client_nom || "Client au comptoir"}</strong></div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px;">
          <tr style="border-bottom: 1px solid #ddd; background: #F7F9F7;">
            <th style="padding: 6px; text-align: left;">Désignation</th>
            <th style="padding: 6px; text-align: right;">Total TTC</th>
          </tr>
          <tr>
            <td style="padding: 6px;">Vente produits pharmaceutiques</td>
            <td style="padding: 6px; text-align: right; font-weight: bold;">${nombre(f.vente?.montant_net_ttc ?? 0)} FCFA</td>
          </tr>
        </table>
        <div style="border-top: 1px dashed #0F3B27; padding-top: 8px; margin-top: 8px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Total HT (Groupe A - 0%) :</span>
            <strong>${nombre(f.vente?.montant_brut_ht ?? f.vente?.montant_net_ttc ?? 0)} FCFA</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Total TVA (0%) :</span>
            <span>0 FCFA</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; color: #0F3B27; margin-top: 4px;">
            <span>TOTAL PAYÉ :</span>
            <span>${nombre(f.vente?.montant_net_ttc ?? 0)} FCFA</span>
          </div>
        </div>
        <div style="margin-top: 14px; padding: 10px; background: #F7F9F7; border-radius: 6px; font-size: 11px; word-break: break-all;">
          <div><strong>CODE MECeF / DGI :</strong></div>
          <div style="font-size: 13px; font-weight: bold; color: #0F3B27; letter-spacing: 1px;">${f.code_mecef}</div>
          <div style="margin-top: 4px; font-size: 10px; color: #555;">Signature DGI : ${f.signature_dgi}</div>
          <div style="margin-top: 2px; font-size: 10px; color: #555;">Compteurs : Type ${f.compteur_type} · Total ${f.compteur_total}</div>
        </div>
        <div style="text-align: center; margin-top: 12px; font-size: 10px; color: #666;">
          Facture certifiée e-MECeF conforme aux normes DGI Bénin
        </div>
      </div>
    `;
    imprimerFicheOfficielle(`Facture DGI ${f.numero_facture_dgi}`, html);
  };

  const exporterRegistreDgiCsv = () => {
    if (factures.length === 0) {
      toast.error("Aucune facture à exporter.");
      return;
    }
    telechargerCsv(
      factures.map((f) => ({
        numero_dgi: f.numero_facture_dgi,
        date: f.date_certification,
        code_mecef: f.code_mecef,
        nim: f.nim_machine,
        ifu: f.ifu_officine,
        ticket: f.vente?.numero_ticket || "N/A",
        client: f.vente?.client_nom || "Client comptoir",
        montant_net_ttc: f.vente?.montant_net_ttc || 0,
        statut: f.statut,
      })),
      `bestpharma_registre_dgi_${new Date().toISOString().split("T")[0]}`,
      [
        { cle: "numero_dgi", label: "N° Facture DGI" },
        { cle: "date", label: "Date Certification" },
        { cle: "code_mecef", label: "Code MECeF" },
        { cle: "nim", label: "NIM Machine" },
        { cle: "ifu", label: "IFU Officine" },
        { cle: "ticket", label: "N° Ticket" },
        { cle: "client", label: "Client" },
        { cle: "montant_net_ttc", label: "Total TTC (FCFA)" },
        { cle: "statut", label: "Statut Fiscale" },
      ]
    );
    toast.success("Registre des factures DGI exporté en CSV !");
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Facturation Normalisée DGI e-MECeF
            </h1>
            <Badge variant="outline" className="border-emerald-600 text-emerald-700 bg-emerald-50">
              Législation Fiscale Bénin
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Registre et contrôle de conformité des factures normalisées électroniques certifiées par l'API e-MECeF de la DGI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-slate-900 text-white gap-1 py-1 px-3 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" /> Système Certifié DGI
          </Badge>
        </div>
      </div>

      {/* Cartes stats fiscales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Factures de Vente (FV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{factures.length}</div>
            <p className="text-xs text-slate-500 mt-1">Compteurs certifiés séquentiels</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Taux de Certification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">100% Certifié</div>
            <p className="text-xs text-slate-500 mt-1">Signature SHA-256 et Code e-MECeF</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Taux Médicaments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">Groupe A (0%)</div>
            <p className="text-xs text-slate-500 mt-1">Exonération fiscale officielle ABMed</p>
          </CardContent>
        </Card>
      </div>

      {/* Table des factures normalisées */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Journal des Factures Normalisées e-MECeF
              </CardTitle>
              <CardDescription>
                Toutes les ventes validées génèrent automatiquement une facture fiscale avec NIM et Code MECeF.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exporterRegistreDgiCsv}
                className="h-9 gap-1.5 border-slate-200 text-xs font-bold text-[#0F3B27] hover:bg-[#CFF1D2]/30"
              >
                <Download className="h-3.5 w-3.5" /> Exporter Registre (CSV)
              </Button>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par N° DGI, Code, Client..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement des factures fiscales...</div>
          ) : facturesFiltrees.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Aucune facture normalisée trouvée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-3 px-3 font-semibold">N° Facture DGI</th>
                    <th className="py-3 px-3 font-semibold">Date & Heure</th>
                    <th className="py-3 px-3 font-semibold">Client & IFU</th>
                    <th className="py-3 px-3 font-semibold">Montant TTC</th>
                    <th className="py-3 px-3 font-semibold">NIM Machine</th>
                    <th className="py-3 px-3 font-semibold">Code Sécurité e-MECeF</th>
                    <th className="py-3 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {facturesFiltrees.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {f.numero_facture_dgi}
                        <div className="text-[10px] text-slate-400 font-sans">
                          Ticket: {f.vente?.numero_ticket}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {formatDateHeure(f.date_certification)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{f.vente?.client_nom}</div>
                        <div className="text-[11px] text-slate-500">
                          {f.vente?.client_ifu ? `IFU: ${f.vente.client_ifu}` : "Particulier"}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {nombre(f.vente?.montant_net_ttc ?? 0)} FCFA
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {f.nim_machine}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-emerald-800 text-xs">
                        {f.code_mecef}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFactureSelectionnee(f)}
                          className="text-xs h-7 gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" /> Voir Ticket
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facture normalisée DGI e-MECeF */}
      <Dialog open={!!factureSelectionnee} onOpenChange={(open) => !open && setFactureSelectionnee(null)}>
        <ModaleFiche
          titre="Facture normalisée DGI"
          sousTitre="Le document fiscal tel qu'il a été certifié, et les éléments qui permettent de le vérifier."
          badge={<Badge className="border-[#CFF1D2] bg-[#DCFCE7] text-[#14532D]">e-MECeF · DGI Bénin</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                Facture conservée dix ans et rattachée à la vente d'origine, sans modification possible.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => factureSelectionnee && imprimerFactureDgi(factureSelectionnee)}
                  className="h-12 gap-2 rounded-xl sm:h-11 border-[#0F3B27] text-[#0F3B27] font-bold"
                >
                  <Printer className="h-4 w-4" /> Imprimer Ticket Fiscal
                </Button>
                <Button
                  type="button"
                  onClick={() => setFactureSelectionnee(null)}
                  className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
                >
                  Fermer
                </Button>
              </div>
            </div>
          }
        >
          {factureSelectionnee ? (
            <div className="grid gap-4 md:grid-cols-2">
              <ColonneFiche titre="Document fiscal" aide="Ce que le client peut présenter lors d'un contrôle.">
                <div className="space-y-2 rounded-xl border-2 border-dashed border-[#CFF1D2] bg-[#F7F9F7] p-4 font-mono text-xs">
                  <div className="border-b border-dashed border-[#CFF1D2] pb-2 text-center">
                    <div className="text-sm font-bold text-[#0F3B27]">BESTPHARMA OFFICINE</div>
                    <div className="text-[11px] text-[#475C50]">RÉPUBLIQUE DU BÉNIN</div>
                    <div className="text-[11px] text-[#475C50]">IFU : {factureSelectionnee.ifu_officine}</div>
                    <div className="text-[11px] text-[#475C50]">NIM : {factureSelectionnee.nim_machine}</div>
                  </div>

                  <div className="space-y-1 border-b border-dashed border-[#CFF1D2] py-1">
                    <div>Facture DGI : {factureSelectionnee.numero_facture_dgi}</div>
                    <div>Compteur : {factureSelectionnee.compteur_type}</div>
                    <div>Date : {formatDateHeure(factureSelectionnee.date_certification)}</div>
                    <div>Client : {factureSelectionnee.vente?.client_nom}</div>
                    <div>Règlement : {factureSelectionnee.vente?.mode_reglement}</div>
                  </div>

                  <div className="space-y-1 border-b border-dashed border-[#CFF1D2] py-1">
                    {factureSelectionnee.vente?.lignes?.map((l: any) => (
                      <div key={l.id} className="flex justify-between gap-2">
                        <span>
                          {l.quantite} × {l.produit?.nom_commercial}
                        </span>
                        <span>{nombre(l.total_ligne)} F</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-1 text-sm font-bold text-[#0F3B27]">
                    <span>TOTAL NET TTC</span>
                    <span>{nombre(factureSelectionnee.vente?.montant_net_ttc ?? 0)} FCFA</span>
                  </div>
                </div>
              </ColonneFiche>

              <ColonneFiche titre="Éléments de vérification" aide="Ce que l'administration fiscale contrôle sur cette facture.">
                <Champ label="Code de sécurité e-MECeF" aide="Chiffres imprimés sur la facture remise au client.">
                  <div className="rounded-xl border-2 border-[#0F3B27] bg-[#F7F9F7] px-3 py-2 text-center font-mono text-sm font-black tracking-wider text-[#0F3B27]">
                    {factureSelectionnee.code_mecef}
                  </div>
                </Champ>
                <Champ label="Chaîne fiscale du QR code" aide="Le client la scanne pour retrouver sa facture chez la Direction Générale des Impôts.">
                  <div className="break-all rounded-xl border border-[#CFF1D2] bg-white px-3 py-2 font-mono text-[10px] text-[#475C50]">
                    {factureSelectionnee.qr_code_data}
                  </div>
                </Champ>
              </ColonneFiche>
            </div>
          ) : null}
        </ModaleFiche>
      </Dialog>
    </div>
  );
}
