import { useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';
import AnimatedCounter from './ui/AnimatedCounter';
import { useLanguage } from '@/lib/i18n';

export function Stats() {
  const { lang } = useLanguage();
  const ref = useRef<HTMLDListElement>(null);
  const [visible, setVisible] = useState(false);

  const stats = [
    {
      target: 212,
      label: lang === 'fr' ? 'skills curés au registre' : 'curated skills in registry',
      hint: lang === 'fr' ? '6 rayons, versionnés' : '6 departments, versioned',
    },
    {
      target: 45,
      label: lang === 'fr' ? 'effets 3D prêts à intégrer' : '3D motion shaders ready to ship',
      hint: lang === 'fr' ? 'Three.js et Motion' : 'Three.js & Framer Motion',
    },
    {
      target: 7,
      label: lang === 'fr' ? 'lois internes qui forcent la livraison' : 'internal laws enforcing delivery',
      hint: lang === 'fr' ? 'La boucle va jusqu’à Done' : 'Autonomous loop until Done',
    },
    {
      target: 3,
      label: lang === 'fr' ? 'produits déjà livrés avec la méthode' : 'products shipped with method',
      hint: lang === 'fr' ? 'Les preuves sont ci-dessous' : 'Verifiable proofs below',
    },
  ];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section aria-label="Chiffres clés" className="border-y border-line bg-white py-12 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal variant="zoom">
          <dl ref={ref} className="grid grid-cols-2 gap-x-8 gap-y-10 text-center lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
                  <AnimatedCounter
                    value={visible ? s.target : 0}
                    duration={1.1}
                    separator=" "
                    decimalSeparator=","
                  />
                </dd>
                <dt className="mt-2 text-sm font-semibold text-ink">{s.label}</dt>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.hint}</p>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}

export default Stats;
