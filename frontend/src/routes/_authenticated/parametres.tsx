import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — BEGPHARMA" },
      {
        name: "description",
        content: "Paramètres de votre officine dans BEGPHARMA, avec historique des versions.",
      },
      { property: "og:title", content: "Paramètres — BEGPHARMA" },
      {
        property: "og:description",
        content: "Paramètres de votre officine dans BEGPHARMA, avec historique des versions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PageParametres,
});

interface Parametre {
  id: string;
  cle: string;
  libelle: string;
  type: string;
  valeur: unknown;
  unite: string | null;
  version: number;
  updated_at: string;
}

const fmtDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function afficherValeur(p: Parametre): string {
  if (p.type === "booleen") return p.valeur ? "Activé" : "Désactivé";
  const brut = typeof p.valeur === "string" ? p.valeur : JSON.stringify(p.valeur);
  return p.unite ? `${brut} ${p.unite}` : (brut ?? "—");
}

function PageParametres() {
  const { courante, aRole, chargement } = useOfficine();
  const queryClient = useQueryClient();
  const [parametreEdite, setParametreEdite] = useState<Parametre | null>(null);

  const { data: parametres, isLoading } = useQuery({
    queryKey: ["parametres", courante?.officine_id],
    enabled: !!courante,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametres")
        .select(
          "id, cle, libelle, type, valeur, unite, version, updated_at",
        )
        .eq("officine_id", courante!.officine_id)
        .eq("archived", false)
        .order("libelle");
      if (error) throw error;
      return (data ?? []) as Parametre[];
    },
  });

  if (chargement || isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!courante) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{fr.officine.aucune}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild className="h-11">
            <Link to="/">{fr.nav.tableau}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const promoteur = aRole("promoteur");

  async function enregistrer(p: Parametre, nouvelleValeur: Json) {
    const { data, error } = await supabase
      .from("parametres")
      .update({ valeur: nouvelleValeur })
      .eq("id", p.id)
      .eq("officine_id", courante!.officine_id)
      .eq("version", p.version)
      .select("id")
      .single();
    if (error) {
      toast.error(fr.commun.erreur);
      return;
    }
    if (!data) {
      toast.error("Ce paramètre a été modifié ailleurs. Rechargez la page.");
      await queryClient.invalidateQueries({ queryKey: ["parametres", courante!.officine_id] });
      return;
    }
    toast.success(fr.parametres.enregistre);
    await queryClient.invalidateQueries({ queryKey: ["parametres", courante!.officine_id] });
    setParametreEdite(null);
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {fr.parametres.titre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {courante.officine.nom}
          {courante.officine.ville ? ` — ${courante.officine.ville}` : ""}
        </p>
        {!promoteur ? (
          <p className="mt-2 text-sm text-muted-foreground">{fr.parametres.reserve}</p>
        ) : null}
      </div>

      <div className="grid gap-3">
        {(parametres ?? []).map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{p.libelle}</span>
                  <Badge variant="outline">
                    {fr.parametres.version}
                    {p.version}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{afficherValeur(p)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fmtDate.format(new Date(p.updated_at))}
                </p>
              </div>
              {promoteur ? (
                <Button variant="outline" size="sm" onClick={() => setParametreEdite(p)}>
                  Modifier
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {(parametres ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{fr.commun.vide}</p>
        ) : null}
      </div>

      {parametreEdite ? (
        <DialogEdition
          parametre={parametreEdite}
          onFermer={() => setParametreEdite(null)}
          onEnregistrer={enregistrer}
        />
      ) : null}
    </div>
  );
}

function DialogEdition({
  parametre,
  onFermer,
  onEnregistrer,
}: {
  parametre: Parametre;
  onFermer: () => void;
  onEnregistrer: (p: Parametre, valeur: Json) => Promise<void>;
}) {
  const [enCours, setEnCours] = useState(false);
  const booleen = parametre.type === "booleen";
  const numerique = ["entier", "decimal", "nombre"].includes(parametre.type);
  const [texte, setTexte] = useState(
    typeof parametre.valeur === "string" ? parametre.valeur : String(parametre.valeur ?? ""),
  );
  const [coche, setCoche] = useState(Boolean(parametre.valeur));

  async function valider() {
    setEnCours(true);
    let valeur: Json = texte.trim();
    if (booleen) valeur = coche;
    else if (numerique) valeur = Number(texte.replace(",", "."));
    await onEnregistrer(parametre, valeur);
    setEnCours(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parametre.libelle}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {booleen ? (
            <div className="flex items-center justify-between">
              <Label htmlFor="valeur">{afficherValeur(parametre)}</Label>
              <Switch id="valeur" checked={coche} onCheckedChange={setCoche} />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="valeur">
                {parametre.unite ? `${parametre.unite} ` : ""}
                {fr.parametres.version}
                {parametre.version}
              </Label>
              {parametre.type === "texte" ? (
                <Textarea
                  id="valeur"
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  rows={3}
                />
              ) : (
                <Input
                  id="valeur"
                  type={numerique ? "number" : "text"}
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  step={parametre.type === "decimal" ? "any" : undefined}
                />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            {fr.commun.annuler}
          </Button>
          <Button onClick={valider} disabled={enCours}>
            {enCours ? <Loader2 className="size-4 animate-spin" /> : null}
            {fr.commun.enregistrer}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
