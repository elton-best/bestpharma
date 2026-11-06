import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { formatDateHeure } from "@/lib/format";
import { Button } from "@/components/ui/button";
interface RecuImport {
  id: string; manifeste_sha256: string; importe_le: string;
  bilan: { sources_creees: number; sources_deja_presentes: number; lignes_inventaire_a_rapprocher: number; approbations_creees: number };
}
export function ImportsCorpus({ officine }: { officine: string }) {
  const [ouvert, setOuvert] = useState(false);
  const requete = useQuery({ queryKey: ["imports-corpus", officine], enabled: ouvert,
    queryFn: () => api.get<RecuImport[]>(`/officines/${officine}/imports-corpus`) });
  return <section className="grid gap-3 rounded-xl border p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-bold">Provenance du corpus documentaire</h2>
      <Button variant="outline" className="min-h-12" aria-expanded={ouvert} onClick={() => setOuvert(v => !v)}>{ouvert ? "Masquer les imports" : "Consulter les imports"}</Button>
    </div>
    <p className="text-xs text-muted-foreground">Les sources importées sont des brouillons à vérifier. Un statut figurant dans le classeur d’origine ne vaut pas approbation dans l’application.</p>
    {ouvert && <>
      {requete.isLoading && <p role="status">Chargement des imports enregistrés…</p>}
      {requete.isError && <p role="alert">Les imports ne peuvent pas être consultés. Aucune présence du corpus en base ne peut être attestée.</p>}
      {requete.data?.length === 0 && <p>Aucun import de corpus enregistré pour cette officine.</p>}
      {requete.data?.map(i => <article key={i.id} className="grid gap-1 rounded-xl border p-3 text-sm">
        <strong>Import du {formatDateHeure(i.importe_le)}</strong>
        <p>Sources créées : {i.bilan.sources_creees} · Sources déjà présentes : {i.bilan.sources_deja_presentes}</p>
        <p>Lignes d’inventaire à rapprocher : {i.bilan.lignes_inventaire_a_rapprocher} · Approbations créées : {i.bilan.approbations_creees}</p>
        <p className="break-all font-mono text-xs">{i.manifeste_sha256}</p>
      </article>)}
    </>}
  </section>;
}
