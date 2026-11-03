import type { ReactNode } from 'react';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { useLanguage } from '@/lib/i18n';

function VisualShell({ tone, children, label }: { tone: string; children: ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} className={`flex aspect-[4/3.1] items-center justify-center rounded-[26px] border transition-transform duration-300 hover:-translate-y-1 ${tone}`}>
      {children}
    </div>
  );
}

function Step1Visual() {
  return (
    <VisualShell tone="border-[#E0E9FF] bg-[radial-gradient(120%_120%_at_50%_0%,#F4F7FF_0%,#E3ECFF_55%,#D6E4FF_100%)]" label="Parcours de formation avec checklists">
      <div className="w-[76%] rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between text-[11px] font-bold">
          <span className="text-ink">Parcours 212 skills</span>
          <span className="text-muted-foreground">5 étapes</span>
        </div>
        {['Méthode & boucle Done', 'Specs & TDD', '3D · RAG · Auth · CI'].map((t, i) => (
          <div key={t} className="mb-2.5 flex items-center gap-2.5 rounded-xl bg-paper px-3 py-2.5 text-xs font-semibold text-ink">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${i === 0 ? 'bg-accent' : 'bg-ink/20'}`}>
              {i + 1}
            </span>
            {t}
          </div>
        ))}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full w-2/3 rounded-full bg-accent" />
        </div>
      </div>
    </VisualShell>
  );
}

function Step2Visual() {
  return (
    <VisualShell tone="border-[#E6EFE8] bg-[radial-gradient(120%_120%_at_70%_0%,#F6FBF8_0%,#EEF6F1_60%,#E8F3EC_100%)]" label="Gabarit de brief relu">
      <div className="w-[76%] rounded-2xl border border-line bg-white p-5 shadow-card">
        <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Brief · scope IN / OUT</p>
        <div className="mt-3 space-y-2">
          <div className="h-2.5 w-11/12 rounded-full bg-ink/80" />
          <div className="h-2.5 w-3/4 rounded-full bg-ink/20" />
          <div className="h-2.5 w-2/3 rounded-full bg-ink/20" />
        </div>
        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          <span className="min-w-0 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">Relu avec toi</span>
          <span className="min-w-0 rounded-full bg-paper px-3 py-1 text-[10px] font-bold text-ink">15 min chrono</span>
        </div>
      </div>
    </VisualShell>
  );
}

function Step3Visual() {
  return (
    <VisualShell tone="border-[#E0E9FF] bg-[radial-gradient(120%_120%_at_50%_20%,#F4F7FF_0%,#E9EFFF_55%,#DDE7FF_100%)]" label="Agent qui planifie en boucle autonome">
      <div className="w-[76%] rounded-2xl border border-line bg-ink p-5 text-white shadow-card">
        <p className="font-mono text-[11px] text-white/50">$ agent.run --brief brief.md</p>
        <div className="mt-3 space-y-2 font-mono text-[11px]">
          <p><span className="text-emerald-400">[SKILL USED]</span> <span className="text-white/90">planning-and-task-breakdown</span></p>
          <p><span className="text-emerald-400">[SKILL USED]</span> <span className="text-white/90">test-driven-development</span></p>
          <p className="text-orange-300">loop: plan → build → review…</p>
        </div>
        <p className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold">0 question sauf bloquant</p>
      </div>
    </VisualShell>
  );
}

function Step4Visual() {
  return (
    <VisualShell tone="border-[#FDF0B0] bg-[radial-gradient(120%_120%_at_50%_20%,#FFFDF0_0%,#FFF8DB_50%,#FEF0B8_100%)]" label="Revue de livraison jusqu’à Done">
      <div className="w-[76%] rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between text-[11px] font-bold">
          <span className="text-ink">Revue · livraison 01</span>
          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] text-accent">Jusqu’à Done</span>
        </div>
        {[
          { t: 'Checklist 100% cochée', done: true },
          { t: 'Preuves jointes (tests, build)', done: true },
          { t: '2 points à corriger', done: false },
        ].map((r) => (
          <div key={r.t} className="mb-2 flex items-center gap-2.5 text-xs font-medium text-ink">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${r.done ? 'bg-emerald-500 text-white' : 'border-2 border-ink/20'}`}>
              {r.done ? (
                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                  <path d="M2.5 6.2 L5 8.5 L9.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </span>
            {r.t}
          </div>
        ))}
      </div>
    </VisualShell>
  );
}

function Step5Visual() {
  return (
    <VisualShell tone="border-[#E0F2FE] bg-[radial-gradient(120%_120%_at_50%_0%,#F0F9FF_0%,#E0F2FE_60%,#BAE6FD_100%)]" label="Validation finale et autonomie">
      <div className="w-[76%] text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-white shadow-card">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15l-2 5l9-11h-7l2-5l-9 11h7z" />
          </svg>
        </div>
        <p className="mt-4 font-display text-base font-bold text-ink">Autonome pour la suite</p>
        <p className="mt-1 text-xs text-muted-foreground">Tu sais cadrer, piloter, relire et faire valider.</p>
      </div>
    </VisualShell>
  );
}

const steps = [
  {
    n: '01',
    titleFr: 'Tu te formes aux 212 skills',
    titleEn: 'Master the 212 skills',
    textFr: 'Tu suis le parcours guidé : la loi d’abord, la méthode de livraison, puis chaque skill par domaine (3D, RAG, auth, CI, docs). À ton rythme, avec checklists et exemples.',
    textEn: 'Follow the guided path: the law first, delivery methodology, then domain skills (3D, RAG, auth, CI, docs). Self-paced with checklists and concrete examples.',
    outcomeFr: 'Même vocabulaire, même rigueur que ton mentor.',
    outcomeEn: 'Same shared vocabulary, same high standard as your mentor.',
    visual: <Step1Visual />,
  },
  {
    n: '02',
    titleFr: 'On cadre ton premier brief ensemble',
    titleEn: 'Scope your first brief together',
    textFr: 'Tu viens avec ton idée ou ton projet. On applique spec-driven-development : scope IN, scope OUT, critères mesurables. 15 minutes pour éviter trois semaines de hors-sujet.',
    textEn: 'Bring your idea or client project. We apply spec-driven development: scope IN, scope OUT, measurable criteria. 15 minutes to prevent 3 weeks of drift.',
    outcomeFr: 'Un cahier de charge clair que n’importe quel agent comprend.',
    outcomeEn: 'A crisp, ambiguity-free brief any autonomous agent understands.',
    visual: <Step2Visual />,
  },
  {
    n: '03',
    titleFr: 'L’agent livre en boucle autonome',
    titleEn: 'Agent executes autonomous loop',
    textFr: 'Grâce aux skills intégrés (ROUTER, TDD, review), l’agent avance tâche par tâche. Il suit la checklist, teste au fur et à mesure et s’arrête uniquement en cas de blocage critique.',
    textEn: 'Leveraging integrated skills (ROUTER, TDD, code review), your agent progresses task by task, tests continuously, and halts only on critical blockers.',
    outcomeFr: 'Du code propre, testé, qui respecte la spec initiale.',
    outcomeEn: 'Clean, fully tested code that strictly adheres to the initial specification.',
    visual: <Step3Visual />,
  },
  {
    n: '04',
    titleFr: 'On revoit ta livraison jusqu’à Done',
    titleEn: 'Review your submission to Done',
    textFr: 'Tu soumets ton travail. On relit ton code, tes tests et ton rendu. S’il reste un cas limite ou un bug, on t’explique comment le faire corriger par l’agent jusqu’à validation complète.',
    textEn: 'Submit your deliverables. We review code, test coverage, and visual output. If edge cases remain, we guide you to prompt fixes until 100% acceptance.',
    outcomeFr: 'Une première vraie livraison validée, sans approximation.',
    outcomeEn: 'Your first certified production delivery with zero compromises.',
    visual: <Step4Visual />,
  },
  {
    n: '05',
    titleFr: 'Tu sais refaire seul, sur tous tes projets',
    titleEn: 'Replicate autonomously across all future builds',
    textFr: 'Une fois la boucle bouclée une première fois avec nous, la méthode est imprimée. Tu l’appliques sur tes prochains chantiers, pour tes clients ou tes propres produits.',
    textEn: 'Once the loop is conquered with us, the muscle memory is forged. Apply it across all future projects for clients or your own SaaS.',
    outcomeFr: 'L’autonomie complète avec des agents IA.',
    outcomeEn: 'Complete production independence with autonomous AI agents.',
    visual: <Step5Visual />,
  },
];

function StepConnector({ label }: { label: string }) {
  return (
    <div aria-hidden="true" className="flex justify-center py-3 md:py-4">
      <div className="flex flex-col items-center">
        <span className="h-8 w-[2px] rounded-full bg-gradient-to-b from-accent/70 to-accent/20" />
        <span className="mt-1 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-ink shadow-card ring-1 ring-line">
          <span>{label}</span>
          <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 text-accent">
            <path d="M6 1.5 V10 M2.8 7.2 L6 10.2 L9.2 7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function Methode() {
  const { lang } = useLanguage();

  return (
    <section id="methode" aria-labelledby="methode-titre" className="scroll-mt-24 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div id="methode-titre">
          <SectionHeading
            eyebrow={lang === 'fr' ? "La méthode" : "The Method"}
            title={lang === 'fr' ? "Cinq étapes," : "Five steps,"}
            highlight={lang === 'fr' ? "de la théorie à l’autonomie." : "from theory to autonomy."}
            sub={
              lang === 'fr'
                ? "Une progression pensée pour t’amener à ta première livraison validée, puis te laisser voler de tes propres ailes."
                : "A progression engineered to take you to your first validated deliverable, then empower you to build freely."
            }
          />
        </div>

        <div>
          {steps.map((s, idx) => {
            const reversed = idx % 2 === 1;
            const title = lang === 'fr' ? s.titleFr : s.titleEn;
            const text = lang === 'fr' ? s.textFr : s.textEn;
            const outcome = lang === 'fr' ? s.outcomeFr : s.outcomeEn;

            return (
              <div key={s.n}>
                <Reveal variant={reversed ? 'right' : 'left'}>
                  <div className="grid items-center gap-8 py-8 md:grid-cols-2 md:gap-14 md:py-10">
                    <div className={reversed ? 'md:order-2' : ''}>{s.visual}</div>
                    <div className={reversed ? 'md:order-1' : ''}>
                      <p className="inline-flex items-center gap-2 rounded-full bg-ink/[0.05] px-3 py-1 text-xs font-semibold text-ink">
                        <span className="font-display font-bold">
                          {lang === 'fr' ? `ÉTAPE ${s.n}` : `STEP ${s.n}`}
                        </span>
                      </p>
                      <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                        {title}
                      </h3>
                      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                        {text}
                      </p>
                      <p className="mt-4 border-l-[3px] border-accent pl-4 text-sm leading-relaxed text-ink">
                        <span className="font-semibold">{lang === 'fr' ? "Résultat : " : "Outcome: "}</span>
                        {outcome}
                      </p>
                    </div>
                  </div>
                </Reveal>
                {idx < steps.length - 1 ? (
                  <StepConnector label={lang === 'fr' ? `Étape ${steps[idx + 1]?.n}` : `Step ${steps[idx + 1]?.n}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Methode;
