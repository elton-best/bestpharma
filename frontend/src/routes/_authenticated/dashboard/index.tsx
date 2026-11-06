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
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accueil : BestPharma" },
      {
        name: "description",
        content: "Votre officine BestPharma : socle conforme au Guide BPD de l'ABMed.",
      },
      { property: "og:title", content: "Accueil : BestPharma" },
      {
        property: "og:description",
        content: "Votre officine BestPharma : socle conforme au Guide BPD de l'ABMed.",
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
              <Link to="/dashboard/securite">Activer maintenant</Link>
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
                      <p className="mt-1 text-xs text-[#5C6660]">{r.officine.ville ?? "Non renseigné"}</p>
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
      // L'officine se crée avec son nom et sa ville ; la licence et les mentions
      // administratives se complètent ensuite dans la fiche officine.
      const officine = await api.post<{ id: string }>("/officines", {
        nom: nom.trim(),
        ville: ville.trim() || undefined,
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
      <ModaleFiche
        titre={fr.officine.creer}
        sousTitre={fr.officine.creerDesc}
        badge={<Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">Nouvelle officine</Badge>}
        pied={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-[#475C50]">
              L'officine créée vous est rattachée immédiatement : vous pourrez y basculer depuis l'accueil.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 rounded-xl sm:h-11">
                Annuler
              </Button>
              <Button
                type="button"
                onClick={creer}
                disabled={enCours || !nom.trim()}
                className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
              >
                {enCours ? "Création…" : "Créer l'officine"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ColonneFiche titre="Identité de l'officine" aide="Le nom apparaît sur les documents et les états remis à l'administration.">
            <Champ label={fr.officine.nom} obligatoire>
              <Input
                id="officine-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="h-11"
              />
            </Champ>
            <Champ label={fr.officine.ville}>
              <Input
                id="officine-ville"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                className="h-11"
              />
            </Champ>
            {erreur ? <p className="text-sm font-semibold text-red-700">{erreur}</p> : null}
          </ColonneFiche>

          <ColonneFiche titre="Après la création" aide="Trois étapes pour rendre l'officine pleinement opérationnelle.">
            <ol className="space-y-2 text-xs text-[#475C50]">
              <li className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] px-3 py-2">
                Compléter la licence, l'adresse et le téléphone dans la fiche officine.
              </li>
              <li className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] px-3 py-2">
                Renseigner les paramètres de gestion : TVA, seuils d'alerte, conservation.
              </li>
              <li className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] px-3 py-2">
                Inscrire l'équipe et ouvrir la première session de caisse.
              </li>
            </ol>
          </ColonneFiche>
        </div>
      </ModaleFiche>
    </Dialog>
  );
}
