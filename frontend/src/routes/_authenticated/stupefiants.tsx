import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Lock,
  ShieldAlert,
  ShieldCheck,
  FileSpreadsheet,
  AlertOctagon,
  CheckCircle2,
  Search,
  Plus,
  Upload,
  FileText,
  Archive,
  AlertTriangle,
  Trash2,
  Eye,
  Scale,
  ClipboardList,
  Building2,
  ScanLine,
  BookOpen,
  Files,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { formatDate, nombre } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/stupefiants")({
  head: () => ({
    meta: [
      { title: "Registre Stupéfiants Tab. B — BestPharma" },
      { name: "description", content: "Registre officiel inaltérable Tab. B : balance permanente, ordonnancier, armoire sécurisée, inventaire, vol/perte, destruction — BPD-3 Art 7.15-7.20" },
    ],
  }),
  component: PageStupefiantsTabB,
});

interface Mouvement {
  id: string;
  numero_ordre: number;
  date_mouvement: string;
  type_mouvement: string;
  categorie?: string;
  quantite: number;
  stock_precedent: number;
  stock_nouveau: number;
  reference_piece: string;
  tiers_nom?: string;
  patient_nom?: string;
  prescripteur_nom?: string;
  observations?: string;
  date_visa?: string;
  est_ordonnancier?: boolean;
  pharmacien_visa?: { name: string };
  operateur?: { name: string };
  produit?: { nom_commercial: string; dosage?: string; code_cip: string };
  lot?: { numero_lot: string; date_peremption: string };
}

interface BalanceProduit {
  id: string; code_cip: string; nom_commercial: string; dosage?: string; categorie?: string;
  stock_theorique_registre: number; stock_physique_lots: number; concordance_exacte: boolean; ecart: number; non_vises_count: number;
}

// ─── Sections du registre (liste déroulante filtrable)
const SECTIONS_STUPEIANTS = [
  {
    valeur: "registre",
    libelle: "Registre",
    description: "La feuille chronologique du Tab. B : chaque entrée et sortie, numérotée sans trou.",
    icone: <FileText className="size-4" />,
    motsCles: ["tab b", "feuillets", "mouvements", "chronologique"],
  },
  {
    valeur: "balance",
    libelle: "Balance & stock",
    description: "Ce que dit le registre, face à ce qui reste réellement en armoire.",
    icone: <Scale className="size-4" />,
    motsCles: ["theorique", "physique", "concordance", "ecart"],
  },
  {
    valeur: "ordonnancier",
    libelle: "Ordonnancier",
    description: "Les délivrances sur ordonnance, avec patient, prescripteur et visa.",
    icone: <ClipboardList className="size-4" />,
    motsCles: ["ordonnance", "patient", "prescripteur", "delivrance"],
  },
  {
    valeur: "copies",
    libelle: "Copies ordonnances",
    description: "Les ordonnances numérisées, rattachées à leur ligne du registre.",
    icone: <Files className="size-4" />,
    motsCles: ["scan", "pieces", "numerisation", "archives"],
  },
  {
    valeur: "inventaire",
    libelle: "Inventaire",
    description: "Le comptage périodique, avec double signature et procès-verbal.",
    icone: <Archive className="size-4" />,
    motsCles: ["comptage", "pv", "temoin"],
  },
  {
    valeur: "armoire",
    libelle: "Armoire",
    description: "Ce que contient l’armoire sécurisée, lot par lot.",
    icone: <Building2 className="size-4" />,
    motsCles: ["coffre", "securisee", "cle", "contenu"],
  },
  {
    valeur: "ecarts",
    libelle: "Écarts / Vol",
    description: "Comprendre un écart, déclarer une perte ou un vol, alerter les autorités.",
    icone: <AlertTriangle className="size-4" />,
    motsCles: ["manquant", "perte", "vol", "police", "gendarmerie"],
  },
  {
    valeur: "destruction",
    libelle: "Destruction",
    description: "Sortir un lot du circuit par une destruction autorisée et prouvée.",
    icone: <Trash2 className="size-4" />,
    motsCles: ["incineration", "prestataire", "pv", "retour"],
  },
  {
    valeur: "rapports",
    libelle: "Rapports",
    description: "Les exports et la consultation en lecture seule pour l’inspection.",
    icone: <BookOpen className="size-4" />,
    motsCles: ["export", "inspecteur", "pdf", "excel", "extraits"],
  },
];

function ZoneDepot({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#CFF1D2] bg-[#F7F9F7] p-6 text-center">
      <Upload className="mx-auto w-6 h-6 text-[#475C50]" />
      <p className="mt-2 text-xs font-bold text-[#0F3B27]">{label}</p>
      <p className="text-[11px] text-[#475C50]">Glisser-déposer, caméra ou sélecteur — JPG/PNG/PDF 10 Mo, SHA-256 + chiffrage</p>
    </div>
  );
}

function PageStupefiantsTabB() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("registre");
  const [recherche, setRecherche] = useState("");
  const [dialogMouvementOuvert, setDialogMouvementOuvert] = useState(false);
  const [dialogRectifOuvert, setDialogRectifOuvert] = useState(false);
  const [mouvementPourRectif, setMouvementPourRectif] = useState<Mouvement | null>(null);
  const [rectifMotif, setRectifMotif] = useState("");
  const [rectifQte, setRectifQte] = useState("1");
  const [dialogInventaireOuvert, setDialogInventaireOuvert] = useState(false);
  const [dialogVolOuvert, setDialogVolOuvert] = useState(false);
  const [dialogDestructionOuvert, setDialogDestructionOuvert] = useState(false);

  // Form mouvement manuel STU-02
  const [produitId, setProduitId] = useState("");
  const [typeMouvement, setTypeMouvement] = useState("ajustement_inventaire");
  const [quantite, setQuantite] = useState("1");
  const [referencePiece, setReferencePiece] = useState("");
  const [patientNom, setPatientNom] = useState("");
  const [prescripteurNom, setPrescripteurNom] = useState("");
  const [observations, setObservations] = useState("");

  const { data: donnees, isLoading } = useQuery<{ data: { data: Mouvement[]; total: number }; balance_produits: BalanceProduit[] }>({
    queryKey: ["stupefiants"],
    queryFn: () => api.get("/stupefiants"),
  });
  const { data: balanceData } = useQuery<{ data: any }>({
    queryKey: ["stupefiants-balance"],
    queryFn: () => api.get<any>("/stupefiants/balance").catch(() => null),
  });
  const { data: armoireData } = useQuery<{ data: any }>({
    queryKey: ["stupefiants-armoire"],
    queryFn: () => api.get<any>("/stupefiants/armoire").catch(() => null),
  });
  const { data: ordonnancierData } = useQuery<{ data: { data: Mouvement[] } }>({
    queryKey: ["stupefiants-ordonnancier"],
    queryFn: () => api.get<any>("/stupefiants/ordonnancier").catch(() => ({ data: { data: [] } } as any)),
  });
  const { data: produitsData } = useQuery<{ data: any[] }>({
    queryKey: ["produits"],
    queryFn: () => api.get("/produits"),
  });

  const mutationViser = useMutation({
    mutationFn: (id: string) => api.post(`/stupefiants/${id}/viser`, {}),
    onSuccess: () => { toast.success("Visa apposé — ligne verrouillée (INT-02)"); queryClient.invalidateQueries({ queryKey: ["stupefiants"] }); },
    onError: (err: any) => toast.error(err.message),
  });
  const mutationCreer = useMutation({
    mutationFn: (payload: any) => api.post("/stupefiants", payload),
    onSuccess: (res: any) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: ["stupefiants"] }); setDialogMouvementOuvert(false); setQuantite("1"); setReferencePiece(""); setObservations(""); },
    onError: (err: any) => toast.error(err.message),
  });
  const mutationRectif = useMutation({
    mutationFn: ({ id, motif, qte }: any) => api.post(`/stupefiants/${id}/rectificative`, { motif, quantite_corrective: parseInt(qte, 10) }),
    onSuccess: (res: any) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: ["stupefiants"] }); setDialogRectifOuvert(false); setRectifMotif(""); },
    onError: (err: any) => toast.error(err.message),
  });
  const mutationInventaire = useMutation({
    mutationFn: (payload: any) => api.post("/stupefiants/inventaire", payload),
    onSuccess: (res: any) => { toast.success(res.message); if (res.alerte_ecart) toast.warning("Écart détecté — fiche NC/CAPA créée (STU-06)"); queryClient.invalidateQueries({ queryKey: ["stupefiants"] }); setDialogInventaireOuvert(false); },
    onError: (err: any) => toast.error(err.message),
  });
  const mutationVol = useMutation({
    mutationFn: (payload: any) => api.post("/stupefiants/declaration-vol", payload),
    onSuccess: (res: any) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: ["stupefiants"] }); setDialogVolOuvert(false); },
    onError: (err: any) => toast.error(err.message),
  });
  const mutationDestruction = useMutation({
    mutationFn: (payload: any) => api.post("/stupefiants/demande-destruction", payload),
    onSuccess: (res: any) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: ["stupefiants"] }); setDialogDestructionOuvert(false); },
    onError: (err: any) => toast.error(err.message),
  });

  const mouvements: Mouvement[] = (donnees as any)?.data?.data || (donnees as any)?.data || [];
  const balance: BalanceProduit[] = (donnees as any)?.balance_produits || [];
  const produits = (produitsData as any)?.data || [];
  const produitsStup = produits.filter((p: any) => ["stupefiant","liste_1","liste_2"].includes(p.tableau_substance) || p.classe_produit==="stupefiant");
  const ordonnancier: Mouvement[] = (ordonnancierData as any)?.data?.data || (ordonnancierData as any)?.data || [];
  const armoire = (armoireData as any)?.data || { contenu: [], lots_stupefiants: [] };

  const handleMouvementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produitId || !referencePiece) { toast.error("Champs obligatoires manquants"); return; }
    mutationCreer.mutate({
      produit_id: produitId, type_mouvement: typeMouvement, quantite: parseInt(quantite, 10),
      reference_piece: referencePiece, patient_nom: patientNom || null, prescripteur_nom: prescripteurNom || null, observations: observations || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-black tracking-tight text-[#0F3B27]">Registre Stupéfiants — Tab. B</h1>
            <Badge className="bg-[#0F3B27] text-[#92FF5F]">GAD-EN-010 · 10 ans</Badge>
            <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">Art. 7.15 à 7.20 · STU</Badge>
          </div>
          <p className="mt-1 text-sm text-[#475C50] max-w-2xl">Chaque entrée/sortie numérotée sans trou, signée et verrouillée. Balance permanente. Tout écart, vol ou destruction suit un circuit documenté. Dérivés du sang : registre distinct 40 ans (BPD3-F11).</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0F3B27] text-white px-3 py-1"><Lock className="w-3 h-3" /> Immuable après visa (INT-02)</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#CFF1D2] bg-white px-3 py-1 text-[#0F3B27]">Numéro d'ordre sans trou — serveur</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-purple-800">Armoire fermée à clé</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => setDialogMouvementOuvert(true)} className="gap-2 bg-[#0F3B27] hover:bg-[#164E35] text-white font-bold"><Plus className="w-4 h-4" /> Inscrire un mouvement</Button>
          <Badge variant="outline" className="justify-center border-amber-300 text-amber-800 bg-amber-50 text-xs">Conservation 10 ans — verrou suppression</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#CFF1D2] bg-white px-4 py-2.5 text-xs font-bold text-[#0F3B27]">
        <span className="flex items-center gap-1"><Scale className="w-3.5 h-3.5" /> Balance temps réel</span>
        <span className="text-[#475C50]">•</span>
        <span>{balance.length} substances suivies</span>
        <span className="text-[#475C50]">•</span>
        <span className={balance.some(b => !b.concordance_exacte) ? "text-red-700" : "text-emerald-700"}>{balance.filter(b => !b.concordance_exacte).length} écarts</span>
        <span className="ml-auto rounded-full bg-[#F7F9F7] border border-[#CFF1D2] px-2.5 py-1">{mouvements.length} mouvements</span>
      </div>

      {/* Navigation : une seule liste déroulante, filtrable */}
      <div className="rounded-2xl border border-[#CFF1D2] bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <SelecteurFiltrable
            id="section-stupefiants"
            etiquette="Section du registre"
            options={SECTIONS_STUPEIANTS}
            valeur={tab}
            onChange={setTab}
            placeholder="Choisir une section du registre…"
            placeholderRecherche="Filtrer : registre, balance, armoire, destruction…"
            className="md:max-w-xl"
          />
          <p className="text-[11px] font-medium leading-snug text-[#475C50] md:pb-2">
            Tapez quelques lettres pour aller droit au but. Le registre choisi s’affiche juste en dessous.
          </p>
        </div>
      </div>

        {tab === "registre" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {balance.length===0 ? <Card className="col-span-3 border-dashed border-[#CFF1D2]"><CardContent className="pt-6 text-center text-sm text-[#475C50]">Aucun stupéfiant au catalogue — ajouter un produit avec tableau “stupefiant”.</CardContent></Card> :
              balance.map(b => (
                <Card key={b.id} className={`border-[#CFF1D2] ${!b.concordance_exacte ? "border-red-400 bg-red-50/20" : "bg-white"}`}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-black text-[#0F3B27] flex items-center justify-between">{b.nom_commercial}{b.concordance_exacte ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertOctagon className="w-4 h-4 text-red-600" />}</CardTitle><CardDescription className="text-xs">CIP {b.code_cip} · {b.dosage || "—"} · {b.categorie}</CardDescription></CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-[#475C50]">Théorique (registre)</span><strong className="font-mono text-base text-[#0F3B27]">{b.stock_theorique_registre}</strong></div>
                    <div className="flex justify-between"><span className="text-[#475C50]">Physique (lots)</span><strong className="font-mono text-base">{b.stock_physique_lots}</strong></div>
                    {!b.concordance_exacte && <div className="rounded-xl bg-red-100 border border-red-300 px-2 py-1 text-red-800 font-bold">Écart {b.ecart} — alerte titulaire + NC/CAPA (STU-06)</div>}
                    {b.non_vises_count>0 && <div className="rounded-xl bg-amber-50 border border-amber-300 px-2 py-1 text-amber-800 font-bold">{b.non_vises_count} en attente de visa</div>}
                  </CardContent>
                </Card>
              ))}
          </div>

          <Card className="border-[#CFF1D2]">
            <CardHeader><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div><CardTitle className="text-sm font-black text-[#0F3B27]">Feuillets chronologiques — numérotés sans trou (STU-01)</CardTitle><CardDescription>Alimentation auto par dispensation/réception — saisie guidée casse/destruction/perte. Toute lecture nominative journalisée.</CardDescription></div>
              <div className="relative w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#475C50]" /><Input placeholder="N° ordre, pièce, patient, prescripteur..." className="pl-9 h-9 text-xs border-[#CFF1D2]" value={recherche} onChange={e=> setRecherche(e.target.value)} /></div>
            </div></CardHeader>
            <CardContent>
              {isLoading ? <div className="p-8 text-center text-[#475C50]">Chargement registre...</div> : mouvements.length===0 ? <div className="p-8 text-center text-[#475C50]">Aucun mouvement — réceptionnez un lot stupéfiant ou inscrivez manuellement.</div> : (
                <div className="overflow-x-auto"><table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F9F7] text-[#475C50] border-b border-[#CFF1D2] font-bold"><tr><th className="py-2 px-3">N° Ordre</th><th className="py-2 px-3">Date</th><th className="py-2 px-3">Produit</th><th className="py-2 px-3">Mouvement</th><th className="py-2 px-3 text-center">Qté</th><th className="py-2 px-3 text-center">Solde</th><th className="py-2 px-3">Pièce & Tiers</th><th className="py-2 px-3">Visa</th><th className="py-2 px-3"></th></tr></thead>
                  <tbody className="divide-y divide-[#CFF1D2]/50">
                    {mouvements.map(m=>(
                      <tr key={m.id} className="hover:bg-[#F7F9F7] font-sans">
                        <td className="py-2 px-3 font-mono font-black text-[#0F3B27]">#{String(m.numero_ordre).padStart(4,"0")}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{new Date(m.date_mouvement).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
                        <td className="py-2 px-3"><div className="font-bold text-[#0F3B27]">{m.produit?.nom_commercial}</div><div className="text-[11px] text-[#475C50] font-mono">Lot {m.lot?.numero_lot || "—"} · {m.categorie || ""}</div></td>
                        <td className="py-2 px-3">{m.type_mouvement==="entree_livraison" ? <Badge className="bg-[#CFF1D2] text-[#0F3B27] text-[11px]">Entrée</Badge> : m.type_mouvement==="sortie_dispensation" ? <Badge className="bg-purple-100 text-purple-800 text-[11px]">Sortie Délivrance</Badge> : <Badge variant="outline" className="text-[11px]">{m.type_mouvement}</Badge>}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{m.type_mouvement==="entree_livraison" ? <span className="text-[#0F3B27]">+{m.quantite}</span> : <span className="text-purple-700">-{m.quantite}</span>}</td>
                        <td className="py-2 px-3 text-center font-mono font-black bg-[#F7F9F7]">{m.stock_nouveau}</td>
                        <td className="py-2 px-3"><div className="font-bold">{m.reference_piece}</div><div className="text-[11px] text-[#475C50]">{m.tiers_nom || m.patient_nom || ""} {m.prescripteur_nom ? `(Presc: ${m.prescripteur_nom})`:""}</div></td>
                        <td className="py-2 px-3">{m.pharmacien_visa ? <Badge className="bg-[#0F3B27] text-white text-[11px] gap-1"><ShieldCheck className="w-3 h-3" /> {m.pharmacien_visa.name}</Badge> : <Button variant="outline" size="sm" onClick={()=> mutationViser.mutate(m.id)} className="h-7 text-[11px] border-purple-300 text-purple-700">Viser</Button>}</td>
                        <td className="py-2 px-3">{m.pharmacien_visa && <Button variant="ghost" size="sm" onClick={()=> { setMouvementPourRectif(m); setDialogRectifOuvert(true); }} className="h-7 text-[11px]">Rectifier</Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

        {tab === "balance" && (
        <div className="space-y-4">
          <Card className="border-[#0F3B27] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-white font-display font-black flex items-center gap-2"><Scale className="w-5 h-5 text-[#92FF5F]" /> Balance permanente (STU-04)</CardTitle><CardDescription className="text-[#CFF1D2]">Théorique (entrées - sorties) vs physique (lots) — rapprochement temps réel avec ventes. État à une date donnée.</CardDescription></CardHeader><CardContent className="text-xs text-[#CFF1D2]">Conservation registre & ordonnancier : 10 ans (GAD-EN-010), verrou suppression. Numéros attribués serveur, sans trou même hors-ligne.</CardContent></Card>
          <div className="overflow-x-auto"><table className="w-full text-xs text-left border border-[#CFF1D2] rounded-2xl overflow-hidden">
            <thead className="bg-[#F7F9F7] text-[#475C50] font-bold"><tr><th className="py-2 px-3">Produit</th><th className="py-2 px-3">Théorique</th><th className="py-2 px-3">Physique</th><th className="py-2 px-3">Écart</th><th className="py-2 px-3">Statut</th></tr></thead>
            <tbody className="divide-y divide-[#CFF1D2]/50">{balance.map(b=>(
              <tr key={b.id} className={b.concordance_exacte ? "" : "bg-red-50"}><td className="py-2 px-3 font-bold text-[#0F3B27]">{b.nom_commercial} <span className="font-normal text-[#475C50]">{b.dosage}</span></td><td className="py-2 px-3 font-mono font-bold">{b.stock_theorique_registre}</td><td className="py-2 px-3 font-mono">{b.stock_physique_lots}</td><td className="py-2 px-3 font-mono font-bold text-red-700">{b.ecart}</td><td className="py-2 px-3">{b.concordance_exacte ? <Badge className="bg-[#CFF1D2] text-[#0F3B27]">Conforme</Badge> : <Badge variant="destructive">Écart — NC</Badge>}</td></tr>
            ))}{balance.length===0 && <tr><td colSpan={5} className="py-6 text-center text-[#475C50]">Aucun produit — balance instantanée dès qu’un mouvement existe</td></tr>}</tbody>
          </table></div>
        </div>
      )}

        {tab === "ordonnancier" && (
        <div className="space-y-4">
          <Card className="border-purple-200 bg-purple-50/30"><CardHeader><CardTitle className="text-sm font-black text-purple-900 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Ordonnancier numérique (STU-07)</CardTitle><CardDescription className="text-purple-800">Chronologique numéroté sans rature, coté/paraphé numériquement, 10 ans. Lié aux ordonnances de /dispensation.</CardDescription></CardHeader><CardContent className="text-xs text-purple-800">GAD-EN-010 — conservation 10 ans. Tout retrait est tracé.</CardContent></Card>
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6">
            {ordonnancier.length===0 ? <div className="text-center text-sm text-[#475C50] py-6">Aucune entrée d’ordonnancier — les sorties dispensation y sont versées automatiquement</div> : (
              <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-[#F7F9F7] text-[#475C50] font-bold border-b border-[#CFF1D2]"><tr><th className="py-2 px-3">N°</th><th className="py-2 px-3">Date</th><th className="py-2 px-3">Patient / Prescripteur</th><th className="py-2 px-3">Produit</th><th className="py-2 px-3">Visa</th></tr></thead><tbody className="divide-y divide-[#CFF1D2]/50">{ordonnancier.map(o=>(
                <tr key={o.id}><td className="py-2 px-3 font-mono font-black">#{String(o.numero_ordre).padStart(4,"0")}</td><td className="py-2 px-3 font-mono text-[11px]">{formatDate(o.date_mouvement)}</td><td className="py-2 px-3 font-bold">{o.patient_nom || "—"} <span className="font-normal text-[#475C50]">{o.prescripteur_nom || ""}</span></td><td className="py-2 px-3">{o.produit?.nom_commercial}</td><td className="py-2 px-3">{o.pharmacien_visa ? <Badge className="bg-[#0F3B27] text-white text-[11px]">Visé</Badge> : <Badge variant="outline" className="text-[11px]">À viser</Badge>}</td></tr>
              ))}</tbody></table></div>
            )}
          </CardContent></Card>
        </div>
      )}

        {tab === "copies" && (
        <div className="space-y-4">
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-black text-[#0F3B27]">Copies d'ordonnances (STU-08)</CardTitle><CardDescription>Numérisation obligatoire à la délivrance, liée au mouvement — conservation 3 ans GAD-EN-012, accès pharmacien seul</CardDescription></CardHeader><CardContent><ZoneDepot label="Déposer pages d’ordonnance dans l’ordre voulu (multi-pages) — rattaché à la ligne du registre" /><div className="mt-4 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] p-3 text-xs text-[#475C50]">Chaque ordonnance est liée au mouvement correspondant. Pièce d'identité du patient/mandataire conservée avec accès restreint.</div></CardContent></Card>
        </div>
      )}

        {tab === "inventaire" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-display font-black text-[#0F3B27]">Inventaire stupéfiants — périodicité paramétrable (STU-05)</h3><Button size="sm" onClick={()=> setDialogInventaireOuvert(true)} className="bg-[#0F3B27] text-white font-bold gap-1"><Plus className="w-4 h-4" /> Lancer comptage</Button></div>
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Double signature pharmacien + témoin, PV d'inventaire 10 ans</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Tout écart ouvre une alerte titulaire + fiche NC/CAPA (STU-06). Comptage physique avec double signature.</CardContent></Card>
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-center text-sm text-[#475C50]">Aucun inventaire — lancez le comptage par produit stupéfiant</CardContent></Card>
        </div>
      )}

        {tab === "armoire" && (
        <div className="space-y-4">
          <Card className="border-purple-300 bg-purple-50"><CardHeader><CardTitle className="text-sm font-black text-purple-900 flex items-center gap-2"><Lock className="w-4 h-4" /> Armoire sécurisée fermée à clé (STU-09)</CardTitle><CardDescription className="text-purple-800">Réservée stupéfiants & listes I/II — contenu à jour par scan — refus d'y affecter un autre produit (BPD5-F11)</CardDescription></CardHeader><CardContent className="text-xs text-purple-800">Dernière vérif horodatée, accès pharmacien seul, inventaire périodique.</CardContent></Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(armoire.lots_stupefiants || []).map((l: any)=>(
              <Card key={l.id} className="border-purple-200"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-[#0F3B27]">{l.produit?.nom_commercial}</CardTitle><CardDescription className="text-xs">Lot {l.numero_lot} · péremption {l.date_peremption}</CardDescription></CardHeader><CardContent className="text-xs"><div className="flex justify-between"><span className="text-[#475C50]">Qté</span><strong className="font-mono">{l.quantite_disponible}</strong></div><div className="text-[11px] text-[#475C50]">Empl. {l.emplacement}</div></CardContent></Card>
            ))}
            {(armoire.lots_stupefiants || []).length===0 && <Card className="col-span-full border-dashed border-[#CFF1D2]"><CardContent className="pt-6 text-center text-sm text-[#475C50]">Aucun lot stupéfiant en armoire — réceptionnez un produit classé stupéfiant</CardContent></Card>}
          </div>
        </div>
      )}

        {tab === "ecarts" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-amber-300 bg-amber-50"><CardHeader><CardTitle className="text-sm font-black text-amber-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Écarts — alerte auto (STU-06)</CardTitle></CardHeader><CardContent className="text-xs text-amber-800">Justification obligatoire, suivi jusqu’à clôture — génération NC/CAPA automatique</CardContent></Card>
            <Card className="border-red-300 bg-red-50"><CardHeader><CardTitle className="text-sm font-black text-red-800 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Vol / Perte — déclaration (STU-10)</CardTitle></CardHeader><CardContent className="text-xs text-red-800">Modèle lettre police/gendarmerie/ABMed, référence, suivi — alerte critique push+SMS au promoteur</CardContent></Card>
          </div>
          <div className="flex gap-2">
            <Button onClick={()=> setDialogVolOuvert(true)} variant="outline" className="border-red-300 text-red-800 font-bold"><ShieldAlert className="w-4 h-4 mr-1" /> Déclarer vol/perte</Button>
            <Button onClick={()=> toast.info("Modèle lettre : en cours — génération PDF")} variant="outline" className="border-[#CFF1D2] font-bold"><FileText className="w-4 h-4 mr-1" /> Modèle lettre</Button>
          </div>
          <ZoneDepot label="Récépissé de déclaration, courrier autorité — rattacher à la ligne" />
        </div>
      )}

        {tab === "destruction" && (
        <div className="space-y-4">
          <Card className="border-red-300 bg-red-50/50"><CardHeader><CardTitle className="text-sm font-black text-red-800">Destruction & retours (STU-11/12)</CardTitle><CardDescription className="text-red-700">Autorisation, constitution lot, prestataire qualifié, PV contradictoire, certificat — sortie registre correspondante. Retours de particuliers placés en armoire en attente.</CardDescription></CardHeader><CardContent className="flex gap-2">
            <Button onClick={()=> setDialogDestructionOuvert(true)} className="bg-[#0F3B27] text-white font-bold gap-1"><Trash2 className="w-4 h-4" /> Demander destruction</Button>
            <Button variant="outline" className="border-[#CFF1D2] font-bold">Constituer lot à détruire</Button>
          </CardContent></Card>
          <ZoneDepot label="Autorisation, PV signé, certificat d'incinération — coffre-fort numérique 10 ans" />
        </div>
      )}

        {tab === "rapports" && (
        <div className="space-y-4">
          <Card className="border-[#0F3B27] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-white font-display font-black flex items-center gap-2"><Eye className="w-5 h-5 text-[#92FF5F]" /> Mode inspecteur & rapports (STU-14)</CardTitle><CardDescription className="text-[#CFF1D2]">Extraits par période/produit/lot, balance, écarts — PDF/Excel filigrane + signature — consultation lecture seule journalisée</CardDescription></CardHeader><CardContent className="text-xs text-[#CFF1D2]">Dérivés du sang : registre distinct 40 ans verrouillé (BPD3-F11). Toute lecture nominative journalisée (RG-D01).</CardContent></Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Export registre</CardTitle></CardHeader><CardContent><Button variant="outline" className="w-full font-bold border-[#CFF1D2]"><FileSpreadsheet className="w-4 h-4 mr-1" /> PDF GAD-EN-010</Button></CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Balance à date</CardTitle></CardHeader><CardContent><Button variant="outline" className="w-full font-bold border-[#CFF1D2]"><Scale className="w-4 h-4 mr-1" /> Extraire balance</Button></CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Recherche</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Par produit, lot, n° ordre, prescripteur, période — patient réservé pharmacien (STU-15)</CardContent></Card>
          </div>
        </div>
      )}

      {/* Dialog Mouvement manuel STU-02 — modale horizontale */}
      <Dialog open={dialogMouvementOuvert} onOpenChange={setDialogMouvementOuvert}>
        <ModaleFiche
          titre="Inscrire un mouvement à la main (STU-02)"
          sousTitre="Pour tout ce qui n’est pas une vente : casse, perte, ajustement d’inventaire, retour ou entrée de livraison. Le numéro d’ordre est attribué par le serveur, sans trou."
          badge={<Badge className="bg-purple-100 text-purple-800">Registre Tab. B</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogMouvementOuvert(false)} className="h-12 rounded-xl sm:h-11">Annuler</Button>
              <Button type="submit" form="form-mouvement" disabled={mutationCreer.isPending} className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11">
                {mutationCreer.isPending ? "…" : "Inscrire — numéro attribué par le serveur"}
              </Button>
            </div>
          }
        >
          <form id="form-mouvement" onSubmit={handleMouvementSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="Ce qui bouge" aide="La substance, le sens du mouvement et la quantité.">
              <Champ label="Produit stupéfiant" obligatoire aide="Seuls les produits classés stupéfiants ou listes I et II apparaissent ici.">
                <select className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]" value={produitId} onChange={e => setProduitId(e.target.value)} required>
                  <option value="">Choisir la substance concernée…</option>
                  {produitsStup.map((p: any) => <option key={p.id} value={p.id}>{p.nom_commercial} ({p.code_cip}) — {p.dosage}</option>)}
                </select>
              </Champ>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Nature du mouvement" obligatoire>
                  <select className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]" value={typeMouvement} onChange={e => setTypeMouvement(e.target.value)}>
                    <option value="ajustement_inventaire">Ajustement après inventaire</option>
                    <option value="vol_perte">Vol ou perte</option>
                    <option value="destruction_perime">Destruction d’un lot périmé</option>
                    <option value="retour_particulier">Retour d’un particulier</option>
                    <option value="entree_livraison">Entrée d’une livraison</option>
                  </select>
                </Champ>
                <Champ label="Quantité" obligatoire aide="En unités de délivrance (boîtes, flacons).">
                  <Input type="number" min="1" inputMode="numeric" value={quantite} onChange={e => setQuantite(e.target.value)} placeholder="Ex. 2" className="h-12 rounded-xl" required />
                </Champ>
              </div>
              <Champ label="Pièce justificative" obligatoire aide="Le numéro du document qui autorise ce mouvement : BL, PV, déclaration…">
                <Input placeholder="Ex. BL-2026-0087 · PV-2026-004 · déclaration du 04/11/2026" value={referencePiece} onChange={e => setReferencePiece(e.target.value)} className="h-12 rounded-xl" required />
              </Champ>
            </ColonneFiche>

            <ColonneFiche titre="Qui est concerné" aide="Uniquement pour une sortie vers un patient.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Patient">
                  <Input placeholder="Nom du patient" value={patientNom} onChange={e => setPatientNom(e.target.value)} className="h-12 rounded-xl" />
                </Champ>
                <Champ label="Prescripteur">
                  <Input placeholder="Ex. Dr ADJASSA" value={prescripteurNom} onChange={e => setPrescripteurNom(e.target.value)} className="h-12 rounded-xl" />
                </Champ>
              </div>
              <Champ label="Observations" aide="Ce qui explique le mouvement, en une phrase claire.">
                <Textarea rows={4} placeholder="Ex. Boîte tombée au sol pendant le rangement, contenu non utilisable." value={observations} onChange={e => setObservations(e.target.value)} className="rounded-xl text-sm" />
              </Champ>
              <ZoneDepot label="Joindre la copie d’ordonnance et la pièce d’identité si c’est une délivrance" />
            </ColonneFiche>
          </form>
        </ModaleFiche>
      </Dialog>

      {/* Écriture rectificative STU-03 */}
      <Dialog open={dialogRectifOuvert} onOpenChange={setDialogRectifOuvert}>
        <ModaleFiche
          titre="Écriture rectificative (STU-03)"
          sousTitre={mouvementPourRectif ? `Ligne n° ${String(mouvementPourRectif.numero_ordre).padStart(4, "0")} — on ne rature pas, on ne supprime pas : on ajoute une ligne qui corrige.` : "On ne rature pas : on ajoute une ligne qui corrige."}
          badge={<Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-800">INT-02</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogRectifOuvert(false)} className="h-12 rounded-xl sm:h-11">Annuler</Button>
              <Button className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11" disabled={!rectifMotif} onClick={() => mouvementPourRectif && mutationRectif.mutate({ id: mouvementPourRectif.id, motif: rectifMotif, qte: rectifQte })}>
                Créer la rectificative
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="La ligne d’origine">
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3 text-xs">
                <p className="font-display text-sm font-black text-[#0F3B27]">
                  N° {mouvementPourRectif ? String(mouvementPourRectif.numero_ordre).padStart(4, "0") : "—"} · {mouvementPourRectif?.produit?.nom_commercial ?? "—"}
                </p>
                <p className="mt-1 text-[#475C50]">
                  {mouvementPourRectif ? formatDate(mouvementPourRectif.date_mouvement) : "—"} · quantité {mouvementPourRectif?.quantite ?? "—"} · solde {mouvementPourRectif?.stock_nouveau ?? "—"}
                </p>
                <p className="mt-1 text-[#475C50]">Pièce : {mouvementPourRectif?.reference_piece ?? "—"}</p>
                {mouvementPourRectif?.pharmacien_visa ? <p className="mt-1 text-[#0F3B27] font-bold">Visé par {mouvementPourRectif.pharmacien_visa.name}</p> : null}
              </div>
              <div className="rounded-2xl border border-[#CFF1D2] p-3 text-[11px] leading-relaxed text-[#475C50]">
                La rectificative garde le lien avec la ligne d’origine. La ligne initiale et son visa restent visibles : c’est ce qui fait la valeur du registre devant l’inspection.
              </div>
            </ColonneFiche>
            <ColonneFiche titre="La correction">
              <Champ label="Quantité corrective" aide="Mettez le nombre à ajouter ou à retirer, sans changer la ligne d’origine.">
                <Input type="number" value={rectifQte} onChange={e => setRectifQte(e.target.value)} className="h-12 rounded-xl" />
              </Champ>
              <Champ label="Motif de la rectification" obligatoire aide="Expliquez l’erreur constatée et la référence qui la prouve.">
                <Textarea rows={5} placeholder="Ex. erreur de saisie sur la quantité : le bon de livraison indiquait 10 boîtes et non 1." value={rectifMotif} onChange={e => setRectifMotif(e.target.value)} className="rounded-xl text-sm" />
              </Champ>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>

      {/* Inventaire STU-05 */}
      <Dialog open={dialogInventaireOuvert} onOpenChange={setDialogInventaireOuvert}>
        <ModaleFiche
          titre="Inventaire des stupéfiants (STU-05)"
          sousTitre="Le comptage physique se fait en présence du pharmacien et d’un témoin. Tout écart ouvre une alerte au titulaire et une fiche NC/CAPA."
          badge={<Badge className="bg-[#0F3B27] text-[#92FF5F]">Double signature</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogInventaireOuvert(false)} className="h-12 rounded-xl sm:h-11">Annuler</Button>
              <Button className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11" disabled={!produitId} onClick={() => mutationInventaire.mutate({ produit_id: produitId, quantite_physique: parseInt(quantite, 10), commentaire: observations })}>
                Valider le comptage
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="Ce que l’on compte">
              <Champ label="Produit stupéfiant" obligatoire>
                <select className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]" value={produitId} onChange={e => setProduitId(e.target.value)}>
                  <option value="">Choisir la substance à compter…</option>
                  {produitsStup.map((p: any) => <option key={p.id} value={p.id}>{p.nom_commercial} — {p.dosage ?? p.code_cip}</option>)}
                </select>
              </Champ>
              <Champ label="Quantité physiquement comptée" obligatoire aide="Le nombre réellement sorti de l’armoire et compté une seconde fois par le témoin.">
                <Input type="number" min="0" inputMode="numeric" value={quantite} onChange={e => setQuantite(e.target.value)} className="h-12 rounded-xl" />
              </Champ>
            </ColonneFiche>
            <ColonneFiche titre="La preuve du comptage">
              <Champ label="Observations" aide="Précisez qui a compté, en présence de qui, et toute anomalie constatée.">
                <Textarea rows={5} placeholder="Ex. comptage à deux, en présence de Dr HOUNNOU et de M. KPADONOU, armoire ouverte par le pharmacien." value={observations} onChange={e => setObservations(e.target.value)} className="rounded-xl text-sm" />
              </Champ>
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                Un écart de comptage n’est jamais corrigé en silence : il déclenche une fiche de non-conformité et une action corrective, conservées dix ans avec le procès-verbal.
              </div>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>

      {/* Vol / perte STU-10 */}
      <Dialog open={dialogVolOuvert} onOpenChange={setDialogVolOuvert}>
        <ModaleFiche
          titre="Déclarer un vol ou une perte (STU-10)"
          sousTitre="La déclaration génère le modèle de lettre pour la police, la gendarmerie ou l’ABMed, et alerte le promoteur par notification immédiate."
          badge={<Badge className="bg-red-600 text-white">Alerte critique</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogVolOuvert(false)} className="h-12 rounded-xl sm:h-11">Annuler</Button>
              <Button variant="destructive" className="h-12 rounded-xl sm:h-11" disabled={!produitId || !referencePiece} onClick={() => mutationVol.mutate({ produit_id: produitId, quantite: parseInt(quantite, 10), declaration_ref: referencePiece, observations })}>
                Déclarer le vol ou la perte
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="Ce qui manque">
              <Champ label="Produit stupéfiant" obligatoire>
                <select className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]" value={produitId} onChange={e => setProduitId(e.target.value)}>
                  <option value="">Choisir la substance concernée…</option>
                  {produitsStup.map((p: any) => <option key={p.id} value={p.id}>{p.nom_commercial} — {p.dosage ?? p.code_cip}</option>)}
                </select>
              </Champ>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Quantité manquante" obligatoire>
                  <Input type="number" min="1" inputMode="numeric" value={quantite} onChange={e => setQuantite(e.target.value)} className="h-12 rounded-xl" />
                </Champ>
                <Champ label="Référence de la déclaration" obligatoire aide="Le numéro du procès-verbal ou du dépôt de plainte.">
                  <Input placeholder="Ex. PV-2026-014" value={referencePiece} onChange={e => setReferencePiece(e.target.value)} className="h-12 rounded-xl" />
                </Champ>
              </div>
            </ColonneFiche>
            <ColonneFiche titre="Le récit des faits">
              <Champ label="Circonstances" aide="Date, heure, lieu, circonstances constatées — sans interprétation.">
                <Textarea rows={6} placeholder="Ex. constat le 04/11/2026 à l’ouverture : la serrure de l’armoire portait une trace, deux boîtes manquaient au comptage." value={observations} onChange={e => setObservations(e.target.value)} className="rounded-xl text-sm" />
              </Champ>
              <ZoneDepot label="Joindre le récépissé de dépôt et les photos constatées" />
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>

      {/* Destruction STU-11 */}
      <Dialog open={dialogDestructionOuvert} onOpenChange={setDialogDestructionOuvert}>
        <ModaleFiche
          titre="Demander l’autorisation de destruction (STU-11)"
          sousTitre="La demande part vers l’autorité compétente. Une fois accordée, la destruction se fait chez un prestataire qualifié, avec procès-verbal contradictoire et certificat d’incinération."
          badge={<Badge className="bg-red-600 text-white">BPD-9</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogDestructionOuvert(false)} className="h-12 rounded-xl sm:h-11">Annuler</Button>
              <Button className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11" disabled={!produitId || !referencePiece} onClick={() => mutationDestruction.mutate({ produit_id: produitId, quantite: parseInt(quantite, 10), autorisation_ref: referencePiece, prestataire: observations })}>
                Envoyer la demande
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="Ce qui doit être détruit">
              <Champ label="Produit stupéfiant" obligatoire>
                <select className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]" value={produitId} onChange={e => setProduitId(e.target.value)}>
                  <option value="">Choisir la substance concernée…</option>
                  {produitsStup.map((p: any) => <option key={p.id} value={p.id}>{p.nom_commercial} — {p.dosage ?? p.code_cip}</option>)}
                </select>
              </Champ>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Quantité" obligatoire>
                  <Input type="number" min="1" inputMode="numeric" value={quantite} onChange={e => setQuantite(e.target.value)} className="h-12 rounded-xl" />
                </Champ>
                <Champ label="Référence de l’autorisation" obligatoire aide="Le numéro du courrier d’autorisation reçu.">
                  <Input placeholder="Ex. AUT-2026-003" value={referencePiece} onChange={e => setReferencePiece(e.target.value)} className="h-12 rounded-xl" />
                </Champ>
              </div>
            </ColonneFiche>
            <ColonneFiche titre="Le prestataire et la preuve">
              <Champ label="Prestataire et modalités" aide="Indiquez l’entreprise habilitée, le lieu et la date prévue de l’opération.">
                <Textarea rows={5} placeholder="Ex. destruction par incinération chez SANOFI-DÉCHETS à Cotonou, prévue le 12/11/2026 en présence du pharmacien." value={observations} onChange={e => setObservations(e.target.value)} className="rounded-xl text-sm" />
              </Champ>
              <ZoneDepot label="Joindre l’autorisation, le procès-verbal signé et le certificat d’incinération" />
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>
    </div>
  );
}
