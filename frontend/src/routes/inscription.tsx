import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ArrowLeft, Building2, UserPlus, ShieldCheck, CheckCircle2 } from "lucide-react";

import { api } from "@/lib/api-client";
import { fr } from "@/lib/i18n/fr";
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

export const Route = createFileRoute("/inscription")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Créer une officine / Compte — BEGPHARMA" },
      {
        name: "description",
        content:
          "Inscrivez votre officine pharmaceutique sur BEGPHARMA. Mise en conformité immédiate avec le Guide BPD de l'ABMed.",
      },
    ],
  }),
  component: PageInscription,
});

function PageInscription() {
  const navigate = useNavigate();

  const [nomComplet, setNomComplet] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nomOfficine, setNomOfficine] = useState("");
  const [roleCode, setRoleCode] = useState("pharmacien_titulaire");

  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (api.getToken() && api.getUser()) {
      navigate({ to: "/app" });
    }
  }, [navigate]);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nomComplet.trim(),
          email: email.trim(),
          telephone: telephone.trim() || null,
          password: motDePasse,
          officine_nom: nomOfficine.trim(),
          role_code: roleCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erreur lors de la création du compte.");
      }

      // Connexion directe sans double opt-in
      api.setToken(data.token);
      api.setUser(data.user);
      if (data.officines) api.setOfficines(data.officines);

      navigate({ to: "/app" });
    } catch (err: any) {
      setErreur(err.message || fr.commun.erreur);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background px-4 py-10 flex flex-col justify-center items-center">
      <div className="w-full max-w-lg">
        {/* RETOUR ACCUEIL */}
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="size-3.5" /> Retour à l'accueil
          </Link>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <ShieldCheck className="size-3.5" /> Activation directe sans attente
          </span>
        </div>

        {/* LOGO & TITRE */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
            +
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Créer mon espace Officine</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rejoignez la plateforme béninoise de dispensation pharmaceutique conforme ABMed
          </p>
        </div>

        {/* CARTE FORMULAIRE */}
        <Card className="shadow-md border-border/80">
          <CardHeader className="pb-4">
            <CardTitle>Inscription nominative & Officine</CardTitle>
            <CardDescription>
              Remplissez les informations ci-dessous pour initialiser votre officine et votre compte professionnel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={soumettre} className="grid gap-4">
              {/* NOM COMPLET */}
              <div className="grid gap-2">
                <Label htmlFor="nomComplet">Nom et Prénom(s) du praticien / collaborateur</Label>
                <Input
                  id="nomComplet"
                  placeholder="ex: Dr. Marie HOUESSOU"
                  value={nomComplet}
                  onChange={(e) => setNomComplet(e.target.value)}
                  required
                />
              </div>

              {/* EMAIL ET TELEPHONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="email">{fr.auth.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="marie.houessou@pharmacie.bj"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telephone">Téléphone (Bénin)</Label>
                  <Input
                    id="telephone"
                    placeholder="+229 97 00 00 00"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                  />
                </div>
              </div>

              {/* NOM DE L'OFFICINE */}
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-4 text-primary" />
                  <Label htmlFor="nomOfficine">Nom de l'officine (Pharmacie)</Label>
                </div>
                <Input
                  id="nomOfficine"
                  placeholder="ex: Pharmacie du Sacré-Cœur, Cotonou"
                  value={nomOfficine}
                  onChange={(e) => setNomOfficine(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  L'officine sera automatiquement créée et initialisée avec la bibliothèque des 59 modèles BPD ABMed.
                </p>
              </div>

              {/* RÔLE INITIAL */}
              <div className="grid gap-2">
                <Label htmlFor="roleCode">Votre fonction principale dans l'officine</Label>
                <select
                  id="roleCode"
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="pharmacien_titulaire">Pharmacien Titulaire (Directeur de l'officine)</option>
                  <option value="promoteur">Promoteur (Propriétaire / Investisseur)</option>
                  <option value="pharmacien_adjoint">Pharmacien Adjoint</option>
                  <option value="dispensateur">Dispensateur / Équipe de comptoir</option>
                  <option value="magasinier">Magasinier / Gestionnaire de stock</option>
                  <option value="caissier">Caissière / Encaissement</option>
                </select>
              </div>

              {/* MOT DE PASSE */}
              <div className="grid gap-2">
                <Label htmlFor="motDePasse">{fr.auth.motDePasse} (8 caractères minimum)</Label>
                <Input
                  id="motDePasse"
                  type="password"
                  placeholder="••••••••••••"
                  minLength={8}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  required
                />
              </div>

              {erreur ? (
                <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                  {erreur}
                </div>
              ) : null}

              {/* AVANTAGES CONFORMITÉ */}
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5 border border-muted">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <CheckCircle2 className="size-3.5 text-primary" />
                  Prise en main immédiate :
                </div>
                <ul className="list-disc list-inside text-muted-foreground text-[11px] space-y-0.5 ml-1">
                  <li>Connexion immédiate sans délai ni validation e-mail bloquante</li>
                  <li>Initialisation automatique des 59 procédures et fiches BPD ABMed</li>
                  <li>Isolation stricte des données de l'officine par PostgreSQL RLS</li>
                </ul>
              </div>

              <Button type="submit" className="h-11 w-full text-base font-semibold shadow-sm" disabled={enCours}>
                {enCours ? <Loader2 className="size-4 animate-spin mr-2" /> : <UserPlus className="size-4 mr-2" />}
                Créer l'officine et se connecter
              </Button>
            </form>

            <div className="pt-4 text-center border-t mt-4 text-sm">
              <p className="text-muted-foreground">
                Vous avez déjà un compte ?{" "}
                <Link to="/auth" className="font-semibold text-primary hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
