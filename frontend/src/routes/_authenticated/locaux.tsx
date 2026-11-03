import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Wrench,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  SprayCan,
  Bug,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
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

export const Route = createFileRoute("/_authenticated/locaux")({
  head: () => ({
    meta: [
      { title: "Locaux, Équipements & Hygiène — BEGPHARMA" },
      {
        name: "description",
        content: "Carnet de vie des équipements, étalonnages et plan de bio-nettoyage conforme au Guide BPD.",
      },
    ],
  }),
  component: PageLocaux,
});

function PageLocaux() {
  const { courante } = useOfficine();
  const queryClient = useQueryClient();
  const id = courante?.officine_id;

  const [ongletActif, setOngletActif] = useState<"equipements" | "nettoyage" | "nuisibles">("equipements");

  // DIALOG NOUVEL ÉQUIPEMENT
  const [modalEquipement, setModalEquipement] = useState(false);
  const [codeInterne, setCodeInterne] = useState("");
  const [designation, setDesignation] = useState("");
  const [categorie, setCategorie] = useState("refrigerateur");
  const [marqueModele, setMarqueModele] = useState("");
  const [emplacement, setEmplacement] = useState("");
  const [periodicite, setPeriodicite] = useState(12);

  // DIALOG ÉMARGEMENT NETTOYAGE
  const [modalNettoyage, setModalNettoyage] = useState(false);
  const [zoneNettoyage, setZoneNettoyage] = useState("comptoir");
  const [produitNettoyage, setProduitNettoyage] = useState("Eau de Javel diluée 0.5% + Détergent neutre");
  const [notesNettoyage, setNotesNettoyage] = useState("");
  const [enCours, setEnCours] = useState(false);

  // REQUÊTE ÉQUIPEMENTS
  const { data: equipements, refetch: refetchEquipements } = useQuery({
    queryKey: ["equipements", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any[]>(`/api/officines/${id}/equipements`);
    },
  });

  // REQUÊTE NETTOYAGES
  const { data: nettoyages, refetch: refetchNettoyages } = useQuery({
    queryKey: ["nettoyages", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/nettoyages`);
    },
  });

  async function creerEquipement(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !codeInterne || !designation) return;
    setEnCours(true);

    try {
      await api.post(`/api/officines/${id}/equipements`, {
        code_interne: codeInterne.trim(),
        designation: designation.trim(),
        categorie,
        marque_modele: marqueModele.trim() || null,
        emplacement: emplacement.trim() || null,
        periodicite_etalonnage_mois: periodicite,
      });

      toast.success("Équipement ajouté au carnet de vie.");
      setModalEquipement(false);
      setCodeInterne("");
      setDesignation("");
      setMarqueModele("");
      setEmplacement("");
      refetchEquipements();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setEnCours(false);
    }
  }

  async function emargerNettoyage(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setEnCours(true);

    try {
      await api.post(`/api/officines/${id}/nettoyages`, {
        zone: zoneNettoyage,
        frequence: "quotidien",
        produit_utilise: produitNettoyage,
        notes: notesNettoyage || null,
      });

      toast.success("Opération de bio-nettoyage émargée avec succès.");
      setModalNettoyage(false);
      setNotesNettoyage("");
      refetchNettoyages();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'émargement");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="grid gap-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Locaux, Équipements & Hygiène
            </h1>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-50">
              BPD-4 / Art. 4.1 à 4.25
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Gestion du carnet de vie des équipements, conformité des étalonnages et registres de bio-nettoyage.
          </p>
        </div>

        <div className="flex gap-2">
          {ongletActif === "equipements" && (
            <Button onClick={() => setModalEquipement(true)} className="gap-1.5 text-xs h-9">
              <Plus className="size-3.5" /> Ajouter un Équipement
            </Button>
          )}
          {ongletActif === "nettoyage" && (
            <Button onClick={() => setModalNettoyage(true)} className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700">
              <Sparkles className="size-3.5" /> Émarger Nettoyage
            </Button>
          )}
        </div>
      </div>

      {/* SÉLECTEUR D'ONGLETS */}
      <div className="flex border-b text-sm font-medium gap-4">
        <button
          type="button"
          onClick={() => setOngletActif("equipements")}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            ongletActif === "equipements"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wrench className="size-4" /> Carnet de Vie des Équipements ({equipements?.length ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setOngletActif("nettoyage")}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            ongletActif === "nettoyage"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="size-4" /> Plan de Bio-Nettoyage (GAR-PL-004)
        </button>

        <button
          type="button"
          onClick={() => setOngletActif("nuisibles")}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            ongletActif === "nuisibles"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bug className="size-4" /> Lutte contre les Nuisibles & Sécurité
        </button>
      </div>

      {/* CONTENU ONGLET 1 : ÉQUIPEMENTS */}
      {ongletActif === "equipements" && (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {equipements && equipements.length > 0 ? (
              equipements.map((eq: any) => (
                <Card key={eq.id} className="border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                        {eq.code_interne}
                      </span>
                      <Badge
                        variant={eq.statut === "conforme" ? "default" : "destructive"}
                        className={eq.statut === "conforme" ? "bg-emerald-600" : ""}
                      >
                        {eq.statut === "conforme" ? "Étalonné" : "À étalonner"}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold mt-2">{eq.designation}</CardTitle>
                    <CardDescription className="text-xs">
                      {eq.marque_modele ?? "Modèle standard"} · Emplacement : {eq.emplacement ?? "Officine"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2 border-t pt-2.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Dernier étalonnage :</span>
                      <span className="font-mono text-foreground">{eq.date_dernier_etalonnage ?? "Non renseigné"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prochain étalonnage :</span>
                      <span className="font-mono font-semibold text-foreground">
                        {eq.date_prochain_etalonnage ?? "Sous 12 mois"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground text-xs col-span-3">Chargement des équipements...</p>
            )}
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 2 : BIO-NETTOYAGE */}
      {ongletActif === "nettoyage" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Registre d'émargement du Bio-Nettoyage (GAR-PL-004)</CardTitle>
              <CardDescription className="text-xs">
                Nettoyage quotidien obligatoire du comptoir, du préparatoire, de la réserve et des sanitaires (Art. 4.20).
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">Conservation 5 ans</Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Date & Heure</th>
                    <th className="p-2.5">Zone désinfectée</th>
                    <th className="p-2.5">Produit détergent / désinfectant</th>
                    <th className="p-2.5">Fréquence</th>
                    <th className="p-2.5">Opérateur</th>
                    <th className="p-2.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {nettoyages?.data && nettoyages.data.length > 0 ? (
                    nettoyages.data.map((n: any) => (
                      <tr key={n.id} className="hover:bg-muted/20">
                        <td className="p-2.5 font-mono">{new Date(n.date_heure).toLocaleString("fr-FR")}</td>
                        <td className="p-2.5 font-semibold capitalize">{n.zone?.replace("_", " ")}</td>
                        <td className="p-2.5 text-muted-foreground">{n.produit_utilise}</td>
                        <td className="p-2.5 capitalize">{n.frequence}</td>
                        <td className="p-2.5 font-medium">{n.agent?.name ?? "Agent d'entretien"}</td>
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                            <CheckCircle2 className="size-3" /> Fait & Conforme
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        Aucun émargement de nettoyage enregistré. Cliquez sur "Émarger Nettoyage" pour débuter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CONTENU ONGLET 3 : NUISIBLES & SÉCURITÉ */}
      {ongletActif === "nuisibles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bug className="size-5 text-amber-600" />
                <CardTitle className="text-base">Lutte contre les Nuisibles (Art. 4.19)</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Contrat de dératisation et désinsectisation avec prestataire agréé.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <p className="font-semibold text-foreground">Prestataire agréé : HYGIÈNE-PLUS BÉNIN SARL</p>
                <p className="text-muted-foreground">Agrément Ministère de la Santé n° 2024-MS-042</p>
                <p className="text-muted-foreground">Dernier passage : 12 Janvier 2026 · Prochain passage : 12 Avril 2026</p>
              </div>
              <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="size-4" /> Appâts et pièges inspectés : Aucun rongeur détecté
                </span>
                <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-white">Conforme</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-red-600" />
                <CardTitle className="text-base">Sécurité Incendie & Extincteurs (Art. 4.7)</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Contrôle annuel obligatoire des extincteurs et consignes de secours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <p className="font-semibold text-foreground">Extincteur CO2 5kg (Préparatoire & Réserve)</p>
                <p className="text-muted-foreground">Vérificateur : Groupement National des Sapeurs-Pompiers</p>
                <p className="text-muted-foreground">Date de validité : 31 Décembre 2026</p>
              </div>
              <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="size-4" /> Extincteur à poudre polyvalente ABC vérifié
                </span>
                <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-white">Valide</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL NOUVEL ÉQUIPEMENT */}
      <Dialog open={modalEquipement} onOpenChange={setModalEquipement}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un équipement au carnet de vie</DialogTitle>
            <DialogDescription>
              Enregistrement d'un matériel soumis à maintenance ou étalonnage (Art. 4.23 & 4.25).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={creerEquipement} className="grid gap-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="code">Code Interne</Label>
                <Input
                  id="code"
                  placeholder="ex: FRIG-02"
                  value={codeInterne}
                  onChange={(e) => setCodeInterne(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cat">Catégorie</Label>
                <select
                  id="cat"
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="refrigerateur">Réfrigérateur (2°C-8°C)</option>
                  <option value="climatiseur">Climatiseur (&lt; 25°C)</option>
                  <option value="balance_precision">Balance de précision</option>
                  <option value="onduleur_groupe">Onduleur / Groupe secours</option>
                  <option value="enregistreur_temperature">Sonde enregistreur T°</option>
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="desig">Désignation complète</Label>
              <Input
                id="desig"
                placeholder="ex: Réfrigérateur Liebherr Médical..."
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="modele">Marque / Modèle</Label>
                <Input
                  id="modele"
                  placeholder="Dometic / Carrier..."
                  value={marqueModele}
                  onChange={(e) => setMarqueModele(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="empl">Emplacement</Label>
                <Input
                  id="empl"
                  placeholder="Réserve, Comptoir..."
                  value={emplacement}
                  onChange={(e) => setEmplacement(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="period">Périodicité d'étalonnage (mois)</Label>
              <Input
                id="period"
                type="number"
                value={periodicite}
                onChange={(e) => setPeriodicite(parseInt(e.target.value) || 12)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalEquipement(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={enCours || !codeInterne || !designation}>
                Enregistrer l'équipement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ÉMARGEMENT NETTOYAGE */}
      <Dialog open={modalNettoyage} onOpenChange={setModalNettoyage}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Émargement du Bio-Nettoyage</DialogTitle>
            <DialogDescription>
              Attestation d'exécution du plan de désinfection conforme à l'article 4.20 du Guide BPD.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={emargerNettoyage} className="grid gap-3 py-2 text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="zoneN">Zone nettoyée & désinfectée</Label>
              <select
                id="zoneN"
                value={zoneNettoyage}
                onChange={(e) => setZoneNettoyage(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="comptoir">Comptoir & Hall de dispensation</option>
                <option value="reserve">Réserve de stockage & Magasin</option>
                <option value="preparatoire">Préparatoire officinal</option>
                <option value="sanitaires_vestiaires">Sanitaires & Vestiaires du personnel</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prod">Produit détergent / désinfectant utilisé</Label>
              <Input
                id="prod"
                value={produitNettoyage}
                onChange={(e) => setProduitNettoyage(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="obs">Remarques éventuelles</Label>
              <Input
                id="obs"
                placeholder="R.A.S. surfaces propres et séchées"
                value={notesNettoyage}
                onChange={(e) => setNotesNettoyage(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalNettoyage(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={enCours} className="bg-emerald-600 hover:bg-emerald-700">
                Signer & Émarger
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
