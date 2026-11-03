import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ArrowLeft, Shield, Sparkles, UserCheck } from "lucide-react";

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
          "Connectez-vous directement à BEGPHARMA, la gestion d'officine conforme au Guide BPD de l'ABMed.",
      },
    ],
  }),
  component: PageConnexion,
});

const COMPTES_TEST = [
  {
    role: "Pharmacien Titulaire",
    email: "pharmacien@begpharma.bj",
    nom: "Dr Félicien AGBO",
    badge: "Responsable BPD",
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  },
  {
    role: "Promoteur / Fondateur",
    email: "promoteur@begpharma.bj",
    nom: "M. Aimé TOSSOU",
    badge: "Multi-officines",
    color: "bg-blue-500/10 text-blue-700 border-blue-300",
  },
  {
    role: "Dispensateur (Comptoir)",
    email: "dispensateur@begpharma.bj",
    nom: "Gervais KPADONOU",
    badge: "Vente & Conseil",
    color: "bg-purple-500/10 text-purple-700 border-purple-300",
  },
  {
    role: "Caissière",
    email: "caissier@begpharma.bj",
    nom: "Saliou TOURE",
    badge: "Encaissement",
    color: "bg-amber-500/10 text-amber-700 border-amber-300",
  },
  {
    role: "Magasinier",
    email: "magasinier@begpharma.bj",
    nom: "Bénédicte HOUNSOU",
    badge: "Stock & FEFO",
    color: "bg-orange-500/10 text-orange-700 border-orange-300",
  },
  {
    role: "Inspecteur ABMed",
    email: "inspecteur@abmed.bj",
    nom: "Dr Marc KPOSSOU",
    badge: "Audit Réglementaire",
    color: "bg-red-500/10 text-red-700 border-red-300",
  },
];

function PageConnexion() {
  const navigate = useNavigate();
  const { verrouille } = Route.useSearch();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (api.getToken() && api.getUser()) {
      navigate({ to: "/app" });
    }
  }, [navigate]);

  async function soumettre(e?: React.FormEvent, customEmail?: string, customPass?: string) {
    if (e) e.preventDefault();
    setMessage(null);
    setEnCours(true);

    const emailToUse = customEmail || email.trim();
    const passToUse = customPass || motDePasse;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse, password: passToUse }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Identifiants incorrects.");
      }

      api.setToken(data.token);
      api.setUser(data.user);
      if (data.officines) api.setOfficines(data.officines);
      navigate({ to: "/app" });
    } catch (err: any) {
      setMessage(err.message || fr.commun.erreur);
    } finally {
      setEnCours(false);
    }
  }

  function connexionRapide(compteEmail: string) {
    setEmail(compteEmail);
    setMotDePasse("Begpharma2026!");
    soumettre(undefined, compteEmail, "Begpharma2026!");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background px-4 py-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-md">
        {/* LIEN RETOUR LANDING */}
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="size-3.5" /> Retour à l'accueil
          </Link>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <Shield className="size-3.5" /> Accès direct activé
          </span>
        </div>

        {/* LOGO */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
            +
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Connexion Officine</h1>
          <p className="mt-1 text-sm text-muted-foreground">BEGPHARMA · Système de gestion d'officine certifié BPD</p>
        </div>

        {/* FORMULAIRE CONNEXION */}
        <Card className="shadow-md border-border/80">
          <CardHeader className="pb-4">
            <CardTitle>{fr.auth.titreConnexion}</CardTitle>
            <CardDescription>
              Accédez directement à votre espace de travail sans double validation contraignante.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verrouille ? (
              <Alert className="mb-2">
                <AlertDescription>{fr.auth.verrouille}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={soumettre} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{fr.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="pharmacien@begpharma.bj"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="mdp">{fr.auth.motDePasse}</Label>
                  <span className="text-[11px] text-muted-foreground">Démo : Begpharma2026!</span>
                </div>
                <Input
                  id="mdp"
                  type="password"
                  placeholder="••••••••••••"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {message ? (
                <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                  {message}
                </div>
              ) : null}

              <Button type="submit" className="h-11 w-full text-base font-semibold shadow-sm" disabled={enCours}>
                {enCours ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {fr.auth.seConnecter}
              </Button>
            </form>

            {/* LIEN CREATION DE COMPTE */}
            <div className="pt-2 text-center border-t text-sm">
              <p className="text-muted-foreground">
                Nouvelle officine ou nouveau collaborateur ?{" "}
                <Link to="/inscription" className="font-semibold text-primary hover:underline">
                  Créer un compte
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ACCÈS RAPIDE 1-CLIC PAR PROFIL */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Accès rapide démo par profil (1 clic)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COMPTES_TEST.map((c) => (
              <button
                key={c.email}
                type="button"
                onClick={() => connexionRapide(c.email)}
                disabled={enCours}
                className="flex flex-col text-left p-2.5 rounded-lg border bg-card/60 hover:bg-card hover:border-primary/50 hover:shadow-sm transition-all text-xs group"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                    <UserCheck className="size-3 text-muted-foreground group-hover:text-primary" />
                    {c.role}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${c.color}`}>
                    {c.badge}
                  </span>
                </div>
                <span className="text-muted-foreground truncate mt-0.5">{c.nom}</span>
                <span className="font-mono text-[10px] text-muted-foreground/80 mt-0.5">{c.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
