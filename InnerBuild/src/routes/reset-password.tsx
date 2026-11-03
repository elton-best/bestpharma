import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";

import { resetPasswordWithTokenServerFn } from "@/lib/d1-auth.functions";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — AI Factory" },
      { name: "description", content: "Définis un nouveau mot de passe sécurisé pour ton compte AI Factory." },
      { property: "og:title", content: "Nouveau mot de passe — AI Factory" },
      { property: "og:description", content: "Définis un nouveau mot de passe sécurisé pour ton compte AI Factory." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenValue, setTokenValue] = useState<string | null>(null);
  const [tokenEmail, setTokenEmail] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");

    if (token) {
      setTokenValue(token);
      if (email) setTokenEmail(decodeURIComponent(email));
    } else {
      setTokenError("Lien de réinitialisation manquant. Veuillez refaire une demande depuis la page de connexion.");
    }
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      toast.error("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }
    if (pw !== confirmPw) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (!tokenValue) {
      setTokenError("Lien invalide. Veuillez refaire une demande de réinitialisation.");
      toast.error("Session invalide. Veuillez refaire une demande de réinitialisation.");
      return;
    }

    setBusy(true);
    try {
      // Flow token-only D1 (auth_tokens type reset_password)
      const result = await resetPasswordWithTokenServerFn({
        data: { token: tokenValue, newPassword: pw },
      });
      if (!result.success) {
        setTokenError(result.error || "Impossible de réinitialiser le mot de passe.");
        toast.error(result.error || "Erreur de réinitialisation.");
        setBusy(false);
        return;
      }
      setSuccess(true);
      toast.success("Mot de passe réinitialisé avec succès !");
    } catch {
      toast.error("Une erreur réseau est survenue. Veuillez réessayer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 selection:bg-accent/20">
      <div className="w-full max-w-md rounded-[24px] border border-line bg-card p-6 sm:p-8 shadow-xl shadow-ink/5 space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <Link to="/" className="inline-flex">
            <Logo size={32} />
          </Link>
          <span className="font-mono text-[11px] font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full">
            AI Factory
          </span>
        </div>

        {tokenError && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-xs">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-ink">{tokenError}</p>
              <p className="mt-1 text-muted-foreground">
                Vous pouvez{" "}
                <Link to="/auth" className="text-accent font-bold hover:underline">
                  refaire une demande
                </Link>{" "}
                depuis la page de connexion.
              </p>
            </div>
          </div>
        )}

        {success ? (
          <div className="space-y-5 text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-ink">
                Mot de passe mis à jour !
              </h1>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Votre nouveau mot de passe a été enregistré avec succès. Vous pouvez désormais vous connecter à votre espace AI Factory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/auth" })}
              className="btn-base btn-glow w-full text-xs font-bold py-3 flex items-center justify-center gap-2"
            >
              <span>Se connecter</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-black text-ink tracking-tight">
                Nouveau mot de passe
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Choisissez un mot de passe robuste d'au moins 8 caractères pour sécuriser votre compte.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Nouveau mot de passe
                </label>
                <div className="relative flex items-center rounded-xl border border-line bg-paper px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:bg-card focus-within:ring-2 focus-within:ring-accent/15">
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0 mr-2.5" />
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder="8 caractères minimum"
                    className="w-full bg-transparent text-xs text-ink placeholder:text-muted-foreground outline-none pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 text-muted-foreground hover:text-ink transition p-1"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Confirmer le mot de passe
                </label>
                <div className="relative flex items-center rounded-xl border border-line bg-paper px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:bg-card focus-within:ring-2 focus-within:ring-accent/15">
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0 mr-2.5" />
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    className="w-full bg-transparent text-xs text-ink placeholder:text-muted-foreground outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-base btn-glow w-full py-3 text-xs font-bold flex items-center justify-center gap-2 mt-4 shadow-md shadow-accent/20"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{busy ? "Enregistrement en cours…" : "Valider mon nouveau mot de passe"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
