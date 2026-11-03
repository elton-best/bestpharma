import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = {
  variant?: 'primary' | 'ghost';
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>;

const styles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-ink text-white font-semibold shadow-card hover:bg-black hover:shadow-lg',
  ghost: 'border border-line bg-white text-ink hover:border-ink/30',
};

export default function Button({ variant = 'primary', children, className = '', ...rest }: ButtonProps) {
  return (
    <a
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-display text-base font-semibold transition-all duration-300',
        styles[variant],
        className,
      )}
    >
      {children}
    </a>
  );
}
