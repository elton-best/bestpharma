import { ArrowRight, BookOpen, Check } from 'lucide-react';
import Button from './ui/LandingButton';
import CodeBlock from './ui/CodeBlock';
import Reveal from './Reveal';
import { useLanguage } from '@/lib/i18n';

export function Hero() {
  const { lang } = useLanguage();

  const markers = [
    lang === 'fr' ? 'Formation + accompagnement · Accès complet' : 'Training + Mentorship · Full Access',
    lang === 'fr' ? '10 cours · 40+ leçons · QCM notés avec correction' : '10 courses · 40+ lessons · Graded quizzes',
    lang === 'fr' ? 'Rendus relus sous 48 h · certificats vérifiables' : 'Reviewed within 48h · Verifiable certificates',
    lang === 'fr' ? '100% à distance · à ton rythme' : '100% remote · Learn at your own pace',
  ];

  const tags =
    lang === 'fr'
      ? ['Specs & plans', 'TDD & review', 'RAG & MCP', 'CI/CD', 'Effets 3D']
      : ['Specs & plans', 'TDD & review', 'RAG & MCP', 'CI/CD', '3D Effects'];

  const HERO_CODE = `// ${lang === 'fr' ? 'avant la formation' : 'before training'}
idee.copier()
code.coller()
bugs.empiler()

// ${lang === 'fr' ? 'apres l\'accompagnement' : 'after mentorship'}
brief.ecrire()
agent.livrer()
done.valider()`;

  return (
    <section id="top" className="relative overflow-hidden pt-28 md:pt-36">
      <div aria-hidden="true" className="hero-grid absolute inset-0" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-paper to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-14 text-center md:px-6 md:pb-20">
        <div className="mx-auto max-w-3xl">
          <Reveal variant="fade">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-xs font-semibold tracking-[0.12em] text-accent uppercase shadow-card">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              {lang === 'fr' ? 'AIFAC · Formation aux skills ai-factory' : 'AIFAC · AI Factory Skills Masterclass'}
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-ink md:text-[3.4rem] md:leading-[1.16]">
              {lang === 'fr' ? (
                <>On ne t’apprend pas des outils. On te <span className="text-gradient">forge</span> à livrer.</>
              ) : (
                <>We do not teach surface tools. We <span className="text-gradient">forge</span> you to ship.</>
              )}
            </h1>
          </Reveal>
          <Reveal delay={160} variant="fade">
            <p className="mx-auto mt-5 max-w-2xl font-display text-lg font-semibold text-ink md:text-xl">
              {lang === 'fr'
                ? '212 skills curés. Une méthode qui boucle jusqu’à Done. Un accompagnement jusqu’à ta première livraison validée.'
                : '212 curated skills. An autonomous loop until Done. Mentorship until your first verified deployment.'}
            </p>
          </Reveal>
          <Reveal delay={200} variant="fade">
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {lang === 'fr'
                ? 'Pas un catalogue qui dort dans un favori : tu avances sur ton projet, on relit avec toi, tu livres avec des preuves.'
                : 'No bookmarked catalog collecting dust: you build your project, we review your code, you ship with proof.'}
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="#offres">
                {lang === 'fr' ? 'Rejoindre la Formation' : 'Join Training'}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button variant="ghost" href="#programme">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                {lang === 'fr' ? 'Voir le programme détaillé' : 'View Full Curriculum'}
              </Button>
            </div>
          </Reveal>
          <Reveal delay={400} variant="fade">
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-sm text-muted-foreground">
              {markers.map((m) => (
                <li key={m} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="font-medium">{m}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={220} variant="zoom" className="mx-auto mt-12 max-w-3xl">
          <CodeBlock
            code={HERO_CODE}
            language="js"
            filename="progress.js"
            highlightLines={[5, 6, 7]}
          />
          <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Domaines couverts">
            {tags.map((t) => (
              <li
                key={t}
                className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink shadow-card"
              >
                {t}
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-3 rounded-2xl border border-line bg-white p-4 text-left shadow-card">
            <div className="flex -space-x-2" aria-hidden="true">
              {['AK', 'MD', 'JT'].map((init) => (
                <span key={init} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ink text-[10px] font-bold text-white">
                  {init}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-ink">3 livraisons réelles</span> déjà sorties
              avec la méthode, détaillées plus bas.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default Hero;
