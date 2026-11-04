import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — BEGPHARMA" },
      { name: "description", content: "Paramètres de votre officine, versionnés à chaque modification." },
    ],
  }),
  component: PageParametres,
});

interface Parametre {
  id: string;
  cle: string;
  libelle: string;
  type: "texte" | "nombre" | "entier" | "decimal" | "booleen";
  valeur: unknown;
  unite: string | null;
  description: string | null;
  version: number;
  updated_at: string | null;
}

const fmtDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

/** Libellés lisibles pour les valeurs fermées : aucune valeur technique affichée. */
const VALEURS_LISIBLES: Record<string, string> = {
  alerte: "Avertir le pharmacien",
  blocage: "Bloquer la délivrance",
  Africa_Porto_Novo: "Heure du Bénin",
  "Africa/Porto-Novo": "Heure du Bénin",
  XOF: "Franc CFA",
};

function afficherValeur(p: Parametre): string {
  if (p.type === "booleen") return p.valeur ? "Activé" : "Désactivé";
  if (p.valeur === null || p.valeur === undefined || p.valeur === "") return "Non renseigné";
  const brut = typeof p.valeur === "string" ? p.valeur : JSON.stringify(p.valeur);
  const lisible = VALEURS_LISIBLES[brut] ?? brut;
  return p.unite ? `${lisible} ${p.unite}` : lisible;
}

const estNumerique = (p: Parametre) => ["entier", "decimal", "nombre"].includes(p.type);

function PageParametres() {
  const { courante, aRole, chargement } = useOfficine();
  const queryClient = useQueryClient();
  const [parametreEdite, setParametreEdite] = useState<Parametre | null>(null);

  const { data: parametres, isLoading } = useQuery<Parametre[]>({
    queryKey: ["parametres", courante?.officine_id],
    enabled: !!courante,
    queryFn: () => api.get<Parametre[]>(`/officines/${courante!.officine_id}/parametres`),
  });

  const enregistrer = useMutation({
    mutationFn: ({ p, valeur }: { p: Parametre; valeur: unknown }) =>
      api.put(`/officines/${courante!.officine_id}/parametres/${encodeURIComponent(p.cle)}`, {
        valeur,
      }),
    onSuccess: async () => {
      toast.success(fr.parametres.enregistre);
      await queryClient.invalidateQueries({ queryKey: ["parametres", courante?.officine_id] });
      setParametreEdite(null);
    },
    onError: (e: any) => toast.error(e.message || fr.commun.erreur),
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
            <Link to="/app">{fr.nav.tableau}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const promoteur = aRole("promoteur");
  const liste = parametres ?? [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
        <div className="flex items-center gap-2 rounded-xl border border-[#CFF1D2] bg-[#F7FBF8] px-3 py-2 text-xs text-[#0F3B27]">
          <Settings2 className="size-4" />
          Chaque modification est versionnée et tracée dans le journal d'audit.
        </div>
      </div>

      <div className="grid gap-3">
        {liste.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{p.libelle}</span>
                  <Badge variant="outline">
                    {fr.parametres.version}
                    {p.version}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{afficherValeur(p)}</p>
                {p.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                ) : null}
                {p.updated_at ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dernière modification : {fmtDate.format(new Date(p.updated_at))}
                  </p>
                ) : null}
              </div>
              {promoteur ? (
                <Button
                  variant="outline"
                  className="h-11 shrink-0"
                  onClick={() => setParametreEdite(p)}
                >
                  Modifier
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {liste.length === 0 ? <p className="text-sm text-muted-foreground">{fr.commun.vide}</p> : null}
      </div>

      {parametreEdite ? (
        <DialogEdition
          parametre={parametreEdite}
          enCours={enregistrer.isPending}
          onFermer={() => setParametreEdite(null)}
          onEnregistrer={(valeur) => enregistrer.mutate({ p: parametreEdite, valeur })}
        />
      ) : null}
    </div>
  );
}

const OPTIONS_TEXTE: Record<string, { valeur: string; libelle: string }[]> = {
  mode_presence_pharmacien: [
    { valeur: "alerte", libelle: "Avertir le pharmacien" },
    { valeur: "blocage", libelle: "Bloquer la délivrance" },
  ],
  fuseau_horaire: [{ valeur: "Africa/Porto-Novo", libelle: "Heure du Bénin (Cotonou, Porto-Novo)" }],
  devise: [{ valeur: "XOF", libelle: "Franc CFA" }],
};

function DialogEdition({
  parametre,
  enCours,
  onFermer,
  onEnregistrer,
}: {
  parametre: Parametre;
  enCours: boolean;
  onFermer: () => void;
  onEnregistrer: (valeur: unknown) => void;
}) {
  const booleen = parametre.type === "booleen";
  const numerique = estNumerique(parametre);
  const options = OPTIONS_TEXTE[parametre.cle];
  const [texte, setTexte] = useState(
    typeof parametre.valeur === "string" ? parametre.valeur : String(parametre.valeur ?? ""),
  );
  const [coche, setCoche] = useState(Boolean(parametre.valeur));

  function valider() {
    if (booleen) return onEnregistrer(coche);
    if (numerique) {
      const nombre = Number(texte.replace(",", "."));
      if (Number.isNaN(nombre)) {
        toast.error("Saisissez un nombre valide.");
        return;
      }
      return onEnregistrer(nombre);
    }
    onEnregistrer(texte.trim());
  }

  return (
    <ModaleFiche
      titre={parametre.libelle}
      sousTitre={parametre.description ?? undefined}
      badge={<Badge variant="outline">Version {parametre.version}</Badge>}
      pied={
        <>
          <Button variant="outline" className="h-12" onClick={onFermer}>
            {fr.commun.annuler}
          </Button>
          <Button className="h-12" onClick={valider} disabled={enCours}>
            {enCours ? <Loader2 className="size-4 animate-spin" /> : null}
            {fr.commun.enregistrer}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ColonneFiche titre="Nouvelle valeur">
          <Champ label="Valeur">
            {booleen ? (
              <div className="flex min-h-12 items-center justify-between rounded-lg border border-input px-3">
                <span className="text-sm text-foreground">{coche ? "Activé" : "Désactivé"}</span>
                <Switch checked={coche} onCheckedChange={setCoche} />
              </div>
            ) : options ? (
              <Select value={texte} onValueChange={setTexte}>
                <SelectTrigger className="h-12 w-full">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.valeur} value={o.valeur}>
                      {o.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : parametre.type === "texte" ? (
              <Textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={4} />
            ) : (
              <Input
                type={numerique ? "number" : "text"}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                step={parametre.type === "decimal" ? "any" : undefined}
                className="h-12"
              />
            )}
          </Champ>
          {parametre.unite ? (
            <p className="text-xs text-muted-foreground">Exprimé en {parametre.unite}.</p>
          ) : null}
        </ColonneFiche>
        <ColonneFiche titre="Effet du changement" aide="Ce paramètre s'applique à toute l'officine.">
          <p className="rounded-xl border border-[#CFE3D5] bg-[#F7FBF8] p-3 text-sm text-[#0F3B27]">
            La valeur actuelle est <strong>{afficherValeur(parametre)}</strong>. L'enregistrement
            incrémente la version et laisse une trace inaltérable dans le journal d'audit.
          </p>
        </ColonneFiche>
      </div>
    </ModaleFiche>
  );
}
