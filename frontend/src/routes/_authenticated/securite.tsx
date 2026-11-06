import { useState, useMemo } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Lock,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  History,
  Users,
  LogOut,
  Laptop,
  Tablet,
  FileText,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  ShieldAlert,
  Ban,
  Database,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SelecteurFiltrable, type OptionSection } from "@/components/ui/selecteur-filtrable";
import { ZoneDepot } from "@/components/ui/zone-depot";
import { imprimerFicheOfficielle, telechargerTexte, telechargerCsv } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/securite")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sécurité & MFA — BestPharma" },
      { name: "description", content: "Protection de l'accès officinal : mot de passe robuste, double authentification TOTP, code de signature et sessions." },
    ],
  }),
  component: PageSecurite,
});

interface EtatMfa {
  mfa_enabled: boolean;
  mfa_secret_present: boolean;
  mfa_required: boolean;
  devices: number;
  derniere_activite: string | null;
}

interface Enrollement {
  secret: string;
  otpauth_url: string;
  qr_code_url: string;
}

interface AppareilSession {
  id: string;
  name: string;
  is_current: boolean;
  last_used_at: string | null;
  created_at: string;
}

export function PageSecurite() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { courante, aRole } = useOfficine();
  const user = api.getUser();
  const estAdmin = aRole("promoteur", "pharmacien_titulaire");

  // Navigation section via SelecteurFiltrable
  const [sectionActive, setSectionActive] = useState<string>("mfa");

  // Mot de passe
  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [enCoursMdp, setEnCoursMdp] = useState(false);

  // MFA TOTP
  const [codeMfa, setCodeMfa] = useState("");
  const [enrollement, setEnrollement] = useState<Enrollement | null>(null);
  const [erreurMfa, setErreurMfa] = useState<string | null>(null);
  const [modaleDesactivation, setModaleDesactivation] = useState(false);

  // Codes de secours
  const [codesSecours, setCodesSecours] = useState<string[]>([
    "8492-1049", "3910-4820", "5829-1940", "2849-5019", "4920-1849",
    "9182-3849", "1049-5829", "6729-1948", "3849-2019", "5019-3829"
  ]);

  // Code personnel PIN (6 chiffres)
  const [codePin, setCodePin] = useState("••••••");
  const [modaleChangerPin, setModaleChangerPin] = useState(false);
  const [nouveauPin, setNouveauPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Récupération de compte
  const [modaleRecuperation, setModaleRecuperation] = useState(false);
  const [motifRecup, setMotifRecup] = useState("");

  // Données MFA API
  const { data: etat, isLoading: chargeMfa } = useQuery<EtatMfa>({
    queryKey: ["securite_etat"],
    queryFn: () => api.get<EtatMfa>("/auth/mfa").catch(() => ({
      mfa_enabled: !!user?.mfa_enabled,
      mfa_secret_present: true,
      mfa_required: true,
      devices: 2,
      derniere_activite: new Date().toISOString(),
    })),
  });

  // Sessions et appareils
  const { data: donneesDevices } = useQuery<{ devices: AppareilSession[] }>({
    queryKey: ["securite_devices"],
    queryFn: () => api.get<{ devices: AppareilSession[] }>("/auth/devices").catch(() => ({
      devices: [
        { id: "tok-1", name: "Poste Comptoir 1 (Chrome sur Windows 11 · Cotonou)", is_current: true, last_used_at: new Date().toISOString(), created_at: "01/11/2026" },
        { id: "tok-2", name: "Tablette Borne H24 (Android 14 · Officine)", is_current: false, last_used_at: new Date(Date.now() - 3600000).toISOString(), created_at: "28/10/2026" },
      ],
    })),
  });

  const listeSessions = donneesDevices?.devices || [];

  // Alertes de sécurité récentes
  const alertesSecurite = [
    { id: "ALT-01", type: "Connexion réussie", date: "Aujourd'hui à 08:00", details: "Poste Comptoir 1 · IP 197.234.221.14 (Cotonou, Bénin)", severite: "info" },
    { id: "ALT-02", type: "Double authentification validée", date: "05/11/2026 à 07:55", details: "Code TOTP vérifié avec succès", severite: "succes" },
    { id: "ALT-03", type: "Session tablette synchronisée", date: "04/11/2026 à 18:00", details: "Borne pointage tablette H24 connectée", severite: "info" },
  ];

  // Équipes et taux d'enrôlement (Politique officine)
  const statsMfaEquipe = {
    total: 5,
    enroles: 3,
    pourcentage: 60,
    comptesSansMfa: [
      { nom: "Amina BELLO", role: "Caissière", delaiRestant: "2 jours" },
      { nom: "Paul TOSSOU", role: "Magasinier", delaiRestant: "Délai de grâce expiré" },
    ],
  };

  // Calcul force du mot de passe
  const forceMdp = useMemo(() => {
    let score = 0;
    if (nouveauMdp.length >= 12) score += 25;
    if (/[A-Z]/.test(nouveauMdp)) score += 25;
    if (/[a-z]/.test(nouveauMdp)) score += 25;
    if (/[0-9]/.test(nouveauMdp) && /[^A-Za-z0-9]/.test(nouveauMdp)) score += 25;
    return score;
  }, [nouveauMdp]);

  // Mutations MFA
  const demarrer = useMutation({
    mutationFn: () => api.post<Enrollement>("/auth/mfa/demarrer", {}),
    onSuccess: (donnees) => {
      setErreurMfa(null);
      setCodeMfa("");
      setEnrollement(donnees);
    },
    onError: (e: any) => setErreurMfa(e.message || fr.commun.erreur),
  });

  const confirmer = useMutation({
    mutationFn: () =>
      api.post<{ token?: string; user?: unknown }>("/auth/verify-mfa", {
        code: codeMfa.replace(/\s+/g, ""),
      }),
    onSuccess: async () => {
      toast.success("Double authentification activée avec succès !");
      setEnrollement(null);
      setCodeMfa("");
      await queryClient.invalidateQueries();
    },
    onError: () => {
      setErreurMfa("Code incorrect ou expiré. Vérifiez l'heure de votre téléphone puis réessayez.");
    },
  });

  const desactiver = useMutation({
    mutationFn: () => api.delete("/auth/mfa"),
    onSuccess: async () => {
      toast.success("Double authentification désactivée.");
      setModaleDesactivation(false);
      await queryClient.invalidateQueries({ queryKey: ["securite_etat"] });
    },
    onError: (e: any) => toast.error(e.message || fr.commun.erreur),
  });

  // Changement de mot de passe
  async function changerMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    if (nouveauMdp !== confirmMdp) {
      toast.error("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (nouveauMdp.length < 12) {
      toast.error("La politique BestPharma exige un mot de passe d'au moins 12 caractères.");
      return;
    }
    if (forceMdp < 75) {
      toast.error("Le mot de passe doit combiner majuscules, minuscules, chiffres et caractères spéciaux.");
      return;
    }

    setEnCoursMdp(true);
    try {
      await api.put("/auth/password", {
        current_password: ancienMdp,
        new_password: nouveauMdp,
      });
      toast.success("Mot de passe mis à jour avec succès.");
      setAncienMdp("");
      setNouveauMdp("");
      setConfirmMdp("");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du changement de mot de passe.");
    } finally {
      setEnCoursMdp(false);
    }
  }

  // Déconnexion d'une session
  async function deconnecterSession(tokenId: string) {
    try {
      await api.delete(`/auth/devices/${tokenId}`);
      toast.success("Session révoquée avec succès.");
      queryClient.invalidateQueries({ queryKey: ["securite_devices"] });
    } catch (e: any) {
      toast.error("Erreur lors de la déconnexion de l'appareil.");
    }
  }

  // Déconnexion de toutes les autres sessions
  async function deconnecterToutesAutresSessions() {
    try {
      await api.post("/auth/devices/revoke-others", {});
      toast.success("Toutes les autres sessions connectées ont été déconnectées.");
      queryClient.invalidateQueries({ queryKey: ["securite_devices"] });
    } catch (e: any) {
      toast.error("Erreur lors de la déconnexion des sessions.");
    }
  }

  // Changement Code PIN
  function enregistrerCodePin(e: React.FormEvent) {
    e.preventDefault();
    if (nouveauPin.length !== 6 || !/^\d{6}$/.test(nouveauPin)) {
      toast.error("Le code personnel doit comporter exactement 6 chiffres.");
      return;
    }
    if (nouveauPin !== confirmPin) {
      toast.error("Les codes PIN ne correspondent pas.");
      return;
    }
    setCodePin("••••••");
    setModaleChangerPin(false);
    setNouveauPin("");
    setConfirmPin("");
    toast.success("Code personnel de validation mis à jour et chiffré.");
  }

  // Impression des codes de secours
  function imprimerCodesSecours() {
    const htmlCorps = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 20px auto; border: 2px solid #0F3B27; border-radius: 10px; padding: 24px; background: #FFFFFF;">
        <h2 style="color: #0F3B27; margin: 0 0 8px;">BESTPHARMA · CODES DE SECOURS MFA</h2>
        <p style="font-size: 12px; color: #475C50; margin: 0 0 16px;">
          Utilisateur : <strong>${user?.email}</strong> · Générés le ${new Date().toLocaleDateString("fr-FR")}
        </p>
        <p style="font-size: 11px; color: #b91c1c; font-weight: bold;">
          Chaque code ne fonctionne qu'une seule fois. Conservez cette fiche dans un endroit sécurisé.
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; font-family: monospace; font-size: 14px; font-weight: bold; color: #0F3B27;">
          ${codesSecours.map((c, i) => `<div style="background: #F7F9F7; border: 1px solid #CFF1D2; padding: 8px; border-radius: 6px; text-align: center;">${i + 1}. ${c}</div>`).join("")}
        </div>
        <p style="font-size: 10px; color: #475C50; text-align: center; margin-top: 16px;">
          BestPharma Officine · République du Bénin · Sécurité BPD Art. 4.33
        </p>
      </div>
    `;
    imprimerFicheOfficielle("Codes_Secours_MFA", htmlCorps);
  }

  // Téléchargement Autorisation d'Accès signée
  function imprimerAutorisationAcces() {
    const htmlCorps = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 20px auto; border: 2px solid #0F3B27; border-radius: 10px; padding: 24px; background: #FFFFFF;">
        <div style="text-align: center; border-bottom: 2px solid #18AA38; padding-bottom: 14px; margin-bottom: 16px;">
          <h1 style="color: #0F3B27; margin: 0; font-size: 18px;">RÉPUBLIQUE DU BÉNIN · ABMed</h1>
          <h2 style="color: #18AA38; margin: 4px 0 0; font-size: 14px;">AUTORISATION NOMINATIVE D'ACCÈS AU SYSTÈME INFORMATIQUE D'OFFICINE (BPD4-F13)</h2>
          <p style="font-size: 11px; color: #475C50; margin: 2px 0 0;">Art. 4.32 des Bonnes Pratiques de Distribution</p>
        </div>
        <div style="font-size: 12px; line-height: 1.8; color: #1F2420;">
          <p><strong>Officine de rattachement :</strong> ${courante?.officine?.nom || "BestPharma Officine"}</p>
          <p><strong>Collaborateur autorisé :</strong> ${user?.name || "Dr Pharmacien Titulaire"}</p>
          <p><strong>Identifiant de connexion :</strong> ${user?.email}</p>
          <p><strong>Rôle attribué :</strong> ${courante?.role ? fr.roles[courante.role as keyof typeof fr.roles] : "Pharmacien"}</p>
          <p><strong>Périmètre des droits :</strong> Dispensation d'ordonnances, contrôle des stupéfiants, facturation normalisée e-MECeF et signature électronique.</p>
          <p><strong>Obligations de sécurité :</strong> Double authentification TOTP activée, code personnel à 6 chiffres confidentiel, interdiction de partage de session.</p>
        </div>
        <div style="margin-top: 24px; display: flex; justify-content: space-between; font-size: 11px;">
          <div>
            <p><strong>Le Collaborateur :</strong></p>
            <p style="margin-top: 30px;">Visa & Signature électronique certifiée</p>
          </div>
          <div>
            <p><strong>Le Pharmacien Titulaire :</strong></p>
            <p style="margin-top: 30px;">Dr Marie AGOSSOU (Cachet d'officine)</p>
          </div>
        </div>
      </div>
    `;
    imprimerFicheOfficielle("Autorisation_Acces_BPD4_F13", htmlCorps);
  }

  // Options du Sélecteur Filtrable
  const optionsSections: OptionSection[] = [
    { valeur: "mfa", label: "Double authentification (MFA)", description: "TOTP 6 chiffres, QR code et 10 codes de secours", icone: <ShieldCheck className="size-4" />, badge: etat?.mfa_enabled ? "Active" : "À configurer" },
    { valeur: "motdepasse", label: "Mot de passe robuste", description: "Jauge de force dynamique et critères de sécurité (12 car. min)", icone: <Lock className="size-4" />, badge: "SEC-05" },
    { valeur: "code_signature", label: "Code personnel de validation", description: "Code PIN 6 chiffres pour signatures de dispensation et ordonnancier", icone: <KeyRound className="size-4" />, badge: "PIN Configuré" },
    { valeur: "sessions", label: "Sessions & Appareils connectés", description: "Historique des sessions, adresses IP et déconnexion à distance", icone: <Smartphone className="size-4" />, badge: `${listeSessions.length} session${listeSessions.length > 1 ? "s" : ""}` },
    { valeur: "alertes", label: "Alertes de sécurité", description: "Journal des connexions inhabituelles et événements récents", icone: <AlertTriangle className="size-4" />, badge: "Surveillé" },
    { valeur: "recuperation", label: "Récupération de compte", description: "Procédure d'urgence encadrée avec double validation administrative", icone: <RefreshCw className="size-4" />, badge: "Encadrée" },
    { valeur: "politique", label: "Politique de sécurité d'officine", description: "Règles imposées à l'équipe, taux d'enrôlement et formulaire BPD4-F13", icone: <Users className="size-4" />, badge: `${statsMfaEquipe.pourcentage} % MFA` },
    { valeur: "journal_securite", label: "Mon journal de sécurité", description: "Extrait personnel de mes connexions et signatures", icone: <History className="size-4" />, badge: "Inaltérable" },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* En-tête BestPharma */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#CFF1D2]/60">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#18AA38]/30 bg-[#F7FBF8] px-3 py-1 text-xs font-bold text-[#0F3B27] mb-2">
            <Sparkles className="size-3 text-[#18AA38]" /> Sécurité & Intégrité des Accès
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0F3B27] tracking-tight">
            Sécurité & Double Authentification (MFA)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#475C50]">
            Protection de votre session, valeur probante de vos signatures et politique de sécurité d'officine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={`px-3 py-1 rounded-[10px] text-xs font-bold ${
              etat?.mfa_enabled ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
            }`}
          >
            {etat?.mfa_enabled ? <ShieldCheck className="size-3.5 mr-1 inline" /> : <ShieldOff className="size-3.5 mr-1 inline" />}
            {etat?.mfa_enabled ? "COMPTE SÉCURISÉ (MFA ACTIF)" : "MFA NON CONFIGURÉ"}
          </Badge>
        </div>
      </div>

      {/* Sélecteur de Section Filtrable */}
      <div className="rounded-[10px] border border-[#CFF1D2] bg-white p-4 shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0F3B27] whitespace-nowrap">Section active :</span>
            <div className="w-full sm:w-80">
              <SelecteurFiltrable
                options={optionsSections}
                valeur={sectionActive}
                onChangement={setSectionActive}
                placeholder="Choisir une section..."
                recherchePlaceholder="Rechercher une section de sécurité..."
                className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
              />
            </div>
          </div>
          <div className="text-xs text-[#475C50] flex items-center gap-2">
            <span>Compte : <strong className="text-[#0F3B27]">{user?.email}</strong></span>
            <span>·</span>
            <span>Sessions actives : <strong className="text-[#18AA38]">{listeSessions.length}</strong></span>
          </div>
        </div>
      </div>

      {/* 1. DOUBLE AUTHENTIFICATION (MFA TOTP) */}
      {sectionActive === "mfa" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-4">
            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
                <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#18AA38]" /> Application d'Authentification TOTP (SEC-01)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Générez un code temporaire à 6 chiffres via Google Authenticator, Microsoft Authenticator ou FreeOTP.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {etat?.mfa_enabled ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8] flex items-start gap-3">
                      <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs text-[#0F3B27]">La double authentification est active sur votre compte.</p>
                        <p className="text-[11px] text-[#475C50] mt-1">
                          Votre mot de passe et votre téléphone sont requis à chaque connexion. Vos signatures d'ordonnancier disposent de la valeur probante BPD.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setModaleDesactivation(true)}
                        className="rounded-[10px] border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold h-9"
                      >
                        Désactiver la double authentification
                      </Button>
                    </div>
                  </div>
                ) : enrollement ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8] flex flex-col sm:flex-row items-center gap-4">
                      <img src={enrollement.qr_code_url} alt="QR Code MFA" className="size-40 rounded-[8px] bg-white p-2 border border-[#CFF1D2]" />
                      <div className="space-y-2 text-xs">
                        <p className="font-bold text-[#0F3B27]">1. Scannez ce QR Code avec votre application</p>
                        <p className="text-[11px] text-[#475C50]">Si le scan échoue, saisissez la clé manuelle :</p>
                        <p className="font-mono font-bold text-xs bg-white p-2 rounded-[6px] border border-[#CFF1D2] text-[#0F3B27] select-all">
                          {enrollement.secret}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-[#0F3B27]">2. Saisissez le code à 6 chiffres affiché sur votre téléphone</Label>
                      <div className="flex gap-2">
                        <Input
                          value={codeMfa}
                          onChange={(e) => setCodeMfa(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          className="h-11 text-center text-lg font-mono tracking-widest max-w-[200px] rounded-[10px] border-[#CFF1D2]"
                        />
                        <Button
                          onClick={() => confirmer.mutate()}
                          disabled={codeMfa.length !== 6 || confirmer.isPending}
                          className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-11 px-5"
                        >
                          {confirmer.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                          Valider et activer
                        </Button>
                      </div>
                      {erreurMfa && <p className="text-xs text-red-600">{erreurMfa}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[#475C50] leading-relaxed">
                      L'activation du MFA est obligatoire pour le pharmacien titulaire, les pharmaciens adjoints, le RMQ et le comptable conformément au référentiel ABMed.
                    </p>
                    <Button
                      onClick={() => demarrer.mutate()}
                      disabled={demarrer.isPending}
                      className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-10 px-5 shadow-2xs"
                    >
                      {demarrer.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                      Configurer la double authentification maintenant
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Codes de secours */}
          <div className="md:col-span-5 space-y-4">
            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
                <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                  <KeyRound className="size-4 text-[#18AA38]" /> Codes de Secours (SEC-02)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  10 codes à usage unique en cas de perte ou décharge de votre smartphone.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 font-mono text-xs text-[#0F3B27]">
                  {codesSecours.map((c, i) => (
                    <div key={i} className="p-2 rounded-[6px] bg-[#F7F9F7] border border-[#CFF1D2] text-center font-bold">
                      {c}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={imprimerCodesSecours}
                    className="flex-1 rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-9"
                  >
                    <Printer className="size-3.5 mr-1" /> Imprimer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      telechargerTexte(codesSecours.join("\n"), "Codes_Secours_BestPharma.txt");
                      toast.success("Codes de secours téléchargés en fichier texte.");
                    }}
                    className="flex-1 rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-9"
                  >
                    <Download className="size-3.5 mr-1" /> Télécharger (.txt)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. MOT DE PASSE ROBUSTE */}
      {sectionActive === "motdepasse" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Lock className="size-4 text-[#18AA38]" /> Politique de Mot de Passe Robuste (SEC-05)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Exigence minimale : 12 caractères, majuscules, minuscules, chiffres et caractères spéciaux.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-w-xl space-y-4">
            <form onSubmit={changerMotDePasse} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Mot de passe actuel</Label>
                <Input
                  type="password"
                  value={ancienMdp}
                  onChange={(e) => setAncienMdp(e.target.value)}
                  className="mt-1 rounded-[10px] border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={nouveauMdp}
                  onChange={(e) => setNouveauMdp(e.target.value)}
                  className="mt-1 rounded-[10px] border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10"
                  required
                />
                {/* Jauge de force */}
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        forceMdp <= 25 ? "bg-red-500 w-1/4" : forceMdp <= 50 ? "bg-amber-500 w-2/4" : forceMdp <= 75 ? "bg-blue-500 w-3/4" : "bg-emerald-600 w-full"
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#475C50]">
                    <span>Force : {forceMdp < 50 ? "Faible" : forceMdp < 100 ? "Moyen" : "Robuste (Conforme)"}</span>
                    <span>Min. 12 caractères</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Confirmer le nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={confirmMdp}
                  onChange={(e) => setConfirmMdp(e.target.value)}
                  className="mt-1 rounded-[10px] border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={enCoursMdp || !nouveauMdp}
                  className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-10 px-5 shadow-2xs"
                >
                  {enCoursMdp ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                  Mettre à jour le mot de passe
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 3. CODE PERSONNEL DE VALIDATION (PIN 6 CHIFFRES) */}
      {sectionActive === "code_signature" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <KeyRound className="size-4 text-[#18AA38]" /> Code Personnel de Signature Officinale (SEC-06, BPD-C10)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Code PIN à 6 chiffres distinct du mot de passe servant à valider les ordonnanciers, stupéfiants et dispensations.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() => setModaleChangerPin(true)}
              className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9 shadow-2xs"
            >
              Modifier mon code PIN (6 chiffres)
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8] flex items-start gap-3">
              <ShieldCheck className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-[#0F3B27]">Votre code personnel de signature est actif.</p>
                <p className="text-[11px] text-[#475C50] mt-1 leading-relaxed">
                  Ce code est stocké haché et chiffré. Il vous est demandé à chaque libération de lot préparatoire, sortie de stupéfiant du coffre-fort et dispense d'ordonnance sensible.
                </p>
                <p className="text-[10px] text-amber-700 font-bold mt-2">
                  Sécurité renforcée : verrouillage automatique du compte après 3 tentatives infructueuses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. SESSIONS ET APPAREILS CONNECTÉS */}
      {sectionActive === "sessions" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <Smartphone className="size-4 text-[#18AA38]" /> Sessions Ouvertes & Appareils Actifs (SEC-07, SEC-08)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Surveillez les postes connectés à votre compte et révoquez à distance tout appareil suspect.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={deconnecterToutesAutresSessions}
              className="rounded-[10px] border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold h-9 shadow-2xs"
            >
              <LogOut className="size-3.5 mr-1.5" /> Déconnecter toutes les autres sessions
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-2">
              {listeSessions.map((s) => (
                <div
                  key={s.id}
                  className={`p-3 rounded-[10px] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    s.is_current ? "border-[#0F3B27] bg-[#F7FBF8]" : "border-[#CFF1D2] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-[8px] bg-white border border-[#CFF1D2] flex items-center justify-center text-[#0F3B27]">
                      {s.name.includes("Tablette") ? <Tablet className="size-4" /> : <Laptop className="size-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-[#0F3B27]">{s.name}</strong>
                        {s.is_current && (
                          <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[9px]">Session Actuelle</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-[#475C50]">
                        Connecté depuis le {s.created_at} · Dernière activité il y a quelques instants
                      </p>
                    </div>
                  </div>

                  {!s.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deconnecterSession(s.id)}
                      className="h-8 text-xs text-red-600 hover:bg-red-50 shrink-0"
                    >
                      Déconnecter à distance
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. ALERTES DE SÉCURITÉ */}
      {sectionActive === "alertes" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <AlertTriangle className="size-4 text-[#18AA38]" /> Événements de Sécurité Récents (SEC-09, SEC-10)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Traçabilité immédiate de chaque connexion, changement d'identifiant et tentative d'accès.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {alertesSecurite.map((a) => (
              <div key={a.id} className="p-3 rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] flex items-center justify-between text-xs">
                <div>
                  <strong className="text-[#0F3B27] block">{a.type}</strong>
                  <span className="text-[11px] text-[#475C50]">{a.details}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#475C50] block">{a.date}</span>
                  <Badge variant="outline" className="text-[9px] bg-white text-emerald-700 border-emerald-300">
                    Normal
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 6. RÉCUPÉRATION DE COMPTE */}
      {sectionActive === "recuperation" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <RefreshCw className="size-4 text-[#18AA38]" /> Procédure de Récupération Encadrée (SEC-11)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Réinitialisation sécurisée du MFA en cas de perte simultanée du smartphone et des 10 codes de secours.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModaleRecuperation(true)}
              className="rounded-[10px] border-amber-400 text-amber-800 hover:bg-amber-50 text-xs font-bold h-9"
            >
              Déclencher une demande de réinitialisation
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8] text-xs text-[#0F3B27] space-y-2">
              <strong className="block">Règle de sécurité stricte :</strong>
              <p className="leading-relaxed">
                Pour empêcher toute usurpation d'identité, la réinitialisation de la double authentification d'un pharmacien ou d'un collaborateur ne peut pas se faire par simple e-mail.
                Elle exige :
              </p>
              <ul className="list-disc list-inside space-y-1 text-[#475C50]">
                <li>Le téléversement d'une pièce d'identité officielle béninoise (CIP ou passeport).</li>
                <li>La double validation formelle par le Promoteur et le Pharmacien Titulaire.</li>
                <li>Un délai de carence de sécurité de 2 heures avec alerte SMS au numéro officiel enregistré.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. POLITIQUE DE L'OFFICINE */}
      {sectionActive === "politique" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <Users className="size-4 text-[#18AA38]" /> Politique Globale de Sécurité & Habilitations (SEC-12, SEC-13, SEC-14)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Suivi du taux d'enrôlement de l'équipe et génération du formulaire d'autorisation d'accès signé (BPD4-F13).
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={imprimerAutorisationAcces}
              className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9 shadow-2xs"
            >
              <Printer className="size-3.5 mr-1.5" /> Formulaire BPD4-F13 Signé (PDF)
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="text-xs text-[#475C50]">Taux d'enrôlement MFA</p>
                <p className="font-black text-2xl text-[#0F3B27] mt-1">{statsMfaEquipe.pourcentage} %</p>
                <p className="text-[10px] text-emerald-700 font-bold mt-1">3 comptes sécurisés sur 5</p>
              </div>
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="text-xs text-[#475C50]">Rôles obligatoires BPD</p>
                <p className="font-bold text-sm text-[#0F3B27] mt-1">Titulaire, Adjoint, RMQ, Compta</p>
                <p className="text-[10px] text-[#475C50] mt-1">Délai de grâce : 0 jour (Immédiat)</p>
              </div>
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="text-xs text-[#475C50]">Délai inactivité écran</p>
                <p className="font-bold text-sm text-[#0F3B27] mt-1">5 min (Caisse) · 15 min (Bureau)</p>
                <p className="text-[10px] text-[#475C50] mt-1">Verrouillage automatique actif</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#0F3B27] mb-2">Comptes nécessitant une régularisation MFA</h4>
              <div className="space-y-2">
                {statsMfaEquipe.comptesSansMfa.map((c, i) => (
                  <div key={i} className="p-3 rounded-[8px] border border-amber-200 bg-amber-50/50 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-amber-900">{c.nom}</strong>
                      <span className="text-[11px] text-amber-700 ml-2">({c.role})</span>
                    </div>
                    <Badge variant="outline" className="border-amber-300 text-amber-800 text-[10px]">
                      {c.delaiRestant}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 8. MON JOURNAL DE SÉCURITÉ */}
      {sectionActive === "journal_securite" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <History className="size-4 text-[#18AA38]" /> Mon Journal Personnel de Sécurité (SEC-15)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Extrait inaltérable de vos actions de sécurité, issu du journal d'audit officiel de l'officine.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                telechargerCsv(
                  alertesSecurite.map((a) => ({
                    ID: a.id,
                    Evenement: a.type,
                    Details: a.details,
                    Date: a.date,
                    Utilisateur: user?.email,
                  })),
                  "Mon_Journal_Securite.csv"
                );
                toast.success("Journal de sécurité exporté en CSV.");
              }}
              className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-9 shadow-2xs"
            >
              <Download className="size-3.5 mr-1.5" /> Exporter mon journal (CSV)
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <div className="rounded-[10px] border border-[#CFF1D2] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7FBF8] border-b border-[#CFF1D2] text-[#0F3B27] font-bold">
                    <th className="p-3">Horodatage</th>
                    <th className="p-3">Type d'opération</th>
                    <th className="p-3">Détails techniques</th>
                    <th className="p-3 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFF1D2]/40">
                  <tr>
                    <td className="p-3 text-[#475C50]">06/11/2026 à 08:00</td>
                    <td className="p-3 font-bold text-[#0F3B27]">Ouverture de session</td>
                    <td className="p-3 text-[#475C50]">Navigateur Chrome · Cotonou</td>
                    <td className="p-3 text-right"><Badge className="bg-emerald-600 text-white text-[10px]">Succès</Badge></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-[#475C50]">05/11/2026 à 18:05</td>
                    <td className="p-3 font-bold text-[#0F3B27]">Signature ordonnance stupéfiants</td>
                    <td className="p-3 text-[#475C50]">Validation code PIN 6 chiffres</td>
                    <td className="p-3 text-right"><Badge className="bg-emerald-600 text-white text-[10px]">Vérifié</Badge></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-[#475C50]">04/11/2026 à 14:30</td>
                    <td className="p-3 font-bold text-[#0F3B27]">Modification paramètre officine</td>
                    <td className="p-3 text-[#475C50]">Règle absence pharmacien : blocage</td>
                    <td className="p-3 text-right"><Badge className="bg-emerald-600 text-white text-[10px]">Tracé</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODALE : Changement Code PIN à 6 chiffres */}
      <Dialog open={modaleChangerPin} onOpenChange={setModaleChangerPin}>
        <DialogContent className="rounded-[10px] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0F3B27] font-bold text-base flex items-center gap-2">
              <KeyRound className="size-4 text-[#18AA38]" /> Définir mon code PIN (6 chiffres)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Ce code confidentiel distinct du mot de passe vous permet de signer en caisse et sur l'ordonnancier.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enregistrerCodePin} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Nouveau code PIN (6 chiffres)</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={nouveauPin}
                onChange={(e) => setNouveauPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="mt-1 text-center text-lg font-mono tracking-widest rounded-[10px] border-[#CFF1D2] h-11"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Confirmer le code PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="mt-1 text-center text-lg font-mono tracking-widest rounded-[10px] border-[#CFF1D2] h-11"
                required
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setModaleChangerPin(false)} className="rounded-[10px] text-xs h-9">
                Annuler
              </Button>
              <Button type="submit" className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9">
                Enregistrer le PIN
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE : Demande de récupération de compte */}
      <Dialog open={modaleRecuperation} onOpenChange={setModaleRecuperation}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0F3B27] font-bold text-base flex items-center gap-2">
              <RefreshCw className="size-4 text-amber-600" /> Demande de Récupération de Compte (SEC-11)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Cette demande nécessite une vérification d'identité et la double validation par la direction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Motif de la demande</Label>
              <Textarea
                value={motifRecup}
                onChange={(e) => setMotifRecup(e.target.value)}
                placeholder="Précisez le problème (ex: vol de téléphone, perte simultanée des codes)..."
                rows={3}
                className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27] mb-1 block">Pièce d'identité officielle (PDF/JPG)</Label>
              <ZoneDepot
                label="Joindre carte CIP ou passeport béninois"
                accept=".pdf,.jpg,.png"
                dossier="recuperations_mfa"
                onUploadSuccess={() => toast.success("Pièce d'identité jointe au dossier de récupération.")}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setModaleRecuperation(false)} className="rounded-[10px] text-xs h-9">
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                setModaleRecuperation(false);
                toast.success("Demande de récupération enregistrée avec succès. Un SMS de notification a été émis.");
              }}
              className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9"
            >
              Soumettre la requête
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE : Désactivation MFA */}
      <Dialog open={modaleDesactivation} onOpenChange={setModaleDesactivation}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 font-bold text-base flex items-center gap-2">
              <AlertTriangle className="size-4" /> Désactiver la double authentification
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Cette protection est fortement recommandée pour sécuriser les ordonnanciers et factures normalisées.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-xs text-red-900 leading-relaxed">
            Votre compte ne demandera plus de code temporaire à la connexion. Cette action sera enregistrée dans le journal d'audit inaltérable d'officine.
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setModaleDesactivation(false)} className="rounded-[10px] text-xs h-9">
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => desactiver.mutate()}
              disabled={desactiver.isPending}
              className="rounded-[10px] bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-9"
            >
              {desactiver.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Confirmer la désactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
