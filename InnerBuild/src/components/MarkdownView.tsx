import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "reicon-react";
import { useState } from "react";
import { toast } from "sonner";

function CodeBlockWithCopy({ children, className }: { children: React.ReactNode; className?: string | undefined }) {
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, "");

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Code copié");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative my-3 rounded-xl border border-line bg-ink text-paper overflow-hidden group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-paper/5 border-b border-paper/10 text-[11px] font-mono text-paper/60">
        <span>code</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-paper transition-colors py-0.5 px-1.5 rounded hover:bg-paper/10"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? "Copié" : "Copier"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-xs font-mono leading-relaxed [&_code]:bg-transparent [&_code]:p-0">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

/** Full markdown renderer (GFM: tables, task lists, strikethrough) for course content & studio preview. */
export function MarkdownView({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`space-y-4 text-base sm:text-[1.05rem] leading-relaxed text-ink ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h2 className="mt-8 mb-4 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink border-b border-line/60 pb-2" {...p} />,
          h2: (p) => <h3 className="mt-7 mb-3 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink" {...p} />,
          h3: (p) => <h4 className="mt-5 mb-2 font-display text-lg sm:text-xl font-bold tracking-tight text-ink" {...p} />,
          h4: (p) => <h5 className="mt-4 mb-2 text-base sm:text-lg font-bold text-ink" {...p} />,
          p: (p) => <p className="my-3.5 text-base sm:text-[1.05rem] font-normal leading-relaxed text-ink" {...p} />,
          ul: (p) => <ul className="ml-6 my-3.5 list-disc space-y-2 marker:text-accent text-base sm:text-[1.05rem] text-ink font-normal" {...p} />,
          ol: (p) => <ol className="ml-6 my-3.5 list-decimal space-y-2 marker:font-bold marker:text-accent text-base sm:text-[1.05rem] text-ink font-normal" {...p} />,
          li: ({ className: c, children, ...p }) => {
            const isTask = c?.includes("task-list-item");
            if (isTask) {
              return (
                <li className="-ml-5 list-none flex items-start gap-2.5 my-2 text-base sm:text-[1.05rem] text-ink font-normal leading-relaxed" {...p}>
                  {children}
                </li>
              );
            }
            return <li className="my-1.5 text-base sm:text-[1.05rem] font-normal text-ink leading-relaxed" {...p}>{children}</li>;
          },
          input: ({ type, checked, ...p }) => {
            if (type === "checkbox") {
              return (
                <span
                  aria-hidden="true"
                  className={`inline-flex shrink-0 items-center justify-center mt-1 h-4 w-4 rounded border transition-colors select-none ${
                    checked
                      ? "bg-accent border-accent text-paper shadow-xs"
                      : "border-line bg-card/90 text-transparent"
                  }`}
                >
                  <Check size={11} className={checked ? "opacity-100" : "opacity-0"} />
                </span>
              );
            }
            return <input type={type} checked={checked} {...p} />;
          },
          strong: (p) => <strong className="font-bold text-ink" {...p} />,
          a: (p) => <a className="font-semibold text-accent underline underline-offset-2 hover:text-accent-hover" target="_blank" rel="noreferrer" {...p} />,
          blockquote: (p) => (
            <blockquote className="border-l-4 border-accent bg-accent/5 px-4 py-3 rounded-r-lg italic text-ink my-4 text-base sm:text-[1.05rem]" {...p} />
          ),
          code: ({ className, children, ...p }) => {
            const isInline = !className && !String(children).includes("\n");
            if (isInline) {
              return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.88em] font-semibold text-ink" {...p}>{children}</code>;
            }
            return <CodeBlockWithCopy className={className}>{children}</CodeBlockWithCopy>;
          },
          pre: ({ children }) => <>{children}</>,
          hr: () => <hr className="my-6 border-line" />,
          img: (p) => <img className="my-4 max-h-96 rounded-xl border border-line shadow-sm" alt={p.alt ?? ""} {...p} />,
          table: (p) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-line">
              <table className="w-full border-collapse text-base" {...p} />
            </div>
          ),
          th: (p) => <th className="border-b border-line bg-muted/60 px-4 py-2.5 text-left font-bold text-ink text-sm uppercase tracking-wider" {...p} />,
          td: (p) => <td className="border-b border-line/60 px-4 py-3 text-sm text-ink" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
