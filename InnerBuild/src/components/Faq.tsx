import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { useLanguage } from '@/lib/i18n';

export function Faq() {
  const { lang } = useLanguage();
  const [open, setOpen] = useState<number | null>(0);

  const faq = [
    {
      q: lang === 'fr' ? 'Que contient la formation ?' : 'What does the curriculum include?',
      a:
        lang === 'fr'
          ? 'Le parcours complet des skills ai-factory : la loi (7 skills internes), la méthode de livraison, puis la profondeur par domaine (3D, RAG, auth, CI, docs). Avec exercices sur tes propres briefs.'
          : 'Complete ai-factory skills curriculum: internal law (7 core skills), delivery methodology, and deep modules (3D, RAG, auth, CI/CD, documentation) with real builder briefs.',
    },
    {
      q: lang === 'fr' ? 'Que contient l’accompagnement ?' : 'What is included in mentorship?',
      a:
        lang === 'fr'
          ? 'On t’aide à écrire ton premier brief, on relit ton plan, et on revoit ta première livraison avec toi (checklists + points à corriger). Objectif : que tu saches refaire seul ensuite.'
          : 'We help draft your first spec, review your architecture plan, and thoroughly audit your code until production approval.',
    },
    {
      q: lang === 'fr' ? 'Comment s’effectue l’adhésion ?' : 'How do I enroll?',
      a:
        lang === 'fr'
          ? 'Directement via la plateforme en créant ton compte. Ton espace apprenant et l’ensemble des outils et cours sont débloqués immédiatement.'
          : 'Instantly on the platform by creating your builder account. Your dashboard, exercises, and courses unlock immediately.',
    },
    {
      q: lang === 'fr' ? 'Avec quels agents ça marche ?' : 'Which AI agents are supported?',
      a:
        lang === 'fr'
          ? 'Claude Code, Codex, OpenCode, Cursor, et tout agent compatible Agent Skills (format SKILL.md standard). La sync vers chaque agent est fournie (pnpm run skills:sync).'
          : 'Claude Code, Codex, OpenCode, Cursor, and any Agent Skills-compliant LLM system (SKILL.md format). Sync commands are built-in.',
    },
    {
      q: lang === 'fr' ? 'Les 212 skills sont-ils à jour ?' : 'Are the 212 skills kept up-to-date?',
      a:
        lang === 'fr'
          ? 'Le registre est curé et versionné : chaque extraction est tracée (provenance + DECISIONS.md). Les mises à jour sont incluses dans ton accès.'
          : 'The registry is versioned and curated. Continuous upstream improvements and security patches are included in your access.',
    },
    {
      q: lang === 'fr' ? 'Faut-il déjà savoir coder ?' : 'Do I need prior coding experience?',
      a:
        lang === 'fr'
          ? 'Non. La méthode part de zéro côté pilotage (spec, brief, boucle) et chaque notion technique est expliquée avant d’être utilisée. Savoir lire du code aide, mais l’agent fait le gros du travail.'
          : 'No. The curriculum starts from foundational principles (specs, briefs, autonomous loop) and explains concepts before execution.',
    },
    {
      q: lang === 'fr' ? 'Combien de temps pour finir ?' : 'How long does completion take?',
      a:
        lang === 'fr'
          ? 'À ton rythme, 100% à distance : 10 cours, 40+ leçons, QCM et rendus. Compte quelques semaines à raison de 3-4 h par semaine.'
          : '100% self-paced and remote: 10 courses, 40+ lessons, quizzes and hands-on deliverables. Typically a few weeks at 3-4 hours per week.',
    },
    {
      q: lang === 'fr' ? 'Que valent les certificats ?' : 'Are certificates verifiable?',
      a:
        lang === 'fr'
          ? 'Chaque cours terminé à 100% débloque un certificat vérifiable (ID unique), ajouté à ton portfolio public partageable. Des preuves tangibles.'
          : 'Every completed course issues a cryptographically verifiable certificate (unique credential ID) shareable on LinkedIn and portfolios.',
    },
  ];

  return (
    <section id="faq" aria-labelledby="faq-titre" className="scroll-mt-24 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid gap-10 md:grid-cols-[320px_1fr]">
          <div id="faq-titre">
            <SectionHeading
              eyebrow="FAQ"
              title={lang === 'fr' ? 'Questions' : 'Frequently Asked'}
              highlight={lang === 'fr' ? 'fréquentes.' : 'Questions.'}
              sub={
                lang === 'fr'
                  ? 'Tout ce qu’on nous demande avant de rejoindre. Sinon : contact@aifac.dev.'
                  : 'Everything you need to know before joining. Support: contact@aifac.dev.'
              }
            />
          </div>
          <div className="space-y-3">
            {faq.map((item, idx) => {
              const isOpen = open === idx;
              return (
                <Reveal key={item.q} delay={Math.min(idx, 3) * 60} variant="fade">
                  <div className={`rounded-2xl border bg-white transition-all ${isOpen ? 'border-ink/20 shadow-card' : 'border-line'}`}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left font-display text-base font-semibold text-ink"
                    >
                      {item.q}
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-accent transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen ? <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p> : null}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Faq;
