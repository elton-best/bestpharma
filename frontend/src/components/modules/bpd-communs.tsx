import React, { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  FileWarning,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Lock,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// ============================================================================
// 1. MODALE DE SIGNATURE PAR CODE PERSONNEL (BPD-C10)
// ============================================================================
export interface SignatureData {
  code: string;
  signataire: string;
  role: string;
  date_heure: string;
  horodatage_serveur: string;
  hash_signature?: string;
}

interface ModaleSignatureCodeProps {
  ouvert: boolean;
  onFermer: () => void;
  onSigner: (signature: SignatureData) => void | Promise<void>;
  titreAction?: string;
  descriptionAction?: string;
  articleBpd?: string;
}

export function ModaleSignatureCode({
  ouvert,
  onFermer,
  onSigner,
  titreAction = "Validation & Signature Électronique",
  descriptionAction = "Saisissez votre code PIN personnel à 4 chiffres pour apposer votre signature certifiée inaltérable.",
  articleBpd = "BPD-C10 / Art. 1.11",
}: ModaleSignatureCodeProps) {
  const [pin, setPin] = useState("");
  const [chargement, setChargement] = useState(false);
  const user = api.getUser();
  const nomSignataire = user?.name || user?.email || "Pharmacien / Responsable";
  const roleSignataire = user?.role_code || "Pharmacien Titulaire";

  async function handleValider(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) {
      toast.error("Veuillez saisir un code PIN d'au moins 4 chiffres.");
      return;
    }

    setChargement(true);
    try {
      const now = new Date();
      const dateHeureLocale = now.toLocaleString("fr-FR", {
        timeZone: "Africa/Porto-Novo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const signatureData: SignatureData = {
        code: pin,
        signataire: nomSignataire,
        role: roleSignataire,
        date_heure: dateHeureLocale,
        horodatage_serveur: now.toISOString(),
        hash_signature: `BPD-SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      };

      await onSigner(signatureData);
      toast.success("Signature électronique apposée avec succès.");
      setPin("");
      onFermer();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la validation de la signature.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(open) => !open && onFermer()}>
      <DialogContent className="max-w-md bg-white border border-[#CFF1D2] rounded-2xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-10 rounded-xl bg-[#0F3B27] flex items-center justify-center text-[#92FF5F]">
              <Lock className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#0F3B27] font-display">
                {titreAction}
              </DialogTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="border-[#92FF5F] text-[#0F3B27] bg-[#CFF1D2]/30 text-[10px]">
                  {articleBpd}
                </Badge>
                <span className="text-[11px] text-[#475C50]">Fuseau Africa/Porto-Novo</span>
              </div>
            </div>
          </div>
          <DialogDescription className="text-xs text-[#475C50] mt-2">
            {descriptionAction}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleValider} className="space-y-4 pt-2">
          {/* Cartouche d'identité certifiée */}
          <div className="p-3 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] text-[#475C50] uppercase tracking-wider font-semibold">Signataire certifié</div>
              <div className="font-bold text-[#0F3B27]">{nomSignataire}</div>
            </div>
            <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[10px] capitalize">
              {roleSignataire.replace("_", " ")}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pin-signature" className="text-xs font-bold text-[#0F3B27] flex items-center justify-between">
              <span>Code PIN personnel (4 à 6 chiffres)</span>
              <span className="text-[10px] text-muted-foreground font-normal">Saisie confidentielle</span>
            </Label>
            <div className="relative">
              <Input
                id="pin-signature"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="font-mono text-center text-xl tracking-[0.5em] h-12 bg-white border-2 border-[#CFF1D2] focus:border-[#0F3B27] rounded-xl"
                autoFocus
                required
              />
              <KeyRound className="absolute right-3 top-3.5 size-5 text-muted-foreground/40 pointer-events-none" />
            </div>
          </div>

          <div className="text-[11px] text-[#475C50] bg-emerald-50 border border-emerald-200/60 p-2.5 rounded-xl flex items-start gap-2">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Conforme <strong>BPD-C03 & C10</strong> : Cette action génère une empreinte inaltérable horodatée.
              Aucune modification ultérieure ne sera possible sans trace rectificative liée.
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onFermer}
              className="border-[#CFF1D2] text-[#475C50] hover:bg-muted"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={chargement || pin.length < 4}
              className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold gap-2"
            >
              <CheckCircle2 className="size-4" />
              {chargement ? "Vérification…" : "Signer & Valider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. BOUTON & MODALE DE DÉCLARATION NC EN UN CLIC (BPD-C05)
// ============================================================================
interface BoutonCreerNCProps {
  sourceDefaut?: string;
  zoneDefaut?: string;
  titreSuggere?: string;
  processusDefaut?: "TAM" | "QAM" | "GAD" | "GAC" | "GAR";
  graviteDefaut?: "mineure" | "majeure" | "critique";
  descriptionDefaut?: string;
  actionImmediateDefaut?: string;
  classeBouton?: string;
  libelleBouton?: string;
  iconOnly?: boolean;
  onNcCreee?: (nc: any) => void;
}

export function BoutonCreerNC({
  sourceDefaut = "interne",
  zoneDefaut = "officine",
  titreSuggere = "",
  processusDefaut = "QAM",
  graviteDefaut = "majeure",
  descriptionDefaut = "",
  actionImmediateDefaut = "",
  classeBouton = "",
  libelleBouton = "Signaler un écart / NC",
  iconOnly = false,
  onNcCreee,
}: BoutonCreerNCProps) {
  const { courante } = useOfficine();
  const id = courante?.officine_id;

  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState(titreSuggere);
  const [description, setDescription] = useState(descriptionDefaut);
  const [source, setSource] = useState(sourceDefaut);
  const [processus, setProcessus] = useState(processusDefaut);
  const [gravite, setGravite] = useState<"mineure" | "majeure" | "critique">(graviteDefaut);
  const [actionImmediate, setActionImmediate] = useState(actionImmediateDefaut);
  const [analyseCauses, setAnalyseCauses] = useState("");
  const [enCours, setEnCours] = useState(false);

  function ouvrirModale() {
    setTitre(titreSuggere || `Écart constaté - ${sourceDefaut}`);
    setDescription(descriptionDefaut);
    setSource(sourceDefaut);
    setProcessus(processusDefaut);
    setGravite(graviteDefaut);
    setActionImmediate(actionImmediateDefaut);
    setOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !titre.trim()) return;

    setEnCours(true);
    try {
      const payload = {
        titre,
        description: description || null,
        source,
        processus,
        gravite,
        action_immediate: actionImmediate || null,
        analyse_causes_5m: analyseCauses || null,
      };

      const res = await api.post<any>(`/api/officines/${id}/non-conformites`, payload);
      toast.success(
        `Fiche Non-Conformité ouverte avec succès : ${res?.numero_nc || "Enregistrée"}`,
        { description: "Visible dans le plan CAPA et le tableau de bord qualité." }
      );
      if (onNcCreee) onNcCreee(res);
      setOuvert(false);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la déclaration de non-conformité.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={ouvrirModale}
        className={`border-amber-300 text-amber-800 bg-amber-50/80 hover:bg-amber-100/80 gap-1.5 text-xs font-semibold ${classeBouton}`}
        title="Ouvrir une fiche de non-conformité en un clic (BPD-C05)"
      >
        <AlertTriangle className="size-3.5 text-amber-600" />
        {!iconOnly && <span>{libelleBouton}</span>}
      </Button>

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="max-w-lg bg-white border border-[#CFF1D2] rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-300">
                <FileWarning className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#0F3B27] font-display">
                  Déclaration Rapide de Non-Conformité (BPD-C05)
                </DialogTitle>
                <DialogDescription className="text-xs text-[#475C50]">
                  Génère automatiquement une fiche CAPA horodatée reliée au processus qualité.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Processus BPD</Label>
                <select
                  value={processus}
                  onChange={(e) => setProcessus(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2.5 font-medium"
                >
                  <option value="QAM">QAM · Système Qualité & Audit</option>
                  <option value="GAC">GAC · Achats & Chaîne du Froid</option>
                  <option value="GAD">GAD · Dispensation & Caisse</option>
                  <option value="GAR">GAR · Ressources & Locaux</option>
                  <option value="TAM">TAM · Direction & Organisation</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Gravité de l'écart</Label>
                <select
                  value={gravite}
                  onChange={(e) => setGravite(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2.5 font-bold"
                >
                  <option value="mineure" className="text-blue-700">Mineure (dysfonctionnement interne)</option>
                  <option value="majeure" className="text-amber-700">Majeure (risque qualité avéré)</option>
                  <option value="critique" className="text-red-700">Critique (chaîne du froid / stupéfiants / dispensation)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Intitulé de la Non-Conformité *</Label>
              <Input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Ex : Excursion température Frigo 2–8°C à 11.2°C"
                className="h-9 text-xs rounded-xl border-[#CFF1D2]"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Description circonstanciée & Constats</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Préciser l'heure, le matériel, le lot ou les personnes concernées…"
                className="w-full rounded-xl border border-[#CFF1D2] p-2 text-xs focus:outline-none focus:border-[#0F3B27]"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Action curative immédiate (garde-fou)</Label>
              <Input
                value={actionImmediate}
                onChange={(e) => setActionImmediate(e.target.value)}
                placeholder="Ex : Mise en quarantaine immédiate des vaccins / Arrêt de la vente"
                className="h-9 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Analyse précoce 5M / Cause racine supposée</Label>
              <Input
                value={analyseCauses}
                onChange={(e) => setAnalyseCauses(e.target.value)}
                placeholder="Ex : Matériel : compresseur arrêté suite coupure secteur"
                className="h-9 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOuvert(false)}
                className="border-[#CFF1D2] text-[#475C50]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={enCours || !titre.trim()}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold gap-1.5"
              >
                <Plus className="size-4" />
                {enCours ? "Création…" : "Enregistrer la Non-Conformité"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// 3. PILL / BADGE RÉGLEMENTAIRE BPD (BPD-C04)
// ============================================================================
interface LienReglementaireBpdProps {
  articles: string; // Ex: "Art. 4.18 & 5.20", "Art. 1.11", "Art. 2.04"
  chapitre?: string;
  exigence?: string;
  classe?: string;
}

export function LienReglementaireBpd({
  articles,
  chapitre = "Guide BPD ABMed Bénin",
  exigence = "Exigence légale soumise à contrôle lors de l'inspection de l'Agence Béninoise du Médicament.",
  classe = "",
}: LienReglementaireBpdProps) {
  const [popover, setPopover] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setPopover(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 transition-colors cursor-pointer ${classe}`}
        title="Voir l'exigence légale du Guide BPD (BPD-C04)"
      >
        <BookOpen className="size-3 text-emerald-700" />
        <span>{articles}</span>
      </button>

      <Dialog open={popover} onOpenChange={setPopover}>
        <DialogContent className="max-w-md bg-white border border-[#CFF1D2] rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-emerald-600/10 text-emerald-800 flex items-center justify-center border border-emerald-200">
                <BookOpen className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
                  Référence Réglementaire ABMed
                </DialogTitle>
                <span className="text-[11px] text-[#475C50]">{chapitre}</span>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2]">
              <div className="text-[10px] text-[#475C50] uppercase tracking-wider font-bold mb-1">
                Article(s) cité(s)
              </div>
              <div className="text-sm font-bold text-[#0F3B27]">{articles}</div>
            </div>

            <div className="text-muted-foreground leading-relaxed">
              {exigence}
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
              <ExternalLink className="size-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Cet enregistrement alimente automatiquement l'auto-évaluation de conformité de l'officine (BPD-C04).
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setPopover(false)}
              className="w-full bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] text-xs font-bold"
            >
              Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
