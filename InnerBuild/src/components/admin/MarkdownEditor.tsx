import { useRef, useState, type ReactNode } from "react";
import { Bold, Code, Columns2, Eye, Heading1, Heading2, Heading3, Image, Italic, Link2, List, ListChecks, ListOrdered, Minus, Pencil, Quote, Redo2, SquareCode, Strikethrough, Table, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { MarkdownView } from "@/components/MarkdownView";
import { uploadToR2ServerFn } from "@/lib/storage.functions";
import { R2_PUBLIC_BASE_URL } from "@/lib/content";

type View = "write" | "split" | "preview";

/** Markdown editor with toolbar, shortcuts, live preview, image upload and undo/redo. */
export function MarkdownEditor({ value, onChange, placeholder, rows = 12, label }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; label?: string }) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>("split");
  const [past, setPast] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function commit(next: string, selStart?: number, selEnd?: number) {
    setPast((p) => [...p.slice(-100), value]); setFuture([]); onChange(next);
    if (selStart !== undefined) requestAnimationFrame(() => { ta.current?.focus(); ta.current?.setSelectionRange(selStart, selEnd ?? selStart); });
  }
  function sel() { const t = ta.current; if (!t) return { s: value.length, e: value.length, text: "" }; return { s: t.selectionStart, e: t.selectionEnd, text: value.slice(t.selectionStart, t.selectionEnd) }; }
  function wrap(before: string, after = before, fallback = "texte") {
    const { s, e, text } = sel(); const inner = text || fallback;
    commit(value.slice(0, s) + before + inner + after + value.slice(e), s + before.length, s + before.length + inner.length);
  }
  function linePrefix(prefix: string | ((i: number) => string)) {
    const { s, e } = sel();
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const lines = value.slice(start, e).split("\n");
    const out = lines.map((l, i) => { const p = typeof prefix === "string" ? prefix : prefix(i); return l.startsWith(p) ? l.slice(p.length) : p + l; }).join("\n");
    commit(value.slice(0, start) + out + value.slice(e), start, start + out.length);
  }
  function insert(block: string) {
    const { s, e } = sel(); const pre = s > 0 && value[s - 1] !== "\n" ? "\n\n" : "";
    commit(value.slice(0, s) + pre + block + value.slice(e), s + pre.length + block.length);
  }
  function undo() { const prev = past.at(-1); if (prev === undefined) return; setPast(past.slice(0, -1)); setFuture([value, ...future]); onChange(prev); }
  function redo() { const [n, ...rest] = future; if (n === undefined) return; setFuture(rest); setPast([...past, value]); onChange(n); }
  function link() { const url = window.prompt("Adresse du lien (https://…)", "https://"); if (url) wrap("[", `](${url})`, "texte du lien"); }
  async function uploadImage(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Choisis une image."); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("Image trop lourde (5 Mo max)."); return; }
    setBusy(true);
    const path = `inline/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
    try {
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i] ?? 0);
      const res = await uploadToR2ServerFn({ data: { key: path, base64: btoa(binary), contentType: f.type } });
      if (!res.success) { setBusy(false); toast.error("Envoi impossible : " + (res.error || "R2")); return; }
      const url = res.url || (R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${path}` : "");
      setBusy(false);
      if (url) insert(`![${f.name.replace(/\.\w+$/, "")}](${url})\n`);
    } catch (e: any) {
      setBusy(false);
      toast.error("Envoi impossible : " + (e?.message || "R2"));
    }
  }

  const tools: [ReactNode, string, () => void][] = [
    [<Undo2 key="u" />, "Annuler (Ctrl+Z)", undo], [<Redo2 key="r" />, "Rétablir (Ctrl+Y)", redo],
    [<Heading1 key="h1" />, "Titre 1", () => linePrefix("# ")], [<Heading2 key="h2" />, "Titre 2", () => linePrefix("## ")], [<Heading3 key="h3" />, "Titre 3", () => linePrefix("### ")],
    [<Bold key="b" />, "Gras (Ctrl+B)", () => wrap("**")], [<Italic key="i" />, "Italique (Ctrl+I)", () => wrap("_")], [<Strikethrough key="s" />, "Barré", () => wrap("~~")],
    [<Code key="c" />, "Code en ligne", () => wrap("`")], [<SquareCode key="cb" />, "Bloc de code", () => wrap("\n```\n", "\n```\n", "code")],
    [<List key="ul" />, "Liste à puces", () => linePrefix("- ")], [<ListOrdered key="ol" />, "Liste numérotée", () => linePrefix((i) => `${i + 1}. `)], [<ListChecks key="tl" />, "Liste de tâches", () => linePrefix("- [ ] ")],
    [<Quote key="q" />, "Citation", () => linePrefix("> ")], [<Link2 key="l" />, "Lien (Ctrl+K)", link], [<Image key="img" />, "Insérer une image", () => file.current?.click()],
    [<Table key="t" />, "Tableau", () => insert("| Colonne 1 | Colonne 2 |\n| --- | --- |\n| Valeur | Valeur |\n")], [<Minus key="hr" />, "Séparateur", () => insert("---\n")],
  ];
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-ring">
      {label && <p className="border-b border-line px-3 pt-2 text-xs font-semibold text-muted-foreground">{label}</p>}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-muted/40 p-1.5">
        {tools.map(([icon, title, fn]) => <button key={title} type="button" title={title} aria-label={title} onClick={fn} className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-line hover:bg-card hover:text-ink [&_svg]:h-4 [&_svg]:w-4">{icon}</button>)}
        <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { uploadImage(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="ml-auto flex rounded-lg border border-line bg-card p-0.5" role="tablist">
          {([["write", Pencil, "Écrire"], ["split", Columns2, "Côte à côte"], ["preview", Eye, "Aperçu"]] as const).map(([k, I, l]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} title={l} onClick={() => setView(k)} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${view === k ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink"} ${k === "split" ? "hidden md:flex" : ""}`}><I className="h-3.5 w-3.5" /><span className="hidden sm:inline">{l}</span></button>
          ))}
        </div>
      </div>
      <div className={view === "split" ? "grid md:grid-cols-2" : ""}>
        {view !== "preview" && (
          <textarea ref={ta} value={value} rows={rows} placeholder={placeholder ?? "Écris en markdown…"}
            onChange={(e) => { setPast((p) => [...p.slice(-100), value]); setFuture([]); onChange(e.target.value); }}
            onPaste={(e) => { const f = e.clipboardData.files[0]; if (f?.type.startsWith("image/")) { e.preventDefault(); uploadImage(f); } }}
            onKeyDown={(e) => {
              const mod = e.ctrlKey || e.metaKey; if (!mod) { if (e.key === "Tab") { e.preventDefault(); wrap("  ", "", ""); } return; }
              const k = e.key.toLowerCase();
              if (k === "b") { e.preventDefault(); wrap("**"); } else if (k === "i") { e.preventDefault(); wrap("_"); } else if (k === "k") { e.preventDefault(); link(); }
              else if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); } else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
            }}
            className="block min-h-[320px] w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-muted-foreground" />
        )}
        {view !== "write" && (
          <div className={`max-h-[640px] min-h-[320px] overflow-y-auto p-5 ${view === "split" ? "border-t border-line md:border-l md:border-t-0" : ""}`}>
            {value.trim() ? <MarkdownView>{value}</MarkdownView> : <p className="text-sm text-muted-foreground">L'aperçu apparaîtra ici.</p>}
          </div>
        )}
      </div>
      <p className="flex justify-between border-t border-line px-3 py-1.5 text-[11px] text-muted-foreground"><span>{busy ? "Envoi de l'image…" : "Markdown · colle une image pour l'insérer"}</span><span>{words} mots · ~{Math.max(1, Math.round(words / 200))} min de lecture</span></p>
    </div>
  );
}
