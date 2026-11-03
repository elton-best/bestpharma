import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Code2,
  Cpu,
  KeyRound,
  Layers,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';

const metrics = [
  { value: '4', unit: 'SEM', label: 'Challenge immersif continu' },
  { value: '13', unit: 'JURYS', label: 'Experts indépendants du terrain' },
  { value: '7', unit: 'CRITÈRES', label: 'Dimensions de notation technique' },
  { value: '100', unit: 'PTS', label: 'Score maximal pour les lauréats' },
];

const pillars = [
  {
    icon: Code2,
    tag: 'EXIGENCE TECHNIQUE',
    title: 'On ne forme pas des codeurs, on forge des killers',
    desc: 'Pas de présentations PowerPoint ni de pitchs creux. Tu livres du code propre, typé, architecturé avec des agents IA maîtrisés et déployé en production live.',
  },
  {
    icon: ShieldCheck,
    tag: 'FLUX ÉTANCHE & SUPERVISION',
    title: 'Soumissions vérifiées avant transmission',
    desc: 'Le comité d’organisation audite la conformité du repo, de la démo live et des spécifications avant de transmettre les dossiers au collège des jurés. Aucun favoritisme, traçabilité totale.',
  },
  {
    icon: Award,
    tag: 'COLLÈGE INDÉPENDANT',
    title: '13 Jurés évaluent à l’aveugle avec codes dédiés',
    desc: 'Chaque expert note sa dimension sur 20 via un espace sécurisé. Aucune note n’est partagée entre jurés pour garantir une impartialité mathématique absolue.',
  },
];

export function InnerBuildSection() {
  return (
    <section
      id="innerbuild"
      aria-labelledby="innerbuild-titre"
      className="scroll-mt-24 border-y border-line bg-paper py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div id="innerbuild-titre">
          <SectionHeading
            eyebrow="HACKATHON & ACCÉLÉRATEUR D'INGÉNIERIE"
            title="The InnerBuild :"
            highlight="On forge des Frontend Killers."
            sub="4 semaines intensives, 13 jurys indépendants, évaluation rigoureuse à 7 dimensions et déploiement en conditions réelles. Aucun pitch abstrait : seuls le code, l'architecture et les livraisons comptent."
          />
        </div>

        {/* Stats Grid */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {metrics.map((m, idx) => (
            <Reveal key={m.label} delay={idx * 60} variant="fade">
              <div className="panel flex flex-col justify-between p-5 text-center sm:p-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-display text-3xl font-black text-ink sm:text-4xl">
                    {m.value}
                  </span>
                  {m.unit && (
                    <span className="font-mono text-xs font-bold text-accent sm:text-sm">
                      {m.unit}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">{m.label}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Pillars / Feature Cards */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={120 + idx * 80} variant="fade">
                <div className="panel group flex h-full flex-col justify-between p-6 transition hover:border-accent/40">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-ink/[0.05] px-2.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                        {p.tag}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-ink sm:text-lg">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {p.desc}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-accent">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Cadre AI Factory éprouvé</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Big CTA Banner into /the-innerbuild */}
        <Reveal delay={240} variant="fade">
          <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-card via-white to-amber-500/5 p-6 shadow-card sm:p-8 md:p-10">
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Présentation officielle & Spécifications</span>
                </div>
                <h3 className="font-display text-2xl font-black tracking-tight text-ink sm:text-3xl">
                  Découvrez l’écosystème complet de The InnerBuild
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Consultez le manifeste fondateur, les 7 étapes du parcours candidat, la grille de notation détaillée des 13 jurés, les partenaires et toutes les modalités de participation.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-accent" /> Dotations & recruteurs
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-accent" /> 13 Jurys certifiés
                  </span>
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5 text-accent" /> Agents IA & Stack moderne
                  </span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                <Link
                  to="/the-innerbuild"
                  className="btn-glow inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 font-display text-sm font-bold text-white shadow-card transition"
                >
                  <span>En savoir plus</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/challenges"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 font-display text-xs font-bold text-ink shadow-sm transition hover:border-accent hover:text-accent"
                >
                  <Rocket className="h-3.5 w-3.5 text-accent" />
                  <span>Consulter les Challenges</span>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default InnerBuildSection;
