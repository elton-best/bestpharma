import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Trophy,
  Award,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Filter,
  FileText,
  Star,
  Eye,
  X,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Final";
import { useLanguage } from "@/lib/i18n";
import {
  HISTORICAL_CHALLENGES,
  HISTORICAL_RESULTS,
  HISTORICAL_EVALUATIONS,
  DIMENSIONS_META,
  type HistoricalResult,
  type HistoricalEvaluation,
} from "@/data/innerbuild-history";
import { useChallenges, useChallengeResults } from "@/lib/challenges";

export const Route = createFileRoute("/resultats")({
  head: () => ({
    meta: [
      { title: "Résultats & Classements Officiels The InnerBuild" },
      {
        name: "description",
        content:
          "Consultez les résultats officiels, notes certifiées et classements des challenges The InnerBuild après délibération du jury indépendant à 7 dimensions.",
      },
      { property: "og:title", content: "Résultats & Classements Officiels The InnerBuild" },
      {
        property: "og:description",
        content:
          "Consultez les résultats officiels, notes certifiées et classements des challenges The InnerBuild après délibération du jury indépendant à 7 dimensions.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PublicResultsPage,
});

function PublicResultsPage() {
  const { lang, t } = useLanguage();
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(
    "40421b6a-1b5e-4203-8f0d-aa54a8a5e801" // Default to BenDjo Saison 02
  );
  const [activeSubmissionModal, setActiveSubmissionModal] = useState<HistoricalResult | null>(null);

  // Challenge en cours
  const currentChallenge = HISTORICAL_CHALLENGES.find((c) => c.id === selectedChallengeId);

  // Résultats filtrés pour ce challenge, triés par rang
  const resultsForChallenge = HISTORICAL_RESULTS.filter(
    (r) => r.challenge_id === selectedChallengeId
  ).sort((a, b) => a.rank - b.rank);

  // Top 3 Podium
  const rank1 = resultsForChallenge.find((r) => r.rank === 1);
  const rank2 = resultsForChallenge.find((r) => r.rank === 2);
  const rank3 = resultsForChallenge.find((r) => r.rank === 3);

  // Évaluations correspondantes à la soumission ouverte dans la modale
  const modalEvaluations = activeSubmissionModal?.submission_id
    ? HISTORICAL_EVALUATIONS.filter(
        (e) => e.submission_id === activeSubmissionModal.submission_id
      )
    : [];

  return (
    <div className="min-h-screen bg-[#f8faf8] text-[#1F2420] flex flex-col justify-between selection:bg-[#18AA38]/20 selection:text-[#023010]">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
        {/* En-tête */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE3D5] bg-[#EFF7F1] px-4 py-1 text-xs font-mono font-bold text-[#023010]">
            <Award className="h-3.5 w-3.5 text-[#18AA38]" />
            <span>{t("res_tag")}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#023010] font-display tracking-tight">
            {t("res_title")}
          </h1>

          <p className="text-sm sm:text-base text-[#5C6660] max-w-2xl mx-auto leading-relaxed">
            {t("res_desc")}
          </p>

          {/* Sélecteur de Saisons / Challenges */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
            {HISTORICAL_CHALLENGES.map((ch) => {
              const isSelected = ch.id === selectedChallengeId;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedChallengeId(ch.id)}
                  className={`rounded-full px-4 py-2 text-xs font-bold font-mono transition-all ${
                    isSelected
                      ? "bg-[#023010] text-white shadow-xs ring-2 ring-[#023010]/30"
                      : "bg-[#EFF7F1] text-[#1F2420] border border-[#CFE3D5] hover:bg-[#E2F7E7]"
                  }`}
                >
                  {ch.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Détails du challenge sélectionné */}
        {currentChallenge && (
          <div className="rounded-2xl border border-[#CFE3D5] bg-[#EFF7F1]/70 p-5 sm:p-6 text-xs text-[#5C6660] space-y-2">
            <div className="flex items-center justify-between border-b border-[#CFE3D5] pb-3 font-mono">
              <span className="font-bold text-[#023010] text-sm">{currentChallenge.name}</span>
              <span className="bg-[#E8F5EB] border border-[#CFE3D5] text-[#023010] px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                Évaluations Clôturées · Délibération Finale
              </span>
            </div>
            <p className="leading-relaxed line-clamp-3">{currentChallenge.description}</p>
          </div>
        )}

        {/* --- VRAI PODIUM PHYSIQUE 3D (Style Image 1) --- */}
        {rank1 && (
          <div className="relative pt-12 pb-8 max-w-4xl mx-auto">
            {/* 3 Spots lumineux au plafond */}
            <div className="hidden sm:flex justify-around items-center max-w-3xl mx-auto mb-6 pointer-events-none opacity-80">
              <div className="w-32 h-24 bg-gradient-to-b from-white via-[#18AA38]/15 to-transparent blur-xl rounded-full" />
              <div className="w-44 h-32 bg-gradient-to-b from-white via-[#18AA38]/25 to-transparent blur-2xl rounded-full scale-125" />
              <div className="w-32 h-24 bg-gradient-to-b from-white via-[#18AA38]/15 to-transparent blur-xl rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-2 items-end">
              {/* === MARCHE 2 (GAUCHE) === */}
              {rank2 ? (
                <div className="flex flex-col items-center order-2 md:order-1">
                  {/* Carte apprenant posée sur la marche */}
                  <div className="w-full max-w-[270px] bg-white rounded-2xl border border-[#CFE3D5] p-5 mb-2 shadow-sm text-center space-y-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 text-[11px] font-mono font-bold">
                      <Trophy className="h-3 w-3 text-slate-500" />
                      <span>{t("res_podium_silver")}</span>
                    </span>
                    <h3 className="text-lg font-black text-[#023010] font-display truncate pt-1">
                      {rank2.participant_name || "Inbuilder"}
                    </h3>
                    <div className="text-2xl font-black text-[#023010] font-mono">
                      {rank2.final_score} <span className="text-xs text-[#5C6660]">/100</span>
                    </div>
                    <p className="text-[11px] text-[#5C6660] truncate">{rank2.submission_title || "Livrable validé"}</p>

                    <div className="pt-2 flex flex-col gap-1.5 border-t border-[#CFE3D5]/60">
                      {rank2.submission_live_url && (
                        <a
                          href={rank2.submission_live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-[#023010] hover:text-[#18AA38]"
                        >
                          <span>{t("res_link")}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSubmissionModal(rank2)}
                        className="text-[10px] font-mono text-accent hover:underline font-semibold"
                      >
                        {lang === "fr" ? "Détail des 7 notes →" : "View 7D breakdown →"}
                      </button>
                    </div>
                  </div>

                  {/* Socle Physique Marche 2 */}
                  <div className="w-full max-w-[270px] flex flex-col">
                    {/* Plateau supérieur */}
                    <div className="h-4 bg-[#E2F7E7] border-t-4 border-slate-400 rounded-t-lg shadow-inner" />
                    {/* Bloc frontal chiffré */}
                    <div className="h-36 bg-gradient-to-b from-white to-[#EFF7F1] border-x border-b border-[#CFE3D5] flex items-center justify-center shadow-md">
                      <span className="font-display font-black text-7xl text-slate-400 drop-shadow-sm select-none">
                        2
                      </span>
                    </div>
                  </div>
                </div>
              ) : <div className="order-2 md:order-1" />}

              {/* === MARCHE 1 (CENTRE · PLUS HAUTE) === */}
              <div className="flex flex-col items-center order-1 md:order-2">
                {/* Couronne & Carte Champion */}
                <div className="w-full max-w-[290px] bg-[#EFF7F1] rounded-2xl border-2 border-[#023010] p-6 mb-2 shadow-xl ring-2 ring-[#023010]/20 text-center space-y-2 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#023010] text-[#18AA38] px-3.5 py-1 text-xs font-mono font-bold shadow-md">
                      <Trophy className="h-3.5 w-3.5" />
                      <span>{t("res_podium_gold")}</span>
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[#023010] font-display truncate pt-2">
                    {rank1.participant_name || "Champion"}
                  </h3>
                  <div className="text-3xl font-black text-[#023010] font-mono">
                    {rank1.final_score} <span className="text-xs text-[#5C6660]">/100</span>
                  </div>
                  <p className="text-xs text-[#5C6660] font-medium truncate">{rank1.submission_title || "Vainqueur Officiel"}</p>

                  <div className="pt-2 flex flex-col gap-1.5 border-t border-[#CFE3D5]">
                    {rank1.submission_live_url && (
                      <a
                        href={rank1.submission_live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 text-xs font-bold text-[#023010] hover:text-[#18AA38]"
                      >
                        <span>{t("res_link")}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveSubmissionModal(rank1)}
                      className="text-xs font-mono text-[#18AA38] hover:underline font-bold"
                    >
                      {lang === "fr" ? "Détail des 7 notes →" : "View 7D breakdown →"}
                    </button>
                  </div>
                </div>

                {/* Socle Physique Marche 1 */}
                <div className="w-full max-w-[290px] flex flex-col">
                  {/* Plateau supérieur */}
                  <div className="h-5 bg-[#18AA38] border-t-4 border-[#023010] rounded-t-lg shadow-inner" />
                  {/* Bloc frontal chiffré */}
                  <div className="h-48 bg-gradient-to-b from-white to-[#E8F5EB] border-x border-b border-[#023010]/30 flex items-center justify-center shadow-lg">
                    <span className="font-display font-black text-9xl text-[#023010] drop-shadow-md select-none">
                      1
                    </span>
                  </div>
                </div>
              </div>

              {/* === MARCHE 3 (DROITE) === */}
              {rank3 ? (
                <div className="flex flex-col items-center order-3">
                  {/* Carte apprenant posée sur la marche */}
                  <div className="w-full max-w-[270px] bg-white rounded-2xl border border-[#CFE3D5] p-5 mb-2 shadow-sm text-center space-y-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 text-[11px] font-mono font-bold">
                      <Trophy className="h-3 w-3 text-amber-700" />
                      <span>{t("res_podium_bronze")}</span>
                    </span>
                    <h3 className="text-lg font-black text-[#023010] font-display truncate pt-1">
                      {rank3.participant_name || "Inbuilder"}
                    </h3>
                    <div className="text-2xl font-black text-[#023010] font-mono">
                      {rank3.final_score} <span className="text-xs text-[#5C6660]">/100</span>
                    </div>
                    <p className="text-[11px] text-[#5C6660] truncate">{rank3.submission_title || "Livrable validé"}</p>

                    <div className="pt-2 flex flex-col gap-1.5 border-t border-[#CFE3D5]/60">
                      {rank3.submission_live_url && (
                        <a
                          href={rank3.submission_live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-[#023010] hover:text-[#18AA38]"
                        >
                          <span>{t("res_link")}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSubmissionModal(rank3)}
                        className="text-[10px] font-mono text-accent hover:underline font-semibold"
                      >
                        {lang === "fr" ? "Détail des 7 notes →" : "View 7D breakdown →"}
                      </button>
                    </div>
                  </div>

                  {/* Socle Physique Marche 3 */}
                  <div className="w-full max-w-[270px] flex flex-col">
                    {/* Plateau supérieur */}
                    <div className="h-4 bg-amber-100 border-t-4 border-amber-500 rounded-t-lg shadow-inner" />
                    {/* Bloc frontal chiffré */}
                    <div className="h-28 bg-gradient-to-b from-white to-amber-50/50 border-x border-b border-[#CFE3D5] flex items-center justify-center shadow-md">
                      <span className="font-display font-black text-6xl text-amber-600/60 drop-shadow-sm select-none">
                        3
                      </span>
                    </div>
                  </div>
                </div>
              ) : <div className="order-3" />}
            </div>

            {/* Sol et ombres au pied du podium */}
            <div className="h-2 bg-gradient-to-r from-transparent via-[#CFE3D5] to-transparent max-w-3xl mx-auto rounded-full mt-0 shadow-sm" />
          </div>
        )}

        {/* --- TABLEAU OFFICIEL DES CLASSEMENTS --- */}
        <div className="rounded-2xl border border-[#CFE3D5] bg-white overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#CFE3D5] bg-[#EFF7F1] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#18AA38]" />
              <h2 className="text-sm font-black font-mono uppercase text-[#023010]">
                {lang === "fr" ? "Registre des Notes Certifiées" : "Certified Rankings Registry"}
              </h2>
            </div>
            <span className="text-xs font-mono text-[#5C6660]">
              {resultsForChallenge.length} {lang === "fr" ? "Inbuilders classés" : "Ranked inbuilders"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#CFE3D5] bg-[#EFF7F1]/80 text-[#023010] font-mono uppercase text-[11px] font-bold">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">{t("res_rank")}</th>
                  <th className="py-3.5 px-4">{t("res_participant")}</th>
                  <th className="py-3.5 px-4">{t("res_project")}</th>
                  <th className="py-3.5 px-4 text-center">{t("res_score")}</th>
                  <th className="py-3.5 px-4 text-right">{t("res_link")}</th>
                  {selectedChallengeId === "40421b6a-1b5e-4203-8f0d-aa54a8a5e801" && (
                    <th className="py-3.5 px-4 text-center">{lang === "fr" ? "Audit Jury" : "Jury Audit"}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFE3D5]/60">
                {resultsForChallenge.map((r, idx) => {
                  const isTop3 = r.rank <= 3;
                  // Couleur alternée : #E8F5EB pour les rangées paires
                  const isEvenRow = idx % 2 === 1;

                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors hover:bg-[#E2F7E7]/40 ${
                        isEvenRow ? "bg-[#E8F5EB]/60" : "bg-white"
                      }`}
                    >
                      {/* Rang */}
                      <td className="py-3 px-4 text-center font-mono font-black">
                        <span
                          className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs ${
                            r.rank === 1
                              ? "bg-[#023010] text-[#18AA38]"
                              : r.rank === 2
                                ? "bg-slate-200 text-slate-800"
                                : r.rank === 3
                                  ? "bg-amber-100 text-amber-800"
                                  : "text-[#5C6660]"
                          }`}
                        >
                          {r.rank}
                        </span>
                      </td>

                      {/* Participant (en vert profond #023010 pour les lauréats) */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-display ${
                            isTop3 ? "font-black text-[#023010] text-sm" : "font-semibold text-[#1F2420]"
                          }`}
                        >
                          {r.participant_name || "Inbuilder"}
                        </span>
                      </td>

                      {/* Titre Projet */}
                      <td className="py-3 px-4 text-[#5C6660]">
                        <span className="truncate max-w-xs block font-medium">
                          {r.submission_title || "Projet Livré"}
                        </span>
                      </td>

                      {/* Score Final */}
                      <td className="py-3 px-4 text-center font-mono font-black text-[#023010]">
                        {r.final_score}
                      </td>

                      {/* Lien Live */}
                      <td className="py-3 px-4 text-right">
                        {r.submission_live_url ? (
                          <a
                            href={r.submission_live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-[#023010] hover:text-[#18AA38]"
                          >
                            <span>{lang === "fr" ? "Démo" : "Live Demo"}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-[#5C6660]/50 font-mono">—</span>
                        )}
                      </td>

                      {/* Audit Jury */}
                      {selectedChallengeId === "40421b6a-1b5e-4203-8f0d-aa54a8a5e801" && (
                        <td className="py-3 px-4 text-center">
                          {r.submission_id ? (
                            <button
                              type="button"
                              onClick={() => setActiveSubmissionModal(r)}
                              className="inline-flex items-center gap-1 rounded-full border border-[#CFE3D5] bg-[#EFF7F1] hover:bg-[#E2F7E7] text-[#023010] px-2.5 py-1 text-[11px] font-bold font-mono transition"
                            >
                              <Eye className="h-3 w-3 text-[#18AA38]" />
                              <span>{lang === "fr" ? "Détails" : "Details"}</span>
                            </button>
                          ) : (
                            <span className="text-[#5C6660]/50 font-mono">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- MODALE D'AUDIT JURY DÉTAILLÉ --- */}
      {activeSubmissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#CFE3D5] bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-[#CFE3D5] pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#18AA38] uppercase">
                  {lang === "fr" ? "Détail de l'Évaluation Officielle" : "Official Evaluation Breakdown"}
                </span>
                <h3 className="text-xl font-black text-[#023010] font-display mt-0.5">
                  {activeSubmissionModal.participant_name} — {lang === "fr" ? "Rang" : "Rank"} #{activeSubmissionModal.rank} ({activeSubmissionModal.final_score}/100)
                </h3>
                <p className="text-xs text-[#5C6660] mt-0.5">
                  {lang === "fr" ? "Projet :" : "Project:"} {activeSubmissionModal.submission_title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubmissionModal(null)}
                className="rounded-full p-1.5 text-[#5C6660] hover:bg-[#EFF7F1] hover:text-[#023010]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Liste des évaluations par dimensions */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase text-[#023010]">
                {t("res_eval_dimensions")}
              </h4>

              {modalEvaluations.length > 0 ? (
                <div className="space-y-3">
                  {modalEvaluations.map((evalItem) => {
                    const dimMeta = DIMENSIONS_META[evalItem.dimension];
                    return (
                      <div
                        key={evalItem.id}
                        className="rounded-xl border border-[#CFE3D5] bg-[#EFF7F1] p-4 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-[#CFE3D5]/60 pb-2">
                          <span className="font-bold text-[#023010] font-mono">
                            {dimMeta?.label || evalItem.dimension}
                          </span>
                          <span className="font-mono font-black text-[#023010] bg-white border border-[#CFE3D5] px-2 py-0.5 rounded">
                            {evalItem.score} pts
                          </span>
                        </div>

                        {evalItem.observations && (
                          <div>
                            <span className="font-bold text-[#1F2420] block">
                              {lang === "fr" ? "Observations :" : "Observations:"}
                            </span>
                            <p className="text-[#5C6660] leading-relaxed mt-0.5 whitespace-pre-line">
                              {evalItem.observations}
                            </p>
                          </div>
                        )}

                        {evalItem.strengths && (
                          <div>
                            <span className="font-bold text-[#18AA38] block">
                              {lang === "fr" ? "Points forts :" : "Key Strengths:"}
                            </span>
                            <p className="text-[#5C6660] leading-relaxed mt-0.5 whitespace-pre-line">
                              {evalItem.strengths}
                            </p>
                          </div>
                        )}

                        {evalItem.improvements && (
                          <div>
                            <span className="font-bold text-[#d97706] block">
                              {lang === "fr" ? "Axes d'amélioration :" : "Areas for Improvement:"}
                            </span>
                            <p className="text-[#5C6660] leading-relaxed mt-0.5 whitespace-pre-line">
                              {evalItem.improvements}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#5C6660] italic">
                  {lang === "fr"
                    ? `Évaluations globales compilées dans la note finale de ${activeSubmissionModal.final_score}/100.`
                    : `Comprehensive evaluations compiled into the final score of ${activeSubmissionModal.final_score}/100.`}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-[#CFE3D5] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveSubmissionModal(null)}
                className="rounded-full bg-[#023010] text-white px-6 py-2 text-xs font-bold font-mono hover:bg-[#18AA38] transition"
              >
                {lang === "fr" ? "Fermer l'audit" : "Close audit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
