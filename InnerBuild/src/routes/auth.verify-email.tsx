import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Mail, CheckCircle2, RefreshCw, LogOut, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { getD1SessionUser, clearD1Session } from "@/lib/d1-session";
import { sendCustomAuthEmail, verifyAuthToken } from "@/lib/custom-email-auth";
import { confirmAccountServerFn } from "@/lib/auth.functions";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth/verify-email")({
  ssr: false,
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/verify-email" }) as {
    email?: string;
    token?: string;
    code?: string;
  };

  const initialCode = (search?.code || search?.token || "").trim();
  const [email, setEmail] = useState(search?.email?.trim().toLowerCase() || "");
  const [otp, setOtp] = useState(initialCode.slice(0, 6));
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const hasAutoSubmitted = useRef(false);

  // Pré-remplissage D1 (session locale) — pas de redirection auto (vérification requise)
  useEffect(() => {
    const sessionUser = getD1SessionUser();
    if (sessionUser?.email) {
      setEmail((prev) => prev || sessionUser.email.toLowerCase());
    }
  }, []);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-validation si code/token fourni via query param (clic lien email)
  useEffect(() => {
    if (initialCode && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      if (initialCode.length === 6) {
        executeOtpValidation(initialCode);
      } else {
        executeTokenConfirmation(initialCode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function executeTokenConfirmation(tokenToTest: string) {
    const cleanToken = tokenToTest.trim();
    if (!cleanToken) return;
    setVerifying(true);
    try {
      const targetEmail = email.trim().toLowerCase();
      const res = targetEmail
        ? await confirmAccountServerFn({ data: { token: cleanToken, email: targetEmail } })
        : await confirmAccountServerFn({ data: { token: cleanToken } });
      if (res?.success) {
        toast.success("Compte validé avec succès ! Bienvenue sur AI Factory.");
        navigate({ to: "/auth", search: { verified: "true" } as any, replace: true });
      } else {
        toast.error(res?.error || "Lien de validation invalide ou expiré.");
        setVerifying(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de validation. Veuillez réessayer.");
      setVerifying(false);
    }
  }

  async function executeOtpValidation(codeToTest: string) {
    const cleanCode = codeToTest.trim();
    if (cleanCode.length < 6) {
      toast.error("Veuillez saisir les 6 chiffres de votre code de confirmation.");
      return;
    }

    // Si token long (lien email), passer par la confirmation serveur D1
    if (cleanCode.length > 6) {
      await executeTokenConfirmation(cleanCode);
      return;
    }

    setVerifying(true);

    try {
      // Vérification locale D1 (localStorage) — 6 chiffres
      const check = await verifyAuthToken(cleanCode, "confirm_email");
      if (!check.valid) {
        toast.error(check.error || "Code de validation invalide ou expiré. Vérifiez votre boîte mail.");
        setVerifying(false);
        return;
      }

      toast.success("Compte validé avec succès ! Bienvenue sur AI Factory.");

      // Succès OTP → retour connexion vérifiée
      navigate({ to: "/auth", search: { verified: "true" } as any, replace: true });
    } catch (err: any) {
      toast.error(err.message || "Erreur de validation. Veuillez réessayer.");
      setVerifying(false);
    }
  }

  function handleOtpChange(val: string) {
    setOtp(val);
    if (val.length === 6 && !verifying) {
      executeOtpValidation(val);
    }
  }

  async function handleResendCode() {
    const sessionUser = getD1SessionUser();
    const targetEmail = email || sessionUser?.email || "";
    if (!targetEmail) {
      toast.error("Adresse email introuvable. Veuillez renseigner votre email.");
      return;
    }
    setResending(true);
    try {
      const displayName =
        sessionUser?.fullName || sessionUser?.full_name || targetEmail.split("@")[0] || targetEmail;
      const res = await sendCustomAuthEmail({
        email: targetEmail,
        type: "confirm_email",
        recipientName: displayName,
      });
      if (res.success) {
        toast.success(`E-mail de confirmation envoyé à ${targetEmail} !`);
        setResendCooldown(60);
      } else {
        toast.error("Impossible d'envoyer l'email. Veuillez réessayer.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur réseau lors de l'envoi.");
    } finally {
      setResending(false);
    }
  }

  function handleLogout() {
    clearD1Session();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen bg-canvas text-ink flex flex-col justify-between overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-accent/15 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute -bottom-40 right-10 w-[500px] h-[350px] bg-amber-500/10 blur-[100px] rounded-full" />

      {/* Header */}
      <header className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition">
          <Logo size={28} />
        </Link>
        <button
          onClick={handleLogout}
          className="btn-base btn-ghost text-xs text-muted-foreground hover:text-ink flex items-center gap-1.5"
        >
          <LogOut size={14} />
          <span>Changer de compte</span>
        </button>
      </header>

      {/* Main card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg rounded-3xl border border-line bg-card/95 p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
          {/* Glowing Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/15 text-accent shadow-glow border border-accent/20">
            <KeyRound className="h-9 w-9 text-accent animate-pulse" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
              <ShieldCheck size={12} /> Code de validation
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight font-['Sora',sans-serif]">
              Validez votre compte
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Nous avons envoyé un code de confirmation à 6 chiffres à l'adresse suivante :
            </p>
          </div>

          {/* Target Email display */}
          {email ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-paper border border-line font-mono text-xs font-semibold text-ink shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{email}</span>
            </div>
          ) : (
            <div className="flex gap-2 max-w-xs mx-auto">
              <input
                type="email"
                placeholder="Votre adresse email..."
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                className="field text-xs text-center"
              />
            </div>
          )}

          {/* 6-Digit OTP Input */}
          <div className="py-2 flex flex-col items-center justify-center space-y-4">
            <label className="text-xs font-bold text-muted-foreground tracking-wide uppercase">
              Saisissez le code à 6 chiffres
            </label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={handleOtpChange}
                disabled={verifying}
              >
                <InputOTPGroup className="gap-1 sm:gap-2">
                  <InputOTPSlot
                    index={0}
                    className="h-12 w-11 sm:h-14 sm:w-12 text-lg sm:text-2xl font-mono font-bold border-line bg-card shadow-sm rounded-xl"
                  />
                  <InputOTPSlot
                    index={1}
                    className="h-12 w-11 sm:h-14 sm:w-12 text-lg sm:text-2xl font-mono font-bold border-line bg-card shadow-sm rounded-xl"
                  />
                  <InputOTPSlot
                    index={2}
                    className="h-12 w-11 sm:h-14 sm:w-12 text-lg sm:text-2xl font-mono font-bold border-line bg-card shadow-sm rounded-xl"
                  />
                </InputOTPGroup>
                <InputOTPSeparator className="mx-1 text-muted-foreground" />
                <InputOTPGroup className="gap-1 sm:gap-2">
                  <InputOTPSlot
                    index={3}
                    className="h-12 w-11 sm:h-14 sm:w-12 text-lg sm:text-2xl font-mono font-bold border-line bg-card shadow-sm rounded-xl"
                  />
                  <InputOTPSlot
                    index={4}
                    className="h-12 w-11 sm:h-14 sm:w-12 text-lg sm:text-2xl font-mono font-bold border-line bg-card shadow-sm rounded-xl"
                  />
                  <InputOTPSlot
                    index={5}
                    className="h-12 w-11 sm:h-14 sm:w-12 text-lg sm:text-2xl font-mono font-bold border-line bg-card shadow-sm rounded-xl"
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => executeOtpValidation(otp)}
              disabled={verifying || otp.trim().length !== 6}
              className="btn-base btn-primary w-full py-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-glow disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Validation en cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Valider mon compte</span>
                </>
              )}
            </button>

            {/* Resend button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending || resendCooldown > 0}
                className="btn-base btn-ghost w-full py-2.5 text-xs text-muted-foreground hover:text-ink flex items-center justify-center gap-1.5"
              >
                {resending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Envoi du nouveau code...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <span>Renvoyer un nouveau code dans {resendCooldown}s</span>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5 text-accent" />
                    <span>Renvoyer un code par email</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground pt-1">
              Vous ne trouvez pas le code ? Pensez à vérifier votre dossier <strong>Spams</strong>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-muted-foreground">
        AI Factory & The InnerBuild — Plateforme d'apprentissage autonome.
      </footer>
    </div>
  );
}
