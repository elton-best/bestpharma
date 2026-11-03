import { useEffect, useState } from "react";
import { CpuArchitecture } from "./cpu-architecture";
import {
  Bot,
  Code2,
  Database,
  Layers,
  Palette,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";

interface SitePreloaderProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

const STREAMING_SKILLS = [
  { icon: Bot, label: "orchestrator", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  { icon: Code2, label: "frontend-react", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  { icon: Server, label: "backend-node", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
  { icon: ShieldCheck, label: "security", color: "text-rose-500 bg-rose-500/10 border-rose-500/30" },
  { icon: Workflow, label: "spec-driven", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
  { icon: Palette, label: "design-system", color: "text-purple-500 bg-purple-500/10 border-purple-500/30" },
  { icon: Terminal, label: "qa-devops", color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30" },
  { icon: Layers, label: "library-212", color: "text-accent bg-accent/10 border-accent/30" },
];

export function SitePreloader({
  message = "Initialisation du Core AI Factory",
  subMessage = "Synchronisation des skills & orchestration des agents...",
  fullScreen = true,
}: SitePreloaderProps) {
  const [activeSkillIndex, setActiveSkillIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSkillIndex((prev) => (prev + 1) % STREAMING_SKILLS.length);
      setProgress((p) => (p >= 92 ? 92 : p + Math.floor(Math.random() * 12 + 5)));
    }, 450);
    return () => clearInterval(timer);
  }, []);

  const activeSkill = STREAMING_SKILLS[activeSkillIndex] ?? STREAMING_SKILLS[0]!;
  const Icon = activeSkill.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 ${
        fullScreen
          ? "fixed inset-0 z-[9999] min-h-screen w-screen bg-[#0b0f19] text-white selection:bg-accent/30"
          : "min-h-[420px] w-full rounded-2xl border border-line bg-[#0b0f19] p-8 text-white"
      }`}
    >
      {/* Background glow ambiance */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[340px] w-[500px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        {/* Animated incoming skill chip */}
        <div className="mb-2 flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-mono font-bold transition-all duration-300 ${activeSkill.color}`}
          >
            <Icon className="h-3.5 w-3.5 animate-spin-slow" />
            <span className="tracking-wide">SKILL : {activeSkill.label}</span>
            <Sparkles className="h-3 w-3 animate-pulse" />
          </div>
        </div>

        {/* CPU Architecture Animation SVG */}
        <div className="relative w-full max-w-lg aspect-[2/1] my-1">
          <CpuArchitecture
            text="AI FACTORY"
            animateText={true}
            animateLines={true}
            animateMarkers={true}
            className="w-full h-full drop-shadow-[0_0_25px_rgba(234,88,12,0.3)]"
          />

          {/* Floating Skill Stream Particles moving toward core */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {STREAMING_SKILLS.slice(0, 4).map((s, idx) => {
              const SIcon = s.icon;
              return (
                <div
                  key={s.label}
                  className={`absolute hidden sm:flex items-center justify-center rounded-lg border p-1.5 shadow-sm transition-all duration-700 animate-pulse ${s.color}`}
                  style={{
                    top: `${15 + idx * 18}%`,
                    left: idx % 2 === 0 ? "8%" : "82%",
                    animationDelay: `${idx * 0.4}s`,
                  }}
                >
                  <SIcon className="h-3.5 w-3.5" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Brand & Loading Info */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
            <h3 className="font-display text-base sm:text-lg font-black tracking-tight text-white">
              {message}
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
            {subMessage}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-5 w-full max-w-xs space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-accent transition-all duration-300 ease-out shadow-[0_0_12px_rgba(234,88,12,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>212 SKILLS CURÉS</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SitePreloader;
