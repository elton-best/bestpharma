import { useEffect, useRef, useState } from "react";

type Metric = {
  name: string;
  value: number;
  unit: string;
  sub: string;
};

const METRICS: Metric[] = [
  { name: "CORE LOAD", value: 88, unit: "%", sub: "Agents & Calcul" },
  { name: "SKILLS SYNC", value: 100, unit: "%", sub: "212/212 skills actifs" },
  { name: "TDD COVERAGE", value: 96, unit: "%", sub: "Checklists & Tests verts" },
  { name: "DONE RATE", value: 99, unit: "%", sub: "Validation sans blocage" },
];

const DEFAULT_METRIC: Metric = METRICS[0]!;
const SPEEDS = [1, 2, 4];

export function ZenithHud({ compact = false }: { compact?: boolean }) {
  const [metricIdx, setMetricIdx] = useState(0);
  const [value, setValue] = useState(88);
  const [paused, setPaused] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);

  const stackRef = useRef<HTMLDivElement>(null);
  const currentMetric = METRICS[metricIdx] ?? DEFAULT_METRIC;

  const circs = [2 * Math.PI * 88, 2 * Math.PI * 70, 2 * Math.PI * 52, 2 * Math.PI * 34];
  const speed = SPEEDS[speedIdx] ?? 1;

  useEffect(() => {
    let frame = 0;
    let rotateZ = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused) {
        rotateZ = (rotateZ + dt * 14 * speed) % 360;
        if (stackRef.current) {
          const billboards = stackRef.current.querySelectorAll<HTMLElement>(".hud-billboard");
          billboards.forEach((b) => {
            b.style.setProperty("--rz", `${rotateZ}deg`);
          });
        }
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paused, speed]);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      const base = currentMetric.value;
      const jitter = (Math.random() - 0.5) * 6;
      setValue(Math.min(100, Math.max(20, Math.round(base + jitter))));
    }, 2500);
    return () => clearInterval(interval);
  }, [paused, currentMetric]);

  const rotateMetric = () => {
    const nextIdx = (metricIdx + 1) % METRICS.length;
    setMetricIdx(nextIdx);
    setValue((METRICS[nextIdx] ?? DEFAULT_METRIC).value);
  };

  const cycleSpeed = () => {
    const nextSpeedIdx = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(nextSpeedIdx);
    if (stackRef.current) {
      stackRef.current.style.animationDuration = `${14 / (SPEEDS[nextSpeedIdx] ?? 1)}s`;
    }
  };

  const getOffset = (rIndex: number, val: number) => {
    const circ = circs[rIndex] ?? 500;
    return (circ * (1 - val / 100)).toFixed(2);
  };

  return (
    <div className="relative w-full overflow-hidden p-2 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)] animate-pulse" />
          <h3 className="font-display text-xs font-extrabold tracking-widest uppercase text-white">
            AIFAC<span className="text-accent ml-1">HUD</span>
          </h3>
        </div>
        <p className="font-mono text-[10px] font-semibold tracking-widest text-paper/70 uppercase">
          SYSTEM MONITOR · LIVE TELEMETRY
        </p>
      </div>

      {/* 3D Scene */}
      <div className="hud-stage my-1">
        <div className="hud-scene">
          <div ref={stackRef} className="hud-stack">
            {/* Ring 0 */}
            <div className="hud-ring-layer" style={{ ["--z" as any]: "0px" }}>
              <svg className="hud-ring-svg" viewBox="0 0 200 200">
                <circle className="hud-ring-track" cx="100" cy="100" r="88" />
                <circle
                  className="hud-ring-progress"
                  cx="100"
                  cy="100"
                  r="88"
                  style={{ strokeDasharray: circs[0], strokeDashoffset: getOffset(0, value) }}
                />
              </svg>
              <div className="hud-billboard">
                <span className="hud-ring-label">{METRICS[0]?.name}</span>
              </div>
            </div>

            {/* Ring 1 */}
            <div className="hud-ring-layer" style={{ ["--z" as any]: "44px" }}>
              <svg className="hud-ring-svg" viewBox="0 0 200 200">
                <circle className="hud-ring-track" cx="100" cy="100" r="70" />
                <circle
                  className="hud-ring-progress hud-ring-progress--blue"
                  cx="100"
                  cy="100"
                  r="70"
                  style={{ strokeDasharray: circs[1], strokeDashoffset: getOffset(1, Math.min(100, value * 0.95)) }}
                />
              </svg>
              <div className="hud-billboard">
                <span className="hud-ring-label">{METRICS[1]?.name}</span>
              </div>
            </div>

            {/* Ring 2 */}
            <div className="hud-ring-layer" style={{ ["--z" as any]: "88px" }}>
              <svg className="hud-ring-svg" viewBox="0 0 200 200">
                <circle className="hud-ring-track" cx="100" cy="100" r="52" />
                <circle
                  className="hud-ring-progress hud-ring-progress--dim"
                  cx="100"
                  cy="100"
                  r="52"
                  style={{ strokeDasharray: circs[2], strokeDashoffset: getOffset(2, Math.min(100, value * 0.88)) }}
                />
              </svg>
              <div className="hud-billboard">
                <span className="hud-ring-label">{METRICS[2]?.name}</span>
              </div>
            </div>

            {/* Ring 3 */}
            <div className="hud-ring-layer hud-ring-layer--base" style={{ ["--z" as any]: "132px" }}>
              <svg className="hud-ring-svg" viewBox="0 0 200 200">
                <circle className="hud-ring-track hud-ring-track--faint" cx="100" cy="100" r="34" />
                <circle
                  className="hud-ring-progress hud-ring-progress--faint"
                  cx="100"
                  cy="100"
                  r="34"
                  style={{ strokeDasharray: circs[3], strokeDashoffset: getOffset(3, Math.min(100, value * 0.92)) }}
                />
              </svg>
              <div className="hud-billboard">
                <span className="hud-ring-label">{METRICS[3]?.name}</span>
              </div>
            </div>
          </div>

          {/* Metric display */}
          <div className="hud-metric-display">
            <span className="hud-metric-value">{value}</span>
            <span className="hud-metric-unit">{currentMetric.unit}</span>
            <span className="hud-metric-name">{currentMetric.name}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            className="rounded-lg bg-accent/90 px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-white transition hover:bg-accent"
          >
            {paused ? "RESUME SIM" : "PAUSE SIM"}
          </button>
          <button
            type="button"
            onClick={cycleSpeed}
            className="rounded-lg border border-white/20 px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-white/80 transition hover:bg-white/10"
          >
            SPEED: {speed}x
          </button>
          <button
            type="button"
            onClick={rotateMetric}
            className="rounded-lg border border-white/20 px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-white/80 transition hover:bg-white/10"
          >
            NEXT METRIC
          </button>
        </div>
      )}
    </div>
  );
}

export default ZenithHud;
