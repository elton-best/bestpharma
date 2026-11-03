import { Crown, Loader2, Medal, Trophy } from "lucide-react";
import { Empty, Panel } from "@/components/app/AppShell";
import { useLeaderboard } from "@/lib/community";

/** Classement de la cohorte : apprenants, progression et points. */
export function Leaderboard() {
  const { data = [], isLoading, error } = useLeaderboard();
  const [first, second, third] = data;
  const podium = [
    { r: second, place: 2, h: "h-24", icon: Medal, cls: "bg-muted text-ink" },
    { r: first, place: 1, h: "h-36", icon: Crown, cls: "bg-accent text-accent-foreground" },
    { r: third, place: 3, h: "h-16", icon: Medal, cls: "bg-amber/40 text-ink" },
  ];
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-accent" /><h2 className="text-xl font-extrabold text-ink">Leaderboard de la cohorte</h2></div>
      <Panel>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : error ? <p className="text-sm text-destructive">Classement indisponible.</p> : !data.length ? <Empty title="Pas encore de classement" text="Termine des leçons pour apparaître ici." /> : <>
          <div className="mx-auto flex max-w-lg items-end justify-center gap-3 pt-4 sm:gap-6">
            {podium.map(({ r, place, h, icon: I, cls }) => (
              <div key={place} className="flex min-w-0 flex-1 flex-col items-center">
                {r ? <>
                  <I className={`mb-1 h-6 w-6 ${place === 1 ? "text-accent" : "text-muted-foreground"}`} />
                  <span className={`grid h-12 w-12 place-items-center rounded-full border-2 font-bold ${place === 1 ? "h-16 w-16 border-accent text-lg" : "border-line"} bg-card text-ink`}>{(r.name || "?").slice(0, 2).toUpperCase()}</span>
                  <p className="mt-2 w-full truncate text-center text-sm font-bold text-ink">{r.name || "Apprenant"}</p>
                  <p className="text-center text-[11px] leading-snug text-muted-foreground sm:text-xs">{r.score} pts · {r.lessons} leçons</p>
                </> : <p className="text-xs text-muted-foreground">—</p>}
                <div className={`mt-2 grid w-full place-items-center rounded-t-xl font-display text-2xl font-extrabold ${h} ${cls}`}>{place}</div>
              </div>
            ))}
          </div>
          {data.length > 3 && <ol className="mt-6 divide-y divide-line border-t border-line">{data.slice(3).map((r, i) => (
            <li key={r.id || i} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate"><b className="mr-3 text-muted-foreground">{i + 4}</b><span className="text-ink">{r.name || "Apprenant"}</span></span><span className="shrink-0 text-xs text-muted-foreground"><span className="hidden sm:inline">{r.lessons} leçons · {r.validated} validé(s) · </span><b className="text-ink">{r.score} pts</b></span></li>
          ))}</ol>}
        </>}
      </Panel>
    </section>
  );
}
