import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { formatDateHeure } from "@/lib/format";
import { telechargerCsv } from "@/lib/export-utils";
import { resumeJournal, type LigneJournal } from "@/components/modules/administration";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/journal")({
  ssr: false,
  head: () => ({ meta: [{ title: "Journal d’audit — BEGPHARMA" }] }),
  component: PageJournal,
});

interface BilanAudit {
  status: "conforme" | "partiel" | "rupture" | "vide";
  integre: boolean;
  total_entrees_verifiees: number;
  entrees_historiques_non_chainees: number;
  premiere_rupture_id: number | null;
  derniere_empreinte_racine: string | null;
  date_verification: string;
  message: string;
}

function PageJournal() {
  const { courante, aRole, chargement } = useOfficine();
  const id = courante?.officine_id;
  const autorise = aRole("promoteur", "pharmacien_titulaire", "rmq");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("toutes");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const journal = useQuery({
    queryKey: ["journal-audit-reel", id, page, action, debut, fin],
    enabled: !!id && autorise,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), per_page: "50" });
      if (action !== "toutes") params.set("action", action);
      if (debut) params.set("date_from", `${debut}T00:00:00`);
      if (fin) params.set("date_to", `${fin}T23:59:59.999999`);
      return api.get<{ data: LigneJournal[]; current_page: number; last_page: number; total: number }>(`/officines/${id}/audit-logs?${params}`);
    },
  });
  const controle = useQuery({
    queryKey: ["audit-integrite-reelle", id],
    enabled: false,
    retry: false,
    queryFn: () => api.get<BilanAudit>(`/officines/${id}/audit-logs/verifier-integrite`),
  });
  if (chargement) return <p role="status">Chargement de l’officine…</p>;
  if (!autorise) return <p role="alert">Ce journal est réservé aux responsables habilités de l’officine.</p>;
  if (!id) return <p>Choisissez une officine.</p>;
  const lignes = journal.data?.data ?? [];
  const exporter = () => telechargerCsv(lignes.map(l => ({
    date: formatDateHeure(l.server_timestamp), auteur: l.user_email ?? "Non renseigné",
    objet: l.table_libelle ?? "Opération", action: l.action, resume: resumeJournal(l) ?? "",
    empreinte: l.empreinte_sha256 ?? "Non chaînée",
  })), "journal-page-consultee", [
    { cle: "date", label: "Date" }, { cle: "auteur", label: "Auteur" },
    { cle: "objet", label: "Objet" }, { cle: "action", label: "Action" },
    { cle: "resume", label: "Résumé" }, { cle: "empreinte", label: "Empreinte enregistrée" },
  ]);
  return <div className="grid gap-5">
    <header>
      <h1 className="text-2xl font-bold">Journal d’audit</h1>
      <p className="text-sm text-muted-foreground">Opérations enregistrées pour l’officine et vérification du chaînage côté serveur.</p>
    </header>
    <section className="grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-12" disabled={controle.isFetching} onClick={() => controle.refetch()}>
          {controle.isFetching ? "Vérification en cours…" : "Vérifier le journal côté serveur"}
        </Button>
        <Button className="min-h-12" variant="outline" disabled={!lignes.length || journal.isError || journal.isFetching} onClick={exporter}>Exporter la page consultée</Button>
      </div>
      <p className="text-xs text-muted-foreground">Une empreinte de fichier calculée localement ne prouve pas son authenticité. Aucun scellé ni certificat d’inspection n’est généré ici.</p>
      {controle.isError && <p role="alert">Vérification indisponible. Aucune conclusion d’intégrité ne peut être donnée.</p>}
      {controle.data && !controle.isError && <div role="status" className="grid gap-2">
        <strong>{controle.data.status === "conforme" ? "Chaînage vérifié" : "Intégrité globale non attestée"}</strong>
        <p>{controle.data.message}</p>
        <p className="text-xs">Contrôle du {formatDateHeure(controle.data.date_verification)} · Entrées vérifiées : {controle.data.total_entrees_verifiees} · Entrées historiques non chaînées : {controle.data.entrees_historiques_non_chainees}</p>
        {controle.data.premiere_rupture_id != null && <p>Première entrée en rupture : {controle.data.premiere_rupture_id}</p>}
        {controle.data.derniere_empreinte_racine && <p className="break-all font-mono text-xs">Dernière empreinte : {controle.data.derniere_empreinte_racine}</p>}
      </div>}
    </section>
    <div className="grid gap-3 md:grid-cols-3">
      <SelecteurFiltrable etiquette="Opération" valeur={action} onChange={v => { setAction(v); setPage(1); }} options={[
        { valeur: "toutes", libelle: "Toutes les opérations" }, { valeur: "INSERT", libelle: "Créations" },
        { valeur: "UPDATE", libelle: "Modifications" }, { valeur: "DELETE", libelle: "Suppressions" },
      ]} />
      <label className="grid gap-1 text-sm">Depuis le<input className="min-h-12 rounded-xl border px-3" type="date" value={debut} onChange={e => { setDebut(e.target.value); setPage(1); }} /></label>
      <label className="grid gap-1 text-sm">Jusqu’au<input className="min-h-12 rounded-xl border px-3" type="date" value={fin} onChange={e => { setFin(e.target.value); setPage(1); }} /></label>
    </div>
    {journal.isLoading && <p role="status">Chargement du journal…</p>}
    {journal.isError && <p role="alert">Le journal ne peut pas être chargé. <button className="min-h-12 underline" onClick={() => journal.refetch()}>Réessayer</button></p>}
    {!journal.isLoading && !journal.isError && <>
      {!lignes.length && <p>Aucune opération pour cette période.</p>}
      {lignes.map(l => <article key={l.id} className="grid gap-2 rounded-xl border p-4">
        <div className="flex flex-wrap justify-between gap-2"><strong>{l.table_libelle ?? "Opération enregistrée"}</strong><time>{formatDateHeure(l.server_timestamp)}</time></div>
        <p className="text-sm">{({ INSERT: "Création", UPDATE: "Modification", DELETE: "Suppression" } as Record<string, string>)[l.action] ?? "Opération"} · {l.user_email ?? "Auteur non renseigné"}</p>
        {resumeJournal(l) && <p className="text-sm">{resumeJournal(l)}</p>}
        <p className="break-all font-mono text-xs">{l.empreinte_sha256 ?? "Entrée historique non chaînée"}</p>
      </article>)}
      <nav aria-label="Pages du journal" className="flex items-center gap-3">
        <Button className="min-h-12" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Précédente</Button>
        <span>Page {journal.data?.current_page ?? page} sur {journal.data?.last_page ?? 1}</span>
        <Button className="min-h-12" variant="outline" disabled={page >= (journal.data?.last_page ?? 1)} onClick={() => setPage(p => p + 1)}>Suivante</Button>
      </nav>
    </>}
  </div>;
}
