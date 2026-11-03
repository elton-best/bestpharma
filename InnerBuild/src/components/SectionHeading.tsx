import Reveal from './Reveal';

type SectionHeadingProps = {
  eyebrow: string;
  title: React.ReactNode;
  highlight?: React.ReactNode;
  sub?: React.ReactNode;
  dark?: boolean;
};

export function SectionHeading({ eyebrow, title, highlight, sub, dark = false }: SectionHeadingProps) {
  return (
    <Reveal variant="zoom" className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
      <p
        className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase ${
          dark ? 'border-white/15 bg-white/5 text-orange-300' : 'border-line bg-white text-accent'
        }`}
      >
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dark ? 'bg-orange-300' : 'bg-accent'}`} />
        {eyebrow}
      </p>
      <h2
        className={`font-display text-3xl font-bold tracking-tight leading-snug md:text-[2.75rem] md:leading-[1.15] ${
          dark ? 'text-white' : 'text-ink'
        }`}
      >
        {title} {highlight ? <span className={dark ? 'text-orange-300' : 'text-gradient'}>{highlight}</span> : null}
      </h2>
      {sub ? (
        <p className={`mx-auto mt-4 max-w-xl text-base leading-relaxed md:text-lg font-normal ${dark ? 'text-neutral-300' : 'text-ink/80'}`}>
          {sub}
        </p>
      ) : null}
    </Reveal>
  );
}

export default SectionHeading;
