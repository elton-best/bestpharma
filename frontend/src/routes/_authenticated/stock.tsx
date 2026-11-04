import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PackageCheck,
  AlertOctagon,
  Calendar,
  AlertTriangle,
  Plus,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Archive,
  ArrowRight,
  Filter,
  Package,
  MapPin,
  History,
  ClipboardList,
  Trash2,
  TrendingUp,
  Download,
  Upload,
  FileWarning,
  Thermometer,
  Verified,
  Boxes,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/stock")({
  head: () => ({
    meta: [
      { title: "Magasin & Stocks — BEGPHARMA" },
      { name: "description", content: "Vérité physique et réglementaire : FEFO, traçabilité, quarantaine, inventaires, valorisation — conforme BPD-5 / BPD-8 / BPD-9." },
    ],
  }),
  component: PageStockMagasin,
});

// ─── Types
interface Produit {
  id: string;
  code_cip: string;
  code_interne?: string;
  nom_commercial: string;
  dci?: string;
  forme?: string;
  dosage?: string;
  laboratoire?: string;
  tableau_substance: "sans" | "liste_1" | "liste_2" | "stupefiant";
  classe_produit?: string;
  est_thermolabile: boolean;
  groupe_taxation?: string;
  prix_public_ttc: number;
  prix_achat_moyen?: number;
  stock_total: number;
  seuil_stock_min?: number;
  stock_max?: number;
  alerte_rupture: boolean;
  prochain_lot_fefo?: { id: string; numero_lot: string; date_peremption: string; quantite_disponible: number; jours_avant_peremption: number; statut_peremption: string };
}

interface StockLotItem {
  id: string;
  produit_id: string;
  numero_lot: string;
  date_peremption: string;
  date_reception?: string;
  quantite_disponible: number;
  quantite_initiale: number;
  emplacement: string;
  emplacement_id?: string;
  fournisseur_nom: string;
  bon_livraison_ref: string;
  statut: string;
  statut_detail?: string;
  statut_effectif?: string;
  est_vendable?: boolean;
  motif_quarantaine?: string;
  motif_statut?: string;
  jours_avant_peremption: number;
  statut_peremption: string;
  controles_reception?: Record<string, boolean>;
  produit: Produit;
}

interface EmplacementItem {
  id: string;
  code: string;
  libelle: string;
  type_zone: string;
  lots_count?: number;
}

interface MouvementItem {
  id: string;
  type_mouvement: string;
  quantite: number;
  stock_avant: number;
  stock_apres: number;
  motif?: string;
  reference_piece?: string;
  created_at: string;
  produit?: Produit;
  lot?: StockLotItem;
  auteur?: { name: string };
}

function badgeAlerte(statutPeremption: string, jours: number) {
  if (statutPeremption === "perime" || jours < 0) return <Badge className="bg-[#dc2626] text-white gap-1">Périmé ({jours}j)</Badge>;
  if (statutPeremption === "critique_1m" || jours <= 30) return <Badge className="bg-red-500 text-white gap-1 animate-pulse"><AlertTriangle className="w-3 h-3" /> Critique (&lt;30j)</Badge>;
  if (statutPeremption === "alerte_3m" || jours <= 90) return <Badge className="bg-amber-500 text-white gap-1"><Clock className="w-3 h-3" /> Alerte 3 mois</Badge>;
  if (statutPeremption === "attention_6m" || jours <= 180) return <Badge className="bg-blue-600 text-white gap-1"><Calendar className="w-3 h-3" /> Attention 6 mois</Badge>;
  return <Badge className="bg-[#0F3B27] text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Conforme ({jours}j)</Badge>;
}

function badgeStatut(lot: StockLotItem) {
  const s = lot.statut_effectif || lot.statut_detail || lot.statut;
  const map: Record<string, { label: string; cls: string }> = {
    commercialisable: { label: "Commercialisable", cls: "bg-[#CFF1D2] text-[#0F3B27] border-[#0F3B27]/20" },
    en_attente_controle: { label: "En attente de contrôle", cls: "bg-amber-100 text-amber-800 border-amber-300" },
    a_evaluer: { label: "À évaluer", cls: "bg-orange-100 text-orange-800 border-orange-300" },
    quarantaine: { label: "Quarantaine", cls: "bg-amber-200 text-amber-900 border-amber-400" },
    attente_retour: { label: "Attente retour fournisseur", cls: "bg-blue-100 text-blue-800 border-blue-300" },
    rejete: { label: "Rejeté", cls: "bg-red-100 text-red-800 border-red-300" },
    dechet: { label: "Déchet à détruire", cls: "bg-slate-800 text-white" },
    epuise: { label: "Épuisé", cls: "bg-slate-100 text-slate-500" },
    en_stock: { label: "Commercialisable", cls: "bg-[#CFF1D2] text-[#0F3B27]" },
  };
  const v = map[s] || { label: s, cls: "bg-slate-100 text-slate-700" };
  return <Badge variant="outline" className={`text-[11px] font-bold ${v.cls}`}>{v.label}</Badge>;
}

// Composant réutilisable : glisser-déposer fichier (0.4)
function ZoneDepot({ label, onFiles }: { label: string; onFiles?: (files: FileList) => void }) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files && onFiles) onFiles(e.dataTransfer.files); toast.success(`${e.dataTransfer.files.length} fichier(s) déposé(s) — chiffrage SHA-256 en cours`); }}
      className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${dragOver ? "border-[#0F3B27] bg-[#CFF1D2]/30" : "border-[#CFF1D2] bg-[#F7F9F7]"}`}
    >
      <Upload className={`mx-auto w-6 h-6 ${dragOver ? "text-[#0F3B27]" : "text-[#475C50]"}`} />
      <p className="mt-2 text-xs font-bold text-[#0F3B27]">{label}</p>
      <p className="text-[11px] text-[#475C50]">Glisser-déposer, caméra ou sélecteur — JPG/PNG/PDF/CSV 10 Mo max</p>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#CFF1D2] bg-white px-3 py-1.5 text-xs font-bold text-[#0F3B27] hover:bg-[#CFF1D2]/30">
        <ScanLine className="w-3.5 h-3.5" /> Choisir des fichiers
        <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.csv,.xlsx" className="hidden" onChange={(e) => e.target.files && onFiles?.(e.target.files)} />
      </label>
    </div>
  );
}

function PageStockMagasin() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("vue-ensemble");
  const [recherche, setRecherche] = useState("");
  const [filtreAlerte, setFiltreAlerte] = useState("tous");
  const [dialogReceptionOuvert, setDialogReceptionOuvert] = useState(false);
  const [dialogQuarantaineOuvert, setDialogQuarantaineOuvert] = useState(false);
  const [dialogChangementStatutOuvert, setDialogChangementStatutOuvert] = useState(false);
  const [lotPourAction, setLotPourAction] = useState<StockLotItem | null>(null);
  const [motif, setMotif] = useState("");
  const [statutCible, setStatutCible] = useState("quarantaine");
  const [produitId, setProduitId] = useState("");
  const [numeroLot, setNumeroLot] = useState("");
  const [datePeremption, setDatePeremption] = useState("");
  const [quantite, setQuantite] = useState("");
  const [fournisseurNom, setFournisseurNom] = useState("CAMEG BÉNIN");
  const [bonLivraisonRef, setBonLivraisonRef] = useState("");
  const [emplacement, setEmplacement] = useState("Réserve — Stock principal");
  const [controles, setControles] = useState({ alerte_sanitaire_verifiee: false, emballage_intact: false, conformite_livraison: false, dates_conformes: false, chaine_froid_respectee: false });

  // Queries
  const { data: produitsData } = useQuery<{ data: Produit[] }>({ queryKey: ["produits"], queryFn: () => api.get("/produits") });
  const { data: lotsData, isLoading } = useQuery<{ data: StockLotItem[]; stats: any }>({
    queryKey: ["stocks", filtreAlerte, recherche],
    queryFn: () => { const p = new URLSearchParams(); if (filtreAlerte !== "tous") p.append("alerte", filtreAlerte); if (recherche) p.append("q", recherche); return api.get(`/stocks?${p.toString()}`); },
  });
  const { data: emplacementsData } = useQuery<{ data: EmplacementItem[] }>({ queryKey: ["emplacements"], queryFn: () => api.get("/emplacements") });
  const { data: mouvementsData } = useQuery<{ data: { data: MouvementItem[] } }>({ queryKey: ["mouvements"], queryFn: () => api.get("/mouvements") });
  const { data: alertesData } = useQuery<{ data: any }>({ queryKey: ["stocks-alertes"], queryFn: () => api.get("/stocks/alertes") });
  const { data: peremptionsData } = useQuery<{ data: any }>({ queryKey: ["peremptions"], queryFn: () => api.get("/stocks/peremptions").catch(() => ({ data: { a_1_mois: [], a_3_mois: [], a_6_mois: [], perimes: [] } })) });
  const { data: valorisationData } = useQuery<{ data: any }>({ queryKey: ["valorisation"], queryFn: () => api.get("/stocks/valorisation").catch(() => ({ data: { total: 0, par_produit: [] } })) });

  const mutationReception = useMutation({
    mutationFn: (payload: any) => api.post("/stocks", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Lot réceptionné — règle FEFO appliquée");
      queryClient.invalidateQueries({ queryKey: ["stocks"] }); queryClient.invalidateQueries({ queryKey: ["produits"] }); queryClient.invalidateQueries({ queryKey: ["mouvements"] });
      setDialogReceptionOuvert(false); setNumeroLot(""); setDatePeremption(""); setQuantite(""); setBonLivraisonRef(""); setControles({ alerte_sanitaire_verifiee: false, emballage_intact: false, conformite_livraison: false, dates_conformes: false, chaine_froid_respectee: false });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const mutationChangerStatut = useMutation({
    mutationFn: ({ id, statut, motif }: any) => api.put(`/stocks/${id}/statut`, { statut, motif }),
    onSuccess: (res: any) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: ["stocks"] }); queryClient.invalidateQueries({ queryKey: ["mouvements"] }); setDialogChangementStatutOuvert(false); setDialogQuarantaineOuvert(false); setMotif(""); setLotPourAction(null); },
    onError: (err: any) => toast.error(err.message),
  });
  const mutationQuarantaine = useMutation({
    mutationFn: ({ id, motif }: any) => api.post(`/stocks/${id}/quarantaine`, { motif }),
    onSuccess: (res: any) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: ["stocks"] }); setDialogQuarantaineOuvert(false); setMotif(""); },
    onError: (err: any) => toast.error(err.message),
  });
  const mutationLever = useMutation({
    mutationFn: (id: string) => api.post(`/stocks/${id}/lever-quarantaine`, {}),
    onSuccess: (res: any) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: ["stocks"] }); },
    onError: (err: any) => toast.error(err.message),
  });

  const produits = produitsData?.data || [];
  const lots = lotsData?.data || [];
  const stats = lotsData?.stats || { perimes: 0, critiques_1m: 0, alertes_3m: 0, total_lots_actifs: 0, valorisation_totale: 0 };
  const emplacements = emplacementsData?.data || [];
  const mouvements = (mouvementsData?.data as any)?.data || (mouvementsData as any)?.data || [];
  const alertes = (alertesData as any)?.data || { ruptures: 0, lots_bloques: 0, perimes: 0, rappels_actifs: 0 };
  const peremptions = (peremptionsData as any)?.data || { a_1_mois: [], a_3_mois: [], a_6_mois: [], perimes: [] };
  const valorisation = (valorisationData as any)?.data || { total: 0, par_produit: [] };

  const handleReceptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produitId || !numeroLot || !datePeremption || !quantite || !bonLivraisonRef) { toast.error("Champs obligatoires manquants"); return; }
    const tousChecks = controles.alerte_sanitaire_verifiee && controles.emballage_intact && controles.conformite_livraison && controles.dates_conformes;
    if (!tousChecks) { toast.error("Contrôles obligatoires incomplets — le lot passera en 'En attente de contrôle' (STO-05)"); }
    mutationReception.mutate({
      produit_id: produitId, numero_lot: numeroLot, date_peremption: datePeremption, quantite: parseInt(quantite, 10),
      fournisseur_nom: fournisseurNom, bon_livraison_ref: bonLivraisonRef, emplacement,
      controles_reception: controles,
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec charte BEGPHARMA */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-black tracking-tight text-[#0F3B27]">Magasin & Stocks</h1>
            <Badge className="bg-[#0F3B27] text-[#92FF5F] border-[#0F3B27]">BPD-5 · FEFO · STO</Badge>
            <Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">§0.2 — 8 statuts</Badge>
          </div>
          <p className="mt-1 text-sm text-[#475C50] max-w-2xl">
            Vérité physique et réglementaire : chaque boîte tracée par lot, emplacement et statut. Alimente caisse (FEFO vendable), dispensation et comptabilité (CMP, pertes).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#CFF1D2] px-3 py-1 text-[#0F3B27]"><Thermometer className="w-3.5 h-3.5" /> Chaîne du froid 2–8 °C</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3B27] text-[#92FF5F] px-3 py-1"><Verified className="w-3.5 h-3.5" /> Lot unique (INT-01)</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F]/30 border border-[#0F3B27]/10 px-3 py-1 text-[#0F3B27]">FCFA sans décimale · JJ/MM/AAAA</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button onClick={() => setDialogReceptionOuvert(true)} className="gap-2 bg-[#0F3B27] hover:bg-[#164E35] text-white font-bold shadow-md">
            <Plus className="w-4 h-4" /> Réceptionner un lot
          </Button>
          <div className="flex items-center gap-2 text-xs">
            <Button variant="outline" className="h-8 text-xs border-[#CFF1D2] text-[#0F3B27]"><Download className="w-3.5 h-3.5 mr-1" /> Export</Button>
            <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50">{alertes.lots_bloques} bloqués</Badge>
          </div>
        </div>
      </div>

      {/* Barre d'état permanente (0.5) */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#CFF1D2] bg-white px-4 py-2.5 shadow-sm text-xs font-bold text-[#0F3B27]">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> En ligne</span>
        <span className="text-[#475C50]">•</span>
        <span>{stats.total_lots_actifs} lots actifs</span>
        <span className="text-[#475C50]">•</span>
        <span className={alertes.lots_bloques > 0 ? "text-amber-700" : ""}><AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> {alertes.lots_bloques} bloqués</span>
        <span className="text-[#475C50]">•</span>
        <span className={stats.perimes > 0 ? "text-red-700" : ""}><ShieldAlert className="w-3.5 h-3.5 inline mr-1" /> {stats.perimes} périmés</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#F7F9F7] border border-[#CFF1D2] px-2.5 py-1">Valeur stock : {(stats.valorisation_totale || valorisation.total || 0).toLocaleString("fr-FR")} FCFA</span>
      </div>

      {/* Onglets — 12 onglets du cahier §1.2 */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-auto flex-wrap gap-1 bg-[#F7F9F7] p-1 border border-[#CFF1D2] rounded-2xl">
            <TabsTrigger value="vue-ensemble" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><Layers className="w-3.5 h-3.5" /> Vue d’ensemble</TabsTrigger>
            <TabsTrigger value="produits" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><Package className="w-3.5 h-3.5" /> Produits</TabsTrigger>
            <TabsTrigger value="lots" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><Boxes className="w-3.5 h-3.5" /> Lots</TabsTrigger>
            <TabsTrigger value="emplacements" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><MapPin className="w-3.5 h-3.5" /> Emplacements</TabsTrigger>
            <TabsTrigger value="mouvements" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><History className="w-3.5 h-3.5" /> Mouvements</TabsTrigger>
            <TabsTrigger value="reception" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><ScanLine className="w-3.5 h-3.5" /> Réception</TabsTrigger>
            <TabsTrigger value="inventaires" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><ClipboardList className="w-3.5 h-3.5" /> Inventaires</TabsTrigger>
            <TabsTrigger value="peremptions" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><Calendar className="w-3.5 h-3.5" /> Péremptions</TabsTrigger>
            <TabsTrigger value="quarantaine" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><ShieldAlert className="w-3.5 h-3.5" /> Quarantaine & Rappels</TabsTrigger>
            <TabsTrigger value="dechets" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><Trash2 className="w-3.5 h-3.5" /> Déchets</TabsTrigger>
            <TabsTrigger value="valorisation" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F]"><TrendingUp className="w-3.5 h-3.5" /> Valorisation</TabsTrigger>
          </TabsList>
        </div>

        {/* VUe d'ensemble STO-01 */}
        <TabsContent value="vue-ensemble" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-[#CFF1D2] bg-white shadow-sm"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-bold text-[#475C50]">Valeur du stock (CMP)</CardTitle><TrendingUp className="w-4 h-4 text-[#0F3B27]" /></CardHeader><CardContent><div className="text-2xl font-black font-display text-[#0F3B27]">{(valorisation.total || stats.valorisation_totale || 0).toLocaleString("fr-FR")} <span className="text-sm font-sans">FCFA</span></div><p className="text-xs text-[#475C50]">Coût moyen pondéré — rapproché compte stock</p></CardContent></Card>
            <Card className={`border-[#CFF1D2] ${alertes.ruptures > 0 ? "border-amber-400 bg-amber-50/30" : "bg-white"}`}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-bold text-[#475C50]">Ruptures & sous minimum</CardTitle><AlertOctagon className="w-4 h-4 text-amber-600" /></CardHeader><CardContent><div className="text-2xl font-black text-amber-700">{alertes.ruptures ?? 0}</div><p className="text-xs text-[#475C50]">Seuils paramétrables</p></CardContent></Card>
            <Card className="border-[#CFF1D2] bg-white"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-bold text-[#475C50]">Lots actifs FEFO</CardTitle><Layers className="w-4 h-4 text-[#0F3B27]" /></CardHeader><CardContent><div className="text-2xl font-black text-[#0F3B27]">{stats.total_lots_actifs}</div><p className="text-xs text-[#475C50]">Ordre péremption — prochain à sortir prioritaire</p></CardContent></Card>
            <Card className={`border-[#CFF1D2] ${stats.perimes > 0 ? "border-red-500 bg-red-50" : "bg-white"}`}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-bold text-[#475C50]">Périmés interdits</CardTitle><ShieldAlert className="w-4 h-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-black text-red-700">{stats.perimes}</div><p className="text-xs text-red-700">Mise en quarantaine obligatoire — vente refusée</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Péremptions à surveiller</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#475C50]">À 6 mois</span><strong className="text-[#0F3B27]">{peremptions.a_6_mois?.length ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-[#475C50]">À 3 mois</span><strong className="text-amber-700">{peremptions.a_3_mois?.length ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-[#475C50]">À 1 mois (critique)</span><strong className="text-red-700">{peremptions.a_1_mois?.length ?? 0}</strong></div>
              <div className="flex justify-between border-t border-[#CFF1D2] pt-2"><span className="text-[#475C50]">Lots bloqués</span><strong className="text-[#0F3B27]">{alertes.lots_bloques}</strong></div>
            </CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Produits dormants & surstock</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Classement ABC, rotation et couverture en jours disponibles dans l’onglet Valorisation (STO-19).</CardContent></Card>
            <Card className="border-[#CFF1D2] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-sm font-bold text-[#92FF5F] flex items-center gap-2"><PackageCheck className="w-4 h-4" /> Règle FEFO</CardTitle></CardHeader><CardContent className="text-xs leading-relaxed">La vente propose toujours le lot à péremption la plus proche. Un autre lot exige une justification journalisée (STO-08). Chaque chiffre ouvre sa liste détaillée.</CardContent></Card>
          </div>
        </TabsContent>

        {/* PRODUITS STO-02 */}
        <TabsContent value="produits" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-[#0F3B27]">Catalogue produits — fiche complète (STO-02)</h3>
            <Badge variant="outline" className="border-[#0F3B27] text-[#0F3B27]">{produits.length} produits</Badge>
          </div>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-[#475C50]" /><Input placeholder="Rechercher DCI, CIP, laboratoire, classe..." value={recherche} onChange={e => setRecherche(e.target.value)} className="pl-9 border-[#CFF1D2]" /></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {produits.map(p => (
              <Card key={p.id} className="border-[#CFF1D2] hover:shadow-md transition-shadow">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-black text-[#0F3B27] truncate">{p.nom_commercial}</CardTitle><CardDescription className="text-xs">{p.dci || "—"} · {p.forme || ""} {p.dosage || ""} · Labo: {p.laboratoire || "—"}</CardDescription></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex flex-wrap gap-1">{p.est_thermolabile && <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[11px]">❄️ Thermolabile</Badge>}{p.tableau_substance === "stupefiant" && <Badge className="bg-purple-50 text-purple-800 text-[11px]">🔒 Stupéfiant</Badge>}{p.groupe_taxation === "B_TAXABLE" && <Badge className="bg-amber-50 text-amber-800 text-[11px]">B Taxable</Badge>}</div>
                  <div className="flex justify-between"><span className="text-[#475C50]">CIP {p.code_cip}</span><span className="font-mono font-bold text-[#0F3B27]">{p.stock_total} boîtes</span></div>
                  <div className="flex justify-between"><span className="text-[#475C50]">Prix TTC</span><span className="font-bold">{p.prix_public_ttc.toLocaleString("fr-FR")} FCFA</span></div>
                  {p.alerte_rupture && <div className="rounded-xl bg-amber-50 border border-amber-300 px-2 py-1 text-amber-800 font-bold text-[11px]">⚠️ Sous stock minimum — rupture imminente</div>}
                  {p.prochain_lot_fefo && <div className="rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] px-2 py-1">FEFO → Lot {p.prochain_lot_fefo.numero_lot} · {p.prochain_lot_fefo.jours_avant_peremption}j</div>}
                </CardContent>
              </Card>
            ))}
            {produits.length === 0 && <div className="col-span-full p-8 text-center text-sm text-[#475C50]">Aucun produit — importer le catalogue (CSV/Excel 10 Mo max) ou ajouter via l’assistant (STO-02).</div>}
          </div>
          <ZoneDepot label="Importer catalogue produits (CSV/Excel)" />
        </TabsContent>

        {/* LOTS FEFO STO-03 */}
        <TabsContent value="lots" className="space-y-4 mt-4">
          <Card className="border-[#CFF1D2]"><CardContent className="pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[#475C50]" /><Input placeholder="Médicament, DCI, CIP, lot..." value={recherche} onChange={e => setRecherche(e.target.value)} className="pl-9" /></div>
            <div className="flex items-center gap-1 text-xs font-bold">
              <Filter className="w-4 h-4 text-[#475C50]" />
              {[
                { id: "tous", label: "Tous" }, { id: "critique_1m", label: "<30j" }, { id: "alerte_3m", label: "<3m" }, { id: "attention_6m", label: "<6m" }, { id: "perime", label: "Périmés" },
              ].map(f => <Button key={f.id} variant={filtreAlerte===f.id ? "default":"outline"} size="sm" onClick={()=>setFiltreAlerte(f.id)} className={filtreAlerte===f.id ? "bg-[#0F3B27] text-[#92FF5F] text-xs h-8":"text-[#475C50] text-xs h-8 border-[#CFF1D2]"}>{f.label}</Button>)}
            </div>
          </CardContent></Card>
          <Card className="border-[#CFF1D2]">
            <CardHeader><CardTitle className="text-sm font-black text-[#0F3B27]">Lots — ordre FEFO strict (STO-08)</CardTitle><CardDescription>Un autre lot que le premier exige une justification journalisée. Statuts vendables : uniquement “Commercialisable” (RG-D02).</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <div className="p-8 text-center text-[#475C50]">Chargement FEFO...</div> : lots.length===0 ? <div className="p-8 text-center text-[#475C50]">Aucun lot — réceptionner via l’onglet Réception.</div> : (
                <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                  <thead className="bg-[#F7F9F7] text-[#475C50] border-b border-[#CFF1D2] text-xs font-bold"><tr><th className="py-2 px-3">Priorité</th><th className="py-2 px-3">Médicament</th><th className="py-2 px-3">Lot & BL</th><th className="py-2 px-3">Péremption</th><th className="py-2 px-3">Qté</th><th className="py-2 px-3">Emplacement</th><th className="py-2 px-3">Statut</th><th className="py-2 px-3 text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-[#CFF1D2]/50">
                    {lots.map((lot, idx) => (
                      <tr key={lot.id} className={`hover:bg-[#F7F9F7] ${lot.statut_effectif==="quarantaine" ? "bg-amber-50/50":""} ${idx===0 && lot.est_vendable ? "bg-[#CFF1D2]/20":""}`}>
                        <td className="py-2 px-3">{idx===0 && lot.est_vendable ? <span className="inline-flex items-center gap-1 text-xs font-black text-[#0F3B27] bg-[#92FF5F] px-2 py-0.5 rounded-full"><ArrowRight className="w-3 h-3" /> Prochain</span> : <span className="text-xs font-mono text-[#475C50]">#{idx+1}</span>}</td>
                        <td className="py-2 px-3"><div className="font-bold text-[#0F3B27] text-xs">{lot.produit?.nom_commercial}</div><div className="text-[11px] text-[#475C50]">CIP {lot.produit?.code_cip} · DCI {lot.produit?.dci || "—"}</div>{lot.produit?.est_thermolabile && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 rounded">❄️ 2–8°C</span>}</td>
                        <td className="py-2 px-3"><div className="font-mono text-xs font-bold">{lot.numero_lot}</div><div className="text-[11px] text-[#475C50]">{lot.fournisseur_nom} · BL {lot.bon_livraison_ref}</div></td>
                        <td className="py-2 px-3"><div className="font-bold text-xs">{lot.date_peremption}</div><div className="mt-1">{badgeAlerte(lot.statut_peremption, lot.jours_avant_peremption)}</div></td>
                        <td className="py-2 px-3 font-black text-[#0F3B27]">{lot.quantite_disponible} <span className="font-normal text-[#475C50] text-xs">/ {lot.quantite_initiale}</span></td>
                        <td className="py-2 px-3"><span className="text-xs font-bold bg-[#F7F9F7] border border-[#CFF1D2] px-2 py-1 rounded-xl">{lot.emplacement}</span></td>
                        <td className="py-2 px-3">{badgeStatut(lot)}{lot.motif_statut && <div className="text-[10px] text-[#475C50] max-w-[160px] truncate">{lot.motif_statut}</div>}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex justify-end gap-1">
                            {lot.statut_effectif==="commercialisable" ? (
                              <Button variant="outline" size="sm" onClick={()=>{setLotPourAction(lot); setStatutCible("quarantaine"); setDialogChangementStatutOuvert(true);}} className="text-xs h-7 border-amber-300 text-amber-800"><ShieldAlert className="w-3 h-3 mr-1" /> Bloquer</Button>
                            ) : lot.statut_effectif==="quarantaine" ? (
                              <Button variant="outline" size="sm" onClick={()=> mutationLever.mutate(lot.id)} className="text-xs h-7 border-[#CFF1D2] text-[#0F3B27]"><CheckCircle2 className="w-3 h-3 mr-1" /> Lever</Button>
                            ) : null}
                            <Button variant="ghost" size="sm" onClick={()=>{setLotPourAction(lot); setDialogChangementStatutOuvert(true);}} className="text-xs h-7">⋯</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EMPLACEMENTS STO-04 */}
        <TabsContent value="emplacements" className="space-y-4 mt-4">
          <div className="flex items-center justify-between"><h3 className="font-display font-black text-[#0F3B27]">Plan des zones — 7 emplacements (STO-04)</h3><Badge variant="outline" className="border-[#CFF1D2]">{emplacements.length || 7} zones</Badge></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(emplacements.length ? emplacements : [
              { code:"COMPTOIR", libelle:"Comptoir — Délivrance", type_zone:"comptoir", lots_count: 0 },
              { code:"RESERVE", libelle:"Réserve — Stock principal", type_zone:"reserve", lots_count: 0 },
              { code:"FRIGO", libelle:"Réfrigérateur 2°C–8°C", type_zone:"frigo", lots_count: 0 },
              { code:"ARMOIRE", libelle:"Armoire sécurisée — Stupéfiants", type_zone:"armoire_securisee", lots_count: 0 },
              { code:"ATTENTE", libelle:"Zone d’attente de contrôle", type_zone:"attente_controle", lots_count: 0 },
              { code:"RETOURS", libelle:"Zone des retours fournisseur", type_zone:"retours", lots_count: 0 },
              { code:"DECHETS", libelle:"Aire des déchets sécurisée", type_zone:"dechets", lots_count: 0 },
            ] as any).map((e: any)=>(
              <Card key={e.code} className={`border-2 ${e.type_zone==="frigo" ? "border-blue-200 bg-blue-50/30" : e.type_zone==="armoire_securisee" ? "border-purple-200 bg-purple-50/30" : e.type_zone==="dechets" ? "border-red-200 bg-red-50/20" : "border-[#CFF1D2] bg-white"}`}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-black text-[#0F3B27] flex items-center gap-2"><MapPin className="w-4 h-4" /> {e.libelle}</CardTitle><CardDescription className="text-xs">{e.code} · {e.type_zone}</CardDescription></CardHeader>
                <CardContent className="text-xs"><div className="flex justify-between"><span className="text-[#475C50]">Lots</span><strong>{e.lots_count ?? 0}</strong></div><div className="mt-2 text-[11px] text-[#475C50]">{e.type_zone==="frigo" ? "❄️ Réservé thermolabiles" : e.type_zone==="armoire_securisee" ? "🔒 Stupéfiants & Listes uniquement" : "Étiquettes imprimables"}</div></CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Contraintes d’affectation (STO-04)</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Le frigo n’accepte que des thermolabiles, l’armoire n’accepte que des stupéfiants/listes. Glisser-déposer un lot d’un emplacement à un autre crée un transfert tracé avec scan et confirmation.</CardContent></Card>
        </TabsContent>

        {/* MOUVEMENTS STO-09 */}
        <TabsContent value="mouvements" className="space-y-4 mt-4">
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-black text-[#0F3B27]">Journal des mouvements (STO-09) — INT-01 : jamais supprimé, contre-passé</CardTitle><CardDescription>Entrée, vente, transfert, casse, destruction, ajustement — chaque mouvement porte pièce et auteur</CardDescription></CardHeader><CardContent>
            {mouvements.length===0 ? <div className="p-6 text-center text-sm text-[#475C50]">Aucun mouvement — les réceptions et transferts apparaîtront ici.</div> : (
              <div className="overflow-x-auto"><table className="w-full text-xs text-left">
                <thead className="bg-[#F7F9F7] text-[#475C50] border-b border-[#CFF1D2] font-bold"><tr><th className="py-2 px-3">Date</th><th className="py-2 px-3">Type</th><th className="py-2 px-3">Produit / Lot</th><th className="py-2 px-3">Qté</th><th className="py-2 px-3">Stock av/ap</th><th className="py-2 px-3">Pièce</th><th className="py-2 px-3">Auteur</th></tr></thead>
                <tbody className="divide-y divide-[#CFF1D2]/50">
                  {mouvements.slice(0,20).map((m:any)=>(
                    <tr key={m.id} className="hover:bg-[#F7F9F7]"><td className="py-2 px-3 font-mono text-[11px]">{new Date(m.created_at).toLocaleDateString("fr-FR")}</td><td className="py-2 px-3"><Badge variant="outline" className="text-[11px]">{m.type_mouvement}</Badge></td><td className="py-2 px-3 font-bold text-[#0F3B27]">{m.produit?.nom_commercial || ""} <span className="font-normal text-[#475C50]">· {m.lot?.numero_lot || ""}</span></td><td className="py-2 px-3 font-mono font-bold">{m.quantite>0 ? `+${m.quantite}`: m.quantite}</td><td className="py-2 px-3 font-mono">{m.stock_avant} → {m.stock_apres}</td><td className="py-2 px-3">{m.reference_piece || "—"}</td><td className="py-2 px-3">{m.auteur?.name || "Système"}</td></tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* RÉCEPTION STO-05/06/07 */}
        <TabsContent value="reception" className="space-y-4 mt-4">
          <Card className="border-[#0F3B27] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-white font-display font-black flex items-center gap-2"><ScanLine className="w-5 h-5 text-[#92FF5F]" /> Réception contrôlée (STO-05)</CardTitle><CardDescription className="text-[#CFF1D2]">Scan BL puis boîtes · DataMatrix lot/péremption · rapprochement commande · chaînes du froid</CardDescription></CardHeader><CardContent className="text-xs leading-relaxed text-[#CFF1D2]">Passage en “Commercialisable” seulement après validation de tous les contrôles obligatoires. Hors heures : “En attente de contrôle” avec dispositif d’isolement (STO-06). Anomalies (casse/manquant/excédent) → fiche + photos + isolement (STO-07).</CardContent></Card>
          <ZoneDepot label="Déposer bon de livraison & facture fournisseur (JPG/PDF)" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-black text-[#0F3B27]">Contrôles obligatoires</CardTitle></CardHeader><CardContent className="space-y-2 text-xs">
              {[
                ["alerte_sanitaire_verifiee","Alerte sanitaire sur le lot (recherche auto)","BPD5-F05"],
                ["emballage_intact","État des emballages conforme","APP-03"],
                ["conformite_livraison","Conformité livraison / commande","STO-05"],
                ["dates_conformes","Dates & péremptions conformes","—"],
                ["chaine_froid_respectee","Chaîne du froid respectée","BPD5-F11"],
              ].map(([k,l,ref])=>(
                <label key={k} className="flex items-center gap-2 rounded-xl border border-[#CFF1D2] px-3 py-2"><input type="checkbox" checked={(controles as any)[k]} onChange={e=> setControles({...controles, [k]: e.target.checked})} className="accent-[#0F3B27]" /><span className="font-bold text-[#0F3B27]">{l}</span><span className="ml-auto text-[10px] text-[#475C50]">{ref}</span></label>
              ))}
            </CardContent></Card>
            <Card className="border-amber-300 bg-amber-50"><CardHeader><CardTitle className="text-xs font-black text-amber-900 flex items-center gap-2"><FileWarning className="w-4 h-4" /> Anomalies de réception (STO-07)</CardTitle></CardHeader><CardContent className="text-xs text-amber-900">Casse, manquant, excédent, produit non commandé → fiche, photos annotées, isolement, litige fournisseur, avoir attendu.</CardContent></Card>
          </div>
          <Button onClick={()=> setDialogReceptionOuvert(true)} className="w-full bg-[#0F3B27] text-white font-bold">Ouvrir la réception — scan & contrôles</Button>
        </TabsContent>

        {/* INVENTAIRES STO-12 */}
        <TabsContent value="inventaires" className="space-y-4 mt-4">
          <div className="flex items-center justify-between"><h3 className="font-display font-black text-[#0F3B27]">Inventaires — tournant & général annuel (STO-12)</h3><Button size="sm" className="bg-[#0F3B27] text-white" onClick={()=> toast.info("Création d’inventaire — choisissez zone, comptage aveugle/double comptage")}> <Plus className="w-4 h-4 mr-1" /> Nouvelle campagne</Button></div>
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-sm text-[#475C50]">Feuille de comptage sur mobile avec scan, fonctionne hors-ligne, comptage aveugle & double comptage en option, écarts valorisés, validation pharmacien avant ajustement (STO-12). Export PDF/Excel 5 ans — GAC-EN-010.</CardContent></Card>
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Campagnes</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Aucune campagne — lancez un inventaire tournant par zone (réserve, comptoir, frigo, armoire).</CardContent></Card>
        </TabsContent>

        {/* PÉREmptions STO-11 */}
        <TabsContent value="peremptions" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-black text-blue-700 flex items-center gap-2"><Calendar className="w-4 h-4" /> À 6 mois</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-blue-700">{peremptions.a_6_mois?.length ?? 0}</div><p className="text-xs text-[#475C50]">Surveillance</p></CardContent></Card>
            <Card className="border-amber-300 bg-amber-50/30"><CardHeader><CardTitle className="text-sm font-black text-amber-700 flex items-center gap-2"><Clock className="w-4 h-4" /> À 3 mois</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-amber-700">{peremptions.a_3_mois?.length ?? 0}</div></CardContent></Card>
            <Card className="border-red-300 bg-red-50"><CardHeader><CardTitle className="text-sm font-black text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> À 1 mois · Critique</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-red-700">{peremptions.a_1_mois?.length ?? 0}</div><p className="text-xs text-red-700">Retrait par scan — vente interdite après péremption (STO-11)</p></CardContent></Card>
          </div>
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Aucun lot périmé en stock ? Bravo.</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Actions proposées : retour fournisseur ou rebut vers déchet pharmaceutique (BPD5-F14, STK-06). Bordereau de retrait PDF/Excel 5 ans.</CardContent></Card>
        </TabsContent>

        {/* QUARANTAINE & RAPPELS STO-14 */}
        <TabsContent value="quarantaine" className="space-y-4 mt-4">
          <Card className="border-amber-400 bg-amber-50"><CardHeader><CardTitle className="text-sm font-black text-amber-900 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Rappels de lots — blocage immédiat (STO-14)</CardTitle><CardDescription className="text-amber-800">Saisie/import avis (source, produits, lots, date, action, pièce jointe) → blocage caisse/dispensation en &lt;1 min → liste de prélèvement par emplacement → scan boîtes isolées → bordereau retour → recherche patients (pharmacien) → clôture avec preuve</CardDescription></CardHeader><CardContent className="text-xs text-amber-900">Conservation GAC-EN-008 : 10 ans. Cahier de rappel de lot et de mise en quarantaine PDF.</CardContent></Card>
          <ZoneDepot label="Déposer avis de rappel (PDF/photo/courrier) — obligatoire" />
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-center text-sm text-[#475C50]">Aucun rappel actif — la saisie d’un avis bloquera instantanément les lots concernés.</CardContent></Card>
        </TabsContent>

        {/* DÉCHETS STO-17 */}
        <TabsContent value="dechets" className="space-y-4 mt-4">
          <Card className="border-red-300 bg-red-50/30"><CardHeader><CardTitle className="text-sm font-black text-red-800 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Déchets & destruction — BPD9 (STO-17)</CardTitle><CardDescription className="text-red-700">Motif : périmé, avarié, non conforme, rappelé, retourné → aire sécurisée → lot à détruire → prestataire qualifié → PV contradictoire signé électroniquement → coffre-fort numérique → écriture de perte</CardDescription></CardHeader><CardContent className="text-xs text-red-800">Conservation PV destruction GAC-EN : 10 ans. Tout déchet génère une perte comptable (STO-18).</CardContent></Card>
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-center text-sm text-[#475C50]">Aucun lot en déchet — constituez un lot à détruire en sélectionnant des lots périmés/rejetés.</CardContent></Card>
        </TabsContent>

        {/* VALORISATION STO-18/19 */}
        <TabsContent value="valorisation" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-[#0F3B27] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#92FF5F]" /> Valorisation CMP</CardTitle></CardHeader><CardContent><div className="text-2xl font-black font-display">{valorisation.total.toLocaleString("fr-FR")} FCFA</div><p className="text-xs text-[#CFF1D2]">Coût moyen pondéré — état à date rapproché du compte de stock (STO-18)</p></CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">ABC & rotation</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Classement ABC, couverture en jours, marge par famille — cahier des ruptures et demandes non satisfaites (STO-19, STK-08, BPD5-F15).</CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Étiquettes</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Impression étiquettes emplacement, quarantaine et rebut (STO-20) — imprimante d’étiquettes.</CardContent></Card>
          </div>
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Détail par produit (CMP)</CardTitle></CardHeader><CardContent>
            {valorisation.par_produit?.length ? (
              <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-[#F7F9F7] text-[#475C50] font-bold border-b border-[#CFF1D2]"><tr><th className="py-2 px-3">Produit</th><th className="py-2 px-3">Qté</th><th className="py-2 px-3">CMP</th><th className="py-2 px-3">Valeur</th></tr></thead><tbody className="divide-y divide-[#CFF1D2]/50">{valorisation.par_produit.slice(0,20).map((v:any)=>(
                <tr key={v.produit.id}><td className="py-2 px-3 font-bold text-[#0F3B27]">{v.produit.nom_commercial}</td><td className="py-2 px-3 font-mono">{v.quantite}</td><td className="py-2 px-3 font-mono">{Number(v.cmp || 0).toLocaleString("fr-FR")} FCFA</td><td className="py-2 px-3 font-mono font-bold">{Number(v.valeur).toLocaleString("fr-FR")} FCFA</td></tr>
              ))}</tbody></table></div>
            ) : <div className="text-sm text-[#475C50]">Valorisation calculée dès qu’un lot est réceptionné.</div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Réception — contrôles STO-05 */}
      <Dialog open={dialogReceptionOuvert} onOpenChange={setDialogReceptionOuvert}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader><DialogTitle className="font-display font-black text-[#0F3B27]">Réception contrôlée (STO-05)</DialogTitle><DialogDescription>Scan BL, DataMatrix lot/péremption, rapprochement commande. Tous les contrôles doivent être cochés pour passer “Commercialisable”.</DialogDescription></DialogHeader>
          <form onSubmit={handleReceptionSubmit} className="space-y-3">
            <div><Label className="text-xs font-bold text-[#0F3B27]">Médicament *</Label><select className="w-full mt-1 border border-[#CFF1D2] rounded-xl p-2 text-sm bg-white" value={produitId} onChange={e=>{ setProduitId(e.target.value); const p=produits.find(x=>x.id===e.target.value); if(p?.est_thermolabile) setEmplacement("Réfrigérateur 2°C–8°C"); }} required><option value="">Sélectionner...</option>{produits.map(p=> <option key={p.id} value={p.id}>{p.nom_commercial} ({p.code_cip}) {p.est_thermolabile ? "❄️":""} • {p.laboratoire || ""}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs font-bold">N° lot *</Label><Input placeholder="LOT-2026-..." value={numeroLot} onChange={e=> setNumeroLot(e.target.value)} required /></div><div><Label className="text-xs font-bold">Péremption *</Label><Input type="date" value={datePeremption} onChange={e=> setDatePeremption(e.target.value)} required /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs font-bold">Qté *</Label><Input type="number" min="1" value={quantite} onChange={e=> setQuantite(e.target.value)} required /></div><div><Label className="text-xs font-bold">BL *</Label><Input placeholder="BL-..." value={bonLivraisonRef} onChange={e=> setBonLivraisonRef(e.target.value)} required /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs font-bold">Fournisseur</Label><select className="w-full mt-1 border border-[#CFF1D2] rounded-xl p-2 text-sm bg-white" value={fournisseurNom} onChange={e=> setFournisseurNom(e.target.value)}><option>CAMEG BÉNIN</option><option>UBIPHARM BÉNIN</option><option>LABOREX BÉNIN</option><option>Autre</option></select></div><div><Label className="text-xs font-bold">Emplacement</Label><Input value={emplacement} onChange={e=> setEmplacement(e.target.value)} /></div></div>
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 space-y-2">
              <p className="text-xs font-black text-amber-900">Contrôles obligatoires (STO-05)</p>
              { (["alerte_sanitaire_verifiee","emballage_intact","conformite_livraison","dates_conformes"] as const).map(k=>(
                <label key={k} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={(controles as any)[k]} onChange={e=> setControles({...controles, [k]: e.target.checked})} className="accent-[#0F3B27]" /><span className="font-bold text-[#0F3B27]">{k.replaceAll("_"," ")}</span></label>
              ))}
              {!controles.alerte_sanitaire_verifiee || !controles.emballage_intact || !controles.conformite_livraison || !controles.dates_conformes ? <p className="text-[11px] text-amber-800">⚠️ Contrôles incomplets → lot en “En attente de contrôle”</p> : <p className="text-[11px] text-emerald-800 font-bold">✅ Tous contrôles OK → “Commercialisable”</p>}
            </div>
            <ZoneDepot label="Joindre BL / facture (photo/PDF) — SHA-256 + chiffrage" />
            <DialogFooter><Button type="button" variant="outline" onClick={()=> setDialogReceptionOuvert(false)}>Annuler</Button><Button type="submit" disabled={mutationReception.isPending} className="bg-[#0F3B27] text-white font-bold">{mutationReception.isPending ? "Réception..." : "Confirmer réception + FEFO"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Changement de statut (8 statuts §0.2) */}
      <Dialog open={dialogChangementStatutOuvert} onOpenChange={setDialogChangementStatutOuvert}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader><DialogTitle className="font-display font-black text-[#0F3B27]">Changement de statut — effet immédiat (RG-D02)</DialogTitle><DialogDescription>Lot {lotPourAction?.numero_lot} · {lotPourAction?.produit?.nom_commercial}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-bold">Nouveau statut *</Label><select value={statutCible} onChange={e=> setStatutCible(e.target.value)} className="w-full mt-1 border border-[#CFF1D2] rounded-xl p-2 text-sm bg-white">
              <option value="commercialisable">Commercialisable (vendable)</option>
              <option value="en_attente_controle">En attente de contrôle</option>
              <option value="a_evaluer">À évaluer (pharmacien)</option>
              <option value="quarantaine">Quarantaine</option>
              <option value="attente_retour">En attente de retour fournisseur</option>
              <option value="rejete">Rejeté</option>
              <option value="dechet">Déchet à détruire</option>
            </select></div>
            <div><Label className="text-xs font-bold">Motif *</Label><Textarea rows={3} placeholder="Motif documenté + code personnel..." value={motif} onChange={e=> setMotif(e.target.value)} /></div>
            <DialogFooter><Button variant="outline" onClick={()=> setDialogChangementStatutOuvert(false)}>Annuler</Button><Button className="bg-[#0F3B27] text-white font-bold" disabled={!motif} onClick={()=> lotPourAction && mutationChangerStatut.mutate({ id: lotPourAction.id, statut: statutCible, motif })}>{mutationChangerStatut.isPending ? "...":"Valider — effet immédiat"}</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quarantaine legacy */}
      <Dialog open={dialogQuarantaineOuvert} onOpenChange={setDialogQuarantaineOuvert}>
        <DialogContent className="max-w-md bg-white"><DialogHeader><DialogTitle className="text-red-700 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Quarantaine (Art. 5.14)</DialogTitle><DialogDescription>Lot {lotPourAction?.numero_lot} bloqué immédiatement de toute délivrance.</DialogDescription></DialogHeader>
          <div className="space-y-3"><Label className="text-xs font-bold">Motif *</Label><Textarea rows={3} value={motif} onChange={e=> setMotif(e.target.value)} placeholder="Rappel fabricant, emballage endommagé..." />
            <DialogFooter><Button variant="outline" onClick={()=> setDialogQuarantaineOuvert(false)}>Annuler</Button><Button variant="destructive" disabled={!motif} onClick={()=> lotPourAction && mutationQuarantaine.mutate({ id: lotPourAction.id, motif })}>Confirmer le blocage</Button></DialogFooter></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
