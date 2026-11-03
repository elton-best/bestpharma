import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Check,
} from "reicon-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnTete, Vide, dateFr, QUALITE } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/non-conformites")({
  head: () => ({
    meta: [
      { title: "Non-conformités & Plan CAPA — BEGPHARMA" },
      {
        name: "description",
        content:
          "Déclaration, analyse des causes 5M et plan d'actions correctives et préventives (CAPA).",
      },
    ],
  }),
  component: PageNonConformites,
});

const statuts: Record<string, { label: string; variant: "warning" | "default" | "success" | "outline" }> = {
  ouverte: { label: "Ouverte", variant: "warning" },
  en_cours: { label: "Plan CAPA en cours", variant: "default" },
  cloturee: { label: "Clôturée & Efficace", variant: "success" },
};

const gravites: Record<string, { label: string; variant: "outline" | "warning" | "destructive" }> = {
  mineure: { label: "Mineure", variant: "outline" },
  majeure: { label: "Majeure", variant: "warning" },
  critique: { label: "Critique", variant: "destructive" },
};

interface NonConformite {
  id: string;
  numero_nc?: string;
  titre: string;
  description?: string;
  gravite: "mineure" | "majeure" | "critique";
  statut: "ouverte" | "en_cours" | "cloturee";
  processus: string;
  source: string;
  action_immediate?: string;
  action_preventive?: string;
  analyse_causes_5m?: string;
  date_echeance_capa?: string;
  responsable_action?: string;
  created_at: string;
}

function PageNonConformites() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const peutTraiter = aRole(...QUALITE);

  const [filtreStatut, setFiltreStatut] = useState<string>("tous");
  const [ncActive, setNcActive] = useState<NonConformite | null>(null);

  const { data: ncs = [] } = useQuery<NonConformite[]>({
    queryKey: ["non-conformites", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<NonConformite[]>(`/api/officines/${id}/non-conformites`);
    },
  });

  const maj = useMutation({
    mutationFn: async ({ ncId, champs }: { ncId: string; champs: Partial<NonConformite> }) => {
      return api.put(`/api/officines/${id}/non-conformites/${ncId}`, champs);
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["non-conformites"] });
      toast.success("Fiche de non-conformité mise à jour avec succès.");
      if (ncActive) {
        setNcActive((prev) => (prev ? { ...prev, ...data } : null));
      }
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la mise à jour"),
  });

  const ncsFiltrees = filtreStatut === "tous"
    ? ncs
    : ncs.filter((n) => n.statut === filtreStatut);

  const compteOuvertes = ncs.filter((n) => n.statut === "ouverte").length;
  const compteEnCours = ncs.filter((n) => n.statut === "en_cours").length;
  const compteCloturees = ncs.filter((n) => n.statut === "cloturee").length;

  return (
    <div className="grid gap-6">
      <EnTete
        titre="Non-conformités & CAPA (BPD1-F09)"
        description="Gestion et traçabilité des incidents qualité. Analyse des causes racines (5M) et pilotage des actions correctives et préventives."
        action={id ? <DeclarerNonConformite officineId={id} /> : null}
      />

      {/* Onglets Filtres & Compteurs visuels */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Tabs value={filtreStatut} onValueChange={setFiltreStatut} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 h-10 p-1 bg-white border border-[#0F3B27]/15 rounded-xl">
            <TabsTrigger value="tous" className="text-xs px-3 font-semibold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]">
              Toutes ({ncs.length})
            </TabsTrigger>
            <TabsTrigger value="ouverte" className="text-xs px-3 font-semibold data-[state=active]:bg-[#FF7036] data-[state=active]:text-white">
              Ouvertes ({compteOuvertes})
            </TabsTrigger>
            <TabsTrigger value="en_cours" className="text-xs px-3 font-semibold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]">
              En cours ({compteEnCours})
            </TabsTrigger>
            <TabsTrigger value="cloturee" className="text-xs px-3 font-semibold data-[state=active]:bg-[#CFF1D2] data-[state=active]:text-[#0F3B27]">
              Clôturées ({compteCloturees})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {ncsFiltrees.length === 0 ? (
        <Vide texte="Aucune non-conformité dans cette catégorie. La conformité réglementaire est optimale." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ncsFiltrees.map((n) => {
            const grav = gravites[n.gravite] || { label: n.gravite, variant: "outline" };
            const stat = statuts[n.statut] || { label: n.statut, variant: "outline" };

            return (
              <Card
                key={n.id}
                onClick={() => setNcActive(n)}
                className="group relative cursor-pointer flex flex-col justify-between border border-[#0F3B27]/15 rounded-2xl bg-white p-5 hover:border-[#0F3B27]/40 hover:shadow-lg transition-all duration-200"
              >
                <div>
                  {/* Ligne En-tête : Référence & Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2]/60 px-2 py-0.5 rounded-md border border-[#0F3B27]/15">
                        {n.numero_nc || "NC-N/A"}
                      </span>
                      <Badge variant={grav.variant} className="text-[11px] font-bold">
                        {grav.label}
                      </Badge>
                    </div>
                    <Badge variant={stat.variant} className="text-[11px]">
                      {stat.label}
                    </Badge>
                  </div>

                  {/* Titre */}
                  <h3 className="font-display font-bold text-base text-[#0F3B27] leading-snug group-hover:text-[#0F3B27]/80 line-clamp-2 mb-2">
                    {n.titre}
                  </h3>

                  {/* Description courte */}
                  {n.description && (
                    <p className="text-xs text-slate-600 line-clamp-3 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {n.description}
                    </p>
                  )}

                  {/* Étapes clés pré-remplies */}
                  <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                    {n.analyse_causes_5m && (
                      <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Causes 5M identifiées</span>
                      </div>
                    )}
                    {n.action_preventive && (
                      <div className="flex items-center gap-1.5 text-[#0F3B27] font-medium">
                        <Check className="w-3.5 h-3.5 text-[#0F3B27] shrink-0" />
                        <span className="truncate">Plan CAPA formalisé</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer de la Card */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dateFr(n.created_at)}</span>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs font-semibold text-[#0F3B27] hover:bg-[#CFF1D2]/50 group-hover:bg-[#0F3B27] group-hover:text-[#92FF5F] transition-colors rounded-lg px-2.5"
                  >
                    Voir la fiche
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Détails & Traitement de la Non-conformité */}
      <Dialog open={!!ncActive} onOpenChange={(open) => !open && setNcActive(null)}>
        {ncActive && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] px-2.5 py-0.5 rounded-md border border-[#0F3B27]/20">
                  {ncActive.numero_nc || "NC-N/A"}
                </span>
                <Badge
                  variant={gravites[ncActive.gravite]?.variant || "outline"}
                  className="text-xs font-bold"
                >
                  Gravité {gravites[ncActive.gravite]?.label || ncActive.gravite}
                </Badge>
                <Badge
                  variant={statuts[ncActive.statut]?.variant || "outline"}
                  className="text-xs"
                >
                  {statuts[ncActive.statut]?.label || ncActive.statut}
                </Badge>
                <span className="text-xs text-slate-400 ml-auto">
                  Déclarée le {dateFr(ncActive.created_at)}
                </span>
              </div>
              <DialogTitle className="text-xl font-display font-bold text-[#0F3B27]">
                {ncActive.titre}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-sm">
              {/* Constat / Description */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1.5">
                  Constat & Faits observés
                </h4>
                <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                  {ncActive.description || "Aucune description renseignée lors du signalement."}
                </p>
              </div>

              {/* Analyse des causes 5M */}
              <div className="bg-[#BFF2F0]/20 p-4 rounded-2xl border border-[#BFF2F0]/60">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F3B27] mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#0F3B27]" /> Analyse des causes racines (Méthode 5M)
                </h4>
                <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                  {ncActive.analyse_causes_5m || "Analyse des causes racines non encore renseignée."}
                </p>
              </div>

              {/* Action immédiate de mise en sécurité */}
              {ncActive.action_immediate && (
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" /> Action immédiate de mise en sécurité
                  </h4>
                  <p className="text-slate-800 leading-relaxed">
                    {ncActive.action_immediate}
                  </p>
                </div>
              )}

              {/* Plan d'action préventive (CAPA) */}
              <div className="bg-[#CFF1D2]/30 p-4 rounded-2xl border border-[#CFF1D2]">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F3B27] mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#0F3B27]" /> Action corrective & préventive (Plan CAPA)
                </h4>
                <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                  {ncActive.action_preventive || "En attente de formalisation par le responsable qualité."}
                </p>

                <div className="mt-3 pt-3 border-t border-[#0F3B27]/10 flex flex-wrap gap-4 text-xs text-slate-600">
                  {ncActive.responsable_action && (
                    <div>
                      Responsable d'action : <strong>{ncActive.responsable_action}</strong>
                    </div>
                  )}
                  {ncActive.date_echeance_capa && (
                    <div>
                      Date limite d'application : <strong>{dateFr(ncActive.date_echeance_capa)}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions du Workflow Qualité */}
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setNcActive(null)}
                className="w-full sm:w-auto"
              >
                Fermer
              </Button>

              {peutTraiter && ncActive.statut === "ouverte" && (
                <Button
                  className="w-full sm:w-auto bg-[#0F3B27] text-[#92FF5F] hover:bg-[#0F3B27]/90 font-bold"
                  disabled={maj.isPending}
                  onClick={() =>
                    maj.mutate({
                      ncId: ncActive.id,
                      champs: { statut: "en_cours" },
                    })
                  }
                >
                  Engager le plan CAPA
                </Button>
              )}

              {peutTraiter && ncActive.statut === "en_cours" && (
                <Button
                  className="w-full sm:w-auto bg-[#0F3B27] text-[#92FF5F] hover:bg-[#0F3B27]/90 font-bold"
                  disabled={maj.isPending}
                  onClick={() =>
                    maj.mutate({
                      ncId: ncActive.id,
                      champs: { statut: "cloturee" },
                    })
                  }
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Clôturer & Valider efficacité
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function DeclarerNonConformite({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [gravite, setGravite] = useState<"mineure" | "majeure" | "critique">("mineure");
  const [description, setDescription] = useState("");
  const [actionImmediate, setActionImmediate] = useState("");
  const [causes5m, setCauses5m] = useState("");

  const creation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/officines/${officineId}/non-conformites`, {
        titre: titre.trim(),
        gravite,
        description: description.trim(),
        action_immediate: actionImmediate.trim(),
        analyse_causes_5m: causes5m.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Non-conformité déclarée avec succès.");
      qc.invalidateQueries({ queryKey: ["non-conformites"] });
      setOuvert(false);
      setTitre("");
      setDescription("");
      setActionImmediate("");
      setCauses5m("");
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la déclaration"),
  });

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button className="h-10 bg-[#0F3B27] text-[#92FF5F] hover:bg-[#0F3B27]/90 font-bold rounded-xl shadow-sm">
          + Signaler une Non-Conformité
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-display font-bold text-[#0F3B27]">
            Déclaration d'incident ou de non-conformité
          </DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (titre.trim()) creation.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="nc-titre" className="text-xs font-semibold text-[#0F3B27]">
              Intitulé du dysfonctionnement *
            </Label>
            <Input
              id="nc-titre"
              required
              placeholder="Ex: Rupture de chaîne du froid, Colis endommagé..."
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="rounded-xl border-[#0F3B27]/20"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold text-[#0F3B27]">Niveau de gravité réglementaire *</Label>
            <Select value={gravite} onValueChange={(v: any) => setGravite(v)}>
              <SelectTrigger className="rounded-xl border-[#0F3B27]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mineure">Mineure (Aucun risque patient ni produit)</SelectItem>
                <SelectItem value="majeure">Majeure (Risque de détérioration ou retard)</SelectItem>
                <SelectItem value="critique">Critique (Risque direct santé publique ou chaîne du froid)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nc-desc" className="text-xs font-semibold text-[#0F3B27]">
              Constat / Description détaillée des faits
            </Label>
            <Textarea
              id="nc-desc"
              rows={3}
              placeholder="Décrivez les circonstances précises..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl border-[#0F3B27]/20"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nc-act" className="text-xs font-semibold text-[#0F3B27]">
              Action immédiate de mise en sécurité
            </Label>
            <Input
              id="nc-act"
              placeholder="Ex: Mise en quarantaine immédiate, Re-scellage..."
              value={actionImmediate}
              onChange={(e) => setActionImmediate(e.target.value)}
              className="rounded-xl border-[#0F3B27]/20"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nc-5m" className="text-xs font-semibold text-[#0F3B27]">
              Première hypothèse sur les causes (Méthode 5M)
            </Label>
            <Input
              id="nc-5m"
              placeholder="Matière, Matériel, Méthode, Main d'œuvre, Milieu..."
              value={causes5m}
              onChange={(e) => setCauses5m(e.target.value)}
              className="rounded-xl border-[#0F3B27]/20"
            />
          </div>

          <Button
            type="submit"
            disabled={creation.isPending}
            className="mt-2 h-11 bg-[#0F3B27] text-[#92FF5F] hover:bg-[#0F3B27]/90 font-bold rounded-xl"
          >
            Enregistrer et notifier le responsable qualité
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
