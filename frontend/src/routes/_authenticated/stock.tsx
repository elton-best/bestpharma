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
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";

export const Route = createFileRoute("/_authenticated/stock")({
  head: () => ({
    meta: [
      { title: "Magasin & Stocks — BEGPHARMA" },
      { name: "description", content: "Le magasin raconté simplement : chaque boîte garde son lot, son emplacement et son statut. FEFO, quarantaine, inventaires et valorisation — BPD-5 / BPD-8 / BPD-9." },
    ],
  }),
  component: PageStockMagasin,
});

// ─── Sections du magasin (liste déroulante filtrable)
const SECTIONS = [
  {
    valeur: "vue-ensemble",
    libelle: "Vue d’ensemble",
    description: "Les alertes du jour et l’état général du magasin, en un coup d’œil.",
    icone: <Layers className="size-4" />,
    motsCles: ["accueil", "tableau de bord", "synthese", "alertes"],
  },
  {
    valeur: "produits",
    libelle: "Produits",
    description: "Le catalogue des médicaments : DCI, forme, prix, seuils de réassort.",
    icone: <Package className="size-4" />,
    motsCles: ["catalogue", "fiche produit", "cip", "dci"],
  },
  {
    valeur: "lots",
    libelle: "Lots",
    description: "Les lots rangés du plus urgent au plus récent : le premier périmé sort le premier.",
    icone: <Boxes className="size-4" />,
    motsCles: ["fefo", "peremption", "stock", "boites"],
  },
  {
    valeur: "emplacements",
    libelle: "Emplacements",
    description: "Où dort chaque boîte : comptoir, réserve, frigo, armoire sécurisée.",
    icone: <MapPin className="size-4" />,
    motsCles: ["zones", "reserve", "frigo", "armoire"],
  },
  {
    valeur: "mouvements",
    libelle: "Mouvements",
    description: "Le journal de tout ce qui entre et sort : jamais effacé, toujours signé.",
    icone: <History className="size-4" />,
    motsCles: ["journal", "entrees", "sorties", "tracabilite"],
  },
  {
    valeur: "reception",
    libelle: "Réception",
    description: "Recevoir une livraison, contrôler les boîtes, puis les mettre en stock.",
    icone: <ScanLine className="size-4" />,
    motsCles: ["livraison", "bon de livraison", "scan", "controle"],
  },
  {
    valeur: "inventaires",
    libelle: "Inventaires",
    description: "Compter ce qu’il y a vraiment et expliquer chaque écart.",
    icone: <ClipboardList className="size-4" />,
    motsCles: ["comptage", "ecart", "campagne"],
  },
  {
    valeur: "peremptions",
    libelle: "Péremptions",
    description: "Les lots qui approchent de leur date limite et ce qu’il faut en faire.",
    icone: <Calendar className="size-4" />,
    motsCles: ["dates", "expiration", "retrait"],
  },
  {
    valeur: "quarantaine",
    libelle: "Quarantaine & Rappels",
    description: "Isoler un lot douteux ou rappelé, et bloquer la vente tout de suite.",
    icone: <ShieldAlert className="size-4" />,
    motsCles: ["rappel", "blocage", "isolement"],
  },
  {
    valeur: "dechets",
    libelle: "Déchets",
    description: "Détruire dans les règles, avec prestataire qualifié et procès-verbal.",
    icone: <Trash2 className="size-4" />,
    motsCles: ["destruction", "pv", "rebut", "peremption"],
  },
  {
    valeur: "valorisation",
    libelle: "Valorisation",
    description: "Ce que vaut le stock, ce qui tourne vite et ce qui dort.",
    icone: <TrendingUp className="size-4" />,
    motsCles: ["cmp", "valeur", "abc", "rotation", "etiquettes"],
  },
];

// ─── §0.2 — les huit statuts, expliqués en français courant
const STATUTS = [
  {
    valeur: "commercialisable",
    libelle: "Commercialisable",
    vendable: true,
    description: "La boîte est vendable : le contrôle de réception est passé et sa traçabilité est complète.",
    consequence: "Vente et dispensation autorisées, dans l’ordre FEFO.",
    classe: "border-[#0F3B27]/30 bg-[#CFF1D2]/40",
    pastille: "bg-[#0F3B27]",
  },
  {
    valeur: "en_attente_controle",
    libelle: "En attente de contrôle",
    vendable: false,
    description: "Le lot vient d’arriver ou attend son contrôle : il est rangé à part, le temps de la vérification.",
    consequence: "Aucune sortie possible jusqu’à la décision du contrôleur.",
    classe: "border-amber-300 bg-amber-50",
    pastille: "bg-amber-500",
  },
  {
    valeur: "a_evaluer",
    libelle: "À évaluer",
    vendable: false,
    description: "Un doute est apparu (excursion de température, emballage abîmé, lot suspect) : le pharmacien doit trancher.",
    consequence: "La boîte attend sa décision, elle ne part pas au comptoir.",
    classe: "border-orange-300 bg-orange-50",
    pastille: "bg-orange-500",
  },
  {
    valeur: "quarantaine",
    libelle: "Quarantaine",
    vendable: false,
    description: "Le lot est isolé physiquement, souvent à cause d’un rappel ou d’une non-conformité.",
    consequence: "Caisse et dispensation le refusent ; la levée se documente.",
    classe: "border-amber-400 bg-amber-100",
    pastille: "bg-amber-700",
  },
  {
    valeur: "attente_retour",
    libelle: "En attente de retour fournisseur",
    vendable: false,
    description: "Le lot est prêt à repartir chez le grossiste : il attend le bon de retour et l’avoir.",
    consequence: "Sortie uniquement par bon de retour signé.",
    classe: "border-blue-300 bg-blue-50",
    pastille: "bg-blue-600",
  },
  {
    valeur: "rejete",
    libelle: "Rejeté",
    vendable: false,
    description: "Le lot est refusé après contrôle : il ne retournera jamais dans le circuit de vente.",
    consequence: "Orienté vers le fournisseur ou vers la filière déchet.",
    classe: "border-red-300 bg-red-50",
    pastille: "bg-red-600",
  },
  {
    valeur: "dechet",
    libelle: "Déchet à détruire",
    vendable: false,
    description: "Le lot est condamné : il rejoint l’aire sécurisée en attendant la destruction.",
    consequence: "Destruction tracée, avec procès-verbal et écriture de perte.",
    classe: "border-slate-400 bg-slate-100",
    pastille: "bg-slate-800",
  },
  {
    valeur: "epuise",
    libelle: "Épuisé",
    vendable: false,
    description: "Il ne reste plus une boîte de ce lot : il sort du stock actif.",
    consequence: "Reste consultable pour l’historique et les rappels patients.",
    classe: "border-slate-200 bg-slate-50",
    pastille: "bg-slate-400",
  },
];

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
      className={`rounded-2xl border-2 border-dashed p-4 text-center transition-all ${dragOver ? "border-[#0F3B27] bg-[#CFF1D2]/30" : "border-[#CFF1D2] bg-[#F7F9F7]"}`}
    >
      <Upload className={`mx-auto w-5 h-5 ${dragOver ? "text-[#0F3B27]" : "text-[#475C50]"}`} />
      <p className="mt-1.5 text-xs font-bold text-[#0F3B27]">{label}</p>
      <p className="text-[11px] text-[#475C50]">Glisser-déposer, photographier ou choisir un fichier — JPG, PNG, PDF ou CSV, 10 Mo maximum.</p>
      <label className="mt-2 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#CFF1D2] bg-white px-3 py-1.5 text-xs font-bold text-[#0F3B27] hover:bg-[#CFF1D2]/30">
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
  const { data: peremptionsData } = useQuery<{ data: any }>({ queryKey: ["peremptions"], queryFn: () => api.get<any>("/stocks/peremptions").catch(() => ({ data: { a_1_mois: [], a_3_mois: [], a_6_mois: [], perimes: [] } })) });
  const { data: valorisationData } = useQuery<{ data: any }>({ queryKey: ["valorisation"], queryFn: () => api.get<any>("/stocks/valorisation").catch(() => ({ data: { total: 0, par_produit: [] } })) });

  const reinitialiserControles = () => setControles({ alerte_sanitaire_verifiee: false, emballage_intact: false, conformite_livraison: false, dates_conformes: false, chaine_froid_respectee: false });

  const mutationReception = useMutation({
    mutationFn: (payload: any) => api.post("/stocks", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Lot réceptionné — règle FEFO appliquée");
      queryClient.invalidateQueries({ queryKey: ["stocks"] }); queryClient.invalidateQueries({ queryKey: ["produits"] }); queryClient.invalidateQueries({ queryKey: ["mouvements"] });
      setDialogReceptionOuvert(false); setNumeroLot(""); setDatePeremption(""); setQuantite(""); setBonLivraisonRef(""); reinitialiserControles();
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

  const produitChoisi = produits.find((p) => p.id === produitId);
  const tousControles = controles.alerte_sanitaire_verifiee && controles.emballage_intact && controles.conformite_livraison && controles.dates_conformes;
  const froidManquant = !!produitChoisi?.est_thermolabile && !controles.chaine_froid_respectee;

  const handleReceptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produitId || !numeroLot || !datePeremption || !quantite || !bonLivraisonRef) { toast.error("Il manque une information obligatoire : produit, lot, péremption, quantité ou bon de livraison."); return; }
    if (!tousControles) { toast.error("Les contrôles obligatoires ne sont pas tous cochés — le lot restera en « En attente de contrôle » (STO-05)."); }
    if (froidManquant) { toast.warning("Produit thermolabile : confirmez la chaîne du froid avant de valider."); }
    mutationReception.mutate({
      produit_id: produitId, numero_lot: numeroLot, date_peremption: datePeremption, quantite: parseInt(quantite, 10),
      fournisseur_nom: fournisseurNom, bon_livraison_ref: bonLivraisonRef, emplacement,
      controles_reception: controles,
    });
  };

  const statutChoisi = STATUTS.find((s) => s.valeur === statutCible);

  return (
    <div className="space-y-6">
      {/* En-tête avec charte BEGPHARMA */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-black tracking-tight text-[#0F3B27]">Magasin & Stocks</h1>
            <Badge className="bg-[#0F3B27] text-[#92FF5F] border-[#0F3B27]">BPD-5 · FEFO · STO</Badge>
            <Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">8 statuts, expliqués en clair</Badge>
          </div>
          <p className="mt-1 text-sm text-[#475C50] max-w-2xl">
            Tout ce qui entre, sort ou dort en réserve, raconté simplement : chaque boîte garde son lot, son
            emplacement et son statut. La caisse ne vend que ce qui est vendable, dans l’ordre de péremption ;
            la dispensation pioche au bon endroit ; la comptabilité suit le coût moyen et les pertes.
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

      {/* Navigation : une seule liste déroulante, filtrable, au lieu des onglets */}
      <div className="rounded-2xl border border-[#CFF1D2] bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <SelecteurFiltrable
            id="section-magasin"
            etiquette="Section du magasin"
            options={SECTIONS}
            valeur={tab}
            onChange={setTab}
            placeholder="Choisir une section du magasin…"
            placeholderRecherche="Filtrer : produits, lots, rappels, déchets…"
            className="md:max-w-xl"
          />
          <p className="text-[11px] font-medium leading-snug text-[#475C50] md:pb-2">
            Tapez quelques lettres pour aller droit au but. La section choisie s’affiche juste en dessous.
          </p>
        </div>
      </div>

      {/* VUE D'ENSEMBLE STO-01 */}
      {tab === "vue-ensemble" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-[#CFF1D2] bg-white shadow-sm"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-bold text-[#475C50]">Valeur du stock (coût moyen)</CardTitle><TrendingUp className="w-4 h-4 text-[#0F3B27]" /></CardHeader><CardContent><div className="text-2xl font-black font-display text-[#0F3B27]">{(valorisation.total || stats.valorisation_totale || 0).toLocaleString("fr-FR")} <span className="text-sm font-sans">FCFA</span></div><p className="text-xs text-[#475C50]">Coût moyen pondéré, rapproché du compte de stock.</p></CardContent></Card>
            <Card className={`border-[#CFF1D2] ${alertes.ruptures > 0 ? "border-amber-400 bg-amber-50/30" : "bg-white"}`}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-bold text-[#475C50]">Ruptures & sous minimum</CardTitle><AlertOctagon className="w-4 h-4 text-amber-600" /></CardHeader><CardContent><div className="text-2xl font-black text-amber-700">{alertes.ruptures ?? 0}</div><p className="text-xs text-[#475C50]">Produits sous leur seuil de réassort.</p></CardContent></Card>
            <Card className="border-[#CFF1D2] bg-white"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-bold text-[#475C50]">Lots actifs FEFO</CardTitle><Layers className="w-4 h-4 text-[#0F3B27]" /></CardHeader><CardContent><div className="text-2xl font-black text-[#0F3B27]">{stats.total_lots_actifs}</div><p className="text-xs text-[#475C50]">Le lot qui périme le plus tôt sort le premier.</p></CardContent></Card>
            <Card className={`border-[#CFF1D2] ${stats.perimes > 0 ? "border-red-500 bg-red-50" : "bg-white"}`}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-bold text-[#475C50]">Périmés interdits</CardTitle><ShieldAlert className="w-4 h-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-black text-red-700">{stats.perimes}</div><p className="text-xs text-red-700">Mise en quarantaine obligatoire, vente refusée.</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Péremptions à surveiller</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#475C50]">À 6 mois</span><strong className="text-[#0F3B27]">{peremptions.a_6_mois?.length ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-[#475C50]">À 3 mois</span><strong className="text-amber-700">{peremptions.a_3_mois?.length ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-[#475C50]">À 1 mois (critique)</span><strong className="text-red-700">{peremptions.a_1_mois?.length ?? 0}</strong></div>
              <div className="flex justify-between border-t border-[#CFF1D2] pt-2"><span className="text-[#475C50]">Lots bloqués</span><strong className="text-[#0F3B27]">{alertes.lots_bloques}</strong></div>
            </CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Produits dormants & surstock</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Classement ABC, rotation et couverture en jours dans la section Valorisation (STO-19).</CardContent></Card>
            <Card className="border-[#CFF1D2] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-sm font-bold text-[#92FF5F] flex items-center gap-2"><PackageCheck className="w-4 h-4" /> Règle FEFO</CardTitle></CardHeader><CardContent className="text-xs leading-relaxed">La vente propose toujours le lot à péremption la plus proche. Choisir un autre lot demande une justification journalisée (STO-08).</CardContent></Card>
          </div>

          {/* §0.2 — les huit statuts, avec des mots simples */}
          <Card className="border-[#CFF1D2]">
            <CardHeader>
              <CardTitle className="text-sm font-black text-[#0F3B27]">Les huit statuts d’un lot, dits simplement</CardTitle>
              <CardDescription className="text-xs">
                Les sept statuts du cahier §0.2, auxquels s’ajoute « Épuisé » quand il ne reste plus aucune boîte.
                Un lot ne change jamais de statut par hasard : chaque passage se documente et laisse une trace.
                Seul « Commercialisable » peut être vendu ou délivré.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {STATUTS.map((s) => (
                <div key={s.valeur} className={`rounded-2xl border-2 p-3 ${s.classe}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`size-2.5 rounded-full ${s.pastille}`} />
                    <h3 className="font-display text-sm font-black text-[#0F3B27]">{s.libelle}</h3>
                    <Badge variant="outline" className={`ml-auto text-[10px] font-bold ${s.vendable ? "border-[#0F3B27]/30 bg-white text-[#0F3B27]" : "border-slate-300 bg-white text-slate-600"}`}>
                      {s.vendable ? "Vente autorisée" : "Vente bloquée"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#0F3B27]/90">{s.description}</p>
                  <p className="mt-1.5 text-[11px] leading-snug text-[#475C50]">{s.consequence}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* PRODUITS STO-02 */}
      {tab === "produits" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-[#0F3B27]">Catalogue produits — fiche complète (STO-02)</h3>
            <Badge variant="outline" className="border-[#0F3B27] text-[#0F3B27]">{produits.length} produits</Badge>
          </div>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-[#475C50]" /><Input placeholder="Rechercher par nom, DCI, code CIP ou laboratoire…" value={recherche} onChange={e => setRecherche(e.target.value)} className="pl-9 border-[#CFF1D2]" /></div>
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
            {produits.length === 0 && <div className="col-span-full p-8 text-center text-sm text-[#475C50]">Aucun produit — importez le catalogue (CSV ou Excel, 10 Mo maximum) ou ajoutez-le avec l’assistant (STO-02).</div>}
          </div>
          <ZoneDepot label="Importer le catalogue produits (CSV ou Excel)" />
        </div>
      )}

      {/* LOTS FEFO STO-03 */}
      {tab === "lots" && (
        <div className="space-y-4">
          <Card className="border-[#CFF1D2]"><CardContent className="pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[#475C50]" /><Input placeholder="Médicament, DCI, code CIP ou numéro de lot…" value={recherche} onChange={e => setRecherche(e.target.value)} className="pl-9" /></div>
            <div className="flex flex-wrap items-center gap-1 text-xs font-bold">
              <Filter className="w-4 h-4 text-[#475C50]" />
              {[
                { id: "tous", label: "Tous" }, { id: "critique_1m", label: "Moins d’un mois" }, { id: "alerte_3m", label: "Moins de 3 mois" }, { id: "attention_6m", label: "Moins de 6 mois" }, { id: "perime", label: "Périmés" },
              ].map(f => <Button key={f.id} variant={filtreAlerte===f.id ? "default":"outline"} size="sm" onClick={()=>setFiltreAlerte(f.id)} className={filtreAlerte===f.id ? "bg-[#0F3B27] text-[#92FF5F] text-xs h-9": "text-[#475C50] text-xs h-9 border-[#CFF1D2]"}>{f.label}</Button>)}
            </div>
          </CardContent></Card>
          <Card className="border-[#CFF1D2]">
            <CardHeader><CardTitle className="text-sm font-black text-[#0F3B27]">Lots — ordre FEFO strict (STO-08)</CardTitle><CardDescription>Le premier lot de la liste est celui à sortir. Choisir un autre lot exige une justification journalisée. Seul un lot « Commercialisable » peut être vendu.</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <div className="p-8 text-center text-[#475C50]">Chargement FEFO...</div> : lots.length===0 ? <div className="p-8 text-center text-[#475C50]">Aucun lot — réceptionnez une livraison dans la section Réception.</div> : (
                <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                  <thead className="bg-[#F7F9F7] text-[#475C50] border-b border-[#CFF1D2] text-xs font-bold"><tr><th className="py-2 px-3">Priorité</th><th className="py-2 px-3">Médicament</th><th className="py-2 px-3">Lot & BL</th><th className="py-2 px-3">Péremption</th><th className="py-2 px-3">Qté</th><th className="py-2 px-3">Emplacement</th><th className="py-2 px-3">Statut</th><th className="py-2 px-3 text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-[#CFF1D2]/50">
                    {lots.map((lot, idx) => (
                      <tr key={lot.id} className={`hover:bg-[#F7F9F7] ${lot.statut_effectif==="quarantaine" ? "bg-amber-50/50":""} ${idx===0 && lot.est_vendable ? "bg-[#CFF1D2]/20":""}`}>
                        <td className="py-2 px-3">{idx===0 && lot.est_vendable ? <span className="inline-flex items-center gap-1 text-xs font-black text-[#0F3B27] bg-[#92FF5F] px-2 py-0.5 rounded-full"><ArrowRight className="w-3 h-3" /> Prochain</span> : <span className="text-xs font-mono text-[#475C50]">#{idx+1}</span>}</td>
                        <td className="py-2 px-3"><div className="font-bold text-[#0F3B27] text-xs">{lot.produit?.nom_commercial}</div><div className="text-[11px] text-[#475C50]">CIP {lot.produit?.code_cip} · DCI {lot.produit?.dci || "—"}</div>{lot.produit?.est_thermolabile && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 rounded">❄️ 2–8 °C</span>}</td>
                        <td className="py-2 px-3"><div className="font-mono text-xs font-bold">{lot.numero_lot}</div><div className="text-[11px] text-[#475C50]">{lot.fournisseur_nom} · BL {lot.bon_livraison_ref}</div></td>
                        <td className="py-2 px-3"><div className="font-bold text-xs">{lot.date_peremption}</div><div className="mt-1">{badgeAlerte(lot.statut_peremption, lot.jours_avant_peremption)}</div></td>
                        <td className="py-2 px-3 font-black text-[#0F3B27]">{lot.quantite_disponible} <span className="font-normal text-[#475C50] text-xs">/ {lot.quantite_initiale}</span></td>
                        <td className="py-2 px-3"><span className="text-xs font-bold bg-[#F7F9F7] border border-[#CFF1D2] px-2 py-1 rounded-xl">{lot.emplacement}</span></td>
                        <td className="py-2 px-3">{badgeStatut(lot)}{lot.motif_statut && <div className="text-[10px] text-[#475C50] max-w-[160px] truncate">{lot.motif_statut}</div>}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex justify-end gap-1">
                            {lot.statut_effectif==="commercialisable" ? (
                              <Button variant="outline" size="sm" onClick={()=>{setLotPourAction(lot); setStatutCible("quarantaine"); setDialogChangementStatutOuvert(true);}} className="text-xs h-8 border-amber-300 text-amber-800"><ShieldAlert className="w-3 h-3 mr-1" /> Bloquer</Button>
                            ) : lot.statut_effectif==="quarantaine" ? (
                              <Button variant="outline" size="sm" onClick={()=> mutationLever.mutate(lot.id)} className="text-xs h-8 border-[#CFF1D2] text-[#0F3B27]"><CheckCircle2 className="w-3 h-3 mr-1" /> Lever</Button>
                            ) : null}
                            <Button variant="ghost" size="sm" onClick={()=>{setLotPourAction(lot); setDialogChangementStatutOuvert(true);}} className="text-xs h-8">Changer</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* EMPLACEMENTS STO-04 */}
      {tab === "emplacements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-display font-black text-[#0F3B27]">Plan des zones — chaque boîte a sa place (STO-04)</h3><Badge variant="outline" className="border-[#CFF1D2]">{emplacements.length || 7} zones</Badge></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(emplacements.length ? emplacements : [
              { code:"COMPTOIR", libelle:"Comptoir — Délivrance", type_zone:"comptoir", lots_count: 0 },
              { code:"RESERVE", libelle:"Réserve — Stock principal", type_zone:"reserve", lots_count: 0 },
              { code:"FRIGO", libelle:"Réfrigérateur 2 °C – 8 °C", type_zone:"frigo", lots_count: 0 },
              { code:"ARMOIRE", libelle:"Armoire sécurisée — Stupéfiants", type_zone:"armoire_securisee", lots_count: 0 },
              { code:"ATTENTE", libelle:"Zone d’attente de contrôle", type_zone:"attente_controle", lots_count: 0 },
              { code:"RETOURS", libelle:"Zone des retours fournisseur", type_zone:"retours", lots_count: 0 },
              { code:"DECHETS", libelle:"Aire des déchets sécurisée", type_zone:"dechets", lots_count: 0 },
            ] as any).map((e: any)=>(
              <Card key={e.code} className={`border-2 ${e.type_zone==="frigo" ? "border-blue-200 bg-blue-50/30" : e.type_zone==="armoire_securisee" ? "border-purple-200 bg-purple-50/30" : e.type_zone==="dechets" ? "border-red-200 bg-red-50/20" : "border-[#CFF1D2] bg-white"}`}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-black text-[#0F3B27] flex items-center gap-2"><MapPin className="w-4 h-4" /> {e.libelle}</CardTitle><CardDescription className="text-xs">{e.code} · {e.type_zone}</CardDescription></CardHeader>
                <CardContent className="text-xs"><div className="flex justify-between"><span className="text-[#475C50]">Lots</span><strong>{e.lots_count ?? 0}</strong></div><div className="mt-2 text-[11px] text-[#475C50]">{e.type_zone==="frigo" ? "❄️ Réservé aux produits thermolabiles" : e.type_zone==="armoire_securisee" ? "🔒 Stupéfiants et listes uniquement" : "Étiquettes imprimables"}</div></CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Contraintes d’affectation (STO-04)</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Le frigo n’accepte que les produits thermolabiles, l’armoire que les stupéfiants et les listes. Déplacer un lot d’une zone à l’autre crée un transfert tracé, avec scan et confirmation.</CardContent></Card>
        </div>
      )}

      {/* MOUVEMENTS STO-09 */}
      {tab === "mouvements" && (
        <div className="space-y-4">
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-black text-[#0F3B27]">Journal des mouvements (STO-09) — rien ne s’efface, tout se contre-passe</CardTitle><CardDescription>Entrée, vente, transfert, casse ou destruction : chaque ligne porte sa pièce justificative et son auteur.</CardDescription></CardHeader><CardContent>
            {mouvements.length===0 ? <div className="p-6 text-center text-sm text-[#475C50]">Aucun mouvement — les réceptions et les transferts apparaîtront ici.</div> : (
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
        </div>
      )}

      {/* RÉCEPTION STO-05/06/07 */}
      {tab === "reception" && (
        <div className="space-y-4">
          <Card className="border-[#0F3B27] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-white font-display font-black flex items-center gap-2"><ScanLine className="w-5 h-5 text-[#92FF5F]" /> Réception contrôlée (STO-05)</CardTitle><CardDescription className="text-[#CFF1D2]">On scanne le bon de livraison, puis les boîtes. On rapproche de la commande et on vérifie la chaîne du froid.</CardDescription></CardHeader><CardContent className="text-xs leading-relaxed text-[#CFF1D2]">Le lot ne devient « Commercialisable » qu’une fois tous les contrôles obligatoires validés. Hors des heures d’ouverture, il attend en zone d’isolement (STO-06). Casse, manquant ou excédent : une fiche, des photos et un isolement (STO-07).</CardContent></Card>
          <ZoneDepot label="Déposer le bon de livraison et la facture du fournisseur (photo ou PDF)" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-black text-[#0F3B27]">Contrôles obligatoires</CardTitle></CardHeader><CardContent className="space-y-2 text-xs">
              {[
                ["alerte_sanitaire_verifiee","Alerte sanitaire sur le lot (recherche automatique)","BPD5-F05"],
                ["emballage_intact","État des emballages conforme","APP-03"],
                ["conformite_livraison","Conformité livraison / commande","STO-05"],
                ["dates_conformes","Dates et péremptions conformes","—"],
                ["chaine_froid_respectee","Chaîne du froid respectée","BPD5-F11"],
              ].map(([k,l,ref])=>(
                <label key={k} className="flex items-center gap-2 rounded-xl border border-[#CFF1D2] px-3 py-2"><input type="checkbox" checked={(controles as any)[k]} onChange={e=> setControles({...controles, [k]: e.target.checked})} className="accent-[#0F3B27] size-4" /><span className="font-bold text-[#0F3B27]">{l}</span><span className="ml-auto text-[10px] text-[#475C50]">{ref}</span></label>
              ))}
            </CardContent></Card>
            <Card className="border-amber-300 bg-amber-50"><CardHeader><CardTitle className="text-xs font-black text-amber-900 flex items-center gap-2"><FileWarning className="w-4 h-4" /> Anomalies de réception (STO-07)</CardTitle></CardHeader><CardContent className="text-xs text-amber-900">Casse, manquant, excédent ou produit non commandé : on ouvre une fiche, on joint des photos annotées, on isole le lot et on suit le litige fournisseur jusqu’à l’avoir.</CardContent></Card>
          </div>
          <Button onClick={()=> setDialogReceptionOuvert(true)} className="w-full bg-[#0F3B27] text-white font-bold">Ouvrir la réception — scan et contrôles</Button>
        </div>
      )}

      {/* INVENTAIRES STO-12 */}
      {tab === "inventaires" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display font-black text-[#0F3B27]">Inventaires — tournant et général annuel (STO-12)</h3><Button size="sm" className="bg-[#0F3B27] text-white" onClick={()=> toast.info("Création d’un inventaire — choisissez la zone, le comptage aveugle ou le double comptage.")}> <Plus className="w-4 h-4 mr-1" /> Nouvelle campagne</Button></div>
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-sm text-[#475C50]">La feuille de comptage s’utilise sur téléphone avec scan et fonctionne hors connexion. Comptage aveugle et double comptage en option, écarts valorisés, validation du pharmacien avant tout ajustement (STO-12). Export PDF et Excel conservé cinq ans — GAC-EN-010.</CardContent></Card>
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Campagnes</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Aucune campagne en cours — lancez un inventaire tournant par zone : réserve, comptoir, frigo ou armoire.</CardContent></Card>
        </div>
      )}

      {/* PÉREMPTIONS STO-11 */}
      {tab === "peremptions" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-black text-blue-700 flex items-center gap-2"><Calendar className="w-4 h-4" /> À 6 mois</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-blue-700">{peremptions.a_6_mois?.length ?? 0}</div><p className="text-xs text-[#475C50]">À surveiller tranquillement.</p></CardContent></Card>
            <Card className="border-amber-300 bg-amber-50/30"><CardHeader><CardTitle className="text-sm font-black text-amber-700 flex items-center gap-2"><Clock className="w-4 h-4" /> À 3 mois</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-amber-700">{peremptions.a_3_mois?.length ?? 0}</div><p className="text-xs text-[#475C50]">À écouler en priorité au comptoir.</p></CardContent></Card>
            <Card className="border-red-300 bg-red-50"><CardHeader><CardTitle className="text-sm font-black text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> À 1 mois · critique</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-red-700">{peremptions.a_1_mois?.length ?? 0}</div><p className="text-xs text-red-700">Retrait par scan — la vente est interdite après la date (STO-11).</p></CardContent></Card>
          </div>
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Aucun lot périmé en stock ? C’est bon signe.</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Deux issues possibles : retour au fournisseur ou rebut vers la filière déchet pharmaceutique (BPD5-F14, STK-06). Le bordereau de retrait s’exporte en PDF ou en Excel et se conserve cinq ans.</CardContent></Card>
        </div>
      )}

      {/* QUARANTAINE & RAPPELS STO-14 */}
      {tab === "quarantaine" && (
        <div className="space-y-4">
          <Card className="border-amber-400 bg-amber-50"><CardHeader><CardTitle className="text-sm font-black text-amber-900 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Rappels de lots — blocage immédiat (STO-14)</CardTitle><CardDescription className="text-amber-800">On saisit ou on importe l’avis reçu (source, produits, lots, date, action, pièce jointe). La caisse et la dispensation bloquent en moins d’une minute, une liste de prélèvement est éditée par emplacement, les boîtes sont scannées puis isolées, un bordereau de retour est signé et les patients concernés sont recherchés avant la clôture avec preuve.</CardDescription></CardHeader><CardContent className="text-xs text-amber-900">Conservation GAC-EN-008 : dix ans. Le cahier de rappel de lot et de mise en quarantaine s’imprime en PDF.</CardContent></Card>
          <ZoneDepot label="Déposer l’avis de rappel (PDF, photo ou courrier) — obligatoire" />
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-center text-sm text-[#475C50]">Aucun rappel actif — dès qu’un avis est saisi, les lots concernés sont bloqués sur-le-champ.</CardContent></Card>
        </div>
      )}

      {/* DÉCHETS STO-17 */}
      {tab === "dechets" && (
        <div className="space-y-4">
          <Card className="border-red-300 bg-red-50/30"><CardHeader><CardTitle className="text-sm font-black text-red-800 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Déchets et destruction — BPD9 (STO-17)</CardTitle><CardDescription className="text-red-700">Motif possible : périmé, avarié, non conforme, rappelé ou retourné. Le lot rejoint l’aire sécurisée, devient « à détruire », puis part chez un prestataire qualifié. Le procès-verbal contradictoire est signé électroniquement et rangé dans le coffre-fort numérique, avec l’écriture de perte.</CardDescription></CardHeader><CardContent className="text-xs text-red-800">Les procès-verbaux de destruction se conservent dix ans (GAC-EN). Chaque déchet génère une perte comptable (STO-18).</CardContent></Card>
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-center text-sm text-[#475C50]">Aucun lot en déchet — pour en constituer un, sélectionnez des lots périmés ou rejetés.</CardContent></Card>
        </div>
      )}

      {/* VALORISATION STO-18/19 */}
      {tab === "valorisation" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-[#0F3B27] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#92FF5F]" /> Valorisation au coût moyen</CardTitle></CardHeader><CardContent><div className="text-2xl font-black font-display">{valorisation.total.toLocaleString("fr-FR")} FCFA</div><p className="text-xs text-[#CFF1D2]">Coût moyen pondéré à la date du jour, rapproché du compte de stock (STO-18).</p></CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">ABC et rotation</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Classement ABC, couverture en jours et marge par famille, avec le cahier des ruptures et des demandes non satisfaites (STO-19, STK-08, BPD5-F15).</CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Étiquettes</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Impression des étiquettes d’emplacement, de quarantaine et de rebut (STO-20) sur l’imprimante d’étiquettes.</CardContent></Card>
          </div>
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Détail par produit (coût moyen pondéré)</CardTitle></CardHeader><CardContent>
            {valorisation.par_produit?.length ? (
              <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-[#F7F9F7] text-[#475C50] font-bold border-b border-[#CFF1D2]"><tr><th className="py-2 px-3">Produit</th><th className="py-2 px-3">Qté</th><th className="py-2 px-3">Coût moyen</th><th className="py-2 px-3">Valeur</th></tr></thead><tbody className="divide-y divide-[#CFF1D2]/50">{valorisation.par_produit.slice(0,20).map((v:any)=>(
                <tr key={v.produit.id}><td className="py-2 px-3 font-bold text-[#0F3B27]">{v.produit.nom_commercial}</td><td className="py-2 px-3 font-mono">{v.quantite}</td><td className="py-2 px-3 font-mono">{Number(v.cmp || 0).toLocaleString("fr-FR")} FCFA</td><td className="py-2 px-3 font-mono font-bold">{Number(v.valeur).toLocaleString("fr-FR")} FCFA</td></tr>
              ))}</tbody></table></div>
            ) : <div className="text-sm text-[#475C50]">La valorisation se calcule dès qu’un lot est réceptionné.</div>}
          </CardContent></Card>
        </div>
      )}

      {/* Dialog Réception — modale horizontale, contrôles STO-05 */}
      <Dialog open={dialogReceptionOuvert} onOpenChange={setDialogReceptionOuvert}>
        <ModaleFiche
          titre="Réception contrôlée (STO-05)"
          sousTitre="On scanne le bon de livraison, puis les boîtes. Le lot ne devient vendable qu’une fois les contrôles obligatoires cochés."
          badge={<Badge className="bg-[#0F3B27] text-[#92FF5F]">STO-05</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogReceptionOuvert(false)} className="h-12 rounded-xl sm:h-11">Annuler</Button>
              <Button type="submit" form="form-reception" disabled={mutationReception.isPending} className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11">
                {mutationReception.isPending ? "Réception en cours…" : "Confirmer la réception et appliquer le FEFO"}
              </Button>
            </div>
          }
        >
          <form id="form-reception" onSubmit={handleReceptionSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Colonne gauche : quoi et combien */}
            <ColonneFiche titre="Ce qui arrive" aide="Le produit et le lot tels qu’ils sont imprimés sur la boîte.">
              <Champ label="Médicament reçu" obligatoire aide="Le produit est d’abord choisi dans le catalogue, puis on saisit le lot livré.">
                <select
                  className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]"
                  value={produitId}
                  onChange={e => { setProduitId(e.target.value); const p = produits.find(x => x.id === e.target.value); if (p?.est_thermolabile) setEmplacement("Réfrigérateur 2 °C – 8 °C"); }}
                  required
                >
                  <option value="">Choisir le médicament reçu…</option>
                  {produits.map(p => <option key={p.id} value={p.id}>{p.nom_commercial} ({p.code_cip}) {p.est_thermolabile ? "— à conserver au froid" : ""}</option>)}
                </select>
              </Champ>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Numéro de lot" obligatoire aide="Celui qui figure sur la boîte, avec les mêmes caractères.">
                  <Input value={numeroLot} onChange={e => setNumeroLot(e.target.value)} placeholder="Ex. LOT-2026-014" className="h-12 rounded-xl" required />
                </Champ>
                <Champ label="Date de péremption" obligatoire aide="Jour, mois, année — comme sur la boîte.">
                  <Input type="date" value={datePeremption} onChange={e => setDatePeremption(e.target.value)} className="h-12 rounded-xl" required />
                </Champ>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Quantité reçue" obligatoire aide="En boîtes, pas en plaquettes.">
                  <Input type="number" min="1" inputMode="numeric" value={quantite} onChange={e => setQuantite(e.target.value)} placeholder="Ex. 24" className="h-12 rounded-xl" required />
                </Champ>
                <Champ label="Bon de livraison" obligatoire aide="Le numéro inscrit en haut du bon.">
                  <Input value={bonLivraisonRef} onChange={e => setBonLivraisonRef(e.target.value)} placeholder="Ex. BL-2026-0087" className="h-12 rounded-xl" required />
                </Champ>
              </div>

              {produitChoisi ? (
                <div className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] px-3 py-2 text-[11px] text-[#475C50]">
                  <strong className="text-[#0F3B27]">{produitChoisi.nom_commercial}</strong> · {produitChoisi.dci || "DCI non renseignée"} · {produitChoisi.forme || ""} {produitChoisi.dosage || ""}
                  {produitChoisi.est_thermolabile ? " — produit thermolabile : le frigo est proposé automatiquement." : ""}
                </div>
              ) : null}
            </ColonneFiche>

            {/* Colonne droite : d'où ça vient, où ça va, contrôles */}
            <ColonneFiche titre="D’où ça vient et où ça va" aide="Le fournisseur, la place en réserve, puis les vérifications.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Fournisseur">
                  <select className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]" value={fournisseurNom} onChange={e => setFournisseurNom(e.target.value)}>
                    <option>CAMEG BÉNIN</option>
                    <option>UBIPHARM BÉNIN</option>
                    <option>LABOREX BÉNIN</option>
                    <option>Autre</option>
                  </select>
                </Champ>
                <Champ label="Emplacement" aide="Le frigo est réservé aux thermolabiles.">
                  <Input value={emplacement} onChange={e => setEmplacement(e.target.value)} placeholder="Ex. Réserve — Stock principal" className="h-12 rounded-xl" />
                </Champ>
              </div>

              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-xs font-black text-amber-900">Contrôles obligatoires avant de valider</p>
                <p className="mb-2 text-[11px] text-amber-900/80">Cochez chaque point réellement vérifié. Un point manquant laisse le lot en attente de contrôle.</p>
                <div className="space-y-2">
                  {([
                    ["alerte_sanitaire_verifiee", "Aucune alerte sanitaire ne vise ce lot"],
                    ["emballage_intact", "Les emballages sont intacts, sans choc ni trace d’humidité"],
                    ["conformite_livraison", "La livraison correspond à la commande (produit, quantité, prix)"],
                    ["dates_conformes", "Les dates de péremption sont lisibles et suffisamment lointaines"],
                  ] as const).map(([k, l]) => (
                    <label key={k} className="flex min-h-10 items-start gap-2 rounded-xl bg-white/60 px-2.5 py-2 text-xs text-[#0F3B27]">
                      <input type="checkbox" checked={(controles as any)[k]} onChange={e => setControles({ ...controles, [k]: e.target.checked })} className="mt-0.5 size-4 accent-[#0F3B27]" />
                      <span className="font-semibold leading-snug">{l}</span>
                    </label>
                  ))}
                  {produitChoisi?.est_thermolabile ? (
                    <label className="flex min-h-10 items-start gap-2 rounded-xl border border-blue-300 bg-blue-50 px-2.5 py-2 text-xs text-blue-900">
                      <input type="checkbox" checked={controles.chaine_froid_respectee} onChange={e => setControles({ ...controles, chaine_froid_respectee: e.target.checked })} className="mt-0.5 size-4 accent-[#0F3B27]" />
                      <span className="font-semibold leading-snug">Le produit est resté entre 2 °C et 8 °C pendant le transport</span>
                    </label>
                  ) : null}
                </div>
                {tousControles && !froidManquant ? (
                  <p className="mt-2 rounded-xl bg-emerald-100 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900">Tous les contrôles sont bons : le lot passera « Commercialisable ».</p>
                ) : (
                  <p className="mt-2 rounded-xl bg-amber-100 px-2.5 py-1.5 text-[11px] font-bold text-amber-900">
                    {froidManquant ? "Chaîne du froid non confirmée : le lot thermolabile restera en attente de contrôle." : "Contrôles incomplets : le lot restera « En attente de contrôle »."}
                  </p>
                )}
              </div>

              <ZoneDepot label="Joindre le bon de livraison ou la facture (photo ou PDF)" />
            </ColonneFiche>
          </form>
        </ModaleFiche>
      </Dialog>

      {/* Dialog Changement de statut — 8 statuts §0.2 */}
      <Dialog open={dialogChangementStatutOuvert} onOpenChange={setDialogChangementStatutOuvert}>
        <ModaleFiche
          titre="Changer le statut d’un lot"
          sousTitre={lotPourAction ? `Lot ${lotPourAction.numero_lot} · ${lotPourAction.produit?.nom_commercial ?? ""} — le changement prend effet immédiatement et reste au journal.` : "Le changement prend effet immédiatement."}
          badge={<Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">§0.2 · 8 statuts</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">Le motif est obligatoire : il explique la décision à l’inspection.</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setDialogChangementStatutOuvert(false)} className="h-12 rounded-xl sm:h-11">Annuler</Button>
                <Button className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11" disabled={!motif || mutationChangerStatut.isPending} onClick={() => lotPourAction && mutationChangerStatut.mutate({ id: lotPourAction.id, statut: statutCible, motif })}>
                  {mutationChangerStatut.isPending ? "…" : "Valider, effet immédiat"}
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="Là où en est le lot" aide="Ce que le système sait aujourd’hui.">
              <div className="rounded-2xl border border-[#CFF1D2] bg-[#F7F9F7] p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-black text-[#0F3B27]">{lotPourAction?.produit?.nom_commercial ?? "—"}</p>
                    <p className="font-mono text-[11px] text-[#475C50]">Lot {lotPourAction?.numero_lot ?? "—"} · péremption {lotPourAction?.date_peremption ?? "—"}</p>
                  </div>
                  {lotPourAction ? badgeStatut(lotPourAction) : null}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  <div><dt className="text-[11px] text-[#475C50]">Quantité disponible</dt><dd className="font-mono font-bold text-[#0F3B27]">{lotPourAction?.quantite_disponible ?? "—"} boîtes</dd></div>
                  <div><dt className="text-[11px] text-[#475C50]">Emplacement</dt><dd className="font-bold text-[#0F3B27]">{lotPourAction?.emplacement ?? "—"}</dd></div>
                  <div><dt className="text-[11px] text-[#475C50]">Fournisseur</dt><dd className="font-bold text-[#0F3B27]">{lotPourAction?.fournisseur_nom ?? "—"}</dd></div>
                  <div><dt className="text-[11px] text-[#475C50]">Bon de livraison</dt><dd className="font-mono text-[#0F3B27]">{lotPourAction?.bon_livraison_ref ?? "—"}</dd></div>
                </dl>
                {lotPourAction?.motif_statut ? <p className="mt-2 rounded-lg bg-white px-2 py-1 text-[11px] text-[#475C50]">Motif actuel : {lotPourAction.motif_statut}</p> : null}
              </div>
              <div className="rounded-2xl border border-[#CFF1D2] p-3 text-[11px] leading-relaxed text-[#475C50]">
                <strong className="text-[#0F3B27]">À retenir :</strong> seul un lot « Commercialisable » peut être vendu ou délivré. Les autres statuts bloquent la caisse et la dispensation, mais le lot reste consultable pour l’historique, les rappels patients et la comptabilité.
              </div>
            </ColonneFiche>

            <ColonneFiche titre="Le nouveau statut" aide="Choisissez, puis expliquez votre décision.">
              <Champ label="Nouveau statut" obligatoire>
                <select value={statutCible} onChange={e => setStatutCible(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]">
                  {STATUTS.map(s => <option key={s.valeur} value={s.valeur}>{s.libelle}{s.vendable ? " — vente autorisée" : " — vente bloquée"}</option>)}
                </select>
              </Champ>
              {statutChoisi ? (
                <div className={`rounded-2xl border-2 p-3 ${statutChoisi.classe}`}>
                  <p className="text-xs leading-relaxed text-[#0F3B27]">{statutChoisi.description}</p>
                  <p className="mt-1 text-[11px] text-[#475C50]">{statutChoisi.consequence}</p>
                </div>
              ) : null}
              <Champ label="Motif de la décision" obligatoire aide="Un fait, pas une opinion : « rappel du fabricant du 03/11 », « emballage écrasé à la livraison », etc.">
                <Textarea rows={4} placeholder="Expliquez en une phrase, avec la référence de la pièce justificative…" value={motif} onChange={e => setMotif(e.target.value)} className="rounded-xl text-sm" />
              </Champ>
              <p className="text-[11px] text-[#475C50]">L’opération est horodatée et signée à votre nom. Elle ne peut pas être supprimée : elle se rectifie par une écriture contraire.</p>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>

      {/* Quarantaine */}
      <Dialog open={dialogQuarantaineOuvert} onOpenChange={setDialogQuarantaineOuvert}>
        <ModaleFiche
          titre="Mettre un lot en quarantaine"
          sousTitre={lotPourAction ? `Lot ${lotPourAction.numero_lot} · ${lotPourAction.produit?.nom_commercial ?? ""} — isolé immédiatement de toute délivrance.` : "Le lot est isolé immédiatement de toute délivrance."}
          badge={<Badge className="bg-red-600 text-white">Art. 5.14</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogQuarantaineOuvert(false)} className="h-12 rounded-xl sm:h-11">Annuler</Button>
              <Button variant="destructive" className="h-12 rounded-xl sm:h-11" disabled={!motif} onClick={() => lotPourAction && mutationQuarantaine.mutate({ id: lotPourAction.id, motif })}>Confirmer le blocage</Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="Le lot concerné">
              <div className="rounded-2xl border border-[#CFF1D2] bg-[#F7F9F7] p-3 text-xs">
                <p className="font-display text-sm font-black text-[#0F3B27]">{lotPourAction?.produit?.nom_commercial ?? "—"}</p>
                <p className="font-mono text-[11px] text-[#475C50]">Lot {lotPourAction?.numero_lot ?? "—"} · péremption {lotPourAction?.date_peremption ?? "—"}</p>
                <p className="mt-2 text-[#475C50]">Quantité bloquée : <strong className="text-[#0F3B27]">{lotPourAction?.quantite_disponible ?? "—"} boîtes</strong> · emplacement <strong className="text-[#0F3B27]">{lotPourAction?.emplacement ?? "—"}</strong></p>
              </div>
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                La vente et la dispensation refusent ce lot dès la validation. La levée de quarantaine passera par une décision documentée du pharmacien, jamais par une suppression.
              </div>
            </ColonneFiche>
            <ColonneFiche titre="Pourquoi on l’isole">
              <Champ label="Motif" obligatoire aide="Rappel du fabricant, emballage endommagé, excursion de température, doute sur le lot…">
                <Textarea rows={6} value={motif} onChange={e => setMotif(e.target.value)} placeholder="Décrivez ce qui justifie l’isolement, avec la référence de l’avis ou du constat…" className="rounded-xl text-sm" />
              </Champ>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>
    </div>
  );
}
