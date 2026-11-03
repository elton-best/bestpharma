import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { appHead, Bar, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { certId, fdate, useAdmin, useAdminActions } from "@/lib/admin";
import {
  CertificateTemplate,
  type CertificateData,
  toTitleCase,
} from "@/components/CertificateTemplate";
import {
  Award,
  Eye,
  X,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  ExternalLink,
  Download,
  Send,
  RefreshCw,
  Sparkles,
  Loader2,
  Trophy,
  Users,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateCertifigoCertificateServerFn,
  getCertificatesServerFn,
  syncCertifigoCertificateServerFn,
  sendCertifigoEmailServerFn,
  type DbCertificate,
} from "@/lib/certifigo.functions";
import { CERTIFIGO_DEFAULT_TEMPLATES } from "@/lib/certifigo";

export const Route = createFileRoute("/admin/certificats")({
  head: appHead(
    "Certificats Officiels Certifigo",
    "Génération et distribution infalsifiable des certificats Formation et Hackathon via Certifigo."
  ),
  component: AdminCertificatsPage,
});

export function AdminCertificatsPage() {
  const a = useAdmin();
  const { refresh } = useAdminActions();
  const qc = useQueryClient();

  const [currentTab, setCurrentTab] = useState<"formation" | "hackathon">("formation");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCert, setActiveCert] = useState<CertificateData | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // Modal de génération Certifigo
  const [modalOpen, setModalOpen] = useState(false);
  const [targetLearner, setTargetLearner] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    CERTIFIGO_DEFAULT_TEMPLATES.formation
  );
  const [sendEmailImmediately, setSendEmailImmediately] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Charger les certificats réels depuis D1
  const {
    data: certsResponse,
    isLoading: isCertsLoading,
    refetch: refetchCerts,
  } = useQuery({
    queryKey: ["admin", "certificates"],
    queryFn: async () => {
      const res = await getCertificatesServerFn();
      return res.certificates || [];
    },
    staleTime: 1000 * 30,
  });

  const dbCertificates = certsResponse || [];

  // Indexation des certificats par user_id et type
  const certMap = useMemo(() => {
    const map = new Map<string, DbCertificate>();
    for (const c of dbCertificates) {
      map.set(`${c.user_id}_${c.type}`, c);
    }
    return map;
  }, [dbCertificates]);

  if (a.error) return <ErrorBox error={a.error} onRetry={refresh} />;
  if (a.loading || isCertsLoading) return <Loading />;

  // Apprenants éligibles formation (100% complété)
  const doneFormation = a.learners.filter((p) => a.pctOf(p.id) >= 100);
  const inProgressFormation = a.learners.filter((p) => {
    const v = a.pctOf(p.id);
    return v >= 50 && v < 100;
  });

  // Liste des apprenants pour le Hackathon (tous les apprenants / inscrits éligibles)
  const hackathonLearners = a.learners;

  const filteredLearners = (currentTab === "formation" ? doneFormation : hackathonLearners).filter(
    (p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q)
      );
    }
  );

  function openPreview(userId: string, name: string, id: string, date: string) {
    setActiveUserId(userId);
    setActiveCert({
      id,
      recipientName: toTitleCase(name),
      projectTitle:
        currentTab === "formation"
          ? "Certificat de formation AI Factory Accelerator"
          : "Certificat de participation au The Factory Hackathon",
      dateStr: date,
      type: currentTab,
    });
  }

  function openGenerateModal(p: { id: string; full_name: string; email: string }) {
    setTargetLearner({
      id: p.id,
      name: toTitleCase(p.full_name || p.email),
      email: p.email,
    });
    setSelectedTemplateId(
      currentTab === "formation"
        ? CERTIFIGO_DEFAULT_TEMPLATES.formation
        : CERTIFIGO_DEFAULT_TEMPLATES.hackathon
    );
    setModalOpen(true);
  }

  async function handleConfirmGenerate() {
    if (!targetLearner) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Connexion à l'API Certifigo en cours...");

    try {
      const res = await generateCertifigoCertificateServerFn({
        data: {
          userId: targetLearner.id,
          recipientName: targetLearner.name,
          recipientEmail: targetLearner.email,
          type: currentTab,
          templateId: selectedTemplateId,
          sendEmailImmediately,
          notifyInApp,
        },
      });

      if (!res.success || !res.certificate) {
        throw new Error(res.error || "Échec de génération Certifigo");
      }

      toast.success(
        `Certificat Certifigo généré avec succès pour ${targetLearner.name} !`,
        { id: toastId }
      );

      setModalOpen(false);
      setTargetLearner(null);
      await refetchCerts();
      qc.invalidateQueries({ queryKey: ["admin", "certificates"] });
    } catch (err: any) {
      toast.error("Erreur : " + err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSyncCert(cert: DbCertificate) {
    setSyncingId(cert.id);
    try {
      const res = await syncCertifigoCertificateServerFn({
        data: { certificateId: cert.id },
      });
      if (res.success) {
        toast.success("Statut synchronisé avec Certifigo");
        await refetchCerts();
      } else {
        toast.error("Erreur synchronisation : " + res.error);
      }
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    } finally {
      setSyncingId(null);
    }
  }

  async function handleResendEmail(cert: DbCertificate) {
    if (!cert.certifigo_campaign_id) return;
    const tid = toast.loading("Envoi de l'email officiel Certifigo...");
    try {
      const res = await sendCertifigoEmailServerFn({
        data: { campaignId: cert.certifigo_campaign_id, resend: true },
      });
      if (res.success) {
        toast.success("Email Certifigo réexpédié avec succès !", { id: tid });
      } else {
        toast.error("Erreur d'envoi : " + (res.error || "Limite atteinte"), { id: tid });
      }
    } catch (e: any) {
      toast.error("Erreur : " + e.message, { id: tid });
    }
  }

  // Génération en lot
  async function handleBatchGenerate() {
    const list = currentTab === "formation" ? doneFormation : hackathonLearners;
    const pending = list.filter((p) => {
      const cert = certMap.get(`${p.id}_${currentTab}`);
      return !cert || cert.status !== "completed";
    });

    if (pending.length === 0) {
      toast.info("Tous les apprenants éligibles disposent déjà d'un certificat complété.");
      return;
    }

    // Certifigo limite d'envoi batch recommandée : 50 maximum
    const batchList = pending.slice(0, 50);
    const confirmed = window.confirm(
      `Voulez-vous lancer la génération Certifigo pour ${batchList.length} apprenant(s) éligible(s) ?`
    );
    if (!confirmed) return;

    setIsBatchRunning(true);
    setBatchProgress({ current: 0, total: batchList.length });
    const batchToast = toast.loading(`Génération en lot : 0 / ${batchList.length}...`);

    let successCount = 0;
    for (let i = 0; i < batchList.length; i++) {
      const learner = batchList[i];
      setBatchProgress({ current: i + 1, total: batchList.length });
      toast.loading(`Génération en cours : ${i + 1} / ${batchList.length} (${learner.full_name || learner.email})...`, {
        id: batchToast,
      });

      try {
        await generateCertifigoCertificateServerFn({
          data: {
            userId: learner.id,
            recipientName: toTitleCase(learner.full_name || learner.email),
            recipientEmail: learner.email,
            type: currentTab,
            templateId:
              currentTab === "formation"
                ? CERTIFIGO_DEFAULT_TEMPLATES.formation
                : CERTIFIGO_DEFAULT_TEMPLATES.hackathon,
            sendEmailImmediately: true,
            notifyInApp: true,
          },
        });
        successCount++;
      } catch (err) {
        console.warn(`Échec batch pour ${learner.email}:`, err);
      }
      // Petite pause pour respecter les rate-limits
      await new Promise((r) => setTimeout(r, 600));
    }

    setIsBatchRunning(false);
    setBatchProgress(null);
    toast.success(`Génération terminée avec succès pour ${successCount} apprenants !`, {
      id: batchToast,
    });
    await refetchCerts();
  }

  return (
    <>
      <PageHeader
        eyebrow="Certification & Distribution Certifigo"
        title="Délivrance des Certificats Officiels"
        subtitle="Générez, signez cryptographiquement (Ed25519) et distribuez des certificats vérifiables avec QR Code via la plateforme Certifigo."
      />

      {/* Barre de contrôle supérieure : Sélecteur de Format & Actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Onglets des 2 formats */}
        <div className="flex rounded-xl bg-paper border border-line p-1 shadow-xs">
          <button
            type="button"
            onClick={() => {
              setCurrentTab("formation");
              setSelectedTemplateId(CERTIFIGO_DEFAULT_TEMPLATES.formation);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentTab === "formation"
                ? "bg-white text-ink shadow-sm border border-line/60"
                : "text-muted-foreground hover:text-ink"
            }`}
          >
            <Award className="h-4 w-4 text-accent" />
            <span>Certificat Formation AI Factory Accelerator</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-mono text-accent">
              {doneFormation.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentTab("hackathon");
              setSelectedTemplateId(CERTIFIGO_DEFAULT_TEMPLATES.hackathon);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentTab === "hackathon"
                ? "bg-white text-ink shadow-sm border border-line/60"
                : "text-muted-foreground hover:text-ink"
            }`}
          >
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>Certificat Hackathon (Participation)</span>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-mono text-amber-700">
              {hackathonLearners.length}
            </span>
          </button>
        </div>

        {/* Boutons d'action : Batch & Refresh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetchCerts()}
            className="btn-base bg-paper hover:bg-line/40 text-xs flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-ink"
            title="Rafraîchir les statuts"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          <button
            type="button"
            disabled={isBatchRunning}
            onClick={handleBatchGenerate}
            className="btn-base btn-glow text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isBatchRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  Lot en cours ({batchProgress?.current}/{batchProgress?.total})...
                </span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>⚡ Générer la sélection (Batch)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Barre de recherche et info sur le template Certifigo actif */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-line shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Template Certifigo connecté :{" "}
            <span className="font-bold text-ink">
              {currentTab === "formation"
                ? "Certificat de formation AI Factory Accelerator"
                : "Certificat de participation au The Factory Hackathon"}
            </span>{" "}
            (A4 paysage)
          </span>
          <a
            href={
              currentTab === "formation"
                ? "https://certifigoapp.com/espace-de-n-e-ronald-bill/templates/cmvc40wyy000701pnw1ehp6g8"
                : "https://certifigoapp.com/espace-de-n-e-ronald-bill/templates/cmvc422kv000801pn1ykpi47o"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 font-bold text-accent hover:underline inline-flex items-center gap-1"
          >
            <span>Voir sur Certifigo</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="relative shrink-0 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-line bg-paper/50 focus:bg-white focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Liste des apprenants du format sélectionné */}
      <Panel
        title={
          currentTab === "formation"
            ? `Apprenants Éligibles à la Certification Formation (${filteredLearners.length})`
            : `Participants Éligibles au Hackathon Février (${filteredLearners.length})`
        }
      >
        {filteredLearners.length ? (
          <ul className="divide-y divide-line text-sm">
            {filteredLearners.map((p) => {
              const last =
                a
                  .lessonsOf(p.id)
                  .map((l) => l.completed_at)
                  .sort()
                  .pop() ?? p.created_at;
              const id = certId(p.id);
              const name = toTitleCase(p.full_name || p.email);
              const formattedDate = fdate(last);
              const dbCert = certMap.get(`${p.id}_${currentTab}`);

              const isCompleted = dbCert?.status === "completed";
              const isProcessing = dbCert?.status === "processing";

              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-ink text-base">{name}</p>

                      {isCompleted && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Certifié & Vérifié Certifigo
                        </span>
                      )}

                      {isProcessing && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 flex items-center gap-1 animate-pulse">
                          <Loader2 className="h-3 w-3 animate-spin" /> En cours de signature (202)
                        </span>
                      )}

                      {!dbCert && (
                        <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Non généré
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span>{p.email}</span>
                      <span>·</span>
                      <span>
                        Complétion : <strong className="text-accent">{a.pctOf(p.id)}%</strong>
                      </span>
                      {dbCert?.verification_url && (
                        <>
                          <span>·</span>
                          <a
                            href={dbCert.verification_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline flex items-center gap-1 font-mono font-medium"
                          >
                            <span>certifigoapp.com/verify/...</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Actions selon le statut */}
                    {isCompleted ? (
                      <>
                        {dbCert.pdf_url && (
                          <a
                            href={dbCert.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-base bg-paper hover:bg-line/40 text-xs flex items-center gap-1 text-ink"
                            title="Télécharger le PDF signé"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>PDF</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleResendEmail(dbCert)}
                          className="btn-base bg-paper hover:bg-line/40 text-xs flex items-center gap-1 text-muted-foreground hover:text-ink cursor-pointer"
                          title="Renvoyer l'email officiel Certifigo"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Renvoyer email</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openPreview(p.id, name, id, formattedDate)}
                          className="btn-base bg-paper hover:bg-line/40 text-xs flex items-center gap-1 cursor-pointer"
                          title="Aperçu visuel"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Aperçu</span>
                        </button>
                      </>
                    ) : isProcessing ? (
                      <>
                        <button
                          type="button"
                          disabled={syncingId === dbCert.id}
                          onClick={() => handleSyncCert(dbCert)}
                          className="btn-base bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${syncingId === dbCert.id ? "animate-spin" : ""}`}
                          />
                          <span>Synchroniser</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openGenerateModal(p)}
                          className="btn-base btn-glow text-xs flex items-center gap-1.5 cursor-pointer font-bold"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>🚀 Générer & Distribuer</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openPreview(p.id, name, id, formattedDate)}
                          className="btn-base bg-paper hover:bg-line/40 text-xs flex items-center gap-1 text-muted-foreground cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Aperçu</span>
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty
            title={
              currentTab === "formation"
                ? "Aucun apprenant certifié pour l'instant"
                : "Aucun participant trouvé pour le hackathon"
            }
            text="Dès qu'un participant termine son parcours ou est inscrit au hackathon, il apparaît ici pour la certification."
          />
        )}
      </Panel>

      {/* Progression des autres apprenants (Formation) */}
      {currentTab === "formation" && inProgressFormation.length > 0 && (
        <Panel title="Prochainement certifiés (50 % et plus)" className="mt-6">
          <ul className="space-y-3 text-sm">
            {inProgressFormation.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="w-44 truncate font-medium text-ink">
                  {toTitleCase(p.full_name || p.email)}
                </span>
                <Bar value={a.pctOf(p.id)} />
                <span className="w-12 text-right text-xs font-mono font-bold text-accent">
                  {a.pctOf(p.id)}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* MODALE DE GÉNÉRATION & DISTRIBUTION CERTIFIGO */}
      {modalOpen && targetLearner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative max-w-lg w-full rounded-2xl bg-white border border-line p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-['Sora',sans-serif] font-bold text-base text-ink">
                    Délivrer le Certificat Certifigo
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Format : {currentTab === "formation" ? "Formation AI Factory" : "Hackathon Février"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-paper hover:text-ink transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulaire destinataire */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink mb-1">Nom sur le certificat</label>
                <input
                  type="text"
                  value={targetLearner.name}
                  onChange={(e) =>
                    setTargetLearner({ ...targetLearner, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-line bg-paper/50 px-3 py-2 text-sm text-ink focus:bg-white focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Email de notification</label>
                <input
                  type="email"
                  value={targetLearner.email}
                  onChange={(e) =>
                    setTargetLearner({ ...targetLearner, email: e.target.value })
                  }
                  className="w-full rounded-lg border border-line bg-paper/50 px-3 py-2 text-sm text-ink focus:bg-white focus:outline-none focus:border-accent"
                />
              </div>

              {/* Modèle Officiel Certifigo sélectionné */}
              <div className="rounded-xl border border-line bg-paper/40 p-3.5 space-y-1.5">
                <span className="block font-bold text-ink text-[11px] uppercase tracking-wider">
                  Modèle Officiel Certifigo Retenu
                </span>
                <div className="flex items-center gap-2 text-xs font-bold text-ink">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {currentTab === "formation"
                      ? "Certificat de formation AI Factory Accelerator"
                      : "Certificat de participation au The Factory Hackathon"}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Identifiant : <span className="text-accent">{selectedTemplateId}</span> · Format A4 Paysage
                </p>
              </div>

              {/* Options de distribution */}
              <div className="rounded-xl bg-paper/60 border border-line p-3.5 space-y-2.5">
                <span className="block font-bold text-ink text-[11px] uppercase tracking-wider">
                  Options de distribution
                </span>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendEmailImmediately}
                    onChange={(e) => setSendEmailImmediately(e.target.checked)}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <span className="text-muted-foreground">
                    Envoyer immédiatement l'email officiel avec le PDF joint (Certifigo)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyInApp}
                    onChange={(e) => setNotifyInApp(e.target.checked)}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <span className="text-muted-foreground">
                    Déposer le certificat et une notification dans l'espace apprenant
                  </span>
                </label>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setModalOpen(false)}
                className="btn-base bg-paper hover:bg-line/40 text-xs cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmGenerate}
                className="btn-base btn-glow text-xs flex items-center gap-2 font-bold cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Génération en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Confirmer & Délivrer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aperçu du certificat (Modale light) */}
      {activeCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative max-h-[96vh] overflow-y-auto max-w-6xl w-full rounded-2xl bg-white border border-line p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <FileCheck className="h-5 w-5 text-accent" />
                <span className="font-['Sora',sans-serif] font-bold text-sm text-ink">
                  Aperçu du Certificat · {activeCert.id}
                </span>
                <a
                  href={
                    activeCert.type === "hackathon"
                      ? "https://certifigoapp.com/espace-de-n-e-ronald-bill/templates/cmvc422kv000801pn1ykpi47o"
                      : "https://certifigoapp.com/espace-de-n-e-ronald-bill/templates/cmvc40wyy000701pnw1ehp6g8"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs font-bold text-accent hover:underline inline-flex items-center gap-1"
                >
                  <span>Ouvrir sur Certifigo</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveCert(null);
                  setActiveUserId(null);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-paper hover:text-ink transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto flex justify-center py-2 bg-[#fbf9f5] rounded-xl border border-line/60">
              <CertificateTemplate
                cert={activeCert}
                canSend={false}
                isSent={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
