import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpenCheck,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { formatDate, nombre } from "@/lib/format";
import { telechargerCsv, imprimerFicheOfficielle } from "@/lib/export-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/comptabilite")({
  head: () => ({
    meta: [
      { title: "Comptabilité SYSCOHADA — BestPharma" },
      {
        name: "description",
        content: "Journal des ventes et grand-livre selon le plan comptable SYSCOHADA révisé (Bénin / OHADA).",
      },
    ],
  }),
  component: PageComptabilite,
});

interface EcritureItem {
  id: string;
  date_piece: string;
  numero_piece: string;
  numero_compte: string;
  libelle_compte: string;
  libelle_ecriture: string;
  debit: number;
  credit: number;
  journal_code: string;
}

interface BalanceCompte {
  numero_compte: string;
  libelle_compte: string;
  total_debit: number;
  total_credit: number;
}

interface ClotureItem {
  id: string;
  numero_session: string;
  fond_caisse_ouverture: number;
  total_encaisse_especes: number;
  total_encaisse_mobile_money: number;
  total_encaisse_carte: number;
  fond_caisse_fermeture_reel: number;
  ecart_caisse: number;
  opened_at: string;
  closed_at: string;
  caissier?: { name: string };
  notes_cloture?: string;
}

function PageComptabilite() {
  const [onglet, setOnglet] = useState<"journal" | "balance" | "clotures">("journal");
  const [recherche, setRecherche] = useState("");

  const { data: journalData, isLoading: loadingJournal } = useQuery<{
    data: { data: EcritureItem[]; total: number };
    balance: BalanceCompte[];
  }>({
    queryKey: ["journal-ventes"],
    queryFn: () => api.get("/comptabilite/journal-ventes"),
  });

  const { data: cloturesData, isLoading: loadingClotures } = useQuery<{
    data: { data: ClotureItem[]; total: number };
  }>({
    queryKey: ["clotures-caisse"],
    queryFn: () => api.get("/comptabilite/clotures"),
  });

  const ecritures = journalData?.data?.data || [];
  const balance = journalData?.balance || [];
  const clotures = cloturesData?.data?.data || [];

  const ecrituresFiltrees = ecritures.filter(
    (e) =>
      e.numero_piece.toLowerCase().includes(recherche.toLowerCase()) ||
      e.numero_compte.includes(recherche) ||
      e.libelle_ecriture.toLowerCase().includes(recherche.toLowerCase())
  );

  const exporterJournalCsv = () => {
    if (ecritures.length === 0) {
      toast.error("Aucune écriture comptable à exporter.");
      return;
    }
    telechargerCsv(
      ecritures.map((e) => ({
        date: e.date_piece,
        journal: e.journal_code,
        piece: e.numero_piece,
        compte: e.numero_compte,
        libelle_compte: e.libelle_compte,
        libelle_ecriture: e.libelle_ecriture,
        debit: e.debit,
        credit: e.credit,
      })),
      `bestpharma_journal_ventes_${new Date().toISOString().split("T")[0]}`,
      [
        { cle: "date", label: "Date Pièce" },
        { cle: "journal", label: "Code Journal" },
        { cle: "piece", label: "N° Pièce" },
        { cle: "compte", label: "N° Compte" },
        { cle: "libelle_compte", label: "Intitulé Compte" },
        { cle: "libelle_ecriture", label: "Libellé Écriture" },
        { cle: "debit", label: "Débit (FCFA)" },
        { cle: "credit", label: "Crédit (FCFA)" },
      ]
    );
    toast.success("Journal des ventes exporté en CSV !");
  };

  const imprimerJournalComptable = () => {
    if (ecritures.length === 0) {
      toast.error("Aucune écriture comptable disponible pour l'impression.");
      return;
    }
    const totalDebit = ecritures.reduce((acc, e) => acc + Number(e.debit), 0);
    const totalCredit = ecritures.reduce((acc, e) => acc + Number(e.credit), 0);
    const lignesHtml = ecritures
      .map(
        (e) => `
      <tr>
        <td>${e.date_piece}</td>
        <td style="font-family: monospace;">${e.numero_piece}</td>
        <td style="font-family: monospace; font-weight: bold; color: #0F3B27;">${e.numero_compte}</td>
        <td>${e.libelle_compte}</td>
        <td>${e.libelle_ecriture}</td>
        <td style="text-align: right; font-family: monospace;">${Number(e.debit) > 0 ? nombre(e.debit) + " F" : "—"}</td>
        <td style="text-align: right; font-family: monospace;">${Number(e.credit) > 0 ? nombre(e.credit) + " F" : "—"}</td>
      </tr>`
      )
      .join("");

    const html = `
      <p style="font-size: 12px; color: #475C50; margin-bottom: 15px;">
        Journal officiel des ventes de l'officine (Code Journal : VT) établi conformément aux règles du Plan Comptable SYSCOHADA Révisé (Bénin / OHADA). Écritures équilibrées en partie double.
      </p>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>N° Pièce</th>
            <th>Compte</th>
            <th>Intitulé Compte</th>
            <th>Libellé</th>
            <th style="text-align: right;">Débit (FCFA)</th>
            <th style="text-align: right;">Crédit (FCFA)</th>
          </tr>
        </thead>
        <tbody>
          ${lignesHtml}
          <tr style="background: #F7F9F7; font-weight: bold;">
            <td colspan="5" style="text-align: right;">TOTAUX GÉNÉRAUX ÉQUILIBRÉS :</td>
            <td style="text-align: right; color: #0F3B27;">${nombre(totalDebit)} FCFA</td>
            <td style="text-align: right; color: #0F3B27;">${nombre(totalCredit)} FCFA</td>
          </tr>
        </tbody>
      </table>
    `;
    imprimerFicheOfficielle("JOURNAL DES VENTES — SYSCOHADA RÉVISÉ", html);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Comptabilité SYSCOHADA Révisé
            </h1>
            <Badge variant="outline" className="border-emerald-600 text-emerald-700 bg-emerald-50">
              Plan Comptable OHADA
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Journal des ventes (VT), balance générale des comptes de trésorerie (5311/5121) et historique des clôtures Ticket Z.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exporterJournalCsv}
            className="gap-1.5 text-xs font-bold border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30"
          >
            <Download className="w-4 h-4" /> Exporter Journal (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={imprimerJournalComptable}
            className="gap-1.5 text-xs font-bold border-[#0F3B27] text-[#0F3B27] hover:bg-[#CFF1D2]/30"
          >
            <Printer className="w-4 h-4" /> Imprimer Grand Livre
          </Button>
        </div>
      </div>

      {/* Onglets de navigation comptable */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Button
          variant={onglet === "journal" ? "default" : "ghost"}
          size="sm"
          onClick={() => setOnglet("journal")}
          className={onglet === "journal" ? "bg-emerald-600 text-white text-xs" : "text-xs"}
        >
          Journal des Ventes ({ecritures.length})
        </Button>
        <Button
          variant={onglet === "balance" ? "default" : "ghost"}
          size="sm"
          onClick={() => setOnglet("balance")}
          className={onglet === "balance" ? "bg-emerald-600 text-white text-xs" : "text-xs"}
        >
          Balance des Comptes ({balance.length})
        </Button>
        <Button
          variant={onglet === "clotures" ? "default" : "ghost"}
          size="sm"
          onClick={() => setOnglet("clotures")}
          className={onglet === "clotures" ? "bg-emerald-600 text-white text-xs" : "text-xs"}
        >
          Rapports Clôtures (Tickets Z)
        </Button>
      </div>

      {/* Contenu : Journal des ventes */}
      {onglet === "journal" && (
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Écritures du Journal des Ventes (Code Journal : VT)
                </CardTitle>
                <CardDescription>
                  Génération automatique en partie double : Débit 5311/5121 et Crédit 7011 / 4431.
                </CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filtrer compte, pièce, libellé..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingJournal ? (
              <div className="p-8 text-center text-slate-500">Chargement des écritures...</div>
            ) : ecrituresFiltrees.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Aucune écriture comptable enregistrée.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left font-mono text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 font-semibold">Date</th>
                      <th className="py-3 px-3 font-semibold">N° Pièce</th>
                      <th className="py-3 px-3 font-semibold">Compte</th>
                      <th className="py-3 px-3 font-semibold font-sans">Intitulé du Compte & Libellé</th>
                      <th className="py-3 px-3 font-semibold text-right">Débit (FCFA)</th>
                      <th className="py-3 px-3 font-semibold text-right">Crédit (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ecrituresFiltrees.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 text-slate-600">{e.date_piece}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{e.numero_piece}</td>
                        <td className="py-2.5 px-3 font-black text-emerald-800 bg-emerald-50/50">
                          {e.numero_compte}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-semibold text-slate-900">{e.libelle_compte}</div>
                          <div className="text-[11px] text-slate-500">{e.libelle_ecriture}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {Number(e.debit) > 0 ? nombre(e.debit) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {Number(e.credit) > 0 ? nombre(e.credit) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contenu : Balance générale des comptes */}
      {onglet === "balance" && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Balance des Comptes SYSCOHADA
            </CardTitle>
            <CardDescription>
              Cumul des débits, crédits et soldes par compte comptable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-3 px-4 font-semibold font-mono">Compte</th>
                    <th className="py-3 px-4 font-semibold">Intitulé du Compte OHADA</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Débit</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Crédit</th>
                    <th className="py-3 px-4 font-semibold text-right">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {balance.map((b) => {
                    const solde = Number(b.total_debit) - Number(b.total_credit);
                    return (
                      <tr key={b.numero_compte} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                          {b.numero_compte}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{b.libelle_compte}</td>
                        <td className="py-3 px-4 text-right font-mono">
                          {nombre(b.total_debit)} FCFA
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {nombre(b.total_credit)} FCFA
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {solde >= 0 ? (
                            <span className="text-emerald-700">+{nombre(solde)} F (D)</span>
                          ) : (
                            <span className="text-purple-700">{nombre(solde)} F (C)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenu : Historique des Clôtures (Tickets Z) */}
      {onglet === "clotures" && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Historique des Clôtures de Caisse Journalières (Tickets Z)
            </CardTitle>
            <CardDescription>
              Traçabilité des contrôles de fin de journée, encaissements par canal et écarts constatés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingClotures ? (
              <div className="p-8 text-center text-slate-500">Chargement des clôtures...</div>
            ) : clotures.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Aucune clôture de caisse définitive enregistrée.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 font-semibold">N° Session</th>
                      <th className="py-3 px-3 font-semibold">Période</th>
                      <th className="py-3 px-3 font-semibold">Caissier</th>
                      <th className="py-3 px-3 font-semibold text-right">Espèces</th>
                      <th className="py-3 px-3 font-semibold text-right">Mobile Money</th>
                      <th className="py-3 px-3 font-semibold text-right">Billetage Réel</th>
                      <th className="py-3 px-3 font-semibold text-center">Écart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clotures.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {c.numero_session}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {formatDate(c.opened_at)} au{" "}
                          {formatDate(c.closed_at)}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900">
                          {c.caissier?.name || "Caissier"}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {nombre(c.total_encaisse_especes)} F
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-purple-700">
                          {nombre(c.total_encaisse_mobile_money)} F
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {nombre(c.fond_caisse_fermeture_reel)} F
                        </td>
                        <td className="py-3 px-3 text-center">
                          {Number(c.ecart_caisse) === 0 ? (
                            <Badge variant="success" className="text-[10px]">
                              0 F (Exact)
                            </Badge>
                          ) : Number(c.ecart_caisse) > 0 ? (
                            <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                              +{c.ecart_caisse} F (Excédent)
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 text-[10px]">
                              {c.ecart_caisse} F (Déficit)
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
