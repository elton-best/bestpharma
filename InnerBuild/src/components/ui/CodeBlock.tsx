import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

type CodeBlockProps = {
  code: string;
  language?: string;
  filename?: string;
  accent?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  className?: string;
};

export default function CodeBlock({
  code,
  language = 'tsx',
  filename,
  accent = '#EA580C',
  showLineNumbers = true,
  highlightLines = [],
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const area = document.createElement('textarea');
        area.value = code;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }, [code]);

  const lines = code.replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
  const highlighted = new Set(highlightLines);
  const gutterWidth = `${String(lines.length).length}ch`;

  return (
    <div
      data-slot="code-block"
      className={`overflow-hidden rounded-2xl border border-line bg-white text-left shadow-card ${className}`}
    >
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-paper px-4">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-muted">
          {filename ?? language}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copié' : 'Copier le code'}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
      <div
        role="region"
        aria-label={filename ?? `code ${language}`}
        tabIndex={0}
        className="overflow-auto py-3"
      >
        <pre className="w-max min-w-full text-[13px] leading-6">
          {lines.map((line, i) => (
            <div
              key={i}
              className="flex min-w-full px-4"
              style={highlighted.has(i + 1) ? { backgroundColor: `${accent}14` } : undefined}
            >
              {showLineNumbers ? (
                <span
                  aria-hidden="true"
                  className="mr-4 shrink-0 text-right text-ink/25 select-none"
                  style={{ width: gutterWidth }}
                >
                  {i + 1}
                </span>
              ) : null}
              <code className="pr-4 whitespace-pre text-ink/85">{line}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
