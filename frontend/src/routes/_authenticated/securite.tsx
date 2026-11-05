import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { fr } from "@/lib/i18n/fr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";
import { Dialog } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/securite")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sécurité — BestPharma" },
      { name: "description", content: "Double authentification de votre compte BestPharma." },
      { property: "og:title", content: "Sécurité — BestPharma" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PageSecurite,
});

interface EtatMfa {
  mfa_enabled: boolean;
  mfa_secret_present: boolean;
  mfa_required: boolean;
  devices: number;
  derniere_activite: string | null;
}

interface Enrollement {
  secret: string;
  otpauth_url: string;
  qr_code_url: string;
}

function PageSecurite() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [enrollement, setEnrollement] = useState<Enrollement | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [desactivation, setDesactivation] = useState(false);

  const { data: etat, isLoading } = useQuery<EtatMfa>({
    queryKey: ["securite"],
    queryFn: () => api.get<EtatMfa>("/auth/mfa"),
  });

  const demarrer = useMutation({
    mutationFn: () => api.post<Enrollement>("/auth/mfa/demarrer", {}),
    onSuccess: (donnees) => {
      setErreur(null);
      setCode("");
      setEnrollement(donnees);
    },
    onError: (e: any) => setErreur(e.message || fr.commun.erreur),
  });

  const confirmer = useMutation({
    mutationFn: () =>
      api.post<{ token?: string; user?: unknown }>("/auth/verify-mfa", {
        code: code.replace(/\s+/g, ""),
      }),
    onSuccess: async () => {
      toast.success(fr.mfa.active);
      setEnrollement(null);
      setCode("");
      await queryClient.invalidateQueries();
      navigate({ to: "/app" });
    },
    onError: () => {
      setErreur("Code incorrect ou expiré. Vérifiez l'heure de votre téléphone puis réessayez.");
    },
  });

  const desactiver = useMutation({
    mutationFn: () => api.delete("/auth/mfa"),
    onSuccess: async () => {
      toast.success("Double authentification désactivée.");
      setDesactivation(false);
      await queryClient.invalidateQueries({ queryKey: ["securite"] });
    },
    onError: (e: any) => toast.error(e.message || fr.commun.erreur),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const active = !!etat?.mfa_enabled;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {fr.mfa.titre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {etat?.mfa_required
              ? fr.mfa.obligatoire
              : "Renforcez la protection de votre compte avec un code temporaire à chaque connexion."}
          </p>
        </div>
        <Badge
          variant={active ? "default" : "outline"}
          className={active ? "h-8 gap-1.5 bg-emerald-600 px-3 text-white" : "h-8 gap-1.5 px-3"}
        >
          {active ? <ShieldCheck className="size-4" /> : <ShieldOff className="size-4" />}
          {active ? "Double authentification active" : "Double authentification inactive"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application d'authentification</CardTitle>
          <CardDescription>
            {active
              ? fr.mfa.active
              : enrollement
                ? fr.mfa.scanner
                : "Scannez le QR code avec une application d'authentification, puis saisissez le code à six chiffres."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {erreur ? (
            <Alert>
              <AlertDescription>{erreur}</AlertDescription>
            </Alert>
          ) : null}

          {enrollement ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid place-items-center gap-2 rounded-xl border border-[#CFE3D5] bg-[#F7FBF8] p-4">
                <img
                  src={enrollement.qr_code_url}
                  alt="QR code d'activation de la double authentification"
                  className="size-52 rounded-lg bg-white p-2"
                />
                <p className="text-center text-xs text-muted-foreground">
                  Clé de secours à recopier si le scan échoue : <strong>{enrollement.secret}</strong>
                </p>
              </div>
              <div className="grid content-start gap-3">
                <Champ label={fr.mfa.code} obligatoire>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="h-14 text-center text-lg tracking-[0.4em]"
                  />
                </Champ>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => confirmer.mutate()}
                    disabled={confirmer.isPending || code.length !== 6}
                    className="h-12"
                  >
                    {confirmer.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    {fr.mfa.verifier}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={() => {
                      setEnrollement(null);
                      setCode("");
                      setErreur(null);
                    }}
                    disabled={confirmer.isPending}
                  >
                    {fr.commun.annuler}
                  </Button>
                </div>
              </div>
            </div>
          ) : active ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild className="h-12">
                <Link to="/app">{fr.nav.tableau}</Link>
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => setDesactivation(true)}
              >
                Désactiver la double authentification
              </Button>
            </div>
          ) : (
            <Button onClick={() => demarrer.mutate()} disabled={demarrer.isPending} className="h-12 w-fit">
              {demarrer.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Activer la double authentification
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-5" /> Appareils connectés
          </CardTitle>
          <CardDescription>
            Chaque connexion ouvre une session nominative. Déconnectez à distance tout appareil que
            vous ne reconnaissez pas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {etat?.devices ?? 0} appareil{(etat?.devices ?? 0) > 1 ? "s" : ""} connecté
            {(etat?.devices ?? 0) > 1 ? "s" : ""} à votre compte.
          </p>
          <Button asChild variant="outline" className="h-12">
            <Link to="/appareils">Gérer les appareils</Link>
          </Button>
        </CardContent>
      </Card>

      {desactivation ? (
        <Dialog open onOpenChange={(o) => !o && setDesactivation(false)}>
          <ModaleFiche
            titre="Désactiver la double authentification"
            sousTitre="Cette protection est exigée pour les rôles à responsabilité."
            pied={
              <>
                <Button variant="outline" className="h-12" onClick={() => setDesactivation(false)}>
                  {fr.commun.annuler}
                </Button>
                <Button
                  variant="destructive"
                  className="h-12"
                  onClick={() => desactiver.mutate()}
                  disabled={desactiver.isPending}
                >
                  {desactiver.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Désactiver
                </Button>
              </>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ColonneFiche titre="Ce qui change">
                <p className="rounded-xl border border-[#CFE3D5] bg-[#F7FBF8] p-3 text-sm text-[#0F3B27]">
                  Votre compte ne demandera plus de code temporaire à la connexion. Cette opération
                  est consignée dans le journal d'audit.
                </p>
              </ColonneFiche>
              <ColonneFiche titre="Recommandation">
                <p className="text-sm text-muted-foreground">
                  Conservez votre application d'authentification : vous pourrez réactiver la
                  protection à tout moment, sans perdre vos accès.
                </p>
              </ColonneFiche>
            </div>
          </ModaleFiche>
        </Dialog>
      ) : null}
    </div>
  );
}
