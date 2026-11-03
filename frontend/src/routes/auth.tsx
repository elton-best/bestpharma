import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeSlash } from "reicon-react";
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
      { title: "Connexion — BESTPHARMA" },
      {
        name: "description",
        content:
          "Connectez-vous directement à BESTPHARMA, la gestion d'officine conforme au Guide BPD de l'ABMed.",
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
  },
  {
    role: "Promoteur / Fondateur",
    email: "promoteur@begpharma.bj",
    nom: "M. Aimé TOSSOU",
    badge: "Multi-officines",
  },
  {
    role: "Dispensateur (Comptoir)",
    email: "dispensateur@begpharma.bj",
    nom: "Gervais KPADONOU",
    badge: "Vente & Conseil",
  },
  {
    role: "Caissière",
    email: "caissier@begpharma.bj",
    nom: "Saliou TOURE",
    badge: "Encaissement",
  },
  {
    role: "Magasinier",
    email: "magasinier@begpharma.bj",
    nom: "Bénédicte HOUNSOU",
    badge: "Stock & FEFO",
  },
  {
    role: "Inspecteur ABMed",
    email: "inspecteur@abmed.bj",
    nom: "Dr Marc KPOSSOU",
    badge: "Audit BPD",
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
  const [afficherRolesDemo, setAfficherRolesDemo] = useState(false);

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
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
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
    <div className="h-screen w-full bg-[#D4E8B8] flex items-center justify-center overflow-hidden font-sans selection:bg-[#92FF5F] selection:text-[#0F3B27]">
      <div className="w-full max-w-md px-6">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="size-8 rounded-lg bg-[#92FF5F] flex items-center justify-center text-[#0F3B27] font-black text-lg">
            +
          </div>
          <span className="font-display font-extrabold text-2xl text-[#0F3B27] tracking-tight">
            bestpharma
          </span>
        </div>

        {/* Titre */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F3B27] tracking-tight font-display text-center mb-8 leading-tight">
          Connexion
        </h1>

        {verrouille ? (
          <Alert className="mb-5 bg-amber-50 border-amber-200 text-amber-800 rounded-2xl text-xs">
            <AlertDescription>{fr.auth.verrouille}</AlertDescription>
          </Alert>
        ) : null}

        {/* Formulaire */}
        <form onSubmit={soumettre} className="space-y-4">
          {/* Input Email */}
          <div>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse email"
              className="w-full rounded-2xl border border-[#0F3B27]/20 bg-white/80 px-4 py-3.5 text-sm text-[#0F3B27] placeholder:text-[#0F3B27]/40 outline-none transition-all focus:border-[#0F3B27] focus:bg-white focus:ring-4 focus:ring-[#92FF5F]/30 font-medium"
            />
          </div>

          {/* Input Password */}
          <div className="relative">
            <input
              required
              type={afficherMdp ? "text" : "password"}
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Mot de passe"
              className="w-full rounded-2xl border border-[#0F3B27]/20 bg-white/80 px-4 py-3.5 pr-12 text-sm text-[#0F3B27] placeholder:text-[#0F3B27]/40 outline-none transition-all focus:border-[#0F3B27] focus:bg-white focus:ring-4 focus:ring-[#92FF5F]/30 font-medium"
            />
            <button
              type="button"
              onClick={() => setAfficherMdp(!afficherMdp)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0F3B27]/40 hover:text-[#0F3B27] transition-colors"
            >
              {afficherMdp ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {message ? (
            <div className="p-3 text-xs rounded-2xl bg-red-100 text-red-700 border border-red-200 font-semibold">
              {message}
            </div>
          ) : null}

          {/* Bouton Connexion */}
          <button
            type="submit"
            disabled={enCours}
            className="w-full rounded-2xl bg-[#0F3B27] hover:bg-[#1a5a3d] text-white font-extrabold py-3.5 text-base shadow-lg shadow-[#0F3B27]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {enCours ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        {/* Accès démo */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setAfficherRolesDemo(!afficherRolesDemo)}
            className="text-xs font-bold text-[#0F3B27]/70 hover:text-[#0F3B27] transition-colors cursor-pointer"
          >
            {afficherRolesDemo ? "Masquer les comptes démo ▲" : "Accès rapide aux comptes démo ▼"}
          </button>
        </div>

        {/* Panneau déroulant des 6 rôles de démo */}
        {afficherRolesDemo && (
          <div className="mt-3 p-3 rounded-2xl bg-white/60 backdrop-blur-sm border border-[#0F3B27]/10 space-y-1.5 animate-in fade-in">
            <p className="text-[11px] font-bold text-[#0F3B27] mb-1.5">
              Mot de passe : <span className="font-mono bg-[#0F3B27]/10 px-1.5 py-0.5 rounded">Begpharma2026!</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {COMPTES_TEST.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => connexionRapide(c.email)}
                  className="text-left p-2 rounded-xl border border-[#0F3B27]/10 bg-white hover:border-[#0F3B27] hover:bg-[#92FF5F]/10 text-[11px] transition-colors cursor-pointer"
                >
                  <span className="font-bold text-[#0F3B27] block truncate">{c.role}</span>
                  <span className="text-[#0F3B27]/50 block truncate text-[10px]">{c.nom}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lien inscription */}
        <div className="mt-6 text-center text-xs text-[#0F3B27]/60 font-medium">
          Pas de compte ?{" "}
          <Link to="/inscription" className="text-[#0F3B27] font-extrabold hover:underline">
            Créer un compte
          </Link>
        </div>

        {/* Texte légal */}
        <p className="mt-4 text-[10px] text-[#0F3B27]/40 text-center leading-relaxed">
          En vous connectant, vous acceptez les{" "}
          <Link to="/" className="font-bold hover:underline">
            Conditions d'utilisation
          </Link>{" "}
          et la{" "}
          <Link to="/" className="font-bold hover:underline">
            Politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
