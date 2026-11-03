import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeSlash, Lock, Sms, User, Check, Sparkles } from "reicon-react";
import { motion, AnimatePresence } from "motion/react";
import { Capacitor } from "@capacitor/core";
import { Logo } from "@/components/Logo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/i18n";
import { getD1SessionUser, setD1Session, clearD1Session } from "@/lib/d1-session";
import { d1ListServerFn } from "@/lib/d1-data.functions";
import { signUpWithD1ServerFn, signInWithD1ServerFn, requestPasswordResetServerFn } from "@/lib/d1-auth.functions";
import { check4TalentsPartnerServerFn } from "@/lib/d1-partner.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async ({ search }) => {
    const s = (search || {}) as { mode?: string; redirect?: string };
    if (s.mode !== "signup" && s.mode !== "up") {
      const user = getD1SessionUser();
      if (user) {
        throw redirect({ to: (s.redirect as any) || "/app" });
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Connexion & Inscription — THE InnerBuild" },
      { name: "description", content: "Connecte-toi à ton compte THE InnerBuild ou lance ton parcours d'ingénierie dès aujourd'hui." },
      { property: "og:title", content: "Connexion & Inscription — THE InnerBuild" },
      { property: "og:description", content: "Connecte-toi à ton compte THE InnerBuild ou lance ton parcours d'ingénierie dès aujourd'hui." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const PERKS_FR = [
  { title: "Challenges & Hackathons The InnerBuild", desc: "Mesure-toi aux meilleurs ingénieurs sur de vrais projets clients" },
  { title: "Formation d'élite AI Factory", desc: "212 skills curés et architecture logicielle autonome" },
  { title: "Évaluation multicritère par les jurys", desc: "Notation transparente sur les 7 dimensions d'ingénierie" },
  { title: "Certificats officiels vérifiables", desc: "Garantis par The InnerBuild et partageables sur LinkedIn" },
];

const PERKS_EN = [
  { title: "The InnerBuild Challenges & Hackathons", desc: "Compete against top-tier engineers on real client briefs" },
  { title: "AI Factory Elite Program", desc: "212 curated skills and autonomous software delivery" },
  { title: "7-Dimension Juror Review", desc: "Transparent evaluation on rigorous engineering standards" },
  { title: "Verifiable Official Certificates", desc: "Certified by The InnerBuild and shareable on LinkedIn" },
];

function AuthPage() {
  const navigate = useNavigate();
  const search = (useSearch({ strict: false }) || {}) as {
    mode?: string;
    confirmed?: string;
    error?: string;
    email?: string;
    verified?: string;
    reset?: string;
    password_updated?: string;
  };
  const isSignupParam = search?.mode === "signup" || search?.mode === "up";
  const [mode, setMode] = useState<"in" | "up">(isSignupParam ? "up" : "in");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(search?.email ? decodeURIComponent(search.email) : "");
  const [password, setPassword] = useState("");

  // Handle confirmation and error redirects from Edge Functions
  useEffect(() => {
    if (search?.confirmed === "true" || search?.verified === "true") {
      toast.success("Votre adresse email a été confirmée avec succès ! Vous pouvez maintenant vous connecter.");
      setMode("in");
    }
    if (search?.reset === "true" || search?.password_updated === "true") {
      toast.success("Votre mot de passe a été mis à jour avec succès ! Connectez-vous avec vos nouveaux identifiants.");
      setMode("in");
    }
    if (search?.error) {
      const errorMap: Record<string, string> = {
        invalid_token: "Le lien de confirmation ou réinitialisation est invalide ou a expiré.",
        token_already_used: "Ce lien a déjà été utilisé. Vous pouvez vous connecter.",
        token_expired: "Ce lien a expiré. Veuillez refaire une demande.",
        server_error: "Une erreur serveur est survenue. Veuillez réessayer.",
      };
      toast.error(errorMap[search.error] || "Erreur lors de la confirmation.");
    }
  }, [search?.confirmed, search?.verified, search?.reset, search?.password_updated, search?.error]);

  useEffect(() => {
    if (search?.mode === "signup" || search?.mode === "up") {
      setMode("up");
    } else if (search?.mode === "in" || search?.mode === "login") {
      setMode("in");
    }
  }, [search?.mode]);

  useEffect(() => {
    let mounted = true;
    async function checkAuth(user: { id: string; email: string; role?: string; user_metadata?: { role?: string } } | null) {
      if (!user) return;
      const clean = user.email?.toLowerCase();
      const isMasterAdmin = clean === "eltonhounnou27@gmail.com";
      let isAdmin = isMasterAdmin || user.role === "admin" || user.user_metadata?.["role"] === "admin";
      if (!isAdmin) {
        try {
          const roles = await d1ListServerFn({ data: { table: "user_roles", where: { user_id: user.id } } });
          if ((roles.rows || []).some((r: any) => r.role === "admin")) isAdmin = true;
        } catch {
          // ignore — défaut non-admin
        }
      }
      const isSignUpMode = search?.mode === "signup" || search?.mode === "up" || mode === "up";
      if (!isSignUpMode && mounted) {
        const dest = (search as any)?.redirect || "/app";
        navigate({ to: dest as any, replace: true });
      }
    }

    // Check unique D1 (pas de listener temps réel)
    const existing = getD1SessionUser();
    if (existing) {
      checkAuth(existing);
    }
    return () => {
      mounted = false;
    };
  }, [navigate, search?.mode, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (mode === "up") {
        // 1. Inscription autonome sur Cloudflare D1
        const res = await signUpWithD1ServerFn({
          data: {
            email: cleanEmail,
            password,
            fullName: name.trim(),
          },
        });

        if (!res.success) {
          toast.error(res.error || "Erreur lors de la création du compte.");
          setBusy(false);
          return;
        }

        if (res.user?.role === "admin") {
          toast.success("Compte admin créé ! Bienvenue.");
        } else {
          // Vérification membre partenaire (BWT ou 4Talents) à la création de compte
          try {
            const partnerCheck = await check4TalentsPartnerServerFn({ data: { email: cleanEmail } });
            if (partnerCheck.eligible) {
              const partnerName = partnerCheck.community?.name || partnerCheck.partner || "Partenaire";
              toast.success(`🎉 Compte créé ! Membre ${partnerName} identifié (-50% appliqués).`);
            } else {
              toast.success("Inscription réussie ! Bienvenue sur AI Factory.");
            }
          } catch {
            toast.success("Inscription réussie ! Bienvenue sur AI Factory.");
          }
        }

        if (typeof window !== "undefined" && res.user) {
          setD1Session(res.user);
        }

        navigate({ to: "/app", replace: true });
      } else {
        // 1. Connexion autonome sur Cloudflare D1
        const res = await signInWithD1ServerFn({
          data: {
            email: cleanEmail,
            password,
          },
        });

        if (!res.success) {
          toast.error(res.error || "Email ou mot de passe incorrect.");
          setBusy(false);
          return;
        }

        toast.success("Connexion réussie !");

        if (typeof window !== "undefined" && res.user) {
          setD1Session(res.user);
        }

        const target = (search as any)?.redirect || "/app";
        navigate({ to: target as any, replace: true });
      }

    } catch (err: any) {
      toast.error(err?.message || "Connexion au serveur impossible. Réessaie.");
    }
    setBusy(false);
  }

  // Custom Forgot Password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  const { lang, t } = useLanguage();

  async function handleSendReset(e: React.FormEvent) {
    e.preventDefault();
    const clean = forgotEmail.trim().toLowerCase();
    if (!clean) {
      toast.error(lang === "fr" ? "Veuillez renseigner votre adresse email." : "Please enter your email address.");
      return;
    }
    setForgotBusy(true);
    try {
      await requestPasswordResetServerFn({
        data: { email: clean, baseUrl: window.location.origin },
      });
      // Toujours succès (anti-énumération) : message identique que le compte existe ou non
      toast.success(lang === "fr" ? "Lien envoyé ! Vérifiez votre boîte mail." : "Link sent! Check your inbox.");
      setForgotSent(true);
    } catch {
      toast.success(lang === "fr" ? "Lien envoyé ! Vérifiez votre boîte mail." : "Link sent! Check your inbox.");
      setForgotSent(true);
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div className="mobile-safe-screen min-h-dvh w-full bg-paper flex items-start sm:items-center justify-center p-0 sm:p-6 lg:p-10 font-sans selection:bg-accent/20 selection:text-accent">
      {/* Full-screen on phones, split card on larger screens. */}
      <div className="w-full max-w-5xl bg-card min-h-dvh sm:min-h-[640px] sm:rounded-[28px] sm:shadow-2xl sm:shadow-ink/5 sm:border sm:border-line overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative">
        {/* ============================================================== */}
        {/* LEFT COLUMN: AUTH FORM WITH THE INNERBUILD BRANDING            */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 px-5 py-5 sm:p-12 lg:p-14 flex flex-col justify-center bg-card">
          <div className="max-w-md w-full mx-auto">
            {/* Header Top: Brand Logo + Lang selector */}
            <div className="flex items-center justify-between">
              <Link
                to={(Capacitor.isNativePlatform() ? "/mobile-welcome" : "/") as any}
                className="inline-flex items-center gap-2 group"
              >
                <Logo />
              </Link>
              <LanguageSelector />
            </div>

            {/* Header Titles */}
            <div className="mt-6 sm:mt-8">
              <h1 className="text-[1.75rem] sm:text-3xl font-extrabold text-ink tracking-tight font-display leading-tight">
                {mode === "in"
                  ? (lang === "fr" ? "Connexion à ton compte" : "Log in to your account")
                  : (lang === "fr" ? "Créer ton compte" : "Create your account")}
              </h1>
              <p className="mt-1.5 text-xs text-muted-foreground font-medium">
                {mode === "in"
                  ? (lang === "fr"
                      ? "Ravi de te revoir ! Connecte-toi pour poursuivre ton parcours."
                      : "Welcome back! Log in to continue your journey.")
                  : (lang === "fr"
                      ? "Rejoins THE InnerBuild et forge ton profil d'ingénieur d'élite."
                      : "Join THE InnerBuild and forge your elite engineer profile.")}
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="my-5 flex rounded-xl border border-line bg-paper p-1">
              <button
                type="button"
                onClick={() => setMode("in")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  mode === "in" ? "bg-card text-ink shadow-xs" : "text-muted-foreground hover:text-ink"
                }`}
              >
                {lang === "fr" ? "Se connecter" : "Log in"}
              </button>
              <button
                type="button"
                onClick={() => setMode("up")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  mode === "up" ? "bg-card text-ink shadow-xs" : "text-muted-foreground hover:text-ink"
                }`}
              >
                {lang === "fr" ? "S'inscrire" : "Sign up"}
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={submit} className="space-y-3.5">
              <AnimatePresence mode="popLayout">
                {mode === "up" && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      {lang === "fr" ? "Nom complet" : "Full name"}
                    </label>
                    <div className="relative flex min-h-12 items-center rounded-xl border border-line bg-paper px-4 py-3 transition-all focus-within:border-accent focus-within:bg-card focus-within:ring-2 focus-within:ring-accent/15">
                      <User size={16} className="text-muted-foreground shrink-0 mr-2.5" />
                      <input
                        required
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={lang === "fr" ? "Ex. Christian Martin" : "e.g. Christian Martin"}
                        className="w-full bg-transparent text-base sm:text-sm text-ink placeholder:text-muted-foreground outline-none"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  {lang === "fr" ? "Adresse email" : "Email address"}
                </label>
                <div className="relative flex min-h-12 items-center rounded-xl border border-line bg-paper px-4 py-3 transition-all focus-within:border-accent focus-within:bg-card focus-within:ring-2 focus-within:ring-accent/15">
                  <Sms size={16} className="text-muted-foreground shrink-0 mr-2.5" />
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full bg-transparent text-base sm:text-sm text-ink placeholder:text-muted-foreground outline-none"
                  />
                </div>
                {mode === "up" && email.includes("@") && email.length > 5 && (
                  <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <Sparkles size={13} className="shrink-0" />
                    {lang === "fr"
                      ? "Bénéficiez d'une réduction automatique de 50% si votre email est membre de la communauté 4Talents."
                      : "Automatic 50% partnership discount applied if your email is registered with 4Talents."}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  {lang === "fr" ? "Mot de passe" : "Password"}
                </label>
                <div className="relative flex min-h-12 items-center rounded-xl border border-line bg-paper px-4 py-3 transition-all focus-within:border-accent focus-within:bg-card focus-within:ring-2 focus-within:ring-accent/15">
                  <Lock size={16} className="text-muted-foreground shrink-0 mr-2.5" />
                  <input
                    required
                    minLength={6}
                    type={show ? "text" : "password"}
                    autoComplete={mode === "up" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={lang === "fr" ? "Au moins 6 caractères" : "At least 6 characters"}
                    className="w-full bg-transparent text-base sm:text-sm text-ink placeholder:text-muted-foreground outline-none pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 text-muted-foreground hover:text-ink transition-colors p-1"
                    title={show ? (lang === "fr" ? "Masquer" : "Hide") : (lang === "fr" ? "Afficher" : "Show")}
                  >
                    {show ? <EyeSlash size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Options Bar: Remember me & Forgot password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-ink">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-line text-accent focus:ring-accent/20 cursor-pointer accent-accent"
                  />
                  <span>{lang === "fr" ? "Se souvenir de moi" : "Remember me"}</span>
                </label>

                {mode === "in" && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotSent(false);
                      setShowForgotModal(true);
                    }}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {lang === "fr" ? "Mot de passe oublié ?" : "Forgot password?"}
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                className="btn-base btn-glow w-full py-3 text-xs sm:text-sm font-bold shadow-md shadow-accent/20 transition-all active:scale-[0.99] disabled:opacity-50 mt-3"
              >
                {busy
                  ? (lang === "fr" ? "Vérification en cours…" : "Verifying credentials…")
                  : mode === "in"
                  ? (lang === "fr" ? "Se connecter" : "Sign In")
                  : (lang === "fr" ? "Créer mon compte" : "Create My Account")}
              </button>
            </form>

            {/* Bottom Switch Link */}
            <div className="mt-6 sm:mt-8 text-center text-sm sm:text-xs text-muted-foreground font-medium">
              {mode === "in" ? (
                <>
                  {lang === "fr" ? "Pas encore de compte ?" : "Don't have an account yet?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("up");
                      if (typeof window !== "undefined") {
                        window.history.replaceState(null, "", "/auth?mode=signup");
                      }
                    }}
                    className="font-bold text-accent hover:underline ml-1"
                  >
                    {lang === "fr" ? "Créer un compte" : "Sign up"}
                  </button>
                </>
              ) : (
                <>
                  {lang === "fr" ? "Déjà un compte ?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("in");
                      if (typeof window !== "undefined") {
                        window.history.replaceState(null, "", "/auth");
                      }
                    }}
                    className="font-bold text-accent hover:underline ml-1"
                  >
                    {lang === "fr" ? "Se connecter" : "Sign in"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: THE INNERBUILD SHOWCASE (Deep Green Card)        */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#023010] via-[#03260e] to-[#011707] p-8 sm:p-10 lg:p-12 hidden lg:flex flex-col justify-between text-white relative overflow-hidden border-l border-[#CFE3D5]/20">
          {/* Ambient Accent Glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#18AA38]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#18AA38]/15 blur-3xl pointer-events-none" />

          {/* Top Badge */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#18AA38]/40 bg-[#18AA38]/15 px-3 py-1 text-[11px] font-mono font-bold text-[#18AA38]">
              <Sparkles size={12} /> THE InnerBuild · Elite Platform
            </span>
          </div>

          {/* Center: Presentation & Benefits */}
          <div className="relative z-10 my-auto py-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight font-display text-white leading-snug">
                {lang === "fr" ? "L'Excellence Frontend & IA" : "Frontend & AI Excellence"}
              </h2>
              <p className="mt-2 text-xs text-white/70 leading-relaxed">
                {lang === "fr"
                  ? "Rejoins l'écosystème où se forgent les Frontend Killers et les ingénieurs les plus rigoureux du continent."
                  : "Join the ecosystem where elite Frontend Killers and top software engineers are forged."}
              </p>
            </div>

            {/* Checklist items */}
            <div className="space-y-3.5">
              {(lang === "fr" ? PERKS_FR : PERKS_EN).map((perk, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#18AA38]/25 text-[#18AA38] mt-0.5">
                    <Check size={12} className="stroke-[2.5]" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white">{perk.title}</p>
                    <p className="text-[11px] text-white/60 mt-0.5">{perk.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Minimalist Stat Bar */}
            <div className="pt-2 grid grid-cols-3 gap-2 border-t border-white/10">
              <div className="text-center">
                <p className="text-sm font-bold text-[#18AA38]">3</p>
                <p className="text-[10px] text-white/60">{lang === "fr" ? "Saisons" : "Seasons"}</p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-sm font-bold text-white">7D</p>
                <p className="text-[10px] text-white/60">{lang === "fr" ? "Dimensions Jury" : "Jury Dimensions"}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-emerald-400">100%</p>
                <p className="text-[10px] text-white/60">{lang === "fr" ? "Vérifiable" : "Verifiable"}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ============================================================== */}
      {/* CUSTOM BRANDED FORGOT PASSWORD MODAL (No raw Supabase message) */}
      {/* ============================================================== */}
      {showForgotModal && (
        <div className="mobile-safe-screen fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-line bg-card p-5 pb-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 sm:rounded-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Logo size={28} compact />
                <span className="font-display text-sm font-bold text-ink">
                  Récupération de compte
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-paper hover:text-ink transition"
              >
                ✕
              </button>
            </div>

            {forgotSent ? (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 font-bold text-lg">
                    ✓
                  </div>
                  <h3 className="font-display font-bold text-ink text-sm">
                    Lien sécurisé expédié
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Si l'adresse <strong className="text-ink">{forgotEmail}</strong> est associée à un compte AI Factory, vous venez de recevoir un lien exclusif pour redéfinir votre mot de passe en toute sécurité.
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 italic">
                    Pensez à vérifier votre dossier de courriers indésirables (spams).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="btn-base btn-glow w-full text-xs font-bold py-2.5"
                >
                  Revenir à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendReset} className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Indiquez l'adresse email associée à votre compte AI Factory. Nous vous transmettrons immédiatement les instructions de réinitialisation.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Adresse email
                  </label>
                  <div className="relative flex min-h-12 items-center rounded-xl border border-line bg-paper px-4 py-3 transition-all focus-within:border-accent focus-within:bg-card focus-within:ring-2 focus-within:ring-accent/15">
                    <Sms size={16} className="text-muted-foreground shrink-0 mr-2.5" />
                    <input
                      required
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full bg-transparent text-xs text-ink placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="btn-base btn-ghost flex-1 text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={forgotBusy}
                    className="btn-base btn-glow flex-1 text-xs font-bold py-2.5 disabled:opacity-50"
                  >
                    {forgotBusy ? "Envoi…" : "Envoyer le lien"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
