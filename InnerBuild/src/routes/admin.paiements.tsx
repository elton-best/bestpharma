import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { appHead, Empty, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { fdate, useAdmin, useAdminActions } from "@/lib/admin";
import { statusLabel } from "@/lib/learner";
import { Check, Clock, ShieldCheck, DollarSign, Users, Award, AlertCircle, Plus, X } from "lucide-react";

export const Route = createFileRoute("/admin/paiements")({
  head: appHead("Gestion des Paiements & Tranches", "Vérifier les tranches de paiement et les références FeexPay."),
  component: Page,
});

const PARTNER_EMAILS = new Set([
  "zekiyathadjaho8@gmail.com",
  "sabalimathnaro1@gmail.com",
  "divineakoha27@gmail.com",
  "marlysedogble@gmail.com",
  "yebinibah99@gmail.com",
  "jennyferedjrokinto0@gmail.com",
  "esmeraldadesouza472@gmail.com",
  "shirley.anago@gmail.com",
  "aladecorina@gmail.com",
  "abdoulayemansouratou@gmail.com",
  "aminoumalickmich@gmail.com",
  "hermionekpenonhoun@gmail.com",
  "kouagoufernandez2@gmail.com",
  "rosetuk71@gmail.com",
  "elielokossou7@gmail.com",
  "theophilesedonou@gmail.com",
  "hodonoueudeshdn@gmail.com",
  "loiktgn@gmail.com",
  "urielkpegbe@gmail.com",
  "akwnolouf@gmail.com",
  "junioromyale994@gmail.com",
  "viderotk@gmail.com",
  "aniambossoustane@gmail.com",
  "agbodjimawoussisandrine@gmail.com",
  "koueloalladassilenoumibelmira@gmail.com",
  "immaculeeaholou@gmail.com",
  "geduldamadou@gmail.com",
  "eltonhounnou27@gmail.com",
]);

function isPartnerEmail(email?: string): boolean {
  if (!email) return false;
  return PARTNER_EMAILS.has(email.toLowerCase().trim());
}

const isConfirmedPay = (p: { status?: string }) =>
  p.status === "received" || p.status === "verified" || p.status === "paid" || p.status === "successful";

function Page() {
  const a = useAdmin();
  const { refresh, verifyPayment, addManualPayment } = useAdminActions();
  const [f, setF] = useState<"confirmed" | "pending" | "learners" | "all">("confirmed");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [manualAmount, setManualAmount] = useState(1000);
  const [manualRef, setManualRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (a.error) return <ErrorBox error={a.error} onRetry={refresh} />;
  if (a.loading) return <Loading />;

  const allPayments = a.allPaymentsList || a.payments.data || [];
  const confirmedPayments = allPayments.filter(isConfirmedPay);
  const totalCollected = confirmedPayments.reduce((sum, p) => sum + (Number(p.amount) || 1000), 0);

  // Apprenants avec versements
  const learnersWithPays = a.learners.filter((l) => {
    const userPays = allPayments.filter(
      (p) =>
        (p.user_id === l.id ||
          p.user_id?.toLowerCase() === l.email?.toLowerCase() ||
          (l.email && p.reference?.toLowerCase().includes(l.email.toLowerCase()))) &&
        isConfirmedPay(p)
    );
    return userPays.length > 0;
  });

  const fullyPaidCount = a.learners.filter((l) => {
    const userPays = allPayments.filter(
      (p) =>
        (p.user_id === l.id ||
          p.user_id?.toLowerCase() === l.email?.toLowerCase() ||
          (l.email && p.reference?.toLowerCase().includes(l.email.toLowerCase()))) &&
        isConfirmedPay(p)
    );
    const sum = userPays.reduce((acc, p) => acc + (Number(p.amount) || 1000), 0);
    const target = isPartnerEmail(l.email) ? 2000 : 4000;
    return sum >= target;
  }).length;

  const list =
    f === "pending"
      ? a.pendingPays
      : f === "confirmed"
      ? confirmedPayments
      : allPayments;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance & Suivi"
        title="Gestion des Paiements & Tranches"
        subtitle="Rapprochez les références FeexPay (1 000 F / tranche), consultez l'avancement financier de chaque apprenant et débloquez les tranches."
      />

      {/* Cartes de statistiques clés en temps réel */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Total Encaissé"
          value={`${totalCollected.toLocaleString("fr-FR")} F CFA`}
          hint={`${confirmedPayments.length} paiements confirmés`}
        />
        <Stat
          label="Apprenants Payeurs"
          value={String(learnersWithPays.length)}
          hint={`sur ${a.learners.length} apprenants inscrits`}
        />
        <Stat
          label="Formations Soldées (100%)"
          value={String(fullyPaidCount)}
          hint="Toutes tranches réglées"
        />
        <Stat
          label="À Vérifier (Manuel)"
          value={String(a.pendingPays.length)}
          hint={a.pendingPays.length ? "Validation en attente" : "Aucun retard"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setF("confirmed")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              f === "confirmed"
                ? "bg-accent text-accent-foreground shadow-xs"
                : "bg-card border border-line text-muted-foreground hover:bg-muted"
            }`}
          >
            Paiements Confirmés ({confirmedPayments.length})
          </button>
          <button
            onClick={() => setF("learners")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              f === "learners"
                ? "bg-accent text-accent-foreground shadow-xs"
                : "bg-card border border-line text-muted-foreground hover:bg-muted"
            }`}
          >
            Suivi des Tranches Apprenants ({a.learners.length})
          </button>
          <button
            onClick={() => setF("pending")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              f === "pending"
                ? "bg-accent text-accent-foreground shadow-xs"
                : "bg-card border border-line text-muted-foreground hover:bg-muted"
            }`}
          >
            À vérifier ({a.pendingPays.length})
          </button>
          <button
            onClick={() => setF("all")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              f === "all"
                ? "bg-accent text-accent-foreground shadow-xs"
                : "bg-card border border-line text-muted-foreground hover:bg-muted"
            }`}
          >
            Historique Complet ({allPayments.length})
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-base btn-primary text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Enregistrer un paiement
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-line rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                Enregistrer un Paiement
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-ink transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedLearnerId) return;
                setIsSubmitting(true);
                const l = a.learners.find((x) => x.id === selectedLearnerId);
                await addManualPayment({
                  userId: selectedLearnerId,
                  email: l?.email,
                  amount: Number(manualAmount) || 1000,
                  reference: manualRef.trim() || `MANUAL-${Date.now().toString().slice(-6)}`,
                });
                setIsSubmitting(false);
                setShowAddModal(false);
                setSelectedLearnerId("");
                setManualRef("");
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Sélectionner l'apprenant *
                </label>
                <select
                  required
                  value={selectedLearnerId}
                  onChange={(e) => setSelectedLearnerId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="">-- Choisir un apprenant ({a.learners.length}) --</option>
                  {a.learners.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.full_name || "Apprenant"} ({l.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Montant encaissé (F CFA) *
                </label>
                <select
                  value={manualAmount}
                  onChange={(e) => setManualAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-accent"
                >
                  <option value={1000}>1 000 F CFA (1 Tranche)</option>
                  <option value={2000}>2 000 F CFA (2 Tranches / Solde Partenaire)</option>
                  <option value={3000}>3 000 F CFA (3 Tranches)</option>
                  <option value={4000}>4 000 F CFA (4 Tranches / Solde Total)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Référence du paiement (reçu Mobile Money, virement, etc.)
                </label>
                <input
                  type="text"
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  placeholder="Ex : MTN-BJ-982347 ou ESPÈCES-01"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-base btn-ghost text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedLearnerId}
                  className="btn-base btn-primary text-xs"
                >
                  {isSubmitting ? "Enregistrement…" : "Confirmer le paiement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {f === "learners" ? (
        <Panel title="Niveaux de paiement des apprenants (Tranches de 1 000 F)">
          <div className="divide-y divide-line">
            {a.learners.map((l) => {
              const userPays = allPayments.filter(
                (p) =>
                  (p.user_id === l.id ||
                    p.user_id?.toLowerCase() === l.email?.toLowerCase() ||
                    (l.email && p.reference?.toLowerCase().includes(l.email.toLowerCase()))) &&
                  isConfirmedPay(p)
              );
              const totalPaid = userPays.reduce((sum, p) => sum + (Number(p.amount) || 1000), 0);
              const isPartner = isPartnerEmail(l.email);
              const requiredTranches = isPartner ? 2 : 4;
              const totalExpected = isPartner ? 2000 : 4000;
              const isMaster = Boolean(
                (l as any).isAdmin ||
                  (l as any).role === "admin" ||
                  l.email?.toLowerCase() === "eltonhounnou27@gmail.com"
              );
              const tranchesCount = isMaster
                ? requiredTranches
                : Math.min(requiredTranches, Math.floor(totalPaid / 1000));

              const tranchesList = isPartner
                ? [
                    { num: 1, label: "Tranche 1", amount: 1000 },
                    { num: 2, label: "Tranche 2", amount: 1000 },
                  ]
                : [
                    { num: 1, label: "Octobre", amount: 1000 },
                    { num: 2, label: "Novembre", amount: 1000 },
                    { num: 3, label: "Décembre", amount: 1000 },
                    { num: 4, label: "Janvier", amount: 1000 },
                  ];

              return (
                <div key={l.id} className="py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink text-sm flex flex-wrap items-center gap-2">
                        <span>{l.full_name || "Apprenant"}</span>
                        <span className="font-mono text-xs font-normal text-muted-foreground">({l.email})</span>
                        {isPartner && (
                          <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold border border-emerald-500/30">
                            Membre Partenaire (2 Tranches · 2 000 F)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Inscrit le {fdate(l.created_at)} · Total versé : <strong>{totalPaid.toLocaleString("fr-FR")} F CFA</strong> / {totalExpected.toLocaleString("fr-FR")} F CFA
                      </p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                      tranchesCount >= requiredTranches
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : tranchesCount >= 1
                        ? "bg-accent/15 text-accent border border-accent/30"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {tranchesCount}/{requiredTranches} Tranches Validées ({tranchesCount * 1000} F CFA)
                    </span>
                  </div>

                  {/* Grille visuelle des tranches (2 pour partenaires, 4 pour standard) */}
                  <div className={`grid gap-2 ${isPartner ? "grid-cols-2 max-w-md" : "grid-cols-2 sm:grid-cols-4"}`}>
                    {tranchesList.map((t) => {
                      const isTranchePaid = tranchesCount >= t.num;
                      return (
                        <div
                          key={t.num}
                          className={`rounded-xl border p-2.5 text-xs flex flex-col justify-between ${
                            isTranchePaid
                              ? "border-emerald-500/30 bg-emerald-500/5 text-ink"
                              : "border-line bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>T{t.num} · {t.label}</span>
                            {isTranchePaid ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <p className="mt-1 text-[11px] font-mono">{t.amount} F CFA</p>
                          <span className="mt-1 text-[10px] font-semibold uppercase">
                            {isTranchePaid ? "Payée" : "À régler"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : (
        <Panel title={f === "pending" ? `Paiements en attente (${list.length})` : `Tous les paiements (${list.length})`}>
          {list.length ? (
            <ul className="divide-y divide-line">
              {list.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-all font-mono font-semibold text-ink">
                      {p.reference} · {(p.amount || 1000).toLocaleString("fr-FR")} F CFA
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.who(p.user_id)} · Reçu le {fdate(p.created_at)}
                    </p>
                  </div>
                  {p.status === "pending" ? (
                    <div className="flex gap-2">
                      <button onClick={() => verifyPayment(p.id, p.user_id, true)} className="btn-base btn-glow flex-1 sm:flex-none text-xs">
                        Vérifier et activer tranche
                      </button>
                      <button onClick={() => verifyPayment(p.id, p.user_id, false)} className="btn-base btn-ghost flex-1 sm:flex-none text-xs text-destructive">
                        Rejeter
                      </button>
                    </div>
                  ) : (
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusLabel[p.status]?.cls || "bg-emerald-500/10 text-emerald-600"}`}>
                      {statusLabel[p.status]?.label ?? p.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Rien à vérifier" text="Aucun paiement en attente d'approbation." />
          )}
        </Panel>
      )}
    </div>
  );
}
