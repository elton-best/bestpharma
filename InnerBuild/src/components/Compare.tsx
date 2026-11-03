import { Check } from 'lucide-react';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { useLanguage } from '@/lib/i18n';

export function Compare() {
  const { lang } = useLanguage();

  const groups = [
    {
      title: lang === 'fr' ? 'Le repo' : 'The Codebase',
      items:
        lang === 'fr'
          ? ['212 skills curés en 6 rayons', 'Gabarits spec + brief agent', 'Mises à jour incluses']
          : ['212 curated skills across 6 domains', 'Spec templates & agent briefs', 'Continuous updates included'],
    },
    {
      title: lang === 'fr' ? 'La formation' : 'The Curriculum',
      items:
        lang === 'fr'
          ? ['Parcours guidé à ton rythme', 'Arsenal 3D : 45 effets', 'Playbooks Pro (RAG, auth, landing)']
          : ['Self-paced guided masterclass', '3D Arsenal: 45 shaders & motions', 'Pro Playbooks (RAG, auth, SaaS)'],
    },
    {
      title: lang === 'fr' ? 'L’accompagnement' : 'The Mentorship',
      items:
        lang === 'fr'
          ? ['Aide à ton premier brief', 'Relecture de ton plan', 'Revue de ta livraison jusqu’à Done']
          : ['Assistance on your first brief', 'Plan & architecture review', 'Direct code review until Done'],
    },
  ];

  return (
    <section id="comparatif" aria-labelledby="comparatif-titre" className="scroll-mt-24 py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div id="comparatif-titre">
          <SectionHeading
            eyebrow={lang === 'fr' ? 'Inclus' : 'Included'}
            title={lang === 'fr' ? 'Le détail,' : 'Everything included,'}
            highlight={lang === 'fr' ? 'sans astérisque.' : 'with zero hidden asterisks.'}
            sub={
              lang === 'fr'
                ? 'Voici exactement ce que ton adhésion débloque de bout en bout.'
                : 'Here is exactly what your enrollment unlocks from start to finish.'
            }
          />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {groups.map((g, idx) => (
            <Reveal key={g.title} delay={idx * 90} variant="fade" className="h-full">
              <article className="panel h-full p-6 md:p-7">
                <h3 className="font-display text-lg font-bold text-ink">{g.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {g.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-ink">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal delay={150}>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {lang === 'fr'
              ? 'Accès immédiat à l’ensemble des outils et de l’espace apprenant.'
              : 'Instant access to all tools, curriculum, and builder dashboard.'}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default Compare;
