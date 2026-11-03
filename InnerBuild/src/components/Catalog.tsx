import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { REGISTRY_SKILLS, type RegistrySkill } from '../data/registry';
import { useLanguage } from '@/lib/i18n';

type GroupSkill = Pick<RegistrySkill, 'name' | 'desc' | 'icon'>;

const byName = (name: string): GroupSkill => {
  const found = REGISTRY_SKILLS.find((s) => s.name === name);
  if (!found) throw new Error(`Skill inconnu : ${name}`);
  return found;
};

type Group = {
  rayonFr: string;
  rayonEn: string;
  count: number;
  summaryFr: string;
  summaryEn: string;
  outcomeFr: string;
  outcomeEn: string;
  tint: string;
  skills: GroupSkill[];
};

const groups: Group[] = [
  {
    rayonFr: 'Méthode',
    rayonEn: 'Method',
    count: 4,
    summaryFr: 'Cadrer, découper et tracer : le rayon qui transforme une idée floue en plan exécutable.',
    summaryEn: 'Frame, decompose, and trace: the aisle transforming loose concepts into executable blueprints.',
    outcomeFr: 'Tu sors avec un plan que n’importe quel agent peut exécuter.',
    outcomeEn: 'You emerge with a precise plan any agent can execute autonomously.',
    tint: '#E8EEFF',
    skills: [
      'planning-and-task-breakdown',
      'spec-driven-development',
      'interview-me',
      'documentation-and-adrs',
    ].map(byName),
  },
  {
    rayonFr: 'Frontend',
    rayonEn: 'Frontend',
    count: 3,
    summaryFr: 'Le visible : interfaces propres, design system et effets 3D au rendu premium.',
    summaryEn: 'The visual: clean responsive interfaces, scalable design systems, and premium 3D effects.',
    outcomeFr: 'Tu livres une page qui donne envie de payer.',
    outcomeEn: 'You ship pages that look commercially ready to convert.',
    tint: '#FFF1E6',
    skills: ['frontend-design', 'react-best-practices', 'threejs-3d-arsenal'].map(byName),
  },
  {
    rayonFr: 'Backend',
    rayonEn: 'Backend',
    count: 3,
    summaryFr: 'Ce qu’on ne voit pas mais qui fait tenir le produit : API, auth, exports.',
    summaryEn: 'The invisible backbone: robust APIs, session security, database models, and file exports.',
    outcomeFr: 'Derrière chaque beau front, une base qui tient.',
    outcomeEn: 'Behind every sleek UI, a dependable and secure backend.',
    tint: '#E9F3EC',
    skills: ['api-and-interface-design', 'app-auth', 'pdf / docx / xlsx'].map(byName),
  },
  {
    rayonFr: 'IA',
    rayonEn: 'AI Agents',
    count: 3,
    summaryFr: 'L’autonomie : connecter les modèles et outiller les agents qui livrent.',
    summaryEn: 'Autonomy: wire foundation models and equip agents to build production code.',
    outcomeFr: 'Ton agent livre pendant que tu relis.',
    outcomeEn: 'Your agent ships deliverables while you conduct code review.',
    tint: '#EFEBFF',
    skills: ['mcp-builder', 'skill-creator', 'claude-api'].map(byName),
  },
  {
    rayonFr: 'Qualité',
    rayonEn: 'Quality & QA',
    count: 3,
    summaryFr: 'Le verrou final : rien ne sort sans tests verts, review et preuves.',
    summaryEn: 'The final gate: zero releases without green test suites, code review, and verifiable proof.',
    outcomeFr: 'Tu présentes des preuves, pas des promesses.',
    outcomeEn: 'You present certified proof, not subjective claims.',
    tint: '#E6F6EC',
    skills: ['test-driven-development', 'code-review', 'ci-cd-and-automation'].map(byName),
  },
];

export function Catalog() {
  const { lang } = useLanguage();

  return (
    <section id="catalogue" aria-labelledby="catalogue-titre" className="scroll-mt-24 bg-paper py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div id="catalogue-titre">
          <SectionHeading
            eyebrow={lang === 'fr' ? "Catalogue" : "Catalog"}
            title={lang === 'fr' ? "Tout le registre," : "The full registry,"}
            highlight={lang === 'fr' ? "en un coup d’œil." : "at a glance."}
            sub={
              lang === 'fr'
                ? "Un skill, tous les agents. Chaque fiche s’intègre partout via le format SKILL.md : même méthode, même rendu, quel que soit ton outil."
                : "One skill, all agents. Every sheet embeds anywhere via SKILL.md format: same method, same output, whatever your tooling."
            }
          />
        </div>

        <div>
          {groups.map((g, idx) => {
            const reversed = idx % 2 === 1;
            const rayon = lang === 'fr' ? g.rayonFr : g.rayonEn;
            const summary = lang === 'fr' ? g.summaryFr : g.summaryEn;
            const outcome = lang === 'fr' ? g.outcomeFr : g.outcomeEn;

            return (
              <Reveal key={g.rayonFr} variant={reversed ? 'right' : 'left'}>
                <div className="grid items-center gap-6 py-8 md:grid-cols-[300px_1fr] md:gap-12 md:py-10">
                  <div className={reversed ? 'md:order-2' : ''}>
                    <div
                      className="rounded-[26px] border border-line bg-white p-8 shadow-card"
                      role="img"
                      aria-label={`Icônes du rayon ${rayon}`}
                    >
                      <div
                        className="flex flex-wrap items-center justify-center gap-3 rounded-2xl p-6"
                        style={{ backgroundColor: g.tint }}
                      >
                        {g.skills.map((s) => (
                          <div
                            key={s.name}
                            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-card transition-transform duration-300 hover:scale-110"
                            title={s.name}
                          >
                            <img
                              src={`/icons/${s.icon}`}
                              alt=""
                              className="h-6 w-6 object-contain"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-center font-display text-xs font-bold text-ink">
                        {lang === 'fr'
                          ? `Rayon ${rayon} · ${g.count} skills vitrines`
                          : `Aisle ${rayon} · ${g.count} flagship skills`}
                      </p>
                    </div>
                  </div>
                  <div className={reversed ? 'md:order-1' : ''}>
                    <p className="inline-flex items-center gap-2 rounded-full bg-ink/[0.05] px-3 py-1 text-xs font-semibold text-ink">
                      <span className="font-display font-bold">{rayon}</span>
                    </p>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{summary}</p>
                    <ul className="mt-4 space-y-2">
                      {g.skills.map((s) => (
                        <li key={s.name} className="flex items-start gap-3 text-sm">
                          <img
                            src={`/icons/${s.icon}`}
                            alt=""
                            className="mt-0.5 h-4 w-4 shrink-0 object-contain"
                          />
                          <span>
                            <strong className="font-mono text-ink">{s.name}</strong>
                            <span className="text-muted-foreground"> — {s.desc}</span>
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
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Catalog;
