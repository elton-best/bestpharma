import { useEffect, useState, useRef } from "react";
import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { telechargerCsv } from "@/lib/export-utils";
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
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { formatDate, nombre } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DechetsStock, InventairesStock, RappelsStock } from "@/components/modules/magasin-avance";

export const Route = createFileRoute("/_authenticated/stock")({
  head: () => ({
    meta: [
      { title: "Magasin & Stocks — BestPharma" },
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

// ─── Les statuts d’un lot, expliqués en français courant
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

// Composant réutilisable : glisser-déposer fichier et upload réel vers le backend
function ZoneDepot({
  label,
  accept = ".jpg,.jpeg,.png,.webp,.pdf,.csv,.xlsx",
  dossier = "stock_documents",
  valeurUrl,
  valeurNom,
  onUploadSuccess,
  onFiles,
}: {
  label: string;
  accept?: string;
  dossier?: string;
  valeurUrl?: string;
  valeurNom?: string;
  onUploadSuccess?: (file: { url: string; filename: string; original_name: string; size: number }) => void;
  onFiles?: (files: FileList) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [televersement, setTeleversement] = useState(false);
  const [fichierActuel, setFichierActuel] = useState<{ url: string; nom: string; taille?: number } | null>(
    valeurUrl ? { url: valeurUrl, nom: valeurNom || "Document joint" } : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const traiterFichiers = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFiles?.(files);

    const file = files[0];
    setTeleversement(true);
    try {
      const res = await api.uploadFile<{ url: string; filename: string; original_name: string; size: number }>(
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
      toast.success(`Fichier "${info.nom}" téléversé et archivé avec succès !`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléversement du fichier.");
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
        traiterFichiers(e.dataTransfer.files);
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
        onChange={(e) => traiterFichiers(e.target.files)}
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
                  Ouvrir le document
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
              ? "Téléversement et archivage sécurisé en cours…"
              : "Glisser-déposer, photographier ou choisir un fichier — JPG, PNG, PDF ou CSV, 30 Mo maximum."}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={televersement}
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-[#CFF1D2] bg-white px-3 py-1.5 text-xs font-bold text-[#0F3B27] hover:bg-[#CFF1D2]/30"
          >
            <ScanLine className="w-3.5 h-3.5" />
            {televersement ? "Téléversement…" : "Choisir un fichier"}
          </Button>
        </>
      )}
    </div>
  );
}

function PageStockMagasin() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(typeof location.search === "string" ? location.search : "");
  const urlTab = searchParams.get("tab") || (location.search as any)?.tab;
  const [tab, setTabState] = useState(urlTab || "lots");

  useEffect(() => {
    if (urlTab && urlTab !== tab) {
      setTabState(urlTab);
    }
  }, [urlTab]);

  const setTab = (newTab: string) => {
    setTabState(newTab);
    navigate({ to: "/stock", search: { tab: newTab } as any });
  };
  const [modeAffichageLots, setModeAffichageLots] = useState<"cartes" | "tableau">("cartes");
  const [modeAffichageProduits, setModeAffichageProduits] = useState<"cartes" | "tableau">("cartes");
  const [sousSectionLot, setSousSectionLot] = useState("tous");
  const [sousSectionProduit, setSousSectionProduit] = useState("tous");
  const [sousSectionEmplacement, setSousSectionEmplacement] = useState("toutes");
  const [sousSectionMouvement, setSousSectionMouvement] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [filtreAlerte, setFiltreAlerte] = useState("tous");
  const [dialogReceptionOuvert, setDialogReceptionOuvert] = useState(false);
  const [dialogAjoutProduitOuvert, setDialogAjoutProduitOuvert] = useState(false);
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
  const [bonLivraisonUrl, setBonLivraisonUrl] = useState("");
  const [emplacement, setEmplacement] = useState("Réserve — Stock principal");
  const [controles, setControles] = useState({ alerte_sanitaire_verifiee: false, emballage_intact: false, conformite_livraison: false, dates_conformes: false, chaine_froid_respectee: false });

  const [nouveauProduit, setNouveauProduit] = useState({
    code_cip: "",
    nom_commercial: "",
    dci: "",
    forme: "Comprimé",
    dosage: "",
    classe_therapeutique: "",
    tableau_substance: "sans",
    est_thermolabile: false,
    necessite_ordonnance: false,
    prix_public_ttc: "",
    seuil_stock_min: "5",
  });

  // Queries
  const { data: produitsData } = useQuery<{ data: Produit[] }>({ queryKey: ["produits"], queryFn: () => api.get("/produits") });
  const { data: lotsData, isLoading } = useQuery<{ data: StockLotItem[]; stats: any }>({
    queryKey: ["stocks", filtreAlerte, recherche],
    queryFn: () => {
      const p = new URLSearchParams();
      if (filtreAlerte !== "tous") p.append("alerte", filtreAlerte);
      if (recherche) p.append("q", recherche);
      // Les lots bloqués (quarantaine, rejetés, déchets) doivent rester visibles : on ne filtre pas sur « vendable ».
      return api.get(`/stocks?${p.toString()}`);
    },
  });
  const { data: emplacementsData } = useQuery<{ data: EmplacementItem[] }>({ queryKey: ["emplacements"], queryFn: () => api.get("/emplacements") });
  const { data: mouvementsData } = useQuery<{ data: { data: MouvementItem[] } }>({ queryKey: ["mouvements"], queryFn: () => api.get("/mouvements") });
  const { data: alertesData } = useQuery<{ data: any }>({ queryKey: ["stocks-alertes"], queryFn: () => api.get("/stocks/alertes") });
  const { data: peremptionsData } = useQuery<{ data: any }>({ queryKey: ["peremptions"], queryFn: () => api.get<any>("/stocks/peremptions").catch(() => ({ data: { a_1_mois: [], a_3_mois: [], a_6_mois: [], perimes: [] } })) });
  const { data: valorisationData } = useQuery<{ data: any }>({ queryKey: ["valorisation"], queryFn: () => api.get<any>("/stocks/valorisation").catch(() => ({ data: { total: 0, par_produit: [] } })) });

  const reinitialiserControles = () => setControles({ alerte_sanitaire_verifiee: false, emballage_intact: false, conformite_livraison: false, dates_conformes: false, chaine_froid_respectee: false });

  const mutationAjoutProduit = useMutation({
    mutationFn: (payload: any) => api.post("/produits", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Produit ajouté avec succès au catalogue");
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      setDialogAjoutProduitOuvert(false);
      setNouveauProduit({
        code_cip: "",
        nom_commercial: "",
        dci: "",
        forme: "Comprimé",
        dosage: "",
        classe_therapeutique: "",
        tableau_substance: "sans",
        est_thermolabile: false,
        necessite_ordonnance: false,
        prix_public_ttc: "",
        seuil_stock_min: "5",
      });
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'enregistrement du produit"),
  });

  const handleAjoutProduitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauProduit.code_cip || !nouveauProduit.nom_commercial || !nouveauProduit.prix_public_ttc) {
      toast.error("Veuillez renseigner le code CIP, le nom commercial et le prix TTC.");
      return;
    }
    mutationAjoutProduit.mutate({
      ...nouveauProduit,
      prix_public_ttc: parseFloat(nouveauProduit.prix_public_ttc),
      seuil_stock_min: parseInt(nouveauProduit.seuil_stock_min || "5", 10),
    });
  };

  const mutationReception = useMutation({
    mutationFn: (payload: any) => api.post("/stocks", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Lot réceptionné — règle FEFO appliquée");
      queryClient.invalidateQueries({ queryKey: ["stocks"] }); queryClient.invalidateQueries({ queryKey: ["produits"] }); queryClient.invalidateQueries({ queryKey: ["mouvements"] });
      setDialogReceptionOuvert(false); setNumeroLot(""); setDatePeremption(""); setQuantite(""); setBonLivraisonRef(""); setBonLivraisonUrl(""); reinitialiserControles();
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
      fournisseur_nom: fournisseurNom, bon_livraison_ref: bonLivraisonRef, bon_livraison_url: bonLivraisonUrl, emplacement,
      controles_reception: controles,
    });
  };

  const statutChoisi = STATUTS.find((s) => s.valeur === statutCible);

  return (
    <div className="space-y-6">
      {/* SÉLECTEUR DÉROULANT FILTRABLE DES 11 SECTIONS DU STOCK */}
      <div className="bg-white p-3.5 rounded-[10px] border border-[#CFF1D2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[10px] bg-[#0F3B27]/10 text-[#0F3B27]">
            <Boxes className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#0F3B27] block">Module Gestion des Stocks & Magasin (BPD-5)</span>
            <span className="text-[11px] text-[#475C50]">Sélectionnez une section ou utilisez la recherche instantanée</span>
          </div>
        </div>
        <div className="w-full md:w-96">
          <SelecteurFiltrable
            options={SECTIONS}
            valeur={tab}
            onChangement={setTab}
            placeholder="Choisir une section..."
            recherchePlaceholder="Filtrer parmi les 11 sections de stock..."
            className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
          />
        </div>
      </div>

      {/* VUE D'ENSEMBLE STO-01 : EXCLUSIVEMENT AFFICHÉE DANS L'ONGLET VUE D'ENSEMBLE */}
      {tab === "vue-ensemble" && (
        <div className="space-y-6">
          {/* En-tête avec charte BestPharma */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                  BPD-5 · FEFO · STO
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                  Chaque statut, expliqué en clair
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                Vue d’ensemble du Stock & Magasin
              </h1>
              <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                Tout ce qui entre, sort ou dort en réserve, raconté simplement : chaque boîte garde son lot, son
                emplacement et son statut. La caisse ne vend que ce qui est vendable, dans l’ordre de péremption ;
                la dispensation pioche au bon endroit ; la comptabilité suit le coût moyen et les pertes.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                  <Thermometer className="w-3.5 h-3.5 text-[#92FF5F]" /> Chaîne du froid 2–8 °C
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] text-[#0F3B27] px-3 py-1">
                  <Verified className="w-3.5 h-3.5" /> Lot unique (INT-01)
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                  FCFA sans décimale · JJ/MM/AAAA
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                onClick={() => setDialogReceptionOuvert(true)}
                className="gap-2 bg-[#92FF5F] hover:bg-[#82ea52] text-[#0F3B27] font-black text-xs h-10 px-4 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Réceptionner un lot
              </Button>
              <div className="flex items-center gap-2 text-xs">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!lots.length) {
                      toast.info("Aucun lot en stock à exporter.");
                      return;
                    }
                    telechargerCsv(
                      lots.map((l: any) => ({
                        lot: l.numero_lot,
                        produit: l.produit?.nom_commercial || l.produit_nom || "",
                        dci: l.produit?.dci || "",
                        peremption: l.date_peremption,
                        jours_restants: l.jours_avant_peremption,
                        quantite: l.quantite_restante ?? l.quantite_disponible,
                        emplacement: l.emplacement?.nom || l.emplacement_nom || l.emplacement || "",
                        statut: l.statut_effectif || l.statut,
                        thermolabile: l.produit?.est_thermolabile ? "2-8°C" : "Ambiant",
                      })),
                      `Export_Stock_BestPharma_${new Date().toISOString().split("T")[0]}.csv`,
                      [
                        { cle: "lot", entete: "N° Lot" },
                        { cle: "produit", entete: "Produit" },
                        { cle: "dci", entete: "DCI" },
                        { cle: "peremption", entete: "Date Péremption" },
                        { cle: "jours_restants", entete: "Jours restants" },
                        { cle: "quantite", entete: "Quantité en stock" },
                        { cle: "emplacement", entete: "Emplacement" },
                        { cle: "statut", entete: "Statut BPD" },
                        { cle: "thermolabile", entete: "Conservation" },
                      ]
                    );
                    toast.success("Synthèse du stock exportée en CSV");
                  }}
                  className="h-8 text-xs border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export
                </Button>
                <Badge variant="outline" className="border-amber-400 text-amber-300 bg-amber-950/40">
                  {alertes.lots_bloques} bloqués
                </Badge>
              </div>
            </div>
          </div>

          {/* Barre d'état de synthèse */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#CFF1D2] bg-white px-4 py-2.5 shadow-sm text-xs font-bold text-[#0F3B27]">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> En ligne
            </span>
            <span className="text-[#475C50]">•</span>
            <span>{stats.total_lots_actifs} lots actifs</span>
            <span className="text-[#475C50]">•</span>
            <span className={alertes.lots_bloques > 0 ? "text-amber-700" : ""}>
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> {alertes.lots_bloques} bloqués
            </span>
            <span className="text-[#475C50]">•</span>
            <span className={stats.perimes > 0 ? "text-red-700" : ""}>
              <ShieldAlert className="w-3.5 h-3.5 inline mr-1" /> {stats.perimes} périmés
            </span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#F7F9F7] border border-[#CFF1D2] px-2.5 py-1">
              Valeur stock : {nombre(stats.valorisation_totale || valorisation.total || 0)} FCFA
            </span>
          </div>

          {/* Cartes KPI Vue d'ensemble */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-[#CFF1D2] bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-[#475C50]">Valeur du stock (coût moyen)</CardTitle>
                <TrendingUp className="w-4 h-4 text-[#0F3B27]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-display text-[#0F3B27]">
                  {nombre(valorisation.total || stats.valorisation_totale || 0)} <span className="text-sm font-sans">FCFA</span>
                </div>
                <p className="text-xs text-[#475C50]">Coût moyen pondéré, rapproché du compte de stock.</p>
              </CardContent>
            </Card>

            <Card className={`border-[#CFF1D2] ${alertes.ruptures > 0 ? "border-amber-400 bg-amber-50/30" : "bg-white"}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-[#475C50]">Ruptures & sous minimum</CardTitle>
                <AlertOctagon className="w-4 h-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-700">{alertes.ruptures ?? 0}</div>
                <p className="text-xs text-[#475C50]">Produits sous leur seuil de réassort.</p>
              </CardContent>
            </Card>

            <Card className="border-[#CFF1D2] bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-[#475C50]">Lots actifs FEFO</CardTitle>
                <Layers className="w-4 h-4 text-[#0F3B27]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-[#0F3B27]">{stats.total_lots_actifs}</div>
                <p className="text-xs text-[#475C50]">Le lot qui périme le plus tôt sort le premier.</p>
              </CardContent>
            </Card>

            <Card className={`border-[#CFF1D2] ${stats.perimes > 0 ? "border-red-500 bg-red-50" : "bg-white"}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-[#475C50]">Périmés interdits</CardTitle>
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-red-700">{stats.perimes}</div>
                <p className="text-xs text-red-700">Mise en quarantaine obligatoire, vente refusée.</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-[#CFF1D2]">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#0F3B27]">Péremptions à surveiller</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#475C50]">À 6 mois</span>
                  <strong className="text-[#0F3B27]">{peremptions.a_6_mois?.length ?? 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475C50]">À 3 mois</span>
                  <strong className="text-amber-700">{peremptions.a_3_mois?.length ?? 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475C50]">À 1 mois (critique)</span>
                  <strong className="text-red-700">{peremptions.a_1_mois?.length ?? 0}</strong>
                </div>
                <div className="flex justify-between border-t border-[#CFF1D2] pt-2">
                  <span className="text-[#475C50]">Lots bloqués</span>
                  <strong className="text-[#0F3B27]">{alertes.lots_bloques}</strong>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#CFF1D2]">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#0F3B27]">Produits dormants & surstock</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#475C50]">
                Classement ABC, rotation et couverture en jours dans la section Valorisation (STO-19).
              </CardContent>
            </Card>

            <Card className="border-[#CFF1D2] bg-[#0F3B27] text-white">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#92FF5F] flex items-center gap-2">
                  <PackageCheck className="w-4 h-4" /> Règle FEFO
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs leading-relaxed">
                La vente propose toujours le lot à péremption la plus proche. Choisir un autre lot demande une
                justification journalisée (STO-08).
              </CardContent>
            </Card>
          </div>

          {/* Les statuts d’un lot, avec des mots simples */}
          <Card className="border-[#CFF1D2]">
            <CardHeader>
              <CardTitle className="text-sm font-black text-[#0F3B27]">Les statuts d’un lot, dits simplement</CardTitle>
              <CardDescription className="text-xs">
                Chaque étape de la vie d’un lot porte un nom clair : de l’arrivée en réserve jusqu’à l’épuisement complet du stock.
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
      {tab === "produits" && (() => {
        const countsProduits = {
          tous: produits.length,
          rupture: produits.filter((p) => p.alerte_rupture || p.stock_total <= (p.stock_minimum || 0)).length,
          thermolabile: produits.filter((p) => p.est_thermolabile).length,
          stupefiant: produits.filter((p) => p.tableau_substance === "stupefiant" || p.tableau_substance === "liste_1" || p.tableau_substance === "liste_2").length,
          taxable: produits.filter((p) => p.groupe_taxation === "B_TAXABLE").length,
        };

        const produitsAffiches = produits.filter((p) => {
          if (recherche.trim()) {
            const q = recherche.toLowerCase();
            const match =
              (p.nom_commercial || "").toLowerCase().includes(q) ||
              (p.dci || "").toLowerCase().includes(q) ||
              (p.code_cip || "").toLowerCase().includes(q) ||
              (p.laboratoire || "").toLowerCase().includes(q);
            if (!match) return false;
          }
          if (sousSectionProduit === "rupture") return p.alerte_rupture || p.stock_total <= (p.stock_minimum || 0);
          if (sousSectionProduit === "thermolabile") return !!p.est_thermolabile;
          if (sousSectionProduit === "stupefiant") return p.tableau_substance === "stupefiant" || p.tableau_substance === "liste_1" || p.tableau_substance === "liste_2";
          if (sousSectionProduit === "taxable") return p.groupe_taxation === "B_TAXABLE";
          return true;
        });

        return (
          <div className="space-y-6">
            {/* En-tête dédié Produits BPD-5 */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                    BPD-5 · RÉFÉRENTIEL · STO-02
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                    Catalogue & Nomenclature Officinale
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Catalogue & Référentiel des Médicaments
                </h1>
                <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                  Gestion centralisée du référentiel pharmaceutique : codes CIP, DCI, formes galéniques, dosages,
                  seuils d'alerte de réassort, et classification réglementaire (thermolabiles 2–8 °C, stupéfiants, TVA).
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                    <Package className="w-3.5 h-3.5 text-[#92FF5F]" /> Nomenclature Nationale Bénin
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] text-[#0F3B27] px-3 py-1">
                    <Verified className="w-3.5 h-3.5" /> DCI & Codes CIP Uniques
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  onClick={() => setDialogAjoutProduitOuvert(true)}
                  className="gap-2 bg-[#92FF5F] hover:bg-[#82ea52] text-[#0F3B27] font-black text-xs h-10 px-4 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Nouveau Produit
                </Button>
                <div className="flex items-center gap-2 text-xs">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!produits.length) {
                        toast.info("Aucun produit au catalogue à exporter.");
                        return;
                      }
                      telechargerCsv(
                        produits.map((p: any) => ({
                          cip: p.code_cip || "",
                          nom: p.nom_commercial,
                          dci: p.dci || "",
                          forme: p.forme || "",
                          dosage: p.dosage || "",
                          prix_public: p.prix_public_ttc || "",
                          stock_total: p.stock_total || 0,
                          thermolabile: p.est_thermolabile ? "Oui (2-8°C)" : "Non",
                          ordonnance: p.necessite_ordonnance ? "Oui" : "Non",
                        })),
                        `Catalogue_Produits_BestPharma_${new Date().toISOString().split("T")[0]}.csv`,
                        [
                          { cle: "cip", entete: "Code CIP" },
                          { cle: "nom", entete: "Nom Commercial" },
                          { cle: "dci", entete: "DCI" },
                          { cle: "forme", entete: "Forme Galénique" },
                          { cle: "dosage", entete: "Dosage" },
                          { cle: "prix_public", entete: "Prix Public TTC (FCFA)" },
                          { cle: "stock_total", entete: "Stock total disponible" },
                          { cle: "thermolabile", entete: "Chaîne du froid" },
                          { cle: "ordonnance", entete: "Ordonnance requise" },
                        ]
                      );
                      toast.success("Catalogue des produits exporté en CSV");
                    }}
                    className="h-8 text-xs border-white/20 bg-white/10 text-white hover:bg-white/20"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Exporter catalogue
                  </Button>
                  <Badge variant="outline" className="border-emerald-400 text-emerald-300 bg-emerald-950/40">
                    {countsProduits.tous} références
                  </Badge>
                </div>
              </div>
            </div>

            {/* 4 KPIs Spécifiques aux Produits */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-[#CFF1D2] bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Total Références</CardTitle>
                  <Package className="w-4 h-4 text-[#0F3B27]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black font-display text-[#0F3B27]">{countsProduits.tous}</div>
                  <p className="text-xs text-[#475C50]">Médicaments et dispositifs actifs au catalogue.</p>
                </CardContent>
              </Card>

              <Card className={`border-[#CFF1D2] ${countsProduits.rupture > 0 ? "border-amber-400 bg-amber-50/30" : "bg-white"}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Ruptures & Sous Seuil</CardTitle>
                  <AlertOctagon className="w-4 h-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-amber-700">{countsProduits.rupture}</div>
                  <p className="text-xs text-[#475C50]">Articles sous le seuil minimum de sécurité.</p>
                </CardContent>
              </Card>

              <Card className="border-[#CFF1D2] bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Thermolabiles 2–8 °C</CardTitle>
                  <Thermometer className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-blue-700">{countsProduits.thermolabile}</div>
                  <p className="text-xs text-[#475C50]">Conservés en réfrigérateur avec suivi sonde.</p>
                </CardContent>
              </Card>

              <Card className="border-[#CFF1D2] bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Stupéfiants & Tableaux</CardTitle>
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-purple-700">{countsProduits.stupefiant}</div>
                  <p className="text-xs text-[#475C50]">Réglementation stricte en armoire sous clé.</p>
                </CardContent>
              </Card>
            </div>

            {/* Barre de Recherche & Sous-sections de Produits */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#CFF1D2] bg-white p-3 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475C50]" />
                  <Input
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Rechercher par nom de spécialité, DCI, code CIP, laboratoire..."
                    className="pl-9 h-10 border-[#CFF1D2] rounded-xl text-xs bg-[#F7F9F7] focus:bg-white"
                  />
                  {recherche && (
                    <button
                      onClick={() => setRecherche("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#475C50] hover:text-[#0F3B27]"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                  <Button
                    variant={modeAffichageProduits === "cartes" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModeAffichageProduits("cartes")}
                    className={`h-8 text-xs font-bold gap-1 rounded-xl ${
                      modeAffichageProduits === "cartes" ? "bg-[#0F3B27] text-[#92FF5F]" : "border-[#CFF1D2] text-[#475C50]"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" /> Fiches
                  </Button>
                  <Button
                    variant={modeAffichageProduits === "tableau" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModeAffichageProduits("tableau")}
                    className={`h-8 text-xs font-bold gap-1 rounded-xl ${
                      modeAffichageProduits === "tableau" ? "bg-[#0F3B27] text-[#92FF5F]" : "border-[#CFF1D2] text-[#475C50]"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> Tableau
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#CFF1D2]/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0F3B27] whitespace-nowrap">Filtre des produits :</span>
                  <div className="w-full sm:w-80">
                    <SelecteurFiltrable
                      options={[
                        { valeur: "tous", label: "Tous les produits", badge: `${countsProduits.tous}`, description: "Catalogue complet de l'officine" },
                        { valeur: "rupture", label: "Ruptures & Sous seuil", badge: `${countsProduits.rupture}`, description: "Articles sous le seuil d'alerte de sécurité" },
                        { valeur: "thermolabile", label: "Thermolabiles 2–8 °C ❄️", badge: `${countsProduits.thermolabile}`, description: "Chaîne du froid continue en réfrigérateur" },
                        { valeur: "stupefiant", label: "Stupéfiants & Tableaux 🔒", badge: `${countsProduits.stupefiant}`, description: "Substances vénéneuses sous armoire sécurisée" },
                        { valeur: "taxable", label: "Groupe B Taxable (18%)", badge: `${countsProduits.taxable}`, description: "Produits de parapharmacie et cosmétiques taxables" },
                      ]}
                      valeur={sousSectionProduit}
                      onChangement={setSousSectionProduit}
                      placeholder="Filtrer les produits..."
                      recherchePlaceholder="Rechercher une catégorie..."
                      className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="text-xs text-[#475C50] flex items-center gap-2">
                  <span>Affichés : <strong className="text-[#0F3B27]">{produitsAffiches.length}</strong> produit{produitsAffiches.length > 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>

            {modeAffichageProduits === "cartes" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {produitsAffiches.map((p) => {
                  const sousSeuil = p.alerte_rupture || p.stock_total <= (p.stock_minimum || 0);
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border-2 p-4 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 ${
                        sousSeuil ? "border-amber-400 bg-amber-50/15" : "border-[#CFF1D2] hover:border-[#0F3B27]/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-display font-black text-base text-[#0F3B27] line-clamp-1">{p.nom_commercial}</h4>
                            <p className="text-xs text-[#475C50] line-clamp-1 mt-0.5">{p.dci || "—"} · {p.forme || ""} {p.dosage || ""}</p>
                          </div>
                          <Badge variant="outline" className="font-mono text-[11px] border-[#CFF1D2] shrink-0">
                            CIP {p.code_cip}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {p.est_thermolabile && <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">❄️ Thermolabile 2–8°C</Badge>}
                          {p.tableau_substance === "stupefiant" && <Badge className="bg-purple-50 text-purple-800 text-[10px]">🔒 Stupéfiant</Badge>}
                          {p.groupe_taxation === "B_TAXABLE" ? (
                            <Badge className="bg-amber-50 text-amber-800 text-[10px]">TVA 18% (Groupe B)</Badge>
                          ) : (
                            <Badge className="bg-[#CFF1D2] text-[#0F3B27] text-[10px]">Exonéré TVA (Groupe A)</Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[#CFF1D2]/60 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[#475C50]">Stock total en magasin</span>
                          <span className={`font-mono font-black text-sm ${sousSeuil ? "text-amber-700" : "text-[#0F3B27]"}`}>
                            {p.stock_total} boîtes
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#475C50]">Prix public TTC</span>
                          <span className="font-bold text-[#0F3B27]">{nombre(p.prix_public_ttc)} FCFA</span>
                        </div>
                        {sousSeuil && (
                          <div className="rounded-xl bg-amber-50 border border-amber-300 p-2 text-amber-900 font-bold text-[11px] flex items-center gap-1.5">
                            <AlertTriangle className="size-3.5 text-amber-700 shrink-0" />
                            <span>Stock sous le seuil d'alerte ({p.stock_minimum || 5} min)</span>
                          </div>
                        )}
                        {p.prochain_lot_fefo && (
                          <div className="rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] p-2 flex items-center justify-between text-[11px]">
                            <span className="text-[#475C50]">Prochain lot FEFO</span>
                            <span className="font-mono font-bold text-[#0F3B27]">Lot {p.prochain_lot_fefo.numero_lot} ({p.prochain_lot_fefo.jours_avant_peremption}j)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {produitsAffiches.length === 0 && (
                  <div className="col-span-full p-8 text-center text-sm text-[#475C50] rounded-2xl border border-dashed border-[#CFF1D2] bg-[#F7F9F7]">
                    Aucun produit ne correspond au filtre actif.
                  </div>
                )}
              </div>
            ) : (
              <Card className="border-[#CFF1D2]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F7F9F7] text-[#475C50] border-b border-[#CFF1D2] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Produit & DCI</th>
                          <th className="py-2.5 px-3">Code CIP</th>
                          <th className="py-2.5 px-3">Propriétés</th>
                          <th className="py-2.5 px-3">Stock Magasin</th>
                          <th className="py-2.5 px-3">Prix TTC</th>
                          <th className="py-2.5 px-3">Prochain Lot FEFO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#CFF1D2]/50">
                        {produitsAffiches.map((p) => (
                          <tr key={p.id} className="hover:bg-[#F7F9F7]">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-[#0F3B27]">{p.nom_commercial}</div>
                              <div className="text-[11px] text-[#475C50]">{p.dci || "—"} · {p.forme || ""}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono">{p.code_cip}</td>
                            <td className="py-2.5 px-3">
                              {p.est_thermolabile && <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 mr-1">❄️ 2–8°C</span>}
                              {p.tableau_substance === "stupefiant" && <span className="inline-block rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">🔒 Stupéfiant</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#0F3B27]">{p.stock_total} boîtes</td>
                            <td className="py-2.5 px-3 font-bold">{nombre(p.prix_public_ttc)} FCFA</td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {p.prochain_lot_fefo ? `Lot ${p.prochain_lot_fefo.numero_lot} (${p.prochain_lot_fefo.jours_avant_peremption}j)` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs font-bold text-[#0F3B27]">Import en masse du catalogue</p>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="text-xs text-[#0F3B27] h-8 gap-1.5"
                  onClick={() => {
                    telechargerCsv(
                      [
                        { code_cip: "340093000001", nom_commercial: "Paracétamol 500mg", dci: "Paracétamol", forme: "Comprimé", dosage: "500mg", prix_public_ttc: 1200, est_thermolabile: "NON", tableau_substance: "sans" },
                        { code_cip: "340093000002", nom_commercial: "Amoxicilline 500mg", dci: "Amoxicilline", forme: "Gélule", dosage: "500mg", prix_public_ttc: 2500, est_thermolabile: "NON", tableau_substance: "sans" },
                        { code_cip: "340093000003", nom_commercial: "Insuline NPH 100UI/ml", dci: "Insuline isophane", forme: "Injectable", dosage: "100UI/ml", prix_public_ttc: 4800, est_thermolabile: "OUI", tableau_substance: "sans" },
                      ],
                      "Trame_Modele_Import_Catalogue_BestPharma.csv",
                      [
                        { cle: "code_cip", entete: "code_cip" },
                        { cle: "nom_commercial", entete: "nom_commercial" },
                        { cle: "dci", entete: "dci" },
                        { cle: "forme", entete: "forme" },
                        { cle: "dosage", entete: "dosage" },
                        { cle: "prix_public_ttc", entete: "prix_public_ttc" },
                        { cle: "est_thermolabile", entete: "est_thermolabile" },
                        { cle: "tableau_substance", entete: "tableau_substance" },
                      ]
                    );
                    toast.success("Trame type CSV de catalogue téléchargée !");
                  }}
                >
                  <Download className="size-3.5" /> Télécharger la trame modèle CSV
                </Button>
              </div>
              <ZoneDepot
                label="Importer le catalogue produits (CSV ou Excel)"
                accept=".csv,.xlsx"
                dossier="catalogues"
                onUploadSuccess={(file) => {
                  toast.success(`Catalogue "${file.original_name}" téléversé avec succès. Les références sont enregistrées.`);
                  queryClient.invalidateQueries({ queryKey: ["produits"] });
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* LOTS FEFO STO-03 — SECTION PAR LOTS STRUCTURÉE AVEC SES SOUS-SECTIONS & FICHES BORDÉES */}
      {tab === "lots" && (() => {
        // Calcul des compteurs pour chaque sous-section de lots
        const countsLots = {
          tous: lots.length,
          fefo: lots.filter((l) => l.est_vendable && l.jours_avant_peremption >= 0).length,
          thermolabile: lots.filter((l) => !!l.produit?.est_thermolabile).length,
          critique_1m: lots.filter((l) => l.statut_peremption === "critique_1m" || (l.jours_avant_peremption >= 0 && l.jours_avant_peremption <= 30)).length,
          alerte_3m: lots.filter((l) => l.statut_peremption === "alerte_3m" || (l.jours_avant_peremption > 30 && l.jours_avant_peremption <= 90)).length,
          attention_6m: lots.filter((l) => l.statut_peremption === "attention_6m" || (l.jours_avant_peremption > 90 && l.jours_avant_peremption <= 180)).length,
          quarantaine: lots.filter((l) => l.statut_effectif === "quarantaine" || l.statut === "quarantaine").length,
          perime: lots.filter((l) => l.statut_peremption === "perime" || l.jours_avant_peremption < 0).length,
        };

        // Filtrage des lots affichés
        const lotsAffiches = lots.filter((lot) => {
          if (recherche.trim()) {
            const q = recherche.toLowerCase();
            const match =
              (lot.numero_lot || "").toLowerCase().includes(q) ||
              (lot.produit?.nom_commercial || "").toLowerCase().includes(q) ||
              (lot.produit?.dci || "").toLowerCase().includes(q) ||
              (lot.produit?.code_cip || "").toLowerCase().includes(q) ||
              (lot.bon_livraison_ref || "").toLowerCase().includes(q) ||
              (lot.fournisseur_nom || "").toLowerCase().includes(q);
            if (!match) return false;
          }
          if (sousSectionLot === "fefo") return lot.est_vendable && lot.jours_avant_peremption >= 0;
          if (sousSectionLot === "thermolabile") return !!lot.produit?.est_thermolabile;
          if (sousSectionLot === "critique_1m") return lot.statut_peremption === "critique_1m" || (lot.jours_avant_peremption >= 0 && lot.jours_avant_peremption <= 30);
          if (sousSectionLot === "alerte_3m") return lot.statut_peremption === "alerte_3m" || (lot.jours_avant_peremption > 30 && lot.jours_avant_peremption <= 90);
          if (sousSectionLot === "attention_6m") return lot.statut_peremption === "attention_6m" || (lot.jours_avant_peremption > 90 && lot.jours_avant_peremption <= 180);
          if (sousSectionLot === "quarantaine") return lot.statut_effectif === "quarantaine" || lot.statut === "quarantaine";
          if (sousSectionLot === "perime") return lot.statut_peremption === "perime" || lot.jours_avant_peremption < 0;
          return true;
        });

        return (
          <div className="space-y-6">
            {/* En-tête dédié Lots FEFO BPD-5 */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                    Traçabilité FEFO
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                    Priorité Péremption Première
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Lots & Traçabilité FEFO
                </h1>
                <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                  Suivi unitaire de chaque lot de médicament en stock : numéro de lot fabricant, date de péremption,
                  quantité physique, affectation d'emplacement et sortie prioritaire du lot le plus ancien (FEFO).
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] text-[#0F3B27] px-3 py-1">
                    <Verified className="w-3.5 h-3.5" /> Règle FEFO Appliquée
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                    <Clock className="w-3.5 h-3.5 text-[#92FF5F]" /> Péremptions Échelonnées
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  onClick={() => setDialogReceptionOuvert(true)}
                  className="gap-2 bg-[#92FF5F] hover:bg-[#82ea52] text-[#0F3B27] font-black text-xs h-10 px-4 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Réceptionner un lot
                </Button>
                <div className="flex items-center gap-2 text-xs">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!lots.length) {
                        toast.info("Aucun lot à exporter.");
                        return;
                      }
                      telechargerCsv(
                        lots.map((l: any) => ({
                          lot: l.numero_lot,
                          produit: l.produit?.nom_commercial || l.produit_nom || "",
                          date_peremption: l.date_peremption,
                          jours_avant_peremption: l.jours_avant_peremption,
                          quantite_restante: l.quantite_restante ?? l.quantite_disponible,
                          statut_fefo: l.est_vendable ? "Commercialisable (FEFO actif)" : "Bloqué / Non délivrable",
                          statut_effectif: l.statut_effectif || l.statut,
                          emplacement: l.emplacement?.nom || l.emplacement_nom || l.emplacement || "",
                          froid: l.produit?.est_thermolabile ? "2-8°C" : "Ambiant",
                        })),
                        `Registre_Lots_FEFO_BestPharma_${new Date().toISOString().split("T")[0]}.csv`,
                        [
                          { cle: "lot", entete: "Numéro de Lot" },
                          { cle: "produit", entete: "Médicament" },
                          { cle: "date_peremption", entete: "Date Péremption" },
                          { cle: "jours_avant_peremption", entete: "Jours restants" },
                          { cle: "quantite_restante", entete: "Quantité restante" },
                          { cle: "statut_fefo", entete: "Statut FEFO" },
                          { cle: "statut_effectif", entete: "Statut effectif" },
                          { cle: "emplacement", entete: "Emplacement" },
                          { cle: "froid", entete: "Chaîne du froid" },
                        ]
                      );
                      toast.success("Registre officiel des lots exporté en CSV");
                    }}
                    className="h-8 text-xs border-white/20 bg-white/10 text-white hover:bg-white/20"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export registre lots
                  </Button>
                  <Badge variant="outline" className="border-amber-400 text-amber-300 bg-amber-950/40">
                    {countsLots.quarantaine} isolés
                  </Badge>
                </div>
              </div>
            </div>

            {/* 4 KPIs Spécifiques aux Lots */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-[#CFF1D2] bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Lots Commercialisables</CardTitle>
                  <Boxes className="w-4 h-4 text-[#0F3B27]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black font-display text-[#0F3B27]">{countsLots.fefo}</div>
                  <p className="text-xs text-[#475C50]">Disponibles pour vente & délivrance comptoir.</p>
                </CardContent>
              </Card>

              <Card className={`border-[#CFF1D2] ${countsLots.critique_1m > 0 ? "border-red-400 bg-red-50/30" : "bg-white"}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Critique &lt; 30 jours</CardTitle>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-red-700">{countsLots.critique_1m}</div>
                  <p className="text-xs text-[#475C50]">À déstocker en urgence ou retourner grossiste.</p>
                </CardContent>
              </Card>

              <Card className={`border-[#CFF1D2] ${countsLots.alerte_3m > 0 ? "border-amber-400 bg-amber-50/30" : "bg-white"}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Alerte 3 Mois</CardTitle>
                  <Clock className="w-4 h-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-amber-700">{countsLots.alerte_3m}</div>
                  <p className="text-xs text-[#475C50]">Sous surveillance rapprochée du pharmacien.</p>
                </CardContent>
              </Card>

              <Card className={`border-[#CFF1D2] ${countsLots.quarantaine > 0 ? "border-purple-400 bg-purple-50/30" : "bg-white"}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Quarantaine & Bloqués</CardTitle>
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-purple-700">{countsLots.quarantaine}</div>
                  <p className="text-xs text-[#475C50]">Délivrance interdite, isolés physiquement.</p>
                </CardContent>
              </Card>
            </div>

            {/* Barre de Recherche & Sous-sections de filtrage des lots */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#CFF1D2] bg-white p-3 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475C50]" />
                  <Input
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Rechercher par numéro de lot, médicament, bon de livraison, fournisseur..."
                    className="pl-9 h-10 border-[#CFF1D2] rounded-xl text-xs bg-[#F7F9F7] focus:bg-white"
                  />
                  {recherche && (
                    <button
                      onClick={() => setRecherche("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#475C50] hover:text-[#0F3B27]"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                {/* Bascule d'affichage : Fiches avec bord vs Tableau */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                  <Button
                    variant={modeAffichageLots === "cartes" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModeAffichageLots("cartes")}
                    className={`h-8 text-xs font-bold gap-1 rounded-xl ${
                      modeAffichageLots === "cartes" ? "bg-[#0F3B27] text-[#92FF5F]" : "border-[#CFF1D2] text-[#475C50]"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" /> Fiches bordées
                  </Button>
                  <Button
                    variant={modeAffichageLots === "tableau" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModeAffichageLots("tableau")}
                    className={`h-8 text-xs font-bold gap-1 rounded-xl ${
                      modeAffichageLots === "tableau" ? "bg-[#0F3B27] text-[#92FF5F]" : "border-[#CFF1D2] text-[#475C50]"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> Tableau
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#CFF1D2]/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0F3B27] whitespace-nowrap">Filtre des lots :</span>
                  <div className="w-full sm:w-80">
                    <SelecteurFiltrable
                      options={[
                        { valeur: "tous", label: "Tous les lots", badge: `${countsLots.tous}`, description: "Ensemble des lots enregistrés en magasin" },
                        { valeur: "fefo", label: "Priorité FEFO (Sortie immédiate)", badge: `${countsLots.fefo}`, description: "Lots vendables ordonnés par date de péremption la plus proche" },
                        { valeur: "thermolabile", label: "Thermolabiles 2–8 °C (Chaîne du froid)", badge: `${countsLots.thermolabile}`, description: "Produits sous chaîne de froid continue" },
                        { valeur: "critique_1m", label: "Critique < 30 jours (Retrait imminent)", badge: `${countsLots.critique_1m}`, description: "Lots proches de la date limite d'utilisation" },
                        { valeur: "alerte_3m", label: "Alerte 3 mois (Surveillance renforcée)", badge: `${countsLots.alerte_3m}`, description: "Péremption comprise entre 30 et 90 jours" },
                        { valeur: "attention_6m", label: "Attention 6 mois", badge: `${countsLots.attention_6m}`, description: "Péremption comprise entre 90 et 180 jours" },
                        { valeur: "quarantaine", label: "Quarantaine & Bloqués", badge: `${countsLots.quarantaine}`, description: "Lots sous séquestre ou en attente de libération" },
                        { valeur: "perime", label: "Périmés interdits à la délivrance", badge: `${countsLots.perime}`, description: "Lots retirés du circuit de vente (DLUO échue)" },
                      ]}
                      valeur={sousSectionLot}
                      onChangement={setSousSectionLot}
                      placeholder="Filtrer les lots..."
                      recherchePlaceholder="Rechercher une catégorie de lot..."
                      className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="text-xs text-[#475C50] flex items-center gap-2">
                  <span>Affichés : <strong className="text-[#0F3B27]">{lotsAffiches.length}</strong> lot{lotsAffiches.length > 1 ? "s" : ""}</span>
                  {sousSectionLot !== "tous" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSousSectionLot("tous")}
                      className="h-6 text-[11px] text-[#0F3B27] hover:bg-[#CFF1D2]/30 px-2 rounded-[6px]"
                    >
                      Réinitialiser
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* VUE FICHES / CARTES DE LOTS AVEC ENCADREMENT ET STRUCTURE NETTE */}
            {modeAffichageLots === "cartes" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {isLoading ? (
                  <div className="col-span-full p-12 text-center text-[#475C50] font-bold">Chargement des lots du magasin...</div>
                ) : lotsAffiches.length === 0 ? (
                  <div className="col-span-full p-12 text-center text-sm text-[#475C50] rounded-[10px] border border-dashed border-[#CFF1D2] bg-[#F7F9F7]">
                    Aucun lot ne correspond aux filtres sélectionnés. Réceptionnez une livraison ou ajustez la sous-section.
                  </div>
                ) : (
                  lotsAffiches.map((lot, idx) => {
                    const estProchainFEFO = idx === 0 && lot.est_vendable && sousSectionLot === "tous";
                    const estQuarantaine = lot.statut_effectif === "quarantaine" || lot.statut === "quarantaine";
                    const estPerime = lot.statut_peremption === "perime" || lot.jours_avant_peremption < 0;
                    const pctDispo = Math.min(100, Math.max(0, Math.round((lot.quantite_disponible / (lot.quantite_initiale || 1)) * 100)));

                    return (
                      <div
                        key={lot.id}
                        className={`rounded-[10px] border-2 p-4 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 ${
                          estPerime
                            ? "border-red-400 bg-red-50/15"
                            : estQuarantaine
                            ? "border-amber-400 bg-amber-50/20"
                            : estProchainFEFO
                            ? "border-[#0F3B27] bg-[#CFF1D2]/15 ring-2 ring-[#92FF5F]/50"
                            : "border-[#CFF1D2] hover:border-[#0F3B27]/40"
                        }`}
                      >
                        {/* En-tête de la fiche de lot */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            {estProchainFEFO ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#0F3B27] px-2.5 py-1 text-xs font-black text-[#92FF5F] shadow-sm">
                                <ArrowRight className="w-3.5 h-3.5" /> #1 Prochain FEFO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F9F7] border border-[#CFF1D2] px-2 py-0.5 text-xs font-mono font-bold text-[#475C50]">
                                Priorité FEFO #{idx + 1}
                              </span>
                            )}
                            {badgeStatut(lot)}
                          </div>

                          <h4 className="font-display font-black text-base text-[#0F3B27] line-clamp-1">
                            {lot.produit?.nom_commercial}
                          </h4>
                          <p className="text-xs text-[#475C50] line-clamp-1 mt-0.5">
                            CIP {lot.produit?.code_cip} · DCI {lot.produit?.dci || "—"}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {lot.produit?.est_thermolabile && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                <Thermometer className="w-3 h-3" /> Frigo 2–8 °C
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F9F7] border border-[#CFF1D2] px-2 py-0.5 text-[10px] font-bold text-[#0F3B27]">
                              <MapPin className="w-3 h-3 text-[#0F3B27]" /> {lot.emplacement}
                            </span>
                          </div>
                        </div>

                        {/* Corps structuré de la fiche de lot */}
                        <div className="space-y-2.5 pt-2 border-t border-[#CFF1D2]/60 text-xs">
                          {/* Cartouche Numéro de lot & Fournisseur */}
                          <div className="rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] p-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-[#475C50] font-bold uppercase tracking-wider block">Numéro de Lot</span>
                              <span className="font-mono font-black text-sm text-[#0F3B27]">{lot.numero_lot}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-[#475C50] font-bold block">{lot.fournisseur_nom || "CAMEG BÉNIN"}</span>
                              <span className="text-[11px] font-mono text-[#475C50]">BL : {lot.bon_livraison_ref || "—"}</span>
                            </div>
                          </div>

                          {/* Jauge de stock avec barre de progression */}
                          <div>
                            <div className="flex justify-between items-center mb-1 text-[11px]">
                              <span className="text-[#475C50] font-medium">Stock disponible</span>
                              <span className="font-bold text-[#0F3B27]">
                                <strong className="text-sm font-black text-[#0F3B27]">{lot.quantite_disponible}</strong> / {lot.quantite_initiale} boîtes ({pctDispo}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[#E5ECE7] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pctDispo <= 15 ? "bg-red-500" : pctDispo <= 40 ? "bg-amber-500" : "bg-[#0F3B27]"
                                }`}
                                style={{ width: `${pctDispo}%` }}
                              />
                            </div>
                          </div>

                          {/* Péremption & Compte à rebours */}
                          <div className="flex items-center justify-between pt-1">
                            <div>
                              <span className="text-[10px] text-[#475C50] font-medium block">Péremption</span>
                              <span className="font-mono font-bold text-xs text-[#0F3B27]">{lot.date_peremption}</span>
                            </div>
                            <div>
                              {badgeAlerte(lot.statut_peremption, lot.jours_avant_peremption)}
                            </div>
                          </div>

                          {lot.motif_statut && (
                            <p className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] text-amber-900 line-clamp-2">
                              Motif : {lot.motif_statut}
                            </p>
                          )}
                        </div>

                        {/* Pied de carte avec boutons d'action rapide */}
                        <div className="pt-2 border-t border-[#CFF1D2]/60 flex items-center justify-between gap-1.5">
                          {lot.statut_effectif === "commercialisable" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLotPourAction(lot);
                                setStatutCible("quarantaine");
                                setDialogChangementStatutOuvert(true);
                              }}
                              className="text-xs h-8 border-amber-300 text-amber-800 hover:bg-amber-50 flex-1 rounded-xl"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-600" /> Bloquer
                            </Button>
                          ) : lot.statut_effectif === "quarantaine" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => mutationLever.mutate(lot.id)}
                              className="text-xs h-8 border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 flex-1 font-bold rounded-xl"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Lever
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLotPourAction(lot);
                              setDialogChangementStatutOuvert(true);
                            }}
                            className="text-xs h-8 text-[#0F3B27] hover:bg-[#CFF1D2]/30 rounded-xl"
                          >
                            Changer statut
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* VUE TABLEAU CLASSIQUE AVEC BORDURES AMÉLIORÉES */
              <Card className="border-[#CFF1D2]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-black text-[#0F3B27]">Tableau des Lots — Ordre FEFO strict (STO-08)</CardTitle>
                  <CardDescription className="text-xs">
                    Le premier lot de la liste est celui à sortir. Seul un lot « Commercialisable » peut être vendu ou délivré.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F7F9F7] text-[#475C50] border-b border-[#CFF1D2] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Priorité</th>
                          <th className="py-2.5 px-3">Médicament</th>
                          <th className="py-2.5 px-3">Lot & BL</th>
                          <th className="py-2.5 px-3">Péremption</th>
                          <th className="py-2.5 px-3">Quantité</th>
                          <th className="py-2.5 px-3">Emplacement</th>
                          <th className="py-2.5 px-3">Statut</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#CFF1D2]/50">
                        {lotsAffiches.map((lot, idx) => (
                          <tr
                            key={lot.id}
                            className={`hover:bg-[#F7F9F7] ${lot.statut_effectif === "quarantaine" ? "bg-amber-50/50" : ""} ${
                              idx === 0 && lot.est_vendable ? "bg-[#CFF1D2]/20" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              {idx === 0 && lot.est_vendable ? (
                                <span className="inline-flex items-center gap-1 text-xs font-black text-[#0F3B27] bg-[#92FF5F] px-2 py-0.5 rounded-full">
                                  <ArrowRight className="w-3 h-3" /> Prochain
                                </span>
                              ) : (
                                <span className="text-xs font-mono text-[#475C50]">#{idx + 1}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-[#0F3B27]">{lot.produit?.nom_commercial}</div>
                              <div className="text-[11px] text-[#475C50]">CIP {lot.produit?.code_cip} · DCI {lot.produit?.dci || "—"}</div>
                              {lot.produit?.est_thermolabile && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 rounded">❄️ 2–8 °C</span>}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold">{lot.numero_lot}</div>
                              <div className="text-[11px] text-[#475C50]">{lot.fournisseur_nom} · BL {lot.bon_livraison_ref}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold">{lot.date_peremption}</div>
                              <div className="mt-1">{badgeAlerte(lot.statut_peremption, lot.jours_avant_peremption)}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#0F3B27]">
                              {lot.quantite_disponible} <span className="font-normal text-[#475C50] text-xs">/ {lot.quantite_initiale}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-xs font-bold bg-[#F7F9F7] border border-[#CFF1D2] px-2 py-1 rounded-xl">{lot.emplacement}</span>
                            </td>
                            <td className="py-2.5 px-3">{badgeStatut(lot)}</td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex justify-end gap-1">
                                {lot.statut_effectif === "commercialisable" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setLotPourAction(lot);
                                      setStatutCible("quarantaine");
                                      setDialogChangementStatutOuvert(true);
                                    }}
                                    className="text-xs h-7 border-amber-300 text-amber-800"
                                  >
                                    <ShieldAlert className="w-3 h-3 mr-1" /> Bloquer
                                  </Button>
                                ) : lot.statut_effectif === "quarantaine" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => mutationLever.mutate(lot.id)}
                                    className="text-xs h-7 border-[#CFF1D2] text-[#0F3B27]"
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Lever
                                  </Button>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setLotPourAction(lot);
                                    setDialogChangementStatutOuvert(true);
                                  }}
                                  className="text-xs h-7"
                                >
                                  Changer
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* EMPLACEMENTS STO-04 */}
      {tab === "emplacements" && (() => {
        const tousEmplacements = emplacements.length
          ? emplacements
          : [
              { code: "COMPTOIR", libelle: "Comptoir — Délivrance", type_zone: "comptoir", lots_count: 0 },
              { code: "RESERVE", libelle: "Réserve — Stock principal", type_zone: "reserve", lots_count: 0 },
              { code: "FRIGO", libelle: "Réfrigérateur 2 °C – 8 °C", type_zone: "frigo", lots_count: 0 },
              { code: "ARMOIRE", libelle: "Armoire sécurisée — Stupéfiants", type_zone: "armoire_securisee", lots_count: 0 },
              { code: "ATTENTE", libelle: "Zone d’attente de contrôle", type_zone: "attente_controle", lots_count: 0 },
              { code: "RETOURS", libelle: "Zone des retours fournisseur", type_zone: "retours", lots_count: 0 },
              { code: "DECHETS", libelle: "Aire des déchets sécurisée", type_zone: "dechets", lots_count: 0 },
            ];

        const emplacementsAffiches = tousEmplacements.filter((e: any) => {
          if (sousSectionEmplacement === "frigo") return e.type_zone === "frigo";
          if (sousSectionEmplacement === "reserve") return e.type_zone === "reserve";
          if (sousSectionEmplacement === "comptoir") return e.type_zone === "comptoir";
          if (sousSectionEmplacement === "armoire") return e.type_zone === "armoire_securisee";
          if (sousSectionEmplacement === "isolement") return ["attente_controle", "retours", "dechets"].includes(e.type_zone);
          return true;
        });

        return (
          <div className="space-y-6">
            {/* En-tête dédié Emplacements BPD-4/BPD-5 */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                    BPD-4 / BPD-5 · ZONAGE 5M · STO-04
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                    Organisation Spatiale & Stockage
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Emplacements & Rangement Magasin
                </h1>
                <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                  Cartographie et zonage réglementaire des locaux de l'officine : comptoir de délivrance, réserve principale,
                  armoire sécurisée sous clé pour stupéfiants, réfrigérateur 2–8 °C et zones d'isolement sanitaire.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] text-[#0F3B27] px-3 py-1">
                    <MapPin className="w-3.5 h-3.5" /> 7 Zones BPD Homologuées
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                    <Thermometer className="w-3.5 h-3.5 text-[#92FF5F]" /> Sonde Frigo 24h/24
                  </span>
                </div>
              </div>
            </div>

            {/* 4 KPIs Emplacements */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-[#CFF1D2] bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Zones Référencées</CardTitle>
                  <MapPin className="w-4 h-4 text-[#0F3B27]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black font-display text-[#0F3B27]">{tousEmplacements.length}</div>
                  <p className="text-xs text-[#475C50]">Zones physiques homologuées BPD.</p>
                </CardContent>
              </Card>

              <Card className="border-[#CFF1D2] bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Réserve Principale</CardTitle>
                  <Layers className="w-4 h-4 text-[#0F3B27]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-[#0F3B27]">
                    {tousEmplacements.find((e: any) => e.type_zone === "reserve")?.lots_count ?? 0}
                  </div>
                  <p className="text-xs text-[#475C50]">Lots stockés en rayonnage standard.</p>
                </CardContent>
              </Card>

              <Card className="border-[#CFF1D2] bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Chaîne du Froid 2–8°C</CardTitle>
                  <Thermometer className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-blue-700">
                    {tousEmplacements.find((e: any) => e.type_zone === "frigo")?.lots_count ?? 0}
                  </div>
                  <p className="text-xs text-[#475C50]">Thermolabiles sous température surveillée.</p>
                </CardContent>
              </Card>

              <Card className="border-[#CFF1D2] bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Armoire Stupéfiants</CardTitle>
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-purple-700">
                    {tousEmplacements.find((e: any) => e.type_zone === "armoire_securisee")?.lots_count ?? 0}
                  </div>
                  <p className="text-xs text-[#475C50]">Sous clé du pharmacien titulaire.</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#CFF1D2] bg-white p-3 shadow-sm">
              {[
                { id: "toutes", label: "Toutes les zones" },
                { id: "reserve", label: "Réserve principale" },
                { id: "frigo", label: "Chaîne du froid 2–8°C ❄️" },
                { id: "comptoir", label: "Comptoir délivrance" },
                { id: "armoire", label: "Armoire stupéfiants 🔒" },
                { id: "isolement", label: "Isolement & Déchets" },
              ].map((ss) => (
                <button
                  key={ss.id}
                  onClick={() => setSousSectionEmplacement(ss.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    sousSectionEmplacement === ss.id
                      ? "bg-[#0F3B27] text-[#92FF5F] shadow-sm"
                      : "bg-[#F7F9F7] text-[#475C50] hover:bg-[#CFF1D2]/30 border border-[#CFF1D2]/60"
                  }`}
                >
                  {ss.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {emplacementsAffiches.map((e: any) => (
                <div
                  key={e.code}
                  className={`rounded-2xl border-2 p-4 bg-white shadow-sm hover:shadow-md transition-all ${
                    e.type_zone === "frigo"
                      ? "border-blue-300 bg-blue-50/20"
                      : e.type_zone === "armoire_securisee"
                      ? "border-purple-300 bg-purple-50/20"
                      : e.type_zone === "dechets"
                      ? "border-red-300 bg-red-50/20"
                      : "border-[#CFF1D2]"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2">
                    <h4 className="font-display font-black text-sm text-[#0F3B27] flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#0F3B27]" /> {e.libelle}
                    </h4>
                    <Badge variant="outline" className="font-mono text-[10px]">{e.code}</Badge>
                  </div>
                  <div className="space-y-2 text-xs pt-2 border-t border-[#CFF1D2]/60">
                    <div className="flex justify-between">
                      <span className="text-[#475C50]">Lots hébergés</span>
                      <strong className="font-mono font-black text-[#0F3B27]">{e.lots_count ?? 0} lots</strong>
                    </div>
                    <div className="text-[11px] text-[#475C50]">
                      {e.type_zone === "frigo"
                        ? "❄️ Réservé aux produits thermolabiles (contrôle sonde 24h)"
                        : e.type_zone === "armoire_securisee"
                        ? "🔒 Clé sous la responsabilité du pharmacien titulaire"
                        : e.type_zone === "dechets"
                        ? "🗑️ Déchets pharmaceutiques en attente de destruction sécurisée"
                        : "Rayonnages étiquetés avec code-barres"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Contraintes d’affectation (STO-04)</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Le frigo n’accepte que les produits thermolabiles, l’armoire que les stupéfiants et les listes. Déplacer un lot d’une zone à l’autre crée un transfert tracé, avec scan et confirmation.</CardContent></Card>
          </div>
        );
      })()}

      {/* MOUVEMENTS STO-09 */}
      {tab === "mouvements" && (() => {
        const mouvementsAffiches = mouvements.filter((m: any) => {
          if (sousSectionMouvement === "entree") return m.type_mouvement === "entree" || m.quantite > 0;
          if (sousSectionMouvement === "sortie") return m.type_mouvement === "sortie" || m.quantite < 0;
          if (sousSectionMouvement === "transfert") return m.type_mouvement === "transfert";
          if (sousSectionMouvement === "quarantaine") return m.type_mouvement === "quarantaine" || m.type_mouvement === "blocage";
          return true;
        });

        return (
          <div className="space-y-6">
            {/* En-tête dédié Mouvements BPD-8 */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                    BPD-8 · PISTE D'AUDIT · STO-09
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                    Inaltérabilité & Traçabilité Complète
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Journal des Mouvements & Audit Trail
                </h1>
                <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                  Registre chronologique inaltérable de tous les flux physiques : entrées réceptions, sorties caisse,
                  ajustements d'inventaire, transferts de zones et blocages sanitaires. Aucune suppression autorisée, contre-passation obligatoire.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] text-[#0F3B27] px-3 py-1">
                    <History className="w-3.5 h-3.5" /> Piste d’Audit Inaltérable
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                    Signature & Pièce Justificative Requise
                  </span>
                </div>
              </div>
            </div>

            {/* 4 KPIs Mouvements */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-[#CFF1D2] bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Total Opérations</CardTitle>
                  <History className="w-4 h-4 text-[#0F3B27]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black font-display text-[#0F3B27]">{mouvements.length}</div>
                  <p className="text-xs text-[#475C50]">Écritures de stock journalisées.</p>
                </CardContent>
              </Card>

              <Card className="border-[#CFF1D2] bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Entrées / Réceptions</CardTitle>
                  <ArrowRight className="w-4 h-4 text-emerald-600 rotate-45" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-emerald-700">
                    {mouvements.filter((m: any) => m.type_mouvement === "entree" || m.quantite > 0).length}
                  </div>
                  <p className="text-xs text-[#475C50]">Arrivages grossistes et réintégrations.</p>
                </CardContent>
              </Card>

              <Card className="border-[#CFF1D2] bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Sorties / Ventes</CardTitle>
                  <ArrowRight className="w-4 h-4 text-blue-600 -rotate-45" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-blue-700">
                    {mouvements.filter((m: any) => m.type_mouvement === "sortie" || m.quantite < 0).length}
                  </div>
                  <p className="text-xs text-[#475C50]">Délivrances ordonnances et ventes directes.</p>
                </CardContent>
              </Card>

              <Card className="border-[#CFF1D2] bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-[#475C50]">Ajustements & Quarantaine</CardTitle>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-amber-700">
                    {mouvements.filter((m: any) => ["ajustement", "quarantaine", "blocage", "transfert"].includes(m.type_mouvement)).length}
                  </div>
                  <p className="text-xs text-[#475C50]">Écarts inventaire et isolements qualité.</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#CFF1D2] bg-white p-3 shadow-sm">
              {[
                { id: "tous", label: "Tous les mouvements" },
                { id: "entree", label: "Entrées / Réceptions" },
                { id: "sortie", label: "Sorties / Ventes" },
                { id: "transfert", label: "Transferts de zone" },
                { id: "quarantaine", label: "Blocages & Quarantaine" },
              ].map((ss) => (
                <button
                  key={ss.id}
                  onClick={() => setSousSectionMouvement(ss.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    sousSectionMouvement === ss.id
                      ? "bg-[#0F3B27] text-[#92FF5F] shadow-sm"
                      : "bg-[#F7F9F7] text-[#475C50] hover:bg-[#CFF1D2]/30 border border-[#CFF1D2]/60"
                  }`}
                >
                  {ss.label}
                </button>
              ))}
            </div>

            <Card className="border-[#CFF1D2]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black text-[#0F3B27]">Journal des mouvements (STO-09) — rien ne s’efface, tout se contre-passe</CardTitle>
                <CardDescription className="text-xs">Entrée, vente, transfert, casse ou destruction : chaque ligne porte sa pièce justificative et son auteur.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {mouvementsAffiches.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#475C50]">Aucun mouvement dans cette sous-section.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F7F9F7] text-[#475C50] border-b border-[#CFF1D2] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Produit / Lot</th>
                          <th className="py-2.5 px-3">Quantité</th>
                          <th className="py-2.5 px-3">Stock av/ap</th>
                          <th className="py-2.5 px-3">Pièce</th>
                          <th className="py-2.5 px-3">Auteur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#CFF1D2]/50">
                        {mouvementsAffiches.slice(0, 30).map((m: any) => (
                          <tr key={m.id} className="hover:bg-[#F7F9F7]">
                            <td className="py-2.5 px-3 font-mono text-[11px]">{formatDate(m.created_at)}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="text-[11px] border-[#CFF1D2]">{m.type_mouvement}</Badge>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#0F3B27]">
                              {m.produit?.nom_commercial || ""} <span className="font-normal text-[#475C50]">· {m.lot?.numero_lot || ""}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-[#0F3B27]">
                              {m.quantite > 0 ? `+${m.quantite}` : m.quantite}
                            </td>
                            <td className="py-2.5 px-3 font-mono">{m.stock_avant} → {m.stock_apres}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">{m.reference_piece || "—"}</td>
                            <td className="py-2.5 px-3">{m.auteur?.name || "Système"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* RÉCEPTION STO-05/06/07 */}
      {tab === "reception" && (
        <div className="space-y-6">
          {/* En-tête dédié Réception BPD-5 */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                  BPD-5 · CONTRÔLE RÉCEPTION · STO-05/06/07
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                  Arrivages & Contrôles Obligatoires
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                Réception des Livraisons & Contrôle BPD-5
              </h1>
              <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                Point de contrôle obligatoire des arrivages grossistes-répartiteurs (CAMEG, UBIPHARM, LABOREX).
                Rapprochement bon de livraison / commande, inspection visuelle des conditionnements et vérification stricte de la chaîne du froid 2–8 °C.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] text-[#0F3B27] px-3 py-1">
                  <ScanLine className="w-3.5 h-3.5" /> Contrôle Rapprochement BL
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                  <Thermometer className="w-3.5 h-3.5 text-[#92FF5F]" /> Chaîne du Froid 2–8 °C
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                onClick={() => setDialogReceptionOuvert(true)}
                className="gap-2 bg-[#92FF5F] hover:bg-[#82ea52] text-[#0F3B27] font-black text-xs h-10 px-4 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Enregistrer une réception
              </Button>
            </div>
          </div>

          {/* 4 KPIs Réception */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-[#CFF1D2] bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-[#475C50]">Protocole BPD-5</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-display text-emerald-700">5 Points</div>
                <p className="text-xs text-[#475C50]">Contrôles obligatoires avant mise en stock.</p>
              </CardContent>
            </Card>

            <Card className="border-[#CFF1D2] bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-[#475C50]">Grossistes Agréés</CardTitle>
                <Package className="w-4 h-4 text-[#0F3B27]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-[#0F3B27]">3 Partenaires</div>
                <p className="text-xs text-[#475C50]">CAMEG · UBIPHARM · LABOREX BÉNIN.</p>
              </CardContent>
            </Card>

            <Card className="border-[#CFF1D2] bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-[#475C50]">Chaîne du Froid</CardTitle>
                <Thermometer className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-blue-700">2–8 °C</div>
                <p className="text-xs text-[#475C50]">Mise au frigo immédiate à réception.</p>
              </CardContent>
            </Card>

            <Card className="border-[#CFF1D2] bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-[#475C50]">En Attente Contrôle</CardTitle>
                <Clock className="w-4 h-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-700">
                  {lots.filter((l: any) => l.statut_effectif === "en_attente_controle" || l.statut === "en_attente_controle").length}
                </div>
                <p className="text-xs text-[#475C50]">Isolement provisoire zone réception.</p>
              </CardContent>
            </Card>
          </div>

          <ZoneDepot
            label="Déposer le bon de livraison et la facture du fournisseur (photo ou PDF)"
            dossier="bons_livraison"
            valeurUrl={bonLivraisonUrl}
            onUploadSuccess={(file) => {
              setBonLivraisonUrl(file.url);
              if (!bonLivraisonRef) {
                setBonLivraisonRef(file.original_name.replace(/\.[^/.]+$/, ""));
              }
            }}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="border-[#CFF1D2]">
              <CardHeader>
                <CardTitle className="text-xs font-black text-[#0F3B27]">Contrôles obligatoires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {[
                  ["alerte_sanitaire_verifiee", "Alerte sanitaire sur le lot (recherche automatique)", "BPD5-F05"],
                  ["emballage_intact", "État des emballages conforme", "APP-03"],
                  ["conformite_livraison", "Conformité livraison / commande", "STO-05"],
                  ["dates_conformes", "Dates et péremptions conformes", "—"],
                  ["chaine_froid_respectee", "Chaîne du froid respectée", "BPD5-F11"],
                ].map(([k, l, ref]) => (
                  <label key={k} className="flex items-center gap-2 rounded-xl border border-[#CFF1D2] px-3 py-2">
                    <input
                      type="checkbox"
                      checked={(controles as any)[k]}
                      onChange={(e) => setControles({ ...controles, [k]: e.target.checked })}
                      className="accent-[#0F3B27] size-4"
                    />
                    <span className="font-bold text-[#0F3B27]">{l}</span>
                    <span className="ml-auto text-[10px] text-[#475C50]">{ref}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
            <Card className="border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-xs font-black text-amber-900 flex items-center gap-2">
                  <FileWarning className="w-4 h-4" /> Anomalies de réception (STO-07)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-amber-900">
                Casse, manquant, excédent ou produit non commandé : on ouvre une fiche, on joint des photos annotées, on isole le lot et on suit le litige fournisseur jusqu’à l’avoir.
              </CardContent>
            </Card>
          </div>
          <Button onClick={() => setDialogReceptionOuvert(true)} className="w-full bg-[#0F3B27] text-white font-bold h-12 rounded-xl">
            Ouvrir la réception — scan et contrôles
          </Button>
        </div>
      )}

      {/* INVENTAIRES STO-12 */}
      {tab === "inventaires" && (
        <div className="space-y-6">
          {/* En-tête dédié Inventaires BPD-5 */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                  Contrôle Physique des Stocks
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                  Campagnes de Comptage & Rapprochement
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                Inventaires & Campagnes de Comptage
              </h1>
              <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                Comptage physique périodique et tournant des stocks, confrontation avec les écritures théoriques,
                justification contradictoire de chaque écart constaté et double validation obligatoire du titulaire.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] text-[#0F3B27] px-3 py-1">
                  <ClipboardList className="w-3.5 h-3.5" /> Inventaire Conforme
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                  Justification Obligatoire des Écarts
                </span>
              </div>
            </div>
          </div>
          <InventairesStock />
        </div>
      )}

      {/* PÉREMPTIONS STO-11 */}
      {tab === "peremptions" && (
        <div className="space-y-6">
          {/* En-tête dédié Péremptions */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                  Veille Sanitaire & Expirations
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                  Retrait Systématique avant Expiration
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                Surveillance & Retrait des Péremptions
              </h1>
              <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                Tableau de bord de prévention du risque de délivrance de produits périmés. Tout lot atteignant le seuil
                critique (&lt; 30 jours) est immédiatement consigné pour retour fournisseur ou destruction réglementaire.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] text-[#0F3B27] px-3 py-1">
                  <Calendar className="w-3.5 h-3.5" /> Surveillance Échelonnée
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-400/40 text-red-200 px-3 py-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Vente Interdite après Expiration
                </span>
              </div>
            </div>
          </div>

          {/* 4 KPIs Péremptions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-[#CFF1D2] bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-blue-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> À 6 Mois
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-blue-700">{peremptions.a_6_mois?.length ?? 0}</div>
                <p className="text-xs text-[#475C50]">À surveiller tranquillement.</p>
              </CardContent>
            </Card>

            <Card className="border-amber-300 bg-amber-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-amber-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> À 3 Mois
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-700">{peremptions.a_3_mois?.length ?? 0}</div>
                <p className="text-xs text-[#475C50]">À écouler en priorité au comptoir (FEFO).</p>
              </CardContent>
            </Card>

            <Card className="border-red-300 bg-red-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> À 1 Mois · Critique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-red-700">{peremptions.a_1_mois?.length ?? 0}</div>
                <p className="text-xs text-red-700">Retrait par scan — vente bloquée (STO-11).</p>
              </CardContent>
            </Card>

            <Card className="border-red-500 bg-red-100/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Périmés Stricts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-red-800">{stats.perimes}</div>
                <p className="text-xs text-red-800">Isolement obligatoire vers rebuts.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#CFF1D2]">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-[#0F3B27]">Aucun lot périmé en stock ? C’est bon signe.</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-[#475C50]">
              Deux issues possibles : retour au fournisseur ou rebut vers la filière déchet pharmaceutique (BPD5-F14, STK-06). Le bordereau de retrait s’exporte en PDF ou en Excel et se conserve cinq ans.
            </CardContent>
          </Card>
        </div>
      )}

      {/* QUARANTAINE & RAPPELS STO-14 */}
      {tab === "quarantaine" && (
        <div className="space-y-6">
          {/* En-tête dédié Quarantaine */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                  Sécurité Sanitaire
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                  Rappels Sanitaires & Isolement
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                Quarantaine & Rappels Sanitaires des Lots
              </h1>
              <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                Dispositif d'isolement numérique et physique pour les lots frappés d'un avis d'alerte ou rappel sanitaire
                (ABMed, fabricant, OMS), d'une suspicion de contrefaçon ou d'une avarie majeure constatée en officine.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-400/40 text-red-200 px-3 py-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Blocage Immédiat en Caisse
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                  Rapprochement des Délivrances Patients
                </span>
              </div>
            </div>
          </div>
          <RappelsStock />
        </div>
      )}

      {/* DÉCHETS STO-17 */}
      {tab === "dechets" && (
        <div className="space-y-6">
          {/* En-tête dédié Déchets */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                  Filière Écologique & Rebuts
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                  Destruction Sécurisée & Rebuts
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                Déchets Pharmaceutiques & Rebuts
              </h1>
              <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                Filière d'élimination et destruction des médicaments périmés, altérés ou cassés. Établissement du
                bordereau officiel contradictoire signé pour transmission à l'inspection pharmaceutique et filière agréée.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] text-[#0F3B27] px-3 py-1">
                  <Trash2 className="w-3.5 h-3.5" /> Bordereau Contradictoire
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                  Conservation Sécurisée 5 Ans
                </span>
              </div>
            </div>
          </div>
          <DechetsStock />
        </div>
      )}

      {/* VALORISATION STO-18/19 */}
      {tab === "valorisation" && (
        <div className="space-y-6">
          {/* En-tête dédié Valorisation */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 text-white shadow-lg">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider">
                  SYSCOHADA · COMPTABILITÉ MATIÈRE · STO-18/19
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                  Coût Moyen Pondéré & Analyse Pareto ABC
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                Valorisation Financière du Stock & Analyse ABC
              </h1>
              <p className="text-sm text-[#CFF1D2]/90 max-w-2xl font-sans">
                Valorisation comptable au Coût Moyen Pondéré (CMP), suivi de la rotation des stocks, classement ABC des
                familles de médicaments et calcul du taux de couverture en jours pour éviter tout surstock dormant.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] text-[#0F3B27] px-3 py-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Valorisation CMP Temps Réel
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white">
                  Rapprochement Compte de Stock SYSCOHADA
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-[#0F3B27] bg-[#0F3B27] text-white">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#92FF5F]" /> Valorisation au coût moyen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-display">{nombre(valorisation.total)} FCFA</div>
                <p className="text-xs text-[#CFF1D2]">Coût moyen pondéré à la date du jour, rapproché du compte de stock (STO-18).</p>
              </CardContent>
            </Card>
            <Card className="border-[#CFF1D2]">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#0F3B27]">ABC et rotation</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#475C50]">
                Classement ABC, couverture en jours et marge par famille, avec le cahier des ruptures et des demandes non satisfaites (STO-19, STK-08, BPD5-F15).
              </CardContent>
            </Card>
            <Card className="border-[#CFF1D2]">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#0F3B27]">Étiquettes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#475C50]">
                Impression des étiquettes d’emplacement, de quarantaine et de rebut (STO-20) sur l’imprimante d’étiquettes.
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#CFF1D2]">
            <CardHeader>
              <CardTitle className="text-xs font-bold text-[#0F3B27]">Détail par produit (coût moyen pondéré)</CardTitle>
            </CardHeader>
            <CardContent>
              {valorisation.par_produit?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F7F9F7] text-[#475C50] font-bold border-b border-[#CFF1D2]">
                      <tr>
                        <th className="py-2 px-3">Produit</th>
                        <th className="py-2 px-3">Qté</th>
                        <th className="py-2 px-3">Coût moyen</th>
                        <th className="py-2 px-3">Valeur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CFF1D2]/50">
                      {valorisation.par_produit.slice(0, 20).map((v: any) => (
                        <tr key={v.produit.id}>
                          <td className="py-2 px-3 font-bold text-[#0F3B27]">{v.produit.nom_commercial}</td>
                          <td className="py-2 px-3 font-mono">{v.quantite}</td>
                          <td className="py-2 px-3 font-mono">{nombre(v.cmp || 0)} FCFA</td>
                          <td className="py-2 px-3 font-mono font-bold">{nombre(v.valeur)} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-[#475C50]">La valorisation se calcule dès qu’un lot est réceptionné.</div>
              )}
            </CardContent>
          </Card>
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

              <ZoneDepot
                label="Joindre le bon de livraison ou la facture (photo ou PDF)"
                dossier="bons_livraison"
                valeurUrl={bonLivraisonUrl}
                onUploadSuccess={(file) => {
                  setBonLivraisonUrl(file.url);
                  if (!bonLivraisonRef) {
                    setBonLivraisonRef(file.original_name.replace(/\.[^/.]+$/, ""));
                  }
                }}
              />
            </ColonneFiche>
          </form>
        </ModaleFiche>
      </Dialog>

      {/* Dialog Nouveau Produit — STO-02 */}
      <Dialog open={dialogAjoutProduitOuvert} onOpenChange={setDialogAjoutProduitOuvert}>
        <ModaleFiche
          titre="Nouveau Médicament au Catalogue"
          sousTitre="Enregistrement d'une référence officinale : code CIP, DCI, forme galénique, dosage, statut réglementaire et seuil d'alerte."
          badge={<Badge className="bg-[#0F3B27] text-[#92FF5F]">STO-02</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogAjoutProduitOuvert(false)} className="h-12 rounded-xl sm:h-11">
                Annuler
              </Button>
              <Button type="submit" form="form-ajout-produit" disabled={mutationAjoutProduit.isPending} className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11">
                {mutationAjoutProduit.isPending ? "Enregistrement…" : "Ajouter le médicament au catalogue"}
              </Button>
            </div>
          }
        >
          <form id="form-ajout-produit" onSubmit={handleAjoutProduitSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="Identification du Médicament" aide="Les informations réglementaires imprimées sur le conditionnement.">
              <Champ label="Code CIP / Code-barres" obligatoire aide="Numéro CIP à 7 ou 13 chiffres, unique pour chaque référence.">
                <Input
                  value={nouveauProduit.code_cip}
                  onChange={(e) => setNouveauProduit({ ...nouveauProduit, code_cip: e.target.value })}
                  placeholder="Ex. 3400936000123"
                  className="h-12 rounded-xl font-mono"
                  required
                />
              </Champ>

              <Champ label="Nom commercial / Spécialité" obligatoire aide="Nom de marque tel qu'il figure sur la boîte.">
                <Input
                  value={nouveauProduit.nom_commercial}
                  onChange={(e) => setNouveauProduit({ ...nouveauProduit, nom_commercial: e.target.value })}
                  placeholder="Ex. PARACÉTAMOL BIOGARAN"
                  className="h-12 rounded-xl"
                  required
                />
              </Champ>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="DCI (Principe actif)" aide="Dénomination Commune Internationale">
                  <Input
                    value={nouveauProduit.dci}
                    onChange={(e) => setNouveauProduit({ ...nouveauProduit, dci: e.target.value })}
                    placeholder="Ex. Paracétamol"
                    className="h-12 rounded-xl"
                  />
                </Champ>
                <Champ label="Forme galénique">
                  <Input
                    value={nouveauProduit.forme}
                    onChange={(e) => setNouveauProduit({ ...nouveauProduit, forme: e.target.value })}
                    placeholder="Ex. Comprimé, Sirop, Gélule"
                    className="h-12 rounded-xl"
                  />
                </Champ>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Dosage">
                  <Input
                    value={nouveauProduit.dosage}
                    onChange={(e) => setNouveauProduit({ ...nouveauProduit, dosage: e.target.value })}
                    placeholder="Ex. 500 mg, 1 g"
                    className="h-12 rounded-xl"
                  />
                </Champ>
                <Champ label="Classe thérapeutique">
                  <Input
                    value={nouveauProduit.classe_therapeutique}
                    onChange={(e) => setNouveauProduit({ ...nouveauProduit, classe_therapeutique: e.target.value })}
                    placeholder="Ex. Antalgique antipyrétique"
                    className="h-12 rounded-xl"
                  />
                </Champ>
              </div>
            </ColonneFiche>

            <ColonneFiche titre="Tarification & Cadre Réglementaire" aide="Prix, seuil de stock et contraintes de conservation.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Champ label="Prix public TTC (FCFA)" obligatoire aide="Prix de vente officiel au comptoir.">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={nouveauProduit.prix_public_ttc}
                    onChange={(e) => setNouveauProduit({ ...nouveauProduit, prix_public_ttc: e.target.value })}
                    placeholder="Ex. 1500"
                    className="h-12 rounded-xl font-bold font-mono"
                    required
                  />
                </Champ>
                <Champ label="Seuil d'alerte stock (min)" aide="Nombre de boîtes déclenchant l'alerte réassort.">
                  <Input
                    type="number"
                    min="0"
                    value={nouveauProduit.seuil_stock_min}
                    onChange={(e) => setNouveauProduit({ ...nouveauProduit, seuil_stock_min: e.target.value })}
                    placeholder="5"
                    className="h-12 rounded-xl font-mono"
                  />
                </Champ>
              </div>

              <Champ label="Tableau de substance vénéneuse">
                <select
                  value={nouveauProduit.tableau_substance}
                  onChange={(e) => setNouveauProduit({ ...nouveauProduit, tableau_substance: e.target.value })}
                  className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]"
                >
                  <option value="sans">Sans liste / Médicament libre</option>
                  <option value="liste_1">Liste I (Cadre rouge)</option>
                  <option value="liste_2">Liste II (Cadre vert)</option>
                  <option value="stupefiant">Stupéfiant (Armoire sous clé)</option>
                </select>
              </Champ>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nouveauProduit.est_thermolabile}
                    onChange={(e) => setNouveauProduit({ ...nouveauProduit, est_thermolabile: e.target.checked })}
                    className="mt-0.5 size-4 accent-[#0F3B27]"
                  />
                  <div>
                    <span className="font-bold flex items-center gap-1.5 text-blue-950">
                      ❄️ Médicament Thermolabile (2 °C – 8 °C)
                    </span>
                    <p className="text-[11px] text-blue-800/80 mt-0.5">
                      Ce médicament sera automatiquement orienté vers le réfrigérateur à réception, avec suivi de température obligatoire.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] p-3 text-xs text-[#0F3B27] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nouveauProduit.necessite_ordonnance}
                    onChange={(e) => setNouveauProduit({ ...nouveauProduit, necessite_ordonnance: e.target.checked })}
                    className="mt-0.5 size-4 accent-[#0F3B27]"
                  />
                  <div>
                    <span className="font-bold">Prescription médicale obligatoire (Ordonnance)</span>
                    <p className="text-[11px] text-[#475C50] mt-0.5">
                      La caisse exigera la saisie du médecin prescripteur et du numéro d'ordonnance lors de la délivrance.
                    </p>
                  </div>
                </label>
              </div>
            </ColonneFiche>
          </form>
        </ModaleFiche>
      </Dialog>

      {/* Dialog Changement de statut */}
      <Dialog open={dialogChangementStatutOuvert} onOpenChange={setDialogChangementStatutOuvert}>
        <ModaleFiche
          titre="Changer le statut d’un lot"
          sousTitre={lotPourAction ? `Lot ${lotPourAction.numero_lot} · ${lotPourAction.produit?.nom_commercial ?? ""} — le changement prend effet immédiatement et reste au journal.` : "Le changement prend effet immédiatement."}
          badge={<Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">Statut du lot</Badge>}
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
