import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Accueil — BEGPHARMA" },
      {
        name: "description",
        content: "Votre officine BEGPHARMA : socle conforme au Guide BPD de l'ABMed.",
      },
      { property: "og:title", content: "Accueil — BEGPHARMA" },
      {
        property: "og:description",
        content: "Votre officine BEGPHARMA : socle conforme au Guide BPD de l'ABMed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Accueil,
});

import { TableauDeBord } from "@/components/tableau-de-bord";

function Accueil() {
  const { rattachements, courante, choisir, chargement } = useOfficine();
  const { user } = Route.useRouteContext();
  const [creationOuverte, setCreationOuverte] = useState(false);

  const { data: mfaEtat } = useQuery({
    queryKey: ["securite", user.id],
    queryFn: async () => {
      const etat = await api
        .get<{ mfa_enabled: boolean; mfa_required: boolean }>("/auth/mfa")
        .catch(() => ({ mfa_enabled: false, mfa_required: false }));
      return {
        total: rattachements.length,
        eleve: !!etat.mfa_enabled,
        requis: !!etat.mfa_required,
      };
    },
  });

  const { data: profil } = useQuery({
    queryKey: ["profil", user.id],
    queryFn: async () => {
      return { nom_complet: user.name || user.email };
    },
  });

  if (chargement) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const mfaAConfigurer = !!mfaEtat?.requis && !mfaEtat?.eleve;
  return (
    <div className="grid gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#CFE3D5]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#1F2420]">
            {fr.tableau.bienvenue}
            {profil?.nom_complet ? `, ${profil.nom_complet}` : ""}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5C6660] font-medium">
            {fr.tableau.socle} · Guide des Bonnes Pratiques de Dispensation ABMed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreationOuverte(true)}
            variant="outline"
            className="rounded-xl border-[#CFE3D5] bg-white hover:bg-[#EFF7F1] text-xs font-bold text-[#023010] h-9"
          >
            + Nouvelle officine
          </Button>
        </div>
      </div>

      {mfaAConfigurer ? (
        <Card className="rounded-2xl border-amber-300 bg-amber-50/60 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-[#6b4b00]">
              Votre rôle exige la double authentification : activez-la pour protéger les registres
              réglementaires de l'officine.
            </p>
            <Button asChild className="h-11 shrink-0 rounded-xl bg-[#023010] font-bold text-white hover:bg-[#18AA38]">
              <Link to="/securite">Activer maintenant</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {rattachements.length === 0 ? (
        <Card className="rounded-2xl border-[#CFE3D5] shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-lg text-[#023010]">{fr.officine.aucune}</CardTitle>
            <CardDescription className="text-xs text-[#5C6660]">{fr.officine.aucuneDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => setCreationOuverte(true)} className="h-11 rounded-xl bg-[#023010] hover:bg-[#18AA38] text-white font-bold">
              {fr.officine.creer}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {rattachements.length > 1 ? (
            <section className="grid gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5C6660]">
                {fr.officine.selecteur}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {rattachements.map((r) => {
                  const active = courante?.officine_id === r.officine_id;
                  return (
                    <button
                      key={r.officine_id}
                      type="button"
                      onClick={() => choisir(r.officine_id)}
                      className={`rounded-2xl border p-4 text-left shadow-xs transition-all ${
                        active
                          ? "border-[#18AA38] bg-white ring-2 ring-[#18AA38]/20 shadow-sm"
                          : "border-[#CFE3D5] bg-white/70 hover:bg-white hover:border-[#18AA38]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#1F2420] text-sm">{r.officine.nom}</span>
                        {active ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#18AA38] text-white">
                            Actif
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[#5C6660]">{r.officine.ville ?? "—"}</p>
                      <p className="mt-2 text-xs font-semibold text-[#023010]">
                        {fr.roles[r.role as keyof typeof fr.roles] ?? "Rôle non précisé"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {courante ? <TableauDeBord /> : null}
        </>
      )}

      <DialogCreation
        ouverte={creationOuverte}
        onOpenChange={setCreationOuverte}
        userId={user.id}
        onCree={(id) => choisir(id)}
      />
    </div>
  );
}

function DialogCreation({
  ouverte,
  onOpenChange,
  userId,
  onCree,
}: {
  ouverte: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  onCree: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer() {
    setErreur(null);
    setEnCours(true);
    try {
      // L'API attend une identité complète d'officine : on complète les champs
      // obligatoires avec des valeurs neutres, l'utilisateur pourra les affiner.
      const officine = await api.post<{ id: string }>("/officines", {
        nom: nom.trim(),
        raison_sociale: `${nom.trim()} SARL`,
        numero_licence: `BEN-OFF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        adresse: ville.trim() || "Cotonou",
        ville: ville.trim() || "Cotonou",
        telephone: "+229 97 00 00 00",
      });
      await queryClient.invalidateQueries({ queryKey: ["rattachements", userId] });
      const mesOfficines = await api.get<any[]>("/officines").catch(() => [] as any[]);
      if (mesOfficines.length) api.setOfficines(mesOfficines);
      toast.success(fr.officine.creee);
      onCree(officine.id);
      onOpenChange(false);
      setNom("");
      setVille("");
    } catch (e: any) {
      setErreur(e.message || fr.commun.erreur);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Dialog open={ouverte} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fr.officine.creer}</DialogTitle>
          <DialogDescription>{fr.officine.creerDesc}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="officine-nom">{fr.officine.nom}</Label>
            <Input
              id="officine-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="officine-ville">{fr.officine.ville}</Label>
            <Input
              id="officine-ville"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
            />
          </div>
          {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {fr.commun.annuler}
          </Button>
          <Button onClick={creer} disabled={enCours || nom.trim().length < 2}>
            {enCours ? <Loader2 className="size-4 animate-spin" /> : null}
            {fr.commun.enregistrer}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
