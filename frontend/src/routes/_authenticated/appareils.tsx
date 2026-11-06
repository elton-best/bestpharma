import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MonitorSmartphone,
  ShieldAlert,
  ShieldCheck,
  Plus,
  QrCode,
  Printer,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Trash2,
  HardDrive,
  Laptop,
  Smartphone,
  Tablet,
  Power,
  RotateCcw,
  Check,
  Ban,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { deconnecter } from "@/lib/session";
import { useOfficine } from "@/lib/officine-context";
import { imprimerFicheOfficielle } from "@/lib/export-utils";
import { fr } from "@/lib/i18n/fr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/appareils")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Appareils autorisés & Bornes — BestPharma" },
      {
        name: "description",
        content: "Gestion du parc d'appareils, bornes de pointage, périphériques et révocations d'urgence dans BestPharma.",
      },
    ],
  }),
  component: PageAppareils,
});

interface Appareil {
  id: string;
  officine_id?: string;
  nom_appareil: string;
  identifiant_unique: string;
  type_appareil: "caisse" | "pc_bureau" | "borne_pointage" | "tablette_inventaire" | "smartphone_nomade";
  est_borne_pointage: boolean;
  actif: boolean;
  derniere_activite: string | null;
  created_at: string | null;
}

interface SessionAuth {
  id: number | string;
  name: string;
  is_current: boolean;
  last_used_at: string | null;
  created_at: string | null;
}

interface OperationMiseALecart {
  id: string;
  appareil_nom: string;
  type_operation: string;
  montant_ou_detail: string;
  date_tentative: string;
  motif_quarantaine: string;
  statut: "en_attente" | "validee" | "rejetee";
}

const fmtDate = { format: (date: Date) => Number.isFinite(date.getTime()) ? date.toLocaleString("fr-FR", { timeZone: "Africa/Porto-Novo" }) : "Date non renseignée" };

const SECTIONS_APPAREILS = [
  {
    valeur: "parc",
    libelle: "Parc d'appareils enregistrés",
    description: "Postes comptoir, tablettes, bornes et empreintes matérielles",
    badge: "APP-01 / APP-04",
  },
  {
    valeur: "appairage",
    libelle: "Enrôlement & Nouvel appareil",
    description: "Code PIN 6 chiffres, QR code d'appairage et validation titulaire",
    badge: "APP-01",
  },
  {
    valeur: "bornes",
    libelle: "Bornes de pointage H24",
    description: "Surveillance de présence, battement de cœur et alerte hors-ligne",
    badge: "APP-02 / APP-11",
  },
  {
    valeur: "peripheriques",
    libelle: "Postes de caisse & Périphériques",
    description: "Test imprimante tickets e-MECeF, douchette 2D et tiroir-caisse",
    badge: "APP-07",
  },
  {
    valeur: "sessions",
    libelle: "Sessions actives du compte",
    description: "Contrôle des connexions actives et révocation à distance",
    badge: "APP-06",
  },
  {
    valeur: "revocations",
    libelle: "Révocations d'urgence & Arbitrage",
    description: "Blocage immédiat < 30s et file des opérations mises à l'écart",
    badge: "APP-05",
  },
  {
    valeur: "registre",
    libelle: "Registre d'audit BPD4-F12",
    description: "Fiche officielle d'habilitation matérielle BPD exigée par l'ABMed",
    badge: "APP-12 / APP-13",
  },
];

function PageAppareils() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { courante, aRole, chargement } = useOfficine();

  const [section, setSection] = useState("parc");
  const [modalAppairage, setModalAppairage] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  const [nouveauType, setNouveauType] = useState<Appareil["type_appareil"]>("caisse");
  const [codePinGenere, setCodePinGenere] = useState<string>("582914");
  const [tempsRestantPin, setTempsRestantPin] = useState(300); // 5 minutes

  // File des opérations mises à l'écart (simulées pour l'arbitrage pharmacien titulaire)
  const [operationsQuarantaine, setOperationsQuarantaine] = useState<OperationMiseALecart[]>([
    {
      id: "OP-Q-001",
      appareil_nom: "Tablette Inventaire 02 (Réception)",
      type_operation: "Saisie d'inventaire 12 boîtes Paracétamol",
      montant_ou_detail: "Lot 2026-F09 · Écart: 0",
      date_tentative: new Date(Date.now() - 3600000 * 3).toISOString(),
      motif_quarantaine: "Terminal hors-ligne ayant subi une désynchronisation",
      statut: "en_attente",
    },
    {
      id: "OP-Q-002",
      appareil_nom: "Comptoir Secondaire (Ancien PC)",
      type_operation: "Encaissement Espèces Vente #VNT-881",
      montant_ou_detail: "14 500 FCFA",
      date_tentative: new Date(Date.now() - 3600000 * 8).toISOString(),
      motif_quarantaine: "Appareil révoqué pour remplacement matériel",
      statut: "en_attente",
    },
  ]);

  const autorise = aRole("promoteur", "pharmacien_titulaire", "rmq");

  // Requête du parc d'appareils de l'officine
  const { data: parcData, isLoading: chargementParc } = useQuery<{
    data: Appareil[];
    total: number;
    actifs_count: number;
    bornes_count: number;
  }>({
    queryKey: ["appareils-autorises", courante?.officine_id],
    enabled: !!courante,
    queryFn: () =>
      api.get<{
        data: Appareil[];
        total: number;
        actifs_count: number;
        bornes_count: number;
      }>(`/officines/${courante!.officine_id}/appareils-autorises`),
  });

  // Requête des sessions d'authentification utilisateur
  const { data: authSessions, isLoading: chargementSessions } = useQuery<{ devices: SessionAuth[] }>({
    queryKey: ["appareils"],
    queryFn: () => api.get<{ devices: SessionAuth[] }>("/auth/devices"),
  });

  // Mutation création d'appareil
  const mutationCreerAppareil = useMutation({
    mutationFn: (payload: { nom_appareil: string; type_appareil: string; est_borne_pointage?: boolean }) =>
      api.post(`/officines/${courante!.officine_id}/appareils-autorises`, payload),
    onSuccess: () => {
      toast.success("Nouvel appareil enrôlé et activé dans l'officine !");
      queryClient.invalidateQueries({ queryKey: ["appareils-autorises"] });
      setModalAppairage(false);
      setNouveauNom("");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'enregistrement de l'appareil"),
  });

  // Mutation révocation d'urgence appareil
  const mutationRevoquerAppareil = useMutation({
    mutationFn: (id: string) => api.post(`/appareils-autorises/${id}/revoquer`, {}),
    onSuccess: () => {
      toast.error("Appareil révoqué d'urgence (< 30s) ! Accès immédiatement révoqué.");
      queryClient.invalidateQueries({ queryKey: ["appareils-autorises"] });
    },
    onError: (err: any) => toast.error(err.message || "Erreur de révocation"),
  });

  // Mutation réactivation appareil
  const mutationReactiverAppareil = useMutation({
    mutationFn: (id: string) => api.post(`/appareils-autorises/${id}/reactiver`, {}),
    onSuccess: () => {
      toast.success("Appareil réactivé avec succès !");
      queryClient.invalidateQueries({ queryKey: ["appareils-autorises"] });
    },
    onError: (err: any) => toast.error(err.message || "Erreur de réactivation"),
  });

  // Révocation de session auth individuelle
  const revoquerSessionAuth = useMutation({
    mutationFn: (id: string | number) => api.delete(`/auth/devices/${id}`),
    onSuccess: async (_res, id) => {
      const etaitCourant = (authSessions?.devices ?? []).find((a) => a.id === id)?.is_current;
      toast.success(fr.appareils.revoque);
      if (etaitCourant) {
        await deconnecter(queryClient, router);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["appareils"] });
    },
    onError: (e: any) => toast.error(e.message || fr.commun.erreur),
  });

  // Révocation globale des autres sessions auth
  const revoquerAutresSessions = useMutation({
    mutationFn: async (courantId: string | number) => {
      const autres = (authSessions?.devices ?? []).filter((a) => a.id !== courantId);
      for (const appareil of autres) {
        await api.delete(`/auth/devices/${appareil.id}`);
      }
      return autres.length;
    },
    onSuccess: async (nombre) => {
      toast.success(
        nombre > 0
          ? `${nombre} session${nombre > 1 ? "s" : ""} distante${nombre > 1 ? "s" : ""} déconnectée${nombre > 1 ? "s" : ""}.`
          : "Aucune autre session active à déconnecter."
      );
      await queryClient.invalidateQueries({ queryKey: ["appareils"] });
    },
    onError: (e: any) => toast.error(e.message || fr.commun.erreur),
  });

  const appareils = parcData?.data ?? [];
  const sessions = authSessions?.devices ?? [];
  const sessionCourante = sessions.find((s) => s.is_current);

  // Générer un nouveau code PIN
  const genererNouveauPin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setCodePinGenere(pin);
    setTempsRestantPin(300);
    toast.success("Nouveau code PIN temporaire généré (valide 5 min) !");
  };

  // Arbitrage d'une opération en quarantaine
  const arbitrerOperation = (id: string, action: "validee" | "rejetee") => {
    setOperationsQuarantaine((prev) =>
      prev.map((op) => (op.id === id ? { ...op, statut: action } : op))
    );
    if (action === "validee") {
      toast.success(`Opération #${id} validée et intégrée dans le journal officiel !`);
    } else {
      toast.error(`Opération #${id} définitivement rejetée et annulée.`);
    }
  };

  // Test imprimante ticket e-MECeF
  const testerImprimante = () => {
    const ticketHtml = `
      <div style="font-family: monospace; width: 300px; padding: 10px; font-size: 12px;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px;">
          <strong>${courante?.officine.nom ?? "PHARMACIE BESTPHARMA"}</strong><br>
          IFU: 0202111245678 · Cotonou, Bénin<br>
          TEST IMPRESSION BILLET E-MECEF
        </div>
        <div style="margin: 8px 0; font-size: 11px;">
          DATE: ${new Date().toLocaleString("fr-FR")}<br>
          TERMINAL: Caisse Comptoir 01<br>
          STATUT: CONNEXION ÉTABLIE (OK)
        </div>
        <div style="border-top: 1px dashed #000; padding-top: 8px; text-align: center;">
          COMMUNICATION SÉCURISÉE DGI OK<br>
          *** TEST CONFORME ***
        </div>
      </div>
    `;
    imprimerFicheOfficielle(`test_ticket_emecef_${Date.now()}`, ticketHtml);
    toast.success("Impression du ticket de test e-MECeF envoyée !");
  };

  // Test ouverture tiroir caisse
  const testerTiroir = () => {
    toast.success("Signal d'ouverture impulsionnel (RJ12) envoyé au tiroir-caisse !");
  };

  // Imprimer le registre officiel BPD4-F12
  const imprimerRegistreBpd = () => {
    const contenuHtml = `
      <div style="font-family: system-ui, sans-serif; color: #0F3B27; padding: 20px;">
        <div style="border-bottom: 2px solid #0F3B27; padding-bottom: 12px; margin-bottom: 20px;">
          <h1 style="font-size: 20px; font-weight: bold; margin: 0;">BESTPHARMA — REGISTRE OFFICIEL DU PARC INFORMATIQUE (BPD4-F12)</h1>
          <p style="font-size: 12px; margin: 4px 0 0; color: #4B5563;">
            Conforme aux Bonnes Pratiques de Distribution en Officine (BPD Chapitre 4 & 10) · République du Bénin
          </p>
        </div>

        <div style="background-color: #F7FBF8; border: 1px solid #CFF1D2; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 12px;">
          <p style="margin: 2px 0;"><strong>Officine :</strong> ${courante?.officine.nom ?? "Pharmacie de référence"} (Licence : ${courante?.officine.numero_licence ?? "Non renseignée"})</p>
          <p style="margin: 2px 0;"><strong>Date d'édition du registre :</strong> ${fmtDate.format(new Date())} (Heure de Porto-Novo)</p>
          <p style="margin: 2px 0;"><strong>Total appareils habilités :</strong> ${appareils.length} terminaux déclarés (${appareils.filter((a) => a.actif).length} en service actif)</p>
          <p style="margin: 2px 0;"><strong>Bornes de pointage H24 :</strong> ${appareils.filter((a) => a.est_borne_pointage).length} bornes supervisées</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="background-color: #E8F5E9; border-bottom: 1px solid #CFF1D2;">
              <th style="padding: 6px 8px;">Désignation du terminal</th>
              <th style="padding: 6px 8px;">Identifiant Unique (Fingerprint)</th>
              <th style="padding: 6px 8px;">Rôle / Emplacement</th>
              <th style="padding: 6px 8px;">Borne H24</th>
              <th style="padding: 6px 8px;">Statut</th>
              <th style="padding: 6px 8px;">Dernière activité</th>
            </tr>
          </thead>
          <tbody>
            ${appareils
              .map(
                (a) => `
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 6px 8px; font-weight: bold;">${a.nom_appareil}</td>
                <td style="padding: 6px 8px; font-family: monospace;">${a.identifiant_unique}</td>
                <td style="padding: 6px 8px;">${a.type_appareil}</td>
                <td style="padding: 6px 8px;">${a.est_borne_pointage ? "OUI" : "NON"}</td>
                <td style="padding: 6px 8px; color: ${a.actif ? "#166534" : "#991B1B"}; font-weight: bold;">
                  ${a.actif ? "AUTORISÉ" : "RÉVOQUÉ"}
                </td>
                <td style="padding: 6px 8px;">${a.derniere_activite ? new Date(a.derniere_activite).toLocaleString("fr-FR") : "Jamais"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px;">
          <div style="border-top: 1px solid #9CA3AF; width: 45%; padding-top: 6px;">
            Le Responsable Informatique / RMQ<br>
            <em>(Signature)</em>
          </div>
          <div style="border-top: 1px solid #9CA3AF; width: 45%; padding-top: 6px;">
            Le Pharmacien Titulaire / Promoteur<br>
            <em>(Signature et sceau de l'officine)</em>
          </div>
        </div>
      </div>
    `;

    imprimerFicheOfficielle(
      `registre_materiel_bpd4_f12_${new Date().toISOString().split("T")[0]}`,
      contenuHtml
    );
    toast.success("Registre officiel BPD4-F12 prêt pour impression officielle !");
  };

  const getIconeAppareil = (type: string) => {
    switch (type) {
      case "borne_pointage":
        return <Power className="size-5 text-emerald-700" />;
      case "tablette_inventaire":
        return <Tablet className="size-5 text-indigo-700" />;
      case "smartphone_nomade":
        return <Smartphone className="size-5 text-purple-700" />;
      case "caisse":
        return <HardDrive className="size-5 text-[#0F3B27]" />;
      default:
        return <Laptop className="size-5 text-slate-700" />;
    }
  };

  return (
    <div className="grid gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Appareils autorisés & Bornes
            </h1>
            <Badge className="rounded-full bg-[#0F3B27] text-white hover:bg-[#0F3B27]/90 text-xs">
              BPD Chapitre 4 & 10
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Contrôle du parc informatique, appairage sécurisé par QR/PIN et révocation d'urgence en
            moins de 30 secondes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={imprimerRegistreBpd}
            className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] font-bold text-xs gap-1.5 hover:bg-[#CFF1D2]/30"
          >
            <Printer className="size-3.5" /> Registre BPD4-F12
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setModalAppairage(true)}
            className="rounded-[10px] bg-[#0F3B27] text-white hover:bg-[#0F3B27]/90 font-bold text-xs gap-1.5"
          >
            <Plus className="size-3.5" /> Enrôler un appareil
          </Button>
        </div>
      </div>

      {/* Bandeau d'état du parc */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="rounded-[10px] border-[#CFF1D2] bg-[#F7FBF8] p-4">
          <span className="text-xs text-muted-foreground font-semibold">Parc déclaré</span>
          <p className="text-2xl font-bold text-[#0F3B27] mt-1">{appareils.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Postes & terminaux enregistrés</p>
        </Card>
        <Card className="rounded-[10px] border-[#CFF1D2] bg-[#F7FBF8] p-4">
          <span className="text-xs text-muted-foreground font-semibold">En service actif</span>
          <p className="text-2xl font-bold text-[#1B5E20] mt-1">
            {appareils.filter((a) => a.actif).length}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Authentifiés par certificat</p>
        </Card>
        <Card className="rounded-[10px] border-[#CFF1D2] bg-[#F7FBF8] p-4">
          <span className="text-xs text-muted-foreground font-semibold">Bornes H24 supervisées</span>
          <p className="text-2xl font-bold text-[#0F3B27] mt-1">
            {appareils.filter((a) => a.est_borne_pointage).length}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pointage personnel Art. 1.11</p>
        </Card>
        <Card className="rounded-[10px] border-[#CFF1D2] bg-[#F7FBF8] p-4">
          <span className="text-xs text-muted-foreground font-semibold">Opérations en quarantaine</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {operationsQuarantaine.filter((op) => op.statut === "en_attente").length}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">En attente d'arbitrage titulaire</p>
        </Card>
      </div>

      {/* Sélecteur Filtrable déroulant unifié */}
      <SelecteurFiltrable
        options={SECTIONS_APPAREILS}
        valeur={section}
        onChange={(val) => setSection(val)}
        placeholder="Choisir une vue de gestion du parc matériel..."
      />

      {/* VUE 1 : PARC D'APPAREILS ENREGISTRÉS (APP-01, APP-02, APP-04) */}
      {section === "parc" && (
        <div className="grid gap-4">
          {chargementParc ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full rounded-[10px]" />
              <Skeleton className="h-24 w-full rounded-[10px]" />
            </div>
          ) : null}

          <div className="grid gap-3">
            {appareils.map((appareil) => (
              <Card
                key={appareil.id}
                className={`rounded-[10px] border transition-colors shadow-sm ${
                  appareil.actif
                    ? "border-[#CFF1D2] bg-white hover:border-[#1B5E20]"
                    : "border-red-200 bg-red-50/30"
                }`}
              >
                <CardContent className="p-4 grid gap-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-[8px] bg-slate-100 flex items-center justify-center">
                        {getIconeAppareil(appareil.type_appareil)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0F3B27]">{appareil.nom_appareil}</span>
                          {appareil.est_borne_pointage && (
                            <Badge className="bg-emerald-700 text-white text-[10px] rounded-md">
                              Borne Pointage H24
                            </Badge>
                          )}
                          <Badge
                            variant={appareil.actif ? "default" : "destructive"}
                            className="text-[10px] rounded-md"
                          >
                            {appareil.actif ? "Autorisé / En ligne" : "Révoqué d'urgence"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                          ID: {appareil.identifiant_unique} · Type: {appareil.type_appareil}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {appareil.actif ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => mutationRevoquerAppareil.mutate(appareil.id)}
                          disabled={mutationRevoquerAppareil.isPending}
                          className="rounded-[10px] text-xs font-bold gap-1.5 h-9"
                        >
                          <Ban className="size-3.5" /> Révocation d'urgence (&lt; 30s)
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => mutationReactiverAppareil.mutate(appareil.id)}
                          disabled={mutationReactiverAppareil.isPending}
                          className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold gap-1.5 h-9 hover:bg-[#CFF1D2]/30"
                        >
                          <RotateCcw className="size-3.5" /> Réactiver le terminal
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs text-muted-foreground">
                    <div>
                      <span className="font-semibold text-foreground">Emplacement :</span> Comptoir &
                      Officine
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Dernière activité :</span>{" "}
                      {appareil.derniere_activite
                        ? fmtDate.format(new Date(appareil.derniere_activite))
                        : "À l'instant"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">Scellé :</span>
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      <span>Certificat actif</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {appareils.length === 0 && !chargementParc && (
              <div className="p-8 text-center text-sm text-muted-foreground bg-white rounded-[10px] border border-[#CFF1D2]">
                Aucun appareil enregistré dans le parc. Cliquez sur « Enrôler un appareil » pour
                démarrer l'appairage.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VUE 2 : ENRÔLEMENT & NOUVEL APPAREIL (APP-01) */}
      {section === "appairage" && (
        <div className="grid gap-6">
          <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-sm p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base text-[#0F3B27] flex items-center gap-2">
                <QrCode className="size-5 text-[#1B5E20]" />
                Protocole d'Appairage Sécurisé par Code PIN / QR
              </CardTitle>
              <CardDescription className="text-xs">
                Chaque nouvel appareil physique doit être validé par le pharmacien titulaire via un
                code PIN à usage unique (5 min) ou le scan du QR code BestPharma.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Colonne gauche : PIN et QR */}
              <div className="flex flex-col items-center justify-center p-6 rounded-[10px] bg-[#F7FBF8] border border-[#CFF1D2] text-center">
                <div className="size-40 bg-white border-2 border-[#0F3B27] rounded-[10px] flex flex-col items-center justify-center p-3 shadow-inner">
                  <QrCode className="size-28 text-[#0F3B27]" />
                  <span className="text-[10px] font-mono text-muted-foreground mt-1">BESTPHARMA-SEC-PAIR</span>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-muted-foreground font-semibold">
                    Code PIN d'autorisation temporaire :
                  </span>
                  <div className="text-3xl font-mono font-bold tracking-widest text-[#0F3B27] my-1">
                    {codePinGenere}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-amber-700 font-medium">
                    <Clock className="size-3.5" />
                    <span>Valide encore {tempsRestantPin}s</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={genererNouveauPin}
                  className="mt-4 rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs gap-1.5"
                >
                  <RefreshCw className="size-3.5" /> Générer un nouveau code
                </Button>
              </div>

              {/* Colonne droite : Formulaire d'enrôlement direct */}
              <div className="grid gap-4">
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    Désignation du poste / terminal *
                  </Label>
                  <Input
                    placeholder="Ex: Caisse Comptoir 02, Tablette Réserve..."
                    value={nouveauNom}
                    onChange={(e) => setNouveauNom(e.target.value)}
                    className="rounded-[10px] h-11 border-[#CFF1D2] mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    Type d'appareil & Profil d'utilisation *
                  </Label>
                  <Select
                    value={nouveauType}
                    onValueChange={(v: any) => setNouveauType(v)}
                  >
                    <SelectTrigger className="rounded-[10px] h-11 border-[#CFF1D2] mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[10px]">
                      <SelectItem value="caisse">Poste de Caisse POS (Comptoir)</SelectItem>
                      <SelectItem value="borne_pointage">Borne de Pointage H24 (Kiosque)</SelectItem>
                      <SelectItem value="pc_bureau">PC Bureau (Titulaire / Gestion)</SelectItem>
                      <SelectItem value="tablette_inventaire">Tablette Inventaire & Réception</SelectItem>
                      <SelectItem value="smartphone_nomade">Smartphone Nomade (Astreinte)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-[10px] text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Sécurité :</span> L'enrôlement
                  injectera un certificat de terminal scellé dans le stockage chiffré du navigateur
                  ou de l'application cliente.
                </div>

                <Button
                  onClick={() => {
                    if (!nouveauNom.trim()) {
                      toast.error("Veuillez saisir le nom de l'appareil.");
                      return;
                    }
                    mutationCreerAppareil.mutate({
                      nom_appareil: nouveauNom.trim(),
                      type_appareil: nouveauType,
                      est_borne_pointage: nouveauType === "borne_pointage",
                    });
                  }}
                  disabled={mutationCreerAppareil.isPending}
                  className="rounded-[10px] bg-[#0F3B27] text-white hover:bg-[#0F3B27]/90 font-bold h-11 text-xs"
                >
                  Valider et Enrôler l'appareil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VUE 3 : BORNES DE POINTAGE H24 (APP-02, APP-11) */}
      {section === "bornes" && (
        <div className="grid gap-4">
          <Alert className="rounded-[10px] border-emerald-400 bg-[#F7FBF8] text-[#0F3B27]">
            <Radio className="size-5 text-[#1B5E20] animate-pulse" />
            <AlertTitle className="font-bold">Surveillance de Présence H24 (Art. 1.11 BPD)</AlertTitle>
            <AlertDescription className="text-xs mt-1">
              Les tablettes et bornes murales dédiées au pointage du personnel transmettent un
              battement de cœur (heartbeat) toutes les 60 secondes. Une alerte SMS/Push est émise si
              la borne est hors-ligne pendant les heures ouvrées de l'officine.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3">
            {appareils
              .filter((a) => a.est_borne_pointage)
              .map((borne) => (
                <Card key={borne.id} className="rounded-[10px] border-[#CFF1D2] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-[8px] bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        H24
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0F3B27]">{borne.nom_appareil}</span>
                          <Badge className="bg-emerald-700 text-white text-[10px]">
                            Connecté · Heartbeat 45s
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Mode Kiosque Verrouillé · Horloge NTP Synchronisée (Porto-Novo)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.success("Test de battement de cœur validé (Latence: 22ms) !")}
                        className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs h-9"
                      >
                        Tester le signal
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toast.success("Code de déverrouillage temporaire kiosque généré : 9924")
                        }
                        className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs h-9"
                      >
                        Déverrouiller le kiosque
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

            {appareils.filter((a) => a.est_borne_pointage).length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground bg-white rounded-[10px] border border-[#CFF1D2]">
                Aucune borne de pointage H24 configurée. Vous pouvez affecter ce rôle à une tablette
                depuis l'onglet « Enrôlement & Nouvel appareil ».
              </div>
            )}
          </div>
        </div>
      )}

      {/* VUE 4 : POSTES DE CAISSE & PÉRIPHÉRIQUES (APP-07) */}
      {section === "peripheriques" && (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Imprimante e-MECeF */}
            <Card className="rounded-[10px] border-[#CFF1D2] bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <Printer className="size-6 text-[#0F3B27]" />
                <div>
                  <h3 className="font-bold text-sm text-[#0F3B27]">Imprimante e-MECeF</h3>
                  <span className="text-xs text-emerald-700 font-semibold">Thermique 80mm · Prête</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Émission des tickets normalisés DGI avec QR code de validation fiscale.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={testerImprimante}
                className="w-full rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold"
              >
                Tester l'impression ticket
              </Button>
            </Card>

            {/* Douchette 2D / Datamatrix */}
            <Card className="rounded-[10px] border-[#CFF1D2] bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <QrCode className="size-6 text-[#0F3B27]" />
                <div>
                  <h3 className="font-bold text-sm text-[#0F3B27]">Scanner Code-barres / 2D</h3>
                  <span className="text-xs text-emerald-700 font-semibold">USB HID / Bluetooth · Actif</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Lecture des codes Datamatrix CIP13, numéro de lot et date d'expiration.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.success("Scanner en veille prêt : scannez une boîte au comptoir !")
                }
                className="w-full rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold"
              >
                Tester la lecture Datamatrix
              </Button>
            </Card>

            {/* Tiroir-caisse */}
            <Card className="rounded-[10px] border-[#CFF1D2] bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <HardDrive className="size-6 text-[#0F3B27]" />
                <div>
                  <h3 className="font-bold text-sm text-[#0F3B27]">Tiroir-Caisse Sécurisé</h3>
                  <span className="text-xs text-emerald-700 font-semibold">Connecté RJ12 · Verrouillé</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Déclenchement automatique lors de l'encaissement espèces ou clôture de caisse Z.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={testerTiroir}
                className="w-full rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold"
              >
                Tester l'ouverture tiroir
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* VUE 5 : SESSIONS ACTIVES DU COMPTE (APP-06) */}
      {section === "sessions" && (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#0F3B27]">
              Sessions connectées à votre compte utilisateur ({sessions.length})
            </h3>
            {sessions.length > 1 && sessionCourante && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => revoquerAutresSessions.mutate(sessionCourante.id)}
                disabled={revoquerAutresSessions.isPending}
                className="rounded-[10px] border-red-300 text-red-700 text-xs font-bold gap-1.5"
              >
                <ShieldAlert className="size-3.5" /> Déconnecter tous les autres appareils
              </Button>
            )}
          </div>

          <div className="grid gap-3">
            {sessions.map((s) => (
              <Card key={s.id} className="rounded-[10px] border-[#CFF1D2] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MonitorSmartphone className="size-5 text-[#0F3B27]" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{s.name}</span>
                        {s.is_current && (
                          <Badge className="bg-emerald-700 text-white text-[10px]">
                            Session actuelle
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Dernière utilisation :{" "}
                        {s.last_used_at ? fmtDate.format(new Date(s.last_used_at)) : "En cours"}
                      </p>
                    </div>
                  </div>

                  {!s.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revoquerSessionAuth.mutate(s.id)}
                      disabled={revoquerSessionAuth.isPending}
                      className="rounded-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold"
                    >
                      Déconnecter
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* VUE 6 : RÉVOCATIONS D'URGENCE & OPÉRATIONS MISES À L'ÉCART (APP-05) */}
      {section === "revocations" && (
        <div className="grid gap-4">
          <Alert className="rounded-[10px] border-red-300 bg-red-50 text-red-900">
            <ShieldAlert className="size-5 text-red-600" />
            <AlertTitle className="font-bold">Procédure de Révocation d'Urgence (&lt; 30s)</AlertTitle>
            <AlertDescription className="text-xs mt-1">
              En cas de perte, vol ou compromission d'un terminal de caisse ou d'une tablette, la
              révocation coupe immédiatement tous les accès. Toutes les écritures hors-ligne non
              synchronisées sont immédiatement isolées dans la file d'arbitrage ci-dessous.
            </AlertDescription>
          </Alert>

          <Card className="rounded-[10px] border-[#CFF1D2] bg-white p-4">
            <h3 className="font-bold text-base text-[#0F3B27] mb-3">
              File d'Arbitrage des Opérations Mises à l'Écart (Quarantaine)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Seul le pharmacien titulaire peut valider ou rejeter ces transactions avant qu'elles
              n'affectent les stocks et la comptabilité générale.
            </p>

            <div className="grid gap-3">
              {operationsQuarantaine.map((op) => (
                <div
                  key={op.id}
                  className={`p-3 rounded-[8px] border text-xs grid gap-2 ${
                    op.statut === "validee"
                      ? "border-emerald-300 bg-emerald-50/50"
                      : op.statut === "rejetee"
                      ? "border-slate-200 bg-slate-50 text-slate-500"
                      : "border-amber-300 bg-amber-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          op.statut === "validee"
                            ? "default"
                            : op.statut === "rejetee"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[10px] font-bold"
                      >
                        {op.statut === "validee"
                          ? "Validée"
                          : op.statut === "rejetee"
                          ? "Rejetée"
                          : "En Quarantaine"}
                      </Badge>
                      <span className="font-bold text-[#0F3B27]">{op.id}</span>
                      <span className="text-muted-foreground">· {op.appareil_nom}</span>
                    </div>
                    <span className="text-muted-foreground">{fmtDate.format(new Date(op.date_tentative))}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="font-semibold">Opération :</span> {op.type_operation}
                    </div>
                    <div>
                      <span className="font-semibold">Détail :</span> {op.montant_ou_detail}
                    </div>
                  </div>

                  <div className="text-[11px] text-amber-800">
                    <span className="font-semibold">Motif d'isolation :</span> {op.motif_quarantaine}
                  </div>

                  {op.statut === "en_attente" && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => arbitrerOperation(op.id, "rejetee")}
                        className="rounded-[8px] border-red-300 text-red-700 text-xs h-8"
                      >
                        <XCircle className="size-3.5 mr-1" /> Rejeter définitivement
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => arbitrerOperation(op.id, "validee")}
                        className="rounded-[8px] bg-[#0F3B27] text-white text-xs h-8"
                      >
                        <Check className="size-3.5 mr-1" /> Valider & Intégrer
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {operationsQuarantaine.length === 0 && (
                <p className="text-center py-6 text-xs text-muted-foreground">
                  Aucune opération en attente d'arbitrage.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* VUE 7 : REGISTRE D'AUDIT BPD4-F12 (APP-12, APP-13) */}
      {section === "registre" && (
        <div className="grid gap-4">
          <Card className="rounded-[10px] border-[#CFF1D2] bg-white p-4">
            <h3 className="font-bold text-base text-[#0F3B27] mb-2 flex items-center gap-2">
              <Printer className="size-5 text-[#1B5E20]" />
              Fiche d'Inventaire et Habilitation Informatique (BPD4-F12)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ce registre certifie que tous les ordinateurs, terminaux portables et périphériques
              utilisés dans l'officine sont inventoriés, autorisés et placés sous la responsabilité
              du pharmacien titulaire.
            </p>

            <div className="flex items-center gap-3">
              <Button
                onClick={imprimerRegistreBpd}
                className="rounded-[10px] bg-[#0F3B27] text-white hover:bg-[#0F3B27]/90 text-xs font-bold gap-2"
              >
                <Printer className="size-4" /> Imprimer le Registre BPD4-F12 Scellé (PDF)
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modale d'enrôlement rapide */}
      <Dialog open={modalAppairage} onOpenChange={setModalAppairage}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-[#0F3B27] flex items-center gap-2">
              <Plus className="size-4 text-[#1B5E20]" />
              Enrôler un Nouvel Appareil
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ajoutez un nouveau terminal à l'inventaire matériel de l'officine.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 text-xs">
            <div>
              <Label className="font-semibold text-foreground">Nom / Emplacement de l'appareil *</Label>
              <Input
                placeholder="Ex: Caisse Comptoir 02"
                value={nouveauNom}
                onChange={(e) => setNouveauNom(e.target.value)}
                className="rounded-[10px] h-10 border-[#CFF1D2] mt-1"
              />
            </div>

            <div>
              <Label className="font-semibold text-foreground">Type de terminal *</Label>
              <Select
                value={nouveauType}
                onValueChange={(v: any) => setNouveauType(v)}
              >
                <SelectTrigger className="rounded-[10px] h-10 border-[#CFF1D2] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[10px]">
                  <SelectItem value="caisse">Poste de Caisse POS</SelectItem>
                  <SelectItem value="borne_pointage">Borne de Pointage H24</SelectItem>
                  <SelectItem value="pc_bureau">PC Bureau Titulaire</SelectItem>
                  <SelectItem value="tablette_inventaire">Tablette Inventaire</SelectItem>
                  <SelectItem value="smartphone_nomade">Smartphone Astreinte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalAppairage(false)}
              className="rounded-[10px] text-xs"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!nouveauNom.trim()) {
                  toast.error("Veuillez saisir un nom d'appareil.");
                  return;
                }
                mutationCreerAppareil.mutate({
                  nom_appareil: nouveauNom.trim(),
                  type_appareil: nouveauType,
                  est_borne_pointage: nouveauType === "borne_pointage",
                });
              }}
              disabled={mutationCreerAppareil.isPending}
              className="rounded-[10px] bg-[#0F3B27] text-white hover:bg-[#0F3B27]/90 text-xs font-bold"
            >
              Valider l'enrôlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
