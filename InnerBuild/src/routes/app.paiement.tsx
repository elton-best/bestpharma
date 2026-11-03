import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, ShieldCheck, Zap, CreditCard, Sparkles, Calendar, Lock, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { statusLabel, usePayments, useProfile } from "@/lib/learner";
import { recordPaymentServerFn } from "@/lib/d1-payment.functions";
import { check4TalentsPartnerServerFn } from "@/lib/d1-partner.functions";
import { FeexPayV2Button } from "@/components/FeexPayV2Button";

const FEEXPAY_SHOP_ID = (import.meta.env as any)["VITE_FEEXPAY_ID"] || (import.meta.env as any)["VITE_FEEXPAY_SHOP_ID"] || "1fKwjCEBWqOW4YZ";
const FEEXPAY_TOKEN = (import.meta.env as any)["VITE_FEEXPAY_TOKEN"] || "";
const FEEXPAY_MODE_ENV = ((import.meta.env as any)["VITE_FEEXPAY_MODE"] || (import.meta.env as any)["FEEXPAY_MODE"] || "LIVE").toUpperCase() as "LIVE" | "SANDBOX";
const TRANCHE_PRICE_XOF = 1000;

export type TrancheInfo = {
  id: number;
  name: string;
  month: string;
  deadline: string;
  amount: number;
  description: string;
};

export const TRANCHES: TrancheInfo[] = [
  {
    id: 1,
    name: "Tranche 1",
    month: "Octobre 2026",
    deadline: "Fin Octobre 2026",
    amount: 1000,
    description: "Débloque le Studio Pratique, la soumission des exercices & l'Assistant IA.",
  },
  {
    id: 2,
    name: "Tranche 2",
    month: "Novembre 2026",
    deadline: "Fin Novembre 2026",
    amount: 1000,
    description: "Débloque l'accès complet au Registre des 45 Skills IA et leurs fichiers .md.",
  },
  {
    id: 3,
    name: "Tranche 3",
    month: "Décembre 2026",
    deadline: "Fin Décembre 2026",
    amount: 1000,
    description: "Débloque la participation au Challenge InnerBuild & Évaluations par le Jury.",
  },
  {
    id: 4,
    name: "Tranche 4",
    month: "Janvier 2027",
    deadline: "Fin Janvier 2027",
    amount: 1000,
    description: "Solde de la formation, accès illimité permanent & Délivrance du Certificat Officiel.",
  },
];

export const Route = createFileRoute("/app/paiement")({
  ssr: false,
  head: appHead("Paiement par Tranches", "Paiement en 4 tranches mensuelles de 1 000 F CFA (Octobre, Novembre, Décembre, Janvier)."),
  component: Page,
});

function Page() {
  const { data: p } = useProfile();
  const { data: pays = [] } = usePayments();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [ref, setRef] = useState("");
  const [selectedTrancheId, setSelectedTrancheId] = useState<number>(1);
  const [busy, setBusy] = useState(false);


  const isPartner = Boolean(p?.isPartner || p?.is4TalentsPartner);
  const communityName = p?.partnerCommunity || "Partenaire";
  const requiredTranchesCount = isPartner ? 2 : 4;
  const targetTotalXof = isPartner ? 2000 : 4000;

  // Calcul du nombre de tranches validées par l'apprenant
  const totalPaid = pays
    .filter((x) => x.status === "received" || x.status === "verified" || x.status === "paid")
    .reduce((acc, x) => acc + (x.amount || 1000), 0);

  const isMaster = Boolean(p?.isAdmin || p?.role === "admin" || p?.email?.toLowerCase() === "eltonhounnou27@gmail.com");
  
  // Le nombre de tranches validées doit STRICTEMENT refléter les paiements réels encaissés (1 tranche = 1 000 F CFA)
  // Ne pas marquer toutes les tranches payées si l'apprenant n'a versé qu'une seule tranche
  const tranchesPaidCount = isMaster
    ? requiredTranchesCount
    : Math.min(requiredTranchesCount, Math.floor(totalPaid / 1000));

  const isFullyPaid = isMaster || tranchesPaidCount >= requiredTranchesCount || totalPaid >= targetTotalXof;

  async function declareManual(trancheNumber: number, e: React.FormEvent) {
    e.preventDefault();
    const r = ref.trim();
    if (r.length < 4 || r.length > 80) {
      toast.error("Référence invalide");
      return;
    }
    setBusy(true);
    try {
      const res = await recordPaymentServerFn({
        data: {
          userId: p?.id || "",
          email: p?.email || "",
          reference: `TRANCHE-${trancheNumber}:${r}`,
          amount: TRANCHE_PRICE_XOF,
          status: "pending",
        },
      });

      if (res.success) {
        toast.success(`Référence pour la Tranche ${trancheNumber} envoyée ! Validation en cours.`);
        setRef("");
        qc.invalidateQueries({ queryKey: ["payments"] });
        qc.invalidateQueries({ queryKey: ["profile"] });
      } else {
        toast.error(res.error || "Envoi impossible");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <PageHeader
        eyebrow={isPartner ? `Partenariat ${communityName} (-50% Appliqué)` : "Paiement Échelonné en 4 Tranches"}
        title={isPartner ? `Plan Partenaire ${communityName} — 2 000 F CFA (2 Tranches)` : "Plan de Paiement AI Factory (1 000 F / mois)"}
        subtitle={
          isPartner
            ? `Grâce à la communauté ${communityName}, vous bénéficiez de 50% de réduction automatique. Votre formation complète ne coûte que 2 000 F CFA réglables en 2 tranches de 1 000 F CFA !`
            : "Tous les cours de la section Apprendre sont 100% gratuits et ouverts à tous ! Le paiement échelonné en 4 tranches (1 000 F CFA chacune) débloque progressivement la Pratique, les Rendus, les Challenges et la Certification."
        }
      />

      {/* Information Offre de lancement gratuit jusqu'à la fin du mois */}
      <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent p-5 shadow-sm flex items-start gap-4">
        <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-600 dark:text-emerald-400 mt-0.5">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-ink text-base flex items-center gap-2">
            Offre de Lancement — Accès 100% Gratuit jusqu'au 31 Octobre
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Vous profitez d'un accès intégral et sans restriction à la plateforme (cours, synthèses PDF, Coach IA, ateliers pratiques). <strong>Aucun règlement immédiat n'est requis avant la fin du mois</strong>. Vous pouvez régler votre première tranche par anticipation ou à la fin du mois selon votre rythme.
          </p>
        </div>
      </div>

      {/* Bannière Partenaire si éligible */}
      {isPartner && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-5 shadow-sm flex items-start gap-4">
          <div className="rounded-xl bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400 mt-0.5">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              Statut Membre Partenaire {communityName} Actif (-50%)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La réduction de <strong>50%</strong> est appliquée à votre compte ({p?.email}). Vous ne réglez que <strong>2 Tranches de 1 000 F CFA (2 000 F CFA au total)</strong>. Seules ces 2 tranches vous sont demandées pour débloquer votre accès illimité (une seule réduction appliquée même en cas de double affiliation BWT & 4Talents).
            </p>
          </div>
        </div>
      )}

      {/* Progression Globale des Tranches */}
      <Panel className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Niveau d'Avancement Financier</span>
            <h2 className="text-xl sm:text-2xl font-black text-ink mt-0.5">
              {tranchesPaidCount}/{requiredTranchesCount} Tranches Réglées ({tranchesPaidCount * 1000} F CFA / {targetTotalXof.toLocaleString("fr-FR")} F CFA)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isFullyPaid ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" : "bg-accent/15 text-accent border border-accent/30"}`}>
              {isFullyPaid ? "Solde Intégral Effectué (Accès Illimité)" : `${tranchesPaidCount}/${requiredTranchesCount} Tranche(s) Active(s)`}
            </span>
          </div>
        </div>

        {/* Timeline des tranches (2 tranches si partenaire, 4 sinon) */}
        <div className={`grid grid-cols-1 ${isPartner ? "sm:grid-cols-2 max-w-2xl" : "sm:grid-cols-2 lg:grid-cols-4"} gap-4 mt-6`}>
          {(isPartner ? TRANCHES.slice(0, 2) : TRANCHES).map((t) => {
            const isPaid = tranchesPaidCount >= t.id;
            const isCurrent = !isPaid && (t.id === tranchesPaidCount + 1);
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTrancheId(t.id)}
                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                  isPaid
                    ? "border-emerald-500/30 bg-emerald-500/5 text-ink cursor-pointer"
                    : isCurrent
                    ? "border-accent bg-accent/5 ring-2 ring-accent/20 shadow-md cursor-pointer"
                    : "border-line bg-card/60 opacity-85 cursor-pointer"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">{t.name}</span>
                    {isPaid ? (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Payée
                      </span>
                    ) : isCurrent ? (
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> À régler
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" /> À venir
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-bold text-ink text-base">{t.month}</h3>
                  <p className="mt-1 text-xs text-accent font-black">
                    {t.amount.toLocaleString("fr-FR")} F CFA
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                    {t.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-accent" /> {t.deadline}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Zone de Règlement de la Tranche */}
      <div className="grid gap-6 lg:grid-cols-5 items-start">
        <Panel title={`Régler la Tranche ${selectedTrancheId} (${TRANCHES.find(t => t.id === selectedTrancheId)?.month})`} className="lg:col-span-3">
          {tranchesPaidCount >= selectedTrancheId ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                Tranche {selectedTrancheId} Validée avec succès !
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Votre paiement de 1 000 F CFA pour la tranche {selectedTrancheId} ({TRANCHES.find(t => t.id === selectedTrancheId)?.month}) a bien été réceptionné. Vos fonctionnalités associées sont actives.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border border-line bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Tranche sélectionnée</span>
                  <span className="font-display font-black text-xl text-accent">1 000 F CFA</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Échéance : <strong>{TRANCHES.find(t => t.id === selectedTrancheId)?.deadline}</strong> — {TRANCHES.find(t => t.id === selectedTrancheId)?.description}
                </p>
              </div>

              {/* UNIFIED PAYMENT CARD */}
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 space-y-5 shadow-xs">
                <div className="space-y-1">
                  <h4 className="font-bold text-ink text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-accent" />
                    Règlement par Mobile Money (MTN, Moov, Celtiis, Orange, Wave) ou Carte
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Sélectionnez votre réseau et validez le paiement de 1 000 F CFA sur votre téléphone.
                  </p>
                </div>

                {!FEEXPAY_SHOP_ID || !FEEXPAY_TOKEN ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
                    Configuration FeexPay non disponible. Déclarez votre référence ci-dessous.
                  </p>
                ) : (
                  <FeexPayV2Button
                    shopId={FEEXPAY_SHOP_ID}
                    token={FEEXPAY_TOKEN}
                    amount={TRANCHE_PRICE_XOF}
                    description={`Paiement Tranche ${selectedTrancheId} AI Factory`}
                    mode={FEEXPAY_MODE_ENV}
                    customId={`FEEX-T${selectedTrancheId}-${p?.id || "guest"}-${Date.now().toString().slice(-6)}`}
                    buttonText={`Payer la Tranche ${selectedTrancheId} (1 000 F CFA)`}
                    buttonClass="w-full py-3.5 px-5 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                    callback={async (response: any) => {
                      if (response?.status === "SUCCESSFUL" || response?.status === "successful") {
                        toast.success(`Tranche ${selectedTrancheId} payée avec succès !`);
                        await recordPaymentServerFn({
                          data: {
                            userId: p?.id || "",
                            email: p?.email || "",
                            reference: response.reference || response.transaction_id || `FEEX-T${selectedTrancheId}-${Date.now()}`,
                            amount: TRANCHE_PRICE_XOF,
                            status: "received",
                          },
                        });
                        qc.invalidateQueries({ queryKey: ["profile"] });
                        qc.invalidateQueries({ queryKey: ["payments"] });
                      } else {
                        toast.info("Statut transaction : " + (response?.message || response?.status || "En attente"));
                      }
                    }}
                  />
                )}

                {/* DECLARATION MANUELLE PAR REFERENCE */}
                <div className="pt-4 border-t border-line/60 space-y-2">
                  <p className="text-xs font-semibold text-ink">
                    Vous avez déjà réglé hors ligne ou par virement direct ?
                  </p>
                  <form onSubmit={(e) => declareManual(selectedTrancheId, e)} className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={ref}
                      onChange={(e) => setRef(e.target.value)}
                      required
                      placeholder="Saisissez votre reçu ou numéro de référence"
                      className="flex-1 rounded-xl border border-line bg-paper px-3.5 py-2 text-xs text-ink outline-none focus:border-accent"
                    />
                    <button disabled={busy} className="btn-base btn-ghost text-xs whitespace-nowrap">
                      {busy ? "Envoi…" : `Valider la référence`}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Historique des tranches */}
        <div className="lg:col-span-2 space-y-6">

          <Panel title="Historique de vos tranches">
            {pays.length === 0 ? (
              <Empty title="Aucune transaction" text="Vos reçus et références de tranches apparaîtront ici." />
            ) : (
              <ul className="divide-y divide-line">
                {pays.map((x) => (
                  <li key={x.id} className="py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-ink truncate">{x.reference}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusLabel[x.status]?.cls || "bg-emerald-500/10 text-emerald-600"}`}>
                        {statusLabel[x.status]?.label || "Payé"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span>{new Date(x.created_at).toLocaleDateString("fr-FR")}</span>
                      <span className="font-bold text-accent">{x.amount || 1000} F CFA</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
