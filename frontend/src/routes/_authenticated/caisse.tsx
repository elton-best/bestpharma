import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt,
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  Smartphone,
  CreditCard,
  Banknote,
  DollarSign,
  AlertTriangle,
  QrCode,
  Search,
  Lock,
  Unlock,
  Printer,
  Sparkles,
  ArrowRight,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { formatDateHeure, nombre } from "@/lib/format";
import { imprimerFicheOfficielle } from "@/lib/export-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";

export const Route = createFileRoute("/_authenticated/caisse")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Caisse POS Tactile & FeexPay — BestPharma" },
      {
        name: "description",
        content: "Point de vente tactile, paiements Mobile Money FeexPay et certification fiscale DGI e-MECeF.",
      },
    ],
  }),
  component: PageCaissePos,
});

interface ProduitItem {
  id: string;
  code_cip: string;
  nom_commercial: string;
  dci?: string;
  prix_public_ttc: number;
  stock_total: number;
  est_thermolabile: boolean;
  tableau_substance: string;
}

interface LignePanier {
  produit: ProduitItem;
  quantite: number;
}

interface SessionActive {
  id: string;
  numero_session: string;
  fond_caisse_ouverture: number;
  total_encaisse_especes: number;
  total_encaisse_mobile_money: number;
  total_encaisse_carte: number;
  fond_caisse_fermeture_theorique: number;
  statut: "ouverte" | "fermee";
  opened_at: string;
  caissier?: { name: string };
  ventes?: any[];
}

function PageCaissePos() {
  const queryClient = useQueryClient();

  // États du panier POS
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [recherche, setRecherche] = useState("");
  const [clientNom, setClientNom] = useState("Client Comptoir");
  const [clientIfu, setClientIfu] = useState("");
  const [modeReglement, setModeReglement] = useState<"especes" | "mobile_money" | "carte">("especes");
  const [montantRecu, setMontantRecu] = useState<string>("");
  const [mobileOperateur, setMobileOperateur] = useState<"mtn" | "moov" | "celtiis">("mtn");
  const [mobileTelephone, setMobileTelephone] = useState("22997000000");

  // Modals
  const [dialogOuvrirOuvert, setDialogOuvrirOuvert] = useState(false);
  const [dialogCloturerOuvert, setDialogCloturerOuvert] = useState(false);
  const [dialogTicketSucces, setDialogTicketSucces] = useState(false);
  const [derniereVente, setDerniereVente] = useState<any>(null);

  // Formulaires session
  const [fondOuvertureSaisi, setFondOuvertureSaisi] = useState("20000");
  const [fondClotureReelSaisi, setFondClotureReelSaisi] = useState("");
  const [notesCloture, setNotesCloture] = useState("");

  // 1. Session de caisse active
  const { data: sessionData, isLoading: loadingSession } = useQuery<{ data: SessionActive | null }>({
    queryKey: ["session-caisse-active"],
    queryFn: () => api.get("/caisse/session-active"),
  });

  // 2. Produits disponibles
  const { data: produitsData } = useQuery<{ data: ProduitItem[] }>({
    queryKey: ["produits"],
    queryFn: () => api.get("/produits"),
  });

  const session = sessionData?.data;
  const produits = produitsData?.data || [];

  const produitsFiltres = produits.filter(
    (p) =>
      p.nom_commercial.toLowerCase().includes(recherche.toLowerCase()) ||
      p.code_cip.includes(recherche) ||
      (p.dci && p.dci.toLowerCase().includes(recherche.toLowerCase()))
  );

  // Mutations
  const mutationOuvrir = useMutation({
    mutationFn: (fond: number) => api.post("/caisse/ouvrir", { fond_caisse_ouverture: fond }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Session de caisse ouverte !");
      queryClient.invalidateQueries({ queryKey: ["session-caisse-active"] });
      setDialogOuvrirOuvert(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur ouverture caisse");
    },
  });

  const mutationCloturer = useMutation({
    mutationFn: (payload: any) => api.post(`/caisse/session/${session?.id}/fermer`, payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Ticket Z émis. Caisse clôturée !");
      queryClient.invalidateQueries({ queryKey: ["session-caisse-active"] });
      queryClient.invalidateQueries({ queryKey: ["comptabilite"] });
      setDialogCloturerOuvert(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur clôture caisse");
    },
  });

  const mutationVente = useMutation({
    mutationFn: (payload: any) => api.post("/caisse/ventes", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Vente encaissée et certifiée e-MECeF !");
      setDerniereVente(res.data);
      setDialogTicketSucces(true);
      setPanier([]);
      setMontantRecu("");
      setClientNom("Client Comptoir");
      setClientIfu("");
      queryClient.invalidateQueries({ queryKey: ["session-caisse-active"] });
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur encaissement vente");
    },
  });

  const totalPanier = panier.reduce((acc, l) => acc + l.quantite * l.produit.prix_public_ttc, 0);
  const montantRecuNum = parseFloat(montantRecu) || totalPanier;
  const monnaieRendue = Math.max(0, montantRecuNum - totalPanier);

  const ajouterAuPanier = (produit: ProduitItem) => {
    if (produit.stock_total <= 0) {
      toast.error(`Rupture de stock pour ${produit.nom_commercial}`);
      return;
    }
    const existant = panier.find((l) => l.produit.id === produit.id);
    if (existant) {
      if (existant.quantite >= produit.stock_total) {
        toast.error(`Stock maximal disponible atteint (${produit.stock_total})`);
        return;
      }
      setPanier(
        panier.map((l) =>
          l.produit.id === produit.id ? { ...l, quantite: l.quantite + 1 } : l
        )
      );
    } else {
      setPanier([...panier, { produit, quantite: 1 }]);
    }
  };

  const modifierQuantite = (produitId: string, delta: number) => {
    setPanier(
      panier
        .map((l) => {
          if (l.produit.id === produitId) {
            const nouvelleQte = l.quantite + delta;
            return nouvelleQte > 0 ? { ...l, quantite: nouvelleQte } : null;
          }
          return l;
        })
        .filter(Boolean) as LignePanier[]
    );
  };

  const supprimerDuPanier = (produitId: string) => {
    setPanier(panier.filter((l) => l.produit.id !== produitId));
  };

  const imprimerTicketVente = () => {
    if (!derniereVente) return;
    const lignesHtml = (derniereVente.lignes || [])
      .map(
        (l: any) => `
      <tr>
        <td style="padding: 4px 0;">${l.quantite} × ${l.produit?.nom_commercial || "Article"}</td>
        <td style="text-align: right; font-family: monospace; padding: 4px 0;">${nombre(l.total_ligne)} F</td>
      </tr>`
      )
      .join("");

    const html = `
      <div style="max-width: 360px; margin: 10px auto; border: 1px dashed #0F3B27; border-radius: 6px; padding: 15px; font-family: monospace; font-size: 12px; background: #fff;">
        <div style="text-align: center; border-bottom: 1px dashed #0F3B27; padding-bottom: 8px; margin-bottom: 8px;">
          <div style="font-weight: 900; font-size: 15px; color: #0F3B27;">BESTPHARMA OFFICINE</div>
          <div style="font-size: 10px; color: #555;">RÉPUBLIQUE DU BÉNIN</div>
          <div style="font-size: 10px; color: #555;">IFU : ${derniereVente.facture_emecef?.ifu_officine || "N/A"}</div>
          <div style="font-size: 10px; color: #555;">NIM : ${derniereVente.facture_emecef?.nim_machine || "N/A"}</div>
        </div>
        <div style="font-size: 11px; margin-bottom: 8px;">
          <div>Ticket : <strong>${derniereVente.numero_ticket}</strong></div>
          <div>Facture DGI : <strong>${derniereVente.facture_emecef?.numero_facture_dgi || "N/A"}</strong></div>
          <div>Date : ${formatDateHeure(derniereVente.created_at)}</div>
          <div>Client : <strong>${derniereVente.client_nom}</strong></div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px;">
          <tbody style="border-bottom: 1px dashed #ddd;">
            ${lignesHtml}
          </tbody>
        </table>
        <div style="font-size: 13px; font-weight: bold; color: #0F3B27; display: flex; justify-content: space-between; margin-top: 6px;">
          <span>TOTAL TTC</span>
          <span>${nombre(derniereVente.montant_net_ttc)} FCFA</span>
        </div>
        <div style="font-size: 10px; color: #555; margin-top: 4px; display: flex; justify-content: space-between;">
          <span>Règlement : ${derniereVente.mode_reglement}</span>
          <span>Reçu : ${nombre(derniereVente.montant_recu ?? 0)} F</span>
        </div>
        <div style="margin-top: 10px; border-top: 1px dotted #ccc; padding-top: 6px; text-align: center; font-size: 9px; color: #777;">
          Code MECeF : ${derniereVente.facture_emecef?.code_mecef || "N/A"}<br>
          Merci de votre confiance et prompt rétablissement !
        </div>
      </div>
    `;
    imprimerFicheOfficielle(`Ticket ${derniereVente.numero_ticket}`, html);
  };

  const handleEncaisser = (e: React.FormEvent) => {
    e.preventDefault();
    if (panier.length === 0) {
      toast.error("Votre panier est vide");
      return;
    }

    mutationVente.mutate({
      client_nom: clientNom,
      client_ifu: clientIfu || null,
      mode_reglement: modeReglement,
      montant_recu: montantRecuNum,
      mobile_operateur: modeReglement === "mobile_money" ? mobileOperateur : null,
      mobile_telephone: modeReglement === "mobile_money" ? mobileTelephone : null,
      lignes: panier.map((l) => ({
        produit_id: l.produit.id,
        quantite: l.quantite,
      })),
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête Caisse POS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Caisse POS Tactile & FeexPay
            </h1>
            <Badge variant="outline" className="border-emerald-600 text-emerald-700 bg-emerald-50">
              DGI e-MECeF & SYSCOHADA
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Encaissement rapide comptoir, Mobile Money Bénin (MTN/Moov/Celtiis) et tickets normalisés certifiés DGI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-600 text-white gap-1 py-1 px-3 text-xs">
                <Unlock className="w-3.5 h-3.5" /> Session : {session.numero_session}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogCloturerOuvert(true)}
                className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
              >
                <Lock className="w-3.5 h-3.5 mr-1" /> Clôturer la caisse (Z)
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setDialogOuvrirOuvert(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Unlock className="w-4 h-4" /> Ouvrir une session de caisse
            </Button>
          )}
        </div>
      </div>

      {/* Alerte si caisse fermée */}
      {!session && !loadingSession && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">Aucune session de caisse ouverte</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Une session de caisse avec fond d'ouverture est requise pour encaisser et certifier les tickets.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setDialogOuvrirOuvert(true)}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
            >
              Ouvrir maintenant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Interface Caisse Tactile Split 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne Gauche : Catalogue tactile (7/12) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Sélection Rapide des Médicaments
                </CardTitle>
                <span className="text-xs text-slate-500 font-mono">
                  {produits.length} références actives
                </span>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Recherche tactile par nom, DCI ou code barre CIP..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="pl-9 h-10 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {produitsFiltres.map((p) => {
                  const enPanier = panier.find((l) => l.produit.id === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={p.stock_total <= 0}
                      onClick={() => ajouterAuPanier(p)}
                      className={`p-3 text-left rounded-lg border transition-all flex flex-col justify-between relative group ${
                        p.stock_total <= 0
                          ? "opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed"
                          : enPanier
                          ? "border-emerald-500 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500"
                          : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50 shadow-sm"
                      }`}
                    >
                      {enPanier && (
                        <span className="absolute top-2 right-2 bg-emerald-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                          {enPanier.quantite}
                        </span>
                      )}
                      <div>
                        <div className="font-semibold text-xs text-slate-900 line-clamp-2">
                          {p.nom_commercial}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          CIP: {p.code_cip}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-700">
                          {nombre(p.prix_public_ttc)} F
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            p.stock_total <= 5
                              ? "bg-red-100 text-red-700 font-bold"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {p.stock_total} dispo
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne Droite : Ticket en cours & Clavier d'encaissement (5/12) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" /> Ticket Comptoir
                </CardTitle>
                {panier.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPanier([])}
                    className="text-xs text-red-600 hover:text-red-700 h-7 px-2"
                  >
                    Vider le ticket
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Lignes du panier */}
              <div className="min-h-[160px] max-h-[220px] overflow-y-auto space-y-2 pr-1">
                {panier.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs text-center">
                    <Receipt className="w-8 h-8 text-slate-300 mb-1" />
                    Sélectionnez un médicament à gauche pour démarrer l'encaissement.
                  </div>
                ) : (
                  panier.map((l) => (
                    <div
                      key={l.produit.id}
                      className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex-1 pr-2">
                        <div className="font-semibold text-slate-900 truncate">
                          {l.produit.nom_commercial}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {l.produit.prix_public_ttc} F x {l.quantite}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => modifierQuantite(l.produit.id, -1)}
                          className="w-6 h-6 rounded bg-white border border-slate-300 font-bold flex items-center justify-center hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="font-bold text-slate-900 w-5 text-center">
                          {l.quantite}
                        </span>
                        <button
                          type="button"
                          onClick={() => modifierQuantite(l.produit.id, 1)}
                          className="w-6 h-6 rounded bg-white border border-slate-300 font-bold flex items-center justify-center hover:bg-slate-100"
                        >
                          +
                        </button>
                        <span className="font-bold text-emerald-800 ml-2 w-16 text-right">
                          {nombre(l.quantite * l.produit.prix_public_ttc)} F
                        </span>
                        <button
                          type="button"
                          onClick={() => supprimerDuPanier(l.produit.id)}
                          className="text-red-500 hover:text-red-700 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total et TVA e-MECeF */}
              <div className="p-3 bg-slate-900 text-white rounded-lg space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Articles exonérés TVA (Groupe A) :</span>
                  <span>{nombre(totalPanier)} FCFA</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>TVA collectée (0%) :</span>
                  <span>0 FCFA</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-700">
                  <span className="text-sm font-bold text-emerald-400">NET À PAYER :</span>
                  <span className="text-2xl font-black text-emerald-400">
                    {nombre(totalPanier)} FCFA
                  </span>
                </div>
              </div>

              {/* Options de règlement */}
              <form onSubmit={handleEncaisser} className="space-y-3 pt-1">
                <div>
                  <Label className="text-xs">Nom du client</Label>
                  <Input
                    value={clientNom}
                    onChange={(e) => setClientNom(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Mode de règlement</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setModeReglement("especes")}
                      className={`p-2 rounded-md border text-xs font-semibold flex flex-col items-center gap-1 ${
                        modeReglement === "especes"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Banknote className="w-4 h-4" /> Espèces
                    </button>
                    <button
                      type="button"
                      onClick={() => setModeReglement("mobile_money")}
                      className={`p-2 rounded-md border text-xs font-semibold flex flex-col items-center gap-1 ${
                        modeReglement === "mobile_money"
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Smartphone className="w-4 h-4" /> Mobile Money
                    </button>
                    <button
                      type="button"
                      onClick={() => setModeReglement("carte")}
                      className={`p-2 rounded-md border text-xs font-semibold flex flex-col items-center gap-1 ${
                        modeReglement === "carte"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" /> Carte
                    </button>
                  </div>
                </div>

                {/* Si Espèces : Calcul du rendu de monnaie */}
                {modeReglement === "especes" && (
                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                    <div>
                      <Label className="text-[11px]">Montant reçu (FCFA)</Label>
                      <Input
                        type="number"
                        placeholder={totalPanier.toString()}
                        value={montantRecu}
                        onChange={(e) => setMontantRecu(e.target.value)}
                        className="h-8 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Monnaie à rendre</Label>
                      <div className="h-8 flex items-center font-bold text-emerald-700 text-sm mt-0.5 px-2 bg-white rounded border border-slate-200">
                        {nombre(monnaieRendue)} FCFA
                      </div>
                    </div>
                  </div>
                )}

                {/* Si Mobile Money FeexPay */}
                {modeReglement === "mobile_money" && (
                  <div className="p-2.5 bg-purple-50/70 rounded-md border border-purple-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-900">Passerelle FeexPay Bénin</span>
                      <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded font-bold">
                        Instantané
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["mtn", "moov", "celtiis"] as const).map((op) => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setMobileOperateur(op)}
                          className={`py-1 text-center rounded text-[11px] font-bold uppercase ${
                            mobileOperateur === op
                              ? "bg-purple-700 text-white"
                              : "bg-white border text-purple-800"
                          }`}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                    <div>
                      <Input
                        placeholder="N° téléphone MoMo (ex: 22997000000)"
                        value={mobileTelephone}
                        onChange={(e) => setMobileTelephone(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={panier.length === 0 || mutationVente.isPending}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-sm shadow-md"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {mutationVente.isPending
                    ? "Certification DGI e-MECeF en cours..."
                    : `Encaisser & Émettre Facture DGI (${nombre(totalPanier)} F)`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ticket de caisse certifié DGI e-MECeF */}
      <Dialog open={dialogTicketSucces} onOpenChange={setDialogTicketSucces}>
        <ModaleFiche
          titre="Vente encaissée et facture normalisée"
          sousTitre="Le ticket remis au client et sa certification fiscale électronique, côte à côte."
          badge={<Badge className="border-[#CFF1D2] bg-[#DCFCE7] text-[#14532D]">Certifié DGI</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                Le ticket et la facture sont conservés dix ans, avec la trace de l'agent qui a encaissé.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={imprimerTicketVente} className="h-12 gap-2 rounded-xl sm:h-11 font-bold border-[#0F3B27] text-[#0F3B27]">
                  <Printer className="h-4 w-4" /> Imprimer Ticket
                </Button>
                <Button
                  type="button"
                  onClick={() => setDialogTicketSucces(false)}
                  className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
                >
                  Fermer
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ColonneFiche titre="Ticket remis au client" aide="Reproduction fidèle du ticket imprimé en caisse.">
              {derniereVente ? (
                <div className="space-y-2 rounded-xl border-2 border-dashed border-[#CFF1D2] bg-[#F7F9F7] p-4 font-mono text-xs">
                  <div className="border-b border-dashed border-[#CFF1D2] pb-2 text-center">
                    <div className="text-sm font-bold text-[#0F3B27]">BESTPHARMA OFFICINE</div>
                    <div className="text-[11px] text-[#475C50]">RÉPUBLIQUE DU BÉNIN</div>
                    <div className="text-[11px] text-[#475C50]">IFU : {derniereVente.facture_emecef?.ifu_officine}</div>
                    <div className="text-[11px] text-[#475C50]">NIM : {derniereVente.facture_emecef?.nim_machine}</div>
                  </div>

                  <div className="space-y-1 border-b border-dashed border-[#CFF1D2] py-1">
                    <div>Ticket : {derniereVente.numero_ticket}</div>
                    <div>Facture DGI : {derniereVente.facture_emecef?.numero_facture_dgi}</div>
                    <div>Date : {formatDateHeure(derniereVente.created_at)}</div>
                    <div>Client : {derniereVente.client_nom}</div>
                  </div>

                  <div className="space-y-1 border-b border-dashed border-[#CFF1D2] py-1">
                    {derniereVente.lignes?.map((l: any) => (
                      <div key={l.id} className="flex justify-between gap-2">
                        <span>
                          {l.quantite} × {l.produit?.nom_commercial}
                        </span>
                        <span>{nombre(l.total_ligne)} F</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-1 text-sm font-bold text-[#0F3B27]">
                    <span>TOTAL TTC</span>
                    <span>{nombre(derniereVente.montant_net_ttc)} FCFA</span>
                  </div>
                </div>
              ) : null}
            </ColonneFiche>

            <ColonneFiche titre="Règlement et certification" aide="Contrôles à passer avant de rendre le ticket au client.">
              <div className="space-y-2 rounded-xl border-2 border-[#CFF1D2] p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#475C50]">Mode de règlement</span>
                  <span className="font-bold text-[#0F3B27]">{derniereVente?.mode_reglement}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475C50]">Montant reçu</span>
                  <span className="font-bold text-[#0F3B27]">
                    {nombre(derniereVente?.montant_recu ?? 0)} FCFA
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#CFF1D2] pt-2">
                  <span className="text-[#475C50]">Monnaie rendue</span>
                  <span className="font-bold text-[#0F3B27]">
                    {nombre(derniereVente?.monnaie_rendue ?? 0)} FCFA
                  </span>
                </div>
              </div>

              <Champ label="Code de sécurité e-MECeF" aide="Chiffres à faire figurer sur le ticket, vérifiables par l'administration fiscale.">
                <div className="rounded-xl border-2 border-[#0F3B27] bg-[#F7F9F7] px-3 py-2 text-center font-mono text-sm font-black tracking-wider text-[#0F3B27]">
                  {derniereVente?.facture_emecef?.code_mecef}
                </div>
              </Champ>

              <Champ label="QR fiscal" aide="Le client peut le scanner pour retrouver sa facture chez la Direction Générale des Impôts.">
                <div className="break-all rounded-xl border border-[#CFF1D2] bg-white px-3 py-2 font-mono text-[10px] text-[#475C50]">
                  {derniereVente?.facture_emecef?.qr_code_data}
                </div>
              </Champ>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>

      {/* Ouverture de caisse */}
      <Dialog open={dialogOuvrirOuvert} onOpenChange={setDialogOuvrirOuvert}>
        <ModaleFiche
          titre="Ouvrir la caisse du jour"
          sousTitre="Le fond de caisse déclaré ici sert de point de départ au billetage de fermeture."
          badge={<Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">Session de caisse</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                Une seule session peut être ouverte à la fois pour l'officine.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setDialogOuvrirOuvert(false)} className="h-12 rounded-xl sm:h-11">
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={mutationOuvrir.isPending}
                  onClick={() => mutationOuvrir.mutate(parseFloat(fondOuvertureSaisi) || 0)}
                  className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
                >
                  {mutationOuvrir.isPending ? "Ouverture…" : "Confirmer l'ouverture"}
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ColonneFiche titre="Fond de caisse" aide="Espèces physiquement présentes dans le tiroir au début du service.">
              <Champ label="Montant d'ouverture en espèces" obligatoire aide="En francs CFA, sans décimale.">
                <Input
                  type="number"
                  min="0"
                  value={fondOuvertureSaisi}
                  onChange={(e) => setFondOuvertureSaisi(e.target.value)}
                  placeholder="20000"
                  className="h-12 text-lg font-bold"
                />
              </Champ>
            </ColonneFiche>

            <ColonneFiche titre="Avant de confirmer" aide="Trois vérifications qui évitent les écarts en fin de journée.">
              <ul className="space-y-2 text-xs text-[#475C50]">
                <li className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] px-3 py-2">
                  Compter les coupures une à une, en présence d'un second agent si possible.
                </li>
                <li className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] px-3 py-2">
                  Le montant saisi reste modifiable tant que la première vente n'est pas encaissée.
                </li>
                <li className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] px-3 py-2">
                  Toute ouverture est journalisée avec l'agent et l'heure exacte.
                </li>
              </ul>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>

      {/* Clôture de caisse (ticket Z) */}
      <Dialog open={dialogCloturerOuvert} onOpenChange={setDialogCloturerOuvert}>
        <ModaleFiche
          titre="Clôturer la caisse du jour"
          sousTitre="Le billetage physique est comparé à la caisse théorique, puis l'écart est expliqué avant la clôture définitive."
          badge={<Badge className="border-[#FECACA] bg-[#FEE2E2] text-[#991B1B]">Ticket Z</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                La clôture est définitive : elle conserve son numéro, même si un écart est constaté.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setDialogCloturerOuvert(false)} className="h-12 rounded-xl sm:h-11">
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!fondClotureReelSaisi || mutationCloturer.isPending}
                  onClick={() =>
                    mutationCloturer.mutate({
                      fond_caisse_fermeture_reel: parseFloat(fondClotureReelSaisi),
                      notes_cloture: notesCloture,
                    })
                  }
                  className="h-12 rounded-xl font-bold sm:h-11"
                >
                  {mutationCloturer.isPending ? "Clôture…" : "Émettre le ticket Z"}
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ColonneFiche titre="Ce que dit la caisse" aide="Calculé à partir du fond d'ouverture et des ventes encaissées.">
              <div className="space-y-2 rounded-xl border-2 border-[#CFF1D2] bg-[#F7F9F7] p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#475C50]">Fond d'ouverture</span>
                  <span className="font-bold text-[#0F3B27]">
                    {nombre(session?.fond_caisse_ouverture ?? 0)} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475C50]">Encaissé en espèces</span>
                  <span className="font-bold text-[#0F3B27]">
                    {nombre(session?.total_encaisse_especes ?? 0)} FCFA
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#CFF1D2] pt-2">
                  <span className="font-bold text-[#0F3B27]">Espèces théoriques</span>
                  <span className="font-black text-[#0F3B27]">
                    {nombre(session?.fond_caisse_fermeture_theorique ?? 0)} FCFA
                  </span>
                </div>
              </div>
            </ColonneFiche>

            <ColonneFiche titre="Ce que vous avez compté" aide="Le billetage réel, puis l'explication de l'écart s'il y en a un.">
              <Champ label="Espèces réellement comptées" obligatoire aide="Somme des billets et pièces présents dans le tiroir.">
                <Input
                  type="number"
                  min="0"
                  placeholder="Montant compté"
                  value={fondClotureReelSaisi}
                  onChange={(e) => setFondClotureReelSaisi(e.target.value)}
                  className="h-12 text-lg font-bold"
                />
              </Champ>
              <Champ label="Observation de clôture" aide="« Rien à signaler », ou la cause de l'écart constaté.">
                <Input
                  placeholder="Rien à signaler"
                  value={notesCloture}
                  onChange={(e) => setNotesCloture(e.target.value)}
                  className="h-11"
                />
              </Champ>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>
    </div>
  );
}
