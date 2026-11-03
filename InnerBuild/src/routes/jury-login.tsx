import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getD1SessionUser } from "@/lib/d1-session";
import { d1ListServerFn } from "@/lib/d1-data.functions";
import { appHead } from "@/components/app/AppShell";
import { JuryNavbar } from "@/components/JuryNavbar";
import { useLanguage } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";

export const Route = createFileRoute("/jury-login")({
  head: appHead(
    "Connexion Jury — THE InnerBuild",
    "Espace d'authentification réservé aux membres du jury officiel et experts évaluateurs."
  ),
  component: JuryLoginPage,
});

function normalizeJuryCode(val: string): string {
  return val.trim().toUpperCase();
}

function JuryLoginPage() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [code, setCode] = useState("");
  const [name, setName] = useState(() => {
    const s = getD1SessionUser();
    return s?.fullName || s?.full_name || "";
  });
  const [loading, setLoading] = useState(false);

  const normalized = normalizeJuryCode(code);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalized || normalized.length < 4) {
      toast.error("Veuillez saisir un code d'accès jury valide (ex: JURY-9K42).");
      return;
    }

    setLoading(true);

    try {
      const { verifyJuryAccessServerFn } = await import("@/lib/jury.functions");
      const session = getD1SessionUser();
      const verifyRes = await verifyJuryAccessServerFn({
        data: {
          code: normalized,
          email: session?.email || "",
        },
      });

      if (!verifyRes.success || !verifyRes.jury) {
        toast.error(verifyRes.error || "Code d'accès jury non reconnu ou inactif.");
        localStorage.removeItem("aifac-jury-code");
        localStorage.removeItem("aifac-jury-name");
        return;
      }

      const verifiedJury = verifyRes.jury;
      const finalName = verifiedJury.name || name.trim() || "Membre du Jury";

      // Enregistrer les identifiants officiels vérifiés
      localStorage.setItem("aifac-jury-code", verifiedJury.code);
      localStorage.setItem("aifac-jury-name", finalName);

      toast.success(`Authentification réussie. Bienvenue, ${finalName} !`);
      navigate({ to: "/jury" });
    } catch (err: any) {
      toast.error("Impossible de vérifier le code jury : " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between selection:bg-accent/20">
      {/* Full Top Navbar */}
      <div className="border-b border-line bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xs font-bold text-ink hover:text-accent flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === "fr" ? "Retour à l'accueil" : "Back to Home"}</span>
        </Link>
        <LanguageSelector />
      </div>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-widest text-accent">
              <KeyRound className="h-3.5 w-3.5" />
              {lang === "fr" ? "Collège d'évaluation officiel" : "Official Review Board"}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink font-display">
              {lang === "fr" ? "Connexion Jury" : "Juror Login"}
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {lang === "fr"
                ? "Saisissez l'identifiant confidentiel transmis par l'administrateur du hackathon."
                : "Enter the confidential access code provided by the hackathon organizers."}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-line bg-card p-6 sm:p-8 shadow-sm space-y-5"
          >
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {lang === "fr" ? "Code d'accès Jury" : "Juror Access Code"}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(normalizeJuryCode(e.target.value))}
                maxLength={16}
                required
                placeholder="Ex. JURY-9K42"
                className="w-full text-center font-mono text-xl sm:text-2xl font-black uppercase tracking-[0.2em] rounded-xl border border-line bg-paper px-4 py-3 text-ink focus:border-accent focus:outline-none"
              />
              <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
                {lang === "fr"
                  ? "Ce code individuel garantit l'anonymat et l'indépendance de vos délibérations."
                  : "This individual code guarantees confidentiality and integrity during deliberations."}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {lang === "fr" ? "Nom complet (facultatif si déjà enregistré)" : "Full Name (optional if pre-registered)"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Sarah Connor — Lead Architect"
                className="w-full text-xs rounded-xl border border-line bg-paper px-3.5 py-2.5 text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !normalized}
              className="btn-base btn-glow w-full text-xs font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {lang === "fr" ? "Vérification…" : "Verifying…"}
                </>
              ) : (
                <>
                  <span>{lang === "fr" ? "Accéder à la grille de notation (7D)" : "Open 7D Review Matrix"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="rounded-xl border border-line/60 bg-muted/20 p-4 text-center space-y-2 text-xs">
            <p className="text-muted-foreground text-[11px]">
              {lang === "fr" ? "Vous êtes participant ou candidat ?" : "Are you a participant or candidate?"}
            </p>
            <Link
              to="/challenges"
              className="text-accent hover:underline font-bold text-xs inline-flex items-center gap-1"
            >
              {lang === "fr" ? "Consulter les challenges et déposer un projet" : "Explore challenges and submit a project"} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line px-4 py-3 text-center text-[11px] text-muted-foreground">
        THE InnerBuild · {lang === "fr" ? "Plateforme d'évaluation d'ingénierie logicielle" : "Software Engineering Review Platform"}
      </footer>
    </div>
  );
}
