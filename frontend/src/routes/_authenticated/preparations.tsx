import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical,
  Plus,
  ShieldCheck,
  FileText,
  Beaker,
  ScanLine,
  Download,
  Upload,
  ClipboardCheck,
  Printer,
  TestTube,
  Calendar,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { telechargerCsv, imprimerFicheOfficielle } from "@/lib/export-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";
import { ligneVide, normaliserMatieres, type MatierePremiere } from "@/lib/preparations-matieres";

export const Route = createFileRoute("/_authenticated/preparations")({
  head: () => ({
    meta: [
      { title: "Préparations Magistrales — BestPharma" },
      { name: "description", content: "Cahier des préparations magistrales et officinales : matières premières lot par lot, contrôles libératoires, visa du pharmacien et étiquettes — BPD chapitre 6 et POI-03." },
    ],
  }),
  component: PagePreparationsLabo,
});

interface PreparationItem {
  id: string;
  numero_preparation: string;
  nom_preparation: string;
  type_preparation: "magistrale" | "officinale";
  formule_detaillee: string;
  matieres_premieres_lots?: MatierePremiere[] | string;
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

const SECTIONS_PREPARATIONS = [
  {
    valeur: "registre",
    libelle: "Registre",
    description: "Le cahier des préparations, numéroté sans trou et signé.",
    icone: <FileText className="size-4" />,
    motsCles: ["cahier", "historique", "visa"],
  },
  {
    valeur: "formules",
    libelle: "Formules",
    description: "Les recettes types de l’officine, prêtes à être reproduites.",
    icone: <Beaker className="size-4" />,
    motsCles: ["recettes", "officinales", "composition"],
  },
  {
    valeur: "matieres",
    libelle: "Matières premières",
    description: "D’où vient chaque poudre, chaque liquide, et à quel lot.",
    icone: <TestTube className="size-4" />,
    motsCles: ["mp", "lots", "fournisseur", "certificat"],
  },
  {
    valeur: "controles",
    libelle: "Contrôles",
    description: "Ce qu’il faut vérifier avant de libérer une préparation.",
    icone: <ClipboardCheck className="size-4" />,
    motsCles: ["liberation", "bpp", "ph", "aspect"],
  },
  {
    valeur: "etiquettes",
    libelle: "Étiquettes",
    description: "L’étiquette posée sur le flacon : posologie, DLU, pharmacien.",
    icone: <Printer className="size-4" />,
    motsCles: ["impression", "flacon", "bpd7-f15"],
  },
  {
    valeur: "rapports",
    libelle: "Rapports",
    description: "Les exports du cahier, conservés dix ans.",
    icone: <Download className="size-4" />,
    motsCles: ["export", "pdf", "excel", "archives"],
  },
];

function ZoneDepot({
  label,
  dossier = "preparations_certificats",
  accept = ".jpg,.jpeg,.png,.webp,.pdf",
  valeurUrl,
  valeurNom,
  onUploadSuccess,
}: {
  label: string;
  dossier?: string;
  accept?: string;
  valeurUrl?: string;
  valeurNom?: string;
  onUploadSuccess?: (file: { url: string; original_name: string; size: number }) => void;
}) {
  const [televersement, setTeleversement] = useState(false);
  const [fichierActuel, setFichierActuel] = useState<{ url: string; nom: string; taille?: number } | null>(
    valeurUrl ? { url: valeurUrl, nom: valeurNom || "Certificat joint" } : null
  );
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const traiterFichier = async (file: File | undefined) => {
    if (!file) return;
    setTeleversement(true);
    try {
      const res = await api.uploadFile<{ url: string; original_name: string; size: number }>(
        "/upload",
        file,
        { dossier }
      );
      const info = {
        url: res.url,
        nom: res.original_name || file.name,
        taille: res.size || file.size,
      };
      setFichierActuel(info);
      onUploadSuccess?.(res);
      toast.success(`Fichier "${info.nom}" téléversé et archivé au cahier !`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléversement.");
    } finally {
      setTeleversement(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        traiterFichier(e.dataTransfer.files?.[0]);
      }}
      className={`rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
        dragOver ? "border-[#0F3B27] bg-[#CFF1D2]/30" : "border-[#CFF1D2] bg-[#F7F9F7]"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        onChange={(e) => traiterFichier(e.target.files?.[0])}
      />

      {fichierActuel ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-[#CFF1D2]">
          <div className="flex items-center gap-2 overflow-hidden text-left">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            <div className="truncate">
              <p className="text-xs font-bold text-[#0F3B27] truncate">{fichierActuel.nom}</p>
              <p className="text-[11px] text-[#475C50]">
                {fichierActuel.taille ? `${(fichierActuel.taille / 1024).toFixed(1)} Ko · ` : ""}
                <a
                  href={fichierActuel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-[#0F3B27]"
                >
                  Consulter la pièce
                </a>
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={televersement}
            className="text-xs text-[#0F3B27] h-8 shrink-0"
          >
            Remplacer
          </Button>
        </div>
      ) : (
        <>
          <Upload className={`mx-auto w-5 h-5 ${dragOver ? "text-[#0F3B27]" : "text-[#475C50]"}`} />
          <p className="mt-1.5 text-xs font-bold text-[#0F3B27]">{label}</p>
          <p className="text-[11px] text-[#475C50]">
            {televersement
              ? "Archivage sécurisé et hachage en cours…"
              : "Glisser-déposer ou choisir un fichier — JPG, PNG ou PDF (max 30 Mo), conservation 10 ans"}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={televersement}
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-[#CFF1D2] bg-white px-3 py-1.5 text-xs font-bold text-[#0F3B27] hover:bg-[#CFF1D2]/30"
          >
            <ScanLine className="w-3.5 h-3.5" />
            {televersement ? "Téléversement…" : "Choisir le document"}
          </Button>
        </>
      )}
    </div>
  );
}

function PagePreparationsLabo() {
  const queryClient = useQueryClient();
  const { officine } = useOfficine();
  const [tab, setTab] = useState("registre");
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
  const [controlesEffectues, setControlesEffectues] = useState("Aspect homogène, absence de particules, pH conforme, masse unitaire vérifiée.");
  const [matieres, setMatieres] = useState<MatierePremiere[]>([ligneVide()]);

  const { data: prepsData, isLoading } = useQuery<{
    data: { data: PreparationItem[]; total: number };
  }>({
    queryKey: ["preparations"],
    queryFn: () => api.get("/preparations"),
  });

  const mutationCreer = useMutation({
    mutationFn: (payload: any) => api.post("/preparations", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Préparation inscrite — les matières premières sont tracées");
      queryClient.invalidateQueries({ queryKey: ["preparations"] });
      setDialogOuvert(false);
      setNomPreparation(""); setFormuleDetaillee(""); setQuantiteProduite(""); setMatieres([ligneVide()]);
    },
    onError: (err: any) => toast.error(err.message),
  });
  const mutationViser = useMutation({
    mutationFn: (id: string) => api.post(`/preparations/${id}/viser`, {}),
    onSuccess: (res: any) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: ["preparations"] }); },
    onError: (err: any) => toast.error(err.message),
  });

  const preparations: PreparationItem[] = (prepsData as any)?.data?.data || (prepsData as any)?.data || [];
  const enAttente = preparations.filter((p) => !p.pharmacien_visa);
  const liberees = preparations.filter((p) => !!p.pharmacien_visa);
  const magistrales = preparations.filter((p) => p.type_preparation === "magistrale");

  const toutesLesMatieres = preparations.flatMap((p) => {
    const liste = normaliserMatieres(p.matieres_premieres_lots);
    return liste.map((m) => ({ ...m, preparation: p.numero_preparation, nomPreparation: p.nom_preparation }));
  });

  const matieresRenseignees = matieres.filter((m) => m.matiere.trim());

  const ajouterMatiere = () => setMatieres((l) => [...l, ligneVide()]);
  const majMatiere = (index: number, champ: keyof MatierePremiere, valeur: string) =>
    setMatieres((l) => l.map((m, i) => (i === index ? { ...m, [champ]: valeur } : m)));
  const retirerMatiere = (index: number) => setMatieres((l) => l.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomPreparation || !formuleDetaillee || !quantiteProduite || !dateLimiteUtilisation) {
      toast.error("Il manque une information obligatoire : nom, formule, quantité ou date limite d’utilisation.");
      return;
    }
    mutationCreer.mutate({
      nom_preparation: nomPreparation,
      type_preparation: typePreparation,
      formule_detaillee: formuleDetaillee,
      matieres_premieres_lots: matieresRenseignees.length ? matieresRenseignees : undefined,
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

  const dernierePrep = preparations[0];

  const imprimerEtiquettePreparation = (p?: PreparationItem) => {
    const cible = p || dernierePrep;
    if (!cible) {
      toast.error("Aucune préparation enregistrée pour générer l’étiquette.");
      return;
    }
    const html = `
      <div style="max-width: 440px; border: 2px solid #0F3B27; border-radius: 8px; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, monospace; font-size: 13px; margin: 20px auto; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="font-weight: 900; font-size: 16px; color: #0F3B27; text-align: center;">${officine?.nom || "PHARMACIE DE L’ÉTOILE"}</div>
        <div style="font-size: 11px; text-align: center; color: #475C50; margin-top: 2px;">${officine?.adresse || "Av. Steinmetz, Cotonou"} — Tél. ${officine?.telephone || "+229 21 31 10 20"}</div>
        <hr style="border: 0; border-top: 2px solid #0F3B27; margin: 12px 0;">
        <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px; color: #111;">${cible.nom_preparation} — ${cible.quantite_produite}</div>
        <div style="color: #0F3B27; font-weight: bold; font-size: 12px; margin-bottom: 8px;">N° D'ORDRE : ${cible.numero_preparation} (${cible.type_preparation === "magistrale" ? "Magistrale" : "Officinale"})</div>
        ${cible.patient_nom ? `<div style="font-size: 12px; margin-bottom: 4px;">Patient : <strong>${cible.patient_nom}</strong></div>` : ""}
        ${cible.prescripteur_nom ? `<div style="font-size: 11px; color: #555; margin-bottom: 6px;">Prescrit par Dr <strong>${cible.prescripteur_nom}</strong></div>` : ""}
        <div style="background: #F7F9F7; border: 1px dashed #CFF1D2; padding: 10px; border-radius: 6px; margin: 8px 0; font-size: 12px; line-height: 1.4;">
          <strong>Posologie & Voie d'administration :</strong><br>
          Usage externe / Selon ordonnance. Ne pas avaler. Tenir hors de la vue et de la portée des enfants.
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #333; margin-top: 8px; border-top: 1px solid #eee; padding-top: 6px;">
          <span>Fabriqué le : <strong>${cible.date_fabrication}</strong></span>
          <span>Date Limite (DLU) : <strong style="color: #0F3B27;">${cible.date_limite_utilisation}</strong></span>
        </div>
        <div style="font-size: 10px; color: #666; margin-top: 6px;">Conservation : ${cible.conditionnement} — Température &lt; 25 °C à l'abri de l'humidité.</div>
        <div style="margin-top: 12px; font-size: 9px; color: #666; text-align: center; border-top: 1px dotted #ccc; padding-top: 6px;">
          Étiquette conforme Bonnes Pratiques de Dispensation ABMed (BPD7-F15) · BestPharma
        </div>
      </div>
    `;
    imprimerFicheOfficielle(`Étiquette ${cible.numero_preparation}`, html);
  };

  const exporterCahierPreparationsPdf = () => {
    if (preparations.length === 0) {
      toast.error("Le cahier de préparation est vide pour l'instant.");
      return;
    }
    const lignesHtml = preparations
      .map(
        (p) => `
      <tr>
        <td style="font-family: monospace; font-weight: bold;">${p.numero_preparation}</td>
        <td>${p.date_fabrication}</td>
        <td><strong>${p.nom_preparation}</strong><br><span style="font-size: 10px; color: #666;">${p.formule_detaillee}</span></td>
        <td>${p.type_preparation === "magistrale" ? "Magistrale" : "Officinale"} (${p.quantite_produite})</td>
        <td>${p.patient_nom || "Officine"}<br><span style="font-size: 10px; color: #666;">${p.prescripteur_nom || ""}</span></td>
        <td style="font-family: monospace;">${p.date_limite_utilisation}</td>
        <td>${p.pharmacien_visa?.name ? `<span style="color: #0F3B27; font-weight: bold;">Visa : ${p.pharmacien_visa.name}</span>` : `<span style="color: #b45309;">En attente visa</span>`}</td>
      </tr>`
      )
      .join("");

    const html = `
      <p style="font-size: 12px; color: #475C50; margin-bottom: 15px;">
        Cahier officiel des préparations magistrales et officinales de l'officine conformément au Chapitre 6 des Bonnes Pratiques de Dispensation (BPD ABMed) et à la procédure POI-03. Registre coté et paraphé à conservation légale obligatoire de 10 ans.
      </p>
      <table>
        <thead>
          <tr>
            <th>N° PREP</th>
            <th>Date Fab.</th>
            <th>Nom & Formule</th>
            <th>Type & Quantité</th>
            <th>Patient / Prescripteur</th>
            <th>Date Limite</th>
            <th>Visa Libération</th>
          </tr>
        </thead>
        <tbody>
          ${lignesHtml}
        </tbody>
      </table>
    `;
    imprimerFicheOfficielle("CAHIER OFFICIEL DES PRÉPARATIONS (BPD CHAPITRE 6)", html);
  };

  const exporterRegistrePreparationsCsv = (filtreRecents?: boolean) => {
    if (preparations.length === 0) {
      toast.error("Aucune préparation à exporter.");
      return;
    }
    const source = filtreRecents ? preparations.slice(0, 30) : preparations;
    const colonnes = [
      { cle: "numero_preparation", label: "N° Préparation" },
      { cle: "date_fabrication", label: "Date Fabrication" },
      { cle: "nom_preparation", label: "Nom Préparation" },
      { cle: "type_preparation", label: "Type (Magistrale/Officinale)" },
      { cle: "quantite_produite", label: "Quantité Produite" },
      { cle: "conditionnement", label: "Conditionnement" },
      { cle: "patient_nom", label: "Patient" },
      { cle: "prescripteur_nom", label: "Prescripteur" },
      { cle: "date_limite_utilisation", label: "Date Limite d'Utilisation" },
      { cle: "visa_statut", label: "Statut Libération" },
      { cle: "pharmacien", label: "Pharmacien Libérateur" },
    ];
    const donnees = source.map((p) => ({
      numero_preparation: p.numero_preparation,
      date_fabrication: p.date_fabrication,
      nom_preparation: p.nom_preparation,
      type_preparation: p.type_preparation,
      quantite_produite: p.quantite_produite,
      conditionnement: p.conditionnement,
      patient_nom: p.patient_nom || "N/A",
      prescripteur_nom: p.prescripteur_nom || "N/A",
      date_limite_utilisation: p.date_limite_utilisation,
      visa_statut: p.pharmacien_visa ? "Libérée" : "En attente",
      pharmacien: p.pharmacien_visa?.name || "Non visé",
    }));

    telechargerCsv(
      donnees,
      filtreRecents ? "bestpharma_extraits_preparations_recentes.csv" : "bestpharma_cahier_preparations_bpd.csv",
      colonnes
    );
    toast.success(
      filtreRecents
        ? "Extrait récent des préparations téléchargé (CSV) !"
        : "Cahier complet des préparations téléchargé (CSV) !"
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-black tracking-tight text-[#0F3B27]">Préparations Magistrales & Officinales</h1>
            <Badge className="bg-[#0F3B27] text-[#92FF5F]">BPD chap. 6 · POI-03</Badge>
            <Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">PRE</Badge>
          </div>
          <p className="mt-1 text-sm text-[#475C50] max-w-2xl">Chaque préparation garde sa formule, les matières premières utilisées avec leur lot et leur fournisseur, les contrôles effectués et le visa du pharmacien. L’étiquette du flacon reprend la posologie, le numéro d’ordre et l’adresse de l’officine (BPD7-F15).</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0F3B27] text-white px-3 py-1"><FlaskConical className="w-3 h-3" /> Cahier coté et paraphé</span>
            <span className="rounded-full border border-[#CFF1D2] bg-white px-3 py-1 text-[#0F3B27]">Conservation dix ans</span>
            <span className="rounded-full bg-[#CFF1D2] px-3 py-1 text-[#0F3B27]">{magistrales.length} magistrales</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => exporterRegistrePreparationsCsv(false)}
            className="gap-2 border-[#CFF1D2] text-[#0F3B27] font-bold hover:bg-[#CFF1D2]/30"
          >
            <Download className="w-4 h-4" /> Exporter Cahier (CSV)
          </Button>
          <Button onClick={() => setDialogOuvert(true)} className="gap-2 bg-[#0F3B27] hover:bg-[#164E35] text-white font-bold"><Plus className="w-4 h-4" /> Inscrire une préparation</Button>
          <Badge variant="outline" className="justify-center border-amber-300 bg-amber-50 text-amber-800 text-xs">{enAttente.length} en attente de libération</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#CFF1D2] bg-white px-4 py-2.5 text-xs font-bold text-[#0F3B27]">
        <span className="flex items-center gap-1"><Beaker className="w-3.5 h-3.5" /> Laboratoire de l’officine</span>
        <span className="text-[#475C50]">•</span>
        <span>{preparations.length} préparations</span>
        <span className="text-[#475C50]">•</span>
        <span className="text-emerald-700">{liberees.length} libérées</span>
        <span className="text-[#475C50]">•</span>
        <span className="text-amber-700">{enAttente.length} à contrôler</span>
        <span className="ml-auto rounded-full bg-[#F7F9F7] border border-[#CFF1D2] px-2.5 py-1">La date limite = fabrication + stabilité</span>
      </div>

      {/* Navigation : une seule liste déroulante, filtrable */}
      <div className="rounded-2xl border border-[#CFF1D2] bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <SelecteurFiltrable
            id="section-preparations"
            etiquette="Section du cahier"
            options={SECTIONS_PREPARATIONS}
            valeur={tab}
            onChange={setTab}
            placeholder="Choisir une section du cahier…"
            placeholderRecherche="Filtrer : registre, formules, matières premières…"
            className="md:max-w-xl"
          />
          <p className="text-[11px] font-medium leading-snug text-[#475C50] md:pb-2">
            Tapez quelques lettres pour aller droit au but. La section choisie s’affiche juste en dessous.
          </p>
        </div>
      </div>

      {tab === "registre" && (
        <div className="space-y-4">
          <Card className="border-[#CFF1D2]">
            <CardHeader><CardTitle className="text-sm font-black text-[#0F3B27]">Registre officiel — numéroté consécutivement (PREP-2026-0001)</CardTitle><CardDescription>Chaque préparation porte sa formule détaillée, ses lots de matières premières, ses contrôles et son visa. Une fois libérée, elle ne se modifie plus.</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <div className="p-8 text-center text-[#475C50]">Chargement…</div> : preparations.length === 0 ? <div className="p-8 text-center text-[#475C50]">Aucune préparation — inscrivez la première formule (pâte à l’eau, sirop de Tolu…).</div> : (
                <div className="overflow-x-auto"><table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F9F7] text-[#475C50] border-b border-[#CFF1D2] font-bold"><tr><th className="py-2 px-3">N°</th><th className="py-2 px-3">Intitulé et formule</th><th className="py-2 px-3">Type et quantité</th><th className="py-2 px-3">Patient</th><th className="py-2 px-3">Date limite</th><th className="py-2 px-3">Visa</th></tr></thead>
                  <tbody className="divide-y divide-[#CFF1D2]/50">
                    {preparations.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F7F9F7]">
                        <td className="py-2 px-3 font-mono font-black text-[#0F3B27]">{p.numero_preparation}<div className="text-[10px] font-normal text-[#475C50]">{p.date_fabrication}</div></td>
                        <td className="py-2 px-3"><div className="font-bold text-[#0F3B27]">{p.nom_preparation}</div><div className="text-[11px] text-[#475C50] max-w-md line-clamp-2">{p.formule_detaillee}</div><div className="text-[10px] text-[#475C50]">{p.conditionnement}</div></td>
                        <td className="py-2 px-3"><Badge variant="outline" className="text-[11px] border-[#CFF1D2]">{p.type_preparation === "magistrale" ? "Magistrale" : "Officinale"}</Badge><div className="font-bold mt-1">{p.quantite_produite}</div></td>
                        <td className="py-2 px-3"><div className="font-bold">{p.patient_nom || "Officinale"}</div><div className="text-[#475C50]">{p.prescripteur_nom || ""}</div></td>
                        <td className="py-2 px-3 font-mono text-[11px]">{p.date_limite_utilisation}</td>
                        <td className="py-2 px-3">{p.pharmacien_visa ? <Badge className="bg-[#0F3B27] text-white text-[11px] gap-1"><ShieldCheck className="w-3 h-3" /> {p.pharmacien_visa.name}</Badge> : <Button variant="outline" size="sm" onClick={() => mutationViser.mutate(p.id)} className="h-8 text-xs border-amber-300 text-amber-800">Libérer et viser</Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "formules" && (
        <div className="space-y-4">
          <Card className="border-[#0F3B27] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-white font-display font-black flex items-center gap-2"><Beaker className="w-5 h-5 text-[#92FF5F]" /> Bibliothèque des formules officinales</CardTitle><CardDescription className="text-[#CFF1D2]">Les recettes types de l’officine : composition exacte, mode opératoire, durée de conservation et conditionnement.</CardDescription></CardHeader><CardContent className="text-xs text-[#CFF1D2]">Exemples courants : pâte à l’eau (oxyde de zinc 20 %, talc 20 %, glycérine 20 %, eau qsp), solution antiseptique, gélules…</CardContent></Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { nom: "Pâte à l’eau", compo: "Oxyde de zinc 20 g, talc 20 g, glycérine 20 g, eau purifiée qsp 100 g", dlu: "30 jours" },
              { nom: "Sirop de Tolu", compo: "Baume de Tolu 2 %, saccharose, eau purifiée", dlu: "14 jours" },
              { nom: "Gélules CBD", compo: "Principe actif et excipient — gélules n° 0", dlu: "90 jours" },
            ].map((f) => (
              <Card key={f.nom} className="border-[#CFF1D2]"><CardHeader className="pb-2"><CardTitle className="text-sm font-black text-[#0F3B27]">{f.nom}</CardTitle></CardHeader><CardContent className="text-xs"><div className="text-[#475C50]">{f.compo}</div><div className="mt-2 font-bold text-[#0F3B27]">Se conserve {f.dlu}</div></CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {tab === "matieres" && (
        <div className="space-y-4">
          <Card className="border-[#CFF1D2]">
            <CardHeader>
              <CardTitle className="text-sm font-black text-[#0F3B27] flex items-center gap-2"><TestTube className="w-4 h-4" /> Matières premières utilisées, lot par lot</CardTitle>
              <CardDescription>
                Pour chaque préparation, on note la matière employée, son numéro de lot chez le fournisseur, le fournisseur
                lui-même, la quantité réellement pesée et le certificat d’analyse fourni. C’est ce qui permet, en cas de
                rappel d’un lot de matière première, de retrouver toutes les préparations concernées.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-[#CFF1D2] rounded-xl overflow-hidden">
                  <thead className="bg-[#F7F9F7] font-bold text-[#475C50]">
                    <tr>
                      <th className="py-2 px-3">Matière première</th>
                      <th className="py-2 px-3">Lot fournisseur</th>
                      <th className="py-2 px-3">Fournisseur</th>
                      <th className="py-2 px-3">Quantité pesée</th>
                      <th className="py-2 px-3">Certificat</th>
                      <th className="py-2 px-3">Préparation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CFF1D2]/50">
                    {toutesLesMatieres.length === 0 ? (
                      <tr><td colSpan={6} className="py-6 px-3 text-center text-[#475C50]">Aucune matière première enregistrée pour l’instant. Ouvrez « Inscrire une préparation » : la fiche propose une ligne par matière, à remplir comme sur le cahier papier.</td></tr>
                    ) : toutesLesMatieres.map((m, i) => (
                      <tr key={`${m.preparation}-${i}`} className="hover:bg-[#F7F9F7]">
                        <td className="py-2 px-3 font-bold text-[#0F3B27]">{m.matiere}</td>
                        <td className="py-2 px-3 font-mono">{m.lot || "—"}</td>
                        <td className="py-2 px-3">{m.fournisseur || "—"}</td>
                        <td className="py-2 px-3 font-mono">{m.quantite || "—"}</td>
                        <td className="py-2 px-3">{m.certificat || "—"}</td>
                        <td className="py-2 px-3"><span className="font-mono text-[11px] text-[#0F3B27]">{m.preparation}</span><div className="text-[11px] text-[#475C50]">{m.nomPreparation}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ZoneDepot label="Déposer les certificats d’analyse des matières premières (PDF) — un par lot" />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "controles" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-emerald-300 bg-emerald-50/30"><CardHeader><CardTitle className="text-sm font-black text-emerald-900 flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Contrôles avant libération</CardTitle></CardHeader><CardContent className="text-xs text-emerald-900 space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#0F3B27]" /> Aspect, homogénéité, absence de particules</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#0F3B27]" /> Couleur et odeur conformes à la formule</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#0F3B27]" /> pH, masse unitaire et volume vérifiés</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#0F3B27]" /> Conditionnement hermétique et étiquetage lisible</label>
            </CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Le visa du pharmacien vaut libération</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Seul le pharmacien peut viser, qu’il soit titulaire ou adjoint. Une préparation non visée ne peut pas être délivrée. Tout écart déclenche une fiche de non-conformité et une action corrective.</CardContent></Card>
          </div>
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-center text-sm text-[#475C50]">{enAttente.length === 0 ? "Aucune préparation en attente : tout est libéré." : `${enAttente.length} préparation(s) attendent encore le visa du pharmacien.`}</CardContent></Card>
        </div>
      )}

      {tab === "etiquettes" && (
        <div className="space-y-4">
          <Card className="border-[#0F3B27] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-white font-display font-black flex items-center gap-2"><Printer className="w-5 h-5 text-[#92FF5F]" /> Étiquette de conditionnement (BPD7-F15)</CardTitle><CardDescription className="text-[#CFF1D2]">Posologie, numéro d’ordre PREP-2026-XXXX, nom et adresse du pharmacien, date limite d’utilisation et conditions de conservation.</CardDescription></CardHeader><CardContent className="text-xs text-[#CFF1D2]">Impression sur imprimante thermique ; le QR code de traçabilité est optionnel.</CardContent></Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-[#CFF1D2] bg-white"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Aperçu de l’étiquette {dernierePrep ? `(${dernierePrep.numero_preparation})` : ""}</CardTitle></CardHeader><CardContent>
              <div className="rounded-xl border-2 border-[#0F3B27] bg-white p-4 font-mono text-xs leading-tight">
                <div className="font-black text-[#0F3B27] text-sm">{officine?.nom || "PHARMACIE DE L’ÉTOILE"}</div>
                <div className="text-[10px] text-[#475C50]">{officine?.adresse || "Av. Steinmetz, Cotonou"} — Tél. {officine?.telephone || "+229 21 31 10 20"}</div>
                <div className="mt-2 font-bold">{dernierePrep?.nom_preparation || "Pâte à l’eau"} — {dernierePrep?.quantite_produite || "100 g"} — {dernierePrep?.numero_preparation || "PREP-2026-0005"}</div>
                <div className="text-[11px]">Posologie : 2 applications par jour sur les lésions — À utiliser jusqu’au {dernierePrep?.date_limite_utilisation || "12/12/2026"} — Conserver à moins de 25 °C</div>
                <div className="mt-2 flex items-center gap-2"><ScanLine className="w-8 h-8 text-[#0F3B27]" /><span className="text-[10px] text-[#475C50]">QR code : traçabilité des lots ({dernierePrep?.numero_preparation || "PREP-2026-0005"})</span></div>
              </div>
            </CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Impression</CardTitle></CardHeader><CardContent className="space-y-2">
              <Button onClick={() => imprimerEtiquettePreparation()} variant="outline" className="w-full font-bold border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30"><Printer className="w-4 h-4 mr-1" /> Imprimer l’étiquette</Button>
              <Button onClick={() => imprimerEtiquettePreparation()} variant="outline" className="w-full font-bold border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30"><Download className="w-4 h-4 mr-1" /> Télécharger en PDF</Button>
            </CardContent></Card>
          </div>
        </div>
      )}

      {tab === "rapports" && (
        <div className="space-y-4">
          <Card className="border-[#0F3B27] bg-[#F7F9F7]"><CardHeader><CardTitle className="text-sm font-black text-[#0F3B27] flex items-center gap-2"><FileText className="w-4 h-4" /> Rapports et exports — conservation dix ans</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button onClick={() => exporterCahierPreparationsPdf()} variant="outline" className="font-bold border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 gap-1"><Download className="w-4 h-4" /> Cahier complet en PDF</Button>
            <Button onClick={() => exporterRegistrePreparationsCsv(false)} variant="outline" className="font-bold border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 gap-1"><FileText className="w-4 h-4" /> Registre en Excel</Button>
            <Button onClick={() => exporterRegistrePreparationsCsv(true)} variant="outline" className="font-bold border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 gap-1"><Calendar className="w-4 h-4" /> Extraits par période</Button>
          </CardContent></Card>
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-xs text-[#475C50]">Chaque document porte son code, sa version et sa date d’édition. Les modèles sont gérés par la responsable qualité, avec un circuit d’approbation.</CardContent></Card>
        </div>
      )}

      {/* Modale de saisie — rectangle horizontal */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <ModaleFiche
          titre="Nouvelle préparation"
          sousTitre="On décrit la formule, les matières premières réellement employées, puis les contrôles. Le numéro PREP est attribué automatiquement à l’enregistrement."
          badge={<Badge className="bg-[#0F3B27] text-[#92FF5F]">BPP</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">Une préparation enregistrée ne se modifie plus : elle se corrige par une nouvelle ligne liée.</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setDialogOuvert(false)} className="h-12 rounded-xl sm:h-11">Annuler</Button>
                <Button type="submit" form="form-preparation" disabled={mutationCreer.isPending} className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11">
                  {mutationCreer.isPending ? "Enregistrement…" : "Inscrire — numéro PREP automatique"}
                </Button>
              </div>
            </div>
          }
        >
          <form id="form-preparation" onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Colonne gauche : la préparation elle-même */}
            <ColonneFiche titre="La préparation" aide="Ce que l’on fabrique, pour qui, et en quelle quantité.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Type de préparation">
                  <select className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]" value={typePreparation} onChange={(e: any) => setTypePreparation(e.target.value)}>
                    <option value="magistrale">Magistrale (sur ordonnance)</option>
                    <option value="officinale">Officinale (recette de l’officine)</option>
                  </select>
                </Champ>
                <Champ label="Nom de la préparation" obligatoire aide="Le nom écrit sur l’étiquette, en clair.">
                  <Input placeholder="Ex. Pâte à l’eau, sirop de Tolu…" value={nomPreparation} onChange={(e) => setNomPreparation(e.target.value)} className="h-12 rounded-xl" required />
                </Champ>
              </div>

              <Champ label="Formule détaillée" obligatoire aide="Ingrédient par ingrédient, avec la quantité exacte et « qsp » pour le complément.">
                <Textarea rows={4} placeholder={"Ex. Oxyde de zinc 20 g\nTalc 20 g\nGlycérine 20 g\nEau purifiée qsp 100 g"} value={formuleDetaillee} onChange={(e) => setFormuleDetaillee(e.target.value)} className="rounded-xl text-sm" required />
              </Champ>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Quantité produite" obligatoire aide="En grammes, millilitres ou nombre de gélules.">
                  <Input placeholder="Ex. 100 g, 200 ml, 60 gélules" value={quantiteProduite} onChange={(e) => setQuantiteProduite(e.target.value)} className="h-12 rounded-xl" required />
                </Champ>
                <Champ label="Conditionnement" aide="Le contenant remis au patient.">
                  <Input value={conditionnement} onChange={(e) => setConditionnement(e.target.value)} placeholder="Ex. Pot hermétique de 100 g" className="h-12 rounded-xl" />
                </Champ>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Date de fabrication" obligatoire>
                  <Input type="date" value={dateFabrication} onChange={(e) => setDateFabrication(e.target.value)} className="h-12 rounded-xl" required />
                </Champ>
                <Champ label="Date limite d’utilisation" obligatoire aide="Fabrication plus la stabilité prévue par la formule.">
                  <Input type="date" value={dateLimiteUtilisation} onChange={(e) => setDateLimiteUtilisation(e.target.value)} className="h-12 rounded-xl" required />
                </Champ>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Patient" aide="À remplir uniquement pour une magistrale.">
                  <Input placeholder="Nom du patient" value={patientNom} onChange={(e) => setPatientNom(e.target.value)} className="h-12 rounded-xl" />
                </Champ>
                <Champ label="Prescripteur">
                  <Input placeholder="Ex. Dr ADJASSA" value={prescripteurNom} onChange={(e) => setPrescripteurNom(e.target.value)} className="h-12 rounded-xl" />
                </Champ>
              </div>
            </ColonneFiche>

            {/* Colonne droite : matières premières et contrôles */}
            <ColonneFiche titre="Matières premières employées" aide="Une ligne par matière : ce que dit l’étiquette du flacon fournisseur.">
              <div className="space-y-3">
                {matieres.map((m, index) => (
                  <div key={index} className="rounded-2xl border border-[#CFF1D2] bg-[#F7F9F7]/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#475C50]">Matière n° {index + 1}</p>
                      {matieres.length > 1 ? (
                        <button type="button" onClick={() => retirerMatiere(index)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#475C50] hover:bg-white hover:text-red-700" aria-label={`Retirer la matière n° ${index + 1}`}>
                          <X className="size-3.5" /> Retirer
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Champ label="Matière première">
                        <Input placeholder="Ex. Oxyde de zinc" value={m.matiere} onChange={(e) => majMatiere(index, "matiere", e.target.value)} className="h-11 rounded-xl bg-white" />
                      </Champ>
                      <Champ label="Numéro de lot">
                        <Input placeholder="Ex. MP-2026-012" value={m.lot ?? ""} onChange={(e) => majMatiere(index, "lot", e.target.value)} className="h-11 rounded-xl bg-white font-mono" />
                      </Champ>
                      <Champ label="Fournisseur">
                        <Input placeholder="Ex. Cooper Bénin" value={m.fournisseur ?? ""} onChange={(e) => majMatiere(index, "fournisseur", e.target.value)} className="h-11 rounded-xl bg-white" />
                      </Champ>
                      <Champ label="Quantité pesée">
                        <Input placeholder="Ex. 20 g" value={m.quantite ?? ""} onChange={(e) => majMatiere(index, "quantite", e.target.value)} className="h-11 rounded-xl bg-white" />
                      </Champ>
                      <Champ label="Certificat d’analyse" aide="Nom ou numéro du document joint plus bas." className="sm:col-span-2">
                        <Input placeholder="Ex. CA-2026-014.pdf" value={m.certificat ?? ""} onChange={(e) => majMatiere(index, "certificat", e.target.value)} className="h-11 rounded-xl bg-white" />
                      </Champ>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={ajouterMatiere} className="h-12 w-full rounded-xl border-dashed border-[#0F3B27]/40 font-bold text-[#0F3B27]">
                  <Plus className="w-4 h-4 mr-1" /> Ajouter une autre matière première
                </Button>
                <p className="text-[11px] leading-snug text-[#475C50]">
                  {matieresRenseignees.length === 0
                    ? "Aucune matière renseignée pour l’instant : la préparation peut être enregistrée, mais sa traçabilité restera incomplète."
                    : `${matieresRenseignees.length} matière(s) seront enregistrées avec leur lot, ce qui permet de retrouver la préparation si un lot est rappelé.`}
                </p>
              </div>

              <Champ label="Contrôles effectués" aide="Ce que vous avez réellement vérifié avant de libérer le flacon.">
                <Textarea rows={3} value={controlesEffectues} onChange={(e) => setControlesEffectues(e.target.value)} className="rounded-xl text-sm" />
              </Champ>

              <ZoneDepot label="Joindre les certificats d’analyse et les photos de la préparation" />
            </ColonneFiche>
          </form>
        </ModaleFiche>
      </Dialog>
    </div>
  );
}
