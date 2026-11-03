import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Send, History, Sparkles } from "lucide-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnTete, Vide, dateFr, QUALITE } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Gestion Électronique des Documents (GED BPD) — BEGPHARMA" },
      { name: "description", content: "Cycle de vie des procédures et enregistrements BPD : rédaction, approbation par le titulaire et révision." },
    ],
  }),
  component: PageDocuments,
});

export const statutDoc: Record<string, string> = {
  brouillon: "Brouillon",
  a_valider: "À valider",
  valide: "Validé en vigueur",
};

interface DocumentBpd {
  id: string;
  officine_id: string;
  titre: string;
  code_document?: string;
  type_doc: string;
  processus: string;
  contenu: string;
  version: number;
  indice_revision: number;
  statut: "brouillon" | "a_valider" | "valide";
  redacteur_nom?: string;
  approbateur_nom?: string;
  approuve_le?: string;
  valide_le?: string;
  updated_at: string;
}

function PageDocuments() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState("tous");

  const peutRediger = aRole(...QUALITE);
  const peutValider = aRole("pharmacien_titulaire", "promoteur");

  const { data: documents = [] } = useQuery<DocumentBpd[]>({
    queryKey: ["documents", id, filtre],
    enabled: !!id,
    queryFn: async () => {
      const q = filtre !== "tous" ? `?statut=${filtre}` : "";
      return api.get<DocumentBpd[]>(`/api/officines/${id}/documents${q}`);
    },
  });

  const maj = useMutation({
    mutationFn: async ({ docId, champs }: { docId: string; champs: Partial<DocumentBpd> }) => {
      return api.put(`/api/officines/${id}/documents/${docId}`, champs);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document mis à jour.");
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la mise à jour"),
  });

  return (
    <div className="grid gap-6">
      <EnTete
        titre="GED & Procédures Qualité (BPD-1 & BPD-3)"
        description="Standardisation du cycle documentaire. Seul le Pharmacien Titulaire ou le Promoteur peut approuver la mise en vigueur officielle."
        action={peutRediger && id ? <NouveauDocument officineId={id} /> : null}
      />

      <Tabs value={filtre} onValueChange={setFiltre}>
        <TabsList>
          <TabsTrigger value="tous">Tous</TabsTrigger>
          <TabsTrigger value="brouillon">Brouillons</TabsTrigger>
          <TabsTrigger value="a_valider">À valider</TabsTrigger>
          <TabsTrigger value="valide">En vigueur</TabsTrigger>
        </TabsList>
      </Tabs>

      {documents.length === 0 ? (
        <Vide texte="Aucun document trouvé pour ce filtre." />
      ) : (
        <div className="grid gap-3">
          {documents.map((d) => (
            <Card key={d.id}>
              <CardContent className="grid gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground text-base">{d.titre}</p>
                    {d.code_document ? (
                      <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                        {d.code_document}
                      </Badge>
                    ) : null}
                    <Badge variant="outline">
                      v{d.version}.{d.indice_revision}
                    </Badge>
                    <Badge variant={d.statut === "valide" ? "default" : "secondary"}>
                      {statutDoc[d.statut] || d.statut}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Processus : {d.processus}</span>
                </div>

                <p className="line-clamp-3 text-sm text-muted-foreground whitespace-pre-line font-sans bg-muted/20 p-2.5 rounded-md border">
                  {d.contenu || "— Aucun texte renseigné —"}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t">
                  <div>
                    <span>Rédigé par : <strong>{d.redacteur_nom || "—"}</strong></span>
                    {d.approbateur_nom ? (
                      <span className="ml-3">
                        Approuvé par : <strong>{d.approbateur_nom}</strong> le {dateFr(d.valide_le || d.approuve_le || "")}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {peutRediger && d.statut === "brouillon" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => maj.mutate({ docId: d.id, champs: { statut: "a_valider" } })}
                      >
                        <Send className="size-3.5 mr-1.5" /> Soumettre à validation
                      </Button>
                    )}

                    {peutValider && d.statut === "a_valider" && (
                      <Button
                        size="sm"
                        className="h-8 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => maj.mutate({ docId: d.id, champs: { statut: "valide" } })}
                      >
                        <CheckCircle2 className="size-3.5 mr-1.5" /> Approuver & Valider (Titulaire)
                      </Button>
                    )}

                    {peutRediger && d.statut === "valide" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => maj.mutate({ docId: d.id, champs: { statut: "brouillon" } })}
                      >
                        <History className="size-3.5 mr-1.5" /> Créer une nouvelle révision
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function NouveauDocument({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [processus, setProcessus] = useState("QAM");
  const [typeDoc, setTypeDoc] = useState("PR");
  const [contenu, setContenu] = useState("");

  const creation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/officines/${officineId}/documents`, {
        titre: titre.trim(),
        processus,
        type_doc: typeDoc,
        contenu,
      });
    },
    onSuccess: () => {
      toast.success("Document créé en brouillon avec codification automatique.");
      qc.invalidateQueries({ queryKey: ["documents"] });
      setOuvert(false);
      setTitre("");
      setContenu("");
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la création"),
  });

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button className="h-10">+ Nouveau Document</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Rédiger un document BPD</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (titre.trim()) creation.mutate();
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="doc-titre">Titre du document *</Label>
            <Input id="doc-titre" required value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Processus BPD</Label>
              <Select value={processus} onValueChange={setProcessus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAM">TAM (Top Management)</SelectItem>
                  <SelectItem value="QAM">QAM (Qualité & Amélioration)</SelectItem>
                  <SelectItem value="GAD">GAD (Accueil & Dispensation)</SelectItem>
                  <SelectItem value="GAC">GAC (Stock & Froid)</SelectItem>
                  <SelectItem value="GAR">GAR (RH & Administration)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label>Type documentaire</Label>
              <Select value={typeDoc} onValueChange={setTypeDoc}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PR">PR - Procédure</SelectItem>
                  <SelectItem value="MO">MO - Mode opératoire</SelectItem>
                  <SelectItem value="EN">EN - Registre / Enregistrement</SelectItem>
                  <SelectItem value="FI">FI - Fiche technique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1">
            <Label htmlFor="doc-contenu">Corps du document</Label>
            <Textarea
              id="doc-contenu"
              rows={8}
              placeholder="1. Objet&#10;2. Domaine d'application&#10;3. Responsabilités&#10;4. Description des étapes..."
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={creation.isPending} className="mt-2">
            Enregistrer en brouillon
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
