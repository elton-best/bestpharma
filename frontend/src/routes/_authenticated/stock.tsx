import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PackageCheck,
  AlertOctagon,
  Calendar,
  AlertTriangle,
  Plus,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Archive,
  ArrowRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/stock")({
  head: () => ({
    meta: [
      { title: "Stocks & Traçabilité FEFO — BEGPHARMA" },
      {
        name: "description",
        content: "Gestion des stocks par lots avec priorité stricte FEFO et alertes de péremption selon le Guide BPD.",
      },
    ],
  }),
  component: PageStockFefo,
});

interface Produit {
  id: string;
  code_cip: string;
  nom_commercial: string;
  dci?: string;
  forme?: string;
  dosage?: string;
  tableau_substance: "sans" | "liste_1" | "liste_2" | "stupefiant";
  est_thermolabile: boolean;
  prix_public_ttc: number;
  stock_total: number;
  alerte_rupture: boolean;
  prochain_lot_fefo?: {
    id: string;
    numero_lot: string;
    date_peremption: string;
    quantite_disponible: number;
    jours_avant_peremption: number;
    statut_peremption: string;
  };
}

interface StockLotItem {
  id: string;
  produit_id: string;
  numero_lot: string;
  date_peremption: string;
  quantite_disponible: number;
  quantite_initiale: number;
  emplacement: string;
  fournisseur_nom: string;
  bon_livraison_ref: string;
  statut: "en_stock" | "quarantaine" | "epuise" | "retire";
  motif_quarantaine?: string;
  jours_avant_peremption: number;
  statut_peremption: string;
  produit: Produit;
}

function PageStockFefo() {
  const queryClient = useQueryClient();
  const [recherche, setRecherche] = useState("");
  const [filtreAlerte, setFiltreAlerte] = useState<string>("tous");
  const [dialogReceptionOuvert, setDialogReceptionOuvert] = useState(false);
  const [dialogQuarantaineOuvert, setDialogQuarantaineOuvert] = useState(false);
  const [lotPourQuarantaine, setLotPourQuarantaine] = useState<StockLotItem | null>(null);
  const [motifQuarantaine, setMotifQuarantaine] = useState("");

  // Formulaire nouvelle entrée de stock
  const [produitId, setProduitId] = useState("");
  const [numeroLot, setNumeroLot] = useState("");
  const [datePeremption, setDatePeremption] = useState("");
  const [quantite, setQuantite] = useState("");
  const [fournisseurNom, setFournisseurNom] = useState("CAMEG BÉNIN");
  const [bonLivraisonRef, setBonLivraisonRef] = useState("");
  const [emplacement, setEmplacement] = useState("Rayonnage Principal");

  // Requête produits
  const { data: produitsData } = useQuery<{ data: Produit[] }>({
    queryKey: ["produits"],
    queryFn: () => api.get("/produits"),
  });

  // Requête lots avec filtre
  const { data: lotsData, isLoading } = useQuery<{
    data: StockLotItem[];
    stats: {
      perimes: number;
      critiques_1m: number;
      alertes_3m: number;
      total_lots_actifs: number;
    };
  }>({
    queryKey: ["stocks", filtreAlerte, recherche],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtreAlerte !== "tous") params.append("alerte", filtreAlerte);
      if (recherche) params.append("q", recherche);
      return api.get(`/stocks?${params.toString()}`);
    },
  });

  const mutationReception = useMutation({
    mutationFn: (payload: any) => api.post("/stocks", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Lot réceptionné et ordonné selon la règle FEFO !");
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      setDialogReceptionOuvert(false);
      setNumeroLot("");
      setDatePeremption("");
      setQuantite("");
      setBonLivraisonRef("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la réception du stock");
    },
  });

  const mutationQuarantaine = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      api.post(`/stocks/${id}/quarantaine`, { motif }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Lot placé en quarantaine immédiate");
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      setDialogQuarantaineOuvert(false);
      setMotifQuarantaine("");
      setLotPourQuarantaine(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Impossible de mettre en quarantaine");
    },
  });

  const mutationLeverQuarantaine = useMutation({
    mutationFn: (id: string) => api.post(`/stocks/${id}/lever-quarantaine`, {}),
    onSuccess: (res: any) => {
      toast.success(res.message || "Lot réintégré en stock");
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la réintégration");
    },
  });

  const produits = produitsData?.data || [];
  const lots = lotsData?.data || [];
  const stats = lotsData?.stats || { perimes: 0, critiques_1m: 0, alertes_3m: 0, total_lots_actifs: 0 };

  const handleReceptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produitId || !numeroLot || !datePeremption || !quantite || !bonLivraisonRef) {
      toast.error("Veuillez renseigner tous les champs obligatoires");
      return;
    }
    mutationReception.mutate({
      produit_id: produitId,
      numero_lot: numeroLot,
      date_peremption: datePeremption,
      quantite: parseInt(quantite, 10),
      fournisseur_nom: fournisseurNom,
      bon_livraison_ref: bonLivraisonRef,
      emplacement,
    });
  };

  const badgeAlerte = (statutPeremption: string, jours: number) => {
    if (statutPeremption === "perime" || jours < 0) {
      return (
        <Badge className="bg-red-600 text-white gap-1">
          <AlertOctagon className="w-3 h-3" /> Périmé ({jours} j)
        </Badge>
      );
    }
    if (statutPeremption === "critique_1m" || jours <= 30) {
      return (
        <Badge className="bg-red-500 text-white gap-1 animate-pulse">
          <AlertTriangle className="w-3 h-3" /> Critique (&lt; 30 j)
        </Badge>
      );
    }
    if (statutPeremption === "alerte_3m" || jours <= 90) {
      return (
        <Badge className="bg-amber-500 text-white gap-1">
          <Clock className="w-3 h-3" /> Alerte (&lt; 3 mois)
        </Badge>
      );
    }
    if (statutPeremption === "attention_6m" || jours <= 180) {
      return (
        <Badge className="bg-blue-600 text-white gap-1">
          <Calendar className="w-3 h-3" /> Attention (&lt; 6 mois)
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-600 text-white gap-1">
        <CheckCircle2 className="w-3 h-3" /> Conforme ({jours} j)
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Gestion des Stocks & Priorité FEFO
            </h1>
            <Badge variant="outline" className="border-emerald-600 text-emerald-700">
              Guide BPD Art. 5.08
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            First Expired, First Out (Premier Périmé, Premier Sorti). Suivi rigoureux des dates de
            péremption et mise en quarantaine immédiate.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setDialogReceptionOuvert(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4" /> Réceptionner un Lot (Grossiste)
          </Button>
        </div>
      </div>

      {/* Cartes d'indicateurs BPD */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Lots Actifs en Stock</CardTitle>
            <Layers className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.total_lots_actifs}</div>
            <p className="text-xs text-slate-500 mt-1">Classés par ordre de péremption</p>
          </CardContent>
        </Card>

        <Card className={`border-slate-200 ${stats.critiques_1m > 0 ? "border-red-400 bg-red-50/30" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Périme &lt; 30 Jours</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critiques_1m}</div>
            <p className="text-xs text-slate-500 mt-1">À dispenser en priorité absolue ou déstocker</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Alerte &lt; 3 Mois</CardTitle>
            <Clock className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.alertes_3m}</div>
            <p className="text-xs text-slate-500 mt-1">Surveillance rapprochée</p>
          </CardContent>
        </Card>

        <Card className={`border-slate-200 ${stats.perimes > 0 ? "border-red-600 bg-red-50" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Lots Périmés (Interdits)</CardTitle>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.perimes}</div>
            <p className="text-xs text-red-600 mt-1">Mise en quarantaine obligatoire</p>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche et filtres FEFO */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par médicament, DCI, CIP ou numéro de lot..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Filtrer par DLU :</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: "tous", label: "Tous" },
                  { id: "critique_1m", label: "< 30 jours" },
                  { id: "alerte_3m", label: "< 3 mois" },
                  { id: "attention_6m", label: "< 6 mois" },
                  { id: "perime", label: "Périmés" },
                ].map((f) => (
                  <Button
                    key={f.id}
                    variant={filtreAlerte === f.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltreAlerte(f.id)}
                    className={
                      filtreAlerte === f.id
                        ? "bg-emerald-600 text-white text-xs h-8"
                        : "text-slate-600 text-xs h-8"
                    }
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des lots classés selon FEFO */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Lots de Médicaments en Stock (Ordre de Sortie FEFO)
              </CardTitle>
              <CardDescription>
                Les lots avec la date de péremption la plus proche sont toujours alloués en priorité
                automatique lors des dispensations.
              </CardDescription>
            </div>
            <Badge className="bg-slate-100 text-slate-700">
              {lots.length} lot{lots.length > 1 ? "s" : ""} listé{lots.length > 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement de l'inventaire FEFO...</div>
          ) : lots.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Aucun lot trouvé correspondant aux filtres sélectionnés.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Priorité FEFO</th>
                    <th className="py-3 px-4 font-semibold">Médicament & DCI</th>
                    <th className="py-3 px-4 font-semibold">N° Lot & Grossiste</th>
                    <th className="py-3 px-4 font-semibold">Date Péremption</th>
                    <th className="py-3 px-4 font-semibold">Quantité Dispo</th>
                    <th className="py-3 px-4 font-semibold">Emplacement</th>
                    <th className="py-3 px-4 font-semibold">Statut</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions BPD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lots.map((lot, idx) => (
                    <tr
                      key={lot.id}
                      className={`hover:bg-slate-50/80 ${
                        lot.statut === "quarantaine"
                          ? "bg-amber-50/50"
                          : idx === 0 && lot.quantite_disponible > 0
                          ? "bg-emerald-50/30"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        {idx === 0 && lot.statut === "en_stock" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <ArrowRight className="w-3 h-3" /> Prochain à sortir
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">#{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {lot.produit?.nom_commercial || "Produit sans nom"}
                        </div>
                        <div className="text-xs text-slate-500">
                          CIP: {lot.produit?.code_cip} | DCI: {lot.produit?.dci || "N/A"}
                        </div>
                        {lot.produit?.est_thermolabile && (
                          <span className="inline-block mt-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            ❄️ 2°C–8°C
                          </span>
                        )}
                        {lot.produit?.tableau_substance === "stupefiant" && (
                          <span className="inline-block mt-0.5 ml-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            🔒 Stupéfiant
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs font-bold text-slate-800">
                          {lot.numero_lot}
                        </div>
                        <div className="text-xs text-slate-500">
                          Fournisseur: {lot.fournisseur_nom || "N/A"} (BL: {lot.bon_livraison_ref})
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{lot.date_peremption}</div>
                        <div className="mt-1">
                          {badgeAlerte(lot.statut_peremption, lot.jours_avant_peremption)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-base">
                          {lot.quantite_disponible}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">
                          / {lot.quantite_initiale} init.
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          {lot.emplacement}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {lot.statut === "en_stock" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            Disponible
                          </Badge>
                        ) : lot.statut === "quarantaine" ? (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Quarantaine
                          </Badge>
                        ) : (
                          <Badge variant="outline">{lot.statut}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {lot.statut === "en_stock" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLotPourQuarantaine(lot);
                              setDialogQuarantaineOuvert(true);
                            }}
                            className="text-xs text-amber-700 hover:bg-amber-50 border-amber-300"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Mettre en quarantaine
                          </Button>
                        ) : lot.statut === "quarantaine" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => mutationLeverQuarantaine.mutate(lot.id)}
                            className="text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Lever quarantaine
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Réception Lot Grossiste */}
      <Dialog open={dialogReceptionOuvert} onOpenChange={setDialogReceptionOuvert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Réception de Stock (Grossiste)</DialogTitle>
            <DialogDescription>
              Enregistrez un nouveau lot fournisseur conforme au Guide BPD.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReceptionSubmit} className="space-y-4">
            <div>
              <Label>Médicament du catalogue *</Label>
              <select
                className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm bg-white"
                value={produitId}
                onChange={(e) => {
                  setProduitId(e.target.value);
                  const prod = produits.find((p) => p.id === e.target.value);
                  if (prod?.est_thermolabile) {
                    setEmplacement("Réfrigérateur 2°C–8°C");
                  }
                }}
                required
              >
                <option value="">Sélectionner un produit...</option>
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom_commercial} ({p.code_cip}) {p.est_thermolabile ? "❄️" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Numéro de lot *</Label>
                <Input
                  placeholder="Ex: LOT-2026-99"
                  value={numeroLot}
                  onChange={(e) => setNumeroLot(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Date de péremption *</Label>
                <Input
                  type="date"
                  value={datePeremption}
                  onChange={(e) => setDatePeremption(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantité reçue *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 50"
                  value={quantite}
                  onChange={(e) => setQuantite(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>N° Bon de Livraison *</Label>
                <Input
                  placeholder="Ex: BL-2026-1045"
                  value={bonLivraisonRef}
                  onChange={(e) => setBonLivraisonRef(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fournisseur Grossiste</Label>
                <select
                  className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm bg-white"
                  value={fournisseurNom}
                  onChange={(e) => setFournisseurNom(e.target.value)}
                >
                  <option value="CAMEG BÉNIN">CAMEG BÉNIN</option>
                  <option value="UBIPHARM BÉNIN">UBIPHARM BÉNIN</option>
                  <option value="LABOREX BÉNIN">LABOREX BÉNIN</option>
                  <option value="Autre Grossiste Répartiteur">Autre Grossiste</option>
                </select>
              </div>
              <div>
                <Label>Emplacement de stockage</Label>
                <Input
                  value={emplacement}
                  onChange={(e) => setEmplacement(e.target.value)}
                  placeholder="Rayonnage, Frigo..."
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogReceptionOuvert(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={mutationReception.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {mutationReception.isPending ? "Enregistrement..." : "Confirmer la réception"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Mise en Quarantaine */}
      <Dialog open={dialogQuarantaineOuvert} onOpenChange={setDialogQuarantaineOuvert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Mise en Quarantaine Immédiate (Art. 5.14)
            </DialogTitle>
            <DialogDescription>
              Le lot {lotPourQuarantaine?.numero_lot} de {lotPourQuarantaine?.produit?.nom_commercial} sera
              immédiatement bloqué de toute délivrance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motif officiel de mise en quarantaine *</Label>
              <textarea
                className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm"
                rows={3}
                placeholder="Ex: Rappel de lot fabricant, emballage endommagé, suspicion de dégradation thermique..."
                value={motifQuarantaine}
                onChange={(e) => setMotifQuarantaine(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogQuarantaineOuvert(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!motifQuarantaine || mutationQuarantaine.isPending}
                onClick={() => {
                  if (lotPourQuarantaine) {
                    mutationQuarantaine.mutate({
                      id: lotPourQuarantaine.id,
                      motif: motifQuarantaine,
                    });
                  }
                }}
              >
                {mutationQuarantaine.isPending ? "Traitement..." : "Confirmer le blocage"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
