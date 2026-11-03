import { modules, totalLessons } from "@/data/course";

export type ProgressPoint = { lesson_id: string; completed_at: string };

export function getChartData(prog: ProgressPoint[]) {
  const done = new Set(prog.map((point) => point.lesson_id));
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    return date;
  });

  let cumulative = prog.filter((point) => new Date(point.completed_at) < days[0]!).length;
  const activity = days.map((day) => {
    const count = prog.filter(
      (point) => new Date(point.completed_at).toDateString() === day.toDateString(),
    ).length;
    cumulative += count;
    return {
      day: day.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      leçons: count,
      cumul: cumulative,
    };
  });

  const perModule = modules.map((module) => {
    const completed = module.lessons.filter((lesson) => done.has(lesson.id)).length;
    return {
      step: module.step,
      faites: completed,
      restantes: module.lessons.length - completed,
    };
  });

  return {
    activity,
    perModule,
    pie: [
      { name: "Terminées", value: done.size },
      { name: "Restantes", value: Math.max(0, totalLessons - done.size) },
    ],
    pct: Math.round((done.size / totalLessons) * 100),
  };
}

export type ChartData = ReturnType<typeof getChartData>;
