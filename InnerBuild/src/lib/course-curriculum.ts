import { useQuery } from "@tanstack/react-query";
import { modules as baseModules, allLessons as baseAllLessons, coreSkillsModule } from "@/data/course";
import { d1ListServerFn } from "./d1-data.functions";
import { type CCourse, type CModule, type CLesson, type CQuiz, type CExercise } from "./content";

export type LearnerLesson = {
  id: string;
  module_id: string;
  title: string;
  minutes: number;
  body: string[];
  task: string;
  kind: "text" | "pdf" | "mixed" | string;
  file_path?: string;
  image_path?: string;
  module?: { id: string; step: string; title: string; free?: boolean; courseTitle?: string };
};

export type LearnerModule = {
  id: string;
  course_id: string;
  step: string;
  title: string;
  free?: boolean;
  lessons: LearnerLesson[];
  quiz?: any[];
  exercises?: any[];
};

export type LearnerCourse = {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  pdf_url?: string;
  modules: LearnerModule[];
  lessonCount: number;
};

function normalizeBody(body: unknown): string[] {
  if (Array.isArray(body)) return body.map(String).filter(Boolean);
  if (typeof body === "string" && body.trim()) {
    return body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Charge tous les cours, modules et leçons publiés dans D1 et les fusionne
 * avec le parcours socle en mémoire pour une réactivité instantanée.
 */
export async function fetchPublishedCurriculum(): Promise<{
  courses: LearnerCourse[];
  allModules: LearnerModule[];
  allLessons: LearnerLesson[];
}> {
  try {
    const [rawCourses, rawModules, rawLessons, rawQuiz, rawExercises] = await Promise.all([
      d1ListServerFn({ data: { table: "courses", where: { published: 1 }, orderBy: "position", orderDir: "ASC", limit: 100 } }),
      d1ListServerFn({ data: { table: "course_modules", where: { published: 1 }, orderBy: "position", orderDir: "ASC", limit: 200 } }),
      d1ListServerFn({ data: { table: "lessons", where: { published: 1 }, orderBy: "position", orderDir: "ASC", limit: 500 } }),
      d1ListServerFn({ data: { table: "quiz_questions", where: { published: 1 }, orderBy: "position", orderDir: "ASC", limit: 200 } }),
      d1ListServerFn({ data: { table: "exercises", where: { published: 1 }, orderBy: "position", orderDir: "ASC", limit: 200 } }),
    ]);

    const d1Courses = (rawCourses.rows || []) as CCourse[];
    const d1Modules = (rawModules.rows || []) as CModule[];
    const d1Lessons = (rawLessons.rows || []) as CLesson[];
    const d1Quiz = (rawQuiz.rows || []) as CQuiz[];
    const d1Exercises = (rawExercises.rows || []) as CExercise[];

    const d1C1 = d1Courses.find((c) => c.id === "c1");

    // 1. Module de base Spec -> Deliver (c1)
    const baseCourseModules: LearnerModule[] = baseModules.map((m) => {
      // Trouver d'éventuelles leçons D1 rattachées à ce module (ex. PDF de synthèse ajouté à m0)
      const extraLessons = d1Lessons
        .filter((l) => l.module_id === m.id && !m.lessons.some((x) => x.id === l.id))
        .map((l) => ({
          id: l.id,
          module_id: m.id,
          title: l.title,
          minutes: l.minutes || 10,
          body: normalizeBody(l.body),
          task: l.task || "",
          kind: l.kind || (l.file_path ? "pdf" : "text"),
          file_path: l.file_path || undefined,
          image_path: l.image_path || undefined,
        }));

      // Les leçons de support / synthèse PDF sont positionnées en tête de module
      const lessons: LearnerLesson[] = [
        ...extraLessons,
        ...m.lessons.map((l) => ({
          id: l.id,
          module_id: m.id,
          title: l.title,
          minutes: l.minutes,
          body: normalizeBody(l.body),
          task: l.task || "",
          kind: l.kind || (l.file_path ? "pdf" : "text"),
          file_path: l.file_path,
          image_path: l.image_path,
        })),
      ];

      return {
        id: m.id,
        course_id: "c1",
        step: m.step,
        title: m.title,
        free: m.free,
        lessons,
        quiz: m.quiz,
        exercises: m.exercises,
      };
    });

    const primaryCourse: LearnerCourse = {
      id: "c1",
      title: d1C1?.title || "Formation AIFAC — Spec → Deliver",
      description: d1C1?.description || "Le parcours officiel complet en 6 étapes de l'AI Factory : Socle, Spec, Plan, Build, Review et Deliver.",
      image_url: d1C1?.image_url || "",
      pdf_url: d1C1?.pdf_url || "https://pub-e1b7047c4291458ba7b14cd1ab400698.r2.dev/pdf/ea7ad392-b538-4347-9767-38c0c46700bb-Synthese-Socle-7-Skills.pdf",
      modules: baseCourseModules,
      lessonCount: baseCourseModules.reduce((acc, m) => acc + m.lessons.length, 0),
    };

    // 2. Cours dynamiques supplémentaires créés par l'admin dans D1 (ex. SYNTHÈSE - SOCLE)
    const extraCourses: LearnerCourse[] = d1Courses
      .filter((c) => c.id !== "c1")
      .map((c) => {
        // Modules de ce cours
        const cMods = d1Modules
          .filter((m) => m.course_id === c.id)
          .map((m) => {
            const mLessons = d1Lessons
              .filter((l) => l.module_id === m.id)
              .map((l) => ({
                id: l.id,
                module_id: m.id,
                title: l.title,
                minutes: l.minutes || 10,
                body: normalizeBody(l.body),
                task: l.task || "",
                kind: l.kind || (l.file_path ? "pdf" : "text"),
                file_path: l.file_path || undefined,
                image_path: l.image_path || undefined,
              }));

            const mQuiz = d1Quiz.filter((q) => q.module_id === m.id);
            const mEx = d1Exercises.filter((e) => e.module_id === m.id);

            return {
              id: m.id,
              course_id: c.id,
              step: m.step || "Cours",
              title: m.title,
              free: Boolean(m.free),
              lessons: mLessons,
              quiz: mQuiz,
              exercises: mEx,
            };
          });

        return {
          id: c.id,
          title: c.title,
          description: c.description || "Cours et supports pédagogiques créés par l'équipe AIFAC.",
          image_url: c.image_url || undefined,
          pdf_url: c.pdf_url || undefined,
          modules: cMods,
          lessonCount: cMods.reduce((acc, m) => acc + m.lessons.length, 0),
        };
      });

    const courses: LearnerCourse[] = [primaryCourse, ...extraCourses];
    const allModules: LearnerModule[] = courses.flatMap((c) => c.modules);
    const allLessons: LearnerLesson[] = allModules.flatMap((m) =>
      m.lessons.map((l) => ({
        ...l,
        module: {
          id: m.id,
          step: m.step,
          title: m.title,
          free: m.free,
          courseTitle: courses.find((c) => c.id === m.course_id)?.title,
        },
      }))
    );

    return { courses, allModules, allLessons };
  } catch (err) {
    console.warn("[Curriculum D1 Sync Warning]", err);
    // Fallback gracieux sur le cursus socle
    const fallbackModules: LearnerModule[] = baseModules.map((m) => ({
      id: m.id,
      course_id: "c1",
      step: m.step,
      title: m.title,
      free: m.free,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        module_id: m.id,
        title: l.title,
        minutes: l.minutes,
        body: normalizeBody(l.body),
        task: l.task || "",
        kind: l.kind || (l.file_path ? "pdf" : "text"),
        file_path: l.file_path,
        image_path: l.image_path,
      })),
      quiz: m.quiz,
      exercises: m.exercises,
    }));

    const primaryCourse: LearnerCourse = {
      id: "c1",
      title: "Formation AIFAC — Spec → Deliver",
      description: "Le parcours officiel complet en 6 étapes de l'AI Factory.",
      modules: fallbackModules,
      lessonCount: fallbackModules.reduce((acc, m) => acc + m.lessons.length, 0),
    };

    return {
      courses: [primaryCourse],
      allModules: fallbackModules,
      allLessons: fallbackModules.flatMap((m) =>
        m.lessons.map((l) => ({
          ...l,
          module: { id: m.id, step: m.step, title: m.title, free: m.free },
        }))
      ),
    };
  }
}

/**
 * Hook React pour accéder au catalogue de cours complet, dynamique et synchronisé
 */
export function useLearnerCurriculum(courseId?: string) {
  const query = useQuery({
    queryKey: ["learner-curriculum"],
    queryFn: fetchPublishedCurriculum,
    staleTime: 30_000,
  });

  const courses = query.data?.courses || [];
  const allModules = query.data?.allModules || [];
  const allLessons = query.data?.allLessons || [];

  const currentCourse = courseId
    ? courses.find((c) => c.id === courseId) || courses[0]
    : courses[0];

  const currentModules = currentCourse ? currentCourse.modules : allModules;

  return {
    ...query,
    courses,
    currentCourse,
    currentModules,
    allLessons,
    totalLessons: allLessons.length || 1,
  };
}
