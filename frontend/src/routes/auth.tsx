import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
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
      { property: "og:title", content: "Connexion — BEGPHARMA" },
      {
        property: "og:description",
        content: "Connectez-vous à BEGPHARMA, gestion d'officine conforme au Guide BPD.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PageConnexion,
});

function messageErreur(code: string | undefined, message: string): string {
  switch (code) {
    case "invalid_credentials":
    case "user_not_found":
      return "E-mail ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Confirmez d'abord votre adresse e-mail (lien reçu par e-mail).";
    default:
      return message || fr.commun.erreur;
  }
}

function motDePasseValide(mdp: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(mdp);
}

function PageConnexion() {
  const navigate = useNavigate();
  const { verrouille } = Route.useSearch();

  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nomComplet, setNomComplet] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [compteCree, setCompteCree] = useState(false);

  // Déjà connecté ? On repart directement à l'accueil.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (mode === "inscription") {
      if (!motDePasseValide(motDePasse)) {
        setMessage(`Mot de passe invalide : ${fr.auth.mdpRegle}`);
        return;
      }
      setEnCours(true);
      const { error } = await supabase.auth.signUp({
        email,
        password: motDePasse,
        options: { data: { nom_complet: nomComplet } },
      });
      setEnCours(false);
      if (error) {
        setMessage(messageErreur(error.code, error.message));
        return;
      }
      setCompteCree(true);
      setMode("connexion");
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setEnCours(false);
    if (error) {
      setMessage(messageErreur(error.code, error.message));
      return;
    }
    navigate({ to: "/" });
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
              {mode === "connexion" ? fr.auth.titreConnexion : fr.auth.titreInscription}
            </CardTitle>
            <CardDescription>
              {mode === "connexion" ? undefined : fr.auth.mdpRegle}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verrouille ? (
              <Alert className="mb-4">
                <AlertDescription>{fr.auth.verrouille}</AlertDescription>
              </Alert>
            ) : null}
            {compteCree ? (
              <Alert className="mb-4">
                <AlertDescription>{fr.auth.verifierEmail}</AlertDescription>
              </Alert>
            ) : null}
            <form onSubmit={soumettre} className="grid gap-4">
              {mode === "inscription" ? (
                <div className="grid gap-2">
                  <Label htmlFor="nom">{fr.auth.nomComplet}</Label>
                  <Input
                    id="nom"
                    value={nomComplet}
                    onChange={(e) => setNomComplet(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              ) : null}
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
                  autoComplete={mode === "connexion" ? "current-password" : "new-password"}
                />
              </div>
              {message ? <p className="text-sm text-destructive">{message}</p> : null}
              <Button type="submit" className="h-11 w-full" disabled={enCours}>
                {enCours ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "connexion" ? fr.auth.seConnecter : fr.auth.sInscrire}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "connexion" ? "inscription" : "connexion");
                setMessage(null);
                setCompteCree(false);
              }}
              className="mt-4 w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {mode === "connexion" ? fr.auth.basculerInscription : fr.auth.basculerConnexion}
            </button>
            {mode === "connexion" ? (
              <div className="mt-4 rounded-lg border border-dashed bg-muted/50 p-3 text-sm">
                <p className="font-medium text-foreground">Compte de démonstration</p>
                <p className="text-muted-foreground">demo@begpharma.app</p>
                <p className="text-muted-foreground">Demo-Begpharma-2026</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-9 w-full"
                  onClick={() => {
                    setEmail("demo@begpharma.app");
                    setMotDePasse("Demo-Begpharma-2026");
                  }}
                >
                  Remplir les identifiants démo
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
