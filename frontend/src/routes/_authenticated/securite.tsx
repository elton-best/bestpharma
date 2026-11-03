import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fr } from "@/lib/i18n/fr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/securite")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sécurité — BEGPHARMA" },
      {
        name: "description",
        content: "Double authentification de votre compte BEGPHARMA.",
      },
      { property: "og:title", content: "Sécurité — BEGPHARMA" },
      {
        property: "og:description",
        content: "Activez la double authentification exigée pour votre rôle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PageSecurite,
});

function qrEnDataUri(qr: string): string {
  if (qr.startsWith("data:")) return qr;
  return `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;
}

function PageSecurite() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [enCours, setEnCours] = useState(false);
  const [code, setCode] = useState("");
  const [enrollement, setEnrollement] = useState<{ factorId: string; qr: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: etat, isLoading } = useQuery({
    queryKey: ["securite", user.id],
    queryFn: async () => {
      const [{ data: factors }, { data: requise }, niveau] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.rpc("mfa_requise"),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      if (requise === null) throw new Error("Statut indisponible");
      return {
        facteurVerifie: (factors?.all ?? []).find((f) => f.status === "verified")?.id ?? null,
        aal2: (niveau.data?.currentLevel ?? "aal1") === "aal2",
        requise: !!requise,
      };
    },
  });

  async function demarrer() {
    setErreur(null);
    setEnCours(true);
    // On nettoie une éventuelle tentative précédente restée non vérifiée.
    const { data: existants } = await supabase.auth.mfa.listFactors();
    for (const f of existants?.all ?? []) {
      if (f.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "BEGPHARMA",
    });
    setEnCours(false);
    if (error || !data) {
      setErreur(error?.message || fr.commun.erreur);
      return;
    }
    setEnrollement({ factorId: data.id, qr: data.totp.qr_code });
  }

  async function verifier() {
    const factorId = enrollement?.factorId ?? etat?.facteurVerifie;
    if (!factorId) return;
    setErreur(null);
    setEnCours(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.replace(/\s+/g, ""),
    });
    if (error) {
      setErreur("Code incorrect. Réessayez.");
      setEnCours(false);
      return;
    }
    // La session doit repartir avec un jeton portant le niveau aal2,
    // sinon les règles de la base continuent de masquer les officines.
    await supabase.auth.refreshSession();
    await queryClient.invalidateQueries();
    toast.success(fr.mfa.active);
    setEnrollement(null);
    setCode("");
    navigate({ to: "/" });
  }

  async function annuler() {
    if (enrollement) {
      await supabase.auth.mfa.unenroll({ factorId: enrollement.factorId });
    }
    setEnrollement(null);
    setCode("");
    setErreur(null);
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {fr.mfa.titre}
        </h1>
        {etat?.requise ? (
          <p className="mt-1 text-sm text-muted-foreground">{fr.mfa.obligatoire}</p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{fr.mfa.titre}</CardTitle>
          <CardDescription>
            {etat?.facteurVerifie && etat.aal2
              ? fr.mfa.active
              : enrollement
                ? fr.mfa.scanner
                : etat?.facteurVerifie
                  ? fr.mfa.confirmerDesc
                  : fr.mfa.obligatoire}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {erreur ? (
            <Alert>
              <AlertDescription>{erreur}</AlertDescription>
            </Alert>
          ) : null}

          {etat?.facteurVerifie && etat.aal2 ? (
            <Button asChild className="h-11 w-fit">
              <Link to="/">{fr.nav.tableau}</Link>
            </Button>
          ) : enrollement ? (
            <>
              <img
                src={qrEnDataUri(enrollement.qr)}
                alt="QR code d'activation"
                className="mx-auto size-56 rounded-lg bg-white p-2"
              />
              <div className="grid gap-2">
                <Label htmlFor="code-mfa">{fr.mfa.code}</Label>
                <Input
                  id="code-mfa"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="text-center text-lg tracking-[0.4em]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={verifier}
                  disabled={enCours || code.length !== 6}
                  className="h-11"
                >
                  {enCours ? <Loader2 className="size-4 animate-spin" /> : null}
                  {fr.mfa.verifier}
                </Button>
                <Button variant="outline" onClick={annuler} disabled={enCours} className="h-11">
                  {fr.commun.annuler}
                </Button>
              </div>
            </>
          ) : etat?.facteurVerifie ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code-mfa">{fr.mfa.code}</Label>
                <Input
                  id="code-mfa"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="max-w-48 text-center text-lg tracking-[0.4em]"
                />
              </div>
              <Button
                onClick={verifier}
                disabled={enCours || code.length !== 6}
                className="h-11 w-fit"
              >
                {enCours ? <Loader2 className="size-4 animate-spin" /> : null}
                {fr.mfa.verifier}
              </Button>
            </div>
          ) : (
            <Button onClick={demarrer} disabled={enCours} className="h-11 w-fit">
              {enCours ? <Loader2 className="size-4 animate-spin" /> : null}
              {fr.mfa.titre}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
