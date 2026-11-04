import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { formatDate, formatFCFA } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";

// ─── Types partagés avec l'API (contrats backend réels)
export interface LigneInventaire {
  id: string;
  produit_id: string;
  stock_lot_id?: string | null;
  quantite_theorique: number;
  quantite_comptee: number | null;
  ecart: number | null;
  valorisation_ecart?: number | null;
  commentaire?: string | null;
  produit?: { nom_commercial: string; code_cip?: string };
  lot?: { numero_lot: string; date_peremption?: string } | null;
}

export interface Inventaire {
  id: string;
  reference: string;
  type: "tournant" | "general_annuel";
  zone?: string | null;
  statut: "brouillon" | "en_cours" | "en_attente_validation" | "valide" | "annule";
  date_inventaire: string;
  initiateur?: { name: string } | null;
  lignes_count?: number;
  lignes?: LigneInventaire[];
}

export interface AvisRappel {
  id: string;
  reference: string;
  source: string;
  produits_concernes: string;
  lots_concernes?: { produit_id?: string; numero_lot?: string }[];
  date_avis: string;
  action_requise: string;
  statut: "actif" | "en_traitement" | "cloture";
  auteur?: { name: string } | null;
  date_cloture?: string | null;
  preuve_cloture?: string | null;
}

export interface LotDechet {
  id: string;
  reference: string;
  motif: string;
  lots_originels?: { id?: string; numero_lot?: string; quantite?: number }[];
  quantite_totale: number;
  valeur_perte: number;
  zone_stockage?: string;
  statut: "constitue" | "en_attente_prestataire" | "detruit" | "annule";
  prestataire_nom?: string | null;
  date_destruction_prevue?: string | null;
  date_destruction_reelle?: string | null;
  constitue_par?: { name: string } | null;
}

/** Un lot tel que la modale de déchet le propose : seuls les lots encore en stock. */
export interface LotDisponible {
  id: string;
  numero_lot: string;
  quantite_disponible: number;
  date_peremption: string;
  emplacement?: string;
  statut_effectif?: string;
  produit?: { nom_commercial: string; code_cip?: string };
}

const MOTIFS_DECHET = [
  { valeur: "perime", libelle: "Périmé" },
  { valeur: "avarie", libelle: "Avarié ou cassé" },
  { valeur: "non_conforme", libelle: "Non conforme" },
  { valeur: "rappele", libelle: "Rappelé par le fabricant" },
  { valeur: "retour_client", libelle: "Retour de client" },
  { valeur: "autre", libelle: "Autre motif" },
];

const libelleMotif = (motif: string) =>
  MOTIFS_DECHET.find((m) => m.valeur === motif)?.libelle ?? motif;

const statutInventaire: Record<Inventaire["statut"], { label: string; classe: string }> = {
  brouillon: { label: "Brouillon", classe: "bg-slate-100 text-slate-700 border-slate-300" },
  en_cours: { label: "Comptage en cours", classe: "bg-amber-100 text-amber-800 border-amber-300" },
  en_attente_validation: { label: "En attente de validation", classe: "bg-blue-100 text-blue-800 border-blue-300" },
  valide: { label: "Validé", classe: "bg-[#CFF1D2] text-[#0F3B27] border-[#0F3B27]/20" },
  annule: { label: "Annulé", classe: "bg-slate-100 text-slate-500 border-slate-200" },
};

const dateFr = (valeur?: string | null) => {
  if (!valeur) return "—";
  const d = new Date(valeur.length === 10 ? `${valeur}T12:00:00` : valeur);
  return Number.isNaN(d.getTime()) ? "—" : formatDate(d);
};

const fcfa = (n: number) => formatFCFA(n);

/**
 * Les trois écrans du magasin qui manquaient : inventaires, rappels et déchets.
 * Ils parlent aux routes backend réelles (/inventaires, /rappels, /dechets).
 */
export function InventairesStock() {
  const queryClient = useQueryClient();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [type, setType] = useState<"tournant" | "general_annuel">("tournant");
  const [zone, setZone] = useState("");
  const [dateInventaire, setDateInventaire] = useState(new Date().toISOString().slice(0, 10));
  const [doubleComptage, setDoubleComptage] = useState(false);
  const [comptageAveugle, setComptageAveugle] = useState(false);
  const [inventaireOuvertId, setInventaireOuvertId] = useState<string | null>(null);
  const [comptages, setComptages] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ data: { data: Inventaire[] } }>({
    queryKey: ["inventaires"],
    queryFn: () => api.get("/inventaires"),
  });
  const inventaires = data?.data?.data ?? [];
  const inventaireOuvert = inventaires.find((i) => i.id === inventaireOuvertId) ?? null;

  const { data: detailData } = useQuery<{ data: Inventaire }>({
    queryKey: ["inventaire", inventaireOuvertId],
    queryFn: () => api.get(`/inventaires/${inventaireOuvertId}`),
    enabled: !!inventaireOuvertId,
  });
  const lignes = detailData?.data?.lignes ?? inventaireOuvert?.lignes ?? [];

  const invaliderInventaires = () => {
    queryClient.invalidateQueries({ queryKey: ["inventaires"] });
    if (inventaireOuvertId) queryClient.invalidateQueries({ queryKey: ["inventaire", inventaireOuvertId] });
  };

  const mutationCreer = useMutation({
    mutationFn: (payload: any) => api.post("/inventaires", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Campagne d’inventaire créée");
      queryClient.invalidateQueries({ queryKey: ["inventaires"] });
      setDialogOuvert(false);
      setZone("");
      setDoubleComptage(false);
      setComptageAveugle(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const mutationCompter = useMutation({
    mutationFn: ({ inventaireId, ligneId, quantite, commentaire }: any) =>
      api.post(`/inventaires/${inventaireId}/lignes/${ligneId}/compter`, {
        quantite_comptee: quantite,
        commentaire: commentaire || null,
      }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Comptage enregistré");
      invaliderInventaires();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const mutationValider = useMutation({
    mutationFn: (id: string) => api.post(`/inventaires/${id}/valider`, {}),
    onSuccess: (res: any) => {
      toast.success(res.message || "Inventaire validé — ajustements appliqués");
      invaliderInventaires();
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      queryClient.invalidateQueries({ queryKey: ["mouvements"] });
      setInventaireOuvertId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const lignesRestantes = lignes.filter((l) => l.quantite_comptee === null || l.quantite_comptee === undefined).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display font-black text-[#0F3B27]">Inventaires — tournant et général annuel (STO-12)</h3>
          <p className="text-xs text-[#475C50]">Une campagne par zone, un comptage ligne à ligne, puis la validation du pharmacien qui applique les ajustements.</p>
        </div>
        <Button className="bg-[#0F3B27] text-white font-bold" onClick={() => setDialogOuvert(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nouvelle campagne
        </Button>
      </div>

      <Card className="border-[#CFF1D2]">
        <CardHeader>
          <CardTitle className="text-xs font-bold text-[#0F3B27]">Campagnes</CardTitle>
          <CardDescription className="text-xs">
            {isLoading ? "Chargement…" : inventaires.length === 0 ? "Aucune campagne — lancez un inventaire tournant par zone : réserve, comptoir, frigo ou armoire." : `${inventaires.length} campagne(s) enregistrée(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {inventaires.map((inv) => {
            const s = statutInventaire[inv.statut] ?? statutInventaire.brouillon;
            const comptees = inv.lignes?.filter((l) => l.quantite_comptee !== null && l.quantite_comptee !== undefined).length ?? 0;
            return (
              <div key={inv.id} className="flex flex-col gap-2 rounded-2xl border border-[#CFF1D2] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#0F3B27]">{inv.reference}</span>
                    <Badge variant="outline" className={`text-[10px] font-bold ${s.classe}`}>{s.label}</Badge>
                    <span className="text-[11px] text-[#475C50]">
                      {inv.type === "general_annuel" ? "Général annuel" : "Tournant"} · {inv.zone || "toutes les zones"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#475C50]">
                    Du {dateFr(inv.date_inventaire)} · {inv.initiateur?.name ?? "—"}
                    {typeof inv.lignes_count === "number" ? ` · ${comptees}/${inv.lignes_count} ligne(s) comptée(s)` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" className="h-9 border-[#CFF1D2] font-bold text-[#0F3B27]" onClick={() => setInventaireOuvertId(inv.id)}>
                    Ouvrir la feuille
                  </Button>
                  {inv.statut !== "valide" && (
                    <Button
                      size="sm"
                      className="h-9 bg-[#0F3B27] font-bold text-white"
                      onClick={() => mutationValider.mutate(inv.id)}
                      disabled={mutationValider.isPending}
                    >
                      Valider
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-[#CFF1D2]">
        <CardContent className="pt-6 text-xs text-[#475C50]">
          La feuille de comptage s’utilise sur téléphone et fonctionne hors connexion. Comptage aveugle et double comptage en option, écarts valorisés, validation du pharmacien avant tout ajustement (STO-12). Export PDF et Excel conservé cinq ans — GAC-EN-010.
        </CardContent>
      </Card>

      {/* Feuille de comptage */}
      <Dialog open={!!inventaireOuvertId} onOpenChange={(ouvert) => { if (!ouvert) { setInventaireOuvertId(null); setComptages({}); } }}>
        <ModaleFiche
          titre={inventaireOuvert ? `Feuille d’inventaire ${inventaireOuvert.reference}` : "Feuille d’inventaire"}
          sousTitre="Comptez physiquement chaque ligne. L’écart se calcule tout seul, et rien n’est appliqué au stock avant la validation du pharmacien."
          badge={inventaireOuvert ? (
            <Badge variant="outline" className={`text-[10px] font-bold ${(statutInventaire[inventaireOuvert.statut] ?? statutInventaire.brouillon).classe}`}>
              {(statutInventaire[inventaireOuvert.statut] ?? statutInventaire.brouillon).label}
            </Badge>
          ) : undefined}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                {lignesRestantes === 0 ? "Toutes les lignes sont comptées : la validation est possible." : `${lignesRestantes} ligne(s) restent à compter avant de pouvoir valider.`}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" className="h-12 rounded-xl sm:h-11" onClick={() => setInventaireOuvertId(null)}>Fermer</Button>
                <Button
                  className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
                  disabled={lignesRestantes > 0 || mutationValider.isPending || !inventaireOuvertId}
                  onClick={() => inventaireOuvertId && mutationValider.mutate(inventaireOuvertId)}
                >
                  {mutationValider.isPending ? "Validation…" : "Valider et appliquer les écarts"}
                </Button>
              </div>
            </div>
          }
        >
          {lignes.length === 0 ? (
            <p className="rounded-2xl border border-[#CFF1D2] bg-[#F7F9F7] p-4 text-sm text-[#475C50]">
              Cette campagne ne contient encore aucune ligne. Les lignes sont créées automatiquement à partir des lots présents dans la zone choisie.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-[#CFF1D2] bg-[#F7F9F7] font-bold text-[#475C50]">
                  <tr>
                    <th className="px-3 py-2">Produit et lot</th>
                    <th className="px-3 py-2 text-center">Théorique</th>
                    <th className="px-3 py-2 text-center">Compté</th>
                    <th className="px-3 py-2 text-center">Écart</th>
                    <th className="px-3 py-2">Commentaire</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFF1D2]/50">
                  {lignes.map((ligne) => {
                    const saisi = comptages[ligne.id] ?? (ligne.quantite_comptee ?? "").toString();
                    const ecart = ligne.ecart;
                    return (
                      <tr key={ligne.id} className="align-top">
                        <td className="px-3 py-2">
                          <div className="font-bold text-[#0F3B27]">{ligne.produit?.nom_commercial ?? "Produit"}</div>
                          <div className="font-mono text-[11px] text-[#475C50]">
                            Lot {ligne.lot?.numero_lot ?? "—"}{ligne.lot?.date_peremption ? ` · péremption ${dateFr(ligne.lot.date_peremption)}` : ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-[#0F3B27]">{ligne.quantite_theorique}</td>
                        <td className="px-3 py-2 text-center">
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={saisi}
                            onChange={(e) => setComptages((c) => ({ ...c, [ligne.id]: e.target.value }))}
                            className="mx-auto h-11 w-20 rounded-xl text-center font-mono"
                            aria-label={`Quantité comptée pour ${ligne.produit?.nom_commercial ?? "ce produit"}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {ecart === null || ecart === undefined ? (
                            <span className="text-[11px] text-[#475C50]">—</span>
                          ) : ecart === 0 ? (
                            <Badge className="bg-[#CFF1D2] text-[#0F3B27]">0</Badge>
                          ) : (
                            <Badge variant="outline" className={ecart > 0 ? "border-blue-300 bg-blue-50 text-blue-800" : "border-red-300 bg-red-50 text-red-800"}>
                              {ecart > 0 ? `+${ecart}` : ecart}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-[#475C50]">{ligne.commentaire || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            className="h-10 bg-[#0F3B27] px-3 font-bold text-white"
                            disabled={saisi === "" || mutationCompter.isPending || inventaireOuvert?.statut === "valide"}
                            onClick={() => {
                              if (!inventaireOuvertId) return;
                              mutationCompter.mutate({
                                inventaireId: inventaireOuvertId,
                                ligneId: ligne.id,
                                quantite: Number(saisi),
                                commentaire: ligne.commentaire,
                              });
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Enregistrer
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ModaleFiche>
      </Dialog>

      {/* Nouvelle campagne */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <ModaleFiche
          titre="Nouvelle campagne d’inventaire"
          sousTitre="Une campagne tournante cible une zone ; l’inventaire général annuel couvre tout le magasin."
          badge={<Badge className="bg-[#0F3B27] text-[#92FF5F]">STO-12</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" className="h-12 rounded-xl sm:h-11" onClick={() => setDialogOuvert(false)}>Annuler</Button>
              <Button
                className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
                disabled={mutationCreer.isPending}
                onClick={() => mutationCreer.mutate({
                  type,
                  zone: zone || null,
                  date_inventaire: dateInventaire,
                  double_comptage: doubleComptage,
                  comptage_aveugle: comptageAveugle,
                })}
              >
                {mutationCreer.isPending ? "Création…" : "Créer la campagne"}
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="Ce que l’on compte" aide="Choisissez l’étendue et la date du comptage.">
              <Champ label="Type d’inventaire" obligatoire>
                <select value={type} onChange={(e) => setType(e.target.value as any)} className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]">
                  <option value="tournant">Tournant — une zone à la fois</option>
                  <option value="general_annuel">Général annuel — tout le magasin</option>
                </select>
              </Champ>
              <Champ label="Zone ciblée" aide="Laissez vide pour couvrir tous les emplacements.">
                <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex. Réserve — Stock principal" className="h-12 rounded-xl" list="zones-inventaire" />
                <datalist id="zones-inventaire">
                  <option value="Comptoir — Délivrance" />
                  <option value="Réserve — Stock principal" />
                  <option value="Réfrigérateur 2°C–8°C" />
                  <option value="Armoire sécurisée — Stupéfiants & Listes" />
                  <option value="Zone d’attente de contrôle" />
                </datalist>
              </Champ>
              <Champ label="Date du comptage" obligatoire>
                <Input type="date" value={dateInventaire} onChange={(e) => setDateInventaire(e.target.value)} className="h-12 rounded-xl" />
              </Champ>
            </ColonneFiche>

            <ColonneFiche titre="Comment on compte" aide="Les options se cochent maintenant, elles s’appliquent à toute la campagne.">
              <label className="flex min-h-12 items-start gap-2 rounded-xl border border-[#CFF1D2] bg-white px-3 py-2.5 text-xs">
                <input type="checkbox" checked={comptageAveugle} onChange={(e) => setComptageAveugle(e.target.checked)} className="mt-0.5 size-4 accent-[#0F3B27]" />
                <span><strong className="text-[#0F3B27]">Comptage aveugle</strong><br /><span className="text-[#475C50]">Le compteur ne voit pas la quantité théorique : cela évite les comptages « alignés » sur le système.</span></span>
              </label>
              <label className="flex min-h-12 items-start gap-2 rounded-xl border border-[#CFF1D2] bg-white px-3 py-2.5 text-xs">
                <input type="checkbox" checked={doubleComptage} onChange={(e) => setDoubleComptage(e.target.checked)} className="mt-0.5 size-4 accent-[#0F3B27]" />
                <span><strong className="text-[#0F3B27]">Double comptage</strong><br /><span className="text-[#475C50]">Deux personnes comptent séparément ; un écart entre les deux comptages déclenche une re-vérification.</span></span>
              </label>
              <p className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] px-3 py-2 text-[11px] leading-snug text-[#475C50]">
                Les lignes de la feuille sont générées automatiquement à partir des lots présents dans la zone choisie. Aucun ajustement de stock n’a lieu avant la validation du pharmacien.
              </p>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>
    </div>
  );
}

export function RappelsStock() {
  const queryClient = useQueryClient();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [source, setSource] = useState("");
  const [produitsConcernes, setProduitsConcernes] = useState("");
  const [numerosLots, setNumerosLots] = useState("");
  const [dateAvis, setDateAvis] = useState(new Date().toISOString().slice(0, 10));
  const [actionRequise, setActionRequise] = useState("");
  const [rappelACloturer, setRappelACloturer] = useState<AvisRappel | null>(null);
  const [preuve, setPreuve] = useState("");

  const { data, isLoading } = useQuery<{ data: { data: AvisRappel[] } }>({
    queryKey: ["rappels"],
    queryFn: () => api.get("/rappels"),
  });
  const rappels = data?.data?.data ?? [];
  const rappelsActifs = rappels.filter((r) => r.statut !== "cloture");

  const mutationCreer = useMutation({
    mutationFn: (payload: any) => api.post("/rappels", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Avis de rappel enregistré");
      queryClient.invalidateQueries({ queryKey: ["rappels"] });
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      queryClient.invalidateQueries({ queryKey: ["mouvements"] });
      setDialogOuvert(false);
      setSource(""); setProduitsConcernes(""); setNumerosLots(""); setActionRequise("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const mutationCloturer = useMutation({
    mutationFn: ({ id, preuve_cloture }: any) => api.post(`/rappels/${id}/cloturer`, { preuve_cloture }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Rappel clôturé");
      queryClient.invalidateQueries({ queryKey: ["rappels"] });
      setRappelACloturer(null);
      setPreuve("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const lotsSaisis = numerosLots
    .split(/[,;\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <Card className="border-amber-400 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-sm font-black text-amber-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Rappels de lots — blocage immédiat (STO-14)
          </CardTitle>
          <CardDescription className="text-amber-800">
            On saisit ou on importe l’avis reçu (source, produits, lots, date, action, pièce jointe). La caisse et la dispensation bloquent en moins d’une minute, une liste de prélèvement est éditée par emplacement, les boîtes sont scannées puis isolées, un bordereau de retour est signé et les patients concernés sont recherchés avant la clôture avec preuve.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>Conservation GAC-EN-008 : dix ans. Le cahier de rappel de lot et de mise en quarantaine s’imprime en PDF.</span>
          <Button className="h-11 shrink-0 bg-amber-900 font-bold text-white" onClick={() => setDialogOuvert(true)}>
            <Plus className="w-4 h-4 mr-1" /> Saisir un avis de rappel
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[#CFF1D2]">
        <CardHeader>
          <CardTitle className="text-xs font-bold text-[#0F3B27]">Avis enregistrés</CardTitle>
          <CardDescription className="text-xs">
            {isLoading ? "Chargement…" : rappels.length === 0 ? "Aucun rappel actif — dès qu’un avis est saisi, les lots concernés sont bloqués sur-le-champ." : `${rappelsActifs.length} avis encore actif(s) sur ${rappels.length} enregistré(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rappels.map((r) => (
            <div key={r.id} className={`flex flex-col gap-2 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${r.statut === "cloture" ? "border-[#CFF1D2] bg-white" : "border-amber-300 bg-amber-50/60"}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#0F3B27]">{r.reference}</span>
                  <Badge variant="outline" className={`text-[10px] font-bold ${r.statut === "cloture" ? "border-[#CFF1D2] text-[#475C50]" : "border-amber-400 bg-white text-amber-900"}`}>
                    {r.statut === "cloture" ? "Clôturé" : r.statut === "en_traitement" ? "En traitement" : "Actif — lots bloqués"}
                  </Badge>
                  <span className="text-[11px] font-bold text-[#475C50]">{dateFr(r.date_avis)}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-[#0F3B27]">{r.produits_concernes}</p>
                <p className="text-[11px] text-[#475C50]">
                  {r.source} · lot(s) : {(r.lots_concernes ?? []).map((l) => l.numero_lot).filter(Boolean).join(", ") || "non précisés"}
                </p>
                <p className="text-[11px] text-[#475C50]">{r.action_requise}</p>
                {r.preuve_cloture ? <p className="text-[11px] text-emerald-700">Clôturé — preuve : {r.preuve_cloture}</p> : null}
              </div>
              {r.statut !== "cloture" && (
                <Button variant="outline" size="sm" className="h-9 shrink-0 border-amber-400 font-bold text-amber-900" onClick={() => setRappelACloturer(r)}>
                  Clôturer l’avis
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Saisie d'un avis */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <ModaleFiche
          titre="Saisir un avis de rappel"
          sousTitre="Dès l’enregistrement, chaque lot dont le numéro correspond est mis en quarantaine et la vente est bloquée."
          badge={<Badge className="bg-amber-900 text-white">STO-14</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">Le blocage est automatique : inutile de repasser par la feuille des lots.</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" className="h-12 rounded-xl sm:h-11" onClick={() => setDialogOuvert(false)}>Annuler</Button>
                <Button
                  className="h-12 rounded-xl bg-amber-900 font-bold text-white sm:h-11"
                  disabled={mutationCreer.isPending || !source || !produitsConcernes || !actionRequise}
                  onClick={() => mutationCreer.mutate({
                    source,
                    produits_concernes: produitsConcernes,
                    lots_concernes: lotsSaisis.map((numero_lot) => ({ numero_lot })),
                    date_avis: dateAvis,
                    action_requise: actionRequise,
                  })}
                >
                  {mutationCreer.isPending ? "Enregistrement…" : "Enregistrer et bloquer les lots"}
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="D’où vient l’avis" aide="Reprenez la source telle qu’elle figure sur le courrier reçu.">
              <Champ label="Source de l’avis" obligatoire aide="Agence, fabricant, grossiste…">
                <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex. ABMed — Agence béninoise de régulation pharmaceutique" className="h-12 rounded-xl" />
              </Champ>
              <Champ label="Date de l’avis" obligatoire>
                <Input type="date" value={dateAvis} onChange={(e) => setDateAvis(e.target.value)} className="h-12 rounded-xl" />
              </Champ>
              <Champ label="Produits concernés" obligatoire aide="Le libellé complet, avec le laboratoire si possible.">
                <Input value={produitsConcernes} onChange={(e) => setProduitsConcernes(e.target.value)} placeholder="Ex. Amoxicilline 1 g — GSK" className="h-12 rounded-xl" />
              </Champ>
            </ColonneFiche>

            <ColonneFiche titre="Ce qu’il faut faire" aide="Les numéros de lot sont ceux imprimés sur les boîtes.">
              <Champ label="Numéros de lot concernés" aide="Séparez plusieurs lots par une virgule ou un retour à la ligne.">
                <Textarea rows={3} value={numerosLots} onChange={(e) => setNumerosLots(e.target.value)} placeholder={"Ex. LOT-2026-003\nLOT-2026-017"} className="rounded-xl font-mono text-sm" />
              </Champ>
              <Champ label="Action demandée" obligatoire aide="Ce que l’émetteur de l’avis demande de faire.">
                <Textarea rows={3} value={actionRequise} onChange={(e) => setActionRequise(e.target.value)} placeholder="Ex. retrait immédiat de la vente, isolement en quarantaine et retour au grossiste." className="rounded-xl text-sm" />
              </Champ>
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900">
                {lotsSaisis.length === 0
                  ? "Aucun numéro de lot saisi : l’avis sera enregistré, mais aucun lot ne sera bloqué automatiquement."
                  : `${lotsSaisis.length} numéro(s) de lot saisi(s) : les lots correspondants de l’officine passeront en quarantaine dès l’enregistrement.`}
              </div>
              <Button variant="outline" className="h-12 w-full rounded-xl border-dashed border-amber-400 font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 mr-1" /> Joindre l’avis reçu (PDF ou photo)
              </Button>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>

      {/* Clôture */}
      <Dialog open={!!rappelACloturer} onOpenChange={(ouvert) => { if (!ouvert) { setRappelACloturer(null); setPreuve(""); } }}>
        <ModaleFiche
          titre="Clôturer l’avis de rappel"
          sousTitre={rappelACloturer ? `${rappelACloturer.reference} · ${rappelACloturer.produits_concernes}` : "La clôture exige une preuve."}
          badge={<Badge className="bg-amber-900 text-white">STO-14</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" className="h-12 rounded-xl sm:h-11" onClick={() => setRappelACloturer(null)}>Annuler</Button>
              <Button
                className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
                disabled={!preuve || mutationCloturer.isPending}
                onClick={() => rappelACloturer && mutationCloturer.mutate({ id: rappelACloturer.id, preuve_cloture: preuve })}
              >
                {mutationCloturer.isPending ? "Clôture…" : "Clôturer avec preuve"}
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="Ce qui a été fait">
              <div className="rounded-2xl border border-[#CFF1D2] bg-[#F7F9F7] p-3 text-xs text-[#475C50]">
                <p className="font-bold text-[#0F3B27]">Action demandée</p>
                <p>{rappelACloturer?.action_requise || "—"}</p>
                <p className="mt-2 font-bold text-[#0F3B27]">Lots concernés</p>
                <p>{((rappelACloturer?.lots_concernes ?? []).map((l) => l.numero_lot).filter(Boolean).join(", ")) || "non précisés"}</p>
              </div>
            </ColonneFiche>
            <ColonneFiche titre="La preuve de clôture" aide="Bordereau de retour signé, accusé du grossiste, courrier de l’agence…">
              <Champ label="Référence de la preuve" obligatoire>
                <Textarea rows={5} value={preuve} onChange={(e) => setPreuve(e.target.value)} placeholder="Ex. bordereau de retour RET-2026-014 signé par le grossiste le 12/11/2026" className="rounded-xl text-sm" />
              </Champ>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>
    </div>
  );
}

export function DechetsStock() {
  const queryClient = useQueryClient();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [motif, setMotif] = useState("perime");
  const [lotsChoisis, setLotsChoisis] = useState<string[]>([]);
  const [prestataire, setPrestataire] = useState("");
  const [datePrevue, setDatePrevue] = useState("");

  const { data, isLoading } = useQuery<{ data: { data: LotDechet[] } }>({
    queryKey: ["dechets"],
    queryFn: () => api.get("/dechets"),
  });
  const dechets = data?.data?.data ?? [];

  const { data: lotsData } = useQuery<{ data: LotDisponible[] }>({
    queryKey: ["stocks-abimes"],
    queryFn: () => api.get("/stocks?vendable=false"),
    enabled: dialogOuvert,
  });
  const lotsDisponibles = (lotsData?.data ?? []).filter((l) => (l.quantite_disponible ?? 0) > 0);

  const mutationConstituer = useMutation({
    mutationFn: (payload: any) => api.post("/dechets", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Lot de déchets constitué");
      queryClient.invalidateQueries({ queryKey: ["dechets"] });
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      queryClient.invalidateQueries({ queryKey: ["mouvements"] });
      setDialogOuvert(false);
      setLotsChoisis([]);
      setPrestataire("");
      setDatePrevue("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const mutationDetruire = useMutation({
    mutationFn: (id: string) => api.post(`/dechets/${id}/detruire`, {}),
    onSuccess: (res: any) => {
      toast.success(res.message || "Destruction validée");
      queryClient.invalidateQueries({ queryKey: ["dechets"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const basculerLot = (id: string) =>
    setLotsChoisis((liste) => (liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]));

  const lotsSelectionnes = lotsDisponibles.filter((l) => lotsChoisis.includes(l.id));
  const quantiteSelectionnee = lotsSelectionnes.reduce((s, l) => s + l.quantite_disponible, 0);

  return (
    <div className="space-y-4">
      <Card className="border-red-300 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-sm font-black text-red-800 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Déchets et destruction — BPD9 (STO-17)
          </CardTitle>
          <CardDescription className="text-red-700">
            Motif possible : périmé, avarié, non conforme, rappelé ou retourné. Le lot rejoint l’aire sécurisée, devient « à détruire », puis part chez un prestataire qualifié. Le procès-verbal contradictoire est signé électroniquement et rangé dans le coffre-fort numérique, avec l’écriture de perte.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Les procès-verbaux de destruction se conservent dix ans (GAC-EN). Chaque déchet génère une perte comptable (STO-18).</span>
          <Button className="h-11 shrink-0 bg-red-800 font-bold text-white" onClick={() => setDialogOuvert(true)}>
            <Plus className="w-4 h-4 mr-1" /> Constituer un lot à détruire
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[#CFF1D2]">
        <CardHeader>
          <CardTitle className="text-xs font-bold text-[#0F3B27]">Lots de déchets</CardTitle>
          <CardDescription className="text-xs">
            {isLoading ? "Chargement…" : dechets.length === 0 ? "Aucun lot en déchet — pour en constituer un, sélectionnez des lots périmés ou rejetés." : `${dechets.length} lot(s) de déchets suivi(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {dechets.map((d) => (
            <div key={d.id} className={`flex flex-col gap-2 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${d.statut === "detruit" ? "border-[#CFF1D2] bg-white" : "border-red-300 bg-red-50/50"}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#0F3B27]">{d.reference}</span>
                  <Badge variant="outline" className={`text-[10px] font-bold ${d.statut === "detruit" ? "border-[#CFF1D2] text-[#475C50]" : "border-red-400 bg-white text-red-800"}`}>
                    {d.statut === "detruit" ? "Détruit" : d.statut === "en_attente_prestataire" ? "En attente du prestataire" : "Constitué"}
                  </Badge>
                  <span className="text-[11px] font-bold text-[#475C50]">{libelleMotif(d.motif)}</span>
                </div>
                <p className="mt-1 text-[11px] text-[#475C50]">
                  {d.quantite_totale} unité(s) · perte {fcfa(d.valeur_perte)} · {(d.lots_originels ?? []).map((l) => l.numero_lot).filter(Boolean).join(", ") || "lots non détaillés"}
                </p>
                <p className="text-[11px] text-[#475C50]">
                  {d.prestataire_nom ? `Prestataire : ${d.prestataire_nom}` : "Prestataire non désigné"}
                  {d.date_destruction_prevue ? ` · destruction prévue le ${dateFr(d.date_destruction_prevue)}` : ""}
                  {d.date_destruction_reelle ? ` · détruit le ${dateFr(d.date_destruction_reelle)}` : ""}
                </p>
              </div>
              {d.statut !== "detruit" && (
                <Button
                  size="sm"
                  className="h-9 shrink-0 bg-[#0F3B27] font-bold text-white"
                  disabled={mutationDetruire.isPending}
                  onClick={() => mutationDetruire.mutate(d.id)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Valider la destruction
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Constitution d'un lot de déchets */}
      <Dialog open={dialogOuvert} onOpenChange={(ouvert) => { setDialogOuvert(ouvert); if (!ouvert) setLotsChoisis([]); }}>
        <ModaleFiche
          titre="Constituer un lot à détruire"
          sousTitre="Les lots choisis passent en « déchet à détruire », quittent le stock vendable et génèrent une perte comptable."
          badge={<Badge className="bg-red-800 text-white">BPD-9</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                {lotsChoisis.length === 0 ? "Sélectionnez au moins un lot." : `${lotsChoisis.length} lot(s) · ${quantiteSelectionnee} unité(s) seront retirées du stock.`}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" className="h-12 rounded-xl sm:h-11" onClick={() => setDialogOuvert(false)}>Annuler</Button>
                <Button
                  className="h-12 rounded-xl bg-red-800 font-bold text-white sm:h-11"
                  disabled={lotsChoisis.length === 0 || mutationConstituer.isPending}
                  onClick={() => mutationConstituer.mutate({
                    motif,
                    lots_ids: lotsChoisis,
                    prestataire_nom: prestataire || null,
                    date_destruction_prevue: datePrevue || null,
                  })}
                >
                  {mutationConstituer.isPending ? "Constitution…" : "Constituer le lot de déchets"}
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ColonneFiche titre="Les lots à sortir" aide="Seuls les lots encore présents en stock sont proposés.">
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {lotsDisponibles.length === 0 ? (
                  <p className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] px-3 py-2 text-xs text-[#475C50]">
                    Aucun lot en stock à proposer. Les lots déjà sortis ne peuvent pas être ajoutés une seconde fois.
                  </p>
                ) : lotsDisponibles.map((l) => (
                  <label key={l.id} className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-xs ${lotsChoisis.includes(l.id) ? "border-red-400 bg-red-50" : "border-[#CFF1D2] bg-white"}`}>
                    <input type="checkbox" checked={lotsChoisis.includes(l.id)} onChange={() => basculerLot(l.id)} className="mt-0.5 size-4 accent-[#B91C1C]" />
                    <span className="min-w-0">
                      <span className="block font-bold text-[#0F3B27]">{l.produit?.nom_commercial ?? "Produit"}</span>
                      <span className="block font-mono text-[11px] text-[#475C50]">Lot {l.numero_lot} · {l.quantite_disponible} unité(s) · péremption {dateFr(l.date_peremption)}</span>
                      {l.emplacement ? <span className="block text-[11px] text-[#475C50]">{l.emplacement}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </ColonneFiche>

            <ColonneFiche titre="Le motif et la suite" aide="Le motif détermine la filière de destruction et l’écriture de perte.">
              <Champ label="Motif de la destruction" obligatoire>
                <select value={motif} onChange={(e) => setMotif(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-[#CFF1D2] bg-white px-3 text-sm font-medium text-[#0F3B27]">
                  {MOTIFS_DECHET.map((m) => <option key={m.valeur} value={m.valeur}>{m.libelle}</option>)}
                </select>
              </Champ>
              <Champ label="Prestataire habilité" aide="L’entreprise qui réalisera l’incinération.">
                <Input value={prestataire} onChange={(e) => setPrestataire(e.target.value)} placeholder="Ex. SANOFI-DÉCHETS Cotonou" className="h-12 rounded-xl" />
              </Champ>
              <Champ label="Date de destruction prévue">
                <Input type="date" value={datePrevue} onChange={(e) => setDatePrevue(e.target.value)} className="h-12 rounded-xl" />
              </Champ>
              <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[11px] leading-snug text-red-800">
                <AlertTriangle className="mr-1 inline size-3.5" />
                La sortie est définitive : le lot ne pourra plus revenir en vente. Le procès-verbal signé et le certificat d’incinération se joignent ensuite au dossier conservé dix ans.
              </div>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>
    </div>
  );
}
