import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  User,
  FileText,
  Clock,
  ShieldCheck,
  Search,
  ShoppingCart,
  BadgeCheck,
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

export const Route = createFileRoute("/_authenticated/dispensation")({
  head: () => ({
    meta: [
      { title: "Délivrance & Ordonnancier BPD — BEGPHARMA" },
      {
        name: "description",
        content: "Délivrance pharmaceutique avec allocation FEFO automatique et traçabilité ordonnancier selon l'ABMed.",
      },
    ],
  }),
  component: PageDispensation,
});

interface ProduitItem {
  id: string;
  code_cip: string;
  nom_commercial: string;
  dci?: string;
  dosage?: string;
  forme?: string;
  tableau_substance: "sans" | "liste_1" | "liste_2" | "stupefiant";
  est_thermolabile: boolean;
  necessite_ordonnance: boolean;
  prix_public_ttc: number;
  stock_total: number;
  prochain_lot_fefo?: {
    id: string;
    numero_lot: string;
    date_peremption: string;
    quantite_disponible: number;
  };
}

interface LigneSaisie {
  produit_id: string;
  produit: ProduitItem;
  quantite: number;
  posologie: string;
  duree_traitement: string;
}

function PageDispensation() {
  const queryClient = useQueryClient();

  const [dialogNouvelleDispensation, setDialogNouvelleDispensation] = useState(false);
  const [typeDispensation, setTypeDispensation] = useState<"ordonnance" | "conseil_sans_ordonnance">("ordonnance");
  const [patientNom, setPatientNom] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientTelephone, setPatientTelephone] = useState("");
  const [prescripteurNom, setPrescripteurNom] = useState("");
  const [prescripteurTitre, setPrescripteurTitre] = useState("Dr");
  const [prescripteurCentre, setPrescripteurCentre] = useState("");
  const [commentaires, setCommentaires] = useState("");

  // Lignes du panier de délivrance
  const [lignes, setLignes] = useState<LigneSaisie[]>([]);
  const [produitRecherche, setProduitRecherche] = useState("");
  const [quantiteSelectionnee, setQuantiteSelectionnee] = useState(1);
  const [posologieSelectionnee, setPosologieSelectionnee] = useState("");
  const [dureeSelectionnee, setDureeSelectionnee] = useState("5 jours");

  // Requête produits avec stock FEFO
  const { data: produitsData } = useQuery<{ data: ProduitItem[] }>({
    queryKey: ["produits"],
    queryFn: () => api.get("/produits"),
  });

  // Requête historique des dispensations (Ordonnancier)
  const { data: dispensationsData, isLoading } = useQuery<{
    data: {
      data: any[];
      total: number;
    };
  }>({
    queryKey: ["dispensations"],
    queryFn: () => api.get("/dispensations"),
  });

  const mutationCreerDispensation = useMutation({
    mutationFn: (payload: any) => api.post("/dispensations", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Dispensation enregistrée et stock décrémenté selon FEFO !");
      queryClient.invalidateQueries({ queryKey: ["dispensations"] });
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      queryClient.invalidateQueries({ queryKey: ["stupefiants"] });
      setDialogNouvelleDispensation(false);
      reinitialiserFormulaire();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la dispensation");
    },
  });

  const mutationViser = useMutation({
    mutationFn: (id: string) => api.post(`/dispensations/${id}/viser`, {}),
    onSuccess: (res: any) => {
      toast.success(res.message || "Dispensation visée par le pharmacien !");
      queryClient.invalidateQueries({ queryKey: ["dispensations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Impossible de viser cette dispensation");
    },
  });

  const reinitialiserFormulaire = () => {
    setPatientNom("");
    setPatientAge("");
    setPatientTelephone("");
    setPrescripteurNom("");
    setPrescripteurCentre("");
    setCommentaires("");
    setLignes([]);
  };

  const produits = produitsData?.data || [];
  const dispensations = dispensationsData?.data?.data || [];

  const produitsFiltres = produits.filter(
    (p) =>
      p.nom_commercial.toLowerCase().includes(produitRecherche.toLowerCase()) ||
      p.code_cip.includes(produitRecherche) ||
      (p.dci && p.dci.toLowerCase().includes(produitRecherche.toLowerCase()))
  );

  const ajouterLigne = (produit: ProduitItem) => {
    if (produit.stock_total < quantiteSelectionnee) {
      toast.error(`Stock insuffisant pour ${produit.nom_commercial} (${produit.stock_total} dispo)`);
      return;
    }

    const existante = lignes.find((l) => l.produit_id === produit.id);
    if (existante) {
      setLignes(
        lignes.map((l) =>
          l.produit_id === produit.id
            ? { ...l, quantite: l.quantite + quantiteSelectionnee }
            : l
        )
      );
    } else {
      setLignes([
        ...lignes,
        {
          produit_id: produit.id,
          produit,
          quantite: quantiteSelectionnee,
          posologie: posologieSelectionnee || "Selon prescription",
          duree_traitement: dureeSelectionnee,
        },
      ]);
    }
    setPosologieSelectionnee("");
    setQuantiteSelectionnee(1);
    toast.success(`${produit.nom_commercial} ajouté au panier de délivrance`);
  };

  const supprimerLigne = (produitId: string) => {
    setLignes(lignes.filter((l) => l.produit_id !== produitId));
  };

  const totalPanier = lignes.reduce(
    (acc, l) => acc + l.quantite * l.produit.prix_public_ttc,
    0
  );

  const handleSubmitDispensation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientNom) {
      toast.error("Veuillez renseigner le nom du patient");
      return;
    }
    if (lignes.length === 0) {
      toast.error("Veuillez ajouter au moins un médicament à délivrer");
      return;
    }

    mutationCreerDispensation.mutate({
      type_dispensation: typeDispensation,
      patient_nom: patientNom,
      patient_age: patientAge ? parseInt(patientAge, 10) : null,
      patient_telephone: patientTelephone || null,
      prescripteur_nom: prescripteurNom || null,
      prescripteur_titre: prescripteurTitre || null,
      prescripteur_centre: prescripteurCentre || null,
      commentaires_posologie: commentaires || null,
      lignes: lignes.map((l) => ({
        produit_id: l.produit_id,
        quantite: l.quantite,
        posologie: l.posologie,
        duree_traitement: l.duree_traitement,
      })),
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Poste de Dispensation & Ordonnancier
            </h1>
            <Badge variant="outline" className="border-emerald-600 text-emerald-700">
              Guide BPD Chapitre 5
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Délivrance sécurisée des ordonnances, allocation automatique FEFO des lots, conseils et visa
            pharmaceutique.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setDialogNouvelleDispensation(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nouvelle Dispensation Ordonnance
          </Button>
        </div>
      </div>

      {/* Cartes métriques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Dispensations Enregistrées</CardTitle>
            <FileText className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{dispensations.length}</div>
            <p className="text-xs text-slate-500 mt-1">Ordonnancier officiel tenu en temps réel</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Règle FEFO Appliquée</CardTitle>
            <BadgeCheck className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">100% Automatique</div>
            <p className="text-xs text-slate-500 mt-1">Prélèvement prioritaire du lot le plus ancien</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Sécurité Stupéfiants</CardTitle>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">Inaltérable</div>
            <p className="text-xs text-slate-500 mt-1">Écriture automatique au registre officiel</p>
          </CardContent>
        </Card>
      </div>

      {/* Historique Ordonnancier */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Registre Ordonnancier & Dispensations Délivrées
          </CardTitle>
          <CardDescription>
            Traçabilité intégrale : prescripteur, patient, lot FEFO délivré et visa du pharmacien titulaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement de l'ordonnancier...</div>
          ) : dispensations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Aucune dispensation enregistrée pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">N° Dispensation</th>
                    <th className="py-3 px-4 font-semibold">Patient & Contact</th>
                    <th className="py-3 px-4 font-semibold">Prescripteur & Centre</th>
                    <th className="py-3 px-4 font-semibold">Médicaments & Lots Déstockés</th>
                    <th className="py-3 px-4 font-semibold">Montant TTC</th>
                    <th className="py-3 px-4 font-semibold">Dispensateur</th>
                    <th className="py-3 px-4 font-semibold">Visa Pharmacien</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispensations.map((disp: any) => (
                    <tr key={disp.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                        {disp.numero_dispensation}
                        <div className="text-[11px] text-slate-400 font-normal">
                          {new Date(disp.created_at).toLocaleDateString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{disp.patient_nom}</div>
                        <div className="text-xs text-slate-500">
                          {disp.patient_age ? `${disp.patient_age} ans` : ""} {disp.patient_telephone ? `| ${disp.patient_telephone}` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">
                          {disp.prescripteur_nom || "Sans ordonnance (Conseil)"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {disp.prescripteur_centre || ""}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {disp.lignes?.map((l: any) => (
                            <div key={l.id} className="text-xs text-slate-800">
                              <span className="font-semibold">{l.quantite}x</span>{" "}
                              {l.produit?.nom_commercial}{" "}
                              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                                Lot {l.lot?.numero_lot} (Exp: {l.lot?.date_peremption})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {Number(disp.montant_total).toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {disp.dispensateur?.name || "Dispensateur"}
                      </td>
                      <td className="py-3 px-4">
                        {disp.pharmacien ? (
                          <Badge className="bg-emerald-100 text-emerald-800 gap-1 hover:bg-emerald-100">
                            <ShieldCheck className="w-3 h-3" /> Visé par {disp.pharmacien?.name}
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => mutationViser.mutate(disp.id)}
                            className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                          >
                            Viser (Pharmacien)
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

      {/* Modal Plein Écran de Nouvelle Dispensation */}
      <Dialog open={dialogNouvelleDispensation} onOpenChange={setDialogNouvelleDispensation}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Stethoscope className="w-5 h-5" /> Poste de Délivrance & Allocation FEFO
            </DialogTitle>
            <DialogDescription>
              Renseignez les données du patient et de la prescription. Les lots sont déstockés
              automatiquement selon leur date de péremption la plus proche.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitDispensation} className="space-y-6">
            {/* Données Patient & Prescripteur */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Informations Patient
                </h4>
                <div>
                  <Label>Nom & Prénom du Patient *</Label>
                  <Input
                    placeholder="Ex: Koffi A. DOSSOU"
                    value={patientNom}
                    onChange={(e) => setPatientNom(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Âge (ans)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 42"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      placeholder="+229 97 00 00 00"
                      value={patientTelephone}
                      onChange={(e) => setPatientTelephone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Prescription Médicale
                </h4>
                <div>
                  <Label>Médecin / Prescripteur</Label>
                  <Input
                    placeholder="Ex: Dr Agbodjogbe (Cardiologue)"
                    value={prescripteurNom}
                    onChange={(e) => setPrescripteurNom(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Établissement Prescripteur</Label>
                  <Input
                    placeholder="Ex: CNHU-HKM Cotonou, Clinique Mahouna..."
                    value={prescripteurCentre}
                    onChange={(e) => setPrescripteurCentre(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Sélection Médicament avec allocation FEFO */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">
                Ajouter un médicament ordonnancé
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <Label>Rechercher médicament du catalogue</Label>
                  <Input
                    placeholder="Ex: Amoxicilline, Paracétamol..."
                    value={produitRecherche}
                    onChange={(e) => setProduitRecherche(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantiteSelectionnee}
                    onChange={(e) => setQuantiteSelectionnee(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Posologie</Label>
                  <Input
                    placeholder="Ex: 1 cp matin et soir"
                    value={posologieSelectionnee}
                    onChange={(e) => setPosologieSelectionnee(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Durée</Label>
                  <Input
                    value={dureeSelectionnee}
                    onChange={(e) => setDureeSelectionnee(e.target.value)}
                  />
                </div>
              </div>

              {/* Suggestions rapides des produits trouvés */}
              {produitRecherche.trim().length > 1 && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md divide-y bg-white shadow-sm">
                  {produitsFiltres.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">Aucun médicament trouvé</div>
                  ) : (
                    produitsFiltres.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                        onClick={() => ajouterLigne(p)}
                      >
                        <div>
                          <div className="font-medium text-sm text-slate-900">
                            {p.nom_commercial} ({p.dosage || ""})
                          </div>
                          <div className="text-xs text-slate-500">
                            Stock dispo : <strong className="text-slate-800">{p.stock_total}</strong> | Prix TTC : {p.prix_public_ttc} FCFA
                          </div>
                          {p.prochain_lot_fefo && (
                            <div className="text-[11px] text-emerald-700 font-mono">
                              Lot FEFO prioritaire : {p.prochain_lot_fefo.numero_lot} (Exp: {p.prochain_lot_fefo.date_peremption})
                            </div>
                          )}
                        </div>
                        <Button type="button" size="sm" variant="secondary" className="gap-1 text-xs">
                          <Plus className="w-3 h-3" /> Ajouter
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Panier des médicaments à délivrer */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">
                Médicaments préparés pour délivrance ({lignes.length})
              </h4>
              {lignes.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                  Aucun médicament ajouté à la dispensation.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs">
                      <tr>
                        <th className="py-2 px-3 text-left">Médicament</th>
                        <th className="py-2 px-3 text-left">Lot FEFO Prioritaire</th>
                        <th className="py-2 px-3 text-center">Qté</th>
                        <th className="py-2 px-3 text-left">Posologie</th>
                        <th className="py-2 px-3 text-right">Montant</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lignes.map((l) => (
                        <tr key={l.produit_id}>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {l.produit.nom_commercial}
                            {l.produit.tableau_substance === "stupefiant" && (
                              <span className="ml-2 text-[10px] font-bold text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                                Stupéfiant
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-xs font-mono text-emerald-700">
                            {l.produit.prochain_lot_fefo
                              ? `${l.produit.prochain_lot_fefo.numero_lot} (${l.produit.prochain_lot_fefo.date_peremption})`
                              : "Attribution auto"}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-900">{l.quantite}</td>
                          <td className="py-2 px-3 text-xs text-slate-600">
                            {l.posologie} ({l.duree_traitement})
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-900">
                            {(l.quantite * l.produit.prix_public_ttc).toLocaleString("fr-FR")} FCFA
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => supprimerLigne(l.produit_id)}
                              className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 text-right text-slate-700">
                          Total Ordonnance TTC :
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700 text-base">
                          {totalPanier.toLocaleString("fr-FR")} FCFA
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setDialogNouvelleDispensation(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={mutationCreerDispensation.isPending || lignes.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {mutationCreerDispensation.isPending ? "Validation..." : "Valider la délivrance & Déstocker FEFO"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
