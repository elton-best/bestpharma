import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function EnTete({ titre, description, action }: { titre: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{titre}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Vide({ texte }: { texte: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">{texte}</CardContent>
    </Card>
  );
}

export const dateFr = (d: string | null) =>
  d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { timeZone: "Africa/Porto-Novo" }) : "Non renseigné";

export const heureFr = (d: string) =>
  new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Porto-Novo" });

/** Jours restants avant une date (AAAA-MM-JJ), négatif si dépassée. */
export function joursRestants(date: string, aujourdHui = new Date()) {
  const cible = new Date(date + "T00:00:00Z").getTime();
  const j = new Date(aujourdHui.toLocaleDateString("en-CA", { timeZone: "Africa/Porto-Novo" }) + "T00:00:00Z").getTime();
  return Math.round((cible - j) / 86400000);
}

export const DIRECTION = ["promoteur", "pharmacien_titulaire", "pharmacien_adjoint"] as const;
export const QUALITE = ["promoteur", "pharmacien_titulaire", "pharmacien_adjoint", "rmq"] as const;
