import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  ArrowLeft,
  Shield,
  Sparkles,
  UserCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Check,
  Building2,
  Award,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { fr } from "@/lib/i18n/fr";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

const ATOUTS_OFFICINE = [
  {
    titre: "Présence effective du Pharmacien (Art. 1.11)",
    desc: "Pointage obligatoire pour autoriser l'ouverture du comptoir et la dispensation.",
  },
  {
    titre: "59 Modèles types BPD & Audit Trail SHA-256",
    desc: "Traçabilité inaltérable avec horodatage certifié sans suppression possible.",
  },
  {
    titre: "Déstockage FEFO & Registre Stupéfiants",
    desc: "Ordonnancier numérique coté et paraphé avec balance entrées/sorties en direct.",
  },
  {
    titre: "Caisse e-MECeF DGI Bénin & SYSCOHADA",
    desc: "Factures normalisées avec QR code fiscal et export en journal des ventes.",
  },
];

function PageConnexion() {
  const navigate = useNavigate();
  const { verrouille } = Route.useSearch();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [afficherMdp, setAfficherMdp] = useState(false);
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
    <div className="min-h-screen w-full bg-[#f8faf8] flex items-start sm:items-center justify-center p-0 sm:p-6 lg:p-10 font-sans selection:bg-[#18AA38]/20 selection:text-[#023010]">
      {/* Container split-card style InnerBuild */}
      <div className="w-full max-w-5xl bg-white min-h-screen sm:min-h-[640px] sm:rounded-[28px] sm:shadow-2xl sm:shadow-[#023010]/5 sm:border sm:border-[#CFE3D5] overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative">
        {/* ============================================================== */}
        {/* COLONNE GAUCHE (7/12) : FORMULAIRE DE CONNEXION                */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 px-5 py-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Header supérieur avec Logo et retour */}
            <div className="flex items-center justify-between">
              <Link to="/" className="inline-flex items-center gap-2 group focus-visible:outline-none">
                <div className="size-9 rounded-xl bg-[#023010] flex items-center justify-center text-white font-display font-black text-lg shadow-sm transition-transform group-hover:scale-105">
                  +
                </div>
                <span className="font-display font-extrabold text-base text-[#023010] tracking-tight">
                  BEGPHARMA
                </span>
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#18AA38]/30 bg-[#EFF7F1] px-3 py-1 text-[11px] font-bold text-[#023010]">
                <Shield className="size-3 text-[#18AA38]" /> Accès direct actif
              </span>
            </div>

            {/* Titre et sous-titre */}
            <div className="mt-6 sm:mt-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2420] tracking-tight font-display leading-tight">
                Connexion à l'officine
              </h1>
              <p className="mt-1 text-xs text-[#5C6660] font-medium">
                Accédez directement à vos ordonnanciers, stocks FEFO et caisses certifiées e-MECeF.
              </p>
            </div>

            {/* Sélecteur d'onglets Se connecter / S'inscrire */}
            <div className="my-5 flex rounded-xl border border-[#CFE3D5] bg-[#f8faf8] p-1">
              <button
                type="button"
                className="flex-1 rounded-lg py-2 text-xs font-bold transition-all bg-white text-[#023010] shadow-xs"
              >
                Se connecter
              </button>
              <Link
                to="/inscription"
                className="flex-1 rounded-lg py-2 text-xs font-bold transition-all text-center text-[#5C6660] hover:text-[#023010]"
              >
                Créer une officine
              </Link>
            </div>

            {verrouille ? (
              <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
                <AlertDescription>{fr.auth.verrouille}</AlertDescription>
              </Alert>
            ) : null}

            {/* Formulaire */}
            <form onSubmit={soumettre} className="space-y-4">
              {/* Champ Email */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2420] mb-1.5">
                  Adresse email professionnelle
                </label>
                <div className="relative flex min-h-11 items-center rounded-xl border border-[#CFE3D5] bg-[#f8faf8] px-3.5 py-2.5 transition-all focus-within:border-[#18AA38] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#18AA38]/15">
                  <Mail className="size-4 text-[#5C6660] shrink-0 mr-2.5" />
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pharmacien@begpharma.bj"
                    className="w-full bg-transparent text-sm text-[#1F2420] placeholder:text-[#5C6660]/70 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#1F2420]">
                    Mot de passe
                  </label>
                  <span className="text-[11px] text-[#5C6660]">Démo : Begpharma2026!</span>
                </div>
                <div className="relative flex min-h-11 items-center rounded-xl border border-[#CFE3D5] bg-[#f8faf8] px-3.5 py-2.5 transition-all focus-within:border-[#18AA38] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#18AA38]/15">
                  <Lock className="size-4 text-[#5C6660] shrink-0 mr-2.5" />
                  <input
                    required
                    type={afficherMdp ? "text" : "password"}
                    autoComplete="current-password"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-transparent text-sm text-[#1F2420] placeholder:text-[#5C6660]/70 outline-none pr-8 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setAfficherMdp(!afficherMdp)}
                    className="absolute right-3 text-[#5C6660] hover:text-[#1F2420] transition-colors p-1"
                  >
                    {afficherMdp ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {message ? (
                <div className="p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-semibold">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={enCours}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#023010] hover:bg-[#18AA38] py-3 text-sm font-bold text-white shadow-md shadow-[#023010]/15 transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                {enCours ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Se connecter</span>
              </button>
            </form>

            {/* Accès rapide 1-clic démo par rôle */}
            <div className="mt-6 pt-5 border-t border-[#CFE3D5]">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles className="size-3.5 text-[#18AA38]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6660]">
                  Accès rapide démo par rôle (1 clic)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMPTES_TEST.map((c) => (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => connexionRapide(c.email)}
                    disabled={enCours}
                    className="flex flex-col text-left p-2 rounded-xl border border-[#CFE3D5] bg-[#f8faf8] hover:bg-white hover:border-[#18AA38] hover:shadow-xs transition-all text-xs group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="font-bold text-[#1F2420] group-hover:text-[#023010] transition-colors flex items-center gap-1">
                        <UserCheck className="size-3 text-[#5C6660] group-hover:text-[#18AA38]" />
                        {c.role}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${c.color}`}>
                        {c.badge}
                      </span>
                    </div>
                    <span className="text-[#5C6660] text-[11px] truncate mt-0.5">{c.nom}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lien retour accueil */}
            <div className="mt-5 text-center">
              <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C6660] hover:text-[#023010] transition-colors">
                <ArrowLeft className="size-3" /> Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* COLONNE DROITE (5/12) : SHOWCASE VERT PROFOND INNERBUILD       */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#023010] via-[#03260e] to-[#011707] p-8 sm:p-10 lg:p-12 hidden lg:flex flex-col justify-between text-white relative overflow-hidden border-l border-[#CFE3D5]/20">
          {/* Lueur d'ambiance */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#18AA38]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#18AA38]/15 blur-3xl pointer-events-none" />

          {/* Badge haut */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#18AA38]/40 bg-[#18AA38]/15 px-3 py-1 text-[11px] font-mono font-bold text-[#18AA38]">
              <Sparkles className="size-3" /> BEGPHARMA · Plateforme Certifiée BPD
            </span>
          </div>

          {/* Corps central */}
          <div className="relative z-10 my-auto py-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight font-display text-white leading-snug">
                L'Excellence Officinale au Bénin
              </h2>
              <p className="mt-2 text-xs text-white/70 leading-relaxed font-sans">
                Conforme au Guide des Bonnes Pratiques de Dispensation publié par l'Agence Béninoise du Médicament (ABMed).
              </p>
            </div>

            {/* Points clés avec coches */}
            <div className="space-y-3">
              {ATOUTS_OFFICINE.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[#18AA38]/25 text-[#18AA38] mt-0.5">
                    <Check className="size-3.5 stroke-[2.5]" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white">{item.titre}</p>
                    <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Barre de stats minimaliste */}
            <div className="pt-2 grid grid-cols-3 gap-2 border-t border-white/10">
              <div className="text-center">
                <p className="text-sm font-bold text-[#18AA38]">267</p>
                <p className="text-[10px] text-white/60">Articles BPD</p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-sm font-bold text-white">4 Piliers</p>
                <p className="text-[10px] text-white/60">100% Intégrés</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-emerald-400">0 Attente</p>
                <p className="text-[10px] text-white/60">Accès direct</p>
              </div>
            </div>
          </div>

          {/* Bas de colonne */}
          <div className="relative z-10 text-[11px] text-white/50 border-t border-white/10 pt-4">
            Direction des Pharmacies, du Médicament et des Laboratoires · Cotonou
          </div>
        </div>
      </div>
    </div>
  );
}
