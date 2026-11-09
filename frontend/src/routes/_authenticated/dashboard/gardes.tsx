import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Building2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard/gardes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pharmacies de Garde : BestPharma" },
      {
        name: "description",
        content: "Planning officiel des officines de garde de la commune et affichage réglementaire.",
      },
    ],
  }),
  component: PharmaciesDeGarde,
});

const COMMUNES_BENIN = [
  "Toutes les communes",
  "Cotonou",
  "Porto-Novo",
  "Abomey-Calavi",
  "Parakou",
  "Ouidah",
  "Bohicon",
  "Abomey",
  "Natitingou",
  "Kandi",
  "Lokossa",
];

function PharmaciesDeGarde() {
  const { courante } = useOfficine();
  const queryClient = useQueryClient();
  const [communeFiltre, setCommuneFiltre] = useState<string>("Toutes les communes");
  const [recherche, setRecherche] = useState<string>("");
  const [modaleOuverte, setModaleOuverte] = useState<boolean>(false);

  // Formulaire d'ajout
  const [formNom, setFormNom] = useState<string>(courante?.officine?.nom || "");
  const [formCommune, setFormCommune] = useState<string>(courante?.officine?.ville || "Cotonou");
  const [formQuartier, setFormQuartier] = useState<string>("");
  const [formTel, setFormTel] = useState<string>((courante?.officine as any)?.telephone || "+229 ");
  const [formDateDebut, setFormDateDebut] = useState<string>(new Date().toISOString().slice(0, 16));
  const [formDateFin, setFormDateFin] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [formNotes, setFormNotes] = useState<string>("Service de garde 24h/24");

  const { data: gardes, isLoading } = useQuery({
    queryKey: ["officines-gardes", communeFiltre],
    queryFn: async () => {
      const param = communeFiltre !== "Toutes les communes" ? `?commune=${encodeURIComponent(communeFiltre)}` : "";
      return api.get<any[]>(`/gardes${param}`);
    },
    refetchInterval: 60000,
  });

  const mutationAjout = useMutation({
    mutationFn: async (payload: any) => {
      return api.post("/gardes", payload);
    },
    onSuccess: () => {
      toast.success("Période de garde enregistrée avec succès !");
      setModaleOuverte(false);
      queryClient.invalidateQueries({ queryKey: ["officines-gardes"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'enregistrement de la garde.");
    },
  });

  const mutationSuppr = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/gardes/${id}`);
    },
    onSuccess: () => {
      toast.success("Garde supprimée.");
      queryClient.invalidateQueries({ queryKey: ["officines-gardes"] });
    },
  });

  function soumettreFormulaire() {
    if (!formNom || !formCommune || !formQuartier || !formTel) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    mutationAjout.mutate({
      officine_id: courante?.officine_id,
      nom_officine: formNom,
      commune: formCommune,
      zone_quartier: formQuartier,
      telephone: formTel,
      date_debut: new Date(formDateDebut).toISOString(),
      date_fin: new Date(formDateFin).toISOString(),
      commentaires: formNotes,
    });
  }

  function imprimerPlanning() {
    window.print();
  }

  const listeFiltree = (gardes || []).filter((g) => {
    if (!recherche) return true;
    const r = recherche.toLowerCase();
    return (
      g.nom_officine?.toLowerCase().includes(r) ||
      g.zone_quartier?.toLowerCase().includes(r) ||
      g.commune?.toLowerCase().includes(r)
    );
  });

  return (
    <div className="grid gap-6 font-sans">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#CFE3D5]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-black text-[#1F2420]">
              Pharmacies de Garde (Bénin)
            </h1>
            <Badge className="bg-[#023010] text-[#92FF5F] font-bold">24h / 24</Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#5C6660]">
            Planning officiel des tours de garde, orientation des patients et affichage légal en vitrine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={imprimerPlanning}
            className="rounded-xl border-[#CFE3D5] text-[#023010] hover:bg-[#EFF7F1]"
          >
            <Printer className="size-4 mr-1.5" />
            Imprimer pour Vitrine
          </Button>
          <Button
            size="sm"
            onClick={() => setModaleOuverte(true)}
            className="rounded-xl bg-[#023010] hover:bg-[#18AA38] text-white font-bold"
          >
            <Plus className="size-4 mr-1.5" />
            Déclarer une Garde
          </Button>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 size-4 text-gray-400" />
          <Input
            placeholder="Rechercher une pharmacie, un quartier ou une zone..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="rounded-2xl pl-10 h-10 border-[#CFE3D5] bg-white text-xs"
          />
        </div>
        <div className="w-full sm:w-60">
          <Select value={communeFiltre} onValueChange={setCommuneFiltre}>
            <SelectTrigger className="rounded-2xl h-10 border-[#CFE3D5] bg-white text-xs">
              <SelectValue placeholder="Commune" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {COMMUNES_BENIN.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grille des officines de garde */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      ) : listeFiltree.length === 0 ? (
        <Card className="rounded-3xl border border-[#CFE3D5] bg-white p-8 text-center">
          <p className="text-sm font-semibold text-[#5C6660]">
            Aucune officine de garde enregistrée pour cette sélection.
          </p>
          <Button
            size="sm"
            onClick={() => setModaleOuverte(true)}
            className="mt-3 rounded-xl bg-[#023010] text-white text-xs"
          >
            Déclarer le tour de garde de votre officine
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listeFiltree.map((garde) => {
            const debut = new Date(garde.date_debut);
            const fin = new Date(garde.date_fin);
            const estActuelle = Date.now() >= debut.getTime() && Date.now() <= fin.getTime();

            return (
              <Card
                key={garde.id}
                className={`rounded-3xl border transition-all p-5 shadow-xs flex flex-col justify-between ${
                  estActuelle
                    ? "border-[#023010]/30 bg-[#EFF7F1]/50 ring-1 ring-[#023010]/20"
                    : "border-[#CFE3D5] bg-white"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-sm text-[#1F2420] flex items-center gap-1.5">
                        <Building2 size={16} className="text-[#023010] shrink-0" />
                        {garde.nom_officine}
                      </h3>
                      <p className="text-xs text-[#023010] font-bold mt-1 flex items-center gap-1">
                        <MapPin size={13} className="text-emerald-700" />
                        {garde.commune} — {garde.zone_quartier}
                      </p>
                    </div>
                    {estActuelle && (
                      <Badge className="bg-[#023010] text-[#92FF5F] text-[10px] px-2 py-0.5 shrink-0">
                        En cours
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#CFE3D5]/60 text-xs text-[#5C6660] space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      <a
                        href={`tel:${garde.telephone}`}
                        className="font-bold text-[#023010] hover:underline"
                      >
                        {garde.telephone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <CalendarDays size={14} className="text-gray-400" />
                      <span>
                        Du {debut.toLocaleDateString("fr-FR")} au {fin.toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {garde.commentaires && (
                      <p className="text-[11px] text-gray-500 italic mt-1">
                        « {garde.commentaires} »
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <a
                    href={`tel:${garde.telephone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <Phone size={13} />
                    Appeler l'officine
                  </a>
                  {!garde.id.startsWith("demo-") && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => mutationSuppr.mutate(garde.id)}
                      className="size-8 rounded-xl text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modale d'enregistrement d'une garde */}
      <Dialog open={modaleOuverte} onOpenChange={setModaleOuverte}>
        <DialogContent className="rounded-3xl max-w-md bg-white p-6">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-lg text-[#023010]">
              Déclarer une Période de Garde
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5C6660]">
              Enregistre le tour de garde pour l'information des confrères et des patients.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2 text-xs">
            <div>
              <Label htmlFor="nom" className="font-bold">Nom de l'officine *</Label>
              <Input
                id="nom"
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
                className="rounded-xl mt-1"
                placeholder="Ex : Pharmacie de l'Étoile"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="commune" className="font-bold">Commune *</Label>
                <Input
                  id="commune"
                  value={formCommune}
                  onChange={(e) => setFormCommune(e.target.value)}
                  className="rounded-xl mt-1"
                  placeholder="Ex : Cotonou"
                />
              </div>
              <div>
                <Label htmlFor="quartier" className="font-bold">Quartier / Repère *</Label>
                <Input
                  id="quartier"
                  value={formQuartier}
                  onChange={(e) => setFormQuartier(e.target.value)}
                  className="rounded-xl mt-1"
                  placeholder="Ex : Haie Vive"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tel" className="font-bold">Téléphone d'urgence *</Label>
              <Input
                id="tel"
                value={formTel}
                onChange={(e) => setFormTel(e.target.value)}
                className="rounded-xl mt-1"
                placeholder="+229 ..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="debut" className="font-bold">Date & Heure Début</Label>
                <Input
                  id="debut"
                  type="datetime-local"
                  value={formDateDebut}
                  onChange={(e) => setFormDateDebut(e.target.value)}
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fin" className="font-bold">Date & Heure Fin</Label>
                <Input
                  id="fin"
                  type="datetime-local"
                  value={formDateFin}
                  onChange={(e) => setFormDateFin(e.target.value)}
                  className="rounded-xl mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="font-bold">Observations</Label>
              <Input
                id="notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="rounded-xl mt-1"
                placeholder="Ex : Garde 24h/24, accès sonnette de nuit"
              />
            </div>
          </div>

          <DialogFooter className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => setModaleOuverte(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              onClick={soumettreFormulaire}
              disabled={mutationAjout.isPending}
              className="rounded-xl bg-[#023010] hover:bg-[#18AA38] text-white font-bold"
            >
              {mutationAjout.isPending ? "Enregistrement..." : "Enregistrer la garde"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
