import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, Bot, ChevronLeft, Rocket, Trophy } from "lucide-react";
import { useState, type ComponentType } from "react";
import { Logo, LogoMark } from "@/components/Logo";
import { getD1SessionUser } from "@/lib/d1-session";

const ONBOARDING_KEY = "aifac_mobile_onboarded";

type Slide = {
  eyebrow: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  accent: string;
  softAccent: string;
  points: string[];
};

const SLIDES: Slide[] = [
  {
    eyebrow: "APPRENDS",
    title: "Passe de l’idée à une vraie livraison.",
    description: "Des parcours courts et structurés pour maîtriser les skills essentiels de l’AI Factory.",
    icon: BookOpen,
    accent: "#EA580C",
    softAccent: "rgba(234, 88, 12, 0.14)",
    points: ["Cours accessibles gratuitement", "212 skills sélectionnés", "Progression à ton rythme"],
  },
  {
    eyebrow: "CONSTRUIS",
    title: "Travaille avec les agents IA, pas contre eux.",
    description: "Applique la méthode Spec → Plan → Build → Review pour produire des projets solides.",
    icon: Bot,
    accent: "#F59E0B",
    softAccent: "rgba(245, 158, 11, 0.16)",
    points: ["Coach IA disponible 24/7", "Exercices et challenges", "Retours concrets sur tes rendus"],
  },
  {
    eyebrow: "LIVRE",
    title: "Transforme tes compétences en preuves.",
    description: "Finalise tes projets, mesure ta progression et obtiens une certification vérifiable.",
    icon: Trophy,
    accent: "#10B981",
    softAccent: "rgba(16, 185, 129, 0.15)",
    points: ["Portfolio de réalisations", "Accompagnement humain", "Certification vérifiable"],
  },
];

export const Route = createFileRoute("/mobile-welcome")({
  ssr: false,
  beforeLoad: () => {
    const user = getD1SessionUser();
    if (user) {
      throw redirect({
        to: user.role === "admin" ? "/admin" : "/app",
      });
    }

    if (typeof window !== "undefined" && localStorage.getItem(ONBOARDING_KEY) === "1") {
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({
    meta: [
      { title: "Bienvenue sur AIFAC" },
      { name: "description", content: "Découvre l’application mobile AIFAC." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MobileWelcome,
});

function MobileWelcome() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index] ?? SLIDES[0]!;
  const isLast = index === SLIDES.length - 1;

  function finish(mode: "in" | "up") {
    localStorage.setItem(ONBOARDING_KEY, "1");
    navigate({
      to: "/auth",
      search: mode === "up" ? { mode: "signup" } : {},
      replace: true,
    });
  }

  function next() {
    if (isLast) finish("up");
    else setIndex((current) => current + 1);
  }

  return (
    <main className="mobile-safe-screen relative min-h-dvh overflow-x-hidden bg-paper text-ink selection:bg-accent/20">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-28 -top-24 h-80 w-80 rounded-full blur-3xl transition-colors duration-500"
        style={{ backgroundColor: slide.softAccent }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-36 -left-36 h-96 w-96 rounded-full blur-3xl transition-colors duration-500"
        style={{ backgroundColor: slide.softAccent }}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-5 pt-4">
        <header className="flex min-h-12 items-center justify-between">
          <Logo size={34} />
          <button
            type="button"
            onClick={() => finish("in")}
            className="min-h-11 rounded-full px-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-card hover:text-ink"
          >
            Passer
          </button>
        </header>

        <section className="flex flex-1 flex-col justify-center py-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 34 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -34 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <div className="relative mx-auto mb-8 flex h-64 w-full max-w-[330px] items-center justify-center">
                <div
                  className="absolute h-56 w-56 rounded-[3.25rem] rotate-6 transition-colors duration-500"
                  style={{ backgroundColor: slide.softAccent }}
                />
                <div className="absolute h-44 w-44 -rotate-6 rounded-[2.75rem] border border-line bg-card shadow-2xl shadow-ink/10" />
                <div
                  className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] text-white shadow-xl transition-colors duration-500"
                  style={{ backgroundColor: slide.accent }}
                >
                  <slide.icon size={54} />
                </div>
                <div className="absolute bottom-3 right-8 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-paper bg-ink text-paper shadow-lg">
                  {index === 0 ? <LogoMark className="h-8 w-8" /> : <Rocket size={25} />}
                </div>
              </div>

              <p className="mb-3 text-xs font-black tracking-[0.22em]" style={{ color: slide.accent }}>
                {slide.eyebrow}
              </p>
              <h1 className="max-w-sm font-display text-[2rem] font-extrabold leading-[1.12] tracking-tight text-ink">
                {slide.title}
              </h1>
              <p className="mt-4 max-w-sm text-[15px] font-medium leading-6 text-muted-foreground">
                {slide.description}
              </p>

              <ul className="mt-6 grid gap-2.5">
                {slide.points.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-sm font-semibold text-ink">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black"
                      style={{ color: slide.accent, backgroundColor: slide.softAccent }}
                    >
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </section>

        <footer className="pt-3">
          <div className="mb-5 flex items-center justify-center gap-2" aria-label={`Étape ${index + 1} sur ${SLIDES.length}`}>
            {SLIDES.map((item, itemIndex) => (
              <button
                key={item.eyebrow}
                type="button"
                onClick={() => setIndex(itemIndex)}
                aria-label={`Afficher l’étape ${itemIndex + 1}`}
                className={`h-2.5 rounded-full transition-all ${itemIndex === index ? "w-8" : "w-2.5 bg-ink/15"}`}
                style={itemIndex === index ? { backgroundColor: slide.accent } : undefined}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((current) => current - 1)}
                aria-label="Écran précédent"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-card text-ink shadow-sm active:scale-95"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-6 text-sm font-extrabold text-paper shadow-xl shadow-ink/15 transition-transform active:scale-[0.98]"
            >
              {isLast ? "Commencer gratuitement" : "Continuer"}
              <ArrowRight size={19} />
            </button>
          </div>
          {isLast && (
            <button
              type="button"
              onClick={() => finish("in")}
              className="mt-3 min-h-11 w-full text-center text-sm font-bold text-muted-foreground"
            >
              J’ai déjà un compte
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}
