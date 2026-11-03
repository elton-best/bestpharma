import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { appHead, PageHeader, Panel } from "@/components/app/AppShell";
import { useProfile, useProgress } from "@/lib/learner";
import { totalLessons } from "@/data/course";
import {
  CertificateTemplate,
  type CertificateData,
  toTitleCase,
} from "@/components/CertificateTemplate";
import {
  Award,
  CheckCircle2,
  ShieldCheck,
  Download,
  Eye,
  X,
  ArrowRight,
  FileCheck,
  Lock,
  ExternalLink,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCertificatesServerFn, type DbCertificate } from "@/lib/certifigo.functions";

export const Route = createFileRoute("/app/certificats")({
  head: appHead(
    "Mes Certificats Officiels",
    "Consulte, télécharge et authentifie tes certificats officiels d'ingénierie AI Factory et du Hackathon via Certifigo."
  ),
  component: LearnerCertificatsPage,
});

function LearnerCertificatsPage() {
  const { data: p } = useProfile();
  const { data: prog = [] } = useProgress();
  const [activeModalCert, setActiveModalCert] = useState<CertificateData | null>(null);

  const isCompleted = prog.length >= totalLessons && totalLessons > 0;

  // Récupérer les certificats officiels Certifigo depuis D1
  const { data: dbCertsData, isLoading: isCertsLoading } = useQuery({
    queryKey: ["learner", "certificates", p?.id],
    queryFn: async () => {
      if (!p?.id) return [];
      const res = await getCertificatesServerFn({ data: { userId: p.id } });
      return res.certificates || [];
    },
    enabled: !!p?.id,
  });

  const dbCertificates: DbCertificate[] = dbCertsData || [];

  return (
    <>
      <PageHeader
        eyebrow="Accréditations & Titres"
        title="Mes Certificats Officiels"
        subtitle="Vos certificats infalsifiables et vérifiables en ligne (Ed25519) délivrés suite à la validation rigoureuse de vos parcours et hackathons."
      />

      {!p?.active && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-bold text-ink text-sm sm:text-base flex items-center justify-center sm:justify-start gap-2">
              <Lock className="h-4 w-4 text-amber-500" />
              Délivrance des Certificats — Réservée aux Membres Actifs
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              La délivrance et l'authentification des certificats officiels nécessitent le règlement des tranches de formation.
            </p>
          </div>
          <Link
            to="/app/paiement"
            className="btn-base btn-glow shrink-0 text-xs sm:text-sm font-bold whitespace-nowrap"
          >
            Consulter les Tranches
          </Link>
        </div>
      )}

      {dbCertificates.length === 0 ? (
        <Panel>
          <div className="text-center py-10 space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Award className="h-7 w-7" />
            </div>
            <h3 className="font-display font-bold text-ink text-lg">
              Aucun certificat officiel pour l'instant
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vos certificats officiels vérifiables apparaîtront ici dès que l'équipe pédagogique aura validé l'ensemble de vos modules ou après votre participation au Hackathon.
            </p>
            <div className="pt-2">
              <Link
                to="/app/apprendre"
                className="btn-base btn-glow text-xs font-bold inline-flex items-center gap-1.5"
              >
                <span>Poursuivre mon parcours</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Panel>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {dbCertificates.map((c) => {
              const isHackathon = c.type === "hackathon";
              const title = isHackathon
                ? "Certificat de participation au The Factory Hackathon"
                : "Certificat de formation AI Factory Accelerator";

              const formattedDate = c.issued_at
                ? new Date(c.issued_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Récemment";

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-xs hover:border-accent/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                        {isHackathon ? (
                          <Trophy className="h-3 w-3 text-amber-500" />
                        ) : (
                          <Award className="h-3 w-3 text-accent" />
                        )}
                        <span>{isHackathon ? "HACKATHON" : "FORMATION"}</span>
                      </span>

                      {c.status === "completed" ? (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Vérifié & Authentique
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 flex items-center gap-1">
                          En cours de validation
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-ink text-base">
                        {title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Délivré à : <strong className="text-ink">{c.recipient_name}</strong>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        Émis le {formattedDate}
                      </p>
                    </div>

                    {/* Miniature si disponible */}
                    {c.thumbnail_url && (
                      <div className="rounded-xl overflow-hidden border border-line/60 bg-paper/40 aspect-video relative group">
                        <img
                          src={c.thumbnail_url}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs font-bold text-white bg-black/60 px-3 py-1.5 rounded-lg flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> Signature Ed25519
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions & Liens Officiels */}
                  <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
                    {c.verification_url ? (
                      <a
                        href={c.verification_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-accent hover:underline flex items-center gap-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Vérifier en direct</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        En cours de certification
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      {c.pdf_url && (
                        <a
                          href={c.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-base bg-paper hover:bg-line/40 text-xs font-bold flex items-center gap-1.5 text-ink cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setActiveModalCert({
                            id: c.id,
                            recipientName: toTitleCase(c.recipient_name),
                            projectTitle: title,
                            dateStr: formattedDate,
                            type: c.type as any,
                            verificationUrl: c.verification_url || undefined,
                          })
                        }
                        className="btn-base btn-glow text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Aperçu</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal d'aperçu */}
      {activeModalCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative max-h-[96vh] overflow-y-auto max-w-6xl w-full rounded-2xl bg-white border border-line p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-accent" />
                <span className="font-['Sora',sans-serif] font-bold text-sm text-ink">
                  Certificat Officiel AI Factory · {activeModalCert.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalCert(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-paper hover:text-ink transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto flex justify-center py-2 bg-[#fbf9f5] rounded-xl border border-line/60">
              <CertificateTemplate cert={activeModalCert} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
