import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
export function CourrielsPeremption() {
  const suivi = useQuery({ queryKey: ["courriels-peremption"], queryFn: () => api.get<{ courriel_configure: boolean; mode_demo?: boolean; envois: Record<string, number> }>("/stocks/alertes-peremption") });
  return <section className="grid gap-3 rounded-xl border bg-white p-4"><h2 className="font-bold">Rappels de péremption par courriel</h2>
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{[["Première alerte", "90 jours"], ["Deuxième alerte", "45 jours"], ["Derniers préparatifs", "10 jours"], ["Dernier rappel", "La veille"]].map(([titre, delai]) => <div key={titre}><dt className="text-muted-foreground">{titre}</dt><dd className="font-bold">{delai}</dd></div>)}</dl>
    <p className="text-sm">Le jour de la péremption, le lot est retiré des produits vendables.</p>
    {suivi.isError ? <p role="alert" className="text-sm">Le suivi des courriels est indisponible.</p> : suivi.data && <p className="text-sm">{suivi.data.courriel_configure ? "Service de courriel configuré." : suivi.data.mode_demo ? "Aucun courriel réel n’est envoyé depuis l’aperçu." : "L’envoi des courriels doit être configuré sur le serveur. Les alertes restent en attente."}</p>}
  </section>;
}
