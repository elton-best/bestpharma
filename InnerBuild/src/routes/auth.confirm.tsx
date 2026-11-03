import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { confirmAccountServerFn } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth/confirm")({
  ssr: false,
  component: ConfirmEmailPage,
});

function ConfirmEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/confirm" }) as {
    token?: string;
    token_hash?: string;
    code?: string;
    type?: string;
    email?: string;
  };
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [targetEmail, setTargetEmail] = useState(search?.email || "");

  useEffect(() => {
    let isDone = false;

    async function executeVerification() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code") || search?.code || "";
        const tokenHash = url.searchParams.get("token_hash") || search?.token_hash || "";
        const token = url.searchParams.get("token") || search?.token || "";
        const emailParam = (url.searchParams.get("email") || search?.email || "").trim().toLowerCase();

        const effectiveToken = (token || tokenHash || code).trim();

        // Sans token/code : rien à confirmer
        if (!effectiveToken) {
          if (!isDone) {
            setStatus("error");
            setErrorMessage("Lien de confirmation manquant. Veuillez utiliser le lien reçu par email.");
          }
          return;
        }

        if (emailParam) setTargetEmail(emailParam);

        // Confirmation D1 pure via serverFn
        const res = emailParam
          ? await confirmAccountServerFn({ data: { token: effectiveToken, email: emailParam } })
          : await confirmAccountServerFn({ data: { token: effectiveToken } });

        if (isDone) return;

        if (res?.success) {
          const confirmedEmail = (res as { email?: string }).email || emailParam || "";
          if (confirmedEmail) setTargetEmail(confirmedEmail);
          setStatus("success");
          setTimeout(() => {
            if (isDone) return;
            navigate({
              to: "/auth",
              search: { verified: "true" } as any,
              replace: true,
            });
          }, 1200);
        } else {
          setStatus("error");
          setErrorMessage(res?.error || "Le lien de confirmation est invalide ou a expiré.");
        }
      } catch (err: any) {
        if (!isDone) {
          setStatus("error");
          setErrorMessage(err?.message || "Une erreur est survenue lors de la confirmation.");
        }
      }
    }

    executeVerification();

    return () => {
      isDone = true;
    };
  }, [search, navigate]);

  return (
    <div className="relative min-h-screen bg-canvas text-ink flex flex-col justify-between overflow-hidden">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-accent/15 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute -bottom-40 right-10 w-[500px] h-[350px] bg-emerald-500/10 blur-[100px] rounded-full" />

      {/* Header */}
      <header className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition">
          <Logo size={28} />
        </Link>
      </header>

      {/* Main card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl border border-line bg-card/95 p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
          {status === "verifying" && (
            <div className="space-y-4 py-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/15 text-accent shadow-glow border border-accent/20">
                <RefreshCw className="h-9 w-9 animate-spin text-accent" />
              </div>
              <h2 className="text-xl font-bold text-ink">Activation de votre compte...</h2>
              <p className="text-xs text-muted-foreground">
                Validation de votre adresse et préparation de votre tableau de bord.
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-500 shadow-glow border border-emerald-500/30">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-in zoom-in duration-300" />
              </div>
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <ShieldCheck size={12} /> Compte Validé
                </span>
                <h1 className="text-2xl font-black text-ink tracking-tight font-['Sora',sans-serif]">
                  Validation réussie !
                </h1>
                <p className="text-xs text-muted-foreground">
                  Votre adresse e-mail {targetEmail ? `(${targetEmail})` : ""} a été vérifiée avec succès.
                  Redirection vers la page de connexion...
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    navigate({ to: "/auth", search: { verified: "true" } as any, replace: true });
                  }}
                  className="btn-base btn-primary w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-glow"
                >
                  <span>Se connecter</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/15 text-destructive border border-destructive/30">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-black text-ink tracking-tight font-['Sora',sans-serif]">
                  Échec de la validation
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {errorMessage || "Le lien ou code de validation est invalide ou a expiré."}
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => navigate({ to: "/auth/verify-email", replace: true })}
                  className="btn-base btn-primary w-full py-2.5 text-xs font-bold"
                >
                  Demander un nouveau lien / code
                </button>
                <Link to="/auth" className="btn-base btn-ghost w-full py-2 text-xs">
                  Retour à la page de connexion
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-muted-foreground">
        AI Factory &middot; Spec &rarr; Deliver
      </footer>
    </div>
  );
}
