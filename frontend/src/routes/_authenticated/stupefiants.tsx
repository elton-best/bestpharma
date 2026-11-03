import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Lock,
  ShieldAlert,
  ShieldCheck,
  FileSpreadsheet,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/stupefiants")({
  head: () => ({
    meta: [
      { title: "Registre Officiel des Stupéfiants — BEGPHARMA" },
      {
        name: "description",
        content: "Registre officiel inaltérable des stupéfiants avec balance permanente et visa du pharmacien (BPD-3).",
      },
    ],
  }),
  component: PageStupefiants,
});

interface MouvementStupefiant {
  id: string;
  numero_ordre: number;
  date_mouvement: string;
  type_mouvement: "entree_livraison" | "sortie_dispensation" | "destruction_perime" | "ajustement_inventaire";
  quantite: number;
  stock_precedent: number;
  stock_nouveau: number;
  reference_piece: string;
  tiers_nom: string;
  prescripteur_nom?: string;
  observations?: string;
  date_visa?: string;
  produit?: {
    nom_commercial: string;
    dosage?: string;
    code_cip: string;
  };
  lot?: {
    numero_lot: string;
    date_peremption: string;
  };
  operateur?: {
    name: string;
  };
  pharmacien_visa?: {
    name: string;
  };
}

interface BalanceProduit {
  id: string;
  code_cip: string;
  nom_commercial: string;
  dosage?: string;
  stock_theorique_registre: number;
  stock_physique_lots: number;
  concordance_exacte: boolean;
  non_vises_count: number;
}

function PageStupefiants() {
  const queryClient = useQueryClient();
  const [recherche, setRecherche] = useState("");

  const { data: donnees, isLoading } = useQuery<{
    data: {
      data: MouvementStupefiant[];
      total: number;
    };
    balance_produits: BalanceProduit[];
  }>({
    queryKey: ["stupefiants"],
    queryFn: () => api.get("/stupefiants"),
  });

  const mutationViser = useMutation({
    mutationFn: (id: string) => api.post(`/stupefiants/${id}/viser`, {}),
    onSuccess: (res: any) => {
      toast.success(res.message || "Visa apposé sur la ligne de registre");
      queryClient.invalidateQueries({ queryKey: ["stupefiants"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur : Seul un pharmacien peut viser le registre");
    },
  });

  const mouvements = donnees?.data?.data || [];
  const balance = donnees?.balance_produits || [];

  return (
    <div className="space-y-6">
      {/* En-tête officiel BPD */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Registre Spécial des Stupéfiants & Substances Vénéneuses
            </h1>
            <Badge variant="outline" className="border-purple-600 text-purple-700 bg-purple-50">
              Tableau B — Art. 7.15 à 7.20
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Registre officiel coté et paraphé inaltérable. Balance permanente en temps réel et visa
            obligatoire du pharmacien titulaire.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-slate-900 text-white gap-1 px-3 py-1 text-xs">
            <Lock className="w-3.5 h-3.5" /> Armoire Sécurisée Fermée à Clé
          </Badge>
        </div>
      </div>

      {/* État de la balance permanente par substance stupéfiante */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600" /> Balance Permanente des Stupéfiants en Stock
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {balance.length === 0 ? (
            <Card className="col-span-3 border-dashed border-slate-300">
              <CardContent className="pt-6 text-center text-slate-500 text-sm">
                Aucun produit classé comme stupéfiant dans le catalogue.
              </CardContent>
            </Card>
          ) : (
            balance.map((b) => (
              <Card
                key={b.id}
                className={`border-slate-200 ${
                  !b.concordance_exacte ? "border-red-500 bg-red-50/20" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900 truncate">
                      {b.nom_commercial}
                    </CardTitle>
                    {b.concordance_exacte ? (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Conforme
                      </span>
                    ) : (
                      <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                        <AlertOctagon className="w-3.5 h-3.5" /> Écart
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Dosage: {b.dosage || "N/A"} | CIP: {b.code_cip}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Stock Théorique (Registre) :</span>
                    <strong className="text-slate-900 font-mono text-base">
                      {b.stock_theorique_registre}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Stock Physique (Lots) :</span>
                    <strong className="text-slate-900 font-mono text-base">
                      {b.stock_physique_lots}
                    </strong>
                  </div>
                  {b.non_vises_count > 0 && (
                    <div className="text-xs text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                      ⚠️ {b.non_vises_count} mouvement(s) en attente de visa pharmacien
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Registre inaltérable chronologique */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Feuillets Chronologiques du Registre Officiel
              </CardTitle>
              <CardDescription>
                Chaque entrée ou sortie met à jour instantanément la balance sans modification ultérieure
                possible.
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Filtrer n° ordre, pièce, patient..."
                className="pl-9 h-9 text-xs"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement du registre officiel...</div>
          ) : mouvements.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Aucun mouvement de stupéfiant enregistré dans le registre.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-3 px-3 font-semibold">N° Ordre</th>
                    <th className="py-3 px-3 font-semibold">Date & Heure</th>
                    <th className="py-3 px-3 font-semibold">Produit Stupéfiant</th>
                    <th className="py-3 px-3 font-semibold">Mouvement</th>
                    <th className="py-3 px-3 font-semibold text-center">Entrée / Sortie</th>
                    <th className="py-3 px-3 font-semibold text-center">Nouveau Solde</th>
                    <th className="py-3 px-3 font-semibold">Réf. Pièce & Tiers</th>
                    <th className="py-3 px-3 font-semibold">Visa Pharmacien</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {mouvements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 font-sans">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        #{String(m.numero_ordre).padStart(4, "0")}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {new Date(m.date_mouvement).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">
                          {m.produit?.nom_commercial}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Lot: {m.lot?.numero_lot || "N/A"}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {m.type_mouvement === "entree_livraison" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[11px]">
                            Entrée Réception
                          </Badge>
                        ) : m.type_mouvement === "sortie_dispensation" ? (
                          <Badge className="bg-purple-100 text-purple-800 text-[11px]">
                            Sortie Délivrance
                          </Badge>
                        ) : (
                          <Badge variant="outline">{m.type_mouvement}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {m.type_mouvement === "entree_livraison" ? (
                          <span className="text-emerald-700">+{m.quantite}</span>
                        ) : (
                          <span className="text-purple-700">-{m.quantite}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                        {m.stock_nouveau}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{m.reference_piece}</div>
                        <div className="text-[11px] text-slate-500">
                          {m.tiers_nom} {m.prescripteur_nom ? `(Presc: ${m.prescripteur_nom})` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {m.pharmacien_visa ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[11px] gap-1">
                            <ShieldCheck className="w-3 h-3" /> Dr {m.pharmacien_visa.name}
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => mutationViser.mutate(m.id)}
                            className="text-[11px] h-7 text-purple-700 border-purple-300 hover:bg-purple-50"
                          >
                            Viser (Dr)
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
