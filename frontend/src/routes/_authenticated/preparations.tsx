import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  FileText,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/preparations")({
  head: () => ({
    meta: [
      { title: "Registre des Préparations — BEGPHARMA" },
      {
        name: "description",
        content: "Cahier des préparations magistrales et officinales conforme aux Bonnes Pratiques de Préparation (BPD-6).",
      },
    ],
  }),
  component: PagePreparations,
});

interface PreparationItem {
  id: string;
  numero_preparation: string;
  nom_preparation: string;
  type_preparation: "magistrale" | "officinale";
  formule_detaillee: string;
  quantite_produite: string;
  conditionnement: string;
  date_fabrication: string;
  date_limite_utilisation: string;
  patient_nom?: string;
  prescripteur_nom?: string;
  conforme: boolean;
  controles_effectues?: string;
  executant?: { name: string };
  pharmacien_visa?: { name: string };
}

function PagePreparations() {
  const queryClient = useQueryClient();
  const [dialogOuvert, setDialogOuvert] = useState(false);

  const [nomPreparation, setNomPreparation] = useState("");
  const [typePreparation, setTypePreparation] = useState<"magistrale" | "officinale">("magistrale");
  const [formuleDetaillee, setFormuleDetaillee] = useState("");
  const [quantiteProduite, setQuantiteProduite] = useState("");
  const [conditionnement, setConditionnement] = useState("Flacon teinté hermétique");
  const [dateFabrication, setDateFabrication] = useState(new Date().toISOString().split("T")[0]);
  const [dateLimiteUtilisation, setDateLimiteUtilisation] = useState("");
  const [patientNom, setPatientNom] = useState("");
  const [prescripteurNom, setPrescripteurNom] = useState("");
  const [controlesEffectues, setControlesEffectues] = useState(
    "Aspect homogène, absence de particules visibles, pH conforme."
  );

  const { data: prepsData, isLoading } = useQuery<{
    data: {
      data: PreparationItem[];
      total: number;
    };
  }>({
    queryKey: ["preparations"],
    queryFn: () => api.get("/preparations"),
  });

  const mutationCreer = useMutation({
    mutationFn: (payload: any) => api.post("/preparations", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Préparation inscrite au registre officiel !");
      queryClient.invalidateQueries({ queryKey: ["preparations"] });
      setDialogOuvert(false);
      setNomPreparation("");
      setFormuleDetaillee("");
      setQuantiteProduite("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    },
  });

  const mutationViser = useMutation({
    mutationFn: (id: string) => api.post(`/preparations/${id}/viser`, {}),
    onSuccess: (res: any) => {
      toast.success(res.message || "Préparation libérée et visée par le pharmacien");
      queryClient.invalidateQueries({ queryKey: ["preparations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Seul un pharmacien peut libérer une préparation");
    },
  });

  const preparations = prepsData?.data?.data || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomPreparation || !formuleDetaillee || !quantiteProduite || !dateLimiteUtilisation) {
      toast.error("Veuillez renseigner tous les champs obligatoires");
      return;
    }

    mutationCreer.mutate({
      nom_preparation: nomPreparation,
      type_preparation: typePreparation,
      formule_detaillee: formuleDetaillee,
      quantite_produite: quantiteProduite,
      conditionnement,
      date_fabrication: dateFabrication,
      date_limite_utilisation: dateLimiteUtilisation,
      patient_nom: patientNom || null,
      prescripteur_nom: prescripteurNom || null,
      controles_effectues: controlesEffectues,
      conforme: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Cahier des Préparations Magistrales & Officinales
            </h1>
            <Badge variant="outline" className="border-emerald-600 text-emerald-700">
              Guide BPD Chapitre 6 & POI-03
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Traçabilité des formules, matières premières, contrôles libératoires et visa obligatoire du
            pharmacien.
          </p>
        </div>

        <Button
          onClick={() => setDialogOuvert(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4" /> Inscrire une Préparation
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Feuilles du Registre Officiel des Préparations
          </CardTitle>
          <CardDescription>
            Toutes les préparations réalisées à l'officine sont numérotées consécutivement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement du registre...</div>
          ) : preparations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Aucune préparation inscrite dans le registre.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-3 px-4 font-semibold">N° Préparation</th>
                    <th className="py-3 px-4 font-semibold">Intitulé & Formule</th>
                    <th className="py-3 px-4 font-semibold">Type & Qté</th>
                    <th className="py-3 px-4 font-semibold">Patient / Prescripteur</th>
                    <th className="py-3 px-4 font-semibold">DLU</th>
                    <th className="py-3 px-4 font-semibold">Contrôle & Visa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preparations.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-xs text-slate-900">
                        {p.numero_preparation}
                        <div className="text-[11px] text-slate-400 font-normal">
                          Fabriqué le {p.date_fabrication}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.nom_preparation}</div>
                        <div className="text-xs text-slate-600 max-w-md line-clamp-2">
                          {p.formule_detaillee}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Cond.: {p.conditionnement}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {p.type_preparation}
                        </Badge>
                        <div className="text-xs font-semibold text-slate-800 mt-1">
                          {p.quantite_produite}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-medium text-slate-900">
                          {p.patient_nom || "Formule officinale"}
                        </div>
                        <div className="text-slate-500">{p.prescripteur_nom || ""}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-800">
                        {p.date_limite_utilisation}
                      </td>
                      <td className="py-3 px-4">
                        {p.pharmacien_visa ? (
                          <Badge variant="success" className="text-xs gap-1.5 py-1 px-2.5 font-bold shadow-none">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#0F3B27]" /> Libéré par {p.pharmacien_visa.name}
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => mutationViser.mutate(p.id)}
                            className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                          >
                            Libérer & Viser
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Inscrire Préparation */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle Préparation Magistrale / Officinale</DialogTitle>
            <DialogDescription>
              Enregistrement officiel au cahier de préparation selon les Bonnes Pratiques de Préparation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type de préparation</Label>
                <select
                  className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm bg-white"
                  value={typePreparation}
                  onChange={(e: any) => setTypePreparation(e.target.value)}
                >
                  <option value="magistrale">Magistrale (sur ordonnance)</option>
                  <option value="officinale">Officinale (formule interne)</option>
                </select>
              </div>
              <div>
                <Label>Nom de la préparation *</Label>
                <Input
                  placeholder="Ex: Sirop de Tolu, Pâte à l'eau..."
                  value={nomPreparation}
                  onChange={(e) => setNomPreparation(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Formule détaillée (ingrédients et quantités exactes) *</Label>
              <textarea
                className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm"
                rows={3}
                placeholder="Ex: Oxyde de zinc 20g, Talc 20g, Glycérine 20g, Eau purifiée qsp 100g"
                value={formuleDetaillee}
                onChange={(e) => setFormuleDetaillee(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantité préparée *</Label>
                <Input
                  placeholder="Ex: 200 ml, 100 g..."
                  value={quantiteProduite}
                  onChange={(e) => setQuantiteProduite(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Conditionnement</Label>
                <Input
                  value={conditionnement}
                  onChange={(e) => setConditionnement(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date de fabrication</Label>
                <Input
                  type="date"
                  value={dateFabrication}
                  onChange={(e) => setDateFabrication(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Date Limite d'Utilisation (DLU) *</Label>
                <Input
                  type="date"
                  value={dateLimiteUtilisation}
                  onChange={(e) => setDateLimiteUtilisation(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Patient (si magistrale)</Label>
                <Input
                  placeholder="Nom du patient..."
                  value={patientNom}
                  onChange={(e) => setPatientNom(e.target.value)}
                />
              </div>
              <div>
                <Label>Prescripteur</Label>
                <Input
                  placeholder="Dr..."
                  value={prescripteurNom}
                  onChange={(e) => setPrescripteurNom(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOuvert(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={mutationCreer.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {mutationCreer.isPending ? "Inscription..." : "Inscrire au registre"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
