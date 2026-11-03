import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck } from 'lucide-react';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import AnimatedCounter from './ui/AnimatedCounter';
import { useLanguage } from '@/lib/i18n';

type ProofLink = { labelFr: string; labelEn: string; href: string };

type Proof = {
  metric: string;
  metricValue: number;
  metricSuffix: string;
  titleFr: string;
  titleEn: string;
  nameFr: string;
  nameEn: string;
  roleFr: string;
  roleEn: string;
  stack: string;
  artefact: string;
  contextFr: string;
  contextEn: string;
  stepsFr: string[];
  stepsEn: string[];
  links?: ProofLink[];
};

const proofs: Proof[] = [
  {
    metric: '212',
    metricValue: 212,
    metricSuffix: '',
    titleFr: 'skills curés et versionnés au registre',
    titleEn: 'curated and versioned skills in the registry',
    nameFr: 'Le registre ai-factory',
    nameEn: 'The ai-factory registry',
    roleFr: 'Socle de la formation',
    roleEn: 'Curriculum foundation',
    stack: 'Markdown · ROUTER.md · validate',
    artefact: 'DECISIONS.md + 212 dossiers SKILL.md',
    contextFr: 'Avant : des skills éparpillés sur dix repos, noms externes, doublons. Après : 212 skills alignés en 6 rayons, rebrandés ai-factory, chaque extraction tracée.',
    contextEn: 'Before: skills scattered across ten repos with external names and duplicates. After: 212 skills organized in 6 aisles, branded ai-factory, fully traceable.',
    stepsFr: [
      'Inventaire des sources (skills.sh, officialskills.sh)',
      'Extraction par domaine, sans les artefacts lourds',
      'Rebranding : zéro nom externe visible',
      'Routage via ROUTER.md + validate vert',
    ],
    stepsEn: [
      'Source inventory (skills.sh, officialskills.sh)',
      'Domain extraction without heavy artifacts',
      'Rebranding: zero external naming visible',
      'Routing via ROUTER.md + green validation',
    ],
  },
  {
    metric: '10',
    metricValue: 10,
    metricSuffix: '',
    titleFr: 'sections sur Coding 3D',
    titleEn: 'sections on Coding 3D',
    nameFr: 'Coding 3D',
    nameEn: 'Coding 3D',
    roleFr: 'Formation 3D · React + Three.js',
    roleEn: '3D Masterclass · React + Three.js',
    stack: 'React · Three.js · Motion',
    artefact: 'Build vert · 0 erreur lint',
    contextFr: 'Formation et landing 3D : hero à particules, mondes WebGL en lazy, certificat 3D procédural et ErrorBoundary anti page-blanche mobile.',
    contextEn: '3D training and landing: particle hero, lazy WebGL scenes, procedural 3D certificate and mobile-safe ErrorBoundary.',
    stepsFr: [
      'Hero particules + mondes lazy',
      'Certificat 3D procédural custom',
      'ErrorBoundary anti page-blanche mobile',
      'Responsive + reduced-motion partout',
    ],
    stepsEn: [
      'Particle hero + lazy WebGL scenes',
      'Custom procedural 3D certificate',
      'Mobile-safe ErrorBoundary protection',
      'Responsive + reduced-motion compliance',
    ],
    links: [
      { labelFr: 'Voir la démo', labelEn: 'Live Demo', href: 'https://coding-3d.vercel.app/' },
      { labelFr: 'Voir le repo', labelEn: 'View Repo', href: 'https://github.com/thekiller-dev/coding-3d.git' },
    ],
  },
  {
    metric: '100%',
    metricValue: 100,
    metricSuffix: '%',
    titleFr: 'de checklists à Done avant livraison',
    titleEn: 'checklists marked Done before delivery',
    nameFr: 'La méthode',
    nameEn: 'The Method',
    roleFr: 'Boucle ai-factory',
    roleEn: 'ai-factory execution loop',
    stack: 'PLAN → BUILD → REVIEW → QA → DELIVER',
    artefact: 'PROGRESS.md + Definition of Done',
    contextFr: 'Chaque livraison ci-dessus a suivi la même boucle, preuves dans PROGRESS.md : annonce [SKILL USED], self-review à 100%, max 3 auto-fix sinon BLOCKED tracé.',
    contextEn: 'Every delivery above adhered strictly to the loop: [SKILL USED] announcement, 100% self-review checklist, max 3 auto-fixes then BLOCKED logging.',
    stepsFr: [
      'Annonce [SKILL USED] par tâche',
      'Self-review checklist à 100%',
      'Max 3 auto-fix, sinon BLOCKED tracé',
      'Definition of Done non négociable',
    ],
    stepsEn: [
      '[SKILL USED] header per discrete task',
      '100% completed self-review checklist',
      'Max 3 auto-fixes, else BLOCKED logged',
      'Non-negotiable Definition of Done',
    ],
  },
];

const AUTOPLAY_MS = 4500;

export function Preuves() {
  const { lang } = useLanguage();
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tilt, setTilt] = useState(0);
  const [spacing, setSpacing] = useState(210);
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const sectionRef = useRef<HTMLElement>(null);
  const lastWheel = useRef(0);

  const goTo = useCallback((idx: number) => {
    setActive((idx + proofs.length) % proofs.length);
  }, []);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 480) setSpacing(140);
      else if (w < 640) setSpacing(170);
      else if (w < 1024) setSpacing(210);
      else setSpacing(250);
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || paused || !started) return;
    const t = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [next, paused, reduced, started]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    setTilt(x * 12);
  };

  const onPointerLeave = () => setTilt(0);

  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheel.current < 280) return;
    if (Math.abs(e.deltaX) > 18 || Math.abs(e.deltaY) > 28) {
      if (e.deltaX > 0 || e.deltaY > 0) next();
      else prev();
      lastWheel.current = now;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prev();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      next();
      e.preventDefault();
    }
  };

  return (
    <section
      ref={sectionRef}
      id="preuves"
      aria-labelledby="preuves-titre"
      className="scroll-mt-24 py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div id="preuves-titre">
          <SectionHeading
            eyebrow={lang === 'fr' ? "Preuves de livraison" : "Proof of Delivery"}
            title={lang === 'fr' ? "Des résultats," : "Real results,"}
            highlight={lang === 'fr' ? "pas des promesses." : "not empty claims."}
            sub={
              lang === 'fr'
                ? "Trois exemples concrets où la méthode ai-factory a été appliquée de bout en bout, avec les métriques et les preuves associées."
                : "Three battle-tested examples where the ai-factory method was applied end-to-end, with verifiable metrics and artifacts."
            }
          />
        </div>

        {/* Coverflow 3D / Carousel */}
        <div
          tabIndex={0}
          role="region"
          aria-label={lang === 'fr' ? "Carrousel des preuves de livraison" : "Delivery proof carousel"}
          onKeyDown={onKeyDown}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => {
            setPaused(false);
            onPointerLeave();
          }}
          onPointerMove={onPointerMove}
          onWheel={onWheel}
          className="relative mx-auto mt-8 max-w-5xl focus-visible:outline-none"
        >
          {reduced ? (
            /* Mode accessible reduced motion */
            <div className="grid gap-6 md:grid-cols-3">
              {proofs.map((p, idx) => (
                <article
                  key={p.nameFr}
                  className={`panel flex flex-col p-6 transition-all ${
                    idx === active ? 'ring-2 ring-accent' : 'opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-3xl font-bold text-accent">
                      {p.metric}
                    </span>
                    <BadgeCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold text-ink">
                    {lang === 'fr' ? p.nameFr : p.nameEn}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{lang === 'fr' ? p.roleFr : p.roleEn}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {lang === 'fr' ? p.contextFr : p.contextEn}
                  </p>
                  <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs text-ink">
                    {(lang === 'fr' ? p.stepsFr : p.stepsEn).map((st) => (
                      <li key={st} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {st}
                      </li>
                    ))}
                  </ul>
                  {p.links ? (
                    <div className="mt-4 flex flex-wrap gap-2 pt-2">
                      {p.links.map((l) => (
                        <a
                          key={l.labelFr}
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[11px] font-bold text-white"
                        >
                          {lang === 'fr' ? l.labelFr : l.labelEn} <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            /* Scene Coverflow 3D */
            <div
              className="relative flex h-[480px] w-full items-center justify-center overflow-hidden py-6 select-none sm:h-[500px]"
              style={{ perspective: '1200px' }}
            >
              <div
                className="relative h-full w-full max-w-[620px] transition-transform duration-300 ease-out"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${tilt}deg)`,
                }}
              >
                {proofs.map((p, idx) => {
                  const offset = idx - active;
                  const absOffset = Math.abs(offset);
                  const isCenter = offset === 0;

                  const translateX = offset * spacing;
                  const translateZ = isCenter ? 60 : -140 * absOffset;
                  const rotateY = isCenter ? 0 : offset > 0 ? -32 : 32;
                  const opacity = isCenter ? 1 : Math.max(0.2, 0.75 - absOffset * 0.25);
                  const zIndex = 30 - absOffset * 10;

                  return (
                    <div
                      key={p.nameFr}
                      onClick={() => goTo(idx)}
                      className={`absolute inset-0 cursor-pointer transition-all duration-500 ease-out ${
                        isCenter ? 'pointer-events-auto' : 'hover:opacity-90'
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
                        opacity,
                        zIndex,
                      }}
                    >
                      <article className="panel flex h-full flex-col justify-between p-6 shadow-2xl md:p-8">
                        <div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent ring-1 ring-accent/25">
                              <BadgeCheck className="h-4 w-4" /> {lang === 'fr' ? "Preuve de livraison" : "Proof of delivery"}
                            </span>
                            <span className="font-mono text-xs font-semibold text-muted-foreground">
                              {idx + 1} / {proofs.length}
                            </span>
                          </div>

                          <div className="mt-5 flex items-baseline gap-3">
                            <span className="font-display text-4xl font-extrabold text-ink md:text-5xl">
                              <AnimatedCounter
                                value={started ? p.metricValue : 0}
                                duration={1.2}
                                suffix={p.metricSuffix}
                              />
                            </span>
                            <span className="text-sm font-semibold text-muted-foreground">
                              {lang === 'fr' ? p.titleFr : p.titleEn}
                            </span>
                          </div>

                          <h3 className="mt-4 font-display text-xl font-bold text-ink md:text-2xl">
                            {lang === 'fr' ? p.nameFr : p.nameEn}
                          </h3>
                          <p className="mt-1 font-mono text-xs text-accent">
                            {p.stack}
                          </p>

                          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                            {lang === 'fr' ? p.contextFr : p.contextEn}
                          </p>

                          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                            {(lang === 'fr' ? p.stepsFr : p.stepsEn).map((step) => (
                              <li
                                key={step}
                                className="flex items-center gap-2 text-xs font-medium text-ink"
                              >
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                                <span className="truncate">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                          <span className="font-mono text-xs text-muted-foreground">
                            {lang === 'fr' ? "Artefact :" : "Artifact:"} <strong className="text-ink">{p.artefact}</strong>
                          </span>
                          {p.links ? (
                            <div className="flex gap-2">
                              {p.links.map((l) => (
                                <a
                                  key={l.labelFr}
                                  href={l.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black"
                                >
                                  {lang === 'fr' ? l.labelFr : l.labelEn}
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation boutons + pastilles */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={prev}
              aria-label={lang === 'fr' ? "Livraison précédente" : "Previous delivery"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-card transition hover:border-ink/30 hover:bg-paper"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2" aria-label={lang === 'fr' ? "Sélectionner une preuve" : "Select proof"}>
              {proofs.map((p, idx) => (
                <button
                  key={p.nameFr}
                  type="button"
                  onClick={() => goTo(idx)}
                  aria-label={lang === 'fr' ? `Aller à la preuve ${idx + 1}` : `Go to proof ${idx + 1}`}
                  aria-current={idx === active ? 'true' : 'false'}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    idx === active ? 'w-8 bg-accent' : 'w-2.5 bg-line hover:bg-ink/30'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              aria-label="Livraison suivante"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-card transition hover:border-ink/30 hover:bg-paper"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Preuves;
