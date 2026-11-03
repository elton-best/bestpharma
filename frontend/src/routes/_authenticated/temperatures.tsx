import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Thermometer,
  Snowflake,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Calendar,
  Layers,
  FileWarning,
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

export const Route = createFileRoute("/_authenticated/temperatures")({
  head: () => ({
    meta: [
      { title: "Chaîne du Froid & Températures — BEGPHARMA" },
      {
        name: "description",
        content: "Suivi des températures (2°C–8°C et ambiant) conforme au Guide BPD de l'ABMed.",
      },
    ],
  }),
  component: PageTemperatures,
});

function PageTemperatures() {
  const { courante } = useOfficine();
  const queryClient = useQueryClient();
  const id = courante?.officine_id;

  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [zoneChoisie, setZoneChoisie] = useState("refrigeree_2_8");
  const [temperatureSaisie, setTemperatureSaisie] = useState("");
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const [humidite, setHumidite] = useState("");
  const [moment, setMoment] = useState("matin");
  const [notes, setNotes] = useState("");
  const [enCours, setEnCours] = useState(false);

  // STATS & TEMPS RÉEL
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["temperatures-stats", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/temperatures/stats`);
    },
    refetchInterval: 30000,
  });

  // HISTORIQUE DES RELEVÉS
  const { data: relevesData, refetch: refetchReleves } = useQuery({
    queryKey: ["temperatures-releves", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/temperatures`);
    },
  });

  async function enregistrerReleve(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !temperatureSaisie) return;
    setEnCours(true);

    try {
      const res: any = await api.post(`/api/officines/${id}/temperatures`, {
        zone: zoneChoisie,
        temperature: parseFloat(temperatureSaisie),
        temp_min: tempMin ? parseFloat(tempMin) : null,
        temp_max: tempMax ? parseFloat(tempMax) : null,
        humidite: humidite ? parseFloat(humidite) : null,
        moment,
        notes: notes || null,
      });

      if (res.alerte_excursion) {
        toast.error(res.message, { duration: 6000 });
      } else {
        toast.success(res.message);
      }

      setDialogOuvert(false);
      setTemperatureSaisie("");
      setTempMin("");
      setTempMax("");
      setHumidite("");
      setNotes("");

      refetchStats();
      refetchReleves();
      queryClient.invalidateQueries({ queryKey: ["nc-count", id] });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setEnCours(false);
    }
  }

  function ouvrirModalPourZone(z: string) {
    setZoneChoisie(z);
    setDialogOuvert(true);
  }

  const zonesConfig = [
    {
      code: "refrigeree_2_8",
      nom: "Enceinte Réfrigérée (Thermolabiles)",
      seuil: "2.0°C à 8.0°C",
      icone: Snowflake,
      colorIcon: "text-blue-500 bg-blue-500/10",
      description: "Vaccins, insulines, collyres et produits sensibles de la chaîne du froid.",
    },
    {
      code: "magasin_reserve",
      nom: "Magasin Central & Réserve",
      seuil: "15.0°C à 25.0°C",
      icone: Thermometer,
      colorIcon: "text-amber-500 bg-amber-500/10",
      description: "Stockage principal des médicaments selon les spécifications fabricants.",
    },
    {
      code: "hall_dispensation",
      nom: "Hall Public de Dispensation",
      seuil: "Climatisé (< 26.0°C)",
      icone: Layers,
      colorIcon: "text-emerald-500 bg-emerald-500/10",
      description: "Zone de comptoir et accueil des patients.",
    },
  ];

  return (
    <div className="grid gap-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Chaîne du Froid & Températures
            </h1>
            <Badge variant="outline" className="border-blue-500/40 text-blue-600 bg-blue-50">
              BPD-4 / Art. 4.18 & 5.20
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Relevés bi-quotidiens obligatoires avec détection et déclaration automatique d'excursion.
          </p>
        </div>

        <Button onClick={() => setDialogOuvert(true)} className="gap-2 shadow-sm shrink-0">
          <Plus className="size-4" /> Nouveau Relevé de Température
        </Button>
      </div>

      {/* SYNTHÈSE DES 3 ZONES RÉGLEMENTAIRES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {zonesConfig.map((z) => {
          const zoneStat = stats?.zones?.[z.code];
          const dernier = zoneStat?.dernier_releve;
          const estConforme = zoneStat?.statut_actuel === "conforme";
          const aExcursion = zoneStat?.statut_actuel && zoneStat?.statut_actuel !== "conforme" && zoneStat?.statut_actuel !== "en_attente";

          return (
            <Card
              key={z.code}
              className={`border-2 transition-all shadow-sm ${
                aExcursion
                  ? "border-red-500/50 bg-red-500/5"
                  : estConforme
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${z.colorIcon}`}>
                    <z.icone className="size-5" />
                  </div>
                  <Badge
                    variant={aExcursion ? "destructive" : estConforme ? "default" : "secondary"}
                    className={estConforme ? "bg-emerald-600" : ""}
                  >
                    {aExcursion ? "Excursion" : estConforme ? "Conforme" : "En attente"}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold mt-2">{z.nom}</CardTitle>
                <CardDescription className="text-xs">Seuil toléré : {z.seuil}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-muted-foreground">Dernière mesure :</span>
                  <span className="font-display text-3xl font-extrabold text-foreground">
                    {dernier?.temperature !== undefined ? `${dernier.temperature}°C` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs border-t pt-2 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    Matin : {zoneStat?.matin_fait ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Clock className="size-3.5 text-amber-500" />}
                  </span>
                  <span className="flex items-center gap-1">
                    Soir : {zoneStat?.soir_fait ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Clock className="size-3.5 text-amber-500" />}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ouvrirModalPourZone(z.code)}
                  className="w-full text-xs h-8"
                >
                  Pointer cette zone
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* HISTORIQUE ET PREUVES DE CONFORMITÉ 30 JOURS */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Registre d'émargement des températures (GAC-EN-001 & GAC-EN-002)</CardTitle>
            <CardDescription className="text-xs">
              Conformité 30 jours :{" "}
              <strong className="text-emerald-600">{stats?.historique_30j?.taux_conformite ?? 100}%</strong> sur{" "}
              {stats?.historique_30j?.total_releves ?? 0} mesures ({stats?.historique_30j?.total_excursions ?? 0} excursion).
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
                  <th className="p-2.5">Zone</th>
                  <th className="p-2.5">Moment</th>
                  <th className="p-2.5">Température</th>
                  <th className="p-2.5">Min / Max</th>
                  <th className="p-2.5">Statut</th>
                  <th className="p-2.5">Opérateur</th>
                  <th className="p-2.5">Fiche NC / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {relevesData?.data && relevesData.data.length > 0 ? (
                  relevesData.data.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="p-2.5 font-mono">
                        {r.date_releve} {r.heure_releve?.slice(0, 5)}
                      </td>
                      <td className="p-2.5 font-medium">
                        {r.zone === "refrigeree_2_8"
                          ? "Enceinte réfrigérée"
                          : r.zone === "magasin_reserve"
                          ? "Magasin central"
                          : "Hall dispensation"}
                      </td>
                      <td className="p-2.5 capitalize">{r.moment}</td>
                      <td className="p-2.5 font-bold font-display text-sm">
                        {r.temperature}°C
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {r.temp_min ? `${r.temp_min}°` : "—"} / {r.temp_max ? `${r.temp_max}°` : "—"}
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant={r.statut_conformite === "conforme" ? "default" : "destructive"}
                          className={`text-[10px] ${r.statut_conformite === "conforme" ? "bg-emerald-600" : ""}`}
                        >
                          {r.statut_conformite === "conforme" ? "Conforme" : "Excursion"}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-muted-foreground">{r.agent?.name ?? "—"}</td>
                      <td className="p-2.5">
                        {r.non_conformite ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-red-600 font-semibold">
                            <FileWarning className="size-3" /> {r.non_conformite.numero_nc || "NC créée"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      Aucun relevé enregistré pour le moment. Cliquez sur "Nouveau Relevé" pour démarrer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG DE SAISIE RELEVÉ */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un relevé de température</DialogTitle>
            <DialogDescription>
              Conforme au Guide BPD de l'ABMed. Toute valeur hors tolérance déclenche automatiquement une fiche d'incident.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={enregistrerReleve} className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="zone">Zone de mesure réglementaire</Label>
              <select
                id="zone"
                value={zoneChoisie}
                onChange={(e) => setZoneChoisie(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="refrigeree_2_8">Enceinte réfrigérée (Frigo vaccins 2°C à 8°C)</option>
                <option value="magasin_reserve">Magasin / Réserve centrale (15°C à 25°C)</option>
                <option value="hall_dispensation">Hall public de dispensation (Climatisé &lt; 26°C)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="temperature">Température relevée (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="ex: 4.5"
                  value={temperatureSaisie}
                  onChange={(e) => setTemperatureSaisie(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="moment">Moment du relevé</Label>
                <select
                  id="moment"
                  value={moment}
                  onChange={(e) => setMoment(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="matin">Matin (Ouverture)</option>
                  <option value="soir">Soir (Clôture)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="tmin" className="text-xs">T° Min (°C)</Label>
                <Input
                  id="tmin"
                  type="number"
                  step="0.1"
                  placeholder="2.1"
                  value={tempMin}
                  onChange={(e) => setTempMin(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tmax" className="text-xs">T° Max (°C)</Label>
                <Input
                  id="tmax"
                  type="number"
                  step="0.1"
                  placeholder="6.8"
                  value={tempMax}
                  onChange={(e) => setTempMax(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hum" className="text-xs">Humidité %</Label>
                <Input
                  id="hum"
                  type="number"
                  step="1"
                  placeholder="55"
                  value={humidite}
                  onChange={(e) => setHumidite(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Observations / Motif si excursion</Label>
              <Input
                id="notes"
                placeholder="R.A.S. ou anomalie constatée..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOuvert(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={enCours || !temperatureSaisie}>
                {enCours ? "Enregistrement..." : "Valider & Émarger"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
