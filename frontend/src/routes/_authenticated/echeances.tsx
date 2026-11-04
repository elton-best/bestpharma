import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck2, CalendarPlus, RotateCcw } from "lucide-react";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";
import { EnTete, Vide, dateFr, joursRestants, QUALITE } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/echeances")({
  head: () => ({
    meta: [
      { title: "Échéances — BEGPHARMA" },
      { name: "description", content: "Renouvellements, étalonnages et formations à ne pas manquer." },
    ],
  }),
  component: Page,
});

interface Echeance {
  id: string;
  titre: string;
  categorie: string | null;
  date_echeance: string;
  fait: boolean;
}

const CATEGORIES = [
  { valeur: "reglementaire", libelle: "Licence et agrément" },
  { valeur: "equipement", libelle: "Étalonnage et maintenance" },
  { valeur: "personnel", libelle: "Personnel (visite médicale, formation)" },
  { valeur: "formation", libelle: "Formation BPD" },
  { valeur: "qualite", libelle: "Qualité et audit interne" },
  { valeur: "autre", libelle: "Autre" },
];

const libelleCategorie = (valeur: string | null) =>
  CATEGORIES.find((c) => c.valeur === valeur)?.libelle ?? "Autre";

function Page() {
  const { courante, aRole, chargement } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const peutGerer = aRole(...QUALITE);
  const [filtre, setFiltre] = useState<"a_venir" | "en_retard" | "faites" | "toutes">("a_venir");

  const { data = [], isLoading } = useQuery<Echeance[]>({
    queryKey: ["echeances", id],
    enabled: !!id,
    queryFn: () => api.get<Echeance[]>(`/officines/${id}/echeances`),
  });

  const marquer = useMutation({
    mutationFn: ({ eid, fait }: { eid: string; fait: boolean }) =>
      api.put(`/echeances/${eid}`, { fait }),
    onSuccess: () => {
      toast.success("Échéance mise à jour");
      qc.invalidateQueries({ queryKey: ["echeances"] });
    },
    onError: (e: any) => toast.error(e.message || "Mise à jour impossible"),
  });

  const liste = (data ?? []).filter((e) => {
    const j = joursRestants(e.date_echeance);
    if (filtre === "faites") return e.fait;
    if (filtre === "en_retard") return !e.fait && j < 0;
    if (filtre === "a_venir") return !e.fait;
    return true;
  });

  const aTraiter = (data ?? []).filter((e) => !e.fait).length;
  const enRetard = (data ?? []).filter((e) => !e.fait && joursRestants(e.date_echeance) < 0).length;

  return (
    <div className="grid gap-6">
      <EnTete
        titre="Échéances"
        description={
          chargement
            ? "Chargement du calendrier réglementaire…"
            : aTraiter === 0
              ? "Tout est à jour dans le calendrier réglementaire."
              : enRetard === 0
                ? "Les prochaines échéances réglementaires de votre officine, classées par date."
                : "Certaines échéances sont dépassées : régularisez-les dès que possible."
        }
        action={peutGerer && id ? <Ajout officineId={id} /> : null}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Select value={filtre} onValueChange={(v) => setFiltre(v as typeof filtre)}>
            <SelectTrigger className="h-12 w-full" aria-label="Filtrer les échéances">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a_venir">À traiter</SelectItem>
              <SelectItem value="en_retard">En retard</SelectItem>
              <SelectItem value="faites">Déjà faites</SelectItem>
              <SelectItem value="toutes">Toutes les échéances</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {liste.length} échéance{liste.length > 1 ? "s" : ""} affichée{liste.length > 1 ? "s" : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      ) : liste.length === 0 ? (
        <Vide texte="Aucune échéance à afficher pour ce filtre." />
      ) : (
        <div className="grid gap-3">
          {liste.map((e) => {
            const j = joursRestants(e.date_echeance);
            const enRetardItem = !e.fait && j < 0;
            return (
              <Card
                key={e.id}
                className={
                  e.fait
                    ? "border-[#CFF1D2] bg-[#F7FBF8] opacity-80"
                    : enRetardItem
                      ? "border-red-300 bg-red-50/40"
                      : ""
                }
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{e.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {libelleCategorie(e.categorie)} · {dateFr(e.date_echeance)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {e.fait ? (
                      <Badge className="bg-emerald-600 text-white">Fait</Badge>
                    ) : (
                      <Badge variant={j < 0 ? "destructive" : j <= 7 ? "secondary" : "outline"}>
                        {j < 0
                          ? `En retard de ${-j} jour${-j > 1 ? "s" : ""}`
                          : j === 0
                            ? "Aujourd'hui"
                            : `Dans ${j} jour${j > 1 ? "s" : ""}`}
                      </Badge>
                    )}
                    {peutGerer ? (
                      <Button
                        size="sm"
                        variant={e.fait ? "ghost" : "outline"}
                        className="h-11 gap-1.5"
                        onClick={() => marquer.mutate({ eid: e.id, fait: !e.fait })}
                        disabled={marquer.isPending}
                      >
                        {e.fait ? (
                          <>
                            <RotateCcw className="size-4" /> Rouvrir
                          </>
                        ) : (
                          <>
                            <CalendarCheck2 className="size-4" /> Marquer fait
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Ajout({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({ titre: "", categorie: "reglementaire", date_echeance: "", precision: "" });

  const m = useMutation({
    mutationFn: () =>
      api.post(`/officines/${officineId}/echeances`, {
        titre: f.titre.trim(),
        categorie: f.categorie,
        date_echeance: f.date_echeance,
      }),
    onSuccess: () => {
      toast.success("Échéance ajoutée");
      qc.invalidateQueries({ queryKey: ["echeances"] });
      setOuvert(false);
      setF({ titre: "", categorie: "reglementaire", date_echeance: "", precision: "" });
    },
    onError: (e: any) => toast.error(e.message || "Enregistrement impossible"),
  });

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-sm">
          <CalendarPlus className="size-4" /> Ajouter une échéance
        </Button>
      </DialogTrigger>
      <ModaleFiche
        titre="Nouvelle échéance"
        sousTitre="Inscrivez une date à ne pas manquer : elle apparaîtra en alerte à l'approche du terme."
        pied={
          <>
            <Button variant="outline" className="h-12" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button
              className="h-12"
              onClick={() => f.titre.trim() && f.date_echeance && m.mutate()}
              disabled={m.isPending || !f.titre.trim() || !f.date_echeance}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ColonneFiche titre="Ce qu'il faut faire">
            <Champ label="Intitulé" obligatoire>
              <Input
                value={f.titre}
                onChange={(e) => setF({ ...f, titre: e.target.value })}
                placeholder="Ex. Renouvellement de la licence d'exploitation"
                className="h-12"
              />
            </Champ>
            <Champ label="Catégorie">
              <Select value={f.categorie} onValueChange={(v) => setF({ ...f, categorie: v })}>
                <SelectTrigger className="h-12 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.valeur} value={c.valeur}>
                      {c.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Champ>
          </ColonneFiche>
          <ColonneFiche titre="Quand">
            <Champ label="Date de l'échéance" obligatoire>
              <Input
                type="date"
                value={f.date_echeance}
                onChange={(e) => setF({ ...f, date_echeance: e.target.value })}
                className="h-12"
              />
            </Champ>
            <Champ label="Précision" aide="Facultatif : numéro de dossier, nom du prestataire…">
              <Textarea
                value={f.precision}
                onChange={(e) => setF({ ...f, precision: e.target.value })}
                rows={3}
              />
            </Champ>
          </ColonneFiche>
        </div>
      </ModaleFiche>
    </Dialog>
  );
}
