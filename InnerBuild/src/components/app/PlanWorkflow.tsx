import { useState } from "react";
import { Check, CheckCircle, Refresh, Copy, ArrowRight, Sparkles } from "reicon-react";
import { toast } from "sonner";

export type StepStatus = "pending" | "in_progress" | "completed";

export interface PlanStep {
  id: string | number;
  title: string;
  description?: string;
  status: StepStatus;
}

export interface PlanWorkflowProps {
  title?: string;
  subtitle?: string;
  steps: PlanStep[];
  onToggleStep?: (id: string | number) => void;
  className?: string;
  collapsible?: boolean;
}

export function PlanWorkflow({
  title = "Plan d'exécution & Suivi des tâches",
  subtitle,
  steps: initialSteps,
  onToggleStep,
  className = "",
  collapsible = true,
}: PlanWorkflowProps) {
  const [steps, setSteps] = useState<PlanStep[]>(initialSteps);
  const [isOpen, setIsOpen] = useState(true);

  // Sync if prop updates
  useState(() => {
    setSteps(initialSteps);
  });

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function toggle(id: string | number) {
    if (onToggleStep) {
      onToggleStep(id);
      return;
    }
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextStatus: StepStatus =
          s.status === "completed" ? "pending" : s.status === "pending" ? "in_progress" : "completed";
        return { ...s, status: nextStatus };
      })
    );
  }

  function handleCopy() {
    const text = [
      `# ${title}`,
      subtitle ? `${subtitle}\n` : "",
      ...steps.map(
        (s, idx) =>
          `${idx + 1}. [${s.status === "completed" ? "x" : s.status === "in_progress" ? "~" : " "}] ${s.title}${
            s.description ? ` - ${s.description}` : ""
          }`
      ),
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    toast.success("Plan copié dans le presse-papier");
  }

  return (
    <div
      className={`rounded-2xl border border-line bg-card/95 shadow-sm overflow-hidden transition-all ${className}`}
    >
      {/* Plan Header */}
      <div className="p-4 border-b border-line/70 bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Sparkles size={16} />
            </span>
            <div>
              <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                {title}
                <span className="font-mono text-[11px] font-semibold text-accent px-2 py-0.5 rounded-full bg-accent/10">
                  {completedCount}/{totalCount} terminées
                </span>
              </h4>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              title="Copier le plan"
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-ink transition-colors"
            >
              <Copy size={14} />
            </button>
            {collapsible && (
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-ink rounded-md transition-colors"
              >
                {isOpen ? "Réduire" : "Déplier"}
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono text-[11px] font-bold text-muted-foreground shrink-0">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Step List */}
      {isOpen && (
        <div className="p-3 divide-y divide-line/40 space-y-1">
          {steps.map((step, index) => {
            const isCompleted = step.status === "completed";
            const isInProgress = step.status === "in_progress";

            return (
              <div
                key={step.id}
                onClick={() => toggle(step.id)}
                className={`group flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                  isInProgress
                    ? "bg-accent/5 border border-accent/25 shadow-xs"
                    : isCompleted
                    ? "opacity-85 hover:bg-muted/30"
                    : "hover:bg-muted/40"
                }`}
              >
                {/* Status Icon Indicator */}
                <button
                  type="button"
                  aria-label="Statut de l'étape"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                    isCompleted
                      ? "bg-accent border-accent text-paper shadow-xs"
                      : isInProgress
                      ? "border-accent bg-accent/15 text-accent animate-pulse"
                      : "border-line bg-card group-hover:border-accent/50 text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={12} className="stroke-[2.5]" />
                  ) : isInProgress ? (
                    <span className="h-2 w-2 rounded-full bg-accent" />
                  ) : (
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
                </button>

                {/* Step Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs font-semibold leading-snug transition-colors ${
                        isCompleted
                          ? "line-through text-muted-foreground"
                          : isInProgress
                          ? "text-accent font-bold"
                          : "text-ink"
                      }`}
                    >
                      {step.title}
                    </p>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded capitalize shrink-0 font-medium ${
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : isInProgress
                          ? "bg-accent/15 text-accent font-bold"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? "Fait" : isInProgress ? "En cours" : "À faire"}
                    </span>
                  </div>

                  {step.description && (
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Parses markdown tasklists `- [ ]`, `- [x]`, or numbered steps into structured PlanSteps */
export function parseMarkdownToPlan(markdown: string): PlanStep[] {
  const lines = markdown.split("\n");
  const steps: PlanStep[] = [];
  let id = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    // Match - [ ] or - [x] or - [~]
    const taskMatch = trimmed.match(/^-\s*\[([ x~])\]\s*(.+)$/i);
    if (taskMatch) {
      const state = taskMatch[1]!.toLowerCase();
      steps.push({
        id: id++,
        title: taskMatch[2]!,
        status: state === "x" ? "completed" : state === "~" ? "in_progress" : "pending",
      });
      continue;
    }

    // Match numbered tasks: 1. Étape ... or 1) ...
    const numMatch = trimmed.match(/^\d+[\.\)]\s*(.+)$/);
    if (numMatch && (trimmed.toLowerCase().includes("étape") || trimmed.toLowerCase().includes("tâche") || trimmed.toLowerCase().includes("step"))) {
      steps.push({
        id: id++,
        title: numMatch[1]!,
        status: "pending",
      });
    }
  }

  return steps;
}
