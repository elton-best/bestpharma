import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ShieldCheck,
  LogOut,
  Copy,
  Check,
  FileText,
  ExternalLink,
  Menu,
  X,
  Sparkles,
  Trophy,
  HelpCircle,
  Award,
} from 'lucide-react';
import { LogoMark } from './Logo';
import { toast } from '@/components/ui/heroui-toast';

interface JuryNavbarProps {
  juryName?: string | undefined;
  juryCode?: string | undefined;
  onLogout?: (() => void) | undefined;
  submissionCount?: number | undefined;
  evaluatedCount?: number | undefined;
  activeChallengeTitle?: string | undefined;
  onOpenCriteriaModal?: (() => void) | undefined;
}

export function JuryNavbar({
  juryName,
  juryCode,
  onLogout,
  submissionCount,
  evaluatedCount,
  activeChallengeTitle,
  onOpenCriteriaModal,
}: JuryNavbarProps) {
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function copyCode() {
    if (!juryCode) return;
    navigator.clipboard.writeText(juryCode);
    setCopied(true);
    toast.success(`Code ${juryCode} copié dans le presse-papier !`);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-card/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Accreditation */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 focus-visible:outline-none">
            <LogoMark size={32} />
            <div className="leading-none">
              <span className="font-display text-sm font-black tracking-tight text-ink">
                AIFAC
              </span>
              <span className="block text-[10px] font-mono font-bold text-accent">
                INNERBUILD
              </span>
            </div>
          </Link>

          <span className="hidden sm:inline-block text-line">/</span>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Portail Jury</span>
          </div>
        </div>

        {/* Center: Navigation Links Desktop */}
        <nav className="hidden lg:flex items-center gap-1 bg-paper/80 rounded-full border border-line p-1 text-xs font-semibold">
          <Link
            to="/jury"
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-ink hover:bg-card transition"
          >
            <Trophy className="h-3.5 w-3.5 text-accent" />
            <span>Évaluations</span>
            {typeof submissionCount === 'number' && (
              <span className="rounded-full bg-ink px-1.5 py-0.2 text-[10px] font-mono font-bold text-white">
                {evaluatedCount ?? 0}/{submissionCount}
              </span>
            )}
          </Link>

          {onOpenCriteriaModal && (
            <button
              type="button"
              onClick={onOpenCriteriaModal}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-muted-foreground hover:text-ink hover:bg-card transition"
            >
              <FileText className="h-3.5 w-3.5 text-accent" />
              <span>Grille & Critères</span>
            </button>
          )}

          <Link
            to="/the-innerbuild"
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-muted-foreground hover:text-ink hover:bg-card transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>THE InnerBuild</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-muted-foreground hover:text-ink hover:bg-card transition"
          >
            <span>AI Factory</span>
          </Link>
        </nav>

        {/* Right: Jury profile and logout */}
        <div className="flex items-center gap-2.5">
          {juryCode ? (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs">
              <div className="text-right leading-tight">
                <p className="font-bold text-ink truncate max-w-[140px] sm:max-w-[180px]">
                  {juryName || 'Membre du Jury'}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Code:</span>
                  <button
                    onClick={copyCode}
                    title="Copier le code juré"
                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-accent hover:underline"
                  >
                    {juryCode}
                    {copied ? (
                      <Check className="h-2.5 w-2.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-2.5 w-2.5 text-muted-foreground hover:text-ink" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {onLogout ? (
            <button
              onClick={onLogout}
              title="Se déconnecter de l'espace jury"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 font-display text-xs font-bold text-ink shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          ) : (
            <Link
              to="/the-innerbuild"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 font-display text-xs font-bold text-ink shadow-sm transition hover:border-accent hover:text-accent"
            >
              <span>Présentation</span>
            </Link>
          )}

          {/* Mobile burger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu jury"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-line bg-card p-4 space-y-3 lg:hidden">
          {activeChallengeTitle && (
            <div className="rounded-lg bg-paper p-2.5 text-xs">
              <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                Challenge en cours :
              </span>
              <p className="font-bold text-ink truncate">{activeChallengeTitle}</p>
            </div>
          )}

          {juryCode && (
            <div className="flex items-center justify-between rounded-lg border border-line p-2.5 text-xs bg-paper">
              <div>
                <p className="font-bold text-ink">{juryName}</p>
                <p className="font-mono text-[10px] text-muted-foreground">Code : {juryCode}</p>
              </div>
              <button
                onClick={copyCode}
                className="btn-base btn-ghost text-xs inline-flex items-center gap-1"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Copier</span>
              </button>
            </div>
          )}

          <nav className="flex flex-col gap-1.5 pt-1 text-xs font-semibold">
            <Link
              to="/jury"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-ink hover:bg-paper"
            >
              <Trophy className="h-4 w-4 text-accent" />
              <span>Projets à évaluer ({submissionCount ?? 0})</span>
            </Link>

            {onOpenCriteriaModal && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCriteriaModal();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-ink hover:bg-paper"
              >
                <FileText className="h-4 w-4 text-accent" />
                <span>Grille & Critères de Notation</span>
              </button>
            )}

            <Link
              to="/the-innerbuild"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-ink hover:bg-paper"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Présentation THE InnerBuild</span>
            </Link>

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-paper"
            >
              <span>Accueil AI Factory</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export default JuryNavbar;
