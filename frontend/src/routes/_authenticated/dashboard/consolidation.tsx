import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Send,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { nombre } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/dashboard/consolidation")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Consolidation Groupe Promoteur : BestPharma" },
      {
        name: "description",
        content: "Pilotage panoramique multi-officines, transferts de stock et comparaison de performances.",
      },
    ],
  }),
  component: ConsolidationPromoteur,
});

function ConsolidationPromoteur() {
  const { rattachements, courante, choisir } = useOfficine();
  const queryClient = useQueryClient();
  const [modaleTransfert, setModaleTransfert] = useState<any | null>(null);
  const [quantiteTransfert, setQuantiteTransfert] = useState<number>(5);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["promoteur-consolidation"],
    queryFn: async () => {
      return api.get<{
        officines: any[];
        totaux_groupe: {
          nombre_officines: number;
          ca_jour_total: number;
          ca_mois_total: number;
          valeur_stock_totale: number;
          alertes_peremption_totales: number;
          non_conformites_ouvertes: number;
        };
        opportunites_transferts: any[];
        transferts_recents: any[];
      }>("/promoteur/consolidation");
    },
    refetchInterval: 30000,
  });

  const mutationTransfert = useMutation({
    mutationFn: async (payload: any) => {
      return api.post("/promoteur/transferts", payload);
    },
    onSuccess: () => {
      toast.success("Transfert inter-officines initié avec succès !");
      setModaleTransfert(null);
      queryClient.invalidateQueries({ queryKey: ["promoteur-consolidation"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la création du transfert.");
    },
  });

  const mutationReception = useMutation({
    mutationFn: async (transfertId: string) => {
      return api.post(`/promoteur/transferts/${transfertId}/receptionner`, {});
    },
    onSuccess: () => {
      toast.success("Transfert réceptionné et stock destinataire crédité !");
      queryClient.invalidateQueries({ queryKey: ["promoteur-consolidation"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la réception.");
    },
  });

  function validerTransfertOpportunite() {
    if (!modaleTransfert) return;
    mutationTransfert.mutate({
      officine_source_id: modaleTransfert.source_officine_id,
      officine_destinataire_id: modaleTransfert.dest_officine_id,
      motif: modaleTransfert.motif,
      lignes: [
        {
          produit_id: modaleTransfert.produit_id,
          stock_lot_source_id: modaleTransfert.stock_lot_id,
          numero_lot: modaleTransfert.numero_lot,
          date_peremption: modaleTransfert.date_peremption,
          quantite: quantiteTransfert,
          prix_unitaire_achat: modaleTransfert.prix_achat,
        },
      ],
    });
  }

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const totaux = data?.totaux_groupe || {
    nombre_officines: rattachements.length,
    ca_jour_total: 0,
    ca_mois_total: 0,
    valeur_stock_totale: 0,
    alertes_peremption_totales: 0,
    non_conformites_ouvertes: 0,
  };

  const officines = data?.officines || [];
  const opportunites = data?.opportunites_transferts || [];
  const transferts = data?.transferts_recents || [];

  return (
    <div className="grid gap-6 font-sans">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#CFE3D5]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-black text-[#1F2420]">
              Consolidation Groupe Multi-Officines
            </h1>
            <Badge className="bg-[#023010] text-[#92FF5F] font-bold">Promoteur</Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#5C6660]">
            Supervision globale, comparaison des performances et transferts de stocks inter-sites (Bénin).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border-[#CFE3D5] text-[#023010] hover:bg-[#EFF7F1]"
          >
            <RefreshCw className={`size-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* 4 Indicateurs Totaux Groupe */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA Jour Cumulé */}
        <Card className="rounded-3xl border border-[#CFE3D5] bg-white shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5C6660]">CA Groupe du Jour</span>
            <div className="size-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl sm:text-3xl font-black text-[#023010]">
              {nombre(totaux.ca_jour_total)} <span className="text-sm font-semibold text-[#5C6660]">FCFA</span>
            </p>
            <p className="text-[11px] text-[#5C6660] mt-1">
              Mois : <span className="font-bold text-[#1F2420]">{nombre(totaux.ca_mois_total)} FCFA</span>
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md inline-block w-fit">
            {totaux.nombre_officines} officines actives
          </span>
        </Card>

        {/* Valeur totale du stock */}
        <Card className="rounded-3xl border border-[#CFE3D5] bg-white shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5C6660]">Valeur du Stock Global</span>
            <div className="size-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Package size={16} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl sm:text-3xl font-black text-[#1F2420]">
              {nombre(totaux.valeur_stock_totale)} <span className="text-sm font-semibold text-[#5C6660]">FCFA</span>
            </p>
            <p className="text-[11px] text-[#5C6660] mt-1">Évaluation prix d'achat moyen</p>
          </div>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md inline-block w-fit">
            Capital marchandises
          </span>
        </Card>

        {/* Alertes Péremptions Croisées */}
        <Card className="rounded-3xl border border-[#CFE3D5] bg-white shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5C6660]">Péremptions critiques &lt; 30j</span>
            <div className="size-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl sm:text-3xl font-black text-amber-700">
              {totaux.alertes_peremption_totales} <span className="text-sm font-semibold text-[#5C6660]">lots</span>
            </p>
            <p className="text-[11px] text-[#5C6660] mt-1">À écouler ou transférer d'urgence</p>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md inline-block w-fit">
            Règle FEFO prioritaire
          </span>
        </Card>

        {/* Qualité & Conformité Groupe */}
        <Card className="rounded-3xl border border-[#CFE3D5] bg-white shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5C6660]">Écarts & NC Ouvertes</span>
            <div className="size-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl sm:text-3xl font-black text-purple-800">
              {totaux.non_conformites_ouvertes} <span className="text-sm font-semibold text-[#5C6660]">NC</span>
            </p>
            <p className="text-[11px] text-[#5C6660] mt-1">Sur l'ensemble du réseau</p>
          </div>
          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md inline-block w-fit">
            Guide BPD ABMed
          </span>
        </Card>
      </section>

      {/* Tableau comparatif des officines */}
      <Card className="rounded-3xl border border-[#CFE3D5] bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-[#EFF7F1]/60 border-b border-[#CFE3D5] p-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-black text-[#023010]">
                Tableau Comparatif des Officines du Groupe
              </CardTitle>
              <CardDescription className="text-xs text-[#5C6660]">
                Indicateurs financiers, de stock et de conformité réglementaire par site.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFDFB] text-[#5C6660] font-bold border-b border-[#CFE3D5] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Officine</th>
                <th className="p-4">Ville & Licence</th>
                <th className="p-4">Présence Pharmacien (Art 1.11)</th>
                <th className="p-4 text-right">CA Jour</th>
                <th className="p-4 text-right">Valeur Stock</th>
                <th className="p-4 text-center">Score BPD</th>
                <th className="p-4 text-center">Péremptions &lt; 30j</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFE3D5]">
              {officines.map((off) => {
                const estCourante = courante?.officine_id === off.id;
                return (
                  <tr key={off.id} className="hover:bg-[#EFF7F1]/40 transition-colors">
                    <td className="p-4 font-bold text-[#1F2420]">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-[#023010]" />
                        <span>{off.nom}</span>
                        {estCourante && (
                          <Badge className="bg-[#023010] text-[#92FF5F] text-[9px] px-1.5 py-0">Site Actif</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-[#5C6660]">
                      <div>{off.ville ?? "Bénin"}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{off.numero_licence}</div>
                    </td>
                    <td className="p-4">
                      {off.pharmacien_present ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-100 font-bold px-2.5 py-1 rounded-full text-[11px]">
                          <CheckCircle2 size={13} />
                          Présent sur place
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-100 font-bold px-2.5 py-1 rounded-full text-[11px]">
                          <AlertTriangle size={13} />
                          Aucun pointé
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right font-black text-[#1F2420]">
                      {nombre(off.ca_jour)} FCFA
                    </td>
                    <td className="p-4 text-right font-medium text-[#1F2420]">
                      {nombre(off.valeur_stock)} FCFA
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-extrabold text-[#023010] bg-[#EFF7F1] px-2 py-0.5 rounded-md">
                        {off.score_bpd.toFixed(1)} %
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {off.alertes_peremption_30j > 0 ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          {off.alertes_peremption_30j}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium">0</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => choisir(off.id)}
                        className="rounded-xl h-8 text-xs font-bold text-[#023010] hover:bg-[#EFF7F1]"
                      >
                        Bascule
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Recommandations intelligentes de transferts inter-officines */}
      <Card className="rounded-3xl border border-[#CFE3D5] bg-white shadow-sm p-5">
        <CardHeader className="p-0 pb-4 border-b border-[#CFE3D5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-emerald-100 text-[#023010] flex items-center justify-center">
                <ArrowRightLeft size={16} />
              </div>
              <div>
                <CardTitle className="text-base font-black text-[#023010]">
                  Opportunités de Transfert Inter-Officines (Équilibrage & FEFO)
                </CardTitle>
                <CardDescription className="text-xs text-[#5C6660]">
                  Suggestions automatisées lorsqu'une officine est en rupture et qu'une autre a du surstock.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {opportunites.length === 0 ? (
            <p className="text-xs text-[#5C6660] italic py-4 text-center">
              Aucun déséquilibre de stock critique détecté entre les officines du groupe pour le moment.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {opportunites.map((op, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#CFE3D5] bg-[#FAFDFB] p-4 flex flex-col justify-between gap-3 shadow-2xs hover:border-[#023010]/40 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-sm text-[#1F2420]">{op.produit_nom}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        {op.motif}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[#5C6660] flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-[#023010]">{op.source_officine_nom}</span>
                        <div className="text-[11px]">Stock : <b className="text-emerald-700">{op.source_stock}</b> boîtes</div>
                      </div>
                      <ArrowRight size={16} className="text-gray-400" />
                      <div className="text-right">
                        <span className="font-semibold text-[#023010]">{op.dest_officine_nom}</span>
                        <div className="text-[11px]">Stock : <b className="text-red-700">{op.dest_stock}</b> boîtes</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2 font-mono">
                      Lot : {op.numero_lot} (Péremption : {op.date_peremption ?? "Non précisée"})
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs font-black text-[#023010]">
                      Recommandation : {op.quantite_suggeree} boîtes
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        setModaleTransfert(op);
                        setQuantiteTransfert(op.quantite_suggeree);
                      }}
                      className="rounded-xl h-8 bg-[#023010] hover:bg-[#18AA38] text-white text-xs font-bold"
                    >
                      Initier transfert
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des transferts récents */}
      <Card className="rounded-3xl border border-[#CFE3D5] bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-[#EFF7F1]/60 border-b border-[#CFE3D5] p-5">
          <CardTitle className="text-base font-black text-[#023010]">
            Suivi des Transferts Récents
          </CardTitle>
          <CardDescription className="text-xs text-[#5C6660]">
            Bordereaux d'expédition et réceptions de lots entre officines.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {transferts.length === 0 ? (
            <p className="text-xs text-[#5C6660] italic p-6 text-center">
              Aucun transfert inter-officines enregistré.
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFDFB] text-[#5C6660] font-bold border-b border-[#CFE3D5] uppercase text-[10px]">
                <tr>
                  <th className="p-4">N° Transfert</th>
                  <th className="p-4">Origine → Destination</th>
                  <th className="p-4">Produits & Lots</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFE3D5]">
                {transferts.map((tr) => (
                  <tr key={tr.id} className="hover:bg-[#EFF7F1]/40">
                    <td className="p-4 font-mono font-bold text-[#023010]">
                      {tr.numero_transfert}
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-[#1F2420]">{tr.officine_source?.nom}</span>
                      <span className="mx-1 text-gray-400">→</span>
                      <span className="font-semibold text-[#1F2420]">{tr.officine_destinataire?.nom}</span>
                    </td>
                    <td className="p-4 text-[#5C6660]">
                      {tr.lignes?.map((l: any, i: number) => (
                        <div key={i}>
                          <b>{l.quantite}x</b> {l.produit?.nom_commercial} (Lot {l.numero_lot})
                        </div>
                      ))}
                    </td>
                    <td className="p-4">
                      {tr.statut === "receptionne" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 font-bold">Réceptionné</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 font-bold">En transit / Validé</Badge>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {tr.statut !== "receptionne" && (
                        <Button
                          size="sm"
                          disabled={mutationReception.isPending}
                          onClick={() => mutationReception.mutate(tr.id)}
                          className="rounded-xl h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                        >
                          Valider réception
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modale de validation de transfert */}
      {modaleTransfert && (
        <Dialog open={!!modaleTransfert} onOpenChange={() => setModaleTransfert(null)}>
          <DialogContent className="rounded-3xl max-w-md bg-white p-6">
            <DialogHeader>
              <DialogTitle className="font-display font-black text-lg text-[#023010]">
                Confirmation du Transfert de Stock
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5C6660]">
                Bordereau de sortie de stock pour rééquilibrage inter-officines.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2 text-xs">
              <div className="bg-[#EFF7F1] p-3 rounded-xl border border-[#CFE3D5]">
                <p className="font-bold text-sm text-[#023010]">{modaleTransfert.produit_nom}</p>
                <p className="text-[#5C6660] mt-0.5">Lot : {modaleTransfert.numero_lot}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#CFE3D5]">
                  <span>Origine : <b>{modaleTransfert.source_officine_nom}</b></span>
                  <span>Cible : <b>{modaleTransfert.dest_officine_nom}</b></span>
                </div>
              </div>

              <div>
                <Label htmlFor="quantite" className="font-bold text-xs text-[#1F2420]">
                  Quantité à transférer (boîtes)
                </Label>
                <Input
                  id="quantite"
                  type="number"
                  min="1"
                  max={modaleTransfert.source_stock}
                  value={quantiteTransfert}
                  onChange={(e) => setQuantiteTransfert(Number(e.target.value))}
                  className="rounded-xl mt-1.5"
                />
                <p className="text-[11px] text-[#5C6660] mt-1">
                  Stock disponible source : {modaleTransfert.source_stock} boîtes
                </p>
              </div>
            </div>

            <DialogFooter className="mt-2 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setModaleTransfert(null)}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={validerTransfertOpportunite}
                disabled={mutationTransfert.isPending || quantiteTransfert <= 0}
                className="rounded-xl bg-[#023010] hover:bg-[#18AA38] text-white font-bold"
              >
                {mutationTransfert.isPending ? "Création..." : "Confirmer le transfert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
