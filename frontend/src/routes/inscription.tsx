import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  ArrowLeft,
  Building2,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Phone,
  Sparkles,
  Check,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { fr } from "@/lib/i18n/fr";

export const Route = createFileRoute("/inscription")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Créer une officine — BEGPHARMA" },
      {
        name: "description",
        content:
          "Inscrivez votre officine pharmaceutique sur BEGPHARMA. Mise en conformité immédiate avec le Guide BPD de l'ABMed.",
      },
    ],
  }),
  component: PageInscription,
});

const ATOUTS_CREATION = [
  {
    titre: "Prise en main instantanée",
    desc: "Votre officine est créée et configurée avec les 59 modèles BPD en quelques secondes.",
  },
  {
    titre: "Aucune barrière ni double validation",
    desc: "Pas de blocage par SMS ou validation administrative préalable : démarrez tout de suite.",
  },
  {
    titre: "Audit trail et sécurité garantis",
    desc: "Toutes vos futures écritures d'ordonnancier et de caisse seront horodatées et infalsifiables.",
  },
  {
    titre: "Multi-postes & Rôles illimités",
    desc: "Invitez vos préparateurs, caissières et magasiniers avec des droits cloisonnés RLS.",
  },
];

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

      // Connexion directe sans double validation
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
    <div className="min-h-screen w-full bg-[#f8faf8] flex items-start sm:items-center justify-center p-0 sm:p-6 lg:p-10 font-sans selection:bg-[#18AA38]/20 selection:text-[#023010]">
      {/* Container split-card style InnerBuild */}
      <div className="w-full max-w-5xl bg-white min-h-screen sm:min-h-[680px] sm:rounded-[28px] sm:shadow-2xl sm:shadow-[#023010]/5 sm:border sm:border-[#CFE3D5] overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative">
        {/* ============================================================== */}
        {/* COLONNE GAUCHE (7/12) : FORMULAIRE D'OUVERTURE D'OFFICINE      */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 px-5 py-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Header supérieur */}
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
                <ShieldCheck className="size-3 text-[#18AA38]" /> Activation immédiate
              </span>
            </div>

            {/* Titre et sous-titre */}
            <div className="mt-6 sm:mt-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2420] tracking-tight font-display leading-tight">
                Ouvrir une officine
              </h1>
              <p className="mt-1 text-xs text-[#5C6660] font-medium">
                Démarrez sans délai avec les 59 modèles BPD et le registre officiel préconfigurés.
              </p>
            </div>

            {/* Sélecteur d'onglets */}
            <div className="my-5 flex rounded-xl border border-[#CFE3D5] bg-[#f8faf8] p-1">
              <Link
                to="/auth"
                className="flex-1 rounded-lg py-2 text-xs font-bold transition-all text-center text-[#5C6660] hover:text-[#023010]"
              >
                Se connecter
              </Link>
              <button
                type="button"
                className="flex-1 rounded-lg py-2 text-xs font-bold transition-all bg-white text-[#023010] shadow-xs"
              >
                Créer une officine
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={soumettre} className="space-y-3.5">
              {/* Nom complet */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2420] mb-1">
                  Nom et prénom du titulaire
                </label>
                <div className="relative flex min-h-11 items-center rounded-xl border border-[#CFE3D5] bg-[#f8faf8] px-3.5 py-2.5 transition-all focus-within:border-[#18AA38] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#18AA38]/15">
                  <User className="size-4 text-[#5C6660] shrink-0 mr-2.5" />
                  <input
                    required
                    type="text"
                    value={nomComplet}
                    onChange={(e) => setNomComplet(e.target.value)}
                    placeholder="Dr Félicien AGBO"
                    className="w-full bg-transparent text-sm text-[#1F2420] placeholder:text-[#5C6660]/70 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Nom de l'officine */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2420] mb-1">
                  Nom de l'officine
                </label>
                <div className="relative flex min-h-11 items-center rounded-xl border border-[#CFE3D5] bg-[#f8faf8] px-3.5 py-2.5 transition-all focus-within:border-[#18AA38] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#18AA38]/15">
                  <Building2 className="size-4 text-[#5C6660] shrink-0 mr-2.5" />
                  <input
                    required
                    type="text"
                    value={nomOfficine}
                    onChange={(e) => setNomOfficine(e.target.value)}
                    placeholder="Pharmacie du Port - Cotonou"
                    className="w-full bg-transparent text-sm text-[#1F2420] placeholder:text-[#5C6660]/70 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Email & Téléphone en grille */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2420] mb-1">
                    Email professionnel
                  </label>
                  <div className="relative flex min-h-11 items-center rounded-xl border border-[#CFE3D5] bg-[#f8faf8] px-3.5 py-2.5 transition-all focus-within:border-[#18AA38] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#18AA38]/15">
                    <Mail className="size-4 text-[#5C6660] shrink-0 mr-2" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="titulaire@officine.bj"
                      className="w-full bg-transparent text-xs sm:text-sm text-[#1F2420] placeholder:text-[#5C6660]/70 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2420] mb-1">
                    Téléphone (Bénin)
                  </label>
                  <div className="relative flex min-h-11 items-center rounded-xl border border-[#CFE3D5] bg-[#f8faf8] px-3.5 py-2.5 transition-all focus-within:border-[#18AA38] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#18AA38]/15">
                    <Phone className="size-4 text-[#5C6660] shrink-0 mr-2" />
                    <input
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+229 97 00 00 00"
                      className="w-full bg-transparent text-xs sm:text-sm text-[#1F2420] placeholder:text-[#5C6660]/70 outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2420] mb-1">
                  Mot de passe (minimum 8 caractères)
                </label>
                <div className="relative flex min-h-11 items-center rounded-xl border border-[#CFE3D5] bg-[#f8faf8] px-3.5 py-2.5 transition-all focus-within:border-[#18AA38] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#18AA38]/15">
                  <Lock className="size-4 text-[#5C6660] shrink-0 mr-2.5" />
                  <input
                    required
                    minLength={8}
                    type="password"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-transparent text-sm text-[#1F2420] placeholder:text-[#5C6660]/70 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2420] mb-1">
                  Votre fonction dans l'officine
                </label>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-[#CFE3D5] bg-[#f8faf8] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#1F2420] outline-none focus:border-[#18AA38] focus:bg-white"
                >
                  <option value="pharmacien_titulaire">Pharmacien Titulaire (Responsable légal BPD)</option>
                  <option value="promoteur">Promoteur / Propriétaire</option>
                  <option value="pharmacien_assistant">Pharmacien Assistant</option>
                  <option value="dispensateur">Dispensateur / Préparateur en pharmacie</option>
                </select>
              </div>

              {erreur ? (
                <div className="p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-semibold">
                  {erreur}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={enCours}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#023010] hover:bg-[#18AA38] py-3 text-sm font-bold text-white shadow-md shadow-[#023010]/15 transition-all hover:-translate-y-0.5 disabled:opacity-50 mt-2"
              >
                {enCours ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Ouvrir l'officine et se connecter</span>
              </button>
            </form>

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
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#18AA38]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#18AA38]/15 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#18AA38]/40 bg-[#18AA38]/15 px-3 py-1 text-[11px] font-mono font-bold text-[#18AA38]">
              <Sparkles className="size-3" /> BEGPHARMA · Déploiement Immédiat
            </span>
          </div>

          <div className="relative z-10 my-auto py-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight font-display text-white leading-snug">
                Votre officine prête pour l'audit ABMed
              </h2>
              <p className="mt-2 text-xs text-white/70 leading-relaxed font-sans">
                Chaque officine créée sur BEGPHARMA bénéficie immédiatement des paramétrages réglementaires officiels.
              </p>
            </div>

            <div className="space-y-3">
              {ATOUTS_CREATION.map((item, idx) => (
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

            <div className="pt-2 grid grid-cols-3 gap-2 border-t border-white/10">
              <div className="text-center">
                <p className="text-sm font-bold text-[#18AA38]">0 Frs</p>
                <p className="text-[10px] text-white/60">Activation</p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-sm font-bold text-white">59 Doc.</p>
                <p className="text-[10px] text-white/60">Modèles BPD</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-emerald-400">100%</p>
                <p className="text-[10px] text-white/60">Sécurisé</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-white/50 border-t border-white/10 pt-4">
            Direction des Pharmacies, du Médicament et des Laboratoires · Cotonou
          </div>
        </div>
      </div>
    </div>
  );
}
