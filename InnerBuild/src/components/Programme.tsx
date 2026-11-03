import { Link } from '@tanstack/react-router';
import { ArrowRight, Award, FileCheck } from 'lucide-react';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { useLanguage } from '@/lib/i18n';

type Course = {
  n: string;
  titleFr: string;
  titleEn: string;
  pitchFr: string;
  pitchEn: string;
  skills: string[];
};

const courses: Course[] = [
  {
    n: '01',
    titleFr: 'Factory 101 — De l’idée au produit avec des agents',
    titleEn: 'Factory 101 — Idea to Shipped Product with Agents',
    pitchFr: 'Pourquoi coder sans cadre échoue, les 3 couches (loi, arsenal, cible), et ta première livraison : spec → brief → prompt → boucle → Done.',
    pitchEn: 'Why ad-hoc coding fails, the 3 layers (law, arsenal, target), and your first delivery: spec → brief → prompt → loop → Done.',
    skills: ['orchestrator'],
  },
  {
    n: '02',
    titleFr: 'Le cahier de charge qui fait livrer',
    titleEn: 'The Specification that Drives Delivery',
    pitchFr: 'Contexte resserré, user stories, hors-scope qui protège ton budget, parcours critiques testés en priorité, critères mesurables pour réceptionner sans litige.',
    pitchEn: 'Tight context, user stories, out-of-scope protections, critical paths tested first, measurable acceptance criteria with zero ambiguity.',
    skills: ['spec-driven'],
  },
  {
    n: '03',
    titleFr: 'Agent Brief + boucle autonome',
    titleEn: 'Agent Brief + Autonomous Execution Loop',
    pitchFr: 'Mission en 1 phrase, mapping besoins → skills via ROUTER, boucle PLAN→BUILD→REVIEW→FIX→QA, traçabilité PROGRESS/DECISIONS.',
    pitchEn: 'One-sentence mission, ROUTER mapping requirements to skills, PLAN→BUILD→REVIEW→FIX→QA loop, PROGRESS/DECISIONS audit trail.',
    skills: ['orchestrator'],
  },
  {
    n: '04',
    titleFr: 'Interfaces React avec un agent',
    titleEn: 'Polished React Interfaces with Agents',
    pitchFr: 'Pages et composants propres, formulaires sans douleur, data fetching, Tailwind responsive : le skill frontend-react appliqué.',
    pitchEn: 'Clean components, painless forms, resilient data fetching, responsive Tailwind: the frontend-react skill in action.',
    skills: ['frontend-react'],
  },
  {
    n: '05',
    titleFr: 'Design system qui tient',
    titleEn: 'Resilient Design Systems',
    pitchFr: 'Tokens, accessibilité non négociable, composants partagés, états vides et erreurs dessinés.',
    pitchEn: 'Tokens, non-negotiable accessibility, shared components, polished empty states, and designed error boundaries.',
    skills: ['design-system'],
  },
  {
    n: '06',
    titleFr: 'API Node Fastify + Zod',
    titleEn: 'Node Fastify API + Zod Validation',
    pitchFr: 'Routes propres, validation Zod partout, auth JWT httpOnly, Prisma + Postgres.',
    pitchEn: 'Clean routes, comprehensive Zod validation schemas, httpOnly JWT authentication, Prisma + Postgres.',
    skills: ['backend-node'],
  },
  {
    n: '07',
    titleFr: 'Sécurité : secrets, OWASP, RGPD',
    titleEn: 'Security: Secrets, OWASP, GDPR',
    pitchFr: 'Zéro secret commité, injections, headers et rate-limit, RGPD express. Ce qui bloque une livraison.',
    pitchEn: 'Zero committed secrets, SQL/XSS prevention, security headers, rate limiting, and compliance safeguards.',
    skills: ['security'],
  },
  {
    n: '08',
    titleFr: 'QA, tests, CI, Docker',
    titleEn: 'QA, Automated Tests, CI, Docker',
    pitchFr: 'Tester ce qui compte, lint + typecheck à zéro, CI qui garde la porte, Docker + preview.',
    pitchEn: 'Test what matters, zero lint and typecheck errors, automated CI gates, Docker packaging and preview branches.',
    skills: ['qa-devops'],
  },
  {
    n: '09',
    titleFr: 'Agents IA : prompts, RAG, tools',
    titleEn: 'AI Agents: Prompts, RAG, Tools',
    pitchFr: 'Prompts qui obéissent, tool calling propre, RAG sans magie, evals avant de croire.',
    pitchEn: 'Reliable prompts, structured tool calling, deterministic RAG pipelines, evaluations before deployment.',
    skills: ['agents-ai'],
  },
  {
    n: '10',
    titleFr: 'Arsenal 212 skills, 3D et déploiement',
    titleEn: '212-Skill Arsenal, 3D and Live Deployment',
    pitchFr: 'find-skills, loi d’abord arsenal ensuite, hero 3D qui ne rame pas, déployer et prévisualiser.',
    pitchEn: 'find-skills, law first arsenal second, performant 3D heroes, edge deployment and live URL delivery.',
    skills: ['library', 'threejs', 'deploy'],
  },
];

export function Programme() {
  const { lang } = useLanguage();

  return (
    <section id="programme" aria-labelledby="programme-titre" className="scroll-mt-24 bg-paper py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div id="programme-titre">
          <SectionHeading
            eyebrow={lang === 'fr' ? "Programme" : "Syllabus"}
            title={lang === 'fr' ? "10 cours, de l’idée" : "10 courses, from idea"}
            highlight={lang === 'fr' ? "à la livraison." : "to delivery."}
            sub={
              lang === 'fr'
                ? "Chaque cours : 2 modules, 4 leçons texte + PDF, exercices, QCM noté avec correction. Les 3 premiers en version complète, les 7 suivants en version guidée — tous avec évaluations indépendantes, rendus relus et certificats."
                : "Each course: 2 modules, 4 text + PDF lessons, exercises, graded quizzes. First 3 fully comprehensive, following 7 guided — all with independent audits, reviewed submissions, and certificates."
            }
          />
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {courses.map((c, idx) => (
            <Reveal key={c.n} delay={Math.min(idx, 3) * 60} variant="fade">
              <li className="panel flex h-full flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-sm font-bold text-accent tabular-nums">{c.n}</span>
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {c.skills.map((s) => (
                      <span key={s} className="rounded-full bg-ink/[0.05] px-2.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                        {s}
                      </span>
                    ))}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-base font-bold text-ink md:text-lg">
                  {lang === 'fr' ? c.titleFr : c.titleEn}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {lang === 'fr' ? c.pitchFr : c.pitchEn}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={120} variant="fade">
          <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-white p-6 shadow-card sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-sm font-bold text-ink">
                  {lang === 'fr' ? "Certificats & Évaluations" : "Certificates & Audits"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lang === 'fr'
                    ? "Rendus relus sous 48 h · certificats vérifiables uniques"
                    : "Deliverables reviewed within 48h · unique verifiable credentials"}
                </p>
              </div>
            </div>
            <Link
              to="/auth"
              className="btn-glow inline-flex shrink-0 items-center gap-2 rounded-xl bg-ink px-5 py-2.5 font-display text-xs font-bold text-white shadow-card"
            >
              {lang === 'fr' ? "Rejoindre la formation" : "Enroll in Curriculum"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default Programme;
