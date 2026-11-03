import { createFileRoute, Link } from "@tanstack/react-router";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Registre from "@/components/Registre";
import Preuves from "@/components/Preuves";
import Realisations from "@/components/Realisations";
import Methode from "@/components/Methode";
import Programme from "@/components/Programme";
import Catalog from "@/components/Catalog";
import Fit from "@/components/Fit";
import Offres from "@/components/Offres";
import Compare from "@/components/Compare";
import Faq from "@/components/Faq";
import { FinalCta, Footer } from "@/components/Final";
import { Sparkles, ArrowRight, ShieldCheck, Trophy, Layers } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const TITLE = "AI Factory — Formation aux 212 Skills IA par The InnerBuild";
const DESC =
  "Formation d'élite propulsée par The InnerBuild. 212 skills curés, architectures d'agents autonomes, méthode Spec → Done et livraison vérifiée pour les bâtisseurs tech.";

export const Route = createFileRoute("/ai-factory")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiFactoryPage,
});

function AiFactoryPage() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-[#18AA38]/20 selection:text-[#023010]">
      <Navbar />

      {/* Bannière d'appartenance The InnerBuild */}
      <div className="pt-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-[#CFE3D5] bg-[#EFF7F1] p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#023010] text-[#18AA38]">
              <Trophy className="h-4 w-4" />
            </span>
            <div>
              <span className="font-bold text-[#023010] block sm:inline">
                {lang === "fr"
                  ? "Formation officielle certifiée par The InnerBuild"
                  : "Official certified program powered by The InnerBuild"}
              </span>
              <span className="text-[#5C6660] text-xs sm:ml-2">
                {lang === "fr"
                  ? "Forgée pour les développeurs qui veulent livrer des architectures d'agents IA."
                  : "Forged for builders shipping autonomous AI agent architectures."}
              </span>
            </div>
          </div>
          <Link
            to="/"
            className="text-xs font-bold font-mono text-[#023010] hover:text-[#18AA38] flex items-center gap-1.5 shrink-0"
          >
            {lang === "fr" ? "Explorer The InnerBuild" : "Explore The InnerBuild"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <main className="space-y-16 sm:space-y-24">
        <Hero />
        <Stats />
        <Registre />
        <Preuves />
        <Realisations />
        <Methode />
        <Programme />
        <Catalog />
        <Fit />
        <Offres />
        <Compare />
        <Faq />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}
