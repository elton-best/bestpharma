import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Award,
  ArrowRight,
  PlusCircle,
  Building2,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  // Si l'utilisateur est déjà connecté, on lui propose d'accéder directement au dashboard
  const user = api.getUser();
  const token = api.getToken();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex flex-col">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-md">
              +
            </div>
            <div>
              <span className="font-display font-extrabold text-lg text-foreground tracking-tight">
                BEGPHARMA
              </span>
              <span className="hidden sm:inline-block text-xs text-muted-foreground ml-2 border-l pl-2">
                Bénin · Guide BPD ABMed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {token && user ? (
              <Button asChild className="h-10">
                <Link to="/app">
                  Accéder à l'officine <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="h-9 text-sm">
                  <Link to="/auth">Connexion</Link>
                </Button>
                <Button asChild className="h-9 text-sm shadow-sm">
                  <Link to="/inscription">
                    <PlusCircle className="size-4 mr-1.5" /> Ouvrir une officine
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative px-4 sm:px-6 pt-12 pb-16 max-w-5xl mx-auto text-center">
        <Badge variant="outline" className="mb-4 py-1 px-3 border-primary/40 bg-primary/5 text-primary text-xs font-semibold gap-1.5 inline-flex items-center">
          <Award className="size-3.5 text-primary" /> Conforme à la Décision n°137/MS/DC/SGM/ABMed/DAF/DPLR
        </Badge>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight max-w-4xl mx-auto leading-tight">
          La solution numérique de référence pour les <span className="text-primary">officines de pharmacie</span> au Bénin
        </h1>

        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Digitalisez vos opérations quotidiennes, tracez vos enregistrements sans altération et respectez à 100% les 267 articles du Guide des Bonnes Pratiques de Dispensation.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-12 px-7 text-base shadow-md">
            <Link to="/inscription">
              Démarrer gratuitement <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
            <Link to="/auth">
              <Lock className="size-4 mr-2" /> Espace de connexion
            </Link>
          </Button>
        </div>

        {/* STATS RAPIDES */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <Card className="bg-card/70 border-muted">
            <CardContent className="p-4">
              <p className="font-display text-2xl sm:text-3xl font-extrabold text-primary">59</p>
              <p className="text-xs text-muted-foreground mt-0.5">Modèles BPD types préchargés</p>
            </CardContent>
          </Card>
          <Card className="bg-card/70 border-muted">
            <CardContent className="p-4">
              <p className="font-display text-2xl sm:text-3xl font-extrabold text-emerald-600">100%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Audit trail inaltérable PostgreSQL</p>
            </CardContent>
          </Card>
          <Card className="bg-card/70 border-muted">
            <CardContent className="p-4">
              <p className="font-display text-2xl sm:text-3xl font-extrabold text-blue-600">art. 1.11</p>
              <p className="text-xs text-muted-foreground mt-0.5">Règle de présence du pharmacien</p>
            </CardContent>
          </Card>
          <Card className="bg-card/70 border-muted">
            <CardContent className="p-4">
              <p className="font-display text-2xl sm:text-3xl font-extrabold text-amber-600">11</p>
              <p className="text-xs text-muted-foreground mt-0.5">Profils métiers étanches (RLS)</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4 PILIERS DU CAHIER DES CHARGES */}
      <section className="px-4 sm:px-6 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Une architecture conçue pour l'exigence de la santé publique
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Répond aux exigences réglementaires de l'Agence Béninoise du Médicament (ABMed)
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Clock className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Présence & Pointage (BPD-C09)</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Contrôle strict de l'obligation de présence d'un pharmacien inscrit à l'Ordre pour autoriser l'ouverture et la dispensation.
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-3">
                <FileText className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">GED & 59 Modèles types</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Cycle documentaire complet avec codification automatique et validation réservée exclusivement au Pharmacien Titulaire.
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 mb-3">
                <Users className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">RH, Compétences & Ordre</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Gestion des dossiers individuels, vérification de la validité de l'inscription à la Section B de l'Ordre, badge et visites médicales.
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 mb-3">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">CAPA & Analyse des causes 5M</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Déclaration des non-conformités, traitement immédiat et suivi des actions d'amélioration continue avec vérification d'efficacité.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t py-6 bg-card text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <p>© 2026 BEGPHARMA. Système d'Information Officinal conforme au Guide BPD de l'ABMed.</p>
          <div className="flex gap-4">
            <Link to="/auth" className="hover:underline">Connexion directe</Link>
            <Link to="/inscription" className="hover:underline">Nouvelle officine</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
