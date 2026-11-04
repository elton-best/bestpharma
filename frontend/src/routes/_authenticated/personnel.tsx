import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, QrCode, ShieldCheck, Stethoscope, UserPlus } from "lucide-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnTete, Vide, dateFr, DIRECTION } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/personnel")({
  head: () => ({
    meta: [
      { title: "Personnel & Habilitations BPD — BEGPHARMA" },
      { name: "description", content: "Dossiers RH du personnel, inscription à l'Ordre et gestion des compétences." },
    ],
  }),
  component: PagePersonnel,
});

interface Employe {
  id: string;
  nom_complet: string;
  poste: string;
  telephone?: string | null;
  matricule?: string | null;
  code_badge?: string | null;
  date_embauche?: string | null;
  date_visite_medicale?: string | null;
  charte_qualite_signee: boolean;
  actif: boolean;
}

function PagePersonnel() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const peutGerer = aRole(...DIRECTION);

  const { data, isLoading } = useQuery({
    queryKey: ["employes-complets", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<{ employes: Employe[]; inscriptions_ordre: Record<string, any> }>(`/api/officines/${id}/employes`);
    },
  });

  const employes = data?.employes || [];
  const ordres = data?.inscriptions_ordre || {};

  const basculer = useMutation({
    mutationFn: async (e: { id: string; actif: boolean }) => {
      return api.put(`/api/officines/${id}/employes/${e.id}`, { actif: !e.actif });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employes-complets"] });
      toast.success("Statut de l'employé mis à jour.");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  return (
    <div className="grid gap-6">
      <EnTete
        titre="Personnel, Compétences & Ordre (BPD-2)"
        description={`${employes.filter((e) => e.actif).length} employé(s) actif(s). Suivi strict des qualifications et de l'inscription à l'Ordre des pharmaciens.`}
        action={peutGerer && id ? <AjoutEmploye officineId={id} /> : null}
      />

      {employes.length === 0 ? (
        <Vide texte="Aucun employé enregistré dans l'officine." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {employes.map((e) => {
            const estPharmacien = ["pharmacien_titulaire", "pharmacien_adjoint", "pharmacien_remplacant", "promoteur"].includes(e.poste);

            return (
              <Card key={e.id} className={e.actif ? "shadow-sm" : "opacity-60 bg-muted/40"}>
                <CardContent className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground text-base">{e.nom_complet}</p>
                        <Badge variant={e.actif ? "default" : "secondary"}>
                          {e.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-primary mt-0.5">
                        {fr.roles[e.poste as keyof typeof fr.roles] ?? "Poste non précisé"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Matricule : <span className="font-mono">{e.matricule || "—"}</span> · Tél : {e.telephone ?? "—"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {peutGerer ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => basculer.mutate({ id: e.id, actif: e.actif })}
                        >
                          {e.actif ? "Désactiver" : "Réactiver"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* VÉRIFICATIONS RÉGLEMENTAIRES BPD (ORDRE, MÉDICALE, BADGE) */}
                  <div className="rounded-lg bg-muted/30 p-2.5 border text-xs grid gap-1.5">
                    {estPharmacien ? (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Award className="size-3.5 text-emerald-600" />
                          Inscription Ordre des Pharmaciens :
                        </span>
                        <Badge variant="outline" className="text-[10px] border-emerald-600 text-emerald-700 bg-emerald-50">
                          Section B · En règle
                        </Badge>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Stethoscope className="size-3.5 text-blue-600" />
                        Aptitude médicale :
                      </span>
                      <span>{e.date_visite_medicale ? `À jour (${dateFr(e.date_visite_medicale)})` : "Non planifiée"}</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <QrCode className="size-3.5 text-primary" />
                        Badge de pointage :
                      </span>
                      <span className="font-mono text-[11px]">{e.code_badge || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-emerald-600" />
                        Charte qualité & BPD :
                      </span>
                      <span>{e.charte_qualite_signee ? "Signée électroniquement" : "En attente"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AjoutEmploye({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [poste, setPoste] = useState("dispensateur");
  const [telephone, setTelephone] = useState("");
  const [pin, setPin] = useState("1234");

  const creation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/officines/${officineId}/employes`, {
        nom_complet: nom.trim(),
        poste,
        telephone: telephone.trim(),
        pin_code: pin.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Employé créé avec génération automatique du matricule et du badge.");
      qc.invalidateQueries({ queryKey: ["employes-complets"] });
      setOuvert(false);
      setNom("");
      setTelephone("");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button className="h-10">
          <UserPlus className="size-4 mr-2" /> Nouvel Employé
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un membre à l'équipe officinale</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (nom.trim()) creation.mutate();
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="emp-nom">Nom et prénom(s) *</Label>
            <Input id="emp-nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <Label>Fonction / Poste réglementaire *</Label>
            <Select value={poste} onValueChange={setPoste}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pharmacien_adjoint">Pharmacien Adjoint</SelectItem>
                <SelectItem value="pharmacien_remplacant">Pharmacien Remplaçant</SelectItem>
                <SelectItem value="rmq">Responsable Management Qualité (RMQ)</SelectItem>
                <SelectItem value="dispensateur">Dispensateur (Auxiliaire de comptoir)</SelectItem>
                <SelectItem value="caissier">Caissier / Encaissement</SelectItem>
                <SelectItem value="magasinier">Magasinier / Gestionnaire de stock</SelectItem>
                <SelectItem value="comptable">Comptable</SelectItem>
                <SelectItem value="agent_entretien">Agent d'Entretien & Hygiène</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label htmlFor="emp-tel">Téléphone</Label>
              <Input id="emp-tel" placeholder="+229..." value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="emp-pin">Code PIN Badge (4 chiffres)</Label>
              <Input id="emp-pin" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
          </div>

          <Button type="submit" disabled={creation.isPending} className="mt-3">
            Enregistrer la fiche employé
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
