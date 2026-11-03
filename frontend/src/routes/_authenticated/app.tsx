import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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
      const [{ data: bruts }, niveau] = await Promise.all([
        supabase.from("utilisateurs_officines").select("id").eq("user_id", user.id).eq("archived", false),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      return {
        total: (bruts ?? []).length,
        eleve: (niveau.data?.currentLevel ?? "aal1") === "aal2",
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

  const masquees = (mfaEtat?.total ?? 0) - rattachements.length;
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {fr.tableau.bienvenue}
          {profil?.nom_complet ? `, ${profil.nom_complet}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{fr.tableau.socle}</p>
      </div>


      {rattachements.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{fr.officine.aucune}</CardTitle>
            <CardDescription>{fr.officine.aucuneDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => setCreationOuverte(true)} className="h-11">
              {fr.officine.creer}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {rattachements.length > 1 ? (
            <section className="grid gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
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
                      className={`rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/40 ${
                        active ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{r.officine.nom}</span>
                        {active ? <Badge>{fr.nav.tableau}</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.officine.ville ?? "—"}</p>
                      <p className="mt-2 text-sm text-secondary-foreground">
                        {fr.roles[r.role]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {courante ? <TableauDeBord /> : null}

          <Button
            variant="ghost"
            onClick={() => setCreationOuverte(true)}
            className="w-fit text-muted-foreground"
          >
            {fr.officine.creer}
          </Button>
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
    const { data, error } = await supabase.rpc("creer_officine", {
      _nom: nom,
      _ville: ville,
    });
    setEnCours(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["rattachements", userId] });
    toast.success(fr.officine.creee);
    if (data) onCree(data);
    onOpenChange(false);
    setNom("");
    setVille("");
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
