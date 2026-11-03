import { Check, X } from 'lucide-react';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { useLanguage } from '@/lib/i18n';

export function Fit() {
  const { lang } = useLanguage();

  const yes =
    lang === 'fr'
      ? [
          'Tu veux livrer, pas collectionner des tutoriels',
          'Tu as des bases en code (n’importe quel langage)',
          '5h par semaine à mettre sur la table',
          'Tu veux être challengé sur ton code',
          'Objectif concret : un produit, un client, un niveau',
        ]
      : [
          'You want to ship production software, not collect tutorial badges',
          'You have foundational coding basics in any modern language',
          'You can commit 5 hours per week of disciplined work',
          'You welcome rigorous code and architecture feedback',
          'Clear objective: build real products and elevate your craft',
        ];

  const no =
    lang === 'fr'
      ? [
          'Tu veux juste regarder des vidéos passivement',
          'Zéro base et zéro temps dispo',
          'Tu veux qu’on code à ta place',
          'Tu collectionnes uniquement des certificats décoratifs',
          'Les checklists te donnent de l’urticaire',
        ]
      : [
          'You just want to binge-watch video lessons passively',
          'Zero programming basics and zero availability',
          'You expect others to write the code for you',
          'You only care about vanity LinkedIn credentials',
          'You dislike disciplined checklists and peer code reviews',
        ];

  return (
    <section aria-labelledby="fit-titre" className="scroll-mt-24 bg-white border-y border-line py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeading
          eyebrow={lang === 'fr' ? 'Honnêteté' : 'Fit Check'}
          title={lang === 'fr' ? 'C’est pour toi si…' : 'This is for you if…'}
          highlight={lang === 'fr' ? 'et sinon, non.' : 'and otherwise, it is not.'}
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Reveal variant="left">
            <article className="h-full rounded-2xl bg-ink p-7 text-white shadow-card md:p-8">
              <h3 id="fit-titre" className="font-display text-xl font-bold">
                {lang === 'fr' ? 'Oui, si tu veux livrer' : 'Yes, if you want to ship'}
              </h3>
              <ul className="mt-5 space-y-3">
                {yes.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/90">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
          <Reveal delay={120} variant="right">
            <article className="panel h-full p-7 md:p-8">
              <h3 className="font-display text-xl font-bold text-ink">
                {lang === 'fr' ? 'Non, et c’est OK' : 'No, and that is completely fine'}
              </h3>
              <ul className="mt-5 space-y-3">
                {no.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-5 w-5 shrink-0 text-ink/20" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default Fit;
