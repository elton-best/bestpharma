import { ArrowUpRight, Check, FlaskConical } from 'lucide-react';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { useLanguage } from '@/lib/i18n';

function Demo3D() {
  return (
    <div
      role="img"
      aria-label="Démo : carte en 3D qui flotte doucement"
      className="float3d-scene flex h-56 items-center justify-center overflow-hidden rounded-xl bg-paper"
    >
      <div className="float3d-card relative">
        <div className="w-52 rounded-2xl border border-line bg-white p-4 shadow-card">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-3 h-3 w-3/4 rounded-full bg-ink" />
          <div className="mt-2 h-2.5 w-1/2 rounded-full bg-ink/20" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="h-12 rounded-lg bg-orange-100" />
            <div className="h-12 rounded-lg bg-ink" />
          </div>
        </div>
        <span
          aria-hidden="true"
          className="absolute -top-4 -right-5 rounded-full bg-accent px-3 py-1 text-[10px] font-bold text-white shadow-card"
          style={{ transform: 'translateZ(50px)' }}
        >
          +17 px
        </span>
        <span
          aria-hidden="true"
          className="absolute -bottom-4 -left-6 rounded-full border border-line bg-white px-3 py-1 text-[10px] font-bold text-ink shadow-card"
          style={{ transform: 'translateZ(70px)' }}
        >
          0 library
        </span>
      </div>
    </div>
  );
}

function DemoGlow({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label="Démo : bouton entouré d’un faisceau lumineux qui tourne"
      className="flex h-56 items-center justify-center overflow-hidden rounded-xl bg-ink"
    >
      <div className="beam-btn">
        <span className="font-display text-sm">
          {label}
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path d="M3.2 8h9.1M8.6 4.3 12.4 8l-3.8 3.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function DemoBook() {
  return (
    <div
      role="img"
      aria-label="Démo : livre dont les pages se tournent toutes seules"
      className="book-scene flex h-56 items-center justify-center overflow-hidden rounded-xl bg-paper"
    >
      <div className="book">
        <div className="book-spine" />
        <div className="book-page p2" aria-hidden="true">
          <div className="mx-3 mt-4 h-2 w-3/4 rounded-full bg-ink/70" />
          <div className="mx-3 mt-2 h-2 w-1/2 rounded-full bg-ink/20" />
          <div className="mx-3 mt-2 h-2 w-2/3 rounded-full bg-ink/20" />
        </div>
        <div className="book-page p1" aria-hidden="true">
          <div className="mx-3 mt-4 h-2 w-2/3 rounded-full bg-ink/70" />
          <div className="mx-3 mt-2 h-2 w-3/4 rounded-full bg-ink/20" />
          <div className="mx-3 mt-2 h-2 w-1/2 rounded-full bg-accent/60" />
        </div>
        <span className="absolute -right-3 -bottom-9 font-display text-xs font-bold whitespace-nowrap text-muted-foreground">
          SKILL.md · 212 pages
        </span>
      </div>
    </div>
  );
}

export function Realisations() {
  const { lang } = useLanguage();

  const labo = [
    {
      title: lang === 'fr' ? 'Composant 3D' : '3D Component',
      text:
        lang === 'fr'
          ? 'Une carte en relief qui respire toute seule. Zéro librairie, que du CSS : parfait pour un hero qui marque.'
          : 'A floating depth card. Pure CSS with zero external libraries: ideal for eye-catching hero sections.',
      demo: <Demo3D />,
    },
    {
      title: lang === 'fr' ? 'Bouton Glow' : 'Glowing Beam Button',
      text:
        lang === 'fr'
          ? 'Un faisceau de lumière fait le tour du bouton. L’appel à l’action que l’œil remarque en premier.'
          : 'A rotating light beam wrapping the call-to-action button to command immediate visitor focus.',
      demo: <DemoGlow label={lang === 'fr' ? "Rejoindre The InnerBuild" : "Join The InnerBuild"} />,
    },
    {
      title: lang === 'fr' ? 'Livre interactif' : 'Interactive Book',
      text:
        lang === 'fr'
          ? 'Des pages qui se tournent en boucle. Idéal pour présenter un guide, un portfolio ou une méthode.'
          : 'Procedural turning pages: great for showcasing documentation, portfolios, and course modules.',
      demo: <DemoBook />,
    },
  ];

  return (
    <section id="realisations" aria-labelledby="realisations-titre" className="scroll-mt-24 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div id="realisations-titre">
          <SectionHeading
            eyebrow={lang === 'fr' ? "Exemples" : "Deliverables"}
            title={lang === 'fr' ? "Ce qu’on construit," : "What we build,"}
            highlight={lang === 'fr' ? "concrètement." : "in production."}
            sub={
              lang === 'fr'
                ? "Du concret qui tourne : trois projets en ligne et trois effets à voir en direct."
                : "Real systems shipped: three live deployed projects and three interactive sandbox effects."
            }
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Reveal variant="zoom" className="h-full">
            <article className="group panel flex h-full flex-col overflow-hidden">
              <img
                src="/img/coding1.webp"
                alt="Aperçu du projet Coding 3D"
                loading="lazy"
                className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="flex flex-1 flex-col p-6">
                <p className="inline-flex w-fit rounded-full bg-ink px-3 py-1 font-display text-xs font-bold text-white">
                  {lang === 'fr' ? "Formation 3D" : "3D Masterclass"}
                </p>
                <h3 className="mt-3 font-display text-xl font-bold text-ink">Coding 3D</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {lang === 'fr'
                    ? "Formation et landing 3D : hero à particules, mondes WebGL, certificat procédural. Build vert, 0 erreur lint."
                    : "3D curriculum and landing: particle hero, WebGL scenes, procedural certificate. Green build, 0 lint error."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="https://coding-3d.vercel.app/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white transition hover:bg-black"
                  >
                    {lang === 'fr' ? "Voir la démo" : "Live Demo"}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <a
                    href="https://github.com/thekiller-dev/coding-3d.git"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-xs font-bold text-ink transition hover:border-ink/30"
                  >
                    {lang === 'fr' ? "Voir le repo" : "View Repo"}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          </Reveal>

          <Reveal delay={100} variant="zoom" className="h-full">
            <article className="group panel flex h-full flex-col overflow-hidden">
              <img
                src="/img/real2.webp"
                alt="Aperçu du site web eltonhounnou.me"
                loading="lazy"
                className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="flex flex-1 flex-col p-6">
                <p className="inline-flex w-fit rounded-full bg-ink px-3 py-1 font-display text-xs font-bold text-white">
                  {lang === 'fr' ? "Site web" : "Live Website"}
                </p>
                <h3 className="mt-3 font-display text-xl font-bold text-ink">eltonhounnou.me</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {lang === 'fr'
                    ? "Site web personnel, en ligne : design, contenu et mise en ligne avec la même méthode."
                    : "Personal portfolio website online: design system, copy, and deployment using the same delivery loop."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="https://www.eltonhounnou.me"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white transition hover:bg-black"
                  >
                    {lang === 'fr' ? "Visiter le site" : "Visit Website"}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          </Reveal>

          <Reveal delay={200} variant="zoom" className="h-full">
            <article className="panel relative flex h-full flex-col overflow-hidden">
              <div className="relative">
                <img
                  src="/img/real3.webp"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="aspect-[16/10] w-full scale-105 object-cover blur-xl select-none"
                />
                <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-5 py-2 font-display text-xs font-bold tracking-[0.14em] whitespace-nowrap text-white uppercase shadow-card">
                  Coming soon
                </p>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-xl font-bold text-ink">AFRIA</h3>
                <p aria-hidden="true" className="mt-2 text-sm leading-relaxed text-muted-foreground blur-sm select-none">
                  Application bilingue avec moteur de jeu intégré, synchronisation
                  temps réel et refonte complète de l’expérience mobile.
                </p>
                <p className="sr-only">Projet AFRIA : détails à venir.</p>
              </div>
            </article>
          </Reveal>
        </div>

        <div className="mt-14 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-accent uppercase">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            {lang === 'fr' ? "Labo en direct" : "Live Sandbox"}
          </p>
          <h3 className="mx-auto mt-4 max-w-xl font-display text-2xl font-bold tracking-tight text-ink">
            {lang === 'fr' ? "Le rendu, pas le code." : "Interactive results."}
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {lang === 'fr'
              ? "Trois effets du registre qui tournent vraiment sous tes yeux. Chacun s’intègre tel quel dans ton premier brief."
              : "Three live effects running right before your eyes. Ready to drop straight into your first brief."}
          </p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {labo.map((l, idx) => (
            <Reveal key={l.title} delay={Math.min(idx, 2) * 90} variant="fade" className="h-full">
              <article className="panel flex h-full flex-col overflow-hidden">
                <div className="p-6 pb-4 text-left">
                  <h4 className="font-display text-base font-bold text-ink">{l.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{l.text}</p>
                </div>
                <div className="px-6 pb-6">{l.demo}</div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} variant="fade">
          <ul className="mx-auto mt-8 flex max-w-2xl flex-col items-center justify-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-6">
            {(lang === 'fr'
              ? ['Rendu temps réel, sans iframe', 'Léger, responsive, accessible', 'Prêt à copier dans tes briefs']
              : ['Real-time rendering, no iframe', 'Lightweight, responsive, accessible', 'Ready to copy into your briefs']
            ).map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="font-medium">{t}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

export default Realisations;
