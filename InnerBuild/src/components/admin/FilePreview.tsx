import { useFileUrl } from "@/lib/content";

/** Live preview of an uploaded image or PDF, shown in admin forms before saving. */
export function FilePreview({ path, type }: { path: string; type: "image" | "pdf" }) {
  const { data, isLoading } = useFileUrl(path || undefined);
  if (!path) return null;
  if (isLoading || !data) return <div className={`animate-pulse rounded-xl bg-muted ${type === "pdf" ? "h-72" : "h-40"}`} />;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-muted/40">
      <p className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Aperçu {type === "pdf" ? "du PDF" : "de l'image"}
        <a href={data} target="_blank" rel="noreferrer" className="normal-case tracking-normal text-accent">Ouvrir ↗</a>
      </p>
      {type === "image"
        ? <img src={data} alt="Aperçu" className="max-h-64 w-full bg-paper object-contain" />
        : <iframe src={`${data}#view=FitH`} title="Aperçu du PDF" className="h-80 w-full bg-paper" />}
    </div>
  );
}
