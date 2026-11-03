import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Menu, X, Trophy, Award, Sparkles } from "lucide-react";
import Logo from "./Logo";
import LanguageSelector from "./LanguageSelector";
import { useLanguage } from "@/lib/i18n";

export function Navbar() {
  const routerState = useRouterState();
  const currentPath = routerState?.location?.pathname || "/";
  const { t } = useLanguage();
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { to: "/challenges", label: t("nav_challenges"), icon: Trophy },
    { to: "/resultats", label: t("nav_results"), icon: Award },
    { to: "/ai-factory", label: t("nav_aifactory"), icon: Sparkles },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-all duration-300 md:px-6 md:pt-4">
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border transition-all duration-300 ${
          compact
            ? "border-[#CFE3D5] bg-white/95 px-4 py-2.5 shadow-md backdrop-blur-md"
            : "border-[#CFE3D5]/60 bg-white/85 px-5 py-3 shadow-sm backdrop-blur-sm"
        }`}
      >
        {/* Logo The InnerBuild */}
        <Link to="/" className="flex items-center gap-2 focus-visible:outline-none">
          <Logo />
        </Link>

        {/* Navigation desktop */}
        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-1 rounded-full border border-[#CFE3D5] bg-[#EFF7F1]/80 p-1 md:flex"
        >
          <Link
            to="/"
            className={`flex h-8 items-center justify-center rounded-full px-3.5 text-xs font-bold transition-colors ${
              currentPath === "/"
                ? "bg-[#023010] text-white shadow-xs"
                : "text-[#1F2420] hover:text-[#023010] hover:bg-[#E2F7E7]"
            }`}
          >
            {t("nav_home")}
          </Link>

          {navLinks.map((l) => {
            const isActive = currentPath === l.to;
            return (
              <Link
                key={l.to}
                to={l.to as any}
                className={`flex h-8 items-center gap-1.5 justify-center rounded-full px-3.5 text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-[#023010] text-white shadow-xs"
                    : "text-[#1F2420] hover:text-[#023010] hover:bg-[#E2F7E7]"
                }`}
              >
                <l.icon className="h-3.5 w-3.5 opacity-70" />
                <span>{l.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions droite desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <LanguageSelector />

          <Link
            to="/auth"
            className="text-xs font-bold text-[#1F2420] hover:text-[#023010] transition px-2 py-1"
          >
            {t("nav_login")}
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#023010] hover:bg-[#18AA38] px-4 py-2 font-display text-xs font-bold text-white shadow-sm transition hover:-translate-y-px"
          >
            {t("nav_join")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Bouton burger mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSelector />
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#CFE3D5] bg-[#EFF7F1] text-[#023010]"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {open ? (
        <div className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border border-[#CFE3D5] bg-white p-5 shadow-xl md:hidden">
          <nav aria-label="Navigation mobile" className="flex flex-col gap-1.5">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className={`rounded-xl px-4 py-2.5 font-display text-sm font-bold transition ${
                currentPath === "/" ? "bg-[#EFF7F1] text-[#023010]" : "text-[#1F2420] hover:bg-[#EFF7F1]"
              }`}
            >
              {t("nav_home")}
            </Link>

            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to as any}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-bold transition ${
                  currentPath === l.to
                    ? "bg-[#EFF7F1] text-[#023010]"
                    : "text-[#1F2420] hover:bg-[#EFF7F1]"
                }`}
              >
                <l.icon className="h-4 w-4 text-[#18AA38]" />
                <span>{l.label}</span>
              </Link>
            ))}

            <div className="mt-3 flex flex-col gap-2 border-t border-[#CFE3D5] pt-3">
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#CFE3D5] px-4 py-2.5 text-center font-display text-sm font-semibold text-[#1F2420]"
              >
                {t("nav_login")}
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                onClick={() => setOpen(false)}
                className="rounded-xl bg-[#023010] px-4 py-2.5 text-center font-display text-sm font-bold text-white shadow-sm"
              >
                {t("nav_join")}
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export default Navbar;
