import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  ChartLine,
  Thermometer,
  Shield,
  HelpCircle,
} from "reicon-react";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  badge?: string;
}

const DEFAULT_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar-nav"]',
    title: "Menu & 16 Modules Métier BPD",
    description:
      "Accédez facilement à l'ensemble des modules réglementaires : Caisse POS tactile, Ordonnancier, Stock par lots (FEFO), Registre Stupéfiants et Auto-évaluation ABMed.",
    position: "right",
    badge: "Navigation Officinale",
  },
  {
    target: '[data-tour="metric-presence"]',
    title: "Pointage Présence Pharmaceutique (Art. 1.11)",
    description:
      "Le Guide BPD impose la présence continue d'un pharmacien diplômé durant l'ouverture. Ce panneau affiche l'état en direct et permet d'enregistrer instantanément son pointage horodaté.",
    position: "bottom",
    badge: "Conformité Légale",
  },
  {
    target: '[data-tour="chart-sales"]',
    title: "Activité Commerciale & Ventes e-MECeF",
    description:
      "Suivez les flux de délivrance réels, le chiffre d'affaires hebdomadaire certifié DGI et le nombre d'ordonnances traitées grâce aux courbes dynamiques Recharts.",
    position: "top",
    badge: "Télémétrie Caisse",
  },
  {
    target: '[data-tour="chart-temp"]',
    title: "Télémétrie Chaîne du Froid 24h",
    description:
      "Surveillez en direct les relevés thermiques des sondes IoT. La zone verte (2°C – 8°C) protège les vaccins et l'alerte à 25°C sécurise la réserve magasin.",
    position: "top",
    badge: "Chaîne du Froid",
  },
  {
    target: '[data-tour="user-profile"]',
    title: "Profil Professionnel & Sécurité",
    description:
      "Consultez votre fiche de poste, vos droits d'accès officinaux, le journal d'audit cryptographique et l'état de vos sessions actives.",
    position: "bottom",
    badge: "Compte & Accès",
  },
];

const LOCAL_STORAGE_KEY = "begpharma_guide_tour_dismissed";

interface TourContextType {
  demarrerTour: () => void;
  tourActif: boolean;
}

const TourContext = createContext<TourContextType>({
  demarrerTour: () => {},
  tourActif: false,
});

export const useTour = () => useContext(TourContext);

export function TourProvider({
  children,
  steps = DEFAULT_STEPS,
}: {
  children: React.ReactNode;
  steps?: TourStep[];
}) {
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [neverShowAgain, setNeverShowAgain] = useState<boolean>(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Proposer le tour automatiquement à la première connexion s'il n'a pas été masqué
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShowWelcome(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const demarrerTour = useCallback(() => {
    setShowWelcome(false);
    setCurrentStepIndex(0);
    setActive(true);
  }, []);

  const currentStep = useMemo(() => steps[currentStepIndex], [steps, currentStepIndex]);

  // Calcul du rectangle de l'élément cible et défilement fluide vers celui-ci
  const updateTargetRect = useCallback(() => {
    if (!active || !currentStep) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStep.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      // Petit délai pour recalculer les coordonnées après le scroll
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 150);
    } else {
      setTargetRect(null);
    }
  }, [active, currentStep]);

  useEffect(() => {
    if (active) {
      updateTargetRect();
      const handleResize = () => updateTargetRect();
      const handleScroll = () => {
        const el = document.querySelector(currentStep?.target || "");
        if (el) {
          setTargetRect(el.getBoundingClientRect());
        }
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, true);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [active, currentStep, updateTargetRect]);

  // Navigation clavier
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeTour();
      } else if (e.key === "ArrowRight") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, currentStepIndex]);

  const startFromModal = () => {
    if (neverShowAgain) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, "true");
      } catch {}
    }
    setShowWelcome(false);
    setCurrentStepIndex(0);
    setActive(true);
  };

  const closeWelcome = () => {
    if (neverShowAgain) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, "true");
      } catch {}
    }
    setShowWelcome(false);
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      finishTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const finishTour = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    } catch {}
    setActive(false);
  };

  const closeTour = () => {
    setActive(false);
  };

  return (
    <TourContext.Provider value={{ demarrerTour, tourActif: active }}>
      {children}

      {/* =========================================================================
           1. MODAL DE BIENVENUE & PROPOSITION DU GUIDE
           ========================================================================= */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in font-sans"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-white border border-[#CFF1D2] shadow-2xl rounded-3xl p-6 sm:p-7 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0F3B27]" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#0F3B27] text-[#92FF5F] shrink-0 shadow-sm">
                  <Compass size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-[#0F3B27] bg-[#CFF1D2] px-2 py-0.5 rounded-full">
                      Guide Prise en main
                    </span>
                    <span className="text-[11px] font-medium text-[#475C50]">~2 minutes</span>
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-black text-[#0F3B27] mt-1">
                    Bienvenue sur BestPharma
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={closeWelcome}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs sm:text-sm text-[#475C50] leading-relaxed">
              <p>
                Découvrez en 5 étapes clés les repères opérationnels essentiels de votre Système
                d'Information Officinal conforme aux <strong>Bonnes Pratiques de Dispensation (ABMed Bénin)</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 rounded-2xl bg-[#F7F9F7] border border-[#CFF1D2]/70">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F3B27]">
                    <Shield size={15} />
                    <span>Conformité</span>
                  </div>
                  <p className="text-[11px] text-[#475C50] mt-1">Art. 1.11 & 267 articles BPD</p>
                </div>

                <div className="p-3 rounded-2xl bg-[#F7F9F7] border border-[#CFF1D2]/70">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F3B27]">
                    <ChartLine size={15} />
                    <span>Télémétrie</span>
                  </div>
                  <p className="text-[11px] text-[#475C50] mt-1">Ventes & courbes Recharts</p>
                </div>

                <div className="p-3 rounded-2xl bg-[#F7F9F7] border border-[#CFF1D2]/70">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F3B27]">
                    <Thermometer size={15} />
                    <span>Froid 24h</span>
                  </div>
                  <p className="text-[11px] text-[#475C50] mt-1">Frigo vaccins 2°C – 8°C</p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#CFF1D2]/50 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[#475C50] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={neverShowAgain}
                  onChange={(e) => setNeverShowAgain(e.target.checked)}
                  className="rounded border-[#CFF1D2] text-[#0F3B27] focus:ring-[#92FF5F] size-4"
                />
                <span>Ne plus afficher automatiquement</span>
              </label>
            </div>

            <div className="mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeWelcome}
                className="px-4 py-2.5 rounded-2xl border border-[#CFF1D2] text-[#0F3B27] font-bold text-xs sm:text-sm hover:bg-[#CFF1D2]/30 transition-all text-center"
              >
                Découvrir par moi-même
              </button>
              <button
                type="button"
                onClick={startFromModal}
                className="px-5 py-2.5 rounded-2xl bg-[#0F3B27] hover:bg-[#164E35] text-[#92FF5F] font-black text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 group"
              >
                <span>Démarrer la visite guidée</span>
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
           2. VISITE GUIDÉE ACTIVE : SPOTLIGHT + CADRE D'ACCENT + POPOVER EXPLICATIF
           ========================================================================= */}
      {active && currentStep && (
        <div className="fixed inset-0 z-[9995] font-sans pointer-events-none">
          {/* FOND OBSCURCI AVEC CADRAGE LUMINEUX DE LA SECTION REQUISE */}
          {targetRect && (
            <div
              className="absolute transition-all duration-300 ease-out rounded-2xl border-4 border-[#92FF5F] animate-pulse"
              style={{
                top: `${targetRect.top - 8}px`,
                left: `${targetRect.left - 8}px`,
                width: `${targetRect.width + 16}px`,
                height: `${targetRect.height + 16}px`,
                boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.78), inset 0 0 20px rgba(146, 255, 95, 0.35)",
              }}
            />
          )}

          {!targetRect && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs pointer-events-auto" />
          )}

          {/* POPOVER EXPLICATIF FLOTTANT */}
          <div
            className="absolute pointer-events-auto transition-all duration-300"
            style={getPopoverStyle(targetRect, currentStep.position)}
          >
            <div className="w-[340px] sm:w-[400px] bg-white border-2 border-[#0F3B27] shadow-2xl rounded-3xl p-5 sm:p-6 overflow-hidden animate-in fade-in zoom-in-95">
              {/* Entête de l'étape */}
              <div className="flex items-center justify-between gap-2 border-b border-[#CFF1D2]/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase text-[#0F3B27] bg-[#CFF1D2] px-2.5 py-0.5 rounded-full">
                    Étape {currentStepIndex + 1} / {steps.length}
                  </span>
                  {currentStep.badge && (
                    <span className="text-[10px] font-extrabold text-[#0F3B27] bg-[#E8F5EB] px-2 py-0.5 rounded-md">
                      {currentStep.badge}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={closeTour}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Fermer le guide"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Titre et Explication détaillée de la section */}
              <div className="mt-3.5">
                <h3 className="font-display font-black text-[#0F3B27] text-lg sm:text-xl">
                  {currentStep.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#475C50] mt-2 leading-relaxed font-medium">
                  {currentStep.description}
                </p>
              </div>

              {/* Actions de navigation et points d'étapes */}
              <div className="mt-6 pt-3.5 border-t border-[#CFF1D2]/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {steps.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentStepIndex
                          ? "w-6 bg-[#0F3B27]"
                          : idx < currentStepIndex
                          ? "w-2 bg-[#92FF5F]"
                          : "w-2 bg-slate-200"
                      }`}
                      aria-label={`Aller à l'étape ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {currentStepIndex > 0 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="px-3.5 py-2 rounded-xl border border-[#CFF1D2] text-[#0F3B27] font-bold text-xs hover:bg-[#CFF1D2]/30 transition-all flex items-center gap-1"
                    >
                      <ArrowLeft size={13} />
                      <span>Préc.</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-5 py-2 rounded-xl bg-[#0F3B27] hover:bg-[#164E35] text-[#92FF5F] font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{currentStepIndex === steps.length - 1 ? "Terminer" : "Suivant"}</span>
                    {currentStepIndex === steps.length - 1 ? (
                      <Check size={14} />
                    ) : (
                      <ArrowRight size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}

/**
 * Bouton Guide à insérer dans la barre de navigation supérieure
 */
export function BoutonGuide() {
  const { demarrerTour } = useTour();

  return (
    <button
      type="button"
      onClick={demarrerTour}
      className="flex items-center gap-1.5 rounded-xl border border-[#CFF1D2] px-3 py-1.5 bg-white hover:bg-[#CFF1D2]/30 text-[#0F3B27] font-extrabold text-xs transition-all shadow-2xs hover:border-[#0F3B27]/40 cursor-pointer"
      title="Démarrer la visite guidée de l'officine"
    >
      <Compass size={16} className="text-[#0F3B27]" />
      <span className="hidden sm:inline">Guide</span>
    </button>
  );
}

function getPopoverStyle(
  rect: DOMRect | null,
  preferredPosition: "top" | "bottom" | "left" | "right" = "bottom"
): React.CSSProperties {
  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const padding = 16;
  const popoverWidth = 400;
  const popoverHeight = 240;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = 0;
  let left = 0;

  if (preferredPosition === "bottom") {
    top = rect.bottom + padding;
    left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (top + popoverHeight > viewportHeight) {
      top = Math.max(padding, rect.top - popoverHeight - padding);
    }
  } else if (preferredPosition === "top") {
    top = rect.top - popoverHeight - padding;
    left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (top < padding) {
      top = rect.bottom + padding;
    }
  } else if (preferredPosition === "right") {
    top = rect.top + rect.height / 2 - popoverHeight / 2;
    left = rect.right + padding;
    if (left + popoverWidth > viewportWidth) {
      left = Math.max(padding, rect.left - popoverWidth - padding);
    }
  } else if (preferredPosition === "left") {
    top = rect.top + rect.height / 2 - popoverHeight / 2;
    left = rect.left - popoverWidth - padding;
    if (left < padding) {
      left = rect.right + padding;
    }
  }

  left = Math.max(padding, Math.min(left, viewportWidth - popoverWidth - padding));
  top = Math.max(padding, Math.min(top, viewportHeight - popoverHeight - padding));

  return {
    top: `${top}px`,
    left: `${left}px`,
  };
}
