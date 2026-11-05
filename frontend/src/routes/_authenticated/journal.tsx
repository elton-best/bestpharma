import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ShieldCheck, Download } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { telechargerCsv } from "@/lib/export-utils";
import { fr } from "@/lib/i18n/fr";
import { resumeJournal, type LigneJournal } from "@/components/modules/administration";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Journal d'audit — BestPharma" },
      {
        name: "description",
        content: "Journal d'audit inaltérable de votre officine dans BestPharma.",
      },
      { property: "og:title", content: "Journal d'audit — BestPharma" },
      {
        property: "og:description",
        content: "Journal d'audit inaltérable de votre officine dans BestPharma.",
      },
      { property: "og:type", content: "website" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PageJournal,
});

interface Paginateur<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

const fmtDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

const LIBELLE_ACTION: Record<string, string> = {
  INSERT: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
};

const TABLES = [
  { valeur: "toutes", libelle: fr.journal.filtreTable },
  { valeur: "officines", libelle: "Officine" },
  { valeur: "utilisateurs_officines", libelle: "Rattachement du personnel" },
  { valeur: "officine_parametres", libelle: "Paramètres de l'officine" },
  { valeur: "stocks_lots", libelle: "Lots de stock" },
  { valeur: "mouvements_stock", libelle: "Mouvements de stock" },
  { valeur: "ventes", libelle: "Ventes au comptoir" },
  { valeur: "dispensations", libelle: "Dispensations" },
  { valeur: "inventaires", libelle: "Inventaires" },
  { valeur: "lots_dechets", libelle: "Lots de déchets" },
  { valeur: "avis_rappels", libelle: "Avis de rappel" },
  { valeur: "registres_stupefiants", libelle: "Registre des stupéfiants" },
  { valeur: "non_conformites", libelle: "Non-conformités" },
  { valeur: "documents", libelle: "Documents qualité" },
  { valeur: "employes", libelle: "Employés" },
  { valeur: "echeances", libelle: "Échéances" },
  { valeur: "sessions_caisse", libelle: "Sessions de caisse" },
];

function PageJournal() {
  const { courante, aRole, chargement } = useOfficine();
  const [table, setTable] = useState("toutes");
  const [action, setAction] = useState("toutes");
  const [page, setPage] = useState(1);

  const autorise = aRole("promoteur", "pharmacien_titulaire", "rmq");

  const { data, isLoading } = useQuery<Paginateur<LigneJournal>>({
    queryKey: ["journal", courante?.officine_id, table, action, page],
    enabled: !!courante && autorise,
    placeholderData: keepPreviousData,
    queryFn: () => {
      const params = new URLSearchParams({ per_page: "25", page: String(page) });
      if (table !== "toutes") params.set("table_name", table);
      if (action !== "toutes") params.set("action", action);
      return api.get<Paginateur<LigneJournal>>(
        `/officines/${courante!.officine_id}/audit-logs?${params.toString()}`,
      );
    },
  });

  if (chargement) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!autorise) {
    return (
      <div className="grid gap-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {fr.journal.titre}
        </h1>
        <Alert>
          <AlertDescription>{fr.journal.nonAutorise}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const lignes = data?.data ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {fr.journal.titre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{fr.journal.sousTitre}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (lignes.length === 0) {
                toast.error("Aucune opération à exporter.");
                return;
              }
              telechargerCsv(
                lignes.map((l) => ({
                  Date: l.server_timestamp,
                  Action: LIBELLE_ACTION[l.action] ?? l.action,
                  Objet:
                    l.table_libelle ??
                    TABLES.find((t) => t.valeur === l.table_name)?.libelle ??
                    l.table_name,
                  Utilisateur: l.user_email ?? "N/A",
                  IP: l.ip_address ?? "N/A",
                  Détail: resumeJournal(l) || "",
                })),
                `bestpharma_journal_audit_${new Date().toISOString().split("T")[0]}`
              );
              toast.success("Journal d'audit exporté en CSV !");
            }}
            className="border-[#CFF1D2] text-[#0F3B27] font-bold text-xs gap-1.5 hover:bg-[#CFF1D2]/30"
          >
            <Download className="size-3.5" /> Export CSV
          </Button>
          <div className="flex items-center gap-2 rounded-xl border border-[#CFF1D2] bg-[#F7FBF8] px-3 py-2 text-xs text-[#0F3B27]">
            <ShieldCheck className="size-4" />
            {data?.total ?? 0} opération{(data?.total ?? 0) > 1 ? "s" : ""} conservée
            {(data?.total ?? 0) > 1 ? "s" : ""} dix ans
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          value={table}
          onValueChange={(v) => {
            setTable(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-12 w-full" aria-label="Filtrer par objet">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TABLES.map((t) => (
              <SelectItem key={t.valeur} value={t.valeur}>
                {t.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={action}
          onValueChange={(v) => {
            setAction(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-12 w-full" aria-label="Filtrer par action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes les actions</SelectItem>
            <SelectItem value="INSERT">Création</SelectItem>
            <SelectItem value="UPDATE">Modification</SelectItem>
            <SelectItem value="DELETE">Suppression</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-20 w-full" /> : null}

      {lignes.map((l) => (
        <Card key={l.id}>
          <CardContent className="grid gap-1.5 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  l.action === "DELETE" ? "destructive" : l.action === "INSERT" ? "default" : "secondary"
                }
              >
                {LIBELLE_ACTION[l.action] ?? "Opération"}
              </Badge>
              <span className="font-medium text-foreground">
                {l.table_libelle ??
                  TABLES.find((t) => t.valeur === l.table_name)?.libelle ??
                  "Objet suivi"}
              </span>
              <span className="text-muted-foreground">{fmtDate.format(new Date(l.server_timestamp))}</span>
            </div>
            <p className="text-muted-foreground">
              {fr.journal.utilisateur} : {l.user_email ?? "—"}
              {l.ip_address ? ` · depuis l'adresse ${l.ip_address}` : ""}
            </p>
            {resumeJournal(l) ? <p className="text-foreground">{resumeJournal(l)}</p> : null}
          </CardContent>
        </Card>
      ))}

      {!isLoading && lignes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{fr.commun.vide}</p>
      ) : null}

      {(data?.last_page ?? 1) > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="h-12"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Page précédente
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {data?.current_page ?? 1} sur {data?.last_page ?? 1}
          </p>
          <Button
            variant="outline"
            className="h-12"
            disabled={page >= (data?.last_page ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Page suivante
          </Button>
        </div>
      ) : null}
    </div>
  );
}
