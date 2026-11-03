import { useState } from "react";
import {
  ShieldCheck,
  LogOut,
  Copy,
  Check,
  FileText,
  Trophy,
  Award,
  Menu,
  X,
} from "lucide-react";
import { LogoMark } from "./Logo";
import { toast } from "@/components/ui/heroui-toast";

interface JurySidebarProps {
  juryName: string;
  juryCode: string;
  onLogout: () => void;
  submissionCount: number;
  evaluatedCount: number;
  onOpenCriteriaModal: () => void;
  selectedSub: any;
  onClearSelectedSub: () => void;
}

export function JurySidebar({
  juryName,
  juryCode,
  onLogout,
  submissionCount,
  evaluatedCount,
  onOpenCriteriaModal,
  selectedSub,
  onClearSelectedSub,
}: JurySidebarProps) {
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(juryCode);
    setCopied(true);
    toast.success(`Code ${juryCode} copié !`);
    setTimeout(() => setCopied(false), 2000);
  }

  const content = (
    <div className="flex h-full flex-col justify-between p-4 sm:p-5">
      <div className="space-y-6">
        {/* Brand header */}
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <LogoMark size={34} />
          <div>
            <span className="block font-display text-sm font-black tracking-tight text-ink">
              The InnerBuild
            </span>
            <span className="block font-mono text-[10px] font-bold text-accent">
              COLLÈGE DES JURYS
            </span>
          </div>
        </div>

        {/* Juror Profile Box */}
        <div className="rounded-xl border border-line bg-paper p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Juré accrédité
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="font-bold text-ink text-sm truncate">{juryName}</p>
          <div className="flex items-center justify-between pt-1 border-t border-line/60">
            <span className="font-mono text-xs text-muted-foreground font-semibold">
              {juryCode}
            </span>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copié" : "Copier"}</span>
            </button>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              if (selectedSub) onClearSelectedSub();
              setMobileOpen(false);
            }}
            className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
              !selectedSub
                ? "bg-ink text-white shadow-sm"
                : "text-ink hover:bg-paper"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Trophy className="h-4 w-4 text-accent" />
              <span>Projets à évaluer</span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                !selectedSub ? "bg-white/20 text-white" : "bg-ink/10 text-ink"
              }`}
            >
              {evaluatedCount}/{submissionCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenCriteriaModal();
              setMobileOpen(false);
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-paper hover:text-ink transition"
          >
            <FileText className="h-4 w-4 text-accent" />
            <span>Grille & Critères (7D)</span>
          </button>
        </nav>
      </div>

      {/* Bottom Logout (ONLY way out of the session) */}
      <div className="border-t border-line pt-4 space-y-2">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 font-display text-xs font-bold text-ink shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar toggle */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-line bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="font-display text-xs font-bold text-ink">
            Jury · The InnerBuild
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper text-ink"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-full bg-card shadow-2xl">
            {content}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-line bg-card">
        {content}
      </aside>
    </>
  );
}

export default JurySidebar;
