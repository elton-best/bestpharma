import { ArrowRight, MessageCircle } from 'lucide-react';
import Button from './ui/LandingButton';
import Logo from './Logo';
import Reveal from './Reveal';
import { useLanguage } from '@/lib/i18n';

export function FinalCta() {
  const { lang } = useLanguage();

  return (
    <section aria-labelledby="cta-final" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal variant="zoom">
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl bg-ink px-6 py-12 text-center text-white md:px-12 md:py-16">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_50%_110%,rgba(234,88,12,0.4),transparent_60%)]"
            />
            <div className="relative">
              <h2 id="cta-final" className="font-display text-3xl font-bold tracking-tight md:text-[2.75rem] md:leading-[1.1]">
                {lang === 'fr' ? (
                  <>Excellence et rigueur. <span className="text-orange-300">Et tu sais livrer.</span></>
                ) : (
                  <>Engineering rigor. <span className="text-orange-300">Ship like a pro.</span></>
                )}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/70 md:text-lg">
                {lang === 'fr'
                  ? 'Le repo, la formation et l’accompagnement jusqu’à ta première livraison validée. Les places d’accompagnement sont suivies avec attention pour garder des revues sérieuses.'
                  : 'The full codebase, comprehensive curriculum, and direct code reviews until your first validated deployment.'}
              </p>
            </div>
            <div className="relative mx-auto mt-8 flex max-w-md flex-col gap-3">
              <a
                href="/auth?mode=signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 font-display text-base font-extrabold text-neutral-900 shadow-xl shadow-black/30 transition hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="font-black text-neutral-950">
                  {lang === 'fr' ? 'Rejoindre la Formation' : 'Enroll Now'}
                </span>
                <ArrowRight className="h-5 w-5 text-orange-600" strokeWidth={2.5} aria-hidden="true" />
              </a>
              <a href="#faq" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-4 font-display text-base font-semibold text-white transition hover:border-white/40">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                {lang === 'fr' ? 'J’ai encore des questions' : 'Have questions?'}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const { lang } = useLanguage();

  const cols = [
    {
      title: lang === 'fr' ? 'Formation' : 'Training',
      links: [
        { href: '/ai-factory#registre', label: lang === 'fr' ? 'Le registre' : 'Registry' },
        { href: '/ai-factory#methode', label: lang === 'fr' ? 'Méthode' : 'Method' },
        { href: '/ai-factory#offres', label: lang === 'fr' ? 'Offres' : 'Curriculum' },
        { href: '/ai-factory#faq', label: 'FAQ' },
      ],
    },
    {
      title: 'The InnerBuild',
      links: [
        { href: '/', label: lang === 'fr' ? 'Accueil InnerBuild' : 'InnerBuild Home' },
        { href: '/challenges', label: lang === 'fr' ? 'Challenges' : 'Hackathons' },
        { href: '/resultats', label: lang === 'fr' ? 'Classements 7D' : '7D Leaderboard' },
        { href: '/#partenaires', label: lang === 'fr' ? 'Partenaires' : 'Partners' },
      ],
    },
    {
      title: 'Contact',
      links: [
        { href: 'mailto:contact@aifac.dev', label: 'contact@aifac.dev' },
      ],
    },
  ];

  return (
    <footer className="border-t border-line bg-white py-12">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1fr_2fr] md:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {lang === 'fr'
              ? 'Formation aux skills ai-factory + accompagnement : de ton premier brief à ta première livraison validée.'
              : 'Autonomous AI engineering masterclass & intense hackathons: from initial brief to verified production delivery.'}
          </p>
          <Button href="/auth?mode=signup" className="mt-5 px-5 py-2.5 text-sm">
            {lang === 'fr' ? 'Rejoindre The InnerBuild' : 'Join The InnerBuild'}
          </Button>
        </div>
        <nav aria-label="Liens de pied de page" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {cols.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-ink">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-start justify-between gap-3 border-t border-line px-4 pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:px-6">
        <p>© 2026 The InnerBuild & AI Factory. {lang === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
      </div>
    </footer>
  );
}

export const Final = Footer;
export default Footer;
