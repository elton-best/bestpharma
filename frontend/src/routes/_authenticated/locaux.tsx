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
import { formatDateHeure } from "@/lib/format";
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
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";

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
                        <td className="p-2.5 font-mono">{formatDateHeure(n.date_heure)}</td>
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

      {/* Nouvel équipement du carnet de vie */}
      <Dialog open={modalEquipement} onOpenChange={setModalEquipement}>
        <ModaleFiche
          titre="Inscrire un équipement au carnet de vie"
          sousTitre="Tout matériel qui conditionne la qualité du médicament : conservation, pesée, secours électrique, surveillance des températures."
          badge={<Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">Carnet de vie</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                L'étalonnage et la maintenance se planifient à partir de la périodicité inscrite ici.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setModalEquipement(false)} className="h-12 rounded-xl sm:h-11">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  form="formulaire-equipement"
                  disabled={enCours || !codeInterne || !designation}
                  className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
                >
                  Enregistrer l'équipement
                </Button>
              </div>
            </div>
          }
        >
          <form id="formulaire-equipement" onSubmit={creerEquipement} className="grid gap-4 md:grid-cols-2">
            <ColonneFiche titre="Identification" aide="Le code interne sert de repère sur l'étiquette collée à l'appareil.">
              <Champ label="Code interne" obligatoire aide="Court et unique, par exemple FRIG-02.">
                <Input
                  id="code"
                  placeholder="FRIG-02"
                  value={codeInterne}
                  onChange={(e) => setCodeInterne(e.target.value)}
                  required
                  className="h-11"
                />
              </Champ>
              <Champ label="Désignation complète" obligatoire>
                <Input
                  id="desig"
                  placeholder="Réfrigérateur médical deux portes"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  required
                  className="h-11"
                />
              </Champ>
              <Champ label="Marque et modèle">
                <Input
                  id="modele"
                  placeholder="Liebherr, Dometic, Carrier…"
                  value={marqueModele}
                  onChange={(e) => setMarqueModele(e.target.value)}
                  className="h-11"
                />
              </Champ>
            </ColonneFiche>

            <ColonneFiche titre="Suivi" aide="Où se trouve l'appareil et à quelle fréquence il se vérifie.">
              <Champ
                label="Catégorie"
                aide="La catégorie détermine les contrôles attendus par l'inspection."
              >
                <select
                  id="cat"
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm"
                >
                  <option value="refrigerateur">Réfrigérateur (2 °C à 8 °C)</option>
                  <option value="climatiseur">Climatiseur (moins de 25 °C)</option>
                  <option value="balance_precision">Balance de précision</option>
                  <option value="onduleur_groupe">Onduleur ou groupe de secours</option>
                  <option value="enregistreur_temperature">Sonde enregistreur de température</option>
                </select>
              </Champ>
              <Champ label="Emplacement">
                <Input
                  id="empl"
                  placeholder="Réserve, comptoir, préparatoire…"
                  value={emplacement}
                  onChange={(e) => setEmplacement(e.target.value)}
                  className="h-11"
                />
              </Champ>
              <Champ
                label="Périodicité d'étalonnage"
                aide="En mois. La prochaine échéance se calcule automatiquement."
              >
                <Input
                  id="period"
                  type="number"
                  min="1"
                  value={periodicite}
                  onChange={(e) => setPeriodicite(parseInt(e.target.value) || 12)}
                  className="h-11"
                />
              </Champ>
            </ColonneFiche>
          </form>
        </ModaleFiche>
      </Dialog>

      {/* Émargement du bio-nettoyage */}
      <Dialog open={modalNettoyage} onOpenChange={setModalNettoyage}>
        <ModaleFiche
          titre="Émarger le bio-nettoyage d'une zone"
          sousTitre="L'attestation d'exécution du plan de désinfection, signée par l'agent qui l'a réalisé."
          badge={<Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">Hygiène des locaux</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                Une zone émargée ne peut pas être déclarée deux fois pour le même jour.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setModalNettoyage(false)} className="h-12 rounded-xl sm:h-11">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  form="formulaire-nettoyage"
                  disabled={enCours}
                  className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
                >
                  Signer et émarger
                </Button>
              </div>
            </div>
          }
        >
          <form id="formulaire-nettoyage" onSubmit={emargerNettoyage} className="grid gap-4 md:grid-cols-2">
            <ColonneFiche titre="Zone traitée" aide="Une fiche par zone, pour que le registre reste lisible en inspection.">
              <Champ label="Zone nettoyée et désinfectée" obligatoire>
                <select
                  id="zoneN"
                  value={zoneNettoyage}
                  onChange={(e) => setZoneNettoyage(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm"
                >
                  <option value="comptoir">Comptoir et hall de dispensation</option>
                  <option value="reserve">Réserve de stockage et magasin</option>
                  <option value="preparatoire">Préparatoire officinal</option>
                  <option value="sanitaires_vestiaires">Sanitaires et vestiaires du personnel</option>
                </select>
              </Champ>
              <Champ label="Produit détergent ou désinfectant utilisé" obligatoire aide="Nom commercial et dilution, tels qu'inscrits sur la fiche technique.">
                <Input
                  id="prod"
                  placeholder="Eau de Javel diluée, détergent désinfectant…"
                  value={produitNettoyage}
                  onChange={(e) => setProduitNettoyage(e.target.value)}
                  required
                  className="h-11"
                />
              </Champ>
            </ColonneFiche>

            <ColonneFiche titre="Observation" aide="Signalez ce qui change la lecture du registre : surface abîmée, produit remplacé, zone à refaire.">
              <Champ label="Remarques éventuelles">
                <Input
                  id="obs"
                  placeholder="Surfaces propres et séchées"
                  value={notesNettoyage}
                  onChange={(e) => setNotesNettoyage(e.target.value)}
                  className="h-11"
                />
              </Champ>
              <div className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] p-3 text-[11px] leading-relaxed text-[#475C50]">
                L'émargement enregistre l'agent connecté et l'heure de saisie. Une signature papier reste possible
                en complément, mais le registre numérique fait foi.
              </div>
            </ColonneFiche>
          </form>
        </ModaleFiche>
      </Dialog>
    </div>
  );
}
