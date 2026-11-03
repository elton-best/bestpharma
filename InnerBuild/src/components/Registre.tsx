import { useState, type ComponentType, type ReactNode } from 'react';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { useLanguage } from '@/lib/i18n';

const stroke = '#101828';
const accent = '#EA580C';
const soft = '#E9EAEE';

function Frame({ children, label, blob = '#FFF1E6' }: { children: React.ReactNode; label: string; blob?: string }) {
  return (
    <div role="img" aria-label={label} className="relative mx-auto w-full max-w-[440px]">
      <svg viewBox="0 0 440 300" className="h-auto w-full">
        <ellipse cx="220" cy="150" rx="185" ry="125" fill={blob} opacity="0.7" />
        <ellipse cx="220" cy="262" rx="150" ry="14" fill="#101828" opacity="0.07" />
        {children}
      </svg>
    </div>
  );
}

function Person({ x, y, shirt = accent, skin = '#F2B795', hair = stroke }: { x: number; y: number; shirt?: string; skin?: string; hair?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-11" y="28" width="10" height="34" rx="5" fill="#2B3A55" />
      <rect x="2" y="28" width="10" height="34" rx="5" fill="#2B3A55" />
      <rect x="-16" y="-6" width="32" height="38" rx="11" fill={shirt} />
      <circle cx="0" cy="-20" r="13" fill={skin} />
      <path d="M-13 -22 a13 13 0 0 1 26 0 l0 -6 a13 10 0 0 0 -26 0 Z" fill={hair} />
      <circle cx="-5" cy="-19" r="1.6" fill={hair} />
      <circle cx="5" cy="-19" r="1.6" fill={hair} />
      <path d="M-4 -12 q4 3 8 0" stroke={hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  );
}

function RayonMedia({ image, label, fallback }: { image?: string | undefined; label: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) return <>{fallback}</>;
  return (
    <div role="img" aria-label={label} className="relative mx-auto w-full max-w-[440px]">
      <div
        aria-hidden="true"
        className="absolute -inset-3 rounded-[32px] bg-[radial-gradient(120%_120%_at_50%_0%,#FFEDD5_0%,#FFF7ED_55%,#F5F0FF_100%)]"
      />
      <img
        src={image}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="relative h-auto w-full rounded-[28px] border border-line bg-white object-cover shadow-card mix-blend-multiply"
      />
    </div>
  );
}

function OrchestrationVisual() {
  return (
    <Frame label="Illustration orchestration : brief découpé en plan" blob="#E8EEFF">
      <rect x="52" y="72" width="170" height="150" rx="14" fill="#fff" stroke={soft} strokeWidth="2" />
      <rect x="52" y="72" width="170" height="26" rx="13" fill="#101828" />
      <circle cx="66" cy="85" r="3.4" fill="#fff" opacity="0.9" />
      <circle cx="78" cy="85" r="3.4" fill="#fff" opacity="0.55" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="66" y={110 + i * 34} width="120" height="24" rx="8" fill={i === 2 ? '#101828' : '#F4F6FB'} />
          <circle cx="80" cy={122 + i * 34} r="6" fill={i === 2 ? '#fff' : accent} />
          <rect x="92" y={118 + i * 34} width={72 - i * 12} height="8" rx="4" fill={i === 2 ? '#fff' : stroke} opacity={i === 2 ? 0.9 : 0.5} />
        </g>
      ))}
      <Person x={300} y={150} shirt={accent} />
      <rect x="252" y="196" width="96" height="30" rx="15" fill="#fff" stroke={soft} strokeWidth="2" />
      <circle cx="268" cy="211" r="6" fill="#22C55E" />
      <rect x="279" y="207" width="56" height="8" rx="4" fill={stroke} opacity="0.6" />
      <path d="M222 120 L248 138" stroke={accent} strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
    </Frame>
  );
}

function FrontendVisual() {
  return (
    <Frame label="Illustration frontend : mise en page et tokens" blob="#FFF1E6">
      <rect x="150" y="60" width="220" height="160" rx="14" fill="#fff" stroke={soft} strokeWidth="2" />
      <rect x="150" y="60" width="220" height="24" rx="12" fill="#F4F6FB" />
      <circle cx="166" cy="72" r="4" fill="#F87171" />
      <circle cx="179" cy="72" r="4" fill="#FBBF24" />
      <circle cx="192" cy="72" r="4" fill="#34D399" />
      <rect x="164" y="96" width="110" height="14" rx="7" fill={stroke} />
      <rect x="164" y="116" width="76" height="9" rx="4.5" fill={stroke} opacity="0.3" />
      <rect x="164" y="134" width="92" height="52" rx="10" fill="#FFF3E8" stroke="#F5C9A8" strokeWidth="2" />
      <circle cx="184" cy="154" r="10" fill={accent} />
      <rect x="264" y="134" width="92" height="52" rx="10" fill="#101828" />
      <circle cx="284" cy="154" r="8" fill="#fff" opacity="0.9" />
      <rect x="164" y="194" width="60" height="16" rx="8" fill={accent} />
      <Person x={92} y={160} shirt="#4F6AF0" />
      <circle cx="120" cy="96" r="9" fill="#fff" stroke={accent} strokeWidth="2.5" />
      <path d="M116 96 l3 3 l6 -6" stroke={accent} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

function BackendVisual() {
  return (
    <Frame label="Illustration backend : routes API" blob="#E9F3EC">
      <rect x="60" y="86" width="150" height="150" rx="16" fill="#101828" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={95 + i * 40} cy={112} r="5" fill={i === 1 ? accent : '#fff'} opacity={i === 1 ? 1 : 0.7} />
          <rect x={80 + i * 40} y={130} width="30" height="70" rx="8" fill="#fff" opacity="0.14" />
          <rect x={80 + i * 40} y={130 + i * 12} width="30" height="10" rx="5" fill={accent} />
        </g>
      ))}
      <rect x="226" y="76" width="160" height="44" rx="12" fill="#fff" stroke={soft} strokeWidth="2" />
      <rect x="226" y="130" width="160" height="44" rx="12" fill="#fff" stroke={soft} strokeWidth="2" />
      <rect x="226" y="184" width="160" height="44" rx="12" fill="#fff" stroke={soft} strokeWidth="2" />
      <rect x="238" y="90" width="44" height="16" rx="8" fill="#DCFCE7" />
      <rect x="238" y="144" width="48" height="16" rx="8" fill="#FFEDD5" />
      <rect x="238" y="198" width="44" height="16" rx="8" fill="#DCFCE7" />
      <rect x="290" y="94" width="76" height="8" rx="4" fill={stroke} opacity="0.55" />
      <rect x="290" y="148" width="62" height="8" rx="4" fill={stroke} opacity="0.55" />
      <rect x="290" y="202" width="70" height="8" rx="4" fill={stroke} opacity="0.55" />
      <circle cx="216" cy="98" r="6" fill="#22C55E" />
      <circle cx="216" cy="152" r="6" fill="#22C55E" />
      <circle cx="216" cy="206" r="6" fill={accent} />
    </Frame>
  );
}

function AgentsVisual() {
  return (
    <Frame label="Illustration agents IA : graphe de skills" blob="#EFEBFF">
      <circle cx="220" cy="150" r="40" fill="#101828" />
      <circle cx="220" cy="150" r="15" fill={accent} />
      <circle cx="220" cy="150" r="26" fill="none" stroke="#fff" strokeWidth="2" opacity="0.35" strokeDasharray="4 5" />
      {[
        { x: 92, y: 74 },
        { x: 348, y: 74 },
        { x: 92, y: 228 },
        { x: 348, y: 228 },
      ].map((p) => (
        <g key={`${p.x}-${p.y}`}>
          <line x1="220" y1="150" x2={p.x} y2={p.y} stroke="#C9C2F5" strokeWidth="2.5" strokeDasharray="5 5" />
          <rect x={p.x - 36} y={p.y - 26} width="72" height="52" rx="13" fill="#fff" stroke={soft} strokeWidth="2" />
          <circle cx={p.x} cy={p.y} r="9" fill={accent} />
          <path d={`M${p.x - 4} ${p.y} l3 3 l6 -6`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      <Person x={220} y={248} shirt="#6D5EF0" />
    </Frame>
  );
}

function QaVisual() {
  return (
    <Frame label="Illustration QA : tests verts et barres" blob="#E6F6EC">
      <rect x="170" y="70" width="180" height="170" rx="16" fill="#fff" stroke={soft} strokeWidth="2" />
      <circle cx="225" cy="128" r="30" fill="none" stroke="#22C55E" strokeWidth="10" />
      <path d="M213 128 l9 9 l18 -19" fill="none" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="192" y={172 + i * 20} width={136} height="11" rx="5.5" fill="#EEF2F7" />
          <rect x="192" y={172 + i * 20} width={136 * (0.95 - i * 0.12)} height="11" rx="5.5" fill={i === 2 ? accent : '#22C55E'} />
        </g>
      ))}
      <Person x={100} y={170} shirt="#15803D" />
      <rect x="52" y="200" width="92" height="30" rx="15" fill="#fff" stroke={soft} strokeWidth="2" />
      <circle cx="68" cy="215" r="6" fill="#22C55E" />
      <rect x="79" y="211" width="52" height="8" rx="4" fill={stroke} opacity="0.6" />
    </Frame>
  );
}

function ArchiVisual() {
  return (
    <Frame label="Illustration architecture : décisions tracées" blob="#FFF7DB">
      <rect x="56" y="92" width="104" height="128" rx="14" fill="#fff" stroke={soft} strokeWidth="2" />
      <rect x="168" y="92" width="104" height="128" rx="14" fill="#fff" stroke={soft} strokeWidth="2" />
      <rect x="280" y="92" width="104" height="128" rx="14" fill="#101828" />
      <path d="M160 156 H168 M272 156 H280" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M162 150 l8 6 -8 6 M274 150 l8 6 -8 6" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="72" y={110 + i * 22} width={72} height="9" rx="4.5" fill={stroke} opacity={0.55 - i * 0.12} />
          <rect x="184" y={110 + i * 22} width={72} height="9" rx="4.5" fill={stroke} opacity={0.55 - i * 0.12} />
          <rect x="296" y={110 + i * 22} width={72} height="9" rx="4.5" fill="#fff" opacity={0.85 - i * 0.12} />
        </g>
      ))}
      <circle cx="108" cy="192" r="11" fill={accent} />
      <path d="M103 192 l4 4 l7 -7" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Person x={220} y={248} shirt={stroke} />
    </Frame>
  );
}

type SkillDetail = { name: string; whatFr: string; whatEn: string };

type Rayon = {
  n: string;
  titleFr: string;
  titleEn: string;
  count: number;
  summaryFr: string;
  summaryEn: string;
  skills: SkillDetail[];
  outcomeFr: string;
  outcomeEn: string;
  visual: ComponentType;
  image?: string;
};

const rayons: Rayon[] = [
  {
    n: '00',
    titleFr: 'Orchestration',
    titleEn: 'Orchestration',
    count: 44,
    summaryFr:
      'Le rayon qui transforme une idée floue en plan exécutable. Tu y apprends à cadrer, découper et piloter un agent jusqu’à Done. C’est par ici que commence la formation.',
    summaryEn:
      'The aisle that transforms a vague brief into an executable plan. You learn to scope, break down, and pilot an agent to Done.',
    skills: [
      { name: 'planning-and-task-breakdown', whatFr: 'Découper un brief en tâches petites, ordonnées et vérifiables.', whatEn: 'Break down a brief into small, ordered, testable tasks.' },
      { name: 'spec-driven-development', whatFr: 'Écrire la spec avant le code : scope IN/OUT et critères mesurables.', whatEn: 'Write specs before code: IN/OUT scope and measurable criteria.' },
      { name: 'constraint-driven', whatFr: 'Travailler sous contraintes réelles : temps, budget, stack imposée.', whatEn: 'Work under real constraints: time, budget, and imposed stack.' },
      { name: 'interview-me', whatFr: 'Faire clarifier le besoin par l’agent avant qu’il ne code.', whatEn: 'Prompt the agent to clarify requirements before writing code.' },
    ],
    outcomeFr: 'Tu sors avec un plan que n’importe quel agent peut exécuter sans te poser 20 questions.',
    outcomeEn: 'You emerge with a plan any AI agent can execute autonomously without 20 back-and-forth questions.',
    visual: OrchestrationVisual,
    image: '/img/rayon-1.webp',
  },
  {
    n: '01',
    titleFr: 'Frontend & 3D',
    titleEn: 'Frontend & 3D',
    count: 83,
    summaryFr:
      'Le rayon du visible : interfaces propres, design system, et effets 3D au rendu premium. Ton premier livrable qui en jette sort d’ici.',
    summaryEn:
      'The visual aisle: clean responsive interfaces, robust design systems, and premium 3D effects. Your first showstopping deliverable starts here.',
    skills: [
      { name: 'frontend-design', whatFr: 'Composer une page claire : hiérarchie, rythme, contraste, responsive.', whatEn: 'Compose clear pages: typography hierarchy, cadence, contrast, responsiveness.' },
      { name: 'react-best-practices', whatFr: 'Structurer des composants React lisibles et réutilisables.', whatEn: 'Architect readable and maintainable React components.' },
      { name: 'web-design-guidelines', whatFr: 'Appliquer typo, espacement et accessibilité qui font pro.', whatEn: 'Apply professional spacing, clean tokens, and WCAG accessibility.' },
      { name: 'threejs-3d-arsenal (45)', whatFr: 'Intégrer 45 effets Three.js : hero, particules, certificats 3D.', whatEn: 'Embed 45 Three.js effects: hero particles, 3D certificates, canvas scenes.' },
    ],
    outcomeFr: 'Tu livres une page qui donne envie de payer, pas un prototype gris.',
    outcomeEn: 'You deliver high-converting interfaces that look commercially premium, not toy wireframes.',
    visual: FrontendVisual,
    image: '/img/rayon-2.webp',
  },
  {
    n: '02',
    titleFr: 'Backend & Docs',
    titleEn: 'Backend & Docs',
    count: 12,
    summaryFr:
      'Le rayon de ce qu’on ne voit pas mais qui fait tenir le produit : API propres, auth, données, et exports bureautiques que les clients réclament.',
    summaryEn:
      'The foundation aisle: robust REST/RPC APIs, auth tokens, database schemas, and client-requested PDF/XLSX exports.',
    skills: [
      { name: 'api-and-interface-design', whatFr: 'Dessiner des routes REST cohérentes et documentées.', whatEn: 'Design clean, documented, and resilient REST routes.' },
      { name: 'app-auth', whatFr: 'Brancher login, sessions et rôles sans bricoler la sécurité.', whatEn: 'Wire sessions, JWTs, and RBAC roles with zero security flaws.' },
      { name: 'data-designer', whatFr: 'Modéliser des données simples qui survivent aux évolutions.', whatEn: 'Model simple schemas that gracefully adapt to evolutions.' },
      { name: 'pdf / docx / xlsx', whatFr: 'Générer factures, rapports et exports vraiment utilisables.', whatEn: 'Generate real-world invoices, reports, and formatted spreadsheet exports.' },
    ],
    outcomeFr: 'Derrière chaque beau front, une API et des docs qui tiennent.',
    outcomeEn: 'Behind every sleek frontend, rock-solid APIs and dependable documentation.',
    visual: BackendVisual,
    image: '/img/rayon-3.webp',
  },
  {
    n: '03',
    titleFr: 'Agents IA',
    titleEn: 'AI Agents',
    count: 54,
    summaryFr:
      'Le rayon de l’autonomie : connecter les modèles, outiller les agents et automatiser le répétitif, comme synchroniser 843 clés pendant que tu dors.',
    summaryEn:
      'The autonomy aisle: connect LLMs, tool agents with MCP, and automate repetitive workflows while you sleep.',
    skills: [
      { name: 'mcp-builder', whatFr: 'Exposer tes outils via MCP pour agir dans ton projet.', whatEn: 'Expose local tools via MCP protocols to act inside your codebase.' },
      { name: 'claude-api', whatFr: 'Appeler les modèles : prompts, streaming, coûts maîtrisés.', whatEn: 'Invoke foundation models: robust prompts, token streaming, cost control.' },
      { name: 'skill-creator', whatFr: 'Créer tes skills réutilisables au format SKILL.md.', whatEn: 'Build modular, reusable skills adhering to SKILL.md spec.' },
      { name: 'omniroute-skills (47)', whatFr: 'Router chaque tâche vers la bonne automatisation.', whatEn: 'Route every discrete subtask to the optimal AI automation.' },
    ],
    outcomeFr: 'Tu passes de “je discute avec l’IA” à “mon agent livre pendant que je relis”.',
    outcomeEn: 'You shift from "chatting with AI" to "my agents ship software while I conduct code reviews".',
    visual: AgentsVisual,
    image: '/img/rayon-4.webp',
  },
  {
    n: '04',
    titleFr: 'QA & Debug',
    titleEn: 'QA & Debugging',
    count: 16,
    summaryFr:
      'Le rayon qui verrouille la qualité : rien ne sort sans tests verts, review et preuves. C’est ce qui sépare un exercice d’un produit.',
    summaryEn:
      'The quality gate: nothing hits production without green tests, code reviews, and proof. The difference between a school demo and a real product.',
    skills: [
      { name: 'test-driven-development', whatFr: 'Écrire le test d’abord, coder ensuite, prouver que ça passe.', whatEn: 'Write the test first, code against it, verify clean pass.' },
      { name: 'debugging-and-error-recovery', whatFr: 'Reproduire, isoler, corriger, verrouiller.', whatEn: 'Reproduce, isolate, fix, and lock against regression.' },
      { name: 'code-review', whatFr: 'Relire avec checklist : lisibilité, cas limites, sécurité.', whatEn: 'Review using strict checklists: readability, edge cases, security.' },
      { name: 'ci-cd-and-automation', whatFr: 'Automatiser lint, tests et build pour un main toujours vert.', whatEn: 'Automate lint, typecheck, and build steps for green CI pipelines.' },
    ],
    outcomeFr: 'Tu présentes des preuves (tests, build, lint 0 erreur), pas des “chez moi ça marche”.',
    outcomeEn: 'You show verifiable proof (green tests, lint 0 error, build passes), not "works on my machine" excuses.',
    visual: QaVisual,
  },
  {
    n: '05',
    titleFr: 'Architecture',
    titleEn: 'Architecture',
    count: 3,
    summaryFr:
      'Le rayon des décisions qui durent : écrire, tracer et communiquer pour que d’autres puissent te suivre : clients, associés, futurs toi.',
    summaryEn:
      'The lasting decisions aisle: write, trace, and communicate architectural choices so stakeholders and team members can follow seamlessly.',
    skills: [
      { name: 'documentation-and-adrs', whatFr: 'Tracer chaque décision : contexte, choix, conséquences.', whatEn: 'Document architectural decision records (ADRs): context, rationale, impact.' },
      { name: 'writing-guidelines', whatFr: 'Écrire des README et specs qu’on lit jusqu’au bout.', whatEn: 'Craft crisp READMEs and technical specs people actually read.' },
      { name: 'internal-comms', whatFr: 'Rendre compte : avancée, blocages, prochaine étape.', whatEn: 'Report progress clearly: current milestone, blockers, next sprint.' },
    ],
    outcomeFr: 'Tu deviens quelqu’un qu’on peut suivre, et payer, sur la durée.',
    outcomeEn: 'You become an engineering partner people can rely on and invest in long term.',
    visual: ArchiVisual,
    image: '/img/rayon-5.webp',
  },
];

function Connector({ next }: { next: string }) {
  return (
    <div aria-hidden="true" className="flex justify-center py-2 md:py-3">
      <div className="flex flex-col items-center">
        <span className="h-7 w-[2px] rounded-full bg-gradient-to-b from-accent/70 to-accent/20" />
        <span className="mt-1 flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-ink shadow-card ring-1 ring-line">
          <span className="font-display">{next}</span>
          <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 text-accent" aria-hidden="true">
            <path d="M6 1.5 V10 M2.8 7.2 L6 10.2 L9.2 7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function Registre() {
  const { lang } = useLanguage();

  return (
    <section id="registre" aria-labelledby="registre-titre" className="scroll-mt-24 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div id="registre-titre">
          <SectionHeading
            eyebrow={lang === 'fr' ? "Le registre" : "The Registry"}
            title={lang === 'fr' ? "6 rayons." : "6 aisles."}
            highlight={lang === 'fr' ? "212 skills. Zéro théorie sans chantier." : "212 skills. Zero theory without practice."}
            sub={
              lang === 'fr'
                ? "Six rayons, une seule logique : chaque skill appris devient une livraison."
                : "Six aisles, one core principle: every single acquired skill turns into a real deliverable."
            }
          />
        </div>
        <div>
          {rayons.map((m, idx) => {
            const reversed = idx % 2 === 1;
            const Visual = m.visual;
            const title = lang === 'fr' ? m.titleFr : m.titleEn;
            const summary = lang === 'fr' ? m.summaryFr : m.summaryEn;
            const outcome = lang === 'fr' ? m.outcomeFr : m.outcomeEn;

            return (
              <div key={m.n}>
                <Reveal variant={reversed ? 'right' : 'left'}>
                  <div className="grid items-center gap-8 py-8 md:grid-cols-2 md:gap-14 md:py-10">
                    <div className={reversed ? 'md:order-2' : ''}>
                      <RayonMedia image={m.image} label={`Illustration du rayon ${title}`} fallback={Visual ? <Visual /> : null} />
                    </div>
                    <div className={reversed ? 'md:order-1' : ''}>
                      <p className="inline-flex items-center gap-2 rounded-full bg-ink/[0.05] px-3 py-1 text-xs font-semibold text-ink">
                        <span className="font-display font-bold">{m.n}</span>
                        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
                        {m.count} skills
                      </p>
                      <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                        {title}
                      </h3>
                      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/80">{summary}</p>
                      <ul className="mt-5 space-y-2.5">
                        {m.skills.map((s) => (
                          <li key={s.name} className="flex items-start gap-3 text-sm">
                            <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            <span>
                              <span className="font-bold text-ink">{s.name}</span>
                              <span className="text-muted-foreground"> : {lang === 'fr' ? s.whatFr : s.whatEn}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 border-l-[3px] border-emerald-500 pl-4 text-sm leading-relaxed text-ink">
                        <span className="font-semibold">{lang === 'fr' ? "Concrètement : " : "In practice: "}</span>
                        {outcome}
                      </p>
                    </div>
                  </div>
                </Reveal>
                {idx < rayons.length - 1 ? (
                  <Connector next={`${rayons[idx + 1]?.n} · ${lang === 'fr' ? rayons[idx + 1]?.titleFr : rayons[idx + 1]?.titleEn}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Registre;
