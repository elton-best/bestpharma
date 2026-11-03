import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Document,
  DocText,
  Copy,
  CopySuccess,
  Check,
} from "reicon-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnTete, Vide, QUALITE } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/modeles")({
  head: () => ({
    meta: [
      { title: "Bibliothèque des 59 Modèles BPD — BEGPHARMA" },
      {
        name: "description",
        content:
          "Bibliothèque de modèles de procédures, modes opératoires et registres conformes au Guide BPD de l'ABMed.",
      },
    ],
  }),
  component: PageModeles,
});

interface ModeleBpd {
  id: string;
  code_ref: string;
  processus: string;
  type_document: string;
  titre: string;
  objet: string | null;
  domaine_application: string | null;
  contenu_modele: string;
  articles_guide: string | null;
  duree_conservation_ans: number;
}

const libellesProcessus: Record<string, string> = {
  tous: "Tous les processus",
  TAM: "TAM (Direction)",
  QAM: "QAM (Qualité & CAPA)",
  GAD: "GAD (Dispensation)",
  GAC: "GAC (Stock & Froid)",
  GAR: "GAR (RH & Locaux)",
};

function PageModeles() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const peutInstancier = aRole(...QUALITE);

  const [filtreProcessus, setFiltreProcessus] = useState("tous");
  const [modeleActif, setModeleActif] = useState<ModeleBpd | null>(null);
  const [copie, setCopie] = useState(false);

  const { data: modeles = [] } = useQuery<ModeleBpd[]>({
    queryKey: ["modeles-bpd"],
    queryFn: async () => {
      return api.get<ModeleBpd[]>("/api/modeles-bpd");
    },
  });

  const instancier = useMutation({
    mutationFn: async (modeleId: string) => {
      return api.post(`/api/officines/${id}/modeles-bpd/${modeleId}/instancier`);
    },
    onSuccess: () => {
      toast.success(
        "Modèle instancié avec succès dans les documents de l'officine (en statut brouillon)."
      );
      qc.invalidateQueries({ queryKey: ["documents"] });
      setModeleActif(null);
    },
    onError: (e: any) =>
      toast.error(e.message || "Erreur lors de l'instanciation du modèle"),
  });

  const modelesFiltres =
    filtreProcessus === "tous"
      ? modeles
      : modeles.filter((m) => m.processus === filtreProcessus);

  const handleCopier = (texte: string) => {
    navigator.clipboard.writeText(texte);
    setCopie(true);
    toast.success("Texte du modèle copié dans le presse-papier.");
    setTimeout(() => setCopie(false), 2000);
  };

  return (
    <div className="grid gap-6">
      <EnTete
        titre="Bibliothèque des Modèles BPD (BPD-C02)"
        description="Collection officielle des 59 modèles types préchargés (procédures, registres, fiches), prêts à être adaptés et validés par le pharmacien titulaire."
      />

      <Tabs value={filtreProcessus} onValueChange={setFiltreProcessus}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-white border border-[#0F3B27]/15 rounded-xl">
          {Object.entries(libellesProcessus).map(([cle, libelle]) => (
            <TabsTrigger
              key={cle}
              value={cle}
              className="text-xs py-2 font-semibold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"
            >
              {libelle}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {modelesFiltres.length === 0 ? (
        <Vide texte="Aucun modèle disponible pour ce filtre de processus." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modelesFiltres.map((m) => (
            <Card
              key={m.id}
              onClick={() => setModeleActif(m)}
              className="group cursor-pointer flex flex-col justify-between border border-[#0F3B27]/15 rounded-2xl bg-white p-5 hover:border-[#0F3B27]/40 hover:shadow-lg transition-all duration-200"
            >
              <div>
                {/* Ligne d'en-tête de la Card */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] px-2.5 py-0.5 rounded-md border border-[#0F3B27]/20">
                      {m.code_ref}
                    </span>
                    <Badge variant="secondary" className="text-[11px] font-bold">
                      {m.processus} · {m.type_document}
                    </Badge>
                  </div>
                  {m.articles_guide && (
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {m.articles_guide}
                    </span>
                  )}
                </div>

                {/* Titre */}
                <h3 className="text-base font-display font-bold text-[#0F3B27] leading-snug group-hover:text-[#0F3B27]/80 line-clamp-2 mb-2">
                  {m.titre}
                </h3>

                {/* Objet / Résumé clair */}
                <p className="text-xs text-slate-600 line-clamp-3 mb-4 bg-[#F7F9F7] p-3 rounded-xl border border-slate-200/60 leading-relaxed font-sans">
                  {m.objet || m.domaine_application || "Modèle type conforme aux exigences nationales ABMed."}
                </p>
              </div>

              {/* Pied de la Card */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px]">
                  Conservation : <strong>{m.duree_conservation_ans} ans</strong>
                </span>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs font-semibold text-[#0F3B27] hover:bg-[#CFF1D2]/50 group-hover:bg-[#0F3B27] group-hover:text-[#92FF5F] transition-colors rounded-lg px-3"
                >
                  Consulter &gt;
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Consultation & Adoption du Modèle */}
      <Dialog open={!!modeleActif} onOpenChange={(open) => !open && setModeleActif(null)}>
        {modeleActif && (
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader className="pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] px-2.5 py-0.5 rounded-md border border-[#0F3B27]/20">
                  {modeleActif.code_ref}
                </span>
                <Badge variant="secondary" className="text-xs font-bold">
                  {modeleActif.processus} · {modeleActif.type_document}
                </Badge>
                {modeleActif.articles_guide && (
                  <Badge variant="outline" className="text-xs">
                    Réf. Guide : {modeleActif.articles_guide}
                  </Badge>
                )}
                <span className="text-xs text-slate-500 ml-auto">
                  Conservation légale : <strong>{modeleActif.duree_conservation_ans} ans</strong>
                </span>
              </div>
              <DialogTitle className="text-xl font-display font-bold text-[#0F3B27] leading-snug">
                {modeleActif.titre}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-sm">
              {/* Objet & Domaine */}
              {(modeleActif.objet || modeleActif.domaine_application) && (
                <div className="grid sm:grid-cols-2 gap-3 bg-[#BFF2F0]/20 p-4 rounded-2xl border border-[#BFF2F0]/60">
                  {modeleActif.objet && (
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F3B27] mb-1">
                        1. Objet
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {modeleActif.objet}
                      </p>
                    </div>
                  )}
                  {modeleActif.domaine_application && (
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F3B27] mb-1">
                        2. Domaine d'application
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {modeleActif.domaine_application}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Texte intégral du Modèle */}
              <div className="rounded-2xl border border-[#0F3B27]/15 bg-white overflow-hidden shadow-sm">
                <div className="bg-[#0F3B27] text-white px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#92FF5F]">
                    <DocText className="w-4 h-4" /> Texte intégral de la procédure type
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopier(modeleActif.contenu_modele)}
                    className="h-7 text-xs text-white hover:bg-white/10 gap-1.5 px-2"
                  >
                    {copie ? <CopySuccess className="w-3.5 h-3.5 text-[#92FF5F]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copie ? "Copié !" : "Copier"}
                  </Button>
                </div>

                <div className="p-5 font-sans text-sm text-slate-800 whitespace-pre-line leading-relaxed max-h-[45vh] overflow-y-auto bg-slate-50/50">
                  {modeleActif.contenu_modele}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setModeleActif(null)}
                className="w-full sm:w-auto"
              >
                Fermer
              </Button>

              {peutInstancier && id && (
                <Button
                  className="w-full sm:w-auto bg-[#0F3B27] text-[#92FF5F] hover:bg-[#0F3B27]/90 font-bold"
                  disabled={instancier.isPending}
                  onClick={() => instancier.mutate(modeleActif.id)}
                >
                  <Check className="w-4 h-4 mr-1.5" /> Adopter ce modèle dans mon officine
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
