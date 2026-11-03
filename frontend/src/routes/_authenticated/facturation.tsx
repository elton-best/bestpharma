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
} from "lucide-react";

import { api } from "@/lib/api-client";
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

export const Route = createFileRoute("/_authenticated/facturation")({
  head: () => ({
    meta: [
      { title: "Facturation DGI e-MECeF — BEGPHARMA" },
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
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par N° DGI, Code MECeF, Client..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
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
                        {new Date(f.date_certification).toLocaleString("fr-FR")}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{f.vente?.client_nom}</div>
                        <div className="text-[11px] text-slate-500">
                          {f.vente?.client_ifu ? `IFU: ${f.vente.client_ifu}` : "Particulier"}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {Number(f.vente?.montant_net_ttc).toLocaleString("fr-FR")} FCFA
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

      {/* Modal Visualisation Facture DGI e-MECeF */}
      <Dialog
        open={!!factureSelectionnee}
        onOpenChange={(open) => !open && setFactureSelectionnee(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-base flex items-center justify-center gap-1.5 text-emerald-700">
              <QrCode className="w-5 h-5" /> Facture Normalisée DGI
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Conforme au Décret d'application e-MECeF / DGI Bénin
            </DialogDescription>
          </DialogHeader>

          {factureSelectionnee && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="font-bold text-slate-900 text-sm">BEGPHARMA OFFICINE</div>
                <div className="text-[11px] text-slate-500">RÉPUBLIQUE DU BÉNIN</div>
                <div className="text-[11px] text-slate-600">IFU : {factureSelectionnee.ifu_officine}</div>
                <div className="text-[11px] text-slate-600">NIM : {factureSelectionnee.nim_machine}</div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-slate-300">
                <div>Facture DGI : {factureSelectionnee.numero_facture_dgi}</div>
                <div>Compteur FV : {factureSelectionnee.compteur_type}</div>
                <div>Date : {new Date(factureSelectionnee.date_certification).toLocaleString("fr-FR")}</div>
                <div>Client : {factureSelectionnee.vente?.client_nom}</div>
                <div>Mode règlement : {factureSelectionnee.vente?.mode_reglement}</div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-slate-300">
                {factureSelectionnee.vente?.lignes?.map((l: any) => (
                  <div key={l.id} className="flex justify-between">
                    <span>
                      {l.quantite}x {l.produit?.nom_commercial} [A]
                    </span>
                    <span>{Number(l.total_ligne).toLocaleString("fr-FR")} F</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-1 font-bold text-slate-900 text-sm">
                <span>TOTAL NET TTC :</span>
                <span>
                  {Number(factureSelectionnee.vente?.montant_net_ttc).toLocaleString("fr-FR")} FCFA
                </span>
              </div>

              <div className="pt-2 text-center border-t border-dashed border-slate-300 space-y-1">
                <div className="text-[10px] text-slate-500 font-bold">CODE SÉCURITÉ e-MECeF :</div>
                <div className="text-sm font-black text-slate-900 bg-white p-1 rounded border">
                  {factureSelectionnee.code_mecef}
                </div>
                <div className="text-[9px] text-slate-400 break-all pt-1">
                  Chaîne fiscale QR : {factureSelectionnee.qr_code_data}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1 text-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimer
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setFactureSelectionnee(null)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
