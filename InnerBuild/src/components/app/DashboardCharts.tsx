import { useEffect, useState } from "react";
import { ActivityChart, Donut, ModuleChart, type ChartData } from "@/components/app/Charts";

export default function DashboardCharts({ charts }: { charts: ChartData }) {
  const [showDetailedChart, setShowDetailedChart] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setShowDetailedChart(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <>
      <div className="mt-5 grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <ActivityChart data={charts.activity} />
        </div>
        <Donut data={charts.pie} pct={charts.pct} />
      </div>
      {showDetailedChart && (
        <div className="mt-6">
          <ModuleChart data={charts.perModule} />
        </div>
      )}
    </>
  );
}
