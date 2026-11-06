import { useEffect } from "react";
import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** Une erreur de rubrique ne doit ni effacer la session ni imposer une reconnexion. */
export function ErreurRubrique({ error, reset }: ErrorComponentProps) {
  useEffect(() => { console.error("Affichage de rubrique interrompu", error); }, [error]);
  return <section role="alert" className="m-4 grid gap-3 rounded-xl border border-amber-200 bg-white p-5">
    <h2 className="text-lg font-bold text-[#0F3B27]">Cette rubrique ne peut pas être affichée pour le moment</h2>
    <p className="text-sm text-[#475C50]">Votre session est conservée. Vous pouvez réessayer ou poursuivre dans une autre rubrique.</p>
    <div className="flex flex-wrap gap-3"><Button className="min-h-12" onClick={() => reset()}>Réessayer cette rubrique</Button><Link to="/dashboard" className="inline-flex min-h-12 items-center rounded-xl border px-4 text-sm font-bold">Tableau de bord</Link></div>
  </section>;
}
