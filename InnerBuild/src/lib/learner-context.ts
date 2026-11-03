import { allLessons, totalLessons } from "@/data/course";
import { useProfile, useProgress, useSubmissions } from "./learner";

/**
 * Builds the detailed AI context only on screens that actually use the coach.
 * Keeping this separate prevents the full course catalogue from loading with
 * every application page.
 */
export function useLearnerContext(page = "") {
  const { data: profile } = useProfile();
  const { data: progress = [] } = useProgress();
  const { data: submissions = [] } = useSubmissions();
  const completed = new Set(progress.map((item) => item.lesson_id));
  const nextLesson = allLessons.find((lesson) => !completed.has(lesson.id));
  const recentCount = progress.filter(
    (item) => Date.now() - new Date(item.completed_at).getTime() < 7 * 86_400_000,
  ).length;

  return [
    page && `Page actuelle : ${page}`,
    `Prénom : ${profile?.full_name?.split(" ")[0] || "apprenant"}`,
    profile?.goal && `Objectif : ${profile.goal}`,
    profile?.level && `Niveau : ${profile.level}`,
    `Accès : ${profile?.active ? "complet" : "découverte"}`,
    `Leçons terminées : ${completed.size}/${totalLessons} (${[...completed].join(", ") || "aucune"})`,
    `Leçons terminées ces 7 derniers jours : ${recentCount}`,
    nextLesson
      ? `Prochaine leçon : ${nextLesson.module.step} — ${nextLesson.title}`
      : "Toutes les leçons sont terminées",
    `Rendus : ${submissions.length} (${submissions.map((item) => `${item.title} [${item.status}]`).join(", ") || "aucun"})`,
  ]
    .filter(Boolean)
    .join("\n");
}
