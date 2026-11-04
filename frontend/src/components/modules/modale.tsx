import type { ReactNode } from "react";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Modale « fiche » : rectangle horizontal (deux colonnes sur grand écran),
 * en-tête et pied fixes, corps qui défile. Sur téléphone, elle repasse en
 * pleine largeur et les colonnes s'empilent.
 */
export function ModaleFiche({
  titre,
  sousTitre,
  badge,
  children,
  pied,
  className,
}: {
  titre: string;
  sousTitre?: string;
  badge?: ReactNode;
  children: ReactNode;
  pied?: ReactNode;
  className?: string;
}) {
  return (
    <DialogContent
      className={cn(
        "flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-2 border-[#CFF1D2] bg-white p-0 shadow-2xl sm:w-[calc(100vw-3rem)] sm:rounded-2xl",
        className,
      )}
    >
      <DialogHeader className="shrink-0 space-y-1 border-b border-[#CFF1D2] bg-[#F7F9F7] px-5 py-4 pr-12 text-left sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle className="font-display text-lg font-black leading-tight text-[#0F3B27] sm:text-xl">
            {titre}
          </DialogTitle>
          {badge}
        </div>
        {sousTitre ? (
          <DialogDescription className="text-xs leading-relaxed text-[#475C50]">
            {sousTitre}
          </DialogDescription>
        ) : null}
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">{children}</div>

      {pied ? (
        <div className="shrink-0 border-t border-[#CFF1D2] bg-[#F7F9F7] px-5 py-3 sm:px-6">
          {pied}
        </div>
      ) : null}
    </DialogContent>
  );
}

/** Colonne de formulaire : un intitulé, puis les champs. */
export function ColonneFiche({
  titre,
  aide,
  children,
  className,
}: {
  titre?: string;
  aide?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {titre ? (
        <div>
          <h3 className="font-display text-sm font-black text-[#0F3B27]">{titre}</h3>
          {aide ? <p className="mt-0.5 text-[11px] text-[#475C50]">{aide}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Champ avec intitulé et texte d'aide, pour ne jamais laisser un champ nu. */
export function Champ({
  label,
  aide,
  obligatoire,
  children,
  className,
}: {
  label: string;
  aide?: string;
  obligatoire?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <span className="block text-xs font-bold text-[#0F3B27]">
        {label}
        {obligatoire ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
      {aide ? <p className="text-[11px] leading-snug text-[#475C50]">{aide}</p> : null}
    </div>
  );
}
