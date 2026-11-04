"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface OptionSection {
  /** Identifiant technique de la section. */
  valeur: string;
  /** Nom affiché, en français courant. */
  libelle: string;
  /** Une phrase qui explique ce que l'on vient faire ici. */
  description?: string;
  /** Pictogramme affiché à gauche du nom. */
  icone?: React.ReactNode;
  /** Mots supplémentaires pour la recherche (synonymes, abréviations). */
  motsCles?: string[];
}

interface SelecteurFiltrableProps {
  options: OptionSection[];
  valeur: string;
  onChange: (valeur: string) => void;
  /** Titre au-dessus du champ (facultatif). */
  etiquette?: string;
  /** Texte affiché quand aucune section n'est choisie. */
  placeholder?: string;
  /** Texte affiché dans le champ de recherche. */
  placeholderRecherche?: string;
  className?: string;
  id?: string;
}

/**
 * Liste déroulante filtrable : un seul champ, on tape quelques lettres et la
 * liste se réduit. Cible tactile de 48 px minimum, utilisable au comptoir
 * comme sur téléphone.
 */
export function SelecteurFiltrable({
  options,
  valeur,
  onChange,
  etiquette,
  placeholder = "Choisir une section…",
  placeholderRecherche = "Filtrer : tapez un mot (produits, lots, rappels…)",
  className,
  id,
}: SelecteurFiltrableProps) {
  const [ouvert, setOuvert] = React.useState(false);
  const courante = options.find((o) => o.valeur === valeur);

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {etiquette ? (
        <label
          htmlFor={id}
          className="block text-xs font-bold uppercase tracking-wide text-[#475C50]"
        >
          {etiquette}
        </label>
      ) : null}

      <Popover open={ouvert} onOpenChange={setOuvert}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={ouvert}
            aria-label={courante ? `Section : ${courante.libelle}` : placeholder}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 border-[#CFF1D2] bg-white px-3.5 py-2.5 text-left shadow-sm transition-colors hover:border-[#0F3B27]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3B27] focus-visible:ring-offset-2"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#CFF1D2] text-[#0F3B27]">
              {courante?.icone ?? <ChevronDown className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm font-black text-[#0F3B27]">
                {courante?.libelle ?? placeholder}
              </span>
              {courante?.description ? (
                <span className="mt-0.5 block truncate text-[11px] font-medium text-[#475C50]">
                  {courante.description}
                </span>
              ) : null}
            </span>
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
          sideOffset={6}
          className="w-[var(--radix-popover-trigger-width)] min-w-[min(22rem,88vw)] overflow-hidden rounded-2xl border-[#CFF1D2] bg-white p-0 shadow-xl"
        >
          <Command className="bg-white" loop>
            <CommandInput
              placeholder={placeholderRecherche}
              className="h-12 text-sm text-[#0F3B27] placeholder:text-[#475C50]/80"
            />
            <CommandList className="max-h-[min(60vh,22rem)]">
              <CommandEmpty className="px-4 py-6 text-center text-sm text-[#475C50]">
                Aucune section ne correspond à cette recherche.
              </CommandEmpty>
              <CommandGroup className="p-1">
                {options.map((option) => {
                  const active = option.valeur === valeur;
                  return (
                    <CommandItem
                      key={option.valeur}
                      value={[option.libelle, option.description, ...(option.motsCles ?? [])]
                        .filter(Boolean)
                        .join(" ")}
                      onSelect={() => {
                        onChange(option.valeur);
                        setOuvert(false);
                      }}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2.5 text-[#0F3B27]",
                        active ? "bg-[#CFF1D2]/60" : "data-[selected=true]:bg-[#F7F9F7]",
                      )}
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F7F9F7] text-[#0F3B27]">
                        {option.icone}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold leading-tight">
                          {option.libelle}
                        </span>
                        {option.description ? (
                          <span className="mt-0.5 block text-[11px] font-medium leading-snug text-[#475C50]">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                      {active ? (
                        <Check className="mt-1 size-4 shrink-0 text-[#0F3B27]" />
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
