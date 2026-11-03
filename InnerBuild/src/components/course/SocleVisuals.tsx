/** Schémas SVG du Module Socle — rendus dans le détail des leçons m0-l*. */
const INK = "#101828";
const MUTED = "#667085";
const ACCENT = "#EA580C";
const EMERALD = "#10B981";
const AMBER = "#FBBF24";
const LINE = "#E5E7EB";

function Box({ x, y, w, label, sub, fill = "#fff", stroke = LINE, color = INK }: { x: number; y: number; w: number; label: string; sub?: string; fill?: string; stroke?: string; color?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={sub ? 52 : 40} rx={10} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + (sub ? 22 : 25)} textAnchor="middle" fontSize={12} fontWeight={800} fill={color}>{label}</text>
      {sub && <text x={x + w / 2} y={y + 38} textAnchor="middle" fontSize={9.5} fill={MUTED}>{sub}</text>}
    </g>
  );
}

function Arrow({ x1, y, x2 }: { x1: number; y: number; x2: number }) {
  return (
    <g stroke={ACCENT} strokeWidth={2} fill="none">
      <line x1={x1} y1={y} x2={x2 - 2} y2={y} />
      <polyline points={`${x2 - 8},${y - 4} ${x2 - 1},${y} ${x2 - 8},${y + 4}`} />
    </g>
  );
}

function Shell({ title, children, height = 170 }: { title: string; children: React.ReactNode; height?: number }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <figcaption className="border-b border-line bg-muted/40 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</figcaption>
      <svg viewBox={`0 0 400 ${height}`} className="h-auto w-full" role="img" aria-label={title}>{children}</svg>
    </figure>
  );
}

function LoopVisual() {
  const steps = ["LIRE", "CHOISIR", "CHARGER", "PRODUIRE", "VÉRIFIER", "COCHER"];
  return (
    <Shell title="La boucle de travail autonome">
      {steps.map((s, i) => {
        const x = 8 + i * 65;
        const done = i < 5;
        return (
          <g key={s}>
            <Box x={x} y={55} w={57} label={s} fill={i === 4 ? "#FFF7ED" : "#fff"} stroke={i === 4 ? ACCENT : LINE} />
            {done && <Arrow x1={x + 57} y={81} x2={x + 65} />}
          </g>
        );
      })}
      <text x={200} y={140} textAnchor="middle" fontSize={11} fill={MUTED}>1 tâche à la fois · preuve à chaque étape · <tspan fontWeight={800} fill={EMERALD}>boucle jusqu’à Done</tspan></text>
    </Shell>
  );
}

function FrontendVisual() {
  return (
    <Shell title="Carte du frontend sain" height={196}>
      <Box x={14} y={30} w={110} label="ROUTEUR" sub="URL = état" />
      <Arrow x1={124} y={56} x2={146} />
      <Box x={146} y={30} w={110} label="COMPOSANTS" sub="props typées" />
      <Arrow x1={256} y={56} x2={278} />
      <Box x={278} y={30} w={108} label="SERVER FNS" sub="D1 via Query" fill="#FFF7ED" stroke={ACCENT} />
      <Box x={146} y={104} w={110} label="useState" sub="local seul" fill="#F9FAFB" />
      <line x1={201} y1={82} x2={201} y2={104} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={200} y={180} textAnchor="middle" fontSize={11} fill={MUTED}>État serveur → Query · état local → useState · zéro <tspan fontWeight={800} fill={INK}>any</tspan></text>
    </Shell>
  );
}

function BackendVisual() {
  return (
    <Shell title="Le chemin d’une requête saine">
      <Box x={14} y={40} w={90} label="CLIENT" sub="input brut" />
      <Arrow x1={104} y={66} x2={126} />
      <Box x={126} y={18} w={130} label="1. ZOD" sub="valide tout input" fill="#FFF7ED" stroke={ACCENT} />
      <Box x={126} y={78} w={130} label="2. DROITS + 3. D1" sub="source unique" />
      <Arrow x1={256} y={66} x2={278} />
      <Box x={278} y={40} w={108} label="RÉPONSE" sub="{ success, data }" fill="#ECFDF5" stroke={EMERALD} />
      <text x={200} y={152} textAnchor="middle" fontSize={11} fill={MUTED}>Contrat validé · erreurs métier · <tspan fontWeight={800} fill={INK}>jamais de secret client</tspan></text>
    </Shell>
  );
}

function AgentVisual() {
  const parts = [
    { l: "PROMPT", s: "identité+style" },
    { l: "CONTEXTE", s: "RAG ciblé" },
    { l: "OUTILS", s: "tracés" },
    { l: "GARDE-FOUS", s: "limites" },
  ];
  return (
    <Shell title="Anatomie d’un agent utile" height={190}>
      {parts.map((p, i) => (
        <g key={p.l}>
          <Box x={14 + i * 97} y={30} w={89} label={p.l} sub={p.s} fill={i === 1 ? "#FFF7ED" : "#fff"} stroke={i === 1 ? ACCENT : LINE} />
          {i < 3 && <text x={103 + i * 97} y={62} textAnchor="middle" fontSize={14} fontWeight={800} fill={ACCENT}>+</text>}
        </g>
      ))}
      <Box x={110} y={104} w={180} label="BOUCLE" sub="raisonner → agir → observer" fill="#101828" color="#fff" stroke="#101828" />
      <text x={200} y={178} textAnchor="middle" fontSize={11} fill={MUTED}>S’il invente, <tspan fontWeight={800} fill={INK}>le contexte manquait</tspan></text>
    </Shell>
  );
}

function QaVisual() {
  const levels = [
    { l: "1 · tsc --noEmit", c: EMERALD },
    { l: "2 · Revue ligne par ligne", c: EMERALD },
    { l: "3 · Build production", c: AMBER },
    { l: "4 · Tests critiques", c: AMBER },
    { l: "5 · Déploiement vérifié", c: ACCENT },
  ];
  return (
    <Shell title="La pyramide des contrôles" height={210}>
      {levels.map((lv, i) => {
        const w = 300 - i * 36;
        const x = 200 - w / 2;
        return (
          <g key={lv.l}>
            <rect x={x} y={14 + i * 32} width={w} height={26} rx={8} fill="#fff" stroke={lv.c} strokeWidth={2} />
            <text x={200} y={31 + i * 32} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK}>{lv.l}</text>
          </g>
        );
      })}
      <text x={200} y={196} textAnchor="middle" fontSize={11} fill={MUTED}>Du moins cher au plus cher · <tspan fontWeight={800} fill={INK}>Done écrit d’avance</tspan></text>
    </Shell>
  );
}

function DesignVisual() {
  const pillars = [
    { l: "COHÉRENCE", s: "tokens + partagés", c: ACCENT },
    { l: "ACCESSIBILITÉ", s: "WCAG partout", c: EMERALD },
    { l: "RESPONSIVE", s: "360 → 1280", c: "#3B82F6" },
  ];
  return (
    <Shell title="Les 3 piliers d’un écran sain">
      {pillars.map((p, i) => (
        <g key={p.l}>
          <rect x={20 + i * 124} y={40} width={112} height={70} rx={12} fill="#fff" stroke={p.c} strokeWidth={2} />
          <text x={76 + i * 124} y={68} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={INK}>{p.l}</text>
          <text x={76 + i * 124} y={88} textAnchor="middle" fontSize={10} fill={MUTED}>{p.s}</text>
        </g>
      ))}
      <text x={200} y={148} textAnchor="middle" fontSize={11} fill={MUTED}>min-w-0 · flex-wrap · truncate · <tspan fontWeight={800} fill={INK}>overflow-x: clip</tspan></text>
    </Shell>
  );
}

function SecurityVisual() {
  const items = ["SECRETS", "AUTH", "DROITS", "INPUTS", "PRIVILÈGES"];
  const subs = ["env serveur", "hash+token", "côté serveur", "Zod+params", "minimaux"];
  return (
    <Shell title="Les 5 réflexes sécurité">
      {items.map((l, i) => {
        const x = 12 + i * 77;
        return (
          <g key={l}>
            <rect x={x} y={45} width={69} height={64} rx={10} fill={i === 0 ? "#FEF2F2" : "#fff"} stroke={i === 0 ? "#EF4444" : LINE} strokeWidth={i === 0 ? 2 : 1.5} />
            <text x={x + 34.5} y={72} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={INK}>{l}</text>
            <text x={x + 34.5} y={90} textAnchor="middle" fontSize={9} fill={MUTED}>{subs[i]}</text>
          </g>
        );
      })}
      <text x={200} y={148} textAnchor="middle" fontSize={11} fill={MUTED}>Un secret commité = <tspan fontWeight={800} fill="#EF4444">compromis</tspan></text>
    </Shell>
  );
}

const MAP: Record<string, () => React.JSX.Element> = {
  "m0-l1": LoopVisual,
  "m0-l2": FrontendVisual,
  "m0-l3": BackendVisual,
  "m0-l4": AgentVisual,
  "m0-l5": QaVisual,
  "m0-l6": DesignVisual,
  "m0-l7": SecurityVisual,
};

export function SocleVisual({ lessonId }: { lessonId: string }) {
  const V = MAP[lessonId];
  if (!V) return null;
  return <V />;
}
