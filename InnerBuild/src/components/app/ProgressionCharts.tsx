import { ActivityChart, Donut, ModuleChart, type ChartData } from "@/components/app/Charts";

export default function ProgressionCharts({ charts }: { charts: ChartData }) {
  return (
    <>
      <div className="mt-5 grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <ActivityChart data={charts.activity} />
        </div>
        <Donut data={charts.pie} pct={charts.pct} />
      </div>
      <div className="mt-5 sm:mt-6">
        <ModuleChart data={charts.perModule} />
      </div>
    </>
  );
}
