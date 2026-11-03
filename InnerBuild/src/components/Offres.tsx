import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Star } from 'lucide-react';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { useLanguage } from '@/lib/i18n';

export function Offres() {
  const { lang } = useLanguage();

  const features =
    lang === 'fr'
      ? [
          '10 cours détaillés (40+ leçons texte + PDF)',
          'QCM notés avec correction + exercices',
          '3 évaluations indépendantes + rendus relus sous 48 h',
          'Certificats vérifiables + portfolio public',
          'Accès au repo complet (212 skills + mises à jour)',
          'Accompagnement : premier brief + revue jusqu’à Done',
        ]
      : [
          '10 deep-dive courses (40+ lessons in text + PDF)',
          'Graded quizzes with full solution breakdowns',
          'Independent project evaluations reviewed within 48h',
          'Verifiable on-chain certificates + builder portfolio',
          'Full repository access (212 curated skills + updates)',
          'Hands-on mentorship: from initial brief to verified Done',
        ];

  const steps =
    lang === 'fr'
      ? [
          { n: '1', title: 'Crée ton compte', desc: 'Email ou Google, inscription instantanée.' },
          { n: '2', title: 'Rejoins la promotion', desc: 'Accès ouvert immédiatement à ton espace apprenant.' },
          { n: '3', title: 'Accès débloqué', desc: 'Tout s’ouvre : cours, quiz, sandbox et dépôts de livrables.' },
        ]
      : [
          { n: '1', title: 'Create account', desc: 'Email or Google, instant enrollment.' },
          { n: '2', title: 'Enter workspace', desc: 'Immediate access to the builder dashboard.' },
          { n: '3', title: 'Start building', desc: 'All modules unlocked: courses, quizzes, sandbox.' },
        ];

  return (
    <section id="offres" aria-labelledby="offres-titre" className="scroll-mt-24 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div id="offres-titre">
          <SectionHeading
            eyebrow={lang === 'fr' ? 'Formule intégrale' : 'All-Inclusive Access'}
            title={lang === 'fr' ? 'Un accès complet.' : 'Full curriculum.'}
            highlight={lang === 'fr' ? 'Tout inclus.' : 'Everything included.'}
            sub={
              lang === 'fr'
                ? 'Le repo, la formation et l’accompagnement jusqu’à ta première livraison validée.'
                : 'The repository, masterclass, and direct reviews until your first verified production delivery.'
            }
          />
        </div>

        <div className="mx-auto max-w-xl">
          <Reveal variant="zoom">
            <article className="panel relative overflow-hidden p-8 md:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(251,191,36,0.22),transparent_70%)]"
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
                      {lang === 'fr' ? 'Formation + Accompagnement' : 'Masterclass + Mentorship'}
                    </p>
                    <p className="mt-2 flex items-end gap-2">
                      <span className="font-display text-4xl font-bold tracking-tight text-ink">
                        {lang === 'fr' ? 'Accès Intégral' : 'Full Access'}
                      </span>
                      <span className="pb-1 text-sm text-muted-foreground">
                        {lang === 'fr' ? 'Formation & Repo' : 'Curriculum & Codebase'}
                      </span>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent ring-1 ring-accent/25">
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                    {lang === 'fr' ? 'Formule unique' : 'All-in-one'}
                  </span>
                </div>

                <Link
                  to="/auth"
                  search={{ mode: 'signup' }}
                  className="btn-glow mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3.5 font-display text-base font-bold text-white"
                >
                  {lang === 'fr' ? 'Commencer : créer mon compte' : 'Start now: create account'}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>

                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span className="font-medium">{f}</span>
                    </li>
                  ))}
                </ul>

                <ol className="mt-6 grid gap-2 border-t border-line pt-5 sm:grid-cols-3">
                  {steps.map((s) => (
                    <li key={s.n} className="rounded-xl bg-paper p-3.5">
                      <p className="font-display text-xs font-bold text-accent">
                        {lang === 'fr' ? `ÉTAPE ${s.n}` : `STEP ${s.n}`}
                      </p>
                      <p className="mt-1 font-display text-sm font-bold text-ink">{s.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          </Reveal>
        </div>

        <Reveal variant="fade" delay={150}>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {lang === 'fr'
              ? 'Accès immédiat ouvert dès validation de votre inscription.'
              : 'Immediate access granted upon account activation.'}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default Offres;
