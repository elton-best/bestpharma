import { useEffect, useRef, type ReactNode } from 'react';

type RevealVariant = 'up' | 'fade' | 'zoom' | 'left' | 'right';

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  variant?: RevealVariant;
};

export function Reveal({ children, delay = 0, className = '', variant = 'up' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible');
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal reveal-${variant} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default Reveal;
