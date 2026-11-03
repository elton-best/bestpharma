import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Trophy,
  Flame,
  Calendar,
  Users,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Rocket,
  Layers,
  Clock,
  ExternalLink,
  ChevronRight,
  FileText,
  Timer,
} from "lucide-react";
import { useChallenges, type Challenge } from "@/lib/challenges";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Final";
import { useLanguage } from "@/lib/i18n";
import { HISTORICAL_CHALLENGES, type HistoricalChallenge } from "@/data/innerbuild-history";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges & Saisons The InnerBuild — Hackathons Réels" },
      {
        name: "description",
        content:
          "Consultez les challenges officiels de The InnerBuild : vrais clients, décomptes de soumission en direct, dotations certifiées et évaluation par le jury à 7 dimensions.",
      },
      { property: "og:title", content: "Challenges & Saisons The InnerBuild — Hackathons Réels" },
      {
        property: "og:description",
        content:
          "Consultez les challenges officiels de The InnerBuild : vrais clients, décomptes de soumission en direct, dotations certifiées et évaluation par le jury à 7 dimensions.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PublicChallengesPage,
});

/**
 * Calculateur de compte à rebours dynamique
 */
function useCountdown(dateStr?: string | null, timeStr?: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOver: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });

  useEffect(() => {
    if (!dateStr) return;

    function calculate() {
      const timePart = timeStr ? timeStr.trim() : "23:59:59";
      const targetIso = `${dateStr}T${timePart}`;
      const targetTime = new Date(targetIso).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (isNaN(targetTime) || diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isOver: false });
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [dateStr, timeStr]);

  return timeLeft;
}

function CountdownDisplay({
  submissionDate,
  deadlineTime,
}: {
  submissionDate?: string | null;
  deadlineTime?: string | null;
}) {
  const { lang, t } = useLanguage();
  const countdown = useCountdown(submissionDate, deadlineTime);

  if (!submissionDate) return null;

  if (countdown.isOver) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE3D5] bg-[#E8F5EB] px-3 py-1 text-[11px] font-mono font-bold text-[#023010]">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#18AA38]" />
        <span>{lang === "fr" ? "Soumissions Clôturées" : "Submissions Closed"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#023010] bg-[#EFF7F1] border border-[#CFE3D5] px-3 py-1 rounded-full">
      <Timer className="h-3.5 w-3.5 text-[#18AA38] animate-pulse" />
      <span>
        {countdown.days}
        <span className="text-[#5C6660] text-[10px]">{t("ch_countdown_days")}</span>{" "}
        {countdown.hours}
        <span className="text-[#5C6660] text-[10px]">{t("ch_countdown_hours")}</span>{" "}
        {countdown.minutes}
        <span className="text-[#5C6660] text-[10px]">{t("ch_countdown_mins")}</span>{" "}
        {countdown.seconds}
        <span className="text-[#5C6660] text-[10px]">{t("ch_countdown_secs")}</span>
      </span>
    </div>
  );
}

function PublicChallengesPage() {
  const { lang, t } = useLanguage();
  const { data: d1Challenges = [] } = useChallenges();
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  // Fusionner les challenges historiques et ceux créés sur D1
  const allMergedChallenges = (() => {
    const list: Array<HistoricalChallenge | Challenge> = [...d1Challenges];
    const existingIds = new Set(d1Challenges.map((c) => c.id));

    for (const h of HISTORICAL_CHALLENGES) {
      if (!existingIds.has(h.id)) {
        list.push({
          id: h.id,
          title: h.name,
          description: h.description,
          duration_days: h.duration_days,
          fee_amount: h.fee_amount,
          status: h.status,
          start_date: h.start_date,
          end_date: h.end_date,
          submission_date: h.submission_date,
          submission_deadline_time: h.submission_deadline_time,
          created_at: h.created_at,
          updated_at: h.updated_at,
          brief_content: "",
          objectives: "",
          target_audience: "",
          solution_criteria: "",
          prize_pool: "Certificat Vérifiable + Dotations",
        } as any);
      }
    }
    return list;
  })();

  const filtered = allMergedChallenges.filter((c) => {
    if (filter === "active") return c.status === "active" || c.status === "evaluation";
    if (filter === "completed") return c.status === "completed";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8faf8] text-[#1F2420] flex flex-col justify-between selection:bg-[#18AA38]/20 selection:text-[#023010]">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
        {/* En-tête de section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE3D5] bg-[#EFF7F1] px-4 py-1 text-xs font-mono font-bold text-[#023010]">
            <Trophy className="h-3.5 w-3.5 text-[#18AA38]" />
            <span>{t("ch_tag")}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#023010] font-display tracking-tight">
            {t("ch_title")}
          </h1>

          <p className="text-sm sm:text-base text-[#5C6660] max-w-2xl mx-auto leading-relaxed">
            {t("ch_desc")}
          </p>

          {/* Filtres */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "all", label: t("ch_filter_all") },
              { id: "active", label: t("ch_filter_active") },
              { id: "completed", label: t("ch_filter_completed") },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id as any)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold font-mono transition-all ${
                  filter === f.id
                    ? "bg-[#023010] text-white shadow-xs"
                    : "bg-[#EFF7F1] text-[#1F2420] border border-[#CFE3D5] hover:bg-[#E2F7E7]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des Challenges */}
        <div className="space-y-6">
          {filtered.map((c: any) => {
            const isCompleted = c.status === "completed";
            const title = c.name || c.title;
            const fee = c.fee_amount ? `${c.fee_amount.toLocaleString("fr-FR")} F CFA` : t("ch_free");
            const duration = c.duration_days ? `${c.duration_days} ${t("ch_days")}` : "7 Jours";

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-[#CFE3D5] bg-white p-6 sm:p-8 shadow-xs hover:border-[#18AA38]/50 transition-all space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#CFE3D5] pb-5">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold ${
                          isCompleted
                            ? "bg-[#E8F5EB] text-[#023010] border border-[#CFE3D5]"
                            : "bg-[#18AA38]/15 text-[#023010] border border-[#18AA38]/40"
                        }`}
                      >
                        {isCompleted ? t("ch_status_completed") : t("ch_status_active")}
                      </span>

                      {/* Décompte temps réel */}
                      <CountdownDisplay
                        submissionDate={c.submission_date}
                        deadlineTime={c.submission_deadline_time}
                      />
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-[#023010] font-display">
                      {title}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {isCompleted ? (
                      <Link
                        to="/resultats"
                        search={{ challengeId: c.id } as any}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#023010] hover:bg-[#18AA38] text-white px-5 py-2 text-xs font-bold font-mono shadow-xs transition"
                      >
                        <Trophy className="h-3.5 w-3.5 text-[#18AA38]" />
                        <span>{t("ch_view_results")}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <Link
                        to="/auth"
                        search={{ mode: "signup" }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#023010] hover:bg-[#18AA38] text-white px-5 py-2 text-xs font-bold font-mono shadow-xs transition"
                      >
                        <span>{t("ch_join_now")}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Description du challenge */}
                <p className="text-xs sm:text-sm text-[#5C6660] leading-relaxed whitespace-pre-line">
                  {c.description}
                </p>

                {/* Métadonnées & Piliers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                  <div className="rounded-xl border border-[#CFE3D5] bg-[#EFF7F1] p-3">
                    <span className="text-[#5C6660] text-[10px] block uppercase">{t("ch_starts")}</span>
                    <span className="font-bold text-[#023010] mt-0.5 block">
                      {c.start_date || (lang === "fr" ? "Saison Précédente" : "Previous Season")}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#CFE3D5] bg-[#EFF7F1] p-3">
                    <span className="text-[#5C6660] text-[10px] block uppercase">{t("ch_deadline")}</span>
                    <span className="font-bold text-[#023010] mt-0.5 block">
                      {c.submission_date ? `${c.submission_date} ${c.submission_deadline_time || ""}` : (lang === "fr" ? "Clôturé" : "Closed")}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#CFE3D5] bg-[#EFF7F1] p-3">
                    <span className="text-[#5C6660] text-[10px] block uppercase">
                      {lang === "fr" ? "Durée Imposée" : "Mandatory Duration"}
                    </span>
                    <span className="font-bold text-[#023010] mt-0.5 block">{duration}</span>
                  </div>

                  <div className="rounded-xl border border-[#CFE3D5] bg-[#EFF7F1] p-3">
                    <span className="text-[#5C6660] text-[10px] block uppercase">{t("ch_fee")}</span>
                    <span className="font-bold text-[#18AA38] mt-0.5 block">{fee}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
