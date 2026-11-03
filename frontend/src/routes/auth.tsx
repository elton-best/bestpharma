import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";

import { api } from "@/lib/api-client";
import { fr } from "@/lib/i18n/fr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (recherche: Record<string, unknown>) => ({
    ...(recherche["verrouille"] === "1" ? { verrouille: true } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Connexion — BEGPHARMA" },
      {
        name: "description",
        content:
          "Connectez-vous à BEGPHARMA, la gestion d'officine conforme au Guide BPD de l'ABMed.",
      },
    ],
  }),
  component: PageConnexion,
});

function PageConnexion() {
  const navigate = useNavigate();
  const { verrouille } = Route.useSearch();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [codeTotp, setCodeTotp] = useState("");
  const [mfaRequis, setMfaRequis] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (api.getToken() && api.getUser()) {
      navigate({ to: "/" });
    }
  }, [navigate]);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setEnCours(true);

    try {
      if (mfaRequis && tempToken) {
        // Validation code TOTP
        const res = await fetch("/api/auth/verify-mfa", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tempToken}`,
          },
          body: JSON.stringify({ code: codeTotp.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Code TOTP invalide.");
        }
        api.setToken(data.token);
        api.setUser(data.user);
        if (data.officines) api.setOfficines(data.officines);
        navigate({ to: "/" });
        return;
      }

      // Connexion mot de passe
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: motDePasse }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Identifiants incorrects.");
      }

      if (data.mfa_required) {
        setMfaRequis(true);
        setTempToken(data.temp_token);
        setMessage(data.message || "Veuillez entrer votre code à 6 chiffres.");
        setEnCours(false);
        return;
      }

      api.setToken(data.token);
      api.setUser(data.user);
      if (data.officines) api.setOfficines(data.officines);
      navigate({ to: "/" });
    } catch (err: any) {
      setMessage(err.message || fr.commun.erreur);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
            +
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">{fr.app.nom}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{fr.app.baseline}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {mfaRequis ? "Double authentification (MFA TOTP)" : fr.auth.titreConnexion}
            </CardTitle>
            <CardDescription>
              {mfaRequis
                ? "Saisissez le code temporaire à 6 chiffres de votre application d'authentification."
                : "Entrez vos identifiants nominatifs pour accéder à l'officine."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verrouille ? (
              <Alert className="mb-4">
                <AlertDescription>{fr.auth.verrouille}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={soumettre} className="grid gap-4">
              {!mfaRequis ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="email">{fr.auth.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mdp">{fr.auth.motDePasse}</Label>
                    <Input
                      id="mdp"
                      type="password"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </>
              ) : (
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <Label htmlFor="totp">Code de sécurité à 6 chiffres</Label>
                  </div>
                  <Input
                    id="totp"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    className="text-center font-mono text-xl tracking-widest"
                    value={codeTotp}
                    onChange={(e) => setCodeTotp(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}

              {message ? (
                <p className={`text-sm ${mfaRequis && !codeTotp ? "text-muted-foreground" : "text-destructive"}`}>
                  {message}
                </p>
              ) : null}

              <Button type="submit" className="h-11 w-full" disabled={enCours}>
                {enCours ? <Loader2 className="size-4 animate-spin" /> : null}
                {mfaRequis ? "Valider le code" : fr.auth.seConnecter}
              </Button>

              {mfaRequis ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => {
                    setMfaRequis(false);
                    setTempToken(null);
                    setCodeTotp("");
                    setMessage(null);
                  }}
                >
                  Revenir à la saisie des identifiants
                </Button>
              ) : null}
            </form>

            {!mfaRequis ? (
              <div className="mt-6 rounded-lg border border-dashed bg-muted/50 p-3 text-xs space-y-2">
                <p className="font-semibold text-foreground">Comptes de démonstration pré-configurés :</p>
                <div className="space-y-1">
                  <button
                    type="button"
                    className="text-left w-full hover:underline font-mono text-primary"
                    onClick={() => {
                      setEmail("dispensateur@begpharma.bj");
                      setMotDePasse("Begpharma2026!");
                    }}
                  >
                    1. dispensateur@begpharma.bj (Direct)
                  </button>
                  <button
                    type="button"
                    className="text-left w-full hover:underline font-mono text-primary"
                    onClick={() => {
                      setEmail("pharmacien@begpharma.bj");
                      setMotDePasse("Begpharma2026!");
                    }}
                  >
                    2. pharmacien@begpharma.bj (MFA TOTP)
                  </button>
                  <button
                    type="button"
                    className="text-left w-full hover:underline font-mono text-primary"
                    onClick={() => {
                      setEmail("promoteur@begpharma.bj");
                      setMotDePasse("Begpharma2026!");
                    }}
                  >
                    3. promoteur@begpharma.bj (MFA TOTP)
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  Mot de passe commun : Begpharma2026!
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
