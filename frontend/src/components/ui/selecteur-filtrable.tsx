"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface OptionSection {
  /** Identifiant technique de la section. */
  valeur: string;
  /** Nom affiché, en français courant. */
  libelle?: string;
  label?: string;
  titre?: string;
  /** Une phrase qui explique ce que l'on vient faire ici (facultatif). */
  description?: string;
  /** Pictogramme affiché à gauche du nom (facultatif). */
  icone?: React.ReactNode;
  /** Badge / compteur (facultatif, ex: "7", "Actif"). */
  badge?: string;
  /** Mots supplémentaires pour la recherche (synonymes, abréviations). */
  motsCles?: string[];
}

interface SelecteurFiltrableProps {
  options: OptionSection[];
  valeur: string;
  onChange?: (valeur: string) => void;
  onChangement?: (valeur: string) => void;
  onValueChange?: (valeur: string) => void;
  /** Titre au-dessus du champ (facultatif). */
  etiquette?: string;
  /** Texte affiché quand aucune section n'est choisie. */
  placeholder?: string;
  /** Texte affiché dans le champ de recherche. */
  placeholderRecherche?: string;
  recherchePlaceholder?: string;
  className?: string;
  id?: string;
}

function getTexteOption(opt?: OptionSection): string {
  if (!opt) return "";
  return opt.label || opt.libelle || opt.titre || opt.valeur || "Choix non renseigné";
}

/**
 * Sélecteur de section compact, élégant et fiable :
 * - Hauteur ergonomique compacte (40px)
 * - Recherche instantanée filtrable
 * - Aucun carré/cercle vide quand l'icône est absente
 * - Badge de compteur intégré
 */
export function SelecteurFiltrable({
  options = [],
  valeur,
  onChange,
  onChangement,
  onValueChange,
  etiquette,
  placeholder = "Choisir une section…",
  placeholderRecherche,
  recherchePlaceholder,
  className,
  id,
}: SelecteurFiltrableProps) {
  const [ouvert, setOuvert] = React.useState(false);
  const [recherche, setRecherche] = React.useState("");

  const phRecherche = recherchePlaceholder || placeholderRecherche || "Rechercher une section…";

  const dispatchChange = (val: string) => {
    if (onChange) onChange(val);
    if (onChangement) onChangement(val);
    if (onValueChange) onValueChange(val);
    setOuvert(false);
    setRecherche("");
  };

  const courante = options.find((o) => o.valeur === valeur);

  const optionsFiltrees = React.useMemo(() => {
    if (!recherche.trim()) return options;
    const q = recherche.toLowerCase().trim();
    return options.filter((opt) => {
      const texte = getTexteOption(opt).toLowerCase();
      if (texte.includes(q)) return true;
      if (opt.description?.toLowerCase().includes(q)) return true;
      if (opt.motsCles?.some((m) => (m ?? "").toLowerCase().includes(q))) return true;
      return false;
    });
  }, [options, recherche]);

  return (
    <div className={cn("w-full space-y-1", className)}>
      {etiquette ? (
        <label
          htmlFor={id}
          className="block text-[11px] font-bold uppercase tracking-wider text-[#475C50]"
        >
          {etiquette}
        </label>
      ) : null}

      <Popover open={ouvert} onOpenChange={(v) => { setOuvert(v); if (!v) setRecherche(""); }}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={ouvert}
            aria-label={courante ? `Section : ${getTexteOption(courante)}` : placeholder}
            className="flex min-h-12 w-full items-center justify-between gap-2.5 rounded-xl border border-[#CFF1D2] bg-white px-3 py-2 text-left shadow-2xs transition-all hover:border-[#0F3B27]/50 hover:bg-[#F7F9F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3B27]"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {courante?.icone ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#CFF1D2]/50 text-[#0F3B27]">
                  {courante.icone}
                </span>
              ) : null}
              <span className="truncate text-xs sm:text-sm font-bold text-[#0F3B27]">
                {courante ? getTexteOption(courante) : placeholder}
              </span>
              {courante?.badge ? (
                <span className="rounded-full bg-[#0F3B27]/10 px-2 py-0.5 text-[10px] font-extrabold text-[#0F3B27]">
                  {courante.badge}
                </span>
              ) : null}
            </div>

            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-[#475C50] transition-transform",
                ouvert && "rotate-180",
              )}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[var(--radix-popover-trigger-width)] min-w-[280px] sm:min-w-[340px] max-w-[480px] p-1.5 rounded-xl border border-[#CFF1D2] bg-white shadow-xl"
        >
          {/* Champ de recherche compact */}
          {options.length > 4 && (
            <div className="relative mb-1 px-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#475C50]" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder={phRecherche}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-[#CFF1D2] bg-[#F7F9F7] text-[#0F3B27] placeholder:text-[#475C50]/60 outline-none focus:border-[#0F3B27] focus:bg-white"
                autoFocus
              />
            </div>
          )}

          {/* Liste déroulante des options */}
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {optionsFiltrees.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[#475C50]">
                Aucune section trouvée.
              </div>
            ) : (
              optionsFiltrees.map((option) => {
                const active = option.valeur === valeur;
                const texte = getTexteOption(option);
                return (
                  <button
                    key={option.valeur}
                    type="button"
                    onClick={() => dispatchChange(option.valeur)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer",
                      active
                        ? "bg-[#CFF1D2]/80 text-[#0F3B27] font-bold"
                        : "text-[#0F3B27] hover:bg-[#F7F9F7]"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {option.icone ? (
                        <span className="flex size-5 shrink-0 items-center justify-center text-[#0F3B27]">
                          {option.icone}
                        </span>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold">{texte}</span>
                          {option.badge ? (
                            <span className="rounded-md bg-[#0F3B27]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#0F3B27]">
                              {option.badge}
                            </span>
                          ) : null}
                        </div>
                        {option.description ? (
                          <p className="truncate text-[10px] text-[#475C50] font-normal mt-0.5">
                            {option.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {active && <Check className="size-3.5 shrink-0 text-[#0F3B27]" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
