import { Donut, ModuleChart, type ChartData } from "@/components/app/Charts";
import { Leaderboard } from "@/components/app/Leaderboard";

export default function FormationInsights({ charts }: { charts: ChartData }) {
  return (
    <>
      <div className="mt-5 grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <ModuleChart data={charts.perModule} />
        </div>
        <Donut data={charts.pie} pct={charts.pct} />
      </div>
      <Leaderboard />
    </>
  );
}
