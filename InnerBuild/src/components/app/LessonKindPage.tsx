import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, FileText, Lock, Sparkles } from "lucide-react";
import { useLearnerCurriculum } from "@/lib/course-curriculum";
import { useProfile, useProgress } from "@/lib/learner";
import { Empty, PageHeader, Panel } from "./AppShell";

const meta = {
  text: { eyebrow: "Leçons texte", title: "Lire et comprendre", subtitle: "Les leçons écrites, à lire à ton rythme." },
  mixed: { eyebrow: "Leçons enrichies", title: "Texte, PDF et images", subtitle: "Le cours écrit accompagné de son support PDF et d'illustrations." },
  pdf: { eyebrow: "Supports PDF", title: "Documents & synthèses PDF", subtitle: "Les fiches, synthèses et supports complets au format PDF téléchargeables." },
} as const;

export function LessonKindPage({ kind }: { kind: keyof typeof meta }) {
  const { data: p } = useProfile();
  const { data: prog = [] } = useProgress();
  const { allLessons: loadedLessons, isLoading } = useLearnerCurriculum();
  const done = new Set(prog.map((x) => x.lesson_id));

  // Inclure les leçons dont le kind correspond ou qui possèdent un file_path pour les PDFs
  const rows = loadedLessons.filter((l) => {
    const actualKind = l.kind || (l.file_path ? "pdf" : "text");
    if (kind === "pdf") {
      return actualKind === "pdf" || Boolean(l.file_path);
    }
    return actualKind === kind;
  });

  const m = meta[kind];
  return (
    <>
      <PageHeader eyebrow={m.eyebrow} title={m.title} subtitle={m.subtitle} />
      <Panel>
        {rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((l) => {
              const row = (
                <>
                  {done.has(l.id) ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink flex items-center gap-2">
                      {l.title}
                      {l.file_path && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                          PDF
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.module?.courseTitle ? `${l.module.courseTitle} · ` : ""}
                      {l.module?.step ? `${l.module.step} · ` : ""}
                      {l.module?.title || "Module"} · {l.minutes} min
                    </p>
                  </div>
                  {l.file_path && <FileText className="h-4 w-4 text-accent" />}
                </>
              );
              return (
                <li key={l.id}>
                  <Link
                    to="/app/apprendre"
                    search={{ lecon: l.id }}
                    className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-muted transition-colors"
                  >
                    {row}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
            Chargement des ressources pédagogiques...
          </div>
        ) : (
          <Empty title="Rien pour le moment" text="Aucune leçon de ce format n'est encore publiée." />
        )}
      </Panel>
    </>
  );
}
