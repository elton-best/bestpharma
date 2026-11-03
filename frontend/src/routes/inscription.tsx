import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeSlash } from "reicon-react";
import { api } from "@/lib/api-client";
import { fr } from "@/lib/i18n/fr";

export const Route = createFileRoute("/inscription")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Créer un compte — BESTPHARMA" },
      {
        name: "description",
        content:
          "Inscrivez votre officine pharmaceutique sur BESTPHARMA. Mise en conformité immédiate avec le Guide BPD de l'ABMed.",
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
  const [afficherMdp, setAfficherMdp] = useState(false);

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
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
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

      // Connexion directe sans barrière
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
    <div className="h-screen w-full bg-[#D4E8B8] flex items-center justify-center overflow-hidden font-sans selection:bg-[#92FF5F] selection:text-[#0F3B27]">
      <div className="w-full max-w-md px-6">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="size-8 rounded-lg bg-[#92FF5F] flex items-center justify-center text-[#0F3B27] font-black text-lg">
            +
          </div>
          <span className="font-display font-extrabold text-2xl text-[#0F3B27] tracking-tight">
            bestpharma
          </span>
        </div>

        {/* Titre */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F3B27] tracking-tight font-display text-center mb-6 leading-tight">
          Créer un compte
        </h1>

        {/* Formulaire */}
        <form onSubmit={soumettre} className="space-y-3">
          {/* Input Nom complet */}
          <div>
            <input
              required
              type="text"
              value={nomComplet}
              onChange={(e) => setNomComplet(e.target.value)}
              placeholder="Nom complet (Dr. ou Pharmacien)"
              className="w-full rounded-2xl border border-[#0F3B27]/20 bg-white/80 px-4 py-3 text-sm text-[#0F3B27] placeholder:text-[#0F3B27]/40 outline-none transition-all focus:border-[#0F3B27] focus:bg-white focus:ring-4 focus:ring-[#92FF5F]/30 font-medium"
            />
          </div>

          {/* Input Nom Officine */}
          <div>
            <input
              required
              type="text"
              value={nomOfficine}
              onChange={(e) => setNomOfficine(e.target.value)}
              placeholder="Nom de l'officine (ex: Pharmacie de l'Étoile)"
              className="w-full rounded-2xl border border-[#0F3B27]/20 bg-white/80 px-4 py-3 text-sm text-[#0F3B27] placeholder:text-[#0F3B27]/40 outline-none transition-all focus:border-[#0F3B27] focus:bg-white focus:ring-4 focus:ring-[#92FF5F]/30 font-medium"
            />
          </div>

          {/* Input Email */}
          <div>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse email"
              className="w-full rounded-2xl border border-[#0F3B27]/20 bg-white/80 px-4 py-3 text-sm text-[#0F3B27] placeholder:text-[#0F3B27]/40 outline-none transition-all focus:border-[#0F3B27] focus:bg-white focus:ring-4 focus:ring-[#92FF5F]/30 font-medium"
            />
          </div>

          {/* Input Password */}
          <div className="relative">
            <input
              required
              type={afficherMdp ? "text" : "password"}
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Mot de passe (min. 8 caractères)"
              className="w-full rounded-2xl border border-[#0F3B27]/20 bg-white/80 px-4 py-3 pr-12 text-sm text-[#0F3B27] placeholder:text-[#0F3B27]/40 outline-none transition-all focus:border-[#0F3B27] focus:bg-white focus:ring-4 focus:ring-[#92FF5F]/30 font-medium"
            />
            <button
              type="button"
              onClick={() => setAfficherMdp(!afficherMdp)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0F3B27]/40 hover:text-[#0F3B27] transition-colors"
            >
              {afficherMdp ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {erreur ? (
            <div className="p-3 text-xs rounded-2xl bg-red-100 text-red-700 border border-red-200 font-semibold">
              {erreur}
            </div>
          ) : null}

          {/* Bouton Créer */}
          <button
            type="submit"
            disabled={enCours}
            className="w-full rounded-2xl bg-[#0F3B27] hover:bg-[#1a5a3d] text-white font-extrabold py-3.5 text-base shadow-lg shadow-[#0F3B27]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-1"
          >
            {enCours ? "Création en cours..." : "Créer mon compte"}
          </button>
        </form>

        {/* Lien connexion */}
        <div className="mt-6 text-center text-xs text-[#0F3B27]/60 font-medium">
          Déjà un compte ?{" "}
          <Link to="/auth" className="text-[#0F3B27] font-extrabold hover:underline">
            Se connecter
          </Link>
        </div>

        {/* Texte légal */}
        <p className="mt-4 text-[10px] text-[#0F3B27]/40 text-center leading-relaxed">
          En créant un compte, vous acceptez les{" "}
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
